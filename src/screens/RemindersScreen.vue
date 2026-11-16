<script setup>
// /reminders — the user's own reminders. Upcoming ones (soonest first) go off
// as a push at their date and time; Past ones were already sent.
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import { api, query } from '../lib/api';
import { memory, render, restoreScroll } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const key = props.path;
const shell = ref(null);
const saved = memory.get(key) ?? {};
const SCOPES = [
    ['upcoming', 'Upcoming'],
    ['past', 'Past'],
];

const scope = ref(saved.scope ?? 'upcoming');
const items = shallowRef(null);
const total = ref(0);
const page = ref(0);
const lastPage = ref(1);
const error = shallowRef(null);
const busy = ref(false);

async function load({ more = false } = {}) {
    busy.value = true;
    try {
        const data = await api(`/users/reminders${query({ scope: scope.value, page: more ? page.value + 1 : 1 })}`);
        items.value = more ? [...items.value, ...data.items] : data.items;
        total.value = data.pagination.total;
        page.value = data.pagination.current_page;
        lastPage.value = data.pagination.last_page;
        error.value = null;
    } catch (e) {
        error.value = e;
    } finally {
        busy.value = false;
    }
}

function pick(value) {
    scope.value = value;
    memory.set(key, { ...(memory.get(key) ?? {}), scope: value, scroll: 0 });
    items.value = null;
    load();
}

const subtitle = computed(() => (items.value && scope.value === 'upcoming' ? `${total.value} upcoming` : ''));

onMounted(async () => {
    await load();
    await nextTick();
    restoreScroll(shell.value?.content, key);
});
</script>

<template>
    <Shell ref="shell" tab="reminders" title="Reminders" :subtitle="subtitle">
        <template #action>
            <a href="/reminders/new" data-link class="appbar-action" aria-label="New reminder"><Icon name="plus" /></a>
        </template>

        <div class="filter-chips is-full">
            <button v-for="[value, label] in SCOPES" :key="value" type="button" class="chip-btn" :class="{ 'is-active': scope === value }" @click="pick(value)">
                {{ label }}
            </button>
        </div>

        <ErrorBox v-if="error && !items" :error="error" @retry="render()" />
        <Loading v-else-if="!items" />
        <div v-else-if="items.length === 0" class="empty">
            <p v-if="scope === 'upcoming'">No upcoming reminders.</p>
            <p v-else>No past reminders.</p>
            <a v-if="scope === 'upcoming'" href="/reminders/new" data-link class="btn btn-primary">New reminder</a>
        </div>
        <template v-else>
            <div class="list">
                <a v-for="r in items" :key="r.id" class="row reminder-row" data-link :href="`/reminders/${r.id}`">
                    <div class="reminder-when" :class="{ 'is-past': r.sent }">
                        <strong>{{ r.remind_time }}</strong>
                        <span>{{ r.remind_at.slice(0, 10) }}</span>
                    </div>
                    <div class="row-main">
                        <div class="row-title reminder-text">{{ r.description }}</div>
                        <div v-if="r.sent" class="row-sub">Sent {{ r.sent_at }}</div>
                    </div>
                    <span class="row-chevron"><Icon name="chevron" /></span>
                </a>
            </div>
            <button v-if="page < lastPage" type="button" class="btn btn-secondary btn-block" :class="{ 'is-busy': busy }" :disabled="busy" @click="load({ more: true })">
                Show more
            </button>
        </template>
    </Shell>
</template>
