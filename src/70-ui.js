/* LANTERNFALL - interface (DOM over the scene) */
LF.ui = (function () {
  const U = {}, G = LF.game, P = G.P; let root, el = {}, timer = null;
  const CSS = `
#ui{font-size:16px;color:#d9cfba}
#ui *{box-sizing:border-box}
.pe{pointer-events:auto}
.num{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",Tahoma,Verdana,sans-serif;font-variant-numeric:tabular-nums}
#top{position:absolute;left:0;right:0;top:0;height:2.6em;display:flex;align-items:center;gap:1.1em;padding:0 .9em;background:linear-gradient(#07080cdd,#07080c99 70%,#07080c00);text-shadow:0 1px 2px #000}
#top .stage{font-size:1.02em;letter-spacing:.14em;white-space:nowrap}
#top .stage b{color:#f0d9a8;font-weight:normal}
#danger{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.68em;font-weight:700;letter-spacing:.12em;padding:.1em .5em;border:1px solid;border-radius:2px;display:none}
#pips{display:flex;gap:.28em;align-items:center}
#pips i{width:.62em;height:.62em;border:1px solid #8a7a5a;transform:rotate(45deg);display:block;background:#0006}
#pips i.on{background:#e0b872;border-color:#f3dcae;box-shadow:0 0 .4em #e0a04a}
#pips i.boss{width:.86em;height:.86em;margin-left:.3em;border-color:#b0503a}
#pips i.boss.on{background:#d0604a;box-shadow:0 0 .5em #d0604a}
.sp{flex:1}
.stat{display:flex;align-items:center;gap:.35em;font-size:.95em;white-space:nowrap}
.stat svg{width:1em;height:1em;flex:none}
#lvl{display:flex;align-items:center;gap:.5em;font-size:.82em;letter-spacing:.1em}
#xpbar{width:6em;height:.32em;background:#0009;border:1px solid #5a4d36}
#xpbar i{display:block;height:100%;background:#b9a36a;width:0}
#flames{display:flex;gap:.15em}
#flames svg{width:1.05em;height:1.3em}
.btn{font-family:Georgia,'Noto Serif KR','Apple SD Gothic Neo','Malgun Gothic',serif;font-size:.74em;letter-spacing:.12em;color:#cfc3a8;background:#14151acc;border:1px solid #5a4d36;padding:.34em .7em;cursor:pointer;white-space:nowrap;border-radius:1px}
.btn:hover{border-color:#c9a45a;color:#f3e6c6}
.btn.on{background:#3a2c14cc;border-color:#d0a85a;color:#ffe9b8}
.btn[disabled]{opacity:.38;cursor:default;border-color:#3a3428}
.seg{display:flex}.seg .btn{border-left-width:0}.seg .btn:first-child{border-left-width:1px}
#bot{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:flex-end;justify-content:center;gap:.55em;padding:.5em .8em .55em;background:linear-gradient(#07080c00,#07080cb0 55%,#07080ce6)}
.plate{display:flex;gap:.55em;align-items:center;background:#0c0d12cc;border:1px solid #4a3f2c;padding:.34em .6em .34em .34em;min-width:12.4em;position:relative}
.plate.low{animation:low .55s infinite alternate}
@keyframes low{from{border-color:#4a3f2c;box-shadow:none}to{border-color:#d04a34;box-shadow:0 0 .7em #b0301c88 inset}}
.plate.down{filter:grayscale(.8) brightness(.6)}
.plate canvas{width:3.5em;height:3.5em;display:block;border:1px solid #3a3226;background:#07080b}
.plate .nm{font-size:.84em;letter-spacing:.14em;color:#eadcb8;line-height:1.1}
.plate .rl{font-size:.6em;letter-spacing:.12em;color:#8f8672;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif}
.hp{height:.42em;background:#000a;border:1px solid #4a4030;margin:.28em 0 .22em;width:7.6em;position:relative}
.hp i{display:block;height:100%;background:linear-gradient(#b8452f,#8a2c1e);width:100%}
.hp b{position:absolute;right:.2em;top:-.95em;font-size:.58em;color:#a99f88;font-weight:normal}
.sk{display:flex;gap:.25em}
.sk i{width:1.5em;height:.26em;background:#000a;border:1px solid #4a4030;display:block;position:relative;overflow:hidden}
.sk i u{position:absolute;left:0;top:0;bottom:0;background:#c9a45a;width:0}
.sk i.rdy u{background:#ffe2a0;box-shadow:0 0 .4em #ffd27a}
.rev{position:absolute;left:.34em;top:.34em;width:3.5em;height:3.5em;display:none;align-items:center;justify-content:center;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:1em;color:#f0d9a8;background:#000a}
.plate.down .rev{display:flex}
#flareB{width:5.2em;height:4.3em;border:1px solid #6a5630;background:#14110ccc;position:relative;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.1em;overflow:hidden;margin-left:.3em}
#flareB u{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(#e0903a66,#c0601a99);height:0;text-decoration:none}
#flareB svg{width:1.5em;height:1.8em;position:relative}
#flareB span{font-size:.56em;letter-spacing:.14em;position:relative;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;color:#cdbf9f}
#flareB.rdy{border-color:#ffd27a;box-shadow:0 0 1em #e0903a99;animation:fl 1s infinite alternate}
@keyframes fl{to{box-shadow:0 0 1.7em #ffb04acc}}
#tonics{font-size:.66em;letter-spacing:.1em;color:#9fb58f;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;align-self:center;margin-left:.4em;white-space:nowrap}
#boss{position:absolute;left:50%;top:3.2em;transform:translateX(-50%);width:min(34em,56vw);text-align:center;display:none}
#boss .t{font-size:1.02em;letter-spacing:.3em;color:#e9d3b0;text-shadow:0 1px 3px #000,0 0 .8em #000}
#boss .b{height:.5em;background:#000b;border:1px solid #6a4a3a;margin-top:.3em}
#boss .b i{display:block;height:100%;background:linear-gradient(#c0553a,#7a2418)}
#toasts{position:absolute;right:.9em;top:3.2em;display:flex;flex-direction:column;gap:.35em;align-items:flex-end}
.toast{font-size:.8em;letter-spacing:.14em;background:#0b0c11dd;border-left:2px solid #c9a45a;padding:.4em .8em;animation:tin .25s ease-out;white-space:nowrap}
.toast.bad{border-color:#d04a34;color:#f0b0a0}.toast.good{border-color:#e0b872;color:#ffe9b8}.toast.relic{border-color:#ff7a3a;color:#ffb48a}.toast.gilded{border-color:#e0a33c;color:#f0cc88}.toast.boss{border-color:#b0503a;color:#f0d0c0}
.toast.out{opacity:0;transform:translateX(1em);transition:all .3s}
@keyframes tin{from{opacity:0;transform:translateX(1.5em)}}
#veil{position:absolute;inset:0;background:#04050899;display:none;align-items:center;justify-content:center}
.panel{background:#0c0d12f2;border:1px solid #6a5a3c;box-shadow:0 0 0 1px #000,0 1em 4em #000c;padding:1.2em 1.5em 1.1em;max-width:94vw;max-height:88vh;overflow:auto;position:relative}
.panel h2{font-size:1.25em;letter-spacing:.3em;font-weight:normal;margin:0 0 .15em;color:#f0dcb0;text-align:center}
.panel .sub{font-size:.78em;letter-spacing:.12em;color:#9a917c;text-align:center;margin-bottom:1em}
.rule{height:1px;background:linear-gradient(90deg,#0000,#8a7448,#0000);margin:.5em 0 .9em}
.cards{display:flex;gap:.9em;justify-content:center;flex-wrap:wrap}
.card{width:13.5em;border:1px solid #5a4d36;background:#12131acc;padding:.9em .9em .8em;cursor:pointer;text-align:center;position:relative;transition:transform .12s,border-color .12s}
.card:hover{border-color:#e0b872;transform:translateY(-.2em)}
.card .who{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.62em;letter-spacing:.2em;color:#9a917c}
.card .nm{font-size:1em;letter-spacing:.16em;color:#f0dcb0;margin:.45em 0 .5em}
.card .d{font-size:.82em;line-height:1.35;color:#c9bfa8;min-height:3.3em}
.card .rk{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.62em;letter-spacing:.14em;color:#b9a36a;margin-top:.5em}
.card.rec{border-color:#b9954a}.card.rec:after{content:"\uc9d1\uc0ac";position:absolute;right:.4em;top:.3em;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.5em;letter-spacing:.16em;color:#d0a85a}
.card canvas{width:3.2em;height:3.2em;border:1px solid #3a3226;display:block;margin:0 auto .2em}
.cd{height:2px;background:#2a2418;margin-top:1em;position:relative}.cd i{position:absolute;left:0;top:0;bottom:0;background:#c9a45a;width:100%}
.cdn{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.62em;letter-spacing:.12em;color:#8f8672;text-align:center;margin-top:.45em}
.big{display:flex;gap:1em;justify-content:center;margin-top:.4em;flex-wrap:wrap}
.big .btn{font-size:.95em;padding:.8em 1.5em;min-width:11em;text-align:center}
.big .btn small{display:block;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.62em;letter-spacing:.1em;color:#9a917c;margin-top:.35em}
.big .btn.rec{border-color:#d0a85a}
.tag{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.7em;font-weight:700;letter-spacing:.14em}
.SAFE{color:#8fc98a}.RISKY{color:#e0b85a}.DEADLY{color:#e05a44}
.tabs{display:flex;gap:0;justify-content:center;margin-bottom:1em}.tabs .btn{font-size:.8em;padding:.5em 1em}
.rows{display:flex;flex-direction:column;gap:.45em;min-width:min(38em,84vw)}
.row{display:flex;align-items:center;gap:.8em;border:1px solid #3a3226;background:#11121899;padding:.5em .7em}
.row .g{flex:1;min-width:0}.row .t{font-size:.9em;letter-spacing:.14em;color:#eadcb8}.row .s{font-size:.74em;color:#a99f88;line-height:1.35;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif}
.row canvas{width:3.2em;height:3.2em;border:1px solid #3a3226;flex:none}
.row.sel{border-color:#c9a45a;background:#2a200e99}.row.lock{opacity:.5}
.slots{display:flex;gap:.5em;flex-wrap:wrap}.slot{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.7em;border:1px solid #3a3226;padding:.3em .5em;min-width:11em;line-height:1.35}
.slot b{display:block;font-weight:600}
.kv{display:grid;grid-template-columns:auto auto;gap:.25em 1.6em;justify-content:center;font-size:.9em;margin:.6em 0 1em}.kv span:nth-child(odd){color:#9a917c;letter-spacing:.12em;font-size:.86em}.kv span:nth-child(even){text-align:right;color:#f0dcb0}
.x{position:absolute;right:.5em;top:.35em;cursor:pointer;color:#8f8672;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.9em;padding:.2em .4em}
input[type=range]{accent-color:#c9a45a;width:12em}
#title{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:flex-start;padding:9vh 0 9vh;background:radial-gradient(ellipse at 50% 40%,#0000 30%,#04050899 100%);text-align:center}
#title h1{font-size:min(6.2em,11vw);letter-spacing:.34em;font-weight:normal;margin:0 0 .1em .34em;color:#f1dfb6;text-shadow:0 0 .5em #e0903a66,0 .05em .1em #000}
#title .tl{font-size:.92em;letter-spacing:.3em;color:#b3a88e;margin-bottom:2.4em;flex:1}
#title .best{font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.7em;letter-spacing:.14em;color:#8f8672;margin-top:1.4em}
#snd{position:absolute;left:.9em;bottom:6.4em;font-family:"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:.66em;letter-spacing:.16em;color:#a99f88;background:#07080c99;padding:.3em .6em;border:1px solid #3a3226}
#stamp{position:absolute;right:.5em;bottom:.2em;font:11px 'Segoe UI','Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#8f8672;opacity:.75;z-index:5}
#sdbg{position:absolute;left:.6em;top:3.4em;margin:0;padding:.6em .8em;background:#000c;color:#e8e0cc;font:15px/1.35 Consolas,'Courier New',monospace;display:none;z-index:6;max-width:62em;white-space:pre}
.chk{display:inline-flex;align-items:center;gap:.35em;margin:.2em .7em .2em 0;font-family:'Segoe UI','Malgun Gothic','Apple SD Gothic Neo',sans-serif;font-size:.78em;letter-spacing:.06em;cursor:pointer}
#dim{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .8s;pointer-events:none}
#fall{position:absolute;left:0;right:0;top:38%;text-align:center;font-size:min(7em,12vw);letter-spacing:.34em;color:#e9c08a;text-shadow:0 0 .6em #c0501a;opacity:0;transition:opacity 1.2s;pointer-events:none}
`;
  const SVG = {
    flame: (c) => `<svg viewBox="0 0 20 26"><path d="M10 1c1 5 6 7 6 14a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-3 0-8 1-12z" fill="${c}"/></svg>`,
    coin: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="#b8bcc4" stroke="#6a6e76" stroke-width="1.5"/><path d="M10 5.5v9M7 8h6" stroke="#6a6e76" stroke-width="1.5"/></svg>',
    ember: '<svg viewBox="0 0 20 20"><path d="M10 2l3 5 5 3-5 3-3 5-3-5-5-3 5-3z" fill="#ff8a3a" stroke="#7a2a0a" stroke-width="1"/></svg>'
  };
  const h = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  U.init = function () {
    root = document.getElementById('ui'); const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root.innerHTML = `
<div id="dim"></div><div id="stamp">build __BUILD__</div><pre id="sdbg"></pre><div id="fall">LANTERNFALL</div>
<div id="top" class="pe"><div class="stage" id="stg"></div><div id="danger"></div><div id="pips"></div><div class="sp"></div>
 <div id="lvl"><span id="lvn"></span><div id="xpbar"><i></i></div></div>
 <div class="stat" title="\uc740\ud654">${SVG.coin}<span class="num" id="sil">0</span></div><div class="stat" title="\uc7bf\ubd88">${SVG.ember}<span class="num" id="emb">0</span></div>
 <div id="flames" title="\ub79c\ud134 \ubd88\uaf43"></div>
 <div class="seg" id="spd"><div class="btn" data-s="1">1&times;</div><div class="btn" data-s="2">2&times;</div><div class="btn" data-s="4">4&times;</div></div>
 <div class="stat pe" title="\uc74c\ub7c9"><div class="btn" id="muteB"></div><input type="range" id="volS" min="0" max="100" style="width:5em"></div>
 <div class="btn" id="pushB" title="\uc9c1\uc811 \uc120\ud0dd\ud558\uc9c0 \uc54a\uc744 \ub54c \ub4f1\ubd88 \ub2e4\uc74c\uc5d0 \ud30c\ud2f0\uac00 \ud560 \uc77c"></div><div class="btn" id="stewB" title="\uce74\uc6b4\ud2b8\ub2e4\uc6b4\uc774 \ub05d\ub098\uba74 \uc9d1\uc0ac\uac00 \ub300\uc2e0 \uc120\ud0dd\ud55c\ub2e4"></div><div class="btn" id="menuB">\uba54\ub274</div></div>
<div id="boss"><div class="t"></div><div class="b"><i></i></div></div>
<div id="toasts"></div>
<div id="bot" class="pe"></div>
<div id="snd">\uc18c\ub9ac\ub97c \ucf1c\ub824\uba74 \ud074\ub9ad</div>
<div id="title" class="pe"><h1>LANTERNFALL</h1><div class="tl">\ub9c8\uc9c0\ub9c9 \ube5b\uc744 \ub4e4\uace0 \ud669\ubb34\uc9c0\ub97c \uac74\ub108\ub77c</div><div class="big"><div class="btn rec" id="beginB"></div><div class="btn" id="newB" style="display:none">\uc0c8 \uc5ec\uc815<small>\uc800\uc7a5\ub41c \uae38\uc744 \ubc84\ub9b0\ub2e4</small></div></div><div class="cdn" id="tcd"></div><div class="best" id="tbest"></div></div>
<div id="veil" class="pe"></div>`;
    for (const id of ['top', 'stg', 'danger', 'pips', 'lvn', 'sil', 'emb', 'flames', 'spd', 'pushB', 'stewB', 'menuB', 'boss', 'toasts', 'bot', 'snd', 'title', 'veil', 'dim', 'beginB', 'newB', 'tcd', 'tbest']) el[id] = document.getElementById(id);
    el.xp = root.querySelector('#xpbar i'); el.muteB = document.getElementById('muteB'); el.volS = document.getElementById('volS'); if (P.vol.master === undefined) P.vol.master = 1; el.volS.value = Math.round(P.vol.master * 100);
    el.volS.addEventListener('input', e => { P.vol.master = e.target.value / 100; if (P.vol.master > 0) P.vol.mute = false; LF.audio.setVol(); U.refreshTop(); }); el.volS.addEventListener('change', () => G.save());
    el.muteB.addEventListener('click', () => { P.vol.mute = !P.vol.mute; LF.audio.setVol(); U.refreshTop(); G.save(); });
    el.spd.addEventListener('click', e => { const s = e.target.getAttribute('data-s'); if (s) { P.speed = +s; U.refreshTop(); LF.audio.play('click'); } });
    el.pushB.addEventListener('click', () => { P.push = !P.push; U.refreshTop(); LF.audio.play('click'); });
    el.stewB.addEventListener('click', () => { P.steward = !P.steward; U.refreshTop(); LF.audio.play('click'); });
    el.menuB.addEventListener('click', () => U.openMenu('party'));
    el.veil.addEventListener('mousedown', e => { if (e.target === el.veil && U.closable) U.close(); });
    el.beginB.addEventListener('click', () => LF.begin(false)); el.newB.addEventListener('click', () => LF.begin(true));
    window.addEventListener('pointerdown', () => { U.userTouched = true; }, true); window.addEventListener('keydown', () => { U.userTouched = true; }, true);
    U.resize(); U.refreshTop(); if (QS.has('sounddebug')) U.soundDebug(true);
  };
  U.resize = function () { if (!root) return; const s = clamp(Math.min(window.innerHeight / 1080, window.innerWidth / 1500), 0.62, 1.6); root.style.fontSize = (16 * s).toFixed(2) + 'px'; };
  U.refreshTop = function () {
    for (const b of el.spd.children) b.classList.toggle('on', +b.getAttribute('data-s') === P.speed);
    if (el.muteB) { el.muteB.textContent = P.vol.mute ? '\uc74c\uc18c\uac70' : '\uc18c\ub9ac'; el.muteB.classList.toggle('on', !P.vol.mute); }
    el.pushB.textContent = P.push ? '\uae30\ubcf8: \uc804\uc9c4' : '\uae30\ubcf8: \uc720\uc9c0'; el.stewB.textContent = P.steward ? '\uc9d1\uc0ac \ucf1c\uc9d0' : '\uc9d1\uc0ac \uaebc\uc9d0'; el.stewB.classList.toggle('on', P.steward);
  };
  /* ----- HUD ----- */
  let plates = [], lastParty = '';
  U.buildPlates = function () {
    const run = G.run; el.bot.innerHTML = ''; plates = [];
    for (const hero of G.heroes) {
      const p = h(`<div class="plate"><canvas width="96" height="96"></canvas><div class="rev num"></div><div><div class="nm">${hero.C.name}</div><div class="rl">${hero.C.role}</div><div class="hp"><i></i><b class="num"></b></div><div class="sk"><i><u></u></i><i><u></u></i><i><u></u></i></div></div></div>`);
      el.bot.appendChild(p); plates.push({ p, hero, cv: p.querySelector('canvas'), hp: p.querySelector('.hp i'), hpt: p.querySelector('.hp b'), sk: [...p.querySelectorAll('.sk i')], rev: p.querySelector('.rev') });
      p.title = hero.C.skills.map(s => s.name + ': ' + s.d).join('\n');
    }
    const fb = h(`<div id="flareB" title="\ub79c\ud134 \uc12c\uad11 (Space)"><u></u>${SVG.flame('#ffcf8a')}<span>\uc12c\uad11</span></div>`); el.bot.appendChild(fb); el.flareB = fb; el.flareU = fb.querySelector('u'); fb.addEventListener('click', () => G.fireFlare(true));
    const tn = h('<div id="tonics"></div>'); el.bot.appendChild(tn); el.tonics = tn;
    lastParty = run.party.join();
    LF.wantPortraits = true;
  };
  U.portraitTargets = () => plates.map(p => ({ cls: p.hero.cls, cv: p.cv }));
  let hudT = 0;
  U.update = function (dt) {
    const run = G.run; hudT += dt; if (!run) { el.top.style.display = G.state === 'title' ? 'none' : 'flex'; return; }
    const ttl = G.state === 'title'; el.top.style.display = ttl ? 'none' : 'flex'; el.bot.style.display = ttl ? 'none' : 'flex'; el.snd.style.bottom = ttl ? '1em' : '6.4em';
    if (lastParty !== run.party.join() || plates.length !== G.heroes.length || (plates[0] && plates[0].hero !== G.heroes[0])) U.buildPlates();
    if (hudT < 0.1) return; hudT = 0;
    el.stg.innerHTML = `${G.stageName(run.stage)} <b>&middot; \uc2a4\ud14c\uc774\uc9c0 ${run.stage}</b>`;
    const dg = (G.state === 'fight' || G.state === 'boss') ? G.danger(false) : 'SAFE'; el.danger.style.display = dg === 'DEADLY' ? 'block' : 'none'; if (dg === 'DEADLY') { el.danger.textContent = '\uce58\uba85\uc801'; el.danger.className = 'DEADLY'; }
    let ph = ''; for (let i = 0; i < LF.PACKS; i++) ph += `<i class="${i < run.pack - (G.state === 'fight' ? 1 : 0) ? 'on' : ''}"></i>`; ph += `<i class="boss ${G.state === 'relight' || G.state === 'choice' ? 'on' : ''}"></i>`; if (el.pips._h !== ph) { el.pips.innerHTML = ph; el.pips._h = ph; }
    el.lvn.textContent = '\ub808\ubca8 ' + run.level; el.xp.style.width = (100 * run.xp / G.xpNeed(run.level)).toFixed(1) + '%';
    el.sil.textContent = fmt(run.silver); el.emb.textContent = fmt(P.embers);
    let fh = ''; for (let i = 0; i < 3; i++) fh += SVG.flame(i < run.flames ? '#ffb85a' : '#2c2a28'); if (el.flames._h !== fh) { el.flames.innerHTML = fh; el.flames._h = fh; }
    for (const pl of plates) {
      const u = pl.hero, f = clamp(u.hp / u.maxHp, 0, 1); pl.hp.style.width = (f * 100).toFixed(1) + '%'; pl.hpt.textContent = fmt(Math.max(0, u.hp)) + ' / ' + fmt(u.maxHp);
      pl.p.classList.toggle('low', !u.down && f < 0.3); pl.p.classList.toggle('down', !!u.down); if (u.down) pl.rev.textContent = Math.ceil(u.downT);
      for (let i = 0; i < 3; i++) { const s = u.C.skills[i], k = s.passive && s.id !== 'riposte' ? 1 : 1 - clamp((s.id === 'riposte' ? u.ripT : u.cd[i]) / s.cd, 0, 1); pl.sk[i].firstChild.style.width = (k * 100).toFixed(0) + '%'; pl.sk[i].classList.toggle('rdy', k >= 1); }
    }
    if (el.flareB) { el.flareU.style.height = (G.flare * 100).toFixed(0) + '%'; el.flareB.classList.toggle('rdy', G.flare >= 1); el.tonics.innerHTML = '\uac15\uc7a5\uc81c<br><span class="num" style="font-size:1.5em;color:#cfe3bf">' + run.tonics + '</span>'; }
    const b = G.bossRef; if (b && b.hp > 0 && b.seen) { el.boss.style.display = 'block'; el.boss.firstElementChild.textContent = b.title; el.boss.querySelector('.b i').style.width = (100 * b.hp / b.maxHp).toFixed(1) + '%'; } else el.boss.style.display = 'none';
    if (LF.audio.started && el.snd.style.display !== 'none') el.snd.style.display = 'none';
  };
  /* ----- toasts ----- */
  const tq = []; let lastToast = '', lastToastT = 0;
  U.toast = function (text, cls) {
    const now = performance.now(); if (text === lastToast && now - lastToastT < 2500) return; lastToast = text; lastToastT = now;
    while (el.toasts.children.length >= 3) el.toasts.removeChild(el.toasts.firstChild);
    const t = h(`<div class="toast ${cls || ''}">${esc(text)}</div>`); el.toasts.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 320); }, 2100);
  };
  /* ----- panels ----- */
  function show(html, closable) { el.veil.innerHTML = ''; const p = h(`<div class="panel">${closable ? '<div class="x">ESC \ub2eb\uae30</div>' : ''}${html}</div>`); el.veil.appendChild(p); el.veil.style.display = 'flex'; U.closable = !!closable; if (closable) p.querySelector('.x').addEventListener('click', U.close); return p; }
  U.close = function () { el.veil.style.display = 'none'; el.veil.innerHTML = ''; stopTimer(); if (G.panel === 'menu' || G.panel === 'away') G.panel = null; U.closable = false; LF.wantPortraits = true; };
  function stopTimer() { if (timer) { cancelAnimationFrame(timer.raf); timer = null; } }
  // countdown bar; the Steward acts when it runs out. Any click or key inside the panel stops it.
  function countdown(panel, secs, fn, label) {
    stopTimer(); const bar = panel.querySelector('.cd i'), txt = panel.querySelector('.cdn');
    if (!P.steward) { if (bar) bar.parentNode.style.visibility = 'hidden'; if (txt) txt.textContent = '\uc9d1\uc0ac\uac00 \uaebc\uc838 \uc788\uc2b5\ub2c8\ub2e4: \ucc9c\ucc9c\ud788 \uace0\ub974\uc138\uc694'; return; }
    const t0 = performance.now(); timer = { raf: 0 };
    const stop = () => { stopTimer(); if (bar) bar.parentNode.style.visibility = 'hidden'; if (txt) txt.textContent = '\uc9c1\uc811 \uc120\ud0dd'; panel.removeEventListener('pointerdown', stopIfIdle, true); };
    const stopIfIdle = (e) => { if (!e.target.closest('.card,.btn')) stop(); };
    panel.addEventListener('pointerdown', stopIfIdle, true);
    const tick = () => { if (!timer) return; const k = (performance.now() - t0) / 1000 / secs; if (bar) bar.style.width = (100 * (1 - k)).toFixed(1) + '%'; if (txt) txt.textContent = label + '\uae4c\uc9c0 ' + Math.max(0, Math.ceil(secs * (1 - k))) + '\ucd08'; if (k >= 1) { timer = null; fn(); return; } timer.raf = requestAnimationFrame(tick); };
    timer.raf = requestAnimationFrame(tick);
  }
  U.openCards = function (offer, rec) {
    const run = G.run;
    const p = show(`<h2>\ub808\ubca8 ${run.level}</h2><div class="sub">\ud558\ub098\ub97c \uace0\ub974\uc138\uc694</div><div class="cards">${offer.map((c, i) => `<div class="card ${i === rec && P.steward ? 'rec' : ''}" data-i="${i}">${c.who === 'party' ? '' : '<canvas width="72" height="72" data-cls="' + c.who + '"></canvas>'}<div class="who">${c.who === 'party' ? '\uc804\uccb4 \ud30c\ud2f0' : CL[c.who].name}</div><div class="nm">${c.name}</div><div class="d">${esc(c.d)}</div><div class="rk">\ub4f1\uae09 ${(run.cards[c.id] || 0) + 1}/3</div></div>`).join('')}</div><div class="cd"><i></i></div><div class="cdn"></div>`);
    const pick = i => { stopTimer(); G.takeCard(offer[i].id); U.toast(offer[i].name, 'good'); el.veil.style.display = 'none'; G.panel = null; if (G.pending.length) G.openPending(); };
    p.querySelectorAll('.card').forEach(c => c.addEventListener('click', () => pick(+c.getAttribute('data-i'))));
    p.querySelectorAll('canvas').forEach(cv => LF.copyPortrait(cv.getAttribute('data-cls'), cv));
    U.keys = { '1': () => pick(0), '2': () => offer[1] && pick(1), '3': () => offer[2] && pick(2) };
    countdown(p, G.DEMO ? 3.5 : 6, () => pick(rec), '\uc9d1\uc0ac \uc120\ud0dd');
  };
  U.openChoice = function (rec) {
    const run = G.run, d = G.danger(true), def = P.steward ? rec : P.push;
    const p = show(`<h2>\ub4f1\ubd88 ${run.stage} \uc7ac\uc810\ud654</h2><div class="sub">${G.stageName(run.stage)} &middot; \uc55e\uae38\uc758 \uc704\ud5d8\ub3c4 <span class="tag ${d}">${({ SAFE: '\uc548\uc804', RISKY: '\uc704\ud5d8', DEADLY: '\uce58\uba85\uc801' })[d] || d}</span></div><div class="big"><div class="btn ${def ? 'rec' : ''}" id="cPush">\uc804\uc9c4<small>\uc2a4\ud14c\uc774\uc9c0 ${run.stage + 1}: \ub354 \uc5b4\ub835\uc9c0\ub9cc \ub354 \ud48d\uc871 &nbsp;[1]</small></div><div class="btn ${def ? '' : 'rec'}" id="cHold">\uba38\ubb34\ub974\uae30<small>\uc774\ubbf8 \uc4f8\uc5b4\uac04 \ub545: \ubcf4\uc0c1 80% &nbsp;[2]</small></div></div><div class="cd"><i></i></div><div class="cdn"></div>`);
    const go = v => { stopTimer(); el.veil.style.display = 'none'; G.choose(v); };
    p.querySelector('#cPush').addEventListener('click', () => go(true)); p.querySelector('#cHold').addEventListener('click', () => go(false));
    U.keys = { '1': () => go(true), '2': () => go(false) };
    countdown(p, 7, () => go(def), def ? '\uc804\uc9c4' : '\uba38\ubb34\ub974\uae30');
  };
  U.openRunEnd = function () {
    const L = G.last, tm = Math.floor(L.time / 60) + '\ubd84 ' + Math.floor(L.time % 60) + '\ucd08';
    const render = () => {
      const p = show(`<h2>\ub79c\ud134\uc774 \uaebc\uc84c\ub2e4</h2><div class="sub">\ud669\ubb34\uc9c0\uac00 \uc5b4\ub460\uc744 \ub418\ucc3e\ub294\ub2e4</div><div class="kv"><span>\ucd5c\uc885 \ub3c4\ub2ec \ub4f1\ubd88</span><span class="num">${L.stage}</span><span>\ub808\ubca8</span><span class="num">${L.level}</span><span>\uae38 \uc704\uc758 \uc2dc\uac04</span><span class="num">${tm}</span><span>\ucc98\uce58\ud55c \uc801</span><span class="num">${L.kills}</span><span>\ubaa8\uc740 \uc7bf\ubd88</span><span class="num">+${L.embers}</span><span>\ucd5c\uace0 \uae30\ub85d</span><span class="num">\ub4f1\ubd88 ${P.best.stage}</span></div><div class="rule"></div><div class="sub">\uc7bf\ubd88 \uc0ac\uc6a9 &middot; \ubcf4\uc720 <span class="num" style="color:#ffb07a">${P.embers}</span></div><div class="rows">${boonRows()}</div><div class="big" style="margin-top:1em"><div class="btn rec" id="again">\ub2e4\uc2dc \ub79c\ud134\uc744 \ucf20\ub2e4</div></div><div class="cd"><i></i></div><div class="cdn"></div>`);
      wireBoons(p, render);
      p.querySelector('#again').addEventListener('click', again);
      return p;
    };
    const again = () => { stopTimer(); el.veil.style.display = 'none'; G.panel = null; LF.restartRun(); };
    const p = render(); U.keys = { 'Enter': again };
    countdown(p, 8, () => { G.stewardBoons(); again(); }, '\uc0c8 \uc5ec\uc815 \uc2dc\uc791');
  };
  function boonRows() { return BOONS.map(b => { const r = G.boon(b.id), max = r >= b.max || (b.unlock && P.unlocked[b.id]), cost = G.boonCost(b.id); return `<div class="row"><div class="g"><div class="t">${b.name}${b.unlock ? '' : ' <span class="num" style="color:#b9a36a;font-size:.8em">' + r + '</span>'}</div><div class="s">${esc(b.d)}</div></div><div class="btn" data-b="${b.id}" ${max || P.embers < cost ? 'disabled' : ''}>${max ? '\uc644\ub8cc' : cost + ' \uc7bf\ubd88'}</div></div>`; }).join(''); }
  function wireBoons(p, rerender) { p.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => { if (b.hasAttribute('disabled')) return; if (G.buyBoon(b.getAttribute('data-b'))) { stopTimer(); G.save(); rerender(); } })); }
  U.openAway = function (a, levels) {
    G.panel = 'away'; const m = Math.floor(a.dt / 60);
    const p = show(`<h2>\uc790\ub9ac\ub97c \ube44\uc6b4 \uc0ac\uc774</h2><div class="sub">\ud30c\ud2f0\uac00 ${m >= 60 ? Math.floor(m / 60) + '\uc2dc\uac04 ' + (m % 60) + '\ubd84' : m + '\ubd84'} \ub3d9\uc548 \uae38\uc744 \uc9c0\ucf30\ub2e4</div><div class="kv"><span>\uc740\ud654</span><span class="num">+${fmt(a.silver)}</span><span>\ub808\ubca8 \uc0c1\uc2b9</span><span class="num">+${levels}</span></div><div class="big"><div class="btn rec" id="ok">\uacc4\uc18d \uac77\uae30</div></div><div class="cd"><i></i></div><div class="cdn"></div>`, true);
    p.querySelector('#ok').addEventListener('click', U.close); countdown(p, 8, U.close, '\uacc4\uc18d \uac77\uae30');
  };
  let tab = 'party';
  U.openMenu = function (t) {
    if (G.panel && G.panel !== 'menu') return; if (!G.run) return; G.panel = 'menu'; tab = t || tab; LF.audio.play('click');
    const run = G.run, tabs = ['party', 'gear', 'camp', 'boons', 'sound'];
    let body = '';
    if (tab === 'party') {
      body = `<div class="sub">\ub124 \uba85\uc774 \uae38\uc744 \uac77\ub294\ub2e4. \ud30c\ud2f0\ub97c \ubc14\uafb8\uba74 \uc2a4\ud14c\uc774\uc9c0\ub97c \ub2e4\uc2dc \uc2dc\uc791\ud55c\ub2e4.</div><div class="rows">` + LF.HERO_ORDER.map(c => { const C = CL[c], inP = U.pick.includes(c), un = P.unlocked[c]; return `<div class="row ${inP ? 'sel' : ''} ${un ? '' : 'lock'}" data-c="${c}" style="cursor:${un ? 'pointer' : 'default'}"><canvas width="72" height="72" data-cls="${c}"></canvas><div class="g"><div class="t">${C.name} <span class="s" style="letter-spacing:.14em">&nbsp;${C.role}</span></div><div class="s">${un ? C.skills.map(s => '<b style="color:#d9c9a0;font-weight:600">' + s.name + '</b> ' + s.d).join(' &middot; ') : '\ub4f1\ubd88 ' + UNLOCK_AT[c] + '\uc5d0\uc11c \ud569\ub958, \ub610\ub294 \uc7bf\ubd88\ub85c \ubd80\ub974\uae30'}</div></div><div class="tag" style="color:${inP ? '#e0b872' : '#5a5448'}">${inP ? '\ud30c\ud2f0 \ucc38\uc5ec' : (un ? '\ud734\uc2dd \uc911' : '\uc7a0\uae40')}</div></div>`; }).join('') + `</div><div class="big" style="margin-top:.9em"><div class="btn ${U.pick.join() !== run.party.join() && U.pick.length === 4 ? 'rec' : ''}" id="applyP" ${U.pick.length === 4 && U.pick.join() !== run.party.join() ? '' : 'disabled'}>${U.pick.length === 4 ? '\uc774 \ud30c\ud2f0\ub85c \ucd9c\ubc1c' : (4 - U.pick.length) + '\uba85 \ub354 \uc120\ud0dd'}</div></div>`;
    } else if (tab === 'gear') {
      body = '<div class="rows">' + G.heroes.map(u => { const g = run.gear[u.cls] || {}; return `<div class="row"><canvas width="72" height="72" data-cls="${u.cls}"></canvas><div class="g"><div class="t">${u.C.name} <span class="s num">&nbsp; \uc0dd\uba85\ub825 ${fmt(u.maxHp)} &middot; \ud53c\ud574 ${u.dmg.toFixed(0)} &middot; \ucd08\ub2f9 ${(1 / u.atk).toFixed(2)}\ud68c</span></div><div class="slots">${['weapon', 'armour', 'trinket'].map(sl => { const it = g[sl]; return `<div class="slot" style="${it ? 'border-color:' + GRADES[it.g].c + '66' : ''}"><b style="color:${it ? GRADES[it.g].c : '#5a5448'}">${it ? esc(it.name) : ({ weapon: '\ubb34\uae30', armour: '\uac11\uc637', trinket: '\uc7a5\uc2e0\uad6c' })[sl] + ': \uc5c6\uc74c'}</b>${it ? GRADES[it.g].n + ' &middot; +' + it.pow + '% ' + (sl === 'weapon' ? '\ud53c\ud574' : sl === 'armour' ? '\uc0dd\uba85\ub825' : '\uc2a4\ud0ac \uc704\ub825') + (it.spT ? '<br><span style="color:#ffb07a">' + it.spT + '</span>' : '') : '\uc544\uc9c1 \ucc3e\uc740 \uac83\uc774 \uc5c6\ub2e4'}</div>`; }).join('')}</div></div></div>`; }).join('') + '</div><div class="sub" style="margin-top:.8em">\ub354 \uc88b\uc740 \uc7a5\ube44\ub294 \uc989\uc2dc \ucc29\uc6a9\ud55c\ub2e4. \ub098\uba38\uc9c0\ub294 \uc740\ud654\ub85c \ubd84\ud574\ud55c\ub2e4.</div>';
      const cards = Object.keys(run.cards); if (cards.length) body += '<div class="rule"></div><div class="sub">\ud68d\ub4dd\ud55c \uce74\ub4dc</div><div class="slots" style="justify-content:center">' + cards.map(id => { const c = CARDS.find(q => q.id === id); return `<div class="slot"><b style="color:#eadcb8">${c.name} ${'I'.repeat(run.cards[id])}</b>${esc(c.d)}</div>`; }).join('') + '</div>';
    } else if (tab === 'camp') {
      body = `<div class="sub">\ubcf4\uc720 \uc740\ud654: <span class="num" style="color:#e8e4dc">${fmt(run.silver)}</span></div><div class="rows">` + CAMP.map(c => { const n = run.camp[c.id], cost = G.campCost(c.id), cur = c.id === 'tonic' ? (2 + Math.floor((n + 1) / 2)) + '\uac1c \ubcf4\uc720' : '+' + n * c.per + '%', nx = c.id === 'tonic' ? (2 + Math.floor((n + 2) / 2)) + '\uac1c \ubcf4\uc720' : '+' + (n + 1) * c.per + '%'; return `<div class="row"><div class="g"><div class="t">${c.name} <span class="num" style="color:#b9a36a;font-size:.8em">${n}</span></div><div class="s">${c.d}: ${cur} &rarr; <b style="color:#d9c9a0">${nx}</b></div></div><div class="btn" data-k="${c.id}" ${run.silver < cost ? 'disabled' : ''}>${fmt(cost)} \uc740\ud654</div></div>`; }).join('') + '</div>';
    } else if (tab === 'boons') {
      body = `<div class="sub">\ub79c\ud134\uc774 \uaebc\uc9c8 \ub54c \uc7bf\ubd88\uc744 \ubaa8\uc740\ub2e4. \ubcf4\uc720 <span class="num" style="color:#ffb07a">${P.embers}</span>. \uc774\ubc88 \uc5ec\uc815 \ubcf4\uc0c1 <span class="num" style="color:#ffb07a">${G.emberGain()}</span>.</div><div class="rows">${boonRows()}</div><div class="big" style="margin-top:1em"><div class="btn" id="giveUp">\ub79c\ud134\uc744 \uaebc\ub728\ub9b0\ub2e4<small>\uc774\ubc88 \uc5ec\uc815\uc744 \uc9c0\uae08 \ub05d\ub0b4\uace0 \uc7bf\ubd88\uc744 \ubc1b\ub294\ub2e4</small></div></div>`;
    } else {
      body = `<div class="rows"><div class="row"><div class="g"><div class="t">\uc74c\uc545</div></div><input type="range" min="0" max="100" value="${Math.round(P.vol.music * 100)}" id="vm"></div><div class="row"><div class="g"><div class="t">\ud6a8\uacfc\uc74c</div></div><input type="range" min="0" max="100" value="${Math.round(P.vol.sfx * 100)}" id="vs"></div><div class="row"><div class="g"><div class="t">\uc74c\uc18c\uac70</div></div><div class="btn ${P.vol.mute ? 'on' : ''}" id="vmute">${P.vol.mute ? '\uc74c\uc18c\uac70\ub428' : '\uc18c\ub9ac \ucf1c\uc9d0'}</div></div><div class="row"><div class="g"><div class="t">\uadf8\ub8f9\ubcc4 \uc74c\uc18c\uac70</div><div>${LF.audio.CATS.map(c => `<label class="chk"><input type="checkbox" data-off="${c}" ${(P.vol.off || {})[c] ? 'checked' : ''}>${({ swords: '\uac80', shields: '\ubc29\ud328', bows: '\ud65c', arrowhits: '\ud654\uc0b4\uacfc \ubb34\uae30 \ud0c0\uaca9', spellcasts: '\uc8fc\ubb38 \uc2dc\uc804', spellhits: '\uc8fc\ubb38 \uc801\uc911', creatures: '\ubaac\uc2a4\ud130', ui: 'UI', footsteps: '\ubc1c\uc18c\ub9ac', music: '\uc74c\uc545', campfire: '\ubaa8\ub2e5\ubd88', wind: '\ubc14\ub78c' })[c] || c}</label>`).join('')}</div><div class="s">\uadf8\ub8f9\uc744 \uccb4\ud06c\ud558\uba74 \uadf8 \uc18c\ub9ac\uac00 \uaebc\uc9c4\ub2e4. F8\uc744 \ub204\ub974\uba74 \uc7ac\uc0dd \uc911\uc778 \ubaa8\ub4e0 \uc18c\ub9ac\uac00 \uc2e4\uc2dc\uac04\uc73c\ub85c \ud45c\uc2dc\ub41c\ub2e4.</div></div></div></div><div class="sub" style="margin-top:1em">SPACE: \ub79c\ud134 \uc12c\uad11 &middot; \uc801 \ud074\ub9ad: \uc9d1\uc911 \uacf5\uaca9 &middot; \ub545 \ud074\ub9ad: \uc774\ub3d9<br>1 2 3: \uc120\ud0dd &middot; M: \uba54\ub274 &middot; C: \ud074\ub85c\uc988\uc5c5 &middot; ESC: \ub2eb\uae30</div>`;
    }
    const p = show(`<h2>${({ party: '\ud30c\ud2f0', gear: '\uc7a5\ube44', camp: '\ucea0\ud504', boons: '\uac00\ud638', sound: '\uc18c\ub9ac' })[tab]}</h2><div class="rule"></div><div class="tabs seg">${tabs.map(t2 => `<div class="btn ${t2 === tab ? 'on' : ''}" data-t="${t2}">${({ party: '\ud30c\ud2f0', gear: '\uc7a5\ube44', camp: '\ucea0\ud504', boons: '\uac00\ud638', sound: '\uc18c\ub9ac' })[t2]}</div>`).join('')}</div>${body}`, true);
    p.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => U.openMenu(b.getAttribute('data-t'))));
    p.querySelectorAll('canvas').forEach(cv => LF.copyPortrait(cv.getAttribute('data-cls'), cv));
    if (tab === 'party') {
      p.querySelectorAll('[data-c]').forEach(r => r.addEventListener('click', () => { const c = r.getAttribute('data-c'); if (!P.unlocked[c]) return; const i = U.pick.indexOf(c); if (i >= 0) U.pick.splice(i, 1); else if (U.pick.length < 4) U.pick.push(c); U.openMenu('party'); }));
      p.querySelector('#applyP').addEventListener('click', e => { if (e.target.closest('.btn').hasAttribute('disabled')) return; const order = LF.HERO_ORDER.filter(c => U.pick.includes(c)); G.run.party = order; P.lastParty = order.slice(); U.close(); LF.reparty(); });
    }
    if (tab === 'camp') p.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { if (!b.hasAttribute('disabled') && G.buyCamp(b.getAttribute('data-k'))) U.openMenu('camp'); }));
    if (tab === 'boons') { wireBoons(p, () => U.openMenu('boons')); p.querySelector('#giveUp').addEventListener('click', () => { U.close(); G.panel = null; G.run.flames = 0; G.endRun(); }); }
    if (tab === 'sound') { p.querySelectorAll('[data-off]').forEach(c => c.addEventListener('change', () => { P.vol.off = P.vol.off || {}; P.vol.off[c.getAttribute('data-off')] = c.checked; G.save(); })); p.querySelector('#vm').addEventListener('input', e => { P.vol.music = e.target.value / 100; LF.audio.setVol(); }); p.querySelector('#vs').addEventListener('input', e => { P.vol.sfx = e.target.value / 100; LF.audio.setVol(); LF.audio.play('click'); }); p.querySelector('#vmute').addEventListener('click', () => { P.vol.mute = !P.vol.mute; LF.audio.setVol(); U.openMenu('sound'); }); }
    U.keys = {};
  };
  U.pick = [];
  U.showTitle = function (hasSave) {
    el.title.style.display = 'flex'; el.bot.style.display = 'none'; el.top.style.display = 'none';
    el.beginB.innerHTML = hasSave ? '\uc774\uc5b4\ud558\uae30<small>\uc2a4\ud14c\uc774\uc9c0 ' + P.run.stage + ' &middot; \ub808\ubca8 ' + P.run.level + '</small>' : '\uc2dc\uc791\ud558\uae30'; el.newB.style.display = hasSave ? 'block' : 'none';
    el.tbest.textContent = P.best.stage ? '\ucd5c\uace0 \uae30\ub85d: \ub4f1\ubd88 ' + P.best.stage + ' \u00b7 \ub808\ubca8 ' + P.best.level + ' \u00b7 \uc7bf\ubd88 ' + P.embers : '\uc18c\ub9ac\ub97c \ucf1c\ub824\uba74 \ud074\ub9ad';
    const t0 = performance.now(), secs = 7; const tick = () => { if (el.title.style.display === 'none') return; const k = (performance.now() - t0) / 1000; el.tcd.textContent = '\uae38\uc774 \uc800\uc808\ub85c \uc2dc\uc791\ub418\uae30\uae4c\uc9c0 ' + Math.max(0, Math.ceil(secs - k)) + '\ucd08'; if (k >= secs) { LF.begin(false); return; } requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  };
  U.hideTitle = function () { el.title.style.display = 'none'; };
  let sdT = null;
  U.soundDebug = function (on) {
    const d = document.getElementById('sdbg'); const show = on === undefined ? d.style.display !== 'block' : on; d.style.display = show ? 'block' : 'none'; if (sdT) { clearInterval(sdT); sdT = null; } if (!show) return;
    sdT = setInterval(() => {
      const A = LF.audio; if (!A.started) { d.textContent = 'SOUND DEBUG (F8)   build __BUILD__\n\ud55c \ubc88 \ud074\ub9ad\ud558\uba74 \uc18c\ub9ac\uac00 \ucf1c\uc9c4\ub2e4'; return; }
      const L = A.live(), f = (x, n) => String(x).padEnd(n), tr = (n, c) => n + ': ' + (c ? 'track ' + c.track + '  ' + (c.playing ? 'PLAYING' : 'silent ') + '  gain ' + c.gain : 'none');
      let s = 'SOUND DEBUG (F8)   build __BUILD__   t=' + L.t + '  audio ' + L.ctx + '\n';
      s += 'graph changes in the last second:  sources started/stopped ' + L.nodesPerS + '   gain/pan writes ' + L.paramsPerS + '   voices now ' + L.voices + '\n';
      s += tr('music A', L.musicA) + '\n' + tr('music B', L.musicB) + '\n';
      s += 'music bus gain ' + L.musicBus + '   ducked ' + (L.duck ? 'YES' : 'no') + '\ncampfire gain ' + L.campfire + (L.campfire > 0.001 ? '  PLAYING' : '  silent') + '\nwind gain ' + L.wind + '   master ' + L.master + '\n';
      s += '\n' + f('time', 8) + f('event', 14) + f('group', 12) + f('file', 20) + f('pitch', 7) + f('dB', 6) + 'source\n';
      for (const r of A.recent.slice(-16)) s += f(r.t.toFixed(2), 8) + f(r.ev, 14) + f(r.cat || '', 12) + f(r.file, 20) + f('x' + r.rate, 7) + f(r.db, 6) + r.who + '\n';
      d.textContent = s;
    }, 120);
  };
  U.dim = v => { el.dim.style.opacity = v; };
  U.fall = v => { const f = document.getElementById('fall'); if (f) f.style.opacity = v; };
  U.key = function (k) { if (U.keys && U.keys[k] && el.veil.style.display === 'flex') { U.keys[k](); return true; } return false; };
  U.isOpen = () => el.veil.style.display === 'flex';
  return U;
})();
