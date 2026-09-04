// Natural Earth ADM1, country extracts by BenPortner/geojson-atlas (CC0).
// Rebuild: node scripts/build-country-maps.mjs; downloads are cached outside shipped assets.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { quantize, mesh } from 'topojson-client';
import { geoArea } from 'd3-geo';

const revision = '644874ada665a0f2c0c81a0d47adacea97365c30';
const countries = { chile:'CL', argentina:'AR', brazil:'BR', peru:'PE', colombia:'CO', usa:'US', canada:'CA', australia:'AU', new_zealand:'NZ', ireland:'IE', uae:'AE' };
const cache = new URL('../.cache/maps/', import.meta.url);
const output = new URL('../../global-opportunity-radar/assets/maps/', import.meta.url);
await mkdir(cache, {recursive:true});
await mkdir(output, {recursive:true});
for (const [id, code] of Object.entries(countries)) {
  let collection;
  try { collection = JSON.parse(await readFile(new URL(`${code}.geojson`, cache), 'utf8')); }
  catch {
    const path = `geojson/natural_earth/countries/10m/${code}.geojson`;
    try {
      const response = await fetch(`https://raw.githubusercontent.com/BenPortner/geojson-atlas/${revision}/${path}`, {signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error(`${code}: ${response.status}`);
      collection = await response.json();
    } catch {
      // GitHub's content endpoint also works where the raw host is unreliable.
      const response = await fetch(`https://api.github.com/repos/BenPortner/geojson-atlas/contents/${path}?ref=${revision}`, {signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error(`${code}: ${response.status}`);
      const file = await response.json();
      collection = JSON.parse(Buffer.from(file.content,'base64').toString('utf8'));
    }
    if (!collection.features?.length) throw new Error(`${code}: invalid country data`);
    await writeFile(new URL(`${code}.geojson`,cache), JSON.stringify(collection));
  }
  for (const feature of collection.features) {
    const p = feature.properties;
    feature.id = p.adm1_code;
    feature.properties = { name:p.name, nameZh:p.name_zh || p.name, code:p.iso_3166_2 };
    // D3 uses clockwise exterior rings for geographic polygons smaller than a hemisphere.
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const rings of polygons) {
      if (geoArea({type:'Polygon',coordinates:[rings[0]]}) > 2*Math.PI) rings.forEach(ring => ring.reverse());
    }
  }
  const full = presimplify(topology({subdivisions:collection}));
  // Shared arcs are simplified together: no seams or doubled province boundaries.
  const simplified = quantize(simplify(full, quantile(full, 0.7)), 100000);
  simplified.source = { name:'Natural Earth ADM1 1:10m', revision, license:'Public domain / CC0' };
  if (!mesh(simplified, simplified.objects.subdivisions, (a,b)=>a!==b).coordinates.length) throw new Error(`${id}: missing internal borders`);
  await writeFile(new URL(`${id}.json`, output), JSON.stringify(simplified));
  console.log(`${id}: ${collection.features.length} subdivisions, ${Math.round(JSON.stringify(simplified).length/1024)} KB`);
}
