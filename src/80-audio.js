/* LANTERNFALL - sound. No oscillators anywhere: every event plays a recorded sample from our own library (pitched and
   low-passed for spells and interface), there is one campfire loop near lit waylights, a soft filtered-noise wind, and
   an embedded playlist for music. Quiet master, gentle safety compressor, hard rate limits, fades on every source. */
LF.audio = (function () {
  const A = { started: false, maxVoices: 0, musicState: 'none' }; let ctx, master, comp, sfx, mus, amb, voices = [], windG = null, fireG = null, firePan = null;
  const P = () => LF.game.P.vol, dB = v => Math.pow(10, v / 20);
  const MASTER = qnum('gain', 1.0), FIRE_DB = -22, MUSIC_DB = qnum('musicdb', -14), DUCK_DB = -5;
  // event -> one plain library sample [group, dB]. Nothing is pitched, filtered or layered: native rate with at most +-3% variation.
  // key = shared rate-limit group; min = least seconds between two plays of the event. An event with no fitting sample is silent.
  const E = (key, min, layer) => ({ key, min, layers: [layer] });
  const EV = {
    swing: E('swing', 0, ['swing', -14]), swingHeavy: E('swing', 0, ['swing_heavy', -13]), cleave: E('swing', 0, ['swing_heavy', -12]), throw: E('swing', 0, ['throw', -16]),
    bash: E('block', 0, ['block', -10]), hitShield: E('block', 0, ['block', -10]), holdLine: E('sting', 8, ['block', -9]), hitMetal: E('armour', 0, ['armour', -9]),
    hitStone: E('impact', 0, ['hit_stone', -9]), hitWood: E('impact', 0, ['hit_wood', -9]), hitSoft: E('impact', 0, ['hit_soft', -9]), arrowHit: E('arrow', 0, ['arrow_hit', -10]), glass: E('impact', 0, ['glass', -14]),
    bow: E('bow', 0, ['bow', -13]), bowHeavy: E('bow', 0, ['bow', -13]), bowVolley: E('bow', 0, ['bow', -13]),
    atk_thornling: E('creature', 0.3, ['atk_thornling', -14]), atk_peatwight: E('creature', 0.3, ['atk_peatwight', -13]), atk_gloamhound: E('creature', 0.3, ['atk_hound', -13]), atk_rustbound: E('creature', 0.3, ['atk_rustbound', -13]),
    atk_cairnback: E('creature', 0.3, ['atk_stone', -12]), atk_barrowking: E('creature', 0.3, ['swing_heavy', -11]), atk_mossjaw: E('creature', 0.3, ['atk_stone', -11]), atk_hollowstag: E('creature', 0.3, ['atk_hound', -11]),
    die_thornling: E('death', 0, ['hit_wood', -9]), die_peatwight: E('death', 0, ['die_peatwight', -12]), die_gloamhound: E('death', 0, ['die_wood', -12]), die_gloamwisp: E('death', 0, ['die_wisp', -13]), die_rustbound: E('death', 0, ['die_metal', -11]),
    die_cairnback: E('death', 0, ['die_stone', -10]), die_barrowking: E('death', 0, ['die_metal', -9]), die_mossjaw: E('death', 0, ['collapse', -9]), die_hollowstag: E('death', 0, ['die_wood', -9]),
    heroDown: E('death', 0, ['body', -12]), sunder: E('impact', 0, ['heavy_land', -10]), bossSlam: E('sting', 2, ['tremor', -10]),
    bossIntro: E('sting', 8, ['thunder', -10]), bossWind: E('sting', 2, ['rumble', -12]), enrage: E('sting', 8, ['thunder', -11]), bossDown: E('sting', 8, ['collapse', -10]), push: E('ui', 1, ['gate_open', -16]), hold: E('ui', 1, ['gate_close', -18]),
    // spells: one recorded cast or impact, once per cast
    fireSmall: E('spell', 0.5, ['cast_fire_small', -17]), fireCast: E('spell', 0.5, ['cast_fire', -14]), fireBurst: E('spell', 0.5, ['fire_burst', -12]), cinderLand: E('spell', 1, ['fire_burst', -16]), hitFire: E('spell', 0.6, ['fire_burst', -19]),
    frostSmall: E('spell', 0.5, ['cast_frost_small', -17]), frostCast: E('spell', 0.5, ['cast_frost', -14]), frostField: E('spell', 0.5, ['ice', -14]), shatter: E('spell', 0.5, ['shatter', -12]), hitFrost: E('spell', 0.6, ['ice', -18]),
    gloamCast: E('spell', 1, ['cast_gloam', -18]), hitGloam: E('spell', 1, ['gloam_hit', -18]), kindle: E('spell', 1, ['kindle', -16]), quick: E('spell', 1, ['quick', -18]), heal: E('spell', 1, ['heal', -18]), revive: E('spell', 1, ['heal', -18]),
    lanternFlare: E('flare', 3, ['flare', -9]), flameOut: E('flare', 2, ['fizzle', -10]), lanternFall: E('flare', 2, ['die_metal', -8]), waylight: E('flare', 2, ['ignite', -10]),
    click: E('ui', 0, ['ui_a', -26]), card: E('ui', 0.2, ['ui_b', -22]), buy: E('ui', 0.2, ['coins', -22]), gear: E('ui', 0.3, ['pickup', -22]), gear2: E('ui', 0.3, ['pickup', -20]), relic: E('ui', 1, ['pickup_big', -18]),
    levelUp: E('ui', 1, ['chime', -20]), unlock: E('ui', 1, ['chime', -20]), step: E('footstep', 0.45, ['step', -30])
  };
  A.EV = EV;
  const CATS = { swords: 'swing swingHeavy cleave hitMetal sunder', shields: 'bash hitShield holdLine', bows: 'bow bowHeavy bowVolley throw', arrowhits: 'arrowHit glass hitStone hitWood hitSoft',
    spellcasts: 'fireSmall fireCast frostSmall frostCast frostField gloamCast kindle quick heal revive lanternFlare flameOut waylight lanternFall', spellhits: 'fireBurst cinderLand hitFire shatter hitFrost hitGloam',
    creatures: 'atk_thornling atk_peatwight atk_gloamhound atk_rustbound atk_cairnback atk_barrowking atk_mossjaw atk_hollowstag die_thornling die_peatwight die_gloamhound die_gloamwisp die_rustbound die_cairnback die_barrowking die_mossjaw die_hollowstag heroDown bossSlam bossIntro bossWind bossDown enrage',
    ui: 'click gear gear2 relic buy card hold push levelUp unlock', footsteps: 'step' };
  for (const c in CATS) for (const n of CATS[c].split(' ')) if (EV[n]) EV[n].cat = c;
  A.CATS = ['swords', 'shields', 'bows', 'arrowhits', 'spellcasts', 'spellhits', 'creatures', 'ui', 'footsteps', 'music', 'campfire', 'wind'];
  const off = () => (P().off || {}), cn = [], cp = [], OLDW = QS.has('oldwrites'); A.recent = [];
  // parameter writes: only when the target really changes, always as a ramp
  const lastP = {};
  function ramp(param, key, v, tc) { if (!OLDW && lastP[key] !== undefined && Math.abs(lastP[key] - v) < 0.004) return; lastP[key] = v; param.setTargetAtTime(v, ctx.currentTime, tc); cp.push(ctx.currentTime); }
  const bufs = {}; A.bufs = bufs; const songs = [];
  function b64buf(b64) { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8.buffer; }
  A.start = function () {
    if (A.started) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    A.started = true; A.ctx = ctx;
    master = ctx.createGain(); comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.connect(master); mus = ctx.createGain(); mus.connect(master); amb = ctx.createGain(); amb.gain.value = 1; amb.connect(master);
    // meter: the master output, read every frame
    { const M = A.m = { n: 0, sum: 0, peak: 0, over: 0, hi: 0, lo: 0, cen: 0, cenW: 0 }, an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; A._anN = an; A.meterOn = function () { if (!A.metering) { A.metering = true; comp.connect(an); } }; const tb = new Float32Array(2048), fb = new Float32Array(an.frequencyBinCount), hz = ctx.sampleRate / an.fftSize;
      A.meter = () => { an.getFloatTimeDomainData(tb); for (let i = 0; i < tb.length; i++) { const v = tb[i], q = v < 0 ? -v : v; M.sum += v * v; if (q > M.peak) M.peak = q; if (q > 0.891) M.over++; } M.n += tb.length;
        an.getFloatFrequencyData(fb); for (let k = 1; k < fb.length; k++) { const p = Math.pow(10, fb[k] / 10); if (!(p > 0)) continue; const f = k * hz; M.cen += p * f; M.cenW += p; if (f > 6000) M.hi += p; else M.lo += p; } }; A.mt = 0; }
    // samples
    const all = LF.SFX || {}; for (const g in all) { bufs[g] = []; for (const b64 of all[g]) { try { ctx.decodeAudioData(b64buf(b64), buf => bufs[g].push(buf), () => { }); } catch (e) { } } }
    // campfire loop, heard near a lit waylight
    if (LF.CAMPFIRE) { try { ctx.decodeAudioData(b64buf(LF.CAMPFIRE), buf => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; fireG = ctx.createGain(); fireG.gain.value = 0.0001; s.connect(fireG); if (ctx.createStereoPanner) { firePan = ctx.createStereoPanner(); fireG.connect(firePan); firePan.connect(amb); } else fireG.connect(amb); s.start(); A.fireOk = true; }, () => { }); } catch (e) { } }
    // music: the embedded playlist
    const list = (typeof MUSIC_B64 !== 'undefined' && MUSIC_B64) ? (Array.isArray(MUSIC_B64) ? MUSIC_B64 : [MUSIC_B64]) : [];
    if (list.length) { A.musicState = 'decoding'; A.tracks = list.length; let left = list.length;
      list.forEach((b64, i) => { const fail = () => { A.musicFailed = (A.musicFailed || 0) + 1; console.error('Lanternfall: music track ' + (i + 1) + ' could not be decoded in this browser'); if (LF.ui) LF.ui.toast('\uc74c\uc545 \ud2b8\ub799 ' + (i + 1) + '\uc744(\ub97c) \ub514\ucf54\ub529\ud560 \uc218 \uc5c6\ub2e4', 'bad'); if (--left === 0 && !songs.some(Boolean)) A.musicState = 'failed'; };
        try { ctx.decodeAudioData(b64buf(b64), buf => { songs[i] = buf; A.decoded = (A.decoded || 0) + 1; if (--left === 0 || i === 0) A.musicState = 'playing'; }, fail); } catch (e) { fail(); } }); }
    A.setVol();
  };
  A.setVol = function () { if (!A.started) return; const v = P(), t = ctx.currentTime; master.gain.setTargetAtTime(v.mute ? 0 : MASTER * (v.master === undefined ? 1 : v.master), t, 0.04); sfx.gain.setTargetAtTime(v.sfx / 0.8, t, 0.04); };
  /* ----- voices: at most 8 at once; never more than 3 from one group in any second; one event at most every `min` seconds ----- */
  const MAXV = 8, FADE = 0.005, win = {}, lastK = {}, lastE = {}, lastI = {};
  function kill(v, fade) { if (v.dead) return; v.dead = true; cn.push(ctx.currentTime); const t = ctx.currentTime; try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(Math.max(0.0001, v.g.gain.value), t); v.g.gain.linearRampToValueAtTime(0.0001, t + fade); v.src.stop(t + fade + 0.01); } catch (e) { } }
  function admit(name, ev) {
    const now = ctx.currentTime, key = ev.key; if (ev.min && lastE[name] !== undefined && now - lastE[name] < ev.min) return false;
    if (lastK[key] !== undefined && now - lastK[key] < 0.12) return false;
    const b = win[key] || (win[key] = []); while (b.length && now - b[0] > 1.02) b.shift(); if (b.length >= 3) return false;
    voices = voices.filter(v => !v.dead && v.end > now); const same = voices.filter(v => v.key === key); if (same.length >= 2 * ev.layers.length) kill(same[0], 0.03);
    voices = voices.filter(v => !v.dead); while (voices.length + ev.layers.length > MAXV) { kill(voices[0], 0.03); voices.shift(); }
    b.push(now); lastK[key] = now; lastE[name] = now; return true;
  }
  function place() { // pan (at most +-0.4) and distance loss from where the sound happens on screen
    let pan = 0, att = 1; const at = LF.sndAt; LF.sndAt = null;
    if (at && LF.fx && LF.gfx && LF.gfx.cw) { const p = LF.fx.project(at.x, 1, at.z), nx = clamp((p[0] / LF.gfx.cw) * 2 - 1, -1.3, 1.3), ny = clamp((p[1] / LF.gfx.ch) * 2 - 1, -1.3, 1.3); pan = clamp(nx * 0.4, -0.4, 0.4); att = 1 - 0.35 * Math.min(1, Math.hypot(nx, ny) / 1.3); }
    return [pan, att];
  }
  A.play = function (name) {
    if (!A.started || LF.quiet || ctx.state !== 'running') { LF.sndAt = null; return; }
    const ev = EV[name]; let played = 0; const at0 = LF.sndAt, who = at0 ? (at0.cls || at0.type || at0.kind || 'area') : '-';
    if (ev && off()[ev.cat]) { LF.sndAt = null; return; }
    try {
      if (ev && ev.layers.every(l => bufs[l[0]] && bufs[l[0]].length) && admit(name, ev)) {
        const [pan, att] = place(), now = ctx.currentTime;
        for (const l of ev.layers) {
          const L = bufs[l[0]], bi = L.length > 1 ? (lastI[l[0]] === undefined ? Math.floor(Math.random() * L.length) : (lastI[l[0]] + 1 + Math.floor(Math.random() * (L.length - 1))) % L.length) : 0, buf = L[lastI[l[0]] = bi];
          const rate = 0.97 + Math.random() * 0.06, dur = buf.duration / rate, src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
          const g = ctx.createGain(), lvl = dB(l[1]) * att * (0.85 + Math.random() * 0.25); g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(lvl, now + FADE); g.gain.setValueAtTime(lvl, now + Math.max(FADE, dur - FADE)); g.gain.linearRampToValueAtTime(0.0001, now + dur);
          src.connect(g);
          if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(); pn.pan.value = pan; g.connect(pn); pn.connect(sfx); } else g.connect(sfx);
          src.start(now); src.stop(now + dur + 0.02); cn.push(now); A.recent.push({ t: now, ev: name, cat: ev.cat, file: l[0] + '_' + (bi + 1) + '.ogg', rate: +rate.toFixed(2), db: l[1], who }); if (A.recent.length > 60) A.recent.shift(); voices.push({ key: ev.key, g, src, end: now + dur }); if (voices.length > A.maxVoices) A.maxVoices = voices.length;
        }
        played = 1;
      } else LF.sndAt = null;
    } catch (e) { LF.sndAt = null; }
    if (A.log) A.log.push([ctx.currentTime, name, ev ? ev.key : '?', played, ev ? ev.layers.map(l => l[0]).join('+') : '']);
  };
  /* ----- music: a playlist, equal-power crossfades, track changes at the end of a track, at a boss, at a new region ----- */
  const XF = 3, EQ_IN = new Float32Array(65), EQ_OUT = new Float32Array(65); for (let i = 0; i < 65; i++) { EQ_IN[i] = Math.max(0.0001, Math.sin(i / 64 * Math.PI / 2)); EQ_OUT[i] = Math.max(0.0001, Math.cos(i / 64 * Math.PI / 2)); }
  let cur = null, lastSwitch = -1e9, songG = null, wantIdx = -1;
  function startTrack(idx, at) {
    const buf = songs[idx]; if (!buf) return false; if (!songG) { songG = ctx.createGain(); songG.gain.value = dB(MUSIC_DB); songG.connect(mus); }
    if (cur) { const o = cur; try { o.g.gain.cancelScheduledValues(at); o.g.gain.setValueCurveAtTime(EQ_OUT, at, XF); o.src.stop(at + XF + 0.1); } catch (e) { } }
    const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.setValueCurveAtTime(EQ_IN, at, XF); s.connect(g); g.connect(songG); s.start(at);
    cn.push(at); if (cur) A.prev = cur;
    cur = { idx, src: s, g, t0: at, end: at + buf.duration }; lastSwitch = at; A.track = idx; A.songStarts = (A.songStarts || 0) + 1; return true;
  }
  // 'boss' asks for the second track, 'region' for the first; never more often than every 60 s (force is for tests)
  A.musicCue = function (what, force) { if (!A.started || !cur) return; const want = what === 'boss' ? 1 : 0, t = ctx.currentTime; if (!songs[want] || want === cur.idx) return; if (!force && t - lastSwitch < 60) return; if (cur.end - t < XF + 1) return; startTrack(want, t + 0.05); };
  A.update = function (dt, danger, panel, fire, firePanV) {
    if (!A.started || ctx.state !== 'running') return; const t = ctx.currentTime; if (A.metering) { A.meter(); A.mt += dt; }
    // ducking with hysteresis: down at once, back up only after 2 s out of combat
    if (panel || danger > 0.4) { A.duck = true; A.duckT = t; } else if (A.duck && t - (A.duckT || 0) > 2) A.duck = false;
    const o = off();
    ramp(mus.gain, 'mus', o.music ? 0 : (P().music / 0.6) * (A.duck ? dB(DUCK_DB) : 1), 0.15);
    // recorded wind loop, created once when its file has decoded
    if (!windG && bufs.wind_loop && bufs.wind_loop[0]) { const ws = ctx.createBufferSource(); ws.buffer = bufs.wind_loop[0]; ws.loop = true; windG = ctx.createGain(); windG.gain.value = 0.0001; ws.connect(windG); windG.connect(amb); ws.start(); }
    if (windG) ramp(windG.gain, 'wind', o.wind ? 0 : dB(-30), 0.6);
    if (fireG) { ramp(fireG.gain, 'fire', o.campfire ? 0 : Math.round(dB(FIRE_DB) * clamp(fire || 0, 0, 1) * 200) / 200, 0.35); if (firePan) ramp(firePan.pan, 'firePan', Math.round(clamp(firePanV || 0, -0.4, 0.4) * 20) / 20, 0.4); }
    if (songs.some(Boolean)) {
      if (!cur) { startTrack(songs[0] ? 0 : 1, t + 0.1); }
      else if (t > cur.end - XF - 0.3 && t - lastSwitch > XF + 1) { const n = songs.length > 1 && songs[1 - cur.idx] ? 1 - cur.idx : cur.idx; startTrack(n, Math.max(t + 0.05, cur.end - XF)); }
    }
  };
  // live state for the debug overlay
  A.live = function () {
    const t = ctx.currentTime, per = a => { while (a.length && t - a[0] > 1) a.shift(); return a.length; };
    const tr = c => c ? { track: c.idx + 1, playing: t >= c.t0 && t < c.end + 0.1 && c.g.gain.value > 0.0005, gain: +c.g.gain.value.toFixed(3) } : null;
    return { t: +t.toFixed(1), ctx: ctx.state, nodesPerS: per(cn), paramsPerS: per(cp), voices: voices.filter(v => !v.dead && v.end > t).length, musicA: tr(cur), musicB: A.prev && A.prev !== cur ? tr(A.prev) : null, musicBus: +mus.gain.value.toFixed(3), duck: !!A.duck,
      campfire: fireG ? +fireG.gain.value.toFixed(4) : null, wind: windG ? +windG.gain.value.toFixed(4) : null, master: +master.gain.value.toFixed(2) };
  };
  A.rmsNow = function () { A.meterOn(); const b = new Float32Array(2048); A._anN.getFloatTimeDomainData(b); let q = 0; for (let i = 0; i < b.length; i++) q += b[i] * b[i]; return +(10 * Math.log10(q / b.length + 1e-12)).toFixed(1); };
  // trigger log: per event, requests and plays over the span, and the worst one-second burst per rate-limit group
  A.logReport = function () {
    const L = A.log || [], ev = {}, gr = {}; if (!L.length) return {}; const span = Math.max(1, L[L.length - 1][0] - L[0][0]);
    for (const e of L) { const q = ev[e[1]] || (ev[e[1]] = { sample: e[4], req: 0, played: 0 }); q.req++; if (e[3]) { q.played++; (gr[e[2]] || (gr[e[2]] = [])).push(e[0]); } }
    const worst = {}; for (const k in gr) { const tt = gr[k]; let w = 0, j = 0; for (let i = 0; i < tt.length; i++) { while (tt[i] - tt[j] > 1) j++; w = Math.max(w, i - j + 1); } worst[k] = { perS: +(tt.length / span).toFixed(2), worst1s: w }; }
    return { span: +span.toFixed(0), events: ev, groups: worst }; };
  A.stats = function () {
    A.meterOn(); const M = A.m; if (!M || !M.n) return null; const rms = Math.sqrt(M.sum / M.n);
    return { seconds: +A.mt.toFixed(1), rmsDb: +(20 * Math.log10(rms + 1e-9)).toFixed(1), peakDb: +(20 * Math.log10(M.peak + 1e-9)).toFixed(1), pctOverMinus1dB: +(100 * M.over / M.n).toFixed(4), crestDb: +(20 * Math.log10(M.peak / (rms + 1e-9))).toFixed(1),
      centroidHz: Math.round(M.cen / Math.max(1e-12, M.cenW)), shareAbove6k: +(M.hi / Math.max(1e-12, M.hi + M.lo)).toFixed(4), maxVoices: A.maxVoices, music: A.musicState, tracksDecoded: A.decoded || 0, track: A.track, songStarts: A.songStarts || 0, campfire: !!A.fireOk };
  };
  A.resetStats = function () { A.meterOn(); const M = A.m; if (M) { M.n = M.sum = M.peak = M.over = M.hi = M.lo = M.cen = M.cenW = 0; } A.maxVoices = 0; A.mt = 0; };
  return A;
})();
