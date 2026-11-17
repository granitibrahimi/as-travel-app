<script setup>
// /chat — the agent's own conversation with the AS Travel assistant. It
// answers from the instructions managed in the CRM (AI Chat → Instructions).
// One conversation per agent: the history loads here and every message
// continues it.
import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import { api } from '../lib/api';
import { markdown } from '../lib/markdown';
import { memory, render, toast } from '../store';

const DRAFT_KEY = 'chat:draft';
const SUGGESTIONS = [
    'Sa kushton një çantë shtesë?',
    'Sa paradhënie paguan klienti?',
    'Cili është orari i zyrës?',
    'Si ta dërgoj linkun e pagesës online?',
];

// The assistant speaks Albanian only, its errors too (503 already comes in Albanian from the API).
const ERRORS = {
    0: 'Nuk ka lidhje me internetin. Provo përsëri.',
    403: 'Nuk ke qasje në asistentin.',
    429: 'Shumë pyetje njëherësh. Prit një minutë dhe provo përsëri.',
};

const shell = ref(null);
const input = ref(null);
const messages = ref(null);
const error = ref(null);
const draft = ref(memory.get(DRAFT_KEY) ?? '');
const busy = ref(true);
const typing = ref(false);

// The composer grows with the text up to a few lines.
function fit() {
    const el = input.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function onInput() {
    memory.set(DRAFT_KEY, draft.value);
    fit();
}

// Enter sends on a keyboard; Shift+Enter (and Enter on a phone) is a new line.
function onKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && matchMedia('(hover: hover)').matches) {
        event.preventDefault();
        ask(draft.value);
    }
}

async function scrollDown({ toLast = false } = {}) {
    await nextTick();
    const content = shell.value?.content;
    if (!content) return;
    const last = content.querySelector('.thread')?.lastElementChild;
    content.scrollTop = toLast && last ? Math.max(0, last.offsetTop - 12) : content.scrollHeight;
}

async function load() {
    try {
        const data = await api('/ai-chat/messages');
        messages.value = data.messages;
        error.value = null;
        scrollDown();
    } catch (e) {
        error.value = e;
    } finally {
        busy.value = false;
    }
}

async function ask(text) {
    const message = text.trim();
    if (message === '' || busy.value) return;

    messages.value = [...messages.value, { id: `local-${Date.now()}`, role: 'user', content: message }];
    draft.value = '';
    memory.delete(DRAFT_KEY);
    busy.value = true;
    typing.value = true;
    await nextTick();
    fit();
    scrollDown();

    try {
        const data = await api('/ai-chat/messages', { method: 'POST', body: { message } });
        messages.value = [...messages.value.slice(0, -1), data.question, data.reply];
        typing.value = false;
        scrollDown({ toLast: true });
    } catch (e) {
        typing.value = false;
        messages.value = messages.value.slice(0, -1);
        draft.value = message;
        await nextTick();
        fit();
        toast(ERRORS[e.status] ?? (e.status === 503 ? e.message : 'Diçka shkoi keq. Provo përsëri.'));
    } finally {
        busy.value = false;
    }
}

// Coming back to the app shows anything answered in the meantime.
async function refresh() {
    if (document.hidden || busy.value || !messages.value) return;
    const data = await api('/ai-chat/messages').catch(() => null);
    if (!data || busy.value || data.messages.length === messages.value.length) return;
    messages.value = data.messages;
    scrollDown();
}

onMounted(() => {
    fit();
    load();
    document.addEventListener('visibilitychange', refresh);
});
onUnmounted(() => document.removeEventListener('visibilitychange', refresh));
</script>

<template>
    <Shell ref="shell" tab="chat" title="AS Travel Assistant" subtitle="Përgjigjet sipas udhëzimeve të zyrës" class="is-chat">
        <ErrorBox v-if="error && !messages" :error="error" @retry="render()" />
        <Loading v-else-if="!messages" />
        <div v-else class="thread">
            <section v-if="messages.length === 0 && !typing" class="chat-intro">
                <span class="chat-intro-logo"><img src="/app/logo-mark-white.svg" alt="" width="40" height="40" /><b class="ai-badge">AI</b></span>
                <h2>Pyete asistentin</h2>
                <p>Çmime, procedura dhe rregulla të zyrës, sipas udhëzimeve të AS Travel.</p>
                <div class="suggestions">
                    <button v-for="text in SUGGESTIONS" :key="text" type="button" class="suggestion" @click="ask(text)">{{ text }}</button>
                </div>
            </section>

            <div v-for="m in messages" :key="m.id" class="message" :class="`is-${m.role}`">
                <template v-if="m.role === 'assistant'">
                    <span class="message-avatar"><img src="/app/logo-mark-white.svg" alt="" width="18" height="18" /><b class="ai-badge is-small">AI</b></span>
                    <div class="message-body prose" v-html="markdown(m.content)" />
                </template>
                <div v-else class="message-body">{{ m.content }}</div>
            </div>

            <div v-if="typing" class="message is-assistant">
                <span class="message-avatar"><img src="/app/logo-mark-white.svg" alt="" width="18" height="18" /><b class="ai-badge is-small">AI</b></span>
                <div class="message-body"><span class="dots"><i></i><i></i><i></i></span></div>
            </div>
        </div>

        <template #below>
            <form class="composer" novalidate @submit.prevent="ask(draft)">
                <textarea
                    ref="input"
                    v-model="draft"
                    rows="1"
                    maxlength="4000"
                    placeholder="Shkruaj pyetjen…"
                    enterkeyhint="send"
                    aria-label="Mesazhi"
                    @input="onInput"
                    @keydown="onKeydown"
                ></textarea>
                <button type="submit" class="composer-send" aria-label="Dërgo" :disabled="busy || draft.trim() === ''"><Icon name="send" /></button>
            </form>
        </template>
    </Shell>
</template>
