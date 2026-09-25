# Eaton Fire DINS Interactive Dashboard

An interactive single-page dashboard for the **2025 Eaton Fire CAL FIRE DINS** (Damage Inspection) dataset.

## What it does

- **Fetches live data** from the public ArcGIS FeatureServer at page load (no download or setup needed).
- **18 000+ inspection points** plotted on a Leaflet map, clustered for performance, colored by damage category.
- **Filter panel** — multi-select by damage category and/or structure type; all components update in sync.
- **KPI cards** — total and per-category counts with percentages.
- **Damage distribution chart** and **structure-type chart** (Chart.js).
- **Paginated record table** (50 rows/page); click a row to pan the map to that point.

## How to open locally

No build step, no server, no npm.

**Option A — any static web server (recommended)**

```bash
cd eaton-dins-dashboard
python3 -m http.server 8080
# then open http://localhost:8080 in your browser
```

Or with Node:
```bash
npx serve .
```

**Option B — directly as a file**

Open `index.html` in a browser that allows ES module `type="module"` scripts from `file://` (Chrome works; Firefox may require a flag).

> Note: Fetching from ArcGIS requires network access. CORS is supported natively by this public ArcGIS service.

## Data Source

- **Service**: [CAL FIRE DINS 2025 — Eaton Public View](https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/DINS_2025_Eaton_Public_View/FeatureServer)
- **Layer 0** (`POSTFIRE`): inspection points with damage category and structure type.
- Data is fetched fresh on every page load via paginated ArcGIS REST API calls.

## Folder Structure

```
eaton-dins-dashboard/
├── index.html          ← Entry point; load this in a browser
├── README.md
├── css/
│   └── styles.css      ← All layout and visual styles
└── js/
    ├── constants.js    ← DAMAGE_COLORS, DAMAGE_ORDER, shared constants
    ├── fetch.js        ← ArcGIS REST pagination (fetchAllDINS)
    ├── state.js        ← Filter state + pub/sub (getFiltered, setFilter, subscribe)
    ├── map.js          ← Leaflet map, MarkerCluster, legend
    ├── charts.js       ← Chart.js damage + structure charts
    ├── kpis.js         ← KPI summary cards
    ├── filters.js      ← Filter panel UI
    ├── table.js        ← Paginated record table
    └── app.js          ← Entry point, wires all modules together
```

## Tech Stack

| Component | Library | CDN |
|---|---|---|
| Map | Leaflet 1.9.4 + MarkerCluster 1.5.3 | unpkg |
| Charts | Chart.js 4.4.3 | jsDelivr |
| Data fetch | Native `fetch()` | — |
| Framework | None — vanilla HTML/CSS/JS | — |

## Disclaimer

DINS records represent CAL FIRE inspection observations. This dashboard does not imply causation.
Not an official CAL FIRE product.
