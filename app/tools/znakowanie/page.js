'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '../../hooks/useDarkMode';
import Nav from '../../components/Nav';
import { supabase } from '../../../lib/supabase';

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
  cmyk: [
    { id: 'cutw7nrBk1c', caption: 'Separacja CMYK i Simulated Process — pełny tutorial (SpeedySep)' },
    { id: 'x4YZX0c15aM', caption: 'Sitodruk 4-kolorowy CMYK — szczegółowy tutorial (Ryonet)' },
    { id: '_XNg9DV53ek', caption: 'Separacja CMYK w Photoshopie do sitodruku (Ryonet)' },
    { id: 'S07FxeLHh0M', caption: 'CMYK w sitodruku — wskazówki dla początkujących (ZDigitizing)' },
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

// Wikimedia Commons — thumbnail URL generator (stable, free, no API key)
const W = (path, alt) => {
  const filename = path.split('/').pop();
  const thumb = filename.endsWith('.svg') ? `${filename}.png` : filename;
  return { url: `https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/400px-${thumb}`, alt };
};

const PHOTOS = {
  plastizol: [
    W('4/4a/Screen_printing_demonstration_at_TEDxUTM.jpg', 'Demonstracja sitodruku plastizolowego'),
    W('9/96/Druckvorgang-siebdruck.jpg', 'Rak sitodrukowy — nakładanie farby przez sito'),
    W('3/3d/Screen_print_squeegee_hand_bench.jpg', 'Rakiel na ławie sitodrukowej'),
    W('d/d2/Squeegee_and_ink_for_screen_printing.jpg', 'Rakiel i farba plastizolowa'),
    W('d/d7/Screen_Printing_machine.jpg', 'Karuzelowa maszyna sitodrukowa'),
    W('9/94/Silk_Screen_Machine.jpg', 'Maszyna do sitodruku'),
    W('5/5f/TeeshirtCopyleft_encrage.jpg', 'Nakładanie farby plastizolowej przez sito'),
    W('b/b9/TeeshirtCopyleft_cadre.jpg', 'Rama sitodrukowa na stanowisku'),
    W('f/f1/Screen_print_hand_bench_proffesional_print_bench_in_Squeegee_%26_Ink_studio.jpg', 'Profesjonalna ława sitodrukowa'),
    W('6/61/Typical_Screen_Printing_Example.JPG', 'Typowy efekt nadruku sitodrukowego'),
    W('0/0f/Pantallas_para_serigrafia.jpg', 'Sita do wielokolorowego sitodruku'),
    W('0/02/Screen_printing_at_NTAS.jpg', 'Sitodruk w warsztacie szkoleniowym'),
  ],
  farby_wodne: [
    W('b/bd/Washing_out_exposed_screen_printing_emulsion_01.jpg', 'Mycie sita po naświetleniu — farby wodne'),
    W('5/53/Washing_out_exposed_screen_printing_emulsion_02.jpg', 'Wywoływanie emulsji sitodrukowej'),
    W('7/72/Washing_out_exposed_screen_printing_emulsion_03.jpg', 'Sito gotowe do druku wodnego'),
    W('4/4e/Exposing_design_for_screen_printing.jpg', 'Naświetlanie sita z projektem'),
    W('c/c8/Pre_exposed_screen.jpg', 'Sito po naświetleniu przed myciem'),
    W('1/11/Pre-exposed-screen_from_Squeegee_%26_Ink_studio.jpg', 'Profesjonalne sito ze studia'),
    W('b/b6/Wash_out_booth_for_screen_printing.jpg', 'Kabina do mycia sit'),
    W('d/d0/Washing_out_the_unexposed_portions_of_the_stencil.jpg', 'Mycie nienaświetlonej emulsji'),
    W('b/b1/TeeshirtCopyleft_derniers_reglages.jpg', 'Ostatnie regulacje przed wydrukiem'),
    W('3/35/TeeshirtCopyleft_outillage.jpg', 'Narzędzia do sitodruku wodnego'),
  ],
  discharge: [
    W('8/8b/Anya_aime_les_cicatrices.jpg', 'Nadruk wywab zintegrowany z ciemną koszulką'),
    W('e/e8/2015_Atmosphere-Treefort-Credit-Steel-Brooks-9_%2816949564681%29.jpg', 'Koszulka kapeli — grafika na ciemnym tle'),
    W('7/7c/OSCAL_2017_silkscreen_printed_materials_06.jpg', 'Sitodruk na ciemnym podłożu'),
    W('b/b4/OSCAL_2017_silkscreen_printed_materials_07.jpg', 'Nadruk na ciemnej tkaninie'),
    W('3/30/OSCAL_2017_silkscreen_printed_materials_08.jpg', 'Druk discharge — zero grubości nadruku'),
    W('1/1d/OSCAL_2017_silkscreen_printed_materials_10.jpg', 'Gotowe koszulki z nadrukiem wywab'),
    W('8/8a/OSCAL_2017_silkscreen_printed_materials_11.jpg', 'Nadruk na ciemnej koszulce'),
    W('a/aa/OSCAL_2017_silkscreen_printed_materials_15.jpg', 'Efekt sitodruku discharge'),
    W('b/bf/Screen_printing_illustration_%28cropped%29.jpg', 'Koszulka z nadrukiem sitodrukowym'),
    W('9/95/Northern_Spark_%2815860092211%29.jpg', 'Koszulki z nadrukami na outdoor evencie'),
  ],
  puff: [
    W('9/97/Detalle_tinta_serigraf%C3%ADa.JPG', 'Zbliżenie na farbę — efekt puff'),
    W('2/21/Siebdruck-dickschicht.jpg', 'Gruba warstwa sitodrukowa — technika puff'),
    W('a/a4/Pad_printing_and_screen_printing_silicone_ink_-_boston_industrial_solutions.jpg', 'Silikony i specjalne farby do efektów 3D'),
    W('d/d6/Heat_press_for_fabirc_screen_printing.jpg', 'Utrwalanie termiczne nadruku puff'),
    W('d/d7/Screen_Printing_machine.jpg', 'Maszyna do sitodruku efektów specjalnych'),
    W('0/0f/Pantallas_para_serigrafia.jpg', 'Sita do druku puff'),
    W('5/5f/TeeshirtCopyleft_encrage.jpg', 'Nakładanie farby puff na sito'),
    W('4/4a/Screen_printing_demonstration_at_TEDxUTM.jpg', 'Sitodruk puff — demonstracja'),
    W('9/94/Silk_Screen_Machine.jpg', 'Sprzęt do druku puff'),
    W('6/61/Typical_Screen_Printing_Example.JPG', 'Efekt nadruku puff na tkaninie'),
  ],
  high_density: [
    W('a/a4/Pad_printing_and_screen_printing_silicone_ink_-_boston_industrial_solutions.jpg', 'Silikonowe farby HD — efekt gumowej naszywki'),
    W('2/21/Siebdruck-dickschicht.jpg', 'Gruba warstwa sitodrukowa High Density'),
    W('9/97/Detalle_tinta_serigraf%C3%ADa.JPG', 'Zbliżenie na gruby nadruk sitodrukowy'),
    W('d/d6/Heat_press_for_fabirc_screen_printing.jpg', 'Utrwalanie HD — prasa termiczna'),
    W('f/f1/Screen_print_hand_bench_proffesional_print_bench_in_Squeegee_%26_Ink_studio.jpg', 'Ława do nadruku High Density'),
    W('d/d7/Screen_Printing_machine.jpg', 'Maszyna do druku HD'),
    W('0/0f/Pantallas_para_serigrafia.jpg', 'Sita HD do precyzyjnych krawędzi'),
    W('6/61/Typical_Screen_Printing_Example.JPG', 'Przykład nadruku High Density'),
    W('3/3d/Screen_print_squeegee_hand_bench.jpg', 'Rakiel przy nadruku HD'),
    W('9/94/Silk_Screen_Machine.jpg', 'Sprzęt do druku HD'),
  ],
  haft: [
    W('3/3c/Industrial_embroidery_machine.jpg', 'Przemysłowa maszyna hafciarska'),
    W('a/ad/Bestickung_AMG_CUSTOMER_SPORTS.jpg', 'Haft na odzieży sportowej AMG'),
    W('6/6b/Modern%C3%AD%2C_v%C3%ADcejehlov%C3%BD_vy%C5%A1%C3%ADvac%C3%AD_automat.JPG', 'Nowoczesna wielogłowicowa maszyna hafciarska'),
    W('6/6a/Broideryshop_karpi_koi.jpg', 'Haft koi — studio hafciarskie'),
    W('a/a6/Hannover-Messe_2012_by-RaBoe_064.jpg', 'Maszyna hafciarska na targach'),
    W('8/81/Hannover-Messe_2012_by-RaBoe_065.jpg', 'Wielogłowicowy automat hafciarski'),
    W('6/66/Stickmaschine.jpg', 'Maszyna do haftu komputerowego'),
    W('4/4b/Bordado_Digital_del_Rostro_de_Plutarco_-_100_0812.jpg', 'Cyfrowy haft portretu — digitizing'),
    W('2/22/Lettres_brod%C3%A9es.jpg', 'Haftowane litery logo firmy'),
    W('1/15/Machine_chain_stitch.jpg', 'Ścieg łańcuszkowy maszynowy — zbliżenie'),
    W('4/46/An_embroidery_unit_in_Dharavi%2C_Mumbai.jpg', 'Jednostka hafciarska — produkcja'),
    W('7/75/Dharavi_DSC2981_%285843523374%29.jpg', 'Warsztat hafciarski w Dharavi'),
  ],
  dtg: [
    W('4/4d/DTG-shirt-by-I-Crave-Cars.jpg', 'Koszulka wydrukowana metodą DTG — pełen kolor'),
    W('8/8e/Computertoscreen.jpg', 'Cyfrowy workflow — komputer do druku'),
    W('7/74/Siebdruck_2.jpg', 'Precyzyjny nadruk cyfrowy na tkaninie'),
    W('a/a8/Direktsiebdruckschablone.jpg', 'Bezpośredni nadruk cyfrowy — emulsja'),
    W('2/27/Direktschicht-siebdruck.jpg', 'Bezpośrednia warstwa druku cyfrowego'),
    W('b/bf/Screen_printing_illustration_%28cropped%29.jpg', 'Koszulka z nadrukiem DTG'),
    W('8/8b/Anya_aime_les_cicatrices.jpg', 'Grafika na koszulce — efekt DTG'),
    W('e/e8/2015_Atmosphere-Treefort-Credit-Steel-Brooks-9_%2816949564681%29.jpg', 'Kolorowy nadruk — pełna paleta DTG'),
    W('6/61/Typical_Screen_Printing_Example.JPG', 'Efekt wydruku cyfrowego na koszulce'),
    W('4/4a/Screen_printing_demonstration_at_TEDxUTM.jpg', 'Druk cyfrowy w warsztacie'),
  ],
  dtf: [
    W('1/15/A_graphic_designer_transferring_an_impression_on_to_a_shirt_with_heat_press.jpg', 'Wgrzewanie transferu DTF prasą termiczną'),
    W('d/d6/Heat_press_for_fabirc_screen_printing.jpg', 'Prasa termiczna do wgrzewania DTF'),
    W('4/4d/DTG-shirt-by-I-Crave-Cars.jpg', 'Efekt nadruku transferowego — DTF'),
    W('b/b9/TeeshirtCopyleft_cadre.jpg', 'Przygotowanie koszulki do transferu'),
    W('5/5f/TeeshirtCopyleft_encrage.jpg', 'Aplikacja transferu DTF na tkaninę'),
    W('b/b1/TeeshirtCopyleft_derniers_reglages.jpg', 'Finalizacja nadruku DTF'),
    W('9/97/Detalle_tinta_serigraf%C3%ADa.JPG', 'Zbliżenie na nadruk transferowy'),
    W('8/8b/Anya_aime_les_cicatrices.jpg', 'Koszulka z nadrukiem DTF'),
    W('e/e8/2015_Atmosphere-Treefort-Credit-Steel-Brooks-9_%2816949564681%29.jpg', 'Kolorowy nadruk DTF na koszulce'),
    W('a/aa/OSCAL_2017_silkscreen_printed_materials_15.jpg', 'Seria DTF — gotowe produkty'),
  ],
  sublimacja: [
    W('e/e4/RGB_dye_sublimation_panels.jpg', 'Panele barwników do druku sublimacyjnego'),
    W('1/1c/Dye_sublimation_printing_insecurity.jpg', 'Druk sublimacyjny — przykład produktu'),
    W('1/15/A_graphic_designer_transferring_an_impression_on_to_a_shirt_with_heat_press.jpg', 'Prasa sublimacyjna — wgrzewanie barwnika'),
    W('d/d6/Heat_press_for_fabirc_screen_printing.jpg', 'Prasa termiczna do sublimacji'),
    W('b/b4/OSCAL_2017_silkscreen_printed_materials_22.jpg', 'Pełny zadruk — gotowy produkt sublimacja'),
    W('d/d2/OSCAL_2017_silkscreen_printed_materials_16.jpg', 'Żywe kolory druku sublimacyjnego'),
    W('d/d6/OSCAL_2017_silkscreen_printed_materials_17.jpg', 'Nadruki allover — seria sublimacja'),
    W('4/46/OSCAL_2017_silkscreen_printed_materials_26.jpg', 'Koszulki z pełnym nadrukiem'),
    W('b/b6/OSCAL_2017_silkscreen_printed_materials_27.jpg', 'Wzory sublimacyjne na odzieży'),
    W('e/e2/OSCAL_2017_silkscreen_printed_materials_30.jpg', 'Kolekcja sublimacyjna'),
  ],
  cmyk: [
    W('8/86/Siebdruck-raster.jpg', 'Raster sitodrukowy — efekt CMYK pod lupą'),
    W('4/42/Moire_serigraphie_yann_owens_jean-noel_lafargue_1.jpg', 'Moiré w sitodruku — błędne kąty rastra'),
    W('c/cf/Moire_serigraphie_yann_owens_jean-noel_lafargue_2.jpg', 'Efekt mory między sitami'),
    W('0/06/Moire_serigraphie_yann_owens_jean-noel_lafargue_3.jpg', 'Analiza rastra CMYK — kąty'),
    W('b/b5/Moire_serigraphie_yann_owens_jean-noel_lafargue_4.jpg', 'Prawidłowy raster CMYK'),
    W('b/bc/Moire_serigraphie_yann_owens_jean-noel_lafargue_5.jpg', 'Nakładające się sita rastrowe'),
    W('0/03/Moire_serigraphie_yann_owens_jean-noel_lafargue_6.jpg', 'Finał rastra — żądany efekt CMYK'),
    W('4/44/Hand_painted_color_separation_on_transparent_overlay.png', 'Ręczna separacja barwna na folii'),
    W('4/4b/Reduktionssiebdruck.jpg', 'Sitodruk redukcyjny — technika wielobarwna'),
    W('4/46/Screen_printing_machine_with_ventilation_system.jpg', 'Maszyna 4-kolorowa z wentylacją'),
    W('6/60/AZ_Precision_Graphics.jpg', 'Precyzyjna grafika — produkcja CMYK'),
    W('a/ac/Screen_printing_faktory_in_Kiryat_Hamelacha_Tel_Aviv.jpg', 'Fabryka sitodruku — produkcja CMYK'),
  ],
  simulated: [
    W('8/8b/Anya_aime_les_cicatrices.jpg', 'Koszulka z symulowanym wydrukiem na ciemnej'),
    W('e/e8/2015_Atmosphere-Treefort-Credit-Steel-Brooks-9_%2816949564681%29.jpg', 'Skomplikowana grafika — simulated process'),
    W('7/7c/OSCAL_2017_silkscreen_printed_materials_06.jpg', 'Wielokolorowy sitodruk na ciemnym tle'),
    W('b/b4/OSCAL_2017_silkscreen_printed_materials_07.jpg', 'Fotorealizm na ciemnej koszulce'),
    W('4/4e/OSCAL_2017_silkscreen_printed_materials_28.jpg', 'Symulacja procesowa — wydrukowane materiały'),
    W('c/c4/OSCAL_2017_silkscreen_printed_materials_29.jpg', 'Sitodruk wielokolorowy — dark shirt'),
    W('e/e2/OSCAL_2017_silkscreen_printed_materials_30.jpg', 'Precyzyjny nadruk z wieloma sitami'),
    W('5/5e/OSCAL_2017_silkscreen_printed_materials_32.jpg', 'Skomplikowana grafika — symulacja'),
    W('4/4b/Reduktionssiebdruck.jpg', 'Sitodruk redukcyjny — blisko symulacji procesowej'),
    W('a/ac/Screen_printing_faktory_in_Kiryat_Hamelacha_Tel_Aviv.jpg', 'Produkcja wielositowa — simulated process'),
  ],
  flex: [
    W('c/c0/Illustration_flex-foil_cutting-plotter_english.svg', 'Schemat plotera tnącego folię flex/HTV'),
    W('7/75/Illustration_flex-foil_cutting-plotter_german.svg', 'Diagram techniczny — ploter do folii HTV'),
    W('c/ce/Beflockung.jpg', 'Flock — aplikacja aksamitnej powłoki na tkaninę'),
    W('9/90/Messereinstellung_flockfolie.jpg', 'Ustawienie noża plotera dla folii flokowej'),
    W('1/15/A_graphic_designer_transferring_an_impression_on_to_a_shirt_with_heat_press.jpg', 'Wgrzewanie folii HTV prasą termiczną'),
    W('d/d6/Heat_press_for_fabirc_screen_printing.jpg', 'Prasa termiczna do wgrzewania flex'),
    W('b/b9/TeeshirtCopyleft_cadre.jpg', 'Przygotowanie stanowiska do wgrzewania'),
    W('3/3d/Screen_print_squeegee_hand_bench.jpg', 'Narzędzia do personalizacji odzieży'),
    W('8/8b/Anya_aime_les_cicatrices.jpg', 'Koszulka z nadrukiem foliowym'),
    W('e/e8/2015_Atmosphere-Treefort-Credit-Steel-Brooks-9_%2816949564681%29.jpg', 'Personalizacja koszulki — efekt flex'),
    W('a/aa/OSCAL_2017_silkscreen_printed_materials_15.jpg', 'Spersonalizowane koszulki — seria HTV'),
    W('6/61/Typical_Screen_Printing_Example.JPG', 'Precyzyjny nadruk foliowy na koszulce'),
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

function parseDesc(text) {
  if (!text?.trim()) return [];
  return text.split('\n').map(line => {
    const idx = line.indexOf(':');
    if (idx > 0) return { key: line.slice(0, idx).trim(), val: line.slice(idx + 1).trim() };
    return { key: null, val: line.trim() };
  }).filter(l => l.val);
}

function DescCard({ text, t }) {
  const lines = parseDesc(text);
  if (!lines.length) return null;
  return (
    <div style={{
      borderTop: `2px solid ${t.yellow}`,
      background: t.yellow + '10',
      padding: '8px 10px',
    }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: 11, lineHeight: 1.65 }}>
          {l.key
            ? <><span style={{ color: t.yellow, fontWeight: 700 }}>{l.key}:</span>{' '}<span style={{ color: t.text }}>{l.val}</span></>
            : <span style={{ color: t.textDim }}>{l.val}</span>
          }
        </div>
      ))}
    </div>
  );
}

function PhotoGallery({ photos, t, onPhotoClick, editMode, onDelete, onSaveDescription, onStartAdd, onCancelAdd, addingActive, newPhoto, onNewPhotoChange, onConfirmAdd }) {
  const [expanded, setExpanded] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editingText, setEditingText] = useState('');
  const visible = expanded ? photos : photos.slice(0, 3);
  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {visible.map((p, i) => {
          const key = p.id || ('local-' + i);
          const isEditing = editingKey === key;
          return (
            <div key={key} style={{
              borderRadius: 10, overflow: 'hidden', border: `1px solid ${t.border}`,
              background: t.bgCardAlt,
              cursor: editMode ? 'default' : 'zoom-in',
            }}
              onClick={() => !editMode && onPhotoClick?.({ url: p.url, alt: p.alt, description: p.description })}
            >
              <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                <img src={p.url} alt={p.alt}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  referrerPolicy="no-referrer"
                  onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.innerHTML = `<span style="font-size:11px;color:#888;padding:8px;text-align:center;display:block">${p.alt}</span>`; }}
                />
                {editMode && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); onDelete?.(p.id, p._isLocal, p._localIdx); }}
                      title="Usuń zdjęcie"
                      style={{
                        position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(200,0,0,0.88)', border: '2px solid rgba(255,255,255,0.5)',
                        color: '#fff', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                      }}
                    >×</button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingKey(key); setEditingText(p.description || ''); }}
                      title="Edytuj opis"
                      style={{
                        position: 'absolute', top: 5, right: 36, width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(184,118,58,0.9)', border: '2px solid rgba(255,255,255,0.5)',
                        color: '#fff', fontSize: 13, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✎</button>
                  </>
                )}
              </div>
              {isEditing ? (
                <div style={{ padding: 10, borderTop: `2px solid ${t.yellow}`, background: t.yellow + '10' }} onClick={e => e.stopPropagation()}>
                  <textarea
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    placeholder={'Podłoże: bawełna 100%\nIlość kolorów: 4\nTechnika: plastizol\nMiękkość chwytu: 3/5'}
                    rows={4}
                    autoFocus
                    style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${t.border}`, background: t.bgCard, color: t.text, fontSize: 11, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { onSaveDescription?.(p.id, p._isLocal, p._localIdx, editingText); setEditingKey(null); }}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 6, background: t.accent, border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}
                    >Zapisz</button>
                    <button
                      onClick={() => setEditingKey(null)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 6, background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim, fontSize: 11, cursor: 'pointer' }}
                    >Anuluj</button>
                  </div>
                </div>
              ) : (
                <DescCard text={p.description} t={t} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {photos.length > 3 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8, border: `1px solid ${t.border}`,
            background: 'transparent', color: t.textDim, fontSize: 13, cursor: 'pointer',
          }}>
            {expanded ? '▲ Zwiń' : `▼ Pokaż więcej zdjęć (${photos.length - 3})`}
          </button>
        )}
        {editMode && !addingActive && (
          <button onClick={onStartAdd} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 16px', borderRadius: 8, border: `1px dashed ${t.accent}`,
            background: 'transparent', color: t.accent, fontSize: 13, cursor: 'pointer',
          }}>
            + Dodaj zdjęcie
          </button>
        )}
      </div>

      {editMode && addingActive && (
        <div style={{ marginTop: 12, padding: 16, borderRadius: 10, border: `1px solid ${t.accent}40`, background: t.accentGlow }}>
          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 6 }}>URL zdjęcia</div>
          <input
            type="url"
            value={newPhoto?.url || ''}
            onChange={e => onNewPhotoChange({ ...newPhoto, url: e.target.value })}
            placeholder="https://..."
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, color: t.text, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 6 }}>Tytuł / alt (krótko)</div>
          <input
            type="text"
            value={newPhoto?.alt || ''}
            onChange={e => onNewPhotoChange({ ...newPhoto, alt: e.target.value })}
            placeholder="Np. Sitodruk plastizolowy na ciemnym podłożu"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, color: t.text, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
          />
          <div style={{ fontSize: 12, color: t.textDim, marginBottom: 6 }}>Opis / info <span style={{ opacity: 0.5 }}>(opcjonalne — pojawi się pod zdjęciem)</span></div>
          <textarea
            value={newPhoto?.description || ''}
            onChange={e => onNewPhotoChange({ ...newPhoto, description: e.target.value })}
            placeholder="Dodatkowe info, np. technika, szczegóły, uwagi..."
            rows={3}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bgCard, color: t.text, fontSize: 13, marginBottom: 12, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onConfirmAdd} disabled={!newPhoto?.url?.trim()} style={{ padding: '8px 20px', borderRadius: 8, background: t.accent, border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
              Zapisz
            </button>
            <button onClick={onCancelAdd} style={{ padding: '8px 20px', borderRadius: 8, background: 'transparent', border: `1px solid ${t.border}`, color: t.textDim, fontSize: 13, cursor: 'pointer' }}>
              Anuluj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Lightbox({ photo, onClose, t }) {
  useEffect(() => {
    if (!photo) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photo, onClose]);

  if (!photo) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.93)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff', fontSize: 24, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>×</button>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={photo.url}
          alt={photo.alt}
          referrerPolicy="no-referrer"
          style={{ maxWidth: '90vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 10, display: 'block' }}
        />
        {photo.alt && (
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 10, textAlign: 'center', maxWidth: 700 }}>{photo.alt}</div>
        )}
        {photo.description && (
          <div style={{ marginTop: 10, maxWidth: 560, width: '100%', borderRadius: 10, overflow: 'hidden', border: `2px solid ${t.yellow}`, background: t.yellow + '12' }}>
            {parseDesc(photo.description).map((l, i) => (
              <div key={i} style={{ padding: '5px 14px', fontSize: 13, lineHeight: 1.7, borderBottom: i < parseDesc(photo.description).length - 1 ? `1px solid ${t.yellow}28` : 'none' }}>
                {l.key
                  ? <><span style={{ color: t.yellow, fontWeight: 700 }}>{l.key}:</span>{' '}<span style={{ color: '#fff' }}>{l.val}</span></>
                  : <span style={{ color: 'rgba(255,255,255,0.7)' }}>{l.val}</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>
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

  // Photo management
  const [lightbox, setLightbox] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [user, setUser] = useState(null);
  const [dbPhotos, setDbPhotos] = useState({});
  const [addingTo, setAddingTo] = useState(null);
  const [newPhoto, setNewPhoto] = useState({ url: '', alt: '' });

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetch('/api/znakowanie/photos')
      .then(r => r.json())
      .then(data => setDbPhotos(data || {}))
      .catch(() => setDbPhotos({}));
  }, []);

  function getPhotos(section) {
    if (dbPhotos[section]?.length > 0) return dbPhotos[section];
    return (PHOTOS[section] || []).map((p, i) => ({ ...p, _isLocal: true, _localIdx: i }));
  }

  async function handleDeletePhoto(section, photoId, isLocal, localIndex) {
    if (isLocal) {
      const toSeed = (PHOTOS[section] || [])
        .filter((_, i) => i !== localIndex)
        .map((p, i) => ({ section, url: p.url, alt: p.alt, sort_order: i }));
      const res = await fetch('/api/znakowanie/photos/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSeed),
      });
      const seeded = await res.json();
      setDbPhotos(prev => ({ ...prev, [section]: seeded }));
    } else {
      await fetch(`/api/znakowanie/photos/${photoId}`, { method: 'DELETE' });
      setDbPhotos(prev => ({ ...prev, [section]: prev[section].filter(p => p.id !== photoId) }));
    }
  }

  async function handleAddPhoto(section) {
    if (!newPhoto.url.trim()) return;
    const current = dbPhotos[section] || [];
    let base = current;
    if (!current.length && PHOTOS[section]?.length) {
      const toSeed = PHOTOS[section].map((p, i) => ({ section, url: p.url, alt: p.alt, sort_order: i }));
      const seedRes = await fetch('/api/znakowanie/photos/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSeed),
      });
      base = await seedRes.json();
      setDbPhotos(prev => ({ ...prev, [section]: base }));
    }
    const res = await fetch('/api/znakowanie/photos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, url: newPhoto.url, alt: newPhoto.alt || newPhoto.url, description: newPhoto.description || '', sort_order: base.length }),
    });
    const photo = await res.json();
    setDbPhotos(prev => ({ ...prev, [section]: [...(prev[section] || base), photo] }));
    setAddingTo(null);
    setNewPhoto({ url: '', alt: '' });
  }

  async function handleSaveDescription(section, photoId, isLocal, localIdx, description) {
    if (isLocal) {
      const toSeed = (PHOTOS[section] || []).map((p, i) => ({
        section, url: p.url, alt: p.alt,
        description: i === localIdx ? description : '',
        sort_order: i,
      }));
      const res = await fetch('/api/znakowanie/photos/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toSeed),
      });
      const seeded = await res.json();
      setDbPhotos(prev => ({ ...prev, [section]: seeded }));
    } else {
      await fetch(`/api/znakowanie/photos/${photoId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      setDbPhotos(prev => ({
        ...prev,
        [section]: prev[section].map(p => p.id === photoId ? { ...p, description } : p),
      }));
    }
  }

  function ep(section) {
    if (!editMode) return {};
    return {
      editMode: true,
      onDelete: (id, isLocal, localIdx) => handleDeletePhoto(section, id, isLocal, localIdx),
      onSaveDescription: (id, isLocal, localIdx, desc) => handleSaveDescription(section, id, isLocal, localIdx, desc),
      onStartAdd: () => { setAddingTo(section); setNewPhoto({ url: '', alt: '', description: '' }); },
      onCancelAdd: () => setAddingTo(null),
      addingActive: addingTo === section,
      newPhoto,
      onNewPhotoChange: setNewPhoto,
      onConfirmAdd: () => handleAddPhoto(section),
    };
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const sectionStyle = { padding: '80px 0', borderBottom: `1px solid ${t.border}` };
  const containerStyle = { maxWidth: 1100, margin: '0 auto', padding: '0 24px' };

  return (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif", background: t.bg, color: t.text, lineHeight: 1.7, fontSize: 17, minHeight: '100vh' }}>

      <Lightbox photo={lightbox} onClose={() => setLightbox(null)} t={t} />

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
        {user && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setEditMode(m => !m)}
              style={{
                padding: '8px 22px', borderRadius: 8,
                background: editMode ? t.accent : 'transparent',
                border: `1px solid ${t.accent}`,
                color: editMode ? '#fff' : t.accentLight,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
                transition: 'all 0.15s',
              }}
            >
              {editMode ? '✓ Tryb edycji WŁĄCZONY — kliknij aby wyłączyć' : '⚙ Zarządzaj zdjęciami'}
            </button>
          </div>
        )}
      </header>

      {/* ─── ZASADA ─── */}
      <section style={{ ...sectionStyle, padding: '32px 0' }}>
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
            <PhotoGallery photos={getPhotos('plastizol')} t={t} onPhotoClick={setLightbox} {...ep('plastizol')} />
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
            <PhotoGallery photos={getPhotos('farby_wodne')} t={t} onPhotoClick={setLightbox} {...ep('farby_wodne')} />
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
            <PhotoGallery photos={getPhotos('discharge')} t={t} onPhotoClick={setLightbox} {...ep('discharge')} />
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
            <PhotoGallery photos={getPhotos('puff')} t={t} onPhotoClick={setLightbox} {...ep('puff')} />
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
            <PhotoGallery photos={getPhotos('high_density')} t={t} onPhotoClick={setLightbox} {...ep('high_density')} />
          </TechCard>

          <TechCard icon="🎯" title="CMYK / Druk Procesowy" subtitle="4 sita, przezroczyste farby, raster — pełne kolory z minimalnej liczby matryc" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Zamiast kryjących farb spotowych, CMYK używa <strong>przezroczystych farb</strong> rastrowanych pod różnymi kątami. Gdy nakładają się na siebie, oko odbiera to jako pełną paletę barw — efekt jak w druku gazetowym z bliska.</p>
            <Tags items={[
              { text: 'Tylko jasne koszulki', color: 'yellow' }, { text: '4 matryce', color: 'green' },
              { text: 'Zdjęcia / gradienty', color: 'green' }, { text: 'Raster wymagany', color: 'blue' },
              { text: 'Nie na ciemne!', color: 'red' },
            ]} t={t} />
            <ProsCons
              pros={['Pełna paleta barw przy tylko 4 matrycach', 'Zdjęcia i gradienty możliwe w sitodruku', 'Niższy koszt przygotowalni niż symulacja', 'Efekt artystyczny — raster widoczny z bliska']}
              cons={['Działa tylko na białych / bardzo jasnych koszulkach', 'Farby przezroczyste = brak krycia na ciemnym', 'Nigdy nie da neonowych, żarówiastych kolorów', 'Błąd kąta rastra → efekt mory (Moiré)', 'Wymaga 300 DPI — żadnych małych JPEGów!', 'Separacja tylko przez specjalistyczne oprogramowanie']}
              t={t} />
            <Callout icon="⚠️" t={t}>
              <strong style={{ color: t.accentLight }}>Pułapka Moiré:</strong> Jeśli kąty rastra C/M/Y/K są źle dobrane, na nadruku powstaje geometryczny wzór szachownicy. Separację zawsze zlecajcie drukarni — oni znają własne maszyny i siatki.
            </Callout>
            <Callout icon="🔥" t={t}>
              <strong style={{ color: t.accentLight }}>Ciemna koszulka + CMYK = błoto.</strong> Farby przezroczyste na białym poddruku dają zgaszone, brudne kolory. Do zdjęć na ciemnym materiale jedyna opcja to <strong>Simulated Process</strong> — patrz niżej.
            </Callout>
            <PhotoGallery photos={getPhotos('cmyk')} t={t} onPhotoClick={setLightbox} {...ep('cmyk')} />
          </TechCard>

          <TechCard icon="🌗" title="Simulated Process (Symulacja)" subtitle="6–10 kryjących farb spotowych rastrowanych — fotorealizm na ciemnym tle" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Zamiast 4 przezroczystych farb CMYK, program separuje obraz na <strong>6–10 mocno kryjących farb</strong> (biała baza, czerwony, niebieski, żółty, szary, white highlight…). Każda jest rastrowana, ale ponieważ są kryjące — uderzają w ciemny materiał z pełną mocą.</p>
            <Tags items={[
              { text: 'Ciemne koszulki ✓', color: 'green' }, { text: '6–10 matryc', color: 'yellow' },
              { text: 'Fotorealizm', color: 'green' }, { text: 'Nakłady 200+', color: 'blue' },
              { text: 'Droga przygotowalnia', color: 'red' },
            ]} t={t} />
            <ProsCons
              pros={['Fotorealistyczny, nasycony nadruk NA CZARNYM tle', 'Żywe kolory których CMYK nie da', 'Efekt premium — koszulki kapel, kolekcje artystyczne', 'Trwałe, kryjące farby jak klasyczny plastizol']}
              cons={['6–10 matryc = wysoki koszt przygotowalni', 'Opłacalne dopiero od ~200 sztuk', 'Wymaga specjalisty od separacji — nie dla amatora', 'Dłuższy czas przygotowania niż CMYK']}
              t={t} />
            <Callout icon="💡" t={t}>
              <strong style={{ color: t.accentLight }}>Kiedy zamiast Symulacji:</strong> Jeśli klient chce pełnokolorowe zdjęcie na &lt;50 sztukach — zawsze DTG lub DTF. Sitodruk (CMYK lub Symulacja) opłaca się od ~100–200 szt., gdy jakość i trwałość mają wartość premium.
            </Callout>
            <PhotoGallery photos={getPhotos('simulated')} t={t} onPhotoClick={setLightbox} {...ep('simulated')} />
          </TechCard>

          <TechCard icon="✨" title="Inne efekty sitodruku" subtitle="Metaliczne, brokatowe, odblaskowe, świecące, crack, foil…" t={t}>
            <p style={{ marginBottom: 12, color: t.text }}>Narzędzia do pojedynczych dropów i efektów specjalnych, nie baza kolekcji.</p>
            <Callout icon="📏" t={t}>
              <strong style={{ color: t.accentLight }}>Zasada:</strong> Im bardziej „efektowa" farba, tym bardziej trzeba upraszczać projekt i testować na realnym materiale.
            </Callout>
          </TechCard>

          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: '1.3rem', color: t.textBright, margin: '32px 0 12px' }}>📹 Filmy — CMYK, raster, separacja</h3>
          <VideoGrid videos={VIDEOS.cmyk} t={t} />
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
            <PhotoGallery photos={getPhotos('haft')} t={t} onPhotoClick={setLightbox} {...ep('haft')} />
          </TechCard>
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
            <PhotoGallery photos={getPhotos('dtg')} t={t} onPhotoClick={setLightbox} {...ep('dtg')} />
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
            <PhotoGallery photos={getPhotos('dtf')} t={t} onPhotoClick={setLightbox} {...ep('dtf')} />
          </TechCard>

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
            <PhotoGallery photos={getPhotos('sublimacja')} t={t} onPhotoClick={setLightbox} {...ep('sublimacja')} />
          </TechCard>
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
            <PhotoGallery photos={getPhotos('flex')} t={t} onPhotoClick={setLightbox} {...ep('flex')} />
          </TechCard>

          <TechCard icon="🔄" title="Transfer sitodrukowy" subtitle="Sitodruk na nośniku → wgrzanie w odzież" t={t}>
            <p style={{ color: t.text }}>Nadruk sitodrukiem na papierze transferowym, potem wgrzewany w koszulkę. Małe i średnie serie, logotypy, numery.</p>
          </TechCard>

          <TechCard icon="🏷" title="Naszywki, Emblematy, Chenille" subtitle="Osobna kategoria premium" t={t}>
            <p style={{ color: t.text }}>Świetne dla czapek, bluz, odzieży wierzchniej, linii heritage lub varsity.</p>
          </TechCard>

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
