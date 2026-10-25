# Trao Mobile — Agent Guidelines

Expo (React Native) app for Trao with a chat engine (Firebase Auth + RTDB signal, REST API, SQLite
local store, push). UI is not built yet.

## Layout

- `src/providers` — `AuthProvider` (Firebase + `/api/me`), `ChatProvider` (sync engine runtime).
- `src/services/chat` — API client, sync engine, SQLite store, RTDB presence/signal, media upload.
- `src/services/push` — Expo push registration and routing.
- `src/hooks` — `useAuth`, `useChat*` hooks over the providers.
- `src/app` — expo-router routes (placeholder only).

## Status

Backend URLs, Firebase project, bundle ids, EAS project id and Sentry are placeholders; fill them in
`.env` (see `.env.example`), `app.json` and `eas.json`. `google-services.json` is not included.

## Reference: the Trao web app

The mobile app mirrors the Trao web app (`C:\apps\traodd\trao`, Next.js) feature for feature. Before
building or changing any feature, check how the web app already implements it and follow the same
behavior (flows, validation, states, copy, API contracts, business rules); only adapt what mobile needs
differently (navigation, native permissions, push). The web app is read-only reference: never edit it.

Where to look in the web repo:

- `docs/*.md` — product and business rules (`trao-overview`, `features`, `listing-policy`,
  `transaction-flows`, `user-reputation`, `rewards`).
- `docs/implementation/NN-*.md` — per-part implementation notes and the canvas artboards for each part.
- `app/api/**` — the backend routes the mobile app calls; `lib/<domain>/` — services and rules
  (auth, chat, listings, items, reviews, notification, push, ...); `db/schema.ts` and
  `.ai/database-schema.md` — data model.
- `.ai/*.md` — architecture reference; `.cursor/rules/*.mdc` — web coding policy (not all of it applies
  to React Native).

If the web app and the canvas design disagree, ask the user before choosing.

## UI

Screens must follow the approved canvas design exactly; read [design-fidelity](.claude/rules/design-fidelity.md)
before building or changing any screen.

## Expo SDK

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
