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
// Two-factor step after the password: { two_factor: 'code' } asks for the code,
// { two_factor: 'setup', qr_code, otpauth_url, secret } first sets the authenticator up.
const twoFactor = ref(null);
const code = ref('');
const twoFactorRequired = route.query.reason === 'two-factor';

function onCodeInput(event) {
    code.value = event.target.value.replace(/\D/g, '').slice(0, 6);
    event.target.value = code.value;
}

function back() {
    twoFactor.value = null;
    code.value = '';
    password.value = '';
    failure.value = '';
}

async function submit() {
    busy.value = true;
    failure.value = '';
    try {
        const data = await api('/users/tokens', {
            method: 'POST',
            body: {
                email: email.value.trim(),
                password: password.value,
                device_name: DEVICE_NAME,
                ...(twoFactor.value ? { code: code.value } : {}),
            },
        });
        if (data.two_factor) {
            twoFactor.value = data;
            code.value = '';
            busy.value = false;
            return;
        }
        state.token = data.token;
        state.profile = null; // App.vue loads /users/me
        storage.set(TOKEN_KEY, data.token);
        const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') ? route.query.next : '/';
        navigate(next, { replace: true });
    } catch (error) {
        failure.value =
            error.status === 422 ? (error.errors?.code?.[0] ?? error.errors?.email?.[0] ?? 'The e-mail or password is wrong.') : error.message;
        code.value = '';
        busy.value = false;
    }
}
</script>

<template>
    <div class="login">
        <div class="login-brand">
            <img src="/app/logo.svg" alt="AS Travel" class="login-logo" width="220" height="51" />
        </div>
        <p v-if="twoFactorRequired && !twoFactor" class="login-note">Two-factor authentication is now required. Sign in to set it up.</p>
        <form v-if="!twoFactor" class="form" novalidate @submit.prevent="submit">
            <label class="field"
                ><span>E-mail or username</span
                ><input v-model="email" type="text" name="email" autocomplete="username" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" required
            /></label>
            <label class="field"><span>Password</span><input v-model="password" type="password" name="password" autocomplete="current-password" required /></label>
            <p class="form-error" :hidden="!failure">{{ failure }}</p>
            <button type="submit" class="btn btn-primary btn-block btn-lg" :class="{ 'is-busy': busy }" :disabled="busy || !email || !password">Sign in</button>
        </form>
        <form v-else class="form" novalidate @submit.prevent="code.length === 6 && submit()">
            <template v-if="twoFactor.two_factor === 'setup'">
                <p class="login-step-title">Set up two-factor authentication</p>
                <p class="login-step-text">Add AS Travel to an authenticator app (Google or Microsoft Authenticator, 1Password, ...), then enter the 6-digit code it shows.</p>
                <a :href="twoFactor.otpauth_url" class="btn btn-secondary btn-block">Open in authenticator app</a>
                <img :src="twoFactor.qr_code" alt="Two-factor QR code" class="login-qr" width="200" height="200" />
                <p class="login-step-text">
                    Or scan the QR code from another device, or enter this key: <span class="login-key">{{ twoFactor.secret }}</span>
                </p>
            </template>
            <label class="field"
                ><span>Code from your authenticator app</span
                ><input
                    :value="code"
                    type="text"
                    name="code"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    placeholder="123456"
                    class="login-code"
                    @input="onCodeInput"
            /></label>
            <p class="form-error" :hidden="!failure">{{ failure }}</p>
            <button type="submit" class="btn btn-primary btn-block btn-lg" :class="{ 'is-busy': busy }" :disabled="busy || code.length !== 6">
                {{ twoFactor.two_factor === 'setup' ? 'Confirm and sign in' : 'Verify' }}
            </button>
            <button type="button" class="btn btn-link" @click="back">Back</button>
        </form>
        <p class="login-foot">Use the same account as the AS Travel platform.</p>
    </div>
</template>
