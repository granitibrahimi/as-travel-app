<script setup>
// The "Turn on notifications" popup: shown by pushAfterProfile() (src/lib/push.js)
// when the API keeps no browser for this user. "Turn on notifications" asks the
// phone, saves the subscription and has the API send a test notification;
// "Later" closes it until the app is opened again.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { enablePush } from '../lib/push';
import { can, state, toast } from '../store';
import Icon from './Icon';

const closing = ref(false);
const busy = ref(false);
const failure = ref('');
const enableButton = ref(null);

const points = computed(() => [
    'When a customer request is assigned to you',
    ...(can('simpleTasks.responsible') ? ['When a request is closed or marked as spam'] : []),
    'They arrive even when the app is closed',
]);

function close() {
    if (!state.pushPrompt || closing.value) return;
    closing.value = true;
    setTimeout(() => {
        closing.value = false;
        state.pushPrompt = false;
        failure.value = '';
        busy.value = false;
    }, 150);
}

async function enable() {
    busy.value = true;
    failure.value = '';
    const { permission, saved } = await enablePush({ test: true });
    busy.value = false;
    if (permission === 'denied') {
        failure.value = 'Notifications are blocked. Allow them for this app in your phone’s settings.';
    } else if (permission !== 'granted') {
        failure.value = 'Notifications weren’t allowed. Try again, or later from Profile.';
    } else if (!saved) {
        failure.value = 'Notifications couldn’t be turned on on this phone. Try again, or later from Profile.';
    } else {
        toast('Notifications are on. We sent you a test one.');
        close();
    }
}

const onKey = (event) => {
    if (event.key === 'Escape' && state.pushPrompt && !busy.value) close();
};

watch(
    () => state.pushPrompt,
    async (open) => {
        if (!open) return;
        await nextTick();
        enableButton.value?.focus();
    },
);
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
    <Teleport to="body">
        <div
            v-if="state.pushPrompt && state.token"
            class="confirm confirm--center"
            :class="{ 'is-closing': closing }"
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-prompt-title"
        >
            <div class="confirm-backdrop" @click="busy || close()" />
            <div class="confirm-panel push-prompt">
                <div class="push-prompt-icon"><Icon name="bell" /></div>
                <h2 id="push-prompt-title" class="confirm-title">Turn on notifications</h2>
                <p class="confirm-message">Don’t miss a customer: get a notification on your phone as soon as there’s something new for you.</p>
                <ul class="push-prompt-points">
                    <li v-for="point in points" :key="point"><Icon name="check" /><span>{{ point }}</span></li>
                </ul>
                <p v-if="failure" class="form-error">{{ failure }}</p>
                <button ref="enableButton" type="button" class="btn btn-primary btn-block btn-lg" :class="{ 'is-busy': busy }" :disabled="busy" @click="enable">
                    Turn on notifications
                </button>
                <button type="button" class="btn btn-secondary btn-block push-prompt-later" :disabled="busy" @click="close">Later</button>
            </div>
        </div>
    </Teleport>
</template>
