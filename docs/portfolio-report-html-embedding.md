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

`e97-api`'s upload provider is **`strapi-provider-upload-azure-sa`** (`config/plugins.ts`) — the only community Azure Blob Storage provider available (Strapi ships no official one; only 3 versions ever published, last one Dec 2024, so a small/lightly-maintained package, chosen deliberately anyway). **Live as of this writing**: real Azure credentials are filled in, using **`AZURE_STORAGE_ACCOUNT_KEY`** (shared-key auth, not SAS token), and a real portfolio report has been uploaded through Strapi admin and confirmed rendering correctly in the iframe. Uploaded files are served **directly from Azure's own domain** (e.g. `https://<account>.blob.core.windows.net/...`), not from Strapi at all. What this means, now confirmed against the real thing rather than reasoned about in advance:

- **The `uploads-frame-policy` middleware is bypassed, and it doesn't matter.** It only runs for requests that hit Strapi's own `/uploads` path — Azure Blob responses never pass through Strapi's Koa middleware chain at all. **Confirmed live**: the uploaded report renders in the iframe with no frame-embedding fix needed on the Azure side, consistent with the "Azure doesn't set X-Frame-Options by default" expectation below actually holding true for this storage account. If a CDN/Front Door ever gets added in front of the storage account, re-check this — that's a different origin's headers, not Azure's raw blob response.
- **Content-Type is fine** — checked `strapi-provider-upload-azure-sa`'s source (`src/upload.ts`) directly: it sets `blobHTTPHeaders.blobContentType = file.mime` on every upload, so an `.html` file gets served as `Content-Type: text/html`, not Azure's generic `application/octet-stream` default — **provided Strapi's own upload validation lets the file through in the first place** (the `text/html` allow-list fix above still matters regardless of storage backend — it's Strapi's own gate, not Azure's).
- **Public read access is explicit and live — the container is publicly readable.** Since **`AZURE_STORAGE_ACCOUNT_KEY`** is the configured auth mode (not `AZURE_STORAGE_SAS_TOKEN`), every `file.url` Strapi returns is a bare, unsigned blob URL (`file.url = client.url` — confirmed via `strapi-provider-upload-azure-sa`'s `src/azure-client.ts`/`src/upload.ts`). **This is a live, real gap, not a hypothetical one**: anyone with a report's URL can view it directly, forever, with no auth check at all — that URL just happened to work in the browser because the container allows anonymous blob reads. This makes "Planned: authenticated proxy download" below more urgent than before, not less; right now there is zero access control on report files once someone has the link. (For reference, `AZURE_STORAGE_SAS_TOKEN` mode would have produced a URL with one static, container-wide signature attached — still not per-file/per-request protection, but not fully bare either. That path wasn't taken here.)
- **X-Frame-Options isn't a problem on this Azure account** — confirmed live (see above), matching the expectation that Azure's blob GET/HEAD responses don't inject clickjacking-protection headers by default, unlike Strapi's own default.
- **The iframe's `sandbox="allow-scripts"` policy is unaffected by hosting location** — same consideration either way (already flagged in `AGENTS.md`: revisit whether `allow-same-origin` is needed once real reports are in place, e.g. if a report needs to load external assets, at some cost to isolation).
- **CORS is unlikely to matter for the iframe itself.** A plain `<iframe src="...">` load is a navigation, not a `fetch()`/XHR call, so it isn't subject to CORS preflight the way cross-origin API calls are. CORS would only become relevant if the report's own embedded JavaScript makes cross-origin fetch calls to other resources — unrelated to how the report itself is loaded.

**Bottom line**: once real Azure credentials exist, decide the auth mode (shared key vs. static SAS — see above), confirm frame-embedding by checking real response headers against a live blob URL, and re-verify these points again if the provider package ever changes — none of this is guaranteed to hold for a different package.

## Built: authenticated proxy download (hides the blob URL entirely)

**Goal**: the actual storage URL should never be visible to the browser at all — not a public URL, not a SAS-signed URL, nothing the client can copy, bookmark, or share to get direct access outside the app. This is a stronger requirement than "access-controlled" — it rules out both the public-container approach and any design where a signed URL is handed to the client (including a server-side redirect to one, since the target URL of a redirect is still visible to the browser's network tab).

**Implemented**, covering all three content-types that expose files (not just Portfolio Report) — Document, Portfolio Report, and Resource. This was prioritized once the container went public/live with bare unsigned URLs (see above) — at that point it stopped being a "nice to have eventually" and became the only thing actually closing the direct-download gap.

### Why a single Strapi proxy route isn't enough on its own

The natural first instinct — add an authenticated Strapi route like `GET /api/portfolio-reports/:id/download` that streams the file, and point the iframe/link straight at it — doesn't fully work by itself for the iframe case. The iframe's `src` is a **direct browser request**; browsers don't let you attach a custom `Authorization` header to an `<iframe src>` load. Every other authenticated call in this app works because it's made server-side (a Next.js Server Component or Route Handler calling `getStrapiAuthHeader()`) — there's no equivalent for a raw browser-initiated iframe load. A Strapi route requiring the normal `clerk-jwt` bearer auth would just 401 when hit directly by the iframe. So there's a Next.js hop in front of Strapi's route for all three content-types, for consistency, even though Document/Resource are downloaded via `<a href download>` rather than an iframe (a plain link *could* have carried a bearer token via `fetch()` + blob URL, but routing everything through the same shape keeps one pattern instead of two).

### The actual design: two-hop authenticated proxy

```
Browser  →  Next.js route handler   →  Strapi route handler   →  Azure Blob Storage
(iframe/    (same-origin, forwards      (clerk-jwt auth +          (Azure SDK read via
 <a href>)   the user's Clerk token      account-scoped policy       Strapi's own shared-key
             server-side)                 for Document/Portfolio     credential — never a
                                          Report; auth-only for       client-facing SAS)
                                          Resource, which is global)
```

1. **`lib/strapi/proxyDownload.ts`** (Next.js) — one shared helper, `proxyStrapiDownload(strapiPath)`, used by all three route handlers below. Forwards the caller's Clerk token (`getStrapiAuthHeader()`, same as every other authenticated call in this app) to the matching Strapi route and streams the response body + `Content-Type`/`Content-Disposition` straight back.
2. **`app/api/documents/[documentId]/download/route.ts`**, **`app/api/portfolio-reports/[documentId]/download/route.ts`**, **`app/api/resources/[documentId]/download/route.ts`** — thin Route Handlers, each just awaiting `params` and calling the shared helper with the right Strapi path.
3. **`e97-api/src/utils/azure-download.ts`** — shared backend utility, `streamAzureFileToCtx(ctx, fileUrl, { filename, disposition, contentType? })`. Builds a `BlobServiceClient` from `AZURE_STORAGE_ACCOUNT`/`AZURE_STORAGE_ACCOUNT_KEY` (the same shared-key credential already used for uploads), derives the blob's path **from the stored `file.url` itself** (not reconstructed from `defaultPath`/hash conventions, so it doesn't depend on the upload provider's internal naming scheme), and streams `downloadResponse.readableStreamBody` onto `ctx.body`.
4. **Per-content-type custom routes + controller actions** (`GET /documents/:id/download`, `GET /portfolio-reports/:id/download`, `GET /resources/:id/download`) — each controller resolves the entry + its media relation, 404s if missing, then calls the shared streaming util. Document and Portfolio Report reuse the **existing** `global::is-account-scoped-detail` policy (same reuse pattern as the rest of this integration — no new authorization logic). Resource has **no scoping policy** — it's intentionally global (any authenticated investor), matching its existing `find`/`findOne` behavior.
5. Portfolio Report's action forces `Content-Type: text/html` and `Content-Disposition: inline` (renders in the iframe, shouldn't prompt a save dialog); Document/Resource use `attachment` with a filename built from the entry's title + the media file's extension.
6. **`lib/documents.ts`**, **`lib/resources.ts`**, **`lib/portfolio.ts`** now build their `url`/`reportUrl` fields as same-origin `/api/.../[documentId]/download` paths instead of calling `toAbsoluteMediaUrl()` on the raw media URL — that helper is gone from `lib/strapi/media.ts` entirely, since nothing calls it anymore. `components/document-list.tsx` and `app/dashboard/portfolio/[slug]/page.tsx` needed **no changes** — both already just render whatever `url`/`reportUrl` they're given.

### Side effect: this also replaces the `/uploads` frame-policy fix, for real this time

Because the iframe now points at the **Next.js app's own domain** (same-origin as the parent page), there's no cross-origin framing problem left to solve at all — same-origin content is always frameable regardless of `X-Frame-Options`/CSP. The `uploads-frame-policy` middleware documented above is no longer needed for this flow (it'd only still matter if something bypasses the proxy and links to a raw Azure/`/uploads` URL directly, which nothing should once this is live).

### Prerequisite this doesn't do on its own: the Azure container must go private

Building this proxy doesn't by itself stop the old bare blob URL from working — Azure doesn't know this proxy exists. **The container's public access level has to be switched to private** for the proxy to become the *only* path in; until that happens, both paths work in parallel and the protection isn't real yet. Known side effect once it's private: `strapi-provider-upload-azure-sa` has no admin-preview SAS logic, so Strapi's own admin content-manager thumbnails for these files may show broken images — accepted tradeoff, doesn't affect the investor-facing app.

### Tradeoff accepted

Streaming through two extra hops (Next.js, then Strapi) means their bandwidth/memory sits in the request path instead of Azure serving the file directly to the browser. For large files this has a real cost. The lighter-weight alternative (a very-short-lived, e.g. 60-second, SAS URL generated server-side with a redirect) was considered and explicitly not chosen — it's a **weaker** guarantee than this design, since the target URL is briefly visible in the browser's network tab during the redirect even though the token expires almost immediately. Revisit only if streaming overhead is proven to matter in practice.
