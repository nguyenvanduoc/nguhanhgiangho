/* =====================================================================
 * vfx.js — Hiệu ứng hình ảnh của chiêu thức
 * Nhát chém, vòng sóng, cột sáng, thiên thạch, mưa kim, bão tuyết,
 * xoáy nước, rồng lửa... và hạt môi trường (tuyết rơi, lá bay, tro lửa).
 * ===================================================================== */
(function (G) {
  'use strict';
  const TAU = G.TAU, P = G.Particles, E = G.ELEMENTS;
  const rr = G.rr;
  const q = (n) => Math.max(1, Math.round(n * G.quality));

  /* ---------- Bộ tạo hạt dùng chung ---------- */
  G.burst = function (x, y, color, n, spd, o) {
    o = o || {};
    const img = G.glow(color, o.hot);
    for (let i = 0, c = q(n); i < c; i++) {
      const a = Math.random() * TAU, v = spd * (0.3 + Math.random() * 0.7);
      P.spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * (o.flat ? 0.5 : 1) - (o.up || 0), life: rr(0.25, 0.6) * (o.life || 1), size: rr(6, 14) * (o.size || 1), sizeEnd: 0, img, drag: 3, gravity: o.gravity || 0 });
    }
  };
  G.sparks = function (x, y, color, n, spd) {
    for (let i = 0, c = q(n); i < c; i++) {
      const a = Math.random() * TAU, v = spd * rr(0.4, 1);
      P.spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr(0.18, 0.4), size: rr(1.2, 2.4), sizeEnd: 0.4, shape: 'line', color, drag: 4 });
    }
  };
  G.debris = function (x, y, color, n, spd) {
    for (let i = 0, c = q(n); i < c; i++) {
      const a = Math.random() * TAU, v = spd * rr(0.3, 1);
      P.spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.5 - rr(120, 300), gravity: 900, life: rr(0.35, 0.7), size: rr(2.5, 5), sizeEnd: rr(2, 3), shape: 'rect', color, add: false, drag: 0.6 });
    }
  };
  G.smoke = function (x, y, n, color, spread) {
    const img = G.glow(color || '#3a3430');
    for (let i = 0, c = q(n); i < c; i++) {
      P.spawn({ x: x + rr(-1, 1) * (spread || 12), y: y + rr(-1, 1) * (spread || 12) * 0.5, vx: rr(-25, 25), vy: rr(-55, -15), life: rr(0.7, 1.3), size: rr(18, 30), sizeEnd: rr(40, 60), img, add: false, alpha: 0.35, drag: 1 });
    }
  };
  G.ring = function (x, y, r0, r1, color, dur, width, layer) {
    G.Fx.add({ type: 'ring', x, y, r0, r1, color, dur: dur || 0.45, width: width || 6, layer: layer || 'ground' });
  };
  G.decal = function (x, y, r, kind, dur) {
    const rnd = Math.random, lines = [];
    const n = kind === 'crack' ? 9 : 6;
    for (let i = 0; i < n; i++) {
      let a = (i / n) * TAU + rnd() * 0.4, px = x, py = y;
      const seg = [px, py];
      for (let k = 0; k < 4; k++) {
        a += (rnd() - 0.5) * 0.8;
        px += Math.cos(a) * r * 0.22;
        py += Math.sin(a) * r * 0.22 * 0.6;
        seg.push(px, py);
      }
      lines.push(seg);
    }
    G.Fx.add({ type: 'decal', kind, x, y, r, lines, dur: dur || 2.4, layer: 'ground' });
  };
  G.screenFlash = function (color, a) {
    G.S.flash = { color, a: a || 0.35 };
  };
  G.shake = function (v) {
    G.S.cam.shake = Math.max(G.S.cam.shake, v);
  };

  /* ---------- Vệt bay theo đạn, mỗi hành một kiểu ---------- */
  G.trail = function (el, x, y, vx, vy, big) {
    const k = big ? 1.8 : 1;
    switch (el) {
      case 'kim':
        P.spawn({ x, y, vx: -vx * 0.1 + rr(-30, 30), vy: -vy * 0.1 + rr(-30, 30), life: 0.25, size: 6 * k, img: G.glow('#f0d27a') });
        break;
      case 'moc':
        P.spawn({ x: x + rr(-4, 4), y: y + rr(-4, 4), vx: rr(-15, 15), vy: rr(-40, -10), life: rr(0.3, 0.6), size: rr(4, 8) * k, img: G.glow('#6fd06a') });
        break;
      case 'thuy':
        P.spawn({ x, y, vx: rr(-20, 20), vy: rr(-20, 20), life: rr(0.25, 0.45), size: rr(5, 9) * k, img: G.glow('#9fdcff') });
        if (Math.random() < 0.35) P.spawn({ x, y, vx: rr(-40, 40), vy: rr(10, 50), life: 0.5, size: 2, sizeEnd: 1, color: '#ffffff', shape: 'rect' });
        break;
      case 'hoa':
        P.spawn({ x: x + rr(-3, 3), y: y + rr(-3, 3), vx: rr(-25, 25), vy: rr(-80, -30), life: rr(0.25, 0.5), size: rr(10, 16) * k, img: G.glow('#ff7a3d', true) });
        if (Math.random() < 0.25) G.smoke(x, y, 1, '#2a1a14', 4);
        break;
      case 'tho':
        P.spawn({ x, y, vx: rr(-25, 25), vy: rr(-25, 5), life: rr(0.3, 0.5), size: rr(10, 16) * k, sizeEnd: 22 * k, img: G.glow('#a8865a'), add: false, alpha: 0.4 });
        break;
    }
  };

  G.hitBurst = function (x, y, el, crit) {
    const c = E[el];
    G.burst(x, y, c.color, crit ? 14 : 8, crit ? 260 : 180, { hot: true });
    G.sparks(x, y, c.light, crit ? 10 : 5, 380);
    if (crit) G.ring(x, y, 6, 42, c.light, 0.3, 4, 'top');
  };

  /* ---------- Hiệu ứng khi chiêu "nổ" xuống đất ---------- */
  G.impactFx = function (g) {
    const el = E[g.el], x = g.x, y = g.y, R = g.r;
    switch (g.vfx) {
      case 'pillar':
        G.Fx.add({ type: 'pillar', x, y, w: R * 0.7, color: el.color, dur: 0.7 });
        G.ring(x, y, 10, R * 1.15, el.light, 0.6, 10);
        G.ring(x, y, 10, R * 0.8, el.color, 0.45, 6);
        G.burst(x, y - 20, el.color, 40, 420, { hot: true, flat: true, size: 1.4 });
        G.sparks(x, y - 10, el.light, 26, 600);
        G.decal(x, y, R, 'glyph', 2.4);
        G.shake(12);
        G.screenFlash(el.light, 0.35);
        break;
      case 'goldring':
        G.ring(x, y, 10, R, el.light, 0.38, 9);
        G.ring(x, y, 10, R * 0.75, el.color, 0.5, 4);
        for (let i = 0; i < q(22); i++) {
          const a = (i / 22) * TAU;
          P.spawn({ x: x + Math.cos(a) * R * 0.8, y: y + Math.sin(a) * R * 0.5 - 14, vx: Math.cos(a) * 120, vy: Math.sin(a) * 60, life: 0.4, size: 12, img: G.glow(el.color, true), drag: 3 });
        }
        G.shake(5);
        break;
      case 'meteor':
        G.ring(x, y, 10, R * 1.1, '#ffb050', 0.45, 12);
        G.burst(x, y - 10, '#ff7a3d', 46, 420, { hot: true, flat: true, size: 1.6 });
        G.burst(x, y - 20, '#ffd06a', 18, 200, { hot: true, up: 120 });
        G.debris(x, y, '#2a1410', 14, 260);
        G.smoke(x, y - 10, 10, '#2a1a14', R * 0.4);
        G.decal(x, y, R, 'scorch', 3);
        G.shake(10);
        G.screenFlash('#ff9a50', 0.25);
        break;
      case 'boulder':
        G.ring(x, y, 8, R * 1.1, '#d6a35a', 0.4, 8);
        G.debris(x, y - 6, '#7a5530', 20, 280);
        G.debris(x, y - 6, '#c49a5c', 10, 200);
        G.smoke(x, y, 8, '#8a6a42', R * 0.5);
        G.decal(x, y, R, 'crack', 2.6);
        G.shake(7);
        break;
      case 'quake':
        G.ring(x, y, 10, R, '#e3c07a', 0.45, 10);
        G.ring(x, y, 10, R * 0.7, '#a8763c', 0.6, 6);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU;
          G.Fx.add({ type: 'spike', x: x + Math.cos(a) * R * 0.75, y: y + Math.sin(a) * R * 0.5, h: rr(20, 34), color: '#a8763c', light: '#e3c07a', dur: 0.7, layer: 'top' });
        }
        G.debris(x, y, '#7a5530', 18, 300);
        G.decal(x, y, R, 'crack', 2.8);
        G.shake(9);
        break;
      case 'frost':
        G.ring(x, y, 10, R, '#e2f4ff', 0.5, 12);
        G.ring(x, y, 10, R * 0.7, '#5cb8ff', 0.65, 6);
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * TAU + rr(-0.1, 0.1), d = R * rr(0.35, 0.9);
          G.Fx.add({ type: 'spike', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, h: rr(18, 36), color: '#7fbfea', light: '#ffffff', dur: 1.1, layer: 'top', ice: true });
        }
        G.burst(x, y - 10, '#9fdcff', 34, 380, { flat: true });
        G.decal(x, y, R, 'frost', 3);
        G.shake(8);
        G.screenFlash('#bfe6ff', 0.3);
        break;
      case 'phoenix':
        G.ring(x, y, 10, R * 1.15, '#ffd06a', 0.6, 16);
        G.ring(x, y, 10, R * 0.85, '#ff5a2a', 0.75, 8);
        for (let i = 0; i < q(48); i++) {
          const a = (i / 48) * TAU, v = rr(260, 520);
          P.spawn({ x, y: y - 20, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.55, life: rr(0.4, 0.75), size: rr(14, 24), img: G.glow('#ff7a3d', true), drag: 2.5 });
        }
        G.burst(x, y - 40, '#ffd06a', 26, 160, { hot: true, up: 160 });
        G.Fx.add({ type: 'pillar', x, y, w: 70, color: '#ff8a3d', dur: 0.8 });
        G.decal(x, y, R, 'scorch', 3.4);
        G.shake(14);
        G.screenFlash('#ffb070', 0.4);
        break;
      case 'poisonburst':
        G.ring(x, y, 10, R, '#6fd06a', 0.45, 8);
        G.burst(x, y - 10, '#6fd06a', 26, 260, { flat: true });
        G.smoke(x, y, 8, '#2f6b2a', R * 0.5);
        G.decal(x, y, R, 'poison', 3);
        G.shake(5);
        break;
      default:
        G.ring(x, y, 10, R, el.light, 0.4, 7);
        G.burst(x, y - 10, el.color, 24, 300, { hot: true, flat: true });
    }
  };

  /* ---------- Hiệu ứng theo thời gian cho vùng kéo dài (mưa kim, độc vụ...) ---------- */
  G.lingerFx = function (g, dt) {
    const el = E[g.el], R = g.r;
    const rp = () => {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * R;
      return [g.x + Math.cos(a) * d, g.y + Math.sin(a) * d * 0.62];
    };
    g.acc = (g.acc || 0) + dt * G.quality;
    const steps = Math.floor(g.acc / 0.016);
    g.acc -= steps * 0.016;
    for (let s = 0; s < steps; s++) {
      switch (g.vfx) {
        case 'needles':
          for (let i = 0; i < 3; i++) {
            const [px, py] = rp();
            P.spawn({ x: px + 40, y: py - 170, vx: -230, vy: 980, life: 0.17, size: 1.8, sizeEnd: 1.4, shape: 'line', color: '#fff6cf' });
          }
          if (Math.random() < 0.5) { const [px, py] = rp(); P.spawn({ x: px, y: py, life: 0.25, size: 12, img: G.glow('#f0d27a', true) }); }
          break;
        case 'cloud': {
          const [px, py] = rp();
          if (Math.random() < 0.5) P.spawn({ x: px, y: py - 10, vx: rr(-20, 20), vy: rr(-12, 4), life: rr(0.9, 1.4), size: rr(40, 60), sizeEnd: rr(70, 90), img: G.glow('#1f5a22'), add: false, alpha: 0.5, fadeIn: 0.35 });
          P.spawn({ x: px, y: py - 6, vx: rr(-10, 10), vy: rr(-40, -15), life: rr(0.5, 0.9), size: rr(5, 9), img: G.glow('#9dff7a'), fadeIn: 0.2 });
          break;
        }
        case 'snow':
          for (let i = 0; i < 2; i++) {
            const [px, py] = rp();
            P.spawn({ x: px + 50, y: py - 140, vx: -300, vy: 820, life: 0.17, size: 2.4, sizeEnd: 1.2, shape: 'line', color: '#e2f4ff' });
          }
          { const [px, py] = rp(); P.spawn({ x: px, y: py - 10, vx: rr(-90, 90), vy: rr(-20, 20), life: rr(0.5, 0.9), size: rr(16, 26), img: G.glow('#cfeaff'), alpha: 0.6, fadeIn: 0.2 }); }
          break;
        case 'vortex': {
          const a = Math.random() * TAU, d = R * rr(0.5, 1);
          P.spawn({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d * 0.62 - 6, vx: -Math.sin(a) * 260 - Math.cos(a) * 60, vy: (Math.cos(a) * 260 - Math.sin(a) * 60) * 0.62, life: rr(0.35, 0.6), size: rr(8, 14), img: G.glow('#5cb8ff', true), drag: 1 });
          break;
        }
        case 'sandstorm': {
          const a = Math.random() * TAU, d = R * rr(0.2, 1);
          P.spawn({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d * 0.62 - 10, vx: -Math.sin(a) * 200, vy: Math.cos(a) * 120 - 20, life: rr(0.5, 0.9), size: rr(16, 26), sizeEnd: 40, img: G.glow('#b08a52'), add: false, alpha: 0.45, fadeIn: 0.2 });
          if (Math.random() < 0.4) P.spawn({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d * 0.6 - 14, vx: -Math.sin(a) * 260, vy: Math.cos(a) * 160, life: 0.4, size: 3, sizeEnd: 2, color: '#6b4a22', add: false });
          break;
        }
        case 'spin':
        case 'leafstorm': {
          const a = Math.random() * TAU, d = R * rr(0.4, 1);
          P.spawn({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d * 0.6 - 18, vx: -Math.sin(a) * 320, vy: Math.cos(a) * 200, life: rr(0.3, 0.5), size: rr(4, 7), shape: 'leaf', color: Math.random() < 0.5 ? '#8fe06a' : '#c6f59a', rot: Math.random() * 6, vr: 14, drag: 1 });
          if (g.vfx === 'leafstorm') P.spawn({ x: g.x + Math.cos(a) * d, y: g.y + Math.sin(a) * d * 0.6 - 18, vx: -Math.sin(a) * 200, vy: Math.cos(a) * 120, life: 0.4, size: 14, img: G.glow('#6fd06a') });
          break;
        }
        default:
          if (Math.random() < 0.5) { const [px, py] = rp(); P.spawn({ x: px, y: py, life: 0.4, size: 12, img: G.glow(el.color) }); }
      }
    }
  };

  /* ---------- Vẽ vùng kỹ năng (ground) ---------- */
  G.drawGround = function (ctx, g, layer) {
    const el = E[g.el], R = g.r, t = G.S.time;
    const enemy = g.team === 1;
    const col = enemy ? '#ff4a3a' : el.color;
    if (layer === 'ground') {
      if (g.t < g.delay && g.delay > 0.08) {
        const p = g.t / g.delay;
        ctx.fillStyle = G.rgba(col, enemy ? 0.14 : 0.08);
        ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R * 0.62, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = G.rgba(col, enemy ? 0.22 : 0.14);
        ctx.beginPath(); ctx.ellipse(g.x, g.y, R * p, R * 0.62 * p, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = G.rgba(col, 0.75);
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R * 0.62, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        if (g.vfx === 'meteor' || g.vfx === 'boulder') {
          ctx.fillStyle = 'rgba(0,0,0,' + 0.35 * p + ')';
          ctx.beginPath(); ctx.ellipse(g.x, g.y, R * 0.4 * p, R * 0.25 * p, 0, 0, TAU); ctx.fill();
        }
      } else if (g.dur > 0) {
        const life = Math.min(1, (g.t - g.delay) / 0.25, (g.delay + g.dur - g.t) / 0.3);
        const tint = { cloud: '#2f6b2a', snow: '#cfeaff', vortex: '#2a6ab0', sandstorm: '#8a6a42', needles: '#f0d27a' }[g.vfx];
        if (tint) {
          const gr = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, R);
          gr.addColorStop(0, G.rgba(tint, 0.32 * life));
          gr.addColorStop(1, G.rgba(tint, 0));
          ctx.fillStyle = gr;
          ctx.save();
          ctx.translate(g.x, g.y);
          ctx.scale(1, 0.62);
          ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU);
          ctx.restore();
          ctx.fill();
        }
        if (g.vfx === 'vortex') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = G.rgba('#7fd0ff', 0.55 * life);
          ctx.lineWidth = 4;
          for (let arm = 0; arm < 4; arm++) {
            ctx.beginPath();
            for (let k = 0; k <= 22; k++) {
              const f = k / 22, a = arm * (TAU / 4) - t * 5 + f * 3.4, d = R * (1 - f * 0.9);
              const px = g.x + Math.cos(a) * d, py = g.y + Math.sin(a) * d * 0.62;
              k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
            }
            ctx.stroke();
          }
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.strokeStyle = G.rgba(enemy ? '#ff4a3a' : el.light, 0.35 * life);
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 10]);
        ctx.lineDashOffset = t * 40;
        ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R * 0.62, 0, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    } else {
      if (g.t < g.delay) {
        const p = g.t / g.delay, k = p * p;
        if (g.vfx === 'meteor') {
          const mx = G.lerp(g.x + 160, g.x, k), my = G.lerp(g.y - 620, g.y - 10, k);
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(G.glow('#ff5a2a'), mx - 55, my - 55, 110, 110);
          ctx.drawImage(G.glow('#ffd06a', true), mx - 26, my - 26, 52, 52);
          ctx.globalCompositeOperation = 'source-over';
          if (Math.random() < 0.9) P.spawn({ x: mx + rr(-8, 8), y: my + rr(-8, 8), vx: 80 + rr(-20, 20), vy: -200 + rr(-40, 40), life: 0.4, size: rr(14, 22), img: G.glow('#ff7a3d', true) });
        } else if (g.vfx === 'boulder') {
          const mx = G.lerp(g.x + 90, g.x, k), my = G.lerp(g.y - 560, g.y - 14, k);
          ctx.save();
          ctx.translate(mx, my);
          ctx.rotate(t * 6);
          const s = 0.8 + R / 140;
          ctx.fillStyle = '#7a5530';
          ctx.beginPath();
          for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU, d = (i % 2 ? 15 : 19) * s; i ? ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d) : ctx.moveTo(d, 0); }
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#c49a5c';
          ctx.beginPath(); ctx.arc(-5 * s, -5 * s, 6 * s, 0, TAU); ctx.fill();
          ctx.restore();
        } else if (g.vfx === 'pillar') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = G.rgba(el.color, 0.25 * p);
          ctx.fillRect(g.x - 3 - p * 8, g.y - 700, 6 + p * 16, 700);
          ctx.globalCompositeOperation = 'source-over';
        }
      } else if ((g.vfx === 'spin' || g.vfx === 'leafstorm') && g.dur > 0) {
        const life = Math.min(1, (g.delay + g.dur - g.t) / 0.15);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const a = t * 16 + (i * TAU) / 3;
          ctx.strokeStyle = G.rgba(el.light, 0.75 * life);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(g.x, g.y - 18, R * 0.85, R * 0.52, 0, a, a + 1.4); ctx.stroke();
          ctx.strokeStyle = G.rgba(el.color, 0.3 * life);
          ctx.lineWidth = 12;
          ctx.beginPath(); ctx.ellipse(g.x, g.y - 18, R * 0.8, R * 0.48, 0, a, a + 1.2); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  };

  /* ---------- Vẽ đạn ---------- */
  G.drawProjectile = function (ctx, pr) {
    const el = E[pr.el], sp = Math.hypot(pr.vx, pr.vy) || 1, dx = pr.vx / sp, dy = pr.vy / sp;
    const a = Math.atan2(dy, dx);
    ctx.globalCompositeOperation = 'lighter';
    switch (pr.vfx) {
      case 'needle':
        ctx.drawImage(G.glow(el.color), pr.x - 12, pr.y - 12, 24, 24);
        ctx.strokeStyle = el.light;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(pr.x + dx * 6, pr.y + dy * 6); ctx.lineTo(pr.x - dx * 16, pr.y - dy * 16); ctx.stroke();
        break;
      case 'lance':
        ctx.drawImage(G.glow(el.color), pr.x - 50, pr.y - 50, 100, 100);
        ctx.strokeStyle = G.rgba(el.color, 0.6);
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x - dx * 70, pr.y - dy * 70); ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(pr.x + dx * 14, pr.y + dy * 14); ctx.lineTo(pr.x - dx * 50, pr.y - dy * 50); ctx.stroke();
        break;
      case 'poison':
        ctx.drawImage(G.glow(el.color), pr.x - 18, pr.y - 18, 36, 36);
        ctx.drawImage(G.glow('#d6ff9a', true), pr.x - 7, pr.y - 7, 14, 14);
        break;
      case 'ice':
        ctx.drawImage(G.glow(el.color), pr.x - 20, pr.y - 20, 40, 40);
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(a);
        ctx.fillStyle = '#e8f7ff';
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-2, -4.5); ctx.lineTo(-12, 0); ctx.lineTo(-2, 4.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8fd0ff';
        ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-2, 4.5); ctx.lineTo(-12, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      case 'swordwave':
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(a);
        ctx.lineCap = 'round';
        ctx.strokeStyle = G.rgba(el.color, 0.4);
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(-10, 0, 20, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = el.light;
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(-10, 0, 21, -1.0, 1.0); ctx.stroke();
        ctx.restore();
        break;
      case 'fire':
        ctx.drawImage(G.glow('#ff5a2a'), pr.x - 26, pr.y - 26, 52, 52);
        ctx.drawImage(G.glow('#ffd06a', true), pr.x - 11, pr.y - 11, 22, 22);
        break;
      case 'dragon': {
        const H = pr.hist;
        for (let i = 0; i < H.length; i += 2) {
          const k = i / H.length, s = 18 + k * 34;
          ctx.globalAlpha = 0.25 + k * 0.6;
          ctx.drawImage(G.glow(k > 0.7 ? '#ffb050' : '#ff5a2a', k > 0.85), H[i] - s / 2, H[i + 1] - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
        ctx.drawImage(G.glow('#ffd06a', true), pr.x - 30, pr.y - 30, 60, 60);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fff2c0';
        ctx.beginPath();
        ctx.arc(pr.x + dx * 6 - dy * 5, pr.y + dy * 6 + dx * 5, 2.2, 0, TAU);
        ctx.arc(pr.x + dx * 6 + dy * 5, pr.y + dy * 6 - dx * 5, 2.2, 0, TAU);
        ctx.fill();
        break;
      }
      case 'rock':
        ctx.globalCompositeOperation = 'source-over';
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(G.S.time * 10);
        ctx.fillStyle = '#8a6036';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) { const b = (i / 6) * TAU, d = i % 2 ? 6.5 : 9; i ? ctx.lineTo(Math.cos(b) * d, Math.sin(b) * d) : ctx.moveTo(d, 0); }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#d6a868';
        ctx.beginPath(); ctx.arc(-2, -2, 3, 0, TAU); ctx.fill();
        ctx.restore();
        break;
      case 'spikes':
        break;
      default:
        ctx.drawImage(G.glow(el.color), pr.x - 18, pr.y - 18, 36, 36);
        ctx.drawImage(G.glow(el.light, true), pr.x - 7, pr.y - 7, 14, 14);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };

  /* ---------- Bảng vẽ FX ---------- */
  G.FX_DRAW = {
    ring(ctx, f, p) {
      const r = G.lerp(f.r0, f.r1, G.easeOut(p));
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(f.color, (1 - p) * 0.3);
      ctx.lineWidth = f.width * 2.6 * (1 - p) + 1;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.62, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = G.rgba(f.color, 1 - p);
      ctx.lineWidth = f.width * (1 - p) + 0.5;
      ctx.stroke();
    },
    // nhát chém hình trăng khuyết quét theo thời gian
    arc(ctx, f, p) {
      const a0 = f.ang - f.arc / 2, sweep = f.arc * Math.min(1, p * 2.6);
      const tail = Math.max(0, p * 2.6 - 1.2) * f.arc;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.scale(1, 0.72);
      ctx.strokeStyle = G.rgba(f.color, 0.45 * (1 - p));
      ctx.lineWidth = 18 * (1 - p * 0.6);
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.78, a0 + tail, a0 + sweep); ctx.stroke();
      ctx.strokeStyle = G.rgba(f.light, 1 - p);
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, f.r * 0.86, a0 + tail, a0 + sweep); ctx.stroke();
      ctx.restore();
    },
    chain(ctx, f, p) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = f.pts;
      const shown = Math.min(pts.length / 2 - 1, Math.floor(p * 10 * (pts.length / 2)));
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? G.rgba(f.light, 1 - p) : G.rgba(f.color, 0.4 * (1 - p));
        ctx.lineWidth = pass ? 2.4 : 9;
        ctx.beginPath();
        ctx.moveTo(pts[0], pts[1]);
        for (let i = 1; i <= shown; i++) {
          const x0 = pts[i * 2 - 2], y0 = pts[i * 2 - 1], x1 = pts[i * 2], y1 = pts[i * 2 + 1];
          const mx = (x0 + x1) / 2 + (y1 - y0) * 0.25 * Math.sin(i * 3.1), my = (y0 + y1) / 2 - (x1 - x0) * 0.25 * Math.sin(i * 3.1);
          ctx.quadraticCurveTo(mx, my, x1, y1);
        }
        ctx.stroke();
      }
      for (let i = 1; i <= shown; i++) ctx.drawImage(G.glow(f.color, true), pts[i * 2] - 14, pts[i * 2 + 1] - 14, 28, 28);
    },
    decal(ctx, f, p) {
      const a = Math.pow(1 - p, 0.6);
      ctx.globalCompositeOperation = 'source-over';
      if (f.kind === 'scorch' || f.kind === 'poison' || f.kind === 'frost' || f.kind === 'glyph') {
        const col = { scorch: '#140806', poison: '#1c3a12', frost: '#dff3ff', glyph: '#f0d27a' }[f.kind];
        const gr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
        gr.addColorStop(0, G.rgba(col, (f.kind === 'frost' ? 0.55 : 0.5) * a));
        gr.addColorStop(1, G.rgba(col, 0));
        ctx.fillStyle = gr;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(1, 0.62);
        ctx.beginPath(); ctx.arc(0, 0, f.r, 0, TAU);
        ctx.restore();
        ctx.fill();
      }
      if (f.kind === 'glyph') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = G.rgba('#f0d27a', 0.6 * a);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.8, f.r * 0.5, 0, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.55, f.r * 0.34, 0, 0, TAU); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i <= 5; i++) {
          const b = -Math.PI / 2 + ((i * 2) % 5) * (TAU / 5);
          const px = f.x + Math.cos(b) * f.r * 0.8, py = f.y + Math.sin(b) * f.r * 0.5;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
        return;
      }
      ctx.strokeStyle = f.kind === 'scorch' ? G.rgba('#ff6a2a', 0.7 * a) : f.kind === 'frost' ? G.rgba('#ffffff', 0.8 * a) : f.kind === 'poison' ? G.rgba('#6fd06a', 0.6 * a) : G.rgba('#2a1a0c', 0.65 * a);
      ctx.lineWidth = f.kind === 'crack' ? 2.4 : 1.6;
      ctx.beginPath();
      for (const L of f.lines) {
        ctx.moveTo(L[0], L[1]);
        for (let i = 2; i < L.length; i += 2) ctx.lineTo(L[i], L[i + 1]);
      }
      ctx.stroke();
    },
    spike(ctx, f, p) {
      const grow = p < 0.18 ? p / 0.18 : p > 0.7 ? (1 - p) / 0.3 : 1;
      const h = f.h * grow, w = f.h * 0.32;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(f.x, f.y, w * 1.2, w * 0.45, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.moveTo(f.x - w, f.y); ctx.lineTo(f.x + w * 0.2, f.y - h); ctx.lineTo(f.x + w, f.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = f.light;
      ctx.beginPath(); ctx.moveTo(f.x - w, f.y); ctx.lineTo(f.x + w * 0.2, f.y - h); ctx.lineTo(f.x - w * 0.1, f.y); ctx.closePath(); ctx.fill();
      if (f.ice) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 * grow;
        ctx.drawImage(G.glow('#5cb8ff'), f.x - 16, f.y - h - 6, 32, 32);
        ctx.globalAlpha = 1;
      }
    },
    pillar(ctx, f, p) {
      const w = f.w * (1 - p * 0.7);
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0);
      gr.addColorStop(0, G.rgba(f.color, 0));
      gr.addColorStop(0.5, G.rgba(f.color, 0.75 * (1 - p)));
      gr.addColorStop(1, G.rgba(f.color, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(f.x - w, f.y - 900, w * 2, 900);
      ctx.fillStyle = G.rgba('#ffffff', 0.7 * (1 - p));
      ctx.fillRect(f.x - w * 0.12, f.y - 900, w * 0.24, 900);
      ctx.globalAlpha = 1 - p;
      ctx.drawImage(G.glow(f.color, true), f.x - w * 1.6, f.y - w * 0.6, w * 3.2, w * 1.2);
      ctx.globalAlpha = 1;
    },
    afterimage(ctx, f, p) {
      ctx.globalAlpha = 0.4 * (1 - p);
      G.drawHumanoid(ctx, f.x, f.y, f.look, { face: f.face, walk: 0, moving: true, atk: 0.6, t: 0, scale: 1, el: f.el });
      ctx.globalAlpha = 1;
    },
    click(ctx, f, p) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba('#f3d995', 1 - p);
      ctx.lineWidth = 2;
      const r = 16 * (1 - p) + 4;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.6, 0, 0, TAU); ctx.stroke();
    },
  };

  /* ---------- Hạt môi trường theo vùng ---------- */
  let ambAcc = 0;
  G.ambientFx = function (dt, view) {
    ambAcc += dt * 26 * G.quality;
    while (ambAcc >= 1) {
      ambAcc -= 1;
      const x = view.x + Math.random() * view.w, y = view.y + Math.random() * view.h;
      const b = G.biomeAt(x, y);
      switch (b) {
        case 'thuy':
          P.spawn({ x, y: y - 60, vx: rr(-30, -10), vy: rr(30, 60), life: rr(2, 3.5), size: rr(1.8, 3.4), sizeEnd: 1.5, color: '#ffffff', add: false, alpha: 0.9, fadeIn: 0.5 });
          break;
        case 'hoa':
          P.spawn({ x, y, vx: rr(-10, 10), vy: rr(-50, -20), life: rr(1.5, 2.5), size: rr(4, 7), img: G.glow('#ff8a3d', true), fadeIn: 0.4 });
          break;
        case 'moc':
          if (Math.random() < 0.6) P.spawn({ x, y, vx: rr(-15, 15), vy: rr(-12, 12), life: rr(2, 3.5), size: rr(5, 8), img: G.glow('#c8ff6a'), fadeIn: 0.8 });
          else P.spawn({ x, y: y - 40, vx: rr(-30, 30), vy: rr(15, 35), life: rr(2, 3), size: rr(3, 4.5), shape: 'leaf', color: '#7cc455', add: false, rot: rr(0, 6), vr: rr(-3, 3), fadeIn: 0.4 });
          break;
        case 'kim':
          P.spawn({ x, y: y - 40, vx: rr(-40, -10), vy: rr(15, 35), life: rr(2.4, 3.6), size: rr(3, 4.5), shape: 'leaf', color: Math.random() < 0.5 ? '#f0c040' : '#d88a2a', add: false, rot: rr(0, 6), vr: rr(-4, 4), fadeIn: 0.4 });
          break;
        case 'tho':
          P.spawn({ x, y, vx: rr(20, 50), vy: rr(-8, 8), life: rr(1.6, 2.6), size: rr(10, 20), sizeEnd: 30, img: G.glow('#c49a5c'), add: false, alpha: 0.18, fadeIn: 0.6 });
          break;
        case 'village':
          P.spawn({ x, y: y - 40, vx: rr(-25, -5), vy: rr(10, 25), life: rr(2.5, 4), size: rr(2.6, 3.6), shape: 'leaf', color: Math.random() < 0.5 ? '#ffc6d6' : '#f59ab8', add: false, rot: rr(0, 6), vr: rr(-3, 3), fadeIn: 0.5 });
          break;
        default:
          if (Math.random() < 0.35) P.spawn({ x, y, vx: rr(-12, 12), vy: rr(-12, 12), life: rr(2, 3.5), size: rr(4, 7), img: G.glow('#e8ff9a'), fadeIn: 0.8 });
      }
    }
    for (const pool of G.POOLS) {
      if (pool.kind !== 'lava') continue;
      if (pool.x < view.x - 200 || pool.x > view.x + view.w + 200 || pool.y < view.y - 200 || pool.y > view.y + view.h + 200) continue;
      if (Math.random() < dt * 14 * G.quality) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random());
        P.spawn({ x: pool.x + Math.cos(a) * pool.rx * 0.8 * d, y: pool.y + Math.sin(a) * pool.ry * 0.8 * d, vx: rr(-15, 15), vy: rr(-90, -40), life: rr(0.8, 1.4), size: rr(6, 12), img: G.glow('#ffb050', true) });
      }
    }
  };
})(window.G);
