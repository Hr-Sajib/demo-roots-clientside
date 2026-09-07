# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sibling project

This repo is one of two nearly-identical admin dashboards: **roots-pack** (RootsBeyond) and **Arbora-Pack** (Arbora Packaging). Same Next.js codebase forked for a second client — component structure, RTK Query API layer, and auth flow are shared between them. When a fix or pattern applies here, check whether `Arbora-Pack/clientside` has the same issue.

## Commands

```bash
npm run dev     # next dev -p 3003 -H 0.0.0.0
npm run build   # next build
npm start        # next start -p 3003 -H 0.0.0.0
npm run lint     # eslint
```

No test runner is configured. Dev server runs on port **3003** (not the Next.js default 3000) — keep that in mind when checking `NEXT_PUBLIC_URL`/CORS allow-lists on the backend.

## Architecture

Next.js 15 App Router + TypeScript, Redux Toolkit (RTK Query) for all server data, shadcn/ui (`new-york` style, Radix primitives) for components, Tailwind v4.

**Routing**: `src/app/(auth)/` (login/signup, public) and `src/app/(dashboard)/` (everything else, gated) are route groups. `src/middleware.ts` is the actual auth gate — it reads the `token` cookie server-side and redirects before any client component renders, specifically to avoid a flash of a loading skeleton or a leaked sidebar. Public paths are hardcoded in a `PUBLIC_PATHS` set (`/login`, `/signup`); everything else requires the cookie. If you add a new public route, it must be added to that set.

**Data layer — RTK Query**: `src/redux/api/base.ts` defines the single `baseApi` (`fetchBaseQuery`, `baseUrl` from `NEXT_PUBLIC_URL`, `credentials: "include"`, JWT read from the `token` cookie via `js-cookie` and sent as a raw `Authorization` header — not `Bearer <token>`, just the token). Every domain (`orders.ts`, `customers.ts`, `inventory.ts`, `product.ts`, `containerApi.ts`, `containerPoApi.ts`, `salesReports.ts`, etc.) injects endpoints into `baseApi` in `src/redux/api/`, one file per domain, and declares its own `tagTypes` for cache invalidation. Add new endpoints by injecting into `baseApi` in the matching domain file rather than creating a new `createApi` instance.

**Binary downloads bypass RTK Query**: `src/lib/apiFetch.ts` is a separate fetch helper used specifically for PDF/Excel/image downloads, because RTK Query has no first-class `response.blob()` support. It mirrors `baseApi`'s auth-header behavior by hand. Use `apiFetch`/`apiFetchWithHeaders` + `triggerDownload` for any new binary-download endpoint instead of trying to force it through RTK Query.

**Redux slices vs RTK Query**: `src/redux/slices/` (`customers.ts`, `userSlice.ts`) hold client-side state that needs to persist across refreshes (via `redux-persist`, see `src/redux/store.ts`). Only `customers` and `user` are whitelisted for persistence; `baseApi`'s cache is intentionally excluded so it always rehydrates fresh. The persist config carries a `version` + `migrate` function — bump `version` and extend `migrate` if you change a persisted slice's shape, following the existing pattern of coercing old shapes rather than dropping state outright.

**Feature vs component split**: `src/Features/<Domain>/` holds domain-specific one-off components (modals, detail views) tightly coupled to a single page/flow (e.g. `Features/Orders/UpdateOrderModal.tsx`). `src/components/` holds cross-domain shared UI (`components/ui` = shadcn primitives, `components/shared`, `components/layout`, `components/Sidebar`). When adding a component, put it in `Features/<Domain>` if it's single-purpose, `components/` if it's reused.

**shadcn config**: `components.json` — `new-york` style, aliases `@/components`, `@/lib`, `@/hooks`, `@/components/ui`. Use the shadcn CLI conventions (`@/components/ui/...`) rather than hand-writing primitives that already exist there.

## Conventions to follow

- Server data goes through RTK Query endpoints in `src/redux/api/`, not ad-hoc `fetch`/`axios` calls in components — the only sanctioned exception is binary downloads via `apiFetch`.
- Auth/session state is the `token` cookie (`js-cookie`), read both by `middleware.ts` (server) and `baseApi`/`apiFetch` (client) — don't introduce a second token storage mechanism.
- New public (unauthenticated) routes must be added to `PUBLIC_PATHS` in `src/middleware.ts` or they'll be redirected to `/login`.
