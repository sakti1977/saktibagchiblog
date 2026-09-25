# Website editing guide

The new site uses Astro for the public website and Pages CMS for browser-based editing. Your domain remains saktibagchi.in.

## Setup status

The local website builds successfully, GitHub write access is confirmed, and Pages CMS is connected to `sakti1977/saktibagchiblog` on `main`. Imported posts open in its visual editor with their original permanent URLs, categories, tags, search titles, HTML article text, and publication dates intact.

## One-time connection

1. GitHub repository access has been confirmed for sakti1977/saktibagchiblog.
2. The reviewed source and `.pages.yml` configuration are already on `main`.
3. Pages CMS is authorized and configured. The Blog posts collection is ready to use.
4. For private drafts, make the repository private before saving unpublished material. The draft switch hides content from the website, not from GitHub.
5. Railway automatically deploys each saved GitHub commit. Run one create/draft/publish/edit/unpublish test before relying on it for routine publishing.

## Write a post

- Open Blog posts and create an entry. Leave Keep as draft enabled.
- Enter a title, publication date, permanent web address, short summary, and topics.
- Write in the visual Article editor. Add images through its media picker.
- The permanent web address should look like /2026/09/24/my-article/. Keep existing addresses unchanged.
- Review the formatting in the editor. Full rendered-site preview of an unpublished draft is not implemented yet.
- Turn off Keep as draft and save when ready. After Railway is connected, a successful deployment makes the article visible.

## Edit pages and navigation

Website pages contains the imported pages. Creation and deletion are disabled initially to protect existing URLs. Homepage and navigation changes the main heading, introduction, website name and menu. Changes are versioned in GitHub.

## Important review details

The imported content retains WordPress HTML. Complex tables, embeds, galleries and older layouts need a visual round-trip test in Pages CMS; do not assume the visual editor preserves every WordPress block. Source mode is available where needed. Source snapshots and Git history allow recovery.

Reader comments were imported as read-only content. Email subscriptions, WordPress memberships, interactive forms and a new-comment system are not yet replaced. These are launch decisions, not working features of the preview.

## Recover an edit

Use the repository's history to restore an earlier version, then let Railway rebuild. Never change an existing permalink merely to rename a post; change the title instead.
