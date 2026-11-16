<script setup>
// / — the customer requests: assigned to me by default; with
// simpleTasks.listAll also unassigned / everyone's. Active (open, assigned)
// by default, or finished (offer sent, spam). Search by customer or #id.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import StatusPill from '../components/StatusPill.vue';
import { api, query } from '../lib/api';
import { canListRequests, memory, render, restoreScroll, seesAllRequests, state } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const key = props.path;
const shell = ref(null);
const saved = memory.get(key) ?? {};
const allowed = canListRequests();
const seesAll = seesAllRequests();

const SCOPES = seesAll
    ? [
          ['mine', 'Mine'],
          ['none', 'Unassigned'],
          ['all', 'All'],
      ]
    : [];
const STATUSES = [
    ['active', 'Active'],
    ['finished', 'Finished'],
    ['', 'All'],
];

const scope = ref(saved.scope ?? (seesAll ? 'mine' : 'all'));
const status = ref(saved.status ?? 'active');
const search = ref(saved.search ?? '');
const items = shallowRef(null);
const total = ref(0);
const page = ref(0);
const lastPage = ref(1);
const error = shallowRef(null);
const busy = ref(false);
let searchTimer = null;
let loadToken = 0;

const remember = () => memory.set(key, { ...(memory.get(key) ?? {}), scope: scope.value, status: status.value, search: search.value });

const params = computed(() => ({
    mine: scope.value === 'mine' ? 1 : undefined,
    assigned_to: scope.value === 'none' ? 'none' : undefined,
    status: status.value,
    q: search.value.trim(),
}));

async function load({ more = false } = {}) {
    const token = ++loadToken;
    busy.value = true;
    const next = more ? page.value + 1 : 1;
    // Coming back to the list: load as many pages as were open, so the scroll lands on the same row.
    const perPage = !more && saved.pages > 1 ? Math.min(25 * saved.pages, 100) : 25;
    try {
        const data = await api(`/simple-tasks${query({ ...params.value, page: next, per_page: perPage })}`);
        if (token !== loadToken) return;
        items.value = more ? [...items.value, ...data.items] : data.items;
        total.value = data.pagination.total;
        page.value = perPage > 25 ? Math.ceil(data.items.length / 25) : data.pagination.current_page;
        lastPage.value = perPage > 25 ? Math.ceil(data.pagination.total / 25) : data.pagination.last_page;
        error.value = null;
        memory.set(key, { ...(memory.get(key) ?? {}), pages: page.value });
    } catch (e) {
        if (token === loadToken) error.value = e;
    } finally {
        if (token === loadToken) busy.value = false;
    }
}

function pick(which, value) {
    if (which === 'scope') scope.value = value;
    else status.value = value;
    remember();
    memory.set(key, { ...(memory.get(key) ?? {}), pages: 1, scroll: 0 });
    saved.pages = 1;
    items.value = null;
    load();
}

function onSearch() {
    remember();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        saved.pages = 1;
        load();
    }, 300);
}

const emptyText = computed(() => {
    if (search.value.trim()) return 'No request matches your search.';
    if (scope.value === 'mine') return status.value === 'active' ? 'No open requests assigned to you. 🎉' : 'No requests assigned to you here.';
    if (scope.value === 'none') return 'Every active request has an agent.';
    return 'No requests here.';
});

const subtitle = computed(() => (items.value ? `${total.value} ${total.value === 1 ? 'request' : 'requests'}` : ''));

onMounted(async () => {
    if (!allowed) return;
    await load();
    await nextTick();
    restoreScroll(shell.value?.content, key);
});
onBeforeUnmount(() => clearTimeout(searchTimer));
</script>

<template>
    <Shell ref="shell" tab="requests" title="Requests" :subtitle="subtitle">
        <div v-if="!allowed" class="empty">
            <p>Your account can’t see customer requests yet. Ask an administrator for the Requests permissions.</p>
        </div>
        <template v-else>
            <label class="searchbar">
                <Icon name="search" />
                <input v-model="search" type="search" placeholder="Customer, phone or #number" enterkeyhint="search" @input="onSearch" />
            </label>
            <div v-if="SCOPES.length" class="filter-chips">
                <button v-for="[value, label] in SCOPES" :key="value" type="button" class="chip-btn" :class="{ 'is-active': scope === value }" @click="pick('scope', value)">
                    {{ label }}
                </button>
            </div>
            <div class="filter-chips">
                <button v-for="[value, label] in STATUSES" :key="value" type="button" class="chip-btn is-small" :class="{ 'is-active': status === value }" @click="pick('status', value)">
                    {{ label }}
                </button>
            </div>

            <ErrorBox v-if="error && !items" :error="error" @retry="render()" />
            <Loading v-else-if="!items" />
            <div v-else-if="items.length === 0" class="empty"><p>{{ emptyText }}</p></div>
            <template v-else>
                <div class="list">
                    <a v-for="r in items" :key="r.id" class="row request-row" data-link :href="`/requests/${r.id}`">
                        <div class="row-main">
                            <div class="row-title">
                                <span class="request-id">#{{ r.id }}</span> {{ r.customer_name }}
                            </div>
                            <div class="row-sub request-meta">
                                <StatusPill :status="r.status" />
                                <span>{{ r.source.name }}</span>
                                <span v-if="scope !== 'mine' && r.assigned_to">· {{ r.assigned_to.id === state.profile.id ? 'You' : r.assigned_to.name }}</span>
                            </div>
                            <div v-if="r.description" class="row-sub request-desc">{{ r.description }}</div>
                            <div class="row-sub">{{ r.created_at }}</div>
                        </div>
                        <span class="row-chevron"><Icon name="chevron" /></span>
                    </a>
                </div>
                <button v-if="page < lastPage" type="button" class="btn btn-secondary btn-block" :class="{ 'is-busy': busy }" :disabled="busy" @click="load({ more: true })">
                    Show more
                </button>
            </template>
        </template>
    </Shell>
</template>
