# Clerk ↔ Strapi Account Integration — Reference Implementation

**Status: living document.** This describes the actual, working implementation built across `e97iportal` (Next.js frontend) and `e97-api` (Strapi 5 backend). Update it whenever the integration changes — it's meant to be copied into other projects as a starting point, so it needs to stay accurate, not aspirational.

## What this solves

A Next.js app with Clerk auth needs a Strapi backend where:
- Every Clerk user is linked to an **Account** (a company/tenant — multiple people can share one account).
- A user can only ever read **their own account's** data — enforced server-side in Strapi, not trusted to the frontend.
- New users are provisioned by an **admin inviting them from Strapi's admin panel**, not self-serve sign-up. Clerk handles invite delivery and expiry natively.
- Profile changes (name/email) made in Clerk stay in sync with Strapi automatically.

## Architecture at a glance

```
Admin creates Invitation in Strapi admin (email, account, role, first/last name)
        │
        ▼ (afterCreate lifecycle)
Strapi calls Clerk's Invitations API → real Clerk invite sent, email delivered
        │
        ▼ (user clicks email link)
Next.js /sign-up consumes the ticket, collects name + password, calls signUp.finalize()
        │
        ▼ (async — Clerk fires this independently)
Clerk sends user.created webhook → Strapi (hosted in Strapi, not Next.js)
        │
        ▼
Strapi finds the pending Invitation by email, creates the linked Strapi user
(clerk_id + Account + role), marks the invitation accepted

Every subsequent request:
Next.js Server Component → forwards Clerk session token as Bearer →
Strapi verifies the JWT itself (JWKS) → resolves Strapi user by clerk_id →
policies scope every query to that user's Account
```

**Core design decision:** Strapi is the enforcement boundary. It independently verifies the Clerk session token and derives the account from its own `clerk_id` lookup — it never trusts a client-supplied account ID. This means a bug in the Next.js app can't leak another account's data. The tradeoff is more setup work than the "Next.js holds a privileged Strapi token" pattern, but that pattern is what got audited out during a codebase review of a sibling project (a route was found returning a shared admin token to the client, keyed only off a user ID lookup — anyone with that response could read any account's data).

**Why the webhook lives in Strapi, not Next.js:** account/role linkage is the security-critical step. Keeping it in Strapi means it's enforced by the same system that enforces read access, independent of whatever the frontend does.

---

## Backend (Strapi 5)

### Dependencies

```json
{
  "dependencies": {
    "@clerk/backend": "^3.16.9",
    "svix": "^1.99.1"
  }
}
```

**Gotcha:** `svix@2.x` is ESM-only (`"type": "module"`, no CJS build) and will throw `ERR_REQUIRE_ESM` in a standard Strapi project (`tsconfig.json` compiles to CommonJS). Pin to the latest `1.x` (`1.99.1` as of writing) which still ships `"type": "commonjs"`.

**Gotcha:** `@clerk/backend`'s `verifyToken()` return shape changed between major versions. In `v3.x` (current), it resolves directly to the payload and **throws** on failure. Older `v2.x` code (and some cached docs/examples) show it returning `{ data, errors }` instead — don't mix the two patterns. Always check the installed version's actual `.d.ts` rather than trusting a remembered signature.

### Environment variables (`.env`)

```
CLERK_SECRET_KEY=
# Optional: PEM public key from Clerk Dashboard → API Keys → "Show JWT public key".
# Enables networkless verification. Falls back to a network JWKS fetch via
# CLERK_SECRET_KEY if unset — still works, just an extra round trip.
CLERK_JWT_KEY=
# Comma-separated allowed frontend origins (checked against the token's azp claim)
CLERK_AUTHORIZED_PARTIES=http://localhost:3000
CLERK_WEBHOOK_SIGNING_SECRET=
# Used to build the invitation email's redirect_url
INVESTOR_PORTAL_URL=http://localhost:3000
```

### Content-type model

- **`account`** — the sharing/ownership boundary (a company). `name`, `accessCategories` (JSON array — deliberately not Strapi's native `enumeration`, which is single-value only), and `oneToMany` relations out to `users`, `documents`, `portfolioReports`, `properties`, `invitations`.
- **`project`** — a shared real-estate development update, **visible to every logged-in investor** (like News — no account relation, no scoping policy on its routes at all). Holds `name`, `subtitle`, `phase` (enum — named `phase`, not `status`, see gotcha below), `progress`, `highlight`, `description` (richtext), and `targetRoi`/`totalBudget`/`costToDate` (pre-formatted strings, e.g. `"$52.1M"`) directly on the record.

  **History**: this used to be split across `project` (shared fields) and a separate `investment` join content-type (per-account `targetRoi`/`totalBudget`/`costToDate`, `manyToOne` to both `project` and `account`), scoped by a dedicated `is-project-linked-to-account` policy. That model was removed — Projects turned out to be a broadcast update every investor should see, not per-account data — so the numeric fields moved directly onto `project`, the `investment` content-type and its policy were deleted outright, and `project`'s routes became a plain `factories.createCoreRouter()` with no policies (matching `news-article`). If you're replicating this pattern in a new project, don't assume a "shared entity with per-account numbers" always needs a join table — confirm whether the numbers are genuinely per-account before building one.
- **`document`**, **`portfolio-report`**, **`property`** — straightforward `manyToOne` (`required: true`) to `account`. Each scoped by the same list/detail policy pair (see below). `property`'s field is named **`paymentStatus`**, not `status` (see gotcha below). `document.category` is a required enum (Annual Report/Project Report/Progress Report/LP Agreement/Loan Agreement/Tax Slip/**Portfolio Report**); `document.fileType` is a required enum (PDF/PPT/XLS/CSV/ZIP/VIDEO/OTHER), not a free-text string — no separate `uploadedAt` field, since Strapi's automatic `createdAt` already covers that (the frontend mapper reads `createdAt`, not a custom timestamp).
- **`invitation`** — `email`, `first_name`, `last_name`, `account` (`manyToOne`), `role` (enum: investor/admin), `invitation_status` (enum: pending/accepted/revoked/expired), `clerk_invitation_id`, `invitation_url`, `invited_at`, `invitation_expires_at`, `accepted_at`, `accepted_by_user` (`oneToOne` → user).
- **`investment-opportunity`** / **`interest-registration`** — shared broadcast + account-scoped submission pair backing "Register Interest." See [Investment opportunities + interest registration](#investment-opportunities--interest-registration) below for the full write-up, including why `interest-registration`'s `create` action is a full controller override rather than a policy.
- **`plugin::users-permissions.user` extension** — add `clerk_id` (string, required, unique), `first_name`, `last_name`, `account` (`manyToOne`), `invitation` (`oneToOne`, mappedBy `accepted_by_user`). Must include the **entire** stock schema in the extension file, not just the diff — Strapi doesn't merge partial overrides for this plugin. Copy the base from the installed package if you don't already have an extension file:
  ```bash
  cat node_modules/@strapi/plugin-users-permissions/dist/server/content-types/user/index.js
  # (attributes are inline in the compiled JS in Strapi 5 — no standalone schema.json to diff against)
  ```

**Gotcha — never name a field `status`, on ANY content-type, even with `draftAndPublish: false`.** The *documented* rule (Strapi's own `@strapi/utils` source, `isReservedAttributeName`) only reserves `status` when `draftAndPublish` is enabled — it's conditioned on that flag in the actual reserved-name-check code. We initially trusted that and kept `status` on `property` (which has `draftAndPublish: false`), reasoning it was exempt. **Real behavior contradicted the documented rule**: the content-manager admin UI rejected every value typed into that field — including a blank one, on a field that isn't even required — with a generic "Invalid status" error, and the entry could never be saved. There's evidently a second, unconditional reservation of `status` somewhere in the content-manager admin's own form/validation layer (its bundled admin build, not the server-side schema-validation code we could grep) that isn't gated by `draftAndPublish` the way the documented check is. Renamed `property.status` → `property.paymentStatus` and `project.status` → `project.phase`; both save correctly. Lesson: don't trust a conditional reserved-name rule found in source — the practical, observed answer is to avoid `status` entirely as a custom attribute name, regardless of `draftAndPublish`. Keep the external frontend field named `status` if you like (map it in the `lib/*.ts` layer) — only the Strapi attribute name needs to change.

### Clerk JWT verification (`src/utils/clerk-verify.ts`)

```ts
import { verifyToken } from '@clerk/backend';

type ClerkJwtPayload = Awaited<ReturnType<typeof verifyToken>>;

export async function verifyClerkSessionToken(token: string): Promise<ClerkJwtPayload> {
  const authorizedParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return verifyToken(token, {
    jwtKey: process.env.CLERK_JWT_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
    authorizedParties,
  });
}
```

Why `verifyToken()` and not the more-recommended `authenticateRequest()`: the latter is built around a full Web `Request` object with cookie/handshake support for browser-facing routes — irrelevant for a pure server-to-server bearer-token check with no cookies involved. Clerk's own docs demonstrate `verifyToken()` for exactly this Authorization-header pattern.

### Custom content-api auth strategy (`src/index.ts`)

```ts
import type { Core } from '@strapi/strapi';
import { verifyClerkSessionToken } from './utils/clerk-verify';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.get('auth').register('content-api', {
      name: 'clerk-jwt',
      authenticate: async (ctx: any) => {
        const authHeader = ctx.request.header.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
        if (!token) return { authenticated: false };

        let payload;
        try {
          payload = await verifyClerkSessionToken(token);
        } catch {
          return { authenticated: false };
        }

        // Fail closed: an unrecognized Clerk user must NOT be auto-provisioned
        // here. Account/role linkage only ever happens via the invitation
        // webhook — a clerk_id with no matching Strapi user is just unauthenticated.
        const user = await strapi.documents('plugin::users-permissions.user').findFirst({
          filters: { clerk_id: payload.sub },
          populate: ['account', 'role'],
        });
        if (!user || user.blocked || !user.role) return { authenticated: false };

        // Generate the same ability/permissions object the built-in
        // users-permissions strategy would, so role-based permission
        // checks (Settings → Roles → Authenticated) still apply.
        const permissionService = strapi.plugin('users-permissions').service('permission');
        const permissions = await permissionService
          .findRolePermissions(user.role.id)
          .then((perms: any[]) => perms.map(permissionService.toContentAPIPermission));
        const ability = await strapi.contentAPI.permissions.engine.generateAbility(permissions);

        ctx.state.user = user;
        return { authenticated: true, credentials: user, ability };
      },
    });
  },
  bootstrap() {},
};
```

This registers **alongside** Strapi's built-in `users-permissions` strategy (`strapi.get('auth').register('content-api', authStrategy)` — confirmed by reading the plugin's own `register.js`), it doesn't replace it. Both are tried per-request; ours wins whenever a valid Clerk bearer token is present.

**Required manual step:** the Authenticated role still needs `find`/`findOne` explicitly checked in **Settings → Users & Permissions → Roles → Authenticated** for every scoped content-type, because our strategy generates its ability from that same role's permission set. Leave `create`/`update`/`delete` unchecked (admin-only, done through the admin panel, not the content API). Without this step, a validly-authenticated request still 403s.

### Account-scoping policies (`src/policies/`)

Strapi policy handlers receive the raw Koa `ctx` directly as the first argument (verified by reading `@strapi/utils`'s `createPolicyContext` — it's `Object.assign({is, type}, ctx)`, a shallow merge onto the real context, **not** a wrapper with a nested `.ctx` property). Returning `false` throws a `PolicyError` → 403; `true`/`undefined` passes.

**Gotcha — `ctx.query` is `undefined` inside a policy; use `ctx.request.query`.** `Object.assign({}, ctx)` only copies `ctx`'s *own* enumerable properties. Koa defines `query` as a prototype-level accessor (`delegate(Context.prototype, 'request').access('query')` in `koa/lib/context.js`) — it lives on `Context.prototype`, not as an own property of any given `ctx` instance, so it's silently dropped by that shallow copy. Reading `ctx.query.filters` inside a policy throws `Cannot read properties of undefined (reading 'filters')`, and it will 500 every list route using the policy, not just one — this shipped unnoticed until the first real end-to-end test of a `find` route, because `findOne`/`ctx.params` and `ctx.state` are unaffected (both are real own properties, assigned directly by `@koa/router` and Koa's `createContext()` respectively — only `query` is a delegated accessor). Fix: use `ctx.request.query` instead — `ctx.request` **is** a real own property (`context.request = Object.create(this.request)` in Koa's `createContext`), and `request.query` is a real getter/setter on that same Request instance, so it reads/writes through to the actual request that the downstream controller will see.

`src/policies/is-account-scoped-list.ts` (for `find`):
```ts
export default (ctx: any) => {
  const account = ctx.state.user?.account;
  if (!account) return false;

  ctx.request.query.filters = {
    $and: [ctx.request.query.filters ?? {}, { account: { documentId: { $eq: account.documentId } } }],
  };

  return true;
};
```

`src/policies/is-account-scoped-detail.ts` (for `findOne` — the core `findOne` controller resolves by `ctx.params.id` and ignores query filters, so this must fetch-and-compare instead of mutating the query):
```ts
export default async (ctx: any, config: { uid: string }, { strapi }: { strapi: any }) => {
  const account = ctx.state.user?.account;
  if (!account) return false;

  const entry = await strapi.documents(config.uid).findOne({
    documentId: ctx.params.id,
    populate: ['account'],
  });

  return !!entry && entry.account?.documentId === account.documentId;
};
```

**`project` has no scoping policy at all** — removed along with the `investment` join content-type (see the content-type model section above). Its router is a plain `factories.createCoreRouter('api::project.project')`, same as `news-article`/`news-category`/`resource` — read access is gated only by the Authenticated role's `find`/`findOne` permissions, not by any per-record ownership check.

Wire the account-scoping policies per content-type in its `routes/*.ts`:
```ts
export default factories.createCoreRouter('api::document.document', {
  config: {
    find: { policies: ['global::is-account-scoped-list'] },
    findOne: { policies: [{ name: 'global::is-account-scoped-detail', config: { uid: 'api::document.document' } }] },
  },
});
```

### Invitation flow

`src/api/invitation/content-types/invitation/lifecycles.ts`:
```ts
export default {
  async afterCreate(event: any) {
    const { result } = event;

    const invitation = await strapi.documents('api::invitation.invitation').findOne({
      documentId: result.documentId,
      populate: ['account'],
    });
    if (!invitation) return;

    const clerkInvitation = await strapi.service('api::invitation.invitation').createClerkInvitation(invitation);

    await strapi.documents('api::invitation.invitation').update({
      documentId: result.documentId,
      data: {
        clerk_invitation_id: clerkInvitation.id,
        invitation_url: clerkInvitation.url,
        invited_at: new Date(),
        // Clerk's expires_at is already in MILLISECONDS, not seconds — do not
        // multiply by 1000. Doing so produced a real bug: a date in the year
        // 58691 that crashed the admin panel's date picker trying to render it.
        invitation_expires_at: clerkInvitation.expires_at ? new Date(clerkInvitation.expires_at) : undefined,
      },
    });
  },

  // There is NO invitation.revoked/invitation.expired webhook from Clerk for
  // plain (non-organization) invitations — checked the full webhook event
  // catalog directly. Only organizationInvitation.* events exist, a different
  // feature. So revocation must be initiated from Strapi, not reacted to.
  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    if (data.invitation_status !== 'revoked') return;

    const invitation = await strapi.documents('api::invitation.invitation').findOne({
      documentId: where.documentId ?? where.id,
    });
    if (!invitation?.clerk_invitation_id) return;

    await strapi.service('api::invitation.invitation').revokeClerkInvitation(invitation.clerk_invitation_id);
  },
};
```

`src/api/invitation/services/invitation.ts`:
```ts
const CLERK_API_URL = 'https://api.clerk.com/v1';

export default factories.createCoreService('api::invitation.invitation', () => ({
  async createClerkInvitation(invitation: {
    email: string; role: string; first_name?: string | null; last_name?: string | null;
    account?: { documentId: string };
  }) {
    const response = await fetch(`${CLERK_API_URL}/invitations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: invitation.email,
        notify: true,
        ignore_existing: true,
        public_metadata: {
          accountId: invitation.account?.documentId,
          role: invitation.role,
          firstName: invitation.first_name ?? undefined,
          lastName: invitation.last_name ?? undefined,
        },
        redirect_url: `${process.env.INVESTOR_PORTAL_URL}/sign-up`,
      }),
    });
    if (!response.ok) throw new Error(`Clerk API error creating invitation: ${response.status} - ${await response.text()}`);
    return response.json() as Promise<{ id: string; url: string; expires_at: number | null }>;
  },

  async revokeClerkInvitation(clerkInvitationId: string) {
    const response = await fetch(`${CLERK_API_URL}/invitations/${clerkInvitationId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`Clerk API error revoking invitation: ${response.status} - ${await response.text()}`);
    return response.json();
  },
}));
```

Clerk's Invitations API has **no** `first_name`/`last_name` fields of its own (confirmed against the live OpenAPI spec, tag "Invitations") — they're stashed in `public_metadata` as a fallback only. The actual prefill mechanism (below) doesn't depend on reading them back from Clerk mid-flow, since Clerk only copies `public_metadata` into the user's metadata *after* signup completes, not during.

### Clerk webhook receiver (`src/api/clerk-webhook/`) — hosted in Strapi, not Next.js

Requires raw request bytes for svix signature verification, which Strapi's default JSON body parsing discards. `config/middlewares.ts`:
```ts
{
  name: 'strapi::body',
  config: { includeUnparsed: true }, // exposes ctx.request.body[Symbol.for('unparsedBody')]
},
```

`src/api/clerk-webhook/routes/clerk-webhook.ts` (public — verified via svix signature instead of Strapi auth):
```ts
export default {
  routes: [{ method: 'POST', path: '/clerk-webhook', handler: 'clerk-webhook.handle', config: { auth: false } }],
};
```

`src/api/clerk-webhook/controllers/clerk-webhook.ts`:
```ts
import { Webhook } from 'svix';

export default {
  async handle(ctx: any) {
    const signingSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
    const rawBody = ctx.request.body?.[Symbol.for('unparsedBody')];
    if (!signingSecret || !rawBody) return ctx.badRequest('Missing webhook signature material');

    let event: any;
    try {
      const webhook = new Webhook(signingSecret);
      event = webhook.verify(rawBody, {
        'svix-id': ctx.request.header['svix-id'],
        'svix-timestamp': ctx.request.header['svix-timestamp'],
        'svix-signature': ctx.request.header['svix-signature'],
      });
    } catch {
      return ctx.badRequest('Invalid webhook signature');
    }

    if (event.type === 'user.created') await handleUserCreated(event.data);
    else if (event.type === 'user.updated') await handleUserUpdated(event.data);

    ctx.body = { ok: true };
  },
};

// email_addresses[0] is NOT reliably the primary email once a user has more
// than one — resolve via primary_email_address_id instead.
function getPrimaryEmail(data: any): string | undefined {
  const emails = data.email_addresses ?? [];
  const primary = emails.find((e: any) => e.id === data.primary_email_address_id);
  return primary?.email_address ?? emails[0]?.email_address;
}

async function handleUserCreated(data: any) {
  const email = getPrimaryEmail(data);
  if (!email) return;

  const invitation = await strapi.documents('api::invitation.invitation').findFirst({
    filters: { email, invitation_status: 'pending' },
    populate: ['account'],
  });
  if (!invitation?.account) return;

  const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'authenticated' }, // confirmed exact pattern from the plugin's own auth controller
  });
  if (!authenticatedRole) return;

  const user = await strapi.documents('plugin::users-permissions.user').create({
    data: {
      username: email, email,
      first_name: data.first_name ?? null, last_name: data.last_name ?? null,
      clerk_id: data.id, account: invitation.account.documentId,
      role: authenticatedRole.id, confirmed: true, password: crypto.randomUUID(),
    },
  });

  await strapi.documents('api::invitation.invitation').update({
    documentId: invitation.documentId,
    data: { invitation_status: 'accepted', accepted_at: new Date(), accepted_by_user: user.documentId },
  });
}

// Keeps Strapi in sync when an investor updates their name/email in Clerk
// (e.g. via the UserButton → "Manage account" UI already built into Clerk).
async function handleUserUpdated(data: any) {
  const user = await strapi.documents('plugin::users-permissions.user').findFirst({
    filters: { clerk_id: data.id },
  });
  if (!user) return;

  const email = getPrimaryEmail(data);
  await strapi.documents('plugin::users-permissions.user').update({
    documentId: user.documentId,
    data: {
      first_name: data.first_name ?? null,
      last_name: data.last_name ?? null,
      ...(email ? { email, username: email } : {}),
    },
  });
}
```

**Gotcha:** custom routes must avoid path collision with the core router's `:id` param. We originally tried `GET /invitations/lookup` for a lookup endpoint and it would have been swallowed by the core `GET /invitations/:id` route (Koa/Express treats `"lookup"` as the id param) depending on file-load order. Fixed by using a top-level path (`/invitation-lookup`) instead of nesting under `/invitations/`.

### Public invitation-lookup endpoint (for sign-up prefill)

`src/api/invitation/routes/invitation-lookup.ts`:
```ts
export default {
  routes: [{ method: 'GET', path: '/invitation-lookup', handler: 'invitation.lookup', config: { auth: false } }],
};
```

Added as a custom action on the existing controller (`src/api/invitation/controllers/invitation.ts`):
```ts
export default factories.createCoreController('api::invitation.invitation', () => ({
  async lookup(ctx: any) {
    const email = ctx.query.email;
    if (!email || typeof email !== 'string') {
      ctx.body = { firstName: null, lastName: null };
      return;
    }
    const invitation = await strapi.documents('api::invitation.invitation').findFirst({
      filters: { email, invitation_status: 'pending' },
    });
    ctx.body = { firstName: invitation?.first_name ?? null, lastName: invitation?.last_name ?? null };
  },
}));
```

Deliberately narrow: returns only two name fields (nothing else, no account info), and returns `null`s rather than 404 for a non-match so it can't double as an "is this email invited" oracle.

### Investment opportunities + interest registration

Two content-types, added together to back the "Register Interest" flow:

- **`investment-opportunity`** — `title`, `excerpt`, `tag`, `draftAndPublish: true`. A shared broadcast, same visibility model as `project`/`news-article` (plain `factories.createCoreRouter()`, no scoping policies — every logged-in investor sees every published opportunity).
- **`interest-registration`** — an account's indication of interest in one opportunity: `amount` (decimal), `acknowledgedCapitalCalls` (boolean, required), and `manyToOne` relations to `opportunity`, `account`, and `investorUser`. `find`/`findOne` are scoped with the same `is-account-scoped-list`/`is-account-scoped-detail` policies as Document/Property/PortfolioReport — but **`create` is not policy-scoped**, because a policy can only filter/reject, not rewrite which account a new record belongs to.

**Why `create` is a full controller override, not a policy.** Document/Property/PortfolioReport records are created by an admin in the content-manager (trusted context, no client input to distrust). Interest registrations are created by the investor themselves from the portal — the request body must never be trusted for *who this belongs to*, or one investor could submit a registration on another account's behalf by editing the request. So `src/api/interest-registration/controllers/interest-registration.ts` replaces the default `create` action entirely:

```ts
export default factories.createCoreController('api::interest-registration.interest-registration', ({ strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user;
    const account = user?.account;
    if (!account) return ctx.forbidden();

    const { opportunity: opportunityDocumentId, amount, acknowledged } = ctx.request.body?.data ?? {};
    if (!opportunityDocumentId || typeof amount !== 'number' || amount <= 0) {
      return ctx.badRequest('A positive amount and opportunity are required');
    }
    if (acknowledged !== true) {
      return ctx.badRequest('Acknowledgement of capital call terms is required');
    }

    const opportunity = await strapi.documents('api::investment-opportunity.investment-opportunity')
      .findOne({ documentId: opportunityDocumentId });
    if (!opportunity) return ctx.notFound('Opportunity not found');

    // Idempotent: a second submission for an already-registered account+opportunity
    // returns the existing record instead of creating a duplicate or re-emailing.
    const existing = await strapi.documents('api::interest-registration.interest-registration').findFirst({
      filters: {
        account: { documentId: { $eq: account.documentId } },
        opportunity: { documentId: { $eq: opportunityDocumentId } },
      },
    });
    if (existing) { ctx.body = { data: existing }; return; }

    const registration = await strapi.documents('api::interest-registration.interest-registration').create({
      data: {
        amount,
        acknowledgedCapitalCalls: true,
        account: account.documentId,
        investorUser: user.documentId,
        opportunity: opportunityDocumentId,
      },
    });

    try {
      await sendInterestRegistrationEmail({ /* investorName, accountName, opportunityTitle, amount */ });
    } catch (error) {
      // Registration is already saved — don't fail the investor's submission over a notification-email hiccup.
      strapi.log.error('Failed to send interest registration email', error);
    }

    ctx.body = { data: registration };
  },
}));
```

The `investorUser`/`account` values come from `ctx.state.user` (set by the `clerk-jwt` auth strategy) — identical trust boundary to the `find`/`findOne` policies, just applied inside a controller instead of a policy because it needs to *write* a value, not just filter a query.

**Required manual step (in addition to the general one above):** Authenticated role needs `find`/`findOne` checked for `investment-opportunity`, and `find`/`findOne`/**and `create`**/checked for `interest-registration` — this is the one content-type in the whole integration where Authenticated legitimately needs `create`, since investors submit these themselves rather than an admin creating them.

**Email notification (`src/utils/resend.ts`) — raw fetch, not a Strapi email-plugin provider.** Checked the npm registry directly: there is **no official `@strapi/provider-email-resend`** package (the official providers are nodemailer/sendgrid/mailgun/amazon-ses/sendmail only). The community Resend providers that do exist are unofficial and largely unmaintained. Rather than take that dependency, `sendInterestRegistrationEmail()` does a plain `fetch('https://api.resend.com/emails', ...)` with `Authorization: Bearer ${RESEND_API_KEY}` — the same "raw fetch to the vendor's REST API" pattern already used for Clerk invitations (`src/api/invitation/services/invitation.ts`), rather than introducing a second dependency-management style for external services. Confirmed current via Resend's docs: `POST /emails` with `{ from, to, subject, html }`, bearer auth. Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (`.env`) — `RESEND_FROM_EMAIL`'s domain must be verified in the Resend account or sends fail. `INTEREST_NOTIFICATION_EMAIL` defaults to `info@east97.ca` in code if unset. If either env var is missing, the util logs a warning and skips the send (doesn't throw) — the registration record is the source of truth and is always saved regardless of email outcome.

---

## Frontend (Next.js, App Router)

### Environment variables (`.env.local`)

```
STRAPI_URL=http://localhost:1337   # server-only — no NEXT_PUBLIC_ prefix, never sent to the browser
```

### Token forwarding (`lib/strapi/token.ts`)

```ts
import { auth } from "@clerk/nextjs/server"

export async function getStrapiAuthHeader(): Promise<HeadersInit> {
  const { getToken } = await auth()
  const token = await getToken() // Clerk's default session token — no JWT template needed
  if (!token) throw new Error("Not authenticated")
  return { Authorization: `Bearer ${token}` }
}
```

Clerk's **default session token** (no `template` option) is sufficient — it's always JWKS-verifiable and short-lived by design. No custom JWT template is needed because Strapi does its own `clerk_id` lookup rather than trusting embedded claims.

### Strapi REST client (`lib/strapi/client.ts`)

```ts
const STRAPI_URL = process.env.STRAPI_URL

export async function strapiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")
  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...init,
    headers: { ...authHeader, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store", // per-account data — don't let Next's data cache bleed across users
  })
  if (!res.ok) throw new Error(`Strapi request to ${path} failed: ${res.status} ${res.statusText}`)
  const json = await res.json()
  return json.data as T // Strapi 5's Document Service routes wrap responses in {data, meta}
}

// For findOne-by-id lookups where a 404 is an expected, non-error outcome.
export async function strapiFetchOptional<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  // ...same as above, but `if (res.status === 404) return undefined` before the ok-check
}
```

**No client-added account filters are ever sent** — Strapi's policies are the only enforcement point.

**Gotcha — Strapi 5 response shape:** Document Service REST responses (`/api/documents`, etc.) are **flat by default** — `{data: {id, documentId, title, ...}}`, not the Strapi v4-style `{data: {id, attributes: {title, ...}}}` nesting. (Confirmed by reading the core controller's `transformResponse`: the JSON:API attribute-wrapping only happens when `useJsonAPIFormat` is explicitly true, which isn't the REST default.) If you're used to v4 tutorials, don't reach for `.attributes` — it isn't there.

**Gotcha — `/api/users/me` breaks the `{data}` pattern.** It's a plugin controller action, not a Document Service route, and returns the user object directly as the response body (`ctx.body = await sanitizeOutput(user, ctx)`), not wrapped in `{data, meta}`. `getMyAccount()` below uses a raw `fetch` instead of `strapiFetch()` for exactly this reason.

### Data-fetching pattern (`lib/documents.ts`, `lib/projects.ts`, `lib/portfolio.ts`, `lib/properties.ts`)

Each file kept its pre-existing exported function names/signatures (originally backed by mock arrays) and swapped the body for a `strapiFetch` call + a small colocated mapper — page components needed **zero changes**. Example (`lib/properties.ts`):

```ts
import { strapiFetch } from "@/lib/strapi/client"

export type Property = { id: string; address: string; /* ...frontend shape... */ }
type StrapiProperty = { documentId: string; address: string; /* ...raw Strapi shape... */ }

function mapProperty(p: StrapiProperty): Property {
  return { id: p.documentId, address: p.address, /* ... */ }
}

export async function getProperties(): Promise<Property[]> {
  const properties = await strapiFetch<StrapiProperty[]>("/properties")
  return properties.map(mapProperty)
}
```

For a fully global/unscoped resource (no account relation, no policy) — `lib/projects.ts`:
```ts
export async function getProjects(): Promise<Project[]> {
  const projects = await strapiFetch<StrapiProject[]>("/projects")
  return projects.map(mapProject)
}
```

For `findOne`-by-slug, call the real REST `findOne` path (`/portfolio-reports/${slug}`), not a `find` with a filter — the account-scoping **detail** policy is wired to `findOne`, not `find`:
```ts
export async function getPortfolioReportBySlug(slug: string) {
  const report = await strapiFetchOptional<StrapiPortfolioReport>(`/portfolio-reports/${slug}?populate=report`)
  return report ? mapReport(report) : undefined
}
```

### Current-account lookup (`lib/account.ts`)

```ts
export async function getMyAccount(): Promise<Account | null> {
  const STRAPI_URL = process.env.STRAPI_URL
  if (!STRAPI_URL) throw new Error("STRAPI_URL is not set")

  const authHeader = await getStrapiAuthHeader()
  const res = await fetch(`${STRAPI_URL}/api/users/me?populate=account`, {
    headers: { ...authHeader, "Content-Type": "application/json" },
    cache: "no-store",
  })
  if (!res.ok) {
    // A 401 here can legitimately happen for a brand-new user in the seconds
    // right after account activation, before Clerk's user.created webhook has
    // finished linking the Strapi user (webhooks are async/eventually
    // consistent — this isn't something signUp.finalize() waits for). Fail
    // soft instead of throwing, so a slow webhook degrades the sidebar rather
    // than crashing the whole dashboard layout.
    console.error(`Strapi request to /users/me failed: ${res.status} ${res.statusText}`)
    return null
  }

  const me = await res.json()
  if (!me.account) return null
  return { id: me.account.documentId, name: me.account.name, accessCategories: me.account.accessCategories ?? [] }
}
```

Consumed by an **async server component** (`components/side-nav-investor.tsx`), alongside Clerk's own `currentUser()` for the display name:
```tsx
export async function SideNavInvestor() {
  const [user, account] = await Promise.all([currentUser(), getMyAccount()])
  // render name/company/categories
}
```

### Sign-in custom flow (`app/sign-in/[[...sign-in]]/page.tsx`)

Uses Clerk's modern simplified custom-flow hook API (clerk-js v6 / `@clerk/nextjs` v7+ — methods called directly on the resource object, e.g. `signIn.password(...)`, not the older verbose `signIn.create()` → `attemptFirstFactor()` → `setActive()` pattern). Handles `needs_client_trust` (Clerk's device-trust MFA-adjacent flow) via `signIn.mfa.sendEmailCode()`/`verifyEmailCode()`. Password fields use a show/hide toggle (Phosphor `EyeIcon`/`EyeSlashIcon`) — worth including on any password field long enough that typing it blind is error-prone.

### Sign-up custom flow — invitation acceptance (`app/sign-up/[[...sign-up]]/page.tsx`)

This is the most involved piece. Key points, since the "obvious" implementation has several traps:

1. **Self-serve sign-up must stay blocked, but the ticket flow must not be.** The naive version of this page (`redirect("/sign-in")` unconditionally) blocks the *invitation* flow too, since Clerk lands the user on `/sign-up?__clerk_ticket=...&__clerk_status=sign_up` — the exact route being redirected away from. Distinguish by the presence of `__clerk_ticket`.

2. **Consuming the ticket** uses `signUp.ticket({ ticket })` — a real method on the modern `SignUpFuture` API (verified in `@clerk/shared`'s type definitions: `ticket: (params?: SignUpFutureTicketParams) => Promise<{error}>`), not something you have to fake with `signUp.create({strategy: 'ticket', ticket})` (that's the older API shape).

3. **Whether a password is still needed** is read from `signUp.missingFields?.includes("password")` (`SignUpField` includes `'password'` as a literal via `PasswordAttribute`).

4. **Prefilling name fields from the Strapi invitation**: Clerk's invitation `public_metadata` isn't exposed on the client-side `signUp` resource mid-flow (it's only copied into the *user's* metadata after signup completes) — so don't try to read it back that way. Instead, once `signUp.emailAddress` becomes available (populated automatically after ticket consumption, since Clerk knows which email the invitation was for), call a lookup keyed by that email:
   ```ts
   if (signUp.emailAddress) {
     const res = await fetch(`/api/invitation-lookup?email=${encodeURIComponent(signUp.emailAddress)}`)
     const data = await res.json()
     setPrefill({ firstName: data.firstName ?? "", lastName: data.lastName ?? "" })
   }
   ```
   `app/api/invitation-lookup/route.ts` is a thin server-side proxy to Strapi's public lookup endpoint — needed because `STRAPI_URL` is deliberately server-only and this page is a client component.

5. **Avoiding a race between `finalize()` and the account-linking webhook.** `signUp.finalize()` activates the Clerk session immediately, but the `user.created` webhook that creates/links the Strapi user is a *separate*, async event — Clerk's own webhook docs explicitly warn against relying on webhook delivery as part of a synchronous flow. Navigating to `/dashboard` right after `finalize()` can hit Strapi before the link exists, producing a real (not flaky) `401` from `getMyAccount()`. Fix: poll a readiness check inside the `navigate` callback before actually routing:
   ```ts
   const waitForAccountReady = async () => {
     for (let attempt = 0; attempt < 8; attempt++) {
       const res = await fetch("/api/account-ready", { cache: "no-store" })
       const { ready } = await res.json()
       if (ready) return
       await new Promise((resolve) => setTimeout(resolve, 400))
     }
   }

   const goToDashboard = async () => {
     await signUp.finalize({
       navigate: async ({ decorateUrl }) => {
         await waitForAccountReady()
         const url = decorateUrl("/dashboard")
         if (url.startsWith("http")) window.location.href = url
         else router.push(url)
       },
     })
   }
   ```
   `app/api/account-ready/route.ts` (server-side — has access to the active Clerk session via `auth()`):
   ```ts
   export async function GET() {
     const { getToken } = await auth()
     const token = await getToken()
     if (!token) return NextResponse.json({ ready: false })
     const res = await fetch(`${STRAPI_URL}/api/users/me?populate=account`, {
       headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
     })
     if (!res.ok) return NextResponse.json({ ready: false })
     const me = await res.json()
     return NextResponse.json({ ready: Boolean(me.account) })
   }
   ```

6. **`useSearchParams()` needs a `<Suspense>` boundary** in the App Router — wrap the component that calls it, don't call it at the top of the page's default export directly.

7. **Bot-protection CAPTCHA widget.** For a custom flow (not Clerk's prebuilt `<SignUp />`), you must render `<div id="clerk-captcha" />` yourself or you'll get a console warning and a silent fallback to an invisible widget. Place it unconditionally in the DOM (not gated behind a state check) since Clerk can attempt to initialize it before your own flow-state logic resolves:
   ```tsx
   <div id="clerk-captcha" />
   ```
   Note: for a pure invitation-only flow (no self-serve sign-up path at all), bot protection is low-value — nobody can reach this form without a ticket only an admin can issue. Fine to leave the Dashboard's "Bot sign-up protection" rule disabled if you don't want a CAPTCHA shown to invited users at all; the div is still worth including to avoid the console warning either way.

---

## Local webhook testing (Clerk CLI tunnel)

Local Strapi (`localhost:1337`) isn't reachable from Clerk's servers. For local dev:
```bash
clerk webhooks listen --token "$(clerk webhooks token)" --forward-to http://localhost:1337/api/clerk-webhook
```
This opens a temporary relay (`https://webhooks.clerk.com/in/c_.../`) and forwards signed events to local Strapi.

**Gotcha — the relay URL is NOT stable.** Every invocation of `clerk webhooks token` mints a brand-new ID, so restarting the tunnel produces a different relay URL each time. Whatever's registered in the Clerk Dashboard's webhook endpoint config goes stale the moment you restart. Practical guidance:
- Keep the tunnel process running for your whole testing session — don't restart it casually.
- If it does die/reconnect, you must update the Dashboard endpoint URL to match the new one.
- Watch for **duplicate tunnel processes** (e.g. running the command again in a new terminal without realizing one's already running elsewhere) — only the one matching the currently-registered Dashboard URL actually delivers anything; a second, forgotten one just sits there consuming a slot.
- For anything beyond quick local smoke-testing, deploy the backend somewhere with a stable HTTPS URL — this whole class of flakiness goes away.

**Gotcha — env var changes require a Strapi restart.** `.env` is loaded once at process boot; editing it while `strapi develop` is already running does nothing until you restart. (Schema/lifecycle/controller file changes *do* auto-reload via Strapi's watcher — only `.env` needs a manual restart.)

---

## Things Clerk does NOT provide (checked directly, don't assume)

- **No bounce/delivery-failure webhook for invitations or email in general.** The only email-related event is `email.created` (fires when an email is *queued*, no delivery-status field, doesn't fire again on failure). Checked the full webhook catalog and the Backend API schema — no `Email` resource with a status field exists either. A bounced invite is indistinguishable from an unaccepted one; the only signal is `invitation_status` staying `pending` past `invitation_expires_at`.
- **No `invitation.revoked`/`invitation.expired`/`invitation.accepted` webhook** for plain (non-organization) invitations. Only `organizationInvitation.*` events exist, a separate, org-scoped feature. This is why revocation is Strapi-initiated (see the `beforeUpdate` lifecycle above) rather than webhook-reactive.
- **No `GET /invitations/{id}`** single-item fetch endpoint on the Backend API (only list + create + bulk-create + revoke) — can't look up one invitation by ID after the fact without listing/filtering.

---

## Verified against, when writing this

Given how much of this depends on exact library/API versions, everything above was checked against the actually-installed package versions and the live Clerk OpenAPI spec (`2026-05-12` at time of writing) rather than assumed from memory or older reference code found elsewhere in the workspace — a sibling project's Clerk+Strapi integration turned out to be about a year stale in several ways (wrong `verifyToken` return shape, non-existent webhook events, a real security gap). If you're replicating this in a new project, re-verify the same way rather than copying blind:
- `npx tsc --noEmit` after every schema/type-touching change (catches Strapi content-type type-generation drift immediately).
- Read the installed package's actual `.d.ts` files for any method signature you're unsure of, especially after a major version bump.
- Check Clerk's current webhook event catalog and OpenAPI spec directly (via the `clerk-backend-api`/`clerk-webhooks` skills, or the Dashboard) before assuming an event/field/endpoint exists.
