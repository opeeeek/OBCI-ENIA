/* Testy weryfikacyjne silnika ObciążeniaEC – przykłady przeliczone ręcznie.
   Uruchom: node --test test/  (Node ≥ 18) */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const EC = require('../src/js/engine.js');
const near = (a, b, tol = 1e-3, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ` oczekiwano ${b}, jest ${a}`);
const F0 = {};

test('ZK PL – obciążenie śniegiem gruntu s_k', () => {
  near(EC.skZone(1, 300).sk, 0.70); near(EC.skZone(1, 500).sk, 2.10);
  near(EC.skZone(2, 900).sk, 0.90);
  near(EC.skZone(3, 100).sk, 1.20); near(EC.skZone(3, 400).sk, 1.80);
  near(EC.skZone(4, 0).sk, 1.60);
  near(EC.skZone(5, 1000).sk, 0.93 * Math.exp(1.34));
  near(EC.skZone(5, 200).sk, 2.00);
  const s = EC.snowSite({ zone: 2, zoneB: 3, trans: 'avg', A: 400, Ce: 1, Ct: 1 });
  near(s.sk, (0.9 + 1.8) / 2);
  assert.deepEqual(EC.snowSite({ zone: 2, A: 1200 }).psi, [0.7, 0.5, 0.2]);
});

test('Śnieg – dach dwuspadowy 35°, zaspa przy attyce, nawis, bariera', () => {
  const S = EC.snowSite({ zone: 2, A: 150, Ce: 1, Ct: 1 });
  const d = EC.snowCalc({ type: 'duo', a1: 35, a2: 35 }, S, F0);
  near(d.vals.find(v => v.key === 's1').v, 0.8 * 25 / 30 * 0.9);
  const S2 = EC.snowSite({ zone: 3, A: 300, Ce: 1, Ct: 1 }); // s_k = 1,2
  const o = EC.snowCalc({ type: 'obst', h: 1.0, L: 20 }, S2, F0);
  near(o.vals.find(v => v.key === 's2').v, 2 * 1.0 / 1.2 * 1.2); // μ2 = 1,667
  near(o.ls, 5);
  const S3 = EC.snowSite({ zone: 5, A: 0, Ce: 1, Ct: 1 }); // s_k = 2,0
  const ov = EC.snowCalc({ type: 'over', mu: 0.8 }, S3, F0);
  near(ov.vals[0].v, 1.6 * 1.6 * 1.6 / 3); // k = min(3/d; d·γ) = 1,6
  const g = EC.snowCalc({ type: 'guard', a1: 30, b: 4 }, S, F0);
  near(g.vals[0].v, 0.8 * 0.9 * 4 * 0.5);
  const t = EC.snowCalc({ type: 'tall', h: 3, b1: 12, b2: 10, au: 0, bu: 5 }, S2, F0);
  // μw = 22/6 = 3,667 ≤ γh/sk = 5 → μ2 = 3,667; ls = 6
  near(t.vals.find(v => v.key === 'ii').v, 22 / 6 * 1.2);
});

test('Wiatr – q_b, q_p wg ZK (tabl. NA.3) i wg wzorów CEN', () => {
  const ws = { zone: 1, A: 150, terrain: 'III', method: 'NA', cdir: 1, cseason: 1 };
  const wb = EC.windBase(ws);
  near(wb.qb, 0.5 * 1.25 * 22 * 22 / 1000);
  near(EC.windBase({ zone: 2, A: 10 }).qb, 0.5 * 1.25 * 26 * 26 / 1000);
  near(EC.windBase({ zone: 1, A: 500 }).vb0, 22 * (1 + 0.0006 * 200));
  near(EC.qpAt(10, ws, wb).qp, 1.9 * wb.qb);
  near(EC.qpAt(2, ws, wb).qp, 1.9 * Math.pow(0.5, 0.26) * wb.qb); // z < zmin = 5 m
  /* niezależna implementacja wzorów (4.3)–(4.8) (wartości zalecane CEN – jak eurocodeapplied.com) */
  const Z0 = { '0': [0.003, 1], 'I': [0.01, 1], 'II': [0.05, 2], 'III': [0.3, 5], 'IV': [1.0, 10] };
  for (const cat of Object.keys(Z0)) for (const z of [3, 10, 25, 60]) {
    const [z0, zmin] = Z0[cat], zz = Math.max(z, zmin), kr = 0.19 * Math.pow(z0 / 0.05, 0.07);
    const vm = kr * Math.log(zz / z0) * 22, Iv = 1 / Math.log(zz / z0);
    const ref = (1 + 7 * Iv) * 0.5 * 1.25 * vm * vm / 1000;
    near(EC.qpAt(z, Object.assign({}, ws, { terrain: cat, method: 'EN' }), wb).qp, ref, 1e-9, cat + ' z=' + z);
  }
  near(EC.qpAt(10, Object.assign({}, ws, { terrain: 'II', method: 'EN' }), wb).qp, 0.7116, 5e-4);
});

test('Wiatr – współczynniki c_pe (interpolacja, pole A)', () => {
  const wc = EC.wallCpe(6, 12); // h/d = 0,5
  near(wc.D[0], 0.7 + 0.1 * (0.25 / 0.75));
  near(wc.E[0], -0.3 - 0.2 * (0.25 / 0.75));
  near(EC.cpeA([-1.8, -2.5], 5), -2.5 + 0.7 * Math.log10(5));
  near(EC.cpeA([-1.8, -2.5], 10), -1.8); near(EC.cpeA([-1.8, -2.5], 0.5), -2.5);
  const z = EC.interpZ(EC.DUO0, 22.5); // F przy 15° i 30°: −0,9 / −0,5
  near(z[0].n[0], -0.7); near(z[0].p[0], 0.45);
  near(EC.cpiMu(0.33, 0.2), 0.35); near(EC.cpiMu(0.95, 1.2), -0.5);
});

test('Wiatr – ściany, dach płaski, wiata, attyka', () => {
  const ws = { zone: 1, A: 150, terrain: 'III', method: 'NA', cdir: 1, cseason: 1, cscd: 1 };
  const w = EC.windCalc({ type: 'walls', h: 10, b: 20, d: 12, Aload: 10, cpiMode: 'std' }, ws, F0);
  const qp = 1.9 * 0.3025;
  const D = w.zones.find(z => z.z === 'D');
  near(D.max.w, qp * EC.wallCpe(10, 12).D[0] + 0.3 * qp); // parcie + ssanie wewn. −0,3
  const fl = EC.windCalc({ type: 'flat', h: 10, b: 20, d: 12, eaves: 'sharp', Aload: 10, cpiMode: 'none' }, ws, F0);
  near(fl.zones.find(z => z.z === 'F').min.w, -1.8 * qp);
  const cn = EC.windCalc({ type: 'canopy1', h: 4, b: 10, d: 6, a: 0, phi: 0 }, ws, F0);
  const qp4 = 1.9 * Math.pow(0.5, 0.26) * 0.3025; // z = 4 m < zmin
  near(cn.vals.find(v => v.key === 'cf').v, 0.2 * qp4);
  near(cn.vals.find(v => v.key === 'A').vmin, -0.6 * qp4);
  const fw = EC.windCalc({ type: 'fwall', mode: 'wall', h: 2, l: 8, phi: 1, psis: 1 }, ws, F0); // l/h = 4
  near(fw.zones[0].cpes[0], 2.6);
});

test('Termika – budynek i pomost (rys. 6.1: +16/−3, +4/+4, +2/+8)', () => {
  const ts = { Tmax: 36, Tmin: -30, T0: 10 };
  const b = EC.thermCalc({ type: 'bld', pos: 'wall', orient: 'SW', abs: '0.9', TinS: 20, TinW: 25, mat: 'bet', L: 10, hs: 0.2 }, ts);
  near(b.rows[0].dTu, (20 + 36 + 42) / 2 - 10);
  near(b.rows[1].dTu, (25 - 30) / 2 - 10);
  near(b.eff[0].dL, 10e-6 * 39 * 10 * 1000);
  const br = EC.thermCalc({ type: 'bridge', btype: '3', sub3: 'slab', surf: '50', mat: 'bet' }, ts);
  near(br.rows[0].dTu, 36 + 2 - 10); near(br.rows[1].dTu, -(10 - (-30 + 8)));
  const b1 = EC.thermCalc({ type: 'bridge', btype: '1', surf: '50', mat: 'stal' }, ts);
  near(b1.rows[0].dTu, 36 + 16 - 10); near(b1.rows[1].dTu, -(10 - (-33)));
});

test('Obciążenia użytkowe – α_A, α_n, ścianki, wózki, montażowe', () => {
  const a = EC.imposedCalc({ kind: 'cat', cat: 'A1', qk: 2, Qk: 2, useAA: true, Aarea: 30 }, F0);
  near(a.alpha, 5 / 7 * 0.7 + 10 / 30);
  const n = EC.imposedCalc({ kind: 'cat', cat: 'B', qk: 3, Qk: 4.5, useAN: true, nst: 5 }, F0);
  near(n.alpha, (2 + 3 * 0.7) / 5);
  const c = EC.imposedCalc({ kind: 'cat', cat: 'C3', qk: 5, Qk: 4, useAA: true, Aarea: 200 }, F0);
  near(c.alpha, 0.6); // ograniczenie ≥ 0,6 dla C i D
  near(EC.imposedCalc({ kind: 'part', wmode: 'calc', wg: 0.5, wh: 2.7 }, F0).qk, 0.8);
  assert.ok(Number.isNaN(EC.imposedCalc({ kind: 'part', wmode: 'val', w: 3.5 }, F0).qk));
  near(EC.imposedCalc({ kind: 'fork', fl: 'FL2', tyre: 'pneu' }, F0).Qdyn, 56);
  const k = EC.imposedCalc({ kind: 'constr', t: 0.2, gc: 26, qcc: 0.5 }, F0);
  near(k.Qcf, 5.2); near(k.q2, 0.75);
});

test('Ciężar własny – warstwy i elementy w rozstawie', () => {
  const r = EC.permCalc({ layers: [{ m: 'ZB', mode: 'v', t: 20, g: 25 }, { m: 'C24', mode: 'rib', g: 4.2, b: 8, h: 18, a: 90 }, { m: 'DCER', mode: 'a', g: 0.5 }], alpha: 30, basis: 'rzut' }, F0);
  near(r.gk, 5 + 4.2 * 0.08 * 0.18 / 0.9 + 0.5);
  near(r.gkH, r.gk / Math.cos(Math.PI / 6));
  near(r.gd, 1.35 * r.gkH);
});

test('Kombinacje PN-EN 1990 (6.10a/b), SGU, odrywanie, kat. H', () => {
  const c = EC.combine(5.0, [
    { sym: 'Q1', fam: 'imp', q: 2, psi: [0.7, 0.5, 0.3] }, { sym: 'Q2', fam: 'imp', q: 0.8, psi: [0.7, 0.5, 0.3] },
    { sym: 'S1', fam: 'snow', q: 0.72, psi: [0.5, 0.2, 0] }, { sym: 'W1', fam: 'wind', q: 0.3, qn: -0.6, psi: [0.6, 0.2, 0] }], F0);
  near(c.uls.v, 0.85 * 1.35 * 5 + 1.5 * 2.8 + 1.5 * 0.5 * 0.72 + 1.5 * 0.6 * 0.3);
  near(c.sls.ch.v, 5 + 2.8 + 0.5 * 0.72 + 0.6 * 0.3);
  near(c.sls.fr.v, 5 + 0.5 * 2.8);
  near(c.sls.qp.v, 5 + 0.3 * 2.8);
  near(c.uplift.v, 5 - 1.5 * 0.6); near(c.upliftEQU.v, 0.9 * 5 - 1.5 * 0.6);
  const h = EC.combine(1.0, [{ sym: 'Q', fam: 'H', q: 0.4, psi: [0, 0, 0] }, { sym: 'S', fam: 'snow', q: 1.0, psi: [0.5, 0.2, 0] }], F0);
  near(h.uls.v, 0.85 * 1.35 + 1.5); // H i śnieg nie występują razem
  assert.equal(h.scen.length, 2);
  const r610 = EC.combine(5.0, [{ sym: 'Q', fam: 'imp', q: 2, psi: [0.7, 0.5, 0.3] }], { rule: '610' });
  near(r610.uls.v, 1.35 * 5 + 1.5 * 2);
  const kfi = EC.combine(5.0, [{ sym: 'Q', fam: 'imp', q: 2, psi: [0.7, 0.5, 0.3] }], { useKFI: true, rc: 'RC3' });
  near(kfi.uls.v, 1.1 * Math.max(1.35 * 5 + 1.5 * 0.7 * 2, 0.85 * 1.35 * 5 + 1.5 * 2));
});

test('Składowe względem połaci', () => {
  const a = 30, c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  near(EC.slopeComp('perp', a, 'G', 1).n, c); near(EC.slopeComp('perp', a, 'G', 1).t, s);
  near(EC.slopeComp('perp', a, 'S', 1).n, c * c); near(EC.slopeComp('perp', a, 'S', 1).t, c * s);
  near(EC.slopeComp('proj', a, 'G', 1).n, 1 / c); near(EC.slopeComp('perp', a, 'W', 0.5).n, 0.5);
});
