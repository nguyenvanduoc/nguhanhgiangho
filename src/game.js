/* =====================================================================
 * game.js — Vòng lặp game, camera, vẽ khung hình, điều khiển, giao diện
 * ===================================================================== */
(function (G) {
  'use strict';
  const S = G.S, W = G.WORLD, E = G.ELEMENTS, TAU = G.TAU;
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'ngu-hanh-giang-ho:v1';

  S.mode = 'menu';
  S.time = 0;
  S.cam = { x: W.cx, y: W.cy, shake: 0 };
  S.flash = null;
  S.auto = false;
  S.paused = false;
  S.target = null;
  S.player = null;
  S.npcs = [];

  let canvas, ctx, vw = 0, vh = 0, dpr = 1, resScale = 1, zoom = 1, vignette = null;
  const view = { x: 0, y: 0, w: 0, h: 0 };
  const touch = matchMedia('(pointer: coarse)').matches;
  let selectedSect = G.SECTS[0].id;
  const held = [false, false, false, false];

  /* ---------- Lưu / tải ---------- */
  function getSave() {
    const p = S.player;
    return p ? { sect: p.sect.id, name: p.name, lv: p.lv, exp: p.exp, potions: p.potions, gold: p.gold, equip: p.equip, bag: p.bag, quest: S.quest } : null;
  }
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && G.SECT_BY_ID[s.sect]) return s;
    } catch (e) { /* bộ nhớ trình duyệt bị chặn */ }
    return null;
  }
  G.saveGame = function () {
    const s = getSave();
    if (!s) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) { /* bỏ qua */ }
  };

  /* ---------- Kích thước canvas + độ phân giải tự thích ứng ---------- */
  function resize() {
    vw = window.innerWidth;
    vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const k = dpr * resScale;
    canvas.width = Math.round(vw * k);
    canvas.height = Math.round(vh * k);
    zoom = G.clamp(Math.min(vw, vh) / 640, 0.62, 1.25);
    vignette = G.makeCanvas(canvas.width, canvas.height);
    const g = vignette.getContext('2d');
    const gr = g.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.35, canvas.width / 2, canvas.height / 2, Math.hypot(canvas.width, canvas.height) * 0.55);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, 'rgba(6,8,10,0.6)');
    g.fillStyle = gr;
    g.fillRect(0, 0, vignette.width, vignette.height);
  }
  let perfAcc = 0, perfN = 0, perfT = 0, fpsShow = 60;
  function adapt(rawDt) {
    perfAcc += rawDt; perfN++; perfT += rawDt;
    if (perfT < 2) return;
    const avg = perfAcc / perfN;
    fpsShow = Math.round(1 / avg);
    if (avg > 1 / 42 && resScale > 0.55) { resScale = Math.max(0.55, resScale - 0.15); G.quality = Math.max(0.5, G.quality - 0.2); resize(); }
    else if (avg < 1 / 57 && resScale < 1) { resScale = Math.min(1, resScale + 0.1); G.quality = Math.min(1, G.quality + 0.1); resize(); }
    perfAcc = perfN = perfT = 0;
  }

  /* ---------- Thông báo ---------- */
  G.toast = function (msg, kind) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast' + (kind ? ' ' + kind : '');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  };
  G.banner = function (title, sub) {
    const b = $('banner');
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = sub || '';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  };
  const PANELS = ['wheel', 'bag', 'guide', 'dialog'];
  G.openPanel = function (name) {
    for (const id of PANELS) $(id).hidden = id !== name;
    S.paused = !!name && S.mode === 'play';
    if (name === 'bag') G.renderBag();
  };
  const anyPanel = () => PANELS.some((id) => !$(id).hidden);
  function togglePanel(name) {
    if (name === 'bag' && !S.player) return;
    G.openPanel($(name).hidden ? name : null);
  }
  G.onPlayerDeath = function () {
    G.openPanel(null);
    $('death').hidden = false;
    S.auto = false;
    syncAuto();
  };
  G.onPlayerRespawn = function () {
    $('death').hidden = true;
  };

  /* ---------- Điều khiển: chuột, chạm, cần điều khiển ảo ---------- */
  const joy = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  let mouseHold = false, mouseX = 0, mouseY = 0;
  function toWorld(sx, sy) { return { x: view.x + sx / zoom, y: view.y + sy / zoom }; }
  function pickMonster(wx, wy) {
    let best = null, bd = 9999;
    for (const m of S.monsters) {
      if (m.dead) continue;
      const h = G.bodyHeight(m);
      const d = Math.hypot(m.x - wx, m.y - h * 0.5 - wy);
      if (d < m.r + 22 && d < bd) { bd = d; best = m; }
    }
    return best;
  }
  function bindInput() {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (S.mode !== 'play' || !S.player || S.player.dead) return;
      const w = toWorld(e.clientX, e.clientY);
      const npc = G.pickNPC(w.x, w.y);
      if (npc) {
        S.player.pending = null;
        if (Math.hypot(npc.x - S.player.x, npc.y - S.player.y) < 90) G.talk(npc);
        else { S.player.moveTo = { x: npc.x, y: npc.y + 30 }; S.player.talkTo = npc; }
        return;
      }
      const m = pickMonster(w.x, w.y);
      if (m) {
        S.target = m;
        S.player.pending = { slot: 0, tgt: m };
        S.player.moveTo = null;
      } else {
        S.player.moveTo = w;
        S.player.pending = null;
        G.Fx.add({ type: 'click', x: w.x, y: w.y, dur: 0.4, layer: 'ground' });
        if (e.pointerType === 'mouse') { mouseHold = true; mouseX = e.clientX; mouseY = e.clientY; }
      }
    });
    window.addEventListener('pointermove', (e) => { if (mouseHold) { mouseX = e.clientX; mouseY = e.clientY; } });
    window.addEventListener('pointerup', () => { mouseHold = false; });

    const jz = $('joyzone'), base = $('joyBase'), knob = $('joyKnob');
    jz.addEventListener('pointerdown', (e) => {
      if (joy.id !== null) return;
      joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.dx = joy.dy = 0;
      jz.setPointerCapture(e.pointerId);
      base.style.transform = 'translate(' + (e.clientX - 56) + 'px,' + (e.clientY - 56) + 'px)';
      base.classList.add('on');
      knob.style.transform = 'translate(0px,0px)';
    });
    jz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joy.id) return;
      let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
      const d = Math.hypot(dx, dy), R = 46;
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      joy.dx = dx / R; joy.dy = dy / R;
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    });
    const end = (e) => {
      if (e.pointerId !== joy.id) return;
      joy.id = null; joy.dx = joy.dy = 0;
      base.classList.remove('on');
    };
    jz.addEventListener('pointerup', end);
    jz.addEventListener('pointercancel', end);
  }
  function readMove() {
    const k = G.Input.keys;
    let x = 0, y = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (joy.id !== null && Math.hypot(joy.dx, joy.dy) > 0.18) { x = joy.dx; y = joy.dy; }
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    return { x, y };
  }

  function handleKeys() {
    const I = G.Input;
    if (I.take('KeyH')) togglePanel('guide');
    if (I.take('Escape')) { if (anyPanel()) G.openPanel(null); else S.target = null; }
    if (S.mode !== 'play') return;
    if (I.take('KeyN')) togglePanel('wheel');
    if (I.take('KeyI') || I.take('KeyB')) togglePanel('bag');
    if (S.paused) return;
    if (I.take('KeyR')) { const n = G.npcNear(S.player, 100); if (n) G.talk(n); }
    if (I.take('Digit1') || I.take('KeyK')) G.trySkill(1);
    if (I.take('Digit2') || I.take('KeyL')) G.trySkill(2);
    if (I.take('Digit3') || I.take('KeyU')) G.trySkill(3);
    if (I.keys.has('Space') || I.keys.has('KeyJ') || held[0]) G.trySkill(0, true);
    for (let i = 1; i < 4; i++) if (held[i]) G.trySkill(i, true);
    if (I.take('KeyQ')) G.usePotion('hp');
    if (I.take('KeyE')) G.usePotion('mp');
    if (I.take('KeyZ')) { S.auto = !S.auto; syncAuto(); }
    if (I.take('KeyF')) $('fps').hidden = !$('fps').hidden;
    if (I.take('Tab')) cycleTarget();
  }
  function cycleTarget() {
    const p = S.player;
    const list = S.monsters.filter((m) => !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 600).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    if (!list.length) return;
    const i = list.indexOf(S.target);
    S.target = list[(i + 1) % list.length];
  }

  // Chế độ tự động đánh: chọn quái gần nhất, ưu tiên chiêu mạnh nhất đã hồi
  function autoFight(moving) {
    const p = S.player;
    if (!S.auto || !p || p.dead || moving || p.dash) return;
    if (p.hp < p.maxHp * 0.35 && p.potions.hp > 0) G.usePotion('hp');
    if (p.mp < p.maxMp * 0.15 && p.potions.mp > 0) G.usePotion('mp');
    if (p.pending) return;
    const loot = G.nearestLoot(p, 220);
    if (loot && !(G.alive(S.target) && S.target.ai === 'chase')) { p.moveTo = { x: loot.x, y: loot.y }; return; }
    if (!G.alive(S.target) || Math.hypot(S.target.x - p.x, S.target.y - p.y) > 650) S.target = G.nearestEnemy(p, 600);
    if (!S.target) return;
    for (const slot of [3, 2, 1, 0]) {
      const sk = p.sect.skills[slot];
      if (p.lv < sk.unlock || p.cds[slot] > 0 || p.mp < sk.mp + (slot ? 8 : 0)) continue;
      if (sk.type === 'buff' && p.buffs.some((b) => b.id === sk.id)) continue;
      G.trySkill(slot, true);
      return;
    }
  }
  function syncAuto() {
    const b = $('btnAuto');
    b.classList.toggle('on', S.auto);
    b.setAttribute('aria-pressed', S.auto ? 'true' : 'false');
  }

  /* ---------- Cập nhật mỗi khung hình ---------- */
  const activeBuf = [];
  function update(dt) {
    S.time += dt;
    G.updateTimers(dt);
    handleKeys();
    const p = S.player;
    if (S.mode === 'play' && p && S.paused && G.bagDirty && !$('bag').hidden) G.renderBag();
    if (S.mode === 'play' && p && !S.paused) {
      const mv = readMove();
      if (mouseHold && !p.dead) {
        const w = toWorld(mouseX, mouseY);
        p.moveTo = w;
        p.pending = null;
      }
      autoFight(mv.x || mv.y || mouseHold);
      G.updatePlayer(p, dt, mv);
      activeBuf.length = 0;
      for (const m of S.monsters) {
        G.updateMonster(m, dt, p);
        if (!m.dead && Math.abs(m.x - p.x) < 900 && Math.abs(m.y - p.y) < 900) activeBuf.push(m);
      }
      G.separate(activeBuf);
      G.updateProjectiles(dt);
      G.updateGrounds(dt);
      G.updateLoot(dt);
      G.updateNPCs();
      if (p.talkTo) {
        if (p.moveTo === null || p.pending) p.talkTo = null;
        else if (Math.hypot(p.talkTo.x - p.x, p.talkTo.y - p.y) < 90) { const n = p.talkTo; p.talkTo = null; p.moveTo = null; G.talk(n); }
      }
      if (S.target && S.target.dead) S.target = null;
      S.saveT = (S.saveT || 0) + dt;
      if (S.saveT > 15) { S.saveT = 0; G.saveGame(); }
      const k = 1 - Math.exp(-8 * dt);
      S.cam.x += (p.x - S.cam.x) * k;
      S.cam.y += (p.y - 20 - S.cam.y) * k;
    } else if (S.mode === 'menu') {
      S.cam.x = W.cx + Math.cos(S.time * 0.06) * 260;
      S.cam.y = W.cy + Math.sin(S.time * 0.06) * 170;
    }
    if (!S.paused) {
      G.Particles.update(dt);
      G.Texts.update(dt);
      G.Fx.update(dt);
    }
    S.cam.shake = Math.max(0, S.cam.shake - dt * 40);
    if (S.flash) { S.flash.a -= dt * 1.4; if (S.flash.a <= 0) S.flash = null; }
  }

  /* ---------- Vẽ ---------- */
  const drawList = [], propBuf = [];
  const TINT = { thuy: [150, 190, 235, 0.1], hoa: [255, 90, 30, 0.08], moc: [40, 140, 50, 0.06], tho: [230, 170, 90, 0.07], kim: [255, 225, 150, 0.06], meadow: [0, 0, 0, 0], village: [255, 200, 150, 0.03] };
  const tint = [0, 0, 0, 0];
  function render(dt) {
    const k = dpr * resScale;
    view.w = vw / zoom;
    view.h = vh / zoom;
    let cx = G.clamp(S.cam.x, view.w / 2, W.w - view.w / 2), cy = G.clamp(S.cam.y, view.h / 2, W.h - view.h / 2);
    if (S.cam.shake > 0) { cx += (Math.random() - 0.5) * S.cam.shake; cy += (Math.random() - 0.5) * S.cam.shake; }
    view.x = cx - view.w / 2;
    view.y = cy - view.h / 2;
    const s = k * zoom;
    ctx.setTransform(s, 0, 0, s, -view.x * s, -view.y * s);
    ctx.imageSmoothingEnabled = true;

    G.drawGroundChunks(ctx, view);
    G.Fx.draw(ctx, 'ground');
    for (const g of S.grounds) G.drawGround(ctx, g, 'ground');
    G.drawLoot(ctx, view);

    // vòng chọn mục tiêu
    const tg = S.target;
    if (tg && !tg.dead) {
      const R = tg.r + 12;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = G.rgba(E[tg.el].color, 0.85);
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -S.time * 30;
      ctx.beginPath(); ctx.ellipse(tg.x, tg.y, R, R * 0.45, 0, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (S.player && !S.player.dead) {
      const p = S.player;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(G.glow(E[p.el].color), p.x - 26, p.y - 9, 52, 18);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // sắp xếp theo trục y để vật ở gần (dưới) che vật ở xa (trên)
    drawList.length = 0;
    G.propsIn(view.x - 140, view.y - 40, view.x + view.w + 140, view.y + view.h + 260, propBuf);
    for (const pr of propBuf) drawList.push(pr);
    const mx0 = view.x - 80, mx1 = view.x + view.w + 80, my0 = view.y - 40, my1 = view.y + view.h + 140;
    for (const m of S.monsters) {
      if ((m.dead && m.deathT <= 0) || m.x < mx0 || m.x > mx1 || m.y < my0 || m.y > my1) continue;
      drawList.push(m);
    }
    if (S.player) drawList.push(S.player);
    if (S.mode === 'play') for (const n of S.npcs) drawList.push(n);
    drawList.sort((a, b) => a.y - b.y);
    for (const o of drawList) {
      if (o.prop) {
        const sp = G.propSprite(o);
        ctx.drawImage(sp.c, o.x - sp.ax, o.y - sp.ay, sp.w, sp.h);
      } else G.drawActor(ctx, o, S.time);
    }

    for (const g of S.grounds) G.drawGround(ctx, g, 'top');
    for (const pr of S.projectiles) {
      if (pr.x > view.x - 60 && pr.x < view.x + view.w + 60 && pr.y > view.y - 60 && pr.y < view.y + view.h + 60) G.drawProjectile(ctx, pr);
    }
    G.Particles.draw(ctx, view, false);
    G.Particles.draw(ctx, view, true);
    G.Fx.draw(ctx, 'top');
    for (const o of drawList) {
      if (o.prop) continue;
      if (o.kind === 'npc') G.drawNpcOverhead(ctx, o);
      else G.drawOverhead(ctx, o, o === tg);
    }
    drawQuestArrow();
    G.Texts.draw(ctx);

    // lớp phủ màn hình
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const b = S.player ? G.biomeAt(S.player.x, S.player.y) : G.biomeAt(S.cam.x, S.cam.y);
    const T = TINT[b], kk = 1 - Math.exp(-2 * dt);
    for (let i = 0; i < 4; i++) tint[i] += (T[i] - tint[i]) * kk;
    if (tint[3] > 0.004) {
      ctx.fillStyle = 'rgba(' + (tint[0] | 0) + ',' + (tint[1] | 0) + ',' + (tint[2] | 0) + ',' + tint[3].toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(vignette, 0, 0);
    if (S.flash) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = G.rgba(S.flash.color, Math.max(0, S.flash.a) * 0.6);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (S.player && S.player.hp < S.player.maxHp * 0.3 && !S.player.dead) {
      ctx.fillStyle = 'rgba(160,20,10,' + (0.1 + Math.sin(S.time * 6) * 0.06) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Mũi tên vàng quanh nhân vật chỉ tới mục tiêu nhiệm vụ
  function drawQuestArrow() {
    const p = S.player;
    if (S.mode !== 'play' || !p || p.dead) return;
    const t = G.questTarget();
    if (!t) return;
    const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
    if (d < 380) return;
    const a = Math.atan2(dy, dx), cx = p.x + Math.cos(a) * 58, cy = p.y - 22 + Math.sin(a) * 40;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.75 + Math.sin(S.time * 5) * 0.2;
    ctx.fillStyle = '#f3c94a';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-6, -9); ctx.lineTo(-1, 0); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- HUD ---------- */
  const hud = {};
  let hudQT = 0;
  function setText(el, v) { if (el._v !== v) { el._v = v; el.textContent = v; } }
  function setBar(el, f) {
    f = G.clamp(f, 0, 1);
    const v = Math.round(f * 500);
    if (el._v !== v) { el._v = v; el.style.transform = 'scaleX(' + f + ')'; }
  }
  function buildHud() {
    const p = S.player, el = E[p.el];
    ['hName', 'hLv', 'hHp', 'hHpT', 'hMp', 'hMpT', 'hExp', 'hExpT', 'hZone', 'hGold', 'target', 'tEl', 'tName', 'tHp', 'tRel', 'potHp', 'potMp', 'fps'].forEach((id) => (hud[id] = $(id)));
    document.documentElement.style.setProperty('--el', el.color);
    setText(hud.hName, p.name + ' · ' + p.sect.name);
    // chân dung
    const pc = $('portrait'), g = pc.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, pc.width, pc.height);
    const bg = g.createRadialGradient(pc.width / 2, pc.height * 0.4, 4, pc.width / 2, pc.height / 2, pc.width * 0.6);
    bg.addColorStop(0, G.rgba(el.color, 0.55));
    bg.addColorStop(1, '#0d1213');
    g.fillStyle = bg;
    g.fillRect(0, 0, pc.width, pc.height);
    g.setTransform(pc.width / 64, 0, 0, pc.width / 64, 0, 0);
    G.drawHumanoid(g, 30, 128, p.look, { face: 1, walk: 0, moving: false, atk: -1, t: 0, scale: 2.2, el: p.el });
    // ô kỹ năng
    const bar = $('skillbar');
    bar.querySelectorAll('.slot').forEach((n) => n.remove());
    p.sect.skills.forEach((sk, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'slot s' + i + (sk.ult ? ' ult' : '');
      b.setAttribute('aria-label', sk.name);
      b.title = sk.name + ' — ' + sk.desc + (sk.mp ? ' (' + sk.mp + ' nội lực)' : '');
      const c = document.createElement('canvas');
      c.width = c.height = 112;
      G.drawSkillIcon(c, sk, p.el);
      b.appendChild(c);
      b.insertAdjacentHTML('beforeend', '<span class="cd"></span><span class="lock"></span><span class="key">' + G.SLOT_KEYS[i] + '</span>' + (sk.mp ? '<span class="mpc">' + sk.mp + '</span>' : ''));
      const down = (e) => { e.preventDefault(); held[i] = true; G.trySkill(i); };
      const up = () => { held[i] = false; };
      b.addEventListener('pointerdown', down);
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
      bar.insertBefore(b, $('potHpBtn'));
      hud['slot' + i] = b;
    });
  }
  function updateHud() {
    const p = S.player;
    if (!p) return;
    setText(hud.hLv, String(p.lv));
    setBar(hud.hHp, p.hp / p.maxHp);
    setText(hud.hHpT, Math.ceil(p.hp) + ' / ' + p.maxHp);
    setBar(hud.hMp, p.mp / p.maxMp);
    setText(hud.hMpT, Math.floor(p.mp) + ' / ' + p.maxMp);
    const need = G.expNeed(p.lv);
    setBar(hud.hExp, p.exp / need);
    setText(hud.hExpT, ((p.exp / need) * 100).toFixed(1) + '%');
    setText(hud.hZone, G.BIOME_NAME[G.biomeAt(p.x, p.y)]);
    setText(hud.hGold, p.gold + ' lượng');
    hudQT = (hudQT || 0) + 1;
    if (hudQT % 10 === 0) G.updateQuestHud();
    setText(hud.potHp, String(p.potions.hp));
    setText(hud.potMp, String(p.potions.mp));
    for (let i = 0; i < 4; i++) {
      const sk = p.sect.skills[i], b = hud['slot' + i];
      const locked = p.lv < sk.unlock;
      const cdf = sk.cd > 0 && p.cds[i] > 0 ? p.cds[i] / sk.cd : 0;
      const v = Math.round(cdf * 100);
      if (b._cd !== v) { b._cd = v; b.style.setProperty('--p', cdf); b.querySelector('.cd').textContent = p.cds[i] > 0.05 && sk.cd >= 1 ? Math.ceil(p.cds[i]) : ''; }
      const st = locked ? 'L' : p.mp < sk.mp ? 'M' : '';
      if (b._st !== st) {
        b._st = st;
        b.classList.toggle('locked', locked);
        b.classList.toggle('nomp', st === 'M');
        b.querySelector('.lock').textContent = locked ? 'Cấp ' + sk.unlock : '';
      }
    }
    const t = S.target;
    if (t && !t.dead) {
      hud.target.hidden = false;
      const el = E[t.el];
      setText(hud.tName, t.name + ' · Cấp ' + t.lv + (t.boss ? ' · Đầu lĩnh' : t.elite ? ' · Thủ lĩnh' : ''));
      setText(hud.tEl, el.han);
      hud.tEl.style.setProperty('--c', el.color);
      setBar(hud.tHp, t.hp / t.maxHp);
      const m = G.elemMult(p.el, t.el), back = G.elemMult(t.el, p.el);
      const rel = m > 1 ? E[p.el].name + ' khắc ' + el.name + ': bạn gây thêm 30% sát thương'
        : m < 1 ? el.name + ' khắc ' + E[p.el].name + ': bạn gây ít hơn 25% sát thương'
          : back > 1 ? 'Hành ' + el.name + ' · nó đánh bạn mạnh hơn 30%' : 'Hành ' + el.name + ' · không tương khắc';
      setText(hud.tRel, rel);
      hud.tRel.className = 'trel ' + (m > 1 ? 'good' : m < 1 || back > 1 ? 'bad' : '');
    } else hud.target.hidden = true;
    setText(hud.fps, fpsShow + ' FPS · ' + Math.round(resScale * 100) + '%');
  }

  /* ---------- Bản đồ nhỏ ---------- */
  let mmBg = null, mmT = 0;
  function drawMinimap(dt) {
    mmT -= dt;
    if (mmT > 0) return;
    mmT = 0.2;
    const c = $('minimap'), g = c.getContext('2d'), N = c.width, sc = N / W.w;
    if (!mmBg) {
      mmBg = G.makeCanvas(N, N);
      const b = mmBg.getContext('2d');
      b.imageSmoothingEnabled = true;
      b.drawImage(G.biomeMap, 0, 0, N, N);
      b.strokeStyle = 'rgba(130,110,72,0.9)';
      b.lineWidth = 2.2;
      for (const rd of G.ROADS) { b.beginPath(); b.moveTo(rd.x0 * sc, rd.y0 * sc); b.quadraticCurveTo(rd.cx * sc, rd.cy * sc, rd.x1 * sc, rd.y1 * sc); b.stroke(); }
      for (const p of G.POOLS) {
        b.fillStyle = p.kind === 'lava' ? '#ff6a2a' : p.kind === 'ice' ? '#d8ecfa' : '#2f6f8e';
        b.beginPath(); b.ellipse(p.x * sc, p.y * sc, p.rx * sc, p.ry * sc, 0, 0, TAU); b.fill();
      }
      b.font = '700 ' + Math.round(N * 0.075) + 'px "Noto Serif SC", "Noto Serif", serif';
      b.textAlign = 'center';
      b.textBaseline = 'middle';
      for (const z of G.ZONES) {
        b.fillStyle = G.rgba(E[z.el].dark, 0.75);
        b.fillText(E[z.el].han, z.x * sc, z.y * sc);
      }
      b.fillStyle = '#d6b064';
      b.beginPath(); b.arc(W.cx * sc, W.cy * sc, N * 0.022, 0, TAU); b.fill();
    }
    g.drawImage(mmBg, 0, 0);
    for (const m of S.monsters) {
      if (m.dead) continue;
      if (m.boss || m.elite) {
        g.fillStyle = m.boss ? '#e9a6ff' : '#f3d995';
        g.beginPath(); g.arc(m.x * sc, m.y * sc, m.boss ? 4.5 : 3.4, 0, TAU); g.fill();
        g.strokeStyle = '#1a1210'; g.lineWidth = 1; g.stroke();
      } else if (S.player && Math.hypot(m.x - S.player.x, m.y - S.player.y) < 900) {
        g.fillStyle = '#e0503a';
        g.fillRect(m.x * sc - 1.2, m.y * sc - 1.2, 2.4, 2.4);
      }
    }
    const qt = S.player && G.questTarget();
    if (qt) {
      g.fillStyle = '#f3c94a';
      g.strokeStyle = '#1a1210';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(qt.x * sc, qt.y * sc - 6); g.lineTo(qt.x * sc + 5, qt.y * sc); g.lineTo(qt.x * sc, qt.y * sc + 6); g.lineTo(qt.x * sc - 5, qt.y * sc); g.closePath(); g.fill(); g.stroke();
    }
    if (S.player) {
      const p = S.player;
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#0d1213';
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(p.x * sc, p.y * sc, 4, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.5)';
      g.lineWidth = 1;
      g.strokeRect((view.x) * sc, (view.y) * sc, view.w * sc, view.h * sc);
    }
  }

  /* ---------- Bảng Ngũ Hành ---------- */
  function buildWheel() {
    const pos = {}, R = 118, cx = 160, cy = 160;
    G.SINH_ORDER.forEach((el, i) => {
      const a = -Math.PI / 2 + (i / 5) * TAU;
      pos[el] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R };
    });
    let svg = '<svg viewBox="0 0 320 320" role="img" aria-label="Vòng tương sinh tương khắc">';
    svg += '<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d6b064"/></marker><marker id="ak" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d8513a"/></marker></defs>';
    const seg = (a, b, r0) => {
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      return [a.x + (dx / d) * r0, a.y + (dy / d) * r0, b.x - (dx / d) * r0, b.y - (dy / d) * r0];
    };
    for (const el of G.SINH_ORDER) {
      const [x1, y1, x2, y2] = seg(pos[el], pos[G.SINH[el]], 34);
      svg += '<path d="M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' Q' + (((x1 + x2) / 2 + (((x1 + x2) / 2 - cx) * 0.22))).toFixed(1) + ',' + (((y1 + y2) / 2 + (((y1 + y2) / 2 - cy) * 0.22))).toFixed(1) + ' ' + x2.toFixed(1) + ',' + y2.toFixed(1) + '" fill="none" stroke="#d6b064" stroke-width="2.2" marker-end="url(#ah)"/>';
    }
    for (const el of G.SINH_ORDER) {
      const [x1, y1, x2, y2] = seg(pos[el], pos[G.KHAC[el]], 34);
      svg += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#d8513a" stroke-width="1.8" stroke-dasharray="5 4" marker-end="url(#ak)"/>';
    }
    for (const el of G.SINH_ORDER) {
      const P = pos[el], e = E[el];
      svg += '<circle cx="' + P.x + '" cy="' + P.y + '" r="28" fill="#0d1213" stroke="' + e.color + '" stroke-width="2.5"/>';
      svg += '<text x="' + P.x + '" y="' + (P.y - 2) + '" text-anchor="middle" dominant-baseline="middle" class="wh" fill="' + e.color + '">' + e.han + '</text>';
      svg += '<text x="' + P.x + '" y="' + (P.y + 17) + '" text-anchor="middle" class="wn">' + e.name + '</text>';
    }
    svg += '</svg>';
    $('wheelSvg').innerHTML = svg;
    let rows = '';
    for (const id of G.ELEMENT_ORDER) {
      const e = E[id];
      rows += '<tr><th scope="row"><span class="chip" style="--c:' + e.color + '">' + e.han + '</span>' + e.name + '</th><td>' + E[G.KHAC[id]].name + '</td><td>' + E[G.khacBy(id)].name + '</td><td>' + E[G.SINH[id]].name + '</td><td><b>' + e.effectName + '</b> · ' + e.effectDesc + '</td></tr>';
    }
    $('wheelRows').innerHTML = rows;
  }

  /* ---------- Màn hình chọn môn phái ---------- */
  let previewT = 0;
  function buildMenu() {
    const list = $('sectList');
    list.innerHTML = '';
    for (const id of G.ELEMENT_ORDER) {
      const e = E[id];
      const row = document.createElement('div');
      row.className = 'el-row';
      row.style.setProperty('--c', e.color);
      row.innerHTML = '<div class="el-badge"><b>' + e.han + '</b><span>' + e.name + '</span></div><div class="el-rel">Khắc ' + E[G.KHAC[id]].name + ' · Sợ ' + E[G.khacBy(id)].name + '</div><div class="el-sects"></div>';
      const box = row.querySelector('.el-sects');
      for (const s of G.SECTS.filter((x) => x.el === id)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'sect-card';
        b.dataset.id = s.id;
        b.innerHTML = '<span class="sn">' + s.name + '</span><span class="sr">' + s.roleName + '</span>';
        b.addEventListener('click', () => {
          selectSect(s.id);
          if (window.innerWidth < 860) $('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        box.appendChild(b);
      }
      list.appendChild(row);
    }
    selectSect(selectedSect);
    const save = loadSave();
    const cont = $('btnContinue');
    if (save) {
      cont.hidden = false;
      cont.querySelector('span').textContent = save.name + ' · ' + G.SECT_BY_ID[save.sect].name + ' · Cấp ' + save.lv;
      $('heroName').value = save.name;
    }
  }
  function selectSect(id) {
    selectedSect = id;
    const s = G.SECT_BY_ID[id], e = E[s.el];
    document.querySelectorAll('.sect-card').forEach((b) => b.classList.toggle('sel', b.dataset.id === id));
    $('detail').style.setProperty('--c', e.color);
    $('dName').textContent = s.name;
    $('dMeta').innerHTML = '<span class="chip" style="--c:' + e.color + '">' + e.han + '</span>Hành ' + e.name + ' · ' + s.roleName;
    $('dDesc').textContent = s.desc;
    const st = s.base;
    $('dStats').innerHTML = [['Sinh lực', st.hp, 300], ['Nội lực', st.mp, 150], ['Công', st.atk, 26], ['Thủ', st.def, 16], ['Tốc độ', st.spd, 200]]
      .map(([n, v, mx]) => '<div class="stat"><span>' + n + '</span><i style="--f:' + (v / mx).toFixed(2) + '"></i><b>' + v + '</b></div>').join('');
    const ol = $('dSkills');
    ol.innerHTML = '';
    s.skills.forEach((sk, i) => {
      const li = document.createElement('li');
      const c = document.createElement('canvas');
      c.width = c.height = 84;
      G.drawSkillIcon(c, sk, s.el);
      li.appendChild(c);
      li.insertAdjacentHTML('beforeend', '<div><b>' + sk.name + '</b><small>' + (sk.unlock > 1 ? 'Cấp ' + sk.unlock + ' · ' : '') + (sk.mp ? sk.mp + ' nội lực · ' : '') + 'hồi ' + sk.cd + 's · phím ' + G.SLOT_KEYS[i] + '</small><p>' + sk.desc + '</p></div>');
      ol.appendChild(li);
    });
    $('dEffect').innerHTML = '<b>' + e.effectName + ':</b> ' + e.effectDesc + ' Tương khắc: đánh hành ' + E[G.KHAC[s.el]].name + ' +30%, đánh hành ' + E[G.khacBy(s.el)].name + ' −25%.';
    previewT = 0;
  }
  function drawPreview(dt) {
    const c = $('preview');
    if (!c || S.mode !== 'menu') return;
    previewT += dt;
    const g = c.getContext('2d'), s = G.SECT_BY_ID[selectedSect], e = E[s.el];
    const w = c.width, h = c.height;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 + Math.sin(S.time * 2) * 0.1;
    g.drawImage(G.glow(e.color), w / 2 - h * 0.55, h * 0.12, h * 1.1, h * 0.9);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.save();
    g.translate(w / 2, h * 0.84);
    g.scale(1, 0.4);
    g.strokeStyle = G.rgba(e.color, 0.6);
    g.lineWidth = 2;
    g.setLineDash([10, 8]);
    g.lineDashOffset = -S.time * 20;
    g.beginPath(); g.arc(0, 0, h * 0.32, 0, TAU); g.stroke();
    g.restore();
    const cyc = previewT % 2.2;
    const atk = cyc > 1.6 ? Math.min(1, (cyc - 1.6) / 0.3) : -1;
    G.drawHumanoid(g, w / 2, h * 0.84, s.look, { face: 1, walk: 0, moving: false, atk: atk >= 1 ? -1 : atk, t: S.time, scale: h / 92, ranged: s.role === 'ranged', el: s.el });
    if (atk >= 0 && atk < 1) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 1 - atk;
      g.drawImage(G.glow(e.color, true), w / 2 + h * 0.18, h * 0.3, h * 0.4, h * 0.4);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  function startGame(save) {
    const sectId = save ? save.sect : selectedSect;
    const name = save ? save.name : ($('heroName').value.trim().slice(0, 16) || 'Thiếu hiệp');
    S.player = G.createPlayer(sectId, name, save);
    G.initQuests(save);
    S.npcs = G.createNPCs();
    S.loot = [];
    S.target = null;
    S.projectiles.length = 0;
    S.grounds.length = 0;
    G.spawnWorldMonsters();
    S.cam.x = S.player.x;
    S.cam.y = S.player.y;
    S.mode = 'play';
    $('menu').hidden = true;
    $('hud').hidden = false;
    $('death').hidden = true;
    buildHud();
    G.saveGame();
    G.updateQuestHud();
    if (!save) setTimeout(() => { if (S.mode === 'play') G.introDialog(); }, 500);
    else {
      G.banner(W.name, 'Chào mừng trở lại. Nhiệm vụ hiện tại hiển thị dưới bản đồ nhỏ.');
      G.toast(touch ? 'Kéo bên trái để di chuyển, chạm nút chiêu bên phải' : 'WASD di chuyển · Space đánh thường · 1 2 3 chiêu · I túi đồ · H hướng dẫn');
    }
  }
  function backToMenu() {
    G.saveGame();
    S.mode = 'menu';
    S.auto = false;
    syncAuto();
    G.openPanel(null);
    S.paused = false;
    $('hud').hidden = true;
    $('death').hidden = true;
    $('menu').hidden = false;
    buildMenu();
  }

  /* ---------- Vòng lặp chính ---------- */
  let last = performance.now();
  function frame(now) {
    const raw = (now - last) / 1000;
    last = now;
    const dt = Math.min(0.05, Math.max(0, raw));
    adapt(Math.min(0.25, raw));
    update(dt);
    render(dt);
    if (S.mode === 'play') { updateHud(); drawMinimap(dt); }
    else drawPreview(dt);
    G.Input.endFrame();
    requestAnimationFrame(frame);
  }

  function boot(data) {
    canvas = $('game');
    ctx = canvas.getContext('2d', { alpha: false });
    document.body.classList.toggle('touch', touch);
    G.buildWorld();
    resize();
    window.addEventListener('resize', resize);
    bindInput();
    buildMenu();
    buildWheel();
    $('btnStart').addEventListener('click', () => startGame(null));
    $('btnContinue').addEventListener('click', () => { const s = loadSave(); if (s) startGame(s); });
    $('btnWheel').addEventListener('click', () => togglePanel('wheel'));
    $('btnBag').addEventListener('click', () => togglePanel('bag'));
    $('btnGuide').addEventListener('click', () => togglePanel('guide'));
    $('btnGuideMenu').addEventListener('click', () => G.openPanel('guide'));
    $('quest').addEventListener('click', () => { const c = S.npcs.find((n) => n.id === 'chief'); if (c) G.talk(c); });
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => G.openPanel(null)));
    $('btnAuto').addEventListener('click', () => { S.auto = !S.auto; syncAuto(); });
    $('btnMenu').addEventListener('click', backToMenu);
    $('btnRespawn').addEventListener('click', () => { if (S.player && S.player.dead) G.respawnPlayer(S.player); });
    $('potHpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); G.usePotion('hp'); });
    $('potMpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); G.usePotion('mp'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) G.saveGame(); });
    if (data && data.save && G.SECT_BY_ID[data.save.sect]) startGame(data.save);
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }

  const hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(() => ({ save: S.mode === 'play' ? getSave() : null })); } catch (e) { /* không có hot reload */ }
  const start = () => (hot && hot.ready ? hot.ready(boot) : boot((hot && hot.data) || {}));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window.G);
