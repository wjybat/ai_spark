// Representative stores, checked 2026-09-05. Coordinates mark cities, not shop entrances.
// The customer relation is deliberately separate from the operating brand (e.g. Metcash's IGA network).
(function () {
  const store = (brand, name, city, coord, sourceUrl, relation = "") => ({ brand, name, city, coord, sourceUrl, relation });
  const maps = {
    chile: { frame:[-76,-56,-66,-17], stores:[
      store("Jumbo", "Jumbo Kennedy · Alto Las Condes", "圣地亚哥", [-70.6693,-33.4489], "https://www.cencomalls.cl/altolascondes/tiendas/jumbo"),
      store("Unimarc", "Unimarc Concón", "孔孔", [-71.5167,-32.9167], "https://www.smu.cl/inversionistas"),
      store("Falabella", "Falabella Cenco Costanera", "圣地亚哥", [-70.6693,-33.4489], "https://www.cencomalls.cl/costanera/tiendas/falabella-0")
    ]},
    argentina: { frame:[-74,-56,-53,-21], stores:[
      store("Jumbo", "Jumbo Unicenter", "马丁内斯", [-58.5167,-34.4833], "https://www.jumbo.com.ar/metodos-de-entrega/jumbo-al-auto", "Cencosud · 大布宜诺斯艾利斯"),
      store("Carrefour", "Carrefour Maxi Rosario I", "罗萨里奥", [-60.6393,-32.9442], "https://comerciante.carrefour.com.ar/sucursales"),
      store("Coto", "Coto Abasto", "布宜诺斯艾利斯", [-58.3816,-34.6037], "https://www.coto.com.ar/sucursales/index.asp")
    ]},
    brazil: { frame:[-74,-34,-34,6], stores:[
      store("GBarbosa", "GBarbosa Shopping Jardins", "阿拉卡茹", [-37.0731,-10.9472], "https://shoppingjardins.com.br/novidades/horario-de-funcionamento-feriado-aniversario-de-aracaju-confira"),
      store("Mateus", "Mateus Renascença", "圣路易斯", [-44.2825,-2.5307], "https://www.grupomateus.com.br/wp-content/uploads/2022/05/Regulamento-Compra-e-Ganhe-Latinhas-Maranhao_rev.25.04.22-TNK-002.pdf"),
      store("Assaí", "Assaí Avenida Maracanã", "里约热内卢", [-43.1729,-22.9068], "https://www.assai.com.br/loja/assai-avenida-maracana")
    ]},
    peru: { frame:[-82,-19,-68,1], stores:[
      store("Wong", "Wong Óvalo Gutiérrez", "利马", [-77.0428,-12.0464], "https://www.wong.pe/legales"),
      store("plazaVea", "plazaVea Arequipa La Marina", "阿雷基帕", [-71.5375,-16.409], "https://www.plazavea.com.pe/recojo-en-tienda"),
      store("Tottus", "Tottus Open Trujillo", "特鲁希略", [-79.032,-8.1116], "https://www.mallplaza.com/pe/open-trujillo/tiendas/tottus/index.html")
    ]},
    colombia: { frame:[-79,-5,-66,13], stores:[
      store("Jumbo", "Jumbo Santa Ana", "波哥大", [-74.0721,4.711], "https://santaanacentrocomercial.com/jumbo/"),
      store("Éxito WOW", "Éxito WOW Envigado", "恩维加多", [-75.582,6.17], "https://www.grupoexito.com.co/es/noticias-grupo-exito/abierto-el-hipermercado-del-futuro-exito-wow", "Grupo Éxito · 麦德林都会区"),
      store("Olímpica", "Supertienda Olímpica Calle 84", "巴兰基亚", [-74.7813,10.9685], "https://www.barranquilla.gov.co/wp-content/uploads/2019/09/listado-de-establecimientos-farmaceuticos.pdf")
    ]},
    usa: { frame:[-125,24,-66,50], stores:[
      store("The Fresh Market", "The Fresh Market · Lawndale Drive", "格林斯伯勒", [-79.792,36.073], "https://www.thefreshmarket.com/gso-lawndale"),
      store("H-E-B", "South Flores Market H-E-B", "圣安东尼奥", [-98.4936,29.4241], "https://www.heb.com/static-page/Our-Stores"),
      store("Giant Eagle", "Shadyside Market District", "匹兹堡", [-79.9959,40.4406], "https://www.marketdistrict.com/stores/40")
    ]},
    canada: { frame:[-141,42,-52,78], stores:[
      store("Loblaws", "Loblaws Maple Leaf Gardens", "多伦多", [-79.3832,43.6532], "https://www.torontocentralhealthline.ca/displayService.aspx?id=120453"),
      store("Sobeys", "Sobeys Queen Street", "哈利法克斯", [-63.5752,44.6488], "https://www.sobeys.com/rachellebery"),
      store("Giant Tiger", "Giant Tiger George Street · ByWard Market", "渥太华", [-75.6972,45.4215], "https://stores.gianttiger.com/on/ottawa/")
    ]},
    australia: { frame:[112,-44,154,-10], stores:[
      store("Chemist Warehouse", "Chemist Warehouse · Bourke & King Street", "墨尔本", [144.9631,-37.8136], "https://rsvp.chemistwarehouse.com.au/contact"),
      store("IGA", "Romeo’s IGA Food Hall Martin Place", "悉尼", [151.2093,-33.8688], "https://www.iga.com.au/stores/romeos-iga-food-hall-martin-place/", "Metcash · IGA 独立零售网络"),
      store("Harris Farm", "Harris Farm Markets West End", "布里斯班", [153.0251,-27.4698], "https://www.harrisfarm.com.au/pages/west-end")
    ]},
    new_zealand: { frame:[166,-48,179,-34], stores:[
      store("Chemist Warehouse", "Chemist Warehouse St Lukes", "奥克兰", [174.7633,-36.8485], "https://www.healthpoint.co.nz/pharmacy/pharmacy/chemist-warehouse-st-lukes/"),
      store("New World", "New World Durham Street", "基督城", [172.6362,-43.5321], "https://www.newworld.co.nz/south-island/canterbury/durham-street"),
      store("Woolworths", "Woolworths Cable Car Lane", "惠灵顿", [174.7762,-41.2865], "https://www.snapper.co.nz/locations/woolworths-cable-car-lane/")
    ]},
    ireland: { frame:[-10.8,51.3,-5.9,55.5], stores:[
      store("Chemist Warehouse", "Chemist Warehouse Blanchardstown", "都柏林", [-6.2603,53.3498], "https://www.chemistwarehouse.ie/"),
      store("SuperValu", "Ryan’s SuperValu Togher", "科克", [-8.4756,51.8985], "https://ryangroup.ie/togher/"),
      store("Dunnes Stores", "Dunnes Stores Edward Square", "戈尔韦", [-9.0568,53.2707], "https://www.dunnesstores.com/store/galway-edward-square-co-galway-h91ppy1/155/")
    ]},
    uae: { frame:[51.4,22.5,56.5,26.2], stores:[
      store("Chemist Warehouse", "Chemist Warehouse Al Ghurair Centre", "迪拜", [55.2708,25.2048], "https://www.chemistwarehouse.ae/pages/find-a-store"),
      store("LuLu", "LuLu Hypermarket Mushrif Mall", "阿布扎比", [54.3773,24.4539], "https://www.mushrifmall.com/stores/lulu-hypermarket"),
      store("Union Coop", "Union Coop Al Warqa City Mall", "迪拜", [55.2708,25.2048], "https://corporate.unioncoop.ae/en/branches/al-warqa/")
    ]}
  };
  const colors = ["#d46a4f", "#287d86", "#8665a1"];
  Object.entries(maps).forEach(([id, map]) => {
    map.stores = map.stores.map((s, index) => {
      const customerName = window.OPPORTUNITY_DATA.countries[id].customers[index].name;
      const groupLabel = customerName.replace("Sigma Healthcare / Chemist Warehouse","Sigma Healthcare").replace("Loblaw Companies Limited","Loblaw").replace("Woolworths New Zealand","Woolworths NZ");
      return {...s, id:`${id}-store-${index}`, customerName, groupLabel, color:colors[index]};
    });
    map.boundaryUrl = `./assets/maps/${id}.json`;
  });
  window.COUNTRY_MAPS = maps;
})();
