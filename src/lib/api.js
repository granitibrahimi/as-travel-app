// The AS Travel platform API client. The app calls the API directly
// (VITE_API_URL, e.g. https://p-api.astravel.com/api/v1) with its own Sanctum
// token in localStorage. Responses come in the platform's envelope
// ({ data, message, errors }); api() hands back `data`.

export const API = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, '');
export const TOKEN_KEY = 'as.app.token';
export const THEME_KEY = 'as.app.theme';
/** The token's name on the API: signing in here leaves the SPA's session alone. */
export const DEVICE_NAME = 'as-travel-app';

export const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        } catch {
            /* private mode */
        }
    },
};

export class ApiError extends Error {
    constructor(message, status, errors = {}) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}

let unauthorized = () => {};

/** What a 401 does (the app signs out). */
export function onUnauthorized(handler) {
    unauthorized = handler;
}

const token = () => storage.get(TOKEN_KEY);

/** Query string from an object, leaving out empty values. */
export const query = (params) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    const text = search.toString();
    return text ? `?${text}` : '';
};

export async function api(path, { method = 'GET', body } = {}) {
    const bearer = token();
    let response;
    try {
        response = await fetch(API + path, {
            method,
            headers: {
                Accept: 'application/json',
                ...(body ? { 'Content-Type': 'application/json' } : {}),
                ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new ApiError('No internet connection. Please try again.', 0);
    }

    if (response.status === 204) return null;
    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 && path !== '/users/tokens') {
        unauthorized(payload);
        throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    if (!response.ok) {
        const errors = payload.errors ?? {};
        const first = Object.values(errors)[0];
        const message =
            response.status === 403
                ? 'You don’t have access to this.'
                : response.status === 404
                  ? 'Not found.'
                  : response.status === 429
                    ? 'Too many attempts. Wait a minute and try again.'
                    : ((Array.isArray(first) ? first[0] : first) ?? payload.message ?? 'Something went wrong. Please try again.');
        throw new ApiError(message, response.status, errors);
    }

    return payload.data ?? payload;
}
