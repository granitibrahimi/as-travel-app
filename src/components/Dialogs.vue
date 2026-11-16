<script setup>
// The B2B app's confirmDialog() / choiceDialog(): the app's own sheet instead of
// the browser's confirm().
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { state } from '../store';

const closing = ref(false);
const first = ref(null);
/** pickDialog(): the checked items' keys. */
const picked = ref([]);
/** textDialog(): the typed text. */
const text = ref('');
const allPicked = () => picked.value.length === state.dialog.items.length;
const toggleAll = () => (picked.value = allPicked() ? [] : state.dialog.items.map((i) => i.key));

function close(answer) {
    const dialog = state.dialog;
    if (!dialog || closing.value) return;
    closing.value = true;
    dialog.resolve(answer);
    setTimeout(() => {
        closing.value = false;
        if (state.dialog === dialog) state.dialog = null;
    }, 150);
}

const cancel = () => close(state.dialog?.kind === 'confirm' ? false : null); // pick and choice: null
const onKey = (event) => {
    if (event.key === 'Escape' && state.dialog) cancel();
};

watch(
    () => state.dialog,
    async (dialog) => {
        if (!dialog) return;
        picked.value = [];
        text.value = '';
        await nextTick();
        (Array.isArray(first.value) ? first.value[0] : first.value)?.focus();
    },
);
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
    <Teleport to="body">
        <div v-if="state.dialog" class="confirm" :class="{ 'is-closing': closing }" role="dialog" aria-modal="true">
            <div class="confirm-backdrop" @click="cancel" />
            <div class="confirm-panel" :class="{ 'has-close': state.dialog.kind === 'choice' }">
                <button v-if="state.dialog.kind === 'choice'" type="button" class="confirm-close" aria-label="Close" @click="close(null)">
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" /></svg>
                </button>
                <h2 class="confirm-title">{{ state.dialog.title }}</h2>
                <p v-if="state.dialog.message" class="confirm-message">{{ state.dialog.message }}</p>
                <div v-if="state.dialog.kind === 'confirm'" class="confirm-actions">
                    <button type="button" class="btn btn-secondary" @click="close(false)">{{ state.dialog.cancelLabel }}</button>
                    <button
                        ref="first"
                        type="button"
                        class="btn"
                        :class="state.dialog.danger ? 'btn-confirm-danger' : 'btn-primary'"
                        @click="close(true)"
                    >
                        {{ state.dialog.confirmLabel }}
                    </button>
                </div>
                <template v-else-if="state.dialog.kind === 'pick'">
                    <div class="pick-list">
                        <label v-for="item in state.dialog.items" :key="item.key" class="pick-item" :class="{ 'is-picked': picked.includes(item.key) }">
                            <input v-model="picked" type="checkbox" :value="item.key" />
                            <span class="pick-label">{{ item.label }}</span>
                            <span v-if="item.detail" class="pick-detail">{{ item.detail }}</span>
                        </label>
                        <button v-if="state.dialog.items.length > 1" type="button" class="pick-all" @click="toggleAll">
                            {{ allPicked() ? 'Clear all' : 'Select all' }}
                        </button>
                    </div>
                    <div class="confirm-actions">
                        <button ref="first" type="button" class="btn btn-secondary" @click="close(null)">{{ state.dialog.cancelLabel }}</button>
                        <button
                            type="button"
                            class="btn"
                            :class="state.dialog.danger ? 'btn-confirm-danger' : 'btn-primary'"
                            :disabled="picked.length === 0"
                            @click="close([...picked])"
                        >
                            {{ state.dialog.confirmLabel }}
                        </button>
                    </div>
                </template>
                <template v-else-if="state.dialog.kind === 'text'">
                    <label class="field">
                        <span v-if="state.dialog.label">{{ state.dialog.label }}</span>
                        <textarea ref="first" v-model="text" rows="8" :placeholder="state.dialog.placeholder" />
                    </label>
                    <div class="confirm-actions">
                        <button type="button" class="btn btn-secondary" @click="close(null)">{{ state.dialog.cancelLabel }}</button>
                        <button
                            type="button"
                            class="btn btn-primary"
                            :disabled="state.dialog.required && !text.trim()"
                            @click="close(text.trim())"
                        >
                            {{ state.dialog.confirmLabel }}
                        </button>
                    </div>
                </template>
                <div v-else class="confirm-actions is-stacked">
                    <button
                        v-for="(c, i) in state.dialog.choices"
                        :key="c.key"
                        :ref="i === 0 ? 'first' : undefined"
                        type="button"
                        class="btn"
                        :class="c.className ?? 'btn-primary'"
                        @click="close(c.key)"
                    >
                        {{ c.label }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>
