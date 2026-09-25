/**
 * filters.js — Filter panel: damage category and structure type checkboxes.
 */

import { DAMAGE_ORDER } from './constants.js';
import { setFilter, resetFilters, subscribe, getState } from './state.js';

const KNOWN_DAMAGE_VALUES = new Set(DAMAGE_ORDER);

/** Build filter UI from the actual dataset. Call once after data loads. */
export function initFilters(allFeatures) {
  _buildDamageFilters(allFeatures);
  _buildStructureFilters(allFeatures);

  document.getElementById('reset-filters')?.addEventListener('click', () => {
    resetFilters();
    _syncCheckboxes();
  });

  subscribe(_updateFilterBadge);
}

function _buildDamageFilters(allFeatures) {
  // Use DAMAGE_ORDER as the canonical ordering; append any unexpected values at end
  const inData = new Set(allFeatures.map(f => f.properties?.DAMAGE).filter(Boolean));
  const ordered = [...DAMAGE_ORDER.filter(v => inData.has(v))];
  for (const v of inData) {
    if (!KNOWN_DAMAGE_VALUES.has(v)) {
      ordered.push(v);
      console.warn(`[DINS Filters] Unexpected DAMAGE value in data: "${v}"`);
    }
  }

  const container = document.getElementById('damage-filters');
  if (!container) return;
  container.innerHTML = '';

  for (const value of ordered) {
    container.appendChild(_makeCheckbox('damage', value));
  }
}

function _buildStructureFilters(allFeatures) {
  const inData = [...new Set(
    allFeatures.map(f => f.properties?.STRUCTURETYPE || 'Unknown')
  )].sort();

  const container = document.getElementById('structure-filters');
  if (!container) return;
  container.innerHTML = '';

  for (const value of inData) {
    container.appendChild(_makeCheckbox('structure', value));
  }
}

function _makeCheckbox(filterType, value) {
  const label = document.createElement('label');
  label.className = 'filter-option';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.value = value;
  cb.dataset.filterType = filterType;
  cb.addEventListener('change', e => {
    setFilter(filterType, value, e.target.checked);
    _updateFilterBadge();
  });

  label.appendChild(cb);
  label.appendChild(document.createTextNode(' ' + value));
  return label;
}

/** Uncheck all checkboxes (called after reset). */
function _syncCheckboxes() {
  document.querySelectorAll('.filter-option input[type=checkbox]').forEach(cb => {
    cb.checked = false;
  });
  _updateFilterBadge();
}

/** Update the active filter count badge. */
function _updateFilterBadge() {
  const state = getState();
  const count = state.activeDamageFilters.size + state.activeStructureFilters.size;
  const badge = document.getElementById('filter-badge');
  if (!badge) return;
  if (count === 0) {
    badge.textContent = '';
    badge.hidden = true;
  } else {
    badge.textContent = `${count} filter${count === 1 ? '' : 's'} active`;
    badge.hidden = false;
  }
}
