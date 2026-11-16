<script setup>
// /reminders/new and /reminders/{id}/edit — date, time and what to be reminded of.
import { computed, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import { api } from '../lib/api';
import { navigate, render, toast } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const id = props.params[0] ? Number(props.params[0]) : null;

const pad = (n) => String(n).padStart(2, '0');
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// A new reminder starts at the next full hour.
const start = new Date(Date.now() + 60 * 60 * 1000);

const date = ref(localDate(start));
const time = ref(`${pad(start.getHours())}:00`);
const description = ref('');
const loaded = ref(!id);
const error = shallowRef(null);
const fieldErrors = ref({});
const busy = ref(false);

const valid = computed(() => date.value && time.value && description.value.trim());

async function submit() {
    if (!valid.value || busy.value) return;
    busy.value = true;
    fieldErrors.value = {};
    const body = { remind_at: `${date.value} ${time.value}`, description: description.value.trim() };
    try {
        const data = await api(id ? `/users/reminders/${id}` : '/users/reminders', { method: id ? 'PUT' : 'POST', body });
        toast(id ? 'Reminder saved.' : 'Reminder set.');
        navigate(`/reminders/${id ?? data.id}`, { replace: true });
    } catch (e) {
        fieldErrors.value = Object.fromEntries(Object.entries(e.errors ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
        if (!Object.keys(fieldErrors.value).length) toast(e.message);
        busy.value = false;
    }
}

onMounted(async () => {
    if (!id) return;
    try {
        const r = await api(`/users/reminders/${id}`);
        description.value = r.description;
        // A sent reminder being set again starts from the next hour, not its old (past) time.
        if (!r.sent) {
            date.value = r.remind_date;
            time.value = r.remind_time;
        }
        loaded.value = true;
    } catch (e) {
        error.value = e;
    }
});
</script>

<template>
    <Shell :title="id ? 'Edit reminder' : 'New reminder'" :back="id ? `/reminders/${id}` : '/reminders'">
        <ErrorBox v-if="error" :error="error" @retry="render()" />
        <Loading v-else-if="!loaded" />
        <form v-else class="form reminder-form" novalidate @submit.prevent="submit">
            <div class="reminder-when-fields">
                <label class="field"><span>Date</span><input v-model="date" type="date" required /></label>
                <label class="field"><span>Time</span><input v-model="time" type="time" step="300" required /></label>
            </div>
            <p v-if="fieldErrors.remind_at" class="field-error">{{ fieldErrors.remind_at }}</p>
            <label class="field">
                <span>Remind me to…</span>
                <textarea v-model="description" rows="5" maxlength="2000" placeholder="e.g. Call Arta about the Antalya offer" required />
            </label>
            <p v-if="fieldErrors.description" class="field-error">{{ fieldErrors.description }}</p>
            <button type="submit" class="btn btn-primary btn-block btn-lg" :class="{ 'is-busy': busy }" :disabled="busy || !valid">
                {{ id ? 'Save reminder' : 'Set reminder' }}
            </button>
            <p class="form-hint">You get a notification on this phone at that time.</p>
        </form>
    </Shell>
</template>
