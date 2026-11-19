// The app's state and frame, as in the Exclusive Agents app: who is signed in,
// navigation, refresh (render()), toasts, dialogs, push, theme, the tab badge.

import { reactive } from 'vue';
import { api, onUnauthorized, storage, THEME_KEY, TOKEN_KEY } from './lib/api';
import { router } from './router';

export const state = reactive({
    token: storage.get(TOKEN_KEY),
    /** GET /users/me: { id, name, email, role, permissions, has_push_subscription }. */
    profile: null,
    /** /me failed (not a 401): the frame shows it with "Try again". */
    profileError: null,
    /** Bumped by render(): the current screen is drawn again from scratch. */
    version: 0,
    unreadCount: 0,
    pushActive: false,
    /** The "Turn on notifications" popup is open (src/components/PushPrompt.vue). */
    pushPrompt: false,
    toast: null,
    dialog: null,
});

/** Whether the signed-in user holds a permission (administrators get '*'). */
export const can = (permission) => {
    const permissions = state.profile?.permissions ?? [];
    return permissions.includes('*') || permissions.includes(permission);
};

export const canListRequests = () => can('simpleTasks.list') || can('simpleTasks.listAll') || can('simpleTasks.receive');
export const seesAllRequests = () => can('simpleTasks.listAll');
export const canSeeNotifications = () => can('userNotifications.list');

/** Each screen remembers its scroll position and state so "back" lands where you were. */
export const memory = new Map();

export const currentPath = () => router.currentRoute.value.path.replace(/\/+$/, '') || '/';

export function navigate(path, { replace = false } = {}) {
    return replace ? router.replace(path) : router.push(path);
}

/** Draw the current screen again from scratch. */
export function render() {
    state.version++;
}

/** Redraw the open screen, keeping its scroll position. */
export function refreshScreen() {
    const scroll = document.querySelector('.content')?.scrollTop ?? 0;
    memory.set(currentPath(), { ...(memory.get(currentPath()) ?? {}), scroll });
    render();
}

/** `payload`: the API's 401 body; two_factor_setup_required means sign in again to set up two-factor. */
export function signOut(payload = null) {
    state.token = null;
    state.profile = null;
    state.profileError = null;
    state.pushPrompt = false;
    state.pushActive = false;
    state.unreadCount = 0;
    memory.clear();
    storage.set(TOKEN_KEY, null);
    navigate(payload?.two_factor_setup_required ? '/login?reason=two-factor' : '/login', { replace: true });
}

onUnauthorized(signOut);

let toastId = 0;

export function toast(message) {
    state.toast = { message, id: ++toastId };
}

/**
 * Asks before an action, in the app's own sheet instead of the browser's
 * confirm(). Resolves true on the confirm button, false on Cancel, a tap
 * outside or Escape.
 */
export function confirmDialog({ title, message = '', confirmLabel = 'Yes', cancelLabel = 'Cancel', danger = false }) {
    return new Promise((resolve) => {
        state.dialog?.resolve(state.dialog.kind === 'confirm' ? false : null);
        state.dialog = { kind: 'confirm', title, message, confirmLabel, cancelLabel, danger, resolve };
    });
}

/**
 * Like confirmDialog(), with one button per answer (stacked) and an X in the corner.
 * `choices`: [{ key, label, danger? }]. Resolves the chosen `key`, or null.
 */
export function choiceDialog({ title, message = '', choices, cancelLabel = 'Cancel' }) {
    return new Promise((resolve) => {
        state.dialog?.resolve(state.dialog.kind === 'confirm' ? false : null);
        state.dialog = { kind: 'choice', title, message, choices, cancelLabel, resolve };
    });
}

/**
 * Asks for a text (a textarea in the app's sheet). The confirm button stays
 * disabled until something is typed when `required`. Resolves the trimmed
 * text, or null on Cancel.
 */
export function textDialog({ title, message = '', label = '', placeholder = '', confirmLabel = 'Save', cancelLabel = 'Cancel', required = true }) {
    return new Promise((resolve) => {
        state.dialog?.resolve(state.dialog.kind === 'confirm' ? false : null);
        state.dialog = { kind: 'text', title, message, label, placeholder, confirmLabel, cancelLabel, required, resolve };
    });
}

// ── Unread notifications (the "Notifications" tab badge) ────────────────

export async function refreshUnread() {
    if (!state.token || !canSeeNotifications()) return;
    try {
        const data = await api('/users/notifications/unread-count');
        state.unreadCount = Number(data?.count) || 0;
    } catch {
        // Keep the badge as it was.
    }
}

// ── Theme ───────────────────────────────────────────────────────────────

export function applyTheme() {
    const theme = storage.get(THEME_KEY);
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
    else delete root.dataset.theme;
    const dark = theme === 'dark' || (theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#3d1214' : '#d92128');
}

// ── Deploys ─────────────────────────────────────────────────────────────

/** The built files this page loaded: when "/" names others, a new version is deployed. */
const builtFiles = () =>
    [...document.querySelectorAll('script[src*="/assets/"], link[rel="stylesheet"][href*="/assets/"]')].map(
        (el) => new URL(el.src || el.href, location.href).pathname,
    );

/** An installed app stays open for days: reload when "/" now references other built files. */
export async function reloadIfDeployed() {
    try {
        const page = await (await fetch('/', { cache: 'no-store' })).text();
        const current = builtFiles();
        if (current.length && current.some((file) => !page.includes(file))) location.reload();
    } catch {
        /* offline: keep what we have */
    }
}

export const installPrompt = { event: null };

/** Put a screen's saved scroll position back (after its data is drawn). */
export function restoreScroll(content, key) {
    const saved = memory.get(key)?.scroll;
    if (saved && content) content.scrollTop = saved;
}
