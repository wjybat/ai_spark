const { useEffect, useMemo, useRef, useState } = React;

// DMALL 总部（北京）坐标，用于绘制出海航线
const HQ_COORD = [116.4, 39.9];
const DEFAULT_ROTATION = { lon: 78, lat: -14 };

function GlobeIcon({ name, size = 18 }) {
  const paths = {
    rotate: <><path d="M4 8a8 8 0 0 1 14-2"></path><path d="M18 2v4h-4"></path><path d="M20 16a8 8 0 0 1-14 2"></path><path d="M6 22v-4h4"></path></>,
    back: <><path d="m15 18-6-6 6-6"></path></>,
    scan: <><path d="M4 7V4h3"></path><path d="M17 4h3v3"></path><path d="M20 17v3h-3"></path><path d="M7 20H4v-3"></path><circle cx="12" cy="12" r="3"></circle></>
  };
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Globe({
  regions,
  countries,
  continentFeatures,
  selectedRegion,
  selectedCountry,
  hoverRegion,
  onHoverRegion,
  onSelectRegion,
  onSelectCountry,
  onBack,
  onBackToRegion,
  motion
}) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const animRef = useRef(null);
  const rotationRef = useRef(DEFAULT_ROTATION);
  const zoomRef = useRef(0.405);
  const boundaryCache = useRef({});
  const [size, setSize] = useState(560);
  const [worldFeatures, setWorldFeatures] = useState([]);
  const [rotation, setRotation] = useState(DEFAULT_ROTATION);
  const [zoom, setZoom] = useState(0.405);
  const [boundaries, setBoundaries] = useState(null);
  const [boundaryStatus, setBoundaryStatus] = useState("idle");
  const [boundaryRetry, setBoundaryRetry] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const countryMap = window.COUNTRY_MAPS?.[selectedCountry];
  const [hoverCountry, setHoverCountry] = useState(null);
  const [loadState, setLoadState] = useState("loading");

  rotationRef.current = rotation;
  zoomRef.current = zoom;

  useEffect(() => {
    let alive = true;
    setSelectedStoreId(null);
    setBoundaries(null);
    if (!countryMap) { setBoundaryStatus("idle"); return undefined; }
    if (boundaryCache.current[selectedCountry]) {
      setBoundaries(boundaryCache.current[selectedCountry]); setBoundaryStatus("ready"); return undefined;
    }
    setBoundaryStatus("loading");
    fetch(countryMap.boundaryUrl)
      .then(response => { if (!response.ok) throw new Error("boundary data unavailable"); return response.json(); })
      .then(topology => {
        const object = topology.objects.subdivisions;
        const result = {
          countryId:selectedCountry,
          outline:topojson.merge(topology, object.geometries),
          borders:topojson.mesh(topology, object, (a,b) => a!==b)
        };
        boundaryCache.current[selectedCountry] = result;
        if (alive) {setBoundaries(result);setBoundaryStatus("ready");}
      })
      .catch(() => {if (alive) setBoundaryStatus("error");});
    return () => {alive=false;};
  }, [selectedCountry, boundaryRetry]);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return undefined;
    const sync = () => setSize(Math.max(350, Math.min(660, node.clientWidth, node.clientHeight)));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json")
      .then((response) => {
        if (!response.ok) throw new Error("world data unavailable");
        return response.json();
      })
      .then((world) => {
        if (!alive || !window.topojson) return;
        const collection = window.topojson.feature(world, world.objects.countries);
        const geometries = world.objects.countries.geometries;
        collection.features.forEach((feature, index) => {
          feature.id = feature.id ?? geometries[index]?.id ?? index;
        });
        setWorldFeatures(collection.features);
        setLoadState("ready");
      })
      .catch(() => {
        if (alive) setLoadState("fallback");
      });
    return () => { alive = false; };
  }, []);

  // Animate rotation and scale together through global → continent → country.
  useEffect(() => {
    const target = countryMap ? window.CountryMapUtils.camera(countryMap) : selectedRegion
      ? (() => { const center = regions[selectedRegion].center; return { lon: -center[0], lat: -center[1], zoom:0.49 }; })()
      : {...DEFAULT_ROTATION,zoom:0.405};
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (!motion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setRotation(target);
      setZoom(target.zoom);
      return undefined;
    }
    const from = { ...rotationRef.current };
    const fromZoom = zoomRef.current;
    const dLon = (((target.lon - from.lon) % 360 + 540) % 360) - 180;
    const dLat = target.lat - from.lat;
    const start = performance.now();
    const duration = 900;
    let lastPush = 0;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (now - lastPush > 32 || progress === 1) {
        lastPush = now;
        const next = { lon: from.lon + dLon * eased, lat: from.lat + dLat * eased };
        rotationRef.current = next;
        setRotation(next);
        setZoom(fromZoom + (target.zoom-fromZoom)*eased);
      }
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [selectedRegion, selectedCountry, motion]);

  // 待机自转：全球视图下缓慢旋转，拖拽或悬停区域时暂停
  useEffect(() => {
    if (!motion || selectedRegion || hoverRegion) return undefined;
    let raf;
    let last = performance.now();
    let acc = 0;
    const tick = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!dragRef.current) {
        acc += dt;
        if (acc >= 40) {
          const next = { ...rotationRef.current, lon: rotationRef.current.lon + acc * 0.0026 };
          rotationRef.current = next;
          setRotation(next);
          acc = 0;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motion, selectedRegion, hoverRegion]);

  const model = useMemo(() => {
    const scale = size * zoom;
    const projection = d3.geoOrthographic()
      .translate([size / 2, size / 2])
      .scale(scale)
      .rotate([rotation.lon, rotation.lat, 0])
      .clipAngle(90)
      .precision(0.35);
    return {
      projection,
      path: d3.geoPath(projection),
      graticule: d3.geoGraticule10()
    };
  }, [rotation, zoom, size]);

  const targetCountries = useMemo(() => {
    if (!selectedRegion) return [];
    return regions[selectedRegion].countryIds.map((id) => countries[id]);
  }, [countries, regions, selectedRegion]);

  const worldByIso = useMemo(() => {
    const lookup = {};
    worldFeatures.forEach((feature) => {
      lookup[String(feature.id).padStart(3, "0")] = feature;
    });
    return lookup;
  }, [worldFeatures]);

  const countryByIso = useMemo(() => {
    const lookup = {};
    Object.values(countries).forEach((country) => { lookup[country.iso] = country; });
    return lookup;
  }, [countries]);

  const coveredWorldFeatures = useMemo(() => worldFeatures.filter((feature) => countryByIso[String(feature.id).padStart(3, "0")]), [worldFeatures, countryByIso]);

  const visible = (coord) => {
    const center = [-rotation.lon, -rotation.lat];
    return d3.geoDistance(center, coord) < Math.PI / 2;
  };

  const startDrag = (event) => {
    // 关键：不要在 pointerdown 时立刻 setPointerCapture。
    // 过早捕获会把 pointerup 重定向到 SVG 根元素，浏览器随即将 click
    // 派发到「按下目标与抬起目标的最近公共祖先」（即 SVG），
    // 大洲 / 国家 path 上的 onClick 永远收不到，导致无法锁定选中。
    // 改为：仅当位移超过拖拽阈值、确认是拖动而非点击时才捕获。
    if (animRef.current) cancelAnimationFrame(animRef.current);
    dragRef.current = { x: event.clientX, y: event.clientY, rotation, captured: false };
    movedRef.current = false;
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
    if (!movedRef.current) return;
    if (!dragRef.current.captured) {
      dragRef.current.captured = true;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) { /* noop */ }
    }
    setRotation({
      lon: dragRef.current.rotation.lon + dx * 0.24 * Math.min(1,0.49/zoom),
      lat: Math.max(-85, Math.min(85, dragRef.current.rotation.lat - dy * 0.2 * Math.min(1,0.49/zoom)))
    });
  };

  const endDrag = (event) => {
    if (dragRef.current?.captured && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const selectRegion = (id) => {
    if (movedRef.current) return;
    onSelectRegion(id);
  };

  const selectCountry = (id) => {
    if (movedRef.current) return;
    onSelectCountry(id);
  };

  const highlightedRegion = selectedRegion || hoverRegion;
  const hqPoint = selectedRegion && !selectedCountry && visible(HQ_COORD) ? model.projection(HQ_COORD) : null;
  const countryBoundaries = boundaries?.countryId === selectedCountry ? boundaries : null;
  const stores = countryMap ? window.CountryMapUtils.layout(countryMap.stores,model.projection,size,visible) : [];
  const selectedStore = countryMap?.stores.find(store=>store.id===selectedStoreId);
  const selectStore = (event,id) => {event.stopPropagation();if(!movedRef.current)setSelectedStoreId(current=>current===id?null:id);};

  return (
    <div className={`globe-wrap ${countryMap ? "is-country-focus" : ""}`} ref={wrapRef} data-screen-label="商机地球" data-focus-country={selectedCountry || ""} data-zoom={zoom.toFixed(3)}>
      <div className="globe-aura" aria-hidden="true"></div>
      <svg
        className={`globe-svg ${motion ? "is-live" : ""}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={countryMap ? `${countries[selectedCountry].name}行政区划与三家客户代表门店城市分布` : selectedRegion ? `${regions[selectedRegion].name}零售市场与已收录国家分布` : "完整世界地图，可通过区域导航查看大洲市场简报"}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <radialGradient id="oceanFill" cx="34%" cy="27%" r="75%">
            <stop offset="0%" stopColor="#F9FFFD"></stop>
            <stop offset="55%" stopColor="#DDF2EC"></stop>
            <stop offset="100%" stopColor="#B7DBD1"></stop>
          </radialGradient>
          <radialGradient id="earthShade" cx="30%" cy="25%" r="78%">
            <stop offset="56%" stopColor="#FFFFFF" stopOpacity="0"></stop>
            <stop offset="100%" stopColor="#568C7F" stopOpacity="0.26"></stop>
          </radialGradient>
          <filter id="earthShadow" x="-40%" y="-40%" width="180%" height="190%">
            <feDropShadow dx="0" dy="20" stdDeviation="22" floodColor="#477F72" floodOpacity="0.18"></feDropShadow>
          </filter>
          <filter id="countryGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur"></feGaussianBlur>
            <feMerge><feMergeNode in="blur"></feMergeNode><feMergeNode in="SourceGraphic"></feMergeNode></feMerge>
          </filter>
          <clipPath id="sphereClip"><path d={model.path({ type: "Sphere" })}></path></clipPath>
          <clipPath id="countryViewport"><rect width={size} height={size} rx="16"></rect></clipPath>
        </defs>

        <g clipPath={countryMap ? "url(#countryViewport)" : undefined}>
        <path className="sphere-shadow" d={model.path({ type: "Sphere" })} filter="url(#earthShadow)"></path>
        <path className="sphere-ocean" d={model.path({ type: "Sphere" })}></path>
        <g clipPath="url(#sphereClip)">
          <path className="graticule" d={model.path(model.graticule)}></path>
          {/* 完整地理底图与业务交互层分开：所有国家可见，仅调研覆盖国家可点击。 */}
          {worldFeatures.filter(feature=>!countryBoundaries || String(feature.id).padStart(3,"0")!==countries[selectedCountry].iso).map((feature, index) => (
            <path key={`land-${feature.id ?? index}`} className="world-land" data-country-iso={String(feature.id).padStart(3, "0")} aria-hidden="true" d={model.path(feature)}></path>
          ))}

          {!selectedRegion && coveredWorldFeatures.length > 0 && coveredWorldFeatures.map((feature, index) => {
            const country = countryByIso[String(feature.id).padStart(3, "0")];
            const region = regions[country.region];
            const isHot = highlightedRegion === region.id;
            return (
              <path
                key={`region-country-${feature.id ?? index}`}
                className={`region-country ${isHot ? "is-hot" : ""}`}
                data-country-iso={country.iso}
                style={{ "--region-color": region.color }}
                d={model.path(feature)}
                onPointerEnter={() => onHoverRegion(region.id)}
                onPointerLeave={() => onHoverRegion(null)}
                onClick={() => selectRegion(region.id)}
              ></path>
            );
          })}

          {!selectedRegion && loadState === "fallback" && continentFeatures.filter((feature) => regions[feature.properties.id]).map((feature) => {
            const region = regions[feature.properties.id];
            return (
              <path
                key={region.id}
                className="world-land"
                aria-hidden="true"
                d={model.path(feature)}
              ></path>
            );
          })}

          {selectedRegion && !selectedCountry && targetCountries.map((country) => (
            <path
              key={`arc-${country.id}`}
              className="hq-arc"
              d={model.path({ type: "LineString", coordinates: [HQ_COORD, country.coord] })}
            ></path>
          ))}
          {selectedRegion && !selectedCountry && targetCountries.map((country) => {
            const feature = worldByIso[country.iso];
            if (!feature) return null;
            const isSelected = selectedCountry === country.id;
            const isHover = hoverCountry === country.id;
            return (
              <path
                key={`country-${country.id}`}
                d={model.path(feature)}
                className={`target-country ${isSelected ? "is-selected" : ""} ${isHover ? "is-hover" : ""}`}
                style={{ "--region-color": regions[selectedRegion].color }}
                onPointerEnter={() => setHoverCountry(country.id)}
                onPointerLeave={() => setHoverCountry(null)}
                onClick={() => selectCountry(country.id)}
              ></path>
            );
          })}
          {countryMap && (
            <g className="country-detail" data-boundary-country={countryBoundaries?.countryId}>
              <path className="country-focus-land" d={model.path(countryBoundaries?.outline || worldByIso[countries[selectedCountry].iso])}></path>
              {countryBoundaries && <path className="country-admin-borders" d={model.path(countryBoundaries.borders)}></path>}
            </g>
          )}
          <path className="earth-shade" d={model.path({ type: "Sphere" })}></path>
        </g>
        <path className="sphere-outline" d={model.path({ type: "Sphere" })}></path>

        {hqPoint && (
          <g className="hq-marker" transform={`translate(${hqPoint[0]} ${hqPoint[1]})`}>
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)"></rect>
            <text x="10" y="3.5">DMALL HQ</text>
          </g>
        )}

        {selectedRegion && !selectedCountry && targetCountries.map((country) => {
          if (!visible(country.coord)) return null;
          const point = model.projection(country.coord);
          if (!point) return null;
          const isSelected = selectedCountry === country.id;
          const isHover = hoverCountry === country.id;
          return (
            <g
              key={`marker-${country.id}`}
              className={`country-marker ${isSelected ? "is-selected" : ""}`}
              transform={`translate(${point[0]} ${point[1]})`}
              role="button"
              tabIndex="0"
              aria-label={`选择${country.name}`}
              onPointerEnter={() => setHoverCountry(country.id)}
              onPointerLeave={() => setHoverCountry(null)}
              onClick={() => selectCountry(country.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") selectCountry(country.id);
              }}
            >
              <circle className="marker-pulse" r={isSelected ? 16 : 12}></circle>
              <circle className="marker-dot" r={isSelected ? 6 : 5}></circle>
              {(isHover || isSelected) && (
                <g className="marker-label" transform="translate(12 -17)">
                  <rect x="0" y="0" width={country.name.length * 15 + 24} height="35" rx="10"></rect>
                  <text x="12" y="22">{country.name}</text>
                </g>
              )}
            </g>
          );
        })}
        </g>
        {countryMap && <g className="store-map-layer">
          {stores.map(store => <path key={`line-${store.id}`} className="store-leader" stroke={store.color} d={`M${store.point.join(",")} L${store.anchor.join(",")}`}></path>)}
          {/* One city dot for colocated stores; each merchant retains its own label and leader. */}
          {stores.filter((s,i,list)=>list.findIndex(other=>other.coord.join()===s.coord.join())===i).map(store => <g key={`city-${store.id}`} className="store-city-dot" transform={`translate(${store.point.join(" ")})`}>
            <circle r="9" fill={store.color} opacity=".18"></circle><circle r="4.5" fill={store.color}></circle>
          </g>)}
          {stores.map(store => <g key={store.id} className={`store-map-label ${selectedStoreId===store.id ? "is-selected" : ""}`} transform={`translate(${store.label.x} ${store.label.y})`} role="button" tabIndex="0" aria-label={`${store.customerName}，${store.city}，${store.name}`} aria-pressed={selectedStoreId===store.id} onPointerDown={event=>{event.stopPropagation();movedRef.current=false;}} onClick={event=>selectStore(event,store.id)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();movedRef.current=false;selectStore(event,store.id);}}}>
            <rect className="store-label-bg" width={store.label.width} height={store.label.height} rx="10"></rect>
            <rect x="0" y="13" width="3" height="24" rx="1.5" fill={store.color}></rect>
            <text x="12" y="21" className="store-brand" fontSize={store.brand.length>16?11.5:13}>{store.brand}</text>
            <text x="12" y="39" className="store-city">{store.city}</text>
            <text x="12" y="54" className="store-group">{store.groupLabel}</text>
          </g>)}
        </g>}
      </svg>

      {!countryMap && <div className="region-quick-nav" aria-label="区域快捷导航">
        {Object.keys(regions).map((id) => {
          const item = regions[id];
          const active = selectedRegion === id;
          return (
            <button
              type="button"
              key={id}
              className={`region-chip ${active ? "is-active" : ""}`}
              title={item.market?.geography ? `全洲 ${item.market.geography.total} 个主权国家，已收录 ${item.countryIds.length} 国资料` : `已收录 ${item.countryIds.length} 国资料，不代表全洲国家总数`}
              onClick={() => (active ? onBack() : onSelectRegion(id))}
              onPointerEnter={() => { if (!selectedRegion) onHoverRegion(id); }}
              onPointerLeave={() => { if (!selectedRegion) onHoverRegion(null); }}
            >
              <i style={{ background: item.color }}></i><span>{item.name}</span><b>{item.badge}</b>
            </button>
          );
        })}
      </div>}

      {countryMap && <div className="country-map-status" aria-live="polite">
        {boundaryStatus==="error" ? <button onClick={()=>setBoundaryRetry(value=>value+1)}>重新加载行政区划</button> : <><span className="admin-line-key"></span>{boundaryStatus==="loading" ? "加载行政区划…" : "行政区划"}<span className="store-dot-key"></span>代表门店 · 3</>}
      </div>}

      {selectedStore && <aside className="store-detail-card" aria-label="代表门店详情">
        <button className="store-detail-close" aria-label="关闭门店详情" onClick={()=>setSelectedStoreId(null)}>×</button>
        <span>{selectedStore.customerName}</span>
        <h3>{selectedStore.name}</h3>
        <p>{selectedStore.city} · {countries[selectedCountry].name}</p>
        {selectedStore.relation && <p>{selectedStore.relation}</p>}
        <a href={selectedStore.sourceUrl} target="_blank" rel="noopener noreferrer">查看门店资料 ↗</a>
      </aside>}

      <div className="globe-toolbar">
        {selectedRegion ? (
          <div className="globe-toolbar-left">
            <button type="button" className="globe-tool" onClick={countryMap ? onBackToRegion : onBack}>
              <GlobeIcon name="back" size={16}></GlobeIcon>
              {countryMap ? `返回${regions[selectedRegion].name}` : "返回全球"}
            </button>
            <div className="pin-badge">
              <i style={{ background: regions[selectedRegion].color }}></i>
              {countryMap ? countries[selectedCountry].name : `已锁定 · ${regions[selectedRegion].name}`}
              {!countryMap && <em>Esc 或再次点击区域可解锁</em>}
            </div>
          </div>
        ) : (
          <div className="globe-hint"><GlobeIcon name="rotate" size={16}></GlobeIcon>拖动旋转 · 悬停预览 · 点击锁定大洲</div>
        )}
      </div>

    </div>
  );
}

Object.assign(window, { Globe, GlobeIcon });
