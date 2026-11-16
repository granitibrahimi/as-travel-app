<script setup>
// The B2B app's toast(): one at a time, gone after 2.6 s.
import { ref, watch } from 'vue';
import { state } from '../store';

const shown = ref(null);
let timers = [];

watch(
    () => state.toast,
    (toast) => {
        timers.forEach(clearTimeout);
        if (!toast) return;
        shown.value = { ...toast, hiding: false };
        timers = [
            setTimeout(() => (shown.value = { ...toast, hiding: true }), 2200),
            setTimeout(() => (shown.value = null), 2600),
        ];
    },
);
</script>

<template>
    <Teleport to="body">
        <div v-if="shown" :key="shown.id" class="toast" :class="{ 'is-hiding': shown.hiding }">{{ shown.message }}</div>
    </Teleport>
</template>
