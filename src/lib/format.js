// Formatting shared by the screens. The API already sends dates as d.m.Y H:i.

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
    3: 'is-green', // Offer sent
    4: 'is-muted', // Spam
};

/** A phone number or e-mail as a link the phone can open, or null. */
export const contactLink = (contact) => {
    const value = (contact ?? '').trim();
    if (!value) return null;
    if (/^\S+@\S+\.\S+$/.test(value)) return `mailto:${value}`;
    const digits = value.replace(/[^\d+]/g, '');
    return digits.length >= 6 ? `tel:${digits}` : null;
};

/** WhatsApp chat link for a phone number, or null. */
export const whatsappLink = (contact) => {
    const digits = (contact ?? '').replace(/\D/g, '');
    return digits.length >= 8 && !/@/.test(contact) ? `https://wa.me/${digits.replace(/^00/, '')}` : null;
};
