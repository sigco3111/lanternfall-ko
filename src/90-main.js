/* LANTERNFALL - main: boot, visuals, camera, input, loop, gallery */
(function () {
  const G = LF.game, P = G.P, W = LF.world, DT = 1 / 60;
  let scene, cam, GX, time = 0, acc = 0, last = 0, closeView = false, catchUp = 0;
  const protos = {};
  LF.makeFig = function (name, lantern) {
    const key = name + (lantern ? '+L' : ''); let p = protos[key];
    if (!p) { const def = LF.HEROES[name] || LF.MONSTERS[name]; p = protos[key] = def.build({ lantern: !!lantern }); }
    const f = new Figure({ d: p.d }, p.rig); f.fx = p.fx; f.P = p.P; f.hideB.set(p.hideB); return f;
  };
  /* ----- visuals for units ----- */
  const vis = new Map(); const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function mkVis(u) {
    const isH = u.team === 0, name = isH ? u.cls : u.type, def = isH ? LF.HEROES[name] : LF.MONSTERS[name];
    const lan = isH && u === G.carrier && u.cls !== 'lamplighter';
    const fig = LF.makeFig(name, lan), an = new (def.animClass || HumanAnim)(fig, def.style), v = { fig, an, def, face: u.face, sc: def.scale || 1, dying: 0, kind: def.death, lan, flash: 0 };
    fig.mesh.scale.setScalar(v.sc); fig.mesh.position.set(u.x, 0, u.z); fig.mesh.rotation.y = u.face; scene.add(fig.mesh); vis.set(u, v);
    if (!isH) { fig.u.uDisCol.value.setRGB(def.disCol[0], def.disCol[1], def.disCol[2]); fig.u.uGlow.value = u.boss ? 3 : 2.2; }
    return v;
  }
  function rmVis(u) { const v = vis.get(u); if (!v) return; scene.remove(v.fig.mesh); v.fig.dispose(); vis.delete(u); }
  LF.clearVis = function () { for (const [u] of vis) rmVis(u); };
  function syncVisuals(dt, paused) {
    const bars = LF.fx.bars; bars.length = 0;
    for (const [u, v] of vis) if (u.gone || (u.team === 0 && !G.heroes.includes(u)) || (u.team === 0 && v.lan !== (u === G.carrier && u.cls !== 'lamplighter'))) rmVis(u);
    const units = G.run ? G.heroes.concat(G.mons) : [];
    for (const u of units) {
      let v = vis.get(u); if (!v) v = mkVis(u);
      const fig = v.fig, an = v.an, m = fig.mesh;
      if (u.team === 1 && u.hp <= 0) { stepDeath(u, v, dt); continue; }
      { const al = LF.alpha === undefined ? 1 : LF.alpha, ix0 = u.ox === undefined ? u.x : lerp(u.ox, u.x, al), iz0 = u.oz === undefined ? u.z : lerp(u.oz, u.z, al), k = 1 - Math.exp(-dt * 20); if (v.sx === undefined || Math.abs(ix0 - v.sx) > 3) { v.sx = ix0; v.sz = iz0; v.px = undefined; } else { v.sx += (ix0 - v.sx) * k; v.sz += (iz0 - v.sz) * k; } u.rx = v.sx; u.rz = v.sz; }
      m.position.set(v.sx, 0, v.sz); an.xf = { x: v.sx, z: v.sz, f: v.face, s: v.sc }; an.ikOn = u.team === 0; an.lead = clamp(angDiff(v.face, u.face), -0.8, 0.8); v.face += angDiff(v.face, u.face) * Math.min(1, dt * 6.5); m.rotation.y = v.face;
      if (u.animReq) { an.play(u.animReq[0], u.animReq[1], u.animReq[2]); u.animReq = null; }
      if (u.animStop) { an.act = null; u.animStop = false; }
      if (u.stagV) { an.stag = Math.min(1.15, an.stag + u.stagV * (u.boss ? 0.25 : u.elite ? 0.5 : 1)); an.stagDir = Math.sin((u.hitFrom || 0) - v.face) > 0 ? 1 : -1; u.stagV = 0; }
      if (u.flashV) { v.flash = 1; u.flashV = 0; }
      if (v.flash > 0) { v.flash = Math.max(0, v.flash - dt * 9); const k = v.flash * v.flash * (u.team === 0 ? 0.1 : (u.boss ? 0.05 : 0.16)); fig.u.uFlash.value.setRGB(k * 1.2, k * 0.9, k * 0.6); }
      if (u.team === 0) { an.down = u.down; fig.u.uDim.value = lerp(fig.u.uDim.value, u.down ? 0.4 : 1, Math.min(1, dt * 3)); }
      else if (u.stagT > 0 && an.stag < 0.5) an.stag = 0.7;
      // gait is driven by the distance actually travelled
      let gs = 0; if (v.px !== undefined && dt > 0) { const dx = v.sx - v.px, dz = v.sz - v.pz, d = Math.hypot(dx, dz); if (d < 1) gs = d / dt * (dx * Math.sin(v.face) + dz * Math.cos(v.face) < -1e-6 ? -1 : 1) / v.sc; v.ldx = dx; } v.px = v.sx; v.pz = v.sz; if (LF.rootOn && u.team === 0) { const R = LF.rootLog[u.cls] || (LF.rootLog[u.cls] = []); R.push([v.sx, v.sz, v.fig.trans[v.fig.rig.names.hips * 3 + 1]]); }
      an.update(dt, dt > 0 ? gs : 0, u.team === 0 ? u.ready > 0 : !!(u.seen && u.target));
      if (u.team === 0 && LF.gaitOn && dt > 0) gaitLog(u, v, v.ldx || 0, dt);
      if (u.team === 0 && dt > 0 && an.moveW > 0.7 && an.stL !== v.stL) { if (v.stL !== undefined && !paused) { LF.sndAt = u; LF.audio.play('step'); } } v.stL = an.stL;
      if (u.team === 1) {
        if (u.boss && u.enr) fig.u.uGlow.value = 3 + Math.sin(time * 9);
        if (u.chillT > 0) fig.u.uFlash.value.setRGB(0.02, 0.07, 0.14);
        if (u.hp < u.maxHp && !u.boss) bars.push({ x: u.x, y: (v.def.hpY || 1.6) + 0.2, z: u.z, f: u.hp / u.maxHp, w: 30 + u.radius * 36, elite: u.elite, chill: u.chillT > 0 });
      }
    }
  }
  // numbers for review: steps per second, reversals, drift of planted feet
  LF.gait = {};
  function gaitLog(u, v, dx, dt) {
    const L = LF.gait[u.cls] || (LF.gait[u.cls] = { t: 0, steps0: v.an.steps || 0, rev: 0, dir: 0, drift: [], cur: {} }), an = v.an, fig = v.fig; L.t += dt; L.steps = (an.steps || 0) - L.steps0;
    const vx = dx / dt; if (Math.abs(vx) > 0.3) { const d = vx > 0 ? 1 : -1; if (L.dir && d !== L.dir) L.rev++; L.dir = d; }
    fig.mesh.updateMatrixWorld();
    for (const side of ['l', 'r']) {
      const b = fig.rig.names[side + 'Foot'], H = fig.rig.head, planted = !!(an.pin && an.pin[side].on);
      fig.worldPoint(b, H[b * 3], H[b * 3 + 1], H[b * 3 + 2], tmp); const c = L.cur[side];
      if (planted) { if (!c) L.cur[side] = { x: tmp.x, z: tmp.z, m: 0, n: 0 }; else { c.m = Math.max(c.m, Math.hypot(tmp.x - c.x, tmp.z - c.z)); c.n++; } }
      else if (c) { if (c.n > 4) L.drift.push(c.m); L.cur[side] = null; }
    }
  }
  LF.ikReport = function () { const o = {}; for (const [u, v] of vis) if (u.team === 0 && v.an.ks) { const k = v.an.ks; o[u.cls] = { frames: k.frames, kneeMin: +k.kMin.toFixed(1), kneeMax: +k.kMax.toFixed(1), kneeMaxStepDeg: +k.kStep.toFixed(2), kneeOffForward: k.poleBad, footBehindHip: k.behind, toesOff: k.footBad }; } return o; };
  LF.gaitReport = function () { const o = {}; for (const k in LF.gait) { const L = LF.gait[k], d = L.drift.slice().sort((a, b) => a - b); o[k] = { secs: +L.t.toFixed(1), stepsPerSec: +(L.steps / Math.max(0.1, L.t)).toFixed(2), reversalsPer10s: +(L.rev / Math.max(0.1, L.t) * 10).toFixed(2), plants: d.length, driftMedianCm: d.length ? +(d[d.length >> 1] * 100).toFixed(1) : 0, driftP90Cm: d.length ? +(d[Math.floor(d.length * 0.9)] * 100).toFixed(1) : 0, driftMaxCm: d.length ? +(d[d.length - 1] * 100).toFixed(1) : 0 }; } return o; };
  // smoothness check: RMS of everything above 6 Hz (2nd-order Butterworth high-pass at 60 Hz sampling), in millimetres
  LF.rootLog = {};
  LF.rootReport = function () {
    const w0 = 2 * Math.PI * 6 / 60, cs = Math.cos(w0), al = Math.sin(w0) / (2 * 0.7071), b0 = (1 + cs) / 2 / (1 + al), b1 = -(1 + cs) / (1 + al), a1 = -2 * cs / (1 + al), a2 = (1 - al) / (1 + al);
    const pass = v => { const o = new Array(v.length); let x1 = v[0], x2 = x1, y1 = 0, y2 = 0; for (let i = 0; i < v.length; i++) { const x = v[i], y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; o[i] = y; } return o; };
    const hp = (rows, k) => { let v = rows.map(r => r[k] - rows[0][k]); v = pass(pass(pass(v))); let s = 0, n = 0; for (let i = 60; i < v.length; i++) { s += v[i] * v[i]; n++; } return Math.sqrt(s / Math.max(1, n)) * 1000; };
    const o = {}; for (const k in LF.rootLog) { const r = LF.rootLog[k]; if (r.length > 80) o[k] = { n: r.length, xMm: +hp(r, 0).toFixed(2), zMm: +hp(r, 1).toFixed(2), yMm: +hp(r, 2).toFixed(2) }; } LF.rootLog = {}; return o; };
  const drng = mulberry(99);
  function stepDeath(u, v, dt) {
    const fig = v.fig, F = LF.fx, def = v.def, H = (def.hpY || 1.6);
    if (!v.dying) {
      v.dying = 0.0001; fig.u.uFlash.value.setRGB(0, 0, 0);
      const dx = Math.sin(v.face), dz = Math.cos(v.face);
      if (v.kind === 'shatter') { fig.shatter(drng, u.boss ? 3.2 : 2.4, -dx * 0.5, -dz * 0.5); F.dust(u.x, H * 0.4, u.z, u.boss ? 16 : 7, [0.12, 0.11, 0.1], u.radius, 2); F.chips(u.x, H * 0.5, u.z, u.boss ? 20 : 8, u.M.mat === 'metal' ? [0.2, 0.12, 0.08] : [0.16, 0.15, 0.13], 4); if (u.M.mat === 'metal') F.sparks(u.x, H * 0.5, u.z, 14, [0.8, 2.8, 1.4], 4); if (u.boss) { LF.shake(1); F.flash(u.x, H * 0.6, u.z, [0.7, 1, 0.8], 120, 0.6); F.ring(u.x, u.z, 0.5, 7, 0.9, [0.8, 2.2, 1.2]); } }
      else if (v.kind === 'burst') { F.chips(u.x, H * 0.5, u.z, 14, [0.2, 0.16, 0.07], 4); F.sparks(u.x, H * 0.5, u.z, 10, [0.8, 2.6, 1.0], 3.5); }
      else if (v.kind === 'gutter') { F.smoke(u.x, H * 0.7, u.z, 8, [0.09, 0.11, 0.1]); F.sparks(u.x, H * 0.7, u.z, 12, [0.8, 2.8, 1.4], 2.5); F.flash(u.x, H * 0.7, u.z, [0.6, 1, 0.75], 30, 0.3); }
      else { F.embers(u.x, 0.3, u.z, 14, null, 0.4, 1.4); }
    }
    v.dying += dt; const t = v.dying; fig.u.uGlow.value = Math.max(0, 1 - t * 2.5);
    if (v.kind === 'shatter') { fig.stepFree(dt); fig.solve(); fig.skin(); const k = clamp((t - 1.5) / 1.5, 0, 1); fig.u.uDisH.value = 0.6; fig.u.uDissolve.value = k; if (k > 0 && Math.random() < dt * 30) F.embers(u.x + (Math.random() - 0.5) * 1.5 * v.sc, 0.15, u.z + (Math.random() - 0.5) * 1.5 * v.sc, 1, v.def.disCol.map(c => c * 2.5), 0.1, 0.8); if (k > 0.3) fig.mesh.castShadow = false; }
    else if (v.kind === 'burn') { v.an.stag = 1; v.an.update(dt * 0.4, 0, false); fig.mesh.position.y = -0.25 * clamp(t / 1.8, 0, 1); const k = clamp(t / 1.9, 0, 1); fig.u.uDissolve.value = k; if (Math.random() < dt * 40) F.embers(u.x + (Math.random() - 0.5) * 0.6, k * H, u.z + (Math.random() - 0.5) * 0.6, 1, null, 0.1, 1.2); if (k > 0.5) fig.mesh.castShadow = false; }
    else if (v.kind === 'burst') { v.an.update(dt, 0, false); fig.u.uDissolve.value = clamp(t / 0.45, 0, 1); fig.mesh.scale.setScalar(v.sc * (1 + t * 0.6)); fig.mesh.castShadow = false; }
    else { v.an.update(dt, 0, false); fig.u.uDissolve.value = clamp(t / 0.9, 0, 1); fig.mesh.scale.set(v.sc * (1 - 0.5 * clamp(t / 0.9, 0, 1)), v.sc * (1 + 0.3 * t), v.sc * (1 - 0.5 * clamp(t / 0.9, 0, 1))); fig.mesh.castShadow = false; if (Math.random() < dt * 14) F.smoke(u.x, H * 0.6, u.z, 1, [0.08, 0.1, 0.09]); }
  }
  /* ----- lantern, lights ----- */
  let fogPull = 0, flareV = 0;
  function lights(dt) {
    const car = G.carrier, v = car && vis.get(car), L = W.lantern, GL = LF.gfx.lights;
    const run = G.run, fl = run ? run.flames : 3, hpk = run ? clamp(G.partyHp() * 1.6, 0.5, 1) : 1;
    const flick = 0.9 + 0.06 * Math.sin(time * 11.3) + 0.04 * Math.sin(time * 27.1 + 1) + (hpk < 0.8 ? 0.12 * Math.sin(time * 41) * (1 - hpk) : 0);
    if (G.flareV) { flareV = 1; G.flareV = 0; } flareV = Math.max(0, flareV - dt * 1.4);
    const base = (0.55 + 0.15 * fl) * hpk * flick;
    if (v && v.fig.fx.lan) {
      const f = v.fig.fx.lan; v.fig.mesh.updateMatrixWorld(); v.fig.worldPoint(f[0], f[1], f[2], f[3], tmp);
      L.position.set(tmp.x, tmp.y + 0.02, tmp.z); v.fig.u.uGlow.value = 6 * base * (1 + flareV * 3);
      GL[0].pos.copy(tmp);
    }
    const R = run ? G.lightRadius() : 9;
    L.intensity = 50 * base * (R / 9) * (1 + flareV * 2.5); L.distance = R * 2.7;
    GL[0].col.setRGB(1.0, 0.62, 0.3).multiplyScalar(L.intensity * 0.02);
    // waylights and the flash light scatter too
    let k = 1; for (const w of W.waylights) { if (k > 2) break; if (w.glow > 0.01 && Math.abs(w.x - G.anchor.x) < 60) { GL[k].pos.copy(w.lp); GL[k].col.setRGB(1.0, 0.6, 0.28).multiplyScalar(w.glow * 2.0); k++; } }
    for (; k <= 2; k++) GL[k].col.setRGB(0, 0, 0);
    GL[3].pos.copy(W.fxLight.position); GL[3].col.copy(W.fxLight.color).multiplyScalar(W.fxLight.intensity * 0.012);
    fogPull = Math.max(0, fogPull - dt * 0.05); LF.gfx.params.fogMul = 1 - 0.45 * Math.min(1, fogPull);
    LF.gfx.params.flash = Math.max(0, LF.gfx.params.flash - dt * 1.2);
    for (let i = W.waylights.length - 1; i >= 0; i--) { const w = W.waylights[i]; if (w.x < G.anchor.x - 70) { scene.remove(w.mesh); scene.remove(w.light); w.mat.dispose(); W.waylights.splice(i, 1); } }
  }
  /* ----- camera ----- */
  const camS = { fx: 0, fz: 0, zoom: 1, init: false, yaw: 0, bossK: 0 };
  LF.shakeA = 0;
  function camera(dt) {
    const an = G.anchor, hs = G.heroes.filter(h => !h.down); let tx = an.x + 1.2, tz = pathZ(an.x), n = 1;
    for (const h of hs) { tx += h.rx === undefined ? h.x : h.rx; tz += h.rz === undefined ? h.z : h.rz; n++; } tx /= n; tz /= n;
    const ms = G.mons.filter(m => m.hp > 0 && m.seen && m.x - an.x < 13); if (ms.length) { let mx = 0, mz = 0; for (const m of ms) { mx += m.rx === undefined ? m.x : m.rx; mz += m.rz === undefined ? m.z : m.rz; } tx = lerp(tx, mx / ms.length, 0.36); tz = lerp(tz, mz / ms.length, 0.3); } else if (an.moving) tx += 2.4;
    let zoom = 1.28, yaw = 0; if (ms.length) { let lo = 1e9, hi = -1e9; for (const h of hs) { lo = Math.min(lo, h.x); hi = Math.max(hi, h.x); } for (const m of ms) { lo = Math.min(lo, m.x); hi = Math.max(hi, m.x + m.radius); } zoom = clamp((hi - lo + 6) / 12, 1.34, 1.8); tx = lerp(tx, (lo + hi) / 2, 0.7); }
    if (G.state === 'title') { zoom = 0.62; yaw = 0.5 + Math.sin(time * 0.07) * 0.35; tx = an.x + 0.5; }
    else if (G.state === 'relight' || G.state === 'choice') { zoom = 0.8; if (G.wayX !== null) { tx = lerp(tx, G.wayX, 0.5); tz = lerp(tz, pathZ(G.wayX) - 1.5, 0.5); } }
    else if (G.bossRef && G.bossRef.act && !G.bossRef.act.hit && G.bossRef.act.wind > 1) zoom *= 0.92;
    else if (G.state === 'wipe') zoom = 0.85;
    if (flareV > 0.2) zoom *= 0.9;
    if (closeView) { zoom = 0.42; const h = hs[0] || G.heroes[0]; if (h) { tx = h.x; tz = h.z; } }
    if (!camS.init) { camS.fx = tx; camS.fz = tz; camS.zoom = zoom; camS.yaw = yaw; camS.vfx = camS.vfz = camS.vzoom = 0; camS.init = true; }
    { const sp = (key, tg, w) => { const vk = 'v' + key; camS[vk] = (camS[vk] || 0) + ((tg - camS[key]) * w * w - 2 * w * (camS[vk] || 0)) * dt; camS[key] += camS[vk] * dt; }; const d2 = Math.min(dt, 0.05); if (d2 > 0) { const dt0 = dt; dt = d2; sp('fx', tx, 3.4); sp('fz', tz, 3.4); sp('zoom', zoom, 2.6); dt = dt0; } } camS.yaw += (yaw - camS.yaw) * (1 - Math.exp(-dt * 1.2));
    const z = camS.zoom, drift = Math.sin(time * 0.11) * 0.5, low = G.state === 'title' ? 0.42 : (closeView ? 0.55 : 1);
    let ox = -4.4 + drift, oy = 8.3 * low, oz = 12.4; const cy = Math.cos(camS.yaw), sy = Math.sin(camS.yaw), rx = ox * cy + oz * sy, rz = -ox * sy + oz * cy;
    LF.shakeA = Math.max(0, LF.shakeA - dt * 2.6); const sh = LF.noShake ? 0 : LF.shakeA * LF.shakeA * 0.22;
    cam.position.set(camS.fx + rx * z + (Math.random() - 0.5) * sh, oy * z + (G.state === 'title' ? 0.6 : 0) + (Math.random() - 0.5) * sh, camS.fz + rz * z + (Math.random() - 0.5) * sh);
    const ly = G.state === 'title' ? 1.5 : (closeView ? 1.1 : 0.9); cam.lookAt(camS.fx, ly, camS.fz); cam.updateMatrixWorld();
    LF.gfx.params.focus = cam.position.distanceTo(tmp.set(camS.fx, ly, camS.fz)); LF.gfx.params.aperture = closeView || G.state === 'title' ? 1.1 : 0.6;
    LF.camFocus = camS;
  }
  /* ----- portraits: rendered from the 3D figures ----- */
  const pcache = {}, pfig = {}; let pq = [];
  LF.copyPortrait = function (cls, cv) { const c = pcache[cls]; if (c) { const x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(c, 0, 0, cv.width, cv.height); } else { if (!pq.some(q => q.cls === cls)) pq.push({ cls }); (LF._pwait = LF._pwait || []).push({ cls, cv }); } };
  function renderPortrait(cls) {
    let o = pfig[cls]; if (!o) { const fig = LF.makeFig(cls, false), def = LF.HEROES[cls], an = new HumanAnim(fig, def.style); an.t = 3.1; an.ph = 0; o = pfig[cls] = { fig, an }; scene.add(fig.mesh); }
    const sx = G.anchor.x, sz = pathZ(sx) + 70, sy = terrH(sx, sz) + 0.02, m = o.fig.mesh; m.visible = true; m.position.set(sx, sy, sz); m.rotation.y = 0.5;
    for (let i = 0; i < 3; i++) o.an.update(0.016, 0, false); o.an.t = 3.1;
    const L = W.lantern, keep = { p: L.position.clone(), i: L.intensity, d: L.distance, fov: cam.fov, cp: cam.position.clone(), cq: cam.quaternion.clone(), par: Object.assign({}, LF.gfx.params), l0: LF.gfx.lights[0].col.clone() };
    L.position.set(sx - 1.3, sy + 2.3, sz + 1.5); L.intensity = 16; L.distance = 12; LF.gfx.lights[0].col.setRGB(0, 0, 0);
    cam.fov = 13; cam.updateProjectionMatrix(); const hy = cls === 'lamplighter' ? 1.63 : 1.6; cam.position.set(sx + 1.55, sy + hy + 0.08, sz + 2.9); cam.lookAt(sx, sy + hy, sz); cam.updateMatrixWorld();
    Object.assign(LF.gfx.params, { focus: 3.3, aperture: 0.6, fogMul: 0.25, exposure: 0.8, vignette: 0.3 });
    W.update(0, sx, sz, sx); LF.gfx.render(scene, cam, time);
    const c = pcache[cls] || (pcache[cls] = document.createElement('canvas')); c.width = c.height = 128; const g = LF.gfx, s = Math.round(Math.min(g.W, g.H) * 0.36);
    try { c.getContext('2d').drawImage(g.renderer.domElement, Math.round((g.W - s) / 2), Math.round((g.H - s) / 2 - s * 0.02), s, s, 0, 0, 128, 128); } catch (e) { }
    L.position.copy(keep.p); L.intensity = keep.i; L.distance = keep.d; cam.fov = keep.fov; cam.updateProjectionMatrix(); cam.position.copy(keep.cp); cam.quaternion.copy(keep.cq); cam.updateMatrixWorld(); Object.assign(LF.gfx.params, keep.par); LF.gfx.lights[0].col.copy(keep.l0); m.visible = false;
  }
  function portraits() {
    if (LF.wantPortraits && LF.ui) { LF.wantPortraits = false; for (const t of LF.ui.portraitTargets()) { if (pcache[t.cls]) LF.copyPortrait(t.cls, t.cv); else LF.copyPortrait(t.cls, t.cv); } }
    if (pq.length) { const q = pq.shift(); renderPortrait(q.cls); W.update(0, camS.fx, camS.fz, camS.fx); const w = LF._pwait || []; LF._pwait = w.filter(x => { if (x.cls === q.cls) { LF.copyPortrait(x.cls, x.cv); return false; } return true; }); }
  }
  /* ----- hooks from the game ----- */
  LF.onWaylight = x => { if (!LF.quiet) W.addWaylight(x, false); else LF._pendWay = x; };
  LF.onRelight = () => { const w = W.waylights[W.waylights.length - 1]; if (!w) return; w.lit = true; fogPull = 1.6; const p = w.lp; LF.fx.embers(p.x, p.y, p.z, 60, [3, 1.6, 0.4], 0.5, 2); LF.fx.sparks(p.x, p.y, p.z, 30, [3.5, 2, 0.7], 5); LF.fx.flash(p.x, p.y, p.z, [1, 0.7, 0.35], 320, 1.4); LF.fx.ring(w.x, w.z, 0.5, 16, 1.6, [2, 1.2, 0.5]); LF.gfx.params.flash = 0.22; };
  LF.onShift = dx => { W.shift(dx); LF.fx.shift(dx); camS.fx -= dx; };
  LF.reparty = function () { for (const [u] of vis) if (u.team === 0) rmVis(u); const m = G.mons; for (const u of m) rmVis(u); G.resetField(); G.setupStage(false); LF.fx.clear(); G.save(); };
  LF.restartRun = function () { LF.clearVis(); LF.fx.clear(); W.clearWaylights(); G.newRun(); camS.init = false; if (LF.ui) LF.ui.pick = G.run.party.slice(); LF.ui.dim(0); G.save(); };
  LF.begin = function (fresh) {
    LF.audio.start(); if (LF.audio.ctx && LF.audio.ctx.state === 'suspended') LF.audio.ctx.resume();
    if (fresh) { LF.clearVis(); W.clearWaylights(); G.P.run = null; G.newRun(); titleWay(); }
    LF.ui.hideTitle(); G.state = 'walk'; G.stT = 0; LF.ui.pick = G.run.party.slice(); LF.audio.play('push');
    const a = !fresh && LF._away; LF._away = null; if (a) { const lv = G.applyAway(a); LF.ui.openAway(a, lv); }
  };
  function titleWay() { W.clearWaylights(); const w = W.addWaylight(G.anchor.x + 2.2, true); w.glow = 1; }
  /* ----- input ----- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function onClick(e) {
    LF.audio.start(); if (LF.audio.ctx && LF.audio.ctx.state === 'suspended') LF.audio.ctx.resume();
    if (!G.run || G.panel || G.state === 'title' || LF.ui.isOpen()) return;
    const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    let best = null, bd = 52; for (const m of G.mons) { if (m.hp <= 0 || !m.seen) continue; const H = (LF.MONSTERS[m.type].hpY || 1.6) * 0.5, p = LF.fx.project(m.x, H, m.z), d = Math.hypot(p[0] - px, p[1] - py) - m.radius * 14; if (d < bd) { bd = d; best = m; } }
    if (best) { G.setFocus(best); LF.fx.mark('click', best.x, best.z, best.radius + 0.5, 0.6); LF.fx.float(best.x, (LF.MONSTERS[best.type].hpY || 1.6) + 0.6, best.z, '\uc9d1\uc911', '#ffd27a', 12, 0.5); return; }
    ndc.set(px / r.width * 2 - 1, -(py / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); if (ray.ray.intersectPlane(plane, tmp2)) { G.setRally(tmp2.x, tmp2.z); LF.fx.mark('click', G.rally.x, G.rally.z, 0.7, 0.7); }
  }
  function onKey(e) {
    LF.audio.start();
    if (e.key === 'Escape') { if (LF.ui.closable) LF.ui.close(); return; }
    if (e.key === 'F8') { e.preventDefault(); LF.ui.soundDebug(); return; }
    if (LF.ui.key(e.key)) return;
    if (G.state === 'title') { if (e.key === 'Enter' || e.key === ' ') LF.begin(false); return; }
    if (e.key === ' ') { e.preventDefault(); G.fireFlare(true); }
    else if (e.key === 'm' || e.key === 'M') { if (LF.ui.isOpen() && G.panel === 'menu') LF.ui.close(); else LF.ui.openMenu(); }
    else if (e.key === 'c' || e.key === 'C') closeView = !closeView;
    else if (e.key === '+' || e.key === '=') { P.speed = P.speed === 1 ? 2 : 4; LF.ui.refreshTop(); }
    else if (e.key === '-') { P.speed = P.speed === 4 ? 2 : 1; LF.ui.refreshTop(); }
  }
  /* ----- loop ----- */
  let saveT = 0, fpsN = 0, fpsT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (LF.gfx.lost) return;
    let dtR = (now - last) / 1000; last = now; if (!(dtR > 0)) dtR = 0.016;
    if (dtR > 1.5 && G.run && G.state !== 'title') { catchUp += Math.min(900, dtR) * P.speed; dtR = 0.016; }
    dtR = Math.min(0.1, dtR); if (LF.stepMode) { dtR = LF.adv || 0; LF.adv = 0; } if (LF.fixed) dtR = 1 / 60;
    fpsN++; fpsT += dtR; if (fpsT >= 1) { LF.fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
    const paused = !!G.panel || G.state === 'title' || !G.run;
    let gdt = 0, adt = 0;
    if (catchUp > 0 && !paused) { // the tab was hidden: run the missed road quietly
      LF.quiet = true; const t0 = performance.now(); while (catchUp > 0 && performance.now() - t0 < 24) { G.step(DT); catchUp -= DT; if (G.panel) G.panel = null; } LF.quiet = false; if (catchUp <= 0) { catchUp = 0; LF.clearVis(); LF.fx.clear(); W.clearWaylights(); if (LF._pendWay && G.wayX !== null) W.addWaylight(G.wayX, false); camS.init = false; }
    } else if (!paused && (LF.hitStop = Math.max(0, (LF.hitStop || 0) - dtR)) > 0) {
      gdt = 0;
    } else if (!paused) {
      LF.slowMo = Math.max(0, (LF.slowMo || 0) - dtR); const sm = LF.slowMo > 0 ? lerp(1, 0.3, Math.min(1, LF.slowMo / 0.5)) : 1;
      adt = dtR * P.speed * sm; acc += adt; let n = 0; while (acc >= DT && n < 14) { G.step(DT); acc -= DT; n++; gdt += DT; if (G.panel || !G.run) break; } if (acc > DT * 4) acc = 0;
    }
    LF.alpha = paused || catchUp > 0 ? 1 : clamp(acc / DT, 0, 1);
    const vdt = paused ? dtR * 0.35 : adt; time += paused ? dtR * 0.35 : Math.max(gdt, dtR * 0.2);
    if (G.run) { const car = G.heroes.find(h => h.cls === 'lamplighter') || G.heroes[G.heroes.length - 1]; G.carrier = car; }
    syncVisuals(vdt, paused); lights(dtR); camera(dtR);
    W.update(paused ? dtR * 0.35 : Math.max(gdt, dtR * 0.3), camS.fx, camS.fz, camS.fx);
    LF.fx.update(vdt, time, G.carrier ? G.carrier.x : 0, G.carrier ? G.carrier.z : 0);
    portraits();
    if (LF.rootOn) (LF.rootLog._cam || (LF.rootLog._cam = [])).push([cam.position.x, cam.position.z, cam.position.y]);
    LF.gfx.render(scene, cam, time);
    LF.fx.draw2d(paused ? 0 : Math.max(gdt, 0.0001));
    LF.ui.update(dtR);
    let danger = 0; if (G.run) { danger = G.state === 'boss' ? 1 : (G.state === 'fight' ? 0.55 : 0.1); if (G.partyHp() < 0.4) danger = Math.min(1, danger + 0.3); }
    { let fire = 0, fp = 0; for (const w of W.waylights) if (w.glow > 0.3) { const d = Math.hypot(w.x - camS.fx, w.z - camS.fz), k = w.glow * (1 - smooth(5, 24, d)); if (k > fire) { fire = k; fp = clamp((w.x - camS.fx) / 14, -1, 1) * 0.4; } } LF.audio.update(dtR, danger, !!G.panel, fire, fp); }
    if (G.state === 'wipe') LF.ui.dim(Math.min(0.75, G.stT / 2.5) * (G.run && G.run.flames <= 0 ? 1.1 : 0.8)); else if (G.state !== 'runend') LF.ui.dim(0);
    LF.ui.fall(G.state === 'wipe' && G.run && G.run.flames <= 0 && G.stT > 0.6 ? 1 : 0);
    saveT += dtR; if (saveT > 15) { saveT = 0; G.save(); }
    LF.frames = (LF.frames || 0) + 1;
  }
  LF.boot = function () {
    const canvas = document.getElementById('gl'), renderer = LF.gfx.init(canvas); GX = LF.gfx;
    scene = LF.scene = new THREE.Scene(); cam = LF.cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 2600);
    W.init(scene, renderer); LF.fx.init(scene, cam);
    const onResize = () => { GX.resize(); cam.aspect = GX.W / GX.H; cam.updateProjectionMatrix(); LF.fx.resize(); if (LF.ui && LF.ui.resize) LF.ui.resize(); };
    window.addEventListener('resize', onResize); onResize();
    if (QS.has('gallery')) return LF.gallery(scene, cam);
    LF.ui.init(); onResize();
    const had = G.load(); LF.audio.setVol && LF.audio.setVol();
    if (QS.has('speed')) P.speed = clamp(qnum('speed', 1), 0.25, 16);
    let hasRun = had && P.run && P.run.party && P.run.party.length === 4;
    if (hasRun) { LF._away = G.away(); try { G.resume(); } catch (e) { hasRun = false; } }
    if (!hasRun) G.newRun();
    G.state = 'title'; titleWay(); LF.ui.pick = G.run.party.slice(); LF.ui.refreshTop();
    canvas.addEventListener('pointerdown', onClick); window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', () => { LF.audio.start(); if (LF.audio.ctx && LF.audio.ctx.state === 'suspended') LF.audio.ctx.resume(); }, { once: false, capture: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); });
    window.addEventListener('beforeunload', () => G.save());
    if (QS.has('autostart') || G.DEMO) { if (G.DEMO) P.speed = qnum('speed', 1); LF.begin(false); } else LF.ui.showTitle(hasRun);
    last = performance.now(); requestAnimationFrame(frame);
  };
  // review helpers
  LF.debug = {
    close(v) { closeView = v === undefined ? !closeView : v; }, stage(n) { G.run.stage = n; G.resetField(); LF.clearVis(); G.setupStage(false); },
    spawn(t, n) { for (let i = 0; i < (n || 1); i++) { const x = G.anchor.x + 12 + i; G.mons.push; } }, flare() { G.flare = 1; G.fireFlare(true); }, kill() { for (const h of G.heroes) { h.hp = 1; } }, win() { for (const m of G.mons) m.hp = Math.min(m.hp, 1); },
    cam: camS, vis
  };
  /* ----- gallery: every figure under the game's light ----- */
  LF.gallery = function (scene, cam) {
    const figs = [], set = QS.get('set'), all = set === 'monsters' ? LF.MONSTERS : (set === 'all' ? Object.assign({}, LF.HEROES, LF.MONSTERS) : LF.HEROES), sp = qnum('sp', 1.7), allDefs = Object.assign({}, LF.HEROES, LF.MONSTERS);
    const only = QS.get('fig'), animName = QS.get('anim') || 'idle', tFix = QS.has('t') ? +QS.get('t') : undefined; let i = 0, tx = 0;
    for (const n in (only ? allDefs : all)) {
      if (only && only !== n) continue; const def = allDefs[n], fig = def.build({ lantern: QS.has('lan') }), an = new (def.animClass || HumanAnim)(fig, def.style);
      const x = only ? 0 : tx; tx += sp * Math.max(1, (def.scale || 1) * 0.8); fig.mesh.position.set(x + 100, 0, pathZ(x + 100)); fig.mesh.scale.setScalar(def.scale || 1); fig.mesh.rotation.y = qnum('face', 0.5); scene.add(fig.mesh); figs.push({ n, def, fig, an, x: x + 100 }); i++;
    }
    let cx = 100 + (only ? 0 : (tx - sp) / 2), cz = pathZ(cx); const GXg = LF.gfx, sc1 = only ? (allDefs[only].scale || 1) : 1;
    const yaw = qnum('yaw', 0.35), dist = qnum('dist', only ? 5.2 * sc1 : 12), ch = qnum('ch', 1.5 * sc1), ty = qnum('ty', (only ? 0.95 : 1.0) * sc1);
    W.lantern.position.set(cx + qnum('lx', -2.2), qnum('ly', 3.2), cz + qnum('lz', 0.8)); W.lantern.intensity = qnum('li', 40);
    GXg.params.ao = qnum('ao', 1); let lastT = performance.now(), tm = 0; const speed = qnum('speed', 1); let state = { anim: animName, t: tFix, orbit: QS.has('orbit'), yaw };
    LF.dbg = { figs, state, verts: figs.map(f => f.n + ':' + f.fig.nv) };
    window.addEventListener('keydown', e => { const k = e.key; if (k === 'o') state.orbit = !state.orbit; if (k === 'ArrowLeft') state.yaw -= 0.3; if (k === 'ArrowRight') state.yaw += 0.3; const map = { '1': 'idle', '2': 'walk', '3': 'ready', '4': 'attack', '5': 'skill', '6': 'skill2', '7': 'stag', '8': 'down', '9': 'die' }; if (map[k]) { state.anim = map[k]; state.t = undefined; state.died = false; } });
    function frameG(now) {
      requestAnimationFrame(frameG); let dt = Math.min(0.05, (now - lastT) / 1000) * speed; lastT = now; if (QS.has('stepmode')) { dt = state.adv || 0; state.adv = 0; } tm += dt; const A = state.anim;
      for (const f of figs) {
        if (QS.has('turn')) f.fig.mesh.rotation.y += dt * qnum('turn', 1.6); if (LF.HEROES[f.n]) { const m = f.fig.mesh; f.an.xf = { x: m.position.x, z: m.position.z, f: m.rotation.y, s: f.def.scale || 1 }; f.an.ikOn = !QS.has('noik'); }
        const cl = f.def.style.clips, cn = cl[A] ? A : (A === 'skill' ? Object.keys(cl)[1] : (A === 'skill2' ? Object.keys(cl)[2] : (A === 'special' ? 'special' : 'attack'))) || 'attack';
        if (A === 'die') { if (!state.died) { f.dieT = 0; const v = { fig: f.fig, an: f.an, def: f.def, face: f.fig.mesh.rotation.y, sc: f.def.scale || 1, dying: 0, kind: f.def.death || 'burn' }; f.v = v; } const u = { x: f.fig.mesh.position.x, z: f.fig.mesh.position.z, radius: 0.5, M: { mat: 'stone' }, boss: false }; if (state.t !== undefined) { if (!f.v.dying) stepDeath(u, f.v, 0.001); while (f.v.dying < state.t) stepDeath(u, f.v, 0.016); state.frozen = true; } else stepDeath(u, f.v, dt); continue; }
        if (['idle', 'walk', 'ready', 'down', 'stag'].indexOf(A) < 0 && cl[cn]) { if (state.t !== undefined) { f.an.act = cl[cn]; f.an.update(dt, 0, true, state.t < 0 ? f.an.act.hit : state.t); } else { if (!f.an.act) f.an.play(cn, 0.5, 0.7); f.an.update(dt, 0, true); } }
        else { f.an.down = A === 'down'; if (A === 'stag' && f.an.stag <= 0.5) f.an.stag = state.t !== undefined ? 0.5 : 1; f.an.update(dt, f.spd !== undefined ? f.spd : (A === 'walk' ? qnum('ws', f.def.animClass === QuadAnim ? 3 : 2.2) : 0), A === 'ready'); }
      }
      if (A === 'die') state.died = true;
      if (only && QS.has('travel') && figs[0]) { const f0 = figs[0], m = f0.fig.mesh, wsp = state.anim === 'walk' ? qnum('ws', 1.8) : 0; f0.gv = lerp(f0.gv || 0, wsp, 1 - Math.exp(-dt * 6)); m.position.x += Math.sin(m.rotation.y) * f0.gv * dt; m.position.z = pathZ(m.position.x); f0.spd = f0.gv; cx = m.position.x; cz = m.position.z; W.lantern.position.set(cx + qnum('lx', -2.2), qnum('ly', 3.2), cz + qnum('lz', 0.8)); }
      const a = state.yaw + (state.orbit ? tm * 0.3 : 0); cam.position.set(cx + Math.sin(a) * dist, ch, cz + Math.cos(a) * dist); cam.lookAt(cx, ty, cz); cam.updateMatrixWorld();
      W.update(dt, cx, cz, cx); LF.fx.update(dt, tm, cx, cz); const L = GXg.lights[0]; L.pos.copy(W.lantern.position); L.col.setRGB(1.0, 0.6, 0.28).multiplyScalar(W.lantern.intensity * 0.018);
      GXg.params.focus = dist; GXg.params.aperture = qnum('ap', 1); GXg.render(scene, cam, tm); LF.frames = (LF.frames || 0) + 1;
    }
    requestAnimationFrame(frameG);
  };
  window.addEventListener('load', () => { try { LF.boot(); } catch (e) { console.error(e); const el = document.getElementById('lost'); if (el) { el.style.display = 'flex'; el.textContent = 'Lanternfall failed to start: ' + e.message; } } });
})();
