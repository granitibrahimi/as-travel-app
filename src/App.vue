<script setup>
// The frame (as in the Exclusive Agents app): on every navigation (and
// render()), check the session, load the profile, pick the screen from the
// route table and draw it from scratch.
import { shallowRef, watch } from 'vue';
import { useRoute } from 'vue-router';
import Dialogs from './components/Dialogs.vue';
import ErrorBox from './components/ErrorBox.vue';
import Loading from './components/Loading.vue';
import PushPrompt from './components/PushPrompt.vue';
import Shell from './components/Shell.vue';
import Toast from './components/Toast.vue';
import LoginScreen from './screens/LoginScreen.vue';
import { api } from './lib/api';
import { pushAfterProfile } from './lib/push';
import { routesFor } from './screens';
import { navigate, refreshUnread, render, state } from './store';

const route = useRoute();
/** What's on screen: 'splash', 'error' or a screen { component, params, tab, key }. */
const view = shallowRef('splash');
let renderToken = 0;

async function draw() {
    const token = ++renderToken;
    const isCurrent = () => token === renderToken;
    const path = route.path.replace(/\/+$/, '') || '/';

    if (!state.token) {
        if (path !== '/login') {
            // Signed out with a deep link (a notification): come back to it after signing in.
            const next = path !== '/' ? `?next=${encodeURIComponent(path)}` : '';
            return navigate(`/login${next}`, { replace: true });
        }
        view.value = { component: LoginScreen, params: [], tab: null, key: path, version: state.version };
        return;
    }
    if (path === '/login') return navigate('/', { replace: true });
    if (!state.profile) {
        try {
            state.profile = await api('/users/me');
            state.profileError = null;
            pushAfterProfile();
            refreshUnread();
        } catch (error) {
            if (error.status === 401 || !isCurrent()) return;
            state.profileError = error;
            view.value = 'error';
            return;
        }
        if (!isCurrent()) return;
    }

    const found = routesFor(state.profile).find(([pattern]) => pattern.test(path));
    if (!found) return navigate('/', { replace: true });

    const [pattern, component, tab] = found;
    view.value = { component, params: path.match(pattern).slice(1), tab, key: path, version: state.version };
}

watch(() => [route.fullPath, state.version], draw, { immediate: true });
</script>

<template>
    <div v-if="view === 'splash'" class="splash"><img src="/app/icon-192.png" alt="" width="72" height="72" /></div>
    <Shell v-else-if="view === 'error'" title="AS Travel">
        <ErrorBox :error="state.profileError" @retry="render()" />
    </Shell>
    <component
        :is="view.component"
        v-else
        :key="`${view.key}#${view.version}`"
        :params="view.params"
        :tab="view.tab"
        :path="view.key"
    />
    <Toast />
    <Dialogs />
    <PushPrompt />
</template>
