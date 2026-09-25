# Plant discovery content

Each JSON record supplies a short illustrated companion to a maintained plant
profile: habitat, four anatomy features, recognizable growth stages, flowers,
mature form, comparisons, and dated collection milestones. Some records also
include a documented name or natural-history story.

The matching Markdown profile remains the source for inventory identity,
physical labels, acquisition fields, care notes, and the existing collection
history. Discovery milestones cite those records; they are not a second care
log. Collection photographs retain their original capture or supplied-on dates.

Biological sections cite the source IDs declared within the same record.
Probable identifications, hybrid parentage limits, and distinctions between
wild species and cultivated forms remain explicit. Growth stages describe
what to observe, not a fixed watering calendar or a promised flowering date.

Anatomy graphics are distinct generated illustrations stored in
[`assets/plant-explainers`](../../../assets/plant-explainers/). Their full
generation prompts and review status are retained with the content. Four
numbered image markers correspond to the four text explanations in order.

The website validates these records and includes only their named, reviewed
image files in the public asset build. Plant identities and shared-container
relationships continue to come from the existing profile and container data.

Reference galleries use the separate
[`gallery-topics.json`](../../../assets/plants/gallery-topics.json) index for
visible-feature captions and browsing groups. Every archived image needs one
annotation, including when it appears on several profiles. Original species
scope, creators, licenses, source links, and image hashes remain in the
reference-photo manifest.
