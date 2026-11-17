<script setup>
// /reminders/{id} — one reminder (where its push notification opens).
import { nextTick, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import { api } from '../lib/api';
import { choiceDialog, confirmDialog, navigate, refreshScreen, render, restoreScroll, toast } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const id = Number(props.params[0]);
const shell = ref(null);
const reminder = shallowRef(null);
const error = shallowRef(null);
const busy = ref(false);

const SNOOZES = [
    { key: 10, label: '10 minutes' },
    { key: 30, label: '30 minutes' },
    { key: 60, label: '1 hour' },
    { key: 180, label: '3 hours' },
    { key: 1440, label: 'Tomorrow, same time' },
];

// Snooze works for every reminder, the system's too.
async function snooze() {
    const minutes = await choiceDialog({ title: 'Snooze the reminder', message: 'It goes off again after:', choices: SNOOZES.map((c, i) => ({ ...c, className: i === 0 ? 'btn-primary' : 'btn-secondary' })) });
    if (minutes === null) return;
    busy.value = true;
    try {
        await api(`/users/reminders/${id}/snooze`, { method: 'POST', body: { minutes } });
        toast(`Snoozed for ${SNOOZES.find((c) => c.key === minutes).label.toLowerCase()}.`);
        refreshScreen();
    } catch (e) {
        toast(e.message);
        busy.value = false;
    }
}

async function remove() {
    if (!(await confirmDialog({ title: 'Delete this reminder?', message: 'It will not go off.', confirmLabel: 'Delete', danger: true }))) return;
    busy.value = true;
    try {
        await api(`/users/reminders/${id}`, { method: 'DELETE' });
        toast('Reminder deleted.');
        navigate('/reminders', { replace: true });
    } catch (e) {
        toast(e.message);
        busy.value = false;
    }
}

onMounted(async () => {
    try {
        reminder.value = await api(`/users/reminders/${id}`);
    } catch (e) {
        error.value = e;
        return;
    }
    await nextTick();
    restoreScroll(shell.value?.content, props.path);
});
</script>

<template>
    <Shell ref="shell" tab="reminders" title="Reminder" back="/reminders">
        <ErrorBox v-if="error" :error="error" @retry="render()" />
        <Loading v-else-if="!reminder" />
        <template v-else>
            <section class="reminder-head" :class="{ 'is-past': reminder.sent }">
                <Icon name="clock" />
                <div>
                    <strong>{{ reminder.remind_time }}</strong>
                    <span>{{ reminder.remind_at.slice(0, 10) }}</span>
                </div>
                <span class="pill" :class="reminder.sent ? 'is-muted' : 'is-accent'">{{ reminder.sent ? 'Sent' : 'Upcoming' }}</span>
            </section>

            <h2 class="section-title">Reminder</h2>
            <div class="note-card">{{ reminder.description }}</div>

            <div class="details">
                <div v-if="reminder.sent_at" class="detail"><span>Sent</span><strong>{{ reminder.sent_at }}</strong></div>
                <div class="detail"><span>Created by</span><strong>{{ reminder.source.name }}</strong></div>
                <div class="detail"><span>Created</span><strong>{{ reminder.created_at }}</strong></div>
                <div v-if="reminder.snooze_count" class="detail"><span>Snoozed</span><strong>{{ reminder.snooze_count }}×</strong></div>
            </div>

            <p v-if="!reminder.can_delete" class="hint">Created by the system: you can snooze it, but not change or delete it.</p>

            <div class="request-actions">
                <button type="button" class="btn btn-primary btn-block" :disabled="busy" @click="snooze"><Icon name="clock" /> Snooze</button>
                <a v-if="reminder.can_remind_again && reminder.sent" :href="`/reminders/${id}/edit`" data-link class="btn btn-secondary btn-block">Remind me again</a>
                <a v-else-if="reminder.can_edit" :href="`/reminders/${id}/edit`" data-link class="btn btn-secondary btn-block">Edit</a>
                <button v-if="reminder.can_delete" type="button" class="btn btn-danger btn-block" :disabled="busy" @click="remove">Delete</button>
            </div>
        </template>
    </Shell>
</template>
