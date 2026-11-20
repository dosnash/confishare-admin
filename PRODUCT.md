# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, TypeScript, React, Tailwind CSS, Inter, lucide-react, Chart.js with react-chartjs-2, and Framer Motion, as specified in the supplied brief.

## Users

Platform administrators reviewing users, subscriptions, and aggregate usage.

## Product Purpose

Give administrators one place to inspect platform-wide user records, filter them, open details, and export the current result set.

## Capabilities and Constraints

- `/admints` is the compatibility route.
- All dashboard figures derive from `GET /auth/users`.
- No financial metrics or account mutation actions are available.
- Admin access needs a confirmed backend-issued claim and backend enforcement on `/auth/users`. The claim path and policy remain open integration facts.
- The API base URL is configurable.

## Brand Commitments

The supplied brief specifies a light, restrained SaaS interface, Inter, green `#059669`, near-black `#0F172A`, slate secondary text, and pale gray surfaces. No logo asset was provided.

## Accessibility & Inclusion

The supplied brief requires keyboard-accessible controls and dialog, visible focus, semantic labels, mobile layouts, and reduced-motion support.
