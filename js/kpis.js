/**
 * kpis.js — KPI summary cards at the top of the dashboard.
 */

import { DAMAGE_COLORS, DAMAGE_ORDER } from './constants.js';
import { subscribe, getAllFeatures } from './state.js';

/** Initialize KPI subscription. */
export function initKPIs() {
  subscribe(renderKPIs);
}

/**
 * Render KPI cards into #kpi-row.
 * @param {Array} features - currently filtered features
 */
export function renderKPIs(features) {
  const allFeatures = getAllFeatures();
  const totalAll = allFeatures.length;
  const totalFiltered = features.length;

  // Count by damage category
  const counts = {};
  for (const cat of DAMAGE_ORDER) counts[cat] = 0;

  for (const f of features) {
    const dmg = f.properties?.DAMAGE;
    if (dmg === null || dmg === undefined) continue;
    if (counts[dmg] === undefined) counts[dmg] = 0;
    counts[dmg]++;
  }

  const container = document.getElementById('kpi-row');
  if (!container) return;

  const isFiltered = totalFiltered !== totalAll;

  let html = '';

  // Total card
  html += `
    <div class="kpi-card kpi-total">
      <div class="kpi-label">Total Records</div>
      <div class="kpi-count">${totalFiltered.toLocaleString()}</div>
      ${isFiltered ? `<div class="kpi-sub">of ${totalAll.toLocaleString()} total</div>` : '<div class="kpi-sub">all records</div>'}
    </div>`;

  // Per-category cards
  for (const cat of DAMAGE_ORDER) {
    const count = counts[cat] || 0;
    const pct = totalAll > 0 ? ((count / totalAll) * 100).toFixed(1) : '0.0';
    const color = DAMAGE_COLORS[cat] || '#607d8b';
    html += `
      <div class="kpi-card" style="border-top-color:${color}">
        <div class="kpi-label">${cat}</div>
        <div class="kpi-count">${count.toLocaleString()}</div>
        <div class="kpi-sub">${pct}% of total</div>
      </div>`;
  }

  container.innerHTML = html;
}
