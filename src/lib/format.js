// Formatting shared by the screens. The API already sends dates as d.m.Y H:i.
import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

/** "Arta Krasniqi" → "AK". */
export const initials = (name) =>
    (name ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

/** Pill colour for a request status (Modules\SimpleTasks\Enums\SimpleTaskStatus). */
export const STATUS_PILL = {
    1: 'is-blue', // Open
    2: 'is-amber', // Assigned
    3: 'is-green', // Closed (was Offer sent)
    4: 'is-muted', // Spam (old status; spam is a flag now)
    5: 'is-violet', // In progress
};

/** The request's destinations as one line (older requests have a single one). */
export const destinationNames = (task) =>
    (task?.parent_destinations ?? (task?.parent_destination ? [task.parent_destination] : [])).map((d) => d.name).join(', ');

/**
 * Phone numbers are stored as digits with the country code (37744159481);
 * shown as +377 44 159 481. Anything else is returned unchanged.
 */
export const formatPhone = (contact) => {
    const value = (contact ?? '').trim();
    if (!/^\+?\d{7,15}$/.test(value.replace(/[\s().\-/]/g, ''))) return contact;
    const digits = value.replace(/\D/g, '').replace(/^00/, '');
    return parsePhoneNumberFromString(`+${digits}`)?.formatInternational() ?? contact;
};

/** A phone number or e-mail as a link the phone can open, or null. */
export const contactLink = (contact) => {
    const value = (contact ?? '').trim();
    if (!value) return null;
    if (/^\S+@\S+\.\S+$/.test(value)) return `mailto:${value}`;
    // Stored numbers are digits with country code: dial them with "+".
    if (/^\d{7,15}$/.test(value)) return `tel:+${value}`;
    const digits = value.replace(/[^\d+]/g, '');
    return digits.length >= 6 ? `tel:${digits}` : null;
};

/** WhatsApp chat link for a phone number, or null. */
export const whatsappLink = (contact) => {
    const digits = (contact ?? '').replace(/\D/g, '');
    return digits.length >= 8 && !/@/.test(contact) ? `https://wa.me/${digits.replace(/^00/, '')}` : null;
};
