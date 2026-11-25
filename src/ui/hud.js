import { cleanNum, cleanTree } from './numfmt.js';
import { HP_POTIONS, MP_POTIONS } from '../data/potions.js';
import { bagSize } from '../game/inventory.js';
// 화면 위 정보: HP/MP · EXP · 퀵슬롯 · 미니맵 · 이름표 · 알림 · 각성 연출 · 사망 화면
import { STAT_NAMES, STAT_COLORS, STATS, TIERS, CONFIG } from '../data/config.js';
import { SKILLS } from '../data/skills.js';
import { ZONES, TOWN, WORLD_SIZE } from '../data/world.js';
import { entranceOf, layout as dungeonLayout, cellPos, N, T } from '../data/dungeons.js';
import { terrain, fogCan, MAP_R, FOG_C, seen as seenAt } from './mapimg.js';
import { CAMPS } from '../engine2d/stage.js';
import { dailyOf, dailyText } from '../game/daily.js';
import { hordePen } from '../data/horde.js';
import { RAID_SPOT, lordName } from '../data/raid.js';
import { karmaNeed } from '../data/mugan.js';
import { townOf } from '../game/town.js';
import { PLOTS, BUILDINGS, VAULT_SPOT } from '../data/buildings.js';
import { expNeeded, powerLevel, recAwaken } from '../game/growth.js';
import { countOf } from '../game/inventory.js';
import { skillValues, modsOf, mpCost } from '../game/skills.js';
import { ELIXIRS } from '../data/potions.js';
import { bust, faceClose, portrait, chestIcon, bookIcon, coinIcon, swordIcon, itemIcon, skillIcon, homeIcon, duelIcon, scrollIcon, townIcon, oreIcon, itemIconCut, glyphIcon, uiIcon } from './icons.js';

// v0.49.56 HUD는 매 프레임 같은 칸을 찾고 써서: 찾은 칸은 기억하고(문서에 붙어 있는 동안), 값이 바뀔 때만 쓴다
const $cache = new Map();
const $ = (s, r = document) => { if (r !== document) return r.querySelector(s); let el = $cache.get(s); if (!el || !el.isConnected) { el = r.querySelector(s); if (el) $cache.set(s, el); } return el; };
const txt = (el, v) => { if (el && el._t !== v) { el._t = v; el.textContent = cleanNum(String(v)); } }; // v0.49.77 긴 소수 정리
const tfm = (el, v) => { if (el && el._f !== v) { el._f = v; el.style.transform = v; } };

export class HUD {
  constructor() {
    this.fxLayer = $('#fx');
    this.labelLayer = $('#labels');
    this.labels = new Map();
    this.isDirty = true;
    this.mapCtx = $('#minimap').getContext('2d');
    this.mapT = 0;
    this.onDirty = () => {};
    this.buildQuick();
  }

  attach(world) {
    this.world = world;
    // 3D 모델로 찍은 아이콘을 단추에 넣는다
    const face = portrait(world.st.look);
    $('#face').src = bust(world.st.look); // v0.49.49 HUD도 첫 화면처럼 배경 지운 머리 · 어깨
    const icons = { chest: chestIcon(), book: bookIcon(), coin: coinIcon(), face, sword: swordIcon(), home: homeIcon(), duel: duelIcon(),
      hpot: itemIconCut('hp_potion'), mpot: itemIconCut('mp_potion'), scroll: scrollIcon(), town: townIcon(), boots: itemIcon({ base: 'leather_boots' }), rank: itemIconCut('great_helm'),
      // v0.49.8 HUD 단추는 모두 같은 문양 아이콘 (단추 안에 또 네모가 보이지 않게)
      g_gear: uiIcon('menu'), g_chest: uiIcon('inv'), g_book: uiIcon('skills'), g_face: uiIcon('char'), g_quest: uiIcon('quest'), g_rank: uiIcon('rank'), g_shop: uiIcon('shop'), g_home: uiIcon('home'), g_auto: uiIcon('auto'), g_sword: uiIcon('sword') };
    document.querySelectorAll('img[data-ico]').forEach((im) => { im.src = icons[im.dataset.ico] || ''; });
    $('#menuToggle').onclick = () => $('.menuCol').classList.toggle('closed');
    $('#qToggle').onclick = () => $('#questBox').classList.toggle('min');
    $('#qpToggle').onclick = () => $('#qPanel').classList.toggle('min');
    // v0.49.7 퀘스트를 누르면 퀘스트 창, 기록을 누르면 지난 기록 창
    $('#qPanel .qbody').onclick = () => globalThis.__game?.windows?.show('quest');
    $('#questBox .qbody').onclick = () => globalThis.__game?.windows?.show('log');
    this.dirty();
  }

  dirty() { this.isDirty = true; this.onDirty(); }

  toast(msg, color) {
    msg = cleanNum(msg);
    const box0 = $('#toasts');
    for (const old of box0.children) if (old.textContent === msg) { old.remove(); }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    if (color) el.style.color = color;
    const box = $('#toasts');
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.remove(), 2200);
  }

  log(msg, color, keep = true) {
    msg = cleanNum(msg);
    const el = document.createElement('div');
    el.textContent = msg;
    if (color) el.style.color = color;
    const box = $('#log');
    if (keep) (this.logHist ||= []).push({ t: Date.now(), msg, color }); if (this.logHist.length > 300) this.logHist.splice(0, this.logHist.length - 300); // v0.49.7 기록 창용
    box.appendChild(el);
    while (box.children.length > 5) box.firstChild.remove();
  }

  zone(z) {
    { const o = z?.id ? this.world.tierOffset : 0, mg = z?.id && this.world.wt >= 5 ? `무간 ${this.world.mfloor}층 · ` : ''; // v0.49.75 세계 단계 보정을 더한 위험도 (예전엔 평온 값이 보였다)
      txt($('.zoneName'), z ? mg + z.name + (z.levels ? `  ·  위험도 ${z.levels[0] + o}~${z.levels[1] + o}` : '') : '황야'); }
    { const fl = z?.id && this.world.st.flood?.list?.some((f) => f.zone === z.id); if (fl) txt($('.zoneName'), '범람지 · ' + $('.zoneName').textContent); $('.zoneName').style.color = fl ? '#ff6a5a' : ''; } // v0.44.44
    let info = '안전 지역 · 상점 이용 가능';
    const off = z?.id ? this.world.tierOffset : 0;
    if (z && z.levels) info = `위험도 ${z.levels[0] + off}~${z.levels[1] + off} · 권장 각성 ${recAwaken(z.levels[0] + off)}+${z.id ? ` · 해방 ${Math.floor(((this.world.st.liberate?.[z.id] || 0) / 400) * 100)}%` : ''}`;
    else if (!z) info = '지역 사이의 황야';
    txt($('.zoneInfo'), info);
    $('#shopBtn').hidden = true;
    this.log(`— ${z ? z.name : '황야'} —`, '#9a917f');
  }

  awaken(r) {
    const el = $('#awaken');
    const gains = STATS.filter((s) => r.gains[s] > 0)
      .map((s) => `<span style="color:${STAT_COLORS[s]}">${STAT_NAMES[s]} +${r.gains[s]}</span>`).join('');
    const top = STATS.filter((s) => r.shares[s] > 0.005).sort((a, b) => r.shares[b] - r.shares[a])
      .map((s) => `${STAT_NAMES[s]} ${Math.round(r.shares[s] * 100)}%`).join(' · ');
    const EFF = { str: ['검 피해', 3], dex: ['활 피해 · 공격 속도', 3], int: ['주문 피해', 3.5], wis: ['최대 MP', 4.5, true], vit: ['최대 HP', 6, true] };
    const eff = STATS.filter((s) => r.gains[s] > 0).map((s) => { const [n, k, flat] = EFF[s]; return `${n} +${flat ? Math.round(r.gains[s] * k) : Math.round(r.gains[s] * k) + '%'}`; }).join(' · ');
    el.innerHTML = `<h1>각성</h1><div class="gains">${gains}</div><div class="why">${eff}</div><div class="why">최근 행동: ${top || '없음'}</div>`;
    el.hidden = false;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this.awT);
    this.awT = setTimeout(() => { el.hidden = true; }, 3200);
    this.log(`각성 ${r.n}회: ${STATS.filter((s) => r.gains[s]).map((s) => `${STAT_NAMES[s]}+${r.gains[s]}`).join(' ')}`, '#ffd860');
    this.dirty();
  }

  // 묻기 창: 제목 · 글 · [예] · [아니오] (yes 글자가 없으면 [닫기]만)
  ask(title, text, yes, done) {
    let el = $('#askBox');
    if (!el) { el = document.createElement('div'); el.id = 'askBox'; document.body.appendChild(el); }
    el.innerHTML = `<div class="tpBox"><h1 style="font-size:1.6em">${title}</h1><div style="margin:.4em 0 1em">${text}</div><div class="tpList" style="justify-content:center">${yes ? `<button class="plate gold" data-a="1">${yes}</button>` : ''}<button class="plate" data-a="0">${yes ? '아니오' : '닫기'}</button></div></div>`;
    cleanTree(el); // v0.49.77
    el.hidden = false;
    const t0 = performance.now();
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('pointerup', () => { if (performance.now() - t0 < 300) return; el.hidden = true; done(b.dataset.a === '1'); }));
  }

  // 여러 개 중 하나 고르기 (던전 난이도 등): opts = [{ label, sub, off }], done(i) · 닫으면 -1
  choose(title, text, opts, done) {
    let el = $('#askBox');
    if (!el) { el = document.createElement('div'); el.id = 'askBox'; document.body.appendChild(el); }
    el.innerHTML = `<div class="tpBox"><h1 style="font-size:1.6em">${title}</h1><div style="margin:.4em 0 1em">${text}</div><div class="tpList" style="justify-content:center;flex-wrap:wrap">${opts.map((o, i) => `<button class="plate${o.off ? '' : ' gold'}" data-a="${i}" ${o.off ? 'disabled' : ''}><b>${o.label}</b>${o.sub ? `<br><small>${o.sub}</small>` : ''}</button>`).join('')}<button class="plate" data-a="-1">닫기</button></div></div>`;
    cleanTree(el); // v0.49.77
    el.hidden = false;
    const t0 = performance.now();
    el.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('pointerup', () => { if (performance.now() - t0 < 300 || b.disabled) return; el.hidden = true; done(Number(b.dataset.a)); }));
  }

  // 칭호 고르기: 이름 + 특성 셋 중 하나
  titlePick(o, done) {
    let el = $('#titlePick');
    if (!el) { el = document.createElement('div'); el.id = 'titlePick'; document.body.appendChild(el); }
    const tier = `${o.tier + 1}단계`;
    el.innerHTML = `<div class="tpBox"><div class="note">칭호 ${tier}</div><h1>${o.name}</h1>
      <div class="tpList">${o.choices.map((c, i) => `<button class="plate tpPick" data-i="${i}">${c.text}</button>`).join('')}</div></div>`;
    el.hidden = false;
    const t0 = performance.now();
    el.querySelectorAll('.tpPick').forEach((b) => b.addEventListener('pointerup', () => {
      if (performance.now() - t0 < 400) return; // 창을 연 손길이 바로 고르지 않게
      el.hidden = true; done(o.choices[Number(b.dataset.i)]);
    }));
  }

  death(lostName, color) {
    const el = $('#death');
    el.innerHTML = `<h1>사망</h1>
      <div>${lostName ? `<span style="color:${color}">${lostName}</span>을(를) 쓰러진 자리에 떨어뜨렸습니다.<br><span class="note">${CONFIG.deathItemLifetime / 60}분 안에 돌아가면 되찾을 수 있습니다.</span>` : '잃어버린 물건은 없습니다.'}</div>
      ${this.world.auto ? '<div class="note">자동 사냥: 곧 마을에서 일어납니다</div>' : ''}<button class="plate gold" id="btnRevive">마을에서 부활</button>`;
    el.hidden = false;
    $('#btnRevive').onclick = () => { el.hidden = true; this.world.revive(); };
  }

  closeDeath() { $('#death').hidden = true; }

  buildQuick() {
    const q = $('#quick');
    q.innerHTML = '';
    // v0.50 스킬 세트 1 · 2 · 3 단추 (스킬 칸 옆)
    if (!document.getElementById('qsets')) {
      const b = document.createElement('div'); b.id = 'qsets';
      b.innerHTML = [0, 1, 2].map((i) => `<button class="btn qset" data-qset="${i}">${i + 1}</button>`).join('');
      q.parentNode.insertBefore(b, q.nextSibling);
      b.querySelectorAll('[data-qset]').forEach((el) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.world?.setQuickSet(Number(el.dataset.qset)); }));
    }
    for (let i = 0; i < CONFIG.quickSlots; i++) {
      const s = document.createElement('div');
      s.className = 'slot empty';
      s.innerHTML = `<span class="key">${i + 1}</span><div class="ico"></div><div class="cd"></div><span class="rank"></span><span class="nm"></span>`;
      s.dataset.i = i;
      q.appendChild(s);
    }
  }

  // 매 프레임
  update(dt) {
    const w = this.world;
    if (!w) return;
    const st = w.st, d = w.d;
    // 퀘스트 칸: 오늘의 의뢰 진행 (바뀔 때만 다시 쓴다)
    this.dailyT = (this.dailyT || 0) - dt; // v0.49.56 0.5초마다 (매 프레임 오늘 날짜 · 목록 문자열을 새로 만들었다)
    const dl = this.dailyT <= 0 ? ((this.dailyT = 0.5), dailyOf(st)) : null, dk = dl ? dl.list.map((q) => q.have + (q.done ? 'd' : '') + (q.got ? 'g' : '')).join('|') : this.dailyKey;
    // v0.50 군세: 모여 있으면 맨 위에 (벌칙이 붙으면 붉게)
    const mf = w.wt >= 5 ? w.mfloor : 0, mk = mf ? (st.muganKarma?.[mf] || 0) : 0, ml = mf ? `<div class="dq hordeQ">무간 ${mf}층 · 업보 <b>${mf < (st.muganMax || 1) ? '열림' : `${Math.min(mk, karmaNeed(mf)).toLocaleString()} / ${karmaNeed(mf).toLocaleString()}`}</b></div>` : ''; // v0.49.75
    const hz = st.horde?.zone, hp = hz ? hordePen(st) : 0, hl = hz ? `<div class="dq hordeQ${hp ? ' pen' : ''}">군세 토벌 · ${ZONES.find((z) => z.id === hz)?.name || ''} <b>${hp ? `드랍 · 경험치 −${Math.round(hp * 100)}%` : '하겐'}</b></div>` : '';
    if (dl && dk + hl + ml !== this.dailyKey) { this.dailyKey = dk + hl + ml; $('#dailyBox').innerHTML = ml + hl + dl.list.filter((q) => !q.got).map((q) => `<div class="dq${q.done ? ' fin' : ''}">${dailyText(q)} <b>${q.done ? '완료' : `${q.have} / ${q.need}`}</b></div>`).join(''); }
    if (this.qsetShown !== st.quickSet) { this.qsetShown = st.quickSet; document.querySelectorAll('#qsets [data-qset]').forEach((el) => el.classList.toggle('on', Number(el.dataset.qset) === (st.quickSet || 0))); }
    tfm($('.bar.hp i'), `scaleX(${Math.max(0, st.hp / d.maxHp)})`);
    txt($('.bar.hp span'), `${Math.ceil(Math.max(0, st.hp))} / ${d.maxHp}`);
    tfm($('.bar.mp i'), `scaleX(${Math.max(0, st.mp / d.maxMp)})`);
    txt($('.bar.mp span'), `${Math.floor(st.mp)} / ${d.maxMp}`);
    const need = expNeeded(st.awakenings);
    tfm($('#expBar i'), `scaleX(${st.exp / need})`);
    txt($('#expBar span'), `각성 EXP ${((st.exp / need) * 100).toFixed(2)}%${w.auto ? ` · 자동 -${Math.round((1 - (CONFIG.autoExpPenalty ?? CONFIG.autoPenalty)) * 100)}%` : ''}`);

    // 퀵슬롯 쿨타임
    const slots = $('#quick').children;
    for (let i = 0; i < slots.length; i++) {
      const id = st.quick[i];
      const el = slots[i];
      if (!id || !st.skills[id]) continue;
      const v = skillValues(id, st.skills[id].rank, modsOf(st.skills[id]));
      const cd = Math.max(0, w.cds[id] || 0);
      el.querySelector('.cd').style.setProperty('--cd', (cd / v.cd).toFixed(3));
      el.classList.toggle('nomp', st.mp < mpCost(st, id, v) * (w.manaGrip?.(SKILLS[id]) ? 1.5 : 1)); // v0.49.81 실제로 닳는 마나
      el.classList.toggle('nogrip', !!(w.gripWhy?.(SKILLS[id]) || w.weaponWhy?.(SKILLS[id]))); // v0.49.38 지금 무기로 못 쓰는 스킬 (v0.50 근접 · 활도)
    }

    // 대상
    const cur = w.target && !w.target.dead ? w.target : w.lastHit && !w.lastHit.dead && w.lastHit.showHp > 0 ? w.lastHit : null;
    if (cur) { this.lastT = cur; this.lastTT = 4; }
    this.lastTT = (this.lastTT || 0) - dt;
    const t = this.lastT && !this.lastT.dead && this.lastTT > 0 ? this.lastT : null;
    const tf = $('#targetFrame');
    tf.hidden = !t;
    if (t) {
      const tn = tf.querySelector('.tname');
      tn.textContent = `${t.name}  ·  위험도 ${t.level}`;
      tn.style.color = TIERS[t.tier].color;
      tf.querySelector('i').style.transform = `scaleX(${t.hp / t.maxHp})`;
      tf.querySelector('i').style.transformOrigin = 'left';
      tf.querySelector('.thp span').textContent = `${Math.ceil(t.hp).toLocaleString()} / ${t.maxHp.toLocaleString()}`;
    }
    $('#autoText').hidden = !w.auto;
    $('#btnAuto').classList.toggle('on', w.auto);

    // 버프
    const bb = $('#buffs');
    const active = Object.entries(w.buffs).filter(([, b]) => b.t > 0), elix = Object.keys(w.st.elix || {});
    if (bb.childElementCount !== active.length + elix.length || this.isDirty) {
      bb.innerHTML = active.map(([, b]) => `<div class="buff" style="background:${SKILLS[b.id].color}55;border-color:${SKILLS[b.id].color}"><img src="${skillIcon(b.id)}" alt="" /></div>`).join('')
        + elix.map((k) => `<div class="buff" title="${ELIXIRS[k].name} ${ELIXIRS[k].text}" style="background:${ELIXIRS[k].color}44;border-color:${ELIXIRS[k].color}"><img src="${itemIcon({ base: k })}" alt="" /></div>`).join('');
    }

    this.updateLabels();
    this.mapT -= dt;
    if (this.mapT <= 0) { this.mapT = 0.15; this.drawMap(); }

    if (this.isDirty) {
      this.isDirty = false;
      txt($('#gold'), st.gold.toLocaleString());
      txt($('#oreN'), townOf(st).ore.toLocaleString());
      if (!$('#oreIco').src) $('#oreIco').src = oreIcon();
      txt($('#awakeBadge'), `각성 ${st.awakenings}`);
      txt($('#bagCnt'), `${st.inv.length}/${bagSize(st)}`);
      // 물약 칸: 가방에서 정해 둔 물약이면 그 그림 · 개수
      for (const [k, sel, def] of [['hp', '#btnHp', HP_POTIONS.slice().reverse()], ['mp', '#btnMp', MP_POTIONS.slice().reverse()]]) {
        const pick = st.potSlot?.[k], img = $(sel + ' img'), want = itemIconCut(pick || def[0]);
        $(sel + ' em').textContent = pick ? countOf(st, pick) : def.reduce((a, i) => a + countOf(st, i), 0);
        if (img.dataset.k !== want.slice(-24)) { img.dataset.k = want.slice(-24); img.src = want; }
      }
      for (let i = 0; i < slots.length; i++) {
        const id = st.quick[i];
        const el = slots[i];
        const ico = el.querySelector('.ico');
        if (id && st.skills[id]) {
          const sk = SKILLS[id];
          el.classList.remove('empty');
          ico.innerHTML = `<img src="${skillIcon(id)}" alt="" draggable="false" />`;
          ico.style.background = `radial-gradient(circle at 35% 30%, ${sk.color}, #1a120a 92%)`;
          el.querySelector('.rank').textContent = st.skills[id].rank;
          el.querySelector('.nm').textContent = sk.name;
          el.title = sk.name;
        } else {
          el.classList.add('empty');
          ico.innerHTML = '';
          ico.style.background = 'none';
          el.querySelector('.rank').textContent = '';
          el.querySelector('.nm').textContent = '';
          el.querySelector('.cd').style.setProperty('--cd', 0);
        }
      }
    }
  }

  // 몬스터 머리 위 이름/HP, 바닥 아이템 이름
  updateLabels() {
    const w = this.world;
    const W = window.innerWidth, H = window.innerHeight;
    const seen = new Set();
    const P = w.player.pos;
    const place = (key, pos, y, make, update, head = null) => {
      const sc = w.stage.toScreen(pos.x, pos.z, y);
      if (head?.headPx) { const foot = w.stage.toScreen(pos.x, pos.z, 0).y; sc.y = foot - head.headPx - 4; }
      if (sc.x < -60 || sc.y < -60 || sc.x > W + 60 || sc.y > H + 60) return;
      let el = this.labels.get(key);
      if (!el) { el = make(); this.labelLayer.appendChild(el); this.labels.set(key, el); }
      update?.(el);
      el.style.left = `${sc.x}px`;
      el.style.top = `${sc.y}px`;
      seen.add(key);
    };
    // 내 캐릭터 머리 위: 칭호 · 닉네임 · 작은 체력 · 마나 줄
    if (!w.dead) {
      const st = w.st, d = w.d, ttl = [st.raidTitle && lordName(st.raidTitle), st.titles?.[st.titles.length - 1]?.name].filter(Boolean).join(' · '); // v0.50 원정 칭호
      place('me', P, 2.45 * (w.player.scale || 1), () => {
        const el = document.createElement('div'); el.className = 'lbl me';
        el.innerHTML = '<small class="ttl"></small><b class="nm"></b><span class="hb"><i></i></span><span class="mb"><i></i></span>';
        return el;
      }, (el) => {
        const k = ttl + '|' + (st.nick || st.name);
        if (el.dataset.k !== k) { el.dataset.k = k; el.querySelector('.ttl').textContent = ttl; el.querySelector('.ttl').hidden = !ttl; el.querySelector('.nm').textContent = st.nick || st.name; }
        el.querySelector('.hb i').style.transform = `scaleX(${Math.max(0, st.hp / d.maxHp)})`;
        el.querySelector('.mb i').style.transform = `scaleX(${Math.max(0, st.mp / d.maxMp)})`;
        el.classList.toggle('low', st.hp < d.maxHp * 0.3);
      });
    }
    for (const m of w.monsters) {
      if (m.dead) continue;
      const dd = Math.hypot(m.pos.x - P.x, m.pos.z - P.z);
      const show = m.tier !== 'normal' || m.showHp > 0 || m === w.target;
      if (dd > 40 || !show) continue;
      place('m' + m.id, m.pos, 2.6 * m.actor.scale, () => {
        const el = document.createElement('div');
        el.className = 'lbl';
        el.innerHTML = `<div class="n"></div><div class="hpb"><i></i></div>`;
        el.querySelector('.n').textContent = m.name;
        el.querySelector('.n').style.color = TIERS[m.tier].color;
        return el;
      }, (el) => { el.querySelector('i').style.width = `${(m.hp / m.maxHp) * 100}%`; }, m.actor);
    }
    for (const g of w.ground) {
      if (Math.hypot(g.x - P.x, g.z - P.z) > 20) continue;
      place('g' + g.gid, g, 0.6, () => {
        const el = document.createElement('div');
        el.className = 'lbl item';
        el.textContent = g.label;
        el.style.color = g.color;
        el.onpointerdown = (e) => { e.stopPropagation(); w.cmdMove(g.x, g.z); w.manual(); };
        return el;
      });
    }
    if (Math.hypot(w.npc.pos.x - P.x, w.npc.pos.z - P.z) < 22) {
      place('npc', w.npc.pos, 2.9, () => {
        const el = document.createElement('div');
        el.className = 'lbl npc';
        el.textContent = w.npc.name;
        return el;
      });
    }
    if (Math.hypot(w.guard.pos.x - P.x, w.guard.pos.z - P.z) < 22) {
      place('guard', w.guard.pos, 2.9, () => {
        const el = document.createElement('div');
        el.className = 'lbl npc quest';
        el.textContent = w.guard.name;
        return el;
      });
    }
    if (w.inTown) place('vaultLbl', { x: VAULT_SPOT.x, y: 0, z: VAULT_SPOT.z }, 1.6, () => { const el = document.createElement('div'); el.className = 'lbl npc'; el.textContent = '공용 창고'; return el; });
    if (w.inTown) place('raidLbl', { x: RAID_SPOT.x, y: 0, z: RAID_SPOT.z }, 2.2, () => { const el = document.createElement('div'); el.className = 'lbl npc'; el.textContent = '왕좌의 문'; return el; });
    if (w.inTown) for (const pl of PLOTS) {
      const b = w.st.town?.plots?.[pl.id], nm = b ? `${BUILDINGS[b.type].name} ${b.bld ? '공사 중' : `${b.lv}단계`}` : '빈 집터';
      place('plot' + pl.id + nm, { x: pl.x, y: 0, z: pl.z }, b && b.type !== 'herb' ? 4.2 : 1.6, () => { const el = document.createElement('div'); el.className = 'lbl npc'; el.textContent = nm; return el; });
    }
    for (const [k, n, tag] of [['gemNpc', w.gemNpc, ''], ['sage', w.sage, '']]) {
      if (!n || Math.hypot(n.pos.x - P.x, n.pos.z - P.z) >= 22) continue;
      place(k, n.pos, 2.9, () => { const el = document.createElement('div'); el.className = 'lbl npc'; el.textContent = n.name; return el; });
    }
    for (const [k, el] of this.labels) if (!seen.has(k)) { el.remove(); this.labels.delete(k); }
  }

  drawMap() {
    const w = this.world;
    const c = this.mapCtx;
    const S = 200, R = 55; // 미니맵 반경(월드 단위)
    const P = w.player.pos;
    const k = S / (R * 2);
    const tx = (x) => (x - P.x) * k + S / 2;
    const tz = (z) => (z - P.z) * k + S / 2;
    c.clearRect(0, 0, S, S);
    c.fillStyle = 'rgba(14,11,22,0.92)';
    c.fillRect(0, 0, S, S);
    c.lineWidth = 1;
    if (w.dungeon) {
      const zi = w.dungeon.zi;
      c.fillStyle = 'rgba(90,80,70,0.8)';
      const Ld = dungeonLayout(zi), o = cellPos(zi, 0, 0);
      for (let k2 = 0; k2 < Ld.g.length; k2++) if (Ld.g[k2]) { const i = k2 % N, j = Math.floor(k2 / N); c.fillRect(tx(o.x + (i - 0.5) * T), tz(o.z + (j - 0.5) * T), T * k + 0.5, T * k + 0.5); }

    } else {
      // 지형 그림 + 탐험 안개
      c.imageSmoothingEnabled = false;
      c.drawImage(terrain, P.x - R + MAP_R, P.z - R + MAP_R, R * 2, R * 2, 0, 0, S, S);
      c.imageSmoothingEnabled = true;
      c.drawImage(fogCan, (P.x - R + MAP_R) / FOG_C, (P.z - R + MAP_R) / FOG_C, (R * 2) / FOG_C, (R * 2) / FOG_C, 0, 0, S, S);
      // 포탈 = 하늘색 고리
      for (const cp of CAMPS) if (w.st.camps?.[cp.zone]) { c.strokeStyle = '#7fe8ff'; c.lineWidth = 2.5; c.beginPath(); c.arc(tx(cp.x), tz(cp.z), 5, 0, 7); c.stroke(); c.fillStyle = '#e8fbff'; c.beginPath(); c.arc(tx(cp.x), tz(cp.z), 1.8, 0, 7); c.fill(); }
      c.strokeStyle = '#7fe8ff'; c.lineWidth = 2.5; c.beginPath(); c.arc(tx(0), tz(-2), 5, 0, 7); c.stroke();
    }
    c.beginPath();
    c.arc(tx(TOWN.x), tz(TOWN.z), TOWN.r * k, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(232,195,106,0.5)';
    c.stroke();
    c.beginPath();
    c.arc(tx(0), tz(0), WORLD_SIZE * k, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(0,0,0,0.8)';
    c.lineWidth = 3;
    c.stroke();
    // v0.51 마을 건물: 지은 건물은 금색 네모, 빈 집터는 흐린 네모 · NPC는 흰 점
    if (!w.dungeon && Math.hypot(P.x - TOWN.x, P.z - TOWN.z) < TOWN.r + R) {
      const plots = w.st.town?.plots || {};
      for (const pl of PLOTS) {
        const b = plots[pl.id], x = tx(pl.x), y = tz(pl.z), h = b ? 6 : 4;
        c.fillStyle = b ? (b.bld ? '#a08a5a' : '#e8c36a') : 'rgba(200,190,160,0.35)'; c.fillRect(x - h, y - h, h * 2, h * 2);
        if (b) { c.strokeStyle = '#2a1c08'; c.lineWidth = 1.5; c.strokeRect(x - h, y - h, h * 2, h * 2); }
      }
      c.fillStyle = '#f4efe2';
      for (const n of [w.npc, w.guard, w.gemNpc, w.sage]) if (n) { c.beginPath(); c.arc(tx(n.pos.x), tz(n.pos.z), 2.6, 0, 7); c.fill(); }
    }
    // 던전 입구 = 초록 세모 (테두리)
    if (!w.dungeon) for (const z of ZONES) { const e = entranceOf(z); if (!seenAt(e.x, e.z)) continue; const x = tx(e.x), y = tz(e.z); c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 6, y + 5); c.lineTo(x - 6, y + 5); c.closePath(); c.fillStyle = w.bossCleared?.(z) ? '#5ee07a' : '#7a8a7e'; c.fill(); /* 보스를 아직 안 잡았으면 회색 (잠김) */ c.strokeStyle = '#0c2a12'; c.lineWidth = 1.5; c.stroke(); }
    // 몬스터: 일반 = 빨간 점, 정예 · 네임드 = 주황 점, 보스 = 큰 금색 마름모 (파란색은 쓰지 않는다)
    for (const m of w.monsters) {
      if (m.dead) continue;
      const x = tx(m.pos.x), y = tz(m.pos.z);
      if (m.tier === 'boss') { c.beginPath(); c.moveTo(x, y - 7); c.lineTo(x + 7, y); c.lineTo(x, y + 7); c.lineTo(x - 7, y); c.closePath(); c.fillStyle = '#ffcf3a'; c.fill(); c.strokeStyle = '#5a1000'; c.lineWidth = 2; c.stroke(); continue; }
      c.fillStyle = m.tier === 'normal' ? '#e04a38' : '#ff9a2a';
      c.beginPath(); c.arc(x, y, m.tier === 'normal' ? 2 : 3.5, 0, Math.PI * 2); c.fill();
    }
    for (const g of w.ground) {
      c.fillStyle = g.color;
      c.fillRect(tx(g.x) - 1, tz(g.z) - 1, 2, 2);
    }
    // 보스 위치 표시
    for (const sp of w.spawners) {
      if (sp.tier !== 'boss' || !seenAt(sp.x, sp.z)) continue;
      if (sp.mon && !sp.mon.dead) continue; // 살아 있으면 위에서 금색 마름모로
      const x = tx(sp.x), y = tz(sp.z); c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 6, y); c.lineTo(x, y + 6); c.lineTo(x - 6, y); c.closePath(); c.strokeStyle = 'rgba(255,207,58,0.45)'; c.lineWidth = 1.5; c.stroke();
    }
    c.save();
    c.translate(S / 2, S / 2);
    c.rotate(-w.player.root.rotation.y + Math.PI);
    c.fillStyle = '#ffe9a8';
    c.strokeStyle = '#000';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, -7); c.lineTo(5, 5); c.lineTo(0, 2.5); c.lineTo(-5, 5); c.closePath();
    c.fill(); c.stroke();
    c.restore();
  }
}

export { powerLevel };
