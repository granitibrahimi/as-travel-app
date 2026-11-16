// Push notifications (ported from the Exclusive Agents app). Once the user
// allows notifications, the browser's push subscription (from public/sw.js) is
// saved with POST /users/push-subscriptions, so "Request assigned" and the
// status updates arrive even with the app closed: on Android, and on iOS
// (16.4+) once the app is on the home screen. The VAPID public key is the
// API's WEBPUSH_VAPID_PUBLIC_KEY, given as VITE_WEBPUSH_PUBLIC_KEY.

import { state } from '../store';
import { api } from './api';

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export const pushKey = () => import.meta.env.VITE_WEBPUSH_PUBLIC_KEY || '';
export const pushSupported = () =>
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && Boolean(pushKey());

const keyBytes = (base64url) => {
    const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};

/**
 * Save this browser's subscription (when notifications are allowed). With
 * `test`, the API sends this browser a test notification. Resolves true when
 * the API has it.
 */
export async function syncPush({ test = false } = {}) {
    if (!pushSupported() || Notification.permission !== 'granted' || !state.token) return false;
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription =
            (await registration.pushManager.getSubscription()) ??
            (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pushKey()) }));
        await api('/users/push-subscriptions', { method: 'POST', body: { ...subscription.toJSON(), ...(test ? { test: true } : {}) } });
        state.pushActive = true;
        if (state.profile) state.profile.has_push_subscription = true;
        return true;
    } catch {
        return false;
    }
}

/** Ask (call it from a tap) and subscribe. Resolves to { permission, saved }. */
export async function enablePush({ test = false } = {}) {
    if (!('Notification' in window)) return { permission: 'unsupported', saved: false };
    let permission = Notification.permission;
    if (permission === 'default') {
        try {
            permission = await Notification.requestPermission();
        } catch {
            return { permission: 'default', saved: false };
        }
    }
    const saved = permission === 'granted' ? await syncPush({ test }) : false;
    return { permission, saved };
}

// ── "Turn on notifications" popup ───────────────────────────────────────
// Each time the app opens signed in on a browser that could get notifications
// while the API keeps none for the user, a popup asks for them; once allowed
// the API sends a test one. "Later" closes it until the app is opened again
// (or comes back after half an hour in the background).

const PROMPT_AGAIN_AFTER_MS = 30 * 60 * 1000;
let promptShownFor = null;
let hiddenSince = 0;

export function needsPushPrompt() {
    const profile = state.profile;
    if (!profile || profile.has_push_subscription !== false) return false;
    if (isIos() && !isStandalone()) return false; // iPhone: only from the home screen app
    return pushSupported() && Notification.permission !== 'denied';
}

/** After /me: ask with the popup when needed, otherwise keep the subscription fresh without asking. */
export function pushAfterProfile() {
    if (!needsPushPrompt()) return syncPush();
    if (promptShownFor === state.token) return;
    promptShownFor = state.token;
    state.pushPrompt = true;
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        hiddenSince = Date.now();
    } else if (hiddenSince && Date.now() - hiddenSince > PROMPT_AGAIN_AFTER_MS) {
        promptShownFor = null;
        if (!state.token || !state.profile || state.pushPrompt) return;
        api('/users/me')
            .then((profile) => {
                if (state.profile) state.profile.has_push_subscription = profile.has_push_subscription;
                pushAfterProfile();
            })
            .catch(() => {});
    }
});

/** Signing out: this browser stops getting the user's notifications. */
export async function forgetPush() {
    if (!pushSupported()) return;
    try {
        const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        if (!subscription) return;
        await api('/users/push-subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } }).catch(() => {});
        await subscription.unsubscribe();
    } catch {
        /* nothing to undo */
    }
}
