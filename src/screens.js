// The route table: [pattern, screen, tab]. App.vue picks the first match for
// the signed-in user (a screen they have no permission for isn't listed).

import LoginScreen from './screens/LoginScreen.vue';
import NotificationsScreen from './screens/NotificationsScreen.vue';
import ProfileScreen from './screens/ProfileScreen.vue';
import ReminderFormScreen from './screens/ReminderFormScreen.vue';
import ReminderScreen from './screens/ReminderScreen.vue';
import RemindersScreen from './screens/RemindersScreen.vue';
import RequestScreen from './screens/RequestScreen.vue';
import RequestsScreen from './screens/RequestsScreen.vue';
import { canSeeNotifications } from './store';

export function routesFor(profile) {
    if (!profile) return [[/^\/login$/, LoginScreen, null]];

    return [
        [/^\/$/, RequestsScreen, 'requests'],
        [/^\/requests\/(\d+)$/, RequestScreen, 'requests'],
        ...(canSeeNotifications() ? [[/^\/notifications$/, NotificationsScreen, 'notifications']] : []),
        [/^\/reminders$/, RemindersScreen, 'reminders'],
        [/^\/reminders\/new$/, ReminderFormScreen, 'reminders'],
        [/^\/reminders\/(\d+)\/edit$/, ReminderFormScreen, 'reminders'],
        [/^\/reminders\/(\d+)$/, ReminderScreen, 'reminders'],
        [/^\/profile$/, ProfileScreen, 'profile'],
    ];
}
