# Horizontal Two-Light Placement Illustrations

Revised September 13, 2026 with the built-in image-generation tool. These three
images replace the [September 11 vertical-fixture proposal](../2026-09-11-dual-light/image-prompts.md)
in the placement guide, layout page, and generated booklet. Earlier assets stay
in their dated folders as history.

## Owner-Confirmed Correction

- Both approximately 26-inch long axes run **left/open room to right/glass**.
- The two lights sit **one above the other** in the bird's-eye plan, one over
  the upper wooden half and one over the lower half, extending toward near glass.
- **AW200 45% · AeroLight 240 W 38%**; both are installed. The 18-inch plant-tip
  reference and shared 13 h 15 m cycle, including 15-minute sunrise and sunset,
  remain as recorded in the [equipment note](../../../docs/equipment/aw200-and-aerolight-240w.md).
- No upper/lower model assignment is recorded, so the combined image uses two
  identical teal outlines without assigning either outline a model name.
- Preserve **24 wooden pots in four columns × six rows**, all six glass
  containers, **#2 as a square wooden box**, every label, and every H/B/I need badge.
- Keep Mylar top, white wall bottom, north window right, and open room left.
  The two-foot return reflector remains removed.
- Outlines describe orientation, not measured exposure. Plant drawings are
  illustrations, not identification or pot-dimension evidence. The
  [placement table](../../../docs/layouts/table-placement-research.md) remains the
  authoritative text for positions and qualified identities.

## Saved Assets and Exact Edit Prompts

### combined-plan.png

Input: `../2026-09-11-dual-light/combined-plan.png`.
Output: [combined-plan.png](./combined-plan.png).

```text
Use case: precise-object-edit. Edit target: the attached existing Garden Two-Light Plan infographic. Preserve the entire botanical illustration, ALL 30 pots, plant drawings, names, IDs, H/B/I badges, wooden grid of FOUR COLUMNS and SIX ROWS, round glass table, square wooden box #2, furniture and room orientation. Change ONLY lamp outlines and lamp annotations. The two lights actually hang with their long axes LEFT TO RIGHT, open-room side toward glass/window, one across the TOP HALF and one across the BOTTOM HALF in this birds-eye view. REMOVE the two existing tall vertical dashed rectangles and their AW200 existing/AeroLight incoming arrow labels completely. Replace them with TWO EQUAL, WIDE, HORIZONTAL dashed rectangles, transparent with no fill: approximate bounds x90 y137 to x1032 y520 for upper and x90 y548 to x1032 y931 for lower, in the original 1536x1024 composition. Both outlines should be the SAME neutral teal color; do not assign a model to upper or lower because that ordering is unconfirmed. Each spans all four wood columns and the nearer/left half of glass. Keep all plants and labels visible; thin dashes may pass behind labels, never over text. No vertical center divider, no solid colored boxes, no heat map. Top subtitle becomes "AW200 45% + AeroLight 240 W 38% · Both installed". Retain title "The Garden · Two-Light Plan". Footer three lines: "Two horizontal fixtures · Separate height and dimming", "Target: all wood + near half of glass", "Schematic · Spacing and light levels unmeasured". Keep north window RIGHT, Mylar TOP, white wall BOTTOM and open room/no end reflector LEFT. No incoming or future-installation text. Keep the actual plant arrangement absolutely unchanged. Wide 1536x1024 image.
```

The first edit extended the outlines across the whole glass table. The final
image applies this focused correction to stop both at near glass:

```text
Use case: precise-object-edit. Edit ONLY the two dashed teal rectangle outlines. They currently extend too far right over the entire glass table; this is incorrect. SHORTEN BOTH equally so each RIGHT vertical edge is at x=1032 in this 1536x1024 image, approximately TWO THIRDS of the way across the image. This right edge should pass through the right part of the square wooden box #2, and through the Tiny Mixed Planter #6, and near the right edge of Shared Cacti #1. BOTH Kiwi #4 and Money Tree #3 must remain entirely OUTSIDE and to the RIGHT of the outlined area. Remove every old outline segment between x1033 and the right side, including the long top/bottom lines over Kiwi/money tree. Final rectangle bounds: upper x80 y149 right1032 bottom535; lower x80 y549 right1032 bottom932. Same width, same teal dashed thin transparent stroke. No fill. Leave ALL plant drawings, labels, title, subtitle, furniture, footer, and room annotations unchanged. Do not move or resize any plant or table. Only shorten each dashed rectangle horizontally to terminate at the near-half/center of the glass table, matching the footer target all wood + near half of glass.
```

### wooden-tables.png

Input: `../2026-09-11-dual-light/wooden-tables.png`.
Output: [wooden-tables.png](./wooden-tables.png).

```text
Use case: precise-object-edit. Edit target: the existing Wooden Tables Two-Light Plan infographic. Change ONLY the bottom two equipment annotation lines, preserving all 24 plants, drawings, names, IDs, H/B/I badges, four columns/six rows order, furniture, room-orientation annotations, title, subtitle, legend, and botanical illustration style exactly. Replace "Two side-by-side fixtures · Full wooden-grid coverage intended" with "Two horizontal fixtures · Open room to glass". Replace "Separate height and dimming · Exposure unmeasured" with "AW200 45% · AeroLight 240 W 38% · Exposure unmeasured". Keep all plant positions unchanged. Do not add fixture outlines, do not rotate the wooden table or grid, no brightness map. Keep the same portrait aspect ratio, 1024x1536.
```

### glass-table.png

Input: `../2026-09-11-dual-light/glass-table.png`.
Output: [glass-table.png](./glass-table.png).

```text
Use case: precise-object-edit. Edit target: the existing Glass Table Two-Light Plan infographic. Change ONLY the red equipment callout at upper left. Replace its three lines with "Two horizontal fixtures extend from wood", "Target: near half of glass", "Actual light levels unmeasured". Keep the small dashed red leader pointing toward the near/left glass half. Preserve ALL SIX plants, drawings, pot shapes, names, numbers, H/B/I badges, component notes, botanical illustration style and room orientation. In particular #2 stays a square wooden box lower-left, #1 shared cacti upper-left, #5 tiger jaws middle-left, #6 tiny mixed planter in the center-left gap, #4 Kiwi upper-right, #3 money tree lower-right. Retain 24-inch ROUND glass table and its original depiction, not a new measurement. Keep the title, subtitle, footer and legend. No incoming labels, no solid light zones, no heatmap, no plant moves. Square image, same composition.
```
