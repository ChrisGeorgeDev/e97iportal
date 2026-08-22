# Portfolio Report HTML Embedding

How self-contained HTML portfolio reports get uploaded to Strapi and embedded in an iframe on the investor dashboard (`app/dashboard/portfolio/[slug]/page.tsx`), and what changes when the upload provider moves from local disk (dev) to Azure Blob Storage (production).

## The problem

Uploading a `.html` file to a Portfolio Report's `report` media field and embedding it via `<iframe src={report.reportUrl}>` didn't work out of the box — two independent blockers, both confirmed by reading Strapi's actual source rather than assumed:

1. **Upload rejected outright.** `config/plugins.ts`'s `upload.config.security.allowedTypes` allow-list (`image/*`, `video/*`, `audio/*`, `application/pdf`, Word docs, `text/plain`, `text/csv`) didn't include `text/html`. Strapi's MIME validator (`@strapi/upload/dist/server/utils/mime-validation.js`) treats `allowedTypes` as a strict allow-list — anything not matching is rejected with `MIME_TYPE_NOT_ALLOWED` before the file is ever stored.
2. **Even if uploaded, the iframe wouldn't render it.** Strapi's default security middleware (`strapi::security`, koa-helmet under the hood) sends `X-Frame-Options: SAMEORIGIN` on every response, including static file serving under `/uploads`. The frontend (`localhost:3000` in dev) is a different origin than Strapi (`localhost:1337`), so the browser refuses to render framed content from a `SAMEORIGIN`-restricted origin — the iframe just shows blank.

## The fix (local/dev — Strapi serving files itself)

**1. Allow the MIME type** — `e97-api/config/plugins.ts`:
```ts
const allowedMediaTypes = [
  // ...existing entries...
  'text/html',
];
```

**2. Scope the frame policy to `/uploads` only** — rather than loosening frame protection globally (which would also expose the admin panel to clickjacking from other origins), a new middleware overrides the header only for uploaded file responses.

`e97-api/src/middlewares/uploads-frame-policy.ts`:
```ts
export default (config: { allowedOrigins?: string[] }) => {
  const allowedOrigins = config.allowedOrigins ?? [];

  return async (ctx: any, next: any) => {
    await next();

    if (!ctx.path.startsWith('/uploads')) return;

    ctx.remove('X-Frame-Options');
    ctx.set('Content-Security-Policy', `frame-ancestors 'self' ${allowedOrigins.join(' ')}`.trim());
  };
};
```

Registered in `e97-api/config/middlewares.ts`, right after `strapi::security` (so it runs afterward and can override what security already set):
```ts
{
  name: 'global::uploads-frame-policy',
  config: {
    // Reuses INVESTOR_PORTAL_URL rather than introducing a new env var.
    allowedOrigins: [process.env.INVESTOR_PORTAL_URL].filter(Boolean),
  },
},
```

**Verified live** (`curl -I` against a running instance):
```
/uploads/*  →  Content-Security-Policy: frame-ancestors 'self' http://localhost:3000
                (no X-Frame-Options)
/api/*      →  X-Frame-Options: SAMEORIGIN   (unchanged — admin/API protection untouched)
```

Both changes use Strapi's public, documented extension points (`plugin::upload` config, `config/middlewares.ts` custom middleware registration) — not internal monkey-patching — so they carry the same upgrade-safety profile as the rest of this project's Strapi customizations (custom auth strategy, policies, body-parser config): stable across minor/patch releases, only needing a look if Strapi restructures the middleware/config system itself in a major version, which would require revisiting every customization in the project, not just this one.

## Production: Azure Blob Storage considerations

Once `e97-api` switches its upload provider to Azure Blob Storage, uploaded files are served **directly from Azure's own domain** (e.g. `https://<account>.blob.core.windows.net/...`), not from Strapi at all. This changes what applies:

- **The `uploads-frame-policy` middleware above becomes irrelevant.** It only runs for requests that hit Strapi's own `/uploads` path. Azure Blob responses never pass through Strapi's Koa middleware chain — any frame-policy fix needed in production has to happen at the Azure/CDN layer instead, not in Strapi.
- **Content-Type is likely fine, but verify against the specific provider used.** Checked the real config already in use elsewhere in this workspace (`my-gg-api` uses `strapi-provider-upload-azure-storage`) — its upload code explicitly sets `blobHTTPHeaders.blobContentType = file.mime` on every upload, so an `.html` file will correctly get served as `Content-Type: text/html` rather than Azure's generic `application/octet-stream` default, **provided Strapi's own upload validation lets the file through in the first place** (the `text/html` allow-list fix above still matters regardless of storage backend — it's Strapi's own gate, not Azure's). If a different Azure provider package is used, don't assume this — confirm it sets content-type from the file's detected MIME type, or the browser will likely try to download the file instead of rendering it in the iframe.
- **Public read access must be explicit — Azure containers are private by default.** The frontend has no Azure credentials or SAS token to attach to the iframe's `src`, so the container needs anonymous public read access for blobs, or every report URL needs a SAS token appended. **Confirmed the currently-used provider package cannot do the latter**: checked `strapi-provider-upload-azure-storage`'s source directly, both the version installed in `my-gg-api` (3.4.0) and the current latest (3.5.0) — its `sasToken` config option only authenticates *Strapi's own connection* to Azure (server-to-server upload/management); every uploaded file's returned `file.url` is always a bare, unsigned blob URL (`file.url = client.url`). If the container/blob requires a SAS to read, that bare URL 403s in the browser — there is no version of this provider that appends a per-file read SAS token. See "Planned: authenticated proxy download" below for the actual answer if blobs need to be SAS-protected (not just publicly readable).
- **X-Frame-Options likely isn't a problem on plain Azure Blob Storage** — to my knowledge Azure's blob GET/HEAD responses don't inject clickjacking-protection headers by default, unlike Strapi's own default. This is expected behavior, not something verified against a live Azure endpoint from here — worth a quick `curl -I` against a real uploaded blob URL once storage is actually configured, just to confirm. **If a CDN or Azure Front Door sits in front of the storage account** (common in production for performance/custom domains), check that layer specifically — some default CDN rule sets do add security headers, which would need the equivalent scoped exception applied at the CDN/Front Door rule level instead of in Strapi.
- **The iframe's `sandbox="allow-scripts"` policy is unaffected by hosting location** — same consideration either way (already flagged in `AGENTS.md`: revisit whether `allow-same-origin` is needed once real reports are in place, e.g. if a report needs to load external assets, at some cost to isolation).
- **CORS is unlikely to matter for the iframe itself.** A plain `<iframe src="...">` load is a navigation, not a `fetch()`/XHR call, so it isn't subject to CORS preflight the way cross-origin API calls are. CORS would only become relevant if the report's own embedded JavaScript makes cross-origin fetch calls to other resources — unrelated to how the report itself is loaded.

**Bottom line for the eventual Azure migration**: re-verify the content-type and public-access points against whatever provider package and container configuration actually get used (don't assume this doc's specifics hold if the provider changes), and separately confirm frame-embedding still works by checking real response headers once deployed — the fix in this doc doesn't travel with the files to Azure.

## Planned: authenticated proxy download (hides the blob URL entirely)

**Goal**: the actual storage URL (Azure blob or otherwise) should never be visible to the browser at all — not a public URL, not a SAS-signed URL, nothing the client can copy, bookmark, or share to get direct access outside the app. This is a stronger requirement than "access-controlled" — it rules out both the public-container approach and any design where a signed URL is handed to the client (including a server-side redirect to one, since the target URL of a redirect is still visible to the browser's network tab).

**Not yet implemented** — this is the target design for whenever direct blob protection is prioritized (naturally around the Azure migration, but doesn't require it — this also works today against local disk storage).

### Why a single Strapi proxy route isn't enough

The natural first instinct — add an authenticated Strapi route like `GET /api/portfolio-reports/:id/download` that streams the file — doesn't fully work on its own. The iframe's `src` is a **direct browser request**; browsers don't let you attach a custom `Authorization` header to an `<iframe src>` load. Every other authenticated call in this app works because it's made server-side (a Next.js Server Component or Route Handler calling `getStrapiAuthHeader()`) — there's no equivalent for a raw browser-initiated iframe load. A Strapi route requiring the normal `clerk-jwt` bearer auth would just 401 when hit directly by the iframe.

### The actual design: two-hop authenticated proxy

```
Browser  →  Next.js route handler   →  Strapi route handler   →  storage backend
(iframe)    (same-origin, forwards      (clerk-jwt auth +          (local disk today;
             the user's Clerk token      account-scoped policy,     Azure SDK read,
             server-side)                 same as every other        using Strapi's own
                                          scoped content-type)        account key/managed
                                                                      identity — never a
                                                                      client-facing SAS)
```

1. **`app/api/portfolio-reports/[documentId]/download/route.ts`** (new, Next.js) — a Route Handler, not a client component, so it has server-side access to `auth()`/`getToken()` exactly like `lib/strapi/token.ts` already does. Forwards the request to Strapi's new download route with the user's bearer token attached, then pipes the response body straight back to the browser (`return new Response(strapiRes.body, { headers: { 'Content-Type': 'text/html' } })`).
2. **`e97-api/src/api/portfolio-report/routes/portfolio-report-download.ts`** (new, Strapi) — a custom route (`GET /portfolio-reports/:id/download`), authenticated the normal way (no `auth: false`) so `clerk-jwt` applies, with the **existing** `global::is-account-scoped-detail` policy attached (same reuse pattern as the rest of this integration — no new authorization logic to write, just point it at this route the same way `document`/`property`/etc. already use it).
3. **Controller action** resolves the report's `report` media relation, then reads the file server-side — either from local disk (dev) or via the Azure SDK (`BlobServiceClient`, using the same account key/managed identity Strapi's own upload provider already holds) — and streams the bytes back as the response body. The blob URL and any credentials never leave Strapi; the client only ever sees Strapi's own route.
4. **`lib/portfolio.ts`** changes `reportUrl` to point at the Next.js route from step 1 instead of the raw media URL, and the iframe in `app/dashboard/portfolio/[slug]/page.tsx` needs no changes — it already just renders whatever `reportUrl` is.

### Side effect: this also replaces the `/uploads` frame-policy fix

Because the iframe ends up pointing at the **Next.js app's own domain** (same-origin as the parent page, step 1), there's no cross-origin framing problem left to solve at all — same-origin content is always frameable regardless of `X-Frame-Options`/CSP. The `uploads-frame-policy` middleware documented above becomes unnecessary for this flow specifically (it'd only still matter if something bypasses the proxy and links to Strapi's `/uploads` path directly, which nothing should once this is built).

### Tradeoff to be aware of

Streaming through two extra hops (Next.js, then Strapi) means their bandwidth/memory sits in the request path instead of Azure serving the file directly to the browser. For large files this has a real cost. If that becomes a problem, the fallback is a very-short-lived (e.g. 60-second) SAS URL generated server-side with a redirect — but that's a **weaker** guarantee than this design: the target URL is briefly visible in the browser's network tab during the redirect, even though the token expires almost immediately. Only use that fallback if streaming's overhead is proven to matter; it doesn't meet "never visible to the client" as precisely as the full proxy does.
