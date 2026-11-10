window.G = window.G || {};
G.VERSION = '1.3.1';
G.SUPABASE_URL = 'https://vaeutqqpqoaemfupeyud.supabase.co';
G.SUPABASE_KEY = 'sb_publishable_R-bOcKQieM3QiSlsRV2-kQ_xzu5bL6z';
G.WORLD_R = 3000;
G.MAX_LEVEL = 200;
G.mobile = (typeof navigator !== 'undefined') && (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 900));
G.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
G.sm = (a, b, x) => { let t = (x - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
G.mix = (a, b, t) => a + (b - a) * t;

(function () {
  const p = new Uint8Array(512);
  let s = 20261104;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const perm = []; for (let i = 0; i < 256; i++) perm.push(i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  function noise(x, y) {
    const X = Math.floor(x), Y = Math.floor(y), xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
    const aa = p[p[xi] + yi] & 7, ab = p[p[xi] + yi + 1] & 7, ba = p[p[xi + 1] + yi] & 7, bb = p[p[xi + 1] + yi + 1] & 7;
    const u = fade(xf), v = fade(yf);
    const n00 = GX[aa] * xf + GY[aa] * yf, n10 = GX[ba] * (xf - 1) + GY[ba] * yf;
    const n01 = GX[ab] * xf + GY[ab] * (yf - 1), n11 = GX[bb] * (xf - 1) + GY[bb] * (yf - 1);
    const x1 = n00 + (n10 - n00) * u, x2 = n01 + (n11 - n01) * u;
    return x1 + (x2 - x1) * v;
  }
  function fbm(x, y, o) { let t = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { t += noise(x * f, y * f) * a; n += a; a *= 0.5; f *= 2.03; } return t / n; }
  function ridged(x, y, o) { let t = 0, a = 1, f = 1, n = 0; for (let i = 0; i < o; i++) { let v = 1 - Math.abs(noise(x * f + i * 13.1, y * f - i * 7.7)); v *= v; t += v * a; n += a; a *= 0.5; f *= 2.1; } return t / n; }
  function rng(seed) { let t = seed >>> 0; return function () { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
  G.noise = { noise, fbm, ridged, rng };
})();

(function () {
  const N = G.noise, R = G.WORLD_R, sm = G.sm, mix = G.mix;
  G.BIOMES = {
    plains:  { name: '푸른 초원',     c1: [0.40, 0.58, 0.24], c2: [0.52, 0.66, 0.30], fog: 0xc4d8e8, map: [111, 154, 62] },
    forest:  { name: '고요의 숲',     c1: [0.20, 0.38, 0.14], c2: [0.28, 0.45, 0.18], fog: 0xa9c2b4, map: [47, 94, 38] },
    desert:  { name: '작열의 사막',   c1: [0.86, 0.74, 0.50], c2: [0.80, 0.66, 0.42], fog: 0xe3cfa2, map: [217, 191, 132] },
    snow:    { name: '백야의 설원',   c1: [0.92, 0.94, 0.97], c2: [0.82, 0.87, 0.92], fog: 0xdde6ee, map: [232, 238, 244] },
    volcano: { name: '불꽃 화산지대', c1: [0.22, 0.18, 0.16], c2: [0.33, 0.23, 0.18], fog: 0x6a5048, map: [74, 58, 52] },
    swamp:   { name: '안개 늪지',     c1: [0.28, 0.34, 0.20], c2: [0.36, 0.38, 0.22], fog: 0x8f9a84, map: [79, 94, 56] }
  };
  function climate(x, z) {
    return [N.fbm(x * 0.00042 + 31.7, z * 0.00042 - 17.3, 3) * 1.7, N.fbm(x * 0.0005 - 90.1, z * 0.0005 + 55.9, 3) * 1.7];
  }
  function biomeAt(x, z) {
    if (Math.hypot(x, z) < 450) return 'plains';
    const c = climate(x, z), t = c[0], m = c[1];
    if (t < -0.28) return 'snow';
    if (t > 0.28) return m < 0.05 ? 'desert' : 'volcano';
    if (m > 0.28) return 'swamp';
    if (m > -0.12) return 'forest';
    return 'plains';
  }
  function heightAt(x, z) {
    const d = Math.hypot(x, z);
    const c = climate(x, z), t = c[0], m = c[1];
    let h = N.fbm(x * 0.0021, z * 0.0021, 5) * 38 + N.noise(x * 0.012, z * 0.012) * 2.2 + 7;
    const far = sm(420, 900, d);
    const rm = N.ridged(x * 0.00085 + 200.5, z * 0.00085 - 300.5, 4);
    const mask = sm(-0.05, 0.25, N.fbm(x * 0.00035 + 500, z * 0.00035 + 500, 2));
    const snowW = sm(-0.18, -0.38, t);
    h += Math.pow(rm, 2.3) * (170 + snowW * 120) * mask * far;
    const volW = sm(0.18, 0.38, t) * sm(-0.05, 0.15, m) * far;
    h += volW * Math.pow(rm, 1.4) * 70;
    const desW = sm(0.18, 0.38, t) * sm(0.15, -0.05, m) * far;
    h += desW * Math.abs(N.noise(x * 0.011, z * 0.016)) * 9;
    const swW = sm(0.18, 0.38, m) * sm(0.38, 0.18, t) * sm(-0.38, -0.18, t) * far;
    h = mix(h, h * 0.12 + 0.6, swW);
    const lk = N.fbm(x * 0.0024 + 700.3, z * 0.0024 - 700.7, 3);
    h -= sm(0.22, 0.42, lk) * 30 * sm(160, 320, d) * (1 - swW * 0.5);
    h = mix(4, h, sm(70, 190, d));
    h -= sm(R - 550, R, d) * 140;
    return h;
  }
  function levelAt(x, z) {
    const d = Math.hypot(x, z);
    return Math.max(1, Math.min(200, Math.round(1 + Math.pow(Math.min(1, d / (R * 0.9)), 1.5) * 199)));
  }
  function flatEnough(x, z) {
    return Math.abs(heightAt(x + 4, z) - heightAt(x - 4, z)) + Math.abs(heightAt(x, z + 4) - heightAt(x, z - 4)) < 5;
  }
  const BOSSES = {
    plains:  { key: 'slime',     name: '킹 슬라임',            size: 4.5, target: 380 },
    forest:  { key: 'bear',      name: '숲의 군주 고대곰',      size: 2.4, target: 850 },
    swamp:   { key: 'troll',     name: '늪의 지배자 트롤킹',    size: 2.2, target: 1150 },
    desert:  { key: 'scorpion',  name: '사막의 폭군 전갈왕',    size: 3.2, target: 1450 },
    snow:    { key: 'yeti',      name: '서리 거인 예티',        size: 2.3, target: 1850 },
    volcano: { key: 'fireelem',  name: '화염의 군주 이프리트',  size: 3.0, target: 2250 }
  };
  function init() {
    const wps = [{ id: 0, name: '시작의 마을', x: 0, z: 0, biome: 'plains' }];
    const cnt = {};
    const step = 650;
    for (let gz = -R; gz <= R; gz += step) for (let gx = -R; gx <= R; gx += step) {
      const d = Math.hypot(gx, gz);
      if (d < 350 || d > R - 600) continue;
      let found = null;
      for (let r = 0; r <= 180 && !found; r += 30) for (let a = 0; a < 8 && !found; a++) {
        const x = gx + Math.cos(a * 0.785) * r, z = gz + Math.sin(a * 0.785) * r, h = heightAt(x, z);
        if (h > 2 && h < 110 && flatEnough(x, z)) found = [x, z];
      }
      if (!found) continue;
      const b = biomeAt(found[0], found[1]);
      cnt[b] = (cnt[b] || 0) + 1;
      wps.push({ id: wps.length, name: G.townName(b, cnt[b]), x: Math.round(found[0]), z: Math.round(found[1]), biome: b });
    }
    const cands = {};
    for (let z = -R; z <= R; z += 120) for (let x = -R; x <= R; x += 120) {
      const d = Math.hypot(x, z); if (d < 250 || d > R - 500) continue;
      const h = heightAt(x, z); if (h < 2 || h > 90) continue;
      const b = biomeAt(x, z); (cands[b] = cands[b] || []).push([x, z, d]);
    }
    for (const b in G.BIOMES) {
      if (cnt[b] || !cands[b]) continue;
      const list = cands[b].slice().sort((u, v) => u[2] - v[2]);
      let pick = null;
      for (const c of list) { const h = heightAt(c[0], c[1]); if (h > 2 && h < 110 && flatEnough(c[0], c[1]) && !wps.some(w => Math.hypot(w.x - c[0], w.z - c[1]) < 300)) { pick = c; break; } }
      if (!pick) for (const c of list) if (flatEnough(c[0], c[1])) { pick = c; break; }
      if (!pick) continue;
      cnt[b] = 1;
      wps.push({ id: wps.length, name: G.townName(b, 1), x: Math.round(pick[0]), z: Math.round(pick[1]), biome: b });
    }
    const bosses = [];
    for (const b in BOSSES) {
      const list = cands[b]; if (!list) continue;
      const B = BOSSES[b];
      let best = null, bd = 1e9;
      for (const c of list) { const e = Math.abs(c[2] - B.target); if (e < bd && flatEnough(c[0], c[1])) { bd = e; best = c; } }
      if (best) bosses.push({ biome: b, key: B.key, name: B.name, size: B.size, x: best[0], z: best[1], level: Math.min(200, levelAt(best[0], best[1]) + 8) });
    }
    G.terrain.waypoints = wps; G.terrain.bosses = bosses;
  }
  G.terrain = { climate, biomeAt, heightAt, levelAt, init, waypoints: [], bosses: [] };
})();

(function () {
  const T = G.terrain, N = G.noise, sm = G.sm, mix = G.mix;
  const CH = 160, SEG = 32, STEP = CH / SEG, B = SEG + 3;
  const W = G.world = { CH, chunks: new Map(), queue: [], radius: 4, colliders: [], obelisks: [], weather: 'clear', fogTint: new THREE.Color(0xc4d8e8) };
  const lin = c => Math.pow(Math.max(0, c), 2.2);

  function mergeGeos(list) {
    const pos = [], nor = [], col = [];
    for (const it of list) {
      const g = it[0].index ? it[0].toNonIndexed() : it[0]; g.computeVertexNormals();
      const p = g.attributes.position.array, n = g.attributes.normal.array, c = new THREE.Color(it[1]);
      for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
      for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeBoundingSphere();
    return g;
  }
  G.mergeGeos = mergeGeos;

  const trunk = (h, r) => new THREE.CylinderGeometry(r * 0.65, r, h, 7).translate(0, h / 2, 0);
  const ico = (r, x, y, z) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z);
  const cone = (r, h, y) => new THREE.ConeGeometry(r, h, 9).translate(0, y, 0);
  const GEO = {};
  function buildGeos() {
    GEO.oak = mergeGeos([[trunk(3.4, 0.34), 0x5a3d26], [ico(2.4, 0, 4.8, 0), 0x3f7a2c], [ico(1.7, 1.2, 4.0, 0.6), 0x4a8432], [ico(1.6, -1.1, 4.3, -0.7), 0x386e28], [ico(1.4, 0.2, 6.2, -0.3), 0x4f8a36]]);
    GEO.pine = mergeGeos([[trunk(2.4, 0.3), 0x4a3020], [cone(2.4, 3.8, 3.6), 0x22502b], [cone(1.8, 3.2, 5.6), 0x275a30], [cone(1.15, 2.6, 7.4), 0x2c6335]]);
    GEO.snowpine = mergeGeos([[trunk(2.4, 0.3), 0x4a3020], [cone(2.4, 3.8, 3.6), 0x2a4f3a], [cone(1.9, 1.2, 4.7), 0xe6eef4], [cone(1.8, 3.2, 5.6), 0x2f5a40], [cone(1.25, 1.0, 6.7), 0xe6eef4], [cone(1.15, 2.6, 7.4), 0xeef4f8]]);
    GEO.cactus = mergeGeos([[new THREE.CylinderGeometry(0.38, 0.44, 4.2, 9).translate(0, 2.1, 0), 0x4f8a3a], [new THREE.CylinderGeometry(0.22, 0.22, 1.7, 8).translate(0.8, 2.6, 0), 0x4a8236], [new THREE.CylinderGeometry(0.2, 0.2, 0.9, 8).rotateZ(Math.PI / 2).translate(0.45, 1.8, 0), 0x4a8236], [new THREE.CylinderGeometry(0.2, 0.2, 1.3, 8).translate(-0.7, 2.9, 0), 0x4a8236], [new THREE.CylinderGeometry(0.18, 0.18, 0.8, 8).rotateZ(Math.PI / 2).translate(-0.4, 2.3, 0), 0x4a8236]]);
    GEO.dead = mergeGeos([[trunk(4.6, 0.32), 0x2e241d], [new THREE.CylinderGeometry(0.08, 0.14, 2.2, 5).rotateZ(0.9).translate(0.8, 3.4, 0), 0x2e241d], [new THREE.CylinderGeometry(0.07, 0.12, 1.8, 5).rotateZ(-1.0).rotateY(1.2).translate(-0.4, 2.8, 0.5), 0x2e241d], [new THREE.CylinderGeometry(0.06, 0.1, 1.5, 5).rotateX(0.8).translate(0, 4.1, 0.5), 0x2e241d]]);
    GEO.willow = mergeGeos([[trunk(3.2, 0.42), 0x3e3224], [new THREE.SphereGeometry(2.8, 9, 7).scale(1, 0.8, 1).translate(0, 4.6, 0), 0x56682e], [new THREE.CylinderGeometry(2.6, 3.2, 2.6, 10, 1, true).translate(0, 2.9, 0), 0x4a5c28]]);
    GEO.bush = mergeGeos([[ico(1.0, 0, 0.6, 0), 0x3d6e2a], [ico(0.75, 0.7, 0.45, 0.2), 0x477930], [ico(0.7, -0.6, 0.4, -0.3), 0x396626]]);
    GEO.rock = mergeGeos([[new THREE.DodecahedronGeometry(1, 0).scale(1.3, 0.8, 1.1), 0x86837c]]);
    GEO.rockDark = mergeGeos([[new THREE.DodecahedronGeometry(1, 0).scale(1.3, 1.0, 1.1), 0x2c2622]]);
    GEO.rockSand = mergeGeos([[new THREE.DodecahedronGeometry(1, 0).scale(1.4, 0.9, 1.2), 0xb58f5f]]);
    const gp = [];
    for (let k = 0; k < 4; k++) { const a = k * 0.8, c = Math.cos(a) * 0.09, s = Math.sin(a) * 0.09, lean = 0.12 * (k % 2 ? 1 : -1); gp.push(-c, 0, -s, c, 0, s, lean * Math.cos(a + 1.5), 0.55 + k * 0.08, lean * Math.sin(a + 1.5)); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    const gc = []; for (let i = 0; i < gp.length / 3; i++) { const top = i % 3 === 2; gc.push(top ? 0.24 : 0.08, top ? 0.42 : 0.2, top ? 0.1 : 0.04); }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(gc, 3)); gg.computeVertexNormals();
    const na = gg.attributes.normal.array; for (let i = 0; i < na.length; i += 3) { na[i] = 0; na[i + 1] = 1; na[i + 2] = 0; }
    GEO.grass = gg;
  }
  const FLORA = {
    plains:  { n: 16,  t: [['oak', 1], ['bush', 1.6]], rock: 'rock', rn: 5, grass: 1100, rad: { oak: 0.7 } },
    forest:  { n: 105, t: [['oak', 1], ['pine', 1.1], ['bush', 0.5]], rock: 'rock', rn: 6, grass: 700, rad: { oak: 0.7, pine: 0.6 } },
    desert:  { n: 8,   t: [['cactus', 1]], rock: 'rockSand', rn: 9, grass: 0, rad: { cactus: 0.55 } },
    snow:    { n: 38,  t: [['snowpine', 1]], rock: 'rock', rn: 7, grass: 0, rad: { snowpine: 0.6 } },
    volcano: { n: 9,   t: [['dead', 1]], rock: 'rockDark', rn: 15, grass: 0, rad: { dead: 0.5 } },
    swamp:   { n: 42,  t: [['willow', 1], ['dead', 0.35]], rock: 'rock', rn: 3, grass: 600, rad: { willow: 0.8, dead: 0.5 } }
  };
  let decoMat, grassMat, terrainMat;

  function colorAt(x, z, h, ny, out, o) {
    const b = T.biomeAt(x, z), BI = G.BIOMES[b];
    const v = N.noise(x * 0.045, z * 0.045) * 0.5 + 0.5, v2 = N.noise(x * 0.23, z * 0.23) * 0.07;
    let r = mix(BI.c1[0], BI.c2[0], v) + v2, g = mix(BI.c1[1], BI.c2[1], v) + v2, bl = mix(BI.c1[2], BI.c2[2], v) + v2 * 0.6;
    const slope = 1 - ny;
    const rk = b === 'desert' ? [0.66, 0.48, 0.33] : b === 'volcano' ? [0.15, 0.12, 0.11] : b === 'snow' ? [0.56, 0.58, 0.62] : [0.46, 0.44, 0.41];
    const rs = sm(0.2, 0.42, slope);
    r = mix(r, rk[0], rs); g = mix(g, rk[1], rs); bl = mix(bl, rk[2], rs);
    if (h < 2.4 && b !== 'snow' && b !== 'volcano' && b !== 'swamp') { const s = sm(2.4, 0.9, h); r = mix(r, 0.78, s); g = mix(g, 0.71, s); bl = mix(bl, 0.52, s); }
    const sn = sm(118, 150, h) * (1 - rs * 0.6);
    if (sn > 0) { r = mix(r, 0.95, sn); g = mix(g, 0.96, sn); bl = mix(bl, 0.99, sn); }
    if (b === 'volcano' && slope < 0.3) { const lv = N.ridged(x * 0.018, z * 0.018, 2); if (lv > 0.9) { const k = sm(0.9, 0.97, lv); r = mix(r, 1.0, k); g = mix(g, 0.32, k); bl = mix(bl, 0.05, k); } }
    if (b === 'plains' || b === 'forest') { const pth = Math.abs(N.noise(x * 0.004 + 9, z * 0.004 - 3)); if (pth < 0.018 && slope < 0.2) { r = mix(r, 0.52, 0.7); g = mix(g, 0.44, 0.7); bl = mix(bl, 0.3, 0.7); } }
    if (h < 0) { const f = Math.max(0.3, 1 + h / 22); r *= f; g *= f; bl *= f; }
    out[o] = lin(r); out[o + 1] = lin(g); out[o + 2] = lin(bl);
    return b;
  }

  function buildChunk(cx, cz) {
    const ox = cx * CH, oz = cz * CH, S = SEG + 1;
    const hs = new Float32Array(B * B);
    for (let j = 0; j < B; j++) for (let i = 0; i < B; i++) hs[j * B + i] = T.heightAt(ox + (i - 1) * STEP, oz + (j - 1) * STEP);
    const pos = new Float32Array(S * S * 3), nor = new Float32Array(S * S * 3), col = new Float32Array(S * S * 3);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const k = (j * S + i) * 3, h = hs[(j + 1) * B + i + 1];
      pos[k] = i * STEP; pos[k + 1] = h; pos[k + 2] = j * STEP;
      let nx = hs[(j + 1) * B + i] - hs[(j + 1) * B + i + 2], ny = 2 * STEP, nz = hs[j * B + i + 1] - hs[(j + 2) * B + i + 1];
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      nor[k] = nx; nor[k + 1] = ny; nor[k + 2] = nz;
      colorAt(ox + i * STEP, oz + j * STEP, h, ny, col, k);
    }
    const idx = [];
    for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) { const a = j * S + i, b = a + 1, c = a + S, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, terrainMat); mesh.position.set(ox, 0, oz); mesh.receiveShadow = true; mesh.castShadow = true;
    W.scene.add(mesh);
    const chunk = { cx, cz, hs, mesh, deco: [], colliders: [], grass: null };
    const hl = (x, z) => sampleHs(hs, (x - ox) / STEP, (z - oz) / STEP);
    chunk.hl = hl;
    const rng = N.rng((cx * 73856093) ^ (cz * 19349663) ^ 0x5bd1e995);
    const mats = {}, cols = {};
    const add = (type, x, y, z, s, rot, tilt) => {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(x - ox, y, z - oz), new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt || 0, rot, (tilt || 0) * 0.5)), new THREE.Vector3(s, s * (0.85 + rng() * 0.3), s));
      (mats[type] = mats[type] || []).push(m);
      const c = 0.82 + rng() * 0.3; (cols[type] = cols[type] || []).push(new THREE.Color(c, c * (0.95 + rng() * 0.1), c));
    };
    for (let n = 0; n < 130; n++) {
      const x = ox + rng() * CH, z = oz + rng() * CH, d = Math.hypot(x, z);
      if (d < 120) continue;
      const b = T.biomeAt(x, z), F = FLORA[b];
      if (rng() > F.n / 130) continue;
      const h = hl(x, z); if (h < 0.8 || h > 135) continue;
      if (Math.abs(hl(x + 2, z) - hl(x - 2, z)) + Math.abs(hl(x, z + 2) - hl(x, z - 2)) > 3.5) continue;
      let tot = 0; for (const t of F.t) tot += t[1];
      let pick = rng() * tot, type = F.t[0][0]; for (const t of F.t) { pick -= t[1]; if (pick <= 0) { type = t[0]; break; } }
      const s = 0.75 + rng() * 0.6;
      add(type, x, h - 0.15, z, s, rng() * 6.28, (rng() - 0.5) * 0.08);
      if (F.rad[type]) chunk.colliders.push([x, z, F.rad[type] * s]);
    }
    for (let n = 0; n < 16; n++) {
      const x = ox + rng() * CH, z = oz + rng() * CH; if (Math.hypot(x, z) < 110) continue;
      const b = T.biomeAt(x, z), F = FLORA[b]; if (rng() > F.rn / 16) continue;
      const h = hl(x, z); if (h < -3) continue;
      const s = 0.5 + rng() * rng() * 3.2;
      add(F.rock, x, h - s * 0.25, z, s, rng() * 6.28, (rng() - 0.5) * 0.6);
      if (s > 0.9) chunk.colliders.push([x, z, s * 1.05]);
    }
    for (const type in mats) {
      const im = new THREE.InstancedMesh(GEO[type], decoMat, mats[type].length);
      mats[type].forEach((m, i) => { im.setMatrixAt(i, m); im.setColorAt(i, cols[type][i]); });
      im.position.set(ox, 0, oz); im.castShadow = true; im.receiveShadow = true;
      im.computeBoundingSphere && im.computeBoundingSphere();
      im.frustumCulled = false;
      W.scene.add(im); chunk.deco.push(im);
    }
    return chunk;
  }
  function sampleHs(hs, fx, fz) {
    let i = Math.floor(fx), j = Math.floor(fz); if (i < 0) i = 0; if (j < 0) j = 0; if (i > SEG - 1) i = SEG - 1; if (j > SEG - 1) j = SEG - 1;
    const u = fx - i, v = fz - j;
    const h00 = hs[(j + 1) * B + i + 1], h10 = hs[(j + 1) * B + i + 2], h01 = hs[(j + 2) * B + i + 1], h11 = hs[(j + 2) * B + i + 2];
    if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }
  function buildGrass(ch) {
    const ox = ch.cx * CH, oz = ch.cz * CH;
    const b = T.biomeAt(ox + CH / 2, oz + CH / 2), F = FLORA[b];
    let n = F.grass; if (!n) return null;
    if (W.quality === 'mid') n = Math.floor(n * 0.5);
    const rng = N.rng((ch.cx * 9781) ^ (ch.cz * 6271) ^ 77);
    const im = new THREE.InstancedMesh(GEO.grass, grassMat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const c = new THREE.Color(); let k = 0;
    for (let i = 0; i < n; i++) {
      const x = ox + rng() * CH, z = oz + rng() * CH, h = ch.hl(x, z);
      if (h < 0.6 || Math.hypot(x, z) < 70) continue;
      e.set((rng() - 0.5) * 0.3, rng() * 6.28, (rng() - 0.5) * 0.3); q.setFromEuler(e);
      const sc = 0.7 + rng() * 0.9; s.set(sc, sc * (0.7 + rng() * 0.8), sc);
      v.set(x - ox, h - 0.05, z - oz); m.compose(v, q, s); im.setMatrixAt(k, m);
      const t = 0.75 + rng() * 0.5; c.setRGB(t * (b === 'swamp' ? 0.85 : 1), t, t * 0.8); im.setColorAt(k, c); k++;
    }
    im.count = k; im.position.set(ox, 0, oz); im.receiveShadow = true; im.frustumCulled = false;
    W.scene.add(im); return im;
  }
  function disposeChunk(ch) {
    W.scene.remove(ch.mesh); ch.mesh.geometry.dispose();
    for (const d of ch.deco) { W.scene.remove(d); d.dispose && d.dispose(); }
    if (ch.grass) { W.scene.remove(ch.grass); ch.grass.dispose && ch.grass.dispose(); }
  }
  W.groundAt = function (x, z) {
    const c = W.chunks.get(Math.floor(x / CH) + ',' + Math.floor(z / CH));
    if (!c) return T.heightAt(x, z);
    return c.hl(x, z);
  };
  W.nearColliders = function (x, z) {
    const out = W.colliders.slice ? [] : [];
    const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const c = W.chunks.get((cx + dx) + ',' + (cz + dz)); if (c) for (const k of c.colliders) if (Math.abs(k[0] - x) < 8 && Math.abs(k[1] - z) < 8) out.push(k); }
    for (const k of W.colliders) if (Math.abs(k[0] - x) < 12 && Math.abs(k[1] - z) < 12) out.push(k);
    return out;
  };
  W.update = function (px, pz, budgetMs) {
    const pcx = Math.floor(px / CH), pcz = Math.floor(pz / CH), r = W.radius;
    const need = new Set();
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dz * dz > (r + 0.5) * (r + 0.5)) continue;
      const cx = pcx + dx, cz = pcz + dz;
      if (Math.hypot(cx * CH + CH / 2, cz * CH + CH / 2) > G.WORLD_R + 350) continue;
      need.add(cx + ',' + cz);
    }
    for (const [k, ch] of W.chunks) {
      if (Math.abs(ch.cx - pcx) > r + 1 || Math.abs(ch.cz - pcz) > r + 1) { disposeChunk(ch); W.chunks.delete(k); G.mobs && G.mobs.onChunkUnload(k); }
    }
    const todo = [];
    for (const k of need) if (!W.chunks.has(k)) { const p = k.split(',').map(Number); todo.push([p[0], p[1], (p[0] - pcx) ** 2 + (p[1] - pcz) ** 2]); }
    todo.sort((a, b) => a[2] - b[2]);
    const t0 = performance.now();
    for (const t of todo) {
      W.chunks.set(t[0] + ',' + t[1], buildChunk(t[0], t[1]));
      if (performance.now() - t0 > budgetMs) break;
    }
    const gr = W.quality === 'low' ? -1 : 1;
    for (const ch of W.chunks.values()) {
      const near = Math.abs(ch.cx - pcx) <= gr && Math.abs(ch.cz - pcz) <= gr;
      if (near && !ch.grass && !ch.noGrass) { ch.grass = buildGrass(ch); if (!ch.grass) ch.noGrass = true; }
      else if (!near && ch.grass) { W.scene.remove(ch.grass); ch.grass.dispose && ch.grass.dispose(); ch.grass = null; }
    }
    return todo.length;
  };
  W.clearAll = function () { for (const ch of W.chunks.values()) disposeChunk(ch); W.chunks.clear(); };
  W.setQuality = function (q) {
    W.quality = q; W.radius = q === 'low' ? 2 : q === 'mid' ? 3 : 4;
    if (W.sun) { const ms = q === 'low' ? 1024 : 2048; W.sun.castShadow = true; W.sun.shadow.mapSize.set(ms, ms); if (W.sun.shadow.map) { W.sun.shadow.map.dispose(); W.sun.shadow.map = null; } }
    for (const ch of W.chunks.values()) if (ch.grass) { W.scene.remove(ch.grass); ch.grass = null; }
  };

  function buildFar() {
    const size = G.WORLD_R * 2 + 800, seg = 120, st = size / seg, S = seg + 1;
    const pos = new Float32Array(S * S * 3), col = new Float32Array(S * S * 3), hs = new Float32Array(S * S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) hs[j * S + i] = T.heightAt(-size / 2 + i * st, -size / 2 + j * st);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const k = (j * S + i) * 3, x = -size / 2 + i * st, z = -size / 2 + j * st, h = hs[j * S + i];
      pos[k] = x; pos[k + 1] = h - 3.5; pos[k + 2] = z;
      const hl = hs[j * S + Math.max(0, i - 1)], hr = hs[j * S + Math.min(seg, i + 1)], hd = hs[Math.max(0, j - 1) * S + i], hu = hs[Math.min(seg, j + 1) * S + i];
      const ny = 2 * st / Math.hypot(hl - hr, 2 * st, hd - hu);
      colorAt(x, z, h, ny, col, k);
    }
    const idx = []; for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * S + i, b = a + 1, c = a + S, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, terrainMat); m.receiveShadow = false; W.scene.add(m);
  }

  let sky, skyMat, stars, water, waterU = { uTime: { value: 0 } }, rain, snow, clouds = [], hemi, amb;
  function buildSky() {
    skyMat = new THREE.ShaderMaterial({
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.9, 0.7) }, night: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float night; varying vec3 vP; void main(){ vec3 d = normalize(vP); float h = max(d.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.5)); if (d.y < 0.0) c = hor * (1.0 + d.y * 0.4); float s = max(dot(d, sunDir), 0.0); c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.22) * (1.0 - night); float mo = dot(d, -sunDir); c += vec3(0.85, 0.9, 1.0) * smoothstep(0.99955, 0.99975, mo) * night * 1.4 + vec3(0.2,0.25,0.4) * pow(max(mo,0.0), 60.0) * night * 0.3; gl_FragColor = vec4(pow(c, vec3(1.0/2.2)), 1.0); }',
      side: THREE.BackSide, depthWrite: false, fog: false
    });
    sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), skyMat); sky.frustumCulled = false; sky.renderOrder = -10; W.scene.add(sky);
    const sp = []; const r = N.rng(99);
    for (let i = 0; i < 1800; i++) { const u = r() * 2 - 1, a = r() * 6.283, y = Math.abs(u), q = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * q * 3800, y * 3800, Math.sin(a) * q * 3800); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.frustumCulled = false; W.scene.add(stars);
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, fog: false, depthWrite: false });
    for (let i = 0; i < 26; i++) {
      const parts = []; const n = 4 + Math.floor(r() * 5);
      for (let k = 0; k < n; k++) parts.push([new THREE.SphereGeometry(18 + r() * 22, 8, 6).scale(1, 0.45, 1).translate((k - n / 2) * 26 + r() * 10, r() * 8, r() * 30 - 15), 0xffffff]);
      const c = new THREE.Mesh(mergeGeos(parts), cm); c.position.set((r() - 0.5) * 3000, 280 + r() * 90, (r() - 0.5) * 3000); W.scene.add(c); clouds.push(c);
    }
  }
  function buildWater() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b5a78, transparent: true, opacity: 0.84, roughness: 0.06, metalness: 0.25 });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = waterU.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vec4 wp0 = modelMatrix * vec4(position, 1.0);\n transformed.y += sin(wp0.x * 0.11 + uTime * 1.3) * 0.16 + cos(wp0.z * 0.14 + uTime * 1.05) * 0.14 + sin((wp0.x + wp0.z) * 0.35 + uTime * 2.2) * 0.05;');
    };
    const g = new THREE.PlaneGeometry(2600, 2600, 90, 90); g.rotateX(-Math.PI / 2);
    water = new THREE.Mesh(g, mat); water.receiveShadow = true; water.renderOrder = 1; W.scene.add(water);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000).rotateX(-Math.PI / 2), mat); sea.position.y = -0.4; W.scene.add(sea);
  }
  function buildWeather() {
    const rp = new Float32Array(1600 * 6);
    for (let i = 0; i < 1600; i++) { const x = (Math.random() - 0.5) * 70, y = Math.random() * 40, z = (Math.random() - 0.5) * 70; rp.set([x, y, z, x + 0.05, y - 0.9, z], i * 6); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0.45 })); rain.frustumCulled = false; rain.visible = false; W.scene.add(rain);
    const spp = new Float32Array(2200 * 3); for (let i = 0; i < spp.length; i += 3) { spp[i] = (Math.random() - 0.5) * 70; spp[i + 1] = Math.random() * 40; spp[i + 2] = (Math.random() - 0.5) * 70; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(spp, 3));
    snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.18, transparent: true, opacity: 0.9 })); snow.frustumCulled = false; snow.visible = false; W.scene.add(snow);
  }
  const SM = G.mat || ((c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {})));
  function buildVillage() {
    const y0 = 4;
    const wall = SM(0xe8dcc4), wood = SM(0x5b3f28), roof = SM(0x8c3a2a, { roughness: 0.7 }), stone = SM(0x8d8a84), win = SM(0x332a1c, { emissive: 0xffb050, emissiveIntensity: 0 });
    W.windowMat = win;
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(26, 27, 0.3, 40), SM(0x9c958a, { roughness: 0.95 })); plaza.position.y = y0 + 0.02; plaza.receiveShadow = true; W.scene.add(plaza);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + 0.2, rr = 42 + (i % 2) * 6, g = new THREE.Group();
      const w = 7 + (i % 3), d = 6 + (i % 2);
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 4.6, d), wall); base.position.y = 2.3; g.add(base);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.7, 0.35), wood); p.position.set(sx * (w / 2), 2.35, sz * (d / 2)); g.add(p); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.3, d + 0.3), wood); beam.position.y = 4.6; g.add(beam);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 3.4, 4), roof); rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); rf.position.y = 6.4; g.add(rf);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.15), wood); door.position.set(0, 1.15, d / 2 + 0.05); g.add(door);
      for (const sx of [-1, 1]) { const wn = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.12), win); wn.position.set(sx * w * 0.3, 2.8, d / 2 + 0.05); g.add(wn); }
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), stone); ch.position.set(w * 0.25, 7, -d * 0.15); g.add(ch);
      g.position.set(Math.cos(a) * rr, y0, Math.sin(a) * rr); g.lookAt(0, y0, 0);
      g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      W.scene.add(g); W.colliders.push([g.position.x, g.position.z, Math.max(w, d) * 0.62]);
    }
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.3, 0.9, 24), stone); basin.position.y = y0 + 0.45; basin.castShadow = basin.receiveShadow = true; W.scene.add(basin);
    const fw = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.1, 24), SM(0x3a8ab0, { roughness: 0.1, metalness: 0.3 })); fw.position.y = y0 + 0.8; W.scene.add(fw);
    W.colliders.push([0, 0, 4.4]);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, lp = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.6, 6), wood); pole.position.y = 1.8; lp.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), win); lamp.position.y = 3.7; lp.add(lamp);
      lp.position.set(Math.cos(a) * 24, y0, Math.sin(a) * 24); lp.traverse(o => { if (o.isMesh) o.castShadow = true; }); W.scene.add(lp);
    }
  }
  function buildObelisks() {
    const stone = SM(0x6f6c68), gold = SM(0xb08d3a, { metalness: 0.6, roughness: 0.4 });
    for (const wp of T.waypoints) {
      const g = new THREE.Group(), h = T.heightAt(wp.x, wp.z) + (wp.id === 0 ? 0.3 : 0);
      const ox = wp.id === 0 ? 0 : 0, oz = wp.id === 0 ? 12 : 0;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 0.6, 8), stone); b.position.y = 0.3; g.add(b);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.6, 4.2, 4), stone); p.position.y = 2.6; p.rotation.y = Math.PI / 4; g.add(p);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.07, 6, 20), gold); ring.position.y = 5.4; ring.rotation.x = Math.PI / 2; g.add(ring);
      const cm = new THREE.MeshStandardMaterial({ color: 0x8899aa, emissive: 0x000000, roughness: 0.2, metalness: 0.1 });
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), cm); cr.position.y = 5.6; g.add(cr);
      g.position.set(wp.x + ox, wp.id === 0 ? 4 : h, wp.z + oz);
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      W.scene.add(g); W.obelisks.push({ wp, g, cr, cm, x: wp.x + ox, z: wp.z + oz });
      W.colliders.push([wp.x + ox, wp.z + oz, 1.7]);
    }
    const dark = SM(0x2a2522), fire = new THREE.MeshBasicMaterial({ color: 0xff5a1a });
    for (const bs of T.bosses) {
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, x = bs.x + Math.cos(a) * 22, z = bs.z + Math.sin(a) * 22, h = T.heightAt(x, z);
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4 + (i % 3), 1.0), dark); st.position.set(x, h + 1.6, z); st.rotation.set(0.1, a, 0.06); st.castShadow = true; W.scene.add(st);
        if (i % 2 === 0) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.0, 6), fire); f.position.set(x, h + 4.6 + (i % 3), z); W.scene.add(f); }
      }
    }
  }
  W.refreshObelisks = function () { for (const o of W.obelisks) { const on = G.S.wps.includes(o.wp.id); o.cm.color.setHex(on ? 0x66e0ff : 0x8899aa); o.cm.emissive.setHex(on ? 0x22aaff : 0x000000); o.cm.emissiveIntensity = on ? 1.4 : 0; } };

  W.init = function (scene) {
    W.scene = scene;
    buildGeos();
    terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    decoMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    grassMat.onBeforeCompile = sh => {
      sh.uniforms.uTime = waterU.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float sw = position.y * position.y;\n vec4 ip = instanceMatrix * vec4(0.0,0.0,0.0,1.0);\n transformed.x += sin(uTime * 2.0 + ip.x * 0.3 + ip.z * 0.2) * 0.12 * sw;\n transformed.z += cos(uTime * 1.6 + ip.z * 0.3) * 0.08 * sw;');
    };
    hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4a32, 0.55); scene.add(hemi);
    amb = new THREE.AmbientLight(0xffffff, 0.06); scene.add(amb);
    const sun = W.sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
    sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 500;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.35;
    scene.add(sun); scene.add(sun.target);
    scene.fog = new THREE.Fog(0xc4d8e8, 160, 2200);
    buildSky(); buildWater(); buildWeather(); buildFar(); buildVillage(); buildObelisks();
  };

  const C_DAY_T = new THREE.Color(0x3a78d0), C_DAY_H = new THREE.Color(0xbcd8ef), C_SET_T = new THREE.Color(0x2c3f7a), C_SET_H = new THREE.Color(0xf09a5a), C_NIG_T = new THREE.Color(0x020510), C_NIG_H = new THREE.Color(0x0d1628);
  const tA = new THREE.Color(), tB = new THREE.Color(), sunDir = new THREE.Vector3(), tmp = new THREE.Color();
  let wTimer = 0, rainAmt = 0;
  W.isNight = () => sunDir.y < -0.05;
  W.tick = function (dt, cam, ppos, biome) {
    const S = G.S; S.time = (S.time + dt / 60) % 24;
    const a = (S.time - 6) / 24 * Math.PI * 2;
    sunDir.set(Math.cos(a), Math.sin(a), 0.35).normalize();
    const y = sunDir.y;
    if (y > 0.25) { tA.copy(C_DAY_T); tB.copy(C_DAY_H); }
    else if (y > 0) { const k = y / 0.25; tA.copy(C_SET_T).lerp(C_DAY_T, k); tB.copy(C_SET_H).lerp(C_DAY_H, k); }
    else if (y > -0.2) { const k = (y + 0.2) / 0.2; tA.copy(C_NIG_T).lerp(C_SET_T, k); tB.copy(C_NIG_H).lerp(C_SET_H, k); }
    else { tA.copy(C_NIG_T); tB.copy(C_NIG_H); }
    W.fogTint.lerp(tmp.setHex(G.BIOMES[biome].fog), Math.min(1, dt * 0.5));
    const dayK = G.clamp(y * 4 + 0.3, 0, 1);
    tB.lerp(tmp.copy(W.fogTint).multiplyScalar(0.25 + dayK * 0.75), 0.35);
    if (rainAmt > 0) { tA.lerp(tmp.setHex(0x6a7480).multiplyScalar(0.3 + dayK * 0.7), rainAmt * 0.6); tB.lerp(tmp.setHex(0x8a949e).multiplyScalar(0.3 + dayK * 0.7), rainAmt * 0.6); }
    skyMat.uniforms.top.value.copy(tA); skyMat.uniforms.hor.value.copy(tB); skyMat.uniforms.sunDir.value.copy(sunDir);
    const night = G.clamp(-y * 5, 0, 1); skyMat.uniforms.night.value = night;
    W.scene.fog.color.copy(tB);
    const fogFar = (W.quality === 'low' ? 900 : W.quality === 'mid' ? 1500 : 2200);
    const fogMul = (biome === 'swamp' ? 0.25 : biome === 'volcano' ? 0.45 : biome === 'desert' ? 0.7 : 1) * (1 - rainAmt * 0.55);
    W.scene.fog.far += (fogFar * fogMul - W.scene.fog.far) * Math.min(1, dt); W.scene.fog.near = Math.min(160, W.scene.fog.far * 0.15);
    const sun = W.sun, up = y > -0.08;
    const ld = up ? sunDir : tmp && new THREE.Vector3(-sunDir.x, -sunDir.y, -sunDir.z);
    sun.position.set(ppos.x + ld.x * 200, ppos.y + ld.y * 200, ppos.z + ld.z * 200); sun.target.position.copy(ppos);
    sun.intensity = up ? G.clamp(y * 6, 0, 1) * 1.7 * (1 - rainAmt * 0.6) : G.clamp(-y * 3, 0, 1) * 0.22;
    sun.color.setHex(up ? (y < 0.2 ? 0xffb070 : 0xfff1dc) : 0x9fb4ff);
    hemi.intensity = 0.12 + dayK * 0.5; hemi.color.copy(tA).lerp(tmp.setRGB(1, 1, 1), 0.4);
    amb.intensity = 0.05 + night * 0.06;
    stars.material.opacity = night * (1 - rainAmt);
    sky.position.copy(cam.position); stars.position.copy(cam.position);
    for (const c of clouds) { c.position.x += dt * 4; if (c.position.x - ppos.x > 1600) c.position.x -= 3200; if (c.position.x - ppos.x < -1600) c.position.x += 3200; if (c.position.z - ppos.z > 1600) c.position.z -= 3200; if (c.position.z - ppos.z < -1600) c.position.z += 3200; c.material.opacity = 0.25 + dayK * 0.6; }
    if (W.windowMat) W.windowMat.emissiveIntensity = night * 1.6;
    waterU.uTime.value += dt;
    water.position.set(Math.round(ppos.x / 30) * 30, 0, Math.round(ppos.z / 30) * 30);
    wTimer -= dt;
    if (wTimer <= 0) { wTimer = 60 + Math.random() * 120; const r = Math.random(); W.weatherRoll = r; }
    const roll = W.weatherRoll || 0.9;
    W.weather = biome === 'snow' ? (roll < 0.75 ? 'snow' : 'clear') : biome === 'desert' || biome === 'volcano' ? 'clear' : (roll < (biome === 'swamp' ? 0.45 : 0.22) ? 'rain' : 'clear');
    rainAmt += ((W.weather === 'rain' ? 1 : 0) - rainAmt) * Math.min(1, dt * 0.3);
    rain.visible = rainAmt > 0.05; snow.visible = W.weather === 'snow';
    if (rain.visible) {
      rain.position.set(cam.position.x, cam.position.y - 15, cam.position.z); rain.material.opacity = 0.45 * rainAmt;
      const p = rain.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 6) { p[i + 1] -= dt * 38; p[i + 4] -= dt * 38; if (p[i + 4] < 0) { p[i + 1] += 40; p[i + 4] += 40; } }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    if (snow.visible) {
      snow.position.set(cam.position.x, cam.position.y - 15, cam.position.z);
      const p = snow.geometry.attributes.position.array, t = waterU.uTime.value;
      for (let i = 0; i < p.length; i += 3) { p[i + 1] -= dt * 2.2; p[i] += Math.sin(t + i) * dt * 0.5; if (p[i + 1] < 0) p[i + 1] += 40; }
      snow.geometry.attributes.position.needsUpdate = true;
    }
  };
})();

(function () {
  const GR = G.GRADES = [
    { n: '일반', c: '#cfd3d8', hex: 0xcfd3d8, m: 1 },
    { n: '고급', c: '#62d26f', hex: 0x62d26f, m: 1.35 },
    { n: '희귀', c: '#4fa8ff', hex: 0x4fa8ff, m: 1.8 },
    { n: '영웅', c: '#b36bff', hex: 0xb36bff, m: 2.4 },
    { n: '전설', c: '#ffb03a', hex: 0xffb03a, m: 3.2 },
    { n: '신화', c: '#ff4f5e', hex: 0xff4f5e, m: 4.3 },
    { n: '유일', c: '#3fffe0', hex: 0x3fffe0, m: 5.8 }
  ];
  const WT = G.WTYPES = {
    fist: { n: '주먹', icon: '✊', atk: 0, spd: 0.36, range: 2.4, cone: 90 },
    sword: { n: '검', icon: '🗡', atk: 1.0, spd: 0.5, range: 3.0, cone: 120 },
    great: { n: '대검', icon: '⚔', atk: 1.45, spd: 0.78, range: 3.6, cone: 150 },
    dagger: { n: '단검', icon: '🔪', atk: 0.72, spd: 0.3, range: 2.5, cone: 100 },
    spear: { n: '창', icon: '🔱', atk: 1.1, spd: 0.58, range: 4.4, cone: 50 },
    mace: { n: '둔기', icon: '🔨', atk: 1.25, spd: 0.68, range: 3.0, cone: 110, stun: 0.3 }
  };
  const WBASE = { sword: '롱소드', great: '그레이트소드', dagger: '대거', spear: '스피어', mace: '메이스' };
  const UNIQUE = { sword: '성검 엘리시온', great: '라그나로크', dagger: '나이트폴', spear: '궁니르', mace: '묠니르' };
  const ADJ = ['낡은', '단련된', '정교한', '영웅의', '전설의', '신화의', '유일한'];
  const ABASE = ['가죽 갑옷', '가죽 갑옷', '사슬 갑옷', '판금 갑옷', '판금 갑옷', '용린 갑옷', '성갑'];
  G.JOBS = {
    knight: { n: ['기사', '성기사', '천공기사'], c: '#6fa8ff', hp: 0.15, def: 0.2, atk: 0.04, crit: 0, spd: 0, desc: '판금 갑옷과 망토. 체력·방어 특화' },
    berserker: { n: ['버서커', '워로드', '파괴신'], c: '#ff6a4a', hp: 0.06, def: 0, atk: 0.15, crit: 0.02, spd: 0.02, desc: '털가죽과 뿔 투구. 공격력 특화' },
    assassin: { n: ['어쌔신', '섀도우', '나이트메어'], c: '#b98aff', hp: 0, def: 0, atk: 0.08, crit: 0.05, spd: 0.05, desc: '두건과 가면. 치명타·이동속도 특화' }
  };
  G.JOB_LV = [0, 30, 80, 150];
  G.jobName = S => S.job && S.tier > 0 ? G.JOBS[S.job].n[S.tier - 1] : '견습생';
  const I = G.items = { MAX: 60 };
  I.uid = () => { G.S.nid = (G.S.nid || 0) + 1; return G.S.nid; };
  I.weapon = (t, g, lv) => ({ id: I.uid(), k: 'w', t, g, lv: Math.max(1, lv | 0), plus: 0, name: g === 6 ? UNIQUE[t] : ADJ[g] + ' ' + WBASE[t] });
  I.armor = (g, lv) => { lv = Math.max(1, lv | 0); const m = GR[g].m, d = 100 + g * 50; return { id: I.uid(), k: 'a', g, lv, def: Math.round((3 + lv * 1.6) * m), hp: Math.round((12 + lv * 6) * m), dur: d, mdur: d, name: g === 6 ? '불멸의 성갑' : ADJ[g] + ' ' + ABASE[g] }; };
  I.book = sk => ({ id: I.uid(), k: 'b', sk, g: G.SKILLS[sk].tier - 1, lv: 1, name: G.SKILLS[sk].name + ' 스킬북' });
  I.watk = w => (8 + w.lv * 3.2) * WT[w.t].atk * GR[w.g].m * (1 + (w.plus || 0) * 0.12);
  I.find = id => G.S.inv.find(x => x.id === id) || null;
  G.eqItem = k => { const id = G.S.eq && G.S.eq[k]; return id ? I.find(id) : null; };
  const clampHp = () => { const st = G.stats(); G.S.hp = Math.min(G.S.hp, st.maxHp); G.S.mp = Math.min(G.S.mp, st.maxMp); };
  I.add = function (it) {
    const S = G.S; if (S.inv.length >= I.MAX) { G.ui.toast('가방이 가득 차서 ' + it.name + '을(를) 줍지 못했습니다'); return false; }
    S.inv.push(it); G.ui.log('<span style="color:' + GR[it.g].c + '">+ [' + GR[it.g].n + '] ' + it.name + '</span>');
    if (it.g >= 4) G.ui.toast('[' + GR[it.g].n + '] ' + it.name + ' 획득!', 'gold');
    if (G.ui.open === 'bag') G.ui.render(); return true;
  };
  I.remove = id => { const S = G.S; S.inv = S.inv.filter(x => x.id !== id); if (S.eq.w === id) S.eq.w = null; if (S.eq.a === id) S.eq.a = null; };
  I.equip = function (id) {
    const S = G.S, it = I.find(id); if (!it) return;
    if (it.k === 'b') return I.learn(it);
    const slot = it.k === 'w' ? 'w' : 'a';
    if (S.eq[slot] !== id && S.level < it.lv) { G.ui.toast('Lv.' + it.lv + '부터 장착할 수 있습니다'); return; }
    S.eq[slot] = S.eq[slot] === id ? null : id;
    if (G.player.rebuild) G.player.rebuild(); clampHp(); G.save();
  };
  I.learn = function (it) {
    const S = G.S; if (S.skills.includes(it.sk)) { G.ui.toast('이미 배운 스킬입니다'); return; }
    S.skills.push(it.sk); I.remove(it.id); const e = S.slots.indexOf(null); if (e >= 0) S.slots[e] = it.sk;
    G.ui.toast('스킬 습득: ' + G.SKILLS[it.sk].name, 'gold'); G.save();
  };
  I.discard = function (id) { I.remove(id); if (G.player.rebuild) G.player.rebuild(); clampHp(); G.save(); };
  const NW = [700, 220, 65, 13, 2, 0, 0], BW = [0, 250, 350, 240, 100, 50, 10];
  I.rollGrade = boss => { const w = boss ? BW : NW; let t = 0; for (const x of w) t += x; let r = Math.random() * t; for (let i = 0; i < 7; i++) { r -= w[i]; if (r < 0) return i; } return 0; };
  const WK = ['sword', 'great', 'dagger', 'spear', 'mace'];
  const gear = (lv, boss) => { const g = I.rollGrade(boss); return Math.random() < 0.6 ? I.weapon(WK[Math.floor(Math.random() * WK.length)], g, lv) : I.armor(g, lv); };
  I.rollDrop = function (m) {
    const out = [], lv = m.level;
    if (m.boss) { out.push(gear(lv, true)); if (Math.random() < 0.5) out.push(gear(lv, true)); }
    else if (!m.d.passive && Math.random() < 0.06) out.push(gear(lv, false));
    const pool = G.skillPool(m);
    if (pool.length && (m.boss || Math.random() < 0.03)) out.push(I.book(G.pickSkill(pool)));
    return out;
  };
  G.stats = function () {
    const S = G.S, L = S.level, w = G.eqItem('w'), a = G.eqItem('a'), J = G.JOBS[S.job], t = S.tier || 0;
    let atk = 10 + L * 2.2, def = L * 0.8, hp = 100 + L * 24, mp = 50 + L * 6, crit = 0.1, spd = 1;
    if (w) atk += I.watk(w);
    if (a && a.dur > 0) { def += a.def; hp += a.hp; }
    if (J && t > 0) { atk *= 1 + J.atk * t; def *= 1 + J.def * t; hp *= 1 + J.hp * t; crit += J.crit * t; spd += J.spd * t; }
    return { maxHp: Math.round(hp), maxMp: Math.round(mp), atk, def, crit, spd };
  };
})();

(function () {
  const SK = G.SKILLS = {};
  const MUL = [0, 1.7, 2.3, 3.1, 4.1, 5.6];
  const def = (id, name, tier, type, o) => { SK[id] = Object.assign({ id, name, tier, type, cd: 3 + tier * 2, mp: 6 + tier * 7, mult: MUL[tier], r: 4.5, col: 0xe8f4ff, icon: '✦' }, o || {}); };
  def('s_bounce', '젤리 바운스', 1, 'smash', { r: 3.6, cone: 140, stun: 0.6, icon: '●', col: 0x7cf08a });
  def('s_burst', '분열 폭발', 2, 'nova', { r: 5, icon: '✺', col: 0x7cf08a });
  def('r_horn', '뿔 찌르기', 1, 'charge', { dist: 7, icon: '➶', col: 0xfff2d0 });
  def('r_hop', '토끼 도약', 2, 'leap', { dist: 10, r: 3.5, icon: '⤴', col: 0xfff2d0 });
  def('b_rush', '멧돼지 돌격', 1, 'charge', { dist: 11, stun: 0.5, icon: '➤', col: 0xd9a070 });
  def('b_tusk', '어금니 올려치기', 2, 'smash', { r: 4, cone: 90, stun: 1.2, icon: '⌃', col: 0xf2e6c8 });
  def('d_kick', '뒷발차기', 1, 'smash', { r: 3.4, cone: 100, stun: 0.4, icon: '⚡', col: 0xd8b080 });
  def('d_swift', '질풍 걸음', 2, 'buff', { atkUp: 0.2, dur: 8, icon: '≋', col: 0xa8ffcc });
  def('sh_wool', '양털 치유', 1, 'heal', { pct: 0.22, icon: '♥', col: 0xffffff });
  def('h_stamp', '말발굽 짓밟기', 2, 'nova', { r: 4.6, stun: 0.8, icon: '◎', col: 0xd0a070 });
  def('h_gallop', '질주 돌파', 2, 'charge', { dist: 16, icon: '»', col: 0xffe0a0 });
  def('w_bite', '물어뜯기', 1, 'multi', { n: 3, r: 3, cone: 100, icon: '⋀', col: 0xff9a9a });
  def('w_howl', '늑대의 울부짖음', 3, 'buff', { atkUp: 0.35, dur: 10, icon: '♪', col: 0xffc0a0 });
  def('g_stab', '연속 찌르기', 1, 'multi', { n: 4, r: 3.2, cone: 70, icon: '⋙', col: 0xc8f08a });
  def('g_bomb', '고블린 폭탄', 2, 'bolt', { len: 16, boom: 4, icon: '💣', col: 0xffa040 });
  def('be_swipe', '곰발 휩쓸기', 2, 'spin', { r: 4.4, icon: '⟳', col: 0xc89a6a });
  def('be_roar', '대지의 포효', 3, 'nova', { r: 6.5, stun: 1.5, icon: '◉', col: 0xffd08a });
  def('sc_sting', '독침', 2, 'bolt', { len: 18, dot: 1, icon: '➹', col: 0x9aff4a });
  def('sc_tail', '꼬리 회전', 3, 'spin', { r: 5.2, stun: 0.6, icon: '⟲', col: 0xd8a050 });
  def('go_fist', '바위 주먹', 2, 'smash', { r: 4.2, cone: 80, stun: 1, icon: '✊', col: 0xd8c08a });
  def('go_quake', '모래 지진', 4, 'nova', { r: 8, stun: 1.6, delay: 0.5, icon: '≈', col: 0xe8c878 });
  def('c_spit', '침 뱉기', 1, 'bolt', { len: 14, icon: '∘', col: 0xe8f0ff });
  def('ww_frost', '서리 송곳니', 2, 'multi', { n: 3, r: 3.2, cone: 110, stun: 0.3, icon: '❄', col: 0xa8e8ff });
  def('ww_pack', '무리 사냥', 3, 'charge', { dist: 14, stun: 0.8, icon: '➤', col: 0xd8f4ff });
  def('rd_horn', '뿔 돌진', 2, 'charge', { dist: 12, stun: 0.6, icon: '➶', col: 0xc8a070 });
  def('y_ice', '얼음 강타', 3, 'smash', { r: 5, cone: 120, stun: 1.4, icon: '✶', col: 0x9ae0ff });
  def('y_blizzard', '눈보라', 4, 'dot', { r: 6.5, ticks: 8, icon: '❆', col: 0xcff2ff });
  def('fe_ball', '화염구', 3, 'bolt', { len: 22, boom: 4.5, icon: '☄', col: 0xff7a2a });
  def('fe_inferno', '인페르노', 5, 'nova', { r: 9, delay: 0.55, icon: '🔥', col: 0xff5a1a });
  def('lg_magma', '마그마 분출', 4, 'dot', { r: 5.5, ticks: 6, front: 4, icon: '♨', col: 0xff4a10 });
  def('lg_slam', '용암 내려치기', 3, 'smash', { r: 4.6, cone: 100, stun: 1, icon: '▼', col: 0xff6a20 });
  def('sa_breath', '화염 숨결', 2, 'multi', { n: 5, r: 4.4, cone: 60, icon: '≫', col: 0xff8a30 });
  def('sa_tail', '꼬리 채찍', 2, 'spin', { r: 3.8, icon: '∿', col: 0xff6a4a });
  def('fr_tongue', '혀 채찍', 1, 'bolt', { len: 10, pierce: 1, icon: '〰', col: 0xff8ab0 });
  def('fr_pool', '독 웅덩이', 2, 'dot', { r: 4.5, ticks: 6, front: 3, icon: '☣', col: 0x8aff4a });
  def('tr_club', '몽둥이 난타', 3, 'multi', { n: 4, r: 3.8, cone: 120, stun: 0.3, icon: '‼', col: 0xc8a070 });
  def('tr_regen', '트롤의 재생', 4, 'heal', { pct: 0.5, icon: '✚', col: 0x8aff8a });
  def('x_kslime', '왕의 압착', 5, 'leap', { dist: 14, r: 8, stun: 1.5, icon: '♛', col: 0x7cf08a });
  def('x_bear', '고대의 분노', 5, 'buff', { atkUp: 0.8, dur: 12, icon: '♞', col: 0xffb060 });
  def('x_troll', '늪의 해일', 5, 'dot', { r: 9, ticks: 10, icon: '🌊', col: 0x6aaf6a });
  def('x_scorp', '사막의 심판', 5, 'bolt', { len: 30, pierce: 1, size: 0.8, boom: 5, icon: '⚚', col: 0xffd060 });
  def('x_yeti', '영원한 겨울', 5, 'nova', { r: 10, stun: 2.5, delay: 0.6, icon: '❄', col: 0xbfefff });
  def('x_ifrit', '화염 군주의 강림', 5, 'dot', { r: 10, ticks: 10, front: 0, icon: '☀', col: 0xff4a10, burst: 1 });
  G.MOB_SKILLS = {
    slime: ['s_bounce', 's_burst'], rabbit: ['r_horn', 'r_hop'], boar: ['b_rush', 'b_tusk'], deer: ['d_kick', 'd_swift'], sheep: ['sh_wool'],
    horse: ['h_stamp', 'h_gallop'], wolf: ['w_bite', 'w_howl'], goblin: ['g_stab', 'g_bomb'], bear: ['be_swipe', 'be_roar'],
    scorpion: ['sc_sting', 'sc_tail'], golem: ['go_fist', 'go_quake'], camel: ['c_spit'], whitewolf: ['ww_frost', 'ww_pack'],
    yeti: ['y_ice', 'y_blizzard'], reindeer: ['rd_horn'], fireelem: ['fe_ball', 'fe_inferno'], lavagolem: ['lg_slam', 'lg_magma'],
    salamander: ['sa_breath', 'sa_tail'], frog: ['fr_tongue', 'fr_pool'], troll: ['tr_club', 'tr_regen']
  };
  G.BOSS_SKILL = { '킹 슬라임': 'x_kslime', '숲의 군주 고대곰': 'x_bear', '늪의 지배자 트롤킹': 'x_troll', '사막의 폭군 전갈왕': 'x_scorp', '서리 거인 예티': 'x_yeti', '화염의 군주 이프리트': 'x_ifrit' };
  G.skillPool = m => { const a = (G.MOB_SKILLS[m.key] || []).slice(); if (m.boss && G.BOSS_SKILL[m.name]) a.push(G.BOSS_SKILL[m.name]); return a; };
  const W = [0, 10, 5, 2.5, 1, 0.35];
  G.pickSkill = pool => { let t = 0; for (const id of pool) t += W[SK[id].tier]; let r = Math.random() * t; for (const id of pool) { r -= W[SK[id].tier]; if (r < 0) return id; } return pool[0]; };
  G.SKILL_PRICE = t => [0, 800, 4000, 20000, 100000, 500000][t];
  const TD = { smash: '전방 부채꼴 강타', spin: '주변 회전 공격', charge: '앞으로 돌진하며 공격', leap: '도약 후 내려찍기', nova: '주변 범위 폭발', bolt: '투사체 발사', multi: '빠른 연속 공격', dot: '지속 피해 장판', buff: '공격력 증가', heal: '체력 회복' };
  G.skillDesc = s => TD[s.type] + (s.type === 'buff' ? ' +' + Math.round(s.atkUp * 100) + '% (' + s.dur + '초)' : s.type === 'heal' ? ' 최대 HP의 ' + Math.round(s.pct * 100) + '%' : ' · 공격력의 ' + Math.round(s.mult * 100) + '%') + (s.stun ? ' · 기절' : '') + ' · 쿨 ' + s.cd + '초 · MP ' + s.mp;
})();

(function () {
  const SK = G.SKILLS, MUL = [0, 1.7, 2.3, 3.1, 4.1, 5.6];
  const def = (id, name, tier, type, o) => { SK[id] = Object.assign({ id, name, tier, type, cd: 3 + tier * 2, mp: 6 + tier * 7, mult: MUL[tier], r: 4.5, col: 0xe8f4ff, icon: '✦', teach: 1 }, o || {}); };
  def('t_plains', '질풍참', 2, 'smash', { r: 5.2, cone: 170, mult: 2.6, icon: '〆', col: 0xbfffd0 });
  def('t_forest', '숲의 가호', 3, 'buff', { atkUp: 0.45, dur: 15, icon: '❦', col: 0x8aff9a });
  def('t_swamp', '역병의 늪', 3, 'dot', { r: 7, ticks: 10, front: 3, icon: '☠', col: 0x9aff4a });
  def('t_desert', '천공 돌파', 4, 'charge', { dist: 18, stun: 1, icon: '⇶', col: 0xffe08a });
  def('t_snow', '빙결 지옥', 4, 'nova', { r: 10, stun: 2.2, delay: 0.4, icon: '❅', col: 0xbfefff });
  def('t_volcano', '멸천 화염참', 5, 'smash', { r: 7, cone: 150, stun: 1.5, mult: 6.4, icon: '♆', col: 0xff5a1a });
  G.TEACH = {
    plains: { name: '검술 사범 레온', sk: 't_plains', lv: 10, cost: 5000, kill: { boar: 20, horse: 10 }, col: 0x62d26f, say: '바람처럼 베는 법을 알려 주지. 먼저 초원의 짐승들로 실력을 보여라.' },
    forest: { name: '숲의 현자 엘린', sk: 't_forest', lv: 30, cost: 40000, kill: { wolf: 30, goblin: 30, 'B:bear': 1 }, col: 0x2f8a4a, say: '숲은 강한 자에게만 가호를 내린다. 숲의 군주를 쓰러뜨리고 오너라.' },
    swamp: { name: '늪의 주술사 모르가', sk: 't_swamp', lv: 45, cost: 90000, kill: { frog: 40, troll: 20 }, col: 0x6a8a3a, say: '늪의 독을 견딘 자만이 역병을 다룰 수 있지.' },
    desert: { name: '사막의 검성 하산', sk: 't_desert', lv: 70, cost: 250000, kill: { scorpion: 50, golem: 25, 'B:scorpion': 1 }, col: 0xd8a050, say: '하늘을 가르는 돌파, 모래 위에서 증명해라.' },
    snow: { name: '설원의 마도사 일리야', sk: 't_snow', lv: 100, cost: 500000, kill: { whitewolf: 50, yeti: 30, 'B:yeti': 1 }, col: 0x9ad8ff, say: '얼음의 끝을 보고 싶다면 서리 거인을 쓰러뜨리고 오너라.' },
    volcano: { name: '화염의 검신 이그니스', sk: 't_volcano', lv: 140, cost: 1500000, kill: { fireelem: 60, lavagolem: 40, 'B:fireelem': 1 }, col: 0xff5a1a, say: '불꽃 군주를 꺾은 자에게만 이 검을 전한다.' }
  };
  G.BIOME_MOBKEYS = { plains: ['slime', 'rabbit', 'boar', 'deer', 'sheep', 'horse'], forest: ['wolf', 'goblin', 'bear', 'deer', 'boar'], desert: ['scorpion', 'golem', 'camel'], snow: ['whitewolf', 'yeti', 'reindeer'], volcano: ['fireelem', 'lavagolem', 'salamander'], swamp: ['frog', 'troll', 'slime'] };
  const TN = {
    plains: ['바람결', '들꽃', '황금들', '언덕', '푸른샘', '밀밭', '햇살', '종달새', '초록벌', '풍차', '은빛강', '목동', '민들레', '시냇물', '양떼', '보리', '노을', '나비', '방앗간', '꽃길'],
    forest: ['이끼', '참나무', '솔향', '사슴뿔', '그늘', '옹달샘', '부엉이', '나무꾼', '고사리', '숲안개', '도토리', '덩굴', '다람쥐', '버섯', '송진', '산딸기', '이슬', '고목나무', '여우굴', '단풍'],
    desert: ['모래바람', '오아시스', '신기루', '붉은바위', '낙타', '태양', '사구', '황토', '전갈꼬리', '유리모래', '대상', '석양', '모래성', '야자', '사막여우', '열풍', '선인장', '금모래', '별사막', '바위틈'],
    snow: ['서리', '눈꽃', '얼음호수', '백곰', '북풍', '설산', '빙하', '흰늑대', '고드름', '오로라', '썰매', '눈보라', '설화', '얼음꽃', '서릿발', '빙벽', '눈사슴', '북극성', '하얀숲', '겨울샘'],
    volcano: ['용암', '잿빛', '불꽃', '흑요석', '화산재', '붉은강', '모루', '유황', '열기', '숯불', '쇳물', '화구', '검은재', '불씨', '화염석', '용광로', '붉은달', '분화', '마그마', '연기'],
    swamp: ['안개', '버들', '개구리', '이끼늪', '갈대', '흐린물', '두꺼비', '고목', '반딧불', '물안개', '수렁', '부들', '늪거북', '이끼다리', '물버들', '연꽃', '진흙', '안개숲', '개펄', '습지']
  };
  G.townName = (b, n) => { const l = TN[b] || []; return (l[n - 1] ? l[n - 1] + ' 마을' : G.BIOMES[b].name + ' 제' + n + '마을'); };
  G.TUT = [
    { t: '첫 사냥', d: '마을 밖 초원에서 슬라임 5마리를 처치하세요.', kill: { slime: 5 }, gold: 300, xp: 0.6 },
    { t: '무기 장만', d: '상인에게 무기를 사거나, 주운 무기를 가방(I)에서 장착하세요.', cond: S => !!G.eqItem('w'), condT: '무기 장착', gold: 500, xp: 0.5 },
    { t: '성장의 첫걸음', d: 'Lv.5를 달성하세요.', cond: S => S.level >= 5, condT: 'Lv.5 달성', gold: 1000, xp: 0.3 },
    { t: '멧돼지 사냥', d: '초원의 멧돼지 8마리를 처치하세요.', kill: { boar: 8 }, gold: 1500, xp: 0.5, item: () => G.items.armor(1, 5), itemT: '[고급] 갑옷' },
    { t: '스킬 익히기', d: '스킬북을 배워 스킬 칸에 장착하세요. 스킬북은 몬스터가 떨어뜨리거나 상인이 팝니다.', cond: S => S.slots.some(Boolean), condT: '스킬 1개 장착', gold: 2000, xp: 0.4 },
    { t: '마을 여행', d: '다른 마을 2곳을 찾아가 워프석을 활성화하세요.', cond: S => S.wps.length >= 3, condT: '마을 2곳 발견', gold: 3000, xp: 0.4 },
    { t: '모험가 시험', d: 'Lv.15를 달성하고 초원의 필드 보스 킹 슬라임을 처치하세요.', cond: S => S.level >= 15, condT: 'Lv.15 달성', kill: { 'B:slime': 1 }, gold: 10000, xp: 0.5, item: () => G.items.weapon('sword', 2, 15), itemT: '[희귀] 롱소드' }
  ];
})();

(function () {
  const M = G.mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {}));
  function cap(r, l, m) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), m); }
  G.makeHumanoid = function (o) {
    o = Object.assign({ skin: 0xf1c7a5, shirt: 0x34548f, pants: 0x3a3a48, hair: 0x2a1c12, boots: 0x3a2a1c, weapon: 'sword', cape: null, boxy: false, eyes: 0x1a1a1a }, o || {});
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const mS = M(o.skin), mC = M(o.shirt), mP = M(o.pants), mB = M(o.boots, { roughness: 0.6 });
    const hips = new THREE.Group(); hips.position.y = 0.95; body.add(hips);
    const torso = o.boxy ? new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.8, 0.46), mC) : cap(0.25, 0.4, mC);
    torso.position.y = 0.42; hips.add(torso);
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.09, 12), M(0x3b2614)); belt.position.y = 0.08; hips.add(belt);
    const head = new THREE.Group(); head.position.y = 1.0; hips.add(head);
    const hm = o.boxy ? new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4), mS) : new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mS); head.add(hm);
    if (o.hair !== null) { const hr = new THREE.Mesh(new THREE.SphereGeometry(0.216, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M(o.hair, { roughness: 0.9 })); hr.rotation.x = -0.25; hr.position.z = -0.01; head.add(hr); }
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), M(o.eyes, { roughness: 0.3, emissive: o.eyes === 0x1a1a1a ? 0 : o.eyes, emissiveIntensity: 0.8 })); e.position.set(sx * 0.075, 0.02, o.boxy ? 0.2 : 0.18); head.add(e); }
    function arm(sx) {
      const sh = new THREE.Group(); sh.position.set(sx * 0.34, 0.72, 0); hips.add(sh);
      const up = cap(0.075, 0.26, mC); up.position.y = -0.18; sh.add(up);
      const fore = new THREE.Group(); fore.position.y = -0.38; sh.add(fore);
      const lo = cap(0.065, 0.24, mS); lo.position.y = -0.16; fore.add(lo);
      const hand = new THREE.Group(); hand.position.y = -0.34; fore.add(hand);
      const hm2 = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mS); hand.add(hm2);
      return { sh, fore, hand };
    }
    function leg(sx) {
      const hp = new THREE.Group(); hp.position.set(sx * 0.13, 0, 0); hips.add(hp);
      const th = cap(0.1, 0.3, mP); th.position.y = -0.22; hp.add(th);
      const shin = new THREE.Group(); shin.position.y = -0.46; hp.add(shin);
      const sm = cap(0.085, 0.28, mP); sm.position.y = -0.2; shin.add(sm);
      const bt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.28), mB); bt.position.set(0, -0.43, 0.05); shin.add(bt);
      return { hp, shin };
    }
    const aL = arm(-1), aR = arm(1), lL = leg(-1), lR = leg(1);
    let weapon = new THREE.Group(); aR.hand.add(weapon); weapon.rotation.x = Math.PI / 2;
    if (o.weapon === 'sword') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.12), M(0xd8dde4, { metalness: 0.9, roughness: 0.25 })); blade.position.y = 0.66; weapon.add(blade);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 4), blade.material); tip.position.y = 1.26; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.4; weapon.add(tip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.38), M(0xb08d3a, { metalness: 0.7, roughness: 0.35 })); guard.position.y = 0.14; weapon.add(guard);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 6), M(0x3b2614)); grip.position.y = 0.0; weapon.add(grip);
    } else if (o.weapon === 'club') {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.9, 7), M(0x5a3d22)); c.position.y = 0.4; weapon.add(c);
    }
    if (o.cape) { const cp = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.95, 1, 4), M(o.cape, { side: THREE.DoubleSide, roughness: 0.9 })); cp.position.set(0, 0.32, -0.27); cp.rotation.x = 0.1; hips.add(cp); root.userData.cape = cp; }
    root.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
    return { root, body, hips, head, torso, armL: aL.sh, armR: aR.sh, foreL: aL.fore, foreR: aR.fore, legL: lL.hp, legR: lR.hp, shinL: lL.shin, shinR: lR.shin, weapon };
  };
  G.animHumanoid = function (h, phase, amt, atk, dt) {
    const s = Math.sin(phase), c = Math.cos(phase);
    h.legL.rotation.x = s * 0.75 * amt; h.legR.rotation.x = -s * 0.75 * amt;
    h.shinL.rotation.x = Math.max(0, -c) * 0.9 * amt; h.shinR.rotation.x = Math.max(0, c) * 0.9 * amt;
    h.armL.rotation.x = -s * 0.6 * amt; h.foreL.rotation.x = -0.25 - amt * 0.2;
    h.body.position.y = Math.abs(c) * 0.06 * amt;
    h.hips.rotation.y = s * 0.08 * amt;
    if (atk >= 0) {
      const k = atk < 0.35 ? atk / 0.35 : 1, back = atk < 0.35 ? -2.7 * k : -2.7 + (atk - 0.35) / 0.65 * 2.4;
      h.armR.rotation.x = back; h.armR.rotation.z = atk < 0.35 ? -0.2 : -0.4; h.foreR.rotation.x = -0.3;
      h.hips.rotation.y = atk < 0.35 ? 0.35 * k : 0.35 - (atk - 0.35) * 1.4;
    } else { h.armR.rotation.x = s * 0.6 * amt - 0.15; h.armR.rotation.z = 0; h.foreR.rotation.x = -0.4 - amt * 0.2; }
  };

  const P = G.player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), facing: 0, onGround: true, swim: false, phase: 0, atkT: -1, dashT: 0, dashDir: new THREE.Vector3(), alive: true, spinT: -1
  };
  P.init = function (scene) {
    P.scene = scene; P.rebuild();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.5, depthWrite: false }));
    P.ring = ring; scene.add(ring);
    P.pos.set(G.S.x, G.world.groundAt(G.S.x, G.S.z) + 0.1, G.S.z);
  };
  P.rebuild = function () {
    const S = G.S, w = G.eqItem('w'), a = G.eqItem('a');
    const nh = G.buildHero({ look: S.look, job: S.job, tier: S.tier, wt: w ? w.t : 'fist', wg: w ? w.g : 0, plus: w ? w.plus : 0, ag: a ? a.g : -1 });
    if (P.h) { nh.root.position.copy(P.h.root.position); nh.root.rotation.copy(P.h.root.rotation); nh.root.visible = P.h.root.visible; P.scene.remove(P.h.root); }
    P.h = nh; P.scene.add(nh.root);
  };
  P.dashCd = 0; P.dashV = 38; P.blinkT = 0; P.inv = 0; P.mvDir = new THREE.Vector3();
  P.DASH_CD = 0.5; P.BLINK_N = 100000;
  function puff(x, y, z, col) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); m.position.set(x, y + 1, z); P.scene.add(m); G.combat.addFx(m, 0.3, 'puff'); }
  P.dash = function () {
    const S = G.S; if (!P.alive || P.dashCd > 0 || P.blinkT > 0) return;
    const blink = (S.dashN || 0) >= P.BLINK_N;
    P.dashCd = P.DASH_CD; S.dashN = (S.dashN || 0) + 1;
    if (S.dashN === P.BLINK_N) { G.ui.toast('대쉬 마스터리 완료! 이제 대쉬가 블링크로 바뀝니다', 'gold'); G.save(); }
    const d = P.mvDir.lengthSq() > 0.04 ? P.mvDir.clone().normalize() : new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
    P.facing = Math.atan2(d.x, d.z); P.atkT = -1;
    if (blink) {
      puff(P.pos.x, P.pos.y, P.pos.z, 0x9ad8ff);
      let tx = P.pos.x + d.x * 8, tz = P.pos.z + d.z * 8; const dl = Math.hypot(tx, tz), lim = G.WORLD_R - 150; if (dl > lim) { tx *= lim / dl; tz *= lim / dl; }
      P.blinkTo = [tx, tz]; P.blinkT = 0.11; P.inv = 0.11; P.h.root.visible = false; P.vel.set(0, 0, 0);
    } else { P.dashDir.copy(d); P.dashV = 37.5; P.dashT = 0.16; P.isDash = true; }
  };
  P.teleport = function (x, z) { P.pos.set(x, G.terrain.heightAt(x, z) + 2, z); P.vel.set(0, 0, 0); };
  const Cam = G.camCtl = { yaw: Math.PI, pitch: 0.32, dist: 9, target: new THREE.Vector3() };
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), mv = new THREE.Vector3();
  P.update = function (dt, I) {
    if (!P.alive) { P.h.root.rotation.z = Math.min(Math.PI / 2, P.h.root.rotation.z + dt * 3); return; }
    P.h.root.rotation.z = 0;
    fwd.set(-Math.sin(Cam.yaw), 0, -Math.cos(Cam.yaw)); right.set(Math.cos(Cam.yaw), 0, -Math.sin(Cam.yaw));
    mv.set(0, 0, 0).addScaledVector(fwd, I.my).addScaledVector(right, I.mx);
    let ml = mv.length(); if (ml > 1) { mv.divideScalar(ml); ml = 1; }
    const S = G.S, st = G.stats();
    P.mvDir.copy(mv);
    if (P.dashCd > 0) P.dashCd -= dt; if (P.inv > 0) P.inv -= dt;
    if (P.blinkT > 0) {
      P.blinkT -= dt;
      if (P.blinkT <= 0) { P.pos.x = P.blinkTo[0]; P.pos.z = P.blinkTo[1]; P.pos.y = Math.max(G.world.groundAt(P.pos.x, P.pos.z), -1.25); P.h.root.visible = true; puff(P.pos.x, P.pos.y, P.pos.z, 0x9ad8ff); }
      else { P.h.root.position.set(P.pos.x, P.pos.y, P.pos.z); return; }
    }
    let speed = 8.6 * st.spd * (P.swim ? 0.5 : 1) * (P.atkT >= 0 ? 0.45 : 1);
    const tvx = mv.x * speed * ml, tvz = mv.z * speed * ml, acc = P.onGround ? 14 : 4;
    P.vel.x += (tvx - P.vel.x) * Math.min(1, dt * acc); P.vel.z += (tvz - P.vel.z) * Math.min(1, dt * acc);
    if (P.dashT > 0) { P.dashT -= dt; P.vel.x = P.dashDir.x * P.dashV; P.vel.z = P.dashDir.z * P.dashV; if (P.dashT <= 0) { P.isDash = false; if (P.onGround) { P.vel.x *= 0.3; P.vel.z *= 0.3; } } }
    if (I.jump && (P.onGround || P.swim)) { P.vel.y = P.swim ? 5 : 8.5; P.onGround = false; }
    I.jump = false;
    P.vel.y -= 24 * dt;
    P.pos.addScaledVector(P.vel, dt);
    const cols = G.world.nearColliders(P.pos.x, P.pos.z);
    for (const c of cols) { const dx = P.pos.x - c[0], dz = P.pos.z - c[1], d = Math.hypot(dx, dz), r = c[2] + 0.4; if (d < r && d > 0.0001) { if (P.isDash) { P.dashT = 0; P.isDash = false; P.vel.x = P.vel.z = 0; } P.pos.x = c[0] + dx / d * r; P.pos.z = c[1] + dz / d * r; } }
    const d0 = Math.hypot(P.pos.x, P.pos.z), lim = G.WORLD_R - 150; if (d0 > lim) { P.pos.x *= lim / d0; P.pos.z *= lim / d0; }
    const g = G.world.groundAt(P.pos.x, P.pos.z);
    P.swim = g < -1.3 && P.pos.y < -0.9;
    if (P.swim) { if (P.pos.y < -1.25) { P.pos.y = -1.25; P.vel.y = Math.max(0, P.vel.y); } P.onGround = false; }
    if (P.pos.y <= g) { const prevAir = !P.onGround && P.vel.y < -18; P.pos.y = g; P.vel.y = 0; P.onGround = true; if (prevAir) G.combat && G.combat.hurtPlayer(Math.round(st.maxHp * 0.08), '낙하'); }
    else if (P.pos.y > g + 0.25 && !P.swim) P.onGround = false;
    const hv = Math.hypot(P.vel.x, P.vel.z);
    if (hv > 0.4 && P.atkT < 0) { const tf = Math.atan2(P.vel.x, P.vel.z); let df = tf - P.facing; while (df > Math.PI) df -= Math.PI * 2; while (df < -Math.PI) df += Math.PI * 2; P.facing += df * Math.min(1, dt * 12); }
    P.phase += hv * dt * 1.55;
    if (P.atkT >= 0) { P.atkT += dt / P.atkDur; if (P.atkT >= 1) P.atkT = -1; }
    if (P.spinT >= 0) { P.spinT += dt * 2.2; P.h.root.rotation.y = P.facing + P.spinT * Math.PI * 2; if (P.spinT >= 1) P.spinT = -1; }
    else P.h.root.rotation.y = P.facing;
    G.animHumanoid(P.h, P.phase, Math.min(1, hv / 6) * (P.swim ? 0.5 : 1), P.atkT, dt);
    if (P.h.root.userData.tick) P.h.root.userData.tick(performance.now() / 1000);
    if (P.h.root.userData.cape) P.h.root.userData.cape.rotation.x = 0.1 + Math.min(0.9, hv * 0.08) + Math.sin(P.phase * 2) * 0.05;
    P.h.root.position.set(P.pos.x, P.pos.y + (P.swim ? -0.7 : 0), P.pos.z);
    P.ring.position.set(P.pos.x, P.pos.y + 0.05, P.pos.z); P.ring.visible = !P.swim;
  };
  P.faceTo = function (x, z) { P.facing = Math.atan2(x - P.pos.x, z - P.pos.z); };
  Cam.update = function (cam, dt) {
    Cam.target.lerp(new THREE.Vector3(P.pos.x, P.pos.y + 1.7, P.pos.z), Math.min(1, dt * 14));
    const cp = Math.cos(Cam.pitch);
    let x = Cam.target.x + Math.sin(Cam.yaw) * cp * Cam.dist, z = Cam.target.z + Math.cos(Cam.yaw) * cp * Cam.dist, y = Cam.target.y + Math.sin(Cam.pitch) * Cam.dist;
    const g = Math.max(G.world.groundAt(x, z), -0.2) + 0.6; if (y < g) y = g;
    cam.position.set(x, y, z); cam.lookAt(Cam.target);
  };
})();

(function () {
  const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.8 }, o || {}));
  const ADD = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op == null ? 0.6 : op, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const PAL = G.LOOK = {
    hairC: [0x2a1c12, 0x6b4423, 0xd9b26a, 0xeeeef2, 0xb3262f, 0x2f62d0, 0x7a3fbf, 0x16a39a],
    skin: [0xf8dcc4, 0xf1c7a5, 0xd9a47c, 0xa8704a, 0x6e4a32],
    eye: [0x1a1a1a, 0x3b82f6, 0x22c55e, 0xdc2626, 0xf59e0b, 0xa855f7],
    cloth: [0x2f4f8f, 0x8a1e2a, 0x2f6b3a, 0x5b3a8a, 0x3a3a3a, 0xb07a2a],
    hairN: ['짧은 머리', '긴 머리', '포니테일', '삐죽 머리', '올림 머리']
  };
  G.DEF_LOOK = { sex: 0, hair: 0, hc: 0, skin: 1, eye: 0, cloth: 0 };
  const JV = {
    knight: { shirt: [0x3a5a9a, 0xe8e2d0, 0xf4f0ff], cape: [0x24489a, 0xf2f2f2, 0xfff6dc], metal: [0xaab4c0, 0xd8c070, 0xfff1b0], glow: 0xffe9a0, wt: 'sword' },
    berserker: { shirt: [0x5a2418, 0x3a1410, 0x2a0e0a], cape: [null, 0x7a1010, 0x9a1406], metal: [0x6a5a4a, 0x4a4240, 0x2a2220], glow: 0xff5a1a, wt: 'great' },
    assassin: { shirt: [0x2a2438, 0x1c1828, 0x120e1c], cape: [null, 0x2a1840, 0x1a0e2c], metal: [0x4a4458, 0x6a4a9a, 0x9a6aff], glow: 0xb06aff, wt: 'dagger' }
  };
  G.JOB_WT = k => JV[k] ? JV[k].wt : 'fist';
  function mesh(g, m, x, y, z, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (p) p.add(o); return o; }
  function hair(h, L) {
    const hm = M(PAL.hairC[L.hc], { roughness: 0.85 }), hd = h.head;
    const cap = mesh(new THREE.SphereGeometry(0.218, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, 0, 0, -0.01, hd); cap.rotation.x = -0.25;
    if (L.hair === 1) { const b = mesh(new THREE.CapsuleGeometry(0.17, 0.3, 4, 10), hm, 0, -0.2, -0.1, hd); b.scale.z = 0.55; for (const s of [-1, 1]) { const l = mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), hm, s * 0.17, -0.12, 0.02, hd); l.rotation.z = s * 0.1; } }
    else if (L.hair === 2) { mesh(new THREE.SphereGeometry(0.07, 8, 6), M(0x7a1e2a), 0, 0.07, -0.22, hd); const t = mesh(new THREE.CapsuleGeometry(0.065, 0.32, 3, 8), hm, 0, -0.14, -0.29, hd); t.rotation.x = 0.35; }
    else if (L.hair === 3) { for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, c = mesh(new THREE.ConeGeometry(0.07, 0.22, 5), hm, Math.sin(a) * 0.12, 0.17, Math.cos(a) * 0.12 - 0.04, hd); c.rotation.set(Math.cos(a) * 0.7 - 0.3, 0, -Math.sin(a) * 0.7); } }
    else if (L.hair === 4) { mesh(new THREE.SphereGeometry(0.1, 10, 8), hm, 0, 0.2, -0.13, hd); }
  }
  function chest(h, mt, pad, trim, emi) {
    const c = mesh(new THREE.CylinderGeometry(0.28, 0.26, 0.34, 14), mt, 0, 0.55, 0, h.hips);
    if (pad) for (const s of [-1, 1]) { const p = mesh(new THREE.SphereGeometry(pad, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mt, s * 0.35, 0.75, 0, h.hips); p.scale.x = 1.15; }
    if (trim != null) { const t = mesh(new THREE.TorusGeometry(0.275, 0.022, 6, 24), M(trim, { metalness: 0.8, roughness: 0.3, emissive: emi ? trim : 0, emissiveIntensity: emi || 0 }), 0, 0.42, 0, h.hips); t.rotation.x = Math.PI / 2; }
    return c;
  }
  function weapon(h, t, g, plus) {
    const W = h.weapon, gh = G.GRADES[g || 0].hex, ei = [0, 0, 0.05, 0.25, 0.5, 0.8, 1.1][g || 0] + ((plus || 0) >= 7 ? 0.4 : 0);
    const steel = M(0xd8dde4, { metalness: 0.9, roughness: 0.25, emissive: gh, emissiveIntensity: ei }), gold = M(0xb08d3a, { metalness: 0.7, roughness: 0.35 }), wood = M(0x3b2614);
    if (t === 'sword') { mesh(new THREE.BoxGeometry(0.05, 1.0, 0.12), steel, 0, 0.66, 0, W); mesh(new THREE.BoxGeometry(0.1, 0.06, 0.38), gold, 0, 0.14, 0, W); mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 6), wood, 0, 0, 0, W); }
    else if (t === 'great') { mesh(new THREE.BoxGeometry(0.07, 1.55, 0.22), steel, 0, 1.0, 0, W); mesh(new THREE.BoxGeometry(0.12, 0.08, 0.6), gold, 0, 0.2, 0, W); mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 6), wood, 0, -0.02, 0, W); }
    else if (t === 'dagger') { mesh(new THREE.BoxGeometry(0.035, 0.42, 0.08), steel, 0, 0.32, 0, W); mesh(new THREE.BoxGeometry(0.08, 0.04, 0.2), gold, 0, 0.1, 0, W); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), wood, 0, 0, 0, W); }
    else if (t === 'spear') { mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6), wood, 0, 0.55, 0, W); const tp = mesh(new THREE.ConeGeometry(0.08, 0.36, 4), steel, 0, 1.85, 0, W); tp.scale.z = 0.4; }
    else if (t === 'mace') { mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), wood, 0, 0.35, 0, W); mesh(new THREE.IcosahedronGeometry(0.19, 0), steel, 0, 0.9, 0, W); }
    else { for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), M(0x6a4a2a), 0, 0.02, s * 0.03, W); }
  }
  G.buildHero = function (o) {
    const L = Object.assign({}, G.DEF_LOOK, o.look || {}), tier = o.job ? (o.tier || 0) : 0, jv = tier > 0 ? JV[o.job] : null, ti = tier - 1, fem = L.sex === 1;
    let shirt = PAL.cloth[L.cloth], cape = null, pants = 0x34323c;
    if (jv) { shirt = jv.shirt[ti]; cape = jv.cape[ti]; pants = o.job === 'knight' ? 0x2a2e3a : 0x241e1c; }
    const h = G.makeHumanoid({ skin: PAL.skin[L.skin], shirt, pants, hair: null, eyes: PAL.eye[L.eye], weapon: 'none', cape });
    if (fem) { h.torso.scale.set(0.86, 1, 0.88); h.armL.position.x = -0.3; h.armR.position.x = 0.3; h.legL.position.x = -0.12; h.legR.position.x = 0.12; }
    hair(h, L);
    const ticks = [];
    if (!jv && o.ag >= 0) {
      const g = o.ag, gh = G.GRADES[g].hex;
      if (g <= 1) chest(h, M(0x6a4a2a, { roughness: 0.9 }), 0, null);
      else if (g === 2) chest(h, M(0x8a9098, { metalness: 0.6, roughness: 0.5 }), 0.11, null);
      else chest(h, M(0xb8c0c8, { metalness: 0.85, roughness: 0.3 }), 0.13, gh, g >= 4 ? 0.7 : 0.15);
    }
    if (jv) {
      const mt = M(jv.metal[ti], { metalness: 0.85, roughness: 0.3, emissive: tier >= 3 ? jv.glow : 0, emissiveIntensity: tier >= 3 ? 0.25 : 0 }), gl = jv.glow;
      if (o.job === 'knight') {
        chest(h, mt, 0.14, tier >= 2 ? 0xffd36a : 0x8a94a0, tier >= 2 ? 0.4 : 0);
        if (tier >= 2) { const hm = mesh(new THREE.SphereGeometry(0.235, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), mt, 0, 0.01, -0.01, h.head); hm.rotation.x = -0.15; const pl = mesh(new THREE.ConeGeometry(0.06, 0.4, 6), M(tier >= 3 ? 0xffffff : 0xc81e2a), 0, 0.3, -0.08, h.head); pl.rotation.x = -0.6; }
        if (tier >= 3) {
          const halo = mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 28), ADD(gl, 0.9), 0, 0.34, 0, h.head); halo.rotation.x = Math.PI / 2;
          const wings = [];
          for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.6 * s, 0.5, 1.1 * s, 0.9); sh.quadraticCurveTo(0.8 * s, 0.2, 0.9 * s, -0.4); sh.quadraticCurveTo(0.4 * s, -0.1, 0, 0); const w = mesh(new THREE.ShapeGeometry(sh), ADD(gl, 0.55), s * 0.06, 0.65, -0.28, h.hips); wings.push([w, s]); }
          ticks.push(t => { for (const [w, s] of wings) w.rotation.y = s * (0.35 + Math.sin(t * 2.4) * 0.25); halo.rotation.z = t; });
        }
      } else if (o.job === 'berserker') {
        const fur = M(0x6a4a30, { roughness: 1 });
        for (const s of [-1, 1]) { const f = mesh(new THREE.SphereGeometry(0.16, 10, 8), fur, s * 0.36, 0.74, 0, h.hips); f.scale.set(1.2, 0.8, 1.1); }
        const sash = mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 20), M(0xa01818), 0, 0.12, 0, h.hips); sash.rotation.x = Math.PI / 2;
        if (tier >= 2) {
          for (const s of [-1, 1]) { const hn = mesh(new THREE.ConeGeometry(0.05, 0.3, 6), M(0xe8dcc0), s * 0.17, 0.16, 0, h.head); hn.rotation.z = -s * 0.9; for (let k = 0; k < 3; k++) { const sp = mesh(new THREE.ConeGeometry(0.035, 0.16, 5), mt, s * (0.3 + k * 0.05), 0.86, -0.06 + k * 0.06, h.hips); sp.rotation.z = -s * 0.4; } }
          h.head.traverse(m => { if (m.isMesh && m.geometry.type === 'SphereGeometry' && m.geometry.parameters.radius < 0.03) { m.material = M(0xff2a10, { emissive: 0xff2a10, emissiveIntensity: 1.5 }); } });
        }
        if (tier >= 3) { const fl = []; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, c = mesh(new THREE.ConeGeometry(0.12, 0.7, 6), ADD(gl, 0.5), Math.sin(a) * 0.55, 0.35, Math.cos(a) * 0.55, h.root); fl.push([c, k]); } ticks.push(t => { for (const [c, k] of fl) { const s = 0.7 + Math.sin(t * 7 + k * 1.7) * 0.35; c.scale.set(1, s, 1); c.position.y = 0.35 * s; } }); }
      } else {
        const hood = mesh(new THREE.SphereGeometry(0.245, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), M(jv.shirt[ti], { roughness: 0.95 }), 0, 0.01, -0.03, h.head); hood.rotation.x = -0.45;
        const sc = mesh(new THREE.TorusGeometry(0.15, 0.05, 6, 18), M(tier >= 2 ? 0x6a3aaa : 0x5a2a3a), 0, -0.2, 0, h.head); sc.rotation.x = Math.PI / 2;
        chest(h, M(jv.shirt[ti], { roughness: 0.7 }), 0, tier >= 2 ? jv.metal[ti] : null, tier >= 2 ? 0.6 : 0);
        if (tier >= 2) mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06), M(0x0e0c14, { metalness: 0.4, roughness: 0.4 }), 0, -0.07, 0.17, h.head);
        if (tier >= 3) { const bl = []; for (let k = 0; k < 2; k++) { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(0.04, 0.5, 0.09), M(0xd8d0ff, { emissive: gl, emissiveIntensity: 1, metalness: 0.9, roughness: 0.2 }), 0, 0, 0, g); h.root.add(g); bl.push([g, k]); } ticks.push(t => { for (const [g, k] of bl) { const a = t * 2.2 + k * Math.PI; g.position.set(Math.sin(a) * 0.8, 1.3 + Math.sin(t * 3 + k) * 0.1, Math.cos(a) * 0.8); g.rotation.set(0.4, a, 0.3); } }); }
      }
      if (tier >= 3) { const ring = mesh(new THREE.RingGeometry(0.7, 0.95, 40).rotateX(-Math.PI / 2), ADD(gl, 0.45), 0, 0.06, 0, h.root); ticks.push(t => { ring.rotation.y = t * 0.8; ring.material.opacity = 0.3 + Math.sin(t * 3) * 0.15; }); }
    }
    weapon(h, o.wt || 'fist', o.wg || 0, o.plus || 0);
    h.root.traverse(m => { if (m.isMesh && m.material.blending !== THREE.AdditiveBlending) m.castShadow = true; });
    h.root.userData.tick = t => { for (const f of ticks) f(t); };
    return h;
  };
  G.charScreen = function (done) {
    const S = G.S, box = document.getElementById('charsel'), ui = document.getElementById('csUI'), cv = document.getElementById('cspv');
    if (!box) return done();
    const look = Object.assign({}, G.DEF_LOOK, S.look || {});
    let mode = S.made ? 'select' : 'create', name = S.name, pv = { job: S.job || '', tier: S.tier || 0 };
    if (!S.made && S.name === '모험가' && G.account && !G.account.guest && G.account.id) name = G.account.id.slice(0, 12);
    let r; try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); } catch (e) { S.look = look; S.made = true; return done(); }
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    sc.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a2018, 0.9));
    const dl = new THREE.DirectionalLight(0xffffff, 1.7); dl.position.set(3, 6, 5); sc.add(dl);
    const rim = new THREE.DirectionalLight(0x8ab0ff, 1.2); rim.position.set(-4, 3, -5); sc.add(rim);
    mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.2, 48), M(0x1c2638, { metalness: 0.5, roughness: 0.35 }), 0, -0.1, 0, sc);
    const pr = mesh(new THREE.RingGeometry(1.0, 1.12, 64).rotateX(-Math.PI / 2), ADD(0x5ab4ff, 0.8), 0, 0.01, 0, sc);
    let hero = null, rotY = 0.5, drag = null, alive = true, last = performance.now();
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function rebuild() {
      if (hero) sc.remove(hero.root);
      const cur = pv.job === (S.job || '') && pv.tier === (S.tier || 0), w = cur && S.inv ? G.eqItem('w') : null, a = cur && S.inv ? G.eqItem('a') : null;
      hero = G.buildHero({ look, job: pv.job, tier: pv.tier, wt: w ? w.t : cur ? 'fist' : G.JOB_WT(pv.job), wg: w ? w.g : [0, 2, 4, 5][pv.tier], plus: w ? w.plus : 0, ag: a ? a.g : -1 });
      sc.add(hero.root); pr.material.color.setHex(pv.tier > 0 ? new THREE.Color(G.JOBS[pv.job].c).getHex() : 0x5ab4ff);
    }
    function fit() { const w = cv.clientWidth || innerWidth, h = cv.clientHeight || innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); const d = cam.aspect < 0.8 ? 7.2 : 5.6; cam.position.set(0, 1.5, d); cam.lookAt(0, 1.05, 0); }
    addEventListener('resize', fit);
    cv.onpointerdown = e => { drag = e.clientX; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (drag !== null) { rotY += (e.clientX - drag) * 0.012; drag = e.clientX; } };
    cv.onpointerup = cv.onpointercancel = () => { drag = null; };
    function loop() {
      if (!alive) return; requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
      if (drag === null) rotY += dt * 0.45;
      hero.root.rotation.y = rotY; hero.body.position.y = Math.sin(t * 2) * 0.015; hero.armL.rotation.z = -0.12; hero.armR.rotation.z = 0.12; hero.foreR.rotation.x = -0.35; hero.foreL.rotation.x = -0.25;
      if (hero.root.userData.cape) hero.root.userData.cape.rotation.x = 0.12 + Math.sin(t * 1.6) * 0.05;
      hero.root.userData.tick(t); pr.rotation.y = t * 0.3; r.render(sc, cam);
    }
    const sw = (lab, key, cols) => '<div class="csg"><label>' + lab + '</label><div class="sws">' + cols.map((c, i) => '<button class="sw' + (look[key] === i ? ' sel' : '') + '" data-k="' + key + '" data-v="' + i + '" style="background:#' + c.toString(16).padStart(6, '0') + '"></button>').join('') + '</div></div>';
    const seg = (lab, key, names) => '<div class="csg"><label>' + lab + '</label><div class="seg">' + names.map((n, i) => '<button class="' + (look[key] === i ? 'sel' : '') + '" data-k="' + key + '" data-v="' + i + '">' + n + '</button>').join('') + '</div></div>';
    function pvBar() {
      const jb = Object.keys(G.JOBS).map(k => '<button data-pj="' + k + '" class="' + (pv.job === k && pv.tier > 0 ? 'sel' : '') + '">' + G.JOBS[k].n[0] + '</button>').join('');
      const tb = pv.tier > 0 ? [1, 2, 3].map(t => '<button data-pt="' + t + '" class="' + (pv.tier === t ? 'sel' : '') + '">' + t + '차 · ' + G.JOBS[pv.job].n[t - 1] + '</button>').join('') : '';
      return '<div class="cspv"><div class="seg"><button data-pj="" class="' + (pv.job === (S.job || '') && pv.tier === (S.tier || 0) ? 'sel' : '') + '">현재 모습</button>' + jb + '</div>' + (tb ? '<div class="seg">' + tb + '</div>' : '') + '<p>전직 미리보기 · Lv.' + G.JOB_LV[1] + ' / ' + G.JOB_LV[2] + ' / ' + G.JOB_LV[3] + '에 전직하면 이 모습으로 바뀝니다</p></div>';
    }
    function render() {
      let side;
      if (mode === 'select') {
        side = '<h2>캐릭터 선택</h2><div class="cscard"><b>' + esc(S.name) + '</b><span>Lv.' + S.level + ' · ' + G.jobName(S) + '</span><small>처치 ' + (S.kills || 0).toLocaleString() + ' · ' + (S.gold || 0).toLocaleString() + ' G</small></div><button id="csEdit" class="ghost">외형 바꾸기</button><p class="dim small">계정 하나에 캐릭터 하나입니다.</p>';
      } else {
        side = '<h2>' + (S.made ? '외형 바꾸기' : '캐릭터 만들기') + '</h2><div class="csg"><label>이름</label><input id="csName" maxlength="12" value="' + esc(name) + '"></div>' +
          seg('체형', 'sex', ['남성', '여성']) + seg('헤어', 'hair', PAL.hairN) + sw('머리 색', 'hc', PAL.hairC) + sw('피부', 'skin', PAL.skin) + sw('눈 색', 'eye', PAL.eye) + sw('옷 색', 'cloth', PAL.cloth) +
          '<button id="csRand" class="ghost">🎲 랜덤</button>' + (S.made ? '<button id="csBack" class="ghost">취소</button>' : '');
      }
      ui.innerHTML = '<div class="cspanel">' + side + '</div><div class="csbot">' + pvBar() + '<button id="csGo" class="csgo">' + (mode === 'select' ? '게임 시작' : S.made ? '저장하고 시작' : '캐릭터 생성') + '</button></div>';
      ui.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { look[b.dataset.k] = +b.dataset.v; rebuild(); render(); });
      ui.querySelectorAll('[data-pj]').forEach(b => b.onclick = () => { const j = b.dataset.pj; if (!j) { pv.job = S.job || ''; pv.tier = S.tier || 0; } else { pv.job = j; pv.tier = Math.max(1, pv.job === j ? pv.tier : 1); } rebuild(); render(); });
      ui.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { pv.tier = +b.dataset.pt; rebuild(); render(); });
      const nm = document.getElementById('csName'); if (nm) nm.oninput = () => { name = nm.value; };
      const q = id => document.getElementById(id);
      if (q('csEdit')) q('csEdit').onclick = () => { mode = 'edit'; render(); };
      if (q('csBack')) q('csBack').onclick = () => { Object.assign(look, G.DEF_LOOK, S.look || {}); name = S.name; mode = 'select'; rebuild(); render(); };
      if (q('csRand')) q('csRand').onclick = () => { const R = n => Math.floor(Math.random() * n); look.sex = R(2); look.hair = R(5); look.hc = R(8); look.skin = R(5); look.eye = R(6); look.cloth = R(6); rebuild(); render(); };
      q('csGo').onclick = () => {
        if (mode !== 'select') { const n = String(name || '').trim(); if (!n) { G.ui.toast('이름을 입력해 주세요'); return; } S.name = n.slice(0, 12); S.look = Object.assign({}, look); S.made = true; G.save(); }
        alive = false; removeEventListener('resize', fit); r.dispose(); box.classList.add('hidden'); done();
      };
    }
    box.classList.remove('hidden'); rebuild(); render(); fit(); loop();
  };
})();

(function () {
  const I = G.input = { mx: 0, my: 0, sprint: false, jump: false, atk: false, keys: {}, queue: [], runToggle: false, joy: { id: null, x: 0, y: 0 } };
  const K = I.keys, Cam = G.camCtl;
  const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  addEventListener('keydown', e => {
    if (typing(e)) return;
    const k = e.key.toLowerCase(); if (K[k]) return; K[k] = true;
    if (k === ' ') { I.jump = true; e.preventDefault(); }
    const SKK = { q: 's0', e: 's1', r: 's2', '1': 's0', '2': 's1', '3': 's2' };
    if (SKK[k]) I.queue.push(SKK[k]);
    if (k === 'f') I.queue.push('f');
    if (k === 'shift') I.queue.push('dash');
    if (k === 'k') G.ui.toggle('bag', 'skill');
    if (k === 'j') I.atk = true;
    if (k === 'i' || k === 'b') G.ui.toggle('bag');
    if (k === 'm') G.ui.toggle('map');
    if (k === 'escape') G.ui.close();
  });
  addEventListener('keyup', e => { const k = e.key.toLowerCase(); K[k] = false; if (k === 'j') I.atk = false; });
  addEventListener('blur', () => { for (const k in K) K[k] = false; I.atk = false; });
  I.update = function () {
    if (I.joy.id === null) {
      I.mx = (K.d || K.arrowright ? 1 : 0) - (K.a || K.arrowleft ? 1 : 0);
      I.my = (K.w || K.arrowup ? 1 : 0) - (K.s || K.arrowdown ? 1 : 0);
    } else { I.mx = I.joy.x; I.my = I.joy.y; }
    I.sprint = false;
  };
  I.bind = function () {
    const cv = document.getElementById('game');
    const drags = new Map();
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId);
      drags.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, btn: e.button, t: performance.now() });
      if (e.pointerType === 'mouse' && e.button === 0) I.mouseHold = setTimeout(() => { const d = drags.get(e.pointerId); if (d && !d.moved) I.atk = true; }, 220);
    });
    cv.addEventListener('pointermove', e => {
      const d = drags.get(e.pointerId); if (!d) return;
      const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY;
      if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 6) d.moved = true;
      if (d.moved && !(e.pointerType === 'mouse' && d.btn === 0 && I.atk)) {
        const sens = e.pointerType === 'touch' ? 0.0065 : 0.0045;
        Cam.yaw -= dx * sens; Cam.pitch = G.clamp(Cam.pitch + dy * sens, -0.15, 1.35);
      }
    });
    const end = e => {
      const d = drags.get(e.pointerId); if (!d) return; drags.delete(e.pointerId);
      clearTimeout(I.mouseHold);
      if (e.pointerType === 'mouse' && d.btn === 0) { if (!d.moved && !I.atk) I.queue.push('atk'); I.atk = false; }
      if (e.pointerType !== 'mouse' && !d.moved && performance.now() - d.t < 250) I.queue.push('tap');
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => { Cam.dist = G.clamp(Cam.dist + Math.sign(e.deltaY) * 0.9, 3, 22); e.preventDefault(); }, { passive: false });
    const joy = document.getElementById('joy'), knob = document.getElementById('joyknob');
    joy.addEventListener('pointerdown', e => { joy.setPointerCapture(e.pointerId); I.joy.id = e.pointerId; moveJoy(e); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === I.joy.id) moveJoy(e); });
    const jend = e => { if (e.pointerId !== I.joy.id) return; I.joy.id = null; I.joy.x = I.joy.y = 0; knob.style.transform = 'translate(-50%,-50%)'; };
    joy.addEventListener('pointerup', jend); joy.addEventListener('pointercancel', jend);
    function moveJoy(e) {
      const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      I.joy.x = dx; I.joy.y = -dy; knob.style.transform = 'translate(calc(-50% + ' + dx * R * 0.6 + 'px), calc(-50% + ' + dy * R * 0.6 + 'px))';
    }
    document.querySelectorAll('[data-act]').forEach(b => {
      const a = b.dataset.act;
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); b.classList.add('on');
        if (a === 'atk') I.atk = true; else if (a === 'jump') I.jump = true; else I.queue.push(a);
      });
      const up = e => { b.classList.remove('on'); if (a === 'atk') I.atk = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    });
    let pinch = null;
    cv.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    cv.addEventListener('touchmove', e => { if (e.touches.length === 2 && pinch) { const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); Cam.dist = G.clamp(Cam.dist - (d - pinch) * 0.03, 3, 22); pinch = d; } }, { passive: true });
    cv.addEventListener('touchend', () => { pinch = null; }, { passive: true });
  };
})();

(function () {
  const T = G.terrain, M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, o || {}));
  const DEF = {
    slime:     { name: '슬라임', shape: 'slime', color: 0x5fd36f, hp: 0.7, atk: 0.7, spd: 2.8, agg: 0, size: 1, h: 1.3 },
    rabbit:    { name: '뿔토끼', shape: 'quad', color: 0xe0d6c4, hp: 0.6, atk: 0.6, spd: 5, agg: 0, size: 0.5, horn: 1, ears: 1, h: 1.0 },
    boar:      { name: '멧돼지', shape: 'quad', color: 0x5e4230, hp: 1.1, atk: 1.0, spd: 5.5, agg: 9, size: 1.05, tusk: 1, h: 1.4 },
    deer:      { name: '사슴', shape: 'quad', color: 0xa0703f, passive: 1, spd: 7.5, size: 1.1, antler: 1, hp: 0.8, atk: 0.3, leg: 1.45, h: 2.3 },
    sheep:     { name: '양', shape: 'quad', color: 0xf2efe8, passive: 1, spd: 4, size: 0.85, wool: 1, hp: 0.7, atk: 0.2, h: 1.4 },
    horse:     { name: '야생마', shape: 'quad', color: 0x6e4a2c, passive: 1, spd: 9, size: 1.4, mane: 1, leg: 1.55, hp: 1.2, atk: 0.4, h: 2.4 },
    wolf:      { name: '늑대', shape: 'quad', color: 0x5f6368, hp: 0.9, atk: 1.2, spd: 6.8, agg: 14, size: 0.95, ears: 1, h: 1.4 },
    goblin:    { name: '고블린', shape: 'human', skin: 0x6f9a3a, shirt: 0x5a4024, pants: 0x3a2a18, hp: 0.9, atk: 1.1, spd: 4.6, agg: 12, size: 0.78, weapon: 'club', h: 2.1 },
    bear:      { name: '숲곰', shape: 'quad', color: 0x4a3222, hp: 1.8, atk: 1.5, spd: 5, agg: 8, size: 1.7, ears: 1, h: 1.5 },
    scorpion:  { name: '거대 전갈', shape: 'scorp', color: 0x8a5a2a, hp: 1.2, atk: 1.3, spd: 4.8, agg: 12, size: 1.2, h: 1.6 },
    golem:     { name: '모래 골렘', shape: 'golem', color: 0xc9a86a, hp: 2.4, atk: 1.6, spd: 3.1, agg: 10, size: 1.6, h: 2.2 },
    camel:     { name: '낙타', shape: 'quad', color: 0xc8a36a, passive: 1, spd: 6, size: 1.4, hump: 1, leg: 1.6, hp: 1.3, atk: 0.4, h: 2.5 },
    whitewolf: { name: '설원 늑대', shape: 'quad', color: 0xe4eaee, hp: 1.0, atk: 1.3, spd: 7, agg: 15, size: 1.0, ears: 1, h: 1.4 },
    yeti:      { name: '예티', shape: 'human', skin: 0xdde5ec, shirt: 0xe8eef3, pants: 0xd5dde5, boots: 0xc8d0d8, boxy: 1, hair: null, hp: 2.0, atk: 1.6, spd: 4.4, agg: 11, size: 1.55, weapon: 'none', h: 2.1 },
    reindeer:  { name: '순록', shape: 'quad', color: 0x7a5c40, passive: 1, spd: 7, size: 1.15, antler: 1, leg: 1.35, hp: 0.9, atk: 0.3, h: 2.3 },
    fireelem:  { name: '화염 정령', shape: 'elem', color: 0xff5a1a, hp: 1.1, atk: 1.5, spd: 4.2, agg: 13, size: 1.1, fly: 1.3, h: 2.4 },
    lavagolem: { name: '용암 골렘', shape: 'golem', color: 0x2e2420, emi: 0xff4400, hp: 2.5, atk: 1.7, spd: 3, agg: 10, size: 1.7, h: 2.2 },
    salamander:{ name: '불도마뱀', shape: 'quad', color: 0xb2381a, hp: 1.0, atk: 1.3, spd: 5.6, agg: 10, size: 0.95, leg: 0.55, h: 1.0 },
    frog:      { name: '독두꺼비', shape: 'slime', color: 0x6a8a2a, frog: 1, hp: 0.9, atk: 1.1, spd: 3.6, agg: 9, size: 1.1, h: 1.2 },
    troll:     { name: '늪지 트롤', shape: 'human', skin: 0x5a6a4a, shirt: 0x3a3020, pants: 0x2e281c, boxy: 1, hair: 0x222a1a, hp: 2.0, atk: 1.5, spd: 4, agg: 10, size: 1.6, weapon: 'club', h: 2.1 }
  };
  const BIOME_MOBS = {
    plains: [['slime', 3], ['rabbit', 2], ['boar', 1.6], ['deer', 1], ['sheep', 1.2], ['horse', 0.7]],
    forest: [['wolf', 3], ['goblin', 3], ['bear', 1.1], ['deer', 1], ['boar', 1]],
    desert: [['scorpion', 3], ['golem', 1.5], ['camel', 1]],
    snow: [['whitewolf', 3], ['yeti', 1.5], ['reindeer', 1.2]],
    volcano: [['fireelem', 3], ['lavagolem', 1.4], ['salamander', 2]],
    swamp: [['frog', 3], ['troll', 1.5], ['slime', 1]]
  };
  G.MOB_DEF = DEF;

  function quad(d, mats) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const m = M(d.color, { roughness: 0.95 }), dark = M(0x2a211b); mats.push(m);
    const L = (d.leg || 1) * 0.55, bl = 1.3, bh = 0.56, by = L + bh / 2;
    let torso;
    if (d.wool) { torso = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), m); torso.scale.set(1, 0.85, 1.25); }
    else { torso = new THREE.Mesh(new THREE.CapsuleGeometry(bh / 2, bl - bh, 4, 10), m); torso.rotation.x = Math.PI / 2; }
    torso.position.y = by; body.add(torso);
    const head = new THREE.Group(); head.position.set(0, by + bh * 0.35, bl / 2 + 0.05); body.add(head);
    const hm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.42), d.wool ? M(0x2b2420) : m); hm.position.set(0, 0.12, 0.18); head.add(hm);
    const sn = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.26), d.wool ? hm.material : m); sn.position.set(0, 0.02, 0.48); head.add(sn);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.04), dark); nose.position.set(0, 0.07, 0.62); head.add(nose);
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0x111111, { roughness: 0.2 })); e.position.set(sx * 0.17, 0.2, 0.3); head.add(e);
      if (d.ears || d.antler || d.mane || d.hump) { const ea = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5), hm.material); ea.position.set(sx * 0.13, 0.37, 0.1); ea.rotation.z = -sx * 0.3; head.add(ea); }
      if (d.antler) { const am = M(0xd8c8a8); const a1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.7, 5), am); a1.position.set(sx * 0.12, 0.6, 0.12); a1.rotation.z = -sx * 0.45; head.add(a1); const a2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.4, 5), am); a2.position.set(sx * 0.3, 0.75, 0.2); a2.rotation.set(0.5, 0, -sx * 1.0); head.add(a2); }
      if (d.tusk) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 5), M(0xf0ead8)); t.position.set(sx * 0.1, -0.04, 0.6); t.rotation.x = -0.9; head.add(t); }
    }
    if (d.horn) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 6), M(0xf2e6c8)); h.position.set(0, 0.38, 0.3); h.rotation.x = 0.5; head.add(h); }
    if (d.mane) { const mn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.8), M(0x1e140c)); mn.position.set(0, by + bh * 0.5, bl / 2 - 0.25); mn.rotation.x = -0.6; body.add(mn); head.rotation.x = -0.35; head.position.y += 0.25; }
    if (d.hump) { const hp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), m); hp.position.set(0, by + bh * 0.5, 0); hp.scale.set(1, 0.9, 1.3); body.add(hp); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.5, 5), m); tail.position.set(0, by + 0.05, -bl / 2 - 0.2); tail.rotation.x = -0.9; body.add(tail);
    const legs = [];
    for (const lz of [1, -1]) for (const sx of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(sx * 0.2, L, lz * bl * 0.36); body.add(g);
      const lm = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, L, 6), d.wool ? M(0x2b2420) : m); lm.position.y = -L / 2; g.add(lm);
      const hf = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 6), dark); hf.position.y = -L + 0.03; g.add(hf);
      legs.push(g);
    }
    return { root, body, head, legs, kind: 'quad' };
  }
  function slime(d, mats) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const m = M(d.color, { roughness: d.frog ? 0.6 : 0.15, transparent: !d.frog, opacity: 0.85, metalness: 0.05 }); mats.push(m);
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), m); s.scale.set(1, d.frog ? 0.6 : 0.82, d.frog ? 1.15 : 1); s.position.y = d.frog ? 0.38 : 0.5; body.add(s);
    for (const sx of [-1, 1]) {
      if (d.frog) { const bump = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), m); bump.position.set(sx * 0.25, 0.72, 0.3); body.add(bump); }
      const e = new THREE.Mesh(new THREE.SphereGeometry(d.frog ? 0.09 : 0.075, 10, 8), M(d.frog ? 0xe8d040 : 0x111111, { roughness: 0.2 })); e.position.set(sx * (d.frog ? 0.25 : 0.2), d.frog ? 0.78 : 0.62, d.frog ? 0.38 : 0.5); body.add(e);
      if (d.frog) { const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 3, 6), m); lg.position.set(sx * 0.45, 0.15, -0.2); lg.rotation.x = 1.2; body.add(lg); }
    }
    return { root, body, blob: s, kind: 'slime' };
  }
  function scorp(d, mats) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const m = M(d.color, { roughness: 0.45, metalness: 0.2 }); mats.push(m);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), m); b.scale.set(0.9, 0.42, 1.4); b.position.y = 0.45; body.add(b);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), m); hd.scale.set(1, 0.55, 0.9); hd.position.set(0, 0.45, 0.78); body.add(hd);
    const legs = [];
    for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.42, 0.45, 0.3 - i * 0.35); body.add(g); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.75, 5), m); l.position.set(sx * 0.3, -0.18, 0); l.rotation.z = sx * 1.0; g.add(l); legs.push(g); }
    for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), m); arm.position.set(sx * 0.35, 0.45, 1.05); arm.rotation.set(1.3, 0, -sx * 0.5); body.add(arm); const cl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.38), m); cl.position.set(sx * 0.48, 0.45, 1.38); body.add(cl); }
    const tail = new THREE.Group(); tail.position.set(0, 0.5, -0.7); body.add(tail);
    let prev = tail;
    for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set(0, i ? 0.24 : 0, i ? 0 : 0); g.rotation.x = -0.55; prev.add(g); const s = new THREE.Mesh(new THREE.SphereGeometry(0.15 - i * 0.015, 8, 6), m); s.position.y = 0.12; g.add(s); prev = g; }
    const st = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), M(0x2a1a10)); st.position.y = 0.3; st.rotation.x = 0.8; prev.add(st);
    return { root, body, legs, tail, kind: 'scorp' };
  }
  function elem(d, mats) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 1.6, roughness: 0.4 })); core.position.y = 1.2; body.add(core); mats.push(core.material);
    const shell = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); shell.position.y = 1.5; body.add(shell);
    const orbs = new THREE.Group(); orbs.position.y = 1.2; body.add(orbs);
    for (let i = 0; i < 4; i++) { const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), M(0x2a1a14, { emissive: 0xff3300, emissiveIntensity: 0.6 })); const a = i / 4 * Math.PI * 2; o.position.set(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95); orbs.add(o); }
    return { root, body, core, shell, orbs, kind: 'elem' };
  }
  function human(d, mats, golem) {
    const h = G.makeHumanoid(golem ? { skin: d.color, shirt: d.color, pants: d.color, boots: d.color, boxy: true, hair: null, weapon: 'none', eyes: 0xffaa22 } : { skin: d.skin, shirt: d.shirt, pants: d.pants, boots: d.boots || 0x2a2018, boxy: !!d.boxy, hair: d.hair === undefined ? 0x1a120a : d.hair, weapon: d.weapon || 'none', eyes: d.shape === 'human' && d.name === '고블린' ? 0xffdd00 : 0x1a1a1a });
    h.root.traverse(o => { if (o.isMesh && mats.indexOf(o.material) < 0) mats.push(o.material); });
    if (golem && d.emi) h.torso.material.emissive.setHex(0x551800);
    if (golem) { for (const f of [h.foreL, h.foreR]) { const fist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), h.torso.material); fist.position.y = -0.38; f.add(fist); fist.castShadow = true; } }
    return { root: h.root, body: h.body, h, kind: 'human' };
  }
  function build(d) {
    const mats = [];
    const mdl = d.shape === 'quad' ? quad(d, mats) : d.shape === 'slime' ? slime(d, mats) : d.shape === 'scorp' ? scorp(d, mats) : d.shape === 'elem' ? elem(d, mats) : human(d, mats, d.shape === 'golem');
    mdl.root.traverse(o => { if (o.isMesh) { o.castShadow = true; if (o.material && mats.indexOf(o.material) < 0 && o.material.emissive) mats.push(o.material); } });
    mdl.mats = mats.filter(x => x.emissive).map(x => ({ m: x, e: x.emissive.getHex(), i: x.emissiveIntensity }));
    return mdl;
  }

  function makeLabel() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 72;
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    sp.renderOrder = 5; return { c, ctx: c.getContext('2d'), tex, sp };
  }
  function drawLabel(m) {
    const L = m.label, x = L.ctx, lv = G.S.level, dlv = m.level - lv;
    x.clearRect(0, 0, 256, 72);
    x.font = 'bold 22px sans-serif'; x.textAlign = 'center';
    const col = m.d.passive ? '#cfe8ff' : m.boss ? '#ff7a59' : dlv >= 8 ? '#ff4d4d' : dlv >= 3 ? '#ffb340' : dlv <= -8 ? '#9a9a9a' : '#ffffff';
    x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,0.75)'; const t = 'Lv.' + m.level + ' ' + m.name;
    x.strokeText(t, 128, 26); x.fillStyle = col; x.fillText(t, 128, 26);
    x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(28, 38, 200, 14);
    const r = Math.max(0, m.hp / m.maxHp); x.fillStyle = m.boss ? '#ff3b3b' : '#e84545'; x.fillRect(30, 40, 196 * r, 10);
    L.tex.needsUpdate = true; m.labelLv = lv;
  }

  const MB = G.mobs = { list: [], byChunk: new Map(), respawn: [], bossState: {}, scene: null, slams: [] };
  MB.DEF = DEF;
  function pick(list, rng) { let t = 0; for (const e of list) t += e[1]; let r = rng() * t; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[0][0]; }
  MB.create = function (key, x, z, level, o) {
    o = o || {}; const d = DEF[key], mdl = build(d), sc = d.size * (o.size || 1);
    mdl.root.scale.setScalar(sc);
    const boss = !!o.boss;
    const m = { key, d, name: o.name || d.name, level, boss, mdl, root: mdl.root, x, z, y: G.world.groundAt(x, z), sx: x, sz: z, state: 'idle', t: Math.random() * 3, face: Math.random() * 6.28,
      maxHp: Math.round((45 + level * 30) * (d.hp || 1) * (boss ? 28 : 1)), atk: (5 + level * 3.6) * (d.atk || 1) * (boss ? 2.1 : 1), spd: d.spd * (boss ? 0.85 : 1),
      rad: 0.65 * sc + 0.15, sc, cd: 0, wind: -1, phase: 0, hurtT: 0, stun: 0, fleeT: 0, alive: true, deadT: 0, flash: 0, chunk: o.chunk || null, site: o.site, slamCd: 6, aggro: false };
    m.hp = m.maxHp; m.height = d.h * sc;
    m.label = makeLabel(); m.label.sp.scale.set(boss ? 5.2 : 2.7, boss ? 1.46 : 0.76, 1); MB.scene.add(m.label.sp); drawLabel(m);
    if (boss && d.shape === 'elem') { const pl = new THREE.PointLight(0xff6622, 2, 30); pl.position.y = 1.4; mdl.root.add(pl); }
    MB.scene.add(mdl.root); MB.list.push(m); return m;
  };
  function spawnInChunk(k, n, seed) {
    const p = k.split(',').map(Number), CH = G.world.CH, rng = G.noise.rng(seed);
    const arr = MB.byChunk.get(k) || []; MB.byChunk.set(k, arr);
    for (let i = 0; i < n; i++) {
      const x = p[0] * CH + rng() * CH, z = p[1] * CH + rng() * CH, d = Math.hypot(x, z);
      if (d < 150 || d > G.WORLD_R - 260) continue;
      const h = G.world.groundAt(x, z); if (h < 0.4) continue;
      const b = T.biomeAt(x, z); let key = pick(BIOME_MOBS[b], rng);
      if (d < 320 && (key === 'boar' || key === 'horse') && rng() < 0.5) key = 'slime';
      const lv = G.clamp(T.levelAt(x, z) + Math.round((rng() - 0.5) * 4), 1, 200);
      arr.push(MB.create(key, x, z, lv, { chunk: k }));
    }
  }
  function removeMob(m) {
    MB.scene.remove(m.root); MB.scene.remove(m.label.sp); m.label.tex.dispose();
    m.root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    const i = MB.list.indexOf(m); if (i >= 0) MB.list.splice(i, 1);
    if (m.chunk) { const a = MB.byChunk.get(m.chunk); if (a) { const j = a.indexOf(m); if (j >= 0) a.splice(j, 1); } }
    if (G.combat && G.combat.target === m) G.combat.target = null;
  }
  MB.onChunkUnload = function (k) { const a = MB.byChunk.get(k); if (a) { for (const m of a.slice()) removeMob(m); MB.byChunk.delete(k); } };
  MB.clearAll = function () { for (const m of MB.list.slice()) removeMob(m); MB.byChunk.clear(); MB.bossState = {}; };
  MB.onHurt = function (m) {
    m.flash = 0.14; m.hurtT = 6;
    if (m.d.passive) { m.state = 'flee'; m.fleeT = 6; } else if (m.state !== 'return') { m.state = 'chase'; m.aggro = true; }
    drawLabel(m);
  };
  MB.kill = function (m) {
    m.alive = false; m.deadT = 0; m.state = 'dead';
    if (m.chunk) MB.respawn.push({ k: m.chunk, t: 25 + Math.random() * 15 });
    if (m.boss) MB.bossState[m.site] = { m: null, dead: performance.now() + 300000 };
  };
  const tv = new THREE.Vector3();
  MB.update = function (dt, P) {
    const CH = G.world.CH, pcx = Math.floor(P.pos.x / CH), pcz = Math.floor(P.pos.z / CH), r = G.world.quality === 'low' ? 1 : 2;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const k = (pcx + dx) + ',' + (pcz + dz);
      if (!MB.byChunk.has(k) && G.world.chunks.has(k)) spawnInChunk(k, 3 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 1e9));
    }
    for (const k of Array.from(MB.byChunk.keys())) { const p = k.split(',').map(Number); if (Math.abs(p[0] - pcx) > r + 1 || Math.abs(p[1] - pcz) > r + 1) MB.onChunkUnload(k); }
    for (let i = MB.respawn.length - 1; i >= 0; i--) { const e = MB.respawn[i]; e.t -= dt; if (e.t <= 0) { MB.respawn.splice(i, 1); if (MB.byChunk.has(e.k)) spawnInChunk(e.k, 1, Math.floor(Math.random() * 1e9)); } }
    T.bosses.forEach((bs, i) => {
      const st = MB.bossState[i] || (MB.bossState[i] = { m: null, dead: 0 });
      const d = Math.hypot(P.pos.x - bs.x, P.pos.z - bs.z);
      if (!st.m && d < 230 && performance.now() > st.dead && G.world.chunks.has(Math.floor(bs.x / CH) + ',' + Math.floor(bs.z / CH))) st.m = MB.create(bs.key, bs.x, bs.z, bs.level, { boss: true, name: bs.name, size: bs.size, site: i });
      if (st.m && st.m.alive && d > 420) { removeMob(st.m); st.m = null; }
      if (st.m && !st.m.alive && !MB.list.includes(st.m)) st.m = null;
    });
    for (let i = MB.slams.length - 1; i >= 0; i--) {
      const s = MB.slams[i]; s.t -= dt; s.mesh.material.opacity = 0.25 + (1 - s.t / 1.2) * 0.45;
      if (s.t <= 0) { MB.scene.remove(s.mesh); MB.slams.splice(i, 1); if (Math.hypot(P.pos.x - s.x, P.pos.z - s.z) < s.r && P.alive) G.combat.hurtPlayer(s.dmg, s.name + '의 대지 강타'); G.ui.shake(0.4); }
    }
    try { G.mobSkill.update(dt, P); } catch (e) { if (!G.newErr) { G.newErr = 1; console.error('v1.3', e); } }
    for (const m of MB.list.slice()) updateMob(m, dt, P);
  };
  function updateMob(m, dt, P) {
    const R = m.root, pd = Math.hypot(P.pos.x - m.x, P.pos.z - m.z);
    if (!m.alive) {
      m.deadT += dt; R.rotation.z = Math.min(Math.PI / 2, m.deadT * 4); R.position.y = m.y - m.deadT * 0.6; m.label.sp.visible = false;
      if (m.deadT > 1.6) removeMob(m); return;
    }
    if (pd > 140 && !m.boss) { R.visible = pd < 260; m.label.sp.visible = false; return; }
    R.visible = true;
    if (m.flash > 0) { m.flash -= dt; for (const e of m.mdl.mats) { e.m.emissive.setHex(m.flash > 0 ? 0xff2222 : e.e); e.m.emissiveIntensity = m.flash > 0 ? 0.7 : e.i; } }
    if (m.labelLv !== G.S.level) drawLabel(m);
    m.cd -= dt; m.hurtT -= dt; m.t -= dt;
    let mv = 0, tx = m.x, tz = m.z, spd = m.spd;
    const homeD = Math.hypot(m.x - m.sx, m.z - m.sz), leash = m.boss ? 40 : 48;
    if (m.stun > 0) { m.stun -= dt; m.state = m.state === 'flee' ? 'flee' : 'chase'; }
    else if (m.state === 'flee') { m.fleeT -= dt; tx = m.x + (m.x - P.pos.x); tz = m.z + (m.z - P.pos.z); mv = 1; spd *= 1.1; if (m.fleeT <= 0) m.state = 'idle'; }
    else if (m.state === 'return') { tx = m.sx; tz = m.sz; mv = 1; spd *= 1.3; m.hp = Math.min(m.maxHp, m.hp + m.maxHp * dt * 0.3); if (homeD < 3) { m.state = 'idle'; m.hp = m.maxHp; m.aggro = false; drawLabel(m); } }
    else if (m.state === 'chase') {
      if (!P.alive || homeD > leash) { m.state = 'return'; m.wind = -1; }
      else {
        tx = P.pos.x; tz = P.pos.z; const reach = m.rad + (m.boss ? 2.2 : 1.1);
        if (m.wind >= 0) { m.wind += dt; if (m.wind > 0.45) { m.wind = -1; if (pd < reach + 1.0) G.combat.hurtPlayer(m.atk * (0.9 + Math.random() * 0.2), m.name); } }
        else if (pd < reach) { if (m.cd <= 0) { m.wind = 0; m.cd = m.boss ? 2.0 : 1.6; } }
        else mv = 1;
        if (m.boss) { m.slamCd -= dt; if (m.slamCd <= 0 && pd < 18) { m.slamCd = 7 + Math.random() * 3; slam(m); } }
        try { G.mobSkill.tick(m, dt, pd, P); } catch (e) { if (!G.newErr) { G.newErr = 1; console.error('v1.3', e); } }
      }
    } else {
      if (!m.d.passive && m.d.agg > 0 && pd < m.d.agg * (m.boss ? 1.6 : 1) && P.alive && Math.abs(P.pos.y - m.y) < 12) { m.state = 'chase'; m.aggro = true; }
      else {
        if (m.t <= 0) { m.t = 2 + Math.random() * 5; if (Math.random() < 0.55) { const a = Math.random() * 6.28, rr = Math.random() * 18; m.wx = m.sx + Math.cos(a) * rr; m.wz = m.sz + Math.sin(a) * rr; m.state = 'wander'; } else m.state = 'idle'; }
        if (m.state === 'wander') { tx = m.wx; tz = m.wz; mv = Math.hypot(tx - m.x, tz - m.z) > 1 ? 0.45 : 0; if (!mv) m.state = 'idle'; }
      }
    }
    if (mv > 0) {
      const dx = tx - m.x, dz = tz - m.z, l = Math.hypot(dx, dz);
      if (l > 0.01) {
        const nx = m.x + dx / l * spd * mv * dt, nz = m.z + dz / l * spd * mv * dt, ng = G.world.groundAt(nx, nz);
        if (ng > -0.6 || m.d.fly || m.state === 'return') { m.x = nx; m.z = nz; }
        const tf = Math.atan2(dx, dz); let df = tf - m.face; while (df > Math.PI) df -= 6.283; while (df < -Math.PI) df += 6.283; m.face += df * Math.min(1, dt * 8);
      }
    } else if (m.state === 'chase') { const tf = Math.atan2(P.pos.x - m.x, P.pos.z - m.z); let df = tf - m.face; while (df > Math.PI) df -= 6.283; while (df < -Math.PI) df += 6.283; m.face += df * Math.min(1, dt * 6); }
    if (pd < m.rad + 0.5 && pd > 0.01) { const k = (m.rad + 0.5) / pd; m.x = P.pos.x + (m.x - P.pos.x) * k; m.z = P.pos.z + (m.z - P.pos.z) * k; }
    m.y = G.world.groundAt(m.x, m.z); if (m.y < -1.2 && !m.d.fly) m.y = -1.2;
    const sp = mv * spd; m.phase += dt * (sp * 1.8 / Math.max(0.6, m.sc) + 1.5);
    animate(m, sp, dt);
    R.position.set(m.x, m.y + (m.d.fly ? m.d.fly * 0.3 * m.sc + Math.sin(m.phase * 0.8) * 0.15 : 0), m.z); R.rotation.y = m.face;
    const lv = pd < (m.boss ? 90 : 34); m.label.sp.visible = lv;
    if (lv) m.label.sp.position.set(m.x, m.y + m.height + 0.55, m.z);
  }
  function animate(m, sp, dt) {
    const a = m.mdl, ph = m.phase, amt = Math.min(1, sp / 4), w = m.wind;
    if (a.kind === 'quad') {
      a.legs.forEach((g, i) => { g.rotation.x = Math.sin(ph + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.6 * amt; });
      a.head.rotation.x = w >= 0 ? (w < 0.3 ? -0.4 : 0.5) : Math.sin(ph * 2) * 0.05;
      a.body.position.z = w >= 0 ? (w < 0.3 ? -0.15 : 0.35) : 0;
    } else if (a.kind === 'slime') {
      const b = Math.sin(ph * 2.2); a.body.scale.set(1 - b * 0.1, 1 + b * 0.16 + (w >= 0 ? 0.25 : 0), 1 - b * 0.1); a.body.position.y = Math.max(0, b) * 0.25 * amt;
    } else if (a.kind === 'scorp') {
      a.legs.forEach((g, i) => { g.rotation.y = Math.sin(ph * 1.6 + i) * 0.35 * amt; });
      a.tail.rotation.x = w >= 0 ? (w < 0.3 ? -0.5 : 0.9) : Math.sin(ph) * 0.08;
    } else if (a.kind === 'elem') {
      a.orbs.rotation.y += dt * 2.5; a.core.rotation.y += dt; a.shell.scale.set(1 + Math.sin(ph * 4) * 0.08, 1 + Math.cos(ph * 3) * 0.1, 1);
      a.core.scale.setScalar(w >= 0 ? 1.25 : 1);
    } else if (a.kind === 'human') {
      G.animHumanoid(a.h, ph, amt, w >= 0 ? Math.min(0.99, w / 0.45) : -1, dt);
    }
  }
  function slam(m) {
    const r = 9 * Math.max(1, m.sc / 2);
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.25, depthWrite: false }));
    mesh.position.set(m.x, m.y + 0.25, m.z); MB.scene.add(mesh);
    MB.slams.push({ mesh, t: 1.2, x: m.x, z: m.z, r, dmg: m.atk * 1.7, name: m.name });
    m.wind = 0; G.ui.log('<b class="red">' + m.name + '</b>이(가) 대지를 내려칠 준비를 합니다! 붉은 원 밖으로 피하세요!');
  }
  MB.init = function (scene) { MB.scene = scene; };
})();

(function () {
  const MS = G.mobSkill = { tg: [], zones: [], moves: [], fade: [] };
  const ang = a => { while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283; return a; };
  function mk(geo, x, y, z, f) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 0.3, z); m.rotation.y = f || 0; m.renderOrder = 2; G.mobs.scene.add(m); return m;
  }
  function drop(g) { G.mobs.scene.remove(g.mesh); g.mesh.geometry.dispose(); g.mesh.material.dispose(); }
  function say(m, s) { if (m.boss) G.ui.log('<b class="red">' + m.name + '</b>: ' + s.name + '!'); else G.ui.dmgText(m.x, m.y + m.height + 0.9, m.z, s.name, 'sk'); }
  function inRange(m, s, pd) {
    const sc = m.boss ? 1.4 : 1;
    switch (s.type) {
      case 'smash': case 'multi': case 'spin': case 'nova': return pd < (s.r || 4) * sc + m.rad + 0.3;
      case 'charge': return pd > 3 && pd < (s.dist || 10);
      case 'bolt': return pd < (s.len || 14);
      case 'leap': case 'dot': return pd < 16;
      case 'buff': return pd < 15;
      case 'heal': return m.hp < m.maxHp * 0.6;
    }
    return false;
  }
  MS.tick = function (m, dt, pd, P) {
    if (m.skCd === undefined) m.skCd = 2 + Math.random() * 4;
    m.skCd -= dt;
    if (m.buffT > 0) { m.buffT -= dt; if (m.buffT <= 0) m.atk = m.atk0; }
    if (m.skCd > 0 || m.wind >= 0 || m.stun > 0 || !P.alive || pd > 22) return;
    const base = G.MOB_SKILLS[m.key] || [], list = m.boss && G.BOSS_SKILL[m.name] ? base.concat([G.BOSS_SKILL[m.name]]) : base;
    if (!list.length) return;
    const s = G.SKILLS[list[Math.floor(Math.random() * list.length)]];
    if (!s || !inRange(m, s, pd)) { m.skCd = 0.4; return; }
    m.skCd = (m.boss ? 3 + s.cd * 0.6 : 5 + s.cd) * (0.8 + Math.random() * 0.4);
    cast(m, s, P);
  };
  function cast(m, s, P) {
    const sc = m.boss ? 1.4 : 1, T = (m.boss ? 1.0 : 0.85) + (s.delay || 0), f = Math.atan2(P.pos.x - m.x, P.pos.z - m.z);
    const g = { m, s, T, t: T, f, x: m.x, z: m.z, y: m.y, dmg: m.atk * (1.15 + s.tier * 0.22) };
    m.face = f;
    if (s.type === 'smash' || s.type === 'multi') { g.kind = 'sec'; g.r = (s.r || 4) * sc + m.rad; g.cone = (s.cone || 100) * Math.PI / 180; g.mesh = mk(new THREE.CircleGeometry(g.r, 28, -Math.PI / 2 - g.cone / 2, g.cone).rotateX(-Math.PI / 2), g.x, g.y, g.z, f); if (s.type === 'multi') g.dmg *= 1 + (s.n || 3) * 0.1; }
    else if (s.type === 'spin' || s.type === 'nova') { g.kind = 'cir'; g.r = (s.r || 4) * sc + m.rad; g.mesh = mk(new THREE.CircleGeometry(g.r, 36).rotateX(-Math.PI / 2), g.x, g.y, g.z); }
    else if (s.type === 'leap' || s.type === 'dot') { g.kind = s.type === 'dot' ? 'zone' : 'cir'; g.leap = s.type === 'leap'; g.x = P.pos.x; g.z = P.pos.z; g.y = G.world.groundAt(g.x, g.z); g.r = (s.r || 4) * sc; g.mesh = mk(new THREE.CircleGeometry(g.r, 36).rotateX(-Math.PI / 2), g.x, g.y, g.z); }
    else if (s.type === 'charge' || s.type === 'bolt') { g.kind = 'line'; g.charge = s.type === 'charge'; g.len = g.charge ? (s.dist || 10) : (s.len || 14); g.w = g.charge ? 1.6 + m.rad * 2 : (s.size ? 3.2 : 1.8); g.mesh = mk(new THREE.PlaneGeometry(g.w, g.len).rotateX(-Math.PI / 2).translate(0, 0, g.len / 2), g.x, g.y, g.z, f); }
    else if (s.type === 'buff') { if (!(m.buffT > 0)) m.atk0 = m.atk; m.atk = m.atk0 * (1 + (s.atkUp || 0.3) * 0.6); m.buffT = s.dur || 8; say(m, s); return; }
    else if (s.type === 'heal') { m.hp = Math.min(m.maxHp, m.hp + m.maxHp * (s.pct || 0.2) * (m.boss ? 0.3 : 0.6)); m.labelLv = -1; say(m, s); return; }
    else return;
    m.stun = Math.max(m.stun || 0, T); say(m, s); MS.tg.push(g);
  }
  function fire(g, P) {
    const px = P.pos.x, pz = P.pos.z; let hit = false;
    if (g.kind === 'cir') hit = Math.hypot(px - g.x, pz - g.z) < g.r + 0.4;
    else if (g.kind === 'sec') { const d = Math.hypot(px - g.x, pz - g.z); hit = d < g.r + 0.4 && (d < 1.2 || Math.abs(ang(Math.atan2(px - g.x, pz - g.z) - g.f)) < g.cone / 2 + 0.1); }
    else if (g.kind === 'line') { const dx = px - g.x, dz = pz - g.z, sf = Math.sin(g.f), cf = Math.cos(g.f), al = dx * sf + dz * cf, pr = Math.abs(dx * cf - dz * sf); hit = al > -0.5 && al < g.len + 0.5 && pr < g.w / 2 + 0.4; }
    if (g.leap || g.charge) { const tx = g.leap ? g.x : g.x + Math.sin(g.f) * g.len * 0.95, tz = g.leap ? g.z : g.z + Math.cos(g.f) * g.len * 0.95; if (G.world.groundAt(tx, tz) > -0.6) MS.moves.push({ m: g.m, fx: g.m.x, fz: g.m.z, tx, tz, t: 0 }); }
    if (g.kind === 'zone') { g.left = g.s.ticks || 6; g.tt = 0; g.mesh.material.color.setHex(0xff7a1a); MS.zones.push(g); return; }
    if (hit && Math.abs(P.pos.y - g.y) < 5) G.combat.hurtPlayer(g.dmg * (0.9 + Math.random() * 0.2), g.m.name + '의 ' + g.s.name);
    g.mesh.material.opacity = 0.75; g.mesh.material.color.setHex(0xffd0a0); MS.fade.push({ mesh: g.mesh, t: 0.25, g });
  }
  MS.update = function (dt, P) {
    const L = G.mobs.list;
    for (let i = MS.tg.length - 1; i >= 0; i--) {
      const g = MS.tg[i]; g.t -= dt;
      if (!g.m.alive || !L.includes(g.m)) { drop(g); MS.tg.splice(i, 1); continue; }
      g.mesh.material.opacity = 0.16 + (1 - g.t / g.T) * 0.42;
      if (g.t <= 0) { MS.tg.splice(i, 1); fire(g, P); }
    }
    for (let i = MS.zones.length - 1; i >= 0; i--) {
      const z = MS.zones[i]; z.tt -= dt; z.mesh.material.opacity = 0.32 + Math.sin(performance.now() / 120) * 0.08;
      if (z.tt <= 0) { z.tt = 0.5; z.left--; if (P.alive && Math.hypot(P.pos.x - z.x, P.pos.z - z.z) < z.r + 0.3 && Math.abs(P.pos.y - z.y) < 5) G.combat.hurtPlayer(z.dmg * 0.32, z.m.name + '의 ' + z.s.name); if (z.left <= 0) { drop(z); MS.zones.splice(i, 1); } }
    }
    for (let i = MS.fade.length - 1; i >= 0; i--) { const f = MS.fade[i]; f.t -= dt; f.mesh.material.opacity = Math.max(0, f.t / 0.25) * 0.75; if (f.t <= 0) { drop(f.g); MS.fade.splice(i, 1); } }
    for (let i = MS.moves.length - 1; i >= 0; i--) { const v = MS.moves[i]; v.t += dt; const k = Math.min(1, v.t / 0.22); if (!v.m.alive) { MS.moves.splice(i, 1); continue; } v.m.x = v.fx + (v.tx - v.fx) * k; v.m.z = v.fz + (v.tz - v.fz) * k; if (k >= 1) MS.moves.splice(i, 1); }
  };
})();

(function () {
  const C = G.combat = { cds: { atk: 0 }, target: null, pend: [], drops: [], fx: [], vfx: [], proj: [], zones: [], buffT: 0, buffM: 1 };
  const SK = C.SKILLS = G.SKILLS;
  C.need = L => Math.floor(40 * Math.pow(L, 1.75) + 60);
  let scene, arcMat, P;
  C.init = function (sc) {
    scene = sc; P = G.player;
    arcMat = new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    C.arc = new THREE.Mesh(new THREE.RingGeometry(1.0, 3.2, 28, 1, Math.PI / 2 - 1.0, 2.0).rotateX(-Math.PI / 2), arcMat); scene.add(C.arc);
    C.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 4.8, 40).rotateX(-Math.PI / 2), arcMat.clone()); scene.add(C.ring);
    C.dropGeo = new THREE.OctahedronGeometry(0.16);
  };
  function nearestEnemy(maxD) {
    let best = null, bd = maxD;
    for (const m of G.mobs.list) { if (!m.alive) continue; const d = Math.hypot(m.x - P.pos.x, m.z - P.pos.z) - m.rad; if (d < bd && (!m.d.passive || m === C.target)) { bd = d; best = m; } }
    if (!best && C.target && C.target.alive && Math.hypot(C.target.x - P.pos.x, C.target.z - P.pos.z) < maxD + 2) best = C.target;
    return best;
  }
  function hitArea(range, cone, mult, stun, exclude) {
    let n = 0;
    for (const m of G.mobs.list) {
      if (!m.alive || (exclude && exclude.has(m))) continue;
      const dx = m.x - P.pos.x, dz = m.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > range + m.rad || Math.abs(m.y - P.pos.y) > 4 + m.height) continue;
      if (cone < 360 && d > m.rad) { let a = Math.atan2(dx, dz) - P.facing; while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283; if (Math.abs(a) > cone / 360 * Math.PI) continue; }
      damage(m, mult, stun); if (exclude) exclude.add(m); n++;
    }
    return n;
  }
  function damage(m, mult, stun) {
    const st = G.stats(), dl = m.level - G.S.level;
    let dmg = st.atk * mult * (C.buffT > 0 ? C.buffM : 1) * (0.9 + Math.random() * 0.2) * (dl > 0 ? Math.max(0.3, 1 - dl * 0.04) : 1);
    const crit = Math.random() < st.crit; if (crit) dmg *= 1.8;
    dmg = Math.max(1, Math.round(dmg)); m.hp -= dmg;
    if (stun) m.stun = stun;
    C.target = m; G.mobs.onHurt(m);
    G.ui.dmgText(m.x, m.y + m.height * 0.8, m.z, dmg, crit ? 'crit' : 'hit');
    if (m.hp <= 0) kill(m);
  }
  function kill(m) {
    m.hp = 0; G.mobs.kill(m); G.S.kills++;
    const S = G.S, dl = S.level - m.level;
    let xp = Math.floor(12 * Math.pow(m.level, 1.45) * (m.boss ? 30 : 1));
    if (dl > 10) xp = Math.floor(xp * Math.max(0.1, 1 - (dl - 10) * 0.08));
    const gold = Math.floor((m.level * 2 + Math.random() * m.level * 2 + 3) * (m.boss ? 20 : 1));
    S.gold += gold;
    const n = m.boss ? 15 + Math.floor(Math.random() * 11) : 1 + (Math.random() < 0.35 ? 1 : 0) + (Math.random() < 0.08 ? 1 : 0);
    const name = m.d.name + '의 부스러기';
    for (let i = 0; i < Math.min(n, 8); i++) spawnDrop(m.x, m.y + 1, m.z, name, i === 0 ? n - Math.min(n, 8) + 1 : 1);
    for (const it of G.items.rollDrop(m)) spawnDrop(m.x, m.y + 1, m.z, it.name, 1, it);
    G.ui.log((m.boss ? '<b class="gold">[필드 보스 처치]</b> ' : '') + m.name + ' 처치 · 경험치 +' + xp.toLocaleString() + ' · 골드 +' + gold.toLocaleString());
    if (m.boss) G.ui.toast(m.name + ' 처치!', 'gold');
    gainXp(xp); if (G.npc) G.npc.onKill(m);
  }
  function gainXp(x) {
    const S = G.S; if (S.level >= G.MAX_LEVEL) return;
    S.xp += x; let up = false;
    while (S.level < G.MAX_LEVEL && S.xp >= C.need(S.level)) { S.xp -= C.need(S.level); S.level++; up = true; }
    if (S.level >= G.MAX_LEVEL) S.xp = 0;
    if (up) {
      const st = G.stats(); S.hp = st.maxHp; S.mp = st.maxMp;
      G.ui.toast('레벨 업! Lv.' + S.level + (S.level >= G.MAX_LEVEL ? ' (만렙 달성!)' : ''), 'gold');
      if (G.JOB_LV.includes(S.level)) G.ui.log('<b class="gold">전직할 수 있습니다!</b> 가방 → 캐릭터 탭에서 전직하세요.');
      levelFx(); G.save();
    }
  }
  C.gainXp = gainXp;
  function levelFx() {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(P.pos); m.position.y += 3; scene.add(m); C.fx.push({ m, t: 0, kind: 'lv' });
  }
  function spawnDrop(x, y, z, name, n, item) {
    const mesh = new THREE.Mesh(C.dropGeo, new THREE.MeshBasicMaterial({ color: item ? G.GRADES[item.g].hex : 0xffe28a })); mesh.position.set(x, y, z); if (item) mesh.scale.setScalar(item.k === 'b' ? 1.6 : 2); scene.add(mesh);
    C.drops.push({ mesh, name, n, item, t: 0, vx: (Math.random() - 0.5) * 4, vy: 4 + Math.random() * 2, vz: (Math.random() - 0.5) * 4 });
  }
  C.tryUse = function (k) {
    if (k !== 'atk' || !P.alive || C.cds.atk > 0) return;
    const w = G.eqItem('w'), wt = G.WTYPES[w ? w.t : 'fist'];
    C.cds.atk = wt.spd; const tg = nearestEnemy(7); if (tg) P.faceTo(tg.x, tg.z);
    P.atkDur = Math.max(0.24, wt.spd * 0.8); P.atkT = 0;
    C.pend.push({ t: P.atkDur * 0.4, f: () => { hitArea(wt.range, wt.cone, 1, wt.stun || 0); showArc(0.25, wt.range / 3); } });
  };
  function hitAt(x, z, r, mult, stun, ex) {
    let n = 0;
    for (const m of G.mobs.list) { if (!m.alive || (ex && ex.has(m))) continue; if (Math.hypot(m.x - x, m.z - z) > r + m.rad) continue; damage(m, mult, stun); if (ex) ex.add(m); n++; }
    return n;
  }
  const add = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  C.addFx = function (m, dur, kind) { C.vfx.push({ m, t: 0, dur, kind, o: m.material.opacity }); };
  function disc(x, z, r, col, dur) { const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.12, r, 40).rotateX(-Math.PI / 2), add(col, 0.65)); m.position.set(x, G.world.groundAt(x, z) + 0.15, z); scene.add(m); C.addFx(m, dur, 'disc'); }
  C.cast = function (i) {
    const S = G.S, id = S.slots[i]; if (!P.alive) return;
    if (!id) { G.ui.toast((i + 1) + '번 스킬 칸이 비어 있습니다 (가방 → 스킬)'); return; }
    const s = SK[id]; if (!s || C.cds[id] > 0) return;
    if (S.mp < s.mp) { G.ui.toast('마나가 부족합니다'); return; }
    S.mp -= s.mp; C.cds[id] = s.cd;
    const far = s.type === 'bolt' || s.type === 'charge' || s.type === 'leap', tg = nearestEnemy(far ? 18 : 8); if (tg) P.faceTo(tg.x, tg.z);
    const fx = Math.sin(P.facing), fz = Math.cos(P.facing), col = s.col, st = s.stun || 0;
    G.ui.dmgText(P.pos.x, P.pos.y + 2.7, P.pos.z, s.name, 'sk');
    switch (s.type) {
      case 'smash': P.atkDur = 0.55; P.atkT = 0; C.pend.push({ t: 0.28, f: () => { hitArea(s.r, s.cone || 90, s.mult, st); showArc(0.4, s.r / 3); disc(P.pos.x + fx * s.r * 0.5, P.pos.z + fz * s.r * 0.5, s.r * 0.6, col, 0.45); G.ui.shake(0.15); } }); break;
      case 'spin': P.spinT = 0; P.atkDur = 0.45; P.atkT = 0.35; C.pend.push({ t: 0.12, f: () => { hitArea(s.r, 360, s.mult, st); disc(P.pos.x, P.pos.z, s.r, col, 0.4); } }); break;
      case 'charge': { P.dashV = 38; P.dashT = (s.dist || 10) / 38; P.isDash = false; P.dashDir.set(fx, 0, fz); P.atkDur = 0.3; P.atkT = 0.35; const hit = new Set(), n = Math.ceil(P.dashT / 0.04) + 1; for (let k = 1; k <= n; k++) C.pend.push({ t: k * 0.04, f: () => hitArea(2.6, 360, s.mult, st || 0.3, hit) }); break; }
      case 'leap': { let dx = fx * (s.dist || 9), dz = fz * (s.dist || 9); if (tg) { dx = tg.x - P.pos.x; dz = tg.z - P.pos.z; } let l = Math.hypot(dx, dz); const mx = s.dist || 9; if (l > mx) { dx *= mx / l; dz *= mx / l; l = mx; } P.vel.y = 9; P.onGround = false; if (l > 0.5) { P.dashDir.set(dx / l, 0, dz / l); P.dashV = l / 0.45; P.dashT = 0.45; P.isDash = false; } P.atkDur = 0.5; P.atkT = 0; C.pend.push({ t: 0.5, f: () => { hitArea(s.r, 360, s.mult, st || 0.8); disc(P.pos.x, P.pos.z, s.r, col, 0.55); G.ui.shake(0.3); } }); break; }
      case 'nova': P.atkDur = 0.6; P.atkT = 0; C.pend.push({ t: s.delay || 0.35, f: () => { hitArea(s.r, 360, s.mult, st); disc(P.pos.x, P.pos.z, s.r, col, 0.6); G.ui.shake(0.25); } }); break;
      case 'bolt': { P.atkDur = 0.35; P.atkT = 0.3; const sz = s.size || 0.35, m = new THREE.Mesh(new THREE.SphereGeometry(sz, 12, 8), add(col, 0.95)); m.position.set(P.pos.x + fx, P.pos.y + 1.3, P.pos.z + fz); scene.add(m); C.proj.push({ m, s, dx: fx, dz: fz, left: s.len || 18, hit: new Set(), sz }); break; }
      case 'multi': { const n = s.n || 4; for (let k = 0; k < n; k++) C.pend.push({ t: 0.06 + k * 0.12, f: () => { P.atkT = 0; P.atkDur = 0.14; hitArea(s.r || 3.2, s.cone || 120, s.mult / n * 1.3, st); showArc(0.12, (s.r || 3.2) / 3); } }); break; }
      case 'dot': { const f = s.front || 0, x = P.pos.x + fx * f, z = P.pos.z + fz * f, tk = s.ticks || 6, m = new THREE.Mesh(new THREE.CircleGeometry(s.r, 40).rotateX(-Math.PI / 2), add(col, 0.35)); m.position.set(x, G.world.groundAt(x, z) + 0.12, z); scene.add(m); C.zones.push({ m, x, z, r: s.r, left: tk, iv: 0.5, t: 0.1, mult: s.mult / tk * 1.7 }); if (s.burst) hitAt(x, z, s.r, s.mult * 0.5, 1); P.atkDur = 0.5; P.atkT = 0; break; }
      case 'buff': C.buffT = s.dur; C.buffM = 1 + s.atkUp; disc(P.pos.x, P.pos.z, 2.2, col, 0.8); G.ui.toast(s.name + ': 공격력 +' + Math.round(s.atkUp * 100) + '% (' + s.dur + '초)'); break;
      case 'heal': { const mh = G.stats().maxHp, v = Math.round(mh * s.pct); S.hp = Math.min(mh, S.hp + v); disc(P.pos.x, P.pos.z, 2, col, 0.7); G.ui.dmgText(P.pos.x, P.pos.y + 2.2, P.pos.z, '+' + v, 'heal'); break; }
    }
  };
  function tickFx(dt) {
    if (C.buffT > 0) C.buffT -= dt;
    for (let i = C.vfx.length - 1; i >= 0; i--) { const f = C.vfx[i]; f.t += dt; const k = f.t / f.dur; f.m.material.opacity = f.o * (1 - k); if (f.kind === 'disc') f.m.scale.setScalar(0.6 + k * 0.5); else f.m.scale.setScalar(1 + k * 1.5); if (k >= 1) { scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); C.vfx.splice(i, 1); } }
    for (let i = C.proj.length - 1; i >= 0; i--) {
      const p = C.proj[i], mv = Math.min(p.left, dt * 32); p.m.position.x += p.dx * mv; p.m.position.z += p.dz * mv; p.left -= mv; let end = p.left <= 0;
      for (const m of G.mobs.list) { if (!m.alive || p.hit.has(m)) continue; if (Math.hypot(m.x - p.m.position.x, m.z - p.m.position.z) < m.rad + p.sz + 0.4) { p.hit.add(m); damage(m, p.s.mult, p.s.stun || 0); if (p.s.dot) C.zones.push({ m: null, mob: m, left: 4, iv: 0.5, t: 0.5, mult: p.s.mult * 0.15 }); if (!p.s.pierce) { end = true; break; } } }
      if (end) { if (p.s.boom) { hitAt(p.m.position.x, p.m.position.z, p.s.boom, p.s.mult * 0.6, 0, p.hit); disc(p.m.position.x, p.m.position.z, p.s.boom, p.s.col, 0.45); } scene.remove(p.m); p.m.geometry.dispose(); C.proj.splice(i, 1); }
    }
    for (let i = C.zones.length - 1; i >= 0; i--) {
      const z = C.zones[i]; z.t -= dt;
      if (z.t <= 0) { z.t = z.iv; z.left--; if (z.mob) { if (z.mob.alive) damage(z.mob, z.mult, 0); } else hitAt(z.x, z.z, z.r, z.mult, 0); }
      if (z.m) { z.m.material.opacity = 0.2 + Math.sin(performance.now() / 120) * 0.08; z.m.rotation.y += dt; }
      if (z.left <= 0 || (z.mob && !z.mob.alive)) { if (z.m) { scene.remove(z.m); z.m.geometry.dispose(); } C.zones.splice(i, 1); }
    }
  }
  function showArc(t, s) { C.arc.position.set(P.pos.x, P.pos.y + 1.1, P.pos.z); C.arc.rotation.y = P.facing; C.arc.scale.setScalar(s || 1); arcMat.opacity = 0.75; C.arcT = t; }
  function showRing() { C.ring.position.set(P.pos.x, P.pos.y + 0.9, P.pos.z); C.ring.material.opacity = 0.7; C.ringT = 0.35; }
  C.gainXp = function (x) { gainXp(x); };
  C.hurtPlayer = function (raw, src) {
    const S = G.S; if (!P.alive) return;
    if (P.inv > 0 || P.blinkT > 0) return;
    const dmg = Math.max(1, Math.round(raw * 150 / (150 + G.stats().def)));
    const ar = G.eqItem('a'); if (ar && ar.dur > 0 && Math.random() < 0.5) { ar.dur--; if (ar.dur === 0) { G.ui.toast('갑옷이 파손되어 효과가 사라졌습니다. 불꽃 화산지대 대장장이에게 수리하세요'); } }
    S.hp -= dmg; S.lastHurt = performance.now();
    G.ui.dmgText(P.pos.x, P.pos.y + 2.1, P.pos.z, dmg, 'me'); G.ui.hurtFlash();
    if (S.hp <= 0) { S.hp = 0; P.alive = false; const lost = Math.floor(S.gold * 0.03); S.gold -= lost; G.ui.dead(src, lost); }
  };
  C.revive = function () { const st = G.stats(); G.S.hp = st.maxHp; G.S.mp = st.maxMp; P.alive = true; G.warpTo(0, 14); };
  C.update = function (dt, I) {
    const S = G.S, st = G.stats();
    for (const k in C.cds) C.cds[k] = Math.max(0, C.cds[k] - dt);
    for (let i = C.pend.length - 1; i >= 0; i--) { const p = C.pend[i]; p.t -= dt; if (p.t <= 0) { C.pend.splice(i, 1); if (P.alive) p.f(); } }
    if (P.alive) {
      if (I.atk) C.tryUse('atk');
      for (const a of I.queue) { if (a === 'atk' || a === 'tap') C.tryUse('atk'); else if (a === 'dash') P.dash(); else if (a[0] === 's' && a.length === 2) C.cast(+a[1]); else if (a === 'f') G.interact(); }
      const idle = performance.now() - (S.lastHurt || 0) > 5000;
      S.hp = Math.min(st.maxHp, S.hp + st.maxHp * dt * (idle ? 0.025 : 0.002));
      S.mp = Math.min(st.maxMp, S.mp + st.maxMp * dt * 0.02);
    }
    I.queue.length = 0;
    tickFx(dt);
    if (C.arcT > 0) { C.arcT -= dt; arcMat.opacity = Math.max(0, C.arcT * 3); }
    if (C.ringT > 0) { C.ringT -= dt; C.ring.material.opacity = Math.max(0, C.ringT * 2); C.ring.rotation.y += dt * 12; }
    for (let i = C.fx.length - 1; i >= 0; i--) { const f = C.fx[i]; f.t += dt; f.m.position.set(P.pos.x, P.pos.y + 3, P.pos.z); f.m.scale.set(1 + f.t, 1, 1 + f.t); f.m.material.opacity = 0.6 * (1 - f.t); if (f.t >= 1) { scene.remove(f.m); C.fx.splice(i, 1); } }
    for (let i = C.drops.length - 1; i >= 0; i--) {
      const d = C.drops[i], m = d.mesh; d.t += dt; m.rotation.y += dt * 4;
      if (d.t < 0.7) { d.vy -= 14 * dt; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt; const g = G.world.groundAt(m.position.x, m.position.z) + 0.3; if (m.position.y < g) { m.position.y = g; d.vy *= -0.3; } }
      else { const tx = P.pos.x - m.position.x, ty = P.pos.y + 1 - m.position.y, tz = P.pos.z - m.position.z, l = Math.hypot(tx, ty, tz), sp = Math.min(l, dt * (8 + d.t * 20)); m.position.x += tx / l * sp; m.position.y += ty / l * sp; m.position.z += tz / l * sp;
        if (l < 0.6) { scene.remove(m); m.material.dispose(); C.drops.splice(i, 1); if (d.item) G.items.add(d.item); else { S.mats[d.name] = (S.mats[d.name] || 0) + d.n; G.ui.loot(d.name, d.n); } } }
    }
  };
})();

(function () {
  const $ = id => document.getElementById(id);
  const U = G.ui = { open: null, dmg: [], shakeT: 0 };
  let mapImg, cam, lastBiome = '', zoneT = 0;
  const MAPN = 256, CELL = 100, GN = 60;
  U.init = function (camera) {
    cam = camera;
    const R = G.WORLD_R, c = document.createElement('canvas'); c.width = c.height = MAPN; const x = c.getContext('2d'), im = x.createImageData(MAPN, MAPN);
    for (let j = 0; j < MAPN; j++) for (let i = 0; i < MAPN; i++) {
      const wx = -R + (i + 0.5) / MAPN * 2 * R, wz = -R + (j + 0.5) / MAPN * 2 * R, h = G.terrain.heightAt(wx, wz), k = (j * MAPN + i) * 4;
      let col;
      if (h < 0) { const dd = Math.max(0.35, 1 + h / 60); col = [40 * dd, 100 * dd, 150 * dd]; }
      else { const b = G.BIOMES[G.terrain.biomeAt(wx, wz)].map, sh = 0.8 + Math.min(0.5, h / 260); col = h > 125 ? [235, 238, 242] : [b[0] * sh, b[1] * sh, b[2] * sh]; if (h < 2) col = [200, 185, 140]; }
      im.data[k] = col[0]; im.data[k + 1] = col[1]; im.data[k + 2] = col[2]; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); mapImg = c;
    $('pclose').onclick = U.close;
    $('btnBag').onclick = () => U.toggle('bag'); $('btnMap').onclick = () => U.toggle('map'); $('btnOpt').onclick = () => U.toggle('opt'); $('btnRank').onclick = () => U.toggle('rank');
    $('btnRevive').onclick = () => { $('dead').classList.add('hidden'); G.combat.revive(); };
    if (G.mobile) document.body.classList.add('touch');
  };
  U.log = function (h) { const el = document.createElement('div'); el.innerHTML = h; const L = $('log'); L.appendChild(el); while (L.children.length > 6) L.removeChild(L.firstChild); setTimeout(() => el.classList.add('fade'), 6000); setTimeout(() => el.remove(), 7000); };
  U.toast = function (t, cls) { const el = $('toast'); el.textContent = t; el.className = 'show ' + (cls || ''); clearTimeout(U.tt); U.tt = setTimeout(() => el.className = '', 2200); };
  U.loot = function (name, n) { U.log('<span class="loot">+ ' + name + ' x' + n + '</span>'); };
  U.shake = t => { U.shakeT = Math.max(U.shakeT, t); };
  U.hurtFlash = () => { const v = $('vignette'); v.classList.remove('hit'); void v.offsetWidth; v.classList.add('hit'); };
  U.dead = function (src, lost) { $('deadmsg').textContent = (src || '몬스터') + '에게 쓰러졌습니다. 골드 ' + lost.toLocaleString() + ' 손실'; $('dead').classList.remove('hidden'); };
  U.dmgText = function (x, y, z, n, cls) {
    const el = document.createElement('div'); el.className = 'dn ' + cls; el.textContent = (cls === 'crit' ? n.toLocaleString() + '!' : n.toLocaleString());
    $('dmg').appendChild(el); U.dmg.push({ el, p: new THREE.Vector3(x + (Math.random() - 0.5) * 0.6, y, z), t: 0 });
  };
  const v3 = new THREE.Vector3();
  U.close = function () { $('panel').classList.add('hidden'); U.open = null; };
  U.render = function () { if (U.open) render(); };
  U.toggle = function (w, tab) { if (tab) U.bagTab = tab; if (U.open === w && !tab) return U.close(); U.open = w; $('panel').classList.remove('hidden'); render(); };
  function render() {
    const b = $('pbody'), S = G.S, st = G.stats();
    if (U.open === 'bag') {
      $('ptitle').textContent = '가방'; G.bag.render(b);
    } else if (U.open === 'rank') {
      $('ptitle').textContent = '랭킹 (레벨순 TOP 50)'; G.account.rank(b);
    } else if (U.open === 'map') {
      $('ptitle').textContent = '세계 지도 · 워프';
      b.innerHTML = '<canvas id="bigmap" width="640" height="640"></canvas><p class="dim small">노란 화살표 = 내 위치 · 마름모 = 마을 워프석(파랑: 가 본 마을, 회색: 아직 안 가 본 마을) · 보라 별 = 스킬 스승 · 주황 점 = 대장장이 · 붉은 표시 = 필드 보스<br>워프는 마을 워프석 근처에서만 할 수 있고, 한 번 가 본 마을로만 이동됩니다.</p><div id="wplist"></div>';
      drawBigMap(); const cv = $('bigmap');
      cv.onclick = e => { const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * 640, my = (e.clientY - r.top) / r.height * 640; let best = null, bd = 22; for (const w of G.terrain.waypoints) { if (!S.wps.includes(w.id)) continue; const p = toMap(w.x, w.z, 640), d = Math.hypot(p[0] - mx, p[1] - my); if (d < bd) { bd = d; best = w; } } if (best) warpAsk(best); };
      $('wplist').innerHTML = S.wps.map(id => G.terrain.waypoints[id]).filter(Boolean).map(w => '<button class="wpb" data-id="' + w.id + '">' + esc(w.name) + ' <small>Lv.' + G.terrain.levelAt(w.x, w.z) + '</small></button>').join('');
      document.querySelectorAll('.wpb').forEach(bt => bt.onclick = () => warpAsk(G.terrain.waypoints[+bt.dataset.id]));
    } else if (U.open === 'npc') { G.npc.render(b);
    } else if (U.open === 'opt') {
      $('ptitle').textContent = '설정';
      const q = G.S.quality;
      b.innerHTML = '<h4>그래픽 품질</h4><div class="seg">' + [['low', '낮음'], ['mid', '보통'], ['high', '높음']].map(a => '<button data-q="' + a[0] + '" class="' + (q === a[0] ? 'sel' : '') + '">' + a[1] + '</button>').join('') + '</div><p class="dim small">휴대폰이 느리거나 뜨거우면 낮음으로 바꾸세요. 높음은 시야가 멀고 풀과 그림자가 더 많습니다.</p>' +
        '<h4>캐릭터 이름</h4><div class="row"><input id="nm" maxlength="12" value="' + esc(S.name) + '"><button id="nmok">저장</button></div>' +
        '<h4>조작법</h4><p class="small">PC: WASD 이동 · Shift 대쉬 · Space 점프 · 클릭/J 공격(누르고 있으면 연속) · Q/E/R(또는 1/2/3) 스킬 3칸 · F 상호작용 · I 가방 · K 스킬 · M 지도 · 드래그 시점 · 휠 줌<br>모바일: 왼쪽 조이스틱 이동 · 화면 드래그 시점 · 두 손가락 줌 · 오른쪽 버튼(공격·대쉬·점프·스킬 3칸)</p>' +
        G.account.optHTML() + '<h4>데이터</h4><button id="rst" class="danger">처음부터 다시 시작</button><p class="dim small">버전 ' + G.VERSION + ' · 다른 플레이어와 같이 노는 온라인은 다음 단계에서 연결됩니다.</p>';
      document.querySelectorAll('[data-q]').forEach(bt => bt.onclick = () => { G.S.quality = bt.dataset.q; G.applyQuality(); render(); });
      $('nmok').onclick = () => { const v = $('nm').value.trim(); if (v) { G.S.name = v; G.save(); U.toast('이름을 저장했습니다'); } };
      $('rst').onclick = async () => { if (!confirm('정말 모든 진행을 지우고 처음부터 시작할까요?')) return; const fin = () => { G.noSave = true; localStorage.removeItem('elysion_save'); location.reload(); }; if (!G.account.guest) { G.loadState({ name: G.S.name }); await G.account.push(true); } fin(); };
      G.account.bindOpt(render);
    }
  }
  function warpAsk(w) { if (!G.npc.atWarp()) { U.toast('워프는 마을 워프석 근처에서만 할 수 있습니다'); return; } if (confirm(w.name + '(으)로 워프할까요?')) { U.close(); G.warpTo(w.x, w.z + (w.id === 0 ? 18 : 4)); } }
  function toMap(x, z, n) { const R = G.WORLD_R; return [(x + R) / (2 * R) * n, (z + R) / (2 * R) * n]; }
  function drawBigMap() {
    const cv = $('bigmap'); if (!cv) return; const x = cv.getContext('2d'), n = 640, S = G.S;
    x.imageSmoothingEnabled = true; x.drawImage(mapImg, 0, 0, n, n);
    x.fillStyle = 'rgba(8,12,20,0.88)'; const cs = n / GN;
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) if (false) x.fillRect(i * cs - 0.5, j * cs - 0.5, cs + 1, cs + 1);
    G.terrain.bosses.forEach(b => { const ci = Math.floor((b.x + G.WORLD_R) / CELL), cj = Math.floor((b.z + G.WORLD_R) / CELL);  const p = toMap(b.x, b.z, n); x.fillStyle = '#ff4d3a'; x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText(b.name + ' Lv.' + b.level, p[0], p[1] - 11); });
    for (const w of G.terrain.waypoints) {
      const on = S.wps.includes(w.id), ci = Math.floor((w.x + G.WORLD_R) / CELL), cj = Math.floor((w.z + G.WORLD_R) / CELL);
       const p = toMap(w.x, w.z, n);
      x.save(); x.translate(p[0], p[1]); x.rotate(Math.PI / 4); x.fillStyle = on ? '#4fd8ff' : '#777'; x.strokeStyle = '#000'; x.lineWidth = 2; x.fillRect(-6, -6, 12, 12); x.strokeRect(-6, -6, 12, 12); x.restore();
      { x.fillStyle = on ? '#e8f6ff' : '#9aa4ae'; x.font = '11px sans-serif'; x.textAlign = 'center'; x.fillText(w.name, p[0], p[1] + 19); }
    }
    G.npc.drawMap(x, toMap, n); const pp = toMap(G.player.pos.x, G.player.pos.z, n); arrow(x, pp[0], pp[1], G.player.facing, 9);
  }
  function arrow(x, px, py, f, s) { x.save(); x.translate(px, py); x.rotate(-f + Math.PI); x.fillStyle = '#ffd34d'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -s); x.lineTo(s * 0.7, s * 0.8); x.lineTo(0, s * 0.35); x.lineTo(-s * 0.7, s * 0.8); x.closePath(); x.fill(); x.stroke(); x.restore(); }
  function minimap() {
    const cv = $('minimap'), x = cv.getContext('2d'), n = cv.width, P = G.player.pos, R = G.WORLD_R, span = 520;
    const sx = (P.x - span / 2 + R) / (2 * R) * MAPN, sz = (P.z - span / 2 + R) / (2 * R) * MAPN, sw = span / (2 * R) * MAPN;
    x.save(); x.beginPath(); x.arc(n / 2, n / 2, n / 2 - 2, 0, 7); x.clip();
    x.fillStyle = '#123'; x.fillRect(0, 0, n, n); x.imageSmoothingEnabled = true; x.drawImage(mapImg, sx, sz, sw, sw, 0, 0, n, n);
    const k = n / span;
    for (const o of G.world.obelisks) { const dx = (o.x - P.x) * k + n / 2, dz = (o.z - P.z) * k + n / 2; if (dx < 0 || dz < 0 || dx > n || dz > n) continue; x.fillStyle = G.S.wps.includes(o.wp.id) ? '#4fd8ff' : '#aaa'; x.fillRect(dx - 3, dz - 3, 6, 6); }
    for (const m of G.mobs.list) { if (!m.alive) continue; const dx = (m.x - P.x) * k + n / 2, dz = (m.z - P.z) * k + n / 2; if (dx < 0 || dz < 0 || dx > n || dz > n) continue; x.fillStyle = m.boss ? '#ff3b2f' : m.d.passive ? '#fff' : '#ff8a6a'; x.beginPath(); x.arc(dx, dz, m.boss ? 5 : 2.2, 0, 7); x.fill(); }
    arrow(x, n / 2, n / 2, G.player.facing, 7);
    x.restore(); x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2; x.beginPath(); x.arc(n / 2, n / 2, n / 2 - 2, 0, 7); x.stroke();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  let mmT = 0;
  U.update = function (dt, biome) {
    const S = G.S, st = G.stats();
    $('plv').textContent = 'Lv.' + S.level; $('pnm').textContent = S.name;
    $('hpbar').style.width = (S.hp / st.maxHp * 100) + '%'; $('hptxt').textContent = Math.ceil(S.hp) + ' / ' + st.maxHp;
    $('mpbar').style.width = (S.mp / st.maxMp * 100) + '%'; $('mptxt').textContent = Math.floor(S.mp) + ' / ' + st.maxMp;
    $('stbar').style.width = (100 - Math.max(0, G.player.dashCd) / G.player.DASH_CD * 100) + '%';
    const need = G.combat.need(S.level), xr = S.level >= G.MAX_LEVEL ? 1 : S.xp / need;
    $('xpbar').style.width = (xr * 100) + '%'; $('xptxt').textContent = S.level >= G.MAX_LEVEL ? 'MAX LEVEL' : 'EXP ' + (xr * 100).toFixed(2) + '%';
    const hh = Math.floor(S.time), mm = Math.floor((S.time - hh) * 60); $('clock').textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + (G.world.weather === 'rain' ? ' · 비' : G.world.weather === 'snow' ? ' · 눈' : '');
    $('gold').textContent = S.gold.toLocaleString() + ' G';
    if (biome !== lastBiome) { lastBiome = biome; $('zonename').textContent = G.BIOMES[biome].name; const zb = $('zonebig'); zb.innerHTML = G.BIOMES[biome].name + '<small>권장 Lv.' + G.terrain.levelAt(G.player.pos.x, G.player.pos.z) + '</small>'; zb.classList.remove('show'); void zb.offsetWidth; zb.classList.add('show'); }
    const C = G.combat, P = G.player;
    for (let k = 0; k < 3; k++) { const el = document.querySelector('[data-act="s' + k + '"]'); if (!el) continue; const id = S.slots[k], s = id && G.SKILLS[id];
      if (el.dataset.sid !== (id || '')) { el.dataset.sid = id || ''; el.querySelector('b').textContent = s ? s.icon : '+'; el.querySelector('em').textContent = s ? s.name : '빈 칸'; el.style.borderColor = s ? G.GRADES[s.tier - 1].c : ''; }
      el.style.setProperty('--cd', s ? ((C.cds[id] || 0) / s.cd * 100) + '%' : '0%'); el.classList.toggle('locked', !s); el.classList.toggle('nomp', !!s && S.mp < s.mp); }
    const da = document.querySelector('[data-act="dash"]'); if (da) { da.style.setProperty('--cd', (Math.max(0, P.dashCd) / P.DASH_CD * 100) + '%'); const bl = (S.dashN || 0) >= P.BLINK_N; if (da.dataset.bl !== String(bl)) { da.dataset.bl = String(bl); da.querySelector('em').textContent = bl ? '블링크' : '대쉬'; da.querySelector('b').textContent = bl ? '✧' : '➤'; } }
    const fb = $('actF'); if (fb) { let near = false; for (const o of G.world.obelisks) if (Math.hypot(o.x - P.pos.x, o.z - P.pos.z) < 7) near = true; if (G.npc && G.npc.nearest(5)) near = true; fb.classList.toggle('hidden', !near); }
    const t = G.combat.target, tf = $('target');
    if (t && t.alive && Math.hypot(t.x - G.player.pos.x, t.z - G.player.pos.z) < 40) { tf.classList.remove('hidden'); $('tname').textContent = 'Lv.' + t.level + ' ' + t.name; $('tbar').style.width = (t.hp / t.maxHp * 100) + '%'; $('thp').textContent = Math.ceil(t.hp).toLocaleString() + ' / ' + t.maxHp.toLocaleString(); tf.classList.toggle('boss', t.boss); } else tf.classList.add('hidden');
    mmT -= dt; if (mmT <= 0) { mmT = 0.1; minimap(); if (U.open === 'map') drawBigMap(); }
    const w = innerWidth, h = innerHeight;
    for (let i = U.dmg.length - 1; i >= 0; i--) {
      const d = U.dmg[i]; d.t += dt; d.p.y += dt * 1.4; v3.copy(d.p).project(cam);
      if (d.t > 1 || v3.z > 1) { d.el.remove(); U.dmg.splice(i, 1); continue; }
      d.el.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * w) + 'px,' + ((-v3.y * 0.5 + 0.5) * h) + 'px) translate(-50%,-50%) scale(' + (d.t < 0.12 ? 1.5 - d.t * 4 : 1) + ')'; d.el.style.opacity = d.t > 0.7 ? (1 - d.t) / 0.3 : 1;
    }
    if (U.shakeT > 0) { U.shakeT -= dt; cam.position.x += (Math.random() - 0.5) * U.shakeT * 0.8; cam.position.y += (Math.random() - 0.5) * U.shakeT * 0.8; }
  };
})();

(function () {
  const $ = id => document.getElementById(id);
  const A = G.account = { sess: null, id: '', guest: true, last: 0, busy: false, err: '', cloudOff: false };
  const URL_ = G.SUPABASE_URL, KEY = G.SUPABASE_KEY, SK = 'elysion_auth';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mail = id => id + '@elysion-rpg.app';
  function tr(e) {
    const m = String(e.message || ''), c = e.code || '';
    if (c === 'PGRST205' || c === '42P01') return '서버에 게임 표가 아직 없습니다. supabase_setup.sql 을 SQL Editor 에서 실행해야 합니다.';
    if (/invalid login/i.test(m)) return '아이디 또는 비밀번호가 틀렸습니다.';
    if (/already registered|already been registered|user_already_exists/i.test(m + c)) return '이미 사용 중인 아이디입니다.';
    if (/password/i.test(m) && /(short|least|weak)/i.test(m)) return '비밀번호는 6자 이상이어야 합니다.';
    if (e.status === 429 || /rate limit/i.test(m)) return '요청이 너무 많습니다. 잠시 뒤에 다시 해 주세요.';
    return m;
  }
  async function req(path, method, body, auth, extra, keep) {
    const h = { apikey: KEY, 'Content-Type': 'application/json' };
    if (auth && A.sess) h.Authorization = 'Bearer ' + A.sess.access_token;
    if (extra) Object.assign(h, extra);
    let r;
    try { r = await fetch(URL_ + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, keepalive: !!keep }); }
    catch (e) { const x = new Error('인터넷에 연결할 수 없습니다.'); x.offline = true; throw x; }
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
    if (!r.ok) { const x = new Error((j && (j.msg || j.message || j.error_description || j.error)) || ('오류 ' + r.status)); x.status = r.status; x.code = j && (j.code || j.error_code); throw x; }
    return j;
  }
  function setSess(j) {
    const uid = j.user && j.user.id || (A.sess && A.sess.uid), em = j.user && j.user.email || '';
    A.sess = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || (Math.floor(Date.now() / 1000) + (j.expires_in || 3600)), uid: uid, id: em ? em.split('@')[0] : (A.sess && A.sess.id) || '' };
    A.id = A.sess.id; A.guest = false;
    try { localStorage.setItem(SK, JSON.stringify(A.sess)); } catch (e) {}
  }
  async function ensure(force) {
    if (!A.sess) throw new Error('로그인이 필요합니다.');
    if (!force && A.sess.expires_at - Date.now() / 1000 > 60) return;
    const j = await req('/auth/v1/token?grant_type=refresh_token', 'POST', { refresh_token: A.sess.refresh_token }, false);
    setSess(j);
  }
  const okId = s => /^[a-z0-9_]{3,16}$/.test(s);
  A.signup = async function (id, pw) {
    const j = await req('/auth/v1/signup', 'POST', { email: mail(id), password: pw }, false);
    if (!j || !j.access_token) throw new Error('이메일 인증이 켜져 있어 가입할 수 없습니다. Supabase 에서 Confirm email 을 꺼 주세요.');
    setSess(j);
  };
  A.login = async function (id, pw) { setSess(await req('/auth/v1/token?grant_type=password', 'POST', { email: mail(id), password: pw }, false)); };
  async function pullCloud() {
    try {
      const rows = await req('/rest/v1/elysion_saves?select=data&user_id=eq.' + A.sess.uid, 'GET', null, true);
      A.cloudOff = false; return rows && rows[0] && rows[0].data || null;
    } catch (e) { if (e.offline || e.code === 'PGRST205' || e.status === 404) { A.cloudOff = true; A.err = tr(e); return null; } throw e; }
  }
  A.push = async function (force, keep) {
    if (!A.sess || A.busy || A.cloudOff && !force) return false;
    const now = Date.now(); if (!force && now - A.last < 30000) return false;
    A.busy = true;
    try {
      await ensure(false);
      const S = G.S, uid = A.sess.uid, ts = new Date().toISOString(), data = JSON.parse(JSON.stringify(S));
      const pr = { Prefer: 'resolution=merge-duplicates,return=minimal' };
      await req('/rest/v1/elysion_saves?on_conflict=user_id', 'POST', { user_id: uid, data: data, updated_at: ts }, true, pr, keep);
      await req('/rest/v1/elysion_players?on_conflict=user_id', 'POST', { user_id: uid, username: A.id, name: String(S.name || '모험가').slice(0, 12), level: Math.max(1, Math.min(200, Math.floor(S.level) || 1)), kills: Math.max(0, Math.floor(S.kills) || 0), gold: Math.max(0, Math.floor(S.gold) || 0), updated_at: ts }, true, pr, keep);
      A.last = Date.now(); A.err = ''; A.cloudOff = false; return true;
    } catch (e) { A.err = tr(e); if (e.code === 'PGRST205' || e.status === 404) A.cloudOff = true; return false; }
    finally { A.busy = false; }
  };
  A.optHTML = function () {
    if (A.guest) return '<h4>계정</h4><p class="small">게스트 상태입니다. 진행이 이 기기에만 저장되고 랭킹에 오르지 않습니다.</p><button id="acLogin" class="danger" style="background:rgba(79,182,255,.2)">로그인 / 회원가입</button>';
    return '<h4>계정</h4><p class="small"><b>' + esc(A.id) + '</b> 으로 로그인됨 · 클라우드 저장 ' + (A.cloudOff ? '<span class="red">꺼짐 (서버 표 없음)</span>' : A.err ? '<span class="red">오류</span>' : '<span class="loot">정상</span>') + '</p>' +
      (A.err ? '<p class="small red">' + esc(A.err) + '</p>' : '') +
      '<div class="row"><button id="acSave">지금 저장</button><button id="acOut">로그아웃</button></div>';
  };
  A.bindOpt = function (rerender) {
    const l = $('acLogin'); if (l) l.onclick = () => { G.save(); location.reload(); };
    const s = $('acSave'); if (s) s.onclick = async () => { G.save(); const ok = await A.push(true); G.ui.toast(ok ? '클라우드에 저장했습니다' : '저장 실패: ' + A.err); rerender(); };
    const o = $('acOut'); if (o) o.onclick = async () => { G.save(); await A.push(true); G.noSave = true; try { localStorage.removeItem(SK); } catch (e) {} location.reload(); };
  };
  A.rank = async function (b) {
    b.innerHTML = '<p class="dim">랭킹을 불러오는 중...</p>';
    try {
      if (!A.guest) await A.push(true);
      const rows = await req('/rest/v1/elysion_players?select=username,name,level,kills,gold&order=level.desc,kills.desc,gold.desc&limit=50', 'GET', null, false);
      if (G.ui.open !== 'rank') return;
      if (!rows || !rows.length) { b.innerHTML = '<p class="dim">아직 랭킹에 오른 사람이 없습니다. 로그인하고 첫 번째가 되어 보세요!</p>'; return; }
      b.innerHTML = rows.map((r, i) => '<div class="rk' + (r.username === A.id && !A.guest ? ' me' : '') + '"><b class="n">' + (i + 1) + '</b><span class="nm">' + esc(r.name) + ' <small class="dim">@' + esc(r.username) + '</small></span><span>Lv.' + r.level + '</span><span class="dim">처치 ' + Number(r.kills).toLocaleString() + '</span></div>').join('') +
        (A.guest ? '<p class="dim small">게스트는 랭킹에 오르지 않습니다. 설정에서 로그인하세요.</p>' : '');
    } catch (e) { if (G.ui.open === 'rank') b.innerHTML = '<p class="red">랭킹을 불러오지 못했습니다.<br>' + esc(tr(e)) + '</p>'; }
  };
  A.gate = async function (start) {
    const box = $('auth'), msg = t => { $('auMsg').textContent = t || ''; };
    const o = G.save; G.save = function () { if (G.noSave) return; o(); A.push(false); };
    document.addEventListener('visibilitychange', () => { if (document.hidden) A.push(true, true); });
    addEventListener('pagehide', () => A.push(true, true));
    const go = () => { box.classList.add('hidden'); start(); };
    let s = null; try { s = JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) {}
    if (s && s.refresh_token) {
      A.sess = s; A.id = s.id || ''; A.guest = false;
      try { await ensure(true); const c = await pullCloud(); if (c) G.loadState(c); return go(); }
      catch (e) { if (e.offline) { G.ui && 0; return go(); } A.sess = null; A.guest = true; try { localStorage.removeItem(SK); } catch (x) {} }
    }
    box.classList.remove('hidden');
    let working = false;
    const run = async mode => {
      if (working) return; const id = $('auId').value.trim().toLowerCase(), pw = $('auPw').value;
      if (!okId(id)) return msg('아이디는 영문 소문자·숫자·_ 3~16자로 입력해 주세요.');
      if (pw.length < 6) return msg('비밀번호는 6자 이상이어야 합니다.');
      working = true; msg(mode === 'sign' ? '가입하는 중...' : '로그인하는 중...');
      try {
        if (mode === 'sign') {
          const lv = G.S.level > 1 || G.S.kills > 0;
          await A.signup(id, pw);
          if (lv && confirm('이 기기의 진행(Lv.' + G.S.level + ')을 새 계정으로 가져올까요?\n[취소]를 누르면 새로 시작합니다.')) { /* 현재 진행 유지 */ } else G.loadState({ name: id });
          if (G.S.name === '모험가') G.S.name = id.slice(0, 12);
          G.save(); await A.push(true);
        } else {
          await A.login(id, pw); const c = await pullCloud();
          if (c) G.loadState(c); else { G.save(); await A.push(true); }
        }
        working = false; go();
      } catch (e) { working = false; msg(tr(e)); }
    };
    $('auLogin').onclick = () => run('login'); $('auSign').onclick = () => run('sign');
    $('auGuest').onclick = () => { A.guest = true; go(); };
    $('auPw').addEventListener('keydown', e => { if (e.key === 'Enter') run('login'); });
  };
})();

(function () {
  const B = G.bag = {};
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gb = g => '<span class="gb" style="background:' + G.GRADES[g].c + '">' + G.GRADES[g].n + '</span>';
  function itemLine(it) {
    if (it.k === 'w') return G.WTYPES[it.t].n + ' · 공격력 +' + Math.round(G.items.watk(it)) + (it.plus ? ' · <b class="gold">+' + it.plus + '</b>' : '');
    if (it.k === 'a') return '방어 +' + it.def + ' · HP +' + it.hp + ' · 내구도 <span class="' + (it.dur === 0 ? 'red' : '') + '">' + it.dur + '/' + it.mdur + '</span>';
    const s = G.SKILLS[it.sk]; return G.skillDesc(s) + (G.S.skills.includes(it.sk) ? ' · <span class="red">이미 배움</span>' : '');
  }
  function eqCard(lab, it, none) {
    return '<div class="eqc"' + (it ? ' style="border-color:' + G.GRADES[it.g].c + '"' : '') + '><span class="dim">' + lab + '</span>' + (it ? '<b style="color:' + G.GRADES[it.g].c + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + '</b><small>' + itemLine(it) + '</small>' : '<b>' + none + '</b>') + '</div>';
  }
  function tabEquip() {
    const S = G.S, w = G.eqItem('w'), a = G.eqItem('a');
    const list = S.inv.slice().sort((x, y) => (y.id === S.eq.w || y.id === S.eq.a) - (x.id === S.eq.w || x.id === S.eq.a) || y.g - x.g || y.lv - x.lv);
    return '<div class="eqrow">' + eqCard('무기', w, '✊ 맨주먹') + eqCard('갑옷', a, '없음') + '</div>' +
      '<h4>인벤토리 <span class="dim small">' + S.inv.length + ' / ' + G.items.MAX + '</span></h4>' +
      (list.length ? list.map(it => { const on = it.id === S.eq.w || it.id === S.eq.a, low = it.k !== 'b' && S.level < it.lv;
        return '<div class="itm' + (on ? ' on' : '') + '">' + gb(it.g) + '<div class="in"><b style="color:' + G.GRADES[it.g].c + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + '</b><small>' + (it.k !== 'b' ? '<span class="' + (low ? 'red' : 'dim') + '">Lv.' + it.lv + '</span> · ' : '') + itemLine(it) + '</small></div>' +
          '<button data-eq="' + it.id + '">' + (it.k === 'b' ? '배우기' : on ? '해제' : '장착') + '</button><button class="x" data-del="' + it.id + '">버리기</button></div>'; }).join('')
        : '<p class="dim small">아직 아이템이 없습니다. 몬스터를 잡으면 낮은 확률로 무기·갑옷·스킬북이 떨어지고, 보스는 반드시 장비와 스킬북을 줍니다.</p>');
  }
  function tabSkill() {
    const S = G.S, P = G.player, n = Math.min(S.dashN || 0, P.BLINK_N), done = (S.dashN || 0) >= P.BLINK_N;
    let h = '<h4>장착 스킬 (3칸)</h4><div class="eqrow">' + [0, 1, 2].map(i => { const s = S.slots[i] && G.SKILLS[S.slots[i]];
      return '<div class="eqc"' + (s ? ' style="border-color:' + G.GRADES[s.tier - 1].c + '"' : '') + '><span class="dim">' + (i + 1) + '번 · ' + 'QER'[i] + '</span>' + (s ? '<b>' + s.icon + ' ' + esc(s.name) + '</b><button data-un="' + i + '">빼기</button>' : '<b class="dim">빈 칸</b>') + '</div>'; }).join('') + '</div>';
    h += '<h4>배운 스킬 <span class="dim small">' + S.skills.length + '개</span></h4>';
    h += S.skills.length ? S.skills.map(id => { const s = G.SKILLS[id]; if (!s) return ''; const at = S.slots.indexOf(id);
      return '<div class="itm">' + gb(s.tier - 1) + '<div class="in"><b>' + s.icon + ' ' + esc(s.name) + (at >= 0 ? ' <span class="loot small">[' + (at + 1) + '번 장착 중]</span>' : '') + '</b><small>' + G.skillDesc(s) + '</small></div>' + [0, 1, 2].map(k => '<button data-sl="' + id + '" data-to="' + k + '" class="' + (at === k ? 'sel' : '') + '">' + (k + 1) + '</button>').join('') + '</div>'; }).join('')
      : '<p class="dim small">아직 배운 스킬이 없습니다. 몬스터마다 쓰는 스킬이 다르고, 잡으면 낮은 확률(보스는 확정)로 그 스킬북이 떨어집니다.</p>';
    h += '<h4>' + (done ? '블링크 (마스터리 완료)' : '대쉬 마스터리') + '</h4><div class="gauge mast"><i style="width:' + (n / P.BLINK_N * 100) + '%"></i><span>' + n.toLocaleString() + ' / ' + P.BLINK_N.toLocaleString() + '</span></div>' +
      '<p class="dim small">' + (done ? '대쉬가 블링크로 바뀌었습니다. 0.11초 동안 사라졌다가 8m 앞에 나타나며 벽·나무·몬스터를 통과하고, 사라진 동안은 공격받지 않습니다.' : '대쉬를 쓸 때마다 1씩 오릅니다. 100,000번을 채우면 대쉬가 벽도 통과하는 블링크로 바뀝니다.') + '</p>';
    return h;
  }
  function tabChar() {
    const S = G.S, st = G.stats(), J = G.JOBS[S.job], t = S.tier || 0, nl = G.JOB_LV[t + 1];
    let h = '<div class="stats"><div><span>이름</span><b>' + esc(S.name) + '</b></div><div><span>직업</span><b' + (J && t ? ' style="color:' + J.c + '"' : '') + '>' + G.jobName(S) + '</b></div><div><span>레벨</span><b>' + S.level + ' / ' + G.MAX_LEVEL + '</b></div><div><span>공격력</span><b>' + Math.round(st.atk) + '</b></div><div><span>방어력</span><b>' + Math.round(st.def) + '</b></div><div><span>최대 HP</span><b>' + st.maxHp + '</b></div><div><span>최대 MP</span><b>' + st.maxMp + '</b></div><div><span>치명타</span><b>' + Math.round(st.crit * 100) + '%</b></div><div><span>골드</span><b class="gold">' + S.gold.toLocaleString() + '</b></div><div><span>처치 수</span><b>' + S.kills.toLocaleString() + '</b></div></div>';
    h += '<h4>전직</h4>';
    if (t >= 3) h += '<p class="small">최종 전직을 마쳤습니다.</p>';
    else if (t === 0) h += '<p class="small">Lv.' + nl + '에 1차 전직합니다. 직업마다 능력치와 모습이 달라집니다.' + (S.level < nl ? ' <span class="red">(지금 Lv.' + S.level + ')</span>' : '') + '</p><div class="jobs">' + Object.keys(G.JOBS).map(k => { const j = G.JOBS[k]; return '<div class="job" style="border-color:' + j.c + '"><b style="color:' + j.c + '">' + j.n[0] + '</b><small>' + j.desc + '<br>' + j.n[1] + ' → ' + j.n[2] + '</small><button data-job="' + k + '"' + (S.level < nl ? ' disabled' : '') + '>전직</button></div>'; }).join('') + '</div>';
    else h += '<p class="small">' + (t + 1) + '차 전직: <b style="color:' + J.c + '">' + J.n[t] + '</b> (Lv.' + nl + ')</p><button data-job="' + S.job + '" class="wpb"' + (S.level < nl ? ' disabled' : '') + '>' + (S.level < nl ? 'Lv.' + nl + '부터 가능' : J.n[t] + '(으)로 전직') + '</button>';
    h += '<p class="dim small">전직하면 캐릭터 모습이 그 직업 차수의 모습으로 바뀝니다. 캐릭터 선택 화면에서 미리 볼 수 있습니다.</p>';
    return h;
  }
  function tabMats() {
    const S = G.S, mats = Object.keys(S.mats).filter(k => S.mats[k] > 0).sort();
    return mats.length ? '<div class="mats">' + mats.map(k => '<div class="mat"><i></i><span>' + esc(k) + '</span><b>x' + S.mats[k].toLocaleString() + '</b></div>').join('') + '</div>' : '<p class="dim">아직 재료가 없습니다. 몬스터를 잡으면 반드시 부스러기가 떨어집니다.</p>';
  }
  B.render = function (b) {
    const tab = G.ui.bagTab || 'equip', T = [['equip', '장비'], ['skill', '스킬'], ['char', '캐릭터'], ['mats', '재료']];
    b.innerHTML = '<div class="seg tabs">' + T.map(x => '<button data-tab="' + x[0] + '" class="' + (tab === x[0] ? 'sel' : '') + '">' + x[1] + '</button>').join('') + '</div>' +
      (tab === 'skill' ? tabSkill() : tab === 'char' ? tabChar() : tab === 'mats' ? tabMats() : tabEquip());
    const S = G.S, R = () => G.ui.render(), q = s => b.querySelectorAll(s);
    q('[data-tab]').forEach(x => x.onclick = () => { G.ui.bagTab = x.dataset.tab; R(); });
    q('[data-eq]').forEach(x => x.onclick = () => { G.items.equip(+x.dataset.eq); R(); });
    q('[data-del]').forEach(x => x.onclick = () => { const it = G.items.find(+x.dataset.del); if (it && (it.g < 3 || confirm('[' + G.GRADES[it.g].n + '] ' + it.name + '을(를) 버릴까요? 되돌릴 수 없습니다.'))) { G.items.discard(it.id); R(); } });
    q('[data-un]').forEach(x => x.onclick = () => { S.slots[+x.dataset.un] = null; G.save(); R(); });
    q('[data-sl]').forEach(x => x.onclick = () => { const id = x.dataset.sl, to = +x.dataset.to, from = S.slots.indexOf(id); if (from >= 0) S.slots[from] = S.slots[to] === id ? null : S.slots[to]; S.slots[to] = from === to ? null : id; G.save(); R(); });
    q('[data-job]').forEach(x => x.onclick = () => { const k = x.dataset.job, t = (S.tier || 0) + 1; if (S.level < G.JOB_LV[t]) return; if (!confirm(G.JOBS[k].n[t - 1] + '(으)로 전직할까요?' + (t === 1 ? '\n직업은 나중에 바꿀 수 없습니다.' : ''))) return; S.job = k; S.tier = t; G.player.rebuild(); const st = G.stats(); S.hp = st.maxHp; S.mp = st.maxMp; G.ui.toast(G.JOBS[k].n[t - 1] + '(으)로 전직했습니다!', 'gold'); G.save(); R(); });
  };
})();

(function () {
  const N = G.npc = { list: [], cur: null, stock: {}, tab: '' };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gb = g => '<span class="gb" style="background:' + G.GRADES[g].c + '">' + G.GRADES[g].n + '</span>';
  const fmt = n => Math.round(n).toLocaleString();
  const PM = [1, 3, 9, 30, 120, 400, 1000], RATE = [1, 1, 1, 1, 1, 1, 0.7, 0.6, 0.5, 0.4, 0.3];
  N.price = it => it.k === 'b' ? G.SKILL_PRICE(G.SKILLS[it.sk].tier) : Math.round((60 + it.lv * 25) * PM[it.g] * (it.k === 'a' ? 0.9 : 1));
  N.sellPrice = it => Math.max(1, Math.floor(N.price(it) * 0.25 * (1 + (it.plus || 0) * 0.3)));
  N.rate = t => RATE[t]; N.breakP = t => t <= 5 ? 0 : t <= 7 ? 0.1 : 0.25;
  N.upCost = w => ({ s: Math.ceil(((w.plus || 0) + 1) * 4 * (1 + w.g * 0.5)), g: Math.round((80 + w.lv * 15) * ((w.plus || 0) + 1) * (1 + w.g * 0.6)) });
  N.scrapOut = w => 2 + w.g * 3 + (w.plus || 0) * 2 + Math.floor(w.lv / 15);
  N.repairCost = a => Math.ceil((a.mdur - a.dur) * (1 + a.lv * 0.15) * (1 + a.g * 0.5));
  N.scraps = () => { let t = 0; const m = G.S.mats; for (const k in m) if (/부스러기$/.test(k)) t += m[k]; return t; };
  function useScraps(n) { const m = G.S.mats, ks = Object.keys(m).filter(k => /부스러기$/.test(k) && m[k] > 0).sort((a, b) => m[b] - m[a]); for (const k of ks) { const u = Math.min(n, m[k]); m[k] -= u; n -= u; if (m[k] <= 0) delete m[k]; if (n <= 0) break; } }
  const QS = () => { const S = G.S; if (!S.qs || typeof S.qs !== 'object') S.qs = {}; return S.qs; };
  const mobName = k => { if (k.indexOf('B:') === 0) { const b = G.terrain.bosses.find(x => x.key === k.slice(2)); return b ? b.name : '필드 보스'; } const d = G.MOB_DEF && G.MOB_DEF[k]; return d ? d.name : k; };
  function qdef(id) { if (id.indexOf('tut') === 0) return G.TUT[+id.slice(3)]; const T = G.TEACH[id.slice(2)]; return T ? { t: G.SKILLS[T.sk].name + ' 전수 시험', kill: T.kill } : null; }
  function qDone(id) { const q = QS()[id], d = qdef(id); if (!q || q.st !== 1 || !d) return false; if (d.kill) for (const k in d.kill) if ((q.c[k] || 0) < d.kill[k]) return false; return !(d.cond && !d.cond(G.S)); }
  N.accept = id => { QS()[id] = { st: 1, c: {} }; track(true); G.save(); };
  N.onKill = function (m) {
    const key = m.boss ? 'B:' + m.key : m.key, qs = QS(); let ch = false;
    for (const id in qs) { const q = qs[id], d = q.st === 1 && qdef(id); if (!d || !d.kill || !d.kill[key] || (q.c[key] || 0) >= d.kill[key]) continue; q.c[key] = (q.c[key] || 0) + 1; ch = true; if (qDone(id)) G.ui.toast('퀘스트 완료: ' + d.t + ' · NPC에게 돌아가세요', 'gold'); }
    if (ch) track(true);
  };
  function lines(id, preview) {
    const d = qdef(id), q = preview ? { c: {} } : (QS()[id] || { c: {} });
    return '<div class="qlist">' + Object.keys(d.kill || {}).map(k => { const c = Math.min(q.c[k] || 0, d.kill[k]); return '<div class="qrow' + (c >= d.kill[k] ? ' ok' : '') + '"><span>' + esc(mobName(k)) + ' 처치</span><b>' + c + ' / ' + d.kill[k] + '</b></div>'; }).join('') +
      (d.cond ? '<div class="qrow' + (d.cond(G.S) ? ' ok' : '') + '"><span>' + esc(d.condT) + '</span><b>' + (d.cond(G.S) ? '완료' : '진행 중') + '</b></div>' : '') + '</div>';
  }
  let trackS = '', trackT = 0;
  function qrow(id) { const d = qdef(id), q = QS()[id], ok = qDone(id); let s = '';
    if (!ok) { if (d.kill) for (const k in d.kill) s += '<span>' + esc(mobName(k)) + ' ' + Math.min(q.c[k] || 0, d.kill[k]) + '/' + d.kill[k] + '</span>'; if (d.cond) s += '<span>' + esc(d.condT) + (d.cond(G.S) ? ' ✓' : '') + '</span>'; }
    return '<div class="qt' + (ok ? ' ok' : '') + '"><b>' + esc(d.t) + (ok ? ' ✓' : '') + '</b>' + (ok ? '<span>NPC에게 돌아가 완료하세요</span>' : s) + '</div>'; }
  function track(force) {
    const el = $('qtrack'); if (!el || !G.S) return; const S = G.S, qs = QS(), rows = [], ti = S.tut | 0;
    if (G.TUT[ti]) rows.push(qs['tut' + ti] ? qrow('tut' + ti) : '<div class="qt"><b>튜토리얼</b><span>시작의 마을 안내원 하나에게 말을 거세요 (F)</span></div>');
    for (const id in qs) if (id.indexOf('t_') === 0 && qs[id].st === 1) rows.push(qrow(id));
    const h = rows.slice(0, 3).join(''); if (h !== trackS || force) { trackS = h; el.innerHTML = h; el.classList.toggle('hidden', !h); }
  }
  N.track = track;
  const WK = ['sword', 'great', 'dagger', 'spear', 'mace'];
  function stock(n) {
    const hr = Math.floor(Date.now() / 3600000), key = n.wp.id + ':' + hr; if (N.stock[key]) return N.stock[key];
    const r = G.noise.rng(n.wp.id * 7919 + hr * 31 + 7), lv = Math.max(1, G.terrain.levelAt(n.wp.x, n.wp.z) | 0), I = G.items, out = [];
    const L = () => Math.max(1, lv + Math.floor(r() * 5) - 2), wk = () => WK[Math.floor(r() * WK.length)];
    for (const g of [0, 0, 1, 1, 2, 2, 3, 4]) out.push(I.weapon(wk(), g, g >= 3 ? lv : L()));
    for (const g of [0, 1, 2, 3, 4]) out.push(I.armor(g, g >= 3 ? lv : L()));
    const sk = []; for (const k of G.BIOME_MOBKEYS[n.wp.biome] || []) for (const id of G.MOB_SKILLS[k] || []) if (!sk.includes(id) && G.SKILLS[id] && G.SKILLS[id].tier <= 5) sk.push(id);
    sk.sort((a, b) => G.SKILLS[a].tier - G.SKILLS[b].tier); for (const id of sk) out.push(I.book(id));
    return (N.stock[key] = out);
  }
  function desc(it) { if (it.k === 'w') return G.WTYPES[it.t].n + ' · 공격력 +' + Math.round(G.items.watk(it)); if (it.k === 'a') return '방어 +' + it.def + ' · HP +' + it.hp + ' · 내구도 <span class="' + (it.dur === 0 ? 'red' : '') + '">' + it.dur + '/' + it.mdur + '</span>'; const s = G.SKILLS[it.sk]; return G.skillDesc(s) + (G.S.skills.includes(it.sk) ? ' · <span class="red">이미 배움</span>' : ''); }
  function row(it, btn, extra) { const S = G.S, low = it.k !== 'b' && S.level < it.lv, on = it.id === S.eq.w || it.id === S.eq.a; return '<div class="itm' + (on ? ' on' : '') + '">' + gb(it.g) + '<div class="in"><b style="color:' + G.GRADES[it.g].c + '">' + esc(it.name) + (it.plus ? ' +' + it.plus : '') + (on ? ' <span class="loot small">[장착 중]</span>' : '') + '</b><small>' + (it.k !== 'b' ? '<span class="' + (low ? 'red' : 'dim') + '">Lv.' + it.lv + '</span> · ' : '') + desc(it) + (extra || '') + '</small></div>' + btn + '</div>'; }
  const tabs = (l, cur) => '<div class="seg tabs">' + l.map(x => '<button data-ntab="' + x[0] + '" class="' + (cur === x[0] ? 'sel' : '') + '">' + x[1] + '</button>').join('') + '</div>';
  function shopHTML(n) {
    const S = G.S, tab = N.tab || 'buy';
    let h = tabs([['buy', '구매'], ['sell', '판매']], tab) + '<p class="small">보유 골드 <b class="gold">' + fmt(S.gold) + ' G</b> · 가방 ' + S.inv.length + ' / ' + G.items.MAX + '</p>';
    if (tab === 'buy') { const st = stock(n); h += st.length ? st.map((it, i) => row(it, '<button data-buy="' + i + '"' + (S.gold < N.price(it) ? ' disabled' : '') + '>' + fmt(N.price(it)) + ' G</button>')).join('') : '<p class="dim">물건이 다 팔렸습니다.</p>';
      h += '<p class="dim small">무기·갑옷은 이 마을 권장 레벨에 맞춰 나오고, 등급은 전설까지만 팝니다. 1시간마다 새 물건이 들어옵니다. 스킬북은 이 바이옴 몬스터들의 스킬입니다.</p>'; }
    else { const list = S.inv.filter(it => it.id !== S.eq.w && it.id !== S.eq.a); h += list.length ? list.map(it => row(it, '<button data-sell="' + it.id + '">' + fmt(N.sellPrice(it)) + ' G</button>')).join('') : '<p class="dim">팔 수 있는 물건이 없습니다. 장착 중인 장비는 팔 수 없습니다.</p>'; }
    return h;
  }
  function smithHTML() {
    const S = G.S, tab = N.tab || 'up', sc = N.scraps();
    let h = tabs([['up', '강화'], ['dis', '분해'], ['fix', '수리']], tab) + '<p class="small">골드 <b class="gold">' + fmt(S.gold) + ' G</b> · 부스러기 <b>' + fmt(sc) + '</b>개</p>';
    const ws = S.inv.filter(it => it.k === 'w').sort((a, b) => (b.id === S.eq.w) - (a.id === S.eq.w) || b.g - a.g || (b.plus || 0) - (a.plus || 0));
    if (tab === 'up') {
      h += ws.length ? ws.map(w => { const p = w.plus || 0; if (p >= 10) return row(w, '<button disabled>최대</button>'); const c = N.upCost(w), t = p + 1, rt = N.rate(t);
        return row(w, '<button data-up="' + w.id + '"' + (S.gold < c.g || sc < c.s ? ' disabled' : '') + '>+' + t + ' 강화</button>', '<br>부스러기 ' + c.s + ' · ' + fmt(c.g) + ' G · 성공 ' + Math.round(rt * 100) + '%' + (rt < 1 ? ' · <span class="red">실패 시 ' + Math.round(N.breakP(t) * 100) + '% 파괴, 아니면 1단계 하락</span>' : '')); }).join('') : '<p class="dim">강화할 무기가 없습니다.</p>';
      h += '<p class="dim small">무기는 내구도가 없고 +10까지 강화됩니다. +5까지는 반드시 성공하고, +6부터는 실패하면 1단계 떨어지거나 무기가 파괴됩니다. 갑옷은 강화할 수 없습니다.</p>';
    } else if (tab === 'dis') {
      const list = ws.filter(w => w.id !== S.eq.w);
      h += list.length ? list.map(w => row(w, '<button data-dis="' + w.id + '">분해 +' + N.scrapOut(w) + '</button>')).join('') : '<p class="dim">분해할 무기가 없습니다. 장착 중인 무기는 분해할 수 없습니다.</p>';
      h += '<p class="dim small">무기를 분해하면 강화에 쓰는 부스러기를 얻습니다. 등급·강화 수치·레벨이 높을수록 많이 나옵니다.</p>';
    } else {
      const as = S.inv.filter(it => it.k === 'a' && it.dur < it.mdur); let tot = 0; for (const a of as) tot += N.repairCost(a);
      h += as.length ? as.map(a => row(a, '<button data-fix="' + a.id + '"' + (S.gold < N.repairCost(a) ? ' disabled' : '') + '>' + fmt(N.repairCost(a)) + ' G</button>')).join('') + '<button class="wpb" data-fixall="1"' + (S.gold < tot ? ' disabled' : '') + '>전부 수리 (' + fmt(tot) + ' G)</button>' : '<p class="dim">수리할 갑옷이 없습니다.</p>';
      h += '<p class="dim small">갑옷은 맞을 때 내구도가 줄고, 0이 되면 효과가 사라집니다. 더 좋은 갑옷은 파밍해서 바꾸세요.</p>';
    }
    return h;
  }
  function teachHTML(n) {
    const S = G.S, T = G.TEACH[n.teach], s = G.SKILLS[T.sk], id = 't_' + n.teach, q = QS()[id], learned = S.skills.includes(T.sk);
    let h = '<div class="itm">' + gb(s.tier - 1) + '<div class="in"><b>' + s.icon + ' ' + esc(s.name) + '</b><small>' + G.skillDesc(s) + '</small></div></div><p class="small">"' + esc(T.say) + '"</p>';
    if (learned) h += '<p class="gold">이미 이 스킬을 배웠습니다.</p>';
    else if (!q) h += '<h4>전수 조건</h4><p class="small">Lv.' + T.lv + ' 이상 · 시험 통과 · <b class="gold">' + fmt(T.cost) + ' G</b></p>' + lines(id, true) + '<button class="wpb" data-acc="' + id + '"' + (S.level < T.lv ? ' disabled' : '') + '>' + (S.level < T.lv ? 'Lv.' + T.lv + '부터 수락할 수 있습니다' : '시험 수락') + '</button>';
    else { const ok = qDone(id); h += '<h4>' + esc(qdef(id).t) + '</h4>' + lines(id) + '<button class="wpb" data-teach="1"' + (!ok || S.gold < T.cost ? ' disabled' : '') + '>' + (ok ? (S.gold < T.cost ? '골드 부족 (' + fmt(T.cost) + ' G 필요)' : fmt(T.cost) + ' G 내고 배우기') : '시험을 먼저 통과하세요') + '</button>'; }
    return h + '<p class="dim small">이 스킬은 몬스터가 떨어뜨리지 않고 상인도 팔지 않습니다. 스승에게서만 확정으로 배울 수 있습니다.</p>';
  }
  function guideHTML() {
    const S = G.S, i = S.tut | 0, d = G.TUT[i];
    if (!d) return '<p>튜토리얼을 모두 마쳤습니다! 이제 바이옴마다 있는 스킬 스승을 찾아가 보세요. 지도(M)에 보라색 별로 표시됩니다. 무기 강화는 불꽃 화산지대 마을의 대장장이에게서 할 수 있습니다.</p>';
    const id = 'tut' + i, ok = qDone(id);
    return '<p class="dim small">튜토리얼 ' + (i + 1) + ' / ' + G.TUT.length + '</p><h4>' + esc(d.t) + '</h4><p class="small">' + esc(d.d) + '</p>' + lines(id) + '<p class="small">보상: <b class="gold">' + fmt(d.gold) + ' G</b>' + (d.xp ? ' · 경험치' : '') + (d.itemT ? ' · ' + d.itemT : '') + '</p><button class="wpb" data-claim="1"' + (ok ? '' : ' disabled') + '>' + (ok ? '보상 받기' : '진행 중') + '</button>';
  }
  N.render = function (b) {
    const n = N.cur; if (!n) { b.innerHTML = ''; return; }
    $('ptitle').textContent = n.name + ' · ' + n.wp.name;
    b.innerHTML = n.kind === 'shop' ? shopHTML(n) : n.kind === 'smith' ? smithHTML() : n.kind === 'teach' ? teachHTML(n) : guideHTML();
    bind(b, n);
  };
  function done(msg, cls) { if (msg) G.ui.toast(msg, cls); if (G.player.rebuild) G.player.rebuild(); G.save(); G.ui.render(); track(true); }
  function bind(b, n) {
    const q = s => b.querySelectorAll(s), S = G.S;
    q('[data-ntab]').forEach(x => x.onclick = () => { N.tab = x.dataset.ntab; G.ui.render(); });
    q('[data-buy]').forEach(x => x.onclick = () => { const st = stock(n), i = +x.dataset.buy, it = st[i]; if (!it) return; const p = N.price(it); if (S.gold < p) return G.ui.toast('골드가 부족합니다'); if (S.inv.length >= G.items.MAX) return G.ui.toast('가방이 가득 찼습니다'); S.gold -= p; st.splice(i, 1); G.items.add(it); done(it.name + ' 구매 (-' + fmt(p) + ' G)'); });
    q('[data-sell]').forEach(x => x.onclick = () => { const it = G.items.find(+x.dataset.sell); if (!it) return; if ((it.g >= 3 || it.plus) && !confirm('[' + G.GRADES[it.g].n + '] ' + it.name + '을(를) ' + fmt(N.sellPrice(it)) + ' G에 팔까요?')) return; S.gold += N.sellPrice(it); G.items.remove(it.id); done(it.name + ' 판매 (+' + fmt(N.sellPrice(it)) + ' G)'); });
    q('[data-up]').forEach(x => x.onclick = () => enhance(+x.dataset.up));
    q('[data-dis]').forEach(x => x.onclick = () => { const w = G.items.find(+x.dataset.dis); if (!w) return; const o = N.scrapOut(w); if ((w.g >= 3 || w.plus) && !confirm(w.name + (w.plus ? ' +' + w.plus : '') + '을(를) 분해할까요? 부스러기 ' + o + '개를 얻고 무기는 사라집니다.')) return; S.mats['무기 부스러기'] = (S.mats['무기 부스러기'] || 0) + o; G.items.remove(w.id); done('분해 완료 · 부스러기 +' + o); });
    q('[data-fix]').forEach(x => x.onclick = () => { const a = G.items.find(+x.dataset.fix); if (!a) return; const c = N.repairCost(a); if (S.gold < c) return; S.gold -= c; a.dur = a.mdur; done(a.name + ' 수리 완료'); });
    q('[data-fixall]').forEach(x => x.onclick = () => { const as = S.inv.filter(it => it.k === 'a' && it.dur < it.mdur); let t = 0; for (const a of as) t += N.repairCost(a); if (S.gold < t) return; S.gold -= t; for (const a of as) a.dur = a.mdur; done('갑옷을 전부 수리했습니다'); });
    q('[data-acc]').forEach(x => x.onclick = () => { N.accept(x.dataset.acc); done('시험을 수락했습니다'); });
    q('[data-teach]').forEach(x => x.onclick = () => { const T = G.TEACH[n.teach], id = 't_' + n.teach; if (!qDone(id) || S.gold < T.cost || S.skills.includes(T.sk)) return; S.gold -= T.cost; S.skills.push(T.sk); const e = S.slots.indexOf(null); if (e >= 0) S.slots[e] = T.sk; QS()[id].st = 2; G.ui.log('<b class="gold">' + T.name + '</b>에게서 <b>' + G.SKILLS[T.sk].name + '</b>을(를) 배웠습니다!'); done('스킬 습득: ' + G.SKILLS[T.sk].name, 'gold'); });
    q('[data-claim]').forEach(x => x.onclick = () => { const i = S.tut | 0, d = G.TUT[i], id = 'tut' + i; if (!d || !qDone(id)) return; if (d.item && !G.items.add(d.item())) return; S.gold += d.gold; if (d.xp && G.combat.gainXp) G.combat.gainXp(Math.floor(G.combat.need(S.level) * d.xp)); QS()[id].st = 2; S.tut = i + 1; if (G.TUT[S.tut]) N.accept('tut' + S.tut); done('퀘스트 보상 +' + fmt(d.gold) + ' G', 'gold'); });
  }
  function enhance(id) {
    const S = G.S, w = G.items.find(id); if (!w || w.k !== 'w') return; const p = w.plus || 0; if (p >= 10) return;
    const c = N.upCost(w), t = p + 1, rt = N.rate(t); if (S.gold < c.g || N.scraps() < c.s) return G.ui.toast('골드나 부스러기가 부족합니다');
    if (rt < 1 && !confirm(w.name + ' +' + p + ' → +' + t + '\n성공 확률 ' + Math.round(rt * 100) + '%\n실패하면 ' + Math.round(N.breakP(t) * 100) + '% 확률로 무기가 파괴되고, 아니면 1단계 떨어집니다.\n강화할까요?')) return;
    S.gold -= c.g; useScraps(c.s);
    if (Math.random() < rt) { w.plus = t; G.ui.log('<span class="gold">강화 성공: ' + esc(w.name) + ' +' + t + '</span>'); done('강화 성공! ' + w.name + ' +' + t, 'gold'); }
    else if (Math.random() < N.breakP(t)) { G.items.remove(w.id); G.ui.log('<span class="red">강화 실패: ' + esc(w.name) + ' 파괴</span>'); done(w.name + '이(가) 파괴되었습니다'); }
    else { w.plus = p - 1; done('강화 실패 · +' + w.plus + '(으)로 떨어졌습니다'); }
  }
  N.nearest = r => { const P = G.player.pos; let b = null, bd = r || 5; for (const n of N.list) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < bd) { bd = d; b = n; } } return b; };
  N.atWarp = () => { const P = G.player.pos; return G.world.obelisks.some(o => Math.hypot(o.x - P.x, o.z - P.z) < 12); };
  N.interact = function () {
    const n = N.nearest(5); if (!n) return false; N.cur = n; N.tab = '';
    if (n.kind === 'guide') { const i = G.S.tut | 0; if (G.TUT[i] && !QS()['tut' + i]) { N.accept('tut' + i); G.ui.toast('퀘스트 수락: ' + G.TUT[i].t); } }
    G.ui.open = null; G.ui.toggle('npc'); return true;
  };
  function star(x, cx, cy, r, col) { x.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fillStyle = col; x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1.5; x.stroke(); }
  N.drawMap = function (x, toMap, n) {
    for (const w of G.terrain.waypoints) { const p = toMap(w.x, w.z, n);
      if (w.teach) star(x, p[0] + 11, p[1] - 9, 6, '#c08aff');
      if (w.smith) { x.fillStyle = '#ff8a3a'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.arc(p[0] - 11, p[1] - 9, 4.5, 0, 7); x.fill(); x.stroke(); } }
  };
  let mat, scene; const MK = {};
  function human(kind, col) {
    const B = THREE.BoxGeometry, C = THREE.CylinderGeometry, Sp = THREE.SphereGeometry, skin = 0xf0c8a0, P = [];
    const a = (g, c) => P.push([g, c]);
    if (kind === 'teach') a(new C(0.3, 0.52, 1.5, 12).translate(0, 0.75, 0), col);
    else { a(new B(0.2, 0.8, 0.22).translate(-0.13, 0.4, 0), 0x3a3048); a(new B(0.2, 0.8, 0.22).translate(0.13, 0.4, 0), 0x3a3048); }
    const body = kind === 'shop' ? 0x2f7d4f : kind === 'smith' ? 0x8a5a3a : kind === 'guide' ? 0x3a6fd8 : col;
    a(new C(0.3, 0.36, 0.85, 10).translate(0, 1.22, 0), body);
    a(new B(0.16, 0.7, 0.16).translate(-0.43, 1.2, 0), body); a(new B(0.16, 0.7, 0.16).translate(0.43, 1.2, 0), body);
    a(new Sp(0.24, 12, 10).translate(0, 1.9, 0), skin);
    a(new Sp(0.035, 6, 4).translate(-0.08, 1.93, 0.22), 0x111111); a(new Sp(0.035, 6, 4).translate(0.08, 1.93, 0.22), 0x111111);
    const hair = kind === 'smith' ? 0x5a3a20 : kind === 'guide' ? 0xd8a84a : 0x3a2a1a;
    a(new Sp(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.95, -0.02), hair);
    if (kind === 'shop') { a(new B(0.52, 0.62, 0.05).translate(0, 1.1, 0.33), 0xe8dcc4); a(new C(0.38, 0.38, 0.05, 14).translate(0, 2.12, 0), 0x7a4a2a); a(new C(0.22, 0.25, 0.25, 12).translate(0, 2.25, 0), 0x7a4a2a); }
    if (kind === 'smith') { a(new B(0.56, 0.75, 0.05).translate(0, 1.05, 0.34), 0x2a2522); a(new B(0.3, 0.2, 0.1).translate(0, 1.76, 0.2), 0x5a3a20); a(new B(0.06, 0.6, 0.06).translate(0.52, 0.95, 0.12), 0x5b3f28); a(new B(0.26, 0.15, 0.15).translate(0.52, 1.28, 0.12), 0x3a3a42); }
    if (kind === 'teach') { a(new THREE.ConeGeometry(0.32, 0.7, 12).translate(0, 2.35, 0), 0x40305a); a(new C(0.04, 0.04, 2.2, 6).translate(0.55, 1.1, 0.1), 0x6a4a2a); a(new Sp(0.13, 10, 8).translate(0.55, 2.28, 0.1), col); }
    if (kind === 'guide') { a(new B(0.62, 0.12, 0.42).translate(0, 1.6, 0), 0xffd34d); a(new B(0.3, 0.38, 0.08).translate(0.36, 1.15, 0.26), 0x8a3a2a); }
    const m = new THREE.Mesh(G.mergeGeos(P), mat); m.castShadow = true; return m;
  }
  function addNpc(w, kind, dx, dz, name, role, col) {
    const x = w.x + dx, z = w.z + dz, y = w.id === 0 ? 4.17 : G.terrain.heightAt(x, z), mesh = human(kind, col);
    mesh.position.set(x, y, z); scene.add(mesh); G.world.colliders.push([x, z, 0.5]);
    const n = { wp: w, kind, x, y, z, name, role, col: '#' + new THREE.Color(col).getHexString(), mesh, teach: w.teach };
    if (kind === 'guide' || kind === 'teach') { n.mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: MK['!'], transparent: true, depthWrite: false })); n.mk.scale.set(0.9, 0.9, 1); n.mk.position.set(x, y + 3.4, z); n.mk.visible = false; scene.add(n.mk); }
    N.list.push(n);
  }
  function mkTex(ch) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 7; x.strokeStyle = '#000'; x.fillStyle = '#ffd34d'; x.strokeText(ch, 32, 34); x.fillText(ch, 32, 34); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
  function label(n) { const c = document.createElement('canvas'); c.width = 320; c.height = 80; const x = c.getContext('2d'); x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.85)';
    x.font = 'bold 24px sans-serif'; x.fillStyle = n.kind === 'teach' ? '#c08aff' : n.kind === 'smith' ? '#ff9a4a' : n.kind === 'guide' ? '#ffd34d' : '#7cf08a'; x.strokeText('<' + n.role + '>', 160, 28); x.fillText('<' + n.role + '>', 160, 28);
    x.font = 'bold 28px sans-serif'; x.fillStyle = '#fff'; x.strokeText(n.name, 160, 64); x.fillText(n.name, 160, 64);
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(3.6, 0.9, 1); sp.position.set(n.x, n.y + 2.75, n.z); scene.add(sp); return sp; }
  function props(w) {
    const z0 = w.id === 0, gy = (dx, dz) => z0 ? 4.17 : G.terrain.heightAt(w.x + dx, w.z + dz), P = [], glow = [], B = THREE.BoxGeometry, C = THREE.CylinderGeometry;
    const a = (g, c, dx, dz, yo, list) => (list || P).push([g.translate(dx, gy(dx, dz) + yo, dz), c]);
    const s = w.spots;
    if (s.shop) { const [x, z] = s.shop;
      a(new B(2.8, 1.0, 0.8), 0x7a5432, x, z + 1.3, 0.5);
      for (const px of [-1.35, 1.35]) for (const pz of [1.65, -0.9]) a(new C(0.07, 0.07, 2.7, 6), 0x5b3f28, x + px, z + pz, 1.35);
      a(new B(3.2, 0.12, 2.9), 0xc8463a, x, z + 0.37, 2.7); for (const sx of [-1.0, 0, 1.0]) a(new B(0.45, 0.14, 2.92), 0xf2e6d0, x + sx, z + 0.37, 2.7);
      a(new B(0.4, 0.3, 0.3), 0x4fa8ff, x - 0.8, z + 1.3, 1.15); a(new THREE.SphereGeometry(0.18, 10, 8), 0xffb03a, x + 0.1, z + 1.3, 1.18); a(new C(0.12, 0.12, 0.4, 8), 0x62d26f, x + 0.8, z + 1.3, 1.2);
      a(new B(0.8, 0.8, 0.8), 0x8a6a40, x + 1.9, z - 0.6, 0.4); G.world.colliders.push([w.x + x, w.z + z + 1.3, 1.5]); }
    if (s.smith) { const [x, z] = s.smith;
      a(new B(1.8, 1.3, 1.6), 0x4a403a, x - 1.8, z - 1.4, 0.65); a(new C(0.35, 0.45, 2.6, 8), 0x3a3330, x - 1.8, z - 1.9, 2.6); a(new B(1.2, 0.16, 1.0), 0xff7a1a, x - 1.8, z - 1.2, 1.36, glow);
      a(new B(0.4, 0.6, 0.35), 0x2b2b30, x + 1.1, z + 1.4, 0.3); a(new B(1.0, 0.25, 0.42), 0x4a4a52, x + 1.1, z + 1.4, 0.72);
      for (let i = 0; i < 3; i++) a(new B(0.08, 1.2, 0.05).rotateZ(0.15), 0xcfd3d8, x + 2.2 + i * 0.3, z - 1.0, 0.6);
      G.world.colliders.push([w.x + x - 1.8, w.z + z - 1.4, 1.3], [w.x + x + 1.1, w.z + z + 1.4, 0.6]); }
    if (s.teach) { const [x, z] = s.teach, col = G.TEACH[w.teach].col;
      a(new B(3, 0.06, 3), col, x, z, 0.03); a(new C(0.06, 0.06, 3.2, 6), 0x5b3f28, x - 1.8, z - 1.4, 1.6); a(new B(0.05, 1.2, 0.9), col, x - 1.8, z - 0.95, 2.5); }
    if (s.guide) { const [x, z] = s.guide; a(new B(0.1, 2.0, 0.1), 0x5b3f28, x + 1.0, z - 0.6, 1.0); a(new B(0.1, 2.0, 0.1), 0x5b3f28, x + 2.4, z - 0.6, 1.0); a(new B(1.7, 1.0, 0.08), 0x8a6a40, x + 1.7, z - 0.6, 1.6); a(new B(0.5, 0.35, 0.02), 0xf2e6d0, x + 1.5, z - 0.55, 1.7); }
    const m = new THREE.Mesh(G.mergeGeos(P), mat); m.position.set(w.x, 0, w.z); m.castShadow = m.receiveShadow = true; scene.add(m);
    if (glow.length) { const g = new THREE.Mesh(G.mergeGeos(glow), new THREE.MeshBasicMaterial({ vertexColors: true })); g.position.set(w.x, 0, w.z); scene.add(g); }
  }
  const SHOPN = ['마르코', '베티', '한스', '소피', '루카', '미라', '오토', '레나', '카이', '니나', '테오', '엘사', '브루노', '아냐'], SMN = ['볼칸', '브론', '헤파', '이그', '카론', '두린'];
  N.build = function (sc) {
    scene = sc; mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }); MK['!'] = mkTex('!'); MK['?'] = mkTex('?');
    const wps = G.terrain.waypoints, best = {};
    for (const w of wps) { if (w.id === 0) continue; const d = Math.hypot(w.x, w.z); if (!best[w.biome] || d < best[w.biome].d) best[w.biome] = { w, d }; }
    for (const b in best) if (G.TEACH[b]) best[b].w.teach = b;
    for (const w of wps) w.smith = w.biome === 'volcano';
    if (!wps.some(w => w.smith) && wps.length > 1) { const vb = G.terrain.bosses.find(b => b.biome === 'volcano') || { x: 3000, z: 0 }; let bw = null, bd = 1e9; for (const w of wps) { if (w.id === 0) continue; const d = Math.hypot(w.x - vb.x, w.z - vb.z); if (d < bd) { bd = d; bw = w; } } if (bw) bw.smith = true; }
    for (const w of wps) {
      w.spots = w.id === 0 ? { shop: [10, -11], guide: [-10, -11] } : { shop: [7, -1] }; if (w.teach) w.spots.teach = [-7, -1]; if (w.smith) w.spots.smith = [0, -8];
      props(w);
      addNpc(w, 'shop', w.spots.shop[0], w.spots.shop[1], '상인 ' + SHOPN[w.id % SHOPN.length], '상인', 0x2f7d4f);
      if (w.spots.guide) addNpc(w, 'guide', w.spots.guide[0], w.spots.guide[1], '안내원 하나', '튜토리얼', 0x3a6fd8);
      if (w.teach) addNpc(w, 'teach', -7, -1, G.TEACH[w.teach].name, '스킬 스승', G.TEACH[w.teach].col);
      if (w.smith) addNpc(w, 'smith', 0, -8, '대장장이 ' + SMN[w.id % SMN.length], '대장장이', 0x8a5a3a);
    }
    const el = document.createElement('div'); el.id = 'qtrack'; el.className = 'hidden'; ($('hud') || document.body).appendChild(el);
    const st = document.createElement('style'); st.textContent = '#qtrack{position:absolute;left:max(12px,env(safe-area-inset-left));top:150px;width:min(240px,44vw);pointer-events:none;font-size:12px;line-height:1.4;z-index:4}#qtrack .qt{background:rgba(10,16,28,.62);border-left:3px solid #ffd34d;border-radius:8px;padding:5px 9px;margin-bottom:5px;color:#e8eef6;text-shadow:0 1px 2px #000}#qtrack .qt.ok{border-left-color:#62d26f}#qtrack b{display:block;color:#ffd34d}#qtrack .qt.ok b{color:#7cf08a}#qtrack span{display:block;opacity:.92}.qlist{margin:6px 0 10px}.qrow{display:flex;justify-content:space-between;gap:8px;padding:6px 9px;border-radius:8px;background:rgba(255,255,255,.06);margin-bottom:4px;font-size:13px}.qrow.ok b{color:#62d26f}.dn.sk{color:#ffb070;font-size:15px}body.touch #qtrack{top:128px;font-size:11px;width:min(190px,42vw)}';
    document.head.appendChild(st);
  };
  function mark(n) { const S = G.S, qs = QS();
    if (n.kind === 'guide') { const i = S.tut | 0; if (!G.TUT[i]) return ''; const id = 'tut' + i; return !qs[id] ? '!' : qDone(id) ? '?' : ''; }
    const T = G.TEACH[n.teach]; if (!T || S.skills.includes(T.sk)) return ''; const id = 't_' + n.teach; return !qs[id] ? (S.level >= T.lv ? '!' : '') : qDone(id) ? '?' : ''; }
  let acc = 0, fl = '';
  N.update = function (dt) {
    const P = G.player.pos; acc -= dt; const full = acc <= 0; if (full) acc = 0.25;
    for (const n of N.list) {
      const d = Math.hypot(n.x - P.x, n.z - P.z);
      if (full) { n.mesh.visible = d < 260; if (d < 40 && !n.lab) n.lab = label(n); if (n.lab) n.lab.visible = d < 40;
        if (n.mk) { const s = d < 150 ? mark(n) : ''; n.mk.visible = !!s; if (s && n.mks !== s) { n.mks = s; n.mk.material.map = MK[s]; n.mk.material.needsUpdate = true; } } }
      if (d < 16) { let df = Math.atan2(P.x - n.x, P.z - n.z) - n.mesh.rotation.y; while (df > Math.PI) df -= 6.283; while (df < -Math.PI) df += 6.283; n.mesh.rotation.y += df * Math.min(1, dt * 5); }
      if (n.mk && n.mk.visible) n.mk.position.y = n.y + 3.4 + Math.sin(performance.now() / 300) * 0.12;
    }
    if (full) {
      if (G.ui.open === 'npc' && N.cur && Math.hypot(N.cur.x - P.x, N.cur.z - P.z) > 9) G.ui.close();
      const fb = $('actF'); if (fb) { const nn = N.nearest(5), t = nn ? '대화' : '워프석'; if (fl !== t) { fl = t; const em = fb.querySelector('em'); if (em) em.textContent = t; } }
      trackT -= 0.25; if (trackT <= 0) { trackT = 1; track(false); }
    }
  };
})();

(function () {
  const $ = id => document.getElementById(id);
  THREE.ColorManagement.legacyMode = false;
  const GN = 60, CELL = 100;
  const def = { name: '모험가', level: 1, xp: 0, hp: 128, mp: 56, st: 100, gold: 0, mats: {}, x: 0, z: 18, time: 8.5, disc: '', wps: [0], qs: {}, tut: 0, kills: 0, quality: G.mobile ? 'low' : 'high', lastHurt: 0, inv: [], eq: { w: null, a: null }, skills: [], slots: [null, null, null], dashN: 0, look: null, job: '', tier: 0, nid: 0, made: false };
  G.loadState = function (obj) {
    const sv = (obj && typeof obj === 'object') ? obj : {};
    G.S = Object.assign({}, def, sv); G.S.mats = Object.assign({}, G.S.mats); G.S.qs = (G.S.qs && typeof G.S.qs === 'object') ? JSON.parse(JSON.stringify(G.S.qs)) : {}; G.S.tut = G.S.tut | 0; G.S.lastHurt = 0;
    if (!Array.isArray(G.S.wps)) G.S.wps = [0];
    const S = G.S; S.inv = Array.isArray(S.inv) ? S.inv.filter(x => x && x.id && (x.k !== 'b' || G.SKILLS[x.sk])) : []; S.eq = Object.assign({ w: null, a: null }, S.eq); S.skills = Array.isArray(S.skills) ? S.skills.filter(id => G.SKILLS[id]) : [];
    S.slots = [0, 1, 2].map(i => Array.isArray(S.slots) && S.skills.includes(S.slots[i]) ? S.slots[i] : null); if (!G.JOBS[S.job]) { S.job = ''; S.tier = 0; } S.tier = Math.max(0, Math.min(3, S.tier | 0));
    for (const k of ['w', 'a']) if (S.eq[k] && !S.inv.some(x => x.id === S.eq[k])) S.eq[k] = null; if (typeof G.S.disc !== 'string') G.S.disc = '';
    if (!G.disc) G.disc = new Uint8Array(GN * GN); G.disc.fill(0);
    for (let i = 0; i < Math.min(G.disc.length, G.S.disc.length); i++) G.disc[i] = G.S.disc.charCodeAt(i) === 49 ? 1 : 0;
  };
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('elysion_save') || '{}'); } catch (e) { saved = {}; }
  G.loadState(saved);
  G.save = function () {
    if (G.noSave) return;
    const S = G.S, P = G.player; if (P && P.h && P.alive) { S.x = Math.round(P.pos.x * 10) / 10; S.z = Math.round(P.pos.z * 10) / 10; }
    let s = ''; for (let i = 0; i < G.disc.length; i++) s += G.disc[i] ? '1' : '0'; S.disc = s;
    try { localStorage.setItem('elysion_save', JSON.stringify(S)); } catch (e) {}
  };
  let renderer, scene, camera, busy = true;
  G.applyQuality = function () {
    const q = G.S.quality; G.world.setQuality(q);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, q === 'high' ? 1.75 : q === 'mid' ? 1.25 : 1));
    renderer.shadowMap.enabled = true; G.save();
  };
  function setLoad(p, t) { $('loadbar').style.width = (p * 100) + '%'; if (t) $('loadtxt').textContent = t; }
  function fillChunks(done) {
    const P = G.player.pos; let total = 0;
    const step = () => {
      const left = G.world.update(P.x, P.z, 40); total = Math.max(total, left);
      setLoad(0.35 + 0.65 * (1 - left / Math.max(1, total)), '지형을 만드는 중... (' + (total - left) + '/' + total + ')');
      if (left > 0) setTimeout(step, 0); else done();
    };
    step();
  }
  G.warpTo = function (x, z) {
    busy = true; $('loading').classList.remove('hidden'); $('loading').classList.add('warp');
    G.mobs.clearAll(); G.world.clearAll(); G.player.teleport(x, z);
    fillChunks(() => { G.player.pos.y = G.world.groundAt(x, z) + 0.5; $('loading').classList.add('hidden'); busy = false; G.save(); G.ui.toast('워프 완료'); });
  };
  G.interact = function () { if (G.npc && G.npc.interact()) return;
    const P = G.player.pos; for (const o of G.world.obelisks) if (Math.hypot(o.x - P.x, o.z - P.z) < 7) { G.ui.toggle('map'); return; }
    G.ui.toast('근처에 상호작용할 대상이 없습니다');
  };
  function start() {
    const cv = $('game');
    try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: !G.mobile, powerPreference: 'high-performance' }); }
    catch (e) { $('loadtxt').textContent = '이 기기/브라우저에서 3D(WebGL)를 쓸 수 없습니다. 크롬이나 사파리 최신 버전으로 열어 주세요.'; return; }
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 9000);
    const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
    addEventListener('resize', resize); resize();
    setLoad(0.05, '세계 지도를 그리는 중...');
    setTimeout(() => {
      G.terrain.init(); G.world.init(scene); try { G.npc.build(scene); } catch (e) { if (!G.newErr) { G.newErr = 1; console.error('v1.3', e); } } setLoad(0.2, '마을과 워프석을 세우는 중...');
      G.player.init(scene); G.mobs.init(scene); G.combat.init(scene); G.ui.init(camera); G.input.bind();
      G.applyQuality(); G.world.refreshObelisks();
      setLoad(0.35);
      fillChunks(() => {
        G.player.pos.y = G.world.groundAt(G.player.pos.x, G.player.pos.z) + 0.2;
        $('loading').classList.add('hidden'); $('hud').classList.remove('hidden'); busy = false;
        G.ui.log('<b class="gold">엘리시온</b>에 오신 것을 환영합니다, ' + G.S.name + '님!');
        G.ui.log(G.mobile ? '왼쪽 조이스틱으로 이동, 오른쪽 버튼으로 공격·대쉬·점프·스킬을 씁니다.' : 'WASD 이동 · Shift 대쉬 · Space 점프 · 클릭 공격 · Q/E/R 스킬 · I 가방 · M 지도');
        loop();
      });
    }, 30);
  }
  const clock = new THREE.Clock(); let saveT = 0, discT = 0, biome = 'plains';
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    if (busy) { renderer.render(scene, camera); return; }
    const P = G.player, I = G.input;
    I.update();
    if (G.ui.open && G.mobile) { I.mx = I.my = 0; }
    P.update(dt, I);
    G.camCtl.update(camera, dt);
    G.world.update(P.pos.x, P.pos.z, G.mobile ? 5 : 8);
    G.mobs.update(dt, P);
    G.combat.update(dt, I);
    discT -= dt;
    if (discT <= 0) {
      discT = 0.5; biome = G.terrain.biomeAt(P.pos.x, P.pos.z);
      const ci = Math.floor((P.pos.x + G.WORLD_R) / CELL), cj = Math.floor((P.pos.z + G.WORLD_R) / CELL);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < GN && j < GN) G.disc[j * GN + i] = 1; }
      for (const o of G.world.obelisks) if (!G.S.wps.includes(o.wp.id) && Math.hypot(o.x - P.pos.x, o.z - P.pos.z) < 12) { G.S.wps.push(o.wp.id); G.world.refreshObelisks(); G.ui.toast('마을 발견: ' + o.wp.name, 'gold'); G.ui.log('워프석 <b class="gold">' + o.wp.name + '</b> 활성화! 지도(M)에서 언제든 이동할 수 있습니다.'); G.save(); }
    }
    for (const o of G.world.obelisks) { o.cr.rotation.y += dt * 1.5; o.cr.position.y = 5.6 + Math.sin(performance.now() / 600) * 0.15; }
    G.world.tick(dt, camera, P.pos, biome);
    G.ui.update(dt, biome); try { G.npc.update(dt); } catch (e) { if (!G.newErr) { G.newErr = 1; console.error('v1.3', e); } }
    renderer.render(scene, camera);
    saveT += dt; if (saveT > 10) { saveT = 0; G.save(); }
  }
  addEventListener('beforeunload', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
  if (typeof THREE === 'undefined') { document.getElementById('loadtxt').textContent = '3D 엔진을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.'; }
  else if (G.account) G.account.gate(() => G.charScreen(start)); else G.charScreen(start);
})();
