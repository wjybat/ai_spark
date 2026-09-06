import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { transformSync } from "esbuild";
import * as d3 from "d3-geo";
import * as topojson from "topojson-client";
import { topology } from "topojson-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const frontend = new URL("../../global-opportunity-radar/", import.meta.url);
const countryMapCss = readFileSync(new URL("country-map.css", frontend), "utf8");
const dom = new JSDOM('<div id="root"></div>', {runScripts:"outside-only",url:"http://localhost/"});
const window = dom.window;
const assets = Object.fromEntries(["chile","argentina","brazil","peru","colombia","usa","canada","australia","new_zealand","ireland","uae"].map(id=>[id,JSON.parse(readFileSync(new URL(`assets/maps/${id}.json`,frontend),"utf8"))]));
let root, container, data, maps;
const fetchMock = vi.fn();
const onSelectCountry = vi.fn(), onBackToRegion = vi.fn();
const response = (value) => ({ok:true,json:async()=>value});
const loadDefault = (url) => {
  if (String(url).includes("world-atlas")) return Promise.resolve(response(topology({countries:{type:"FeatureCollection",features:[]}})));
  const id = String(url).split("/").pop().replace(".json","");
  return Promise.resolve(response(assets[id]));
};
const render = async (id, region = "north_america") => {
  await act(async()=>root.render(React.createElement(window.Globe, {
    ...data, selectedRegion:id ? data.countries[id].region : region, selectedCountry:id,
    motion:false, onHoverRegion:()=>{}, onSelectRegion:()=>{}, onSelectCountry, onBack:()=>{}, onBackToRegion
  })));
};
beforeAll(()=>{
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
  vi.stubGlobal("window",window); vi.stubGlobal("document",window.document);
  Object.assign(window,{React,d3,topojson,fetch:fetchMock,ResizeObserver:class{observe(){} disconnect(){}}});
  for (const file of ["data.js","country-map-data.js","country-map-utils.js"]) window.eval(readFileSync(new URL(file,frontend),"utf8"));
  window.eval(transformSync(readFileSync(new URL("globe.jsx",frontend),"utf8"),{loader:"jsx"}).code);
  data=window.OPPORTUNITY_DATA;maps=window.COUNTRY_MAPS;
});
beforeEach(()=>{
  fetchMock.mockReset().mockImplementation(loadDefault);onSelectCountry.mockReset();onBackToRegion.mockReset();
  container=window.document.createElement("div");window.document.body.append(container);root=createRoot(container);
});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
afterAll(()=>{dom.window.close();vi.unstubAllGlobals();});

describe("country geography and city annotations",()=>{
  it("reserves vertical clearance between the country heading and map status at 16:9",()=>{
    expect(countryMapCss).toMatch(/\.globe-wrap\.is-country-focus\s*\{\s*padding:176px/);
    expect(countryMapCss).toMatch(/\.country-map-status\s*\{[^}]*top:148px/);
  });
  it("covers exactly the existing 11 countries, matching all 33 customers with points inside the country",()=>{
    expect(Object.keys(maps).sort()).toEqual(Object.keys(data.countries).sort());
    for(const [id,map] of Object.entries(maps) as [string,any][]){
      expect(map.stores.map(s=>s.customerName)).toEqual(data.countries[id].customers.map(c=>c.name));
      expect(map.stores).toHaveLength(3);
      const asset=assets[id], outline=topojson.merge(asset,asset.objects.subdivisions.geometries);
      expect(d3.geoArea(outline)).toBeLessThan(Math.PI);
      expect(topojson.mesh(asset,asset.objects.subdivisions,(a,b)=>a!==b).coordinates.length).toBeGreaterThan(0);
      for(const store of map.stores){
        expect(d3.geoContains(outline,store.coord),`${id}: ${store.name}`).toBe(true);
        expect(new URL(store.sourceUrl).protocol).toBe("https:");
      }
    }
  });
  it("fits every country and all three labels without collisions across map sizes, including shared cities",()=>{
    for (const map of Object.values(maps) as any[]){
      const camera=window.CountryMapUtils.camera(map);
      expect(camera.zoom).toBeGreaterThan(.49);
      for(const size of [350,560,660]){
        const projection=d3.geoOrthographic().rotate([camera.lon,camera.lat]).scale(size*camera.zoom).translate([size/2,size/2]);
        const labels=window.CountryMapUtils.layout(map.stores,projection,size,()=>true);
        expect(labels).toHaveLength(3);
        labels.forEach((s,i)=>{
          const a=s.label;
          expect(a.x).toBeGreaterThanOrEqual(0);expect(a.y).toBeGreaterThanOrEqual(0);
          expect(a.x+a.width).toBeLessThanOrEqual(size);expect(a.y+a.height).toBeLessThanOrEqual(size);
          for(const other of labels.slice(i+1)){
            const b=other.label;
            expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
          }
        });
      }
    }
  });
  it("renders the proper borders and stores for every country, restores the continent, and reuses cached geometry",async()=>{
    for(const id of Object.keys(maps)){
      await render(id);
      expect(container.querySelector('[data-boundary-country]')?.dataset.boundaryCountry).toBe(id);
      expect(container.querySelector('.country-admin-borders')?.getAttribute('d')?.length).toBeGreaterThan(20);
      expect(container.querySelectorAll('.store-map-label')).toHaveLength(3);
      expect(container.querySelector('.hq-arc')).toBeNull();
      expect(container.querySelector('.country-marker')).toBeNull();
      expect(container.querySelector('svg')?.outerHTML).not.toMatch(/NaN|Infinity/);
    }
    const count=fetchMock.mock.calls.length;
    await render("usa"); expect(fetchMock.mock.calls.length).toBe(count);
    await render(null);
    expect(container.querySelector('[data-zoom]')?.dataset.zoom).toBe("0.490");
    expect(container.querySelector('.store-map-label')).toBeNull();
    expect(container.querySelector('.country-admin-borders')).toBeNull();
    expect(container.querySelector('.region-quick-nav')).not.toBeNull();
  });
  it("opens the selected merchant's source with keyboard and pointer without entering the first-company analysis",async()=>{
    await render("uae");
    expect(container.querySelectorAll('.store-city-dot')).toHaveLength(2);
    const labels=container.querySelectorAll('.store-map-label');
    await act(async()=>labels[2].dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
    expect(container.querySelector('.store-detail-card')?.textContent).toContain('Union Coop');
    expect(container.querySelector('.store-detail-card a')?.getAttribute('href')).toBe(maps.uae.stores[2].sourceUrl);
    await act(async()=>labels[0].dispatchEvent(new window.MouseEvent('click',{bubbles:true})));
    expect(container.querySelector('.store-detail-card')?.textContent).toContain('Al Ghurair');
    expect(onSelectCountry).not.toHaveBeenCalled();
    await act(async()=>container.querySelector('.globe-tool').click());
    expect(onBackToRegion).toHaveBeenCalledOnce();
  });
  it("ignores a late response from the previously selected country",async()=>{
    let resolveUs;
    fetchMock.mockImplementation(url=>String(url).endsWith('/usa.json') ? new Promise(resolve=>{resolveUs=resolve;}) : loadDefault(url));
    await render("usa"); await render("ireland");
    await act(async()=>resolveUs(response(assets.usa)));
    expect(container.querySelector('[data-boundary-country]')?.dataset.boundaryCountry).toBe('ireland');
    expect(container.querySelectorAll('.store-map-label')).toHaveLength(3);
    expect(container.textContent).not.toContain('The Fresh Market');
  });
  it("keeps store markers on a failed boundary request and retries successfully",async()=>{
    fetchMock.mockImplementation(url=>String(url).endsWith('/uae.json') ? Promise.reject(new Error('offline')) : loadDefault(url));
    await render("uae");
    expect(container.querySelectorAll('.store-map-label')).toHaveLength(3);
    expect(container.querySelector('.country-map-status')?.textContent).toContain('重新加载');
    fetchMock.mockImplementation(loadDefault);
    await act(async()=>container.querySelector('.country-map-status button').click());
    expect(container.querySelector('[data-boundary-country]')?.dataset.boundaryCountry).toBe('uae');
  });
});
