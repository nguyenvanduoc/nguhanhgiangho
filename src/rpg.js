/* =====================================================================
 * rpg.js — Phần "nhập vai": trang bị, rơi đồ, hành trang, tiền lượng,
 * NPC trong trấn, hội thoại, chuỗi nhiệm vụ cốt truyện và truy nã.
 * ===================================================================== */
(function (G) {
  'use strict';
  const S = G.S, E = G.ELEMENTS, W = G.WORLD, TAU = G.TAU, rr = G.rr;
  const $ = (id) => document.getElementById(id);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const ELS = G.ELEMENT_ORDER;
  G.BAG_MAX = 30;

  /* =================== TRANG BỊ =================== */
  G.RARITY = [
    { name: 'Thường', color: '#d9d4c7', lines: 0, mult: 1 },
    { name: 'Tinh xảo', color: '#5cb8ff', lines: 1, mult: 1.15 },
    { name: 'Hiếm', color: '#c58cff', lines: 2, mult: 1.3 },
    { name: 'Hoàng Kim', color: '#f3c94a', lines: 3, mult: 1.55 },
  ];
  // Thứ tự 5 ô trang bị tạo thành một vòng: món trước "sinh" món sau
  G.SLOTS = ['weapon', 'armor', 'hat', 'neck', 'jade'];
  G.SLOT_NAME = { weapon: 'Vũ khí', armor: 'Y phục', hat: 'Đầu', neck: 'Hạng liên', jade: 'Ngọc bội' };
  const EL_ADJ = { kim: 'Kim Quang', moc: 'Thanh Mộc', thuy: 'Hàn Thủy', hoa: 'Liệt Diễm', tho: 'Huyền Thạch' };
  const WEAPON_NAME = { staff: 'Côn', needle: 'Phi Tiêu', flute: 'Sáo', blade: 'Đao', fan: 'Ngọc Phiến', sword: 'Kiếm', orb: 'Pháp Trượng', fist: 'Quyền Sáo', hammer: 'Chùy' };
  const BASE_NAME = { armor: ['Bào', 'Giáp', 'Y'], hat: ['Mão', 'Quan', 'Cân'], neck: ['Hạng Liên', 'Châu Liên'], jade: ['Ngọc Bội', 'Linh Bội'] };

  let uid = (Date.now() % 1e7) | 0;
  function rollLine(lv, boost) {
    const k = pick(['atkPct', 'crit', 'spd', 'hp', 'mp', 'def', 'res', 'dmg']);
    const b = boost || 1;
    let v;
    switch (k) {
      case 'atkPct': v = 3 + Math.random() * 5; break;
      case 'crit': v = 2 + Math.random() * 3; break;
      case 'spd': v = 3 + Math.random() * 4; break;
      case 'hp': v = (10 + lv * 4) * rr(0.7, 1.2); break;
      case 'mp': v = (8 + lv * 3) * rr(0.7, 1.2); break;
      case 'def': v = (1 + lv * 0.6) * rr(0.7, 1.2); break;
      case 'res': v = 8 + Math.random() * 10; break;
      default: v = 8 + Math.random() * 8;
    }
    const line = { k, v: Math.max(1, Math.round(v * b)) };
    if (k === 'res' || k === 'dmg') line.el = pick(ELS);
    return line;
  }

  // lv: cấp món đồ; rarity: 0..3; el: hành; slot & weaponKind có thể bỏ trống
  G.makeItem = function (lv, rarity, el, slot, weaponKind) {
    slot = slot || pick(G.SLOTS);
    el = el || pick(ELS);
    const m = G.RARITY[rarity].mult, base = [];
    const R = (v) => Math.max(1, Math.round(v * m));
    switch (slot) {
      case 'weapon': base.push({ k: 'atk', v: R(4 + lv * 1.7) }); break;
      case 'armor': base.push({ k: 'def', v: R(3 + lv * 1.1) }, { k: 'hp', v: R(14 + lv * 7) }); break;
      case 'hat': base.push({ k: 'def', v: R(2 + lv * 0.8) }, { k: 'hp', v: R(8 + lv * 5) }); break;
      case 'neck': base.push({ k: 'hp', v: R(16 + lv * 7) }, { k: 'mp', v: R(10 + lv * 4) }); break;
      case 'jade': base.push({ k: 'crit', v: 2 + rarity }, { k: 'mp', v: R(8 + lv * 3) }); break;
    }
    const lines = [];
    for (let i = 0; i < G.RARITY[rarity].lines; i++) lines.push(rollLine(lv));
    const hidden = rarity >= 1 ? rollLine(lv, 1.4) : null;
    let name = slot === 'weapon' ? (WEAPON_NAME[weaponKind] || 'Binh Khí') : pick(BASE_NAME[slot]);
    if (rarity === 3) name = 'Thần ' + name;
    name = EL_ADJ[el] + ' ' + name;
    return { id: ++uid, slot, el, lv, rarity, name, base, lines, hidden };
  };
  G.itemValue = (it) => Math.round((8 + it.lv * 3) * (1 + it.rarity * 1.6));

  G.lineText = function (l) {
    switch (l.k) {
      case 'atk': return 'Công +' + l.v;
      case 'def': return 'Thủ +' + l.v;
      case 'hp': return 'Sinh lực +' + l.v;
      case 'mp': return 'Nội lực +' + l.v;
      case 'atkPct': return 'Công +' + l.v + '%';
      case 'crit': return 'Bạo kích +' + l.v + '%';
      case 'spd': return 'Tốc độ chạy +' + l.v + '%';
      case 'res': return 'Kháng hành ' + E[l.el].name + ' +' + l.v + '%';
      case 'dmg': return 'Sát thương lên hành ' + E[l.el].name + ' +' + l.v + '%';
    }
    return '';
  };

  // Thuộc tính ẩn của ô `slot` sáng khi món ở ô liền trước có hành SINH ra hành của nó
  G.prevSlot = (slot) => G.SLOTS[(G.SLOTS.indexOf(slot) + 4) % 5];
  G.sinhSource = (el) => ELS.find((x) => G.SINH[x] === el);
  G.hiddenActive = function (p, slot) {
    const it = p.equip[slot], prev = p.equip[G.prevSlot(slot)];
    return !!(it && it.hidden && prev && G.SINH[prev.el] === it.el);
  };
  G.gearStats = function (p) {
    const g = { atk: 0, def: 0, hp: 0, mp: 0, atkPct: 0, crit: 0, spd: 0, res: {}, dmg: {}, active: 0, full: false };
    const add = (l) => {
      if (l.k === 'res' || l.k === 'dmg') g[l.k][l.el] = (g[l.k][l.el] || 0) + l.v;
      else g[l.k] += l.v;
    };
    for (const slot of G.SLOTS) {
      const it = p.equip[slot];
      if (!it) continue;
      it.base.forEach(add);
      it.lines.forEach(add);
      if (G.hiddenActive(p, slot)) { add(it.hidden); g.active++; }
    }
    if (g.active === 5) { g.full = true; g.atkPct += 10; g.crit += 5; g.spd += 5; }
    return g;
  };
  G.equippedCount = (p) => G.SLOTS.filter((s) => p.equip[s]).length;

  // Tính lại chỉ số khi đổi đồ, giữ nguyên tỉ lệ máu/nội lực hiện có
  G.refreshStats = function (p) {
    const hr = p.maxHp ? p.hp / p.maxHp : 1, mr = p.maxMp ? p.mp / p.maxMp : 1;
    p.gear = G.gearStats(p);
    G.recalc(p);
    p.hp = Math.max(1, Math.min(p.maxHp, Math.round(p.maxHp * hr)));
    p.mp = Math.min(p.maxMp, Math.round(p.maxMp * mr));
  };

  /* ---------- Biểu tượng món đồ (vẽ bằng code, cache theo món) ---------- */
  G.itemIcon = function (it) {
    if (it._icon) return it._icon;
    const c = G.makeCanvas(96, 96), g = c.getContext('2d'), el = E[it.el], rc = G.RARITY[it.rarity].color;
    const bg = g.createRadialGradient(48, 42, 4, 48, 48, 60);
    bg.addColorStop(0, G.rgba(el.color, 0.55));
    bg.addColorStop(1, '#0d1213');
    g.fillStyle = bg;
    g.fillRect(0, 0, 96, 96);
    g.strokeStyle = el.light;
    g.fillStyle = el.light;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = 6;
    switch (it.slot) {
      case 'weapon':
        g.beginPath(); g.moveTo(24, 74); g.lineTo(72, 24); g.stroke();
        g.lineWidth = 5; g.strokeStyle = '#d6b064';
        g.beginPath(); g.moveTo(26, 56); g.lineTo(42, 72); g.stroke();
        g.strokeStyle = '#5a3a20';
        g.beginPath(); g.moveTo(16, 82); g.lineTo(28, 70); g.stroke();
        break;
      case 'armor':
        g.beginPath(); g.moveTo(34, 20); g.lineTo(62, 20); g.lineTo(78, 34); g.lineTo(70, 44); g.lineTo(66, 40); g.lineTo(70, 80); g.lineTo(26, 80); g.lineTo(30, 40); g.lineTo(26, 44); g.lineTo(18, 34); g.closePath(); g.fill();
        g.strokeStyle = G.rgba('#0d1213', 0.6); g.lineWidth = 3;
        g.beginPath(); g.moveTo(38, 20); g.lineTo(48, 36); g.lineTo(58, 20); g.moveTo(28, 56); g.lineTo(68, 56); g.stroke();
        break;
      case 'hat':
        g.beginPath(); g.moveTo(10, 62); g.lineTo(48, 24); g.lineTo(86, 62); g.quadraticCurveTo(48, 72, 10, 62); g.fill();
        g.strokeStyle = G.rgba('#0d1213', 0.5); g.lineWidth = 2;
        g.beginPath(); g.moveTo(26, 50); g.lineTo(70, 50); g.moveTo(36, 40); g.lineTo(60, 40); g.stroke();
        break;
      case 'neck':
        g.lineWidth = 3;
        for (let i = 0; i < 14; i++) {
          const a = Math.PI * 0.05 + (i / 13) * Math.PI * 0.9;
          g.beginPath(); g.arc(48 + Math.cos(a) * 28, 30 + Math.sin(a) * 30, 4.5, 0, TAU); g.fill();
        }
        g.fillStyle = el.color;
        g.beginPath(); g.moveTo(48, 62); g.lineTo(58, 74); g.lineTo(48, 86); g.lineTo(38, 74); g.closePath(); g.fill();
        break;
      case 'jade':
        g.beginPath(); g.arc(48, 46, 24, 0, TAU); g.fill();
        g.fillStyle = '#0d1213';
        g.beginPath(); g.arc(48, 46, 8, 0, TAU); g.fill();
        g.strokeStyle = '#c8442d'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(48, 22); g.lineTo(48, 10); g.moveTo(48, 70); g.lineTo(44, 88); g.moveTo(48, 70); g.lineTo(52, 88); g.stroke();
        break;
    }
    g.strokeStyle = rc;
    g.lineWidth = it.rarity >= 2 ? 6 : 4;
    g.strokeRect(2, 2, 92, 92);
    Object.defineProperty(it, '_icon', { value: c, enumerable: false, configurable: true });
    return c;
  };
  function iconEl(it, cls) {
    const c = document.createElement('canvas');
    c.width = c.height = 96;
    c.getContext('2d').drawImage(G.itemIcon(it), 0, 0);
    if (cls) c.className = cls;
    return c;
  }

  /* =================== RƠI ĐỒ & NHẶT ĐỒ =================== */
  S.loot = S.loot || [];
  function drop(x, y, kind, data) {
    const a = Math.random() * TAU, v = rr(40, 110);
    S.loot.push(Object.assign({ x, y, z: 0, vz: rr(220, 320), vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6, kind, t: 0 }, data));
  }
  function rollRarity(minR) {
    const r = Math.random();
    const v = r < 0.6 ? 0 : r < 0.89 ? 1 : r < 0.985 ? 2 : 3;
    return Math.max(minR, v);
  }
  G.onMonsterKilled = function (m) {
    const p = S.player;
    if (!p) return;
    const gold = Math.round((3 + m.lv * 2) * rr(0.7, 1.3) * (m.boss ? 15 : m.elite ? 5 : 1));
    const coins = m.boss ? 6 : m.elite ? 4 : 1;
    for (let i = 0; i < coins; i++) drop(m.x, m.y, 'gold', { amount: Math.ceil(gold / coins) });
    let n = 0, minR = 0;
    if (m.boss) { n = 4; minR = 2; } else if (m.elite) { n = 2; minR = 1; } else if (Math.random() < 0.22) n = 1;
    for (let i = 0; i < n; i++) {
      const rar = m.boss && i === 0 ? 3 : rollRarity(minR);
      const el = Math.random() < 0.6 ? m.el : pick(ELS);
      drop(m.x, m.y, 'item', { item: G.makeItem(m.lv, rar, el, null, p.look.weapon) });
    }
    if (!m.boss && !m.elite && Math.random() < 0.08) drop(m.x, m.y, 'potion', { pot: Math.random() < 0.55 ? 'hp' : 'mp' });
    G.questKill(m);
  };

  G.nearestLoot = function (p, maxD) {
    if (p.bag.length >= G.BAG_MAX) return null;
    let best = null, bd = maxD;
    for (const l of S.loot) {
      if (l.kind !== 'item') continue;
      const d = Math.hypot(l.x - p.x, l.y - p.y);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  };

  function pickup(p, l) {
    if (l.kind === 'gold') {
      p.gold += l.amount;
      G.sfx('gold');
      G.Texts.add(p.x, p.y - 70, '+' + l.amount + ' lượng', '#f3d995', 12, 0.8);
      return true;
    }
    if (l.kind === 'potion') {
      p.potions[l.pot]++;
      G.sfx('potion');
      G.Texts.add(p.x, p.y - 70, l.pot === 'hp' ? '+1 bình máu' : '+1 bình nội lực', l.pot === 'hp' ? '#ff9a8a' : '#8fc0ff', 12);
      return true;
    }
    if (p.bag.length >= G.BAG_MAX) {
      if (!l.warned) { l.warned = true; G.toast('Hành trang đã đầy. Bán bớt đồ ở tiệm tạp hóa hoặc trong túi đồ.', 'warn'); }
      return false;
    }
    p.bag.push(l.item);
    G.sfx('item', { rarity: l.item.rarity });
    const R = G.RARITY[l.item.rarity];
    G.Texts.add(p.x, p.y - 74, l.item.name, R.color, 13, 1.3);
    if (l.item.rarity >= 2) G.toast('Nhặt được ' + R.name + ': ' + l.item.name, 'gold');
    G.bagDirty = true;
    return true;
  }

  G.updateLoot = function (dt) {
    const p = S.player, L = S.loot;
    for (let i = L.length - 1; i >= 0; i--) {
      const l = L[i];
      l.t += dt;
      if (l.z > 0 || l.vz > 0) {
        l.vz -= 900 * dt;
        l.z = Math.max(0, l.z + l.vz * dt);
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        if (l.z === 0) l.vz = 0;
      }
      if (p && !p.dead && l.t > 0.45) {
        const dx = p.x - l.x, dy = p.y - l.y, d = Math.hypot(dx, dy);
        const canTake = l.kind !== 'item' || p.bag.length < G.BAG_MAX;
        const mag = l.kind === 'item' ? 80 : 140;
        if (canTake && d < mag && d > 1) { const k = Math.min(1, (480 * dt) / d); l.x += dx * k; l.y += dy * k; }
        if (d < 24 && pickup(p, l)) { L.splice(i, 1); continue; }
      }
      if (l.t > 120) L.splice(i, 1);
    }
  };

  G.drawLoot = function (ctx, view) {
    const t = S.time;
    for (const l of S.loot) {
      if (l.x < view.x - 40 || l.x > view.x + view.w + 40 || l.y < view.y - 100 || l.y > view.y + view.h + 40) continue;
      const y = l.y - l.z;
      if (l.kind === 'gold') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(l.x, l.y, 6, 2.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#c9952c';
        ctx.beginPath(); ctx.ellipse(l.x, y - 4, 6, 4.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f6d36a';
        ctx.beginPath(); ctx.ellipse(l.x, y - 5, 4.6, 3, 0, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + Math.sin(t * 6 + l.x) * 0.3;
        ctx.drawImage(G.glow('#f3d995', true), l.x - 8, y - 13, 16, 16);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        continue;
      }
      if (l.kind === 'potion') {
        ctx.fillStyle = l.pot === 'hp' ? '#c8442d' : '#3f7fd8';
        ctx.beginPath(); ctx.roundRect(l.x - 4, y - 12, 8, 11, 2); ctx.fill();
        ctx.fillStyle = '#efe6d2';
        ctx.fillRect(l.x - 2, y - 15, 4, 3);
        continue;
      }
      const R = G.RARITY[l.item.rarity];
      ctx.globalCompositeOperation = 'lighter';
      if (l.item.rarity >= 1) {
        const h = 40 + l.item.rarity * 22, pulse = 0.55 + Math.sin(t * 4 + l.x) * 0.2;
        const gr = ctx.createLinearGradient(0, y - h, 0, y);
        gr.addColorStop(0, G.rgba(R.color, 0));
        gr.addColorStop(1, G.rgba(R.color, 0.7 * pulse));
        ctx.fillStyle = gr;
        ctx.fillRect(l.x - 3, y - h, 6, h);
      }
      ctx.globalAlpha = 0.7;
      ctx.drawImage(G.glow(R.color), l.x - 18, y - 22, 36, 36);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(G.itemIcon(l.item), l.x - 10, y - 16, 20, 20);
    }
  };

  /* =================== NPC =================== */
  G.createNPCs = function () {
    const base = { kind: 'npc', D: { body: 'humanoid' }, r: 14, size: 1, face: 1, walk: 0, moving: false, atkAnim: -1, flash: 0, invuln: 0, dead: false, status: {}, buffs: [], dash: null };
    return [
      Object.assign({}, base, {
        id: 'chief', name: 'Trấn Trưởng Mạc Lão', role: 'Nhiệm vụ', x: W.cx - 165, y: W.cy + 75, el: 'tho',
        look: { robe: '#4f4466', robe2: '#3c3352', trim: '#e6c58a', sash: '#2a2030', hat: 'topknot', hatColor: '#e6c58a', weapon: 'staff', wcolor: '#6a4a2a', pants: '#2a2030', skin: '#e2bd94', hair: '#d9d6cf' },
      }),
      Object.assign({}, base, {
        id: 'shop', name: 'Tiệm Tạp Hóa Bà Tư', role: 'Mua bán', x: W.cx + 165, y: W.cy + 75, el: 'hoa', face: -1,
        look: { robe: '#8a3a2a', robe2: '#6e2c20', trim: '#f0c070', sash: '#3a2018', hat: 'bun', weapon: 'fan', wcolor: '#f3e6c0', pants: '#3a2018', skin: '#e8c39a', hair: '#2a2420' },
      }),
    ];
  };
  G.updateNPCs = function () {
    const p = S.player;
    for (const n of S.npcs) if (p && Math.hypot(p.x - n.x, p.y - n.y) < 200) n.face = p.x >= n.x ? 1 : -1;
  };
  G.npcNear = function (p, d) {
    let best = null, bd = d;
    for (const n of S.npcs) { const dd = Math.hypot(p.x - n.x, p.y - n.y); if (dd < bd) { bd = dd; best = n; } }
    return best;
  };
  G.pickNPC = function (wx, wy) {
    for (const n of S.npcs) if (Math.hypot(n.x - wx, n.y - 30 - wy) < 28) return n;
    return null;
  };
  G.drawNpcOverhead = function (ctx, n) {
    const p = S.player, top = n.y - 72;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,8,6,0.85)';
    ctx.strokeText(n.name, n.x, top);
    ctx.fillStyle = '#a8f0c8';
    ctx.fillText(n.name, n.x, top);
    const mark = n.id === 'chief' ? (G.questAvailable() ? '!' : '') : '';
    if (mark) {
      const b = Math.sin(S.time * 4) * 3;
      ctx.font = '900 26px "Noto Serif", serif';
      ctx.lineWidth = 4;
      ctx.strokeText(mark, n.x, top - 22 + b);
      ctx.fillStyle = '#f3c94a';
      ctx.fillText(mark, n.x, top - 22 + b);
    }
    if (p && Math.hypot(p.x - n.x, p.y - n.y) < 90) {
      ctx.font = '600 11px "Be Vietnam Pro", system-ui, sans-serif';
      const txt = document.body.classList.contains('touch') ? 'Chạm để nói chuyện' : 'Nhấn R hoặc nhấp để nói chuyện';
      ctx.lineWidth = 3;
      ctx.strokeText(txt, n.x, n.y + 16);
      ctx.fillStyle = '#efe6d2';
      ctx.fillText(txt, n.x, n.y + 16);
    }
  };

  /* =================== NHIỆM VỤ =================== */
  const zoneOf = (el) => G.ZONES.find((z) => z.el === el);
  function dirWord(x, y) {
    const a = (Math.atan2(y - W.cy, x - W.cx) * 180) / Math.PI;
    const names = ['Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc', 'Bắc', 'Đông Bắc'];
    return names[(Math.round(((a + 360) % 360) / 45) % 8)];
  }
  const where = (el) => { const z = zoneOf(el); return z.name + ' (phía ' + dirWord(z.x, z.y) + ' trấn)'; };
  const K = (p) => G.KHAC[p.el];
  const KB = (p) => G.khacBy(p.el);
  const eliteOf = (el) => S.monsters.find((m) => m.elite && m.D.el === el);
  const bossOf = () => S.monsters.find((m) => m.boss);

  G.MAIN_QUESTS = [
    {
      title: 'Bước vào giang hồ', goal: 'kill', n: 5, filter: () => true,
      story: () => 'Việc đầu tiên: theo một con đường đất ra khỏi trấn, hạ 5 con yêu thú bất kỳ cho quen tay. Quái ở rìa vùng gần trấn yếu nhất, càng đi sâu càng mạnh.',
      label: () => 'Hạ yêu thú bất kỳ', target: (p) => zoneOf(K(p)),
      reward: { exp: 60, gold: 40, potions: 3 },
    },
    {
      title: 'Lấy khắc chế', goal: 'kill', n: 6, filter: (p, m) => m.el === K(p),
      story: (p) => 'Hành ' + E[p.el].name + ' của ngươi khắc hành ' + E[K(p)].name + '. Đánh yêu thú hành ' + E[K(p)].name + ' ngươi gây thêm 30% sát thương. Hãy tới ' + where(K(p)) + ' hạ 6 con.',
      label: (p) => 'Hạ yêu thú hành ' + E[K(p)].name, target: (p) => zoneOf(K(p)),
      reward: { exp: 140, gold: 60, item: 1 },
    },
    {
      title: 'Áo giáp chỉnh tề', goal: 'equip', n: 3,
      story: () => 'Yêu thú thường rơi trang bị. Mở Túi đồ (phím I), chọn món đồ rồi bấm Trang bị. Hãy mặc đủ 3 món.',
      label: () => 'Mặc trang bị', reward: { exp: 120, gold: 80 },
    },
    {
      title: 'Rèn luyện', goal: 'level', n: 5,
      story: () => 'Đạt cấp 5. Chiêu thứ ba mở ở cấp 3, tuyệt kỹ mở ở cấp 6. Thiếu máu thì quay về trấn: yêu thú không dám vào trấn và ngươi hồi máu rất nhanh khi thôi giao chiến.',
      label: () => 'Đạt cấp', reward: { gold: 100, potions: 5 },
    },
    {
      title: 'Biết người biết ta', goal: 'kill', n: 5, filter: (p, m) => m.el === KB(p),
      story: (p) => 'Hành ' + E[KB(p)].name + ' khắc ngươi: chúng đánh ngươi đau hơn 30%, còn ngươi chỉ gây 75% sát thương lên chúng. Tới ' + where(KB(p)) + ' hạ 5 con, nhớ mang đủ bình máu. Trang bị có dòng "Kháng hành ' + E[KB(p)].name + '" sẽ giúp ích.',
      label: (p) => 'Hạ yêu thú hành ' + E[KB(p)].name, target: (p) => zoneOf(KB(p)),
      reward: { exp: 320, gold: 120, item: 2 },
    },
    {
      title: 'Ngũ hành tương sinh', goal: 'activate', n: 1,
      story: () => 'Mỗi món Tinh xảo trở lên có một thuộc tính ẩn. Năm ô trang bị xếp thành vòng: Vũ khí → Y phục → Đầu → Hạng liên → Ngọc bội → Vũ khí. Thuộc tính ẩn của một món sáng lên khi món đứng trước nó có hành sinh ra hành của nó. Ví dụ Vũ khí hành Mộc kích hoạt Y phục hành Hỏa, vì Mộc sinh Hỏa. Hãy kích hoạt 1 thuộc tính ẩn.',
      label: () => 'Kích hoạt thuộc tính ẩn', reward: { exp: 320, gold: 150 },
    },
    {
      title: 'Tu luyện thành tài', goal: 'level', n: 10,
      story: () => 'Đạt cấp 10. Thủ lĩnh mỗi vùng ở cấp 12 và biết tung chiêu diện rộng: thấy vòng đỏ dưới chân thì chạy ra ngay.',
      label: () => 'Đạt cấp', reward: { gold: 200, potions: 6 },
    },
    {
      title: 'Hạ thủ lĩnh', goal: 'kill', n: 1, filter: (p, m) => m.elite && m.D.el === K(p),
      story: (p) => { const e = eliteOf(K(p)); return 'Thủ lĩnh ' + (e ? e.name : '') + ' ở sâu trong ' + where(K(p)) + '. Nó thuộc hành ngươi khắc, đây là thủ lĩnh dễ hạ nhất với ngươi. Né vòng đỏ, dùng tuyệt kỹ khi nó đứng yên.'; },
      label: (p) => { const e = eliteOf(K(p)); return 'Hạ ' + (e ? e.name : 'thủ lĩnh'); }, target: (p) => eliteOf(K(p)),
      reward: { exp: 900, gold: 300, item: 3 },
    },
    {
      title: 'Chuẩn bị đại chiến', goal: 'activate', n: 3,
      story: () => 'Kích hoạt đủ 3 thuộc tính ẩn. Kích hoạt đủ cả 5 sẽ đạt Ngũ Hành Viên Mãn: thêm 10% công, 5% bạo kích, 5% tốc độ chạy.',
      label: () => 'Kích hoạt thuộc tính ẩn', reward: { exp: 1000, gold: 400, potions: 8 },
    },
    {
      title: 'Tru diệt Yêu Vương', goal: 'kill', n: 1, filter: (p, m) => m.boss,
      story: () => 'Ngũ Hành Yêu Vương ở góc Đông Nam bản đồ. Cứ 7 giây nó đổi hành theo vòng tương sinh. Lúc nó mang hành ngươi khắc thì dồn tuyệt kỹ; lúc nó mang hành khắc ngươi thì lùi lại, uống thuốc, chờ lượt sau.',
      label: () => 'Hạ Ngũ Hành Yêu Vương', target: () => bossOf(),
      reward: { exp: 3000, gold: 1500, item: 3 },
    },
  ];

  S.quest = S.quest || { i: 0, count: 0, bounty: null, bountyN: 0 };
  G.initQuests = function (save) {
    S.quest = save && save.quest ? Object.assign({ i: 0, count: 0, bounty: null, bountyN: 0 }, save.quest) : { i: 0, count: 0, bounty: null, bountyN: 0 };
  };
  G.currentQuest = function () {
    const q = S.quest;
    if (q.i < G.MAIN_QUESTS.length) return G.MAIN_QUESTS[q.i];
    return null;
  };
  G.questAvailable = () => S.quest.i >= G.MAIN_QUESTS.length && !S.quest.bounty;

  function makeBounty(p) {
    S.quest.bountyN++;
    if (S.quest.bountyN % 4 === 0) {
      const el = pick(ELS), e = eliteOf(el);
      return { type: e.type, name: e.name, n: 1, count: 0, elite: true };
    }
    const pool = S.monsters.filter((m) => !m.elite && !m.boss && Math.abs(m.lv - p.lv) <= 3);
    const m = pool.length ? pick(pool) : pick(S.monsters.filter((x) => !x.elite && !x.boss));
    return { type: m.type, name: m.name, n: 8 + ((Math.random() * 5) | 0), count: 0 };
  }

  function progressOf(q, p) {
    switch (q.goal) {
      case 'kill': return S.quest.count;
      case 'equip': return G.equippedCount(p);
      case 'level': return p.lv;
      case 'activate': return (p.gear && p.gear.active) || 0;
    }
    return 0;
  }

  G.questKill = function (m) {
    const p = S.player, q = G.currentQuest(), b = S.quest.bounty;
    if (q && q.goal === 'kill' && q.filter(p, m)) S.quest.count++;
    if (b && m.type === b.type) b.count++;
    G.questCheck();
  };

  let checking = false;
  function giveReward(p, r) {
    if (r.gold) p.gold += r.gold;
    if (r.potions) { p.potions.hp += r.potions; p.potions.mp += r.potions; }
    if (r.item != null) {
      const it = G.makeItem(Math.max(1, p.lv), r.item, pick(ELS), null, p.look.weapon);
      if (p.bag.length < G.BAG_MAX) p.bag.push(it);
      else drop(p.x, p.y, 'item', { item: it });
      G.toast('Phần thưởng: ' + it.name + ' (' + G.RARITY[it.rarity].name + ')', 'gold');
    }
    if (r.exp) G.gainExp(p, r.exp);
  }
  G.questCheck = function () {
    const p = S.player;
    if (!p || checking) return;
    checking = true;
    let guard = 0;
    while (guard++ < 12) {
      const q = G.currentQuest();
      if (!q || progressOf(q, p) < q.n) break;
      S.quest.i++;
      S.quest.count = 0;
      G.banner('Hoàn thành: ' + q.title, rewardText(q.reward));
      G.sfx('quest');
      giveReward(p, q.reward);
      const nq = G.currentQuest();
      if (nq) G.toast('Nhiệm vụ mới: ' + nq.title + '. Nhấp vào khung nhiệm vụ để đọc chi tiết.', 'gold');
      else G.toast('Đã xong chuỗi nhiệm vụ chính. Gặp Trấn Trưởng để nhận lệnh truy nã.', 'gold');
    }
    const b = S.quest.bounty;
    if (b && b.count >= b.n) {
      const r = { exp: Math.round(G.expNeed(p.lv) * (b.elite ? 0.8 : 0.5)), gold: 25 * p.lv * (b.elite ? 3 : 1), item: b.elite ? 2 : Math.random() < 0.5 ? 1 : null };
      S.quest.bounty = null;
      G.banner('Hoàn thành truy nã', rewardText(r));
      G.sfx('quest');
      giveReward(p, r);
    }
    checking = false;
    G.saveGame && G.saveGame();
  };
  function rewardText(r) {
    const a = [];
    if (r.exp) a.push(r.exp + ' kinh nghiệm');
    if (r.gold) a.push(r.gold + ' lượng');
    if (r.potions) a.push(r.potions + ' bình máu và nội lực');
    if (r.item != null) a.push('1 trang bị ' + G.RARITY[r.item].name);
    return 'Nhận ' + a.join(', ');
  }

  // Mục tiêu đang theo dõi (để vẽ mũi tên chỉ đường)
  G.questTarget = function () {
    const p = S.player, q = G.currentQuest();
    if (q && q.target) {
      const t = q.target(p);
      if (t && !t.dead) return t;
      if (t && t.home) return t.home;
    }
    const b = S.quest.bounty;
    if (b) {
      let best = null, bd = Infinity;
      for (const m of S.monsters) {
        if (m.type !== b.type || m.dead) continue;
        const d = Math.hypot(m.x - p.x, m.y - p.y);
        if (d < bd) { bd = d; best = m; }
      }
      return best;
    }
    return null;
  };

  G.updateQuestHud = function () {
    const p = S.player, q = G.currentQuest(), b = S.quest.bounty;
    let title, goal, whereTxt = '';
    if (q) {
      title = q.title;
      const pr = Math.min(progressOf(q, p), q.n);
      goal = q.label(p) + (q.goal === 'level' ? ' ' + q.n + ' (hiện ' + p.lv + ')' : ' ' + pr + '/' + q.n);
      const t = q.target ? q.target(p) : null;
      if (t && G.ZONES.includes(t)) whereTxt = where(t.el);
      else if (t) whereTxt = 'Mũi tên vàng cạnh nhân vật chỉ đường';
    } else if (b) {
      title = 'Truy nã';
      goal = 'Hạ ' + b.name + ' ' + b.count + '/' + b.n;
      whereTxt = 'Mũi tên vàng cạnh nhân vật chỉ đường';
    } else {
      title = 'Truy nã';
      goal = 'Gặp Trấn Trưởng Mạc Lão để nhận lệnh mới';
    }
    setT('qTitle', title);
    setT('qGoal', goal);
    setT('qWhere', whereTxt);
  };
  function setT(id, v) { const el = $(id); if (el && el._v !== v) { el._v = v; el.textContent = v; } }

  /* =================== HỘI THOẠI =================== */
  G.openDialog = function (npc, text, buttons) {
    $('dlgName').textContent = npc.name;
    $('dlgRole').textContent = npc.role || '';
    $('dlgText').textContent = text;
    const c = $('dlgPortrait'), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#141b1c';
    g.fillRect(0, 0, c.width, c.height);
    g.setTransform(c.width / 64, 0, 0, c.width / 64, 0, 0);
    G.drawHumanoid(g, 30, 126, npc.look, { face: 1, walk: 0, moving: false, atk: -1, t: 0, scale: 2.2, el: npc.el });
    const box = $('dlgBtns');
    box.innerHTML = '';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = b.primary ? 'btn-primary sm' : 'hbtn';
      btn.textContent = b.label;
      if (b.disabled) btn.disabled = true;
      btn.addEventListener('click', b.fn || (() => G.openPanel(null)));
      box.appendChild(btn);
    }
    G.openPanel('dialog');
  };

  G.talk = function (npc) {
    const p = S.player;
    if (!p) return;
    if (npc.id === 'chief') {
      const q = G.currentQuest();
      if (q) {
        const pr = Math.min(progressOf(q, p), q.n);
        G.openDialog(npc, q.story(p) + '\n\nTiến độ: ' + q.label(p) + (q.goal === 'level' ? ' ' + q.n + ' (hiện ' + p.lv + ')' : ' ' + pr + '/' + q.n) + '.', [
          { label: 'Đã rõ', primary: true },
          { label: 'Xem hướng dẫn', fn: () => G.openPanel('guide') },
        ]);
      } else if (S.quest.bounty) {
        const b = S.quest.bounty;
        G.openDialog(npc, 'Lệnh truy nã đang làm: hạ ' + b.name + ' ' + b.count + '/' + b.n + '. Xong việc ta sẽ trả công ngay.', [{ label: 'Đã rõ', primary: true }]);
      } else {
        G.openDialog(npc, 'Yêu Vương đã bị đánh lui, nhưng yêu thú vẫn còn quấy nhiễu. Ta có lệnh truy nã, xong việc trả công bằng kinh nghiệm, lượng và trang bị.', [
          { label: 'Nhận lệnh truy nã', primary: true, fn: () => { S.quest.bounty = makeBounty(p); G.openPanel(null); G.toast('Truy nã: hạ ' + S.quest.bounty.name + ' ×' + S.quest.bounty.n, 'gold'); G.saveGame(); } },
          { label: 'Để sau' },
        ]);
      }
    } else if (npc.id === 'shop') shopDialog(npc);
  };

  const POT_PRICE = 12;
  function shopDialog(npc) {
    const p = S.player;
    const junk = p.bag.filter((it) => it.rarity === 0);
    const junkGold = junk.reduce((s, it) => s + G.itemValue(it), 0);
    const buy = (kind) => () => {
      const cost = POT_PRICE * 5;
      if (p.gold < cost) { G.toast('Không đủ lượng', 'warn'); return; }
      p.gold -= cost;
      p.potions[kind] += 5;
      G.sfx('gold');
      G.saveGame();
      shopDialog(npc);
    };
    G.openDialog(npc, 'Khách quan đang có ' + p.gold + ' lượng, ' + p.potions.hp + ' bình máu, ' + p.potions.mp + ' bình nội lực. Mỗi bình ' + POT_PRICE + ' lượng. Đồ Thường không dùng tới thì bán lại cho ta.', [
      { label: 'Mua 5 bình máu · ' + POT_PRICE * 5 + ' lượng', primary: true, fn: buy('hp'), disabled: p.gold < POT_PRICE * 5 },
      { label: 'Mua 5 bình nội lực · ' + POT_PRICE * 5 + ' lượng', fn: buy('mp'), disabled: p.gold < POT_PRICE * 5 },
      { label: junk.length ? 'Bán ' + junk.length + ' đồ Thường · +' + junkGold + ' lượng' : 'Không có đồ Thường để bán', disabled: !junk.length, fn: () => { p.bag = p.bag.filter((it) => it.rarity > 0); p.gold += junkGold; G.saveGame(); shopDialog(npc); } },
      { label: 'Mở túi đồ', fn: () => G.openPanel('bag') },
      { label: 'Đi thôi' },
    ]);
  }

  G.introDialog = function () {
    const chief = S.npcs.find((n) => n.id === 'chief');
    const p = S.player;
    G.openDialog(chief, 'Chào ' + p.name + ' của ' + p.sect.name + '. Tế đàn Ngũ Hành giữa trấn giữ cân bằng cho năm vùng đất, nhưng Ngũ Hành Yêu Vương đã làm nó đảo loạn. Yêu thú Kim, Mộc, Thủy, Hỏa, Thổ kéo nhau tràn ra. Ta cần một người đủ bản lĩnh dẹp loạn.\n\n' + G.MAIN_QUESTS[0].story(p), [
      { label: 'Nhận nhiệm vụ', primary: true },
      { label: 'Xem hướng dẫn cách chơi', fn: () => G.openPanel('guide') },
    ]);
  };

  /* =================== TÚI ĐỒ =================== */
  let sel = null; // { from: 'bag'|'equip', id }
  function findSel(p) {
    if (!sel) return null;
    if (sel.from === 'equip') return p.equip[sel.slot] || null;
    return p.bag.find((it) => it.id === sel.id) || null;
  }
  G.equipItem = function (it) {
    const p = S.player;
    if (it.lv > p.lv) { G.toast('Cần cấp ' + it.lv + ' để mặc món này', 'warn'); return; }
    const old = p.equip[it.slot];
    p.bag = p.bag.filter((x) => x.id !== it.id);
    p.equip[it.slot] = it;
    if (old) p.bag.push(old);
    G.sfx('equip');
    G.refreshStats(p);
    sel = { from: 'equip', slot: it.slot };
    G.questCheck();
    G.renderBag();
  };
  G.unequip = function (slot) {
    const p = S.player, it = p.equip[slot];
    if (!it) return;
    if (p.bag.length >= G.BAG_MAX) { G.toast('Túi đồ đã đầy', 'warn'); return; }
    delete p.equip[slot];
    p.bag.push(it);
    G.refreshStats(p);
    sel = { from: 'bag', id: it.id };
    G.renderBag();
    G.saveGame();
  };
  G.sellItem = function (it) {
    const p = S.player;
    p.bag = p.bag.filter((x) => x.id !== it.id);
    p.gold += G.itemValue(it);
    G.sfx('gold');
    G.toast('Đã bán ' + it.name + ' · +' + G.itemValue(it) + ' lượng');
    sel = null;
    G.renderBag();
    G.saveGame();
  };

  G.renderBag = function () {
    const p = S.player;
    if (!p) return;
    G.bagDirty = false;
    const g = p.gear || G.gearStats(p);
    $('bagGold').textContent = p.gold + ' lượng';
    $('bagCount').textContent = p.bag.length + '/' + G.BAG_MAX;
    // vòng trang bị
    const ring = $('ring');
    ring.innerHTML = '';
    const C = 120, R = 88;
    const pos = G.SLOTS.map((s, i) => { const a = -Math.PI / 2 + (i / 5) * TAU; return { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R }; });
    let svg = '<svg viewBox="0 0 240 240" aria-hidden="true">';
    G.SLOTS.forEach((slot, i) => {
      const a = pos[(i + 4) % 5], b = pos[i];
      const prev = p.equip[G.SLOTS[(i + 4) % 5]], cur = p.equip[slot];
      const on = prev && cur && G.SINH[prev.el] === cur.el;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), k = 34 / d;
      svg += '<line x1="' + (a.x + dx * k).toFixed(1) + '" y1="' + (a.y + dy * k).toFixed(1) + '" x2="' + (b.x - dx * k).toFixed(1) + '" y2="' + (b.y - dy * k).toFixed(1) + '" stroke="' + (on ? '#f3c94a' : 'rgba(239,230,210,0.18)') + '" stroke-width="' + (on ? 3 : 1.5) + '"' + (on ? '' : ' stroke-dasharray="4 4"') + '/>';
    });
    svg += '</svg>';
    ring.insertAdjacentHTML('beforeend', svg);
    G.SLOTS.forEach((slot, i) => {
      const it = p.equip[slot];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'eq' + (G.hiddenActive(p, slot) ? ' lit' : '') + (sel && sel.from === 'equip' && sel.slot === slot ? ' sel' : '');
      b.style.left = pos[i].x - 30 + 'px';
      b.style.top = pos[i].y - 30 + 'px';
      b.setAttribute('aria-label', G.SLOT_NAME[slot] + (it ? ': ' + it.name : ': trống'));
      if (it) b.appendChild(iconEl(it));
      else b.insertAdjacentHTML('beforeend', '<span>' + G.SLOT_NAME[slot] + '</span>');
      if (it) b.insertAdjacentHTML('beforeend', '<i class="elc" style="--c:' + E[it.el].color + '">' + E[it.el].han + '</i>');
      b.addEventListener('click', () => { sel = it ? { from: 'equip', slot } : null; G.renderBag(); });
      ring.appendChild(b);
    });
    ring.insertAdjacentHTML('beforeend', '<div class="ring-c"><b>' + g.active + '/5</b><span>ẩn kích hoạt</span>' + (g.full ? '<em>Ngũ Hành Viên Mãn</em>' : '') + '</div>');
    $('ringInfo').textContent = g.full
      ? 'Viên Mãn: thêm 10% công, 5% bạo kích, 5% tốc độ chạy.'
      : 'Mũi tên vàng là cặp tương sinh. Món trước sinh ra hành của món sau thì thuộc tính ẩn của món sau sáng lên.';
    // lưới túi
    const grid = $('bagGrid');
    grid.innerHTML = '';
    for (let i = 0; i < G.BAG_MAX; i++) {
      const it = p.bag[i];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cell' + (it && sel && sel.from === 'bag' && sel.id === it.id ? ' sel' : '') + (it && it.lv > p.lv ? ' high' : '');
      if (it) {
        b.appendChild(iconEl(it));
        b.insertAdjacentHTML('beforeend', '<i>' + it.lv + '</i>');
        b.setAttribute('aria-label', it.name);
        b.addEventListener('click', () => { sel = { from: 'bag', id: it.id }; G.renderBag(); });
      } else b.disabled = true;
      grid.appendChild(b);
    }
    renderCard(p);
  };

  function renderCard(p) {
    const card = $('itemCard'), it = findSel(p);
    card.innerHTML = '';
    if (!it) {
      card.innerHTML = '<p class="muted">Chọn một món trong túi hoặc trên vòng trang bị để xem chi tiết.</p>';
      return;
    }
    const R = G.RARITY[it.rarity], el = E[it.el];
    const active = sel.from === 'equip' && G.hiddenActive(p, it.slot);
    let h = '<div class="ic-head"></div>';
    h += '<b class="ic-name" style="color:' + R.color + '">' + it.name + '</b>';
    h += '<div class="ic-meta"><span class="chip" style="--c:' + el.color + '">' + el.han + '</span>' + G.SLOT_NAME[it.slot] + ' · ' + R.name + ' · cấp ' + it.lv + '</div>';
    h += '<ul class="ic-lines">' + it.base.map((l) => '<li>' + G.lineText(l) + '</li>').join('') + it.lines.map((l) => '<li class="x">' + G.lineText(l) + '</li>').join('') + '</ul>';
    if (it.hidden) {
      const src = E[G.sinhSource(it.el)];
      h += '<p class="ic-hidden' + (active ? ' on' : '') + '">Ẩn: ' + G.lineText(it.hidden) + '<br><small>' + (active ? 'Đang kích hoạt' : 'Kích hoạt khi ô ' + G.SLOT_NAME[G.prevSlot(it.slot)] + ' mặc đồ hành ' + src.name + ' (' + src.name + ' sinh ' + el.name + ')') + '</small></p>';
    }
    if (sel.from === 'bag') {
      const cur = p.equip[it.slot];
      if (cur) h += '<p class="muted">Đang mặc: <span style="color:' + G.RARITY[cur.rarity].color + '">' + cur.name + '</span> · ' + cur.base.map(G.lineText).join(', ') + '</p>';
    }
    h += '<div class="ic-btns"></div>';
    card.innerHTML = h;
    card.querySelector('.ic-head').appendChild(iconEl(it));
    const btns = card.querySelector('.ic-btns');
    const mk = (label, fn, primary, dis) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = primary ? 'btn-primary sm' : 'hbtn';
      b.textContent = label;
      b.disabled = !!dis;
      b.addEventListener('click', fn);
      btns.appendChild(b);
    };
    if (sel.from === 'bag') {
      mk(it.lv > p.lv ? 'Cần cấp ' + it.lv : 'Trang bị', () => G.equipItem(it), true, it.lv > p.lv);
      mk('Bán · ' + G.itemValue(it) + ' lượng', () => G.sellItem(it));
    } else mk('Tháo ra', () => G.unequip(it.slot));
  }
})(window.G);
