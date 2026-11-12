/* LANTERNFALL - wardrobe, part two: helms, hats, bows, packs, staves */
(function () {
  const H = HW;
  H.skullcap = function (g, o) {
    o = o || {}; g.bone('head'); g.mat(o.col || COL.iron, 0.5, 1, T_PLATE, 0.8);
    g.loft([{ y: 1.7, rx: 0.088, rz: 0.108, rb: 0.108 }, { y: 1.75, rx: 0.086, rz: 0.104, rb: 0.106 }, { y: 1.795, rx: 0.066, rz: 0.08, rb: 0.084 }, { y: 1.822, rx: 0.02, rz: 0.03, rb: 0.03 }, { y: 1.826, rx: 0.002, rz: 0.003, rb: 0.003 }], { seg: 16, sub: 3, thick: 0.004 });
    g.loft([{ y: 1.698, rx: 0.091, rz: 0.111, rb: 0.111 }, { y: 1.716, rx: 0.091, rz: 0.111, rb: 0.111 }], { seg: 16, sub: 1, thick: 0.004 });
    g.loft([{ y: 1.63, rx: 0.011, rz: 0.006, z: 0.118 }, { y: 1.705, rx: 0.014, rz: 0.006, z: 0.108 }], { seg: 6, sub: 1, cap0: true });
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + PI / 4; g.tube([[Math.cos(a) * 0.088, 1.71, Math.sin(a) * 0.107], [Math.cos(a) * 0.07, 1.785, Math.sin(a) * 0.086], [0, 1.828, 0]], 0.006, { seg: 4, sub: 2 }); }
  };
  // wide weatherbeaten hat
  H.hat = function (g, o) {
    o = o || {}; g.bone('head'); g.mat(o.col || COL.waxed, 0.8, 0, T_LEATHER, 0.5);
    g.tr(0, 1.735, 0, -0.1, 0, 0.04);
    g.surf(26, 12, (u, v) => {
      const a = u * TAU, c = Math.cos(a), s = Math.sin(a);
      if (v < 0.45) { const t = v / 0.45, r = lerp(0.3, 0.1, t), droop = (1 - t) * (0.05 + 0.035 * Math.sin(a * 2 + 1) + 0.02 * Math.sin(a * 5)); return [c * r * (1 + 0.05 * Math.sin(a * 3)), -droop + t * 0.01, s * r * 1.08]; }
      const t = (v - 0.45) / 0.55, r = lerp(0.1, 0.05, Math.pow(t, 1.6)), y = 0.01 + 0.13 * Math.sin(t * PI / 2); return [c * r + 0.012 * t * Math.sin(a * 2), y - 0.012 * t * Math.cos(a), s * r * 1.12 - 0.02 * t];
    }, { closeU: true, thick: 0.006 });
    g.mat(COL.leatherDk, 0.7, 0, T_LEATHER, 0.3); g.lathe([[0.103, 0.012], [0.106, 0.03], [0.1, 0.045]], 14);
    g.pop();
  };
  // cloth wrap over the lower face
  H.veil = function (g, o) {
    o = o || {}; g.bone('head'); g.mat(o.col || COL.woolGrey, 0.95, 0, T_CLOTH, 0.5);
    g.loft([{ y: 1.535, rx: 0.062, rz: 0.075, rb: 0.07 }, { y: 1.58, rx: 0.068, rz: 0.098, rb: 0.078 }, { y: 1.63, rx: 0.08, rz: 0.108, rb: 0.092 }, { y: o.top || 1.676, rx: 0.083, rz: 0.108, rb: 0.1 }], { seg: 14, sub: 3, thick: 0.006, wr: 0.07, wra: 3, wry: 60 });
  };
  H.furMantle = function (g, P, o) {
    o = o || {}; g.mat(o.col || COL.fur, 1, 0, T_FUR, 0.8); g.bone(chainY([['neck', 9], ['chest', 1.53]], 0.04));
    g.surf(24, 6, (u, v) => {
      const a = u * TAU, c = Math.cos(a), s = Math.sin(a), f = Math.pow(v, 0.8), back = Math.max(0, -s);
      const y = lerp(1.55, 1.36 - (o.back || 0.14) * back, f) + 0.012 * Math.sin(a * 13) * f, rx = lerp(0.09, P.sh + 0.1, Math.pow(f, 0.6)), rz = lerp(0.09, 0.16 + 0.03 * back, Math.pow(f, 0.6));
      const puff = 1 + 0.07 * Math.sin(v * PI) + 0.045 * vnoise2(a * 5, v * 4);
      return [c * rx * puff, y, s * rz * puff - 0.01];
    }, { closeU: true, thick: 0.02 });
  };
  // arrow from (x,y,z) pointing along -Y
  H.arrow = function (g, x, y, z, len) {
    g.mat(COL.wood, 0.7, 0, T_WOOD, 0); g.tube([[x, y, z], [x, y - len, z]], 0.0042, { seg: 4, sub: 1 });
    g.mat(COL.iron, 0.4, 1, T_PLATE, 0); g.tr(x, y - len, z, PI, 0, 0); g.lathe([[0.008, 0], [0.006, 0.02], [0, 0.05]], 4); g.pop();
    g.mat(COL.bone, 0.9, 0, T_CLOTH, 0);
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; g.surf(2, 1, (u, v) => { const w = 0.004 + v * 0.016 * Math.sin(u * PI * 0.8 + 0.3); return [x + Math.cos(a) * w, y - 0.02 - u * 0.09, z + Math.sin(a) * w]; }); }
  };
  // bow in the left hand (bind: stave along Z, string toward +Y)
  H.bow = function (g, P, o) {
    o = o || {}; const x = P.sh + 0.03, y = 0.835, L = o.len || 0.92, br = 0.16;
    g.bone('wL'); g.mat(COL.wood, 0.6, 0, T_WOOD, 0.3);
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12 * 2 - 1; pts.push([x, y + br * t * t * (0.8 + 0.2 * Math.abs(t)), t * L]); }
    g.tube(pts, t => 0.0085 + 0.0095 * Math.sin(t * PI), { seg: 6, sub: 2 });
    g.mat(COL.leatherDk, 0.7, 0, T_LEATHER, 0.2); g.tube([[x, y, -0.06], [x, y, 0.06]], 0.018, { seg: 7, sub: 1 });
    g.mat(COL.bone, 0.8, 0, T_CLOTH, 0);
    for (const sg of [-1, 1]) { g.bone((px, py, pz) => ['str', 'wL', Math.abs(pz) / L]); g.tube([[x, y + br, 0], [x, y + br, sg * L * 0.5], [x, y + br, sg * L]], 0.0028, { seg: 3, sub: 1, cap: false }); }
    g.bone('arw'); H.arrow(g, x, y + br, 0, 0.78);
    return { nock: [x, y + br, 0] };
  };
  H.quiver = function (g, o) {
    o = o || {}; g.bone('chest');
    g.tr(-0.1, 1.2, -0.17, 0.12, 0, 0.42);
    g.mat(COL.leather, 0.7, 0, T_LEATHER, 0.6); g.lathe([[0.03, -0.3], [0.045, -0.28], [0.052, 0.0], [0.058, 0.3], [0.05, 0.3]], 9, { cap0: true });
    g.mat(COL.leatherDk, 0.7, 0, T_LEATHER, 0.3); g.lathe([[0.06, 0.26], [0.062, 0.28], [0.06, 0.3]], 9); g.lathe([[0.05, -0.2], [0.052, -0.18], [0.05, -0.16]], 9);
    const r = mulberry(5); for (let i = 0; i < 9; i++) { const a = r() * TAU, d = r() * 0.034; g.tr(Math.cos(a) * d, 0.3 + 0.12 + r() * 0.05, Math.sin(a) * d, (r() - 0.5) * 0.12, r() * 3, (r() - 0.5) * 0.12); H.arrow(g, 0, 0.0, 0, 0.3); g.pop(); }
    g.pop();
  };
  H.satchel = function (g, x, y, z, ry, s, col) {
    g.bone(H.skirtW(1.04)); g.tr(x, y, z, 0, ry, 0, s || 1);
    g.mat(col || COL.leatherTan, 0.75, 0, T_LEATHER, 0.8);
    g.loft([{ y: -0.2, rx: 0.1, rz: 0.035, sq: 3.5 }, { y: -0.12, rx: 0.115, rz: 0.05, sq: 3.5 }, { y: 0, rx: 0.11, rz: 0.04, sq: 3.5 }], { seg: 10, sub: 2, cap0: true, cap1: true, wr: 0.08, wra: 2, wry: 20 });
    g.surf(6, 4, (u, v) => [(u - 0.5) * 0.23, 0.006 - v * 0.13, 0.046 + Math.sin(v * 2.4) * 0.016], { thick: 0.006 });
    g.mat(COL.brass, 0.5, 0.9, T_PLATE, 0.3); g.tr(0, -0.11, 0.066); g.sphere(0.012, 0.012, 0.006, 6, 4); g.pop();
    g.pop();
  };
  H.flask = function (g, x, y, z, s, col, glow, bone, rx, rz) {
    g.bone(bone || 'chest'); g.tr(x, y, z, rx || 0, 0, rz || 0, s || 1);
    if (glow) g.mat(col, 0.3, 0, T_GLOW, glow); else g.mat(col, 0.35, 0, T_STONE, 0);
    g.lathe([[0.0, -0.045], [0.02, -0.043], [0.026, -0.02], [0.024, 0.01], [0.01, 0.028], [0.009, 0.045]], 8, { cap0: true });
    g.mat(COL.wood, 0.8, 0, T_WOOD, 0); g.lathe([[0.011, 0.043], [0.012, 0.058], [0.0, 0.06]], 6);
    g.pop();
  };
  H.pack = function (g, o) {
    o = o || {}; g.bone('back');
    g.mat(COL.leatherTan, 0.8, 0, T_LEATHER, 1); g.tr(0, 1.08, -0.2);
    g.loft([{ y: 0, rx: 0.15, rz: 0.07, rb: 0.1, sq: 3.2 }, { y: 0.16, rx: 0.17, rz: 0.07, rb: 0.13, sq: 3.2 }, { y: 0.36, rx: 0.15, rz: 0.07, rb: 0.11, sq: 3.2 }, { y: 0.42, rx: 0.1, rz: 0.06, rb: 0.07, sq: 3 }], { seg: 12, sub: 3, cap0: true, cap1: true, wr: 0.09, wra: 2, wry: 14 });
    g.mat(COL.woolGrey, 0.95, 0, T_CLOTH, 0.8); g.tr(0, 0.47, -0.02, 0, 0, PI / 2); g.lathe([[0.0, -0.19], [0.055, -0.185], [0.06, 0], [0.055, 0.185], [0.0, 0.19]], 10); g.pop();
    g.mat(COL.leatherDk, 0.7, 0, T_LEATHER, 0.4); for (const sx of [-0.1, 0.1]) g.tube([[sx, 0.4, -0.1], [sx, 0.53, -0.02], [sx, 0.42, 0.06]], 0.008, { seg: 4, sub: 3, cap: false });
    g.mat(COL.iron, 0.5, 0.9, T_PLATE, 0.6); g.tr(0.17, 0.12, -0.03, 0, 0, 0.2); g.lathe([[0.0, -0.06], [0.05, -0.055], [0.058, 0.03], [0.05, 0.034]], 8); g.pop();
    g.pop();
    g.bone('chest'); g.mat(COL.leatherDk, 0.7, 0, T_LEATHER, 0.4);
    for (const sx of [-1, 1]) g.tube([[sx * 0.1, 1.42, -0.14], [sx * 0.12, 1.5, -0.02], [sx * 0.13, 1.44, 0.11], [sx * 0.15, 1.24, 0.125], [sx * 0.16, 1.15, 0.0], [sx * 0.12, 1.14, -0.13]], 0.014, { seg: 5, sub: 3, cap: false, flatten: 0.4 });
  };
  // staff / pole in a hand, along Z (bind). head: 'crook' | 'shard' | none. returns the head point
  H.staff = function (g, P, side, o) {
    o = o || {}; const x = side * (P.sh + 0.03), y = 0.835, B = side > 0 ? 'wL' : 'wR', z0 = o.z0 || -1.1, z1 = o.z1 || 1.4;
    g.bone(B); g.mat(o.col || COL.wood, 0.8, 0, T_WOOD, 0.4);
    g.tube([[x, y, z0], [x + 0.008, y, z0 * 0.4], [x - 0.006, y + 0.004, z1 * 0.5], [x, y, z1]], t => 0.017 - 0.004 * t, { seg: 7, sub: 3 });
    g.mat(COL.iron, 0.55, 0.9, T_PLATE, 0.6); g.tube([[x, y, z0], [x, y, z0 + 0.08]], 0.02, { seg: 6, sub: 1 });
    if (o.head === 'crook') {
      g.tube([[x, y, z1 - 0.08], [x, y, z1 + 0.06], [x, y - 0.07, z1 + 0.12], [x, y - 0.16, z1 + 0.06], [x, y - 0.17, z1 - 0.02]], 0.009, { seg: 5, sub: 4 });
      g.tube([[x, y, z1 - 0.1], [x, y, z1 - 0.04]], 0.021, { seg: 6, sub: 1 });
      return [x, y - 0.17, z1 - 0.02];
    }
    if (o.head === 'shard') {
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; g.tube([[x, y, z1 - 0.06], [x + Math.cos(a) * 0.035, y + Math.sin(a) * 0.035, z1 + 0.02], [x + Math.cos(a) * 0.03, y + Math.sin(a) * 0.03, z1 + 0.1]], 0.006, { seg: 4, sub: 3 }); }
      g.mat(C(0xa8d8ff), 0.2, 0, T_GLOW, 0.8);
      g.tr(x, y, z1 + 0.02, PI / 2, 0, 0); g.loft([{ y: 0, rx: 0.012, rz: 0.012 }, { y: 0.06, rx: 0.034, rz: 0.028 }, { y: 0.15, rx: 0.026, rz: 0.03 }, { y: 0.26, rx: 0.002, rz: 0.002 }], { seg: 5, sub: 1, flat: true }); g.pop();
      g.tr(x + 0.02, y - 0.012, z1 + 0.03, PI / 2 + 0.25, 0, 0.3); g.loft([{ y: 0, rx: 0.008, rz: 0.008 }, { y: 0.04, rx: 0.016, rz: 0.014 }, { y: 0.13, rx: 0.001, rz: 0.001 }], { seg: 4, sub: 1, flat: true }); g.pop();
      return [x, y, z1 + 0.14];
    }
    return [x, y, z1];
  };
  // long sleeve that flares at the wrist
  H.bellSleeve = function (g, P, side, o) {
    o = o || {}; const U = side > 0 ? 'lUp' : 'rUp', F = side > 0 ? 'lFore' : 'rFore', x = side * P.sh;
    g.bone(jb(U, F, 1.14, 0.05));
    g.loft([{ y: 0.9, rx: 0.075, rz: 0.085, rb: 0.075, x: x + side * 0.03 }, { y: 0.96, rx: 0.068, x: x + side * 0.027 }, { y: 1.07, rx: 0.062, x: x + side * 0.023 }, { y: 1.14, rx: 0.062, x: x + side * 0.02 }, { y: 1.3, rx: 0.068, x: x + side * 0.01 }, { y: 1.43, rx: 0.076, x: x + side * 0.004 }, { y: 1.48, rx: 0.062, x }, { y: 1.505, rx: 0.03, x: x - side * 0.015 }], { seg: 12, sub: 3, thick: 0.006, cap1: true, wr: 0.07, wra: 2, wry: 40 });
  };
})();
