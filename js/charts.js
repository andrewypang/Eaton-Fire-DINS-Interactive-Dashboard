/**
 * charts.js — Chart.js damage distribution and structure-type charts.
 */

import { DAMAGE_COLORS, DAMAGE_ORDER } from './constants.js';
import { subscribe, getAllFeatures } from './state.js';

let _damageChart = null;
let _structureChart = null;

const TOP_N = 10;

// Neutral palette for structure-type chart bars
const STRUCTURE_COLOR = '#3b82d4';

/** Initialize chart subscriptions. */
export function initCharts() {
  subscribe(renderCharts);
}

/** Render both charts from the current filtered feature set. */
export function renderCharts(features) {
  renderDamageChart(features);
  renderStructureChart(features);
}

/** Vertical bar chart: count by DAMAGE in severity order, Inaccessible last. */
function renderDamageChart(features) {
  const allFeatures = getAllFeatures();
  const totalAll = allFeatures.length;

  const counts = {};
  for (const cat of DAMAGE_ORDER) counts[cat] = 0;
  for (const f of features) {
    const dmg = f.properties?.DAMAGE;
    if (dmg === null || dmg === undefined) continue;
    if (counts[dmg] === undefined) counts[dmg] = 0;
    counts[dmg]++;
  }

  const labels = DAMAGE_ORDER;
  const data = labels.map(l => counts[l] || 0);
  const colors = labels.map(l => DAMAGE_COLORS[l] || '#607d8b');

  if (_damageChart) {
    _damageChart.destroy();
    _damageChart = null;
  }

  const ctx = document.getElementById('damage-chart')?.getContext('2d');
  if (!ctx) return;

  _damageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Count',
        data,
        backgroundColor: colors,
        borderColor: colors.map(c => c),
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const count = ctx.parsed.y;
              const pct = totalAll > 0 ? ((count / totalAll) * 100).toFixed(1) : '0.0';
              return `${count.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: 'Number of Structures' },
        },
        x: {
          ticks: {
            maxRotation: 30,
            font: { size: 11 },
          },
        },
      },
    },
  });
}

/** Horizontal bar chart: top-10 structure types + "Other". */
function renderStructureChart(features) {
  const allFeatures = getAllFeatures();
  const totalAll = allFeatures.length;

  const counts = {};
  for (const f of features) {
    const str = f.properties?.STRUCTURETYPE || 'Unknown';
    counts[str] = (counts[str] || 0) + 1;
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_N);
  const otherCount = sorted.slice(TOP_N).reduce((sum, [, v]) => sum + v, 0);

  const labels = top.map(([k]) => k);
  const data = top.map(([, v]) => v);

  if (otherCount > 0) {
    labels.push('Other');
    data.push(otherCount);
  }

  if (_structureChart) {
    _structureChart.destroy();
    _structureChart = null;
  }

  const ctx = document.getElementById('structure-chart')?.getContext('2d');
  if (!ctx) return;

  _structureChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Count',
        data,
        backgroundColor: STRUCTURE_COLOR,
        borderColor: STRUCTURE_COLOR,
        borderWidth: 1,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const count = ctx.parsed.x;
              const pct = totalAll > 0 ? ((count / totalAll) * 100).toFixed(1) : '0.0';
              return `${count.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          title: { display: true, text: 'Number of Structures' },
        },
        y: {
          ticks: { font: { size: 11 } },
        },
      },
    },
  });
}
