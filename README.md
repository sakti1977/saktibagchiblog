# Life as Sakti — Astro rebuild

Astro replacement for https://saktibagchi.in with Pages CMS configuration for visual editing. The WordPress site stays live until validation and domain cutover.

## Current state

452 posts and 9 pages imported; all 461 main-sitemap URLs reconciled. Local build succeeds and validation passes across 1,990 content/archive routes. 460 referenced media files have been copied. Two large, unreferenced legacy videos need separate archival storage. The site is published to GitHub and Railway has built a non-indexed preview at https://saktibagchi-blog-production.up.railway.app; public HTTPS accessibility still needs confirmation. DNS is unchanged.

## Develop

Use Node 24. Install with `npm ci`. On restricted workstations set `ASTRO_TELEMETRY_DISABLED=1`. Run `npm run build`, then `npm start` (port 3000 by default). `npm run dev` starts Astro development mode. Re-run content preparation after editing JSON during development.

## Content and editing

- `content/posts/*.json` and `content/pages/*.json` are the editable source of truth.
- `.pages.yml` configures the visual editor, cover images, drafts, topics, SEO and site settings.
- `content/settings/site.json` holds homepage copy and navigation.
- `scripts/prepare-content.mjs` validates permalinks, excludes drafts, sanitizes content, and generates routes, feeds and sitemap before each build.
- `content/post/*.html` and `content/page/*.html` are initial import snapshots, not live editing sources.
- `source/wordpress/` and `reports/raw-html/` contain public source snapshots and are excluded from Git.
- `public/wp-content/uploads/` contains copied media at existing URL paths.
- `content/settings/media-manifest.json` records all expected downloads and checksums where available. `npm run media:sync` resumes downloads when network access is restored, failing on any missing file or known checksum mismatch.

See EDITING-GUIDE.md for the browser workflow and setup limitations. The public repository does not provide private draft storage.

## Verify

`npm test` checks generated routes, titles, descriptions, canonicals, media, internal links and runtime HTTP behavior. It fails if a referenced local media file is missing. `node scripts/test-editor.mjs` tests draft exclusion, publishing, sanitization, topic assignment and duplicate permalink rejection.

Reports are in `reports/`. All 1,990 content/archive routes passed output and SEO checks at the last validation. The build also includes management and 404 pages. Re-run validation after each content or media change.

## Railway

The Dockerfile builds the static site and runs server.mjs. Use a dedicated service connected to the confirmed repository and a temporary Railway domain. The default server sends noindex headers and a disallow robots.txt. Set both `SITE_LIVE=true` and `CUTOVER_VALIDATED=true` only after the cutover checklist is complete. Do not enable them on a preview.

All media must be copied before the standalone production deployment. Do not assume a build means the migration is complete. Full WordPress export/backup reconciliation, subscriptions, memberships, forms, editor round-trip fidelity, private drafts and actual Railway validation remain launch gates. See CUTOVER.md.

### Preview runtime port

Both preview domains target port 3000. Set the Railway service variable `PORT=3000`
explicitly; Railway injects PORT at runtime, overriding the Dockerfile default.
On 2026-09-26, setting this variable restored HTTPS responses from 502 to 200
without changing the server command or DNS. Startup logs now print the bound port.
The earlier stopping-container messages corresponded to replaced deployments,
not evidence that the current deployment had exited.

After building, run `node scripts/verify-preview.mjs` to check all generated routes,
asset bytes, legacy ID redirects, preview noindex headers and core endpoints.
The default target is https://preview.saktibagchi.in; override with `PREVIEW_URL`.
Results are written to `reports/preview-validation.json`. This checks deployed
technical behavior; the remaining production release gates in CUTOVER.md still apply.
