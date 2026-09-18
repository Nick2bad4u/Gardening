# Asset and evidence instructions

## Separate the asset classes

- `measurements/` and `nursery-labels/` hold original owner evidence. Preserve
  original files, dates, units, and indexes. Make a separately named derivative
  when an authorized annotation or crop is needed; do not replace the evidence.
- `plants/` is the reusable-license species-reference archive maintained by
  `scripts/fetch-plant-images.ps1`. Preserve `photo-manifest.json`,
  `ATTRIBUTION.md`, per-plant indexes, source URLs, creator/license details, and
  SHA-256 values. A reference photograph is not proof of an owned plant's ID.
- `collection-photos/` holds the public owner-photo manifest, not a growing
  camera-original archive. Read its README before editing schema-3 records.
  Keep personal-photo rights distinct from the software license and from
  licensed reference images.
- `layouts/` illustrations and `appsheet/` artwork are presentation assets.
  Label schematic or generated illustrations accordingly; do not treat them
  as photographs, measurements, or botanical identification evidence.

## Owner-photo publication

- Use `scripts/publish-collection-photo.ps1` for an authorized publication.
  Camera originals and source mappings remain in ignored private storage.
  Never commit a token, private path, original EXIF location, or transaction
  journal to make a build or photo check pass.
- Preserve stable publication names, Gyazo IDs, direct/capture/Collection URLs,
  evidence dates, view, captions, alt text, and verified upload metadata.
  Reuse a single capture when one image appears under several plant profiles.
- Put room/table photographs in `collection_overviews`; place plant photographs
  under the actual documented profile. Retain explicit pending/historical
  records rather than substituting a similar plant or licensed reference.
- Plant profile pages show the two newest plant photographs plus separate nursery
  evidence, with the complete history available through the Collection link.
  After manifest edits, run `npm run build:site` and `npm run check:site`.
  Verify checker count changes from the new records rather than weakening them
  to hide missing provenance or duplicate captures.

## Generated icons and previews

- Edit `artwork/plant-icons.svg` for portraits and UI symbols. Generate
  `plant-icons/*.svg` and `ui-icons/*.svg` with `npm run build:artwork`; verify
  freshness with `npm run check:artwork`. These commands leave the logger alone.
  Synchronizing logger symbols/revision is a separate explicit operator command;
  follow the logger's instructions before doing so.
- Preserve self-contained SVG definitions, unique IDs, accessible descriptions,
  native 64-unit coordinates, and legibility at control sizes in both themes.
  Keep source/adaptation details in `artwork/ICON-SOURCES.md`.
- Optimized WebPs and cached collection thumbnails belong in ignored build
  output. Rebuild them from their source; do not hand-edit or commit them.
