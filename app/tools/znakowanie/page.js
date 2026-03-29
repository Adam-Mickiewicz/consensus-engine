'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';
import Nav from '../../components/Nav';

// ─── Theme tokens ───
const dark = {
  bg: '#0e0e0e', bgCard: '#171717', bgCardAlt: '#1c1c1c', border: '#2a2a2a',
  accent: '#b8763a', accentLight: '#d4944f', accentGlow: 'rgba(184,118,58,0.15)',
  text: '#e8e4df', textDim: '#9a9590', textBright: '#fff',
  green: '#4ade80', red: '#f87171', yellow: '#fbbf24', blue: '#60a5fa', purple: '#c084fc',
};
const light = {
  bg: '#f5f0eb', bgCard: '#ffffff', bgCardAlt: '#f9f6f2', border: '#ddd5cc',
  accent: '#9a5e28', accentLight: '#7a4a1e', accentGlow: 'rgba(154,94,40,0.08)',
  text: '#3a3530', textDim: '#7a746e', textBright: '#1a1714',
  green: '#16a34a', red: '#dc2626', yellow: '#ca8a04', blue: '#2563eb', purple: '#9333ea',
};

// ─── Data ───
const NAV_ITEMS = [
  { id: 'sitodruk', label: 'Sitodruk' },
  { id: 'haft', label: 'Haft' },
  { id: 'dtg-dtf', label: 'DTG / DTF' },
  { id: 'sublimacja', label: 'Sublimacja' },
  { id: 'flex', label: 'Flex / Flock' },
  { id: 'tabela', label: 'Tabela' },
  { id: 'material', label: 'Materiały' },
  { id: 'bledy', label: 'Błędy' },
  { id: 'decyzja', label: 'Kiedy co?' },
];

const COMPARISON = [
  { method: 'Plastizol', detail: '●●●○', colors: '1–8', feel: 'Wyczuwalny', cotton: '✓✓✓', poly: '✓ (uwaga)', darkBg: '✓ poddruk', volume: '100+', cottonColor: 'green', polyColor: 'yellow', darkColor: 'green' },
  { method: 'Farby wodne', detail: '●●●●', colors: '1–6', feel: 'Miękki', cotton: '✓✓✓', poly: 'Ryzyko', darkBg: 'Trudniej', volume: '50+', cottonColor: 'green', polyColor: 'red', darkColor: 'yellow' },
  { method: 'Discharge', detail: '●●●○', colors: '1–4', feel: 'Zero', cotton: '✓✓✓', poly: '✕', darkBg: 'Ideał!', volume: '50+', cottonColor: 'green', polyColor: 'red', darkColor: 'green' },
  { method: 'Puff / 3D', detail: '●●○○', colors: '1–3', feel: 'Wypukły', cotton: '✓✓', poly: 'Zależy', darkBg: 'Zależy', volume: '50+', cottonColor: 'green', polyColor: 'yellow', darkColor: 'yellow' },
  { method: 'High Density', detail: '●●○○', colors: '1–2', feel: 'Twardy relief', cotton: '✓✓', poly: 'Zależy', darkBg: '✓', volume: '50+', cottonColor: 'green', polyColor: 'yellow', darkColor: 'green' },
  { method: 'Haft', detail: '●●○○', colors: '1–8 nici', feel: 'Premium nić', cotton: '✓✓', poly: '✓✓', darkBg: '✓✓✓', volume: '1+', cottonColor: 'green', polyColor: 'green', darkColor: 'green' },
  { method: 'DTG', detail: '●●●●●', colors: 'Full', feel: 'Miękki', cotton: '✓✓✓', poly: 'Słabo', darkBg: 'Pretreat', volume: '1–200', cottonColor: 'green', polyColor: 'red', darkColor: 'yellow' },
  { method: 'DTF', detail: '●●●●○', colors: 'Full', feel: 'Transferowy', cotton: '✓✓✓', poly: '✓✓✓', darkBg: '✓✓', volume: '1–500', cottonColor: 'green', polyColor: 'green', darkColor: 'green' },
  { method: 'Sublimacja', detail: '●●●●●', colors: 'Full', feel: 'Zero', cotton: '✕', poly: '✓✓✓', darkBg: '✕', volume: '1+', cottonColor: 'red', polyColor: 'green', darkColor: 'red' },
  { method: 'Flex / Flock', detail: '●○○○', colors: '1–3', feel: 'Foliowy', cotton: '✓✓', poly: '✓✓', darkBg: '✓✓', volume: '1–100', cottonColor: 'green', polyColor: 'green', darkColor: 'green' },
];

const MISTAKES = [
  { title: 'Za cienkie linie', desc: 'Dotyczy haftu, puffu, HD i sitodruku w małej skali. Linie zlewają się, gubią się, giną.' },
  { title: 'Za mały tekst', desc: 'Na ekranie wygląda super, w produkcji nie działa. Szczególnie haft i efekty specjalne.' },
  { title: 'Za dużo kolorów bez potrzeby', desc: 'W sitodruku każdy kolor = sito = koszt. Umiej zrobić wersję 2-kolorową i 4-kolorową.' },
  { title: 'Gradient bez rastra', desc: 'Gradient nie istnieje magicznie w sitodruku — istnieje jako raster. Trzeba to projektować świadomie.' },
  { title: 'Ignorowanie koloru koszulki', desc: 'Ten sam projekt na białej, szarej i czarnej — to trzy różne decyzje technologiczne.' },
  { title: 'Haft jak nadruk', desc: 'Haft to osobne medium. Wymaga uproszczenia, pogrubienia, świadomego budowania czytelności.' },
  { title: 'Brak testu na realnym blanku', desc: 'Szczególnie przy discharge, poliestrze, puffie, HD. Każdy materiał zachowuje się inaczej.' },
];

const DECISIONS = [
  { scenario: 'Premium T-shirt, literacki/brandowy projekt, 1–3 kolory', rec: 'Farby wodne / Soft-hand plastizol', note: 'Jeśli ciemna baza i miękkość kluczowa — rozważ discharge.' },
  { scenario: 'Ciemna bawełna, duży front, priorytet: miękkość', rec: 'Discharge / Wywab', note: 'Najlepszy chwyt na ciemnym. Testuj blank!' },
  { scenario: 'Ciemna bawełna, duży front, priorytet: krycie i przewidywalność', rec: 'Plastizol + biały poddruk', note: 'Najstabilniejsza opcja na ciemnym.' },
  { scenario: 'Dużo kolorów, dużo detali, mały nakład (1–200 szt.)', rec: 'DTG (bawełna) / DTF (reszta)', note: 'DTG artystyczny, DTF uniwersalny materiałowo.' },
  { scenario: 'Efekt premium małego znaku — pierś, rękaw, czapka', rec: 'Haft / High Density / Mały puff', note: 'Zależy od charakteru kolekcji i materiału.' },
  { scenario: 'Pełny print na całej bryle — sport, fashion, pattern', rec: 'Sublimacja / Cut-and-sew', note: 'Najczęściej poliester. Na bawełnie wymaga innych rozwiązań.' },
  { scenario: 'Duży nakład 500+, mocne kolory, 1–4 kolory', rec: 'Sitodruk plastizolowy', note: 'Król powtarzalności i niskiego kosztu jednostkowego.' },
  { scenario: 'Personalizacja, nazwiska, numery — szybko', rec: 'Flex / Flock / HTV', note: 'Ploter + prasa = gotowe w minuty.' },
];

const VIDEOS = {
  sitodruk: [
    { id: 'gvX1p5f5rlc', caption: 'Plastizol na ciemnym — biały poddruk krok po kroku' },
    { id: 'cvwHtH5F0Yk', caption: 'Plastizol na granatowym — cały proces w studiu' },
    { id: 'z4MU5YI7JeA', caption: 'Farby wodne — przygotowanie sita i druk' },
    { id: 'uzP4fCaLweU', caption: 'Discharge — wywab na ciemnej koszulce bawełnianej' },
  ],
  haft: [
    { id: 'h9UMYbWxAVY', caption: 'Historia i proces digitizingu haftu maszynowego' },
    { id: '3FBFeRB2mJw', caption: 'Maszyny wielogłowicowe — Ricoma vs Tajima vs SWF' },
  ],
  dtg: [
    { id: '1GkqdwXhlLI', caption: 'DTG — cały proces z Kornit Digital w Printful' },
    { id: '_zqAujRkALo', caption: 'Jak powstaje produkt DTG w print-on-demand' },
    { id: 'bXYSLTqHp0o', caption: 'DTF — czego nie wiedzieć przed zakupem drukarki' },
    { id: 'OGoHaaod0AI', caption: 'DTF na poliestrze i odzieży sportowej' },
  ],
  sublimacja: [
    { id: 'cA3cF2TZfAs', caption: 'Sublimacja — transfer na drukarce desktopowej' },
    { id: 'O4_QtXx6F20', caption: 'Jak wgrzewać transfer sublimacyjny prasą' },
    { id: 'qBIRAo3nrTI', caption: 'Sublimacja na koszulkach — pełny poradnik' },
  ],
  flex: [
    { id: 'bCMpBgDptbw', caption: 'HTV 101 — podstawy folii termotransferowej' },
    { id: '2rMnU5go7Pg', caption: 'Ploter i HTV — poradnik dla początkujących' },
  ],
};

const U = (id) => `https://source.unsplash.com/${id}/600x400`;
const P = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=600`;

const PHOTOS = {
  sitodruk: [
    { url: P('3966277'), alt: 'Rzemieślnik przy sitodruku w warsztacie' },
    { url: U('gvX1p5f5rlc'), alt: 'Plastizol na czarnej koszulce — biały poddruk' },
    { url: U('bGjzSW1rDXo'), alt: 'Farby sitodrukowe w słoikach' },
    { url: U('XOLHAGi8oKc'), alt: 'Odbitka dłoni — sitodruk' },
    { url: U('Cx5AQKzuB7Y'), alt: 'Mieszanka kolorowych farb w wodzie' },
    { url: U('3t4UcoxfH4c'), alt: 'Kolorowe plamy farby na białym tle' },
    { url: U('Lki74Jj7H-U'), alt: 'Niebieska farba — splash' },
    { url: U('eAUE_FmclYE'), alt: 'Czarne koszulki na wieszaku — gotowe nadruki' },
    { url: U('Aph0Zdb1qFU'), alt: 'Operator maszyny drukarskiej przy panelu' },
    { url: U('D8Lwzkg4AW8'), alt: 'Maszyna drukująca — żółto-szara' },
    { url: U('ZCTh4f4mv18'), alt: 'Sito drukowe przy oknie' },
    { url: U('N6Y1z8TAr54'), alt: 'Poradnik sitodruku na czarnym tle' },
  ],
  haft: [
    { url: U('tOCIrKLupyA'), alt: 'Maszyna hafciarska w akcji' },
    { url: U('SLODHM36c9s'), alt: 'Tamborek hafciarski — białe tło' },
    { url: U('fL5xqqoUVF0'), alt: 'Haft kwiatowy na tkaninie' },
    { url: U('ICngiwVv5S0'), alt: 'Ręce przy maszynie do szycia' },
    { url: U('1mnXGDl3iRY'), alt: 'Biała maszyna do szycia' },
    { url: U('gm3DMk94SVc'), alt: 'Ręce szyją materiał na maszynie' },
    { url: U('nWAlCB1tyvc'), alt: 'Kolorowe nici na stojaku' },
    { url: U('Nh6NsnqYVsI'), alt: 'Zestaw kolorowych nici hafciarskich' },
    { url: U('V6T99SnUCyA'), alt: 'Szpule nici — kolorowe' },
    { url: U('87hFrPk3V-s'), alt: 'Kolorowe nici — asortyment' },
    { url: U('kTQj4QoHP-k'), alt: 'Różowa nić na białej ramce' },
    { url: U('iKlTQ_GB16k'), alt: 'Szpula nici brązowo-zielona' },
  ],
  dtg: [
    { url: U('Tzm3Oyu_6sk'), alt: 'Maszyna drukująca cyfrowo' },
    { url: U('CYrYxz-uvE4'), alt: 'Duża maszyna cyfrowa — wydruki' },
    { url: U('r2tVRjxzFM8'), alt: 'Osoba obsługująca maszynę przemysłową' },
    { url: U('oE8gTCYUmYM'), alt: 'Pracownicy przy szyciu w fabryce' },
    { url: U('yVRkR4G46sc'), alt: 'Hala produkcji tekstylnej' },
    { url: U('5Czr8ygjXLM'), alt: 'Przędzalnia bawełny — pracownicy' },
    { url: U('RuLSD0wZ2B4'), alt: 'Pracownicy przy maszynach w fabryce' },
    { url: U('SOVoX8Kwm7w'), alt: 'Pracownica fabryki odzieżowej' },
    { url: U('xElw_a9lq70'), alt: 'Pakowanie odzieży w fabryce' },
    { url: U('LgDb6mbseAo'), alt: 'Pracownica z materiałem w fabryce' },
    { url: U('E7KIt5wqdzU'), alt: 'Kobieta przy maszynie w fabryce tekstylnej' },
    { url: U('upKXvfgKABY'), alt: 'Szycie odzieży na maszynie' },
  ],
  sublimacja: [
    { url: U('0ohjyDUIUq0'), alt: 'Kolorowe tkaniny — sublimacja' },
    { url: U('4nabmlliGdU'), alt: 'Różnokolorowe materiały — gradient' },
    { url: U('nYVfiHu5OIs'), alt: 'Kolorowe wzory na tkaninie' },
    { url: U('HyBXy5PHQR8'), alt: 'Czerwony materiał — zbliżenie' },
    { url: U('0rUc4_00L-A'), alt: 'Biało-zielono-morski wzór kwiatowy' },
    { url: U('RMQEU7fCqLc'), alt: 'Kosz z kolorowymi tkaninami' },
    { url: U('5GsbwkrCfuM'), alt: 'Kolorowe ubrania na wieszaku' },
    { url: U('aL7mLl5DZk4'), alt: 'Kolorowe wzory tkanin — asortyment' },
    { url: U('sYI_WSHEsXU'), alt: 'Kolorowe dekoracje tekstylne' },
    { url: U('exSKrQuFLj8'), alt: 'Biały kubek — sublimacja mockup' },
    { url: U('0jeUy9ZagHU'), alt: 'Kolorowy atrament w wodzie — efekt barwnika' },
    { url: U('Cx5AQKzuB7Y'), alt: 'Mieszanka farb — sublimacja' },
  ],
  flex: [
    { url: U('jF_AQH-bBSc'), alt: 'Praca z narzędziem w warsztacie' },
    { url: U('HsQuhb9GBPM'), alt: 'Precyzyjna praca w atelier' },
    { url: U('F7v66RfronU'), alt: 'Mężczyzna przy stole roboczym' },
    { url: U('pbuPB86bNuk'), alt: 'Szycie sukienki na maszynie' },
    { url: U('CAe2NqibUpo'), alt: 'Szycie materiału na maszynie' },
    { url: U('6Zh87jbMSEA'), alt: 'Szycie odzieży na maszynach — warsztat' },
    { url: U('PDhHgBYuktw'), alt: 'Starszy mężczyzna przy maszynie krawiecką' },
    { url: U('qI9H5nyhrV8'), alt: 'Osoba szyje na maszynie' },
    { url: U('aSJj_tFa3ik'), alt: 'Krawcowa przy maszynie w fabryce' },
    { url: P('6980533'), alt: 'Wycinanie wzoru — ploter tnący' },
    { url: U('aGz5hkren64'), alt: 'Nici — flat lay różane' },
    { url: U('kuyumG6hKWk'), alt: 'Sortowanie tkanin w fabryce' },
  ],
};

const CHEATSHEET = [
  { label: 'Duże nakłady:', value: 'Sitodruk plastizolowy' },
  { label: 'Premium chwyt:', value: 'Farby wodne / Discharge' },
  { label: 'Ciemna bawełna:', value: 'Discharge (miękkość) lub Plastizol + poddruk (krycie)' },
  { label: 'Małe serie + detal:', value: 'DTG / DTF' },
  { label: 'Premium mały znak:', value: 'Haft' },
  { label: 'Poliester / fullprint:', value: 'Sublimacja' },
];

// ─── Sub-components ───

function VideoCard({ v, t }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}`, background: '#000' }}>
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0`}
          style={{ width: '100%', aspectRatio: '16/9', display: 'block', border: 'none' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div onClick={() => setPlaying(true)} style={{ position: 'relative', aspectRatio: '16/9', cursor: 'pointer', overflow: 'hidden' }}>
          <img src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`} alt={v.caption}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.72)' }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            width: 56, height: 56, background: 'rgba(220,0,0,0.92)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '10px 0 10px 18px', borderColor: 'transparent transparent transparent #fff', marginLeft: 3 }} />
          </div>
        </div>
      )}
      <div style={{ padding: '10px 14px', fontSize: 13, color: t.textDim, background: t.bgCard, borderTop: `1px solid ${t.border}` }}>
        {v.caption}
      </div>
    </div>
  );
}

function VideoGrid({ videos, t }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, margin: '24px 0' }}>
      {videos.map(v => <VideoCard key={v.id} v={v} t={t} />)}
    </div>
  );
}

function PhotoGallery({ photos, t }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? photos : photos.slice(0, 3);
  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {visible.map((p, i) => (
          <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}`, aspectRatio: '4/3', background: t.bgCardAlt }}>
            <img src={p.url} alt={p.alt}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy" />
          </div>
        ))}
      </div>
      {photos.length > 3 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
          background: 'transparent', color: t.textDim, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
        }}>
          {expanded ? '▲ Zwiń' : `▼ Pokaż więcej zdjęć (${photos.length - 3})`}
        </button>
      )}
    </div>
  );
}

function Tags({ items, t }) {
  const colorMap = { green: t.green, red: t.red, yellow: t.yellow, blue: t.blue, purple: t.purple };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
      {items.map((item, i) => {
        const c = colorMap[item.color] || t.textDim;
        return (
          <span key={i} style={{
            padding: '4px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
            background: c + '18', color: c, border: `1px solid ${c}33`,
          }}>{item.text}</span>
        );
      })}
    </div>
  );
}

function ProsCons({ pros, cons, t }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '20px 0' }}>
      <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${t.green}25`, background: t.green + '08' }}>
        <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.green, marginBottom: 10 }}>✓ Zalety</h4>
        {pros.map((p, i) => (
          <div key={i} style={{ padding: '4px 0', fontSize: '0.92rem', paddingLeft: 22, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, color: t.green, fontWeight: 700 }}>✓</span>{p}
          </div>
        ))}
      </div>
      <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${t.red}25`, background: t.red + '08' }}>
        <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.red, marginBottom: 10 }}>✕ Ograniczenia</h4>
        {cons.map((c, i) => (
          <div key={i} style={{ padding: '4px 0', fontSize: '0.92rem', paddingLeft: 22, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, color: t.red, fontWeight: 700 }}>✕</span>{c}
          </div>
        ))}
      </div>
    </div>
  );
}

function Callout({ icon, children, t }) {
  return (
    <div style={{
      background: t.accentGlow, border: `1px solid ${t.accent}40`, borderRadius: 12,
      padding: '20px 24px', margin: '20px 0', display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ fontSize: 22, minWidth: 28, textAlign: 'center' }}>{icon}</div>
      <div style={{ fontSize: '0.95rem', color: t.text, lineHeight: 1.65 }}>{children}</div>
    </div>
  );
}

function TechCard({ icon, title, subtitle, children, t }) {
  return (
    <div style={{
      background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16,
      padding: '36px 36px 36px 40px', marginBottom: 28, position: 'relative', overflow: 'hidden',
      borderLeft: `4px solid ${t.accent}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, minWidth: 48, borderRadius: 12, display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: 22,
          background: t.accentGlow, border: `1px solid ${t.accent}33`,
        }}>{icon}</div>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.5rem', color: t.textBright, lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.88rem', color: t.textDim, marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionHeader({ num, title, lead, t }) {
  return (
    <>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: t.accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>{num}</span>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: t.textBright, lineHeight: 1.15, marginBottom: 14 }}>{title}</h2>
      {lead && <p style={{ fontSize: '1.05rem', color: t.textDim, maxWidth: 680, marginBottom: 40, fontWeight: 300, lineHeight: 1.6 }}>{lead}</p>}
    </>
  );
}

// ─── Main Page ───

export default function ZnakowaniePage() {
  const [isDark] = useDarkMode();
  const t = isDark ? dark : light;
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => {
      let current = '';
      NAV_ITEMS.forEach(({ id }) => {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 140) current = id;
      });
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionStyle = { padding: '80px 0', borderBottom: `1px solid ${t.border}` };
  const containerStyle = { maxWidth: 1100, margin: '0 auto', padding: '0 24px' };

  return (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif", background: t.bg, color: t.text, lineHeight: 1.7, fontSize: 17, minHeight: '100vh' }}>

      <Nav current="/tools/znakowanie" />

      {/* ─── SIDE NAV ─── */}
      <div style={{
        position: 'fixed', top: '50%', right: 16, transform: 'translateY(-50%)',
        zIndex: 900, display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        {NAV_ITEMS.map(n => {
          const active = activeSection === n.id;
          return (
            <button key={n.id} onClick={() => scrollTo(n.id)} title={n.label} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
              background: active ? t.accentGlow : 'transparent',
              border: `1px solid ${active ? t.accent + '60' : 'transparent'}`,
              borderRadius: 6, cursor: 'pointer', textAlign: 'left',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: active ? t.accent : t.textDim, opacity: active ? 1 : 0.45,
                transition: 'all 0.15s',
              }} />
              <span style={{
                fontSize: 11, fontWeight: active ? 700 : 400,
                color: active ? t.accentLight : t.textDim,
                transition: 'all 0.15s',
              }}>{n.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── HERO ─── */}
      <header style={{
        minHeight: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', textAlign: 'center', padding: '80px 24px',
        background: `radial-gradient(ellipse at 30% 20%, ${t.accent}12 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, ${t.accent}08 0%, transparent 50%), ${t.bg}`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px',
          border: `1px solid ${t.border}`, borderRadius: 100, fontSize: 13,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: t.accentLight,
          marginBottom: 36, background: t.bgCard,
        }}>
          <span style={{ width: 8, height: 8, background: t.accent, borderRadius: '50%' }} />
          Przewodnik wewnętrzny · DTP & Produkcja
        </div>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', color: t.textBright,
          lineHeight: 1.05, marginBottom: 20, letterSpacing: '-0.02em',
        }}>
          Znakowanie<br /><span style={{ color: t.accentLight, fontStyle: 'italic' }}>Odzieży</span>
        </h1>
        <p style={{ fontSize: '1.15rem', color: t.textDim, maxWidth: 620, marginBottom: 40, fontWeight: 300 }}>
          Kompletny przegląd technik druku, haftu i znakowania — od sitodruku plastizolowego po sublimację fullprint.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          {[
            { id: 'sitodruk', icon: '🖌', label: 'Sitodruk' },
            { id: 'haft', icon: '🧵', label: 'Haft' },
            { id: 'dtg-dtf', icon: '🖨', label: 'DTG / DTF' },
            { id: 'sublimacja', icon: '🌈', label: 'Sublimacja' },
            { id: 'flex', icon: '📐', label: 'Flex / Flock' },
            { id: 'tabela', icon: '📊', label: 'Porównanie' },
            { id: 'bledy', icon: '⚠', label: 'Błędy' },
            { id: 'decyzja', icon: '🎯', label: 'Kiedy co?' },
          ].map(b => (
            <button key={b.id} onClick={() => scrollTo(b.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
              background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8,
              color: t.text, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{b.icon} {b.label}</button>
          ))}
        </div>
      </header>

      {/* ─── ZASADA ─── */}
      <section style={sectionStyle}>
        <div style={containerStyle}>
          <Callout icon="💡" t={t}>
            <strong style={{ color: t.accentLight }}>Nie istnieje jedna „najlepsza" metoda znakowania.</strong> Dobór wynika z pięciu rzeczy: nakładu, charakteru grafiki, materiału, koloru podłoża i pożądanego efektu dotykowego.
          </Callout>
        </div>
      </section>

      {/* ═══════ SITODRUK ═══════ */}
      <section id="sitodruk" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="01 — Sitodruk" title="Królestwo Farb i Efektów" lead="W sitodruku to farba zmienia wszystko: od przygotowania pliku, przez chwyt nadruku, po trwałość i cenę." t={t} />

          <TechCard icon="🎨" title="Plastizol" subtitle={'Klasyk sitodruku — farba na bazie PVC, leży \u201Ena\u201D włóknie'} t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Najpopularniejsza farba sitodrukowa. Nie zastyga na sicie, schnie pod wpływem wysokiej temperatury. Daje mocne, kryjące kolory — nawet na czarnym.</p>
            <Tags items={[
              { text: 'Duże nakłady', color: 'green' }, { text: '1–4 kolory', color: 'green' },
              { text: 'Bawełna + blendy', color: 'blue' }, { text: 'Jasne & ciemne', color: 'yellow' },
            ]} t={t} />
            <ProsCons
              pros={['Żywe, mocno kryjące kolory', 'Ostre krawędzie, wysoka powtarzalność', 'Super trwałość, tolerancyjny proces', 'Świetnie na jasnych i ciemnych (z poddrukiem)', 'Najprostszy w obsłudze z farb sitodrukowych']}
              cons={['Cięższy chwyt — wyczuwalna „gumowa" warstwa', 'Duże aple mało oddychają (lato!)', 'Każdy kolor = osobne sito = koszt rośnie', 'Przejścia tonalne tylko przez raster', 'Na poliestrze ryzyko migracji barwnika']}
              t={t} />
            <Callout icon="🎯" t={t}>
              <strong style={{ color: t.accentLight }}>Najlepsze wzory:</strong> Typografia, grafika flat, ilustracje wektorowe, znaki brandowe.<br />
              <strong style={{ color: t.accentLight }}>Słabiej:</strong> Zdjęcia, subtelne malarskie przejścia, ultra-drobna kreska.
            </Callout>
          </TechCard>

          <TechCard icon="💧" title="Farby Wodne" subtitle="Water-based — barwnik wnika we włókno, miękki chwyt" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Wnika w strukturę bawełny — nadruk bardzo miękki, oddychający. Wybór premium. Trudniejsze procesowo: zasychanie w sicie.</p>
            <Tags items={[
              { text: 'Premium soft-hand', color: 'green' }, { text: 'Vintage / modowe', color: 'green' },
              { text: '100% bawełna', color: 'blue' }, { text: 'Najlepiej na jasnych', color: 'yellow' },
            ]} t={t} />
            <ProsCons
              pros={['Ultra-miękki chwyt — nadruk „w" materiale', 'Oddychające, ekologiczne', 'Bardzo dobry detal na wysokich meshach', 'Idealne na premium T-shirty jasne/średnie']}
              cons={['Trudniejszy proces — zasychanie w sicie', 'Na ciemnych wymaga białego poddruku', 'Mniej tolerancyjna niż plastizol', 'Na syntetykach i blendach więcej ryzyk']}
              t={t} />
          </TechCard>

          <TechCard icon="⚗️" title="Wywab (Discharge)" subtitle="Gamechanger na ciemnych — odbarwia tkaninę i wprowadza nowy kolor" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Pasta z wywabiaczem „wyżera" barwnik materiału i zastępuje nowym kolorem. Zero grubości, zero „skorupy", koszulka oddycha w 100%.</p>
            <Tags items={[
              { text: 'Ciemne koszulki premium', color: 'purple' }, { text: 'Zero chwytu', color: 'green' },
              { text: '100% bawełna', color: 'blue' }, { text: 'Nie na poliester', color: 'red' },
            ]} t={t} />
            <ProsCons
              pros={['Nadruk staje się częścią materiału', 'Zero wyczuwalnej warstwy', 'Świetne na vintage, modowe, streetwear', 'Żywe kolory na ciemnym bez plastikowego poddruku']}
              cons={['Tylko 100% bawełna z barwnikami reaktywnymi', 'Dwie czarne koszulki mogą dać inny wynik!', 'Brak precyzji PMS — kolor zależy od koszulki', 'Wymaga wyżarzenia + wentylacji', 'Koszulka wymaga prania przed sprzedażą']}
              t={t} />
            <Callout icon="⚠️" t={t}>
              <strong style={{ color: t.accentLight }}>Pułapka:</strong> Różni producenci barwią koszulki różnymi barwnikami. Ta sama „czarna" koszulka od dwóch marek może się rozładować do zupełnie innego koloru. Zawsze test na realnym blanku!
            </Callout>
          </TechCard>

          <TechCard icon="🧊" title="Puff / 3D" subtitle="Farba puchnąca — wypukły, gąbczasty efekt" t={t}>
            <Tags items={[
              { text: 'Efekt specjalny', color: 'purple' }, { text: 'Streetwear / retro', color: 'green' },
              { text: 'Nie do detalu', color: 'red' },
            ]} t={t} />
            <ProsCons
              pros={['Wow-efekt — widoczna, dotykalna wypukłość', 'Świetne na grubą typografię, ikony', 'Dobrze na bawełnie i stabilnych dzianinach']}
              cons={['Brak detalu — cienkie linie zlewają się', 'Efekt zależny od grubości warstwy i temperatury', 'Nie do małych fontów i skomplikowanych kształtów']}
              t={t} />
          </TechCard>

          <TechCard icon="🔲" title="High Density (HD 3D)" subtitle="Ostre, kanciaste, twarde krawędzie — jak gumowa naszywka" t={t}>
            <Tags items={[
              { text: 'Premium logo', color: 'purple' }, { text: 'Streetwear / sport', color: 'green' },
              { text: 'Grube bluzy', color: 'blue' },
            ]} t={t} />
            <ProsCons
              pros={['Efekt gumowej naszywki bez naszywki', 'Ostre krawędzie, kontrolowana wysokość', 'Premium look na małych elementach']}
              cons={['Nie do ilustracji, zdjęć, złożonych kompozycji', 'Wymaga prostych brył, większych kształtów', 'Na cienkich T-shirtach może być za ciężki']}
              t={t} />
          </TechCard>

          <TechCard icon="✨" title="Inne efekty sitodruku" subtitle="Metaliczne, brokatowe, odblaskowe, świecące, crack, foil…" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Narzędzia do pojedynczych dropów i efektów specjalnych, nie baza kolekcji.</p>
            <Callout icon="📏" t={t}>
              <strong style={{ color: t.accentLight }}>Zasada:</strong> Im bardziej „efektowa" farba, tym bardziej trzeba upraszczać projekt i testować na realnym materiale.
            </Callout>
          </TechCard>

          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 8px' }}>📸 Przykłady — Sitodruk</h3>
          <PhotoGallery photos={PHOTOS.sitodruk} t={t} />
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 12px' }}>📹 Filmy — Sitodruk w praktyce</h3>
          <VideoGrid videos={VIDEOS.sitodruk} t={t} />
        </div>
      </section>

      {/* ═══════ HAFT ═══════ */}
      <section id="haft" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="02 — Haft" title="Premium Nicią" lead="Haft to nie druk — to budowanie grafiki nicią. Digitizing to osobny proces." t={t} />
          <TechCard icon="🧵" title="Haft maszynowy" subtitle="Logo, monogramy, emblematy — efekt premium na grubych materiałach" t={t}>
            <Tags items={[
              { text: 'Premium / Heritage', color: 'green' }, { text: 'Czapki / Bluzy / Kurtki', color: 'green' },
              { text: 'Nie do zdjęć!', color: 'red' }, { text: 'Wymaga digitizingu', color: 'yellow' },
            ]} t={t} />
            <ProsCons
              pros={['Efekt premium, trwałość, prestiż', 'Świetnie na czapkach, bluzach, kurtkach', 'Działa na jasnych i ciemnych (kolor = nić)', 'Logo, monogramy, emblematy, heritage']}
              cons={['NIE do mikro-detalu — mały tekst, cienkie szeryfy', 'Nie do zdjęć, gradientów, złożonych ilustracji', 'Na cienkich T-shirtach falowanie, ściąganie', 'Zbyt dużo kolorów = złożoność + brak wartości']}
              t={t} />
            <Callout icon="🚨" t={t}>
              <strong style={{ color: t.accentLight }}>Najczęstszy błąd:</strong> Projektowanie haftu jak nadruku. Wymaga uproszczenia, pogrubienia, ograniczenia kolorów.
            </Callout>
          </TechCard>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 8px' }}>📸 Przykłady — Haft</h3>
          <PhotoGallery photos={PHOTOS.haft} t={t} />
          <VideoGrid videos={VIDEOS.haft} t={t} />
        </div>
      </section>

      {/* ═══════ DTG / DTF ═══════ */}
      <section id="dtg-dtf" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="03 — Druk cyfrowy" title="DTG & DTF" lead="Rewolucja krótkich serii i pełnego koloru." t={t} />

          <TechCard icon="🖨" title="DTG — Direct to Garment" subtitle="Drukarka atramentowa, do której zamiast papieru wkładasz koszulkę" t={t}>
            <Tags items={[
              { text: 'Full-color / Zdjęcia', color: 'green' }, { text: 'Od 1 sztuki', color: 'green' },
              { text: 'Głównie bawełna', color: 'blue' }, { text: 'Ciemne = pretreat', color: 'yellow' },
            ]} t={t} />
            <ProsCons
              pros={['Pełen kolor, zdjęcia, gradienty', 'Brak kosztów matryc — od 1 szt.', 'Świetny detal i przejścia tonalne']}
              cons={['Przy dużych nakładach przegrywa z sitem', 'Ciemne koszulki = pretreat + ślad', 'Najlepiej na bawełnie, słabiej na syntetykach']}
              t={t} />
          </TechCard>

          <TechCard icon="📋" title="DTF — Direct to Film" subtitle="Największy hit — druk na folii PET + proszek klejowy + prasa" t={t}>
            <Tags items={[
              { text: 'Uniwersalne materiałowo', color: 'green' }, { text: 'Full-color', color: 'green' },
              { text: 'Małe i średnie serie', color: 'green' }, { text: 'Wyczuwalny transfer', color: 'yellow' },
            ]} t={t} />
            <ProsCons
              pros={['Ekstremalnie wszechstronny materiałowo', 'Ostre kolory, pełne przejścia tonalne', 'Bardzo trwałe (często bardziej niż DTG)', 'Bawełna, poliester, nylon, softshell, skóra']}
              cons={['Wyczuwalna warstwa „naklejki"', 'Mniej oddychające niż wodny/discharge', 'Duże aple mniej szlachetne od premium sita']}
              t={t} />
          </TechCard>

          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 8px' }}>📸 Przykłady — DTG & DTF</h3>
          <PhotoGallery photos={PHOTOS.dtg} t={t} />
          <VideoGrid videos={VIDEOS.dtg} t={t} />
        </div>
      </section>

      {/* ═══════ SUBLIMACJA ═══════ */}
      <section id="sublimacja" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="04 — Sublimacja" title="Sublimacja & Fullprint" lead="Barwnik pod wpływem temperatury zamienia się w gaz i trwale wnika w poliestrowe włókna." t={t} />
          <TechCard icon="🌈" title="Sublimacja / All-over Print" subtitle={'Pełny zadruk \u201Eod szwu do szwu\u201D'} t={t}>
            <Tags items={[
              { text: '100% niewyczuwalny', color: 'green' }, { text: 'Pełny zadruk bryły', color: 'green' },
              { text: 'Tylko poliester!', color: 'red' }, { text: 'Brak na ciemnym', color: 'red' },
            ]} t={t} />
            <ProsCons
              pros={['Nadruk = materiał, zero warstwy', 'Nigdy nie spierze się, nie wyblaknie', 'Fullprint: wzór od przodu do tyłu', 'Idealne na sport, leginsy']}
              cons={['TYLKO jasny poliester', 'Na bawełnie się spierze', 'Nie da się drukować na ciemnym', 'Fullprint wymaga projektowania pod wykroje']}
              t={t} />
            <Callout icon="📐" t={t}>
              <strong style={{ color: t.accentLight }}>Dla grafików:</strong> Fullprint to nie „front 30 × 40 cm". Projektuj pod wykroje, szwy, tolerancje szycia. Model cut-and-sew.
            </Callout>
          </TechCard>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 8px' }}>📸 Przykłady — Sublimacja</h3>
          <PhotoGallery photos={PHOTOS.sublimacja} t={t} />
          <VideoGrid videos={VIDEOS.sublimacja} t={t} />
        </div>
      </section>

      {/* ═══════ FLEX / FLOCK ═══════ */}
      <section id="flex" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="05 — Folie termotransferowe" title="Flex, Flock & HTV" lead="Wycinane ploterem, wgrzewane prasą. Szybkie wdrożenie, personalizacja." t={t} />
          <TechCard icon="📐" title="Flex / Flock / HTV" subtitle="Folie termotransferowe — ploter tnący + prasa" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}><strong>Flex</strong> = gładka folia. <strong>Flock</strong> = faktura weluru. <strong>HTV</strong> = szeroka kategoria.</p>
            <Tags items={[
              { text: 'Personalizacja', color: 'green' }, { text: 'Nazwiska / numery', color: 'green' },
              { text: 'Tylko wektory', color: 'yellow' }, { text: 'Brak gradientów', color: 'red' },
            ]} t={t} />
            <ProsCons
              pros={['Wysoka trwałość, ostre krawędzie', 'Szybkie wdrożenie', 'Wszechstronność materiałowa']}
              cons={['Tylko wektory — brak przejść tonalnych', 'Wiele kolorów = wiele warstw = grubość', 'Przy dużych aplach efekt „foliowy"']}
              t={t} />
          </TechCard>

          <TechCard icon="🔄" title="Transfer sitodrukowy" subtitle="Sitodruk na nośniku → wgrzanie w odzież" t={t}>
            <p style={{ color: t.text }}>Nadruk sitodrukiem na papierze transferowym, potem wgrzewany w koszulkę. Małe i średnie serie, logotypy, numery.</p>
          </TechCard>

          <TechCard icon="🏷" title="Naszywki, Emblematy, Chenille" subtitle="Osobna kategoria premium" t={t}>
            <p style={{ color: t.text }}>Świetne dla czapek, bluz, odzieży wierzchniej, linii heritage lub varsity.</p>
          </TechCard>

          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 8px' }}>📸 Przykłady — Flex & HTV</h3>
          <PhotoGallery photos={PHOTOS.flex} t={t} />
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 12px' }}>📹 Filmy — Flex & HTV w praktyce</h3>
          <VideoGrid videos={VIDEOS.flex} t={t} />
        </div>
      </section>

      {/* ═══════ TABELA ═══════ */}
      <section id="tabela" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="06 — Porównanie" title="Macierz Decyzyjna" lead="Szybki przegląd — co działa gdzie." t={t} />
          <div style={{ overflowX: 'auto', borderRadius: 12, border: `1px solid ${t.border}`, margin: '24px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: 800 }}>
              <thead>
                <tr style={{ background: t.bgCardAlt }}>
                  {['Metoda', 'Detal', 'Kolory', 'Chwyt', 'Bawełna', 'Poliester', 'Ciemne', 'Nakład'].map(h => (
                    <th key={h} style={{
                      padding: '12px 14px', textAlign: 'left', fontWeight: 700, fontSize: 12,
                      textTransform: 'uppercase', letterSpacing: '0.08em', color: t.accentLight,
                      borderBottom: `2px solid ${t.accent}`, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((r, i) => (
                  <tr key={i} style={{ background: t.bgCard }}>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, fontWeight: 700, color: t.textBright, whiteSpace: 'nowrap' }}>{r.method}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>{r.detail}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>{r.colors}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>{r.feel}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, color: t[r.cottonColor] }}>{r.cotton}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, color: t[r.polyColor] }}>{r.poly}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}`, color: t[r.darkColor] }}>{r.darkBg}</td>
                    <td style={{ padding: '10px 14px', borderBottom: `1px solid ${t.border}` }}>{r.volume}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ═══════ MATERIAŁY ═══════ */}
      <section id="material" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="07 — Materiały" title="Dopasowanie do Tkaniny" lead="Najpierw włókno i temperatura — potem metoda." t={t} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: '24px 0' }}>
            {[
              { emoji: '🧶', title: '100% Bawełna', desc: 'Wodny, discharge, plastizol, DTG, haft.' },
              { emoji: '🧵', title: 'Bawełna + Elastan', desc: 'Plastizol, DTF, transfery. Haft z uwagą.' },
              { emoji: '⚡', title: 'Poliester / Sport', desc: 'Sublimacja, DTF, transfery.' },
              { emoji: '🧥', title: 'Grube bluzy', desc: 'Plastizol, puff, HD, haft, transfery.' },
            ].map((m, i) => (
              <div key={i} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 6 }}>{m.emoji}</div>
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: t.textBright, marginBottom: 6 }}>{m.title}</h4>
                <p style={{ fontSize: '0.83rem', color: t.textDim }}>{m.desc}</p>
              </div>
            ))}
          </div>
          <Callout icon="⚪" t={t}>
            <strong style={{ color: t.accentLight }}>Biały poddruk?</strong> Gdy drukujesz kolor na ciemnym materiale. Dotyczy: plastizol, DTG, część DTF. NIE dotyczy haftu (kolor = nić) ani discharge (odbarwienie).
          </Callout>
        </div>
      </section>

      {/* ═══════ BŁĘDY ═══════ */}
      <section id="bledy" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="08 — Unikaj tego" title="7 Błędów Grafika" lead="Projektowanie w oderwaniu od technologii." t={t} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, margin: '24px 0' }}>
            {MISTAKES.map((m, i) => (
              <div key={i} style={{ padding: 24, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, borderLeft: `3px solid ${t.red}` }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: t.red, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Błąd #{i + 1}</div>
                <h4 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1rem', color: t.textBright, marginBottom: 6 }}>{m.title}</h4>
                <p style={{ fontSize: '0.88rem', color: t.textDim }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ DECYZJA ═══════ */}
      <section id="decyzja" style={sectionStyle}>
        <div style={containerStyle}>
          <SectionHeader num="09 — Decyzja" title="Kiedy Co Wybrać?" lead="Scenariusz → rekomendacja." t={t} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 16, margin: '24px 0' }}>
            {DECISIONS.map((d, i) => (
              <div key={i} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 26 }}>
                <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.textDim, marginBottom: 6 }}>Scenariusz</div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.05rem', color: t.textBright, marginBottom: 10, lineHeight: 1.3 }}>{d.scenario}</div>
                <div style={{
                  display: 'inline-flex', padding: '6px 14px', background: t.accentGlow,
                  border: `1px solid ${t.accent}4d`, borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', color: t.accentLight,
                }}>→ {d.rec}</div>
                <p style={{ fontSize: '0.83rem', color: t.textDim, marginTop: 8 }}>{d.note}</p>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.2rem', color: t.textBright, margin: '40px 0 16px' }}>⚡ Ściąga</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {CHEATSHEET.map((c, i) => (
              <div key={i} style={{ padding: '12px 18px', background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: t.accentLight, fontWeight: 700, minWidth: 170 }}>{c.label}</span>
                <span style={{ color: t.text }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: '50px 0', textAlign: 'center', color: t.textDim, fontSize: 14 }}>
        <div style={containerStyle}>
          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.15rem', color: t.accentLight, marginBottom: 6 }}>Nadwyraz.com</p>
          <p>Przewodnik wewnętrzny — DTP & Produkcja · 2026</p>
        </div>
      </footer>
    </div>
  );
}
