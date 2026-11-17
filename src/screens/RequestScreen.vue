<script setup>
// /requests/{id} — one customer request: who and how to reach them, what they
// asked, status and agent, the offers sent, and its history. "Add offer"
// records an offer (several per request); "In progress" and "Close" move it on (simpleTasks.changeStatus); "Spam" is a flag that leaves the
// status as it is; "Assign" picks the agent (simpleTasks.assign).
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue';
import ErrorBox from '../components/ErrorBox.vue';
import Icon from '../components/Icon';
import Loading from '../components/Loading.vue';
import Shell from '../components/Shell.vue';
import StatusPill from '../components/StatusPill.vue';
import { api } from '../lib/api';
import { contactLink, destinationNames, whatsappLink } from '../lib/format';
import { can, choiceDialog, confirmDialog, refreshScreen, render, restoreScroll, state, textDialog, toast } from '../store';

const props = defineProps({ params: Array, path: String, tab: String });
const id = Number(props.params[0]);
const shell = ref(null);
const task = shallowRef(null);
const error = shallowRef(null);
const busy = ref(false);

const STATUS = { OPEN: 1, ASSIGNED: 2, OFFER_SENT: 3, IN_PROGRESS: 5 };

const canChangeStatus = computed(() => can('simpleTasks.changeStatus'));
const canAssign = computed(() => can('simpleTasks.assign'));
const finished = computed(() => task.value?.status.finished);
const call = computed(() => contactLink(task.value?.customer_contact));
const whatsapp = computed(() => whatsappLink(task.value?.customer_contact));
const history = computed(() => [...(task.value?.history ?? [])].reverse());

async function setStatus(status, { title, message, confirmLabel, danger = false }) {
    if (!(await confirmDialog({ title, message, confirmLabel, danger }))) return;
    busy.value = true;
    try {
        await api(`/simple-tasks/${id}/status`, { method: 'PUT', body: { status } });
        toast(status === STATUS.OFFER_SENT ? 'Request closed.' : status === STATUS.IN_PROGRESS ? 'Moved to In progress.' : 'Request reopened.');
        refreshScreen();
    } catch (e) {
        toast(e.message);
        busy.value = false;
    }
}

// Add offer: the agent pastes an offer as sent. The request stays open; several offers can follow.
async function addOffer() {
    const offerText = await textDialog({
        title: `Offer ${(task.value.offers?.length ?? 0) + 1}`,
        message: `Paste the offer exactly as you sent it to ${task.value.customer_name}. The request stays open until you close it.`,
        label: 'Offer sent to the customer',
        placeholder: 'Paste the offer text here…',
        confirmLabel: 'Save offer',
    });
    if (!offerText) return;
    busy.value = true;
    try {
        await api(`/simple-tasks/${id}/offers`, { method: 'POST', body: { offer_text: offerText } });
        toast('Offer saved.');
        refreshScreen();
    } catch (e) {
        toast(e.message);
        busy.value = false;
    }
}
const close = () =>
    setStatus(STATUS.OFFER_SENT, {
        title: 'Close the request?',
        message: 'The request is closed and the responsible agents are notified.',
        confirmLabel: 'Close',
    });
const inProgress = () =>
    setStatus(STATUS.IN_PROGRESS, {
        title: 'Start working on it?',
        message: task.value.assigned_to ? 'The request moves to In progress.' : 'The request moves to In progress and is assigned to you.',
        confirmLabel: 'In progress',
    });

// Spam is a flag, like Urgent: the status stays as it is.
async function toggleSpam() {
    const on = !task.value.spam;
    const ok = await confirmDialog(on
        ? { title: 'Mark as spam?', message: 'The request keeps its status and gets the Spam flag. The responsible agents are notified.', confirmLabel: 'Spam', danger: true }
        : { title: 'Remove the Spam flag?', message: 'The request is no longer marked as spam.', confirmLabel: 'Not spam' });
    if (!ok) return;
    busy.value = true;
    try {
        await api(`/simple-tasks/${id}/spam`, { method: 'PUT', body: { spam: on } });
        toast(on ? 'Marked as spam.' : 'Spam flag removed.');
        refreshScreen();
    } catch (e) {
        toast(e.message);
        busy.value = false;
    }
}
const reopen = () =>
    setStatus(task.value.assigned_to ? STATUS.ASSIGNED : STATUS.OPEN, {
        title: 'Reopen the request?',
        message: 'It goes back to the active requests.',
        confirmLabel: 'Reopen',
    });

async function assign() {
    busy.value = true;
    let agents;
    try {
        agents = (await api('/simple-tasks/options')).agents;
    } catch (e) {
        toast(e.message);
        busy.value = false;
        return;
    }
    busy.value = false;
    const current = task.value.assigned_to?.id;
    const me = agents.find((a) => a.id === state.profile.id);
    const choices = [
        ...(me && current !== me.id ? [{ key: me.id, label: 'Assign to me', className: 'btn-primary' }] : []),
        ...agents.filter((a) => a.id !== current && a.id !== me?.id).map((a) => ({ key: a.id, label: a.name, className: 'btn-secondary' })),
        ...(current ? [{ key: 'none', label: 'Unassign', className: 'btn-confirm-danger' }] : []),
    ];
    if (!choices.length) {
        toast('No other agent can receive requests.');
        return;
    }
    const picked = await choiceDialog({
        title: current ? 'Reassign the request' : 'Assign the request',
        message: current ? `Now with ${task.value.assigned_to.name}.` : 'The agent gets a notification.',
        choices,
    });
    if (picked === null) return;
    busy.value = true;
    try {
        await api(`/simple-tasks/${id}/assignee`, { method: 'PUT', body: { assigned_to: picked === 'none' ? null : picked } });
        toast(picked === 'none' ? 'Request unassigned.' : `Assigned to ${picked === me?.id ? 'you' : choices.find((c) => c.key === picked).label}.`);
        refreshScreen();
    } catch (e) {
        toast(e.message);
        busy.value = false;
    }
}

onMounted(async () => {
    try {
        task.value = await api(`/simple-tasks/${id}`);
    } catch (e) {
        error.value = e;
        return;
    }
    await nextTick();
    restoreScroll(shell.value?.content, props.path);
});
</script>

<template>
    <Shell ref="shell" tab="requests" :title="`Request #${id}`" :subtitle="task?.customer_name ?? ''" back="/">
        <ErrorBox v-if="error" :error="error" @retry="render()" />
        <Loading v-else-if="!task" />
        <template v-else>
            <section class="request-head">
                <div class="request-head-top">
                    <StatusPill :status="task.status" />
                    <span v-if="task.urgent" class="pill is-urgent">Urgent</span>
                    <span v-if="task.spam" class="pill is-spam">Spam</span>
                    <span v-if="task.combo" class="pill is-violet">Combo</span>
                    <span class="request-source">{{ task.source.name }}</span>
                </div>
                <h2>{{ task.customer_name }}</h2>
                <p v-if="task.customer_contact" class="request-contact">{{ task.customer_contact }}</p>
                <div v-if="call || whatsapp" class="contact-actions">
                    <a v-if="call" :href="call" class="btn btn-secondary"><Icon name="phone" /> {{ call.startsWith('mailto:') ? 'E-mail' : 'Call' }}</a>
                    <a v-if="whatsapp" :href="whatsapp" target="_blank" rel="noopener" class="btn btn-secondary btn-whatsapp">WhatsApp</a>
                </div>
            </section>

            <template v-if="task.description">
                <h2 class="section-title">Request</h2>
                <div class="note-card">{{ task.description }}</div>
            </template>

            <template v-if="task.offers?.length">
                <h2 class="section-title">{{ task.offers.length }} {{ task.offers.length === 1 ? 'offer' : 'offers' }} sent</h2>
                <div v-for="(offer, i) in task.offers" :key="offer.id ?? 'legacy'" class="offer-item">
                    <div class="history-sub">Offer {{ i + 1 }}<template v-if="offer.user"> · {{ offer.user }}</template><template v-if="offer.created_at"> · {{ offer.created_at }}</template></div>
                    <div class="note-card">{{ offer.offer_text }}</div>
                </div>
            </template>

            <div class="details">
                <div v-if="destinationNames(task)" class="detail"><span>{{ (task.parent_destinations ?? []).length > 1 ? 'Destinations' : 'Destination' }}</span><strong><template v-if="task.combo">Combo: </template>{{ destinationNames(task) }}</strong></div>
                <div v-if="task.specific_hotel" class="detail"><span>Hotel</span><strong>{{ task.specific_hotel }}</strong></div>
                <div class="detail"><span>Agent</span><strong>{{ task.assigned_to ? (task.assigned_to.id === state.profile.id ? `You (${task.assigned_to.name})` : task.assigned_to.name) : 'Not assigned' }}</strong></div>
                <div v-if="task.assigned_at" class="detail"><span>Assigned</span><strong>{{ task.assigned_at }}</strong></div>
                <div class="detail"><span>Created</span><strong>{{ task.created_at }}<template v-if="task.created_by"> · {{ task.created_by.name }}</template></strong></div>
                <div v-if="task.finished_at" class="detail"><span>Closed</span><strong>{{ task.finished_at }}<template v-if="task.finished_by"> · {{ task.finished_by.name }}</template></strong></div>
            </div>

            <div v-if="canChangeStatus || canAssign" class="request-actions">
                <template v-if="canChangeStatus && !finished">
                    <button v-if="task.status.id !== STATUS.IN_PROGRESS" type="button" class="btn btn-secondary btn-block btn-lg" :disabled="busy" @click="inProgress">In progress</button>
                    <button type="button" class="btn btn-primary btn-block btn-lg" :disabled="busy" @click="addOffer">Add offer</button>
                    <button type="button" class="btn btn-secondary btn-block" :disabled="busy" @click="close">Close</button>
                </template>
                <button v-if="canChangeStatus || can('simpleTasks.edit')" type="button" class="btn btn-block" :class="task.spam ? 'btn-secondary' : 'btn-danger'" :disabled="busy" @click="toggleSpam">
                    {{ task.spam ? 'Not spam' : 'Spam' }}
                </button>
                <button v-if="canAssign && !finished" type="button" class="btn btn-secondary btn-block" :disabled="busy" @click="assign">
                    {{ task.assigned_to ? 'Reassign' : 'Assign' }}
                </button>
                <button v-if="canChangeStatus && finished" type="button" class="btn btn-secondary btn-block" :disabled="busy" @click="reopen">Reopen</button>
            </div>

            <template v-if="history.length">
                <h2 class="section-title">History</h2>
                <ol class="history">
                    <li v-for="h in history" :key="h.id">
                        <div class="history-title">
                            <strong>{{ h.type }}</strong><template v-if="h.comment">: {{ h.comment }}</template>
                        </div>
                        <div class="history-sub">{{ h.created_at }}<template v-if="h.user"> · {{ h.user }}</template></div>
                    </li>
                </ol>
            </template>
        </template>
    </Shell>
</template>
