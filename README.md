# ConfiShare Admin

Standalone Next.js admin dashboard for platform users, subscriptions, and usage.

## Routes and assets

This project uses the Next.js App Router in `src/app`. Each `page.tsx` defines a route (for example, `src/app/login/page.tsx` serves `/login`), and API endpoints live in `src/app/api`.

Put static assets in the root `public` folder, beside `src`. The supplied `logo-light.svg` is the in-app wordmark, `og-image.jpg` is the social sharing image, and `icon.png` and `apple-icon.png` are generated from the supplied logo photograph for browser and device icons.

`/login` is the sign-in route and `/admin` is the dashboard route.

Set `SITE_URL` to the deployed site origin for absolute social image URLs. Vercel deployments use their production URL automatically when `SITE_URL` is absent.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `/admin`. Set `NEXT_PUBLIC_API_URL` to the API base URL (default `https://server.confishare.io/api/v1`).

## Admin auth and management

The app uses the dedicated admin API under `/api/v1/admin`:

| Area | Endpoints |
| --- | --- |
| Sign in / out | `POST auth/login`, `POST auth/logout` |
| Your account | `GET/PATCH auth/me`, `POST auth/change-password` (rotates the token) |
| Admins (super admin only) | `GET/POST admins`, `PATCH admins/:id` (`role`, `isActive`) |
| Activity | `GET audit-logs`, `GET document-audit-logs` |
| Overview | `GET users` |

The server keeps the admin bearer token in an HTTP-only, same-site cookie. The browser never sees it: every call goes through `/api/admin/*`, an allowlisted proxy that attaches the token and clears the session on an upstream 401. Super admins see the Admins page and all admins' activity; admins see only their own activity.

Routes: `/login`, `/admin` (overview), `/admin/admins`, `/admin/audit-logs`, `/admin/document-audit-logs`, `/admin/account`.

```bash
npm run build
```

Missing subscription status is shown as Trial in the table and details to match the source screen. Status breakdowns and status filters count only explicit statuses.
