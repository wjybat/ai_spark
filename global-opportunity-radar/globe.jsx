const { useEffect, useMemo, useRef, useState } = React;

// DMALL 总部（北京）坐标，用于绘制出海航线
const HQ_COORD = [116.4, 39.9];

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
  motion
}) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const animRef = useRef(null);
  const rotationRef = useRef({ lon: -28, lat: -9 });
  const [size, setSize] = useState(560);
  const [worldFeatures, setWorldFeatures] = useState([]);
  const [rotation, setRotation] = useState({ lon: -28, lat: -9 });
  const [hoverCountry, setHoverCountry] = useState(null);
  const [loadState, setLoadState] = useState("loading");

  rotationRef.current = rotation;

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

  // 选中 / 取消选中区域时，沿最短经度路径平滑 tween 到目标视角
  useEffect(() => {
    const target = selectedRegion
      ? (() => { const center = regions[selectedRegion].center; return { lon: -center[0], lat: -center[1] }; })()
      : { lon: -28, lat: -9 };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (!motion) {
      setRotation(target);
      return undefined;
    }
    const from = { ...rotationRef.current };
    const dLon = ((target.lon - from.lon + 540) % 360) - 180;
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
      }
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [selectedRegion, motion]);

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
    const scale = size * (selectedRegion ? 0.49 : 0.405);
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
  }, [rotation, selectedRegion, size]);

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

  const regionForFeature = (feature) => {
    const [lon, lat] = d3.geoCentroid(feature);
    if (lon < -28 && lat > 12) return "north_america";
    if (lon < -28 && lat <= 12) return "south_america";
    if ((lon > 112 && lat < -8) || (lon > 165 && lat < 8)) return "oceania";
    if (lon >= -25 && lon <= 42 && lat >= 36) return "europe";
    if (lon >= -22 && lon <= 52 && lat < 36 && (lon < 37 || lat < 13)) return "africa";
    return "asia";
  };

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
      lon: dragRef.current.rotation.lon + dx * 0.24,
      lat: Math.max(-67, Math.min(67, dragRef.current.rotation.lat - dy * 0.2))
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
  const hqPoint = selectedRegion && visible(HQ_COORD) ? model.projection(HQ_COORD) : null;

  return (
    <div className="globe-wrap" ref={wrapRef} data-screen-label="商机地球">
      <div className="globe-aura" aria-hidden="true"></div>
      <svg
        className={`globe-svg ${motion ? "is-live" : ""}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={selectedRegion ? `${regions[selectedRegion].name}重点国家分布` : "全球商机交互地球"}
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
        </defs>

        <path className="sphere-shadow" d={model.path({ type: "Sphere" })} filter="url(#earthShadow)"></path>
        <path className="sphere-ocean" d={model.path({ type: "Sphere" })}></path>
        <g clipPath="url(#sphereClip)">
          <path className="graticule" d={model.path(model.graticule)}></path>
          {worldFeatures.map((feature, index) => (
            <path key={`land-${feature.id ?? index}`} className="world-land" d={model.path(feature)}></path>
          ))}

          {!selectedRegion && worldFeatures.length > 0 && worldFeatures.map((feature, index) => {
            const region = regions[regionForFeature(feature)];
            const isHot = highlightedRegion === region.id;
            return (
              <path
                key={`region-country-${feature.id ?? index}`}
                className={`region-country ${isHot ? "is-hot" : ""}`}
                style={{ "--region-color": region.color }}
                d={model.path(feature)}
                onPointerEnter={() => onHoverRegion(region.id)}
                onPointerLeave={() => onHoverRegion(null)}
                onClick={() => selectRegion(region.id)}
              ></path>
            );
          })}

          {!selectedRegion && worldFeatures.length === 0 && continentFeatures.map((feature) => {
            const region = regions[feature.properties.id];
            const isHot = highlightedRegion === region.id;
            return (
              <path
                key={region.id}
                className={`region-shape ${isHot ? "is-hot" : ""}`}
                style={{ "--region-color": region.color }}
                d={model.path(feature)}
                tabIndex="0"
                role="button"
                aria-label={`查看${region.name}商机`}
                onPointerEnter={() => onHoverRegion(region.id)}
                onPointerLeave={() => onHoverRegion(null)}
                onFocus={() => onHoverRegion(region.id)}
                onBlur={() => onHoverRegion(null)}
                onClick={() => selectRegion(region.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") selectRegion(region.id);
                }}
              ></path>
            );
          })}

          {selectedRegion && targetCountries.map((country) => (
            <path
              key={`arc-${country.id}`}
              className="hq-arc"
              d={model.path({ type: "LineString", coordinates: [HQ_COORD, country.coord] })}
            ></path>
          ))}
          {selectedRegion && targetCountries.map((country) => {
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
          <path className="earth-shade" d={model.path({ type: "Sphere" })}></path>
        </g>
        <path className="sphere-outline" d={model.path({ type: "Sphere" })}></path>

        {hqPoint && (
          <g className="hq-marker" transform={`translate(${hqPoint[0]} ${hqPoint[1]})`}>
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)"></rect>
            <text x="10" y="3.5">DMALL HQ</text>
          </g>
        )}

        {selectedRegion && targetCountries.map((country) => {
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
                  <rect x="0" y="0" width={country.name.length * 15 + 70} height="35" rx="10"></rect>
                  <text x="12" y="22">{country.name}</text>
                  <text className="marker-score" x={country.name.length * 15 + 36} y="22">{country.score}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="region-quick-nav" aria-label="区域快捷导航">
        {Object.keys(regions).map((id) => {
          const item = regions[id];
          const active = selectedRegion === id;
          return (
            <button
              type="button"
              key={id}
              className={`region-chip ${active ? "is-active" : ""}`}
              onClick={() => (active ? onBack() : onSelectRegion(id))}
              onPointerEnter={() => { if (!selectedRegion) onHoverRegion(id); }}
              onPointerLeave={() => { if (!selectedRegion) onHoverRegion(null); }}
            >
              <i style={{ background: item.color }}></i><span>{item.name}</span><b>{item.score}</b>
            </button>
          );
        })}
      </div>

      <div className="globe-toolbar">
        {selectedRegion ? (
          <div className="globe-toolbar-left">
            <button type="button" className="globe-tool" onClick={onBack}>
              <GlobeIcon name="back" size={16}></GlobeIcon>
              返回全球
            </button>
            <div className="pin-badge">
              <i style={{ background: regions[selectedRegion].color }}></i>
              已锁定 · {regions[selectedRegion].name}
              <em>Esc 或再次点击区域可解锁</em>
            </div>
          </div>
        ) : (
          <div className="globe-hint"><GlobeIcon name="rotate" size={16}></GlobeIcon>拖动旋转 · 悬停预览 · 点击锁定大洲</div>
        )}
        <div className="data-status"><span></span>{loadState === "ready" ? "地理数据已就绪" : "轻量地图模式"}</div>
      </div>

      {!selectedRegion && (
        <div className="region-legend" aria-label="区域机会图例">
          <span>机会强度</span><i></i><i></i><i></i><b>高</b>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Globe, GlobeIcon });
