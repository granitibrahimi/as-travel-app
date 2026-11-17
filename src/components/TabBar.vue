<script setup>
import { can, canSeeNotifications, state } from '../store';
import Icon from './Icon';

defineProps({ active: { type: String, required: true } });
</script>

<template>
    <nav class="tabbar">
        <a href="/" data-link class="tab" :class="{ 'is-active': active === 'requests' }"><Icon name="requests" /><span>Requests</span></a>
        <a v-if="canSeeNotifications()" href="/notifications" data-link class="tab" :class="{ 'is-active': active === 'notifications' }">
            <span class="tab-icon"><Icon name="bell" /><b class="tab-badge" :hidden="!state.unreadCount">{{ state.unreadCount > 99 ? '99+' : state.unreadCount || '' }}</b></span><span>Notifications</span>
        </a>
        <a v-if="can('reminders.use')" href="/reminders" data-link class="tab" :class="{ 'is-active': active === 'reminders' }"><Icon name="clock" /><span>Reminders</span></a>
        <a v-if="can('aiChat.use')" href="/chat" data-link class="tab" :class="{ 'is-active': active === 'chat' }"><Icon name="chat" /><span>Asistenti</span></a>
        <a href="/profile" data-link class="tab" :class="{ 'is-active': active === 'profile' }"><Icon name="user" /><span>Profile</span></a>
    </nav>
</template>
