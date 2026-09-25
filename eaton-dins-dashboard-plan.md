# Eaton DINS Dashboard — Implementation Plan

## Top-Level Overview

Build a standalone interactive dashboard for the 2025 Eaton Fire CAL FIRE DINS data as a **pure vanilla HTML/CSS/JS single-page app** with no build step, no Python server, and no npm. The app lives in a new top-level folder `eaton-dins-dashboard/`, completely separate from any existing analysis projects.

**Data source**: ArcGIS FeatureServer Layer 0 (`POSTFIRE`) fetched directly in the browser at page load, with full parallel pagination to retrieve all records (~18,000+).

**Tech stack (all via CDN, zero install):**
- [Leaflet.js 1.9.4](https://leafletjs.com/) + [Leaflet.MarkerCluster 1.5.3](https://github.com/Leaflet/Leaflet.markercluster) — interactive map with clustered points and a cluster toggle
- [Chart.js 4.4.3](https://www.chartjs.org/) — vertical bar chart and horizontal bar chart
- Vanilla JS `fetch()` — parallel ArcGIS REST pagination via `Promise.all`
- Plain CSS Grid — layout and styling, no framework

**Deployment**: Must be served over HTTP — do **not** open `index.html` directly as `file:///`. Use a local static server:
```bash
cd eaton-dins-dashboard
python3 -m http.server 8080
# then open http://localhost:8080
```
Also deployable to GitHub Pages, Netlify Drop, or any static host.

---

## Architecture

```
Browser
  └── index.html
        ├── css/styles.css
        ├── js/constants.js    ← DAMAGE_COLORS, DAMAGE_ORDER, shared constants
        ├── js/fetch.js        ← parallel ArcGIS REST pagination, returns all features
        ├── js/state.js        ← global filter state, pub/sub for updates
        ├── js/map.js          ← Leaflet map, markers, cluster toggle, popups, legend
        ├── js/charts.js       ← Chart.js damage + structure-type charts
        ├── js/kpis.js         ← KPI card rendering
        ├── js/filters.js      ← filter panel UI, multi-select controls
        ├── js/table.js        ← paginated record table, row-click pans map
        └── js/app.js          ← entry point, wires all modules together
```

All JS modules use `type="module"` ES module imports — no bundler, no transpile. All CDN scripts loaded as regular `<script>` tags before the module entry point.

> **Note**: ES modules require HTTP. Opening `index.html` as `file:///` will produce a CORS error. Always serve with a local web server.

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold and ArcGIS Fetch

**Intent**
Create the folder structure, the entry HTML file, and the data-fetch module. Fetch the complete DINS dataset from the ArcGIS FeatureServer using parallel pagination for speed.

**Expected Outcomes**
- `eaton-dins-dashboard/` folder exists with correct structure.
- `index.html` loads and shows a loading indicator with live progress counter.
- `js/fetch.js` paginates the ArcGIS REST endpoint in parallel and returns all features as a GeoJSON FeatureCollection.
- Browser console logs: total feature count, unique `DAMAGE` values, unique `STRUCTURETYPE` values.
- Feature count is validated against the FeatureServer's reported `count` endpoint.

**Todo List**
- [ ] Create `eaton-dins-dashboard/` folder with `css/` and `js/` sub-folders (no `data/` folder — data is fetched live).
- [ ] Create `index.html` with CDN script tags for Leaflet 1.9.4, Leaflet.MarkerCluster 1.5.3, Chart.js 4.4.3.
  - **Do not add `integrity=` SRI hashes to Leaflet JS** — unpkg may serve a slightly different build than the hash was computed for, causing a load failure. Omit `integrity` on Leaflet JS; the CSS integrity hash is fine.
  - Load all CDN scripts as plain `<script>` tags (not modules) before the app entry point.
  - Load `js/app.js` as `<script type="module">`.
- [ ] Create `js/constants.js` with `DAMAGE_COLORS`, `DAMAGE_ORDER`, `ARCGIS_BASE`, `PAGE_SIZE`, `TABLE_PAGE_SIZE`.
- [ ] Create `js/fetch.js` with `fetchAllDINS(onProgress)`:
  - Query `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/DINS_2025_Eaton_Public_View/FeatureServer/0/query`
  - Parameters: `where=1=1`, `outFields=OBJECTID,GLOBALID,DAMAGE,STRUCTURETYPE`, `f=geojson`, `resultOffset`, `resultRecordCount=2000`
  - First fetch the total count via `returnCountOnly=true`; compute all page offsets up front
  - Fire all page requests concurrently with `Promise.all` — do **not** use a serial `while` loop
  - Flatten pages in offset order with `flatMap`
  - Return merged GeoJSON FeatureCollection
- [ ] Warn in console if fetched count mismatches server-reported count.
- [ ] Log unique `DAMAGE` and `STRUCTURETYPE` values to console on load.
- [ ] Show loading spinner + live "Loading DINS data… X / Y records" progress during fetch.
- [ ] Show error message in UI if fetch fails.
- [ ] Create `README.md` with project description and how to open locally.

**Relevant Context**
- ArcGIS FeatureServer: `https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/DINS_2025_Eaton_Public_View/FeatureServer`
- Layer 0 max record count per page: 2000 — pagination is required; ~10 pages for ~18,000 records
- The public service supports CORS from browser origins — no proxy needed
- Known `DAMAGE` values: `No Damage`, `Affected (1-9%)`, `Minor (10-25%)`, `Major (26-50%)`, `Destroyed (>50%)`, `Inaccessible`
- Parallel fetch with `Promise.all` is ~10× faster than serial pagination for this dataset

**Status**: [x] complete

---

### Sub-Task 2 — Shared State and Filter Module

**Intent**
Create a central filter-state module that all UI components subscribe to. When filters change, all components (map, charts, KPIs, table) re-render against the filtered dataset. This is the synchronization backbone of the dashboard.

**Expected Outcomes**
- `js/state.js` exports `getState()`, `setFilter()`, `subscribe()`, `getFiltered()`, `getAllFeatures()`, `setAllFeatures()`, `resetFilters()`.
- Filtering by damage category and/or structure type correctly reduces the feature array.
- Any component calling `subscribe()` re-renders when state changes.
- "Reset Filters" clears all active filters.
- State changes do not mutate the original full dataset.

**Todo List**
- [ ] Create `js/state.js`:
  - Hold `_allFeatures` (full dataset, never mutated)
  - Hold `_activeDamageFilters` (Set of selected damage categories)
  - Hold `_activeStructureFilters` (Set of selected structure types)
  - `getFiltered()` returns features matching active filters; if no filters active, returns all
  - `subscribe(fn)` registers a callback; `setFilter()` and `resetFilters()` call all subscribers after state update
  - `getAllFeatures()` returns the full unfiltered array
  - `setAllFeatures(features)` loads the dataset and triggers initial notify
- [ ] Expose `resetFilters()` that clears both filter sets and notifies subscribers.
- [ ] After fetch completes in `app.js`, call `setAllFeatures()` then `initFilters()` then explicitly call render functions for first paint.

**Relevant Context**
- `Inaccessible` must be filterable as a distinct damage option, not grouped with damage severities
- Multi-select: selecting multiple damage categories shows the union of matching features
- Filtering is purely client-side — no re-requests to ArcGIS after initial load

**Status**: [x] complete

---

### Sub-Task 3 — Interactive Map

**Intent**
Render all DINS inspection points on a Leaflet map, colored by `DAMAGE` category, with popups on click, real-time response to filter state changes, and a toggle to switch between clustered and individual point rendering.

**Expected Outcomes**
- All fetched points appear on the map centered on the Altadena/Pasadena area (`[34.18, -118.13]`, zoom 12).
- Points are colored by `DAMAGE` using `DAMAGE_COLORS` from `js/constants.js`.
- At low zoom, points cluster via Leaflet.MarkerCluster to maintain performance.
- Clicking a point shows a popup with: Damage category, Structure type, OBJECTID.
- Map legend shows all 6 damage categories with their colors.
- When filters change, the map layer is replaced with only the matching features.
- A "Cluster markers" checkbox toggles between clustered and individual point display.
- Clicking a record-table row pans the map to that point and opens its popup.
- The map section and filter sidebar are the same height (CSS grid `align-items: stretch`).

**Todo List**
- [ ] Create `js/map.js`:
  - `initMap()` — initialize Leaflet map, add OSM tile layer, init `L.markerClusterGroup({ chunkedLoading: true })`, add legend, subscribe to state
  - `renderMap(features)` — clear cluster group, build all markers into an array, call `_clusterGroup.addLayers(markers)` in one bulk call (never `addLayer` in a loop)
  - Save markers array as `_rawMarkers` for reuse by `setClusterMode`
  - `setClusterMode(enabled)` — recreate `L.markerClusterGroup` with `maxClusterRadius: enabled ? 80 : 0`; re-add `_rawMarkers`
  - `panToMarker(objectId)` — pan map to marker and open popup via `zoomToShowLayer`
  - Subscribe to state so map re-renders on filter change
- [ ] Add map legend as a Leaflet control (`L.control({ position: 'bottomright' })`)
- [ ] Wire "Cluster markers" checkbox in `app.js` to call `setClusterMode(e.target.checked)`
- [ ] `DAMAGE_COLORS` and `DAMAGE_ORDER` imported from `js/constants.js` — never redefined in map.js

**Relevant Context**
- Leaflet CDN: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` — **no `integrity` attribute** (see Sub-Task 1)
- Leaflet.MarkerCluster CDN: `https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js`
- `addLayers([...])` is significantly faster than calling `addLayer(marker)` 18,000 times in a loop
- `maxClusterRadius: 0` disables grouping while keeping `chunkedLoading` — avoids browser freeze when unclustered
- `#map` div uses `height: 100%` — the explicit `620px` height comes from `grid-template-rows: 620px` on `.content-grid`, not from a `min-height` on the div itself
- Call `_map.invalidateSize()` at the end of `setClusterMode()` — without it, `chunkedLoading` uses the pre-swap viewport height and leaves the bottom strip of the map without markers
- `.map-section` must use `overflow: clip`, not `overflow: hidden` — `hidden` clips Leaflet's absolutely-positioned marker layers at the bottom edge; `clip` trims the tile background to the border-radius without creating a scroll container

**Status**: [x] complete

---

### Sub-Task 4 — KPI Cards

**Intent**
Render summary count cards at the top of the dashboard, one per `DAMAGE` category plus a total. Cards update when filters change.

**Expected Outcomes**
- 7 cards visible: Total, No Damage, Affected (1-9%), Minor (10-25%), Major (26-50%), Destroyed (>50%), Inaccessible.
- Each card shows: label, count of matching records in current filtered set, percentage of total dataset.
- Cards update reactively when filters change.
- Cards use the same `DAMAGE_COLORS` as the map and charts.

**Todo List**
- [ ] Create `js/kpis.js`:
  - `initKPIs()` — subscribes `renderKPIs` to state
  - `renderKPIs(features)` — computes counts by `DAMAGE` value from `DAMAGE_ORDER`
  - Renders 7 card elements into `#kpi-row`
  - Each card: colored top border from `DAMAGE_COLORS`, label, count, percentage
  - Total card shows "of N total" when filters are active
- [ ] Percentage denominator is always total dataset count (not filtered count) so context is preserved when filtered

**Relevant Context**
- Use exact CAL FIRE labels — do not abbreviate (e.g., `Affected (1-9%)` not `Affected`)
- Import `DAMAGE_COLORS` and `DAMAGE_ORDER` from `js/constants.js`

**Status**: [x] complete

---

### Sub-Task 5 — Charts

**Intent**
Render a damage distribution chart and a structure-type chart using Chart.js. Both charts appear full-width below the map grid and update with filter state.

**Expected Outcomes**
- Damage bar chart: vertical bars, counts by `DAMAGE` in `DAMAGE_ORDER` severity order, `Inaccessible` last.
- Structure-type chart: top 10 structure types by count + "Other" for the remainder, as a horizontal bar chart.
- Charts use `DAMAGE_COLORS` for damage bars; single neutral color (`#3b82d4`) for structure-type bars.
- Tooltips show both count and percentage of total.
- Charts update when filter state changes.
- Both charts are full-width sections below the sidebar+map grid.

**Todo List**
- [ ] Create `js/charts.js`:
  - `initCharts()` — subscribes `renderCharts` to state
  - `renderCharts(features)` — calls both chart renderers
  - `renderDamageChart(features)` — vertical bar chart, `DAMAGE_ORDER` ordering
  - `renderStructureChart(features)` — horizontal bar chart (`indexAxis: 'y'`), Top 10 + Other
  - Both destroy existing chart instance before recreating (Chart.js `canvas already in use` prevention)
- [ ] Tooltips show `count (X%)` format
- [ ] Null/undefined structure type values binned as `'Unknown'`

**Relevant Context**
- Chart.js CDN: `https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js`
- Destroy pattern: `if (_damageChart) { _damageChart.destroy(); _damageChart = null; }`
- `Inaccessible` must not appear between `Affected` and `Minor` — it is last in `DAMAGE_ORDER`
- Charts live in `<section class="chart-section-full">` elements outside the content grid

**Status**: [x] complete

---

### Sub-Task 6 — Filter Panel

**Intent**
Render filter controls for damage category and structure type in a sticky left sidebar. Controls synchronize with state and drive all other components.

**Expected Outcomes**
- Two multi-select filter groups: Damage Category, Structure Type.
- Selecting/deselecting a value calls `setFilter()` and triggers all component re-renders.
- "Reset Filters" button clears all filters and unchecks all checkboxes.
- Active filter count badge shown in the sidebar header (e.g., "2 filters active").
- Filter options are populated from the actual data (not hardcoded).

**Todo List**
- [ ] Create `js/filters.js`:
  - `initFilters(allFeatures)` — builds checkboxes from unique values in the dataset
  - Damage filters in `DAMAGE_ORDER` order; unexpected values appended with console warning
  - Structure type filters sorted alphabetically
  - Each checkbox `change` event calls `state.setFilter(filterType, value, checked)`
  - "Reset Filters" button calls `state.resetFilters()` then unchecks all checkboxes
- [ ] `#filter-badge` span shows active filter count; hidden when count is 0

**Relevant Context**
- Filter options generated from real data — unexpected CAL FIRE categories will appear automatically
- The sidebar uses `height: 100%; max-height: 620px` to match the grid row height; no `position: sticky`
- The sidebar and map section share the same fixed height via `grid-template-rows: 620px` on `.content-grid`

**Status**: [x] complete

---

### Sub-Task 7 — Record Table

**Intent**
Render a paginated table of filtered records below the charts. Clicking a row pans the map to that point.

**Expected Outcomes**
- Table shows: OBJECTID, Damage, Structure Type columns.
- Displays only currently filtered records, 50 rows per page.
- Prev/Next buttons with row count label ("Showing 1–50 of N records").
- Resets to page 1 on any filter change.
- Clicking a row calls `panToMarker(objectId)` which pans the map and opens the popup.
- "No records match the current filters" message shown when filtered set is empty.

**Todo List**
- [ ] Create `js/table.js`:
  - `initTable()` — subscribes `_onStateChange` to state; wires Prev/Next buttons
  - `renderTable(features)` — public entry point, resets to page 1
  - `_render()` — slices current page, builds table HTML, attaches row click handlers
  - Row click calls `panToMarker(objectId)` from `map.js`
- [ ] Import `panToMarker` from `./map.js` and `TABLE_PAGE_SIZE` from `./constants.js`

**Relevant Context**
- GeoJSON coordinates are `[lng, lat]` — `panToMarker` looks up the Leaflet marker by OBJECTID, not by coordinates
- Do not sort the table by default — preserve source ordering

**Status**: [x] complete

---

### Sub-Task 8 — Layout, Styling, and Header

**Intent**
Assemble all components into a clean, readable desktop layout with correct source attribution, live fetch timestamp, and consistent visual design.

**Expected Outcomes**
- Page title: "Eaton Fire DINS Interactive Dashboard"
- Header shows: CAL FIRE source link, total record count (populated after fetch), last-fetched timestamp.
- Final page layout (top to bottom):
  1. Header (dark bar)
  2. Disclaimer banner
  3. KPI cards row (7 cards)
  4. Two-column grid: [Filter sidebar | Map] — same height, sidebar sticky
  5. Damage Distribution chart (full width)
  6. Top 10 Structure Types chart (full width)
  7. Record table (full width)
  8. Footer
- Loading spinner covers full viewport during fetch; dismisses before `renderMap` is called.
- Responsive: single-column stack below 1024px.

**Todo List**
- [ ] Create `css/styles.css`:
  - CSS Grid: `grid-template-columns: 260px 1fr`, `grid-template-areas: "sidebar map"`, `grid-template-rows: 620px`, `align-items: stretch`
  - `.map-section` gets `grid-area: map` and `overflow: clip` (not `overflow: hidden` — see Critical Notes)
  - `.filter-sidebar` gets `grid-area: sidebar`, `height: 100%`, `max-height: 620px`, `overflow-y: auto`; no `position: sticky`
  - `#map`: `height: 100%` only — height is determined by the grid row, not by `min-height` on the element
  - `#loading-overlay`: `display: flex` **plus** `#loading-overlay[hidden] { display: none !important }` — the explicit `display` rule overrides the browser's built-in `[hidden]` style, so the `[hidden]` rule must be added explicitly
  - `.chart-section-full`: unified style for both chart sections
  - `@media (max-width: 1024px)`: collapse grid to single column, `grid-template-areas: "sidebar" "map"`
- [ ] In `app.js`: hide loading overlay **before** calling `renderMap()` — `renderMap` blocks the JS thread while adding 18k markers; hiding first allows the browser to repaint and dismiss the spinner visually
- [ ] Add disclaimer: "DINS records represent CAL FIRE inspection observations. This dashboard does not imply causation."
- [ ] "Cluster markers" checkbox in map section header (`<label class="cluster-toggle-label">`)

**Relevant Context**
- `grid-template-rows: 620px` is the source of truth for the shared height — both `#map { height: 100% }` and `.filter-sidebar { max-height: 620px }` resolve against it
- The `[hidden]` attribute trick: any element with both `display: X` in CSS and `hidden` in HTML needs an explicit `[hidden] { display: none !important }` rule or the CSS `display` wins
- Do not put `integrity=` SRI hash on the Leaflet JS `<script>` tag — it will fail if unpkg serves a slightly different build

**Status**: [x] complete

---

### Sub-Task 9 — Validation, Testing, and README

**Intent**
Verify all MVP acceptance criteria pass. Document how to open and use the dashboard.

**Expected Outcomes**
- All damage categories render correctly, including `Inaccessible` last in all orderings.
- Structure type and damage filters work together (intersection logic).
- Map, charts, KPIs, and table remain synchronized under all filter combinations.
- "No results" state handled gracefully when a filter combination returns zero records.
- `README.md` contains: project description, how to open locally, data source, folder structure, tech stack.

**Todo List**
- [ ] Test all 6 `DAMAGE` filter values individually and in combinations
- [ ] Test `Inaccessible` appears last in KPI cards, chart, filter panel, and map legend
- [ ] Test structure-type filter with a type that has very few records
- [ ] Test no-results state: apply a filter combination that returns 0 features
- [ ] Verify KPI card counts match table row counts for the same filter state
- [ ] Verify chart totals match KPI totals for the same filter state
- [ ] Confirm loading overlay dismisses cleanly after data loads
- [ ] Confirm "Cluster markers" toggle shows individual points when unchecked
- [ ] Complete `README.md`

**Status**: [x] complete

---

## Project File Structure

```
eaton-dins-dashboard/
├── index.html          ← Entry point; serve via HTTP (not file://)
├── README.md
├── css/
│   └── styles.css      ← All layout, grid, card, map, chart, table styles
└── js/
    ├── constants.js    ← DAMAGE_COLORS, DAMAGE_ORDER, ARCGIS_BASE, page sizes
    ├── fetch.js        ← Parallel ArcGIS REST pagination (Promise.all)
    ├── state.js        ← Filter state + pub/sub
    ├── map.js          ← Leaflet map, MarkerCluster, cluster toggle, legend
    ├── charts.js       ← Chart.js damage + structure charts
    ├── kpis.js         ← KPI summary cards
    ├── filters.js      ← Filter panel UI (checkboxes, reset, badge)
    ├── table.js        ← Paginated record table, row-click map pan
    └── app.js          ← Entry point, wires all modules together
```

No `data/` folder — data is fetched live from ArcGIS at page load.  
No `node_modules`, no `package.json`, no build step.

---

## Page Layout (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER — title | source link | total records | timestamp   │
├─────────────────────────────────────────────────────────────┤
│  DISCLAIMER banner                                          │
├─────────────────────────────────────────────────────────────┤
│  KPI CARDS — Total | No Damage | Affected | Minor | Major   │
│              | Destroyed | Inaccessible                     │
├───────────────────┬─────────────────────────────────────────┤
│  FILTER SIDEBAR   │  MAP (Leaflet + MarkerCluster)          │
│  (sticky, 260px)  │  [Cluster markers ☑] toggle            │
│  • Damage filters │  • Circle markers colored by DAMAGE     │
│  • Structure type │  • Legend (bottom-right)                │
│  • Reset button   │  • Click marker → popup                 │
│                   │  • Same height as sidebar               │
├───────────────────┴─────────────────────────────────────────┤
│  DAMAGE DISTRIBUTION CHART (full width vertical bar)        │
├─────────────────────────────────────────────────────────────┤
│  TOP 10 STRUCTURE TYPES CHART (full width horizontal bar)   │
├─────────────────────────────────────────────────────────────┤
│  RECORD TABLE — paginated 50 rows, click row → pan map      │
├─────────────────────────────────────────────────────────────┤
│  FOOTER                                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

| Decision | Choice | Reason |
|---|---|---|
| Stack | Vanilla HTML/JS/CSS | No build step; deployable anywhere |
| JS modules | `type="module"` ES imports | Clean dependency graph; no bundler needed |
| Map | Leaflet 1.9.4 + MarkerCluster 1.5.3 via CDN | Handles 18k points; no API key |
| Charts | Chart.js 4.4.3 via CDN | Lightweight; good bar chart support |
| Data fetch | Parallel `Promise.all` pagination | ~10× faster than serial loop for ~10 pages |
| State | Simple pub/sub module | Sufficient for this scope; no Redux needed |
| Cluster toggle | `maxClusterRadius: 0` vs `80` | Reuses chunkedLoading path; no browser freeze |
| Deployment | Any static HTTP server | ES modules require HTTP, not `file://` |

---

## Critical Implementation Notes

- **Do not open as `file:///`**: ES `type="module"` scripts are blocked by browsers on the `file://` protocol. Always serve with `python3 -m http.server` or equivalent.

- **No SRI hash on Leaflet JS**: The `<script>` tag for `leaflet.js` must not include an `integrity=` attribute. unpkg may serve a build whose hash differs from what was pre-computed, causing the browser to block the script entirely (`L is not defined`). The Leaflet CSS `integrity` attribute is fine.

- **`[hidden]` override**: Any element that has an explicit `display:` rule in CSS (e.g., `display: flex`) will not be hidden by the HTML `hidden` attribute alone — the CSS specificity wins. Add `#element-id[hidden] { display: none !important }` to make `hidden` work correctly.

- **Hide overlay before `renderMap`**: Set `loader.hidden = true` before calling `renderMap()`. Adding 18k markers blocks the JS thread; hiding first gives the browser a repaint opportunity so the spinner visually dismisses before the blocking work begins.

- **Parallel fetch with `Promise.all`**: Use the total count from `returnCountOnly` to compute all page offsets up front, then fire all requests concurrently. Do not use a serial `while` loop — it is ~10× slower.

- **Bulk marker insertion**: Call `_clusterGroup.addLayers(markers)` with a full array, never `addLayer(marker)` inside a loop. The bulk path in MarkerCluster skips redundant internal work on each individual add.

- **`maxClusterRadius: 0` for unclustered mode**: Keeps `L.markerClusterGroup` in both modes (clustered and unclustered). Setting radius to 0 means no two markers are ever grouped, but `chunkedLoading: true` still applies so the browser renders them in chunks rather than freezing.

- **Fixed grid row height for the map**: Set `grid-template-rows: 620px` on `.content-grid`. This gives both columns a definite height. `#map` then uses `height: 100%` (no `min-height` needed) to fill it exactly. Leaflet initialises at 620px, `chunkedLoading` calculates the correct full viewport, and all markers render to the bottom edge. Do not use `min-height` on `#map` as the sole height source — it does not establish a definite height for `height: 100%` resolution in CSS.

- **`overflow: clip` on `.map-section`**: Use `overflow: clip`, not `overflow: hidden`. Both clip the tile background to the border-radius, but `overflow: hidden` creates a scroll container that clips Leaflet's absolutely-positioned marker layers at the bottom edge when unclustered. `overflow: clip` does not create a scroll container.

- **`_map.invalidateSize()` after cluster mode swap**: Call this at the end of `setClusterMode()`. After swapping `L.markerClusterGroup`, `chunkedLoading` recalculates the visible viewport using Leaflet's internally cached size. Without `invalidateSize()`, the stale cached height causes the bottom strip of markers to be skipped.

- **Shared color constant**: `DAMAGE_COLORS` must be defined once in `js/constants.js` and imported by `map.js`, `charts.js`, and `kpis.js`. Never define colors in multiple places.

- **Chart.js destroy/recreate**: Call `chart.destroy()` and set the instance to `null` before recreating a chart on the same canvas, or Chart.js throws a "Canvas is already in use" error.

- **Do not mutate `allFeatures`**: The state module holds a single source of truth. `getFiltered()` always produces a new array from `_allFeatures` — never modifies it in place.
