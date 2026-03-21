// lib/crm/mockData.js
// Realistic CRM mock data for Nadwyraz.com — 1200 customers

// ─── Constants ────────────────────────────────────────────────────────────────
export const SEGMENTS = ['Diamond', 'Platinum', 'Gold', 'Returning', 'New'];
export const RISK_LEVELS = ['OK', 'Risk', 'HighRisk', 'Lost'];
export const WORLDS = [
  'Koty', 'Literatura', 'Humor', 'Polszczyzna', 'Psy',
  'Filozofia', 'Relacje i miłość', 'Jedzenie i napoje', 'Edukacja', 'Zwierzęta',
];
export const BRAND_PILLARS = [
  'Literatura', 'Polszczyzna', 'Relacje i miłość', 'Polska', 'Filozofia', 'Humor kulturowy',
];

export const GRANULAR_TAGS = [
  'kociara', 'kot domowy', 'memy z kotami', 'zabawki dla kota', 'kocie selfie',
  'poezja', 'proza polska', 'klasyka', 'reportaż', 'literatura faktu', 'krimi', 'sci-fi',
  'memy', 'czarny humor', 'kabaret', 'ironia', 'sarkazm', 'stand-up',
  'etymologia', 'ortografia', 'neologizmy', 'gwary', 'błędy językowe', 'interpunkcja',
  'rasy psów', 'szkolenie psów', 'memy z psami', 'berneński', 'golden retriever',
  'stoicyzm', 'egzystencjalizm', 'etyka', 'logika', 'filozofia wschodnia', 'Marcus Aurelius',
  'miłość romantyczna', 'przyjaźń', 'rodzina', 'związki', 'samotność', 'introwertyzm',
  'kuchnia polska', 'weganizm', 'kawiarnia', 'wino', 'desery', 'przepisy',
  'nauka języków', 'historia', 'psychologia', 'neurologia', 'matematyka', 'biologia',
  'dzika przyroda', 'ptaki', 'akwaria', 'gady', 'insekty', 'ochrona środowiska',
];

export const OCCASIONS = [
  'Dzień Matki', 'Dzień Ojca', 'Walentynki', 'Boże Narodzenie',
  'Urodziny', 'Wielkanoc', 'Dzień Dziecka', 'Andrzejki',
  'Dzień Kobiet', 'Mikołajki', 'Rocznica ślubu', 'Absolutorium',
];

const PRODUCT_NAMES = [
  'Czarna koszulka z kotem', 'Notes "Polszczyzna"', 'Kubek z cytatem',
  'Torba płócienna', 'Kalendarz 2025', 'Zestaw naklejek',
  'Bluza z napisem', 'Plakat typograficzny', 'Pin z kotkiem',
  'Etui na telefon', 'Skarpetki z humorem', 'Magnes na lodówkę',
  'Zeszyt kieszonkowy', 'Podkładka pod myszkę', 'Smycz z cytatem',
  'Koszulka oversized', 'Bawełniany tote bag', 'Ceramiczny kubek',
  'Zestaw kartek okolicznościowych', 'Ramka z cytatem',
  'Planner 2025', 'Kubek podróżny', 'Fartuch kuchenny', 'Poduszka dekoracyjna',
];

const FIRST_NAMES_F = ['Anna', 'Maria', 'Katarzyna', 'Małgorzata', 'Agnieszka', 'Joanna', 'Barbara', 'Monika', 'Elżbieta', 'Magdalena', 'Zofia', 'Aleksandra', 'Natalia', 'Karolina', 'Martyna', 'Dorota', 'Iwona', 'Beata', 'Justyna', 'Paulina'];
const FIRST_NAMES_M = ['Krzysztof', 'Andrzej', 'Piotr', 'Jan', 'Tomasz', 'Marek', 'Łukasz', 'Michał', 'Paweł', 'Wojciech', 'Jakub', 'Bartosz', 'Marcin', 'Rafał', 'Kamil', 'Adam', 'Robert', 'Mateusz', 'Szymon', 'Grzegorz'];
const LAST_NAMES = ['Kowalska', 'Nowak', 'Wiśniewska', 'Wójcik', 'Kowalczyk', 'Kamińska', 'Lewandowska', 'Zielińska', 'Szymańska', 'Woźniak', 'Dąbrowska', 'Kozłowska', 'Jankowska', 'Mazur', 'Kwiatkowska', 'Krawczyk', 'Piotrowska', 'Grabowska', 'Nowakowska', 'Pawlak', 'Michalska', 'Adamczyk', 'Dudek', 'Zając', 'Wieczorek', 'Jabłońska', 'Król', 'Majewska', 'Olszewska', 'Jaworska'];

// ─── Seeded RNG ───────────────────────────────────────────────────────────────
function createRng(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function pickN(arr, n, rng) {
  const shuffled = [...arr].sort(() => rng() - 0.5);
  return shuffled.slice(0, n);
}
function randInt(min, max, rng) { return Math.floor(rng() * (max - min + 1)) + min; }
function randFloat(min, max, rng) { return Math.round((rng() * (max - min) + min) * 100) / 100; }

// ─── Date helpers ─────────────────────────────────────────────────────────────
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function randomDateBetween(start, end, rng) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + rng() * (e - s)).toISOString().slice(0, 10);
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // "2023-04"
}

// ─── Segment config ───────────────────────────────────────────────────────────
const SEGMENT_CONFIG = {
  Diamond:  { count: 60,  ltvMin: 1600, ltvMax: 4800, ordersMin: 9,  ordersMax: 22, risk: [0.60, 0.18, 0.13, 0.09], startRange: ['2021-01-01', '2022-12-31'] },
  Platinum: { count: 120, ltvMin: 800,  ltvMax: 2200, ordersMin: 6,  ordersMax: 15, risk: [0.58, 0.20, 0.14, 0.08], startRange: ['2021-06-01', '2023-06-30'] },
  Gold:     { count: 300, ltvMin: 280,  ltvMax: 950,  ordersMin: 3,  ordersMax: 10, risk: [0.55, 0.23, 0.14, 0.08], startRange: ['2022-01-01', '2023-12-31'] },
  Returning:{ count: 480, ltvMin: 89,   ltvMax: 480,  ordersMin: 2,  ordersMax: 6,  risk: [0.44, 0.28, 0.18, 0.10], startRange: ['2022-06-01', '2024-06-30'] },
  New:      { count: 240, ltvMin: 29,   ltvMax: 170,  ordersMin: 1,  ordersMax: 3,  risk: [0.80, 0.12, 0.06, 0.02], startRange: ['2024-01-01', '2024-12-31'] },
};

function pickRisk(weights, rng) {
  const r = rng();
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i];
    if (r < cum) return RISK_LEVELS[i];
  }
  return RISK_LEVELS[0];
}

// ─── Generate one customer ────────────────────────────────────────────────────
function generateCustomer(index, segment, rng) {
  const cfg = SEGMENT_CONFIG[segment];
  const isFemale = rng() > 0.38;
  const firstName = isFemale ? pick(FIRST_NAMES_F, rng) : pick(FIRST_NAMES_M, rng);
  const lastName = pick(LAST_NAMES, rng);
  const emailName = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('ą','a').replace('ę','e').replace('ó','o').replace('ś','s').replace('ł','l').replace('ż','z').replace('ź','z').replace('ć','c').replace('ń','n')}`;
  const emailDomain = pick(['gmail.com', 'wp.pl', 'onet.pl', 'o2.pl', 'interia.pl', 'outlook.com'], rng);

  const risk_level = pickRisk(cfg.risk, rng);
  const numOrders = randInt(cfg.ordersMin, cfg.ordersMax, rng);
  const ulubionySwiat = pick(WORLDS, rng);
  const firstPurchaseDate = randomDateBetween(cfg.startRange[0], cfg.startRange[1], rng);
  const lastPurchaseDate = risk_level === 'Lost'
    ? randomDateBetween(firstPurchaseDate, addDays(firstPurchaseDate, 300), rng)
    : risk_level === 'HighRisk'
    ? randomDateBetween(firstPurchaseDate, addDays(firstPurchaseDate, 500), rng)
    : randomDateBetween(firstPurchaseDate, '2024-12-15', rng);

  // Generate order dates
  const orderDates = [firstPurchaseDate];
  for (let i = 1; i < numOrders; i++) {
    const prev = orderDates[orderDates.length - 1];
    const maxEnd = risk_level === 'Lost' ? lastPurchaseDate : '2024-12-15';
    if (new Date(prev) >= new Date(maxEnd)) break;
    const next = randomDateBetween(addDays(prev, 30), maxEnd, rng);
    orderDates.push(next);
  }
  orderDates.sort();

  // Buying behavior: promo_hunter / full_price / mixed
  const buyerType = rng() < 0.30 ? 'promo_hunter' : rng() < 0.55 ? 'full_price' : 'mixed';
  const earlyAdopter = rng() < 0.25;
  const occasionBuyer = rng() < 0.45;

  const orders = orderDates.map((date, i) => {
    let is_promo = false;
    if (buyerType === 'promo_hunter') is_promo = rng() < 0.75;
    else if (buyerType === 'mixed') is_promo = rng() < 0.30;
    else is_promo = rng() < 0.08;

    const is_new_product = earlyAdopter ? rng() < 0.55 : rng() < 0.12;
    const occasion = occasionBuyer ? (rng() < 0.7 ? pick(OCCASIONS, rng) : null) : null;
    const baseAmount = is_promo
      ? randInt(Math.floor(cfg.ltvMin * 0.3 / numOrders), Math.ceil(cfg.ltvMax * 0.6 / numOrders), rng)
      : randInt(Math.floor(cfg.ltvMin * 0.5 / numOrders), Math.ceil(cfg.ltvMax * 1.2 / numOrders), rng);
    const amount = Math.max(29, baseAmount);
    const numProducts = randInt(1, 3, rng);
    const products = pickN(PRODUCT_NAMES, numProducts, rng);

    return { id: `ORD-${String(index).padStart(4,'0')}-${String(i+1).padStart(2,'0')}`, date, amount, products, is_promo, is_new_product, occasion };
  });

  const ltv = orders.reduce((s, o) => s + o.amount, 0);

  // Tag DNA
  const worldTagPool = GRANULAR_TAGS.filter((_, ti) => {
    const worldIndex = WORLDS.indexOf(ulubionySwiat);
    return Math.floor(ti / 6) === worldIndex || rng() < 0.15;
  });
  const top_tags_granularne = pickN(worldTagPool.length > 0 ? worldTagPool : GRANULAR_TAGS, randInt(2, 5, rng), rng);
  const top_okazje = orders
    .map(o => o.occasion)
    .filter(Boolean)
    .reduce((acc, occ) => { if (!acc.includes(occ)) acc.push(occ); return acc; }, [])
    .slice(0, 4);
  const top_filary_marki = pickN(BRAND_PILLARS, randInt(1, 3, rng), rng);

  const winback_priority = (segment === 'Diamond' || segment === 'Platinum') && (risk_level === 'Lost' || risk_level === 'HighRisk');

  return {
    id: `NZ-${String(index).padStart(6, '0')}`,
    name: `${firstName} ${lastName}`,
    email: `${emailName}@${emailDomain}`,
    segment,
    risk_level,
    ltv: Math.min(ltv, cfg.ltvMax),
    ulubiony_swiat: ulubionySwiat,
    top_tags_granularne,
    top_okazje,
    top_filary_marki,
    orders,
    winback_priority,
    first_purchase_date: orderDates[0],
    last_purchase_date: orderDates[orderDates.length - 1],
    buyer_type: buyerType,
    is_early_adopter: earlyAdopter,
  };
}

// ─── Generate all 1200 customers ──────────────────────────────────────────────
function generateAll() {
  const all = [];
  let idx = 1;
  for (const [segment, cfg] of Object.entries(SEGMENT_CONFIG)) {
    for (let i = 0; i < cfg.count; i++) {
      const rng = createRng(idx * 31337 + i * 1234);
      all.push(generateCustomer(idx, segment, rng));
      idx++;
    }
  }
  return all;
}

export const customers = generateAll();

// ─── Inject demo customer ─────────────────────────────────────────────────────
const demoIdx = customers.findIndex(c => c.id === 'NZ-000001');
if (demoIdx >= 0) {
  customers[demoIdx] = {
    ...customers[demoIdx],
    id: 'NZ-DEMO001',
    name: 'Katarzyna Wiśniewska',
    email: 'k.wisniewska@gmail.com',
    segment: 'Diamond',
    risk_level: 'OK',
    ltv: 3840,
    ulubiony_swiat: 'Koty',
    top_tags_granularne: ['kociara', 'poezja', 'memy z kotami', 'stoicyzm', 'kocie selfie'],
    top_okazje: ['Dzień Matki', 'Boże Narodzenie', 'Walentynki'],
    top_filary_marki: ['Literatura', 'Humor kulturowy', 'Polszczyzna'],
    winback_priority: false,
    orders: [
      { id: 'ORD-DEMO-01', date: '2022-05-23', amount: 189, products: ['Czarna koszulka z kotem', 'Kubek z cytatem'], is_promo: false, is_new_product: true, occasion: 'Dzień Matki' },
      { id: 'ORD-DEMO-02', date: '2022-12-12', amount: 347, products: ['Bluza z napisem', 'Plakat typograficzny', 'Zestaw naklejek'], is_promo: false, is_new_product: false, occasion: 'Boże Narodzenie' },
      { id: 'ORD-DEMO-03', date: '2023-02-14', amount: 129, products: ['Zestaw kartek okolicznościowych'], is_promo: false, is_new_product: false, occasion: 'Walentynki' },
      { id: 'ORD-DEMO-04', date: '2023-05-26', amount: 218, products: ['Notes "Polszczyzna"', 'Pin z kotkiem'], is_promo: false, is_new_product: true, occasion: 'Dzień Matki' },
      { id: 'ORD-DEMO-05', date: '2023-09-04', amount: 156, products: ['Koszulka oversized'], is_promo: true, is_new_product: true, occasion: null },
      { id: 'ORD-DEMO-06', date: '2023-12-08', amount: 412, products: ['Poduszka dekoracyjna', 'Ramka z cytatem', 'Kubek podróżny'], is_promo: false, is_new_product: false, occasion: 'Boże Narodzenie' },
      { id: 'ORD-DEMO-07', date: '2024-02-14', amount: 99, products: ['Magnes na lodówkę'], is_promo: false, is_new_product: false, occasion: 'Walentynki' },
      { id: 'ORD-DEMO-08', date: '2024-05-26', amount: 289, products: ['Bawełniany tote bag', 'Zestaw naklejek', 'Notes "Polszczyzna"'], is_promo: false, is_new_product: false, occasion: 'Dzień Matki' },
      { id: 'ORD-DEMO-09', date: '2024-10-18', amount: 178, products: ['Planner 2025'], is_promo: false, is_new_product: true, occasion: null },
      { id: 'ORD-DEMO-10', date: '2024-12-09', amount: 823, products: ['Fartuch kuchenny', 'Ceramiczny kubek', 'Plakat typograficzny', 'Etui na telefon'], is_promo: false, is_new_product: false, occasion: 'Boże Narodzenie' },
    ],
    first_purchase_date: '2022-05-23',
    last_purchase_date: '2024-12-09',
    buyer_type: 'full_price',
    is_early_adopter: true,
  };
}

// ─── Pre-computed Analytics ───────────────────────────────────────────────────

// 1. Overview 360°
export const overview = (() => {
  const totalCustomers = customers.length;
  const totalLtv = customers.reduce((s, c) => s + c.ltv, 0);
  const avgLtv = Math.round(totalLtv / totalCustomers);
  const vipReanimacja = customers.filter(c =>
    (c.segment === 'Diamond' || c.segment === 'Platinum') &&
    (c.risk_level === 'Lost' || c.risk_level === 'HighRisk')
  ).length;

  const bySegment = SEGMENTS.map(seg => {
    const seg_customers = customers.filter(c => c.segment === seg);
    const sumLtv = seg_customers.reduce((s, c) => s + c.ltv, 0);
    return {
      segment: seg,
      count: seg_customers.length,
      sumLtv,
      avgLtv: seg_customers.length ? Math.round(sumLtv / seg_customers.length) : 0,
      pct: Math.round((seg_customers.length / totalCustomers) * 1000) / 10,
    };
  });

  const byRisk = RISK_LEVELS.map(risk => {
    const rc = customers.filter(c => c.risk_level === risk);
    return {
      risk_level: risk,
      count: rc.length,
      pct: Math.round((rc.length / totalCustomers) * 1000) / 10,
    };
  });

  const worldCounts = {};
  customers.forEach(c => {
    worldCounts[c.ulubiony_swiat] = (worldCounts[c.ulubiony_swiat] || 0) + 1;
  });
  const topWorlds = Object.entries(worldCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([world, count]) => ({ world, count, pct: Math.round((count / totalCustomers) * 1000) / 10 }));

  return { totalCustomers, totalLtv, avgLtv, vipReanimacja, bySegment, byRisk, topWorlds };
})();

// 2. Worlds analytics
export const worldsAnalytics = (() => {
  // Tag ranking
  const tagCounts = {};
  customers.forEach(c => {
    c.top_tags_granularne.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count }));

  // Pillar distribution
  const pillarCounts = {};
  customers.forEach(c => {
    c.top_filary_marki.forEach(p => {
      pillarCounts[p] = (pillarCounts[p] || 0) + 1;
    });
  });
  const pillarStats = BRAND_PILLARS.map(p => ({
    pillar: p,
    count: pillarCounts[p] || 0,
    pct: Math.round(((pillarCounts[p] || 0) / customers.length) * 1000) / 10,
  })).sort((a, b) => b.count - a.count);

  // Segment × top world heatmap
  const heatmap = SEGMENTS.map(seg => {
    const sc = customers.filter(c => c.segment === seg);
    const wc = {};
    sc.forEach(c => { wc[c.ulubiony_swiat] = (wc[c.ulubiony_swiat] || 0) + 1; });
    const topWorld = Object.entries(wc).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const worldDist = WORLDS.map(w => ({
      world: w,
      count: wc[w] || 0,
      pct: sc.length ? Math.round(((wc[w] || 0) / sc.length) * 1000) / 10 : 0,
    }));
    return { segment: seg, topWorld, worldDist, total: sc.length };
  });

  // Domains (world groups)
  const domainMap = {
    'Zwierzęta domowe': ['Koty', 'Psy', 'Zwierzęta'],
    'Słowo i kultura': ['Literatura', 'Polszczyzna', 'Humor'],
    'Refleksja': ['Filozofia', 'Relacje i miłość'],
    'Styl życia': ['Jedzenie i napoje', 'Edukacja'],
  };
  const domains = Object.entries(domainMap).map(([domain, worlds]) => {
    const domCustomers = customers.filter(c => worlds.includes(c.ulubiony_swiat));
    return {
      domain,
      worlds,
      count: domCustomers.length,
      pct: Math.round((domCustomers.length / customers.length) * 1000) / 10,
      bySegment: SEGMENTS.map(seg => ({
        segment: seg,
        count: domCustomers.filter(c => c.segment === seg).length,
      })),
    };
  }).sort((a, b) => b.count - a.count);

  return { topTags, pillarStats, heatmap, domains };
})();

// 3. Behavior analytics
export const behaviorAnalytics = (() => {
  // Promo vs full price vs mixed per customer
  let promoOnly = 0, fullOnly = 0, mixed = 0;
  const promoBySegment = {};
  SEGMENTS.forEach(s => { promoBySegment[s] = { promo: 0, full: 0, mixed: 0 }; });

  customers.forEach(c => {
    if (c.orders.length === 0) return;
    const promoOrders = c.orders.filter(o => o.is_promo).length;
    const promoPct = promoOrders / c.orders.length;
    if (promoPct >= 0.7) { promoOnly++; promoBySegment[c.segment].promo++; }
    else if (promoPct <= 0.1) { fullOnly++; promoBySegment[c.segment].full++; }
    else { mixed++; promoBySegment[c.segment].mixed++; }
  });

  // Early adopters (new product in first month)
  const earlyAdopters = customers.filter(c => c.is_early_adopter).length;

  // Orders per year per segment
  const ordersPerYear = SEGMENTS.map(seg => {
    const sc = customers.filter(c => c.segment === seg);
    const avgOrders = sc.reduce((s, c) => {
      const years = Math.max(1, (new Date(c.last_purchase_date) - new Date(c.first_purchase_date)) / (365.25 * 86400 * 1000));
      return s + c.orders.length / years;
    }, 0) / (sc.length || 1);
    return { segment: seg, avgOrdersPerYear: Math.round(avgOrders * 10) / 10 };
  });

  // Personas
  const promoHunters = customers.filter(c => c.buyer_type === 'promo_hunter').length;
  const fullPricers = customers.filter(c => c.buyer_type === 'full_price').length;
  const mixedBuyers = customers.filter(c => c.buyer_type === 'mixed').length;
  const occasionBuyers = customers.filter(c => c.top_okazje.length >= 2).length;

  return {
    promoOnly, fullOnly, mixed,
    promoBySegment,
    earlyAdopters,
    ordersPerYear,
    personas: {
      promoHunters,
      earlyAdopters,
      occasionBuyers,
      fullPricers,
      mixedBuyers,
    },
  };
})();

// 4. Occasions analytics
export const occasionsAnalytics = (() => {
  // Top occasions
  const occCounts = {};
  const occCustomers = {};
  customers.forEach(c => {
    c.orders.forEach(o => {
      if (o.occasion) {
        occCounts[o.occasion] = (occCounts[o.occasion] || 0) + 1;
        if (!occCustomers[o.occasion]) occCustomers[o.occasion] = new Set();
        occCustomers[o.occasion].add(c.id);
      }
    });
  });

  const topOccasions = OCCASIONS.map(occ => ({
    occasion: occ,
    orderCount: occCounts[occ] || 0,
    customerCount: occCustomers[occ]?.size || 0,
  })).sort((a, b) => b.customerCount - a.customerCount);

  // Cyclical buyers (same occasion 2+ years)
  const cyclicalByOcc = {};
  OCCASIONS.forEach(occ => {
    let cyclical = 0;
    customers.forEach(c => {
      const years = [...new Set(c.orders.filter(o => o.occasion === occ).map(o => o.date.slice(0, 4)))];
      if (years.length >= 2) cyclical++;
    });
    cyclicalByOcc[occ] = cyclical;
  });

  // Monthly heatmap (orders per month of year)
  const monthlyOrders = Array(12).fill(0);
  let allOrders = 0;
  customers.forEach(c => {
    c.orders.forEach(o => {
      const m = parseInt(o.date.slice(5, 7)) - 1;
      monthlyOrders[m]++;
      allOrders++;
    });
  });

  const heatmapMonths = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'].map((m, i) => ({
    month: m,
    orders: monthlyOrders[i],
    pct: Math.round((monthlyOrders[i] / allOrders) * 1000) / 10,
  }));

  // Cyclic Dzień Matki buyers
  const cyclicMatki = cyclicalByOcc['Dzień Matki'] || 0;

  return { topOccasions, cyclicalByOcc, heatmapMonths, cyclicMatki };
})();

// 5. Cohort analytics
export const cohortAnalytics = (() => {
  // Build cohort map: first_purchase_month → customer list
  const cohortMap = {};
  customers.forEach(c => {
    const cohort = monthKey(c.first_purchase_date);
    if (!cohortMap[cohort]) cohortMap[cohort] = [];
    cohortMap[cohort].push(c);
  });

  // Get cohort months from Jan 2022 to Oct 2024
  const cohortMonths = [];
  const start = new Date('2022-01-01');
  const end = new Date('2024-10-01');
  for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
    cohortMonths.push(d.toISOString().slice(0, 7));
  }

  // For each cohort, compute retention at offset 1..12
  const MAX_OFFSET = 12;
  const matrix = cohortMonths.map(cohort => {
    const cohortCustomers = cohortMap[cohort] || [];
    if (cohortCustomers.length === 0) return null;

    const retentionByOffset = Array.from({ length: MAX_OFFSET + 1 }, (_, offset) => {
      if (offset === 0) return 100;
      const targetMonth = (() => {
        const [y, m] = cohort.split('-').map(Number);
        const d = new Date(y, m - 1 + offset, 1);
        return d.toISOString().slice(0, 7);
      })();
      const retained = cohortCustomers.filter(c =>
        c.orders.some(o => monthKey(o.date) === targetMonth)
      ).length;
      return cohortCustomers.length > 0 ? Math.round((retained / cohortCustomers.length) * 100) : 0;
    });

    return {
      cohort,
      size: cohortCustomers.length,
      retentionByOffset,
    };
  }).filter(Boolean);

  // Avg time to second purchase per segment (days)
  const avgTimeToSecond = SEGMENTS.map(seg => {
    const sc = customers.filter(c => c.segment === seg && c.orders.length >= 2);
    if (sc.length === 0) return { segment: seg, days: null };
    const totalDays = sc.reduce((s, c) => {
      const sorted = [...c.orders].sort((a, b) => a.date.localeCompare(b.date));
      const d1 = new Date(sorted[0].date);
      const d2 = new Date(sorted[1].date);
      return s + (d2 - d1) / (86400 * 1000);
    }, 0);
    return { segment: seg, days: Math.round(totalDays / sc.length) };
  });

  // Retention rate per segment
  const retentionBySegment = SEGMENTS.map(seg => {
    const sc = customers.filter(c => c.segment === seg);
    const repeat = sc.filter(c => c.orders.length >= 2).length;
    return {
      segment: seg,
      total: sc.length,
      repeat,
      rate: sc.length ? Math.round((repeat / sc.length) * 100) : 0,
    };
  });

  return { matrix, avgTimeToSecond, retentionBySegment, cohortMonths };
})();

// ─── Single client helper ─────────────────────────────────────────────────────
export function getCustomer(id) {
  return customers.find(c => c.id === id) || null;
}

export function getWinbackList() {
  return customers
    .filter(c => c.winback_priority)
    .sort((a, b) => b.ltv - a.ltv);
}
