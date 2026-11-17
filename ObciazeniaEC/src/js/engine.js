/* =====================================================================
   ObciążeniaEC – SILNIK OBLICZEŃ (bez DOM; działa w przeglądarce i w Node)
   PN-EN 1990 (+A1, ZK PL), PN-EN 1991-1-1, 1-3, 1-4, 1-5, 1-6 (+ ZK PL)
   Każdy wynik zawiera tok obliczeń: steps = [[wzór z podstawieniem, odwołanie, klucz punktu normy]].
   ===================================================================== */
(function (root) {
'use strict';
const MD = root.MATDB || (typeof require === 'function' ? require('./materials.js') : null);

/* ---------- narzędzia ---------- */
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const isNum = x => typeof x === 'number' && isFinite(x);
const rad = a => a * Math.PI / 180;
const deg = r => r * 180 / Math.PI;
const num = (x, d) => isNum(x) ? x : d;
function F(x, d = 2) {
  if (!isNum(x)) return '—';
  const lim = 0.5 * Math.pow(10, -d);
  if (Math.abs(x) < lim) x = 0;
  const s = Math.abs(x).toFixed(d).replace('.', ',');
  return (x < 0 ? '−' : '') + s;
}
const Fs = (x, d = 2) => !isNum(x) ? '—' : (x > 0 ? '+' : '') + F(x, d);
const Fp = (x, d = 2) => { const s = F(x, d); return x < 0 ? '(' + s + ')' : s; };
const lerp = (a, b, t) => a + (b - a) * t;
/* interpolacja liniowa w tablicy [[x, y], ...] */
function tab1(rows, x) {
  if (x <= rows[0][0]) return rows[0][1];
  for (let i = 1; i < rows.length; i++) if (x <= rows[i][0]) return lerp(rows[i - 1][1], rows[i][1], (x - rows[i - 1][0]) / (rows[i][0] - rows[i - 1][0]));
  return rows[rows.length - 1][1];
}

/* =====================================================================
   PN-EN 1990 – współczynniki
   ===================================================================== */
/* ψ wg tabl. A1.1 (ZK PL – wartości zalecane) */
const PSI = {
  A: [0.7, 0.5, 0.3], B: [0.7, 0.5, 0.3], C: [0.7, 0.7, 0.6], D: [0.7, 0.7, 0.6],
  E: [1.0, 0.9, 0.8], F: [0.7, 0.7, 0.6], G: [0.7, 0.5, 0.3], H: [0, 0, 0],
  snow: [0.5, 0.2, 0.0], snowHi: [0.7, 0.5, 0.2], wind: [0.6, 0.2, 0.0], temp: [0.6, 0.5, 0.0], constr: [1.0, 0.2, 0.2]
};
const KFI = { RC1: 0.9, RC2: 1.0, RC3: 1.1 };
function factors(f) {
  f = f || {};
  const k = f.useKFI ? (KFI[f.rc] || 1.0) : 1.0;
  return {
    gGsup: num(f.gGsup, 1.35), gGinf: num(f.gGinf, 1.0), gQ: num(f.gQ, 1.5), xi: num(f.xi, 0.85),
    rule: f.rule === '610' ? '610' : '610ab', KFI: k, rc: f.rc || 'RC2',
    eqGsup: num(f.eqGsup, 1.10), eqGinf: num(f.eqGinf, 0.90), eqQ: num(f.eqQ, 1.5)
  };
}

/* =====================================================================
   G – OBCIĄŻENIA STAŁE (PN-EN 1991-1-1, rozdz. 5 i zał. A)
   warstwa L: { m, mode: 'v' | 'a' | 'rib', t [cm], g [kN/m³ lub kN/m²], b, h, a [cm] }
   ===================================================================== */
function matOf(key, user) {
  if (user && user[key]) return user[key];
  return (MD && MD.MAT[key]) || (MD && MD.MAT.USRV) || { u: 'v', g: 0, n: '?' };
}
function layerMode(L, user) { return L.mode || (matOf(L.m, user).u === 'a' ? 'a' : 'v'); }
function layerGk(L, user) {
  const mode = layerMode(L, user);
  if (!isNum(L.g)) return { v: NaN };
  if (mode === 'a') return { v: L.g, f: 'g = ' + F(L.g, 3) + ' kN/m²' };
  if (mode === 'rib') {
    if (!isNum(L.b) || !isNum(L.h) || !isNum(L.a) || L.a <= 0) return { v: NaN };
    const v = L.g * (L.b / 100) * (L.h / 100) / (L.a / 100);
    return { v, f: 'γ·b·h/a = ' + F(L.g, 2) + '·' + F(L.b / 100, 3) + '·' + F(L.h / 100, 3) + '/' + F(L.a / 100, 3) + ' = ' + F(v, 3) + ' kN/m²' };
  }
  if (!isNum(L.t)) return { v: NaN };
  const v = L.g * L.t / 100;
  return { v, f: 'γ·t = ' + F(L.g, 2) + '·' + F(L.t / 100, 4) + ' = ' + F(v, 3) + ' kN/m²' };
}
/* układ warstw (przegroda) */
function permCalc(p, fIn, user) {
  const f = factors(fIn);
  const r = { steps: [], warn: [], rows: [], unit: 'kN/m²' };
  let gk = 0, ok = true;
  (p.layers || []).forEach((L, i) => {
    const x = layerGk(L, user);
    if (!isNum(x.v)) ok = false; else gk += x.v;
    r.rows.push({ i, L, gk: x.v, f: x.f, mode: layerMode(L, user) });
  });
  const a = clamp(num(p.alpha, 0), 0, 89.9);
  const cos = Math.cos(rad(a));
  r.alpha = a; r.gk = gk; r.gkH = gk / cos; r.ok = ok;
  r.used = p.basis === 'rzut' ? r.gkH : gk;
  r.gd = f.gGsup * f.KFI * r.used; r.gdInf = f.gGinf * r.used;
  r.steps.push(['g<sub>k</sub> = Σ γ<sub>i</sub>·t<sub>i</sub> + Σ g<sub>i</sub> = ' + r.rows.map(x => F(x.gk, 3)).join(' + ') + ' = ' + F(gk, 3) + ' kN/m² (na m² powierzchni przegrody)', 'PN-EN 1991-1-1, 5.2', '1-1:5.2']);
  if (a > 0) r.steps.push(['na m² rzutu poziomego: g<sub>k</sub>/cos α = ' + F(gk, 3) + '/cos ' + F(a, 1) + '° = ' + F(gk, 3) + '/' + F(cos, 4) + ' = ' + F(r.gkH, 3) + ' kN/m²', 'geometria', '']);
  r.steps.push(['g<sub>d</sub> = γ<sub>G,sup</sub>' + (f.KFI !== 1 ? '·K<sub>FI</sub>' : '') + '·g<sub>k</sub> = ' + F(f.gGsup, 2) + (f.KFI !== 1 ? '·' + F(f.KFI, 2) : '') + '·' + F(r.used, 3) + ' = ' + F(r.gd, 3) + ' kN/m² (γ<sub>G,inf</sub>: ' + F(r.gdInf, 3) + ')', 'PN-EN 1990, tabl. A1.2(B)', '1990:A1.2']);
  if (!ok) r.warn.push('Uzupełnij grubości i ciężary wszystkich warstw.');
  (p.layers || []).forEach(L => { const m = matOf(L.m, user); if (m && m.src === 'o' && isNum(L.g) && isNum(m.g) && Math.abs(L.g - m.g) < 1e-9 && m.r) { /* ok */ } });
  return r;
}
/* element liniowy: przekrój (γ·A), ściana (g·H·(1−otw.)), wartość podana */
function lineCalc(it, fIn, permRes) {
  const f = factors(fIn);
  const r = { steps: [], warn: [], unit: 'kN/m' };
  let v = NaN;
  if (it.lmode === 'sec') {
    const A = it.secShape === 'rect' ? num(it.b, 0) * num(it.h, 0) : num(it.A, 0);
    v = num(it.g, 25) * A / 1e4;
    r.steps.push(['g<sub>k</sub> = γ·A = ' + F(it.g, 2) + ' kN/m³ · ' + (it.secShape === 'rect' ? F(it.b, 1) + '·' + F(it.h, 1) + ' cm² = ' : '') + F(A, 1) + ' cm² · 10⁻⁴ = ' + F(v, 3) + ' kN/m', 'PN-EN 1991-1-1, 5.2.1', '1-1:5.2']);
    if (num(it.extra, 0)) { v += it.extra; r.steps.push(['+ elementy dodatkowe (okładziny, otulenie ogniochronne itp.): ' + F(it.extra, 3) + ' kN/m → g<sub>k</sub> = ' + F(v, 3) + ' kN/m', '', '']); }
  } else if (it.lmode === 'wall') {
    const gA = it.wallRef && permRes && permRes[it.wallRef] ? permRes[it.wallRef].gk : num(it.gA, 0);
    const H = num(it.H, 0), o = clamp(num(it.open, 0), 0, 90) / 100;
    v = gA * H * (1 - o);
    r.gA = gA;
    r.steps.push(['g<sub>k</sub> = g<sub>ściany</sub>·H·(1 − ω<sub>otw</sub>) = ' + F(gA, 3) + '·' + F(H, 2) + '·(1 − ' + F(o, 2) + ') = ' + F(v, 3) + ' kN/m' + (it.wallRef && permRes && permRes[it.wallRef] ? ' (g<sub>ściany</sub> z układu warstw)' : ''), 'PN-EN 1991-1-1, 5.2.1', '1-1:5.2']);
    if (o > 0) r.warn.push('Redukcja na otwory rozkłada ciężar równomiernie – nad otworami występuje skupienie obciążenia na nadprożach i filarkach.');
  } else {
    v = num(it.v, 0);
    r.steps.push(['g<sub>k</sub> = ' + F(v, 3) + ' kN/m (wartość podana)', '', '']);
  }
  r.gk = v; r.used = v; r.gd = f.gGsup * f.KFI * v; r.gdInf = f.gGinf * v;
  r.steps.push(['g<sub>d</sub> = ' + F(f.gGsup * f.KFI, 3) + '·' + F(v, 3) + ' = ' + F(r.gd, 3) + ' kN/m', 'PN-EN 1990, tabl. A1.2(B)', '1990:A1.2']);
  return r;
}

/* =====================================================================
   Q – OBCIĄŻENIA UŻYTKOWE (PN-EN 1991-1-1, rozdz. 6), MONTAŻOWE (PN-EN 1991-1-6)
   ===================================================================== */
const CAT = {
  A1: { g: 'A', n: 'A – stropy', qk: 2.0, Qk: 2.0, rq: '1,5–2,0', rQ: '2,0–3,0', t: '6.2', d: 'Pomieszczenia mieszkalne: pokoje w budynkach mieszkalnych i domach, pokoje i oddziały w szpitalach, pokoje w hotelach i hostelach, kuchnie i toalety.' },
  A2: { g: 'A', n: 'A – schody', qk: 3.0, Qk: 2.0, rq: '2,0–4,0', rQ: '2,0–4,0', t: '6.2', d: 'Schody w budynkach kategorii A.' },
  A3: { g: 'A', n: 'A – balkony', qk: 2.5, Qk: 2.0, rq: '2,5–4,0', rQ: '2,0–3,0', t: '6.2', d: 'Balkony w budynkach kategorii A.' },
  B: { g: 'B', n: 'B – biura', qk: 3.0, Qk: 4.5, rq: '2,0–3,0', rQ: '1,5–4,5', t: '6.2', d: 'Powierzchnie biurowe.' },
  C1: { g: 'C', n: 'C1 – ze stołami', qk: 3.0, Qk: 4.0, rq: '2,0–3,0', rQ: '3,0–4,0', t: '6.2', d: 'Powierzchnie ze stołami: szkoły, kawiarnie, restauracje, jadalnie, czytelnie, recepcje.' },
  C2: { g: 'C', n: 'C2 – z zamocowanymi siedzeniami', qk: 4.0, Qk: 4.0, rq: '3,0–4,0', rQ: '2,5–7,0 (4,0)', t: '6.2', d: 'Kościoły, teatry, kina, sale konferencyjne i wykładowe, sale zebrań, poczekalnie.' },
  C3: { g: 'C', n: 'C3 – bez przeszkód dla ruchu', qk: 5.0, Qk: 4.0, rq: '3,0–5,0', rQ: '4,0–7,0', t: '6.2', d: 'Muzea, sale wystawowe, dostępy w budynkach publicznych i administracyjnych, hotelach, szpitalach, dworcach.' },
  C4: { g: 'C', n: 'C4 – aktywność fizyczna', qk: 5.0, Qk: 7.0, rq: '4,5–5,0', rQ: '3,5–7,0', t: '6.2', d: 'Sale tańca, sale gimnastyczne, sceny.' },
  C5: { g: 'C', n: 'C5 – możliwy tłok', qk: 5.0, Qk: 4.5, rq: '5,0–7,5', rQ: '3,5–4,5', t: '6.2', d: 'Sale koncertowe, sale sportowe z trybunami, tarasy i dojścia, perony kolejowe.' },
  D1: { g: 'D', n: 'D1 – sklepy detaliczne', qk: 5.0, Qk: 4.0, rq: '4,0–5,0', rQ: '3,5–7,0 (4,0)', t: '6.2', d: 'Powierzchnie w sklepach detalicznych.' },
  D2: { g: 'D', n: 'D2 – domy towarowe', qk: 5.0, Qk: 7.0, rq: '4,0–5,0', rQ: '3,5–7,0', t: '6.2', d: 'Powierzchnie w domach towarowych.' },
  E1: { g: 'E', n: 'E1 – składowanie', qk: 7.5, Qk: 7.0, rq: '7,5', rQ: '7,0', t: '6.4', d: 'Magazyny, archiwa, biblioteki, powierzchnie gromadzenia towarów z dostępami. Gdy znany jest składowany materiał – sprawdź q = γ·h (zał. A).' },
  E2: { g: 'E', n: 'E2 – użytkowanie przemysłowe', qk: 10.0, Qk: 10.0, rq: 'wg projektu', rQ: 'wg projektu', t: '6.4', d: 'Wartości ustala się indywidualnie z założeń technologicznych (maszyny, suwnice – PN-EN 1991-3).' },
  F: { g: 'F', n: 'F – garaże, pojazdy ≤ 30 kN', qk: 2.5, Qk: 20.0, rq: '1,5–2,5', rQ: '10–20', t: '6.8', d: 'Ruch i parkowanie pojazdów lekkich (≤ 30 kN, ≤ 8 miejsc oprócz kierowcy). Q<sub>k</sub> – oś, 2 koła, ślad 100×100 mm.' },
  G: { g: 'G', n: 'G – pojazdy 30–160 kN', qk: 5.0, Qk: 90.0, rq: '5,0', rQ: '40–90', t: '6.8', d: 'Drogi dojazdowe, strefy dostaw, dojazdy pożarowe (30–160 kN, 2 osie). Q<sub>k</sub> – oś, 2 koła, ślad 200×200 mm.' },
  H: { g: 'H', n: 'H – dach bez dostępu', qk: 0.4, Qk: 1.0, rq: '0,0–1,0 (0,4)', rQ: '0,9–1,5 (1,0)', t: '6.10', d: 'Dachy bez dostępu poza zwykłym utrzymaniem i naprawami. Nie łączy się ze śniegiem ani z wiatrem (3.3.2(1)); q<sub>k</sub> działa na powierzchni do 10 m².' },
  I: { g: 'I', n: 'I – dach z dostępem (jak A–D)', qk: 4.0, Qk: 3.0, rq: 'jak kat. A–D', rQ: 'jak kat. A–D', t: '6.10', d: 'Dachy z dostępem użytkowane zgodnie z kategoriami A–D (np. tarasy) – przyjmuje się obciążenia i ψ kategorii odniesienia.' },
  K: { g: 'K', n: 'K – lądowiska helikopterów', qk: 0, Qk: 20, rq: 'HC1: 20 kN, HC2: 60 kN', rQ: '', t: '6.11', d: 'Dachy przeznaczone na lądowiska helikopterów – obciążenia skupione wg tabl. 6.11 (HC1 – do 20 kN, Q<sub>k</sub> = 20 kN; HC2 – 20–60 kN, Q<sub>k</sub> = 60 kN), ze współczynnikiem dynamicznym φ = 1,40.' }
};
const CAT_ORDER = ['A1', 'A2', 'A3', 'B', 'C1', 'C2', 'C3', 'C4', 'C5', 'D1', 'D2', 'E1', 'E2', 'F', 'G', 'H', 'I'];
const BARRIER = {
  A: { n: 'Kat. A (mieszkania)', q: 0.5, r: '0,2–1,0', psi: 'A' },
  BC1: { n: 'Kat. B i C1', q: 0.5, r: '0,2–1,0', psi: 'B' },
  C2D: { n: 'Kat. C2–C4 i D', q: 1.0, r: '0,8–1,0', psi: 'C' },
  C5: { n: 'Kat. C5 (tłok)', q: 3.0, r: '3,0–5,0', psi: 'C' },
  E: { n: 'Kat. E', q: 2.0, r: '0,8–2,0', psi: 'E' }
};
/* wózki widłowe – tabl. 6.5 (wymiary i ciężary), 6.6 (obciążenie osi) */
const FORK = {
  FL1: { net: 21, cap: 10, gross: 31, a: 0.85, b: 1.00, l: 2.60, Qax: 26 },
  FL2: { net: 31, cap: 15, gross: 46, a: 0.95, b: 1.10, l: 3.00, Qax: 40 },
  FL3: { net: 44, cap: 25, gross: 69, a: 1.00, b: 1.20, l: 3.30, Qax: 63 },
  FL4: { net: 60, cap: 40, gross: 100, a: 1.20, b: 1.40, l: 4.00, Qax: 90 },
  FL5: { net: 90, cap: 60, gross: 150, a: 1.50, b: 1.90, l: 4.60, Qax: 140 },
  FL6: { net: 110, cap: 80, gross: 190, a: 1.80, b: 2.30, l: 5.10, Qax: 170 }
};
function catPsi(cat, like) {
  const c = CAT[cat];
  if (!c) return PSI.A;
  if (c.g === 'I') return PSI[(CAT[like] || CAT.A1).g] || PSI.A;
  if (c.g === 'K') return PSI.H.map((_, i) => [0.7, 0.5, 0.3][i]);
  return PSI[c.g] || PSI.A;
}
function partitionQ(w) {
  if (!isNum(w)) return { q: NaN, txt: '' };
  if (w <= 1.0) return { q: 0.5, txt: 'ciężar ścianki ' + F(w, 2) + ' ≤ 1,0 kN/m → q<sub>k</sub> = 0,5 kN/m²' };
  if (w <= 2.0) return { q: 0.8, txt: 'ciężar ścianki ' + F(w, 2) + ' ≤ 2,0 kN/m → q<sub>k</sub> = 0,8 kN/m²' };
  if (w <= 3.0) return { q: 1.2, txt: 'ciężar ścianki ' + F(w, 2) + ' ≤ 3,0 kN/m → q<sub>k</sub> = 1,2 kN/m²' };
  return { q: NaN, over: true, txt: 'ciężar ścianki ' + F(w, 2) + ' > 3,0 kN/m – ściankę uwzględnia się jako obciążenie w rzeczywistym położeniu (6.3.1.2(9))' };
}
function imposedCalc(it, fIn) {
  const f = factors(fIn);
  const r = { steps: [], warn: [], vals: [], unit: 'kN/m²', kind: 'imp', fam: 'imp' };
  const gQ = f.gQ * f.KFI;
  if (it.kind === 'cat') {
    const c = CAT[it.cat] || CAT.A1;
    const psi = catPsi(it.cat, it.like);
    r.cat = it.cat; r.catG = c.g;
    r.steps.push(['kategoria ' + c.n + ': q<sub>k</sub> = ' + F(it.qk, 2) + ' kN/m² (zakres ' + c.rq + '), Q<sub>k</sub> = ' + F(it.Qk, 2) + ' kN (zakres ' + c.rQ + ')', 'PN-EN 1991-1-1, tabl. ' + c.t, '1-1:6.3']);
    let a = 1;
    const canRed = ['A', 'B', 'C', 'D'].includes(c.g) || (c.g === 'I' && ['A', 'B', 'C', 'D'].includes((CAT[it.like] || {}).g));
    if (it.useAA && canRed) {
      const A = it.Aarea;
      if (isNum(A) && A > 0) {
        const raw = 5 / 7 * psi[0] + 10 / A;
        let aA = Math.min(raw, 1.0);
        const g = c.g === 'I' ? CAT[it.like].g : c.g;
        if ((g === 'C' || g === 'D') && aA < 0.6) aA = 0.6;
        r.aA = aA;
        r.steps.push(['α<sub>A</sub> = 5/7·ψ<sub>0</sub> + A<sub>0</sub>/A = 5/7·' + F(psi[0], 1) + ' + 10/' + F(A, 1) + ' = ' + F(raw, 3) + (aA !== raw ? ' → α<sub>A</sub> = ' + F(aA, 3) + (raw > 1 ? ' (≤ 1,0)' : ' (≥ 0,6 dla kat. C i D)') : ''), 'PN-EN 1991-1-1, 6.3.1.2(10), (6.1)', '1-1:6.3.1.2']);
        a = aA;
      }
    }
    if (it.useAN && canRed) {
      const n = it.nst;
      if (isNum(n) && n > 2) {
        const aN = (2 + (n - 2) * psi[0]) / n;
        r.aN = aN;
        r.steps.push(['α<sub>n</sub> = [2 + (n − 2)·ψ<sub>0</sub>]/n = [2 + (' + F(n, 0) + ' − 2)·' + F(psi[0], 1) + ']/' + F(n, 0) + ' = ' + F(aN, 3), 'PN-EN 1991-1-1, 6.3.1.2(11), (6.2)', '1-1:6.3.1.2']);
        if (it.useAA && isNum(r.aA)) { r.warn.push('α<sub>A</sub> i α<sub>n</sub> nie stosuje się łącznie – przyjęto wartość mniejszą (6.3.1.2(11) uw.).'); a = Math.min(r.aA, aN); }
        else a = aN;
      } else if (isNum(n)) r.steps.push(['α<sub>n</sub> = 1,0 (n ≤ 2 kondygnacje)', 'PN-EN 1991-1-1, 6.3.1.2(11)', '1-1:6.3.1.2']);
    }
    if ((it.useAA || it.useAN) && !canRed) r.warn.push('Współczynników redukcyjnych α<sub>A</sub>, α<sub>n</sub> nie stosuje się dla kategorii ' + c.g + '.');
    r.alpha = a;
    r.qk = isNum(it.qk) ? it.qk * a : NaN;
    r.qk0 = it.qk; r.Qk = it.Qk; r.psi = psi;
    if (a !== 1) r.steps.push(['q<sub>k,red</sub> = α·q<sub>k</sub> = ' + F(a, 3) + '·' + F(it.qk, 2) + ' = ' + F(r.qk, 3) + ' kN/m²', '', '']);
    r.kind = c.g === 'H' ? 'H' : 'imp';
    r.fam = c.g === 'H' ? 'H' : 'imp';
    r.qd = gQ * r.qk; r.Qd = isNum(it.Qk) ? gQ * it.Qk : NaN;
    if (c.g === 'F' || c.g === 'G') r.steps.push(['Q<sub>k</sub> – obciążenie osi (2 koła po ' + F(it.Qk / 2, 1) + ' kN), ślad koła ' + (c.g === 'F' ? '100×100' : '200×200') + ' mm; rozstaw kół 1,80 m', 'PN-EN 1991-1-1, 6.3.3.2, rys. 6.2', '1-1:6.3.3']);
    if (c.g === 'H') r.steps.push(['q<sub>k</sub> działa na powierzchni A ≤ 10 m² w dowolnym miejscu dachu; Q<sub>k</sub> na kwadracie 50×50 mm', 'PN-EN 1991-1-1, 6.3.4.2', '1-1:6.3.4']);
    r.steps.push(['q<sub>d</sub> = γ<sub>Q</sub>·q<sub>k</sub> = ' + F(gQ, 2) + '·' + F(r.qk, 3) + ' = ' + F(r.qd, 3) + ' kN/m²; ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub> = ' + psi.map(x => F(x, 1)).join(' / '), 'PN-EN 1990, tabl. A1.1', '1990:A1.1']);
    r.vals.push({ key: 'q', label: 'q<sub>k</sub> – obciążenie równomierne', v: r.qk, unit: 'kN/m²' });
    if (isNum(it.Qk)) r.vals.push({ key: 'Q', label: 'Q<sub>k</sub> – obciążenie skupione', v: it.Qk, unit: 'kN', point: true });
    if (c.g === 'E' && isNum(it.storeH) && it.storeH > 0 && isNum(it.storeG)) {
      const qs = it.storeG * it.storeH;
      r.steps.push(['sprawdzenie składowania: q = γ·h = ' + F(it.storeG, 2) + '·' + F(it.storeH, 2) + ' = ' + F(qs, 2) + ' kN/m² ' + (qs > r.qk ? '> q<sub>k</sub> – przyjmij większą wartość!' : '≤ q<sub>k</sub>'), 'PN-EN 1991-1-1, 6.3.2.1, zał. A', '1-1:A']);
      if (qs > r.qk) r.warn.push('Ciężar składowanego materiału γ·h = ' + F(qs, 2) + ' kN/m² przekracza q<sub>k</sub> = ' + F(r.qk, 2) + ' kN/m² – zwiększ q<sub>k</sub>.');
    }
  } else if (it.kind === 'part') {
    const w = it.wmode === 'calc' ? (isNum(it.wg) && isNum(it.wh) ? it.wg * it.wh : NaN) : it.w;
    const p = partitionQ(w);
    r.wline = w;
    if (it.wmode === 'calc') r.steps.push(['ciężar ścianki = g·h = ' + F(it.wg, 3) + ' kN/m² · ' + F(it.wh, 2) + ' m = ' + F(w, 3) + ' kN/m długości', '', '']);
    r.steps.push([p.txt || '—', 'PN-EN 1991-1-1, 6.3.1.2(8)', '1-1:6.3.1.2']);
    if (p.over) r.warn.push('Ścianka cięższa niż 3,0 kN/m – nie zastępuje się jej obciążeniem równomiernym; uwzględnij jako obciążenie stałe liniowe.');
    r.qk = p.q; r.psi = catPsi(it.cat || 'A1'); r.cat = it.cat || 'A1'; r.catG = (CAT[r.cat] || CAT.A1).g;
    r.qd = gQ * r.qk;
    r.steps.push(['obciążenie zastępcze od ścianek działowych jest częścią obciążenia użytkowego stropu – sumuje się je z q<sub>k</sub> stropu (to samo oddziaływanie)', 'PN-EN 1991-1-1, 6.3.1.2(8), 3.3.1(2)', '1-1:6.3.1.2']);
    r.vals.push({ key: 'q', label: 'q<sub>k</sub> – zastępcze od ścianek', v: r.qk, unit: 'kN/m²' });
  } else if (it.kind === 'barrier') {
    const b = BARRIER[it.bcat] || BARRIER.A;
    r.qk = isNum(it.qk) ? it.qk : b.q; r.unit = 'kN/m'; r.kind = 'horiz'; r.fam = 'horiz';
    r.psi = PSI[b.psi] || PSI.A;
    r.qd = gQ * r.qk;
    r.steps.push(['q<sub>k</sub> = ' + F(r.qk, 2) + ' kN/m – poziomo, na wysokości poręczy, nie wyżej niż 1,2 m (' + b.n + ', zakres ' + b.r + ')', 'PN-EN 1991-1-1, 6.4, tabl. 6.12', '1-1:6.4']);
    r.steps.push(['q<sub>d</sub> = ' + F(gQ, 2) + '·' + F(r.qk, 2) + ' = ' + F(r.qd, 3) + ' kN/m', 'PN-EN 1990, tabl. A1.2(B)', '1990:A1.2']);
    r.vals.push({ key: 'q', label: 'q<sub>k</sub> – poziome na barierę', v: r.qk, unit: 'kN/m', horiz: true });
  } else if (it.kind === 'fork') {
    const k = FORK[it.fl] || FORK.FL1;
    const phi = it.tyre === 'solid' ? 2.0 : 1.4;
    const Qax = isNum(it.Qax) ? it.Qax : k.Qax;
    r.unit = 'kN'; r.kind = 'point'; r.fam = 'imp'; r.psi = PSI.E; r.qk = NaN;
    r.steps.push(['wózek ' + (it.fl || 'FL1') + ': ciężar własny ' + F(k.net, 0) + ' kN, udźwig ' + F(k.cap, 0) + ' kN, ciężar całkowity ' + F(k.gross, 0) + ' kN; rozstaw kół a = ' + F(k.a, 2) + ' m, szerokość b = ' + F(k.b, 2) + ' m, długość l = ' + F(k.l, 2) + ' m', 'PN-EN 1991-1-1, tabl. 6.5', '1-1:6.3.2.3']);
    r.steps.push(['Q<sub>k</sub> (oś) = ' + F(Qax, 0) + ' kN', 'PN-EN 1991-1-1, tabl. 6.6', '1-1:6.3.2.3']);
    const Qdyn = phi * Qax;
    r.steps.push(['Q<sub>k,dyn</sub> = φ·Q<sub>k</sub> = ' + F(phi, 2) + '·' + F(Qax, 0) + ' = ' + F(Qdyn, 1) + ' kN (' + (phi === 2 ? 'opony pełne' : 'opony pneumatyczne') + '); koło: ' + F(Qdyn / 2, 1) + ' kN', 'PN-EN 1991-1-1, 6.3.2.3(4), (6.3)', '1-1:6.3.2.3']);
    r.steps.push(['poziome od przyspieszania/hamowania: 30% obciążenia pionowego osi = ' + F(0.3 * Qax, 1) + ' kN', 'PN-EN 1991-1-1, 6.3.2.3(6)', '1-1:6.3.2.3']);
    r.Qk = Qax; r.Qdyn = Qdyn; r.Qd = gQ * Qdyn;
    r.vals.push({ key: 'Qdyn', label: 'Q<sub>k,dyn</sub> – oś wózka z φ', v: Qdyn, unit: 'kN', point: true });
    r.vals.push({ key: 'Qw', label: 'koło (½ osi, z φ)', v: Qdyn / 2, unit: 'kN', point: true });
    r.vals.push({ key: 'H', label: 'poziome (30% osi)', v: 0.3 * Qax, unit: 'kN', point: true });
  } else if (it.kind === 'constr') {
    /* PN-EN 1991-1-6, 4.11.2, tabl. 4.2 – betonowanie */
    const t = num(it.t, 0.2), gc = num(it.gc, 26), Qcc = num(it.qcc, 0.5);
    const Qcf = gc * t;
    const q2raw = 0.1 * Qcf, q2 = clamp(q2raw, 0.75, 1.5);
    r.fam = 'constr'; r.kind = 'constr'; r.psi = PSI.constr;
    r.steps.push(['Q<sub>cf</sub> – ciężar świeżego betonu: γ·t = ' + F(gc, 1) + '·' + F(t, 3) + ' = ' + F(Qcf, 3) + ' kN/m² (oddziaływanie zmienne w fazie wykonania)', 'PN-EN 1991-1-6, 4.11.2, tabl. 4.2 (3)', '1-6:4.11']);
    r.steps.push(['Q<sub>cc</sub> – deskowanie i elementy nośne: ' + F(Qcc, 3) + ' kN/m² (przyjęto)', 'PN-EN 1991-1-6, tabl. 4.1', '1-6:4.11']);
    r.steps.push(['(1) poza obszarem roboczym: q = 0,75 kN/m² (obejmuje Q<sub>ca</sub>)', 'PN-EN 1991-1-6, tabl. 4.2 (1)', '1-6:4.11']);
    r.steps.push(['(2) w obszarze roboczym 3×3 m: q = 10%·Q<sub>cf</sub> = ' + F(q2raw, 3) + (q2 !== q2raw ? ' → 0,75 ≤ q ≤ 1,5 → ' + F(q2, 3) : '') + ' kN/m² (obejmuje Q<sub>ca</sub> i nadmiar betonu)', 'PN-EN 1991-1-6, tabl. 4.2 (2)', '1-6:4.11']);
    r.steps.push(['ψ<sub>0</sub> = 1,0; ψ<sub>2</sub> = 0,2 dla obciążeń montażowych', 'PN-EN 1991-1-6, zał. A1', '1-6:4.11']);
    r.qk = Qcf + q2; r.Qcf = Qcf; r.q1 = 0.75; r.q2 = q2; r.Qcc = Qcc;
    r.vals.push({ key: 'w', label: 'Q<sub>cf</sub> + q<sub>(2)</sub> – w obszarze roboczym', v: Qcf + q2, unit: 'kN/m²' });
    r.vals.push({ key: 'o', label: 'Q<sub>cf</sub> + 0,75 – poza obszarem roboczym', v: Qcf + 0.75, unit: 'kN/m²' });
    r.vals.push({ key: 'cf', label: 'Q<sub>cf</sub> – świeży beton', v: Qcf, unit: 'kN/m²' });
    r.vals.push({ key: 'ca', label: 'q<sub>(2)</sub> – personel, sprzęt, nadmiar', v: q2, unit: 'kN/m²' });
    r.vals.push({ key: 'cc', label: 'Q<sub>cc</sub> – deskowanie', v: Qcc, unit: 'kN/m²' });
    r.qd = gQ * r.qk;
  } else { // other
    r.qk = it.qk; r.unit = it.unit || 'kN/m²'; r.kind = 'other'; r.fam = 'other:' + (it.id || '');
    r.psi = [it.p0, it.p1, it.p2].map(x => isNum(x) ? x : 0);
    r.qd = gQ * r.qk;
    r.steps.push(['q<sub>k</sub> = ' + F(r.qk, 3) + ' ' + r.unit + ' (wartość podana); ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub> = ' + r.psi.map(x => F(x, 2)).join(' / '), '', '']);
    r.vals.push({ key: 'q', label: 'q<sub>k</sub>', v: r.qk, unit: r.unit });
  }
  r.vals.forEach(v => { if (!v.point) v.vd = gQ * v.v; else v.vd = gQ * v.v; });
  return r;
}

/* =====================================================================
   S – ŚNIEG (PN-EN 1991-1-3 + ZK PL)
   ===================================================================== */
function skZone(zone, A) {
  A = isNum(A) ? A : 0;
  switch (+zone) {
    case 1: { const v = 0.007 * A - 1.4; return { sk: Math.max(v, 0.70), f: 'strefa 1: s<sub>k</sub> = 0,007·A − 1,4 = 0,007·' + F(A, 0) + ' − 1,4 = ' + F(v, 3) + (v < 0.7 ? ' < 0,70 → s<sub>k</sub> = 0,70 kN/m²' : ' kN/m²') }; }
    case 2: return { sk: 0.9, f: 'strefa 2: s<sub>k</sub> = 0,9 kN/m² (niezależnie od A)' };
    case 3: { const v = 0.006 * A - 0.6; return { sk: Math.max(v, 1.2), f: 'strefa 3: s<sub>k</sub> = 0,006·A − 0,6 = 0,006·' + F(A, 0) + ' − 0,6 = ' + F(v, 3) + (v < 1.2 ? ' < 1,2 → s<sub>k</sub> = 1,2 kN/m²' : ' kN/m²') }; }
    case 4: return { sk: 1.6, f: 'strefa 4: s<sub>k</sub> = 1,6 kN/m² (niezależnie od A)' };
    case 5: { const v = 0.93 * Math.exp(0.00134 * A); return { sk: Math.max(v, 2.0), f: 'strefa 5: s<sub>k</sub> = 0,93·exp(0,00134·A) = 0,93·exp(0,00134·' + F(A, 0) + ') = ' + F(v, 3) + (v < 2.0 ? ' < 2,0 → s<sub>k</sub> = 2,0 kN/m²' : ' kN/m²') }; }
  }
  return { sk: NaN, f: '' };
}
const mu1 = a => a <= 30 ? 0.8 : a < 60 ? 0.8 * (60 - a) / 30 : 0;
const mu2m = a => a <= 30 ? 0.8 + 0.8 * a / 30 : a < 60 ? 1.6 : NaN;
function mu1Txt(a) {
  if (a <= 30) return 'μ<sub>1</sub>(' + F(a, 1) + '°) = 0,8 (0° ≤ α ≤ 30°)';
  if (a < 60) return 'μ<sub>1</sub>(' + F(a, 1) + '°) = 0,8·(60 − α)/30 = 0,8·(60 − ' + F(a, 1) + ')/30 = ' + F(mu1(a), 3);
  return 'μ<sub>1</sub>(' + F(a, 1) + '°) = 0 (α ≥ 60°)';
}
function snowSite(ss) {
  const steps = [], warn = [];
  const z = skZone(ss.zone, ss.A);
  let skz = z.sk;
  steps.push([z.f, 'PN-EN 1991-1-3, ZK, tabl. NA.1', '1-3:NA']);
  let band = null;
  if (+ss.zoneB && +ss.zoneB !== +ss.zone) {
    const zb = skZone(ss.zoneB, ss.A);
    const mode = ss.trans === 'max' || ss.trans === 'man' ? ss.trans : 'avg';
    const lo = Math.min(z.sk, zb.sk), hi = Math.max(z.sk, zb.sk), avg = (z.sk + zb.sk) / 2;
    band = { a: z.sk, b: zb.sk, avg, max: hi, mode };
    steps.push([zb.f, 'PN-EN 1991-1-3, ZK, tabl. NA.1', '1-3:NA']);
    let how;
    if (mode === 'man') {
      skz = isNum(ss.skTrans) ? ss.skTrans : NaN; how = 'wartość wpisana';
      if (!isNum(ss.skTrans)) warn.push('Wpisz s<sub>k</sub> dla pasa przejściowego.');
      else if (ss.skTrans < lo - 1e-9 || ss.skTrans > hi + 1e-9) warn.push('Wpisane s<sub>k</sub> leży poza przedziałem wartości obu stref (' + F(lo, 3) + '–' + F(hi, 3) + ' kN/m²).');
    } else if (mode === 'max') { skz = hi; how = 'wartość większa'; }
    else { skz = avg; how = 'średnia (' + F(z.sk, 3) + ' + ' + F(zb.sk, 3) + ')/2'; }
    steps.push(['pas przejściowy stref ' + ss.zone + ' i ' + ss.zoneB + ' (±10 km od granicy): ' + how + ' → s<sub>k</sub> = ' + F(skz, 3) + ' kN/m²', 'PN-EN 1991-1-3, ZK, rys. NA.1', '1-3:NA']);
  }
  const sk = ss.skMan && isNum(ss.skUser) ? ss.skUser : skz;
  if (ss.skMan) steps.push(['s<sub>k</sub> = ' + F(sk, 3) + ' kN/m² (wartość podana ręcznie)', '', '']);
  const Ce = num(ss.Ce, 1), Ct = num(ss.Ct, 1);
  const hi = isNum(ss.A) && ss.A > 1000;
  const psi = hi ? PSI.snowHi : PSI.snow;
  steps.push(['C<sub>e</sub> = ' + F(Ce, 1) + ' (' + (Ce < 1 ? 'teren wystawiony na działanie wiatru' : Ce > 1 ? 'teren osłonięty' : 'teren normalny') + '); C<sub>t</sub> = ' + F(Ct, 2), 'PN-EN 1991-1-3, tabl. 5.1, 5.2(8)', '1-3:5.2']);
  steps.push(['C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> = ' + F(Ce, 1) + '·' + F(Ct, 2) + '·' + F(sk, 3) + ' = ' + F(Ce * Ct * sk, 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.1)', '1-3:5.2']);
  steps.push(['ψ<sub>0</sub>/ψ<sub>1</sub>/ψ<sub>2</sub> = ' + psi.map(x => F(x, 1)).join(' / ') + ' (' + (hi ? 'H > 1000 m n.p.m.' : 'H ≤ 1000 m n.p.m.') + ')', 'PN-EN 1990, tabl. A1.1', '1990:A1.1']);
  if (Ct < 1) warn.push('C<sub>t</sub> < 1,0 stosuje się tylko dla dachów o dużej przenikalności ciepła (np. szklanych), na podstawie odrębnej analizy.');
  return { sk, Ce, Ct, k: Ce * Ct * sk, psi, A: ss.A, band, warn, steps };
}
function snowCalc(c, S, fIn) {
  const f = factors(fIn);
  const r = { steps: [], vals: [], warn: [], cases: [], unit: 'kN/m²', fam: 'snow', psi: S.psi };
  const K = S.k;
  const s = mu => mu * K;
  const sTxt = (mu, lbl) => 's' + (lbl ? '<sub>' + lbl + '</sub>' : '') + ' = μ·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> = ' + F(mu, 3) + '·' + F(S.Ce, 1) + '·' + F(S.Ct, 2) + '·' + F(S.sk, 3) + ' = ' + F(s(mu), 3) + ' kN/m²';
  switch (c.type) {
    case 'mono': {
      const a = num(c.a1, 0);
      let m = mu1(a);
      r.steps.push([mu1Txt(a), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      if (c.guard && m < 0.8) { m = 0.8; r.steps.push(['śniegołapy / attyka przy okapie → μ<sub>1</sub> ≥ 0,8 → μ<sub>1</sub> = 0,8', 'PN-EN 1991-1-3, 5.3.2(2)', '1-3:5.3.2']); }
      r.steps.push([sTxt(m), 'PN-EN 1991-1-3, (5.7)', '1-3:5.3.2']);
      r.cases.push({ label: 'Przypadek (i) – równomierny', segs: [{ x0: 0, x1: 1, v0: m, v1: m }] });
      r.vals.push({ key: 's', label: 's – połać', v: s(m), mu: m });
      r.diag = { shape: 'mono', a1: a };
      r.def = 's';
      break;
    }
    case 'duo': {
      const a1 = num(c.a1, 0), a2 = num(c.a2, 0);
      let m1 = mu1(a1), m2 = mu1(a2);
      r.steps.push([mu1Txt(a1), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      r.steps.push([mu1Txt(a2), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      if (c.guard) { if (m1 < 0.8) m1 = 0.8; if (m2 < 0.8) m2 = 0.8; r.steps.push(['śniegołapy / attyki przy okapach → μ<sub>1</sub> ≥ 0,8', 'PN-EN 1991-1-3, 5.3.3(3)', '1-3:5.3.3']); }
      r.steps.push(['s<sub>1</sub> = ' + F(m1, 3) + '·' + F(K, 3) + ' = ' + F(s(m1), 3) + ' kN/m²; 0,5·s<sub>1</sub> = ' + F(0.5 * s(m1), 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.7), rys. 5.3', '1-3:5.3.3']);
      r.steps.push(['s<sub>2</sub> = ' + F(m2, 3) + '·' + F(K, 3) + ' = ' + F(s(m2), 3) + ' kN/m²; 0,5·s<sub>2</sub> = ' + F(0.5 * s(m2), 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.7), rys. 5.3', '1-3:5.3.3']);
      r.cases.push({ label: 'Przypadek (i) – bez zawiewania', segs: [{ x0: 0, x1: .5, v0: m1, v1: m1 }, { x0: .5, x1: 1, v0: m2, v1: m2 }] });
      r.cases.push({ label: 'Przypadek (ii) – zawiewanie', segs: [{ x0: 0, x1: .5, v0: .5 * m1, v1: .5 * m1 }, { x0: .5, x1: 1, v0: m2, v1: m2 }] });
      r.cases.push({ label: 'Przypadek (iii) – zawiewanie', segs: [{ x0: 0, x1: .5, v0: m1, v1: m1 }, { x0: .5, x1: 1, v0: .5 * m2, v1: .5 * m2 }] });
      r.vals.push({ key: 's1', label: 's – połać 1 (α<sub>1</sub>)', v: s(m1), mu: m1 });
      r.vals.push({ key: 's2', label: 's – połać 2 (α<sub>2</sub>)', v: s(m2), mu: m2 });
      r.vals.push({ key: 'h1', label: '0,5·s – połać 1 (zawiewanie)', v: 0.5 * s(m1), mu: 0.5 * m1 });
      r.vals.push({ key: 'h2', label: '0,5·s – połać 2 (zawiewanie)', v: 0.5 * s(m2), mu: 0.5 * m2 });
      r.vals.push({ key: 'max', label: 's<sub>max</sub> – wartość większa', v: Math.max(s(m1), s(m2)), mu: Math.max(m1, m2) });
      r.diag = { shape: 'duo', a1, a2 };
      r.def = 'max';
      break;
    }
    case 'multi': {
      const a1 = num(c.a1, 0), a2 = num(c.a2, 0);
      const am = (a1 + a2) / 2;
      const m1 = mu1(a1), m2 = mu1(a2), mv = mu2m(am);
      r.steps.push([mu1Txt(a1), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      r.steps.push([mu1Txt(a2), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      r.steps.push(['ᾱ = (α<sub>1</sub> + α<sub>2</sub>)/2 = ' + F(am, 1) + '°', 'PN-EN 1991-1-3, 5.3.4(1)', '1-3:5.3.4']);
      if (isNum(mv)) r.steps.push(['μ<sub>2</sub>(ᾱ) = ' + (am <= 30 ? '0,8 + 0,8·ᾱ/30 = 0,8 + 0,8·' + F(am, 1) + '/30 = ' : '1,6 = ') + F(mv, 3), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      else r.warn.push('ᾱ ≥ 60° – współczynnika μ<sub>2</sub> nie podaje się; wymagana odrębna analiza (5.3.4).');
      if (a1 > 60 || a2 > 60) r.warn.push('Kąt połaci > 60° – zalecana szczególna uwaga przy ustalaniu zaspy w koszu (5.3.4(3)).');
      r.steps.push(['s<sub>(i)</sub> = ' + F(Math.max(m1, m2), 3) + '·' + F(K, 3) + ' = ' + F(s(Math.max(m1, m2)), 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.7)', '1-3:5.3.4']);
      if (isNum(mv)) r.steps.push(['s<sub>(ii)</sub> w koszu = μ<sub>2</sub>·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> = ' + F(mv, 3) + '·' + F(K, 3) + ' = ' + F(s(mv), 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.7), rys. 5.4', '1-3:5.3.4']);
      r.cases.push({ label: 'Przypadek (i) – bez zawiewania', segs: [{ x0: 0, x1: .25, v0: m1, v1: m1 }, { x0: .25, x1: .5, v0: m2, v1: m2 }, { x0: .5, x1: .75, v0: m1, v1: m1 }, { x0: .75, x1: 1, v0: m2, v1: m2 }] });
      if (isNum(mv)) r.cases.push({ label: 'Przypadek (ii) – zaspa w koszu', segs: [{ x0: 0, x1: .25, v0: m1, v1: m1 }, { x0: .25, x1: .5, v0: m2, v1: mv }, { x0: .5, x1: .75, v0: mv, v1: m1 }, { x0: .75, x1: 1, v0: m2, v1: m2 }] });
      r.note = 'Przypadek (ii): μ<sub>2</sub>(ᾱ) w osi kosza, liniowo do μ<sub>1</sub> przy kalenicach przyległych połaci (rys. 5.4).';
      r.vals.push({ key: 'i', label: 's<sub>(i)</sub> – bez zawiewania (max)', v: s(Math.max(m1, m2)), mu: Math.max(m1, m2) });
      if (isNum(mv)) r.vals.push({ key: 'ii', label: 's<sub>(ii)</sub> – w koszu', v: s(mv), mu: mv });
      r.diag = { shape: 'multi', a1, a2 };
      r.def = isNum(mv) ? 'ii' : 'i';
      break;
    }
    case 'cyl': {
      const h = num(c.h, 0), b = Math.max(num(c.b, 1), 0.01);
      const R = (b * b / 4 + h * h) / (2 * Math.max(h, 1e-6));
      const be = h > 0 ? deg(Math.asin(clamp(b / (2 * R), 0, 1))) : 0;
      const m3raw = 0.2 + 10 * h / b, m3 = Math.min(m3raw, 2.0);
      const ls = be <= 60 ? b : R * Math.sqrt(3);
      r.steps.push(['promień R = (b²/4 + h²)/(2h) = ' + F(R, 2) + ' m; kąt stycznej przy okapie β = ' + F(be, 1) + '°', 'geometria', '']);
      r.steps.push(['μ<sub>3</sub> = 0,2 + 10·h/b = 0,2 + 10·' + F(h, 2) + '/' + F(b, 2) + ' = ' + F(m3raw, 3) + (m3raw > 2 ? ' > 2,0 → μ<sub>3</sub> = 2,0' : ''), 'PN-EN 1991-1-3, (5.5), rys. 5.5', '1-3:5.3.5']);
      r.steps.push(['l<sub>s</sub> – część dachu z β ≤ 60° = ' + F(ls, 2) + ' m', 'PN-EN 1991-1-3, rys. 5.6', '1-3:5.3.5']);
      if (be > 60) r.warn.push('Przy okapach, gdzie β > 60°, μ = 0.');
      r.steps.push(['s<sub>(i)</sub> = 0,8·' + F(K, 3) + ' = ' + F(s(0.8), 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.7)', '1-3:5.3.5']);
      r.steps.push(['s<sub>(ii)</sub>: zawietrzna μ<sub>3</sub>·' + F(K, 3) + ' = ' + F(s(m3), 3) + ' kN/m²; nawietrzna 0,5·μ<sub>3</sub>: ' + F(s(0.5 * m3), 3) + ' kN/m²', 'PN-EN 1991-1-3, (5.7), rys. 5.6', '1-3:5.3.5']);
      const e0 = (1 - ls / b) / 2, e1 = 1 - e0;
      r.cases.push({ label: 'Przypadek (i) – bez zawiewania', segs: [{ x0: e0, x1: e1, v0: 0.8, v1: 0.8 }] });
      r.cases.push({ label: 'Przypadek (ii) – z zawiewaniem', segs: [{ x0: e0, x1: .5, v0: 0, v1: 0.5 * m3 }, { x0: .5, x1: e1, v0: m3, v1: 0 }] });
      r.vals.push({ key: 'i', label: 's<sub>(i)</sub> – równomierne', v: s(0.8), mu: 0.8 });
      r.vals.push({ key: 'ii', label: 's<sub>(ii)</sub> – max (μ<sub>3</sub>)', v: s(m3), mu: m3 });
      r.diag = { shape: 'cyl', h, b };
      r.def = 'ii';
      break;
    }
    case 'tall': {
      const h = num(c.h, 0), b1 = num(c.b1, 0), b2 = num(c.b2, 0), au = num(c.au, 0), bu = num(c.bu, 0);
      const g = 2.0, m1 = 0.8;
      const lsRaw = 2 * h, ls = clamp(lsRaw, 5, 15);
      r.steps.push(['μ<sub>1</sub> = 0,8 (dolny dach płaski)', 'PN-EN 1991-1-3, 5.3.6(1)', '1-3:5.3.6']);
      let mw = (b1 + b2) / (2 * Math.max(h, 1e-6));
      const mwRaw = mw, lim = g * h / S.sk;
      let mwTxt = 'μ<sub>w</sub> = (b<sub>1</sub> + b<sub>2</sub>)/(2h) = (' + F(b1, 2) + ' + ' + F(b2, 2) + ')/(2·' + F(h, 2) + ') = ' + F(mwRaw, 3);
      if (mw > lim) { mw = lim; mwTxt += '; ≤ γ·h/s<sub>k</sub> = 2,0·' + F(h, 2) + '/' + F(S.sk, 3) + ' = ' + F(lim, 3); }
      const mwC = clamp(mw, 0.8, 4.0);
      if (mwC !== mw) mwTxt += ' → 0,8 ≤ μ<sub>w</sub> ≤ 4,0 → μ<sub>w</sub> = ' + F(mwC, 3);
      mw = mwC;
      r.steps.push([mwTxt, 'PN-EN 1991-1-3, (5.8), 5.3.6(1)', '1-3:5.3.6']);
      let ms = 0;
      if (au <= 15) r.steps.push(['α górnej połaci = ' + F(au, 1) + '° ≤ 15° → μ<sub>s</sub> = 0', 'PN-EN 1991-1-3, 5.3.6(1)', '1-3:5.3.6']);
      else {
        ms = mu1(au) * bu / ls;
        r.steps.push(['α = ' + F(au, 1) + '° > 15°: zsuwanie 50% śniegu z górnej połaci (rzut b<sub>p</sub>), rozkład trójkątny na l<sub>s</sub>: μ<sub>s</sub> = μ<sub>1</sub>(α)·b<sub>p</sub>/l<sub>s</sub> = ' + F(mu1(au), 3) + '·' + F(bu, 2) + '/' + F(ls, 2) + ' = ' + F(ms, 3), 'PN-EN 1991-1-3, 5.3.6(1)', '1-3:5.3.6']);
      }
      const m2 = ms + mw;
      r.steps.push(['μ<sub>2</sub> = μ<sub>s</sub> + μ<sub>w</sub> = ' + F(ms, 3) + ' + ' + F(mw, 3) + ' = ' + F(m2, 3), 'PN-EN 1991-1-3, (5.8)', '1-3:5.3.6']);
      r.steps.push(['l<sub>s</sub> = 2h = ' + F(lsRaw, 2) + ' m' + (lsRaw !== ls ? ' → 5 ≤ l<sub>s</sub> ≤ 15 m → l<sub>s</sub> = ' + F(ls, 2) + ' m' : ''), 'PN-EN 1991-1-3, (5.9)', '1-3:5.3.6']);
      let segs, mEnd = m1;
      if (b2 < ls) {
        mEnd = m2 - (m2 - m1) * b2 / ls;
        r.steps.push(['b<sub>2</sub> = ' + F(b2, 2) + ' m < l<sub>s</sub> → na końcu dachu μ = ' + F(m2, 3) + ' − (' + F(m2, 3) + ' − 0,8)·' + F(b2, 2) + '/' + F(ls, 2) + ' = ' + F(mEnd, 3) + ' (rozkład obcięty)', 'PN-EN 1991-1-3, 5.3.6(3)', '1-3:5.3.6']);
        segs = [{ x0: 0, x1: 1, v0: m2, v1: mEnd }];
      } else segs = [{ x0: 0, x1: ls / b2, v0: m2, v1: m1 }, { x0: ls / b2, x1: 1, v0: m1, v1: m1 }];
      r.steps.push(['s<sub>(i)</sub> = 0,8·' + F(K, 3) + ' = ' + F(s(m1), 3) + ' kN/m²; s<sub>(ii)</sub> = μ<sub>2</sub>·' + F(K, 3) + ' = ' + F(s(m2), 3) + ' kN/m² przy ścianie', 'PN-EN 1991-1-3, (5.7)', '1-3:5.3.6']);
      r.cases.push({ label: 'Przypadek (i) – bez zawiewania', segs: [{ x0: 0, x1: 1, v0: m1, v1: m1 }] });
      r.cases.push({ label: 'Przypadek (ii) – zaspa przy wyższej ścianie', segs });
      r.vals.push({ key: 'i', label: 's<sub>(i)</sub> – równomierne', v: s(m1), mu: m1 });
      r.vals.push({ key: 'ii', label: 's<sub>(ii)</sub> – max przy ścianie', v: s(m2), mu: m2 });
      r.vals.push({ key: 'avg', label: 's<sub>(ii)</sub> – średnie na l<sub>s</sub>', v: s((m2 + (b2 < ls ? mEnd : m1)) / 2), mu: (m2 + (b2 < ls ? mEnd : m1)) / 2 });
      r.diag = { shape: 'tall' };
      r.def = 'ii';
      break;
    }
    case 'obst': {
      const h = num(c.h, 0), g = 2.0;
      const m2raw = g * h / S.sk, m2 = clamp(m2raw, 0.8, 2.0);
      const lsRaw = 2 * h, ls = clamp(lsRaw, 5, 15);
      r.steps.push(['μ<sub>1</sub> = 0,8', 'PN-EN 1991-1-3, 6.2(2)', '1-3:6.2']);
      r.steps.push(['μ<sub>2</sub> = γ·h/s<sub>k</sub> = 2,0·' + F(h, 2) + '/' + F(S.sk, 3) + ' = ' + F(m2raw, 3) + (m2raw !== m2 ? ' → 0,8 ≤ μ<sub>2</sub> ≤ 2,0 → μ<sub>2</sub> = ' + F(m2, 3) : ''), 'PN-EN 1991-1-3, (6.1)', '1-3:6.2']);
      r.steps.push(['l<sub>s</sub> = 2h = ' + F(lsRaw, 2) + ' m' + (lsRaw !== ls ? ' → 5 ≤ l<sub>s</sub> ≤ 15 m → l<sub>s</sub> = ' + F(ls, 2) + ' m' : ''), 'PN-EN 1991-1-3, (6.2)', '1-3:6.2']);
      r.steps.push(['s<sub>1</sub> = 0,8·' + F(K, 3) + ' = ' + F(s(0.8), 3) + ' kN/m²; s<sub>2</sub> = ' + F(m2, 3) + '·' + F(K, 3) + ' = ' + F(s(m2), 3) + ' kN/m² przy przeszkodzie', 'PN-EN 1991-1-3, (5.7)', '1-3:6.2']);
      const L = num(c.L, 20);
      const xl = clamp(ls / Math.max(L, ls), 0, 1);
      r.cases.push({ label: 'Przypadek bez zawiewania', segs: [{ x0: 0, x1: 1, v0: .8, v1: .8 }] });
      r.cases.push({ label: 'Zaspa przy przeszkodzie (attyce)', segs: [{ x0: 0, x1: xl, v0: m2, v1: .8 }, { x0: xl, x1: 1, v0: .8, v1: .8 }] });
      r.vals.push({ key: 's1', label: 's<sub>1</sub> – poza zaspą', v: s(0.8), mu: 0.8 });
      r.vals.push({ key: 's2', label: 's<sub>2</sub> – max przy przeszkodzie', v: s(m2), mu: m2 });
      r.vals.push({ key: 'avg', label: 's – średnie na długości l<sub>s</sub>', v: s((m2 + 0.8) / 2), mu: (m2 + 0.8) / 2 });
      r.ls = ls;
      r.diag = { shape: 'obst' };
      r.def = 's2';
      break;
    }
    case 'over': {
      const mu = isNum(c.mu) ? c.mu : 0.8;
      const sr = s(mu), g = 3.0;
      const d = c.dman && isNum(c.d) ? c.d : sr / g;
      const kRaw = 3 / Math.max(d, 1e-6), k = Math.min(kRaw, d * g);
      const se = k * sr * sr / g;
      r.unit = 'kN/m';
      r.steps.push(['s = μ·C<sub>e</sub>·C<sub>t</sub>·s<sub>k</sub> = ' + F(mu, 3) + '·' + F(K, 3) + ' = ' + F(sr, 3) + ' kN/m² (przypadek bez zawiewania)', 'PN-EN 1991-1-3, 6.3(2)', '1-3:6.3']);
      r.steps.push(['d = ' + (c.dman ? '' : 's/γ = ' + F(sr, 3) + '/3,0 = ') + F(d, 3) + ' m – grubość warstwy śniegu na dachu (γ = 3,0 kN/m³)', 'PN-EN 1991-1-3, 6.3(2)', '1-3:6.3']);
      r.steps.push(['k = 3/d = ' + F(kRaw, 3) + '; k ≤ d·γ = ' + F(d * g, 3) + ' → k = ' + F(k, 3), 'PN-EN 1991-1-3, 6.3(2) uw.', '1-3:6.3']);
      r.steps.push(['s<sub>e</sub> = k·s²/γ = ' + F(k, 3) + '·' + F(sr, 3) + '²/3,0 = ' + F(se, 3) + ' kN/m (na krawędzi dachu)', 'PN-EN 1991-1-3, (6.4)', '1-3:6.3']);
      if (isNum(S.A) && S.A <= 800) r.warn.push('Nawisy śnieżne uwzględnia się dla miejsc położonych powyżej 800 m n.p.m. (6.3(1)) – tu A = ' + F(S.A, 0) + ' m.');
      r.vals.push({ key: 'se', label: 's<sub>e</sub> – obciążenie krawędzi dachu', v: se, unit: 'kN/m' });
      r.diag = { shape: 'over' };
      r.def = 'se';
      break;
    }
    case 'guard': {
      const a = num(c.a1, 0), b = num(c.b, 0);
      const mu = c.muMan && isNum(c.mu) ? c.mu : mu1(a);
      const sr = s(mu), Fs_ = sr * b * Math.sin(rad(a));
      r.unit = 'kN/m';
      r.steps.push([c.muMan ? 'μ = ' + F(mu, 3) + ' (podano)' : mu1Txt(a), 'PN-EN 1991-1-3, tabl. 5.2', '1-3:5.3']);
      r.steps.push(['s = ' + F(mu, 3) + '·' + F(K, 3) + ' = ' + F(sr, 3) + ' kN/m² (najniekorzystniejszy przypadek bez zawiewania)', 'PN-EN 1991-1-3, 6.4(2)', '1-3:6.4']);
      r.steps.push(['F<sub>s</sub> = s·b·sin α = ' + F(sr, 3) + '·' + F(b, 2) + '·sin ' + F(a, 1) + '° = ' + F(Fs_, 3) + ' kN/m', 'PN-EN 1991-1-3, (6.5)', '1-3:6.4']);
      r.note = 'Tarcie między śniegiem a pokryciem pomija się; b – odległość w rzucie od bariery do następnej bariery lub do kalenicy.';
      r.vals.push({ key: 'Fs', label: 'F<sub>s</sub> – siła na barierę (wzdłuż połaci)', v: Fs_, unit: 'kN/m' });
      r.diag = { shape: 'guard', a1: a };
      r.def = 'Fs';
      break;
    }
  }
  const gQ = f.gQ * f.KFI;
  r.vals.forEach(v => { if (!v.unit) v.unit = 'kN/m²'; v.vd = gQ * v.v; });
  return r;
}

/* =====================================================================
   W – WIATR (PN-EN 1991-1-4 + ZK PL)
   ===================================================================== */
/* ZK, tabl. NA.3: c_e(z) = a·(z/10)^e ; c_r(z) = ar·(z/10)^er */
const TER_NA = {
  '0': { a: 3.0, e: 0.17, ar: 1.3, er: 0.11, zmin: 1, zmax: 200, n: '0 – morze, obszary przybrzeżne otwartego morza' },
  'I': { a: 2.8, e: 0.19, ar: 1.2, er: 0.13, zmin: 1, zmax: 200, n: 'I – jeziora, obszary płaskie i poziome z nieznaczną roślinnością, bez przeszkód' },
  'II': { a: 2.3, e: 0.24, ar: 1.0, er: 0.17, zmin: 2, zmax: 300, n: 'II – niska roślinność, pojedyncze przeszkody w odległości ≥ 20 wysokości' },
  'III': { a: 1.9, e: 0.26, ar: 0.8, er: 0.19, zmin: 5, zmax: 400, n: 'III – regularna roślinność, budynki, przeszkody w odległości ≤ 20 wysokości (wsie, przedmieścia, las)' },
  'IV': { a: 1.5, e: 0.29, ar: 0.6, er: 0.24, zmin: 10, zmax: 500, n: 'IV – ≥ 15% powierzchni pokryte budynkami o średniej wysokości > 15 m' }
};
/* PN-EN 1991-1-4, tabl. 4.1: z0, zmin */
const TER_EN = { '0': [0.003, 1], 'I': [0.01, 1], 'II': [0.05, 2], 'III': [0.3, 5], 'IV': [1.0, 10] };
function vb0Zone(z, A, steps) {
  let vb0, rho = 1.25;
  if (z === 2) { vb0 = 26; steps.push(['strefa 2: v<sub>b,0</sub> = 26 m/s (q<sub>b,0</sub> = 0,42 kN/m²)', 'PN-EN 1991-1-4, ZK, tabl. NA.1', '1-4:NA']); }
  else if (A <= 300) { vb0 = 22; steps.push(['strefa ' + z + ', A ≤ 300 m: v<sub>b,0</sub> = 22 m/s (q<sub>b,0</sub> = 0,30 kN/m²)', 'PN-EN 1991-1-4, ZK, tabl. NA.1', '1-4:NA']); }
  else {
    vb0 = 22 * (1 + 0.0006 * (A - 300));
    steps.push(['strefa ' + z + ', 300 < A ≤ 1000 m: v<sub>b,0</sub> = 22·[1 + 0,0006·(A − 300)] = 22·[1 + 0,0006·(' + F(A, 0) + ' − 300)] = ' + F(vb0, 2) + ' m/s', 'PN-EN 1991-1-4, ZK, tabl. NA.1', '1-4:NA']);
    if (z === 3) {
      const k = (20000 - A) / (20000 + A);
      rho = 1.25 * k;
      steps.push(['strefa 3: q<sub>b,0</sub> z poprawką (20000 − A)/(20000 + A) = ' + F(k, 4) + ' → ρ<sub>zast</sub> = ' + F(rho, 4) + ' kg/m³', 'PN-EN 1991-1-4, ZK, tabl. NA.1', '1-4:NA']);
    }
    if (A > 1000) steps.push(['A > 1000 m – wartość wymaga indywidualnej analizy (poza zakresem ZK)', 'PN-EN 1991-1-4, ZK', '1-4:NA']);
  }
  return { vb0, rho };
}
function windBase(ws) {
  const A = num(ws.A, 0), z = +ws.zone || 1, zB = +ws.zoneB || 0;
  const steps = [];
  let vb0, rho;
  if (ws.vbMan && isNum(ws.vb0User)) { vb0 = ws.vb0User; rho = 1.25; steps.push(['v<sub>b,0</sub> = ' + F(vb0, 2) + ' m/s (wartość podana ręcznie)', '', '']); }
  else {
    ({ vb0, rho } = vb0Zone(z, A, steps));
    if (zB && zB !== z) {
      const b = vb0Zone(zB, A, steps);
      const mx = ws.trans === 'max';
      const v = mx ? Math.max(vb0, b.vb0) : (vb0 + b.vb0) / 2;
      steps.push(['pas przejściowy stref ' + z + ' i ' + zB + ' (±10 km od granicy): ' + (mx ? 'wartość większa' : 'średnia (' + F(vb0, 2) + ' + ' + F(b.vb0, 2) + ')/2') + ' → v<sub>b,0</sub> = ' + F(v, 2) + ' m/s', 'PN-EN 1991-1-4, ZK, rys. NA.1', '1-4:NA']);
      vb0 = v; rho = Math.min(rho, b.rho);
    }
  }
  if (ws.method === 'EN' && isNum(ws.rho) && ws.rho !== 1.25 && !(z === 3 && A > 300)) rho = ws.rho;
  const cdir = num(ws.cdir, 1), cs = num(ws.cseason, 1);
  const vb = cdir * cs * vb0;
  const qb = 0.5 * rho * vb * vb / 1000;
  steps.push(['v<sub>b</sub> = c<sub>dir</sub>·c<sub>season</sub>·v<sub>b,0</sub> = ' + F(cdir, 2) + '·' + F(cs, 2) + '·' + F(vb0, 2) + ' = ' + F(vb, 2) + ' m/s', 'PN-EN 1991-1-4, (4.1)', '1-4:4.2']);
  steps.push(['q<sub>b</sub> = ½·ρ·v<sub>b</sub>² = 0,5·' + F(rho, 3) + '·' + F(vb, 2) + '² = ' + F(qb * 1000, 1) + ' Pa = ' + F(qb, 3) + ' kN/m²', 'PN-EN 1991-1-4, (4.10)', '1-4:4.5']);
  return { vb0, vb, qb, rho, cdir, cs, steps };
}
/* szczytowe ciśnienie prędkości na wysokości z */
function qpAt(z, ws, wb, methodOverride) {
  const cat = ws.terrain || 'III';
  const method = methodOverride || ws.method || 'NA';
  if (method === 'man') {
    const qp = num(ws.qpUser, NaN);
    return { z, zz: z, ce: qp / wb.qb, qp, txt: 'q<sub>p</sub> = ' + F(qp, 3) + ' kN/m² (wartość podana ręcznie)', ref: '', key: '' };
  }
  if (method === 'EN') {
    const [z0, zmin] = TER_EN[cat];
    const co = num(ws.co, 1), kI = num(ws.kI, 1);
    const zz = clamp(z, zmin, 200);
    const kr = 0.19 * Math.pow(z0 / 0.05, 0.07);
    const cr = kr * Math.log(zz / z0);
    const vm = cr * co * wb.vb;
    const Iv = kI / (co * Math.log(zz / z0));
    const qp = (1 + 7 * Iv) * 0.5 * wb.rho * vm * vm / 1000;
    return {
      z, zz, ce: qp / wb.qb, qp, cr, Iv, vm, kr, z0,
      txt: 'z = ' + F(z, 2) + ' m' + (zz !== z ? ' → z = ' + F(zz, 2) + ' m (z<sub>min</sub> = ' + F(zmin, 0) + ' m)' : '') + '; z<sub>0</sub> = ' + F(z0, 3) + ' m; k<sub>r</sub> = 0,19·(z<sub>0</sub>/0,05)<sup>0,07</sup> = ' + F(kr, 4) + '; c<sub>r</sub> = k<sub>r</sub>·ln(z/z<sub>0</sub>) = ' + F(cr, 4) + '; c<sub>o</sub> = ' + F(co, 2) + '; v<sub>m</sub> = c<sub>r</sub>·c<sub>o</sub>·v<sub>b</sub> = ' + F(vm, 2) + ' m/s; I<sub>v</sub> = k<sub>I</sub>/(c<sub>o</sub>·ln(z/z<sub>0</sub>)) = ' + F(Iv, 4) + '; q<sub>p</sub> = [1 + 7·I<sub>v</sub>]·½·ρ·v<sub>m</sub>² = ' + F(qp, 3) + ' kN/m² (c<sub>e</sub> = ' + F(qp / wb.qb, 3) + ')',
      ref: 'PN-EN 1991-1-4, (4.3)–(4.8)', key: '1-4:4.5EN'
    };
  }
  const T = TER_NA[cat];
  const zz = clamp(z, T.zmin, T.zmax);
  const ce = T.a * Math.pow(zz / 10, T.e);
  const qp = ce * wb.qb;
  return {
    z, zz, ce, qp, cr: T.ar * Math.pow(zz / 10, T.er),
    txt: 'kat. ' + cat + ': c<sub>e</sub>(z) = ' + F(T.a, 1) + '·(z/10)<sup>' + F(T.e, 2) + '</sup>; z = ' + F(z, 2) + ' m' + (zz !== z ? ' → ' + F(zz, 2) + ' m (z<sub>min</sub> = ' + F(T.zmin, 0) + ' m)' : '') + ' → c<sub>e</sub> = ' + F(ce, 3) + '; q<sub>p</sub> = c<sub>e</sub>·q<sub>b</sub> = ' + F(ce, 3) + '·' + F(wb.qb, 3) + ' = ' + F(qp, 3) + ' kN/m²',
    ref: 'PN-EN 1991-1-4, ZK, tabl. NA.3', key: '1-4:4.5NA'
  };
}
/* tablice c_pe: komórka [cpe10, cpe1]; strefa {n: ssanie, p: parcie} */
const cc = (a, b) => [a, b === undefined ? a : b];
const Zn = (n, p) => ({ n: n || null, p: p || null });
const N = n => Zn(n, null);
const WALL = [ // tabl. 7.1: h/d, A, B, C, D, E
  [0.25, cc(-1.2, -1.4), cc(-0.8, -1.1), cc(-0.5), cc(0.7, 1.0), cc(-0.3)],
  [1, cc(-1.2, -1.4), cc(-0.8, -1.1), cc(-0.5), cc(0.8, 1.0), cc(-0.5)],
  [5, cc(-1.2, -1.4), cc(-0.8, -1.1), cc(-0.5), cc(0.8, 1.0), cc(-0.7)]
];
const FLAT = { // tabl. 7.2: F, G, H (I = ±0,2)
  sharp: [cc(-1.8, -2.5), cc(-1.2, -2.0), cc(-0.7, -1.2)],
  par: [[0.025, cc(-1.6, -2.2), cc(-1.1, -1.8), cc(-0.7, -1.2)], [0.05, cc(-1.4, -2.0), cc(-0.9, -1.6), cc(-0.7, -1.2)], [0.10, cc(-1.2, -1.8), cc(-0.8, -1.4), cc(-0.7, -1.2)]],
  cur: [[0.05, cc(-1.0, -1.5), cc(-1.2, -1.8), cc(-0.4)], [0.10, cc(-0.7, -1.2), cc(-0.8, -1.4), cc(-0.3)], [0.20, cc(-0.5, -0.8), cc(-0.5, -0.8), cc(-0.3)]],
  man: [[30, cc(-1.0, -1.5), cc(-1.0, -1.5), cc(-0.3)], [45, cc(-1.2, -1.8), cc(-1.3, -1.9), cc(-0.4)], [60, cc(-1.3, -1.9), cc(-1.3, -1.9), cc(-0.5)]]
};
const MONO0 = [ // tabl. 7.3a, θ = 0°: F, G, H
  [5, Zn(cc(-1.7, -2.5), cc(0)), Zn(cc(-1.2, -2.0), cc(0)), Zn(cc(-0.6, -1.2), cc(0))],
  [15, Zn(cc(-0.9, -2.0), cc(0.2)), Zn(cc(-0.8, -1.5), cc(0.2)), Zn(cc(-0.3), cc(0.2))],
  [30, Zn(cc(-0.5, -1.5), cc(0.7)), Zn(cc(-0.5, -1.5), cc(0.7)), Zn(cc(-0.2), cc(0.4))],
  [45, Zn(cc(-0.0), cc(0.7)), Zn(cc(-0.0), cc(0.7)), Zn(cc(-0.0), cc(0.6))],
  [60, Zn(null, cc(0.7)), Zn(null, cc(0.7)), Zn(null, cc(0.7))],
  [75, Zn(null, cc(0.8)), Zn(null, cc(0.8)), Zn(null, cc(0.8))]
];
const MONO180 = [ // tabl. 7.3a, θ = 180°
  [5, N(cc(-2.3, -2.5)), N(cc(-1.3, -2.0)), N(cc(-0.8, -1.2))],
  [15, N(cc(-2.5, -2.8)), N(cc(-1.3, -2.0)), N(cc(-0.9, -1.2))],
  [30, N(cc(-1.1, -2.3)), N(cc(-0.8, -1.5)), N(cc(-0.8))],
  [45, N(cc(-0.6, -1.3)), N(cc(-0.5)), N(cc(-0.7))],
  [60, N(cc(-0.5, -1.0)), N(cc(-0.5)), N(cc(-0.5))],
  [75, N(cc(-0.5, -1.0)), N(cc(-0.5)), N(cc(-0.5))]
];
const MONO90 = [ // tabl. 7.3b, θ = 90°: Fup, Flow, G, H, I
  [5, N(cc(-2.1, -2.6)), N(cc(-2.1, -2.4)), N(cc(-1.8, -2.0)), N(cc(-0.6, -1.2)), N(cc(-0.5))],
  [15, N(cc(-2.4, -2.9)), N(cc(-1.6, -2.4)), N(cc(-1.9, -2.5)), N(cc(-0.8, -1.2)), N(cc(-0.7, -1.2))],
  [30, N(cc(-2.1, -2.9)), N(cc(-1.3, -2.0)), N(cc(-1.5, -2.0)), N(cc(-1.0, -1.3)), N(cc(-0.8, -1.2))],
  [45, N(cc(-1.5, -2.4)), N(cc(-1.3, -2.0)), N(cc(-1.4, -2.0)), N(cc(-1.0, -1.3)), N(cc(-0.9, -1.2))],
  [60, N(cc(-1.2, -2.0)), N(cc(-1.2, -2.0)), N(cc(-1.2, -2.0)), N(cc(-1.0, -1.3)), N(cc(-0.7, -1.2))],
  [75, N(cc(-1.2, -2.0)), N(cc(-1.2, -2.0)), N(cc(-1.2, -2.0)), N(cc(-1.0, -1.3)), N(cc(-0.5))]
];
const DUO0 = [ // tabl. 7.4a, θ = 0°: F, G, H, I, J
  [-45, N(cc(-0.6)), N(cc(-0.6)), N(cc(-0.8)), N(cc(-0.7)), N(cc(-1.0, -1.5))],
  [-30, N(cc(-1.1, -2.0)), N(cc(-0.8, -1.5)), N(cc(-0.8)), N(cc(-0.6)), N(cc(-0.8, -1.4))],
  [-15, N(cc(-2.5, -2.8)), N(cc(-1.3, -2.0)), N(cc(-0.9, -1.2)), N(cc(-0.5)), N(cc(-0.7, -1.2))],
  [-5, N(cc(-2.3, -2.5)), N(cc(-1.2, -2.0)), N(cc(-0.8, -1.2)), Zn(cc(-0.6), cc(0.2)), Zn(cc(-0.6), cc(0.2))],
  [5, Zn(cc(-1.7, -2.5), cc(0)), Zn(cc(-1.2, -2.0), cc(0)), Zn(cc(-0.6, -1.2), cc(0)), N(cc(-0.6)), Zn(cc(-0.6), cc(0.2))],
  [15, Zn(cc(-0.9, -2.0), cc(0.2)), Zn(cc(-0.8, -1.5), cc(0.2)), Zn(cc(-0.3), cc(0.2)), Zn(cc(-0.4), cc(0)), Zn(cc(-1.0, -1.5), cc(0))],
  [30, Zn(cc(-0.5, -1.5), cc(0.7)), Zn(cc(-0.5, -1.5), cc(0.7)), Zn(cc(-0.2), cc(0.4)), Zn(cc(-0.4), cc(0)), Zn(cc(-0.5), cc(0))],
  [45, Zn(cc(-0.0), cc(0.7)), Zn(cc(-0.0), cc(0.7)), Zn(cc(-0.0), cc(0.6)), Zn(cc(-0.2), cc(0)), Zn(cc(-0.3), cc(0))],
  [60, Zn(null, cc(0.7)), Zn(null, cc(0.7)), Zn(null, cc(0.7)), N(cc(-0.2)), N(cc(-0.3))],
  [75, Zn(null, cc(0.8)), Zn(null, cc(0.8)), Zn(null, cc(0.8)), N(cc(-0.2)), N(cc(-0.3))]
];
const DUO90 = [ // tabl. 7.4b, θ = 90°: F, G, H, I
  [-45, N(cc(-1.4, -2.0)), N(cc(-1.2, -2.0)), N(cc(-1.0, -1.3)), N(cc(-0.9, -1.2))],
  [-30, N(cc(-1.5, -2.1)), N(cc(-1.2, -2.0)), N(cc(-1.0, -1.3)), N(cc(-0.9, -1.2))],
  [-15, N(cc(-1.9, -2.5)), N(cc(-1.2, -2.0)), N(cc(-0.8, -1.2)), N(cc(-0.8, -1.2))],
  [-5, N(cc(-1.8, -2.5)), N(cc(-1.2, -2.0)), N(cc(-0.7, -1.2)), N(cc(-0.6, -1.2))],
  [5, N(cc(-1.6, -2.2)), N(cc(-1.3, -2.0)), N(cc(-0.7, -1.2)), N(cc(-0.6))],
  [15, N(cc(-1.3, -2.0)), N(cc(-1.3, -2.0)), N(cc(-0.6, -1.2)), N(cc(-0.5))],
  [30, N(cc(-1.1, -1.5)), N(cc(-1.4, -2.0)), N(cc(-0.8, -1.2)), N(cc(-0.5))],
  [45, N(cc(-1.1, -1.5)), N(cc(-1.4, -2.0)), N(cc(-0.9, -1.2)), N(cc(-0.5))],
  [60, N(cc(-1.1, -1.5)), N(cc(-1.2, -2.0)), N(cc(-0.8, -1.0)), N(cc(-0.5))],
  [75, N(cc(-1.1, -1.5)), N(cc(-1.2, -2.0)), N(cc(-0.8, -1.0)), N(cc(-0.5))]
];
const HIP = [ // tabl. 7.5: F G H I J K L M N
  [5, Zn(cc(-1.7, -2.5), cc(0)), Zn(cc(-1.2, -2.0), cc(0)), Zn(cc(-0.6, -1.2), cc(0)), N(cc(-0.3)), N(cc(-0.6)), N(cc(-0.6)), N(cc(-1.2, -2.0)), N(cc(-0.6, -1.2)), N(cc(-0.4))],
  [15, Zn(cc(-0.9, -2.0), cc(0.2)), Zn(cc(-0.8, -1.5), cc(0.2)), Zn(cc(-0.3), cc(0.2)), N(cc(-0.5)), N(cc(-1.0, -1.5)), N(cc(-1.2, -2.0)), N(cc(-1.4, -2.0)), N(cc(-0.6, -1.2)), N(cc(-0.3))],
  [30, Zn(cc(-0.5, -1.5), cc(0.5)), Zn(cc(-0.5, -1.5), cc(0.7)), Zn(cc(-0.2), cc(0.4)), N(cc(-0.4)), N(cc(-0.7, -1.2)), N(cc(-0.5)), N(cc(-1.4, -2.0)), N(cc(-0.8, -1.2)), N(cc(-0.2))],
  [45, Zn(cc(-0.0), cc(0.7)), Zn(cc(-0.0), cc(0.7)), Zn(cc(-0.0), cc(0.6)), N(cc(-0.3)), N(cc(-0.6)), N(cc(-0.3)), N(cc(-1.3, -2.0)), N(cc(-0.8, -1.2)), N(cc(-0.2))],
  [60, Zn(null, cc(0.7)), Zn(null, cc(0.7)), Zn(null, cc(0.7)), N(cc(-0.3)), N(cc(-0.6)), N(cc(-0.3)), N(cc(-1.2, -2.0)), N(cc(-0.4)), N(cc(-0.2))],
  [75, Zn(null, cc(0.8)), Zn(null, cc(0.8)), Zn(null, cc(0.8)), N(cc(-0.3)), N(cc(-0.6)), N(cc(-0.3)), N(cc(-1.2, -2.0)), N(cc(-0.4)), N(cc(-0.2))]
];
/* wiaty – tabl. 7.6 (jednospadowe): α, [cf, A, B, C] dla max (wszystkie φ), min φ = 0, min φ = 1 */
const CANOPY1 = [
  [0, [0.2, 0.5, 1.8, 1.1], [-0.5, -0.6, -1.3, -1.4], [-1.3, -1.5, -1.8, -2.2]],
  [5, [0.4, 0.8, 2.1, 1.3], [-0.7, -1.1, -1.7, -1.8], [-1.4, -1.6, -2.2, -2.5]],
  [10, [0.5, 1.2, 2.4, 1.6], [-0.9, -1.5, -2.0, -2.1], [-1.4, -2.1, -2.6, -2.7]],
  [15, [0.7, 1.4, 2.7, 1.8], [-1.1, -1.8, -2.4, -2.5], [-1.4, -1.6, -2.9, -3.0]],
  [20, [0.8, 1.7, 2.9, 2.1], [-1.3, -2.2, -2.8, -2.9], [-1.4, -1.6, -2.9, -3.0]],
  [25, [1.0, 2.0, 3.1, 2.3], [-1.6, -2.6, -3.2, -3.2], [-1.4, -1.5, -2.5, -2.8]],
  [30, [1.2, 2.2, 3.2, 2.4], [-1.8, -3.0, -3.8, -3.6], [-1.4, -1.5, -2.2, -2.7]]
];
/* wiaty – tabl. 7.7 (dwuspadowe): α, [cf, A, B, C, D] */
const CANOPY2 = [
  [-20, [0.7, 0.8, 1.6, 0.6, 1.7], [-0.7, -0.9, -1.3, -1.6, -0.6], [-0.9, -1.5, -2.4, -2.4, -0.6]],
  [-15, [0.5, 0.6, 1.5, 0.7, 1.4], [-0.6, -0.8, -1.3, -1.6, -0.6], [-0.8, -1.6, -2.7, -2.6, -0.6]],
  [-10, [0.4, 0.6, 1.4, 0.8, 1.1], [-0.6, -0.8, -1.3, -1.5, -0.6], [-0.8, -1.6, -2.7, -2.6, -0.6]],
  [-5, [0.3, 0.5, 1.5, 0.8, 0.8], [-0.5, -0.7, -1.3, -1.6, -0.6], [-0.8, -1.5, -2.4, -2.4, -0.6]],
  [5, [0.3, 0.6, 1.8, 1.3, 0.4], [-0.6, -0.6, -1.4, -1.4, -1.1], [-0.9, -1.3, -2.0, -1.8, -1.5]],
  [10, [0.4, 0.7, 1.8, 1.4, 0.4], [-0.7, -0.7, -1.5, -1.4, -1.4], [-0.9, -1.3, -2.0, -1.8, -1.8]],
  [15, [0.4, 0.9, 1.9, 1.4, 0.4], [-0.8, -0.9, -1.7, -1.4, -1.8], [-0.9, -1.3, -2.2, -1.6, -2.1]],
  [20, [0.6, 1.1, 1.9, 1.5, 0.4], [-0.9, -1.2, -1.8, -1.4, -2.0], [-1.2, -1.4, -2.2, -1.6, -2.1]],
  [25, [0.7, 1.2, 1.9, 1.6, 0.5], [-1.0, -1.4, -1.9, -1.4, -2.0], [-1.2, -1.4, -2.0, -1.5, -2.0]],
  [30, [0.9, 1.3, 1.9, 1.6, 0.7], [-1.0, -1.4, -1.9, -1.4, -2.0], [-1.3, -1.4, -1.8, -1.4, -2.0]]
];
const lerpCell = (a, b, t) => a && b ? [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] : null;
function interpZ(rows, a) {
  a = clamp(a, rows[0][0], rows[rows.length - 1][0]);
  const i = rows.findIndex(r => r[0] >= a);
  if (rows[i][0] === a) return rows[i].slice(1).map(z => ({ n: z.n && z.n.slice(), p: z.p && z.p.slice() }));
  const r0 = rows[i - 1], r1 = rows[i], t = (a - r0[0]) / (r1[0] - r0[0]);
  return r0.slice(1).map((z0, k) => { const z1 = r1[k + 1]; return { n: lerpCell(z0.n, z1.n, t), p: lerpCell(z0.p, z1.p, t) }; });
}
function interpCells(rows, x) {
  x = clamp(x, rows[0][0], rows[rows.length - 1][0]);
  const i = rows.findIndex(r => r[0] >= x);
  if (rows[i][0] === x) return rows[i].slice(1).map(c => c.slice());
  const r0 = rows[i - 1], r1 = rows[i], t = (x - r0[0]) / (r1[0] - r0[0]);
  return r0.slice(1).map((c0, k) => lerpCell(c0, r1[k + 1], t));
}
function interpVec(rows, x) { // rows: [x, vecMax, vecMin0, vecMin1]
  x = clamp(x, rows[0][0], rows[rows.length - 1][0]);
  const i = rows.findIndex(r => r[0] >= x);
  if (rows[i][0] === x) return rows[i].slice(1).map(v => v.slice());
  const r0 = rows[i - 1], r1 = rows[i], t = (x - r0[0]) / (r1[0] - r0[0]);
  return [1, 2, 3].map(k => r0[k].map((v, j) => lerp(v, r1[k][j], t)));
}
function cpeA(cell, A) {
  if (!cell) return null;
  const [c10, c1] = cell;
  if (!isNum(A) || A >= 10) return c10;
  if (A <= 1) return c1;
  return c1 - (c1 - c10) * Math.log10(A);
}
function wallCpe(h, d) {
  const hd = h / d;
  const cells = interpCells(WALL, hd);
  return { hd, A: cells[0], B: cells[1], C: cells[2], D: cells[3], E: cells[4] };
}
/* rys. 7.13: c_pi w funkcji μ i h/d (h/d ≤ 0,25 → −0,3; h/d ≥ 1,0 → −0,5 przy μ ≥ 0,9; +0,35 przy μ ≤ 0,33) */
function cpiMu(mu, hd) {
  const f = low => mu <= 0.33 ? 0.35 : mu >= 0.9 ? low : 0.35 + (low - 0.35) * (mu - 0.33) / (0.9 - 0.33);
  const a = f(-0.3), b = f(-0.5);
  if (hd <= 0.25) return a;
  if (hd >= 1) return b;
  return a + (b - a) * (hd - 0.25) / 0.75;
}
function cpiSet(c, wc) {
  const mode = c.cpiMode || 'std';
  if (mode === 'std') return { vals: [0.2, -0.3], txt: 'c<sub>pi</sub> = +0,2 oraz −0,3 (brak danych o otworach – przyjmuje się bardziej niekorzystną)', ref: 'PN-EN 1991-1-4, 7.2.9(6) uw. 2', key: '1-4:7.2.9' };
  if (mode === 'none') return { vals: [0], txt: 'c<sub>pi</sub> = 0 (pominięto ciśnienie wewnętrzne – np. element zewnętrzny, wiata, ściana jednowarstwowa bez wnętrza)', ref: '', key: '' };
  if (mode === 'man') { const v = [c.cpi1, c.cpi2].filter(isNum); return { vals: v.length ? v : [0], txt: 'c<sub>pi</sub> = ' + v.map(x => Fs(x, 2)).join(' oraz ') + ' (podano)', ref: '', key: '' }; }
  if (mode === 'dom') {
    const r = Math.max(num(c.cpiRatio, 2), 2);
    const k = r >= 3 ? 0.9 : 0.75 + 0.15 * (r - 2);
    const face = c.cpiFace || 'D';
    const cpe = wc[face] ? wc[face][0] : 0.8;
    const v = k * cpe;
    return { vals: [v], txt: 'ściana dominująca ' + face + ' (pole otworów ' + F(r, 2) + '× większe od pozostałych): c<sub>pi</sub> = ' + F(k, 3) + '·c<sub>pe</sub> = ' + F(k, 3) + '·' + Fp(cpe, 2) + ' = ' + Fs(v, 3), ref: 'PN-EN 1991-1-4, 7.2.9(5), (7.1), (7.2)', key: '1-4:7.2.9' };
  }
  if (mode === 'mu') {
    const mu = clamp(num(c.cpiMuV, 0.5), 0, 1);
    const v = cpiMu(mu, wc.hd);
    return { vals: [v], txt: 'μ = ' + F(mu, 2) + ', h/d = ' + F(wc.hd, 2) + ' → c<sub>pi</sub> = ' + Fs(v, 3) + ' (rys. 7.13, interpolacja liniowa)', ref: 'PN-EN 1991-1-4, 7.2.9(6), rys. 7.13', key: '1-4:7.2.9' };
  }
  return { vals: [0.2, -0.3], txt: '', ref: '', key: '' };
}
function zoneResults(zones, qp, cpi, cscd, r) {
  const rows = [];
  zones.forEach(Z => {
    const cand = [];
    ['n', 'p'].forEach(k => { if (Z[k] !== null && Z[k] !== undefined) cpi.vals.forEach(ci => cand.push({ cpe: Z[k], cpi: ci, w: cscd * qp * Z[k] - qp * ci })); });
    if (!cand.length) return;
    let mx = cand[0], mn = cand[0];
    cand.forEach(x => { if (x.w > mx.w) mx = x; if (x.w < mn.w) mn = x; });
    const cpes = [Z.n, Z.p].filter(x => x !== null && x !== undefined);
    rows.push({ z: Z.z, cpes, we: cpes.map(x => cscd * qp * x), max: mx, min: mn, dim: Z.dim || '' });
    r.vals.push({ key: Z.z, label: 'strefa ' + Z.z, v: mx.w, vmin: mn.w, unit: 'kN/m²', wind: true });
  });
  return rows;
}
function windCalc(c, ws, fIn) {
  const f = factors(fIn);
  const wb = windBase(ws);
  const r = { steps: [], vals: [], warn: [], unit: 'kN/m²', fam: 'wind', psi: PSI.wind };
  const cscd = num(ws.cscd, 1);
  const A = num(c.Aload, 10);
  const Atxt = A >= 10 ? 'c<sub>pe</sub> = c<sub>pe,10</sub> (A = ' + F(A, 1) + ' m² ≥ 10 m²)' : A <= 1 ? 'c<sub>pe</sub> = c<sub>pe,1</sub> (A ≤ 1 m²)' : 'c<sub>pe</sub> = c<sub>pe,1</sub> − (c<sub>pe,1</sub> − c<sub>pe,10</sub>)·log<sub>10</sub>A, A = ' + F(A, 2) + ' m²';
  const zOver = isNum(c.zeMan) && c.zeUse ? c.zeMan : null;
  const building = ['walls', 'flat', 'mono', 'duo', 'hip'].includes(c.type);
  if (building) {
    const h = num(c.h, 0), b = num(c.b, 1), d = num(c.d, 1);
    const ze = zOver !== null ? zOver : h;
    const q = qpAt(ze, ws, wb);
    r.qp = q.qp; r.ze = ze;
    r.steps.push(['z<sub>e</sub> = ' + (zOver !== null ? F(ze, 2) + ' m (podano)' : 'h = ' + F(h, 2) + ' m') + ': ' + q.txt, q.ref, q.key]);
    if (q.zz < ze && ws.method !== 'EN' && ws.method !== 'man') { /* zmax */ }
    const wc = wallCpe(h, d);
    const cpi = cpiSet(c, wc);
    r.cpi = cpi;
    r.steps.push([cpi.txt, cpi.ref, cpi.key]);
    if (cpi.vals.some(v => v !== 0)) r.steps.push(['w<sub>i</sub> = q<sub>p</sub>(z<sub>i</sub>)·c<sub>pi</sub>, z<sub>i</sub> = z<sub>e</sub> → ' + cpi.vals.map(v => F(q.qp * v, 3)).join(' / ') + ' kN/m²', 'PN-EN 1991-1-4, (5.2)', '1-4:5.2']);
    r.steps.push([Atxt, 'PN-EN 1991-1-4, 7.2.1, rys. 7.2', '1-4:7.2.1']);
    if (cscd !== 1) r.steps.push(['c<sub>s</sub>c<sub>d</sub> = ' + F(cscd, 2) + ' – stosowany do ciśnienia zewnętrznego', 'PN-EN 1991-1-4, 6.2', '1-4:6.2']);
    const e = Math.min(b, 2 * h);
    r.e = e;
    if (c.type === 'walls') {
      r.steps.push(['e = min(b; 2h) = min(' + F(b, 2) + '; ' + F(2 * h, 2) + ') = ' + F(e, 2) + ' m; h/d = ' + F(h, 2) + '/' + F(d, 2) + ' = ' + F(wc.hd, 3), 'PN-EN 1991-1-4, rys. 7.5', '1-4:7.2.2']);
      let zl;
      if (e < d) zl = [['A', e / 5], ['B', 4 * e / 5], ['C', d - e]];
      else if (e < 5 * d) zl = [['A', e / 5], ['B', d - e / 5]];
      else zl = [['A', d]];
      r.zoneLen = zl;
      r.steps.push(['c<sub>pe,10</sub> (h/d = ' + F(wc.hd, 2) + '): A ' + Fs(wc.A[0], 2) + ', B ' + Fs(wc.B[0], 2) + ', C ' + Fs(wc.C[0], 2) + ', D ' + Fs(wc.D[0], 2) + ', E ' + Fs(wc.E[0], 2) + (wc.hd > 0.25 && wc.hd < 5 && wc.hd !== 1 ? ' (interpolacja liniowa)' : ''), 'PN-EN 1991-1-4, tabl. 7.1', '1-4:7.2.2']);
      const zones = zl.map(([z, L]) => ({ z, n: cpeA(wc[z], A), p: null, dim: 'pas ' + F(L, 2) + ' m' }));
      zones.push({ z: 'D', n: null, p: cpeA(wc.D, A), dim: 'ściana nawietrzna' });
      zones.push({ z: 'E', n: cpeA(wc.E, A), p: null, dim: 'ściana zawietrzna' });
      r.zones = zoneResults(zones, q.qp, cpi, cscd, r);
      const prof = [];
      if (h <= b) prof.push([0, h, h]);
      else if (h <= 2 * b) { prof.push([0, b, b]); prof.push([b, h, h]); }
      else {
        prof.push([0, b, b]);
        const n = Math.max(1, Math.ceil((h - 2 * b) / b)), hs = (h - 2 * b) / n;
        for (let i = 0; i < n; i++) prof.push([b + i * hs, b + (i + 1) * hs, b + (i + 1) * hs]);
        prof.push([h - b, h, h]);
      }
      r.profile = prof.map(([z0, z1, z]) => { const qq = qpAt(z, ws, wb); return { z0, z1, ze: z, qp: qq.qp, wD: cscd * qq.qp * cpeA(wc.D, A) }; });
      if (prof.length > 1) r.steps.push(['h > b: profil z<sub>e</sub> na ścianie nawietrznej wg rys. 7.4 (' + prof.length + ' pasy)', 'PN-EN 1991-1-4, 7.2.2(1), rys. 7.4', '1-4:7.2.2']);
      const hd = wc.hd;
      const fcor = hd >= 5 ? 1 : hd <= 1 ? 0.85 : 0.85 + 0.15 * (hd - 1) / 4;
      r.fcor = fcor;
      const Fnet = (cpeA(wc.D, 10) - cpeA(wc.E, 10)) * q.qp * cscd * fcor;
      r.steps.push(['brak pełnej korelacji parcia D i ssania E: siła wypadkowa na budynek × ' + F(fcor, 3) + ' → (c<sub>pe,D</sub> − c<sub>pe,E</sub>)·q<sub>p</sub>·c<sub>s</sub>c<sub>d</sub>·' + F(fcor, 3) + ' = ' + F(Fnet, 3) + ' kN/m² rzutu ściany', 'PN-EN 1991-1-4, 7.2.2(3)', '1-4:7.2.2']);
      r.vals.push({ key: 'DEnet', label: 'D + E – wypadkowe (z f<sub>kor</sub>)', v: Fnet, unit: 'kN/m²', wind: true, vmin: Fnet });
      r.diag = { shape: 'walls', b, d, zl, e };
      r.def = 'D';
    } else if (c.type === 'flat') {
      let cells, tx = '';
      const eav = c.eaves || 'sharp';
      if (eav === 'sharp') { cells = FLAT.sharp; tx = 'krawędź ostra'; }
      else if (eav === 'par') {
        const hp = num(c.hp, 0), x = hp / h;
        if (x < 0.025) cells = FLAT.sharp.map((c0, k) => lerpCell(c0, FLAT.par[0][k + 1], x / 0.025));
        else cells = interpCells(FLAT.par, x);
        tx = 'attyka h<sub>p</sub>/h = ' + F(hp, 2) + '/' + F(h, 2) + ' = ' + F(x, 3) + (x < 0.025 ? ' (interpolacja: krawędź ostra – h<sub>p</sub>/h = 0,025)' : x > 0.1 ? ' (przyjęto jak dla 0,10)' : '');
      } else if (eav === 'cur') { const x = num(c.rr, 0) / h; cells = interpCells(FLAT.cur, x); tx = 'krawędź zaokrąglona r/h = ' + F(x, 3); }
      else { const x = num(c.am, 45); cells = interpCells(FLAT.man, x); tx = 'krawędź mansardowa α = ' + F(x, 1) + '°'; }
      r.steps.push(['e = min(b; 2h) = ' + F(e, 2) + ' m; ' + tx + ' → c<sub>pe,10</sub>: F ' + Fs(cells[0][0], 2) + ', G ' + Fs(cells[1][0], 2) + ', H ' + Fs(cells[2][0], 2) + ', I ±0,20', 'PN-EN 1991-1-4, tabl. 7.2, rys. 7.6', '1-4:7.2.3']);
      const zones = [
        { z: 'F', n: cpeA(cells[0], A), p: null, dim: F(e / 4, 2) + ' × ' + F(e / 10, 2) + ' m (narożniki)' },
        { z: 'G', n: cpeA(cells[1], A), p: null, dim: F(Math.max(b - e / 2, 0), 2) + ' × ' + F(e / 10, 2) + ' m' },
        { z: 'H', n: cpeA(cells[2], A), p: null, dim: 'pas ' + F(e / 10, 2) + '–' + F(e / 2, 2) + ' m od krawędzi' },
        { z: 'I', n: -0.2, p: 0.2, dim: 'pozostała część (> ' + F(e / 2, 2) + ' m)' }
      ];
      if (d <= e / 2) zones.pop();
      r.zones = zoneResults(zones, q.qp, cpi, cscd, r);
      r.note = 'Strefa I: rozważa się obie wartości c<sub>pe</sub> = +0,2 i −0,2. Dla attyk o h<sub>p</sub>/h > 0,1 – jak dla 0,1.';
      r.diag = { shape: 'flat', b, d, e };
      r.def = 'H';
    } else if (c.type === 'mono') {
      const a = clamp(num(c.a, 15), 5, 75);
      if (num(c.a, 15) < 5) r.warn.push('Dla α < 5° stosuj dach płaski (7.2.3) – przyjęto α = 5°.');
      const z0 = interpZ(MONO0, a), z180 = interpZ(MONO180, a), z90 = interpZ(MONO90, a);
      const e90 = Math.min(d, 2 * h);
      r.steps.push(['θ = 0° i 180°: e = min(b; 2h) = ' + F(e, 2) + ' m; θ = 90°: e = min(d; 2h) = ' + F(e90, 2) + ' m; α = ' + F(a, 1) + '° (interpolacja liniowa między wartościami tego samego znaku)', 'PN-EN 1991-1-4, tabl. 7.3a, 7.3b, rys. 7.7', '1-4:7.2.4']);
      const mk = (lbl, arr, zs) => arr.map((Z, i) => ({ z: zs[i] + lbl, n: cpeA(Z.n, A), p: Z.p ? cpeA(Z.p, A) : null }));
      r.zones = [{ head: 'θ = 0° (wiatr na niższą krawędź)' }];
      r.zones.push(...zoneResults(mk('₀', z0, ['F', 'G', 'H']).map((z, i) => Object.assign(z, { dim: ['narożniki ' + F(e / 4, 2) + '×' + F(e / 10, 2) + ' m', 'pas e/10 = ' + F(e / 10, 2) + ' m', 'reszta połaci'][i] })), q.qp, cpi, cscd, r));
      r.zones.push({ head: 'θ = 180° (wiatr na wyższą krawędź)' });
      r.zones.push(...zoneResults(mk('₁₈₀', z180, ['F', 'G', 'H']), q.qp, cpi, cscd, r));
      r.zones.push({ head: 'θ = 90° (wiatr równoległy do krawędzi)' });
      r.zones.push(...zoneResults(mk('₉₀', z90, ['Fup', 'Flow', 'G', 'H', 'I']), q.qp, cpi, cscd, r));
      r.diag = { shape: 'mono', b, d, e };
      r.def = 'H₀';
    } else if (c.type === 'duo') {
      let a = clamp(num(c.a, 30), -45, 75);
      if (Math.abs(a) < 5) { r.warn.push('Dla |α| < 5° stosuj dach płaski (7.2.3) – przyjęto α = ' + (a < 0 ? '−5' : '5') + '°.'); a = a < 0 ? -5 : 5; }
      const z0 = interpZ(DUO0, a), z90 = interpZ(DUO90, a);
      const e90 = Math.min(d, 2 * h);
      r.steps.push(['θ = 0°: e = min(b; 2h) = ' + F(e, 2) + ' m; θ = 90°: e = min(d; 2h) = ' + F(e90, 2) + ' m; α = ' + F(a, 1) + '°', 'PN-EN 1991-1-4, tabl. 7.4a, 7.4b, rys. 7.8', '1-4:7.2.5']);
      const zs0 = ['F', 'G', 'H', 'I', 'J'];
      const dims0 = ['narożniki ' + F(e / 4, 2) + '×' + F(e / 10, 2) + ' m', 'pas e/10 = ' + F(e / 10, 2) + ' m', 'reszta połaci nawietrznej', 'reszta połaci zawietrznej', 'pas e/10 przy kalenicy (zawietrzna)'];
      r.zones = [{ head: 'θ = 0° (wiatr prostopadły do kalenicy)' }];
      r.zones.push(...zoneResults(z0.map((Z, i) => ({ z: zs0[i] + '₀', n: cpeA(Z.n, A), p: Z.p ? cpeA(Z.p, A) : null, dim: dims0[i] })), q.qp, cpi, cscd, r));
      r.zones.push({ head: 'θ = 90° (wiatr równoległy do kalenicy)' });
      const dims90 = ['narożniki ' + F(e90 / 4, 2) + '×' + F(e90 / 10, 2) + ' m', 'pas e/10 = ' + F(e90 / 10, 2) + ' m', 'pas e/10…e/2', 'reszta (> e/2 = ' + F(e90 / 2, 2) + ' m)'];
      r.zones.push(...zoneResults(z90.map((Z, i) => ({ z: ['F', 'G', 'H', 'I'][i] + '₉₀', n: cpeA(Z.n, A), p: null, dim: dims90[i] })), q.qp, cpi, cscd, r));
      r.note = 'Przy θ = 0° rozważa się 4 przypadki: największe i najmniejsze wartości stref F, G, H w połączeniu z największymi i najmniejszymi wartościami stref I, J; nie łączy się wartości dodatnich i ujemnych na tej samej połaci (7.2.5(3)).';
      r.diag = { shape: 'duo', b, d, e };
      r.def = 'H₀';
    } else if (c.type === 'hip') {
      const a0 = clamp(num(c.a, 30), 5, 75), a90 = clamp(num(c.a90, a0), 5, 75);
      if (num(c.a, 30) < 5 || num(c.a90, 30) < 5) r.warn.push('Tablica 7.5 obejmuje α od +5° do +75°.');
      const zs = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
      r.steps.push(['e = min(b; 2h) = ' + F(e, 2) + ' m; α<sub>0</sub> = ' + F(a0, 1) + '° (połać nawietrzna przy θ = 0°), α<sub>90</sub> = ' + F(a90, 1) + '° (przy θ = 90°)', 'PN-EN 1991-1-4, tabl. 7.5, rys. 7.9', '1-4:7.2.6']);
      r.zones = [{ head: 'θ = 0°, α<sub>0</sub> = ' + F(a0, 1) + '°' }];
      r.zones.push(...zoneResults(interpZ(HIP, a0).map((Z, i) => ({ z: zs[i] + '₀', n: cpeA(Z.n, A), p: Z.p ? cpeA(Z.p, A) : null })), q.qp, cpi, cscd, r));
      r.zones.push({ head: 'θ = 90°, α<sub>90</sub> = ' + F(a90, 1) + '°' });
      r.zones.push(...zoneResults(interpZ(HIP, a90).map((Z, i) => ({ z: zs[i] + '₉₀', n: cpeA(Z.n, A), p: Z.p ? cpeA(Z.p, A) : null })), q.qp, cpi, cscd, r));
      r.note = 'Rozmieszczenie stref F–N wg rys. 7.9; wymiary stref od e = ' + F(e, 2) + ' m (e/4, e/10, e/2).';
      r.def = 'H₀';
    }
    return finWind(r, f);
  }
  if (c.type === 'canopy1' || c.type === 'canopy2') {
    const duo = c.type === 'canopy2';
    const h = num(c.h, 4), b = num(c.b, 10), d = num(c.d, 6);
    let a = num(c.a, duo ? 10 : 5);
    const ze = zOver !== null ? zOver : h;
    const q = qpAt(ze, ws, wb);
    r.qp = q.qp; r.ze = ze;
    r.steps.push(['z<sub>e</sub> = ' + F(ze, 2) + ' m (wysokość wiaty): ' + q.txt, q.ref, q.key]);
    const T = duo ? CANOPY2 : CANOPY1;
    if (duo && Math.abs(a) < 5) { r.warn.push('Tablica 7.7 obejmuje |α| ≥ 5° – przyjęto α = ' + (a < 0 ? '−5' : '5') + '°.'); a = a < 0 ? -5 : 5; }
    if (!duo && a < 0) a = Math.abs(a);
    const [vMax, v0, v1] = interpVec(T, a);
    const phi = clamp(num(c.phi, 0), 0, 1);
    const vMin = v0.map((x, j) => lerp(x, v1[j], phi));
    const zn = duo ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C'];
    r.steps.push(['α = ' + F(a, 1) + '°, współczynnik zablokowania φ = ' + F(phi, 2) + ' (interpolacja liniowa między φ = 0 i φ = 1)', 'PN-EN 1991-1-4, ' + (duo ? 'tabl. 7.7' : 'tabl. 7.6') + ', 7.3(2)', '1-4:7.3']);
    r.steps.push(['c<sub>f</sub>: max ' + Fs(vMax[0], 2) + ', min ' + Fs(vMin[0], 2) + '; c<sub>p,net</sub> max: ' + zn.map((z, j) => z + ' ' + Fs(vMax[j + 1], 2)).join(', ') + '; min: ' + zn.map((z, j) => z + ' ' + Fs(vMin[j + 1], 2)).join(', '), 'PN-EN 1991-1-4, ' + (duo ? 'tabl. 7.7' : 'tabl. 7.6'), '1-4:7.3']);
    const Aref = b * d / Math.cos(rad(Math.abs(a)));
    const Fmax = cscd * vMax[0] * q.qp * Aref, Fmin = cscd * vMin[0] * q.qp * Aref;
    r.steps.push(['F<sub>w</sub> = c<sub>s</sub>c<sub>d</sub>·c<sub>f</sub>·q<sub>p</sub>·A<sub>ref</sub>; A<sub>ref</sub> = b·d/cos α = ' + F(Aref, 2) + ' m² → F<sub>w,max</sub> = ' + F(Fmax, 2) + ' kN, F<sub>w,min</sub> = ' + F(Fmin, 2) + ' kN (położenie wypadkowej: d/4 od krawędzi nawietrznej)', 'PN-EN 1991-1-4, (5.3), rys. 7.16', '1-4:7.3']);
    r.zones = zn.map((z, j) => {
      const mx = cscd * vMax[j + 1] * q.qp, mn = cscd * vMin[j + 1] * q.qp;
      r.vals.push({ key: z, label: 'strefa ' + z + ' (c<sub>p,net</sub>)', v: mx, vmin: mn, unit: 'kN/m²', wind: true });
      return { z, cpes: [vMax[j + 1], vMin[j + 1]], we: [mx, mn], max: { w: mx }, min: { w: mn }, dim: { A: 'pole ogólne', B: 'pas b/10 przy krawędzi nawietrznej/zawietrznej', C: 'pas d/10 przy krawędziach bocznych', D: 'pas przy kalenicy/koszu' }[z] };
    });
    r.vals.push({ key: 'cf', label: 'c<sub>f</sub>·q<sub>p</sub> – ciśnienie wypadkowe', v: cscd * vMax[0] * q.qp, vmin: cscd * vMin[0] * q.qp, unit: 'kN/m²', wind: true });
    r.net = true;
    r.note = 'Wartości c<sub>p,net</sub>/c<sub>f</sub> obejmują ciśnienie po obu stronach wiaty (bez osobnego c<sub>pi</sub>); wartości dodatnie – w dół. Zweryfikuj odczyt tablicy przy nietypowych wymiarach i zastosuj ' + (duo ? 'rys. 7.17' : 'rys. 7.16') + ' dla rozkładu obciążenia.';
    r.def = 'A';
    return finWind(r, f);
  }
  if (c.type === 'fwall') {
    const par = c.mode === 'par';
    const h = num(c.h, 1), l = num(c.l, 10);
    const ze = par ? num(c.hb, 0) + h : (zOver !== null ? zOver : h);
    const q = qpAt(ze, ws, wb);
    r.qp = q.qp; r.ze = ze;
    r.steps.push(['z<sub>e</sub> = ' + (par ? 'h<sub>bud</sub> + h<sub>p</sub> = ' + F(num(c.hb, 0), 2) + ' + ' + F(h, 2) + ' = ' : '') + F(ze, 2) + ' m: ' + q.txt, q.ref, q.key]);
    const phi = clamp(num(c.phi, 1), 0.8, 1);
    const lh = l / h;
    let full;
    if (c.ret) full = [2.1, 1.8, 1.4, 1.2];
    else {
      const T = [[3, 2.3, 1.4, 1.2, 1.2], [5, 2.9, 1.8, 1.4, 1.2], [10, 3.4, 2.1, 1.7, 1.2]];
      const x = clamp(lh, 3, 10);
      const i = T.findIndex(t => t[0] >= x);
      if (T[i][0] === x) full = T[i].slice(1);
      else { const t = (x - T[i - 1][0]) / (T[i][0] - T[i - 1][0]); full = T[i - 1].slice(1).map((v, k) => v + (T[i][k + 1] - v) * t); }
    }
    const t = (phi - 0.8) / 0.2;
    const cp = full.map(v => 1.2 + (v - 1.2) * t);
    const psis = num(c.psis, 1);
    r.steps.push(['l/h = ' + F(l, 2) + '/' + F(h, 2) + ' = ' + F(lh, 2) + '; φ = ' + F(phi, 2) + (c.ret ? '; narożniki zagięte o długości ≥ h' : '') + ' → c<sub>p,net</sub>: A ' + F(cp[0], 2) + ', B ' + F(cp[1], 2) + ', C ' + F(cp[2], 2) + ', D ' + F(cp[3], 2), 'PN-EN 1991-1-4, tabl. 7.9', '1-4:7.4']);
    if (psis !== 1) r.steps.push(['współczynnik osłonięcia ψ<sub>s</sub> = ' + F(psis, 2), 'PN-EN 1991-1-4, 7.4.2, rys. 7.20', '1-4:7.4']);
    const zl = [['A', 0, 0.3 * h], ['B', 0.3 * h, 2 * h], ['C', 2 * h, 4 * h], ['D', 4 * h, Infinity]]
      .map(([z, a0, a1]) => [z, Math.min(a0, l), Math.min(a1, l)]).filter(x => x[2] > x[1]);
    r.zones = zl.map(([z, a0, a1]) => {
      const k = 'ABCD'.indexOf(z);
      const w = cscd * psis * cp[k] * q.qp;
      r.vals.push({ key: z, label: 'strefa ' + z + ' – w<sub>net</sub> (±)', v: w, vmin: -w, unit: 'kN/m²', wind: true });
      return { z, cpes: [cp[k]], we: [w], max: { w }, min: { w: -w }, dim: F(a0, 2) + '–' + (isFinite(a1) ? F(a1, 2) : F(l, 2)) + ' m od końca' };
    });
    r.net = true;
    r.steps.push(['w<sub>net</sub> = c<sub>s</sub>c<sub>d</sub>·ψ<sub>s</sub>·c<sub>p,net</sub>·q<sub>p</sub>(z<sub>e</sub>) – działa w obu kierunkach', 'PN-EN 1991-1-4, (5.1), 7.4.1', '1-4:7.4']);
    r.diag = { shape: 'fwall', h, l, zl };
    r.def = 'A';
    return finWind(r, f);
  }
  if (c.type === 'sign') {
    const b = num(c.b, 1), h = num(c.h, 1), zg = num(c.zg, 0);
    const ze = zg + h / 2;
    const q = qpAt(ze, ws, wb);
    r.qp = q.qp; r.ze = ze;
    r.steps.push(['z<sub>e</sub> = z<sub>g</sub> + h/2 = ' + F(zg, 2) + ' + ' + F(h, 2) + '/2 = ' + F(ze, 2) + ' m: ' + q.txt, q.ref, q.key]);
    if (!(zg >= h / 4 || b / h <= 1)) r.warn.push('z<sub>g</sub> < h/4 i b/h > 1 – tablicę traktuje się jak ścianę wolnostojącą (7.4.3(1)).');
    const cf = 1.8, w = cscd * cf * q.qp, Fw = w * b * h;
    r.steps.push(['c<sub>f</sub> = 1,80', 'PN-EN 1991-1-4, (7.7)', '1-4:7.4']);
    r.steps.push(['F<sub>w</sub> = c<sub>s</sub>c<sub>d</sub>·c<sub>f</sub>·q<sub>p</sub>(z<sub>e</sub>)·A<sub>ref</sub> = ' + F(cscd, 2) + '·1,8·' + F(q.qp, 3) + '·' + F(b * h, 2) + ' = ' + F(Fw, 2) + ' kN', 'PN-EN 1991-1-4, (5.3)', '1-4:5.3']);
    r.steps.push(['mimośród poziomy siły e = ±0,25·b = ±' + F(0.25 * b, 2) + ' m', 'PN-EN 1991-1-4, 7.4.3(2)', '1-4:7.4']);
    r.vals.push({ key: 'w', label: 'w – ciśnienie wypadkowe na tablicę', v: w, vmin: -w, unit: 'kN/m²', wind: true });
    r.vals.push({ key: 'F', label: 'F<sub>w</sub> – siła wypadkowa', v: Fw, unit: 'kN', point: true });
    r.sign = { w, Fw, ecc: 0.25 * b };
    r.def = 'w';
    return finWind(r, f);
  }
  if (c.type === 'force') {
    const ze = num(c.zeF, 10), cf = num(c.cf, 2.0), Aref = num(c.Aref, 1);
    const q = qpAt(ze, ws, wb);
    r.qp = q.qp; r.ze = ze;
    r.steps.push(['z<sub>e</sub> = ' + F(ze, 2) + ' m: ' + q.txt, q.ref, q.key]);
    const w = cscd * cf * q.qp, Fw = w * Aref;
    r.steps.push(['F<sub>w</sub> = c<sub>s</sub>c<sub>d</sub>·c<sub>f</sub>·q<sub>p</sub>(z<sub>e</sub>)·A<sub>ref</sub> = ' + F(cscd, 2) + '·' + F(cf, 3) + '·' + F(q.qp, 3) + '·' + F(Aref, 3) + ' = ' + F(Fw, 3) + ' kN (c<sub>f</sub> podany – rozdz. 7.6–7.13)', 'PN-EN 1991-1-4, (5.3)', '1-4:5.3']);
    r.vals.push({ key: 'w', label: 'c<sub>f</sub>·q<sub>p</sub> – na m² A<sub>ref</sub>', v: w, vmin: -w, unit: 'kN/m²', wind: true });
    r.vals.push({ key: 'F', label: 'F<sub>w</sub> – siła', v: Fw, unit: 'kN', point: true });
    r.def = 'w';
    return finWind(r, f);
  }
  if (c.type === 'fric') {
    const h = num(c.h, 10), b = num(c.b, 20), d = num(c.d, 60), cfr = num(c.cfr, 0.02);
    const ze = zOver !== null ? zOver : h;
    const q = qpAt(ze, ws, wb);
    r.qp = q.qp; r.ze = ze;
    r.steps.push(['z<sub>e</sub> = ' + F(ze, 2) + ' m: ' + q.txt, q.ref, q.key]);
    const Apar = b * d + 2 * h * d, Aperp = b * h;
    const skip = Apar <= 4 * Aperp;
    const lfree = Math.min(2 * b, 4 * h);
    const Afr = Math.max(0, d - lfree) * (b + 2 * h);
    const Ffr = cfr * q.qp * Afr;
    r.steps.push(['powierzchnie równoległe do wiatru ' + F(Apar, 1) + ' m² ' + (skip ? '≤' : '>') + ' 4 × powierzchnie prostopadłe (' + F(4 * Aperp, 1) + ' m²)' + (skip ? ' → tarcie można pominąć' : ' → tarcie należy uwzględnić'), 'PN-EN 1991-1-4, 7.5(4)', '1-4:7.5']);
    r.steps.push(['A<sub>fr</sub> = (d − min(2b; 4h))·(b + 2h) = (' + F(d, 2) + ' − ' + F(lfree, 2) + ')·' + F(b + 2 * h, 2) + ' = ' + F(Afr, 2) + ' m²; c<sub>fr</sub> = ' + F(cfr, 3), 'PN-EN 1991-1-4, 7.5(3), tabl. 7.10', '1-4:7.5']);
    r.steps.push(['F<sub>fr</sub> = c<sub>fr</sub>·q<sub>p</sub>(z<sub>e</sub>)·A<sub>fr</sub> = ' + F(cfr, 3) + '·' + F(q.qp, 3) + '·' + F(Afr, 2) + ' = ' + F(Ffr, 2) + ' kN', 'PN-EN 1991-1-4, (5.7)', '1-4:7.5']);
    r.vals.push({ key: 'wfr', label: 'c<sub>fr</sub>·q<sub>p</sub> – styczne', v: cfr * q.qp, vmin: 0, unit: 'kN/m²', wind: true });
    r.vals.push({ key: 'F', label: 'F<sub>fr</sub> – siła tarcia', v: Ffr, unit: 'kN', point: true });
    r.def = 'wfr';
    return finWind(r, f);
  }
  return finWind(r, f);
}
function finWind(r, f) {
  const gQ = f.gQ * f.KFI;
  r.vals.forEach(v => { v.vd = gQ * v.v; if (isNum(v.vmin)) v.vdmin = gQ * v.vmin; });
  return r;
}
/* porównanie metod q_p (ZK tabl. NA.3 vs wzory ogólne CEN) */
function qpCompare(ws, zs) {
  const wb = windBase(ws);
  return (zs || [2, 5, 8, 10, 12, 15, 20, 25, 30, 40, 50]).map(z => {
    const a = qpAt(z, ws, wb, 'NA'), b = qpAt(z, ws, wb, 'EN');
    return { z, na: a.qp, en: b.qp, ceNA: a.ce, ceEN: b.ce, d: a.qp / b.qp - 1 };
  });
}

/* =====================================================================
   T – ODDZIAŁYWANIA TERMICZNE (PN-EN 1991-1-5)
   ===================================================================== */
const ALPHA = { // zał. C, tabl. C.1 (α_T ·10⁻⁶ 1/K); E – orientacyjnie
  bet: { n: 'Beton (oprócz lekkiego)', a: 10, E: 32 },
  betl: { n: 'Beton lekki kruszywowy', a: 7, E: 18 },
  stal: { n: 'Stal konstrukcyjna, żeliwo', a: 12, E: 210 },
  nierdz: { n: 'Stal nierdzewna', a: 16, E: 200 },
  alu: { n: 'Aluminium i jego stopy', a: 24, E: 70 },
  mur: { n: 'Mur (6–10)', a: 8, E: 5 },
  drw: { n: 'Drewno – wzdłuż włókien', a: 5, E: 11 },
  drwp: { n: 'Drewno – w poprzek włókien (30–70)', a: 50, E: 0.37 },
  szk: { n: 'Szkło', a: 9, E: 70 },
  skal: { n: 'Skała, kamień (7–12)', a: 10, E: 40 },
  usr: { n: 'Inny – podaj α_T i E', a: 10, E: 30 }
};
const T345 = { NE: [0, 2, 4], SW: [18, 30, 42] };
const T_UND = { shallow: [8, -5], deep: [5, -3] }; // tabl. 5.3: lato/zima: < 1 m (T6, T8), ≥ 1 m (T7, T9)
/* rys. 6.1 (relacja liniowa): typ 1: T_e,max = T_max + 16, T_e,min = T_min − 3; typ 2: +4/+4; typ 3: +2/+8 */
const BR_TE = { 1: [16, -3], 2: [4, 4], 3: [2, 8] };
const BR_TM = { '1': [18, 13], '2': [15, 18], '3box': [10, 5], '3beam': [15, 8], '3slab': [15, 8] };
const KSUR = {
  none: { n: 'bez nawierzchni', 1: [0.7, 0.9], 2: [0.9, 1.0], 3: [0.8, 1.1] },
  wp: { n: 'izolacja wodochronna (ciemna)', 1: [1.6, 0.6], 2: [1.1, 0.9], 3: [1.5, 1.0] },
  50: { n: 'nawierzchnia 50 mm', 1: [1.0, 1.0], 2: [1.0, 1.0], 3: [1.0, 1.0] },
  100: { n: 'nawierzchnia 100 mm', 1: [0.7, 1.2], 2: [1.0, 1.0], 3: [0.7, 1.0] },
  150: { n: 'nawierzchnia 150 mm', 1: [0.7, 1.2], 2: [1.0, 1.0], 3: [0.5, 1.0] },
  bal: { n: 'podsypka tłuczniowa 750 mm', 1: [0.6, 1.4], 2: [0.8, 1.2], 3: [0.6, 1.0] }
};
function thermSite(ts, A) {
  let Tmax = num(ts.Tmax, 36), Tmin = num(ts.Tmin, -30);
  const steps = [];
  steps.push(['T<sub>max</sub> = ' + F(Tmax, 1) + ' °C, T<sub>min</sub> = ' + F(Tmin, 1) + ' °C (z map ZK dla lokalizacji)', 'PN-EN 1991-1-5, 5.2(2), ZK', '1-5:NA']);
  if (ts.altCorr && isNum(A) && A > 0) {
    const dMax = A / 100 * 1.0, dMin = A / 100 * 0.5;
    Tmax -= dMax; Tmin -= dMin;
    steps.push(['poprawka na wysokość A = ' + F(A, 0) + ' m: T<sub>max</sub> − 1,0·A/100 = ' + F(Tmax, 1) + ' °C; T<sub>min</sub> − 0,5·A/100 = ' + F(Tmin, 1) + ' °C', 'PN-EN 1991-1-5, zał. A, A.1(2) uw.', '1-5:A']);
  }
  const T0 = num(ts.T0, 10);
  steps.push(['T<sub>0</sub> = ' + F(T0, 1) + ' °C – temperatura początkowa (w chwili scalenia/zamocowania)', 'PN-EN 1991-1-5, zał. A, A.1(3)', '1-5:A']);
  return { Tmax, Tmin, T0, steps };
}
function matAlpha(c) {
  const m = ALPHA[c.mat] || ALPHA.bet;
  const a = c.mat === 'usr' && isNum(c.aT) ? c.aT : m.a;
  const E = isNum(c.E) ? c.E : m.E;
  return { a, E, n: m.n };
}
function thermCalc(c, ts, A) {
  const T = thermSite(ts, A);
  const r = { steps: [], warn: [], rows: [], vals: [], psi: PSI.temp, fam: 'temp' };
  const { Tmax, Tmin, T0 } = T;
  if (c.type === 'bld') {
    let ToutS, ToutW, lab;
    if (c.pos === 'und') {
      const [s, w] = T_UND[c.depth === 'deep' ? 'deep' : 'shallow'];
      ToutS = s; ToutW = w; lab = 'element w gruncie (' + (c.depth === 'deep' ? '≥ 1 m' : '< 1 m') + ' p.p.t.)';
      r.steps.push(['T<sub>out</sub> dla części podziemnych: lato ' + F(s, 0) + ' °C, zima ' + F(w, 0) + ' °C (' + lab + ')', 'PN-EN 1991-1-5, tabl. 5.3', '1-5:5.3']);
    } else {
      const [t3, t4, t5] = T345[c.orient || 'SW'];
      const add = c.abs === '0.5' ? t3 : c.abs === '0.7' ? t4 : t5;
      const nm = c.abs === '0.5' ? 'T<sub>3</sub>' : c.abs === '0.7' ? 'T<sub>4</sub>' : 'T<sub>5</sub>';
      ToutS = Tmax + add; ToutW = Tmin;
      r.steps.push(['T<sub>out,lato</sub> = T<sub>max</sub> + ' + nm + ' = ' + F(Tmax, 1) + ' + ' + F(add, 0) + ' = ' + F(ToutS, 1) + ' °C (' + (c.orient === 'NE' ? 'elementy od płn.-wsch.' : 'elementy od płd.-zach. lub poziome') + ', absorpcyjność ' + String(c.abs || '0.9').replace('.', ',') + ')', 'PN-EN 1991-1-5, tabl. 5.2', '1-5:5.3']);
      r.steps.push(['T<sub>out,zima</sub> = T<sub>min</sub> = ' + F(ToutW, 1) + ' °C', 'PN-EN 1991-1-5, tabl. 5.2', '1-5:5.3']);
    }
    const TinS = num(c.TinS, 20), TinW = num(c.TinW, 25);
    let TS, TW;
    if (c.pos === 'out') { TS = ToutS; TW = ToutW; r.steps.push(['element w całości na zewnątrz: T = T<sub>out</sub>', 'PN-EN 1991-1-5, 5.3', '1-5:5.3']); }
    else if (c.pos === 'in') { TS = TinS; TW = TinW; r.steps.push(['element wewnątrz budynku: T = T<sub>in</sub> (lato ' + F(TinS, 0) + ' °C, zima ' + F(TinW, 0) + ' °C)', 'PN-EN 1991-1-5, tabl. 5.1', '1-5:5.3']); }
    else { TS = (TinS + ToutS) / 2; TW = (TinW + ToutW) / 2; r.steps.push(['przegroda jednowarstwowa: T ≈ (T<sub>in</sub> + T<sub>out</sub>)/2 → lato (' + F(TinS, 0) + ' + ' + F(ToutS, 1) + ')/2 = ' + F(TS, 1) + ' °C, zima (' + F(TinW, 0) + ' + ' + Fp(ToutW, 1) + ')/2 = ' + F(TW, 1) + ' °C', 'PN-EN 1991-1-5, 5.3(2), zał. D', '1-5:5.3']); }
    const dTuS = TS - T0, dTuW = TW - T0;
    r.steps.push(['ΔT<sub>u</sub> = T − T<sub>0</sub>: lato ' + F(TS, 1) + ' − ' + F(T0, 1) + ' = ' + Fs(dTuS, 1) + ' K; zima ' + F(TW, 1) + ' − ' + F(T0, 1) + ' = ' + Fs(dTuW, 1) + ' K', 'PN-EN 1991-1-5, (5.1)', '1-5:5.2']);
    let dTMS = NaN, dTMW = NaN;
    if (c.pos === 'wall' || c.pos === 'und') {
      dTMS = ToutS - TinS; dTMW = ToutW - TinW;
      r.steps.push(['ΔT<sub>M</sub> = T<sub>out</sub> − T<sub>in</sub> (różnica temperatur powierzchni): lato ' + Fs(dTMS, 1) + ' K; zima ' + Fs(dTMW, 1) + ' K', 'PN-EN 1991-1-5, 5.2(2), 5.3', '1-5:5.2']);
    }
    r.rows.push({ n: 'lato – rozszerzanie', dTu: dTuS, dTM: dTMS });
    r.rows.push({ n: 'zima – skracanie', dTu: dTuW, dTM: dTMW });
    effects(c, r, [dTuS, dTuW], [dTMS, dTMW]);
  } else if (c.type === 'bridge') {
    const tyN = c.btype === '1' ? 1 : c.btype === '2' ? 2 : 3;
    const [dmax, dmin] = BR_TE[tyN];
    const Temax = Tmax + dmax, Temin = Tmin + dmin;
    r.steps.push(['T<sub>e,max</sub> = T<sub>max</sub> ' + (dmax >= 0 ? '+ ' : '− ') + F(Math.abs(dmax), 1) + ' = ' + F(Temax, 1) + ' °C; T<sub>e,min</sub> = T<sub>min</sub> ' + (dmin >= 0 ? '+ ' : '− ') + F(Math.abs(dmin), 1) + ' = ' + F(Temin, 1) + ' °C (typ ' + tyN + ')', 'PN-EN 1991-1-5, 6.1.3.1, rys. 6.1', '1-5:6.1']);
    const con = T0 - Temin, exp = Temax - T0;
    r.steps.push(['ΔT<sub>N,con</sub> = T<sub>0</sub> − T<sub>e,min</sub> = ' + F(T0, 1) + ' − ' + Fp(Temin, 1) + ' = ' + F(con, 1) + ' K; ΔT<sub>N,exp</sub> = T<sub>e,max</sub> − T<sub>0</sub> = ' + F(exp, 1) + ' K; ΔT<sub>N</sub> = ' + F(Temax - Temin, 1) + ' K', 'PN-EN 1991-1-5, (6.1)–(6.3)', '1-5:6.1']);
    r.steps.push(['łożyska i dylatacje: ΔT<sub>N,con</sub> + 20 = ' + F(con + 20, 1) + ' K, ΔT<sub>N,exp</sub> + 20 = ' + F(exp + 20, 1) + ' K (gdy T<sub>0</sub> nieustalona; przy znanej T<sub>0</sub> zalecane + 10 K)', 'PN-EN 1991-1-5, 6.1.3.3(3)', '1-5:6.1']);
    const key = tyN === 3 ? '3' + (c.sub3 || 'slab') : String(tyN);
    const [hb, cb] = BR_TM[key];
    const ks = KSUR[c.surf || '50'][tyN];
    const heat = hb * ks[0], cool = cb * ks[1];
    r.steps.push(['ΔT<sub>M,heat</sub> = ' + F(hb, 0) + '·k<sub>sur</sub> = ' + F(hb, 0) + '·' + F(ks[0], 1) + ' = ' + F(heat, 1) + ' K; ΔT<sub>M,cool</sub> = ' + F(cb, 0) + '·' + F(ks[1], 1) + ' = ' + F(cool, 1) + ' K (' + KSUR[c.surf || '50'].n + ')', 'PN-EN 1991-1-5, 6.1.4.1, tabl. 6.1, 6.2', '1-5:6.1']);
    const wN = 0.35, wM = 0.75;
    r.combos = [
      ['ΔT<sub>M,heat</sub> + ω<sub>N</sub>·ΔT<sub>N,exp</sub>', heat, wN * exp],
      ['ΔT<sub>M,heat</sub> + ω<sub>N</sub>·ΔT<sub>N,con</sub>', heat, -wN * con],
      ['ΔT<sub>M,cool</sub> + ω<sub>N</sub>·ΔT<sub>N,exp</sub>', -cool, wN * exp],
      ['ΔT<sub>M,cool</sub> + ω<sub>N</sub>·ΔT<sub>N,con</sub>', -cool, -wN * con],
      ['ω<sub>M</sub>·ΔT<sub>M,heat</sub> + ΔT<sub>N,exp</sub>', wM * heat, exp],
      ['ω<sub>M</sub>·ΔT<sub>M,heat</sub> + ΔT<sub>N,con</sub>', wM * heat, -con],
      ['ω<sub>M</sub>·ΔT<sub>M,cool</sub> + ΔT<sub>N,exp</sub>', -wM * cool, exp],
      ['ω<sub>M</sub>·ΔT<sub>M,cool</sub> + ΔT<sub>N,con</sub>', -wM * cool, -con]
    ];
    r.steps.push(['jednoczesność: ω<sub>N</sub> = 0,35, ω<sub>M</sub> = 0,75 (8 kombinacji; ujemny ΔT<sub>M</sub> – górna powierzchnia chłodniejsza)', 'PN-EN 1991-1-5, 6.1.5, (6.3), (6.4)', '1-5:6.1']);
    r.steps.push(['dodatkowo: różnica poziomych składowych liniowych ΔT<sub>M,hor</sub> = 5 K (6.1.4.3); różnica składowych równomiernych między elementami (np. łuk – pomost) 15 K, przy jasnych/ciemnych powierzchniach 20 K (6.1.6); filary betonowe: różnica temperatur przeciwległych powierzchni 5 K (6.2.2)', 'PN-EN 1991-1-5, 6.1.4.3, 6.1.6, 6.2.2', '1-5:6.1']);
    r.rows.push({ n: 'rozszerzanie / ogrzewanie górnej pow.', dTu: exp, dTM: heat });
    r.rows.push({ n: 'skracanie / chłodzenie górnej pow.', dTu: -con, dTM: -cool });
    effects(c, r, [exp, -con], [heat, -cool]);
  } else {
    const dT = num(c.dT, 0), dT2 = num(c.dT2, 0);
    r.steps.push(['ΔT<sub>u</sub> = ' + Fs(dT, 1) + ' K; ΔT<sub>M</sub> = ' + Fs(dT2, 1) + ' K (podano)', '', '']);
    r.rows.push({ n: 'podane', dTu: dT, dTM: dT2 });
    effects(c, r, [dT], [dT2]);
  }
  r.site = T;
  return r;
}
function effects(c, r, dTu, dTM) {
  const m = matAlpha(c);
  const L = num(c.L, 0), hs = num(c.hs, 0), rs = clamp(num(c.restr, 1), 0, 1);
  r.mat = m;
  r.eff = dTu.map((dt, i) => {
    const eps = m.a * 1e-6 * dt;
    const dL = eps * L * 1000;
    const sig = -m.E * 1000 * eps * rs;
    const dm = dTM[i];
    const kap = isNum(dm) && hs > 0 ? m.a * 1e-6 * dm / hs : NaN;
    const sigM = isNum(dm) ? m.E * 1000 * m.a * 1e-6 * Math.abs(dm) / 2 * rs : NaN;
    return { dt, eps, dL, sig, kap, sigM };
  });
  r.steps.push(['α<sub>T</sub> = ' + F(m.a, 1) + '·10⁻⁶ 1/K (' + m.n + '), E = ' + F(m.E, 2) + ' GPa; ΔL = α<sub>T</sub>·ΔT<sub>u</sub>·L; σ<sub>N</sub> = −E·α<sub>T</sub>·ΔT<sub>u</sub>·k<sub>skr</sub>; κ = α<sub>T</sub>·ΔT<sub>M</sub>/h; σ<sub>M</sub> = ±E·α<sub>T</sub>·ΔT<sub>M</sub>/2·k<sub>skr</sub> (k<sub>skr</sub> = ' + F(rs, 2) + ')', 'PN-EN 1991-1-5, zał. C, tabl. C.1', '1-5:C']);
  r.eff.forEach((e, i) => { r.vals.push({ key: 'dL' + i, label: 'ΔL – ' + (r.rows[i] ? r.rows[i].n : ''), v: e.dL, unit: 'mm' }); });
}

/* =====================================================================
   Σ – ZESTAWIENIE I KOMBINACJE (PN-EN 1990 + ZK PL)
   akcje: [{ sym, name, fam, q (≥ 0, grawitacyjne), qn (≤ 0, odrywające), psi }]
   ===================================================================== */
function mergeActions(list) {
  /* oddziaływania tej samej rodziny łączy się (np. obciążenia użytkowe – jedno oddziaływanie, 3.3.1(2) PN-EN 1991-1-1) */
  const out = [], byFam = {};
  list.forEach(a => {
    if (!isNum(a.q) && !isNum(a.qn)) return;
    const k = a.fam === 'imp' ? 'imp' : a.fam === 'snow' ? 'snow' : a.fam === 'wind' ? 'wind' : a.fam === 'H' ? 'H' : a.fam === 'constr' ? 'constr' : a.fam + ':' + a.sym;
    if (!byFam[k]) { byFam[k] = { sym: a.sym, name: a.name, fam: a.fam, q: 0, qn: 0, psi: a.psi.slice(), parts: [], alts: [] }; out.push(byFam[k]); }
    const g = byFam[k];
    if (k === 'snow' || k === 'wind') {
      /* przypadki tego samego oddziaływania są alternatywne – bierze się najniekorzystniejszy */
      g.alts.push(a);
      g.q = Math.max(g.q, num(a.q, 0)); g.qn = Math.min(g.qn, num(a.qn, 0));
      if (g.alts.length > 1) g.sym = g.alts.map(x => x.sym).join('/');
    } else {
      g.q += num(a.q, 0); g.qn += num(a.qn, 0);
      g.psi = g.psi.map((p, i) => Math.max(p, a.psi[i]));
      if (g.parts.length) g.sym = g.sym.split('+')[0] + '+' + a.sym;
    }
    g.parts.push(a);
  });
  return out;
}
function combine(Gk, actsIn, fIn) {
  const f = factors(fIn);
  const acts = mergeActions(actsIn);
  const out = { uls: null, ulsAll: [], sls: {}, uplift: null, upliftEQU: null, scen: [], acts };
  const T = (a, k) => F(a, k == null ? 2 : k);
  const pos = acts.filter(a => a.q > 1e-12);
  const hasH = pos.some(a => a.fam === 'H'), hasSW = pos.some(a => a.fam === 'snow' || a.fam === 'wind');
  let scen = [pos];
  if (hasH && hasSW) scen = [pos.filter(a => a.fam !== 'H'), pos.filter(a => a.fam !== 'snow' && a.fam !== 'wind')];
  out.scen = scen.map((P, i) => scen.length > 1 ? (i === 0 ? 'bez kat. H' : 'kat. H bez śniegu i wiatru') : '');
  const gGs = f.gGsup * f.KFI, gQ = f.gQ * f.KFI, xi = f.xi;
  const gTxt = f.KFI !== 1 ? T(f.gGsup) + '·' + T(f.KFI) : T(f.gGsup);
  const qTxt = f.KFI !== 1 ? T(f.gQ, 1) + '·' + T(f.KFI) : T(f.gQ, 1);
  let best = null;
  const push = c => { out.ulsAll.push(c); if (!best || c.v > best.v + 1e-12) best = c; };
  scen.forEach((P, si) => {
    const tag = scen.length > 1 ? ' [' + out.scen[si] + ']' : '';
    if (f.rule === '610') {
      if (!P.length) push({ n: '(6.10)' + tag, v: gGs * Gk, ex: gTxt + '·' + T(Gk, 3) });
      P.forEach(L => {
        let v = gGs * Gk + gQ * L.q, ex = gTxt + '·' + T(Gk, 3) + ' + ' + qTxt + '·' + T(L.q, 3);
        P.filter(o => o !== L).forEach(o => { v += gQ * o.psi[0] * o.q; ex += ' + ' + qTxt + '·' + T(o.psi[0], 1) + '·' + T(o.q, 3); });
        push({ n: '(6.10), wiodące ' + L.sym + tag, v, ex, lead: L.sym });
      });
    } else {
      let v = gGs * Gk, ex = gTxt + '·' + T(Gk, 3);
      P.forEach(o => { v += gQ * o.psi[0] * o.q; ex += ' + ' + qTxt + '·' + T(o.psi[0], 1) + '·' + T(o.q, 3); });
      push({ n: '(6.10a)' + tag, v, ex });
      if (!P.length) push({ n: '(6.10b)' + tag, v: xi * gGs * Gk, ex: T(xi) + '·' + gTxt + '·' + T(Gk, 3) });
      P.forEach(L => {
        let v2 = xi * gGs * Gk + gQ * L.q, ex2 = T(xi) + '·' + gTxt + '·' + T(Gk, 3) + ' + ' + qTxt + '·' + T(L.q, 3);
        P.filter(o => o !== L).forEach(o => { v2 += gQ * o.psi[0] * o.q; ex2 += ' + ' + qTxt + '·' + T(o.psi[0], 1) + '·' + T(o.q, 3); });
        push({ n: '(6.10b), wiodące ' + L.sym + tag, v: v2, ex: ex2, lead: L.sym });
      });
    }
  });
  out.uls = best;
  if (best) best.gov = true;
  /* SGU */
  let ch = null, fr = null, qpm = null;
  const all = { ch: [], fr: [], qp: [] };
  scen.forEach((P, si) => {
    const tag = scen.length > 1 ? ' [' + out.scen[si] + ']' : '';
    if (!P.length) { const c0 = { n: 'G' + tag, v: Gk, ex: T(Gk, 3) }; all.ch.push(c0); all.fr.push(c0); if (!ch || c0.v > ch.v) ch = c0; if (!fr || c0.v > fr.v) fr = c0; }
    P.forEach(L => {
      let v = Gk + L.q, ex = T(Gk, 3) + ' + ' + T(L.q, 3);
      let v2 = Gk + L.psi[1] * L.q, ex2 = T(Gk, 3) + ' + ' + T(L.psi[1], 1) + '·' + T(L.q, 3);
      P.filter(o => o !== L).forEach(o => { v += o.psi[0] * o.q; ex += ' + ' + T(o.psi[0], 1) + '·' + T(o.q, 3); v2 += o.psi[2] * o.q; ex2 += ' + ' + T(o.psi[2], 1) + '·' + T(o.q, 3); });
      const c1 = { n: 'charakterystyczna, wiodące ' + L.sym + tag, v, ex, lead: L.sym }, c2 = { n: 'częsta, wiodące ' + L.sym + tag, v: v2, ex: ex2, lead: L.sym };
      all.ch.push(c1); all.fr.push(c2);
      if (!ch || v > ch.v) ch = c1;
      if (!fr || v2 > fr.v) fr = c2;
    });
    let v3 = Gk, ex3 = T(Gk, 3);
    P.forEach(o => { v3 += o.psi[2] * o.q; ex3 += ' + ' + T(o.psi[2], 1) + '·' + T(o.q, 3); });
    const c3 = { n: 'quasi-stała' + tag, v: v3, ex: ex3 };
    all.qp.push(c3);
    if (!qpm || v3 > qpm.v) qpm = c3;
  });
  out.sls = { ch, fr, qp: qpm, all };
  /* odrywanie (ssanie wiatru) – STR (γ_G,inf) i EQU */
  const neg = acts.filter(a => a.qn < -1e-12);
  if (neg.length) {
    let w1 = null, w2 = null;
    neg.forEach(L => {
      let v = f.gGinf * Gk + gQ * L.qn, ex = T(f.gGinf) + '·' + T(Gk, 3) + ' + ' + qTxt + '·' + Fp(L.qn, 3);
      let ve = f.eqGinf * Gk + f.eqQ * f.KFI * L.qn, exe = T(f.eqGinf) + '·' + T(Gk, 3) + ' + ' + T(f.eqQ * f.KFI, 2) + '·' + Fp(L.qn, 3);
      neg.filter(o => o !== L).forEach(o => { v += gQ * o.psi[0] * o.qn; ex += ' + ' + qTxt + '·' + T(o.psi[0], 1) + '·' + Fp(o.qn, 3); ve += f.eqQ * f.KFI * o.psi[0] * o.qn; exe += ' + ' + T(f.eqQ * f.KFI, 2) + '·' + T(o.psi[0], 1) + '·' + Fp(o.qn, 3); });
      if (!w1 || v < w1.v) w1 = { n: 'STR (6.10), γ<sub>G,inf</sub>, wiodące ' + L.sym, v, ex, lead: L.sym };
      if (!w2 || ve < w2.v) w2 = { n: 'EQU (zestaw A), wiodące ' + L.sym, v: ve, ex: exe, lead: L.sym };
    });
    out.uplift = w1; out.upliftEQU = w2;
  }
  return out;
}

/* ---------- składowe względem połaci (zestawienie na krokiew / płatew) ---------- */
function slopeComp(mode, alpha, kind, v) {
  const a = rad(clamp(num(alpha, 0), 0, 89.9)), c = Math.cos(a), s = Math.sin(a);
  if (mode === 'proj') { // pionowo, na m² rzutu
    if (kind === 'G') return { n: v / c, t: 0, f: '/cos α' };
    return { n: v, t: 0, f: '' };
  }
  if (mode === 'perp') { // prostopadle (n) i równolegle (t) do połaci, na m² połaci
    if (kind === 'G') return { n: v * c, t: v * s, f: '·cos α' };
    if (kind === 'S' || kind === 'Q') return { n: v * c * c, t: v * c * s, f: '·cos²α' };
    return { n: v, t: 0, f: '' }; // wiatr – prostopadle do połaci
  }
  return { n: v, t: 0, f: '' };
}

const EC = {
  clamp, isNum, rad, deg, num, F, Fs, Fp, lerp, tab1,
  PSI, KFI, factors,
  matOf, layerMode, layerGk, permCalc, lineCalc,
  CAT, CAT_ORDER, BARRIER, FORK, catPsi, partitionQ, imposedCalc,
  skZone, mu1, mu2m, snowSite, snowCalc,
  TER_NA, TER_EN, vb0Zone, windBase, qpAt, qpCompare, WALL, FLAT, MONO0, MONO180, MONO90, DUO0, DUO90, HIP, CANOPY1, CANOPY2,
  interpZ, interpCells, cpeA, wallCpe, cpiMu, cpiSet, windCalc,
  ALPHA, BR_TE, BR_TM, KSUR, T345, T_UND, thermSite, thermCalc,
  mergeActions, combine, slopeComp
};
root.EC = EC;
if (typeof module !== 'undefined' && module.exports) module.exports = EC;
})(typeof window !== 'undefined' ? window : globalThis);
