<script setup>
// Profile's notifications row: allow them, or say why they can't work here.
import { computed, ref } from 'vue';
import { enablePush, isIos, isStandalone, pushSupported } from '../lib/push';
import { toast } from '../store';
import Icon from './Icon';

const drawn = ref(0);
const row = computed(() => {
    drawn.value;
    const permission = 'Notification' in window ? Notification.permission : 'unsupported';
    if (isIos() && !isStandalone())
        return ['Notifications on iPhone', 'First add the app to your Home Screen (Share → "Add to Home Screen") and open it from there', false];
    if (!pushSupported()) return ['Notifications aren’t supported', 'This browser doesn’t support push notifications', false];
    if (permission === 'granted') return ['Notifications are on', 'Tap to send a test notification to this phone', true];
    if (permission === 'denied') return ['Notifications are blocked', 'Allow them for this app in your phone’s settings', false];
    return ['Turn on notifications', 'Get notified about your requests, even with the app closed', true];
});

async function allow() {
    const { permission, saved } = await enablePush({ test: true });
    if (permission !== 'granted') toast('Notifications weren’t allowed.');
    else if (!saved) toast('Notifications couldn’t be turned on on this phone. Try again.');
    else toast('Notifications are on. We sent you a test one.');
    drawn.value++;
}
</script>

<template>
    <div class="list">
        <button v-if="row[2]" type="button" class="row" @click="allow">
            <div class="row-main"><div class="row-title">{{ row[0] }}</div><div class="row-sub">{{ row[1] }}</div></div>
            <span class="row-chevron"><Icon name="chevron" /></span>
        </button>
        <div v-else class="row">
            <div class="row-main"><div class="row-title">{{ row[0] }}</div><div class="row-sub">{{ row[1] }}</div></div>
        </div>
    </div>
</template>
