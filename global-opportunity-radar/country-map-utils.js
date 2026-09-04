(function () {
  function camera(map) {
    const [west,south,east,north] = map.frame;
    const center = [(west+east)/2,(south+north)/2];
    const projection = d3.geoOrthographic().rotate([-center[0],-center[1]]).scale(1).translate([0,0]);
    const points = [[west,south],[west,north],[east,south],[east,north],[center[0],south],[center[0],north]];
    const bounds = d3.geoPath(projection).bounds({type:'MultiPoint',coordinates:points});
    const zoom = Math.min(18, .76 / (bounds[1][0]-bounds[0][0]), .72 / (bounds[1][1]-bounds[0][1]));
    return {lon:-center[0],lat:-center[1],zoom};
  }
  // Search a small set of edge positions. Labels never overlap, even for two stores in one city.
  function layout(stores, projection, size, visible) {
    const width = Math.min(184,size*.41), height = 64, margin = 9;
    const points = stores.map(store => ({...store,point:projection(store.coord)})).filter(s => visible(s.coord) && s.point && s.point.every(Number.isFinite) && s.point.every(v=>v>=0&&v<=size));
    const slots = [0.12,0.34,0.57,0.8].flatMap(y => [margin,size-width-margin].map(x => ({x,y:size*y,width,height})));
    const overlap = (a,b) => a.x < b.x+b.width+7 && a.x+a.width+7 > b.x && a.y < b.y+b.height+7 && a.y+a.height+7 > b.y;
    const anchor = (p,s) => [Math.max(s.x,Math.min(s.x+s.width,p[0])),Math.max(s.y,Math.min(s.y+s.height,p[1]))];
    let best = [], bestCost = Infinity;
    function visit(index,used,cost) {
      if (cost>=bestCost) return;
      if (index===points.length) {best=used.slice();bestCost=cost;return;}
      for (const slot of slots) {
        if (used.some(s=>overlap(s,slot))) continue;
        const p = points[index].point, end = anchor(p,slot);
        const coversPoint = points.some(s=>s.point[0]>slot.x-10&&s.point[0]<slot.x+width+10&&s.point[1]>slot.y-10&&s.point[1]<slot.y+height+10);
        visit(index+1,[...used,slot],cost+Math.hypot(p[0]-end[0],p[1]-end[1])+(coversPoint?size*2:0));
      }
    }
    visit(0,[],0);
    return points.map((store,i)=>({...store,label:best[i],anchor:anchor(store.point,best[i])}));
  }
  window.CountryMapUtils = {camera,layout};
})();
