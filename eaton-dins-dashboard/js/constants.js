/**
 * constants.js — Shared constants for the Eaton DINS Dashboard.
 * Single source of truth for damage category colors and ordering.
 */

export const DAMAGE_ORDER = [
  'No Damage',
  'Affected (1-9%)',
  'Minor (10-25%)',
  'Major (26-50%)',
  'Destroyed (>50%)',
  'Inaccessible',
];

export const DAMAGE_COLORS = {
  'No Damage':          '#4caf50',
  'Affected (1-9%)':    '#ffeb3b',
  'Minor (10-25%)':     '#ff9800',
  'Major (26-50%)':     '#f44336',
  'Destroyed (>50%)':   '#7b1fa2',
  'Inaccessible':       '#9e9e9e',
};

export const ARCGIS_BASE =
  'https://services1.arcgis.com/jUJYIo9tSA7EHvfZ/ArcGIS/rest/services/' +
  'DINS_2025_Eaton_Public_View/FeatureServer/0';

export const PAGE_SIZE = 2000;
export const TABLE_PAGE_SIZE = 50;
