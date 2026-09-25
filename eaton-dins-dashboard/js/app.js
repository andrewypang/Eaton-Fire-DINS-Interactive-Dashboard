/**
 * app.js — Entry point. Wires all modules together.
 */

import { fetchAllDINS } from './fetch.js';
import { setAllFeatures, getFiltered, getAllFeatures } from './state.js';
import { initMap, renderMap, setClusterMode } from './map.js';
import { initKPIs, renderKPIs } from './kpis.js';
import { initCharts, renderCharts } from './charts.js';
import { initFilters } from './filters.js';
import { initTable, renderTable } from './table.js';

async function main() {
  // Initialize components that need DOM setup before data arrives
  initMap();
  initKPIs();
  initCharts();
  initTable();

  // Wire cluster toggle checkbox
  document.getElementById('cluster-toggle')?.addEventListener('change', e => {
    setClusterMode(e.target.checked);
  });

  // Show loading state
  const loader = document.getElementById('loading-overlay');
  const progressText = document.getElementById('loading-progress');
  if (loader) loader.hidden = false;

  try {
    const geojson = await fetchAllDINS((fetched, total) => {
      if (progressText) {
        progressText.textContent =
          `Loading DINS data… ${fetched.toLocaleString()} / ${total.toLocaleString()} records`;
      }
    });

    // Load data into state (triggers all subscribed components)
    setAllFeatures(geojson.features);

    // Build filter UI from actual data
    initFilters(getAllFeatures());

    // Update header metadata before render
    const fetchTime = document.getElementById('fetch-timestamp');
    if (fetchTime) fetchTime.textContent = new Date().toLocaleString();

    const totalCount = document.getElementById('header-total-count');
    if (totalCount) totalCount.textContent = geojson.features.length.toLocaleString();

    // Hide overlay BEFORE the expensive renderMap call so the browser can repaint
    if (loader) loader.hidden = true;

    // Trigger initial renders with the full unfiltered dataset
    const filtered = getFiltered();
    renderMap(filtered);
    renderKPIs(filtered);
    renderCharts(filtered);
    renderTable(filtered);

  } catch (err) {
    console.error('[DINS] Fatal fetch error:', err);
    if (loader) loader.hidden = true;
    const errorBox = document.getElementById('error-message');
    if (errorBox) {
      errorBox.textContent = `Failed to load DINS data: ${err.message}. Please refresh to try again.`;
      errorBox.hidden = false;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
