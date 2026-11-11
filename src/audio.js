/* =====================================================================
 * audio.js — Âm thanh tạo bằng code (Web Audio API), không cần file mp3.
 * - Hiệu ứng: mỗi hành một "chất" tiếng riêng, có vị trí trái/phải.
 * - Nhạc nền ngũ cung: 5 âm Cung, Thương, Giốc, Chủy, Vũ ứng với
 *   Thổ, Kim, Mộc, Hỏa, Thủy. Mỗi vùng dùng điệu thức bắt đầu từ âm
 *   của hành vùng đó. Đang giao chiến thì thêm trống trận và mõ.
 * ===================================================================== */
(function (G) {
  'use strict';
  const A = (G.Audio = { ready: false, settings: { music: 0.55, sfx: 0.8, muted: false } });
  const KEY = 'ngu-hanh-giang-ho:audio';
  try { Object.assign(A.settings, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* bỏ qua */ }
  A.save = () => { try { localStorage.setItem(KEY, JSON.stringify(A.settings)); } catch (e) { /* bỏ qua */ } };

  let ctx = null, master, sfxBus, musicBus, verbIn, noiseBuf;
  let voices = 0;
  const MAX_VOICES = 48;

  /* ---------- Khởi tạo (phải gọi trong một thao tác của người chơi) ---------- */
  A.init = function () {
    if (ctx) {
      if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.25;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.connect(comp);
    sfxBus = ctx.createGain();
    sfxBus.connect(master);
    musicBus = ctx.createGain();
    musicBus.connect(master);
    // Vang (reverb) cho nhạc: phản hồi xung là tiếng ồn tắt dần
    const conv = ctx.createConvolver();
    conv.buffer = impulse(2.8, 2.4);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    verbIn = ctx.createGain();
    verbIn.connect(conv);
    conv.connect(wet);
    wet.connect(musicBus);
    // Bộ đệm tiếng ồn trắng dùng chung
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    A.apply();
    A.ready = true;
    startMusic();
  };
  function impulse(sec, decay) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    return b;
  }
  A.apply = function () {
    if (!ctx) return;
    const t = ctx.currentTime, s = A.settings;
    master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.05);
    sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    musicBus.gain.setTargetAtTime(s.music * 0.7, t, 0.05);
  };
  A.stats = () => ({ state: ctx && ctx.state, voices, step: M.step, area: M.area, combat: M.combat });
  A.setMuted = function (m) { A.settings.muted = m; A.apply(); A.save(); };
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  /* ---------- Khối tạo âm cơ bản ---------- */
  function route(node, pan, bus, verb) {
    let last = node;
    if (pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      last = p;
    }
    last.connect(bus);
    if (verb) {
      const s = ctx.createGain();
      s.gain.value = verb;
      last.connect(s);
      s.connect(verbIn);
    }
  }
  // Bao hình âm lượng: lên nhanh trong `a` giây, tắt dần trong `d` giây
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function filt(o, t, dur) {
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
    f.Q.value = o.Q || 0.8;
    return f;
  }
  // Âm có cao độ: f -> f2 trượt dần
  // Giới hạn số tiếng hiệu ứng cùng lúc; nhạc nền không bị giới hạn để không mất nốt
  const busy = (o) => voices > MAX_VOICES && (o.bus || sfxBus) === sfxBus;
  function tone(o) {
    if (busy(o)) return;
    const t = o.t || ctx.currentTime, a = o.a || 0.004, d = o.d || 0.1;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || a + d));
    const g = ctx.createGain();
    env(g, t, a, o.vol, d);
    let n = osc;
    if (o.filter) { const f = filt(o.filter, t, a + d); osc.connect(f); n = f; }
    n.connect(g);
    route(g, o.pan, o.bus || sfxBus, o.verb);
    voices++;
    osc.onended = () => voices--;
    osc.start(t);
    osc.stop(t + a + d + 0.05);
  }
  // Tiếng ồn có lọc: gió, lửa, đất đá, nổ
  function noise(o) {
    if (busy(o)) return;
    const t = o.t || ctx.currentTime, a = o.a || 0.004, d = o.d || 0.1;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const g = ctx.createGain();
    env(g, t, a, o.vol, d);
    let n = src;
    if (o.filter) { const f = filt(o.filter, t, a + d); src.connect(f); n = f; }
    n.connect(g);
    route(g, o.pan, o.bus || sfxBus, o.verb);
    voices++;
    src.onended = () => voices--;
    src.start(t, Math.random());
    src.stop(t + a + d + 0.05);
  }
  // Tiếng gảy dây kiểu đàn tranh: thân đàn + bội âm, uốn cao độ nhẹ lúc gảy
  function pluck(f, t, vol, dur, pan, bus, verb) {
    tone({ t, f: f * 1.012, f2: f, slide: 0.05, type: 'triangle', a: 0.003, d: dur, vol, pan, bus, verb, filter: { type: 'lowpass', f: 4200, f2: 900, Q: 0.7 } });
    tone({ t, f: f * 2, type: 'sine', a: 0.002, d: dur * 0.45, vol: vol * 0.35, pan, bus, verb });
  }
  // Chiêng: các họa âm không chẵn, ngân dài
  function gong(f, t, vol, pan) {
    const parts = [[1, 1], [1.48, 0.55], [2.02, 0.4], [2.76, 0.25], [3.43, 0.15]];
    for (const [m, v] of parts) tone({ t, f: f * m, f2: f * m * 0.985, slide: 2.5, type: 'sine', a: 0.01, d: 2.6 - m * 0.3, vol: vol * v, pan, bus: sfxBus });
    noise({ t, d: 0.08, vol: vol * 0.4, filter: { type: 'bandpass', f: 1200, Q: 1 } });
  }

  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const PENTA = [0, 2, 4, 7, 9]; // Cung, Thương, Giốc, Chủy, Vũ
  function scaleNotes(root, modeDeg, count) {
    const out = [];
    for (let i = 0; out.length < count; i++) {
      const deg = (modeDeg + i) % 5, oct = Math.floor((modeDeg + i) / 5);
      out.push(root + PENTA[deg] + oct * 12);
    }
    return out;
  }

  /* ---------- Chất tiếng theo hành ---------- */
  function elementTint(el, t, v, pan, big) {
    const k = big ? 1.4 : 1;
    switch (el) {
      case 'kim':
        tone({ t, f: 2350, type: 'sine', d: 0.35 * k, vol: 0.13 * v, pan });
        tone({ t, f: 3520, type: 'sine', d: 0.22 * k, vol: 0.08 * v, pan });
        noise({ t, d: 0.06, vol: 0.12 * v, pan, filter: { type: 'highpass', f: 5000 } });
        break;
      case 'moc':
        tone({ t, f: 330, f2: 440, type: 'triangle', d: 0.12, vol: 0.14 * v, pan });
        noise({ t, a: 0.02, d: 0.2 * k, vol: 0.14 * v, pan, filter: { type: 'bandpass', f: 1500, Q: 0.7 } });
        break;
      case 'thuy':
        tone({ t, f: 1500, f2: 480, type: 'sine', d: 0.18 * k, vol: 0.16 * v, pan });
        tone({ t: t + 0.03, f: 2800, f2: 2200, type: 'sine', d: 0.12, vol: 0.07 * v, pan });
        break;
      case 'hoa':
        noise({ t, a: 0.03, d: 0.3 * k, vol: 0.22 * v, pan, filter: { type: 'lowpass', f: 500, f2: 3200, Q: 0.6 } });
        tone({ t, f: 95, f2: 55, type: 'sine', d: 0.2, vol: 0.2 * v, pan });
        break;
      case 'tho':
        tone({ t, f: 75, f2: 45, type: 'sine', d: 0.3 * k, vol: 0.28 * v, pan });
        noise({ t, d: 0.22 * k, vol: 0.16 * v, pan, filter: { type: 'lowpass', f: 600, f2: 200 } });
        break;
    }
  }

  /* ---------- Thư viện tiếng hiệu ứng ---------- */
  const SFX = {
    click(o) { tone({ f: 1300, f2: 1100, type: 'triangle', d: 0.05, vol: 0.1 * o.v }); },
    swing(o) {
      noise({ a: 0.02, d: 0.14, vol: 0.26 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 700, f2: 3200, Q: 1.4 } });
      if (!o.soft) elementTint(o.el, ctx.currentTime + 0.02, o.v * 0.45, o.pan);
    },
    cast(o) {
      const t = ctx.currentTime;
      if (o.type === 'projectile') {
        noise({ d: 0.08, vol: 0.12 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 2200, Q: 1 } });
        elementTint(o.el, t, o.v * (o.soft ? 0.4 : 0.7), o.pan, o.ult);
      } else if (o.type === 'dash') {
        noise({ a: 0.03, d: 0.22, vol: 0.3 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 400, f2: 2600, Q: 1.2 } });
        elementTint(o.el, t, o.v * 0.6, o.pan);
      } else if (o.type === 'buff') {
        const notes = scaleNotes(74, 0, 6);
        notes.forEach((n, i) => pluck(NOTE(n), t + i * 0.06, 0.12 * o.v, 0.5, o.pan, sfxBus));
        noise({ a: 0.25, d: 0.4, vol: 0.1 * o.v, filter: { type: 'highpass', f: 3000, f2: 7000 } });
        elementTint(o.el, t, o.v * 0.6, o.pan, true);
      } else if (o.type === 'chain') {
        for (let i = 0; i < 4; i++) tone({ t: t + i * 0.07, f: o.el === 'moc' ? 160 : 900, f2: o.el === 'moc' ? 110 : 300, type: 'sawtooth', d: 0.07, vol: 0.08 * o.v, pan: o.pan, filter: { type: 'lowpass', f: 1800 } });
        elementTint(o.el, t, o.v * 0.6, o.pan);
      } else {
        elementTint(o.el, t, o.v * 0.6, o.pan, o.ult);
      }
      if (o.ult) gong(98, t, 0.22 * o.v, o.pan);
    },
    hit(o) {
      tone({ f: 180, f2: 55, type: 'sine', d: 0.1, vol: 0.38 * o.v, pan: o.pan });
      noise({ d: 0.045, vol: 0.2 * o.v, pan: o.pan, filter: { type: 'highpass', f: 1500 } });
      if (o.el === 'kim') tone({ f: 3100, type: 'sine', d: 0.08, vol: 0.06 * o.v, pan: o.pan });
      if (o.crit) {
        tone({ f: 1760, f2: 1320, type: 'triangle', d: 0.22, vol: 0.16 * o.v, pan: o.pan });
        noise({ d: 0.12, vol: 0.18 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 3500, Q: 2 } });
      }
    },
    hurt(o) {
      tone({ f: 210, f2: 120, type: 'sawtooth', d: 0.14, vol: 0.18 * o.v, filter: { type: 'lowpass', f: 900 } });
      tone({ f: 120, f2: 60, type: 'sine', d: 0.12, vol: 0.3 * o.v });
    },
    boom(o) {
      const s = Math.min(2, o.size || 1), t = ctx.currentTime;
      tone({ f: 120, f2: 34, type: 'sine', d: 0.45 + 0.25 * s, vol: 0.55 * o.v, pan: o.pan });
      noise({ a: 0.005, d: 0.5 * s, vol: 0.35 * o.v, pan: o.pan, filter: { type: 'lowpass', f: 2400, f2: 180 } });
      switch (o.el) {
        case 'hoa':
          for (let i = 0; i < 6; i++) noise({ t: t + 0.05 + Math.random() * 0.4, d: 0.03, vol: 0.12 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 2500 + Math.random() * 2000, Q: 3 } });
          break;
        case 'thuy':
          for (let i = 0; i < 6; i++) tone({ t: t + Math.random() * 0.25, f: 2000 + Math.random() * 2200, type: 'sine', d: 0.15, vol: 0.06 * o.v, pan: o.pan });
          break;
        case 'kim':
          tone({ t, f: 1760, type: 'sine', d: 1.2, vol: 0.1 * o.v, pan: o.pan });
          tone({ t, f: 2637, type: 'sine', d: 0.9, vol: 0.06 * o.v, pan: o.pan });
          break;
        case 'tho':
          tone({ t: t + 0.05, f: 52, f2: 40, type: 'sine', d: 0.9, vol: 0.3 * o.v, pan: o.pan });
          for (let i = 0; i < 4; i++) noise({ t: t + 0.08 + i * 0.07, d: 0.05, vol: 0.12 * o.v, pan: o.pan, filter: { type: 'lowpass', f: 900 } });
          break;
        case 'moc':
          for (let i = 0; i < 3; i++) tone({ t: t + i * 0.06, f: 260 + i * 60, type: 'triangle', d: 0.1, vol: 0.1 * o.v, pan: o.pan });
          break;
      }
    },
    tick(o) {
      switch (o.vfx) {
        case 'needles': for (let i = 0; i < 3; i++) tone({ t: ctx.currentTime + i * 0.04, f: 2800 + Math.random() * 1500, type: 'sine', d: 0.04, vol: 0.05 * o.v, pan: o.pan }); break;
        case 'cloud': noise({ a: 0.05, d: 0.3, vol: 0.06 * o.v, pan: o.pan, filter: { type: 'lowpass', f: 600 } }); break;
        case 'snow': noise({ a: 0.05, d: 0.28, vol: 0.08 * o.v, pan: o.pan, filter: { type: 'highpass', f: 3000 } }); break;
        case 'vortex': noise({ a: 0.08, d: 0.25, vol: 0.1 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 500, f2: 900, Q: 2 } }); break;
        case 'sandstorm': noise({ a: 0.05, d: 0.3, vol: 0.09 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 1200, Q: 0.5 } }); break;
        default: noise({ d: 0.06, vol: 0.08 * o.v, pan: o.pan, filter: { type: 'bandpass', f: 1500, Q: 1 } });
      }
    },
    warn(o) {
      const t = ctx.currentTime;
      tone({ t, f: 330, type: 'triangle', d: 0.18, vol: 0.12 * o.v, pan: o.pan });
      tone({ t: t + 0.2, f: 262, type: 'triangle', d: 0.25, vol: 0.12 * o.v, pan: o.pan });
    },
    death(o) {
      tone({ f: o.big ? 300 : 520, f2: o.big ? 60 : 130, type: 'triangle', d: o.big ? 0.8 : 0.32, vol: 0.14 * o.v, pan: o.pan });
      noise({ a: 0.01, d: 0.3, vol: 0.12 * o.v, pan: o.pan, filter: { type: 'lowpass', f: 900, f2: 200 } });
      if (o.big) gong(73, ctx.currentTime, 0.3 * o.v, o.pan);
    },
    defeat(o) { gong(55, ctx.currentTime, 0.45 * o.v); },
    gold(o) {
      const t = ctx.currentTime;
      tone({ t, f: 1568, type: 'triangle', d: 0.08, vol: 0.09 * o.v });
      tone({ t: t + 0.06, f: 2093, type: 'triangle', d: 0.18, vol: 0.09 * o.v });
    },
    item(o) {
      const t = ctx.currentTime, r = o.rarity || 0;
      const notes = scaleNotes(79, 0, 2 + r * 2);
      notes.forEach((n, i) => pluck(NOTE(n), t + i * 0.07, (0.08 + r * 0.03) * o.v, 0.6, 0, sfxBus));
      if (r >= 3) gong(147, t + 0.1, 0.18 * o.v);
    },
    equip(o) {
      noise({ a: 0.02, d: 0.15, vol: 0.14 * o.v, filter: { type: 'bandpass', f: 1800, Q: 0.8 } });
      tone({ t: ctx.currentTime + 0.05, f: 880, type: 'triangle', d: 0.12, vol: 0.06 * o.v });
    },
    potion(o) {
      const t = ctx.currentTime;
      for (let i = 0; i < 3; i++) tone({ t: t + i * 0.08, f: 280 + i * 90, f2: 650 + i * 120, type: 'sine', d: 0.07, vol: 0.12 * o.v });
    },
    levelup(o) {
      const t = ctx.currentTime;
      gong(110, t, 0.35 * o.v);
      scaleNotes(62, 0, 9).forEach((n, i) => pluck(NOTE(n), t + 0.15 + i * 0.07, 0.13 * o.v, 0.9, 0, sfxBus));
    },
    quest(o) {
      const t = ctx.currentTime;
      [74, 79, 81, 86].forEach((n, i) => pluck(NOTE(n), t + i * 0.11, 0.15 * o.v, 1.1, 0, sfxBus));
      gong(147, t + 0.4, 0.22 * o.v);
    },
    elchange(o) { gong(82, ctx.currentTime, 0.4 * o.v, o.pan); },
  };

  /* ---------- Gọi tiếng từ game: G.sfx('hit', { x, y, el, crit }) ---------- */
  const last = {};
  const GAP = { hit: 0.03, hurt: 0.08, swing: 0.03, cast: 0.03, boom: 0.05, tick: 0.12, death: 0.04, gold: 0.05, warn: 0.3 };
  G.sfx = function (name, o) {
    if (!ctx || ctx.state !== 'running' || A.settings.muted) return;
    const fn = SFX[name];
    if (!fn) return;
    o = o || {};
    const now = ctx.currentTime;
    if (last[name] && now - last[name] < (GAP[name] || 0.02)) return;
    last[name] = now;
    o.v = o.vol || 1;
    if (o.x != null) {
      const S = G.S, cx = S.player ? S.player.x : S.cam.x, cy = S.player ? S.player.y : S.cam.y;
      const dx = o.x - cx, dy = o.y - cy, d = Math.hypot(dx, dy);
      if (d > 1100) return;
      o.v *= Math.max(0.12, 1 - d / 1100);
      o.pan = Math.max(-0.85, Math.min(0.85, dx / 520));
    }
    fn(o);
  };

  /* =================== NHẠC NỀN =================== */
  // Điệu thức theo hành: Thổ-Cung, Kim-Thương, Mộc-Giốc, Hỏa-Chủy, Thủy-Vũ
  const MODE = { tho: 0, kim: 1, moc: 2, hoa: 3, thuy: 4, village: 0, meadow: 3, menu: 4 };
  const KEYROOT = 62; // Rê
  const M = { step: 0, nextT: 0, area: 'menu', combat: 0, boss: false, phrase: 0, rest: 4, idx: 5, drone: null, timer: null };

  function startMusic() {
    M.nextT = ctx.currentTime + 0.15;
    makeDrone();
    M.timer = setInterval(schedule, 60);
  }
  function makeDrone() {
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 520;
    f.Q.value = 0.6;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07;
    lg.gain.value = 180;
    lfo.connect(lg);
    lg.connect(f.frequency);
    lfo.start();
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle';
    o2.type = 'triangle';
    o2.detune.value = 4;
    o1.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(musicBus);
    const s = ctx.createGain();
    s.gain.value = 0.3;
    g.connect(s);
    s.connect(verbIn);
    o1.start();
    o2.start();
    M.drone = { g, o1, o2 };
    setDrone(true);
  }
  function rootOf(area) { return KEYROOT + PENTA[MODE[area] != null ? MODE[area] : 0]; }
  function setDrone(first) {
    const t = ctx.currentTime, r = rootOf(M.area);
    M.drone.o1.frequency.setTargetAtTime(NOTE(r - 24), t, first ? 0.01 : 1.5);
    M.drone.o2.frequency.setTargetAtTime(NOTE(r - 17), t, first ? 0.01 : 1.5);
    M.drone.g.gain.setTargetAtTime(M.area === 'menu' ? 0.05 : 0.04, t, 2);
  }

  // Được gọi mỗi khung hình từ game.js để báo khu vực & tình trạng giao chiến
  A.update = function (area, inCombat, bossNear) {
    if (!ctx) return;
    if (area !== M.area) { M.area = area; setDrone(false); }
    M.combat = inCombat ? 1 : 0;
    M.boss = bossNear;
  };

  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    if (M.nextT < ctx.currentTime - 0.2) M.nextT = ctx.currentTime + 0.05;
    while (M.nextT < ctx.currentTime + 0.3) {
      playStep(M.step, M.nextT);
      const bpm = M.boss ? 92 : M.combat ? 84 : M.area === 'menu' ? 64 : 72;
      M.nextT += 60 / bpm / 2;
      M.step++;
    }
  }

  function playStep(step, t) {
    const pos = step % 8;
    const root = rootOf(M.area), mode = MODE[M.area] != null ? MODE[M.area] : 0;
    const scale = scaleNotes(KEYROOT - 12, mode, 15); // hơn 2 quãng tám, bắt đầu từ âm chủ của điệu
    const B = musicBus;
    // Bè trầm: gảy âm chủ đầu mỗi ô nhịp, âm át ở giữa
    if (pos === 0) pluck(NOTE(root - 24), t, 0.22, 1.6, -0.2, B, 0.25);
    if (pos === 4 && Math.random() < 0.6) pluck(NOTE(root - 17), t, 0.13, 1.2, -0.2, B, 0.25);

    // Giai điệu đàn tranh: đi từng bậc ngẫu nhiên trong thang ngũ cung, theo từng câu nhạc
    const density = M.area === 'menu' ? 0.45 : M.combat ? 0.8 : 0.6;
    if (M.phrase > 0) {
      M.phrase--;
      if (Math.random() < density) {
        M.idx = Math.max(3, Math.min(scale.length - 1, M.idx + [-2, -1, -1, 1, 1, 2, 0][(Math.random() * 7) | 0]));
        let note = scale[M.idx];
        if (M.phrase === 0) note = scale[M.idx >= 10 ? 10 : 5]; // kết câu về âm chủ
        const pan = Math.random() * 0.5 - 0.1;
        pluck(NOTE(note), t, 0.11, 1.4, pan, B, 0.5);
        if (Math.random() < 0.12) {
          // vê (tremolo) như ngón đàn tranh
          const dt = 60 / 72 / 8;
          for (let i = 1; i < 4; i++) pluck(NOTE(note), t + i * dt, 0.07, 0.4, pan, B, 0.5);
        }
      }
    } else if (M.rest > 0) M.rest--;
    else {
      M.phrase = 6 + ((Math.random() * 8) | 0);
      M.rest = M.area === 'menu' ? 6 + ((Math.random() * 6) | 0) : 3 + ((Math.random() * 5) | 0);
      if (Math.random() < 0.3) {
        // lướt dây (glissando) mở đầu câu
        const start = 3 + ((Math.random() * 4) | 0);
        for (let i = 0; i < 5; i++) pluck(NOTE(scale[start + i]), t + i * 0.045, 0.07, 0.8, 0.2, B, 0.5);
        M.idx = start + 4;
      }
    }

    // Trống trận và mõ khi đang giao chiến
    if (M.combat) {
      if (pos === 0 || pos === 3 || (M.boss && pos === 6)) {
        tone({ t, f: 95, f2: 42, type: 'sine', d: 0.35, vol: 0.32, bus: B });
        noise({ t, d: 0.06, vol: 0.08, bus: B, filter: { type: 'lowpass', f: 700 } });
      }
      if (pos === 4) tone({ t, f: 140, f2: 70, type: 'sine', d: 0.22, vol: 0.2, bus: B });
      if (pos % 2 === 1 && Math.random() < 0.7) tone({ t, f: 980, type: 'sine', d: 0.05, vol: 0.06, bus: B, filter: { type: 'bandpass', f: 1000, Q: 4 } });
    } else if (pos === 0 && step % 32 === 0 && M.area !== 'menu') {
      tone({ t, f: 660, type: 'sine', d: 0.6, vol: 0.04, bus: B, verb: 0.6 });
    }
  }
})(window.G);
