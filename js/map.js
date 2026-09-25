/**
 * map.js — Leaflet map with MarkerCluster, colored by DAMAGE category.
 */

import { DAMAGE_COLORS, DAMAGE_ORDER } from './constants.js';
import { subscribe } from './state.js';

let _map = null;
let _clusterGroup = null;
let _rawMarkers = [];   // current marker set, kept for cluster mode swaps
let _clustered = true;

// Expose so table.js can pan to a marker
const _markerByObjectId = new Map();

/** Initialize the Leaflet map. Call once on DOMContentLoaded. */
export function initMap() {
  _map = L.map('map').setView([34.18, -118.13], 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(_map);

  _clusterGroup = L.markerClusterGroup({ chunkedLoading: true });
  _map.addLayer(_clusterGroup);

  _addLegend();
  subscribe(_onStateChange);
}

/** Re-render map markers for a new set of features. */
export function renderMap(features) {
  _clusterGroup.clearLayers();
  _markerByObjectId.clear();

  const markers = [];

  for (const feature of features) {
    const coords = feature.geometry?.coordinates;
    if (!coords) continue;
    const [lng, lat] = coords;
    const props = feature.properties || {};
    const damage = props.DAMAGE || 'Unknown';
    const structure = props.STRUCTURETYPE || 'Unknown';
    const objectId = props.OBJECTID;

    const color = DAMAGE_COLORS[damage] || '#607d8b';

    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      fillColor: color,
      color: '#fff',
      weight: 1,
      opacity: 0.9,
      fillOpacity: 0.85,
    });

    marker.bindPopup(
      `<strong>${damage}</strong><br>` +
      `Structure Type: ${structure}<br>` +
      `OBJECTID: ${objectId}`
    );

    if (objectId !== undefined && objectId !== null) {
      _markerByObjectId.set(objectId, marker);
    }

    markers.push(marker);
  }

  _rawMarkers = markers;

  // Bulk-insert all markers in one call — significantly faster than addLayer() in a loop
  _clusterGroup.addLayers(markers);
}

/**
 * Toggle between clustered and unclustered rendering.
 * @param {boolean} enabled - true = cluster, false = raw markers
 */
export function setClusterMode(enabled) {
  if (_clustered === enabled) return;
  _clustered = enabled;

  _map.removeLayer(_clusterGroup);
  // maxClusterRadius:0 makes every marker render individually (no grouping)
  // while still using chunkedLoading so the browser doesn't freeze.
  _clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: enabled ? 80 : 0,
  });
  _map.addLayer(_clusterGroup);

  if (_rawMarkers.length > 0) {
    _clusterGroup.addLayers(_rawMarkers);
  }

  // Force Leaflet to recalculate the map's pixel dimensions after the layer
  // swap — without this, chunkedLoading uses a stale viewport height and
  // leaves the bottom strip of the map without markers.
  _map.invalidateSize();
}

/** Pan the map to a specific OBJECTID and open its popup. */
export function panToMarker(objectId) {
  const marker = _markerByObjectId.get(objectId);
  if (!marker) return;
  const latlng = marker.getLatLng();
  _map.setView(latlng, 17, { animate: true });
  // Spiderfy/expand cluster then open popup
  _clusterGroup.zoomToShowLayer(marker, () => marker.openPopup());
}

function _onStateChange(filtered) {
  renderMap(filtered);
}

function _addLegend() {
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'map-legend');
    div.innerHTML = '<strong>Damage Category</strong><br>';
    for (const cat of DAMAGE_ORDER) {
      const color = DAMAGE_COLORS[cat] || '#607d8b';
      div.innerHTML +=
        `<span class="legend-dot" style="background:${color}"></span>${cat}<br>`;
    }
    return div;
  };
  legend.addTo(_map);
}
