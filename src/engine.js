/* =====================================================================
 * engine.js — Lõi engine
 * Tiện ích toán học, sprite phát sáng, hệ thống hạt (particle),
 * chữ bay (damage number), hiệu ứng ngắn (FX), hẹn giờ và bàn phím.
 * ===================================================================== */
window.G = window.G || {};
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;
  G.TAU = TAU;

  /* ---------- Toán học ---------- */
  G.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.lerp = (a, b, t) => a + (b - a) * t;
  G.rr = (a, b) => a + Math.random() * (b - a);
  G.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  G.easeOut = (t) => 1 - (1 - t) * (1 - t);
  G.angDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    return d;
  };
  // Bộ sinh số ngẫu nhiên có seed: cùng seed -> cùng bản đồ mỗi lần chơi
  G.mulberry32 = function (a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  G.makeCanvas = function (w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  G.rgba = function (hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  };

  // Polyfill roundRect cho trình duyệt cũ
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      r = Math.min(typeof r === 'number' ? r : 4, w / 2, h / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }

  /* ---------- Sprite phát sáng (vẽ sẵn 1 lần, dùng lại mãi) ----------
   * Thay vì dùng ctx.shadowBlur (rất chậm), ta vẽ trước một hình tròn
   * gradient mờ dần rồi drawImage nó với chế độ cộng màu 'lighter'.   */
  const glowCache = new Map();
  G.glow = function (color, hot) {
    const key = color + (hot ? '*' : '');
    let c = glowCache.get(key);
    if (c) return c;
    c = G.makeCanvas(64, 64);
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (hot) {
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.22, G.rgba(color, 0.95));
    } else {
      gr.addColorStop(0, G.rgba(color, 1));
    }
    gr.addColorStop(0.5, G.rgba(color, 0.32));
    gr.addColorStop(1, G.rgba(color, 0));
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(key, c);
    return c;
  };

  /* ---------- Hệ thống hạt (object pool, không tạo rác bộ nhớ) ---------- */
  G.quality = 1; // giảm khi máy yếu
  const P = (G.Particles = { list: [], pool: [], max: 1400 });

  P.spawn = function (o) {
    if (P.list.length >= P.max) return null;
    const p = P.pool.pop() || {};
    p.x = o.x; p.y = o.y;
    p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.life = p.max = o.life || 0.6;
    p.s0 = o.size != null ? o.size : 8;
    p.s1 = o.sizeEnd != null ? o.sizeEnd : 0;
    p.a = o.alpha != null ? o.alpha : 1;
    p.drag = o.drag || 0;
    p.g = o.gravity || 0;
    p.add = o.add !== false;
    p.img = o.img || null;
    p.color = o.color || '#ffffff';
    p.shape = o.shape || (p.img ? 'img' : 'rect');
    p.rot = o.rot || 0;
    p.vr = o.vr || 0;
    p.fade = o.fadeIn || 0;
    P.list.push(p);
    return p;
  };

  P.update = function (dt) {
    const L = P.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) {
        L[i] = L[L.length - 1];
        L.pop();
        P.pool.push(p);
        continue;
      }
      if (p.drag) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k; p.vy *= k;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  };

  // additive=true: chỉ vẽ hạt phát sáng (chế độ cộng màu), false: hạt thường (khói, đá vụn)
  P.draw = function (ctx, view, additive) {
    const L = P.list;
    const x0 = view.x - 40, y0 = view.y - 40, x1 = view.x + view.w + 40, y1 = view.y + view.h + 40;
    ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      if (p.add !== additive) continue;
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const t = 1 - p.life / p.max;
      const size = p.s0 + (p.s1 - p.s0) * t;
      if (size <= 0.3) continue;
      let a;
      if (p.fade) {
        const age = p.max - p.life;
        a = p.a * Math.min(1, age / p.fade, p.life / p.fade);
      } else {
        a = p.a * (p.life / p.max);
      }
      if (a <= 0.01) continue;
      ctx.globalAlpha = a > 1 ? 1 : a;
      switch (p.shape) {
        case 'img':
          ctx.drawImage(p.img, p.x - size / 2, p.y - size / 2, size, size);
          break;
        case 'line':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
          break;
        case 'leaf':
          ctx.fillStyle = p.color;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.ellipse(0, 0, size, size * 0.42, 0, 0, TAU);
          ctx.fill();
          ctx.rotate(-p.rot);
          ctx.translate(-p.x, -p.y);
          break;
        default:
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------- Chữ bay (số sát thương, kinh nghiệm...) ---------- */
  const T = (G.Texts = { list: [] });
  T.add = function (x, y, text, color, size, life) {
    if (T.list.length > 70) T.list.shift();
    T.list.push({ x: x + G.rr(-8, 8), y, text, color, size: size || 16, life: life || 0.9, max: life || 0.9, vy: -70, vx: G.rr(-18, 18) });
  };
  T.update = function (dt) {
    for (let i = T.list.length - 1; i >= 0; i--) {
      const t = T.list[i];
      t.life -= dt;
      if (t.life <= 0) { T.list.splice(i, 1); continue; }
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 60 * dt;
    }
  };
  T.draw = function (ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of T.list) {
      const age = t.max - t.life;
      const pop = age < 0.12 ? 1 + (0.12 - age) * 4 : 1;
      ctx.globalAlpha = Math.min(1, t.life / 0.3);
      ctx.font = '800 ' + Math.round(t.size * pop) + 'px "Be Vietnam Pro", system-ui, sans-serif';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(10,8,6,0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- FX: hiệu ứng có hình dạng (vòng, nhát chém, tia...) ---------- */
  const F = (G.Fx = { list: [] });
  F.add = function (o) {
    o.t = 0;
    o.layer = o.layer || 'top';
    F.list.push(o);
    return o;
  };
  F.update = function (dt) {
    for (let i = F.list.length - 1; i >= 0; i--) {
      const f = F.list[i];
      f.t += dt;
      if (f.t >= f.dur) F.list.splice(i, 1);
    }
  };
  F.draw = function (ctx, layer) {
    for (const f of F.list) {
      if (f.layer !== layer) continue;
      const fn = G.FX_DRAW[f.type];
      if (fn) fn(ctx, f, Math.min(1, f.t / f.dur));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------- Hẹn giờ: G.after(giây, hàm) ---------- */
  G.timers = [];
  G.after = (t, fn) => G.timers.push({ t, fn });
  G.updateTimers = function (dt) {
    const due = [];
    for (let i = G.timers.length - 1; i >= 0; i--) {
      const tm = G.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) { due.push(tm.fn); G.timers.splice(i, 1); }
    }
    for (let i = due.length - 1; i >= 0; i--) due[i]();
  };

  /* ---------- Bàn phím ---------- */
  const I = (G.Input = { keys: new Set(), pressed: new Set() });
  const BLOCK = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (BLOCK.has(e.code)) e.preventDefault();
    if (!I.keys.has(e.code)) I.pressed.add(e.code);
    I.keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => I.keys.delete(e.code));
  window.addEventListener('blur', () => I.keys.clear());
  I.take = (code) => {
    if (I.pressed.has(code)) { I.pressed.delete(code); return true; }
    return false;
  };
  I.endFrame = () => I.pressed.clear();
})(window.G);
