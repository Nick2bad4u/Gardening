# Booklet collection photos

This directory is the publication-photo index for Nick's collection. The
metadata-sanitized publication images are hosted as public Gyazo captures and
grouped into one shareable Collection per current plant, plus a separate
collection-wide overview Collection. The repository retains only this README
and [`photo-manifest.json`](./photo-manifest.json); it does not accumulate a new
binary for every photo session.

Camera originals remain private. Original evidence already archived under
[`assets/measurements`](../measurements/) and
[`assets/nursery-labels`](../nursery-labels/) remains unchanged and is linked
from the manifest where relevant. These photographs are collection evidence,
not reusable-license reference photographs. Copyright Nick; all rights
reserved. The generated booklet keeps them visually and textually separate
from the licensed species-reference archive under
[`assets/plants`](../plants/).

Manifest schema 3 records the collection-wide overview Collection, a
`gyazo_collection` link for each of the 38 photographed current profile records, and the
explicit photo-pending historical record for removed Rehab-04. Each remote
placement records its stable publication name, provider, Gyazo capture ID,
direct image URL, capture page URL, evidence date, view, alt text, caption, and
the verified public upload metadata. Gyazo receives the application name
`Fenton Garden Field Guide`, a descriptive title, a public field-guide or album
link, and a description containing the caption, date, view, sharing context,
and copyright notice. Hidden camera metadata is never made public.
When one frame documents several shared-planter profiles, every placement
reuses the same Gyazo capture instead of uploading duplicate bytes.

After the September 16, 2026 photo session, the manifest contained 213 photo
placements using 160 unique Gyazo captures. That session added 32 captures for
30 tracked pots. The shared rehab cactus planter uses two overlapping,
full-resolution panels that together cover the approved whole-planter crop;
both panels are reused across its three component profiles.

Each plant profile shows only the two newest plant photographs inline. Nursery-label
evidence remains in its own section, and the complete visual timeline opens in
the plant's Gyazo Collection. The
[Collection Photos](https://nick2bad4u.github.io/Gardening/photos/) page is a searchable
index of all plant Collections and the overview Collection.

## Publish a new photo

Use [`publish-collection-photo.ps1`](../../scripts/publish-collection-photo.ps1).
It reads `GYAZO_OAUTH_ACCESS_TOKEN`; client credentials and callback settings
are not required. Preview first:

```powershell
pwsh -File scripts/publish-collection-photo.ps1 `
  -PlantSlug pleiospilos-nelii-royal-flush `
  -LiteralPath .private-photo-sources/2026-09-15-royal-flush-top.jpg `
  -CapturedOn 2026-09-15 `
  -View top `
  -AltText "Royal Flush split rock viewed from above on September 15" `
  -Caption "Top view documenting the active leaf pair" `
  -WhatIf
```

Remove `-WhatIf` after reviewing the planned Collection and metadata. Before
upload, the JPEG sanitizer keeps the primary encoded image scans byte-for-byte,
removes application/comment metadata, embedded auxiliary images, and
post-image camera trailers, and retains only recognized color data plus the
minimal orientation needed for correct display. The staged source is never
resized or recompressed. An explicitly requested crop is rendered at source
resolution as a lossless sRGB PNG, without a resize. Private WebPs have EXIF,
XMP, and unknown container chunks removed without re-encoding their image
chunks.

Gyazo itself auto-orients and normalizes uploaded JPEGs. The verifier therefore
accepts either an exact byte/hash match or a Gyazo-normalized response with the
same oriented pixel dimensions and at least 0.96 structural similarity to the
staged source. It rejects downscaling, a different image, an incomplete direct
response, a mismatched capture ID/date, or changed public metadata. Uploads are
serialized by an operation lock and transaction journal: the journal is
written before the POST, records the returned capture ID before verification,
resumes a known upload without duplicating it, and refuses to guess after an
ambiguous API outcome. The public manifest is replaced atomically only after
every required check succeeds. Private source mappings stay in the ignored
`.private-photo-sources/photo-source-map.json` file and never enter this
manifest.

Wide room, table, and setup frames belong in `collection_overviews` rather than
a plant record. Profile views use `side`, `top`, `detail`, `context`, or
`overview`. Do not substitute a similar plant or a reusable-license reference
photo for missing collection evidence.

The five unreceived Amazon-order plants were removed from the active photo manifest when the plan was abandoned on September 20, 2026. No owned photographs had been published for them; their research and presentation artwork remain in [Old plans](../../docs/old-plans/amazon-plant-order-2026-09.md).

On September 20, the three provisional component-group profiles of #6 / P30 reused all eight existing whole-planter and label captures, preserving their original captions and verified upload metadata. The manifest now has 237 placements and still 160 unique captures. These three pages share the existing P30 Gyazo Collection; they do not represent new plants, separate pots, new uploads, or individually identified seller specimens.

Two houseplants acquired on September 20 (#7 / P31 and #8 / P32) have explicit pending Collection records. Gyazo was under maintenance at integration time, so their sanitized full-frame acquisition/tag photographs are published as local [nursery evidence](../nursery-labels/README.md) until remote publication is available. No replacement upload or collection ID was invented. These records bring the manifest to 41 profile records; the 237 remote placements and 160 unique Gyazo captures are unchanged.

On September 23, the pending P35 / #9 Lithops and P36 / #10 split-rock records were updated for completed repots and new owner photographs. The manifest has 43 profile records; remote placements and unique captures remain unchanged. Gyazo still returned its maintenance page, so two plant views and one nursery-label view for each pot use the same [local evidence fallback](../nursery-labels/README.md#september-23-lithops-and-split-rock-repots). All six copies retain the full primary image with private metadata removed, and the site build generates responsive previews. The 23 original camera exports and source mappings remain private. Remote Collections and uploads are pending; empty `photos` arrays do not mean these profiles lack local evidence.

The subsequent September 23 split into probable _Lithops lesliei_ and probable _Lithops salicola_ component profiles adds two pending records, bringing the manifest to 45 profile records. Both components reuse the same full-frame local evidence from the P35 overview: the tan-brown appearance group is the probable _L. lesliei_, and the gray-green group is the probable _L. salicola_. Captions identify the target group while retaining the shared-planter context; the images do not confirm either species. The single blush pot remains #9 / P35. No original files, remote captures, upload metadata, or Collection IDs changed; remote placement and unique-capture counts remain 237 and 160.
