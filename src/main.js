import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { applyTheme, currentPath, installPrompt, memory, refreshScreen, refreshUnread, reloadIfDeployed, state } from './store';
import './app.css';

applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt.event = event;
});

// Links inside the app route here instead of reloading the page (<a href data-link>).
document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-link]');
    if (!link || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    if (link.dataset.back !== undefined && history.state?.fromApp) {
        router.back();
        return;
    }
    const scroll = document.querySelector('.content')?.scrollTop ?? 0;
    memory.set(location.pathname, { ...(memory.get(location.pathname) ?? {}), scroll });
    router.push({ path: link.getAttribute('href'), state: { fromApp: true } });
});

// No pinch zoom: Safari ignores user-scalable=no, so stop its gesture events.
['gesturestart', 'gesturechange'].forEach((name) =>
    document.addEventListener(name, (event) => event.preventDefault(), { passive: false }),
);

/** The list or the open request: show what changed (a push came in, or the app came back). */
function refreshOpenScreen() {
    if (!state.token || !state.profile || document.visibilityState !== 'visible') return;
    refreshUnread();
    const path = currentPath();
    if (path === '/' || /^\/requests\/\d+$/.test(path) || path === '/notifications') refreshScreen();
}

// An installed app stays open for days: when it comes back to the screen,
// reload after a deploy, otherwise bring the open screen up to date.
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
    }
    reloadIfDeployed();
    if (hiddenAt && Date.now() - hiddenAt > 30 * 1000) refreshOpenScreen();
});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    // public/sw.js tells the open app about each push it shows.
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'push') refreshOpenScreen();
    });
}

// Mount once the router has read the address bar (a notification opens a deep link).
const app = createApp(App).use(router);
router.isReady().then(() => app.mount('#app'));
