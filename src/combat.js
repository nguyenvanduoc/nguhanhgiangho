/* =====================================================================
 * combat.js — Chiến đấu
 * Chỉ số, sát thương có tương khắc, hiệu ứng ngũ hành (chảy máu, độc,
 * làm chậm, thiêu đốt, choáng), 7 loại chiêu, đạn, vùng kỹ năng, AI quái.
 * ===================================================================== */
(function (G) {
  'use strict';
  const E = G.ELEMENTS, W = G.WORLD, TAU = G.TAU;
  const S = (G.S = G.S || {});
  S.monsters = S.monsters || [];
  S.projectiles = S.projectiles || [];
  S.grounds = S.grounds || [];

  G.expNeed = (lv) => Math.floor(36 * Math.pow(lv, 1.55) + 24);
  const alive = (e) => e && !e.dead;
  G.alive = alive;

  /* ---------- Chỉ số ---------- */
  G.recalc = function (e) {
    const l = e.lv - 1;
    if (e.kind === 'player') {
      const b = e.sect.base;
      const g = e.gear || { atk: 0, def: 0, hp: 0, mp: 0, atkPct: 0, crit: 0, spd: 0, res: {}, dmg: {} };
      e.maxHp = Math.round(b.hp * (1 + 0.15 * l) + g.hp);
      e.maxMp = Math.round(b.mp * (1 + 0.1 * l) + g.mp);
      e.baseAtk = (b.atk * (1 + 0.13 * l) + g.atk) * (1 + g.atkPct / 100);
      e.baseDef = b.def * (1 + 0.12 * l) + g.def;
      e.baseSpd = b.spd * (1 + g.spd / 100);
      e.crit = 0.1 + l * 0.004 + g.crit / 100;
      e.res = g.res;
      e.dmgEl = g.dmg;
    } else {
      const D = e.D, mult = D.boss ? 14 : D.elite ? 6 : 1;
      e.maxHp = Math.round((50 + e.lv * 26) * mult);
      e.baseAtk = (5 + e.lv * 3.1) * (D.boss ? 1.6 : D.elite ? 1.35 : 1);
      e.baseDef = 2 + e.lv * 2.2;
      e.baseSpd = D.spd;
      e.crit = 0.05;
      e.exp = Math.round((12 + e.lv * 7) * (D.boss ? 30 : D.elite ? 8 : 1));
    }
  };
  G.stat = function (e, k) {
    const base = k === 'atk' ? e.baseAtk : k === 'def' ? e.baseDef : e.baseSpd;
    let m = 1;
    for (const b of e.buffs) if (b[k]) m += b[k];
    if (k === 'def' && e.status.bleed) m -= 0.25;
    if (k === 'spd' && e.status.slow) m -= 0.45;
    return base * Math.max(0.2, m);
  };

  /* ---------- Tạo nhân vật / quái ---------- */
  G.createPlayer = function (sectId, name, save) {
    const sect = G.SECT_BY_ID[sectId];
    const p = {
      kind: 'player', team: 0, sect, el: sect.el, name: name || 'Thiếu hiệp', look: sect.look, ranged: sect.role === 'ranged',
      lv: (save && save.lv) || 1, exp: (save && save.exp) || 0, size: 1,
      x: W.cx, y: W.cy + 90, r: 14, face: 1, walk: 0, moving: false,
      cds: [0, 0, 0, 0], buffs: [], status: {}, atkAnim: -1, atkDur: 0.28, flash: 0, invuln: 0, stunImmune: 0,
      dash: null, pending: null, moveTo: null, dead: false, deathT: 0, combatT: 0, dotT: 0, potCd: 0, dustT: 0,
      potions: (save && save.potions) || { hp: 6, mp: 6 },
      gold: (save && save.gold) || 0,
      equip: (save && save.equip) || {},
      bag: (save && save.bag) || [],
    };
    p.gear = G.gearStats ? G.gearStats(p) : null;
    G.recalc(p);
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    return p;
  };

  G.createMonster = function (type, x, y, lv) {
    const D = G.MONSTERS[type];
    const size = D.boss ? 1.9 : D.elite ? 1.45 : 1;
    const m = {
      kind: 'monster', team: 1, type, D, name: D.name, el: D.el, lv, x, y, home: { x, y }, r: D.r * size, size,
      look: Object.assign({ skin: '#e8c39a', hair: '#1a1410' }, D.look || {}), elite: !!D.elite, boss: !!D.boss, ranged: D.atk === 'ranged',
      face: Math.random() < 0.5 ? 1 : -1, walk: 0, moving: false, status: {}, buffs: [], flash: 0, dead: false, deathT: 0, respawnT: 0,
      atkCd: G.rr(0.3, 1), windup: 0, ai: 'idle', wanderT: G.rr(0, 3), wx: x, wy: y, specialCd: 4, specialN: 0, cycleT: 7,
      atkAnim: -1, seed: Math.random() * 10, combatT: 0, stunImmune: 0, invuln: 0, dotT: 0,
    };
    G.recalc(m);
    m.hp = m.maxHp;
    return m;
  };

  G.spawnWorldMonsters = function () {
    S.monsters = [];
    const r = G.mulberry32(99);
    for (const z of G.ZONES) {
      const sp = G.ZONE_SPAWNS[z.el];
      let placed = 0, tries = 0;
      while (placed < 28 && tries++ < 600) {
        const a = r() * TAU, d = Math.sqrt(r()) * z.r * 0.92;
        const x = z.x + Math.cos(a) * d, y = z.y + Math.sin(a) * d;
        const dc = Math.hypot(x - W.cx, y - W.cy);
        if (dc < W.villageR + 170 || G.blocked(x, y, 28)) continue;
        const lv = G.clamp(1 + Math.floor((dc - 640) / 72), 1, 18);
        S.monsters.push(G.createMonster(sp.mobs[placed % 2], x, y, lv));
        placed++;
      }
      let ex = W.cx + Math.cos(z.a) * (G.ZONE_DIST + z.r * 0.6), ey = W.cy + Math.sin(z.a) * (G.ZONE_DIST + z.r * 0.6);
      for (let k = 0; k < 30 && G.blocked(ex, ey, 40); k++) { ex += G.rr(-40, 40); ey += G.rr(-40, 40); }
      S.monsters.push(G.createMonster(sp.elite, ex, ey, 12));
    }
    S.monsters.push(G.createMonster('yeuVuong', W.w - 440, W.h - 440, 20));
  };

  /* ---------- Phe đối địch ---------- */
  const oppBuf = [];
  function opponents(team) {
    oppBuf.length = 0;
    if (team === 0) { for (const m of S.monsters) if (!m.dead) oppBuf.push(m); }
    else if (alive(S.player)) oppBuf.push(S.player);
    return oppBuf;
  }
  G.nearestEnemy = function (from, maxD, exclude) {
    let best = null, bd = maxD;
    for (const m of S.monsters) {
      if (m.dead || (exclude && exclude.has(m))) continue;
      const d = Math.hypot(m.x - from.x, m.y - from.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  };

  /* ---------- Sát thương ---------- */
  G.dealDamage = function (src, tgt, mult, el, opts) {
    if (!alive(tgt) || tgt.invuln > 0) return 0;
    opts = opts || {};
    let dmg = G.stat(src, 'atk') * mult * G.rr(0.9, 1.1);
    const em = G.elemMult(el, tgt.el);
    dmg *= em;
    if (src.dmgEl && src.dmgEl[tgt.el]) dmg *= 1 + src.dmgEl[tgt.el] / 100;
    if (tgt.res && tgt.res[el]) dmg *= 1 - Math.min(60, tgt.res[el]) / 100;
    const crit = !opts.dot && Math.random() < (src.crit || 0.05);
    if (crit) dmg *= 1.75;
    dmg *= 100 / (100 + G.stat(tgt, 'def'));
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp -= dmg;
    tgt.flash = 0.12;
    tgt.combatT = 5;
    src.combatT = 5;

    const h = G.bodyHeight(tgt);
    let color = '#ffffff', size = 17;
    if (tgt.kind === 'player') color = '#ff7a64';
    else if (crit) { color = '#ffd76a'; size = 25; }
    else if (em > 1) { color = E[el].light; size = 19; }
    else if (em < 1) color = '#a7aaa8';
    if (opts.dot) size = 13;
    G.Texts.add(tgt.x, tgt.y - h - 4, crit ? dmg + '!' : String(dmg), color, size);

    if (!opts.dot) {
      G.sfx(tgt.kind === 'player' ? 'hurt' : 'hit', { x: tgt.x, y: tgt.y, el, crit });
      G.hitBurst(tgt.x, tgt.y - h * 0.5, el, crit);
      if (Math.random() < (opts.effectChance != null ? opts.effectChance : 0.2)) G.applyStatus(tgt, el, src);
      if (crit && src.kind === 'player') G.shake(3);
      if (tgt.kind === 'player') G.shake(4);
    }
    if (tgt.kind === 'monster') aggro(tgt);
    if (tgt.hp <= 0) kill(tgt, src);
    return dmg;
  };

  G.hitArea = function (owner, x, y, r, mult, el, opts) {
    let n = 0;
    const list = opponents(owner.team).slice();
    for (const t of list) {
      if (Math.hypot(t.x - x, (t.y - y) / 0.62) <= r + t.r) { G.dealDamage(owner, t, mult, el, opts); n++; }
    }
    return n;
  };

  /* ---------- Hiệu ứng ngũ hành ---------- */
  G.applyStatus = function (tgt, el, src) {
    const atk = G.stat(src, 'atk'), s = tgt.status;
    switch (E[el].effect) {
      case 'bleed': s.bleed = { t: 3, dmg: atk * 0.12, src }; break;
      case 'poison': {
        const st = s.poison ? Math.min(3, s.poison.stacks + 1) : 1;
        s.poison = { t: 4, stacks: st, dmg: atk * 0.08, src };
        break;
      }
      case 'slow': s.slow = { t: 2.5 }; break;
      case 'burn': s.burn = { t: 3, dmg: atk * 0.16, src }; break;
      case 'stun':
        if (tgt.stunImmune > 0) return;
        s.stun = { t: tgt.boss ? 0.35 : tgt.elite ? 0.55 : tgt.kind === 'player' ? 0.6 : 1.0 };
        tgt.stunImmune = 2.5;
        tgt.windup = 0;
        break;
    }
  };

  function updateStatus(e, dt) {
    const s = e.status;
    e.dotT -= dt;
    const tick = e.dotT <= 0;
    if (tick) e.dotT = 0.5;
    const h = G.bodyHeight(e);
    for (const k in s) {
      const st = s[k];
      st.t -= dt;
      if (tick && st.dmg && alive(e)) {
        const amount = Math.max(1, Math.round(st.dmg * (st.stacks || 1) * (100 / (100 + G.stat(e, 'def') * 0.5))));
        e.hp -= amount;
        e.combatT = 5;
        G.Texts.add(e.x, e.y - h, String(amount), k === 'poison' ? '#9dff7a' : k === 'burn' ? '#ffb070' : '#ff8a8a', 13, 0.7);
        if (e.kind === 'monster') aggro(e);
        if (e.hp <= 0) { kill(e, st.src); return; }
      }
      if (st.t <= 0) delete s[k];
    }
    if (Math.random() < dt * 10 * G.quality) {
      const P = G.Particles;
      if (s.burn) P.spawn({ x: e.x + G.rr(-10, 10), y: e.y - h * G.rr(0.2, 0.8), vx: G.rr(-10, 10), vy: G.rr(-70, -40), life: 0.45, size: G.rr(9, 14), img: G.glow('#ff7a3d', true) });
      if (s.poison) P.spawn({ x: e.x + G.rr(-10, 10), y: e.y - h * G.rr(0.2, 0.9), vx: 0, vy: G.rr(-40, -20), life: 0.6, size: G.rr(5, 8), img: G.glow('#6fd06a') });
      if (s.slow) P.spawn({ x: e.x + G.rr(-12, 12), y: e.y - h * G.rr(0.2, 1), vx: G.rr(-10, 10), vy: G.rr(5, 25), life: 0.6, size: 2.4, sizeEnd: 1, color: '#e2f4ff', add: false });
      if (s.bleed) P.spawn({ x: e.x + G.rr(-6, 6), y: e.y - h * 0.5, vx: G.rr(-20, 20), vy: -40, gravity: 300, life: 0.45, size: 3, sizeEnd: 2, color: '#b8202a', add: false });
    }
  }

  function updateBuffs(e, dt) {
    for (let i = e.buffs.length - 1; i >= 0; i--) {
      const b = e.buffs[i];
      b.t -= dt;
      if (b.aura && alive(e)) {
        b.tick -= dt;
        if (b.tick <= 0) {
          b.tick = b.aura.tick;
          G.hitArea(e, e.x, e.y, b.aura.radius, b.aura.dmg, e.el, { effectChance: 0.3 });
          G.ring(e.x, e.y, b.aura.radius * 0.4, b.aura.radius, E[e.el].color, 0.4, 4);
        }
        if (Math.random() < dt * 30 * G.quality) {
          const a = Math.random() * TAU, d = b.aura.radius * G.rr(0.5, 1);
          G.Particles.spawn({ x: e.x + Math.cos(a) * d, y: e.y + Math.sin(a) * d * 0.6, vx: 0, vy: G.rr(-80, -40), life: 0.5, size: G.rr(10, 16), img: G.glow(E[e.el].color, true) });
        }
      } else if (Math.random() < dt * 8 * G.quality) {
        G.Particles.spawn({ x: e.x + G.rr(-14, 14), y: e.y - G.rr(0, 30), vx: 0, vy: G.rr(-60, -30), life: 0.6, size: G.rr(5, 9), img: G.glow(E[e.el].color) });
      }
      if (b.t <= 0) e.buffs.splice(i, 1);
    }
  }

  /* ---------- Chết, kinh nghiệm, lên cấp ---------- */
  function kill(t, src) {
    if (t.dead) return;
    t.dead = true;
    t.hp = 0;
    t.status = {};
    const h = G.bodyHeight(t);
    if (t.kind === 'monster') {
      t.deathT = 0.6;
      t.respawnT = t.boss ? 60 : t.elite ? 45 : 10;
      G.sfx('death', { x: t.x, y: t.y, big: t.elite || t.boss });
      G.burst(t.x, t.y - h * 0.5, E[t.el].color, t.elite || t.boss ? 50 : 20, t.elite ? 360 : 220, { hot: true });
      G.ring(t.x, t.y, 6, 40 * t.size, E[t.el].light, 0.4, 5);
      if (S.target === t) S.target = null;
      const p = S.player;
      if (p && (src === p || (src && src.team === 0))) {
        G.gainExp(p, t.exp);
        if (G.onMonsterKilled) G.onMonsterKilled(t);
        if (t.boss) G.toast('Đã hạ ' + t.name + '!', 'gold');
        else if (t.elite) G.toast('Đã hạ thủ lĩnh ' + t.name, 'gold');
      }
    } else {
      t.deathT = 3;
      G.sfx('defeat');
      G.burst(t.x, t.y - 30, '#c8442d', 30, 240, {});
      G.onPlayerDeath && G.onPlayerDeath();
    }
  }
  function respawnMonster(m) {
    m.dead = false;
    m.x = m.home.x;
    m.y = m.home.y;
    m.hp = m.maxHp;
    m.ai = 'idle';
    m.status = {};
    m.windup = 0;
    m.atkCd = 1;
    G.burst(m.x, m.y - 20, E[m.el].color, 12, 120, {});
  }

  G.gainExp = function (p, n) {
    p.exp += n;
    G.Texts.add(p.x, p.y - 80, '+' + n + ' kinh nghiệm', '#f3d995', 12, 1.1);
    while (p.exp >= G.expNeed(p.lv)) {
      p.exp -= G.expNeed(p.lv);
      p.lv++;
      G.recalc(p);
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      G.Fx.add({ type: 'pillar', x: p.x, y: p.y, w: 46, color: '#f0d27a', dur: 1.0 });
      G.ring(p.x, p.y, 10, 120, '#fff6cf', 0.7, 8);
      G.burst(p.x, p.y - 30, '#f0d27a', 40, 200, { hot: true, up: 140 });
      G.banner('Thăng cấp ' + p.lv, 'Sinh lực, nội lực và công lực đều tăng');
      G.sfx('levelup');
      p.sect.skills.forEach((sk) => {
        if (sk.unlock === p.lv) G.toast('Lĩnh ngộ chiêu mới: ' + sk.name, 'gold');
      });
      G.saveGame && G.saveGame();
    }
    if (G.questCheck) G.questCheck();
  };

  function aggro(m) {
    if (m.dead) return;
    if (m.ai !== 'chase') {
      m.ai = 'chase';
      for (const o of S.monsters) {
        if (o !== m && !o.dead && o.ai === 'idle' && o.type === m.type && Math.hypot(o.x - m.x, o.y - m.y) < 170) o.ai = 'chase';
      }
    }
  }

  /* ---------- Đạn & vùng kỹ năng ---------- */
  G.spawnProjectile = function (o) {
    o.t = 0; o.hit = new Set(); o.acc = 0; o.hist = []; o.dist = 0; o.nextSpike = 0; o.dead = false;
    S.projectiles.push(o);
    return o;
  };
  G.spawnGround = function (o) {
    o.t = 0; o.ticked = false; o.nextTick = o.delay || 0; o.delay = o.delay || 0; o.dur = o.dur || 0; o.tickInt = o.tickInt || 0.5;
    if (o.team === 1 && o.delay > 0.3) G.sfx('warn', { x: o.x, y: o.y });
    S.grounds.push(o);
    return o;
  };

  G.updateProjectiles = function (dt) {
    const L = S.projectiles;
    for (let i = L.length - 1; i >= 0; i--) {
      const pr = L[i];
      pr.t += dt;
      if (pr.homing && alive(pr.target)) {
        const tx = pr.target.x, ty = pr.target.y - G.bodyHeight(pr.target) * 0.5;
        const want = Math.atan2(ty - pr.y, tx - pr.x), cur = Math.atan2(pr.vy, pr.vx);
        const d = G.angDiff(cur, want), turn = Math.max(-7 * dt, Math.min(7 * dt, d));
        const sp = Math.hypot(pr.vx, pr.vy), na = cur + turn;
        pr.vx = Math.cos(na) * sp;
        pr.vy = Math.sin(na) * sp;
      }
      const step = Math.hypot(pr.vx, pr.vy) * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.dist += step;
      if (pr.vfx === 'dragon') {
        pr.hist.push(pr.x, pr.y);
        if (pr.hist.length > 28) pr.hist.splice(0, 2);
      }
      pr.acc += dt;
      while (pr.acc > 0.018) {
        pr.acc -= 0.018;
        if (pr.vfx !== 'spikes' && Math.random() < G.quality) G.trail(pr.el, pr.x, pr.y, pr.vx, pr.vy, pr.vfx === 'dragon' || pr.vfx === 'lance');
      }
      if (pr.vfx === 'spikes') {
        while (pr.dist >= pr.nextSpike) {
          const k = pr.nextSpike / Math.max(1, pr.dist);
          const sx = G.lerp(pr.x - pr.vx * dt, pr.x, k), sy = G.lerp(pr.y - pr.vy * dt, pr.y, k) + 20;
          G.Fx.add({ type: 'spike', x: sx + G.rr(-8, 8), y: sy + G.rr(-6, 6), h: G.rr(24, 38), color: '#8a6036', light: '#e3c07a', dur: 0.75, layer: 'top' });
          G.debris(sx, sy, '#7a5530', 2, 120);
          pr.nextSpike += 30;
        }
      }
      // va chạm
      const list = opponents(pr.team);
      for (let j = 0; j < list.length && !pr.dead; j++) {
        const t = list[j];
        if (pr.hit.has(t)) continue;
        const ty = pr.vfx === 'spikes' ? t.y - 20 : t.y - G.bodyHeight(t) * 0.5;
        if (Math.hypot(t.x - pr.x, ty - pr.y) < t.r + pr.r) {
          pr.hit.add(t);
          if (pr.explode) {
            G.hitArea(pr.owner, t.x, t.y, pr.explode, pr.dmg, pr.el, { effectChance: pr.effectChance });
            G.burst(pr.x, pr.y, '#ff7a3d', 18, 220, { hot: true });
            G.ring(t.x, t.y, 6, pr.explode, '#ffb050', 0.3, 5);
          } else {
            G.dealDamage(pr.owner, t, pr.dmg, pr.el, { effectChance: pr.effectChance });
          }
          if (!pr.pierce) pr.dead = true;
        }
      }
      if (pr.t >= pr.life) {
        pr.dead = true;
        if (pr.explode) G.burst(pr.x, pr.y, '#ff7a3d', 8, 120, { hot: true });
      }
      if (pr.dead) { L[i] = L[L.length - 1]; L.pop(); }
    }
  };

  G.updateGrounds = function (dt) {
    const L = S.grounds;
    for (let i = L.length - 1; i >= 0; i--) {
      const g = L[i];
      if (g.follow && alive(g.follow)) { g.x = g.follow.x; g.y = g.follow.y; }
      g.t += dt;
      let done = false;
      if (g.t >= g.delay) {
        if (!g.dur) {
          if (!g.ticked) {
            g.ticked = true;
            G.hitArea(g.owner, g.x, g.y, g.r, g.dmg, g.el, { effectChance: g.effectChance });
            G.impactFx(g);
            G.sfx('boom', { x: g.x, y: g.y, el: g.el, size: g.r / 120 });
          }
          done = true;
        } else {
          while (g.t >= g.nextTick && g.nextTick <= g.delay + g.dur + 1e-6) {
            G.hitArea(g.owner, g.x, g.y, g.r, g.dmg, g.el, { effectChance: g.effectChance });
            G.sfx(g.vfx === 'spin' || g.vfx === 'leafstorm' ? 'swing' : 'tick', { x: g.x, y: g.y, el: g.el, vfx: g.vfx, soft: true });
            g.nextTick += g.tickInt;
          }
          G.lingerFx(g, dt);
          if (g.pull) {
            for (const t of opponents(g.team)) {
              const dx = g.x - t.x, dy = g.y - t.y, d = Math.hypot(dx, dy);
              if (d < g.r + 30 && d > 8 && !t.boss) { t.x += (dx / d) * 120 * dt; t.y += (dy / d) * 120 * dt; }
            }
          }
          if (g.t >= g.delay + g.dur) done = true;
        }
      }
      if (done) { L[i] = L[L.length - 1]; L.pop(); }
    }
  };

  /* ---------- Thi triển chiêu thức ---------- */
  G.castRange = function (sk, tgt) {
    switch (sk.type) {
      case 'slash': return sk.range * 0.8 + tgt.r;
      case 'projectile': return Math.min(sk.range * 0.9, 470);
      case 'ground': return sk.range;
      case 'chain': return sk.range;
      case 'nova': return sk.radius * 0.7 + tgt.r;
      default: return Infinity;
    }
  };

  // c: người thi triển; tgt: mục tiêu (có thể null -> đánh theo hướng mặt)
  G.performSkill = function (c, sk, tgt) {
    const el = E[c.el];
    const ax = tgt ? tgt.x : c.x + c.face * 120, ay = tgt ? tgt.y : c.y;
    if (tgt) c.face = tgt.x >= c.x ? 1 : -1;
    c.atkAnim = 0;
    c.atkDur = sk.type === 'slash' ? 0.24 : 0.3;
    if (sk.heal) {
      const hv = Math.round(c.maxHp * sk.heal);
      c.hp = Math.min(c.maxHp, c.hp + hv);
      G.Texts.add(c.x, c.y - 70, '+' + hv, '#8dff9a', 16);
    }
    const ec = sk.effectChance;
    if (sk.type !== 'slash') G.sfx('cast', { x: c.x, y: c.y, el: c.el, type: sk.type, ult: sk.ult });
    switch (sk.type) {
      case 'slash': {
        const hits = sk.hits || 1;
        for (let h = 0; h < hits; h++) {
          G.after(0.05 + h * (sk.interval || 0.1), () => {
            if (!alive(c)) return;
            const tx = tgt && alive(tgt) ? tgt.x : ax, ty = tgt && alive(tgt) ? tgt.y : ay;
            const ang = Math.atan2((ty - c.y) / 0.72, tx - c.x);
            if (h > 0) c.atkAnim = 0;
            G.sfx('swing', { x: c.x, y: c.y, el: c.el });
            G.Fx.add({ type: 'arc', x: c.x, y: c.y - 18, ang, arc: sk.arc, r: sk.range, color: el.color, light: el.light, dur: 0.26 });
            for (const t of opponents(c.team).slice()) {
              const dx = t.x - c.x, dy = (t.y - c.y) / 0.72, d = Math.hypot(dx, dy) - t.r;
              if (d <= sk.range && Math.abs(G.angDiff(ang, Math.atan2(dy, dx))) <= sk.arc / 2 + 0.25) G.dealDamage(c, t, sk.dmg, c.el, { effectChance: ec });
            }
            G.sparks(c.x + Math.cos(ang) * sk.range * 0.6, c.y - 18 + Math.sin(ang) * sk.range * 0.4, el.light, 4, 300);
          });
        }
        break;
      }
      case 'projectile': {
        const base = Math.atan2(ay - c.y, ax - c.x), n = sk.count || 1;
        for (let i = 0; i < n; i++) {
          const a = base + (n > 1 ? (i / (n - 1) - 0.5) * sk.spread : 0);
          G.spawnProjectile({
            x: c.x + Math.cos(a) * 16, y: c.y - 22 + Math.sin(a) * 10, vx: Math.cos(a) * sk.speed, vy: Math.sin(a) * sk.speed,
            life: sk.range / sk.speed, r: sk.radius || 10, team: c.team, owner: c, dmg: sk.dmg, el: c.el, vfx: sk.vfx,
            pierce: !!sk.pierce, explode: sk.explode || 0, effectChance: ec, homing: sk.homing && n === 1, target: tgt,
          });
        }
        G.burst(c.x + Math.cos(base) * 18, c.y - 22, el.color, sk.ult ? 16 : 5, 120, { hot: true });
        if (sk.ult) { G.shake(6); G.screenFlash(el.light, 0.2); }
        break;
      }
      case 'ground':
      case 'nova': {
        let gx = ax, gy = ay;
        if (sk.type === 'ground') {
          const d = Math.hypot(gx - c.x, gy - c.y);
          if (d > sk.range) { gx = c.x + ((gx - c.x) / d) * sk.range; gy = c.y + ((gy - c.y) / d) * sk.range; }
        }
        const isNova = sk.type === 'nova';
        const dur = sk.duration || (sk.ticks ? sk.ticks * sk.tickInt : 0);
        const mk = (x, y, delay) => G.spawnGround({
          x, y, r: sk.radius, delay, dur, tickInt: sk.tickInt || 0.5, dmg: sk.dmg, el: c.el, vfx: sk.vfx,
          owner: c, team: c.team, effectChance: ec, pull: sk.pull, follow: isNova ? c : null,
        });
        if (sk.multi) {
          for (let i = 0; i < sk.multi.count; i++) {
            const a = Math.random() * TAU, d = i === 0 ? 0 : Math.sqrt(Math.random()) * sk.multi.spread;
            mk(gx + Math.cos(a) * d, gy + Math.sin(a) * d * 0.62, sk.delay + i * sk.multi.step);
          }
        } else mk(isNova ? c.x : gx, isNova ? c.y : gy, sk.delay || 0);
        if (isNova) G.burst(c.x, c.y - 24, el.color, 10, 140, { hot: true });
        else G.burst(c.x + c.face * 14, c.y - 40, el.color, 8, 90, { hot: true, up: 60 });
        if (sk.ult) G.screenFlash(el.light, 0.15);
        break;
      }
      case 'dash': {
        let tx = ax, ty = ay;
        const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy) || 1;
        const len = Math.min(sk.range, tgt ? d + 40 : sk.range);
        tx = c.x + (dx / d) * len;
        ty = c.y + (dy / d) * len;
        c.dash = { sx: c.x, sy: c.y, tx, ty, t: 0, dur: 0.22, hit: new Set(), sk, ghost: 0 };
        c.invuln = 0.28;
        c.face = dx >= 0 ? 1 : -1;
        G.burst(c.x, c.y - 20, el.color, 14, 180, { hot: true });
        break;
      }
      case 'chain': {
        let cur = tgt && alive(tgt) ? tgt : G.nearestEnemy(c, sk.range);
        if (!cur) break;
        const hit = new Set(), pts = [c.x, c.y - 28];
        for (let i = 0; i < sk.count && cur; i++) {
          hit.add(cur);
          pts.push(cur.x, cur.y - G.bodyHeight(cur) * 0.5);
          const t = cur;
          G.after(i * 0.07, () => G.dealDamage(c, t, sk.dmg, c.el, { effectChance: ec }));
          cur = G.nearestEnemy(cur, sk.jump, hit);
        }
        G.Fx.add({ type: 'chain', pts, color: el.color, light: el.light, dur: 0.45 });
        break;
      }
      case 'buff': {
        const b = Object.assign({ id: sk.id, t: sk.buff.dur, tick: 0 }, sk.buff);
        c.buffs = c.buffs.filter((x) => x.id !== sk.id);
        c.buffs.push(b);
        G.Fx.add({ type: 'pillar', x: c.x, y: c.y, w: 40, color: el.color, dur: 0.7 });
        G.ring(c.x, c.y, 10, 90, el.light, 0.55, 7);
        G.burst(c.x, c.y - 30, el.color, 26, 160, { hot: true, up: 100 });
        if (sk.burst) {
          G.spawnGround({ x: c.x, y: c.y, r: sk.burst.radius, delay: 0, dmg: sk.burst.dmg, el: c.el, vfx: 'quake', owner: c, team: c.team, effectChance: ec });
        }
        G.screenFlash(el.light, 0.15);
        break;
      }
    }
  };

  /* ---------- Cập nhật người chơi ---------- */
  G.updatePlayer = function (p, dt, mv) {
    for (let i = 0; i < 4; i++) if (p.cds[i] > 0) p.cds[i] -= dt;
    p.potCd -= dt; p.flash -= dt; p.invuln -= dt; p.stunImmune -= dt; p.combatT -= dt;
    if (p.atkAnim >= 0) { p.atkAnim += dt / p.atkDur; if (p.atkAnim >= 1) p.atkAnim = -1; }
    if (p.dead) {
      p.deathT -= dt;
      if (p.deathT <= 0) G.respawnPlayer(p);
      return;
    }
    let regen = 0;
    for (const b of p.buffs) if (b.regen) regen += b.regen;
    const ooc = p.combatT <= 0;
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * ((ooc ? 0.025 : 0.002) + regen) * dt);
    p.mp = Math.min(p.maxMp, p.mp + p.maxMp * (ooc ? 0.04 : 0.014) * dt);
    updateBuffs(p, dt);
    updateStatus(p, dt);
    if (p.dead) return;

    if (p.dash) {
      const d = p.dash;
      d.t += dt;
      const k = G.easeOut(Math.min(1, d.t / d.dur));
      p.x = G.lerp(d.sx, d.tx, k);
      p.y = G.lerp(d.sy, d.ty, k);
      p.moving = true;
      p.walk += dt * 20;
      d.ghost -= dt;
      if (d.ghost <= 0) {
        d.ghost = 0.03;
        G.Fx.add({ type: 'afterimage', x: p.x, y: p.y, look: p.look, face: p.face, el: p.el, dur: 0.3, layer: 'top' });
        G.trail(p.el, p.x, p.y - 20, 0, 0, true);
      }
      for (const t of opponents(0).slice()) {
        if (!d.hit.has(t) && Math.hypot(t.x - p.x, t.y - p.y) < 36 + t.r) {
          d.hit.add(t);
          G.dealDamage(p, t, d.sk.dmg, p.el, { effectChance: d.sk.effectChance });
        }
      }
      if (d.t >= d.dur) {
        p.dash = null;
        G.ring(p.x, p.y, 8, 70, E[p.el].light, 0.35, 5);
        G.collide(p);
      }
      return;
    }
    if (p.status.stun) { p.moving = false; return; }

    let mx = mv.x, my = mv.y;
    if (mx || my) {
      p.moveTo = null;
      p.pending = null;
    } else if (p.pending) {
      const pd = p.pending, t = pd.tgt;
      if (!alive(t)) p.pending = null;
      else {
        const sk = p.sect.skills[pd.slot], d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d <= G.castRange(sk, t)) {
          p.pending = null;
          G.castSlot(p, pd.slot, t);
        } else { mx = (t.x - p.x) / d; my = (t.y - p.y) / d; }
      }
    } else if (p.moveTo) {
      const dx = p.moveTo.x - p.x, dy = p.moveTo.y - p.y, d = Math.hypot(dx, dy);
      if (d < 8) p.moveTo = null;
      else { mx = dx / d; my = dy / d; }
    }
    if (mx || my) {
      const spd = G.stat(p, 'spd');
      p.x += mx * spd * dt;
      p.y += my * spd * dt;
      p.moving = true;
      p.walk += dt * 11 * (spd / 180);
      if (Math.abs(mx) > 0.15 && p.atkAnim < 0) p.face = mx > 0 ? 1 : -1;
      p.dustT -= dt;
      if (p.dustT <= 0) {
        p.dustT = 0.12;
        const b = G.biomeAt(p.x, p.y);
        const col = b === 'thuy' ? '#ffffff' : b === 'hoa' ? '#3a2a24' : b === 'tho' ? '#c49a5c' : '#8a7a5a';
        G.Particles.spawn({ x: p.x - p.face * 6, y: p.y - 2, vx: -mx * 20, vy: -10, life: 0.4, size: 6, sizeEnd: 14, img: G.glow(col), add: false, alpha: 0.35 });
      }
      G.collide(p);
    } else p.moving = false;
  };

  // Kiểm tra điều kiện và tung chiêu ở ô kỹ năng `slot`
  G.castSlot = function (p, slot, tgt) {
    const sk = p.sect.skills[slot];
    if (p.cds[slot] > 0 || p.mp < sk.mp) return false;
    p.mp -= sk.mp;
    p.cds[slot] = sk.cd;
    G.performSkill(p, sk, tgt && alive(tgt) ? tgt : null);
    return true;
  };

  G.trySkill = function (slot, quiet) {
    const p = S.player;
    if (!p || p.dead || p.status.stun || p.dash) return;
    const sk = p.sect.skills[slot];
    if (p.lv < sk.unlock) { if (!quiet) G.toast('Đạt cấp ' + sk.unlock + ' để lĩnh ngộ ' + sk.name); return; }
    if (p.cds[slot] > 0) return;
    if (p.mp < sk.mp) {
      if (!quiet && (!p.mpWarnT || S.time - p.mpWarnT > 1)) { p.mpWarnT = S.time; G.Texts.add(p.x, p.y - 75, 'Không đủ nội lực', '#8fc0ff', 13); }
      return;
    }
    if (sk.type === 'buff') { G.castSlot(p, slot, null); return; }
    let tgt = alive(S.target) ? S.target : null;
    if (!tgt) {
      tgt = G.nearestEnemy(p, 520);
      if (tgt) S.target = tgt;
    }
    if (!tgt) { G.castSlot(p, slot, null); return; }
    const d = Math.hypot(tgt.x - p.x, tgt.y - p.y);
    if (d > G.castRange(sk, tgt)) { p.pending = { slot, tgt }; p.moveTo = null; return; }
    G.castSlot(p, slot, tgt);
  };

  G.usePotion = function (kind) {
    const p = S.player;
    if (!p || p.dead || p.potCd > 0) return;
    if (p.potions[kind] <= 0) { G.toast(kind === 'hp' ? 'Hết bình máu' : 'Hết bình nội lực'); return; }
    if (kind === 'hp' && p.hp >= p.maxHp) return;
    if (kind === 'mp' && p.mp >= p.maxMp) return;
    p.potions[kind]--;
    p.potCd = 1.2;
    G.sfx('potion');
    if (kind === 'hp') {
      const v = Math.round(p.maxHp * 0.45);
      p.hp = Math.min(p.maxHp, p.hp + v);
      G.Texts.add(p.x, p.y - 70, '+' + v, '#8dff9a', 17);
      G.burst(p.x, p.y - 30, '#ff6a5a', 14, 120, { up: 60 });
    } else {
      const v = Math.round(p.maxMp * 0.5);
      p.mp = Math.min(p.maxMp, p.mp + v);
      G.Texts.add(p.x, p.y - 70, '+' + v, '#8fc0ff', 17);
      G.burst(p.x, p.y - 30, '#5c9cff', 14, 120, { up: 60 });
    }
  };

  G.respawnPlayer = function (p) {
    p.dead = false;
    p.x = W.cx;
    p.y = W.cy + 90;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    p.status = {};
    p.buffs = [];
    p.pending = null;
    p.moveTo = null;
    p.exp = Math.max(0, p.exp - Math.floor(G.expNeed(p.lv) * 0.08));
    S.target = null;
    G.Fx.add({ type: 'pillar', x: p.x, y: p.y, w: 40, color: '#f0d27a', dur: 0.8 });
    G.onPlayerRespawn && G.onPlayerRespawn();
  };

  /* ---------- AI quái ---------- */
  function monsterStrike(m, p) {
    if (!alive(p)) return;
    const el = E[m.el];
    m.atkAnim = 0;
    G.sfx(m.ranged ? 'cast' : 'swing', { x: m.x, y: m.y, el: m.el, type: 'projectile', soft: true, vol: 0.6 });
    if (m.ranged) {
      const h = G.bodyHeight(m);
      const shots = m.boss ? 3 : 1;
      const base = Math.atan2(p.y - m.y, p.x - m.x);
      for (let i = 0; i < shots; i++) {
        const a = base + (shots > 1 ? (i - 1) * 0.25 : 0);
        G.spawnProjectile({
          x: m.x, y: m.y - h * 0.55, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, life: 1.3, r: 10, team: 1, owner: m, dmg: 1, el: m.el,
          vfx: { kim: 'needle', moc: 'poison', thuy: 'ice', hoa: 'fire', tho: 'rock' }[m.el], effectChance: 0.15, homing: false,
        });
      }
    } else {
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      const ang = Math.atan2((p.y - m.y) / 0.72, p.x - m.x);
      G.Fx.add({ type: 'arc', x: m.x, y: m.y - 16 * m.size, ang, arc: 1.6, r: 46 * m.size, color: el.color, light: el.light, dur: 0.24 });
      if (d <= m.r + p.r + 26) G.dealDamage(m, p, 1, m.el, { effectChance: 0.15 });
    }
  }

  const IMPACT = { kim: 'pillar', moc: 'poisonburst', thuy: 'frost', hoa: 'meteor', tho: 'boulder' };
  function monsterSpecial(m, p) {
    m.specialN++;
    if (m.boss && m.specialN % 2 === 0) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        G.spawnProjectile({ x: m.x, y: m.y - 50, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 1.8, r: 12, team: 1, owner: m, dmg: 1.1, el: m.el, vfx: { kim: 'needle', moc: 'poison', thuy: 'ice', hoa: 'fire', tho: 'rock' }[m.el], effectChance: 0.3 });
      }
      G.ring(m.x, m.y, 20, 140, E[m.el].light, 0.5, 8);
      return;
    }
    const n = m.boss ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const ox = i ? G.rr(-120, 120) : 0, oy = i ? G.rr(-80, 80) : 0;
      G.spawnGround({ x: p.x + ox, y: p.y + oy, r: m.boss ? 120 : 105, delay: 1.1, dmg: m.boss ? 2.2 : 2.4, el: m.el, vfx: IMPACT[m.el], owner: m, team: 1, effectChance: 0.6 });
    }
  }

  G.updateMonster = function (m, dt, p) {
    if (m.dead) {
      m.deathT -= dt;
      m.respawnT -= dt;
      if (m.respawnT <= 0) respawnMonster(m);
      return;
    }
    m.flash -= dt; m.atkCd -= dt; m.specialCd -= dt; m.stunImmune -= dt; m.combatT -= dt;
    if (m.atkAnim >= 0) { m.atkAnim += dt / 0.35; if (m.atkAnim >= 1) m.atkAnim = -1; }
    const dP = alive(p) ? Math.hypot(p.x - m.x, p.y - m.y) : Infinity;
    if (dP > 1500 && m.ai === 'idle' && !Object.keys(m.status).length) return;
    updateStatus(m, dt);
    if (m.dead) return;
    if (m.D.cycle) {
      m.cycleT -= dt;
      if (m.cycleT <= 0) {
        m.cycleT = 7;
        m.el = G.SINH[m.el];
        const el = E[m.el];
        G.ring(m.x, m.y, 20, 180, el.light, 0.7, 10);
        G.sfx('elchange', { x: m.x, y: m.y });
        G.burst(m.x, m.y - 60, el.color, 40, 300, { hot: true });
        if (dP < 700) G.toast(m.name + ' chuyển sang hành ' + el.name + ' — hãy dùng hành khắc ' + el.name + '!', 'warn');
      }
    }
    if (m.status.stun) { m.moving = false; return; }
    if (m.windup > 0) {
      m.windup -= dt;
      m.moving = false;
      if (m.windup <= 0) monsterStrike(m, p);
      return;
    }
    const spd = G.stat(m, 'spd');
    let tx = null, ty = null, sp = spd;
    switch (m.ai) {
      case 'idle':
        m.wanderT -= dt;
        if (m.wanderT <= 0) {
          m.wanderT = G.rr(2, 5);
          const a = Math.random() * TAU, d = Math.random() * 90;
          m.wx = m.home.x + Math.cos(a) * d;
          m.wy = m.home.y + Math.sin(a) * d;
        }
        if (Math.hypot(m.wx - m.x, m.wy - m.y) > 6) { tx = m.wx; ty = m.wy; sp = spd * 0.35; }
        if (dP < (m.elite || m.boss ? 300 : 220) && !G.inVillage(p)) m.ai = 'chase';
        break;
      case 'chase': {
        const dh = Math.hypot(m.x - m.home.x, m.y - m.home.y);
        if (!alive(p) || dh > (m.boss ? 900 : 650) || G.inVillage(p)) { m.ai = 'return'; break; }
        if ((m.elite || m.boss) && m.specialCd <= 0 && dP < 420) {
          monsterSpecial(m, p);
          m.specialCd = m.boss ? 4.5 : 7;
        }
        const range = m.ranged ? 290 : m.r + p.r + 14;
        if (dP > range) { tx = p.x; ty = p.y; }
        else {
          m.face = p.x > m.x ? 1 : -1;
          if (m.atkCd <= 0) {
            m.windup = m.ranged ? 0.45 : 0.32;
            m.atkCd = (m.ranged ? 2 : 1.35) * (m.boss ? 0.8 : 1);
          }
        }
        break;
      }
      case 'return':
        tx = m.home.x; ty = m.home.y; sp = spd * 1.4;
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.5 * dt);
        if (Math.hypot(m.x - m.home.x, m.y - m.home.y) < 12) { m.ai = 'idle'; m.hp = m.maxHp; m.status = {}; }
        break;
    }
    if (tx !== null) {
      const d = Math.hypot(tx - m.x, ty - m.y);
      if (d > 1) {
        const k = Math.min(1, (sp * dt) / d);
        m.x += (tx - m.x) * k;
        m.y += (ty - m.y) * k;
        m.moving = true;
        m.walk += dt * 10;
        if (Math.abs(tx - m.x) > 2) m.face = tx > m.x ? 1 : -1;
      }
      G.collide(m);
    } else m.moving = false;
  };

  // Tách quái chồng lên nhau
  G.separate = function (list) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j], dx = b.x - a.x, dy = b.y - a.y, R = (a.r + b.r) * 0.85, d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.01) {
          const d = Math.sqrt(d2), push = (R - d) / 2;
          a.x -= (dx / d) * push; a.y -= (dy / d) * push;
          b.x += (dx / d) * push; b.y += (dy / d) * push;
        }
      }
    }
  };
})(window.G);
