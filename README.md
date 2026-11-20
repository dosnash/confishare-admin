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

Open `/admin`. Set `NEXT_PUBLIC_API_URL` to the API base URL. `ADMIN_CLAIM_PATH` is a dot path to a **backend-issued Boolean admin claim** on the login `user` object (for example, `permissions.isPlatformAdmin`). Login fails closed if the claim is absent or false. Do not set this to `role`, `accountType`, `OWNER`, or `TEAM_MEMBER`.

The backend must independently enforce admin authorization on `GET /auth/users` and return 403 for ordinary users. This app cannot verify or repair that backend rule. Confirm the actual claim name and the endpoint's access policy with the backend owner before production use.

The server stores the bearer token in an HTTP-only, same-site cookie and proxies the users request. The browser does not receive the bearer token. Sessions are cleared on upstream 401; upstream 403 becomes an explicit access-denied view.

```bash
npm run build
```

Missing subscription status is shown as Trial in the table and details to match the source screen. Status breakdowns and status filters count only explicit statuses.
