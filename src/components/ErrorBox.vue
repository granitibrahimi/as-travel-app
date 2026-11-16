<script setup>
defineProps({ error: { type: Object, required: true } });
defineEmits(['retry']);
</script>

<template>
    <div class="empty">
        <p>{{ error.message }}</p>
        <button type="button" class="btn btn-secondary" @click="$emit('retry')">Try again</button>
    </div>
</template>
