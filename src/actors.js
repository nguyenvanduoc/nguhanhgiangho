/* =====================================================================
 * actors.js — Vẽ nhân vật và quái vật bằng vector (Canvas 2D)
 * Không cần file ảnh: dáng người, áo bào, nón lá, vũ khí, thú, linh hồn,
 * người đá đều vẽ bằng code nên đổi màu/môn phái chỉ cần sửa dữ liệu.
 * ===================================================================== */
(function (G) {
  'use strict';
  const TAU = G.TAU, E = G.ELEMENTS;

  /* ---------- Vũ khí ---------- */
  function drawWeapon(ctx, kind, L, el, glowOn) {
    switch (kind) {
      case 'sword':
        ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(1, 0); ctx.stroke();
        ctx.strokeStyle = '#d6b064'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(1, -3.5); ctx.lineTo(1, 3.5); ctx.stroke();
        ctx.fillStyle = L.wcolor;
        ctx.beginPath(); ctx.moveTo(2, -1.4); ctx.lineTo(31, -1); ctx.lineTo(36, 0); ctx.lineTo(31, 1); ctx.lineTo(2, 1.4); ctx.closePath(); ctx.fill();
        break;
      case 'blade':
        ctx.strokeStyle = '#3a2418'; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(2, 0); ctx.stroke();
        ctx.fillStyle = L.wcolor;
        ctx.beginPath(); ctx.moveTo(2, -1.8); ctx.lineTo(24, -3.6); ctx.quadraticCurveTo(33, -3.4, 35, 1.2); ctx.lineTo(2, 2.2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#d6b064'; ctx.fillRect(0, -3, 2.4, 6);
        break;
      case 'staff':
        ctx.strokeStyle = L.wcolor; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(38, 0); ctx.stroke();
        ctx.fillStyle = '#e6c068'; ctx.fillRect(-24, -2.4, 5, 4.8); ctx.fillRect(35, -2.4, 5, 4.8);
        break;
      case 'hammer':
        ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(28, 0); ctx.stroke();
        ctx.fillStyle = L.wcolor;
        ctx.beginPath(); ctx.roundRect(25, -9, 13, 18, 3); ctx.fill();
        ctx.fillStyle = '#d6b064'; ctx.fillRect(25, -1.5, 13, 3);
        break;
      case 'orb':
        ctx.strokeStyle = '#4a2a18'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(22, 0); ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(G.glow(E[el].color, true), 12, -14, 28, 28);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = E[el].light;
        ctx.beginPath(); ctx.arc(26, 0, 3.6, 0, TAU); ctx.fill();
        break;
      case 'fan':
        ctx.fillStyle = L.wcolor;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 15, -0.75, 0.75); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(40,70,110,0.45)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let a = -0.6; a <= 0.61; a += 0.3) { ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); }
        ctx.stroke();
        break;
      case 'flute':
        ctx.strokeStyle = L.wcolor; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(22, 0); ctx.stroke();
        ctx.fillStyle = '#2a3a1a';
        for (let x = 6; x < 20; x += 4) ctx.fillRect(x, -0.6, 1.4, 1.2);
        break;
      case 'needle':
        ctx.strokeStyle = L.wcolor; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(2, -3); ctx.lineTo(10, -5.5); ctx.moveTo(2, 0); ctx.lineTo(11, 0); ctx.moveTo(2, 3); ctx.lineTo(10, 5.5); ctx.stroke();
        break;
    }
    if (glowOn && kind === 'fist') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(G.glow(E[el].color, true), -14, -14, 28, 28);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  const IDLE_OFF = { sword: -1.85, blade: -1.85, staff: -2.75, hammer: -2.9, orb: -2.65, fan: -1.35, flute: -1.85, needle: 0, fist: 0 };

  /* ---------- Người (người chơi, NPC, quái hình người) ----------
   * st = { face: 1|-1, walk, moving, atk: 0..1 (đang ra đòn) hoặc -1, t, scale, ranged, el } */
  G.drawHumanoid = function (ctx, x, y, L, st) {
    const s = st.scale || 1, t = st.t;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 5.5, 0, 0, TAU); ctx.fill();
    ctx.scale(st.face || 1, 1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const sw = st.moving ? Math.sin(st.walk) : 0;
    const bob = st.moving ? -Math.abs(Math.cos(st.walk)) * 2 : Math.sin(t * 2.2) * 0.7;

    // chân
    ctx.strokeStyle = L.pants || '#2a2420';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(-3, -15 + bob); ctx.lineTo(-3 + sw * 6, -1.5);
    ctx.moveTo(3, -15 + bob); ctx.lineTo(3 - sw * 6, -1.5);
    ctx.stroke();
    ctx.fillStyle = '#16120f';
    ctx.beginPath();
    ctx.ellipse(-1.5 + sw * 6, -1.2, 3.2, 1.7, 0, 0, TAU);
    ctx.ellipse(4.5 - sw * 6, -1.2, 3.2, 1.7, 0, 0, TAU);
    ctx.fill();
    ctx.translate(0, bob);

    // khăn bay phía sau
    const wind = Math.sin(t * 5 + 1) * 2.5, trail = st.moving ? 7 : 0;
    if (L.scarf) {
      ctx.strokeStyle = L.scarf;
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(-3, -40); ctx.quadraticCurveTo(-12 - trail, -40 + wind, -21 - trail * 1.6, -33 + wind * 1.5); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-3, -39); ctx.quadraticCurveTo(-10 - trail, -34 + wind, -17 - trail * 1.4, -27 + wind); ctx.stroke();
    }
    if (L.long) {
      ctx.fillStyle = L.hair;
      ctx.beginPath(); ctx.moveTo(-4, -50); ctx.quadraticCurveTo(-11 - trail * 0.6, -40 + wind * 0.5, -8 - trail, -28 + wind * 0.6); ctx.lineTo(-2, -34); ctx.closePath(); ctx.fill();
    }

    // góc tay
    const atk = st.atk;
    let aF, wa;
    const aB = 1.75 + sw * 0.35;
    if (atk >= 0) {
      if (st.ranged) { aF = -0.15 - Math.sin(atk * Math.PI) * 0.3; wa = aF; }
      else { aF = -2.3 + G.easeOut(atk) * 3.3; wa = aF + 0.12; }
    } else {
      aF = 1.35 - sw * 0.35 + Math.sin(t * 2) * 0.04;
      wa = aF + (IDLE_OFF[L.weapon] || 0);
    }

    // tay sau
    ctx.strokeStyle = L.robe2;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-5, -36); ctx.lineTo(-5 + Math.cos(aB) * 11, -36 + Math.sin(aB) * 11); ctx.stroke();
    ctx.fillStyle = L.skin;
    ctx.beginPath(); ctx.arc(-5 + Math.cos(aB) * 12, -36 + Math.sin(aB) * 12, 2.4, 0, TAU); ctx.fill();

    // áo bào
    ctx.fillStyle = L.robe;
    ctx.beginPath();
    ctx.moveTo(-9, -40); ctx.lineTo(9, -40);
    ctx.quadraticCurveTo(12, -26, 14 - sw * 1.5, -11);
    ctx.lineTo(-13 - sw * 1.5, -11);
    ctx.quadraticCurveTo(-11, -26, -9, -40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = L.robe2;
    ctx.beginPath();
    ctx.moveTo(1, -38); ctx.lineTo(9, -40); ctx.quadraticCurveTo(12, -26, 14 - sw * 1.5, -11); ctx.lineTo(3, -11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = L.trim;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-5, -40); ctx.lineTo(1, -31); ctx.lineTo(6, -40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13 - sw * 1.5, -12.2); ctx.lineTo(14 - sw * 1.5, -12.2); ctx.stroke();
    ctx.fillStyle = L.sash || L.trim;
    ctx.fillRect(-10.5, -27, 22, 3.6);
    if (L.beads) {
      ctx.fillStyle = '#4a2a14';
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
        ctx.beginPath(); ctx.arc(1 + Math.cos(a) * 8, -42 + Math.sin(a) * 8, 1.4, 0, TAU); ctx.fill();
      }
    }

    // đầu
    ctx.fillStyle = L.skin;
    ctx.fillRect(-1.5, -44, 4, 5);
    ctx.beginPath(); ctx.arc(1, -47.5, 6.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(4, -48.8, 1.6, 1.8);
    const hairCap = () => {
      ctx.fillStyle = L.hair;
      ctx.beginPath(); ctx.arc(1, -48.5, 6.7, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      ctx.beginPath(); ctx.arc(-1.2, -47, 5.6, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    };
    switch (L.hat) {
      case 'bald':
        ctx.fillStyle = '#7a4a2a';
        ctx.fillRect(-1, -53, 1.2, 1.2); ctx.fillRect(2, -53.5, 1.2, 1.2);
        break;
      case 'bun':
        hairCap();
        ctx.beginPath(); ctx.arc(-3.5, -55, 3.8, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#d6b064'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, -57); ctx.lineTo(1, -54); ctx.stroke();
        break;
      case 'band':
        hairCap();
        ctx.fillStyle = L.hatColor;
        ctx.fillRect(-5.5, -52, 13, 2.8);
        ctx.strokeStyle = L.hatColor; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(-5, -51); ctx.quadraticCurveTo(-11, -50 + wind, -15 - trail, -46 + wind * 1.3); ctx.stroke();
        break;
      case 'hood':
        ctx.fillStyle = L.hatColor;
        ctx.beginPath(); ctx.arc(0.5, -48, 8.8, Math.PI * 0.62, Math.PI * 2.08); ctx.lineTo(4, -42); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-8, -46); ctx.lineTo(-9, -38); ctx.lineTo(0, -40); ctx.closePath(); ctx.fill();
        break;
      case 'conical':
        hairCap();
        ctx.fillStyle = L.hatColor;
        ctx.beginPath(); ctx.moveTo(-15, -50.5); ctx.lineTo(1, -63); ctx.lineTo(17, -50.5); ctx.quadraticCurveTo(1, -47, -15, -50.5); ctx.fill();
        ctx.strokeStyle = 'rgba(80,60,20,0.35)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(-9, -54.5); ctx.lineTo(11, -54.5); ctx.moveTo(-4, -58.5); ctx.lineTo(6, -58.5); ctx.stroke();
        ctx.strokeStyle = '#6a5228';
        ctx.beginPath(); ctx.moveTo(-3, -50); ctx.lineTo(2, -41.5); ctx.stroke();
        break;
      case 'topknot':
        hairCap();
        ctx.beginPath(); ctx.arc(0, -56, 3, 0, TAU); ctx.fill();
        ctx.fillStyle = L.hatColor; ctx.fillRect(-2.5, -55, 5, 1.6);
        break;
      case 'veil':
        hairCap();
        ctx.fillStyle = L.hatColor;
        ctx.beginPath(); ctx.ellipse(1, -55.5, 7, 4.5, 0, Math.PI, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(1, -53, 16, 3.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(30,24,20,0.55)';
        ctx.beginPath(); ctx.moveTo(-14, -53); ctx.lineTo(-13, -39 + wind * 0.3); ctx.lineTo(15, -39 + wind * 0.3); ctx.lineTo(16, -53); ctx.closePath(); ctx.fill();
        break;
      case 'helm':
        ctx.fillStyle = L.hatColor;
        ctx.beginPath(); ctx.arc(1, -48.5, 7.4, Math.PI, TAU); ctx.fill();
        ctx.fillRect(-6.5, -49, 4, 7);
        ctx.strokeStyle = '#a3261c'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.moveTo(1, -56); ctx.quadraticCurveTo(-6, -60, -10 - trail * 0.5, -54 + wind); ctx.stroke();
        break;
      default:
        hairCap();
    }

    // tay trước + vũ khí
    const hx = 6 + Math.cos(aF) * 12, hy = -37 + Math.sin(aF) * 12;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(wa);
    drawWeapon(ctx, L.weapon, L, st.el, atk >= 0);
    ctx.restore();
    ctx.strokeStyle = L.robe;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(6, -37); ctx.lineTo(6 + Math.cos(aF) * 10, -37 + Math.sin(aF) * 10); ctx.stroke();
    ctx.fillStyle = L.skin;
    ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* ---------- Thú 4 chân (sói, cáo) ---------- */
  function drawBeast(ctx, m, t) {
    const L = m.look, el = E[m.el];
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(m.size, m.size);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 6.5, 0, 0, TAU); ctx.fill();
    ctx.scale(m.face, 1);
    const mv = m.moving ? 1 : 0.12, ph = m.walk;
    const lunge = m.atkAnim >= 0 ? Math.sin(m.atkAnim * Math.PI) * 7 : 0;
    ctx.translate(lunge, 0);
    ctx.lineCap = 'round';
    ctx.strokeStyle = L.dark;
    ctx.lineWidth = 3.6;
    const legs = [[-12, 0], [-6, Math.PI], [8, Math.PI * 0.5], [13, Math.PI * 1.5]];
    ctx.beginPath();
    for (const [lx, o] of legs) { const k = Math.sin(ph + o) * 5 * mv; ctx.moveTo(lx, -14); ctx.lineTo(lx + k, -1); }
    ctx.stroke();
    ctx.strokeStyle = L.body;
    ctx.lineWidth = 5.5;
    ctx.beginPath(); ctx.moveTo(-16, -20); ctx.quadraticCurveTo(-28, -22 + Math.sin(t * 5) * 3, -31, -32 + Math.sin(t * 5 + 1) * 4); ctx.stroke();
    ctx.fillStyle = L.body;
    ctx.beginPath(); ctx.ellipse(0, -20, 19, 10.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = L.belly;
    ctx.beginPath(); ctx.ellipse(3, -15, 13, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = G.rgba(L.dark, 0.55);
    ctx.beginPath(); ctx.ellipse(-3, -27, 14, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = L.body;
    ctx.beginPath(); ctx.arc(17, -26, 8.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(25, -23, 7, 4.2, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = L.dark;
    ctx.beginPath();
    ctx.moveTo(11, -32); ctx.lineTo(13, -42); ctx.lineTo(18, -32);
    ctx.moveTo(17, -32); ctx.lineTo(21.5, -41); ctx.lineTo(23, -31);
    ctx.fill();
    ctx.beginPath(); ctx.arc(31.5, -23, 1.8, 0, TAU); ctx.fill();
    if (m.elite || m.boss) {
      ctx.fillStyle = el.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) { const x = -12 + i * 6; ctx.moveTo(x, -28); ctx.lineTo(x + 3, -36 - (i % 2) * 3); ctx.lineTo(x + 6, -28); }
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.glow(el.color, true), 15, -33, 12, 12);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  /* ---------- Linh hồn bay (wisp) ---------- */
  function drawWisp(ctx, m, t) {
    const el = E[m.el], s = m.size, bob = Math.sin(t * 3 + m.seed) * 4;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 0, 12 * s, 4 * s, 0, 0, TAU); ctx.fill();
    ctx.translate(0, (-28 + bob) * s);
    ctx.scale(s, s);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.glow(el.color), -30, -30, 60, 60);
    for (let i = 0; i < 4; i++) {
      const k = i / 4;
      ctx.globalAlpha = 0.5 * (1 - k);
      ctx.drawImage(G.glow(el.color), -m.face * (6 + i * 7) - 8, 6 + i * 4 - 8 + Math.sin(t * 6 + i) * 2, 16 - i * 2, 16 - i * 2);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 2; i++) {
      const a = t * 3 + i * Math.PI;
      ctx.drawImage(G.glow(el.light, true), Math.cos(a) * 17 - 5, Math.sin(a) * 7 - 5, 10, 10);
    }
    ctx.globalCompositeOperation = 'source-over';
    const gr = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.45, el.light);
    gr.addColorStop(1, G.rgba(el.color, 0.85));
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = el.dark;
    const ex = m.face * 2.5;
    ctx.beginPath(); ctx.ellipse(ex - 3.5, -1, 1.7, 2.6, 0, 0, TAU); ctx.ellipse(ex + 3.5, -1, 1.7, 2.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- Người đá / thụ yêu (golem) ---------- */
  function drawGolem(ctx, m, t) {
    const L = m.look, el = E[m.el];
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.scale(m.size, m.size);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, TAU); ctx.fill();
    ctx.scale(m.face, 1);
    const sw = m.moving ? Math.sin(m.walk) * 2.5 : 0;
    const swing = m.atkAnim >= 0 ? Math.sin(m.atkAnim * Math.PI) : 0;
    ctx.fillStyle = L.a;
    ctx.beginPath(); ctx.roundRect(-11 + sw, -16, 9, 15, 3); ctx.roundRect(3 - sw, -16, 9, 15, 3); ctx.fill();
    ctx.beginPath(); ctx.arc(-20, -30 + sw, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = L.a;
    ctx.beginPath(); ctx.roundRect(-17, -48, 34, 36, 10); ctx.fill();
    ctx.fillStyle = L.b;
    ctx.beginPath(); ctx.roundRect(-15, -48, 26, 14, 8); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = G.rgba(el.color, 0.85);
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-6, -40); ctx.lineTo(-1, -31); ctx.lineTo(-5, -22); ctx.moveTo(7, -36); ctx.lineTo(3, -27); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = L.b;
    ctx.beginPath(); ctx.roundRect(-9, -62, 19, 16, 5); ctx.fill();
    ctx.fillStyle = L.cap;
    ctx.beginPath(); ctx.ellipse(0, -61, 11, 4, 0, 0, TAU); ctx.ellipse(-12, -46, 7, 3, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(G.glow(el.color, true), 0, -60, 10, 10);
    ctx.drawImage(G.glow(el.color, true), 5, -60, 10, 10);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = L.a;
    ctx.beginPath(); ctx.arc(19 + swing * 10, -32 - swing * 14 - sw, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = L.b;
    ctx.beginPath(); ctx.arc(17 + swing * 10, -35 - swing * 14 - sw, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  const HEIGHT = { humanoid: 62, beast: 44, wisp: 52, golem: 66 };
  G.bodyHeight = (e) => (HEIGHT[e.kind === 'player' ? 'humanoid' : e.D.body] || 50) * e.size;

  /* ---------- Vẽ một thực thể kèm trạng thái (choáng, chậm, buff...) ---------- */
  G.drawActor = function (ctx, e, t) {
    if (e.dead && e.kind === 'monster') {
      if (e.deathT <= 0) return;
      ctx.globalAlpha = Math.max(0, e.deathT / 0.6);
    }
    if (e.dead && e.kind === 'player') ctx.globalAlpha = 0.4;
    const el = E[e.el], s = e.size;

    if (e.elite || e.boss) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha *= 0.45 + Math.sin(t * 4) * 0.15;
      ctx.drawImage(G.glow(el.color), e.x - 40 * s, e.y - 16 * s, 80 * s, 32 * s);
      ctx.globalAlpha = e.dead ? Math.max(0, e.deathT / 0.6) : 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const b of e.buffs) {
      if (b.aura || b.atk) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + Math.sin(t * 8) * 0.1;
        const R = b.aura ? b.aura.radius : 36;
        ctx.drawImage(G.glow(el.color), e.x - R, e.y - R * 0.35, R * 2, R * 0.7);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    const body = e.kind === 'player' ? 'humanoid' : e.D.body;
    if (body === 'humanoid') {
      G.drawHumanoid(ctx, e.x, e.y, e.look, { face: e.face, walk: e.walk, moving: e.moving, atk: e.atkAnim, t, scale: s, ranged: e.ranged, el: e.el });
    } else if (body === 'beast') drawBeast(ctx, e, t);
    else if (body === 'wisp') drawWisp(ctx, e, t);
    else drawGolem(ctx, e, t);

    const h = G.bodyHeight(e);
    ctx.globalCompositeOperation = 'lighter';
    if (e.flash > 0) {
      ctx.globalAlpha = Math.min(1, e.flash / 0.12) * 0.75;
      ctx.drawImage(G.glow('#ffffff'), e.x - 24 * s, e.y - h * 0.5 - 24 * s, 48 * s, 48 * s);
    }
    if (e.status.slow) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(G.glow('#7fd0ff'), e.x - 26 * s, e.y - h * 0.5 - 26 * s, 52 * s, 52 * s);
    }
    if (e.invuln > 0 && e.dash) {
      ctx.globalAlpha = 0.6;
      ctx.drawImage(G.glow(el.color, true), e.x - 30, e.y - 50, 60, 60);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (e.status.stun) {
      ctx.fillStyle = '#ffe28a';
      for (let i = 0; i < 3; i++) {
        const a = t * 5 + (i * TAU) / 3;
        const sx = e.x + Math.cos(a) * 12, sy = e.y - h - 6 + Math.sin(a) * 4;
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const rr = k % 2 ? 1.4 : 3.6, aa = (k / 8) * TAU;
          k ? ctx.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr) : ctx.moveTo(sx + rr, sy);
        }
        ctx.fill();
      }
    }
    for (const b of e.buffs) {
      if (!b.dome) continue;
      const R = 34;
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(e.x, e.y - 26, 4, e.x, e.y - 26, R);
      gr.addColorStop(0, G.rgba(el.color, 0.02));
      gr.addColorStop(0.8, G.rgba(el.color, 0.16));
      gr.addColorStop(1, G.rgba(el.light, 0.5));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(e.x, e.y - 22, R, R * 1.15, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = G.rgba(el.light, 0.35 + Math.sin(t * 6) * 0.15);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = t * 1.5 + (k / 6) * TAU;
        ctx.moveTo(e.x + Math.cos(a) * R * 0.95, e.y - 22 - R * 0.9);
        ctx.quadraticCurveTo(e.x + Math.cos(a) * R * 1.15, e.y - 22, e.x + Math.cos(a) * R * 0.95, e.y - 22 + R * 1.0);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  };

  /* ---------- Thanh máu & tên trên đầu ---------- */
  G.drawOverhead = function (ctx, e, isTarget) {
    if (e.dead) return;
    const top = e.y - G.bodyHeight(e) - 12;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    if (e.kind === 'player') {
      ctx.font = '700 12px "Be Vietnam Pro", system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,8,6,0.8)';
      ctx.strokeText(e.name, e.x, top - 2);
      ctx.fillStyle = '#f3d995';
      ctx.fillText(e.name, e.x, top - 2);
      return;
    }
    const show = isTarget || e.elite || e.boss || e.hp < e.maxHp;
    if (!show) return;
    const w = 40 * Math.min(1.8, e.size);
    ctx.fillStyle = 'rgba(8,6,4,0.75)';
    ctx.fillRect(e.x - w / 2 - 1, top - 1, w + 2, 6);
    ctx.fillStyle = isTarget ? '#ff6a4a' : '#c8442d';
    ctx.fillRect(e.x - w / 2, top, w * Math.max(0, e.hp / e.maxHp), 4);
    if (isTarget || e.elite || e.boss) {
      const txt = e.name + '  ·  ' + e.lv;
      ctx.font = (e.boss ? '800 13px' : '700 11px') + ' "Be Vietnam Pro", system-ui, sans-serif';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(10,8,6,0.85)';
      ctx.strokeText(txt, e.x, top - 10);
      ctx.fillStyle = e.boss ? '#f1b8ff' : e.elite ? '#f3d995' : '#efe6d2';
      ctx.fillText(txt, e.x, top - 10);
      const el = E[e.el];
      ctx.font = '700 12px "Noto Serif SC", "Noto Serif", serif';
      const tw = ctx.measureText(txt).width;
      ctx.strokeText(el.han, e.x - tw / 2 - 10, top - 10);
      ctx.fillStyle = el.color;
      ctx.fillText(el.han, e.x - tw / 2 - 10, top - 10);
    }
  };

  /* ---------- Biểu tượng kỹ năng (vẽ bằng code theo loại chiêu + màu hành) ---------- */
  G.drawSkillIcon = function (c, sk, elId) {
    const g = c.getContext('2d'), s = c.width, el = E[elId];
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, s, s);
    g.scale(s / 56, s / 56);
    const bg = g.createRadialGradient(28, 22, 2, 28, 28, 36);
    bg.addColorStop(0, G.rgba(el.color, 0.5));
    bg.addColorStop(1, '#0d1213');
    g.fillStyle = bg;
    g.fillRect(0, 0, 56, 56);
    g.globalAlpha = 0.14;
    g.fillStyle = el.light;
    g.font = '700 40px "Noto Serif SC", "Noto Serif", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(el.han, 28, 30);
    g.globalAlpha = 1;
    g.strokeStyle = el.light;
    g.fillStyle = el.light;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = el.color;
    g.shadowBlur = 8;
    switch (sk.type) {
      case 'slash':
        g.lineWidth = 4.5;
        g.beginPath(); g.arc(18, 36, 24, -1.25, 0.35); g.stroke();
        g.lineWidth = 1.6;
        g.beginPath(); g.arc(18, 36, 17, -1.05, 0.15); g.stroke();
        if (sk.hits) { g.lineWidth = 2; g.beginPath(); g.arc(18, 36, 10, -0.9, 0.0); g.stroke(); }
        break;
      case 'projectile': {
        const n = Math.min(sk.count || 1, 5);
        g.lineWidth = sk.ult ? 4 : 2.6;
        for (let i = 0; i < n; i++) {
          const o = i - (n - 1) / 2, y0 = 30 + o * 9, y1 = 28 + o * 4;
          g.beginPath(); g.moveTo(10, y0); g.lineTo(42, y1); g.stroke();
          g.beginPath(); g.moveTo(47, y1); g.lineTo(39, y1 - 4); g.lineTo(39, y1 + 4); g.closePath(); g.fill();
        }
        break;
      }
      case 'nova':
        g.lineWidth = 3.5; g.beginPath(); g.arc(28, 30, 7, 0, TAU); g.stroke();
        g.lineWidth = 2.4; g.beginPath(); g.arc(28, 30, 14, 0, TAU); g.stroke();
        g.lineWidth = 1.4; g.beginPath(); g.arc(28, 30, 21, 0, TAU); g.stroke();
        break;
      case 'ground':
        g.lineWidth = 2.4; g.beginPath(); g.ellipse(28, 42, 19, 6.5, 0, 0, TAU); g.stroke();
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(18, 8); g.lineTo(23, 34); g.moveTo(36, 6); g.lineTo(31, 34); g.stroke();
        g.beginPath(); g.arc(28, 18, 5, 0, TAU); g.fill();
        break;
      case 'dash':
        g.lineWidth = 3.4;
        for (const x of [12, 23, 34]) { g.beginPath(); g.moveTo(x, 18); g.lineTo(x + 9, 28); g.lineTo(x, 38); g.stroke(); }
        break;
      case 'chain':
        g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(9, 42); g.lineTo(20, 20); g.lineTo(32, 38); g.lineTo(46, 14); g.stroke();
        for (const [x, y] of [[9, 42], [20, 20], [32, 38], [46, 14]]) { g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill(); }
        break;
      case 'buff':
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(28, 9); g.lineTo(43, 15); g.quadraticCurveTo(43, 37, 28, 47); g.quadraticCurveTo(13, 37, 13, 15); g.closePath(); g.stroke();
        if (sk.buff.atk) {
          g.beginPath(); g.moveTo(28, 18); g.quadraticCurveTo(36, 28, 32, 38); g.quadraticCurveTo(28, 32, 24, 38); g.quadraticCurveTo(20, 28, 28, 18); g.fill();
        } else {
          g.lineWidth = 3.4;
          g.beginPath(); g.moveTo(28, 19); g.lineTo(28, 37); g.moveTo(19, 28); g.lineTo(37, 28); g.stroke();
        }
        break;
    }
    g.shadowBlur = 0;
    if (sk.ult) {
      g.strokeStyle = '#f3d995';
      g.lineWidth = 2;
      g.strokeRect(1, 1, 54, 54);
    }
  };
})(window.G);
