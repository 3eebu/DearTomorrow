# Journey Letters

Open `/journey-letters` from the Letters page or the homepage creation menu. Enter two cities, their local departure and arrival times, and an optional dedication. Review the itinerary, then prepare six envelopes in the shared Letter Studio. The Opening view shows the sealed letters that are waiting, ready, or already opened.

## Scheduling and locations

The default envelope times are one hour before departure, departure, 20%, 50%, and 85% of scheduled flight time, and arrival. The editor lets the author rename each checkpoint and set a custom local time. Edits to a flight move its default times and keep explicit custom instants. Opening times must stay in sequence. A daylight-saving gap fails validation, and a repeated hour lets the author pick its first or second occurrence.

The map uses city coordinates and time zones from 24 GeoNames records. Coastlines come from public-domain Natural Earth land data. Both datasets are bundled with the application. For other cities, enter a name and time zone, plus coordinates if known. Journeys with missing or coincident coordinates use a labeled schematic. The airplane follows elapsed scheduled time along an illustrated curve, and the six map stamps represent the envelopes. [GeoNames city export and attribution terms](https://www.geonames.org/export/) · [Natural Earth 1:110m land](https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/)

## Saving and recovery

- Journey Letters has a dedicated IndexedDB database with a lightweight itinerary catalog and one document per journey. A document contains the stable IDs and data for all six checkpoints. Each write updates the catalog and document in the same transaction, with a per-journey revision check for stale tabs. A failed save keeps the saved version and lets the author retry or export an unsaved letter from Studio.
- Export packages the six checkpoints, writing, stationery, and any supported attachments as a version 1 Journey Letters JSON backup. Import validates the entire journey and creates independently keyed records. Duplication copies the itinerary and writing into fresh drafts. Deletion requires confirmation and removes only the selected journey and its enclosed letters.
- The library holds 30 journeys per browser profile, with a 48 MB limit per journey. Each letter follows the shared Letter Studio limits. Personal data stays in the current browser. A backup contains readable private data, and opening times follow the device clock. Automatic delivery and secure time locks are unavailable. An already-loaded page can work offline, with its map and fonts subject to the browser cache.

## Verification

Run `node --test tests/*.test.cjs` for model coverage, including date boundaries, daylight-saving transitions, invalid inputs, schedules, routes, letter states, and backups.

Run `node tests/journey-letters.browser.cjs` against the local preview. Optional variables are `JOURNEY_URL`, `JOURNEY_PLAYWRIGHT`, `JOURNEY_CHROMIUM`, and `JOURNEY_SHOTS`. The script uses fictional data and isolated browser profiles.

The production checks passed in Edge at 1440, 820, 390, and 320 pixels. They covered keyboard and touch opening, reduced motion, route replay, drafts after refresh, opened letters restored from backups, multiple journeys, a simulated quota error, stale tabs, and Letter Box isolation. A manually entered journey saved with the network disabled after the page loaded. Review captures cover Lahore–London, London–Paris, and a Tokyo–San Francisco crossing. All seven site routes responded, the existing Letters and Memory Tree browser suites passed, and lint, type checking, the build, and all 72 model and regression tests passed.
