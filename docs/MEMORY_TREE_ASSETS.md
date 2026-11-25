# Living Memory Tree · artist delivery manifest

## Registration master

The approved source is `grand_tree_beneath_expansive_snowy_mountains.png`, 1672 × 941, sRGB. Its SHA-256 is `63c160472d6f570e276c131b3cea4257a0694d020fc49c455f9e0e0fb38a063f`. The native delivery `public/memory-tree/environment/master.webp` is lossless; its decoded RGB pixels were compared with the supplied PNG. The phone delivery `master-960.webp` is a 960 × 540 downsample from that same PNG. These two files are the entire delivered landscape art set in Milestone 1.

| Registration guide | Normalized x, y |
| --- | --- |
| Root flare | .486, .842 |
| Main fork | .488, .500 |
| Upper crown | .493, .135 |
| Left bough | .341, .527 |
| Right bough | .652, .519 |
| Right summit | .927, .466 |
| Valley horizon | .500, .791 |

These are visual registration guides measured against the supplied composition. The artist should mark the exact hinge, perch and leaf sockets on the final separated art. Coordinates start at the top left; x grows right and y grows down. Pivots use world coordinates even when the texture is trimmed. Each layer's bounds are stored as normalized x, y, width and height.

## Delivery conventions

Use a lossless, layered working file with named layers and individual PNG exports for approval. The runtime directory is `public/memory-tree/environment/`. Runtime raster files are WebP; transparent assets require straight alpha and edge colors free of matte halos. Preserve the native registration frame. A higher-resolution repaint requires separate artistic approval.

In the table, **F** means a 1672 × 941 plate at (0, 0, 1, 1). Padding extends beyond F. For example **F + 96x/24y** is 1864 × 989 at normalized origin (−96/1672, −24/941), with normalized size (1864/1672, 989/941). These are minimum delivery extents. Reverse the corresponding trim offsets if an export is packed. Transparent art may be tightly cropped for shipping after neutral assembly approval. Keep each pivot, crop rectangle and alpha matte registered through packing.

## Required layers

The rows follow compositor order. “Lift” identifies source pixels suitable for extraction. “Paint” or “repair” identifies work requiring the artist. Anchors give normalized placement references in addition to the registered bounds.

| Order and filename | Required frame and alpha | Anchor | Extraction, reconstruction and occlusion | Intended movement and lighting delivery |
| --- | --- | --- | --- | --- |
| 1. `sky.webp` | F + 96x/24y, opaque | Horizon .500,.791 | Sample visible blue. Paint clear sky behind both cloud groups, peaks and canopy. Cover every edge. | Fixed base. Supply sky color keys for dawn, noon, dusk and night. |
| 2. `clouds-distant.webp` | F + 256x/24y, alpha | .120,.610 | Lift the low, pale formations. Reconstruct behind near clouds and ridgelines. Paint matching continuation at both horizontal edges. | Very slow right-to-left drift. Supply separate highlight, midtone and shadow mattes. |
| 3. `clouds-primary.webp` | F + 384x/48y, alpha | Left bank .200,.218 and right bank .838,.255 | Lift bright towers. Repair clipped tops, hidden cloud shapes and tree-edge contamination. Preserve soft edges over clear sky. | Independent near-cloud drift. Deliver painted connecting edges or alternate offscreen continuation for long traversals; use the three cloud lighting mattes. |
| 4. `mountains-distant.webp` | F + 32x/8y, alpha | .202,.699 | Lift far blue ridges. Reconstruct behind wood and nearer mountains. Keep sky gaps transparent. | Fixed. Cool distance wash and haze/depth matte. |
| 5. `mountains-right.webp` | F + 32x/8y, alpha | .927,.466 | Lift the snowy right summit. Repair ridge under foliage and overlap the distant range below its skyline. | Fixed. Separate snow highlight and shadow-face mattes. |
| 6. `valley.webp` | F + 24x/8y, alpha | .500,.791 | Lift rolling hills. Reconstruct the part behind the root flare and nearer trees. Overlap the mountain base. | Fixed. Atmospheric-distance and afternoon light mattes. |
| 7. `vegetation.webp` | F + 24x/12y, alpha | .081,.775 | Lift the far tree line; repair occluded fragments. Keep distant foliage distinct from the hero tree. | Primarily static. Cool shadows and sunlit crown mask. |
| 8. `meadow.webp` | F + 32x/16y, alpha above horizon, opaque below | .500,.830 | Lift pasture. Paint continuous clean ground behind roots, cast shadow, flowers and near blades. | Ground remains fixed. Supply sunlit and shaded meadow masks. |
| 9. `tree-shadow.webp` | F + 48x/24y, alpha | Root .486,.842 | Lift shadow shape with artist separation of ground pigment. Repair clean pasture beneath it. Preserve root contact. | Fixed contact plus future separate directional cast mattes; soft daylight, long dawn/dusk and faint night variants. |
| 10. `tree-wood.webp` | F + 16x/16y, alpha | Root .486,.842; fork .488,.500 | Lift rooted trunk and exposed branches. Paint missing wood behind canopy. Include a depth/occlusion matte for perches and stage attachments. | Fixed trunk and roots. Isolate eligible little branch tips into local masks. Supply warm bark light and cool grooves. |
| 11. `foliage-upper.webp` | F + 24x/24y, alpha | Crown .493,.135, hinge at supporting fork | Lift golden crown. Restore hidden leaves and branch overlaps. Paint both front leaves and occluded underlap at the fork. | Localized displacement around artist-marked twig bases. Supply rims, middle greens and deep interior mattes. |
| 12. `foliage-left.webp` | F + 24x/24y, alpha | .341,.527 | Lift left tiers. Repair holes where wood and upper foliage cross. Preserve sky windows. | Separate hinge/weight mask, shared wind with left-side delay. Three leaf-light mattes. |
| 13. `foliage-right.webp` | F + 24x/24y, alpha | .652,.519 | Lift right tiers. Restore overlapping ends and transparent edges against snow and sky. | Separate hinge/weight mask and three leaf-light mattes. |
| 14. `grass.webp` | F + 32x/24y, alpha | Blade feet across y .85–1.00 | Lift selected foreground blades. Repair exposed ground and gaps behind stems. Rooted bottoms stay on the ground. | Local blade weights and regional wind delay. Sunward-edge and shadow mattes. |
| 15. `wildflowers.webp` | F + 32x/24y, alpha | Foreground clumps near .17,.94 and .88,.91 | Lift foreground flowers with stems. Paint occluded petals where separation opens a gap. Interleave grass tips with a foreground matte. | Stem-root pivots follow adjacent grass. Supply petal light and ambient night keys. |
| 16. `finch-a.webp`, `finch-b.webp` | Two transparent atlases, 768 × 384 each, 8 × 4 cells of 96 × 96 including 8 px clear guard per side | Per-cell foot pivot in atlas metadata; proposed perches at left and right bough guides | New artist work. Supply varied wingbeats, approach, landing, folded wings, rest, hop and takeoff, plus cell map and contact points. Wood/foliage occlusion masks determine when feet and bodies pass behind the branch. | Future behavioral state machine; approved daylight colors and matching shade/night keys. |
| 17. `memory-markers.json`, `memory-leaf.webp` | Stage sockets in normalized coordinates; optional custom leaf atlas 384 × 192, 4 × 2 cells of 96 × 96, 8 px clear guard, alpha | Each socket records owning branch/foliage region, twig tangent, and attachment pivot | New stage-specific attachment maps and painted leaf states. Slots reference application memory IDs at runtime. Keep all private IDs, text and photos out of published art files. Register each hit area to its own visible leaf. | Inherit the owning region’s deformation. Supply young, mature, highlight and milestone treatments and a still reduced-motion pose. |

## Masks, stage packs and lighting

- Deliver separate grayscale authoring masks named `<id>-highlights.png`, `<id>-midtones.png`, `<id>-shadows.png`, `<id>-weight.png` and `<id>-occlusion.png` as applicable in the table. Use exactly the plate dimensions and origin. Convert a grayscale mask to real alpha before registering it as the renderer's optional alpha matte. Keep wind weights independent of luminance.
- Supply full-frame neutral reference composites plus four lighting keys per material group (dawn, daylight, sunset and night). Review sunrise, morning, afternoon, golden hour and blue hour as intermediate art direction. The current static painting uses its original light.
- Supply artist-designed seed, sprout, sapling, young, growing, mature and flourishing wood, foliage, shadow and socket maps. Suggested paths are `growth/<stage>/<layer-id>.webp` and `growth/<stage>/memory-markers.json`. Use the same frame and root registration in every pack and in the isolated Tree View. Species variants need explicit art direction. Keep existing progression thresholds, IDs and slot semantics.

## Acceptance before animation

Register the opaque clean plate first, then composite all neutral layers at native size. Blink against the master and inspect a difference image at the root flare, both boughs, all sky holes, mountain crest, shadow edges and flower stems. Inspect transparent edges against light and dark mattes. Move one layer at a time through its proposed displacement envelope to expose holes, double clouds, doubled branches or clipped tips. Check the desktop master frame and centered phone crop. Submit the neutral assembly, labeled mask proofs, seam/overscan tests and any deliberately repainted differences for approval before enabling motion.
