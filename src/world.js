/* =====================================================================
 * world.js — Bản đồ thế giới
 * 5 vùng ngũ hành xếp theo vòng tương sinh quanh Ngũ Hành Trấn.
 * Mặt đất vẽ theo "chunk" 512px và lưu cache; cây, đá, nhà là sprite
 * vẽ sẵn 1 lần ở độ phân giải gấp đôi nên vừa nét vừa nhanh.
 * ===================================================================== */
(function (G) {
  'use strict';
  const W = G.WORLD, TAU = G.TAU, E = G.ELEMENTS;

  /* ---------- Bố cục vùng: Thủy ở Bắc, đi theo chiều kim đồng hồ là vòng tương sinh ---------- */
  const ZONE_DIST = 1360, ZONE_R = 720;
  const ANG = { thuy: -90, moc: -18, hoa: 54, tho: 126, kim: 198 };
  const ZNAME = { thuy: 'Hàn Băng Nguyên', moc: 'Thanh Lâm Cốc', hoa: 'Xích Diễm Địa', tho: 'Hoàng Thổ Lĩnh', kim: 'Thu Kim Sơn' };
  G.ZONE_DIST = ZONE_DIST;
  G.ZONES = Object.keys(ANG).map((el) => {
    const a = (ANG[el] * Math.PI) / 180;
    return { el, a, x: W.cx + Math.cos(a) * ZONE_DIST, y: W.cy + Math.sin(a) * ZONE_DIST, r: ZONE_R, name: ZNAME[el] };
  });

  const GROUND = { meadow: '#3d5b36', village: '#5f6a45', kim: '#8a8370', moc: '#2c5a2e', thuy: '#cfdbe6', hoa: '#4a2721', tho: '#9c7542' };
  G.BIOME_NAME = { meadow: 'Thảo nguyên', village: W.name, kim: ZNAME.kim, moc: ZNAME.moc, thuy: ZNAME.thuy, hoa: ZNAME.hoa, tho: ZNAME.tho };

  G.biomeAt = function (x, y) {
    if (Math.hypot(x - W.cx, y - W.cy) < W.villageR) return 'village';
    for (const z of G.ZONES) if (Math.hypot(x - z.x, y - z.y) < z.r * 0.82) return z.el;
    return 'meadow';
  };
  G.inVillage = (e) => e && Math.hypot(e.x - W.cx, e.y - W.cy) < W.villageR - 20;

  /* ---------- Đường đất từ trấn tới từng vùng (đường cong bậc 2) ---------- */
  G.ROADS = G.ZONES.map((z, i) => {
    const mx = (W.cx + z.x) / 2, my = (W.cy + z.y) / 2;
    const nx = -(z.y - W.cy), ny = z.x - W.cx, L = Math.hypot(nx, ny);
    const bend = (i % 2 ? 1 : -1) * 150;
    return { x0: W.cx, y0: W.cy, cx: mx + (nx / L) * bend, cy: my + (ny / L) * bend, x1: z.x, y1: z.y };
  });
  const ROAD_PTS = [];
  for (const r of G.ROADS) {
    for (let i = 0; i <= 48; i++) {
      const t = i / 48, u = 1 - t;
      ROAD_PTS.push(u * u * r.x0 + 2 * u * t * r.cx + t * t * r.x1, u * u * r.y0 + 2 * u * t * r.cy + t * t * r.y1);
    }
  }
  function nearRoad(x, y, d) {
    const d2 = d * d;
    for (let i = 0; i < ROAD_PTS.length; i += 2) {
      const dx = ROAD_PTS[i] - x, dy = ROAD_PTS[i + 1] - y;
      if (dx * dx + dy * dy < d2) return true;
    }
    return false;
  }

  /* ---------- Hồ nước / hồ băng / hồ dung nham ---------- */
  G.POOLS = [];
  function makePool(x, y, rx, ry, kind, rnd) {
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, k = 0.82 + rnd() * 0.22;
      pts.push(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k);
    }
    G.POOLS.push({ x, y, rx, ry, kind, pts });
  }

  /* ---------- Bản đồ màu nền độ phân giải thấp (1px = 16px thế giới) ---------- */
  function buildBiomeMap() {
    const S = 16, c = G.makeCanvas(W.w / S, W.h / S), g = c.getContext('2d');
    g.fillStyle = GROUND.meadow;
    g.fillRect(0, 0, c.width, c.height);
    const r = G.mulberry32(7);
    for (let i = 0; i < 160; i++) {
      g.fillStyle = G.rgba(r() < 0.5 ? '#2c4528' : '#56723f', 0.35);
      g.beginPath();
      g.ellipse(r() * c.width, r() * c.height, 4 + r() * 12, 3 + r() * 9, r() * 3, 0, TAU);
      g.fill();
    }
    for (const z of G.ZONES) {
      const gr = g.createRadialGradient(z.x / S, z.y / S, 0, z.x / S, z.y / S, (z.r / S) * 1.12);
      gr.addColorStop(0, GROUND[z.el]);
      gr.addColorStop(0.68, GROUND[z.el]);
      gr.addColorStop(1, G.rgba(GROUND[z.el], 0));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(z.x / S, z.y / S, (z.r / S) * 1.12, 0, TAU);
      g.fill();
    }
    const vg = g.createRadialGradient(W.cx / S, W.cy / S, 0, W.cx / S, W.cy / S, W.villageR / S);
    vg.addColorStop(0, GROUND.village);
    vg.addColorStop(0.75, GROUND.village);
    vg.addColorStop(1, G.rgba(GROUND.village, 0));
    g.fillStyle = vg;
    g.beginPath();
    g.arc(W.cx / S, W.cy / S, W.villageR / S, 0, TAU);
    g.fill();
    return c;
  }

  /* ---------- Vẽ chi tiết mặt đất theo vùng ---------- */
  function detail(g, b, x, y, r) {
    switch (b) {
      case 'meadow':
      case 'village':
      case 'moc': {
        const dark = b === 'moc' ? '#1d3f20' : '#2b4626', light = b === 'moc' ? '#3f7a3a' : b === 'village' ? '#7a8a55' : '#5f8a45';
        g.strokeStyle = r() < 0.5 ? dark : light;
        g.lineWidth = 1.4;
        g.beginPath();
        for (let k = -1; k <= 1; k++) {
          g.moveTo(x + k * 2.5, y);
          g.lineTo(x + k * 4 + (r() - 0.5) * 3, y - 4 - r() * 6);
        }
        g.stroke();
        if (b === 'meadow' && r() < 0.06) {
          g.fillStyle = ['#f3e7a2', '#f2b6c8', '#ffffff', '#c7b6f2'][(r() * 4) | 0];
          g.beginPath();
          g.arc(x + 3, y - 3, 1.8, 0, TAU);
          g.fill();
        }
        if (b === 'moc' && r() < 0.05) {
          g.fillStyle = '#c8452c';
          g.beginPath();
          g.ellipse(x, y - 3, 3.2, 2, 0, Math.PI, 0);
          g.fill();
          g.fillStyle = '#efe6d2';
          g.fillRect(x - 0.8, y - 3, 1.6, 3);
        }
        break;
      }
      case 'thuy':
        if (r() < 0.6) {
          g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.8)' : 'rgba(150,180,210,0.35)';
          g.fillRect(x, y, 1.6, 1.6);
        } else {
          g.fillStyle = 'rgba(120,150,185,0.22)';
          g.beginPath();
          g.ellipse(x, y, 6 + r() * 10, 2 + r() * 3, 0, 0, TAU);
          g.fill();
        }
        break;
      case 'hoa':
        if (r() < 0.07) {
          g.strokeStyle = 'rgba(255,110,40,0.7)';
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(x, y);
          let cx = x, cy = y;
          for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 22; cy += (r() - 0.3) * 12; g.lineTo(cx, cy); }
          g.stroke();
          g.strokeStyle = 'rgba(255,160,60,0.15)';
          g.lineWidth = 6;
          g.stroke();
        } else {
          g.fillStyle = r() < 0.5 ? 'rgba(20,10,8,0.35)' : 'rgba(120,70,50,0.3)';
          g.beginPath();
          g.ellipse(x, y, 2 + r() * 5, 1.5 + r() * 3, 0, 0, TAU);
          g.fill();
        }
        break;
      case 'tho':
        if (r() < 0.5) {
          g.fillStyle = r() < 0.5 ? '#7a5a2e' : '#c4a06a';
          g.beginPath();
          g.ellipse(x, y, 2 + r() * 3, 1.5 + r() * 2, 0, 0, TAU);
          g.fill();
        } else {
          g.strokeStyle = 'rgba(90,60,30,0.25)';
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(x, y + 14, 16, -2.3, -0.8);
          g.stroke();
        }
        break;
      case 'kim':
        if (r() < 0.55) {
          g.fillStyle = ['#e0b440', '#c98a2a', '#f3d46a', '#b8692a'][(r() * 4) | 0];
          g.save();
          g.translate(x, y);
          g.rotate(r() * TAU);
          g.beginPath();
          g.ellipse(0, 0, 3.2, 1.8, 0, 0, TAU);
          g.fill();
          g.restore();
        } else {
          g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(40,40,40,0.18)';
          g.fillRect(x, y, 2, 2);
        }
        break;
    }
  }

  function tracePool(g, p) {
    const pts = p.pts, n = pts.length / 2;
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = i % n, b = (i + 1) % n;
      const mx = (pts[a * 2] + pts[b * 2]) / 2, my = (pts[a * 2 + 1] + pts[b * 2 + 1]) / 2;
      if (i === 0) g.moveTo(mx, my);
      else g.quadraticCurveTo(pts[a * 2], pts[a * 2 + 1], mx, my);
    }
    g.closePath();
  }

  function drawPool(g, p) {
    tracePool(g, p);
    const R = Math.max(p.rx, p.ry);
    if (p.kind === 'lava') {
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = 'rgba(255,110,30,0.25)';
      g.lineWidth = 26;
      g.stroke();
      g.restore();
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
      gr.addColorStop(0, '#ffd06a'); gr.addColorStop(0.4, '#ff7a2a'); gr.addColorStop(1, '#9a2008');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = '#1e100c';
      g.lineWidth = 5;
      g.stroke();
      const r = G.mulberry32((p.x * 7) | 0);
      g.fillStyle = 'rgba(40,16,10,0.75)';
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.ellipse(p.x + (r() - 0.5) * p.rx * 1.2, p.y + (r() - 0.5) * p.ry * 1.2, 6 + r() * 12, 4 + r() * 6, r() * 3, 0, TAU);
        g.fill();
      }
    } else if (p.kind === 'ice') {
      const gr = g.createRadialGradient(p.x - R * 0.3, p.y - R * 0.3, 0, p.x, p.y, R);
      gr.addColorStop(0, '#f2fbff'); gr.addColorStop(1, '#8fb8d8');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 3;
      g.stroke();
      const r = G.mulberry32((p.y * 3) | 0);
      g.strokeStyle = 'rgba(255,255,255,0.65)';
      g.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        let x = p.x + (r() - 0.5) * p.rx, y = p.y + (r() - 0.5) * p.ry;
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 20; g.lineTo(x, y); }
        g.stroke();
      }
    } else {
      g.strokeStyle = 'rgba(40,36,24,0.55)';
      g.lineWidth = 10;
      g.stroke();
      const gr = g.createRadialGradient(p.x, p.y - R * 0.2, 0, p.x, p.y, R);
      gr.addColorStop(0, '#3f7f9e'); gr.addColorStop(1, '#1d4258');
      g.fillStyle = gr;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(p.x - p.rx * 0.2, p.y - p.ry * 0.25, p.rx * 0.45, p.ry * 0.18, 0, 3.6, 5.6);
      g.stroke();
      const r = G.mulberry32((p.x * 11) | 0);
      for (let i = 0; i < 7; i++) {
        const lx = p.x + (r() - 0.5) * p.rx * 1.2, ly = p.y + (r() - 0.5) * p.ry * 1.1;
        g.fillStyle = r() < 0.5 ? '#3f8a3a' : '#5aa84a';
        g.beginPath();
        g.arc(lx, ly, 6 + r() * 4, 0.4, TAU - 0.1);
        g.lineTo(lx, ly);
        g.fill();
        if (r() < 0.4) {
          g.fillStyle = '#f6c6d6';
          g.beginPath();
          g.arc(lx + 2, ly - 2, 2.5, 0, TAU);
          g.fill();
        }
      }
    }
  }

  /* ---------- Chunk mặt đất: vẽ 1 lần, cache theo LRU ---------- */
  const CH = 512, chunkCache = new Map(), MAX_CHUNKS = 40;
  function buildChunk(ix, iy) {
    const c = G.makeCanvas(CH, CH), g = c.getContext('2d');
    const ox = ix * CH, oy = iy * CH, S = 16;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(G.biomeMap, ox / S - 1, oy / S - 1, CH / S + 2, CH / S + 2, -S, -S, CH + S * 2, CH + S * 2);

    const r = G.mulberry32((ix * 73856093) ^ (iy * 19349663));
    // mảng sáng tối tự nhiên
    for (let i = 0; i < 8; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.04)';
      g.beginPath();
      g.ellipse(r() * CH, r() * CH, 40 + r() * 90, 25 + r() * 60, r() * 3, 0, TAU);
      g.fill();
    }
    for (let i = 0; i < 300; i++) {
      const x = r() * CH, y = r() * CH;
      detail(g, G.biomeAt(ox + x, oy + y), x, y, r);
    }

    g.save();
    g.translate(-ox, -oy);
    // quảng trường đá
    if (Math.abs(W.cx - (ox + CH / 2)) < CH / 2 + W.plazaR && Math.abs(W.cy - (oy + CH / 2)) < CH / 2 + W.plazaR) {
      g.fillStyle = '#857c64';
      g.beginPath();
      g.arc(W.cx, W.cy, W.plazaR, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(30,24,16,0.18)';
      g.lineWidth = 1.5;
      for (let rr = 40; rr < W.plazaR; rr += 30) {
        g.beginPath();
        g.arc(W.cx, W.cy, rr, 0, TAU);
        g.stroke();
      }
      for (let a = 0; a < 48; a++) {
        const an = (a / 48) * TAU;
        g.beginPath();
        g.moveTo(W.cx + Math.cos(an) * 40, W.cy + Math.sin(an) * 40);
        g.lineTo(W.cx + Math.cos(an) * W.plazaR, W.cy + Math.sin(an) * W.plazaR);
        g.stroke();
      }
      g.strokeStyle = '#4e4636';
      g.lineWidth = 7;
      g.beginPath();
      g.arc(W.cx, W.cy, W.plazaR, 0, TAU);
      g.stroke();
    }
    // đường
    for (const rd of G.ROADS) {
      const minx = Math.min(rd.x0, rd.cx, rd.x1) - 40, maxx = Math.max(rd.x0, rd.cx, rd.x1) + 40;
      const miny = Math.min(rd.y0, rd.cy, rd.y1) - 40, maxy = Math.max(rd.y0, rd.cy, rd.y1) + 40;
      if (maxx < ox || minx > ox + CH || maxy < oy || miny > oy + CH) continue;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(rd.x0, rd.y0);
      g.quadraticCurveTo(rd.cx, rd.cy, rd.x1, rd.y1);
      g.strokeStyle = 'rgba(52,40,26,0.45)';
      g.lineWidth = 58;
      g.stroke();
      g.strokeStyle = '#88744e';
      g.lineWidth = 42;
      g.stroke();
      g.setLineDash([3, 17]);
      g.strokeStyle = 'rgba(255,240,210,0.16)';
      g.lineWidth = 4;
      g.stroke();
      g.setLineDash([]);
    }
    // hồ
    for (const p of G.POOLS) {
      const R = Math.max(p.rx, p.ry) + 30;
      if (p.x + R < ox || p.x - R > ox + CH || p.y + R < oy || p.y - R > oy + CH) continue;
      drawPool(g, p);
    }
    g.restore();
    return c;
  }

  G.drawGroundChunks = function (ctx, view) {
    const ix0 = Math.max(0, Math.floor(view.x / CH)), iy0 = Math.max(0, Math.floor(view.y / CH));
    const ix1 = Math.min(W.w / CH - 1, Math.floor((view.x + view.w) / CH));
    const iy1 = Math.min(W.h / CH - 1, Math.floor((view.y + view.h) / CH));
    for (let iy = iy0; iy <= iy1; iy++) {
      for (let ix = ix0; ix <= ix1; ix++) {
        const key = ix + ',' + iy;
        let c = chunkCache.get(key);
        if (c) {
          chunkCache.delete(key);
          chunkCache.set(key, c);
        } else {
          c = buildChunk(ix, iy);
          chunkCache.set(key, c);
          if (chunkCache.size > MAX_CHUNKS) chunkCache.delete(chunkCache.keys().next().value);
        }
        ctx.drawImage(c, ix * CH, iy * CH, CH + 0.5, CH + 0.5);
      }
    }
  };

  /* =================== SPRITE VẬT TRANG TRÍ =================== */
  const SS = 2; // vẽ gấp đôi độ phân giải cho nét trên màn hình Retina
  function spr(w, h, ax, ay, draw) {
    const c = G.makeCanvas(w * SS, h * SS), g = c.getContext('2d');
    g.scale(SS, SS);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    draw(g);
    return { c, w, h, ax, ay };
  }
  function shadow(g, x, y, rx, ry, a) {
    g.fillStyle = 'rgba(0,0,0,' + (a || 0.28) + ')';
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, TAU);
    g.fill();
  }
  const PAL = {
    green: { trunk: '#4a3424', dark: '#1f4224', mid: '#357a33', light: '#68ad4b' },
    meadow: { trunk: '#4a3424', dark: '#2a4f2a', mid: '#3f7f3a', light: '#7cba5c' },
    gold: { trunk: '#5a4232', dark: '#7a5214', mid: '#c98f24', light: '#f4d35e' },
    blossom: { trunk: '#4a2e2a', dark: '#8a4458', mid: '#d97a98', light: '#ffc6d6', flower: '#fff0f4' },
  };

  function buildTree(pal, seed) {
    const r = G.mulberry32(seed);
    return spr(130, 160, 65, 150, (g) => {
      shadow(g, 65, 150, 40, 11);
      g.fillStyle = pal.trunk;
      g.beginPath();
      g.moveTo(58, 150); g.quadraticCurveTo(61, 122, 56, 96); g.lineTo(73, 96); g.quadraticCurveTo(68, 122, 74, 150);
      g.closePath();
      g.fill();
      g.strokeStyle = pal.trunk;
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(63, 110); g.lineTo(44, 92); g.moveTo(68, 106); g.lineTo(88, 90);
      g.stroke();
      const blobs = [];
      for (let i = 0; i < 10; i++) {
        const a = r() * TAU, d = r() * 26;
        blobs.push([65 + Math.cos(a) * d * 1.25, 66 + Math.sin(a) * d * 0.8 - r() * 8, 17 + r() * 12]);
      }
      blobs.sort((a, b) => a[1] - b[1]);
      g.fillStyle = pal.dark;
      for (const [x, y, rad] of blobs) { g.beginPath(); g.arc(x + 3, y + 6, rad, 0, TAU); g.fill(); }
      g.fillStyle = pal.mid;
      for (const [x, y, rad] of blobs) { g.beginPath(); g.arc(x, y, rad * 0.9, 0, TAU); g.fill(); }
      g.fillStyle = pal.light;
      for (const [x, y, rad] of blobs) { g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.42, 0, TAU); g.fill(); }
      if (pal.flower) {
        g.fillStyle = pal.flower;
        for (let i = 0; i < 46; i++) {
          const a = r() * TAU, d = r() * 40;
          g.beginPath();
          g.arc(65 + Math.cos(a) * d * 1.2, 62 + Math.sin(a) * d * 0.75, 1.6, 0, TAU);
          g.fill();
        }
      }
    });
  }

  function buildPine(seed) {
    const r = G.mulberry32(seed);
    const sc = 0.85 + r() * 0.3;
    return spr(100, 175, 50, 165, (g) => {
      shadow(g, 50, 165, 32, 9);
      g.fillStyle = '#3a2a20';
      g.fillRect(46, 135, 8, 30);
      for (let i = 0; i < 5; i++) {
        const y = 142 - i * 24 * sc, w = (44 - i * 7.5) * sc;
        g.fillStyle = '#1f3d36';
        g.beginPath(); g.moveTo(50 - w, y); g.lineTo(50, y - 46 * sc); g.lineTo(50 + w, y); g.closePath(); g.fill();
        g.fillStyle = '#16302a';
        g.beginPath(); g.moveTo(50, y - 46 * sc); g.lineTo(50 + w, y); g.lineTo(50, y); g.closePath(); g.fill();
        g.fillStyle = '#eef5fb';
        g.beginPath();
        g.moveTo(50 - w * 0.62, y - 17 * sc);
        g.lineTo(50, y - 46 * sc);
        g.lineTo(50 + w * 0.62, y - 17 * sc);
        g.quadraticCurveTo(50 + w * 0.3, y - 22 * sc, 50 + w * 0.1, y - 16 * sc);
        g.quadraticCurveTo(50 - w * 0.2, y - 24 * sc, 50 - w * 0.62, y - 17 * sc);
        g.fill();
      }
    });
  }

  function branch(g, x, y, a, len, w, r, d) {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    g.lineWidth = w;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (d < 4) {
      branch(g, x2, y2, a - 0.35 - r() * 0.4, len * 0.7, w * 0.62, r, d + 1);
      if (r() < 0.8) branch(g, x2, y2, a + 0.3 + r() * 0.4, len * 0.68, w * 0.62, r, d + 1);
    }
  }
  function buildDead(seed) {
    const r = G.mulberry32(seed);
    return spr(120, 150, 60, 140, (g) => {
      shadow(g, 60, 140, 30, 8);
      g.strokeStyle = '#21140f';
      branch(g, 60, 140, -Math.PI / 2 + (r() - 0.5) * 0.2, 44, 9, r, 0);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        g.fillStyle = 'rgba(255,120,40,0.8)';
        g.beginPath();
        g.arc(56 + r() * 8, 100 + r() * 36, 1.4, 0, TAU);
        g.fill();
      }
    });
  }

  function buildBamboo(seed) {
    const r = G.mulberry32(seed);
    return spr(96, 200, 48, 190, (g) => {
      shadow(g, 48, 190, 30, 8);
      for (let i = 0; i < 6; i++) {
        const x = 20 + i * 10 + r() * 4, h = 120 + r() * 60, lean = (r() - 0.5) * 14;
        g.strokeStyle = i % 2 ? '#5c8f3a' : '#477a2c';
        g.lineWidth = 4.5;
        g.beginPath(); g.moveTo(x, 190); g.lineTo(x + lean, 190 - h); g.stroke();
        g.strokeStyle = '#2f5420';
        g.lineWidth = 5.2;
        for (let k = 20; k < h; k += 22) {
          const t = k / h;
          g.beginPath(); g.moveTo(x + lean * t - 2.5, 190 - k); g.lineTo(x + lean * t + 2.5, 190 - k); g.stroke();
        }
        g.fillStyle = i % 2 ? '#7cbf55' : '#5fa043';
        for (let k = 0; k < 4; k++) {
          const t = 0.6 + r() * 0.4, lx = x + lean * t, ly = 190 - h * t;
          g.save(); g.translate(lx, ly); g.rotate((r() - 0.5) * 2.4);
          g.beginPath(); g.ellipse(9, 0, 10, 2.6, 0, 0, TAU); g.fill();
          g.restore();
        }
      }
    });
  }

  const ROCK_PAL = {
    grey: ['#3e4146', '#62666d', '#9ea3aa'],
    moss: ['#33402e', '#58624f', '#8fae6a'],
    ice: ['#6f8fac', '#a9c7e0', '#f2faff'],
    basalt: ['#151214', '#2e282b', '#54484a'],
    ochre: ['#6b4620', '#a3723a', '#dcae6c'],
  };
  function buildRock(pal, seed, scale) {
    const r = G.mulberry32(seed), P = ROCK_PAL[pal];
    const w = 76 * scale, h = 62 * scale;
    return spr(w, h, w / 2, h - 8 * scale, (g) => {
      shadow(g, w / 2, h - 8 * scale, w * 0.42, 8 * scale);
      const pts = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU, k = 0.72 + r() * 0.28;
        pts.push([w / 2 + Math.cos(a) * w * 0.38 * k, h * 0.56 + Math.sin(a) * h * 0.36 * k - (Math.sin(a) < 0 ? h * 0.12 : 0)]);
      }
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fillStyle = P[1];
      g.fill();
      g.save();
      g.clip();
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, G.rgba(P[0], 0.95));
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = G.rgba(P[2], 0.75);
      g.beginPath();
      g.ellipse(w * 0.42, h * 0.36, w * 0.24, h * 0.14, -0.3, 0, TAU);
      g.fill();
      if (pal === 'moss') {
        g.fillStyle = '#6f9a4a';
        g.beginPath(); g.ellipse(w * 0.45, h * 0.28, w * 0.3, h * 0.1, 0, 0, TAU); g.fill();
      }
      if (pal === 'ochre') {
        g.strokeStyle = 'rgba(255,230,180,0.25)';
        g.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, h * (0.45 + k * 0.12)); g.lineTo(w, h * (0.42 + k * 0.12)); g.stroke(); }
      }
      g.restore();
      if (pal === 'basalt') {
        g.globalCompositeOperation = 'lighter';
        g.strokeStyle = 'rgba(255,110,40,0.85)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(w * 0.3, h * 0.4); g.lineTo(w * 0.45, h * 0.55); g.lineTo(w * 0.42, h * 0.72); g.lineTo(w * 0.6, h * 0.8);
        g.stroke();
      }
    });
  }

  const CRY_PAL = {
    kim: { dark: '#7a7f88', light: '#f6f8fb', glow: '#f0d27a' },
    ice: { dark: '#3f7fb6', light: '#ffffff', glow: '#5cb8ff' },
  };
  function buildCrystal(pal, seed) {
    const r = G.mulberry32(seed), P = CRY_PAL[pal];
    return spr(84, 120, 42, 110, (g) => {
      shadow(g, 42, 110, 26, 7);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.55;
      g.drawImage(G.glow(P.glow), 2, 30, 80, 80);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      const n = 5;
      for (let i = 0; i < n; i++) {
        const bx = 42 + (i - 2) * 9 + (r() - 0.5) * 6, h = 36 + r() * 46 - Math.abs(i - 2) * 8, w = 6 + r() * 4, lean = (i - 2) * 5 + (r() - 0.5) * 6;
        const gr = g.createLinearGradient(bx - w, 0, bx + w, 0);
        gr.addColorStop(0, P.dark); gr.addColorStop(0.5, P.light); gr.addColorStop(1, P.dark);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(bx - w, 110); g.lineTo(bx - w + lean, 110 - h); g.lineTo(bx + lean, 110 - h - w * 1.4); g.lineTo(bx + w + lean, 110 - h); g.lineTo(bx + w, 110);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.5)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(bx, 108); g.lineTo(bx + lean, 110 - h - w * 1.2); g.stroke();
      }
    });
  }

  function buildPillar(seed) {
    const r = G.mulberry32(seed), hh = 120 + r() * 50;
    return spr(96, 190, 48, 180, (g) => {
      shadow(g, 48, 180, 38, 10);
      g.fillStyle = '#a8763c';
      g.beginPath();
      g.moveTo(14, 180); g.lineTo(22 + r() * 4, 180 - hh); g.lineTo(70 + r() * 4, 176 - hh); g.lineTo(82, 180);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(80,50,20,0.55)';
      g.beginPath();
      g.moveTo(52, 180); g.lineTo(56, 178 - hh); g.lineTo(72, 176 - hh); g.lineTo(82, 180);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(255,225,170,0.3)';
      g.lineWidth = 2;
      for (let y = 180 - hh + 16; y < 176; y += 16) {
        g.beginPath(); g.moveTo(18, y); g.quadraticCurveTo(48, y + (r() - 0.5) * 6, 80, y); g.stroke();
      }
      g.fillStyle = '#d9b07a';
      g.beginPath(); g.ellipse(47, 178 - hh, 25, 6, 0, 0, TAU); g.fill();
    });
  }

  function buildBush(seed, dry) {
    const r = G.mulberry32(seed);
    return spr(70, 50, 35, 44, (g) => {
      shadow(g, 35, 44, 26, 6);
      for (let i = 0; i < 7; i++) {
        g.fillStyle = dry ? (r() < 0.5 ? '#8a7a3a' : '#a8964a') : r() < 0.5 ? '#2f5a2a' : '#4a8a3a';
        g.beginPath();
        g.arc(14 + r() * 42, 26 + r() * 14, 8 + r() * 6, 0, TAU);
        g.fill();
      }
    });
  }

  function buildHouse(seed) {
    const r = G.mulberry32(seed), roof = ['#3b3f4a', '#5a2a24', '#2f4a44'][(r() * 3) | 0];
    return spr(220, 190, 110, 172, (g) => {
      shadow(g, 110, 172, 104, 18, 0.32);
      g.fillStyle = '#5f594d';
      g.fillRect(16, 150, 188, 22);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.fillRect(16, 150, 188, 4);
      g.fillStyle = '#e0d0aa';
      g.fillRect(28, 94, 164, 58);
      g.fillStyle = '#4a2f22';
      for (const x of [28, 72, 144, 186]) g.fillRect(x, 90, 6, 62);
      g.fillRect(28, 94, 164, 5);
      g.fillStyle = '#3a2418';
      g.fillRect(96, 112, 28, 40);
      g.fillStyle = '#c8442d';
      g.fillRect(92, 104, 36, 6);
      g.strokeStyle = '#5a3a26';
      g.lineWidth = 1.5;
      for (const wx of [40, 156]) {
        g.fillStyle = '#2a1c14';
        g.fillRect(wx, 108, 24, 22);
        g.beginPath();
        for (let k = 1; k < 4; k++) { g.moveTo(wx + k * 6, 108); g.lineTo(wx + k * 6, 130); g.moveTo(wx, 108 + k * 5.5); g.lineTo(wx + 24, 108 + k * 5.5); }
        g.strokeStyle = '#a07a50';
        g.stroke();
      }
      // mái cong
      g.fillStyle = roof;
      g.beginPath();
      g.moveTo(0, 82);
      g.quadraticCurveTo(14, 100, 42, 99);
      g.lineTo(178, 99);
      g.quadraticCurveTo(206, 100, 220, 82);
      g.quadraticCurveTo(200, 88, 186, 52);
      g.lineTo(34, 52);
      g.quadraticCurveTo(20, 88, 0, 82);
      g.closePath();
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = 'rgba(0,0,0,0.22)';
      g.lineWidth = 2;
      for (let x = 10; x < 220; x += 9) { g.beginPath(); g.moveTo(110 + (x - 110) * 0.78, 52); g.lineTo(x, 100); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.fillRect(0, 90, 220, 10);
      g.restore();
      g.strokeStyle = '#1e1a18';
      g.lineWidth = 6;
      g.beginPath();
      g.moveTo(26, 40); g.quadraticCurveTo(36, 52, 50, 51); g.lineTo(170, 51); g.quadraticCurveTo(184, 52, 194, 40);
      g.stroke();
      g.fillStyle = '#d6b064';
      g.beginPath(); g.arc(110, 46, 4, 0, TAU); g.fill();
    });
  }

  function buildLantern() {
    return spr(70, 120, 22, 110, (g) => {
      shadow(g, 22, 110, 10, 3.5);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.6;
      g.drawImage(G.glow('#ffb050'), 0, 20, 70, 70);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = '#3a2418';
      g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(22, 110); g.lineTo(22, 40); g.lineTo(36, 40); g.stroke();
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(36, 40); g.lineTo(36, 46); g.stroke();
      g.fillStyle = '#d8432a';
      g.beginPath(); g.ellipse(36, 56, 8, 10, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,220,140,0.55)';
      g.beginPath(); g.ellipse(34, 54, 3, 6, 0, 0, TAU); g.fill();
      g.fillStyle = '#d6b064';
      g.fillRect(31, 45, 10, 2.5);
      g.fillRect(31, 65, 10, 2.5);
      g.strokeStyle = '#d6b064';
      g.beginPath(); g.moveTo(36, 68); g.lineTo(36, 76); g.stroke();
    });
  }

  // Tế đàn ngũ hành ở giữa trấn: 5 trụ đá + hình ngũ giác (sinh) và ngôi sao (khắc)
  function buildAltar() {
    return spr(260, 200, 130, 168, (g) => {
      shadow(g, 130, 168, 118, 30, 0.3);
      g.fillStyle = '#4f4a3e';
      g.beginPath(); g.ellipse(130, 160, 112, 36, 0, 0, TAU); g.fill();
      g.fillStyle = '#7a7362';
      g.beginPath(); g.ellipse(130, 152, 108, 34, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(214,176,100,0.55)';
      g.lineWidth = 1.6;
      const P = G.SINH_ORDER.map((el, i) => {
        const a = -Math.PI / 2 + (i / 5) * TAU;
        return { el, x: 130 + Math.cos(a) * 78, y: 152 + Math.sin(a) * 24 };
      });
      g.beginPath();
      P.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.closePath();
      g.stroke();
      g.strokeStyle = 'rgba(200,68,45,0.6)';
      g.beginPath();
      for (let i = 0; i <= 5; i++) {
        const p = P[(i * 2) % 5];
        i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y);
      }
      g.stroke();
      const order = P.slice().sort((a, b) => a.y - b.y);
      for (const p of order) {
        const el = E[p.el], h = 30 + (p.y < 150 ? 6 : 0);
        g.fillStyle = '#3a362e';
        g.fillRect(p.x - 7, p.y - h, 14, h);
        g.fillStyle = '#6a6455';
        g.fillRect(p.x - 7, p.y - h, 6, h);
        g.globalCompositeOperation = 'lighter';
        g.drawImage(G.glow(el.color, true), p.x - 18, p.y - h - 22, 36, 36);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = el.color;
        g.beginPath();
        g.moveTo(p.x, p.y - h - 12); g.lineTo(p.x + 6, p.y - h - 4); g.lineTo(p.x, p.y - h + 3); g.lineTo(p.x - 6, p.y - h - 4);
        g.closePath();
        g.fill();
      }
    });
  }

  /* ---------- Danh mục sprite: mỗi loại có vài biến thể ---------- */
  const SPR = new Map();
  function sprite(type, v) {
    const key = type + v;
    let s = SPR.get(key);
    if (s) return s;
    switch (type) {
      case 'treeGreen': s = buildTree(PAL.green, 100 + v); break;
      case 'treeMeadow': s = buildTree(PAL.meadow, 200 + v); break;
      case 'treeGold': s = buildTree(PAL.gold, 300 + v); break;
      case 'treeBlossom': s = buildTree(PAL.blossom, 400 + v); break;
      case 'pine': s = buildPine(500 + v); break;
      case 'dead': s = buildDead(600 + v); break;
      case 'bamboo': s = buildBamboo(700 + v); break;
      case 'rockGrey': s = buildRock('grey', 800 + v, 0.8 + (v % 3) * 0.25); break;
      case 'rockMoss': s = buildRock('moss', 900 + v, 0.8 + (v % 3) * 0.25); break;
      case 'rockIce': s = buildRock('ice', 1000 + v, 0.8 + (v % 3) * 0.25); break;
      case 'rockBasalt': s = buildRock('basalt', 1100 + v, 0.8 + (v % 3) * 0.3); break;
      case 'rockOchre': s = buildRock('ochre', 1200 + v, 0.9 + (v % 3) * 0.3); break;
      case 'oreKim': s = buildCrystal('kim', 1300 + v); break;
      case 'oreIce': s = buildCrystal('ice', 1400 + v); break;
      case 'pillar': s = buildPillar(1500 + v); break;
      case 'bush': s = buildBush(1600 + v, false); break;
      case 'bushDry': s = buildBush(1700 + v, true); break;
      case 'house': s = buildHouse(1800 + v); break;
      case 'lantern': s = buildLantern(); break;
      case 'altar': s = buildAltar(); break;
    }
    SPR.set(key, s);
    return s;
  }
  const RADIUS = { tree: 14, pine: 12, dead: 10, bamboo: 14, rock: 20, ore: 16, pillar: 26, bush: 12, lantern: 6 };

  /* ---------- Lưới không gian cho vật cản (truy vấn nhanh) ---------- */
  const CELL = 256;
  const grid = new Map();
  G.PROPS = [];
  function addProp(type, v, x, y, cols) {
    const p = { prop: true, type, v, x, y, cols, spr: null };
    G.PROPS.push(p);
    const key = ((x / CELL) | 0) + ',' + ((y / CELL) | 0);
    let arr = grid.get(key);
    if (!arr) grid.set(key, (arr = []));
    arr.push(p);
    return p;
  }
  G.propsIn = function (x0, y0, x1, y1, out) {
    out.length = 0;
    const cx0 = Math.max(0, (x0 / CELL) | 0), cy0 = Math.max(0, (y0 / CELL) | 0);
    const cx1 = (x1 / CELL) | 0, cy1 = (y1 / CELL) | 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const arr = grid.get(cx + ',' + cy);
        if (arr) for (const p of arr) out.push(p);
      }
    }
    return out;
  };
  G.propSprite = function (p) {
    if (!p.spr) p.spr = sprite(p.type, p.v);
    return p.spr;
  };

  const tmp = [];
  // Đẩy thực thể ra khỏi vật cản / hồ / biên bản đồ
  G.collide = function (e) {
    G.propsIn(e.x - 120, e.y - 120, e.x + 120, e.y + 120, tmp);
    for (const p of tmp) {
      for (const c of p.cols) {
        const dx = e.x - c.x, dy = e.y - c.y, R = c.r + e.r * 0.6;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          e.x = c.x + (dx / d) * R;
          e.y = c.y + (dy / d) * R;
        }
      }
    }
    for (const p of G.POOLS) {
      const dx = (e.x - p.x) / (p.rx * 0.88), dy = (e.y - p.y) / (p.ry * 0.88);
      const k = Math.hypot(dx, dy);
      if (k < 1 && k > 0.0001) {
        e.x = p.x + (dx / k) * p.rx * 0.88;
        e.y = p.y + (dy / k) * p.ry * 0.88;
      }
    }
    e.x = G.clamp(e.x, 70, W.w - 70);
    e.y = G.clamp(e.y, 70, W.h - 70);
  };
  G.blocked = function (x, y, r) {
    G.propsIn(x - 120, y - 120, x + 120, y + 120, tmp);
    for (const p of tmp) for (const c of p.cols) if (Math.hypot(x - c.x, y - c.y) < c.r + r) return true;
    for (const p of G.POOLS) if (Math.hypot((x - p.x) / (p.rx + r), (y - p.y) / (p.ry + r)) < 1) return true;
    return false;
  };

  /* ---------- Sinh thế giới ---------- */
  G.buildWorld = function () {
    const r = G.mulberry32(20240);
    // hồ
    const zone = (el) => G.ZONES.find((z) => z.el === el);
    const placePool = (z, kind, n) => {
      let tries = 0;
      while (n > 0 && tries++ < 80) {
        const a = r() * TAU, d = 140 + r() * z.r * 0.55;
        const x = z.x + Math.cos(a) * d, y = z.y + Math.sin(a) * d;
        if (nearRoad(x, y, 170) || G.POOLS.some((p) => Math.hypot(p.x - x, p.y - y) < 320)) continue;
        makePool(x, y, 90 + r() * 60, 55 + r() * 30, kind, r);
        n--;
      }
    };
    placePool(zone('moc'), 'water', 2);
    placePool(zone('thuy'), 'ice', 2);
    placePool(zone('hoa'), 'lava', 3);
    for (let i = 0; i < 3; i++) {
      const a = zone('thuy').a + (i * 2 + 1) * (TAU / 10) * 1.0;
      const x = W.cx + Math.cos(a) * 820, y = W.cy + Math.sin(a) * 820;
      if (!nearRoad(x, y, 170)) makePool(x, y, 80 + r() * 40, 50 + r() * 20, 'water', r);
    }
    G.biomeMap = buildBiomeMap();

    // trấn: tế đàn, nhà, đèn lồng, cây hoa đào
    addProp('altar', 0, W.cx, W.cy + 20, [{ x: W.cx, y: W.cy + 6, r: 64 }]);
    const roadAngles = G.ROADS.map((rd) => Math.atan2(rd.cy - rd.y0, rd.cx - rd.x0));
    const freeAngle = (a, gap) => roadAngles.every((ra) => Math.abs(G.angDiff(a, ra)) > gap);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU + 0.31;
      if (!freeAngle(a, 0.42)) continue;
      const x = W.cx + Math.cos(a) * 340, y = W.cy + Math.sin(a) * 300;
      addProp('house', i % 3, x, y, [{ x: x - 52, y: y - 14, r: 40 }, { x: x + 52, y: y - 14, r: 40 }, { x, y: y - 14, r: 40 }]);
    }
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      if (!freeAngle(a, 0.18)) continue;
      addProp('lantern', 0, W.cx + Math.cos(a) * (W.plazaR + 18), W.cy + Math.sin(a) * (W.plazaR + 18), [{ x: W.cx + Math.cos(a) * (W.plazaR + 18), y: W.cy + Math.sin(a) * (W.plazaR + 18), r: 6 }]);
    }

    const ok = (x, y, sep) => {
      if (Math.hypot(x - W.cx, y - W.cy) < W.plazaR + 70) return false;
      if (nearRoad(x, y, 64)) return false;
      if (G.blocked(x, y, sep)) return false;
      return x > 90 && y > 90 && x < W.w - 90 && y < W.h - 90;
    };
    const put = (type, v, x, y, rad) => addProp(type, v, x, y, [{ x, y: y - 4, r: rad }]);
    const pick = (list) => { let k = r(), acc = 0; for (const [t, w] of list) { acc += w; if (k <= acc) return t; } return list[0][0]; };
    const TABLE = {
      kim: [['treeGold', 0.5], ['rockGrey', 0.28], ['oreKim', 0.22]],
      moc: [['treeGreen', 0.45], ['bamboo', 0.35], ['rockMoss', 0.2]],
      thuy: [['pine', 0.58], ['oreIce', 0.2], ['rockIce', 0.22]],
      hoa: [['dead', 0.45], ['rockBasalt', 0.4], ['bushDry', 0.15]],
      tho: [['pillar', 0.32], ['rockOchre', 0.4], ['bushDry', 0.28]],
      meadow: [['treeMeadow', 0.55], ['rockGrey', 0.2], ['bush', 0.25]],
      village: [['treeBlossom', 1]],
    };
    const radFor = (t) => (t.startsWith('tree') ? RADIUS.tree : t.startsWith('rock') ? RADIUS.rock : t.startsWith('ore') ? RADIUS.ore : t.startsWith('bush') ? RADIUS.bush : RADIUS[t] || 14);

    for (const z of G.ZONES) {
      let n = 0, tries = 0;
      while (n < 120 && tries++ < 900) {
        const a = r() * TAU, d = Math.sqrt(r()) * z.r * 0.95;
        const x = z.x + Math.cos(a) * d, y = z.y + Math.sin(a) * d;
        if (!ok(x, y, 46)) continue;
        const t = pick(TABLE[z.el]);
        put(t, (r() * 4) | 0, x, y, radFor(t));
        n++;
      }
    }
    let n = 0, tries = 0;
    while (n < 260 && tries++ < 3000) {
      const x = 100 + r() * (W.w - 200), y = 100 + r() * (W.h - 200);
      const b = G.biomeAt(x, y);
      if (b !== 'meadow' && b !== 'village') continue;
      if (b === 'village' && r() < 0.6) continue;
      if (!ok(x, y, 50)) continue;
      const t = pick(TABLE[b]);
      put(t, (r() * 4) | 0, x, y, radFor(t));
      n++;
    }
    // rừng viền quanh mép bản đồ
    for (let i = 0; i < 220; i++) {
      const side = i % 4, t = r();
      let x, y;
      if (side === 0) { x = t * W.w; y = 60 + r() * 120; }
      else if (side === 1) { x = t * W.w; y = W.h - 60 - r() * 120; }
      else if (side === 2) { x = 60 + r() * 120; y = t * W.h; }
      else { x = W.w - 60 - r() * 120; y = t * W.h; }
      const b = G.biomeAt(x, y);
      const type = b === 'thuy' ? 'pine' : b === 'hoa' ? 'dead' : b === 'kim' ? 'treeGold' : b === 'tho' ? 'pillar' : 'treeGreen';
      addProp(type, (r() * 4) | 0, x, y, [{ x, y: y - 4, r: 16 }]);
    }
  };
})(window.G);
