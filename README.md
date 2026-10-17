# Glimpse

A personal chat workspace with a quiet, native-inspired interface. Built with Next.js, React, TypeScript, and the [Hack Club AI API](https://docs.ai.hackclub.com/api/chat-completions.html).

## Run locally

```sh
npm install
cp .env.example .env.local
# Set HACKCLUB_API_KEY, SITE_PASSWORD_HASH, and SESSION_SECRET in .env.local
npm run dev
```

Open [localhost:3000](http://localhost:3000). Server credentials belong in the ignored `.env.local` file. They are never bundled into browser code or returned by the API.

## Features

- Incremental streaming replies with stop, retry, edit, regenerate, and clear error states.
- Searchable conversations saved in this browser; rename, export Markdown, delete with undo.
- Live searchable model catalog from Hack Club, with recommended models and an offline fallback.
- Light, dark, and system themes; five accents, including neutral Graphite; reading fonts and sizes.
- Comfortable or compact spacing, focused or wide conversations, and optional prompt suggestions.
- Optional ASCII intro and response animations with reduced-motion support.
- Personal name, custom instructions, creativity, and output-token settings.
- Markdown, highlighted code with copy buttons, tables, task lists, and KaTeX math.
- Paste, drop, or select up to four image or text attachments per message. Images show preparation and send-flight animations, with full-size previews and reduced-motion support.
- PNG/JPEG/WebP images up to 10 MB are resized locally to fit request limits; vision-capable models receive native image inputs. Text/source files support 80 KB per file and 80,000 characters combined.
- Local transparent PNG model logos with light and dark variants, sourced from [Lobe Icons](https://github.com/lobehub/lobe-icons).
- Responsive layout, keyboard navigation, focus-trapped dialogs, and reduced-motion support.
- Self-hosted fonts; no third-party browser font requests.

## Verification

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

## Data and deployment

Chats, preferences, and attachments are stored in localStorage on this device. Clearing browser data clears the workspace. Each chat request sends the current conversation and attachments to Hack Club and its model provider. Conversation export includes attachments.

The server validates request payloads, limits request frequency, rejects cross-origin chat requests, and forwards the API key only to the fixed Hack Club endpoint. Requests have a three-minute timeout. Model-specific creativity controls are sent only when supported.

The website and API require the workspace password. Successful sign-in creates a signed, HTTP-only session lasting seven days; use **Lock workspace** to sign out on this browser. Rotating the password hash or signing secret invalidates existing sessions. Conversations stay on this browser after signing out.

Configure `HACKCLUB_API_KEY`, `SITE_PASSWORD_HASH` (SHA-256 of the entrance password), and `SESSION_SECRET` (at least 64 random characters) as sensitive server environment variables in Vercel. Never use a `NEXT_PUBLIC_` prefix. The app fails closed if access settings are absent. `.vercelignore` excludes local credentials from uploads.

Deploy with `vercel --prod` after linking your project and adding those variables. Login and chat have per-instance request limits of 10 sign-in attempts and 15 chat requests per minute per IP. Shared Vercel Firewall rate limiting is not available on the account’s current plan. For local production use, run `npm run build` followed by `npm start`. Local commands bind to `127.0.0.1`.

## Design references

The workspace uses neutral surfaces, system typography, and a generated Glimpse monogram. Layout references: [ChatGPT on Mobbin](https://mobbin.com/screens/8229c408-df4e-4555-af78-87e736356db1). The logo source is `public/brand/glimpse-logo.png`; CSS masks keep it legible in light and dark themes.

## Dependency audit

KaTeX is pinned through an override to the patched 0.18.x series. The remaining audit finding is the development-only `braces` chain used by Next.js ESLint (GHSA-vfj7-8cjw-p6xm). No patched `braces` release was available at verification; a forced audit fix would downgrade the Next.js lint configuration. Production dependencies pass `npm audit --omit=dev`.
