/**
 * table.js — Paginated record table of filtered DINS records.
 */

import { subscribe } from './state.js';
import { TABLE_PAGE_SIZE } from './constants.js';
import { panToMarker } from './map.js';

let _currentFeatures = [];
let _currentPage = 0;

/** Initialize table subscription. */
export function initTable() {
  subscribe(_onStateChange);

  document.getElementById('table-prev')?.addEventListener('click', () => {
    if (_currentPage > 0) {
      _currentPage--;
      _render();
    }
  });

  document.getElementById('table-next')?.addEventListener('click', () => {
    const maxPage = Math.ceil(_currentFeatures.length / TABLE_PAGE_SIZE) - 1;
    if (_currentPage < maxPage) {
      _currentPage++;
      _render();
    }
  });
}

function _onStateChange(features) {
  _currentFeatures = features;
  _currentPage = 0; // reset to first page on any filter change
  _render();
}

/** Public render entry point (also called from app.js on initial load). */
export function renderTable(features) {
  _currentFeatures = features;
  _currentPage = 0;
  _render();
}

function _render() {
  const total = _currentFeatures.length;
  const maxPage = Math.max(0, Math.ceil(total / TABLE_PAGE_SIZE) - 1);
  _currentPage = Math.min(_currentPage, maxPage);

  const start = _currentPage * TABLE_PAGE_SIZE;
  const end = Math.min(start + TABLE_PAGE_SIZE, total);
  const pageFeatures = _currentFeatures.slice(start, end);

  // Update count label
  const label = document.getElementById('table-count');
  if (label) {
    if (total === 0) {
      label.textContent = 'No records match the current filters.';
    } else {
      label.textContent = `Showing ${(start + 1).toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} records`;
    }
  }

  // Update pagination buttons
  const prevBtn = document.getElementById('table-prev');
  const nextBtn = document.getElementById('table-next');
  if (prevBtn) prevBtn.disabled = _currentPage === 0;
  if (nextBtn) nextBtn.disabled = _currentPage >= maxPage;

  // Build table
  const container = document.getElementById('record-table');
  if (!container) return;

  if (total === 0) {
    container.innerHTML = '<p class="no-results">No records match the current filters. Try clearing some filters.</p>';
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>OBJECTID</th>
          <th>Damage</th>
          <th>Structure Type</th>
        </tr>
      </thead>
      <tbody>`;

  for (const f of pageFeatures) {
    const props = f.properties || {};
    const oid = props.OBJECTID ?? '';
    const damage = props.DAMAGE ?? '';
    const structure = props.STRUCTURETYPE ?? '';
    html += `<tr data-oid="${oid}" class="table-row" title="Click to pan map to this location">
      <td>${oid}</td>
      <td>${damage}</td>
      <td>${structure}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  // Attach click handlers for map pan
  container.querySelectorAll('tr.table-row').forEach(row => {
    row.addEventListener('click', () => {
      const oid = Number(row.dataset.oid);
      if (!isNaN(oid)) panToMarker(oid);
    });
  });
}
