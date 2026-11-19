# AS Travel app

The AS Travel team's phone app (English, installable PWA, on `agents-app.astravel.com`) for customer
requests: sign in with the AS Travel platform account, turn on push
notifications, and get notified when a request is assigned to you (and, with
`simpleTasks.responsible`, when a request is closed as Offer sent or Spam).

It is built on the same frame as the Exclusive Agents app
(`~/Projects/exclusive-agents-app`): same structure, components and CSS
classes, restyled in AS Travel red (`#d92128`, the logo's red).

## Commands

| Task                 | Command         |
| -------------------- | --------------- |
| Install dependencies | `npm install`   |
| Run locally          | `npm run dev`   |
| Build for production | `npm run build` |
| Serve the build      | `npm start`     |

`npm run build` must pass after every change.

## How it works

- **API**: the app calls the AS Travel platform API (`as-travel-platform-api`)
  directly at `VITE_API_URL` (…/api/v1) with a Sanctum bearer token in
  `localStorage` (`as.app.token`). It signs in with `device_name:
  as-travel-app`, so signing in here does not sign the user out of the SPA.
  These sessions expire after `AGENTS_APP_SESSION_MINUTES` on the API
  (default 30 days); the 401 then sends the user to the login screen.
  Sign-in has a two-factor step (authenticator app): `POST /users/tokens`
  answers `{ two_factor: 'code' }` or, for a user who hasn't set it up yet,
  `{ two_factor: 'setup', qr_code, otpauth_url, secret }` instead of a token;
  the login screen then posts the same credentials again with `code`. A 401
  with `two_factor_setup_required` opens the login screen with
  `?reason=two-factor`.
  The API's `CORS_ALLOWED_ORIGINS` must list this app's origin. `VITE_*`
  values are fixed at build time.
- **Endpoints used**: `POST/DELETE /users/tokens`, `GET /users/me`,
  `GET /simple-tasks` (`mine`, `assigned_to=none`, `status=active|finished`,
  `q`), `GET /simple-tasks/{id}`, `GET /simple-tasks/options`,
  `PUT /simple-tasks/{id}/status`, `PUT /simple-tasks/{id}/assignee`,
  `GET /users/notifications`, `GET /users/notifications/unread-count`,
  `POST /users/notifications/{id}/read`, `POST/DELETE /users/push-subscriptions`.
- **Permissions** (from `/users/me`, admins get `*`): `simpleTasks.list` /
  `listAll` (the list; listAll adds Unassigned / All), `changeStatus` (Offer
  sent / Spam / Reopen), `assign` (Assign / Reassign), `receive`,
  `responsible`, `userNotifications.list` (the Notifications tab).
- **Frame** (`src/App.vue`, `src/store.js`): on every navigation, check the
  session, load `/users/me`, pick the screen from `src/screens.js` and draw it.
  `render()` bumps `state.version`, which remounts the screen from scratch;
  `refreshScreen()` does so keeping the scroll. Vue Router only handles
  history; `<a data-link>` clicks are routed in `src/main.js`.
- **Screens** (`src/screens/*`): props `{ params, path, tab }`; load in
  `onMounted`, show `<Loading>` / `<ErrorBox @retry="render()">`, then the
  data. Per-screen state (filters, search, scroll) lives in `memory`.
- **PWA**: `public/app/` (manifest, icons, logos), `public/sw.js` (caches the
  shell and `/assets/`, shows pushes, opens the request on a tap, tells an open
  app to refresh). An open app reloads itself after a deploy
  (`reloadIfDeployed()`).
- **Push**: `VITE_WEBPUSH_PUBLIC_KEY` = the API's `WEBPUSH_VAPID_PUBLIC_KEY`
  (`php artisan webpush:vapid`). iPhones get pushes only from the home-screen
  app (iOS 16.4+).
- `server.mjs` serves `dist/` (index.html for every app path), e.g. on
  Laravel Cloud.

Dates come from the API already as d.m.Y H:i.
