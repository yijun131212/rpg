window.G = window.G || {};
G.VERSION = '1.1.0-accounts';
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
      wps.push({ id: wps.length, name: G.BIOMES[b].name + ' 쉼터 ' + cnt[b], x: Math.round(found[0]), z: Math.round(found[1]), biome: b });
    }
    const cands = {};
    for (let z = -R; z <= R; z += 120) for (let x = -R; x <= R; x += 120) {
      const d = Math.hypot(x, z); if (d < 250 || d > R - 500) continue;
      const h = heightAt(x, z); if (h < 2 || h > 90) continue;
      const b = biomeAt(x, z); (cands[b] = cands[b] || []).push([x, z, d]);
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
    P.h = G.makeHumanoid({ shirt: 0x2f4f8f, pants: 0x34323c, cape: 0x8a1e2a, hair: 0x3a2414 });
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.32, 12), M(0x9aa3ad, { metalness: 0.8, roughness: 0.35 })); chest.position.y = 0.55; P.h.hips.add(chest); chest.castShadow = true;
    for (const sx of [-1, 1]) { const pd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), chest.material); pd.position.set(sx * 0.34, 0.74, 0); P.h.hips.add(pd); pd.castShadow = true; }
    scene.add(P.h.root);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.5, depthWrite: false }));
    P.ring = ring; scene.add(ring);
    P.pos.set(G.S.x, G.world.groundAt(G.S.x, G.S.z) + 0.1, G.S.z);
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
    const sprint = I.sprint && ml > 0.2 && S.st > 1 && !P.swim;
    if (sprint) S.st = Math.max(0, S.st - dt * 18); else S.st = Math.min(100, S.st + dt * 22);
    let speed = 6.2 * (sprint ? 1.65 : 1) * (P.swim ? 0.5 : 1) * (P.atkT >= 0 ? 0.35 : 1);
    const tvx = mv.x * speed * ml, tvz = mv.z * speed * ml, acc = P.onGround ? 12 : 3;
    P.vel.x += (tvx - P.vel.x) * Math.min(1, dt * acc); P.vel.z += (tvz - P.vel.z) * Math.min(1, dt * acc);
    if (P.dashT > 0) { P.dashT -= dt; P.vel.x = P.dashDir.x * 38; P.vel.z = P.dashDir.z * 38; }
    if (I.jump && (P.onGround || P.swim)) { P.vel.y = P.swim ? 5 : 8.5; P.onGround = false; }
    I.jump = false;
    P.vel.y -= 24 * dt;
    P.pos.addScaledVector(P.vel, dt);
    const cols = G.world.nearColliders(P.pos.x, P.pos.z);
    for (const c of cols) { const dx = P.pos.x - c[0], dz = P.pos.z - c[1], d = Math.hypot(dx, dz), r = c[2] + 0.4; if (d < r && d > 0.0001) { P.pos.x = c[0] + dx / d * r; P.pos.z = c[1] + dz / d * r; } }
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
  const I = G.input = { mx: 0, my: 0, sprint: false, jump: false, atk: false, keys: {}, queue: [], runToggle: false, joy: { id: null, x: 0, y: 0 } };
  const K = I.keys, Cam = G.camCtl;
  const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  addEventListener('keydown', e => {
    if (typing(e)) return;
    const k = e.key.toLowerCase(); if (K[k]) return; K[k] = true;
    if (k === ' ') { I.jump = true; e.preventDefault(); }
    if (k === 'q' || k === 'e' || k === 'r' || k === 'f') I.queue.push(k);
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
    I.sprint = !!K.shift || I.runToggle || (I.joy.id !== null && Math.hypot(I.joy.x, I.joy.y) > 0.98 && false);
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
        if (a === 'atk') I.atk = true; else if (a === 'jump') I.jump = true; else if (a === 'run') { I.runToggle = !I.runToggle; b.classList.toggle('lock', I.runToggle); } else I.queue.push(a);
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
  const C = G.combat = { cds: { atk: 0, q: 0, e: 0, r: 0 }, target: null, pend: [], drops: [], fx: [] };
  const SK = C.SKILLS = {
    atk: { name: '기본 공격', cd: 0.55, mp: 0, lv: 1 },
    q: { name: '회전베기', cd: 5, mp: 15, lv: 1 },
    e: { name: '돌진', cd: 6, mp: 12, lv: 5 },
    r: { name: '강타', cd: 10, mp: 25, lv: 10 }
  };
  G.stats = function () { const L = G.S.level; return { maxHp: 100 + L * 28, maxMp: 50 + L * 6, atk: 12 + L * 4.2, def: L * 1.5, crit: 0.12 }; };
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
    let dmg = st.atk * mult * (0.9 + Math.random() * 0.2) * (dl > 0 ? Math.max(0.3, 1 - dl * 0.04) : 1);
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
    G.ui.log((m.boss ? '<b class="gold">[필드 보스 처치]</b> ' : '') + m.name + ' 처치 · 경험치 +' + xp.toLocaleString() + ' · 골드 +' + gold.toLocaleString());
    if (m.boss) G.ui.toast(m.name + ' 처치!', 'gold');
    gainXp(xp);
  }
  function gainXp(x) {
    const S = G.S; if (S.level >= G.MAX_LEVEL) return;
    S.xp += x; let up = false;
    while (S.level < G.MAX_LEVEL && S.xp >= C.need(S.level)) { S.xp -= C.need(S.level); S.level++; up = true; }
    if (S.level >= G.MAX_LEVEL) S.xp = 0;
    if (up) {
      const st = G.stats(); S.hp = st.maxHp; S.mp = st.maxMp;
      G.ui.toast('레벨 업! Lv.' + S.level + (S.level >= G.MAX_LEVEL ? ' (만렙 달성!)' : ''), 'gold');
      for (const k in SK) if (SK[k].lv === S.level) G.ui.log('새 스킬 <b class="gold">' + SK[k].name + '</b> 사용 가능!');
      levelFx(); G.save();
    }
  }
  C.gainXp = gainXp;
  function levelFx() {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(P.pos); m.position.y += 3; scene.add(m); C.fx.push({ m, t: 0, kind: 'lv' });
  }
  function spawnDrop(x, y, z, name, n) {
    const mesh = new THREE.Mesh(C.dropGeo, new THREE.MeshBasicMaterial({ color: 0xffe28a })); mesh.position.set(x, y, z); scene.add(mesh);
    C.drops.push({ mesh, name, n, t: 0, vx: (Math.random() - 0.5) * 4, vy: 4 + Math.random() * 2, vz: (Math.random() - 0.5) * 4 });
  }
  C.tryUse = function (k) {
    const S = G.S, s = SK[k]; if (!P.alive || C.cds[k] > 0) return;
    if (S.level < s.lv) { if (k !== 'atk') G.ui.toast(s.name + '은(는) Lv.' + s.lv + '부터 사용할 수 있습니다'); return; }
    if (S.mp < s.mp) { G.ui.toast('마나가 부족합니다'); return; }
    S.mp -= s.mp; C.cds[k] = s.cd;
    const tg = nearestEnemy(k === 'e' ? 14 : 7); if (tg) P.faceTo(tg.x, tg.z);
    if (k === 'atk') { P.atkDur = 0.42; P.atkT = 0; C.pend.push({ t: 0.17, f: () => { hitArea(3.0, 120, 1, 0); showArc(0.25); } }); }
    else if (k === 'q') { P.spinT = 0; P.atkDur = 0.45; P.atkT = 0.35; C.pend.push({ t: 0.12, f: () => { hitArea(4.6, 360, 1.6, 0); showRing(); } }); }
    else if (k === 'e') { P.dashT = 0.26; P.dashDir.set(Math.sin(P.facing), 0, Math.cos(P.facing)); P.atkDur = 0.3; P.atkT = 0.35; const hit = new Set(); for (let i = 1; i <= 6; i++) C.pend.push({ t: i * 0.045, f: () => hitArea(2.4, 360, 1.4, 0.4, hit) }); }
    else if (k === 'r') { P.atkDur = 0.6; P.atkT = 0; C.pend.push({ t: 0.32, f: () => { hitArea(5.2, 70, 3.2, 1.5); showArc(0.4, 1.4); G.ui.shake(0.25); } }); }
  };
  function showArc(t, s) { C.arc.position.set(P.pos.x, P.pos.y + 1.1, P.pos.z); C.arc.rotation.y = P.facing; C.arc.scale.setScalar(s || 1); arcMat.opacity = 0.75; C.arcT = t; }
  function showRing() { C.ring.position.set(P.pos.x, P.pos.y + 0.9, P.pos.z); C.ring.material.opacity = 0.7; C.ringT = 0.35; }
  C.hurtPlayer = function (raw, src) {
    const S = G.S; if (!P.alive) return;
    const dmg = Math.max(1, Math.round(raw - G.stats().def * 0.5));
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
      for (const a of I.queue) { if (a === 'atk' || a === 'tap') C.tryUse('atk'); else if (SK[a]) C.tryUse(a); else if (a === 'f') G.interact(); }
      const idle = performance.now() - (S.lastHurt || 0) > 5000;
      S.hp = Math.min(st.maxHp, S.hp + st.maxHp * dt * (idle ? 0.025 : 0.002));
      S.mp = Math.min(st.maxMp, S.mp + st.maxMp * dt * 0.02);
    }
    I.queue.length = 0;
    if (C.arcT > 0) { C.arcT -= dt; arcMat.opacity = Math.max(0, C.arcT * 3); }
    if (C.ringT > 0) { C.ringT -= dt; C.ring.material.opacity = Math.max(0, C.ringT * 2); C.ring.rotation.y += dt * 12; }
    for (let i = C.fx.length - 1; i >= 0; i--) { const f = C.fx[i]; f.t += dt; f.m.position.set(P.pos.x, P.pos.y + 3, P.pos.z); f.m.scale.set(1 + f.t, 1, 1 + f.t); f.m.material.opacity = 0.6 * (1 - f.t); if (f.t >= 1) { scene.remove(f.m); C.fx.splice(i, 1); } }
    for (let i = C.drops.length - 1; i >= 0; i--) {
      const d = C.drops[i], m = d.mesh; d.t += dt; m.rotation.y += dt * 4;
      if (d.t < 0.7) { d.vy -= 14 * dt; m.position.x += d.vx * dt; m.position.y += d.vy * dt; m.position.z += d.vz * dt; const g = G.world.groundAt(m.position.x, m.position.z) + 0.3; if (m.position.y < g) { m.position.y = g; d.vy *= -0.3; } }
      else { const tx = P.pos.x - m.position.x, ty = P.pos.y + 1 - m.position.y, tz = P.pos.z - m.position.z, l = Math.hypot(tx, ty, tz), sp = Math.min(l, dt * (8 + d.t * 20)); m.position.x += tx / l * sp; m.position.y += ty / l * sp; m.position.z += tz / l * sp;
        if (l < 0.6) { scene.remove(m); m.material.dispose(); C.drops.splice(i, 1); S.mats[d.name] = (S.mats[d.name] || 0) + d.n; G.ui.loot(d.name, d.n); } }
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
  U.toggle = function (w) { if (U.open === w) return U.close(); U.open = w; $('panel').classList.remove('hidden'); render(); };
  function render() {
    const b = $('pbody'), S = G.S, st = G.stats();
    if (U.open === 'bag') {
      $('ptitle').textContent = '가방 · 캐릭터';
      const mats = Object.keys(S.mats).filter(k => S.mats[k] > 0).sort();
      b.innerHTML = '<div class="stats"><div><span>이름</span><b>' + esc(S.name) + '</b></div><div><span>레벨</span><b>' + S.level + ' / ' + G.MAX_LEVEL + '</b></div><div><span>공격력</span><b>' + Math.round(st.atk) + '</b></div><div><span>방어력</span><b>' + Math.round(st.def) + '</b></div><div><span>최대 HP</span><b>' + st.maxHp + '</b></div><div><span>최대 MP</span><b>' + st.maxMp + '</b></div><div><span>골드</span><b class="gold">' + S.gold.toLocaleString() + '</b></div><div><span>처치 수</span><b>' + S.kills.toLocaleString() + '</b></div></div>' +
        '<h4>재료 (부스러기)</h4>' + (mats.length ? '<div class="mats">' + mats.map(k => '<div class="mat"><i></i><span>' + esc(k) + '</span><b>x' + S.mats[k].toLocaleString() + '</b></div>').join('') + '</div>' : '<p class="dim">아직 재료가 없습니다. 몬스터를 잡으면 반드시 부스러기가 떨어집니다.</p>') +
        '<p class="dim small">장비 장착·제작·강화·초월·길들이기는 2단계 업데이트에서 이 가방에 추가됩니다.</p>';
    } else if (U.open === 'rank') {
      $('ptitle').textContent = '랭킹 (레벨순 TOP 50)'; G.account.rank(b);
    } else if (U.open === 'map') {
      $('ptitle').textContent = '세계 지도 · 워프';
      b.innerHTML = '<canvas id="bigmap" width="640" height="640"></canvas><p class="dim small">활성화한 워프석(파란 마름모)을 누르면 그곳으로 이동합니다. 워프석 가까이 가면 자동으로 활성화됩니다.</p><div id="wplist"></div>';
      drawBigMap(); const cv = $('bigmap');
      cv.onclick = e => { const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) / r.width * 640, my = (e.clientY - r.top) / r.height * 640; let best = null, bd = 22; for (const w of G.terrain.waypoints) { if (!S.wps.includes(w.id)) continue; const p = toMap(w.x, w.z, 640), d = Math.hypot(p[0] - mx, p[1] - my); if (d < bd) { bd = d; best = w; } } if (best) warpAsk(best); };
      $('wplist').innerHTML = S.wps.map(id => G.terrain.waypoints[id]).filter(Boolean).map(w => '<button class="wpb" data-id="' + w.id + '">' + esc(w.name) + ' <small>Lv.' + G.terrain.levelAt(w.x, w.z) + '</small></button>').join('');
      document.querySelectorAll('.wpb').forEach(bt => bt.onclick = () => warpAsk(G.terrain.waypoints[+bt.dataset.id]));
    } else if (U.open === 'opt') {
      $('ptitle').textContent = '설정';
      const q = G.S.quality;
      b.innerHTML = '<h4>그래픽 품질</h4><div class="seg">' + [['low', '낮음'], ['mid', '보통'], ['high', '높음']].map(a => '<button data-q="' + a[0] + '" class="' + (q === a[0] ? 'sel' : '') + '">' + a[1] + '</button>').join('') + '</div><p class="dim small">휴대폰이 느리거나 뜨거우면 낮음으로 바꾸세요. 높음은 시야가 멀고 풀과 그림자가 더 많습니다.</p>' +
        '<h4>캐릭터 이름</h4><div class="row"><input id="nm" maxlength="12" value="' + esc(S.name) + '"><button id="nmok">저장</button></div>' +
        '<h4>조작법</h4><p class="small">PC: WASD 이동 · Shift 달리기 · Space 점프 · 클릭/J 공격(누르고 있으면 연속) · Q 회전베기 · E 돌진 · R 강타 · F 워프석 · M 지도 · I 가방 · 드래그로 시점 · 휠로 줌<br>모바일: 왼쪽 조이스틱 이동 · 화면 드래그로 시점 · 두 손가락으로 줌 · 오른쪽 버튼으로 공격·스킬</p>' +
        G.account.optHTML() + '<h4>데이터</h4><button id="rst" class="danger">처음부터 다시 시작</button><p class="dim small">버전 ' + G.VERSION + ' · 다른 플레이어와 같이 노는 온라인은 다음 단계에서 연결됩니다.</p>';
      document.querySelectorAll('[data-q]').forEach(bt => bt.onclick = () => { G.S.quality = bt.dataset.q; G.applyQuality(); render(); });
      $('nmok').onclick = () => { const v = $('nm').value.trim(); if (v) { G.S.name = v; G.save(); U.toast('이름을 저장했습니다'); } };
      $('rst').onclick = async () => { if (!confirm('정말 모든 진행을 지우고 처음부터 시작할까요?')) return; const fin = () => { G.noSave = true; localStorage.removeItem('elysion_save'); location.reload(); }; if (!G.account.guest) { G.loadState({ name: G.S.name }); await G.account.push(true); } fin(); };
      G.account.bindOpt(render);
    }
  }
  function warpAsk(w) { if (confirm(w.name + '(으)로 워프할까요?')) { U.close(); G.warpTo(w.x, w.z + (w.id === 0 ? 18 : 4)); } }
  function toMap(x, z, n) { const R = G.WORLD_R; return [(x + R) / (2 * R) * n, (z + R) / (2 * R) * n]; }
  function drawBigMap() {
    const cv = $('bigmap'); if (!cv) return; const x = cv.getContext('2d'), n = 640, S = G.S;
    x.imageSmoothingEnabled = true; x.drawImage(mapImg, 0, 0, n, n);
    x.fillStyle = 'rgba(8,12,20,0.88)'; const cs = n / GN;
    for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) if (!G.disc[j * GN + i]) x.fillRect(i * cs - 0.5, j * cs - 0.5, cs + 1, cs + 1);
    G.terrain.bosses.forEach(b => { const ci = Math.floor((b.x + G.WORLD_R) / CELL), cj = Math.floor((b.z + G.WORLD_R) / CELL); if (!G.disc[cj * GN + ci]) return; const p = toMap(b.x, b.z, n); x.fillStyle = '#ff4d3a'; x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.fillText(b.name + ' Lv.' + b.level, p[0], p[1] - 11); });
    for (const w of G.terrain.waypoints) {
      const on = S.wps.includes(w.id), ci = Math.floor((w.x + G.WORLD_R) / CELL), cj = Math.floor((w.z + G.WORLD_R) / CELL);
      if (!on && !G.disc[cj * GN + ci]) continue; const p = toMap(w.x, w.z, n);
      x.save(); x.translate(p[0], p[1]); x.rotate(Math.PI / 4); x.fillStyle = on ? '#4fd8ff' : '#777'; x.strokeStyle = '#000'; x.lineWidth = 2; x.fillRect(-6, -6, 12, 12); x.strokeRect(-6, -6, 12, 12); x.restore();
      if (on) { x.fillStyle = '#e8f6ff'; x.font = '11px sans-serif'; x.textAlign = 'center'; x.fillText(w.name, p[0], p[1] + 19); }
    }
    const pp = toMap(G.player.pos.x, G.player.pos.z, n); arrow(x, pp[0], pp[1], G.player.facing, 9);
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
    $('stbar').style.width = S.st + '%';
    const need = G.combat.need(S.level), xr = S.level >= G.MAX_LEVEL ? 1 : S.xp / need;
    $('xpbar').style.width = (xr * 100) + '%'; $('xptxt').textContent = S.level >= G.MAX_LEVEL ? 'MAX LEVEL' : 'EXP ' + (xr * 100).toFixed(2) + '%';
    const hh = Math.floor(S.time), mm = Math.floor((S.time - hh) * 60); $('clock').textContent = (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + (G.world.weather === 'rain' ? ' · 비' : G.world.weather === 'snow' ? ' · 눈' : '');
    $('gold').textContent = S.gold.toLocaleString() + ' G';
    if (biome !== lastBiome) { lastBiome = biome; $('zonename').textContent = G.BIOMES[biome].name; const zb = $('zonebig'); zb.innerHTML = G.BIOMES[biome].name + '<small>권장 Lv.' + G.terrain.levelAt(G.player.pos.x, G.player.pos.z) + '</small>'; zb.classList.remove('show'); void zb.offsetWidth; zb.classList.add('show'); }
    for (const k in G.combat.SKILLS) { const el = document.querySelector('[data-act="' + k + '"]'); if (!el) continue; const s = G.combat.SKILLS[k], cd = G.combat.cds[k]; el.style.setProperty('--cd', (cd / s.cd * 100) + '%'); el.classList.toggle('locked', S.level < s.lv); el.classList.toggle('nomp', S.mp < s.mp); }
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
  const $ = id => document.getElementById(id);
  THREE.ColorManagement.legacyMode = false;
  const GN = 60, CELL = 100;
  const def = { name: '모험가', level: 1, xp: 0, hp: 128, mp: 56, st: 100, gold: 0, mats: {}, x: 0, z: 18, time: 8.5, disc: '', wps: [0], kills: 0, quality: G.mobile ? 'low' : 'high', lastHurt: 0 };
  G.loadState = function (obj) {
    const sv = (obj && typeof obj === 'object') ? obj : {};
    G.S = Object.assign({}, def, sv); G.S.mats = Object.assign({}, G.S.mats); G.S.lastHurt = 0;
    if (!Array.isArray(G.S.wps)) G.S.wps = [0]; if (typeof G.S.disc !== 'string') G.S.disc = '';
    if (!G.disc) G.disc = new Uint8Array(GN * GN); G.disc.fill(0);
    for (let i = 0; i < Math.min(G.disc.length, G.S.disc.length); i++) G.disc[i] = G.S.disc.charCodeAt(i) === 49 ? 1 : 0;
  };
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('elysion_save') || '{}'); } catch (e) { saved = {}; }
  G.loadState(saved);
  G.save = function () {
    if (G.noSave) return;
    const S = G.S, P = G.player; if (P && P.alive) { S.x = Math.round(P.pos.x * 10) / 10; S.z = Math.round(P.pos.z * 10) / 10; }
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
  G.interact = function () {
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
      G.terrain.init(); G.world.init(scene); setLoad(0.2, '마을과 워프석을 세우는 중...');
      G.player.init(scene); G.mobs.init(scene); G.combat.init(scene); G.ui.init(camera); G.input.bind();
      G.applyQuality(); G.world.refreshObelisks();
      setLoad(0.35);
      fillChunks(() => {
        G.player.pos.y = G.world.groundAt(G.player.pos.x, G.player.pos.z) + 0.2;
        $('loading').classList.add('hidden'); $('hud').classList.remove('hidden'); busy = false;
        G.ui.log('<b class="gold">엘리시온</b>에 오신 것을 환영합니다, ' + G.S.name + '님!');
        G.ui.log(G.mobile ? '왼쪽 조이스틱으로 이동, 오른쪽 버튼으로 공격하세요.' : 'WASD 이동 · 클릭 공격 · Q/E/R 스킬 · M 지도');
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
      for (const o of G.world.obelisks) if (!G.S.wps.includes(o.wp.id) && Math.hypot(o.x - P.pos.x, o.z - P.pos.z) < 12) { G.S.wps.push(o.wp.id); G.world.refreshObelisks(); G.ui.toast('워프석 활성화: ' + o.wp.name, 'gold'); G.ui.log('워프석 <b class="gold">' + o.wp.name + '</b> 활성화! 지도(M)에서 언제든 이동할 수 있습니다.'); G.save(); }
    }
    for (const o of G.world.obelisks) { o.cr.rotation.y += dt * 1.5; o.cr.position.y = 5.6 + Math.sin(performance.now() / 600) * 0.15; }
    G.world.tick(dt, camera, P.pos, biome);
    G.ui.update(dt, biome);
    renderer.render(scene, camera);
    saveT += dt; if (saveT > 10) { saveT = 0; G.save(); }
  }
  addEventListener('beforeunload', () => G.save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
  if (typeof THREE === 'undefined') { document.getElementById('loadtxt').textContent = '3D 엔진을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.'; }
  else if (G.account) G.account.gate(start); else start();
})();
