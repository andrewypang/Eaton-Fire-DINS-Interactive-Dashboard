/**
 * fetch.js — Paginates the ArcGIS FeatureServer and returns all DINS features
 * as a merged GeoJSON FeatureCollection.
 *
 * Parallel fetch strategy:
 *   1. Get the total count from the server.
 *   2. Calculate all page offsets up front.
 *   3. Fire all page requests concurrently with Promise.all.
 *   4. Reassemble pages in offset order.
 */

import { ARCGIS_BASE, PAGE_SIZE } from './constants.js';

const QUERY_URL = `${ARCGIS_BASE}/query`;
const OUT_FIELDS = 'OBJECTID,GLOBALID,DAMAGE,STRUCTURETYPE';

/**
 * Fetch the server-reported total feature count.
 * @returns {Promise<number>}
 */
async function fetchServerCount() {
  const params = new URLSearchParams({
    where: '1=1',
    returnCountOnly: 'true',
    f: 'json',
  });
  const res = await fetch(`${QUERY_URL}?${params}`);
  if (!res.ok) throw new Error(`Count request failed: ${res.status}`);
  const json = await res.json();
  return json.count;
}

/**
 * Fetch one page of features.
 * @param {number} offset
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
async function fetchPage(offset) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    f: 'geojson',
    resultOffset: String(offset),
    resultRecordCount: String(PAGE_SIZE),
  });
  const res = await fetch(`${QUERY_URL}?${params}`);
  if (!res.ok) throw new Error(`Page request failed at offset ${offset}: ${res.status}`);
  return res.json();
}

/**
 * Fetch all DINS features via pagination.
 * @param {function(number, number):void} [onProgress] - called with (fetched, total)
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
export async function fetchAllDINS(onProgress) {
  const serverCount = await fetchServerCount();
  console.info(`[DINS] Server reports ${serverCount} total features.`);

  // Build all page offsets up front
  const offsets = [];
  for (let offset = 0; offset < serverCount; offset += PAGE_SIZE) {
    offsets.push(offset);
  }

  // Track progress across parallel fetches
  let fetchedSoFar = 0;

  // Fire all pages concurrently; preserve order by index
  const pages = await Promise.all(
    offsets.map(offset =>
      fetchPage(offset).then(page => {
        fetchedSoFar += (page.features || []).length;
        if (onProgress) onProgress(fetchedSoFar, serverCount);
        return page;
      })
    )
  );

  // Flatten pages in offset order
  const allFeatures = pages.flatMap(page => page.features || []);

  if (allFeatures.length !== serverCount) {
    console.warn(
      `[DINS] Fetched ${allFeatures.length} features but server reported ${serverCount}. ` +
      'Count mismatch — some records may be missing or duplicated.'
    );
  } else {
    console.info(`[DINS] Fetch complete. ${allFeatures.length} features retrieved.`);
  }

  // Log unique field values for validation
  const uniqueDamage = [...new Set(allFeatures.map(f => f.properties?.DAMAGE))].sort();
  const uniqueStructure = [...new Set(allFeatures.map(f => f.properties?.STRUCTURETYPE))].sort();
  console.info('[DINS] Unique DAMAGE values:', uniqueDamage);
  console.info('[DINS] Unique STRUCTURETYPE values:', uniqueStructure);

  return {
    type: 'FeatureCollection',
    features: allFeatures,
  };
}
