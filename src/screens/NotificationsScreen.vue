<script setup>
// /notifications — what the platform sent this user, newest first. Opening one
// marks it read and goes to the request it is about.
import { nextTick, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import { api } from '../lib/api';
import { can, navigate, refreshUnread, render, restoreScroll, state } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const shell = ref(null);
const rows = shallowRef(null);
const error = shallowRef(null);
const page = ref(0);
const lastPage = ref(1);
const busy = ref(false);

/** A notification's link inside this app: a request (same path as the SPA) or a reminder. */
const appLink = (url) => (url && (/^\/requests\/\d+$/.test(url) || (can('reminders.use') && /^\/reminders\/\d+$/.test(url))) ? url : null);

async function load() {
    busy.value = true;
    try {
        const data = await api(`/users/notifications?page=${page.value + 1}`);
        page.value = data.pagination.current_page;
        lastPage.value = data.pagination.last_page;
        rows.value = [...(rows.value ?? []), ...data.items];
    } catch (e) {
        error.value = e;
    } finally {
        busy.value = false;
    }
}

async function open(n) {
    if (!n.is_read) {
        api(`/users/notifications/${n.id}/read`, { method: 'POST' })
            .then(refreshUnread)
            .catch(() => {});
        rows.value = rows.value.map((r) => (r.id === n.id ? { ...r, is_read: true } : r));
        state.unreadCount = Math.max(0, state.unreadCount - 1);
    }
    const link = appLink(n.action_url);
    if (link) navigate(link);
}

onMounted(async () => {
    await load();
    await nextTick();
    restoreScroll(shell.value?.content, props.path);
});
</script>

<template>
    <Shell ref="shell" tab="notifications" title="Notifications">
        <ErrorBox v-if="error" :error="error" @retry="render()" />
        <Loading v-else-if="!rows" />
        <div v-else-if="rows.length === 0" class="empty"><p>No notifications yet.</p></div>
        <template v-else>
            <div class="list">
                <button v-for="n in rows" :key="n.id" type="button" class="row" @click="open(n)">
                    <div class="row-main">
                        <div class="row-title"><span v-if="!n.is_read" class="unread-dot" aria-label="Unread"></span>{{ n.title || n.type_label }}</div>
                        <div v-if="n.body" class="row-sub">{{ n.body }}</div>
                        <div class="row-sub">{{ n.created_at }}</div>
                    </div>
                    <span v-if="appLink(n.action_url)" class="row-chevron"><Icon name="chevron" /></span>
                </button>
            </div>
            <button v-if="page < lastPage" type="button" class="btn btn-secondary btn-block" :class="{ 'is-busy': busy }" :disabled="busy" @click="load">Show more</button>
        </template>
    </Shell>
</template>
