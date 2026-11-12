/* LANTERNFALL - game logic (fixed step; no rendering here) */
LF.game = (function () {
  const G = {}; const DT = 1 / 60;
  const SAVE_KEY = 'lanternfall.v1'; const DEMO = QS.has('demo'); const NOSAVE = QS.has('fresh') || QS.has('gallery') || DEMO; G.DEMO = DEMO;
  let rng = mulberry(1);
  const R = () => rng();
  const P = G.P = { embers: 0, boons: {}, unlocked: { warden: 1, reaver: 1, fletcher: 1, lamplighter: 1 }, best: { stage: 0, level: 0, time: 0 }, runs: 0, steward: true, push: true, speed: 1, vol: { music: 0.6, sfx: 0.8, mute: false }, lastSeen: 0, run: null, rate: { silver: 0, xp: 0 } };
  let run = null; G.heroes = []; G.mons = []; G.zones = []; G.teles = []; G.dead = [];
  G.anchor = { x: 40, hold: false }; G.state = 'title'; G.stT = 0; G.flare = 0; G.focus = null; G.rally = null; G.pending = []; G.panel = null; G.toasts = []; G.time = 0;
  const A = (n, o) => { if (LF.audio && !LF.quiet) LF.audio.play(n, o); }, A0 = A;
  const toast = (t, c) => { if (!LF.quiet && LF.ui) LF.ui.toast(t, c); };
  const mod = k => (run.cards[k] || 0);
  const boon = k => (P.boons[k] || 0);
  G.mod = mod; G.boon = boon;

  /* ----- persistence ----- */
  G.save = function () { if (NOSAVE) return; try { P.lastSeen = Date.now(); P.run = run; localStorage.setItem(SAVE_KEY, JSON.stringify(P)); } catch (e) { } };
  G.load = function () { if (NOSAVE) return false; try { const s = localStorage.getItem(SAVE_KEY); if (!s) return false; const o = JSON.parse(s); if (!o || typeof o !== 'object') return false; Object.assign(P, o); return true; } catch (e) { return false; } };
  G.wipeSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } };

  /* ----- runs ----- */
  function defaultParty() {
    const pool = ['reaver', 'fletcher', 'apothecary', 'rimebinder'].filter(c => P.unlocked[c]);
    if (pool.length <= 2) return ['warden', 'reaver', 'fletcher', 'lamplighter'];
    const k = P.runs % pool.length, a = pool[k], b = pool[(k + 1) % pool.length];
    return ['warden', a, b, 'lamplighter'];
  }
  G.newRun = function (party) {
    const st = Math.max(1, Math.min(qnum('stage', 0) || (1 + boon('start')), Math.max(1, (P.best.stage || 1) - 2) || 1));
    const s0 = qnum('stage', 0) || (DEMO ? 4 : 0) || (1 + Math.min(boon('start'), Math.max(0, (P.best.stage || 0) - 3)));
    run = G.run = { party: party || (P.steward ? defaultParty() : (P.lastParty || defaultParty())), level: 1, xp: 0, silver: 0, stage: s0, maxStage: s0 - 1, flames: 3, time: 0, camp: { whet: 0, dress: 0, oil: 0, tonic: 0 }, cards: {}, gear: {}, kills: 0, lit: 0, seed: (LF.seed + P.runs * 7919) | 0, tonics: 2, pack: 0, holdCount: 0, relics: 0 };
    P.lastParty = run.party.slice();
    if (DEMO) { run.party = ['warden', 'reaver', 'fletcher', 'lamplighter']; run.seed = 4242; }
    if (qnum('stage', 0) > 1 || DEMO) { // review start: a party of matching strength
      const s = run.stage; run.level = Math.round(1 + (s - 1) * 1.25); run.camp = { whet: Math.round(s * 0.7), dress: Math.round(s * 0.7), oil: Math.round(s * 0.3), tonic: Math.round(s * 0.2) };
      for (const c of run.party) { run.gear[c] = {}; for (const sl of ['weapon', 'armour', 'trinket']) run.gear[c][sl] = makeItem(sl, c, Math.max(1, s - 1), 1); }
      const pool = CARDS.filter(c => c.who === 'party' || run.party.includes(c.who)); for (let i = 0; i < run.level - 1; i++) { const c = pool[Math.floor(hash1(i * 3.7 + s) * pool.length)]; if ((run.cards[c.id] || 0) < 3) run.cards[c.id] = (run.cards[c.id] || 0) + 1; }
    }
    rng = mulberry(run.seed); P.runs++;
    G.resetField(); G.setupStage(true);
    if (DEMO && P.runs === 1) { run.pack = LF.PACKS - 2; G.nextPackX = G.anchor.x + 5; run.xp = xpNeed(run.level) * 0.72; G.flare = 1; G.demoT = 0; }
    return run;
  };
  G.resume = function () { run = G.run = P.run; rng = mulberry((run.seed + Math.floor(run.time)) | 0); G.resetField(); G.setupStage(true); };
  G.resetField = function () {
    for (const m of G.mons) m.gone = true; G.mons = []; G.zones = []; G.teles = []; G.pending = []; G.focus = null; G.rally = null; G.flare = Math.min(G.flare, 1);
    G.heroes = run.party.map((c, i) => ({ team: 0, cls: c, C: CL[c], idx: i, x: 0, z: 0, face: PI / 2, vx: 0, vz: 0, hp: 1, maxHp: 1, radius: 0.4, cd: [2 + i, 5 + i * 1.5, 3], atkT: 0.5 + i * 0.2, act: null, stagT: 0, down: false, downT: 0, hasteT: 0, guardT: 0, tauntT: 0, ripT: 0, dodge: null, moving: 0, ready: 0, dps: 0 }));
    G.recalc(true); G.placeParty();
  };
  G.placeParty = function () { for (const h of G.heroes) { const s = slotOf(h); h.x = s[0]; h.z = s[1]; h.face = Math.atan2(1, pathDZ(h.x)); } };
  function slotOf(h) {
    const used = {}; let off = h.C.slot;
    // two heroes of the same row spread apart
    const same = G.heroes.filter(o => o !== h && Math.abs(o.C.slot[0] - off[0]) < 0.5 && Math.abs(o.C.slot[1] - off[1]) < 0.5 && o.idx < h.idx).length;
    const ax = (G.rally ? G.rally.x : G.anchor.x) + off[0] - same * 0.9, bz = G.rally ? G.rally.z : pathZ(ax);
    return [ax, bz + off[1] + same * 1.1];
  }
  G.lightRadius = () => 9 * (1 + 0.06 * run.camp.oil + 0.15 * mod('p_light')) * (0.72 + 0.0933 * run.flames);
  G.recalc = function (full) {
    const lv = 1 + 0.075 * (run.level - 1);
    for (const h of G.heroes) {
      const C = h.C, g = run.gear[h.cls] || {}, w = g.weapon ? g.weapon.pow : 0, a = g.armour ? g.armour.pow : 0, t = g.trinket ? g.trinket.pow : 0;
      const sp = k => ['weapon', 'armour', 'trinket'].reduce((s, sl) => s + (g[sl] && g[sl].sp === k ? 1 : 0), 0);
      const old = h.maxHp;
      h.maxHp = Math.round(C.hp * lv * (1 + a / 100) * (1 + 0.08 * run.camp.dress) * (1 + 0.12 * mod('p_hp')) * (1 + 0.06 * boon('hp')) * (h.cls === 'warden' ? 1 + 0.25 * mod('w_hp') : 1));
      h.dmg = C.dmg * lv * (1 + w / 100) * (1 + 0.08 * run.camp.whet) * (1 + 0.1 * mod('p_dmg')) * (1 + 0.06 * boon('dmg')) * (h.cls === 'reaver' ? 1 + 0.18 * mod('r_dmg') : 1) * (h.cls === 'lamplighter' ? 1 + 0.18 * mod('l_dmg') : 1);
      h.power = 1 + t / 100; // skill power
      h.atk = C.atk / ((1 + 0.07 * mod('p_haste')) * (1 + 0.12 * sp('haste')) * (h.cls === 'fletcher' ? 1 + 0.15 * mod('f_haste') : 1));
      h.cdr = 1 - 0.12 * sp('cdr'); h.leech = 0.03 * sp('leech'); h.armor = Math.min(0.75, C.armor + 0.1 * sp('ward')); h.crit = 0.08 + 0.1 * sp('crit'); h.range = C.range; h.speed = C.speed;
      if (full || !old) h.hp = h.maxHp; else if (h.maxHp > old && !h.down) h.hp += h.maxHp - old;
    }
    run.silverMul = (1 + 0.25 * mod('p_silver')) * (1 + 0.1 * boon('silver')) * (1 + 0.2 * G.heroes.reduce((s, h) => s + ['weapon', 'armour', 'trinket'].reduce((q, sl) => q + ((run.gear[h.cls] || {})[sl] && run.gear[h.cls][sl].sp === 'silver' ? 1 : 0), 0), 0));
    run.maxTonics = Math.min(6, 2 + Math.floor((run.camp.tonic + 1) / 2));
  };
  const stageHp = s => LF.TUNE.h0 * Math.pow(LF.TUNE.hp, s - 1);
  const stageDmg = s => LF.TUNE.d0 * Math.pow(LF.TUNE.dmg, s - 1);
  G.reachOf = s => Math.floor((s - 1) / 5);
  G.stageName = s => REACHES[G.reachOf(s) % REACHES.length].name + (G.reachOf(s) >= REACHES.length ? ' ' + ['II', 'III', 'IV', 'V', 'VI', 'VII'][Math.min(5, Math.floor(G.reachOf(s) / REACHES.length) - 1)] : '');
  G.bossOf = s => BOSS_ORDER[(s - 1) % 3];
  G.bossTitle = s => { const b = G.bossOf(s), T = BOSS_TITLES[b]; return T[Math.floor((s - 1) / 3) % T.length]; };

  G.setupStage = function (first) {
    run.pack = 0; G.stageStats = { downs: 0, minHp: 1, t: 0 }; G.state = 'walk'; G.stT = 0; G.nextPackX = G.anchor.x + (first ? 12 : LF.TUNE.gap + 3);
    if (LF.world && !LF.quiet) LF.world.setReach(G.reachOf(run.stage), first);
    if (!LF.quiet && LF.audio) { const rr = G.reachOf(run.stage); if (G.lastReach !== undefined && G.lastReach !== rr) LF.audio.musicCue('region'); G.lastReach = rr; }
    G.wayX = null; G.bossRef = null;
    if (!first) toast(G.stageName(run.stage) + ' \u00b7 \uc2a4\ud14c\uc774\uc9c0 ' + run.stage);
  };

  /* ----- spawning ----- */
  function mkMon(type, x, z, s, opt) {
    const M = MON[type], hpM = stageHp(s), dM = stageDmg(s);
    const m = { team: 1, type, M, x, z, face: -PI / 2, vx: 0, vz: 0, radius: (LF.MONSTERS[type].radius || 0.4), hp: 0, maxHp: Math.round(M.hp * hpM * (M.boss ? 1 + 0.05 * (s - 1) : 1)), dmg: M.dmg * dM * (DEMO && P.runs === 1 ? 0.5 : 1), atk: M.atk, range: M.range, speed: M.speed * (0.92 + R() * 0.16), armor: M.armor, act: null, atkT: 0.3 + R() * 0.8, stagT: 0, slowT: 0, slowK: 1, chillT: 0, markT: 0, tauntBy: null, tauntT: 0, burnT: 0, target: null, boss: !!M.boss, elite: !!M.elite, specT: 7 + R() * 3, side: R() < 0.5 ? -1 : 1, enr: false, seen: false, moving: 0, id: (G.nextId = (G.nextId || 0) + 1) };
    m.hp = m.maxHp; Object.assign(m, opt || {}); G.mons.push(m); return m;
  }
  G.spawnPack = function () {
    const s = run.stage, types = Object.keys(MON).filter(k => !MON[k].boss && MON[k].from <= s);
    let budget = LF.TUNE.b0 + s * LF.TUNE.b1 + run.pack * 1.5 + (DEMO ? 4 : 0), n = 0; const cap = Math.min(10, 6 + Math.floor(s / 2));
    const bx = G.anchor.x + 19 + R() * 3;
    // weights shift toward the bigger things deeper in
    while (budget > 2.5 && n < cap) {
      let pick = null, tries = 0; while (tries++ < 8) { const t = types[Math.floor(R() * types.length)], c = MON[t].cost; if (c <= budget + 2 && !(MON[t].elite && R() < 0.45)) { pick = t; break; } }
      if (!pick) pick = 'thornling';
      const cnt = pick === 'thornling' ? 2 + Math.floor(R() * 2) : 1;
      for (let i = 0; i < cnt && n < cap + 2; i++) { const x = bx + R() * 6 + (MON[pick].ranged ? 3 : 0), z = pathZ(x) + (R() - 0.5) * 7; mkMon(pick, x, z, s); n++; }
      budget -= MON[pick].cost * (pick === 'thornling' ? cnt * 0.8 : 1);
    }
    G.state = 'fight'; G.stT = 0; run.pack++;
  };
  G.spawnBoss = function () {
    const s = run.stage, type = G.bossOf(s), x = G.wayX + 1.5, b = mkMon(type, x, pathZ(x), s, { title: G.bossTitle(s) });
    const adds = Math.min(4, 1 + Math.floor(s / 4)); const types = Object.keys(MON).filter(k => !MON[k].boss && !MON[k].elite && MON[k].from <= s);
    for (let i = 0; i < adds; i++) { const t = types[Math.floor(R() * types.length)], xx = x + 2 + R() * 4; mkMon(t, xx, pathZ(xx) + (R() - 0.5) * 8, s); }
    G.bossRef = b; G.state = 'boss'; G.stT = 0; A('bossIntro'); toast(b.title, 'boss');
    if (LF.onBoss) LF.onBoss(b); if (LF.audio && !LF.quiet) LF.audio.musicCue('boss');
  };

  /* ----- combat helpers ----- */
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  const alive = u => u.team === 0 ? !u.down : (u.hp > 0);
  function yOf(u) { return u.team === 0 ? 1.15 : (LF.MONSTERS[u.type].hpY || 1.6) * 0.55; }
  function hurt(t, amt, src, o) {
    o = o || {}; if (!alive(t)) return 0;
    let d = amt * (0.92 + R() * 0.16), crit = false;
    if (src && src.team === 0) {
      if (R() < src.crit) { d *= 1.8; crit = true; }
      if (t.markT > 0) d *= 1.15 * (1 + 0.0 * mod('f_pin'));
      if (dist(t, G.lightPos) < G.lightRadius()) d *= 1 + 0.02 * run.camp.oil + 0.04;
      if (src.cls === 'reaver' && src.hp < src.maxHp * (0.5 + 0.15 * mod('r_wind'))) d *= 1.35 + 0.1 * mod('r_wind');
    }
    if (src && src.team === 1 && src.chillT > 0) d *= 1 - 0.1 * mod('b_rime');
    d *= 1 - (t.armor || 0) * (o.pierce ? 0.5 : 1);
    if (t.team === 0 && t.guardT > 0) d *= 0.55 - 0.08 * mod('w_hold');
    d = Math.max(1, Math.round(d)); t.hp -= d;
    if (src && src.team === 0) { src.dps += d; if (src.leech) heal(src, d * src.leech, true); }
    if (!LF.quiet) {
      if (o.heavy) LF.hitStop = Math.max(LF.hitStop || 0, t.boss || (src && src.boss) ? 0.07 : 0.045);
      const y = yOf(t); t.flashV = 1; t.stagV = (t.stagV || 0) + (o.heavy ? 1 : 0.45); t.hitFrom = src ? Math.atan2(t.x - src.x, t.z - src.z) : 0;
      LF.fx.float(t.x, y + 0.7, t.z, '' + d, t.team === 0 ? '#e0685a' : (crit ? '#ffd27a' : (o.kind === 'frost' ? '#a8d8ff' : o.kind === 'fire' ? '#ffb070' : '#e8e0cc')), crit ? 19 : (t.team === 0 ? 14 : 13 + Math.min(5, d / 60)), 1);
      hitFx(t, o.kind || 'phys', y, src);
    }
    if (t.team === 0) { G.stageStats.minHp = Math.min(G.stageStats.minHp, partyHp()); if (t.hp <= 0) heroDown(t); else if (t.cls === 'warden' && src && src.team === 1 && t.ripT <= 0 && !t.act && R() < 0.3 + 0.12 * mod('w_rip') && dist(t, src) < t.range + 0.6) { t.ripT = 4 * t.cdr; t.ripTarget = src; } }
    else {
      if (o.stag && !t.boss) { t.stagT = Math.max(t.stagT, o.stag); t.act = null; t.animStop = true; } else if (o.stag && t.boss) t.stagT = Math.max(t.stagT, o.stag * 0.25);
      if (t.hp <= 0) monDie(t, src);
      else if (t.boss && !t.enr && t.hp < t.maxHp * 0.3) { t.enr = true; t.atk *= 0.74; toast(t.title + ' \uaca9\ub178\ud588\ub2e4', 'bad'); A('enrage'); }
    }
    return d;
  }
  function hitFx(t, kind, y, src) {
    const F = LF.fx, mat = t.team === 0 ? 'metal' : t.M.mat, dx = src ? Math.sign(t.x - src.x) * 0.4 : 0; LF.sndAt = t;
    // sound: once per cast (one per attacker per tick), never for damage over time, at most two a second per attacker and target
    const sk = src ? (src.cls || src.id) : 'x', pk = sk + '>' + (t.cls || t.id), ST = G.sndT || (G.sndT = {}); let mute = !!G.dot || ST[sk] === G.time || (ST[pk] !== undefined && G.time - ST[pk] < 0.5); if (!mute) { ST[sk] = G.time; ST[pk] = G.time; }
    const A = mute ? () => { } : A0;
    if (kind === 'fire') { F.embers(t.x, y, t.z, 5, null, 0.25); F.sparks(t.x, y, t.z, 4, [3.5, 1.5, 0.3], 3); A('hitFire'); }
    else if (kind === 'frost') { F.frost(t.x, y, t.z, 7, 0.3); A('hitFrost'); }
    else if (kind === 'gloam') { F.sparks(t.x, y, t.z, 6, [0.7, 2.6, 1.3], 3); A('hitGloam'); }
    else if (mat === 'metal') { F.sparks(t.x, y, t.z, 8, [3.6, 2.4, 1.0], 5, dx, 0); F.flash(t.x, y + 0.2, t.z, [1, 0.8, 0.5], 14, 0.12); A(t.team === 0 ? 'hitShield' : 'hitMetal'); }
    else if (mat === 'stone') { F.chips(t.x, y, t.z, 5, [0.2, 0.2, 0.2], 3); F.dust(t.x, y, t.z, 2, [0.13, 0.13, 0.13], 0.2); F.sparks(t.x, y, t.z, 3, [2.6, 2.0, 1.2], 4); A('hitStone'); }
    else if (mat === 'wood') { F.chips(t.x, y, t.z, 6, [0.22, 0.16, 0.09], 3.5); A('hitWood'); }
    else if (mat === 'peat') { F.chips(t.x, y, t.z, 5, [0.05, 0.04, 0.03], 2.6); F.dust(t.x, y, t.z, 1, [0.05, 0.04, 0.03], 0.2); A('hitSoft'); }
    else { F.dust(t.x, y, t.z, 2, [0.07, 0.08, 0.08], 0.2); F.sparks(t.x, y, t.z, 3, [0.7, 2.2, 1.2], 2.5); A('hitSoft'); }
  }
  function heal(h, amt, silent) {
    if (h.down) return; const a = Math.min(h.maxHp - h.hp, Math.round(amt)); if (a <= 0) return; h.hp += a;
    if (!silent && !LF.quiet && a > 2) { LF.fx.float(h.x, 2.0, h.z, '+' + a, '#8fd98a', 13, 0.8); LF.fx.embers(h.x, 0.8, h.z, 4, [0.6, 2.2, 0.7], 0.3, 1.2); }
  }
  const partyHp = () => { let a = 0, b = 0; for (const h of G.heroes) { a += Math.max(0, h.down ? 0 : h.hp); b += h.maxHp; } return a / b; };
  G.partyHp = partyHp;
  function heroDown(h) {
    if (run.stage < 5) run.d5 = (run.d5 || 0) + 1;
    h.hp = 0; h.down = true; h.downT = 20 * (1 - 0.25 * mod('a_kit')); h.act = null; h.animStop = true; G.stageStats.downs++; A('heroDown'); toast(h.C.name + ' \uc4f0\ub7ec\uc84c\ub2e4', 'bad');
    if (G.heroes.every(q => q.down)) { G.state = 'wipe'; G.stT = 0; run.flames--; A('flameOut'); if (!LF.quiet) { LF.slowMo = 1.4; LF.shake(1); } toast(run.flames > 0 ? '\ubd88\uaf43 \ud558\ub098\uac00 \uaebc\uc9c4\ub2e4' : '\ub9c8\uc9c0\ub9c9 \ubd88\uaf43\uc774 \uaebc\uc9c4\ub2e4', 'bad'); }
  }
  function monDie(m, src) {
    m.hp = 0; m.deadT = 0; run.kills++; G.flare = Math.min(1, G.flare + (m.boss ? 0.5 : m.elite ? 0.1 : 0.045) * (1 + 0.3 * mod('p_flare')));
    const s = run.stage, held = run.holdCount > 0 ? 0.8 : 1, xp = m.M.xp * Math.pow(1.13, s - 1) * (1 + 0.15 * mod('p_xp')) * (1 + 0.08 * boon('xp')) * held;
    addXp(xp);
    const silver = Math.max(1, Math.round((m.M.xp * 0.5 + 1) * Math.pow(1.12, s - 1) * run.silverMul * (0.8 + R() * 0.4) * held));
    const n = m.boss ? 8 : (m.elite ? 3 : 1);
    for (let i = 0; i < n; i++) LF.fx.loot(m.x, m.z, 4, i === 0 ? () => { run.silver += silver; P.rate.silver += silver; A('coin'); } : null);
    const pDrop = m.boss ? 1 : (m.elite ? 0.3 : 0.085) * (run.pack <= 1 && s === 1 ? 1.6 : 1);
    const drops = m.boss ? 2 + (R() < 0.5 ? 1 : 0) : (R() < pDrop ? 1 : 0);
    for (let i = 0; i < drops; i++) dropGear(m, m.boss ? 1 : 0);
    if (!LF.quiet) { LF.sndAt = m; A('die_' + m.type); }
    if (m.boss) { G.bossRef = null; for (const o of G.mons) if (o !== m && o.hp > 0) { o.hp = 0; o.deadT = 0; } }
    if (G.focus && G.focus.u === m) G.focus = null;
  }
  function addXp(x) {
    run.xp += x; P.rate.xp += x; let need = xpNeed(run.level);
    while (run.xp >= need) { run.xp -= need; run.level++; G.pending.push('card'); G.recalc(); need = xpNeed(run.level); A('levelUp'); toast('\ub808\ubca8 ' + run.level, 'good'); }
  }
  const xpNeed = L => Math.round(26 * Math.pow(LF.TUNE.xp, L - 1) + 8 * (L - 1));
  G.xpNeed = xpNeed;
  /* ----- gear ----- */
  function makeItem(slot, cls, stage, minGrade, forceGrade) {
    const r = R(); let g = forceGrade !== undefined ? forceGrade : (r < 0.015 ? 3 : r < 0.1 ? 2 : r < 0.38 ? 1 : 0); g = Math.max(g, minGrade || 0);
    const pow = Math.round(7 * Math.pow(1.105, stage - 1) * GRADES[g].m * (0.88 + R() * 0.24));
    const base = slot === 'trinket' ? ITEM_NAMES.trinket[Math.floor(R() * ITEM_NAMES.trinket.length)] : ITEM_NAMES[slot][cls];
    const it = { slot, g, pow, name: base };
    if (g === 3) { const sp = RELIC_SPECIALS[Math.floor(R() * RELIC_SPECIALS.length)]; it.sp = sp.k; it.spT = sp.t; it.name = RELIC_NAMES[Math.floor(R() * RELIC_NAMES.length)] + ', ' + base; }
    return it;
  }
  function dropGear(m, minGrade) {
    const h = G.heroes[Math.floor(R() * G.heroes.length)], slot = ['weapon', 'armour', 'trinket'][Math.floor(R() * 3)], it = makeItem(slot, h.cls, run.stage, minGrade);
    LF.fx.loot(m.x, m.z, it.g, () => {
      const gr = run.gear[h.cls] || (run.gear[h.cls] = {}), cur = gr[slot];
      if (!cur || it.pow > cur.pow || (it.g === 3 && cur.g < 3 && it.pow > cur.pow * 0.85)) {
        const d = it.pow - (cur ? cur.pow : 0); gr[slot] = it; G.recalc();
        if (!LF.quiet) LF.fx.float(h.x, 2.3, h.z, '+' + d + '% ' + (slot === 'weapon' ? '\ud53c\ud574' : slot === 'armour' ? '\uc0dd\uba85\ub825' : '\uc2a4\ud0ac'), GRADES[it.g].c, 14, 1.3);
        if (it.g === 3) { run.relics++; toast('\uc720\ubb3c: ' + it.name, 'relic'); A('relic'); } else if (it.g === 2) { toast('\uae08\ubc15 ' + it.name, 'gilded'); A('gear2'); } else A('gear');
        if (cur) run.silver += Math.round(cur.pow * 0.6 * run.silverMul);
        h.gearV = (h.gearV || 0) + 1;
      } else { run.silver += Math.round(it.pow * 0.6 * run.silverMul * Math.pow(1.02, run.stage)); A('coin'); }
    });
  }
  G.makeItem = makeItem;

  /* ----- actions ----- */
  function act(u, clip, wind, rec, onHit) { u.act = { t: 0, wind, rec, hit: false, onHit: () => { LF.sndAt = u; onHit(); } }; u.animReq = [clip, wind, rec]; }
  function faceTo(u, t) { u.faceT = Math.atan2(t.x - u.x, t.z - u.z); }
  function inRange(u, t, extra) { return dist(u, t) <= u.range + t.radius + (extra || 0); }
  function nearestMon(u, maxD, pred) { let b = null, bd = maxD || 1e9; for (const m of G.mons) { if (m.hp <= 0 || !m.seen) continue; if (pred && !pred(m)) continue; const d = dist(u, m); if (d < bd) { bd = d; b = m; } } return b; }
  function monsNear(x, z, r) { const out = []; for (const m of G.mons) if (m.hp > 0 && Math.hypot(m.x - x, m.z - z) <= r + m.radius) out.push(m); return out; }
  function shoot(u, t, kind, speed, arc, onHit) {
    const sy = 1.45, d = Math.max(0.5, dist(u, t)), ty = yOf(t), f = u.face;
    const p = LF.fx.proj(kind, u.x + Math.sin(f) * 0.5, sy, u.z + Math.cos(f) * 0.5, t.x, ty, t.z, d / speed, arc * d, onHit); p.tgt = t; return p;
  }
  function zone(kind, x, z, r, dur, tick, fn) { const zz = { kind, x, z, r, t: 0, dur, tick, tk: 0, fn }; G.zones.push(zz); if (!LF.quiet) LF.fx.mark(kind, x, z, r, dur); return zz; }

  /* ----- hero skills ----- */
  const SK = {
    bash(h, t) { act(h, 'bash', 0.3, 0.42, () => { const all = mod('w_bash') ? monsNear(h.x, h.z, h.range + 0.8) : [t]; for (const m of all) hurt(m, h.dmg * 1.4 * h.power * (1 + 0.25 * mod('w_bash')), h, { stag: 1.6, heavy: true }); if (!LF.quiet) { LF.fx.ring(t.x, t.z, 0.3, 1.6, 0.25, [1.2, 1.0, 0.7]); LF.shake(0.25); } A('bash'); }); },
    hold(h) { act(h, 'guard', 0.25, 0.5, () => { const d = 5 + 2 * mod('w_hold'); h.guardT = d; h.tauntT = d; for (const m of monsNear(h.x, h.z, 7)) { m.tauntBy = h; m.tauntT = d; } if (!LF.quiet) { LF.fx.ring(h.x, h.z, 0.5, 7, 0.5, [1.0, 0.8, 0.45]); LF.fx.float(h.x, 2.3, h.z, '\uc804\uc120 \uc0ac\uc218', '#e9c98a', 13, 0.6); } A('holdLine'); }); },
    cleave(h, t) { act(h, 'cleave', 0.42, 0.5, () => { const r = (h.range + 0.9) * (1 + 0.15 * mod('r_cleave')); for (const m of monsNear(h.x + Math.sin(h.face) * 0.8, h.z + Math.cos(h.face) * 0.8, r)) hurt(m, h.dmg * 1.25 * h.power * (1 + 0.3 * mod('r_cleave')), h, { heavy: true }); if (!LF.quiet) { LF.fx.arc(h.x, 1.15, h.z, h.face, r + 0.3, -1.9, 1.9, 0.08, [1.8, 1.6, 1.3], 0.2); LF.shake(0.2); } A('cleave'); }); },
    sunder(h, t) { act(h, 'sunder', 0.62, 0.6, () => { const L = 5.5 + 1.5 * mod('r_sunder'), fx = Math.sin(h.face), fz = Math.cos(h.face); for (const m of G.mons) { if (m.hp <= 0) continue; const dx = m.x - h.x, dz = m.z - h.z, al = dx * fx + dz * fz, pe = Math.abs(dx * fz - dz * fx); if (al > -0.5 && al < L && pe < 1.3 + m.radius) hurt(m, h.dmg * 2.6 * h.power, h, { stag: 1.2, heavy: true }); }
      if (!LF.quiet) { for (let i = 1; i <= 5; i++) { const d = i / 5 * L; LF.fx.dust(h.x + fx * d, 0.1, h.z + fz * d, 3, [0.1, 0.09, 0.07], 0.5, 1.5); LF.fx.chips(h.x + fx * d, 0.1, h.z + fz * d, 3, [0.06, 0.05, 0.04], 3); } LF.fx.ring(h.x + fx * 1.5, h.z + fz * 1.5, 0.4, 2.6, 0.35, [1.3, 1.0, 0.6]); LF.shake(0.6); LF.fx.flash(h.x + fx * 1.5, 0.6, h.z + fz * 1.5, [1, 0.8, 0.5], 30, 0.2); } A('sunder'); }); },
    aimed(h, t) { act(h, 'aimed', 0.62, 0.4, () => { A('bowHeavy'); shoot(h, t, 'arrow', 34, 0.02, () => { hurt(t, h.dmg * 2.8 * h.power * (1 + 0.4 * mod('f_aimed')), h, { pierce: true, heavy: true }); A('arrowHit'); }); }); },
    volley(h, t) { act(h, 'volley', 0.6, 0.5, () => { const n = 6 + 3 * mod('f_volley'), cx = t.x, cz = t.z; A('bowVolley'); for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 3.2, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; LF.fx.proj('arrow', h.x, 1.6, h.z, x, 0.1, z, 0.85 + i * 0.04, 6.5, () => { G.dot = i > 0; for (const m of monsNear(x, z, 1.1)) hurt(m, h.dmg * 0.85 * h.power, h); G.dot = false; if (!LF.quiet) LF.fx.dust(x, 0.05, z, 1, null, 0.1, 0.5); if (i === 0) A('arrowHit'); }); } }); },
    pin(h, t) { act(h, 'attack', 0.5, 0.4, () => { A('bow'); shoot(h, t, 'arrow', 32, 0.02, () => { hurt(t, h.dmg * 1.25 * h.power, h); t.slowT = 4 + 2 * mod('f_pin'); t.slowK = 0.4; if (mod('f_pin')) t.markT = t.slowT; A('arrowHit'); }); }); },
    flare(h, t) { act(h, 'attack', 0.55, 0.5, () => { A('fireCast'); shoot(h, t, 'ember', 15, 0.06, (x, y, z) => { for (const m of monsNear(x, z, 2.6)) hurt(m, h.dmg * 2.2 * h.power, h, { kind: 'fire', heavy: true }); if (mod('l_flare')) zone('fire', x, z, 2.2, 3.5, 0.5, (zz) => { for (const m of monsNear(zz.x, zz.z, zz.r)) hurt(m, h.dmg * 0.3 * mod('l_flare') * h.power, h, { kind: 'fire' }); }); if (!LF.quiet) { LF.fx.ring(x, z, 0.3, 2.6, 0.3, [2.4, 1.0, 0.25]); LF.fx.embers(x, 0.6, z, 26, null, 1.2, 2); LF.fx.flash(x, 1, z, [1, 0.55, 0.2], 70, 0.3); LF.fx.glow(x, 0.8, z, 3.5, [3, 1.2, 0.3], 0.25); LF.shake(0.25); } A('fireBurst'); }); }); },
    kindle(h) { act(h, 'kindle', 0.5, 0.6, () => { const amt = 0.24 * (1 + 0.3 * mod('l_kindle')) * h.power; for (const o of G.heroes) if (!o.down) { o.regenT = 4; o.regenA = o.maxHp * amt / 4; } if (!LF.quiet) { LF.fx.ring(h.x, h.z, 0.5, 8, 0.8, [1.6, 1.0, 0.4]); LF.fx.embers(h.x, 2.4, h.z, 30, [2.6, 1.6, 0.5], 1.5, 0.6); LF.fx.flash(h.x, 2.6, h.z, [1, 0.7, 0.35], 60, 0.5); } A('kindle'); }); },
    cinder(h, t) { act(h, 'cinder', 0.5, 0.6, () => { const r = 3.2 * (1 + 0.15 * mod('l_cinder')); A('fireCast'); zone('fire', t.x, t.z, r, 4, 0.5, (zz) => { for (const m of monsNear(zz.x, zz.z, zz.r)) hurt(m, h.dmg * 0.62 * h.power * (1 + 0.25 * mod('l_cinder')), h, { kind: 'fire' }); if (!zz.s1) { zz.s1 = 1; LF.sndAt = zz; A('cinderLand'); } if (!LF.quiet) for (let i = 0; i < 5; i++) { const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * zz.r; LF.fx.proj('cinder', zz.x + Math.cos(a) * d + 1.5, 7, zz.z + Math.sin(a) * d - 1, zz.x + Math.cos(a) * d, 0.1, zz.z + Math.sin(a) * d, 0.35 + Math.random() * 0.2, 0, (x, y, z) => LF.fx.embers(x, 0.2, z, 4, null, 0.3, 1.5)); } }); }); },
    tonic(h, t) { act(h, 'tonic', 0.45, 0.45, () => { A('throw'); LF.fx.proj('flask', h.x, 1.5, h.z, t.x, 1.2, t.z, Math.max(0.25, dist(h, t) / 12), 2.5, () => { const amt = t.maxHp * 0.26 * (1 + 0.3 * mod('a_tonic')) * h.power; heal(t, amt); if (mod('a_tonic')) for (const o of G.heroes) if (o !== t && dist(o, t) < 3.5) heal(o, amt * 0.3 * mod('a_tonic')); if (!LF.quiet) { LF.fx.chips(t.x, 1.2, t.z, 5, [0.4, 0.5, 0.4], 2); LF.fx.embers(t.x, 1, t.z, 10, [0.6, 2.2, 0.7], 0.5, 1); } A('glass'); A('heal'); }); }); },
    firepot(h, t) { act(h, 'firepot', 0.5, 0.45, () => { A('throw'); const x = t.x, z = t.z; LF.fx.proj('flask', h.x, 1.6, h.z, x, 0.1, z, Math.max(0.35, dist(h, t) / 11), 3, () => { for (const m of monsNear(x, z, 2.4)) hurt(m, h.dmg * 1.5 * h.power, h, { kind: 'fire' }); zone('fire', x, z, 2.4, 5 + 2 * mod('a_fire'), 0.5, (zz) => { for (const m of monsNear(zz.x, zz.z, zz.r)) hurt(m, h.dmg * 0.55 * h.power * (1 + 0.25 * mod('a_fire')), h, { kind: 'fire' }); }); if (!LF.quiet) { LF.fx.embers(x, 0.4, z, 20, null, 1, 2); LF.fx.flash(x, 0.8, z, [1, 0.5, 0.15], 50, 0.3); LF.fx.ring(x, z, 0.3, 2.4, 0.3, [2, 0.8, 0.2]); } A('glass'); A('fireBurst'); }); }); },
    quick(h) { act(h, 'quick', 0.45, 0.45, () => { const d = 6 + 2 * mod('a_quick'); for (const o of G.heroes) if (!o.down) o.hasteT = d; if (!LF.quiet) { LF.fx.ring(h.x, h.z, 0.5, 6, 0.6, [1.0, 1.3, 1.6]); LF.fx.float(h.x, 2.3, h.z, '\uc2e0\uc18d\uc758 \ubb3c\uc57d', '#bfe3ff', 13, 0.6); } A('quick'); }); },
    lance(h, t) { act(h, 'attack', 0.55, 0.5, () => { const fx = Math.sin(h.face), fz = Math.cos(h.face), L = 10; A('frostCast'); LF.fx.proj('lance', h.x + fx, 1.3, h.z + fz, h.x + fx * L, 1.1, h.z + fz * L, 0.3, 0, null); for (const m of G.mons) { if (m.hp <= 0) continue; const dx = m.x - h.x, dz = m.z - h.z, al = dx * fx + dz * fz, pe = Math.abs(dx * fz - dz * fx); if (al > 0 && al < L && pe < 0.9 + m.radius) { hurt(m, h.dmg * 1.8 * h.power * (1 + 0.25 * mod('b_lance')), h, { kind: 'frost', heavy: true }); m.chillT = 5 + 2 * mod('b_lance'); m.slowT = Math.max(m.slowT, 2.5); m.slowK = Math.min(m.slowK < 1 ? m.slowK : 1, 0.7); } } }); },
    hoar(h, t) { act(h, 'hoar', 0.55, 0.55, () => { const r = 3.5 * (1 + 0.15 * mod('b_hoar')); A('frostField'); if (!LF.quiet) { LF.fx.ring(t.x, t.z, 0.3, r, 0.4, [0.5, 1.2, 2.2]); LF.fx.frost(t.x, 0.4, t.z, 30, r * 0.6); } zone('frost', t.x, t.z, r, 6, 0.4, (zz) => { for (const m of monsNear(zz.x, zz.z, zz.r)) { m.chillT = Math.max(m.chillT, 2.5); m.slowT = Math.max(m.slowT, 1); m.slowK = 0.5 - 0.1 * mod('b_hoar'); hurt(m, h.dmg * 0.22 * h.power, h, { kind: 'frost' }); } }); }); },
    shatter(h) { act(h, 'shatter', 0.55, 0.55, () => { let n = 0; for (const m of G.mons) if (m.hp > 0 && m.chillT > 0) { hurt(m, h.dmg * 2.5 * h.power * (1 + 0.35 * mod('b_shatter')) * (m.slowT > 0 ? 1.3 : 1), h, { kind: 'frost', stag: 0.8, heavy: true }); if (!LF.quiet) { LF.fx.frost(m.x, yOf(m), m.z, 16, 0.5); LF.fx.ring(m.x, m.z, 0.2, 1.6, 0.25, [0.6, 1.4, 2.4]); } m.chillT = 0; n++; } if (n) { A('shatter'); if (!LF.quiet) { LF.shake(0.3); LF.fx.flash(h.x, 2, h.z, [0.5, 0.8, 1], 40, 0.25); } } }); }
  };
  function tryHeroSkill(h, t) {
    const S = h.C.skills, c = h.cd, n = G.mons.filter(m => m.hp > 0 && m.seen).length;
    const use = (i, ...a) => { c[i] = S[i].cd * h.cdr * (S[i].id === 'sunder' ? 1 - 0.2 * mod('r_sunder') : 1); SK[S[i].id](h, ...a); h.skillV = S[i].name; return true; };
    switch (h.cls) {
      case 'warden': if (c[0] <= 0 && t && inRange(h, t)) return use(0, t); if (c[1] <= 0 && (monsNear(h.x, h.z, 6).length >= 3 || G.bossRef || G.heroes.some(o => !o.down && o !== h && o.hp < o.maxHp * 0.45 && nearestMon(o, 2.6)))) return use(1); break;
      case 'reaver': if (c[1] <= 0 && t && inRange(h, t, 1.5) && (t.maxHp > h.dmg * 4 || monsNear(h.x, h.z, 4).length >= 2)) return use(1, t); if (c[0] <= 0 && t && inRange(h, t) && monsNear(h.x, h.z, h.range + 1).length >= 2) return use(0, t); break;
      case 'fletcher': { if (c[1] <= 0 && t) { let best = null, bn = 2; for (const m of G.mons) if (m.hp > 0 && m.seen && dist(h, m) < 15) { const k = monsNear(m.x, m.z, 3.2).length; if (k > bn) { bn = k; best = m; } } if (best) return use(1, best); }
        if (c[0] <= 0 && t) { const pr = nearestMon(h, 15, m => m.M.ranged || m.boss || m.elite) || t; if (dist(h, pr) < 15) return use(0, pr); }
        if (c[2] <= 0 && t) { const pr = nearestMon(h, 14, m => (m.M.flank || m.boss || m.elite) && m.slowT <= 0); if (pr) return use(2, pr); } break; }
      case 'lamplighter': if (c[1] <= 0 && partyHp() < 0.72 && G.heroes.some(o => !o.down && o.hp < o.maxHp * 0.6)) return use(1); if (c[2] <= 0 && t) { let best = null, bn = 2; for (const m of G.mons) if (m.hp > 0 && m.seen && dist(h, m) < 13) { const k = monsNear(m.x, m.z, 3.2).length + (m.boss ? 2 : 0); if (k > bn) { bn = k; best = m; } } if (best) return use(2, best); } if (c[0] <= 0 && t && dist(h, t) < 12) return use(0, t); break;
      case 'apothecary': { if (c[0] <= 0) { let w = null, wf = 0.7; for (const o of G.heroes) if (!o.down && o.hp / o.maxHp < wf) { wf = o.hp / o.maxHp; w = o; } if (w) return use(0, w); } if (c[2] <= 0 && n >= 3) return use(2); if (c[1] <= 0 && t && dist(h, t) < 10) { let best = t, bn = 0; for (const m of G.mons) if (m.hp > 0 && m.seen && dist(h, m) < 10) { const k = monsNear(m.x, m.z, 2.4).length + (m.boss ? 2 : 0); if (k > bn) { bn = k; best = m; } } return use(1, best); } break; }
      case 'rimebinder': if (c[2] <= 0 && G.mons.filter(m => m.hp > 0 && m.chillT > 0.4).length >= Math.min(3, Math.max(1, n))) return use(2); if (c[1] <= 0 && t) { let best = null, bn = 1; for (const m of G.mons) if (m.hp > 0 && m.seen && dist(h, m) < 12) { const k = monsNear(m.x, m.z, 3.5).length + (m.boss ? 2 : 0); if (k > bn) { bn = k; best = m; } } if (best) return use(1, best); } if (c[0] <= 0 && t && dist(h, t) < 10) return use(0, t); break;
    }
    return false;
  }
  function heroBasic(h, t) {
    const mel = !h.C.ranged, w = h.atk * (mel ? 0.5 : 0.46), r = h.atk * (mel ? 0.44 : 0.38); h.atkT = h.atk * (mel ? 0.06 : 0.16);
    if (!h.C.ranged) act(h, 'attack', w, r, () => { if (alive(t) && inRange(h, t, 0.9)) { hurt(t, h.dmg, h, { heavy: h.cls === 'reaver' }); if (!LF.quiet) LF.fx.arc(h.x, 1.25, h.z, h.face, h.range + 0.2, -1.2, 1.3, h.cls === 'reaver' ? -0.5 : -0.7, null, 0.14); } A(h.cls === 'reaver' ? 'swingHeavy' : 'swing'); });
    else if (h.cls === 'fletcher') act(h, 'attack', w, r, () => { A('bow'); if (alive(t)) shoot(h, t, 'arrow', 32, 0.02, () => { hurt(t, h.dmg, h); A('arrowHit'); }); });
    else if (h.cls === 'lamplighter') act(h, 'attack', w, r, () => { A('fireSmall'); if (alive(t)) shoot(h, t, 'ember', 15, 0.05, (x, y, z) => { hurt(t, h.dmg, h, { kind: 'fire' }); for (const m of monsNear(x, z, 1.2)) if (m !== t) hurt(m, h.dmg * 0.4, h, { kind: 'fire' }); }); });
    else if (h.cls === 'apothecary') act(h, 'attack', w, r, () => { A('throw'); if (alive(t)) shoot(h, t, 'flask', 12, 0.22, () => { hurt(t, h.dmg, h, { kind: 'fire' }); for (const m of monsNear(t.x, t.z, 1.5)) if (m !== t) hurt(m, h.dmg * 0.5, h, { kind: 'fire' }); A('glass'); }); });
    else act(h, 'attack', w, r, () => { A('frostSmall'); if (alive(t)) shoot(h, t, 'lance', 20, 0.0, () => { hurt(t, h.dmg, h, { kind: 'frost' }); t.chillT = Math.max(t.chillT, 3); }); });
  }

  /* ----- unit stepping ----- */
  function moveTo(u, tx, tz, sp, dt, stopD) {
    const dx = tx - u.x, dz = tz - u.z, d = Math.hypot(dx, dz); if (d <= (stopD || 0.08)) { u.moving = 0; return true; }
    const s = Math.min(sp * dt, d - (stopD || 0) * 0.9); u.x += dx / d * s; u.z += dz / d * s; u.moving = sp; u.faceT = Math.atan2(dx, dz); return false;
  }
  function stepHero(h, dt) {
    if (h.down) { h.downT -= dt; h.moving = 0; if (h.downT <= 0 && G.state !== 'wipe') revive(h, 0.35); return; }
    const hk = h.hasteT > 0 ? 1.4 : 1; h.repoT = (h.repoT || 0) - dt; h.hasteT -= dt; h.guardT -= dt; h.tauntT -= dt; h.ripT -= dt; h.atkT -= dt * hk; for (let i = 0; i < 3; i++) h.cd[i] -= dt * (h.hasteT > 0 ? 1.15 : 1);
    if (h.regenT > 0) { h.regenT -= dt; h.hp = Math.min(h.maxHp, h.hp + h.regenA * dt); }
    if (dist(h, G.lightPos) < G.lightRadius()) h.hp = Math.min(h.maxHp, h.hp + h.maxHp * Math.min(0.012, 0.002 + 0.0007 * run.camp.oil) * dt);
    if (h.act) { const a = h.act; a.t += dt * hk; h.moving = 0; if (!a.hit && a.t >= a.wind) { a.hit = true; a.onHit(); } if (a.t >= a.wind + a.rec) h.act = null; return; }
    // leave marked ground
    for (const t of G.teles) { const d = Math.hypot(h.x - t.x, h.z - t.z); if (d < t.r + 0.6 && (h.C.ranged || h.dodgeOk)) { const k = d < 0.01 ? 1 : 1 / d; moveTo(h, t.x + (h.x - t.x) * k * (t.r + 1.5), t.z + (h.z - t.z) * k * (t.r + 1.5) - 0.01, h.speed * 1.5, dt); h.ready = 1; return; } }
    if (h.ripTarget && alive(h.ripTarget) && inRange(h, h.ripTarget, 0.6)) { const t = h.ripTarget; h.ripTarget = null; faceTo(h, t); act(h, 'attack', 0.16, 0.3, () => { hurt(t, h.dmg * (1.6 + 0.3 * mod('w_rip')), h, { heavy: true }); if (!LF.quiet) { LF.fx.arc(h.x, 1.2, h.z, h.face, h.range + 0.2, 1.2, -1.3, 0.5, [2, 1.8, 1.4], 0.12); LF.fx.float(h.x, 2.2, h.z, '\ubc18\uaca9', '#e9c98a', 12, 0.5); } A('swing'); }); return; }
    h.ripTarget = null;
    const fighting = G.mons.some(m => m.hp > 0 && m.seen);
    let t = null;
    if (fighting) {
      if (G.focus && alive(G.focus.u) && G.focus.u.seen) t = G.focus.u;
      else if (h.C.ranged) t = nearestMon(h, h.range + 4);
      else { t = nearestMon(h, 3.2) || nearestMon(h, 30, m => Math.abs(m.x - G.anchor.x) < 11) ; }
    }
    h.ready = fighting ? 1 : 0;
    if (G.rally && !t) { const s = slotOf(h); moveTo(h, s[0], s[1], h.speed, dt, 0.15); return; }
    if (t) h.idleT = 0; else if (!G.anchor.moving && !G.rally && G.state !== 'relight') { h.idleT = (h.idleT || 0) + dt; if (h.idleT < 1.6) { h.moving = 0; return; } }
    if (!t) { const s = slotOf(h); if (s[0] < h.x - 0.05 && s[0] > h.x - 5 && !G.rally) { h.moving = 0; h.faceT = Math.atan2(1, pathDZ(h.x)); return; } /* never walk back to the line: the line walks up */ const far = Math.hypot(s[0] - h.x, s[1] - h.z); const done = moveTo(h, s[0], s[1], far > 3 ? h.speed * 1.3 : (G.anchor.moving ? LF.WALK * clamp(0.85 + far * 0.5, 0.85, 1.3) : h.speed * 0.7), dt, 0.12); if (done && !G.anchor.moving) h.faceT = Math.atan2(1, pathDZ(h.x)); return; }
    if (G.rally) { const s = slotOf(h); if (Math.hypot(s[0] - h.x, s[1] - h.z) > 1.2) { moveTo(h, s[0], s[1], h.speed * 1.2, dt, 0.3); return; } }
    if (h.C.ranged) {
      // give ground when something closes
      const thr = nearestMon(h, h.fleeing ? 3.0 : 1.9, m => !m.M.ranged);
      if (thr && h.x > G.anchor.x - 6.5 && (h.fleeing || h.repoT <= 0)) { if (h.atkT > 0.1 || h.fleeing) { h.fleeing = true; const d = dist(h, thr) || 1; moveTo(h, h.x + (h.x - thr.x) / d * 2, h.z + (h.z - thr.z) / d * 2, 1.5, dt); return; } }
      else if (h.fleeing) { h.fleeing = false; h.repoT = 0.8; }
      if (dist(h, t) > h.range) { moveTo(h, t.x, t.z, h.speed, dt, h.range * 0.9); return; }
      h.moving = 0; faceTo(h, t); if (tryHeroSkill(h, t)) return; if (h.atkT <= 0) heroBasic(h, t); return;
    }
    { const dd = dist(h, t) - (h.range + t.radius);
      if (dd > (h.eng ? 0.6 : 0)) { h.eng = false; const near = dd < 1.5; faceTo(h, t); if (near && h.repoT > 0) { h.moving = 0; return; } moveTo(h, t.x, t.z, near ? 1.1 : h.speed, dt, h.range + t.radius - 0.3); if (h.cls === 'warden' && h.cd[1] <= 0) tryHeroSkill(h, null); return; }
      if (!h.eng) { h.eng = true; h.repoT = 0.8; } }
    h.moving = 0; faceTo(h, t); if (tryHeroSkill(h, t)) return; if (h.atkT <= 0) heroBasic(h, t);
  }
  function revive(h, f) { h.down = false; h.hp = Math.round(h.maxHp * f); h.act = null; if (!LF.quiet) { LF.fx.embers(h.x, 0.6, h.z, 16, [2.6, 1.6, 0.5], 0.5, 1.5); LF.fx.float(h.x, 2.2, h.z, '\ubd80\ud65c', '#e9c98a', 13, 0.7); } A('revive'); }
  function pickHeroTarget(m) {
    if (m.tauntT > 0 && m.tauntBy && alive(m.tauntBy)) return m.tauntBy;
    let b = null, bd = 1e9;
    for (const h of G.heroes) { if (h.down) continue; let d = dist(m, h); if (m.M.flank) d = d * 0.35 + (h.x - G.anchor.x) * 2.2 + (h.C.ranged ? 0 : 6); else if (h.cls === 'warden') d -= 1.5; if (d < bd) { bd = d; b = h; } }
    return b;
  }
  function stepMon(m, dt) {
    if (m.hp <= 0) return;
    if (!m.seen && m.x - G.anchor.x < 15.5) { m.seen = true; }
    m.tauntT -= dt; m.chillT -= dt; m.markT -= dt; if (m.slowT > 0) m.slowT -= dt; else m.slowK = 1;
    if (m.stagT > 0) { m.stagT -= dt; m.moving = 0; return; }
    const sk = m.slowT > 0 ? m.slowK : 1; m.atkT -= dt * sk;
    if (m.act) { const a = m.act; a.t += dt * sk; m.moving = 0; if (!a.hit && a.t >= a.wind) { a.hit = true; a.onHit(); } if (a.t >= a.wind + a.rec) m.act = null; return; }
    const t = pickHeroTarget(m); m.target = t; if (!t) { m.moving = 0; return; }
    const sp = m.speed * sk * (m.enr ? 1.15 : 1);
    if (m.boss) { m.specT -= dt * (m.enr ? 1.4 : 1); if (m.specT <= 0 && dist(m, t) < 9) { bossSpecial(m, t); return; } }
    if (m.M.flank && m.x > t.x + 2.5 && Math.abs(m.z - (pathZ(m.x) + m.side * 4.6)) > 0.8 && m.x > G.anchor.x + 2.2 && !(m.tauntT > 0)) { moveTo(m, m.x - 1.5, pathZ(m.x - 1.5) + m.side * 4.8, sp, dt); return; }
    if (m.M.ranged) {
      const d = dist(m, t); if (d > m.range) { moveTo(m, t.x, t.z, sp, dt, m.range * 0.92); return; } if (d < 4.5 && m.atkT > 0.3) { moveTo(m, m.x + (m.x - t.x) / d * 2, m.z + (m.z - t.z) / d * 2, sp * 0.8, dt); faceTo(m, t); return; }
      m.moving = 0; faceTo(m, t);
      if (m.atkT <= 0) { m.atkT = m.atk; act(m, 'attack', m.atk * 0.4, m.atk * 0.25, () => { A('gloamCast'); if (alive(t)) { const p = LF.fx.proj('gloam', m.x, 1.75, m.z, t.x, 1.2, t.z, dist(m, t) / 9, 0.3, () => { if (alive(t)) hurt(t, m.dmg, m, { kind: 'gloam' }); }); p.tgt = t; } }); }
      return;
    }
    { const dd = dist(m, t) - (m.range + t.radius); if (dd > (m.eng ? 0.55 : 0)) { m.eng = false; moveTo(m, t.x, t.z, dd < 1.2 ? Math.min(sp, 1.3) : sp, dt, m.range + t.radius - 0.25); return; } m.eng = true; }
    m.moving = 0; faceTo(m, t);
    if (m.atkT <= 0) { m.atkT = m.atk; act(m, 'attack', m.atk * m.M.wind, m.atk * 0.44, () => { if (alive(t) && inRange(m, t, 0.8)) hurt(t, m.dmg, m, { heavy: m.elite || m.boss }); if (!LF.quiet && (m.elite || m.boss)) { LF.fx.dust(m.x + Math.sin(m.face) * m.range * 0.7, 0.1, m.z + Math.cos(m.face) * m.range * 0.7, 3, null, 0.4, 1.5); if (m.boss || m.type === 'cairnback') LF.shake(m.boss ? 0.35 : 0.2); } A('atk_' + m.type); }); }
  }
  function bossSpecial(m, t) {
    m.specT = 9 + R() * 3; const kind = m.M.spec, wind = 1.6;
    for (const h of G.heroes) h.dodgeOk = R() < 0.62;
    faceTo(m, t);
    if (kind === 'charge') {
      const d = dist(m, t) || 1, fx = (t.x - m.x) / d, fz = (t.z - m.z) / d, L = Math.min(11, d + 5), tl = []; for (let i = 0; i < 4; i++) { const k = (i + 0.5) / 4 * L, o = { x: m.x + fx * k, z: m.z + fz * k, r: 1.7, t: 0, dur: wind }; G.teles.push(o); tl.push(o); if (!LF.quiet) LF.fx.mark('tele', o.x, o.z, o.r, wind); }
      act(m, 'special', wind, 0.9, () => { for (const o of tl) for (const h of G.heroes) if (!h.down && Math.hypot(h.x - o.x, h.z - o.z) < o.r + 0.3 && !h.hitSpec) { h.hitSpec = true; hurt(h, m.dmg * 2.4, m, { heavy: true }); } for (const h of G.heroes) h.hitSpec = false; m.dashT = 0.35; m.dashX = fx * L / 0.35; m.dashZ = fz * L / 0.35; if (!LF.quiet) { LF.shake(0.7); for (const o of tl) LF.fx.dust(o.x, 0.1, o.z, 5, null, 0.8, 2.5); } A('bossSlam'); });
    } else {
      const r = kind === 'slam' ? 4.2 : 4.0, cx = kind === 'slam' ? t.x : m.x + Math.sin(m.faceT) * 2.6, cz = kind === 'slam' ? t.z : m.z + Math.cos(m.faceT) * 2.6, o = { x: cx, z: cz, r, t: 0, dur: wind }; G.teles.push(o); if (!LF.quiet) LF.fx.mark('tele', cx, cz, r, wind);
      act(m, 'special', wind, 0.9, () => { for (const h of G.heroes) if (!h.down && Math.hypot(h.x - cx, h.z - cz) < r + 0.2) hurt(h, m.dmg * (kind === 'slam' ? 2.7 : 2.3), m, { heavy: true }); if (!LF.quiet) { LF.shake(0.9); LF.fx.ring(cx, cz, 0.5, r, 0.4, [1.6, 1.2, 0.7]); LF.fx.dust(cx, 0.1, cz, 14, null, r * 0.6, 3); LF.fx.chips(cx, 0.2, cz, 14, [0.07, 0.06, 0.05], 5); if (kind !== 'slam') LF.fx.arc(m.x, 1.5 * 1.9, m.z, m.face, r + 1, -2.2, 2.2, 0.05, [1.6, 2.2, 1.7], 0.25); LF.fx.flash(cx, 1, cz, [0.8, 1, 0.8], 40, 0.25); } A('bossSlam'); });
    }
    A('bossWind'); if (LF.onBossWind) LF.onBossWind(m);
  }
  function turn(u, dt) { if (u.faceT !== undefined) u.face += angDiff(u.face, u.faceT) * Math.min(1, dt * 9); }
  // push overlapping bodies apart
  function separate() {
    const U = G.heroes.concat(G.mons), calm = !G.mons.some(m => m.hp > 0 && m.seen);
    for (let i = 0; i < U.length; i++) { const a = U[i]; if (!alive(a)) continue; for (let j = i + 1; j < U.length; j++) { const b = U[j]; if (!alive(b)) continue; if (calm && a.team === 0 && b.team === 0) continue; const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = (a.radius + b.radius) * 0.92; if (d < min && d > 1e-4) { const p = (min - d) / d * 0.5, wa = a.boss ? 0.02 : ((a.act || a.eng) ? 0.03 : 1), wb = b.boss ? 0.02 : ((b.act || b.eng) ? 0.03 : 1), s = wa + wb || 1; a.x -= dx * p * wa / s * 2; a.z -= dz * p * wa / s * 2; b.x += dx * p * wb / s * 2; b.z += dz * p * wb / s * 2; } } }
  }

  /* ----- lantern flare ----- */
  G.fireFlare = function (byPlayer) {
    if (G.flare < 1 || !run || G.state === 'title' || G.heroes.every(h => h.down)) return false; G.flare = 0;
    const r = G.lightRadius(), dmg = G.heroes.reduce((s, h) => s + h.dmg, 0) * 1.5 * (1 + 0.3 * mod('p_flare'));
    for (const m of monsNear(G.lightPos.x, G.lightPos.z, r)) hurt(m, dmg, null, { kind: 'fire', stag: 2.0, heavy: true });
    for (const h of G.heroes) heal(h, h.maxHp * 0.1);
    if (!LF.quiet) { const p = G.lightPos; LF.fx.ring(p.x, p.z, 0.5, r, 0.7, [1.3, 0.65, 0.2]); LF.fx.ring(p.x, p.z, 0.3, r * 0.7, 0.9, [0.6, 0.32, 0.1], 0.08); LF.fx.embers(p.x, 2, p.z, 60, [3, 1.6, 0.4], 3, 1.5); LF.fx.flash(p.x, 2.8, p.z, [1, 0.75, 0.4], 420, 0.9); LF.gfx.params.flash = 0.4; LF.shake(0.7); G.flareV = 1; LF.slowMo = 0.9; for (let i = 1; i <= 3; i++) LF.fx.ring(p.x, p.z, 0.3, r * (0.5 + i * 0.22), 0.6 + i * 0.25, [0.5, 0.24, 0.07], 0.05 + i * 0.02); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; LF.fx.embers(p.x + Math.cos(a) * r * 0.6, 0.3, p.z + Math.sin(a) * r * 0.6, 3, [3, 1.4, 0.3], 0.5, 2.2); } for (const m of monsNear(p.x, p.z, r)) LF.fx.sparks(m.x, yOf(m), m.z, 10, [3.5, 1.8, 0.5], 5); }
    A('lanternFlare'); toast('\ub79c\ud134 \uc12c\uad11', 'good'); return true;
  };

  /* ----- director ----- */
  G.lightPos = { x: 0, z: 0 };
  G.step = function (dt) {
    if (!run || G.panel || G.state === 'title') return;
    if (!LF.quiet) { for (const h of G.heroes) { h.ox = h.x; h.oz = h.z; } for (const m of G.mons) { m.ox = m.x; m.oz = m.z; } }
    G.time += dt; run.time += dt; G.stT += dt; G.stageStats.t += dt;
    const an = G.anchor; an.moving = false;
    if (G.rally) { G.rally.t -= dt; if (G.rally.t <= 0) G.rally = null; }
    if (G.focus) { G.focus.t -= dt; if (G.focus.t <= 0 || !alive(G.focus.u)) G.focus = null; }
    const liveM = G.mons.filter(m => m.hp > 0), near = liveM.some(m => m.x - an.x < 10.5);
    // lantern position (logic side): the carrier
    const car = G.heroes.find(h => h.cls === 'lamplighter') || G.heroes[G.heroes.length - 1]; G.lightPos.x = car.x; G.lightPos.z = car.z; G.carrier = car;
    // watchdog: an empty road that is going nowhere
    if (!liveM.length && an.x === G.wdX && (G.state === 'walk' || G.state === 'fight' || G.state === 'boss' || G.state === 'breather')) { G.wdT = (G.wdT || 0) + dt; if (G.wdT > 6) { console.warn('Lanternfall watchdog: empty road', JSON.stringify({ state: G.state, stT: +G.stT.toFixed(1), stage: run.stage, pack: run.pack, anchor: +an.x.toFixed(1), nextPackX: +G.nextPackX.toFixed(1), wayX: G.wayX, pending: G.pending.length, mons: G.mons.length, heroes: G.heroes.map(h => [h.cls, +(h.x - an.x).toFixed(1), h.down, !!h.act]) })); G.wdT = 0; G.wdN = (G.wdN || 0) + 1; G.pending.length = 0; G.state = 'walk'; G.stT = 1; G.nextPackX = an.x; } } else G.wdT = 0; G.wdX = an.x;
    switch (G.state) {
      case 'walk':
        if (G.pending.length && G.stT > 0.4) { G.openPending(); break; }
        an.moving = true; an.x += LF.WALK * dt;
        if (run.pack < LF.PACKS) { if (an.x >= G.nextPackX) G.spawnPack(); }
        else { if (G.wayX === null) { G.wayX = an.x + 17; if (LF.onWaylight) LF.onWaylight(G.wayX); } if (an.x >= G.wayX - 13) G.spawnBoss(); }
        break;
      case 'fight': case 'boss':
        if (!near && liveM.length) { an.moving = true; an.x += LF.WALK * dt; }
        if (!liveM.length) {
          for (const h of G.heroes) { if (h.down) revive(h, 0.4); else heal(h, h.maxHp * Math.min(0.4, LF.TUNE.heal + 0.025 * run.camp.dress), true); }
          if (G.state === 'boss') { G.state = 'relight'; G.stT = 0; run.maxStage = Math.max(run.maxStage, run.stage); A('bossDown'); }
          else { G.state = 'breather'; G.stT = 0; G.nextPackX = an.x + (DEMO ? 7 : LF.TUNE.gap + R() * 4); }
          G.teles.length = 0; stewardCamp();
        }
        break;
      case 'breather': if (G.stT > 1.0) { G.state = 'walk'; G.stT = 0; } break;
      case 'relight': {
        // the carrier walks to the post and lifts the lantern to it
        const wx = G.wayX - 0.9, wz = pathZ(G.wayX) - 2.0;
        if (!G.relit) { if (moveTo(car, wx, wz, car.speed, dt, 0.25) || G.stT > 6) { car.faceT = Math.atan2(0.8, -1); if (!car.act && !G.relitAct) { G.relitAct = true; act(car, car.cls === 'lamplighter' ? 'kindle' : 'attack', 0.8, 0.9, () => { G.relit = true; run.lit++; if (LF.onRelight) LF.onRelight(); A('waylight'); toast('\ub4f1\ubd88 ' + run.stage + ' \uc7ac\uc810\ud654', 'good'); for (const h of G.heroes) { if (h.down) revive(h, 1); h.hp = h.maxHp; } run.tonics = run.maxTonics; }); } }
          if (car.act) { const a = car.act; a.t += dt; if (!a.hit && a.t >= a.wind) { a.hit = true; a.onHit(); } if (a.t >= a.wind + a.rec) car.act = null; }
          for (const h of G.heroes) { if (h !== car) stepHero(h, dt); turn(h, dt); }
          G.relT = 0; sync(dt); return; }
        G.relT += dt; if (G.relT > 2.6) { G.relit = false; G.relitAct = false; G.state = 'choice'; G.stT = 0; G.save(); G.openChoice(); }
        break; }
      case 'choice': break;
      case 'wipe':
        if (G.stT > 3.2) {
          if (run.flames <= 0) { G.endRun(); return; }
          for (const m of G.mons) m.gone = true; G.mons = []; G.zones = []; G.teles = []; if (!LF.quiet) LF.fx.clear();
          run.stage = Math.max(1, run.stage - 1); for (const h of G.heroes) { h.down = false; h.hp = h.maxHp; h.act = null; } run.tonics = run.maxTonics;
          an.x += 6; G.placeParty(); G.setupStage(false); toast('\ud30c\ud2f0\uac00 \uc2a4\ud14c\uc774\uc9c0 ' + run.stage + '(\uc73c)\ub85c \ud6c4\ud1f4\ud588\ub2e4', 'bad'); G.save();
        }
        break;
    }
    if (G.state === 'wipe') { sync(dt); return; }
    for (const h of G.heroes) { stepHero(h, dt); turn(h, dt); }
    for (const m of G.mons) { turn(m, dt); if (m.dashT > 0) { m.dashT -= dt; m.x += m.dashX * dt; m.z += m.dashZ * dt; } stepMon(m, dt); }
    separate();
    for (let i = G.zones.length - 1; i >= 0; i--) { const z = G.zones[i]; z.t += dt; z.tk += dt; if (z.tk >= z.tick) { z.tk = 0; G.dot = true; z.fn(z); G.dot = false; } if (z.t >= z.dur) G.zones.splice(i, 1); }
    for (let i = G.teles.length - 1; i >= 0; i--) { const t = G.teles[i]; t.t += dt; if (t.t >= t.dur + 0.1) G.teles.splice(i, 1); }
    for (let i = G.mons.length - 1; i >= 0; i--) { const m = G.mons[i]; if (m.hp <= 0) { m.deadT += dt; if (m.deadT > 3.4) { m.gone = true; G.mons.splice(i, 1); } } }
    // flare meter, tonics, steward
    if (liveM.length) G.flare = Math.min(1, G.flare + dt * 0.012 * (1 + 0.3 * mod('p_flare')));
    G.tonicCd = (G.tonicCd || 0) - dt;
    if (run.tonics > 0 && G.tonicCd <= 0) { const h = G.heroes.find(q => !q.down && q.hp < q.maxHp * 0.33); if (h) { run.tonics--; G.tonicCd = 5; heal(h, h.maxHp * Math.min(0.7, 0.35 + 0.025 * run.camp.tonic)); A('heal'); if (!LF.quiet) LF.fx.float(h.x, 2.4, h.z, '\uac15\uc7a5\uc81c', '#8fd98a', 12, 0.5); } }
    if (DEMO && G.demoT !== undefined && G.flare >= 1) { G.demoT += dt; if (G.demoT > 17 && monsNear(G.lightPos.x, G.lightPos.z, G.lightRadius() * 0.8).length >= 2) { G.fireFlare(false); G.demoT = undefined; } }
    else if (P.steward && G.flare >= 1 && liveM.length) { const inR = monsNear(G.lightPos.x, G.lightPos.z, G.lightRadius()).length; if (inR >= Math.min(5, Math.max(3, liveM.length)) || (G.bossRef && (G.bossRef.act && !G.bossRef.act.hit || partyHp() < 0.5)) || G.heroes.some(h => !h.down && h.hp < h.maxHp * 0.25)) G.fireFlare(false); }
    sync(dt);
  };
  function sync(dt) { // world periodicity
    if (G.anchor.x > WORLD_L + 64) G.shiftWorld(WORLD_L);
  }
  G.shiftWorld = function (dx) {
    G.anchor.x -= dx; G.nextPackX -= dx; if (G.wayX !== null) G.wayX -= dx; for (const h of G.heroes) h.x -= dx; for (const m of G.mons) m.x -= dx; for (const z of G.zones) z.x -= dx; for (const t of G.teles) t.x -= dx; if (G.rally) G.rally.x -= dx;
    if (LF.onShift) LF.onShift(dx);
  };
  /* ----- steward and panels ----- */
  function stewardCamp() {
    if (!P.steward) return; let guard = 0;
    while (guard++ < 20) { let best = null, bc = 1e18; const pr = { whet: 1, dress: 1.05, oil: 1.5, tonic: 1.7 }; for (const c of CAMP) { const cost = G.campCost(c.id) * pr[c.id]; if (cost < bc) { bc = cost; best = c; } } if (best && run.silver >= G.campCost(best.id)) G.buyCamp(best.id, true); else break; }
  }
  G.campCost = id => { const c = CAMP.find(q => q.id === id); return Math.round(c.base * Math.pow(1.42, run.camp[id])); };
  G.buyCamp = function (id, quiet) { const cost = G.campCost(id); if (run.silver < cost) return false; run.silver -= cost; run.camp[id]++; G.recalc(); if (id === 'tonic') run.tonics = Math.min(run.maxTonics, run.tonics + 1); if (!quiet) A('buy'); else if (!LF.quiet) { const c = CAMP.find(q => q.id === id); toast('\ucea0\ud504: ' + c.name + ' ' + run.camp[id]); A('buy'); } return true; };
  G.offerCards = function () {
    const pool = CARDS.filter(c => (c.who === 'party' || run.party.includes(c.who)) && (run.cards[c.id] || 0) < 3), out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    return out;
  };
  G.takeCard = function (id) { run.cards[id] = (run.cards[id] || 0) + 1; G.recalc(); A('card'); };
  G.openPending = function () {
    const k = G.pending.shift(); if (k !== 'card') return;
    const offer = G.offerCards(); if (!offer.length) return;
    // steward's pick: favours party-wide cards a little, then hero damage
    let rec = 0, bs = -1; offer.forEach((c, i) => { const s = (c.who === 'party' ? 1.2 : 1) + R() * 0.8 + (c.id.endsWith('dmg') || c.id === 'p_dmg' || c.id === 'p_hp' ? 0.3 : 0); if (s > bs) { bs = s; rec = i; } });
    if (LF.quiet || !LF.ui) { G.takeCard(offer[rec].id); return; }
    G.panel = 'cards'; LF.ui.openCards(offer, rec);
  };
  G.danger = function (next) {
    const st = G.stageStats; let score = 0; score += st.downs * 1.4; score += st.minHp < 0.3 ? 2 : st.minHp < 0.5 ? 1 : st.minHp < 0.65 ? 0.4 : 0; if (st.t > 170) score += 0.6;
    if (next) score += 0.5;
    return score >= 2.2 ? 'DEADLY' : score >= 0.9 ? 'RISKY' : 'SAFE';
  };
  G.stewardPush = function () { const d = G.danger(true); if (d === 'SAFE') return true; if (d === 'RISKY') return run.flames >= 2 || run.holdCount >= 2; return run.holdCount >= 3 + (3 - run.flames); };
  G.openChoice = function () {
    const rec = G.stewardPush();
    if (LF.quiet || !LF.ui) { G.choose(P.steward ? rec : P.push); return; }
    G.panel = 'choice'; LF.ui.openChoice(rec);
  };
  G.choose = function (push) {
    G.panel = null; if (push) { run.stage++; run.holdCount = 0; } else run.holdCount++;
    for (const c in UNLOCK_AT) if (!P.unlocked[c] && run.maxStage >= UNLOCK_AT[c]) { P.unlocked[c] = 1; toast(CL[c].name + ' \uae38\uc5d0 \ud569\ub958\ud588\ub2e4', 'good'); A('unlock'); }
    P.best.stage = Math.max(P.best.stage, run.maxStage); P.best.level = Math.max(P.best.level, run.level);
    G.setupStage(false); A(push ? 'push' : 'hold'); G.save();
  };
  G.emberGain = () => Math.max(1, Math.floor(Math.pow(Math.max(0, run.maxStage), 1.25) * 0.75 + run.relics));
  G.endRun = function () {
    const gain = G.emberGain(); P.embers += gain; P.best.stage = Math.max(P.best.stage, run.maxStage); P.best.level = Math.max(P.best.level, run.level); P.best.time = Math.max(P.best.time || 0, run.time);
    G.last = { stage: run.maxStage, level: run.level, time: run.time, embers: gain, kills: run.kills, lit: run.lit, d5: run.d5 || 0 };
    for (const c in UNLOCK_AT) if (!P.unlocked[c] && run.maxStage >= UNLOCK_AT[c]) P.unlocked[c] = 1;
    G.state = 'runend'; run = G.run = null; P.run = null; A('lanternFall'); G.save();
    if (LF.quiet || !LF.ui) { G.stewardBoons(); G.newRun(); return; }
    G.panel = 'runend'; LF.ui.openRunEnd();
  };
  G.boonCost = id => { const b = BOONS.find(q => q.id === id); return b.unlock ? b.cost : Math.round(b.cost * (1 + 0.6 * boon(id))); };
  G.buyBoon = function (id) { const b = BOONS.find(q => q.id === id), cost = G.boonCost(id); if (P.embers < cost || boon(id) >= b.max || (b.unlock && P.unlocked[id])) return false; P.embers -= cost; P.boons[id] = boon(id) + 1; if (b.unlock) P.unlocked[id] = 1; A('buy'); return true; };
  G.stewardBoons = function () { let g = 0; while (g++ < 40) { let best = null, bc = 1e9; for (const b of BOONS) { if (boon(b.id) >= b.max || (b.unlock && P.unlocked[b.id])) continue; const c = G.boonCost(b.id) * (b.id === 'start' ? 1.6 : 1); if (c < bc) { bc = c; best = b; } } if (!best || !G.buyBoon(best.id)) break; } };
  /* ----- player input ----- */
  G.setFocus = function (m) { G.focus = { u: m, t: 6 }; A('click'); };
  G.setRally = function (x, z) { G.rally = { x: clamp(x, G.anchor.x - 9, G.anchor.x + 9), z: clamp(z, pathZ(x) - 6, pathZ(x) + 6), t: 4 }; A('click'); };
  /* ----- offline ----- */
  G.away = function () {
    if (!P.run || !P.lastSeen) return null; const dt = Math.min(4 * 3600, (Date.now() - P.lastSeen) / 1000); if (dt < 90) return null;
    const r = P.run, T = Math.max(60, r.time), silver = Math.round((P.rate.silver / T) * dt * 0.5), xp = (P.rate.xp / T) * dt * 0.35;
    return { dt, silver, xp };
  };
  G.applyAway = function (a) { run.silver += a.silver; const L0 = run.level; addXp(a.xp); G.pending.length = Math.min(G.pending.length, 3); return run.level - L0; };
  // fast headless simulation for balance checks: returns a summary
  G.sim = function (seconds, opts) {
    opts = opts || {}; LF.quiet = true; const t0 = G.time; let n = 0; const log = [];
    if (!run) G.newRun();
    const pOld = P.steward; if (opts.alwaysPush) { G.stewardPush = () => true; }
    while (G.time - t0 < seconds && n++ < seconds * 62) { const rs = P.runs, st = run ? run.stage : 0; G.step(DT); if (P.runs !== rs && G.last) log.push({ end: Math.round(G.time - t0), stage: G.last.stage, level: G.last.level, t: Math.round(G.last.time), d5: G.last.d5 }); if (G.panel) G.panel = null; }
    LF.quiet = false; return { t: Math.round(G.time - t0), stage: run.stage, max: run.maxStage, level: run.level, flames: run.flames, silver: Math.round(run.silver), camp: run.camp, runs: log, embers: P.embers, boons: P.boons };
  };
  return G;
})();
LF.WALK = 1.6; LF.PACKS = qnum('tpk', 3);
LF.TUNE = { hp: qnum('thp', 1.3), dmg: qnum('tdmg', 1.17), d0: qnum('td0', 7.5), gap: qnum('tgap', 8), heal: qnum('theal', 0.03), xp: qnum('txp', 1.4), h0: qnum('th0', 1), b0: qnum('tb0', 14), b1: qnum('tb1', 3) };
LF.shake = function (a) { LF.shakeA = Math.max(LF.shakeA || 0, a); };
