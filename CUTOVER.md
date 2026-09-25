# Domain cutover runbook — NOT READY

Keep WordPress live. No DNS changes have been made by this migration.

## Release gates

1. Reconcile all published posts/pages with the REST totals and WordPress sitemap. Investigate any count mismatch; obtain a WXR export to close public-API gaps.
2. All original content URLs return 200, canonicals remain exact, and old query URLs redirect to the matching page. Review taxonomy, author/date archives and old attachment/pagination URLs. Resolve internal-link failures.
3. Download and verify referenced media; decide how to handle unavailable historical files. Test PDF, audio/video, third-party embeds and multilingual text.
4. Preserve titles, descriptions, publication/modification dates, meaningful image alt text, social cards and feeds. Review existing robots directives and structured data before launch.
5. Test desktop/mobile layouts, keyboard navigation, archive search, performance and representative long articles. Validate forms, coaching/contact links, subscriptions, newsletter delivery, analytics and comments strategy end to end.
6. Deploy a separate Railway preview with noindex. Verify actual production-container responses and HTTPS using its Railway domain, not only a local build. CI and Railway healthcheck must pass.
7. Obtain final content approval and resolve remaining feature decisions. Keep full WordPress database, uploads, WXR and DNS backups. Identify the DNS provider and record current A/AAAA/CNAME/MX/TXT records and TTLs.

## Cutover, only after gates pass

- Briefly freeze publishing or agree on a final delta window. Re-export/reconcile all changes since this snapshot.
- Add the custom domain in Railway and record its exact requested DNS targets. Do not guess addresses.
- Lower TTL in advance if practical. Preserve email-related MX/TXT records.
- Make the approved DNS change, confirm TLS issuance, then enable SITE_LIVE=true for the production service and verify robots/indexing headers immediately.
- Test the apex and www hostnames, redirects, sample old URLs, media, feeds, sitemap, and forms from external networks. Submit sitemap in the existing Search Console property.
- Keep WordPress hosting and its data for rollback. Monitor 404/5xx errors, resource usage, search coverage and subscriptions for at least 7 days.

## Rollback

Restore the recorded DNS values and keep WordPress serving its original content. Confirm DNS and TLS externally. Return the Railway service to noindex if it remains reachable as a preview. Do not delete either site's data while diagnosing a failed cutover.
