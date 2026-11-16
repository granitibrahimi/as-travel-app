<script setup>
// /profile — who's signed in, install, notifications, theme, sign out.
import { ref } from 'vue';
import Icon from '../components/Icon';
import PushRow from '../components/PushRow.vue';
import Shell from '../components/Shell.vue';
import { api, storage, THEME_KEY } from '../lib/api';
import { initials } from '../lib/format';
import { forgetPush, isIos, isStandalone } from '../lib/push';
import { applyTheme, can, confirmDialog, installPrompt, signOut, state } from '../store';

defineProps({ params: Array, path: String, tab: String });
const profile = state.profile;
const standalone = isStandalone();
const installHelp = ref('');
const theme = ref(storage.get(THEME_KEY) ?? 'auto');

const roles = [
    can('simpleTasks.receive') && 'Receives requests',
    can('simpleTasks.responsible') && 'Responsible for requests',
].filter(Boolean);

async function install() {
    if (installPrompt.event) {
        installPrompt.event.prompt();
        await installPrompt.event.userChoice;
        installPrompt.event = null;
        return;
    }
    installHelp.value = isIos()
        ? 'In Safari, tap the Share button (the square with an arrow), then "Add to Home Screen".'
        : 'Open the browser menu (⋮) and choose "Install app" or "Add to Home screen".';
}

function pickTheme(value) {
    storage.set(THEME_KEY, value === 'auto' ? null : value);
    applyTheme();
    theme.value = value;
}

async function logout() {
    if (!(await confirmDialog({ title: 'Sign out?', message: 'This phone stops getting your notifications.', confirmLabel: 'Sign out', danger: true }))) return;
    await forgetPush();
    try {
        await api('/users/tokens', { method: 'DELETE' });
    } catch {
        /* signed out locally anyway */
    }
    signOut();
}
</script>

<template>
    <Shell tab="profile" title="Profile">
        <section class="profile">
            <div class="avatar">{{ initials(profile.name) }}</div>
            <strong>{{ profile.name }}</strong>
            <span>{{ profile.email }}</span>
            <span v-if="profile.role" class="role-pill">{{ profile.role }}</span>
            <span v-for="r in roles" :key="r" class="profile-note">{{ r }}</span>
        </section>

        <h2 class="section-title">Notifications</h2>
        <PushRow />

        <template v-if="!standalone">
            <h2 class="section-title">App</h2>
            <div class="list">
                <button type="button" class="row" @click="install">
                    <div class="row-main"><div class="row-title">Install the app</div><div class="row-sub">Add AS Travel to your phone’s home screen</div></div>
                    <span class="row-chevron"><Icon name="chevron" /></span>
                </button>
            </div>
            <p v-if="installHelp" class="hint">{{ installHelp }}</p>
        </template>

        <h2 class="section-title">Appearance</h2>
        <div class="segmented">
            <button
                v-for="[value, label] in [
                    ['auto', 'Automatic'],
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                ]"
                :key="value"
                type="button"
                :class="{ 'is-active': theme === value }"
                @click="pickTheme(value)"
            >
                {{ label }}
            </button>
        </div>

        <button type="button" class="btn btn-danger btn-block" @click="logout">Sign out</button>
    </Shell>
</template>
