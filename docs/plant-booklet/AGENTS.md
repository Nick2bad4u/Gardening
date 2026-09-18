# Retired booklet directory

- The public field guide now uses Astro pages under `site/`. Do not regenerate
  the former all-profiles HTML document or restore its pager scripts/styles.
- Maintain plant profiles under `docs/plants/`, reviewed reports under
  `docs/daily-reports/`, and artwork under `assets/artwork/`. Follow their
  applicable instructions and rebuild with `npm run build:site`.
- Compatibility for old booklet paths and fragment bookmarks belongs in
  `site/lib/routes.mjs` and the Astro redirect pages. Preserve those public URLs
  while directing users to the matching canonical profile, guide, or tool.
- Keep collection photos distinct from licensed reference photographs, preserve
  source/creator/license attribution, and retain the latest two owned-plant
  photos plus a complete Collection link on each profile.
