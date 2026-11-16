<script setup>
// /reminders/{id} — one reminder (where its push notification opens).
import { nextTick, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import { api } from '../lib/api';
import { confirmDialog, navigate, render, restoreScroll, toast } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const id = Number(props.params[0]);
const shell = ref(null);
const reminder = shallowRef(null);
const error = shallowRef(null);
const busy = ref(false);

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
                <div class="detail"><span>Created</span><strong>{{ reminder.created_at }}</strong></div>
            </div>

            <div class="request-actions">
                <a :href="`/reminders/${id}/edit`" data-link class="btn btn-primary btn-block">{{ reminder.sent ? 'Remind me again' : 'Edit' }}</a>
                <button type="button" class="btn btn-danger btn-block" :disabled="busy" @click="remove">Delete</button>
            </div>
        </template>
    </Shell>
</template>
