<script setup>
// A screen: app bar (with a back link on inner screens), scrolling content,
// tab bar. The content element is exposed so a screen can put its saved
// scroll back (restoreScroll).
import { ref } from 'vue';
import Icon from './Icon';
import TabBar from './TabBar.vue';

defineProps({
    tab: { type: String, default: null },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    back: { type: String, default: null },
});

const content = ref(null);
defineExpose({ content });
</script>

<template>
    <div class="screen">
        <header class="appbar" :class="{ 'has-back': back }">
            <a v-if="back" :href="back" data-link data-back class="appbar-back" aria-label="Back"><Icon name="back" /></a>
            <img v-else class="appbar-logo" src="/app/logo-mark-white.svg" alt="" width="34" height="34" />
            <div class="appbar-titles">
                <h1>{{ title }}</h1>
                <p v-if="subtitle">{{ subtitle }}</p>
            </div>
            <slot name="action" />
        </header>
        <main ref="content" class="content"><slot /></main>
        <slot name="below" />
        <TabBar v-if="tab" :active="tab" />
    </div>
</template>
