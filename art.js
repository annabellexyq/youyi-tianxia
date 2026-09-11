/* ============================================================================
 *  游医天下 · 美术层（程序化白描 SVG）
 *  枯笔、顿挫、黑白山水。世界模型由“五色深浅”晕染而出。
 * ==========================================================================*/
(function () {
  'use strict';

  // —— 确定性伪随机（按字符串种子） ——
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // —— 山脊折线 ——
  function ridge(rnd, w, baseY, amp, jag) {
    const pts = [];
    const segs = 14;
    for (let i = 0; i <= segs; i++) {
      const x = (w / segs) * i;
      const y = baseY - (rnd() * amp) - Math.sin(i * jag) * (amp * 0.3);
      pts.push([x, y]);
    }
    return pts;
  }
  function pathFrom(pts, closeBottom, h) {
    let d = 'M ' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i < pts.length; i++) {
      const [x, y] = pts[i];
      const [px, py] = pts[i - 1];
      const cx = (px + x) / 2;
      d += ` Q ${px.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${((py + y) / 2).toFixed(1)}`;
      d += ` T ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    if (closeBottom) d += ` L ${pts[pts.length - 1][0].toFixed(1)} ${h} L ${pts[0][0].toFixed(1)} ${h} Z`;
    return d;
  }

  // —— 公共滤镜 / 笔触定义 ——
  function defs(uid) {
    return `
    <defs>
      <filter id="paper${uid}" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${uid % 97}" result="n"/>
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0"/>
        <feComposite operator="over" in2="SourceGraphic"/>
      </filter>
      <filter id="dry${uid}" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="turbulence" baseFrequency="0.04 0.12" numOctaves="3" seed="${uid % 53}" result="t"/>
        <feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <linearGradient id="sky${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fbfaf6"/>
        <stop offset="0.7" stop-color="#f4f2ea"/>
        <stop offset="1" stop-color="#ece9df"/>
      </linearGradient>
      <radialGradient id="moon${uid}" cx="0.78" cy="0.22" r="0.12">
        <stop offset="0" stop-color="#fdfdfb"/>
        <stop offset="1" stop-color="#fdfdfb" stop-opacity="0"/>
      </radialGradient>
    </defs>`;
  }

  // —— 各境母题（白描线稿） ——
  function motif(m, w, h) {
    const cx = w * 0.5, cy = h * 0.62;
    switch (m) {
      case 'market': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-90} ${cy+30} q90 -26 180 0"/>
          <path d="M${cx-90} ${cy+30} l0 38 M${cx+90} ${cy+30} l0 38 M${cx} ${cy+4} l0 64"/>
          <path d="M${cx-70} ${cy+18} l14 -10 l14 10 M${cx+30} ${cy+18} l14 -10 l14 10"/>
          <circle cx="${cx-30}" cy="${cy+58}" r="9"/><circle cx="${cx+34}" cy="${cy+58}" r="9"/>
          <path d="M${cx-120} ${cy+70} q8 -18 16 0 M${cx+96} ${cy+70} q8 -18 16 0"/>
        </g>`;
      case 'border': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-110} ${cy+60} L${cx-110} ${cy-10} Q${cx} ${cy-46} ${cx+110} ${cy-10} L${cx+110} ${cy+60}"/>
          <path d="M${cx-70} ${cy+60} L${cx-70} ${cy+10} M${cx+70} ${cy+60} L${cx+70} ${cy+10} M${cx} ${cy+60} L${cx} ${cy-6}"/>
          <path d="M${cx-26} ${cy-40} l52 0 l-8 26 l-36 0 z"/>
          <path d="M${cx} ${cy-14} l0 28" stroke-width="2.4"/>
        </g>`;
      case 'yamen': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-96} ${cy+50} L${cx-96} ${cy-6} Q${cx} ${cy-44} ${cx+96} ${cy-6} L${cx+96} ${cy+50}"/>
          <rect x="${cx-30}" y="${cy-30}" width="60" height="22" rx="3"/>
          <path d="M${cx-12} ${cy-24} h24 M${cx} ${cy-30} v-10"/>
          <path d="M${cx-60} ${cy+50} l0 -30 M${cx+60} ${cy+50} l0 -30"/>
        </g>`;
      case 'garden': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-80} ${cy+60} q20 -50 60 -56 q-30 30 -10 56"/>
          <path d="M${cx+10} ${cy+60} q-10 -40 26 -52 q-20 26 -6 52"/>
          <circle cx="${cx+70}" cy="${cy+6}" r="16"/>
          <path d="M${cx+70} ${cy-10} q10 6 4 18 M${cx+70} ${cy-10} q-10 6 -4 18"/>
          <path d="M${cx-96} ${cy+60} h190"/>
        </g>`;
      case 'lake': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-70} ${cy+10} q70 26 140 0 q-70 -18 -140 0 z"/>
          <path d="M${cx-20} ${cy+2} q20 -22 40 0" />
          <circle cx="${cx+6}" cy="${cy-10}" r="6"/>
          <path d="M${cx-110} ${cy+34} q30 8 60 0 M${cx+30} ${cy+34} q30 8 60 0"/>
          <path d="M${cx-90} ${cy+50} q90 16 180 0"/>
        </g>`;
      case 'village': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-80} ${cy+50} l0 -34 l40 -26 l40 26 l0 34 z"/>
          <path d="M${cx-40} ${cy+50} l0 -20 l34 0 l0 20"/>
          <path d="M${cx+20} ${cy+50} l0 -24 l30 -20 l30 20 l0 24 z"/>
          <path d="M${cx+34} ${cy+50} l0 -14 l14 0 l0 14"/>
          <path d="M${cx-90} ${cy+50} h190"/>
        </g>`;
      case 'exam': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <rect x="${cx-44}" y="${cy-30}" width="88" height="80" rx="4"/>
          <path d="M${cx-30} ${cy-14} h60 M${cx-30} ${cy} h60 M${cx-30} ${cy+14} h40"/>
          <circle cx="${cx-64}" cy="${cy-40}" r="7"/><circle cx="${cx+64}" cy="${cy-40}" r="7"/>
          <path d="M${cx-64} ${cy-40} l0 -16 M${cx+64} ${cy-40} l0 -16"/>
        </g>`;
      case 'palace': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-110} ${cy+54} L${cx-110} ${cy-4} Q${cx} ${cy-50} ${cx+110} ${cy-4} L${cx+110} ${cy+54}"/>
          <path d="M${cx-130} ${cy-4} q130 -34 260 0"/>
          <path d="M${cx-50} ${cy+54} l0 -34 l100 0 l0 34"/>
          <circle cx="${cx}" cy="${cy-30}" r="5"/>
          <path d="M${cx} ${cy-25} l0 -16"/>
        </g>`;
      case 'country': return `
        <g stroke="#1c1c1c" stroke-width="1.6" fill="none" stroke-linecap="round">
          <path d="M${cx-40} ${cy+54} l0 -28 l28 -20 l28 20 l0 28 z"/>
          <path d="M${cx-12} ${cy+54} l0 -14 l22 0 l0 14"/>
          <path d="M${cx+44} ${cy+54} q-6 -40 24 -46 q-18 22 -4 46"/>
          <circle cx="${cx+64}" cy="${cy+8}" r="3"/>
          <path d="M${cx-90} ${cy+54} h186"/>
        </g>`;
      default: return '';
    }
  }

  // —— 生成场景 SVG ——
  // dominantHex：由玩家“五色深浅排列”推导的主色，作极淡晕染
  function scene(loc, dominantHex) {
    const W = 960, H = 540, uid = hash(loc.id) % 997; // 0..996
    const rnd = mulberry32(hash(loc.id));
    const far = ridge(rnd, W, H * 0.46, 70, 0.7);
    const mid = ridge(mulberry32(hash(loc.id) + 7), W, H * 0.66, 110, 0.9);
    const near = ridge(mulberry32(hash(loc.id) + 19), W, H * 0.86, 80, 1.1);

    const tint = dominantHex
      ? `<rect x="0" y="0" width="${W}" height="${H}" fill="${dominantHex}" opacity="0.10"/>
         <rect x="0" y="0" width="${W}" height="${H}" fill="${dominantHex}" opacity="0.06" style="mix-blend-mode:multiply"/>`
      : '';

    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" class="ink-svg" xmlns="http://www.w3.org/2000/svg">
      ${defs(uid)}
      <rect width="${W}" height="${H}" fill="url(#sky${uid})"/>
      <rect width="${W}" height="${H}" fill="url(#moon${uid})"/>
      <g filter="url(#dry${uid})">
        <path d="${pathFrom(far, true, H)}" fill="#cfcabb" fill-opacity="0.55" stroke="#8d897c" stroke-width="1.2"/>
        <path d="${pathFrom(mid, true, H)}" fill="#a9a596" fill-opacity="0.7" stroke="#6f6c60" stroke-width="1.4"/>
        <path d="${pathFrom(near, true, H)}" fill="#7c7868" fill-opacity="0.85" stroke="#3a382f" stroke-width="1.6"/>
      </g>
      ${motif(loc.motif, W, H)}
      ${tint}
      <rect width="${W}" height="${H}" filter="url(#paper${uid})" opacity="0.5"/>
    </svg>`;
  }

  // —— 生成 NPC 白描立绘 ——
  // costumeHex：服化主色（由主脏推导）
  function npc(loc, costumeHex) {
    const W = 320, H = 460, uid = 1000 + (hash(loc.id + 'npc') % 997); // 1000..1996，避开 scene(0..996)
    const c = costumeHex || '#3a382f';
    return `<svg viewBox="0 0 320 460" class="npc-svg" xmlns="http://www.w3.org/2000/svg">
      ${defs(uid)}
      <g filter="url(#dry${uid})" stroke="#1c1c1c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- 头颅 -->
        <circle cx="160" cy="92" r="38"/>
        <path d="M132 78 q28 -22 56 0" /> <!-- 发际 -->
        <path d="M150 92 l0 2 M170 92 l0 2"/> <!-- 目 -->
        <path d="M152 108 q8 6 16 0"/> <!-- 口 -->
        <!-- 颈肩 -->
        <path d="M140 128 l-8 14 M180 128 l8 14"/>
        <path d="M132 142 q28 18 56 0"/>
        <!-- 袍身 -->
        <path d="M124 158 q36 -10 72 0 L196 330 q-36 16 -72 0 Z" fill="${c}" fill-opacity="0.16"/>
        <path d="M160 150 l0 180"/> <!-- 中缝 -->
        <path d="M124 158 q-22 60 -10 172 M196 158 q22 60 10 172"/>
        <!-- 袖 -->
        <path d="M124 170 q-34 30 -28 90 q22 -6 30 -40"/>
        <path d="M196 170 q34 30 28 90 q-22 -6 -30 -40"/>
        <!-- 带 -->
        <path d="M126 232 q34 14 68 0" stroke-width="6" stroke="${c}" stroke-opacity="0.7"/>
        <!-- 足 -->
        <path d="M138 332 l-6 70 M182 332 l6 70 M132 402 l24 6 M176 402 l24 -6"/>
      </g>
      <g stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.85">
        <path d="M160 60 l0 -22"/> <!-- 簪/冠 -->
        <circle cx="160" cy="36" r="4" fill="${c}"/>
      </g>
      <rect width="${W}" height="${H}" filter="url(#paper${uid})" opacity="0.4"/>
    </svg>`;
  }

  // —— 世界地图底图（上帝视角） ——
  function mapBackground() {
    const W = 1200, H = 800, uid = 7777; // 固定，避开 0..1996
    const rnd = mulberry32(99);
    const r1 = ridge(rnd, W, 260, 90, 0.6);
    const r2 = ridge(mulberry32(7), W, 520, 120, 0.8);
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" class="map-svg" xmlns="http://www.w3.org/2000/svg">
      ${defs(uid)}
      <rect width="${W}" height="${H}" fill="#f3f1e8"/>
      <g filter="url(#dry${uid})">
        <path d="${pathFrom(r1, true, H)}" fill="#d8d4c6" fill-opacity="0.6" stroke="#9a968688" stroke-width="1.2"/>
        <path d="${pathFrom(r2, true, H)}" fill="#b9b5a4" fill-opacity="0.7" stroke="#6f6c6088" stroke-width="1.4"/>
      </g>
      <!-- 蜿蜒大河 -->
      <path d="M40 740 C 220 660, 160 520, 360 470 S 620 520, 720 470 S 1020 360, 1140 220"
            fill="none" stroke="#8fa6b0" stroke-width="10" stroke-opacity="0.5" stroke-linecap="round"/>
      <path d="M40 740 C 220 660, 160 520, 360 470 S 620 520, 720 470 S 1020 360, 1140 220"
            fill="none" stroke="#5d7884" stroke-width="2" stroke-opacity="0.6" stroke-dasharray="2 10"/>
      <rect width="${W}" height="${H}" filter="url(#paper${uid})" opacity="0.45"/>
    </svg>`;
  }

  window.Art = { scene, npc, mapBackground };
})();
