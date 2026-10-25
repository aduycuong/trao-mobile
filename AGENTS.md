# Trao Mobile — Agent Guidelines

Expo (React Native) app for Trao, bootstrapped from `spacekids-mobile`: same stack and chat engine
(Firebase Auth + RTDB signal, REST API, SQLite local store, push). UI is not built yet.

## Layout

- `src/providers` — `AuthProvider` (Firebase + `/api/me`), `ChatProvider` (sync engine runtime).
- `src/services/chat` — API client, sync engine, SQLite store, RTDB presence/signal, media upload.
- `src/services/push` — Expo push registration and routing.
- `src/hooks` — `useAuth`, `useChat*` hooks over the providers.
- `src/app` — expo-router routes (placeholder only).

## Status

Backend URLs, Firebase project, bundle ids, EAS project id and Sentry are placeholders; fill them in
`.env` (see `.env.example`), `app.json` and `eas.json`. `google-services.json` is not included.

## Expo SDK

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.
