<script setup>
import { STATUS_PILL } from '../lib/format';

defineProps({ status: { type: Object, required: true } });
</script>

<template>
    <span class="pill" :class="STATUS_PILL[status.id] ?? ''">{{ status.name }}</span>
</template>
