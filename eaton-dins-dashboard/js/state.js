/**
 * state.js — Central filter state with pub/sub.
 * All components subscribe here; filtering is always client-side.
 */

let _allFeatures = [];
let _activeDamageFilters = new Set();
let _activeStructureFilters = new Set();
const _subscribers = [];

/** Load the full dataset. Call once after fetch completes. */
export function setAllFeatures(features) {
  _allFeatures = features;
  _notify();
}

/** Return the currently filtered feature array (never mutates _allFeatures). */
export function getFiltered() {
  const noDamageFilter = _activeDamageFilters.size === 0;
  const noStructureFilter = _activeStructureFilters.size === 0;

  if (noDamageFilter && noStructureFilter) return _allFeatures;

  return _allFeatures.filter(f => {
    const dmg = f.properties?.DAMAGE ?? null;
    const str = f.properties?.STRUCTURETYPE ?? null;
    const damageOk = noDamageFilter || _activeDamageFilters.has(dmg);
    const structureOk = noStructureFilter || _activeStructureFilters.has(str);
    return damageOk && structureOk;
  });
}

/** Return the full unfiltered dataset. */
export function getAllFeatures() {
  return _allFeatures;
}

/** Return the current filter state (read-only snapshot). */
export function getState() {
  return {
    activeDamageFilters: new Set(_activeDamageFilters),
    activeStructureFilters: new Set(_activeStructureFilters),
  };
}

/**
 * Toggle a single value in a filter set.
 * @param {'damage'|'structure'} filterType
 * @param {string} value
 * @param {boolean} active
 */
export function setFilter(filterType, value, active) {
  const set = filterType === 'damage' ? _activeDamageFilters : _activeStructureFilters;
  if (active) {
    set.add(value);
  } else {
    set.delete(value);
  }
  _notify();
}

/** Clear all active filters and notify subscribers. */
export function resetFilters() {
  _activeDamageFilters.clear();
  _activeStructureFilters.clear();
  _notify();
}

/**
 * Register a callback to run whenever state changes.
 * @param {function():void} fn
 */
export function subscribe(fn) {
  _subscribers.push(fn);
}

function _notify() {
  const filtered = getFiltered();
  for (const fn of _subscribers) {
    fn(filtered);
  }
}
