# Living landscape rendering study

Open `/memory-tree/experiment` under `npm run dev`. **Light** changes the illumination while the simulation continues. **Growth** selects one of the seven Memory Tree stages. **Pause wind** holds the simulation clock. The study uses generated geometry and reads no memory records. The normal Memory Tree keeps its own renderer and interactions.

## Art review

The approved painting still has the better daylight composition. Its lower branches divide unevenly and lead the eye back into several depths of foliage. In the experiment, the bark at the root flare and the snowy peak on the right hold up especially well. The outer sprays move individually, but some repeat at a similar size, and the spaces around the central forks reveal the procedural construction. The hand-painted crown has more convincing depth in those areas.

The first browser render had bare-looking boughs, conspicuous tube joints and repetitive bark highlights. The next pass used pigment from eight different sprays in the painting, grouped the highlights along each bough, and registered painted bark and roots over the generated lower trunk. A further pass removed a remnant of foliage from a cloud, reconstructed the ridge behind the tree and replaced the master's fixed tree shadow with a stage-dependent contact shadow. Desktop and phone screenshots were captured again after these changes.

Independent wind and the transitions through evening offer something the single master plate cannot do. The study supports keeping a painted landscape and using rendered growth and wind where they are visible. A wholesale replacement would sacrifice the stronger still-image composition. An artist-directed silhouette for each age and a less repetitive canopy would be the next visual tests before making that decision.

## What is rendered

| Element | Construction and movement |
| --- | --- |
| Trunk and branches | A deterministic set of curved, tapering triangle strips grows from sampled positions on parent Béziers. Art-directed scaffold limbs control the overall silhouette. Fine limbs flex in a spatial wind field. The larger trunk and root flare combine bark shading with registered texture from the painting. |
| Canopy | One instanced pass draws individual leaf blades with a midrib, two-sided color variation and an irregular edge. A second instanced pass draws painted sprays at terminal shoots. Each has its own orientation and phase. Neighboring leaves respond to the same traveling gust. |
| Mountains and meadow | A keyed terrain plate retains the original right-hand summit. The terrain formerly hidden by the trunk is reconstructed from adjacent foothills. The foreground includes 5,700 instanced blades and flower stems with greater scale near the viewer. |
| Sky and clouds | A sky shader supplies the atmosphere, evening light, moon and stars. Painted cloud formations travel at different speeds and deform slightly within their contours. Clouds move independently of the terrain. |
| Light | Day, sunset and night are interpolated on the GPU. Sky, clouds, terrain, wood and foliage have separate color responses. The direction and extent of the contact shadow change. Lighting is art-directed. The painted terrain does not support full geometric shadow casting. |
| Growth | Seed, sprout and sapling have separate small forms. Later stages change trunk girth, scaffold structure, branching and foliage density. The stable camera lets the viewer judge scale. The seed and sprout occupy very few pixels at meadow distance. Stage selection demonstrates seven forms; continuous biological growth and a persistent identity for every individual leaf are outside this study. |

All passes share a fixed orthographic view and a 1,000 × 563 world. GPU buffers change when growth changes. Per-frame wind, light and leaf deformation run in shaders. Rendering suspends offscreen and in a hidden tab. Reduced motion and the pause control draw a stable frame. If WebGL 2 is unavailable, the approved painting appears with an explanation and retry action.

## Technology choice

| Approach considered | Finding for this shot |
| --- | --- |
| Existing registered painting | Best source for brushwork, branch composition and quiet daylight reading. The current complete master preserves the approved image at rest. Its painted foliage cannot respond individually to wind. |
| SVG | Useful for overlays and sparse branches. Thousands of separately moving, textured leaves would complicate the document, compositing and material treatment. |
| Canvas 2D | Suitable for static plate preparation and small sprite counts. A continuously redrawn canopy would put more work into repeated per-instance submissions and light treatment. |
| Three.js and textured 3D meshes | Appropriate for a moving camera, true depth and light-casting geometry. A scene graph alone would not improve the leaf artwork or branch silhouette. It was assessed architecturally; no comparative Three.js benchmark was run. |
| Native WebGL 2 with shaders and instancing | Chosen for this fixed view. Several thousand leaves and grass blades share a handful of batched draws. Painted textures retain fine brush marks in the mountains, clouds and bark. This is a 2.5D environment with a fixed viewpoint. |

## Measurements

Measured in local Edge on Windows with Intel integrated graphics through ANGLE and Direct3D 11. Both runs used the flourishing stage. The test counted actual submitted scene frames for about 4.5 seconds, measured animation-frame intervals, and used disjoint GPU timer queries on every twelfth draw. GPU medians below are based on 62 completed, valid samples per viewport.

| Viewport | Drawing buffer | Mean submitted frames/s | p95 frame interval | Median GPU time/frame |
| --- | --- | ---: | ---: | ---: |
| Desktop, 1,440 × 960 | 1,440 × 811 | 165 | 6.2 ms | 2.41 ms |
| Phone emulation, 390 × 844 | 585 × 461 | 165 | 6.2 ms | 1.56 ms |

The flourishing tree contains 6,761 individual blades, 1,117 painted foliage clusters and 1,503 woody segments. The scene used 11–12 draw calls during inspection, depending on which clouds were visible. The six derived WebP assets total 432,738 bytes, in addition to the existing master. These are short, display-limited desktop GPU measurements. Physical handset thermals, battery use, sustained frame pacing and Safari remain unmeasured.

## Reproduction

Use the repository's existing Playwright browser setup. `MEMORY_TREE_PLAYWRIGHT` and `MEMORY_TREE_CHROMIUM` select the installed library and browser. `MEMORY_TREE_URL` selects the local origin (default `http://127.0.0.1:3002`). Set `MEMORY_TREE_SCREENSHOTS` to a review directory and run `node tests/living-landscape.browser.cjs --record` to collect both viewports, all three lighting states, growth-stage screenshots, frame measurements and a real canvas recording. The test also checks pause/resume, reduced motion, static fallback and document overflow.

The six derived plates can be regenerated from the existing master with `node scripts/prepare-landscape-study.cjs`. Their source and the rendering code live on the experimental branch. The page returns HTTP 404 outside development. The branch-specific Git deployment exclusion follows [Vercel's Git configuration](https://vercel.com/docs/project-configuration/git-configuration).
