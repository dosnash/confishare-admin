# ConfiShare Admin

Standalone Next.js admin dashboard for platform users, subscriptions, and usage.

## Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `/admints`. Set `NEXT_PUBLIC_API_URL` to the API base URL. `ADMIN_CLAIM_PATH` is a dot path to a **backend-issued Boolean admin claim** on the login `user` object (for example, `permissions.isPlatformAdmin`). Login fails closed if the claim is absent or false. Do not set this to `role`, `accountType`, `OWNER`, or `TEAM_MEMBER`.

The backend must independently enforce admin authorization on `GET /auth/users` and return 403 for ordinary users. This app cannot verify or repair that backend rule. Confirm the actual claim name and the endpoint's access policy with the backend owner before production use.

The server stores the bearer token in an HTTP-only, same-site cookie and proxies the users request. The browser does not receive the bearer token. Sessions are cleared on upstream 401; upstream 403 becomes an explicit access-denied view.

```bash
npm run build
```

Missing subscription status is shown as Trial in the table and details to match the source screen. Status breakdowns and status filters count only explicit statuses.
