# AS Travel app

The AS Travel team's phone app (installable PWA) for customer requests, with
push notifications. Vue 3 + Vite. See [AGENTS.md](AGENTS.md).

```bash
cp .env.example .env   # set VITE_API_URL and VITE_WEBPUSH_PUBLIC_KEY
npm install
npm run dev
```

Production: `npm run build`, then `npm start` (serves `dist/` on `$PORT`).
