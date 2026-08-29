# Booklet collection photos

This directory contains metadata-sanitized, web-sized publication derivatives
of Nick's collection and nursery-label photographs for the browser plant
booklet. Byte-for-byte camera originals are retained in an ignored private
working folder rather than the public repository; their storage location and
any precise location metadata are not published. Original evidence under
[`assets/measurements`](../measurements/) and
[`assets/nursery-labels`](../nursery-labels/) remains unchanged. The
relationship between each publication image and its available repository
evidence file is recorded in [`photo-manifest.json`](./photo-manifest.json).

These photographs are collection evidence, not reusable-license reference
photographs. Copyright Nick; all rights reserved. The generated booklet keeps
them visually and textually separate from the licensed species-reference archive
under [`assets/plants`](../plants/).

The manifest currently renders 155 per-profile photo placements from 111
distinct profile publication files, plus three collection-overview files on the
booklet's photo-history page. Every physically present plant now has collection
photography. Only the removed historical _Mammillaria bombycina_ record retains
an explicit photo-pending note. Do not substitute a similar plant or a reference
photograph as collection evidence.

Profile photographs are grouped by evidence date and ordered from oldest to
newest. New session records should include a `view` value of `side`, `top`,
`detail`, `context`, or `overview`. Wide room, table, or setup views belong in
the manifest's `collection_overviews` array; plant-specific views belong under
the applicable plant record. A shared-planter frame may be placed on each plant
that is clearly visible, with plant-specific alt text and captions.

The two money-tree label images are explicitly marked as AI-assisted
presentation crops from chat-supplied photographs. They are useful for the
visible tag wording and supplier branding, but they are not represented as
untouched camera exports.

To add a Google Photos picture or a new camera session, download the original,
preserve it privately with a descriptive date/plant/view name, remove GPS and
other unnecessary personal metadata, create a web-sized local derivative here,
and record it in `photo-manifest.json`. The August 29 growth session uses names
such as `2026-08-29-mammillaria-plumosa-top-160525.webp`; the final six digits
retain the camera-time clue while the rest of the name stays human-readable. A
Google Photos share URL may be logged as a dated Photo event, but transient
Google-hosted image URLs must not be used as booklet assets.
