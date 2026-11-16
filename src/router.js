// The browser history only: which screen a path draws, and for whom, is decided
// in App.vue from the route table (screens.js), as in the Exclusive Agents app.

import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
    history: createWebHistory(),
    routes: [{ path: '/:path(.*)*', component: { render: () => null } }],
    // Each screen puts its own scroll back (memory), so the router leaves it alone.
    scrollBehavior: () => false,
});
