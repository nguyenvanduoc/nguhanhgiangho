/* =====================================================================
 * data.js — Dữ liệu game
 * Ngũ Hành (tương sinh / tương khắc), 10 môn phái, 40 kỹ năng, quái vật.
 * Muốn cân bằng game: chỉ cần sửa số trong file này.
 * ===================================================================== */
window.G = window.G || {};
(function (G) {
  'use strict';

  G.WORLD = { w: 4096, h: 4096, cx: 2048, cy: 2048, villageR: 430, plazaR: 250, name: 'Ngũ Hành Trấn' };

  /* ---------- Ngũ Hành ---------- */
  G.ELEMENTS = {
    kim: {
      id: 'kim', name: 'Kim', han: '金', color: '#f0d27a', light: '#fff6cf', dark: '#8a7232',
      effect: 'bleed', effectName: 'Phá giáp', effectDesc: 'Chảy máu 3 giây, giảm 25% phòng thủ.',
    },
    moc: {
      id: 'moc', name: 'Mộc', han: '木', color: '#6fd06a', light: '#dcffd0', dark: '#2f6b2a',
      effect: 'poison', effectName: 'Trúng độc', effectDesc: 'Độc cộng dồn 3 tầng, mất máu trong 4 giây.',
    },
    thuy: {
      id: 'thuy', name: 'Thủy', han: '水', color: '#5cb8ff', light: '#e2f4ff', dark: '#24527a',
      effect: 'slow', effectName: 'Băng hàn', effectDesc: 'Giảm 45% tốc độ di chuyển trong 2,5 giây.',
    },
    hoa: {
      id: 'hoa', name: 'Hỏa', han: '火', color: '#ff7a3d', light: '#ffe2b8', dark: '#8a2b12',
      effect: 'burn', effectName: 'Thiêu đốt', effectDesc: 'Bốc cháy, mất nhiều máu trong 3 giây.',
    },
    tho: {
      id: 'tho', name: 'Thổ', han: '土', color: '#d6a35a', light: '#fbe6c0', dark: '#6b4a22',
      effect: 'stun', effectName: 'Choáng', effectDesc: 'Choáng 1 giây, không thể hành động.',
    },
  };
  G.ELEMENT_ORDER = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
  // Vòng tương sinh: Mộc → Hỏa → Thổ → Kim → Thủy → Mộc
  G.SINH_ORDER = ['moc', 'hoa', 'tho', 'kim', 'thuy'];
  G.SINH = { moc: 'hoa', hoa: 'tho', tho: 'kim', kim: 'thuy', thuy: 'moc' };
  // Tương khắc: Kim khắc Mộc, Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim
  G.KHAC = { kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim' };
  G.KHAC_BONUS = 1.3; // đánh vào hành mình khắc: +30%
  G.BI_KHAC = 0.75; // đánh vào hành khắc mình: −25%
  G.elemMult = (atk, def) => (G.KHAC[atk] === def ? G.KHAC_BONUS : G.KHAC[def] === atk ? G.BI_KHAC : 1);
  G.khacBy = (el) => G.ELEMENT_ORDER.find((k) => G.KHAC[k] === el);

  /* ---------- Kỹ năng ----------
   * type: slash (chém hình cung) | projectile (phóng đạn) | nova (nổ quanh thân)
   *       ground (đánh vùng chọn) | dash (lướt) | chain (lan truyền) | buff (tăng sức mạnh)
   * dmg: hệ số nhân với Công; cd: hồi chiêu (giây); mp: nội lực tiêu hao; unlock: cấp mở khóa */
  const SK = (o) => Object.assign({ mp: 0, cd: 0.5, dmg: 1, unlock: 1, effectChance: 0.22 }, o);

  G.SECTS = [
    {
      id: 'kimCuong', name: 'Kim Cương Viện', el: 'kim', role: 'melee', roleName: 'Cận chiến · Hộ thể',
      desc: 'Tăng nhân luyện côn, thân cứng như chuông đồng. Máu dày, thủ chắc, đứng giữa trận không lùi.',
      base: { hp: 270, mp: 90, atk: 19, def: 15, spd: 172 },
      look: { robe: '#c27a22', robe2: '#a3611a', trim: '#f5d37a', sash: '#7a2a1a', hat: 'bald', beads: true, weapon: 'staff', wcolor: '#8a5a2a', pants: '#5a3a1a' },
      skills: [
        SK({ id: 'kc0', name: 'Phục Hổ Côn', type: 'slash', range: 84, arc: 2.0, dmg: 1.0, cd: 0.55, desc: 'Quét côn hình cung trước mặt.' }),
        SK({ id: 'kc1', name: 'Hàng Long Tảo Địa', type: 'nova', radius: 135, dmg: 1.8, cd: 5, mp: 14, vfx: 'goldring', effectChance: 0.5, desc: 'Xoay côn quét sạch kẻ địch xung quanh.' }),
        SK({ id: 'kc2', name: 'Kim Chung Tráo', type: 'buff', buff: { def: 0.7, dur: 8, dome: true }, heal: 0.15, cd: 16, mp: 20, unlock: 3, desc: 'Chuông vàng hộ thể: +70% phòng thủ 8 giây, hồi 15% máu.' }),
        SK({ id: 'kc3', name: 'La Hán Phục Ma', type: 'ground', radius: 175, range: 260, delay: 0.55, dmg: 3.6, cd: 20, mp: 40, vfx: 'pillar', effectChance: 1, unlock: 6, ult: true, desc: 'Giáng cột kim quang xuống vùng chọn, sát thương cực lớn.' }),
      ],
    },
    {
      id: 'nganTien', name: 'Ngân Tiễn Các', el: 'kim', role: 'ranged', roleName: 'Viễn công · Ám khí',
      desc: 'Cao thủ phi tiêu bạc, ra tay nhanh như chớp, bắn xa và dồn sát thương liên tục.',
      base: { hp: 175, mp: 135, atk: 24, def: 7, spd: 182 },
      look: { robe: '#d6dae2', robe2: '#aeb4c0', trim: '#c9a24a', sash: '#2c3440', hat: 'hood', hatColor: '#3a4250', weapon: 'needle', wcolor: '#f3f6fa', pants: '#2c3440', scarf: '#c9a24a' },
      skills: [
        SK({ id: 'nt0', name: 'Truy Phong Tiêu', type: 'projectile', speed: 760, range: 440, radius: 9, dmg: 1.0, cd: 0.45, vfx: 'needle', homing: true, desc: 'Phi tiêu bạc tự tìm mục tiêu.' }),
        SK({ id: 'nt1', name: 'Mãn Thiên Hoa Vũ', type: 'projectile', count: 7, spread: 1.0, speed: 700, range: 380, radius: 9, dmg: 0.85, cd: 4.5, mp: 14, vfx: 'needle', desc: 'Tung 7 phi tiêu hình quạt.' }),
        SK({ id: 'nt2', name: 'Bạo Vũ Lê Hoa', type: 'ground', radius: 125, range: 430, delay: 0.25, duration: 1.2, tickInt: 0.2, dmg: 0.55, cd: 7, mp: 20, unlock: 3, vfx: 'needles', desc: 'Mưa kim bạc trút xuống vùng chọn.' }),
        SK({ id: 'nt3', name: 'Xuyên Tâm Tiễn', type: 'projectile', speed: 980, range: 680, radius: 26, dmg: 4.0, pierce: true, cd: 18, mp: 40, unlock: 6, ult: true, vfx: 'lance', effectChance: 1, desc: 'Mũi tiễn vàng xuyên thủng mọi kẻ địch trên đường bay.' }),
      ],
    },
    {
      id: 'thanhMoc', name: 'Thanh Mộc Cốc', el: 'moc', role: 'ranged', roleName: 'Viễn công · Độc thuật',
      desc: 'Ẩn cư trong rừng sâu, dùng sáo trúc điều khiển độc vụ và dây leo. Mạnh khi đánh đông.',
      base: { hp: 180, mp: 140, atk: 22, def: 7, spd: 180 },
      look: { robe: '#3f7a4a', robe2: '#2e5e38', trim: '#c6e889', sash: '#1e3a26', hat: 'band', hatColor: '#9dd36a', weapon: 'flute', wcolor: '#a8c45a', pants: '#1e3a26', scarf: '#9dd36a' },
      skills: [
        SK({ id: 'tm0', name: 'Bích Lục Châm', type: 'projectile', speed: 560, range: 420, radius: 10, dmg: 1.0, cd: 0.55, vfx: 'poison', homing: true, effectChance: 0.35, desc: 'Kim độc xanh biếc, dễ gây trúng độc.' }),
        SK({ id: 'tm1', name: 'Vạn Độc Vụ', type: 'ground', radius: 135, range: 420, delay: 0.15, duration: 4, tickInt: 0.5, dmg: 0.5, cd: 6, mp: 16, vfx: 'cloud', effectChance: 1, desc: 'Khói độc bao phủ, gây độc liên tục 4 giây.' }),
        SK({ id: 'tm2', name: 'Đằng Mạn Triền Thân', type: 'chain', range: 400, jump: 230, count: 5, dmg: 1.5, cd: 6, mp: 18, unlock: 3, vfx: 'vine', effectChance: 0.6, desc: 'Dây leo lan từ kẻ này sang kẻ khác, tối đa 5 mục tiêu.' }),
        SK({ id: 'tm3', name: 'Lục Diệp Phong Bạo', type: 'nova', radius: 230, ticks: 6, tickInt: 0.25, dmg: 0.85, cd: 20, mp: 40, unlock: 6, ult: true, vfx: 'leafstorm', effectChance: 0.5, desc: 'Bão lá xanh cuốn quanh thân, xé nát kẻ địch.' }),
      ],
    },
    {
      id: 'lamHiep', name: 'Lâm Hiệp Trang', el: 'moc', role: 'melee', roleName: 'Cận chiến · Đao pháp',
      desc: 'Hiệp khách đội nón lá, đao pháp nhanh gọn, xông vào giữa trận như gió cuốn lá.',
      base: { hp: 225, mp: 100, atk: 22, def: 10, spd: 192 },
      look: { robe: '#56772e', robe2: '#435d22', trim: '#e2c573', sash: '#6b3a1e', hat: 'conical', hatColor: '#d9c38a', weapon: 'blade', wcolor: '#dfe6ea', pants: '#3a2a1a', scarf: '#e2c573' },
      skills: [
        SK({ id: 'lh0', name: 'Trúc Phong Đao', type: 'slash', range: 86, arc: 1.7, dmg: 1.05, cd: 0.5, desc: 'Chém ngang nhanh như gió.' }),
        SK({ id: 'lh1', name: 'Phong Diệp Trảm', type: 'dash', range: 270, dmg: 1.9, cd: 5, mp: 14, effectChance: 0.5, desc: 'Lướt tới chém xuyên qua mọi kẻ trên đường.' }),
        SK({ id: 'lh2', name: 'Thanh Long Quyển', type: 'nova', radius: 125, ticks: 4, tickInt: 0.15, dmg: 0.7, cd: 7, mp: 18, unlock: 3, vfx: 'spin', desc: 'Xoay đao thành lốc, chém 4 lần xung quanh.' }),
        SK({ id: 'lh3', name: 'Mộc Linh Hộ Thể', type: 'buff', buff: { atk: 0.35, spd: 0.25, regen: 0.025, dur: 10 }, cd: 22, mp: 35, unlock: 6, ult: true, desc: 'Mộc linh nhập thể: +35% công, +25% tốc độ, hồi máu 10 giây.' }),
      ],
    },
    {
      id: 'hanBang', name: 'Hàn Băng Cung', el: 'thuy', role: 'ranged', roleName: 'Viễn công · Băng thuật',
      desc: 'Đệ tử cung băng tuyết, quạt ngọc vung lên là băng tiễn bay ra, làm chậm cả đàn quái.',
      base: { hp: 175, mp: 145, atk: 23, def: 7, spd: 182 },
      look: { robe: '#3c6fae', robe2: '#2d5688', trim: '#e4f4ff', sash: '#dbe9f7', hat: 'bun', long: true, weapon: 'fan', wcolor: '#e4f4ff', pants: '#1e2f4a', scarf: '#bfe3ff' },
      skills: [
        SK({ id: 'hb0', name: 'Hàn Băng Tiễn', type: 'projectile', speed: 640, range: 430, radius: 10, dmg: 1.0, cd: 0.5, vfx: 'ice', homing: true, desc: 'Mũi băng sắc lạnh.' }),
        SK({ id: 'hb1', name: 'Băng Tâm Liên', type: 'projectile', count: 3, spread: 0.36, speed: 620, range: 420, radius: 12, pierce: true, dmg: 1.3, cd: 4, mp: 14, vfx: 'ice', effectChance: 0.5, desc: 'Ba mũi băng xuyên thấu.' }),
        SK({ id: 'hb2', name: 'Phong Tuyết Mạn Thiên', type: 'ground', radius: 155, range: 420, delay: 0.2, duration: 3, tickInt: 0.3, dmg: 0.45, cd: 8, mp: 22, unlock: 3, vfx: 'snow', effectChance: 0.5, desc: 'Bão tuyết 3 giây, làm chậm kẻ địch.' }),
        SK({ id: 'hb3', name: 'Băng Phong Thiên Lý', type: 'nova', radius: 250, delay: 0.2, dmg: 3.2, cd: 20, mp: 40, unlock: 6, ult: true, vfx: 'frost', effectChance: 1, desc: 'Đóng băng cả vùng rộng quanh thân.' }),
      ],
    },
    {
      id: 'luuThuy', name: 'Lưu Thủy Kiếm Phái', el: 'thuy', role: 'melee', roleName: 'Cận chiến · Kiếm pháp',
      desc: 'Kiếm pháp như nước chảy, liên miên không dứt. Tung kiếm khí từ xa rồi lướt tới kết liễu.',
      base: { hp: 220, mp: 110, atk: 22, def: 9, spd: 190 },
      look: { robe: '#e6edf4', robe2: '#c3d0de', trim: '#3f8ad6', sash: '#3f8ad6', hat: 'bun', weapon: 'sword', wcolor: '#e8f4ff', pants: '#2a3a52', scarf: '#3f8ad6' },
      skills: [
        SK({ id: 'lt0', name: 'Lưu Vân Kiếm', type: 'slash', range: 90, arc: 1.5, dmg: 1.0, cd: 0.45, desc: 'Kiếm chiêu nhẹ như mây trôi.' }),
        SK({ id: 'lt1', name: 'Kiếm Khí Tung Hoành', type: 'projectile', count: 3, spread: 0.5, speed: 680, range: 380, radius: 16, pierce: true, dmg: 1.35, cd: 4.5, mp: 14, vfx: 'swordwave', desc: 'Ba đạo kiếm khí xuyên thấu.' }),
        SK({ id: 'lt2', name: 'Thủy Ảnh Đột', type: 'dash', range: 290, dmg: 1.8, cd: 6, mp: 16, unlock: 3, effectChance: 0.5, desc: 'Hóa thành dòng nước lướt qua kẻ địch.' }),
        SK({ id: 'lt3', name: 'Thiên Hà Đảo Quyển', type: 'ground', radius: 180, range: 320, delay: 0.2, duration: 2.2, tickInt: 0.2, dmg: 0.55, pull: true, cd: 20, mp: 40, unlock: 6, ult: true, vfx: 'vortex', effectChance: 0.4, desc: 'Xoáy nước khổng lồ hút kẻ địch vào giữa.' }),
      ],
    },
    {
      id: 'lietHoa', name: 'Liệt Hỏa Đường', el: 'hoa', role: 'ranged', roleName: 'Viễn công · Hỏa thuật',
      desc: 'Luyện lửa thành thuật, sát thương diện rộng mạnh nhất giang hồ nhưng thân thể mỏng manh.',
      base: { hp: 170, mp: 145, atk: 25, def: 6, spd: 178 },
      look: { robe: '#a3301c', robe2: '#7e2414', trim: '#ffcc66', sash: '#2a1410', hat: 'hood', hatColor: '#5a1a10', weapon: 'orb', wcolor: '#ff7a3d', pants: '#2a1410', scarf: '#ffcc66' },
      skills: [
        SK({ id: 'lo0', name: 'Hỏa Cầu', type: 'projectile', speed: 540, range: 420, radius: 11, dmg: 1.0, explode: 46, cd: 0.6, vfx: 'fire', homing: true, desc: 'Cầu lửa nổ lan khi trúng.' }),
        SK({ id: 'lo1', name: 'Hỏa Long Xuyên', type: 'projectile', speed: 560, range: 540, radius: 24, pierce: true, dmg: 2.0, cd: 5, mp: 16, vfx: 'dragon', effectChance: 0.6, desc: 'Rồng lửa lao thẳng, thiêu mọi thứ trên đường.' }),
        SK({ id: 'lo2', name: 'Liệt Diệm Phần Thiên', type: 'ground', radius: 145, range: 440, delay: 0.7, dmg: 2.7, cd: 7, mp: 22, unlock: 3, vfx: 'meteor', effectChance: 0.7, desc: 'Gọi thiên thạch lửa rơi xuống vùng chọn.' }),
        SK({ id: 'lo3', name: 'Phượng Hoàng Niết Bàn', type: 'nova', radius: 265, delay: 0.35, dmg: 3.8, heal: 0.2, cd: 22, mp: 45, unlock: 6, ult: true, vfx: 'phoenix', effectChance: 1, desc: 'Lửa phượng hoàng bùng nổ, hồi 20% máu.' }),
      ],
    },
    {
      id: 'xichDiem', name: 'Xích Diễm Bang', el: 'hoa', role: 'melee', roleName: 'Cận chiến · Quyền chưởng',
      desc: 'Bang hội luyện chưởng lửa, ra đòn liên hoàn, càng đánh càng hăng.',
      base: { hp: 230, mp: 100, atk: 23, def: 10, spd: 188 },
      look: { robe: '#6e1d18', robe2: '#521410', trim: '#f0b44a', sash: '#f0b44a', hat: 'band', hatColor: '#d8432a', weapon: 'fist', wcolor: '#ff7a3d', pants: '#2a1410', scarf: '#d8432a' },
      skills: [
        SK({ id: 'xd0', name: 'Xích Diễm Chưởng', type: 'slash', range: 74, arc: 1.3, dmg: 1.05, cd: 0.42, desc: 'Chưởng lửa cận thân.' }),
        SK({ id: 'xd1', name: 'Liên Hoàn Hỏa Quyền', type: 'slash', range: 100, arc: 1.4, hits: 3, interval: 0.12, dmg: 0.8, cd: 4, mp: 12, effectChance: 0.35, desc: 'Ba quyền lửa liên tiếp.' }),
        SK({ id: 'xd2', name: 'Long Đằng Xung', type: 'dash', range: 260, dmg: 2.0, cd: 6, mp: 16, unlock: 3, effectChance: 0.6, desc: 'Lao tới như rồng lửa, để lại vệt cháy.' }),
        SK({ id: 'xd3', name: 'Cuồng Nộ Diễm Hồn', type: 'buff', buff: { atk: 0.4, dur: 10, aura: { radius: 115, dmg: 0.35, tick: 0.5 } }, cd: 22, mp: 40, unlock: 6, ult: true, desc: 'Lửa giận bao thân: +40% công, thiêu đốt kẻ địch quanh mình 10 giây.' }),
      ],
    },
    {
      id: 'hauTho', name: 'Hậu Thổ Sơn', el: 'tho', role: 'melee', roleName: 'Cận chiến · Trọng chùy',
      desc: 'Võ phái trên núi đá, vung trọng chùy làm rung chuyển mặt đất, khiến kẻ địch choáng váng.',
      base: { hp: 280, mp: 90, atk: 20, def: 15, spd: 168 },
      look: { robe: '#7a5a2e', robe2: '#5e4422', trim: '#e6c58a', sash: '#3a2a18', hat: 'topknot', hatColor: '#e6c58a', weapon: 'hammer', wcolor: '#6a6e76', pants: '#3a2a18' },
      skills: [
        SK({ id: 'ht0', name: 'Khai Sơn Chùy', type: 'slash', range: 84, arc: 1.8, dmg: 1.1, cd: 0.6, desc: 'Nện chùy nặng trịch.' }),
        SK({ id: 'ht1', name: 'Địa Chấn Ba', type: 'nova', radius: 145, dmg: 1.6, cd: 5, mp: 14, vfx: 'quake', effectChance: 0.55, desc: 'Đập đất tạo sóng chấn, dễ gây choáng.' }),
        SK({ id: 'ht2', name: 'Sơn Băng Địa Liệt', type: 'projectile', speed: 520, range: 430, radius: 30, pierce: true, dmg: 1.8, cd: 6, mp: 18, unlock: 3, vfx: 'spikes', effectChance: 0.4, desc: 'Đất nứt thành hàng gai đá lao thẳng tới trước.' }),
        SK({ id: 'ht3', name: 'Bàn Thạch Kim Thân', type: 'buff', buff: { def: 0.9, regen: 0.02, dur: 10 }, burst: { radius: 160, dmg: 1.6 }, cd: 22, mp: 35, unlock: 6, ult: true, effectChance: 1, desc: 'Thân như bàn thạch: +90% phòng thủ, hồi máu 10 giây, chấn choáng xung quanh.' }),
      ],
    },
    {
      id: 'huyenNham', name: 'Huyền Nham Các', el: 'tho', role: 'ranged', roleName: 'Viễn công · Thạch thuật',
      desc: 'Thuật sĩ đội nón mạng che mặt, điều khiển đá núi và cát bụi từ xa.',
      base: { hp: 185, mp: 140, atk: 23, def: 8, spd: 178 },
      look: { robe: '#5a4836', robe2: '#46382a', trim: '#d6a35a', sash: '#2a2018', hat: 'veil', hatColor: '#3a2e22', weapon: 'orb', wcolor: '#d6a35a', pants: '#2a2018', scarf: '#d6a35a' },
      skills: [
        SK({ id: 'hn0', name: 'Phi Thạch', type: 'projectile', speed: 580, range: 420, radius: 11, dmg: 1.05, cd: 0.6, vfx: 'rock', homing: true, desc: 'Phóng đá vụn vào mục tiêu.' }),
        SK({ id: 'hn1', name: 'Lạc Thạch Thuật', type: 'ground', radius: 115, range: 430, delay: 0.5, dmg: 2.2, cd: 5, mp: 15, vfx: 'boulder', effectChance: 0.5, desc: 'Tảng đá lớn rơi xuống, dễ gây choáng.' }),
        SK({ id: 'hn2', name: 'Cuồng Sa Bạo', type: 'ground', radius: 145, range: 420, delay: 0.1, duration: 3, tickInt: 0.3, dmg: 0.42, cd: 8, mp: 20, unlock: 3, vfx: 'sandstorm', effectChance: 0.3, desc: 'Bão cát cuồn cuộn 3 giây.' }),
        SK({ id: 'hn3', name: 'Thiên Thạch Trận', type: 'ground', radius: 90, range: 430, delay: 0.6, dmg: 2.3, multi: { count: 7, spread: 170, step: 0.14 }, cd: 22, mp: 45, unlock: 6, ult: true, vfx: 'boulder', effectChance: 0.6, desc: 'Bảy khối thiên thạch đá trút xuống liên tiếp.' }),
      ],
    },
  ];
  G.SECT_BY_ID = {};
  for (const s of G.SECTS) {
    s.look = Object.assign({ skin: '#e8c39a', hair: '#1a1410' }, s.look);
    G.SECT_BY_ID[s.id] = s;
  }
  G.SLOT_KEYS = ['Space', '1', '2', '3'];

  /* ---------- Quái vật ----------
   * body: hình dáng (beast thú 4 chân, wisp linh hồn, golem người đá, humanoid người)
   * atk: melee (cận chiến) | ranged (bắn xa) */
  G.MONSTERS = {
    tuyetLang: { name: 'Tuyết Lang', el: 'thuy', body: 'beast', r: 16, spd: 125, atk: 'melee', look: { body: '#dde6ee', belly: '#ffffff', dark: '#7f97ad' } },
    bangLinh: { name: 'Băng Linh', el: 'thuy', body: 'wisp', r: 14, spd: 85, atk: 'ranged' },
    hanBangHo: { name: 'Hàn Băng Yêu Hồ', el: 'thuy', body: 'beast', r: 16, spd: 135, atk: 'melee', elite: true, look: { body: '#bfe0ff', belly: '#ffffff', dark: '#3f78b0' } },
    thuYeu: { name: 'Thụ Yêu', el: 'moc', body: 'golem', r: 17, spd: 80, atk: 'melee', look: { a: '#4a3a26', b: '#6a5434', cap: '#5ea648' } },
    docHoa: { name: 'Độc Hoa Tinh', el: 'moc', body: 'wisp', r: 14, spd: 85, atk: 'ranged' },
    coMocVuong: { name: 'Cổ Mộc Thụ Vương', el: 'moc', body: 'golem', r: 17, spd: 85, atk: 'melee', elite: true, look: { a: '#3a2c1c', b: '#5a4628', cap: '#7ccf52' } },
    hoaHo: { name: 'Hỏa Hồ', el: 'hoa', body: 'beast', r: 15, spd: 135, atk: 'melee', look: { body: '#d6562a', belly: '#ffd2a2', dark: '#7a2412' } },
    diemLinh: { name: 'Diễm Linh', el: 'hoa', body: 'wisp', r: 14, spd: 90, atk: 'ranged' },
    xichViemLang: { name: 'Xích Viêm Ma Lang', el: 'hoa', body: 'beast', r: 16, spd: 140, atk: 'melee', elite: true, look: { body: '#3a1a14', belly: '#ff8a3d', dark: '#1a0a08' } },
    nhamThach: { name: 'Nham Thạch Quái', el: 'tho', body: 'golem', r: 18, spd: 72, atk: 'melee', look: { a: '#7a5530', b: '#a8763c', cap: '#d6a868' } },
    saLang: { name: 'Sa Lang', el: 'tho', body: 'beast', r: 15, spd: 125, atk: 'melee', look: { body: '#c49a5c', belly: '#ecd2a4', dark: '#6b4a22' } },
    sonThan: { name: 'Sơn Thần Cự Thạch', el: 'tho', body: 'golem', r: 18, spd: 70, atk: 'melee', elite: true, look: { a: '#5e4426', b: '#8a6a3e', cap: '#e3c07a' } },
    thietVe: { name: 'Thiết Vệ Tàn Binh', el: 'kim', body: 'humanoid', r: 15, spd: 110, atk: 'melee', look: { robe: '#5a5e66', robe2: '#43464d', trim: '#c9a24a', sash: '#2a2c30', hat: 'helm', hatColor: '#8a8f99', weapon: 'blade', wcolor: '#c8ccd4', pants: '#2a2c30', skin: '#cfb08a' } },
    kimLinh: { name: 'Kim Linh', el: 'kim', body: 'wisp', r: 14, spd: 85, atk: 'ranged' },
    kiemMa: { name: 'Kiếm Ma', el: 'kim', body: 'humanoid', r: 15, spd: 120, atk: 'melee', elite: true, look: { robe: '#24262c', robe2: '#16181c', trim: '#f0d27a', sash: '#7a1a1a', hat: 'veil', hatColor: '#16181c', weapon: 'sword', wcolor: '#fff1b0', pants: '#16181c', skin: '#cfb08a', scarf: '#7a1a1a' } },
    yeuVuong: { name: 'Ngũ Hành Yêu Vương', el: 'kim', body: 'golem', r: 20, spd: 80, atk: 'ranged', boss: true, cycle: true, look: { a: '#2a2730', b: '#423d4a', cap: '#ffffff' } },
  };
  G.ZONE_SPAWNS = {
    thuy: { mobs: ['tuyetLang', 'bangLinh'], elite: 'hanBangHo' },
    moc: { mobs: ['thuYeu', 'docHoa'], elite: 'coMocVuong' },
    hoa: { mobs: ['hoaHo', 'diemLinh'], elite: 'xichViemLang' },
    tho: { mobs: ['nhamThach', 'saLang'], elite: 'sonThan' },
    kim: { mobs: ['thietVe', 'kimLinh'], elite: 'kiemMa' },
  };
})(window.G);
