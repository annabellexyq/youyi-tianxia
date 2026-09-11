/* ============================================================================
 *  游医天下 · 主逻辑
 *  地图导航 / 场景叙事 / 五脏五色组方小游戏 / 分支结局
 * ==========================================================================*/
(function () {
  'use strict';
  const { ORGANS, ORGAN_ORDER, WORLD_MODEL, LOCATIONS } = window.YIYI;
  const Art = window.Art;

  const state = {
    idx: 0,                // 当前境索引
    visited: new Set(),    // 已到过的境
    player: {},            // 最近一次组方 {gan:.., ...}
    grade: null,
  };

  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const screens = {
    title: $('#title'), map: $('#mapScreen'), scene: $('#sceneScreen'), end: $('#endScreen'),
  };
  function show(name) {
    Object.values(screens).forEach(s => s.classList.remove('on'));
    screens[name].classList.add('on');
  }

  /* ---------- 标题 ---------- */
  $('#startBtn').addEventListener('click', () => { buildMap(); show('map'); });

  /* ---------- 世界地图 ---------- */
  function buildMap() {
    const wrap = $('#mapWrap');
    wrap.innerHTML = '';
    wrap.appendChild(htmlToNode(Art.mapBackground()));

    LOCATIONS.forEach((loc, i) => {
      const node = el('div', 'node');
      node.style.left = loc.mapPos.x + '%';
      node.style.top = loc.mapPos.y + '%';
      if (state.visited.has(loc.id)) node.classList.add('done');
      if (i === state.idx && canEnter(i)) node.classList.add('cur');
      if (!canEnter(i)) node.classList.add('locked');

      node.innerHTML = `<div class="ring"></div><div class="dot"></div><div class="lbl">${loc.name}</div>`;
      if (canEnter(i)) node.addEventListener('click', () => enterScene(i));
      else node.addEventListener('click', () => toast('此境尚未解锁——且随张天一一路行去。'));
      wrap.appendChild(node);
    });
  }
  function canEnter(i) {
    if (i === 0) return true;
    return state.visited.has(LOCATIONS[i - 1].id);
  }

  /* ---------- 进入场景 ---------- */
  function enterScene(i) {
    state.idx = i;
    const loc = LOCATIONS[i];
    state.player = {}; state.grade = null;

    // 美术：上方场景（依主脏晕染，初始用经方主色预览）
    const artBox = $('#sceneArt');
    const domKey = loc.puzzle ? dominantFrom(loc.puzzle.suggested) : 'pi';
    artBox.innerHTML = Art.scene(loc, ORGANS[domKey].hex);

    // 面板
    const panel = $('#scenePanel');
    panel.scrollTop = 0;
    panel.innerHTML = '';

    panel.appendChild(el('div', 'idx', loc.subtitle));
    panel.appendChild(el('h2', null, loc.name));
    panel.appendChild(el('div', 'st', '—— 游医张天一 · 第九境叙事 ——'));

    loc.intro.forEach(t => panel.appendChild(el('p', null, t)));

    // NPC 卡
    const card = el('div', 'npc-card');
    const npcArt = el('div', 'npc-art');
    npcArt.innerHTML = Art.npc(loc, ORGANS[domKey].hex);
    const meta = el('div', 'meta');
    meta.innerHTML = `<b>${loc.npc.name}</b><div class="role">${loc.npc.role}</div>` +
      (loc.npc.baZi && loc.npc.baZi.indexOf('无方') < 0 ? `<div class="bz">生辰八字 · ${loc.npc.baZi}</div>` : '') +
      `<div class="ds">${loc.npc.desc}</div>`;
    card.appendChild(npcArt); card.appendChild(meta);
    panel.appendChild(card);

    panel.appendChild(el('div', 'seal', '游醫<br>天下'));

    if (loc.puzzle) buildFormula(panel, loc);
    else buildEpilogue(panel, loc);

    show('scene');
    buildMap(); // 刷新节点状态
  }

  /* ---------- 组方小游戏 ---------- */
  function buildFormula(panel, loc) {
    const f = el('div', 'formula');
    f.appendChild(el('h3', null, '拟方 · 五脏五色调色盘'));
    f.appendChild(el('div', 'hint', loc.puzzle.hint));

    f.appendChild(el('div', 'jingfang',
      `<b>经方建议：</b>${loc.jingFang.name}<br><span style="color:var(--ink-soft)">${loc.jingFang.note}</span><br>` +
      `<span style="color:var(--seal)">生辰八字参考：</span>${loc.npc.baZi}`));

    const sliders = el('div', 'sliders');
    const refs = {};
    ORGAN_ORDER.forEach(k => {
      const o = ORGANS[k];
      const col = el('div', 'scol');
      const sw = el('div', 'bzclr'); sw.style.background = o.hex;
      const name = el('div', 'bzname', o.color);
      const zang = el('div', 'zang', o.zang);
      const range = document.createElement('input');
      range.type = 'range'; range.min = 0; range.max = 100; range.value = 0;
      const val = el('div', 'val', '0');
      const ref = el('div', 'ref', '经 ' + loc.puzzle.suggested[k]);
      refs[k] = { range, val };
      range.addEventListener('input', () => {
        val.textContent = range.value;
        state.player[k] = +range.value;
        livePreview(loc, refs);
      });
      col.appendChild(name); col.appendChild(sw); col.appendChild(zang);
      col.appendChild(range); col.appendChild(val); col.appendChild(ref);
      sliders.appendChild(col);
    });
    f.appendChild(sliders);

    const actions = el('div', 'actions');
    const reset = el('button', 'btn', '归零');
    const submit = el('button', 'btn primary', '拟方入药');
    reset.addEventListener('click', () => {
      ORGAN_ORDER.forEach(k => { refs[k].range.value = 0; refs[k].val.textContent = '0'; state.player[k] = 0; });
      livePreview(loc, refs);
    });
    submit.addEventListener('click', () => submitFormula(panel, loc, refs));
    actions.appendChild(reset); actions.appendChild(submit);
    f.appendChild(actions);

    panel.appendChild(f);
  }

  // 实时预览：依当前滑块主色，晕染场景与立绘（世界模型的沉浸感）
  function livePreview(loc, refs) {
    const cur = currentProfile(refs);
    const dom = dominantFrom(cur);
    $('#sceneArt').innerHTML = Art.scene(loc, ORGANS[dom].hex);
    const npcArt = $('.npc-art', $('#scenePanel'));
    if (npcArt) npcArt.innerHTML = Art.npc(loc, ORGANS[dom].hex);
  }
  function currentProfile(refs) {
    const p = {};
    ORGAN_ORDER.forEach(k => p[k] = refs[k] ? +refs[k].range.value : 0);
    // 若玩家未动，回退到上次 state.player 或 0
    if (Object.values(p).every(v => v === 0) && Object.keys(state.player).length)
      ORGAN_ORDER.forEach(k => p[k] = state.player[k] || 0);
    return p;
  }
  function dominantFrom(profile) {
    let best = ORGAN_ORDER[0], bv = -1;
    ORGAN_ORDER.forEach(k => { if ((profile[k] || 0) > bv) { bv = profile[k] || 0; best = k; } });
    if (bv <= 0) return 'pi'; // 全空时给个默认
    return best;
  }

  /* ---------- 计算与结局 ---------- */
  function submitFormula(panel, loc, refs) {
    const p = currentProfile(refs);
    const total = ORGAN_ORDER.reduce((s, k) => s + (p[k] || 0), 0);
    if (total === 0) { toast('未曾下笔，何来组方？'); return; }

    // 与经方建议的契合度
    const sug = loc.puzzle.suggested;
    const maxd = ORGAN_ORDER.reduce((s, k) => s + Math.abs((p[k] || 0) - sug[k]), 0);
    const denom = ORGAN_ORDER.reduce((s, k) => s + (sug[k] + 100), 0); // 最大可能差
    const match = 1 - maxd / denom;
    let grade = match > 0.78 ? 'shang' : match > 0.5 ? 'zhong' : 'xia';

    state.player = p; state.grade = grade;
    const dom = dominantFrom(p);
    renderResult(panel, loc, grade, dom);

    // 解锁下一境
    state.visited.add(loc.id);
    buildMap();
  }

  function renderResult(panel, loc, grade, domKey) {
    const out = loc.outcomes[grade];
    const wm = WORLD_MODEL[domKey];
    const gradeLabel = { shang: '上工 · 效如桴鼓', zhong: '中工 · 平稳收功', xia: '下工 · 偏性生变' }[grade];

    // 移除旧结果
    const old = $('.result', panel); if (old) old.remove();

    const r = el('div', 'result');
    r.innerHTML =
      `<div class="grade ${grade}">${gradeLabel}</div>` +
      `<p>${out.line}</p>` +
      `<div class="env">环境衍生：${out.envNote}</div>` +
      `<div class="world">世界模型 · 由「五色深浅排列」推得主干为 <b>${ORGANS[domKey].color}（${ORGANS[domKey].zang}）</b>：<br>` +
      `空间：${wm.env}<br>服化：${wm.dress}</div>`;

    const nextRow = el('div', 'next-row');
    const back = el('span', 'mapback', '◀ 返回地图');
    back.addEventListener('click', () => show('map'));
    const nextIdx = LOCATIONS.findIndex(l => l.id === loc.id) + 1;
    if (nextIdx < LOCATIONS.length) {
      const nx = el('button', 'btn primary', '前往下一境 ▶');
      nx.addEventListener('click', () => enterScene(nextIdx));
      nextRow.appendChild(back); nextRow.appendChild(nx);
    } else {
      const fin = el('button', 'btn primary', '功成 · 见结局 ▶');
      fin.addEventListener('click', () => showEnd());
      nextRow.appendChild(back); nextRow.appendChild(fin);
    }
    r.appendChild(nextRow);
    panel.appendChild(r);
    panel.scrollTop = panel.scrollHeight;
  }

  /* ---------- 结局（第九境） ---------- */
  function buildEpilogue(panel, loc) {
    const p = el('p', null, loc.intro[1]);
    panel.appendChild(p);
    const note = el('p', null, '张天一这一路，依五脏五色拟方九次。下方是他的行医治验总览——九境的偏性，皆成杏林一段公案。');
    panel.appendChild(note);

    const tally = el('div', 'jingfang');
    const grades = [...state.visited].map(id => {
      const l = LOCATIONS.find(x => x.id === id);
      return `<div>${l.name} · ${l.jingFang.name}</div>`;
    }).join('');
    tally.innerHTML = `<b>行医治验</b><br>${grades || '<span style="color:var(--ink-soft)">（尚未施治）</span>'}`;
    panel.appendChild(tally);

    const r = el('div', 'result');
    r.innerHTML = `<p>${loc.outcomes.zhong.line}</p><div class="env">${loc.outcomes.zhong.envNote}</div>`;
    const nr = el('div', 'next-row');
    const back = el('span', 'mapback', '◀ 返回地图');
    back.addEventListener('click', () => show('map'));
    const fin = el('button', 'btn primary', '见结局 ▶');
    fin.addEventListener('click', () => showEnd());
    nr.appendChild(back); nr.appendChild(fin);
    r.appendChild(nr);
    panel.appendChild(r);
  }

  /* ---------- 终章 ---------- */
  function showEnd() {
    const screen = screens.end;
    const inner = $('.inner', screen);
    const shang = [...state.visited].length;
    inner.innerHTML =
      `<div class="idx" style="color:var(--seal);letter-spacing:.4em">尾 声</div>` +
      `<h2>游医天下</h2>` +
      `<p>明清之交，瘟疫横行。游医张天一以《黄帝内经》《伤寒论》《金匮要略》《温病条辨》之智，` +
      `走遍市井、边境、府衙、园林、湖心、山村、贡院、庙堂，终归乡野。</p>` +
      `<p>九境之中，他依五脏五色自拟组方 ${shang} 次。医非泥古，意在学习——` +
      `不同的配伍与剂量，生出不同的空间、服化与命运。此皆虚构，聊作白描一卷。</p>` +
      `<button class="btn restart" id="restartBtn">再游一程</button>`;
    $('#restartBtn').addEventListener('click', () => {
      state.visited = new Set(); state.idx = 0; state.player = {}; state.grade = null;
      buildMap(); show('map');
    });
    show('end');
  }

  /* ---------- 工具 ---------- */
  function htmlToNode(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
  }

  buildMap();
})();
