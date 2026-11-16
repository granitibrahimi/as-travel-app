<script setup>
// /login — sign in with the AS Travel platform account (e-mail or username).
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, DEVICE_NAME, storage, TOKEN_KEY } from '../lib/api';
import { navigate, state } from '../store';

defineProps({ params: Array, path: String, tab: String });
const route = useRoute();
const email = ref('');
const password = ref('');
const failure = ref('');
const busy = ref(false);

async function submit() {
    busy.value = true;
    failure.value = '';
    try {
        const data = await api('/users/tokens', {
            method: 'POST',
            body: { email: email.value.trim(), password: password.value, device_name: DEVICE_NAME },
        });
        state.token = data.token;
        state.profile = null; // App.vue loads /users/me
        storage.set(TOKEN_KEY, data.token);
        const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/';
        navigate(next, { replace: true });
    } catch (error) {
        failure.value = error.status === 422 ? (error.errors?.email?.[0] ?? 'The e-mail or password is wrong.') : error.message;
        busy.value = false;
    }
}
</script>

<template>
    <div class="login">
        <div class="login-brand">
            <img src="/app/logo.svg" alt="AS Travel" class="login-logo" width="220" height="51" />
        </div>
        <form class="form" novalidate @submit.prevent="submit">
            <label class="field"
                ><span>E-mail or username</span
                ><input v-model="email" type="text" name="email" autocomplete="username" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" required
            /></label>
            <label class="field"><span>Password</span><input v-model="password" type="password" name="password" autocomplete="current-password" required /></label>
            <p class="form-error" :hidden="!failure">{{ failure }}</p>
            <button type="submit" class="btn btn-primary btn-block btn-lg" :class="{ 'is-busy': busy }" :disabled="busy || !email || !password">Sign in</button>
        </form>
        <p class="login-foot">Use the same account as the AS Travel platform.</p>
    </div>
</template>
