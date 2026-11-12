import { bagSize } from '../game/inventory.js';
// 화면 위 정보: HP/MP · EXP · 퀵슬롯 · 미니맵 · 이름표 · 알림 · 각성 연출 · 사망 화면
import { STAT_NAMES, STAT_COLORS, STATS, TIERS, CONFIG } from '../data/config.js';
import { SKILLS } from '../data/skills.js';
import { ZONES, TOWN, WORLD_SIZE } from '../data/world.js';
import { roomCenter, ROOMS, ROOM, ROOM_GAP, CORRIDOR, entranceOf } from '../data/dungeons.js';
import { expNeeded, powerLevel } from '../game/growth.js';
import { countOf } from '../game/inventory.js';
import { skillValues } from '../game/skills.js';
import { portrait, chestIcon, bookIcon, coinIcon, swordIcon, itemIcon, skillIcon, homeIcon, duelIcon, scrollIcon, townIcon } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);

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
    $('#face').src = face;
    const icons = { chest: chestIcon(), book: bookIcon(), coin: coinIcon(), face, sword: swordIcon(), home: homeIcon(), duel: duelIcon(),
      hpot: itemIcon({ base: 'hp_potion' }), mpot: itemIcon({ base: 'mp_potion' }), scroll: scrollIcon(), town: townIcon(), boots: itemIcon({ base: 'leather_boots' }) };
    document.querySelectorAll('img[data-ico]').forEach((im) => { im.src = icons[im.dataset.ico] || ''; });
    $('#menuToggle').onclick = () => $('.menuCol').classList.toggle('closed');
    $('#qToggle').onclick = () => $('#questBox').classList.toggle('min');
    this.dirty();
  }

  dirty() { this.isDirty = true; this.onDirty(); }

  toast(msg, color) {
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

  log(msg, color) {
    const el = document.createElement('div');
    el.textContent = msg;
    if (color) el.style.color = color;
    const box = $('#log');
    box.appendChild(el);
    while (box.children.length > 5) box.firstChild.remove();
  }

  zone(z) {
    $('.zoneName').textContent = z ? z.name + (z.levels ? `  ·  위험도 ${z.levels[0]}~${z.levels[1]}` : '') : '황야';
    let info = '안전 지역 · 상점 이용 가능';
    if (z && z.levels) info = `위험도 ${z.levels[0]}~${z.levels[1]} · 권장 각성 ${Math.max(0, (z.levels[0] - 1) * 2)}+${z.id ? ` · 해방 ${Math.floor(((this.world.st.liberate?.[z.id] || 0) / 400) * 100)}%` : ''}`;
    else if (!z) info = '지역 사이의 황야';
    $('.zoneInfo').textContent = info;
    $('#shopBtn').hidden = !(z && z.id === 'town');
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

  // 칭호 고르기: 이름 + 특성 셋 중 하나
  titlePick(o, done) {
    let el = $('#titlePick');
    if (!el) { el = document.createElement('div'); el.id = 'titlePick'; document.body.appendChild(el); }
    const tier = ['1단계', '2단계', '3단계'][o.tier];
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
    $('.bar.hp i').style.transform = `scaleX(${Math.max(0, st.hp / d.maxHp)})`;
    $('.bar.hp span').textContent = `${Math.ceil(Math.max(0, st.hp))} / ${d.maxHp}`;
    $('.bar.mp i').style.transform = `scaleX(${Math.max(0, st.mp / d.maxMp)})`;
    $('.bar.mp span').textContent = `${Math.floor(st.mp)} / ${d.maxMp}`;
    const need = expNeeded(st.awakenings);
    $('.bar.xp i').style.transform = `scaleX(${st.exp / need})`;
    $('#expBar i').style.transform = `scaleX(${st.exp / need})`;
    $('#expBar span').textContent = `각성 EXP ${((st.exp / need) * 100).toFixed(2)}%${w.auto ? '  (자동 사냥 -20%)' : ''}`;

    // 퀵슬롯 쿨타임
    const slots = $('#quick').children;
    for (let i = 0; i < slots.length; i++) {
      const id = st.quick[i];
      const el = slots[i];
      if (!id || !st.skills[id]) continue;
      const v = skillValues(id, st.skills[id].rank, st.skills[id].var);
      const cd = Math.max(0, w.cds[id] || 0);
      el.querySelector('.cd').style.setProperty('--cd', (cd / v.cd).toFixed(3));
      el.classList.toggle('nomp', st.mp < v.mp);
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
    const active = Object.entries(w.buffs).filter(([, b]) => b.t > 0);
    if (bb.childElementCount !== active.length || this.isDirty) {
      bb.innerHTML = active.map(([, b]) => `<div class="buff" style="background:${SKILLS[b.id].color}55;border-color:${SKILLS[b.id].color}"><img src="${skillIcon(b.id)}" alt="" /></div>`).join('');
    }

    this.updateLabels();
    this.mapT -= dt;
    if (this.mapT <= 0) { this.mapT = 0.15; this.drawMap(); }

    if (this.isDirty) {
      this.isDirty = false;
      $('#gold').textContent = st.gold.toLocaleString();
      $('#awakeBadge').textContent = `각성 ${st.awakenings}`;
      $('#bagCnt').textContent = `${st.inv.length}/${bagSize(st)}`;
      $('#btnHp em').textContent = countOf(st, 'hp_potion') + countOf(st, 'hp_potion_l');
      $('#btnMp em').textContent = countOf(st, 'mp_potion') + countOf(st, 'mp_potion_l');
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
    const place = (key, pos, y, make, update) => {
      const sc = w.stage.toScreen(pos.x, pos.z, y);
      if (sc.x < -60 || sc.y < -60 || sc.x > W + 60 || sc.y > H + 60) return;
      let el = this.labels.get(key);
      if (!el) { el = make(); this.labelLayer.appendChild(el); this.labels.set(key, el); }
      update?.(el);
      el.style.left = `${sc.x}px`;
      el.style.top = `${sc.y}px`;
      seen.add(key);
    };
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
      }, (el) => { el.querySelector('i').style.width = `${(m.hp / m.maxHp) * 100}%`; });
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
        el.textContent = `${w.npc.name} (상점)`;
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
    for (const [k, n, tag] of [['gemNpc', w.gemNpc, '보석 · 열쇠'], ['sage', w.sage, '도감 · 칭호']]) {
      if (!n || Math.hypot(n.pos.x - P.x, n.pos.z - P.z) >= 22) continue;
      place(k, n.pos, 2.9, () => { const el = document.createElement('div'); el.className = 'lbl npc'; el.textContent = `${n.name} (${tag})`; return el; });
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
      for (let k2 = 0; k2 < ROOMS; k2++) { const rc = roomCenter(zi, k2); c.fillRect(tx(rc.x - ROOM), tz(rc.z - ROOM), ROOM * 2 * k, ROOM * 2 * k); }
      const r0 = roomCenter(zi, 0); c.fillRect(tx(r0.x - CORRIDOR), tz(0), CORRIDOR * 2 * k, (ROOMS - 1) * ROOM_GAP * k);
    } else for (const z of ZONES) {
      c.beginPath();
      c.arc(tx(z.x), tz(z.z), z.r * k, 0, Math.PI * 2);
      c.fillStyle = `rgba(${z.ground.map((v) => Math.round(v * 255)).join(',')},0.55)`;
      c.fill();
    }
    c.beginPath();
    c.arc(tx(TOWN.x), tz(TOWN.z), TOWN.r * k, 0, Math.PI * 2);
    c.fillStyle = 'rgba(120,90,50,0.55)';
    c.fill();
    c.strokeStyle = 'rgba(232,195,106,0.5)';
    c.stroke();
    c.beginPath();
    c.arc(tx(0), tz(0), WORLD_SIZE * k, 0, Math.PI * 2);
    c.strokeStyle = 'rgba(0,0,0,0.8)';
    c.lineWidth = 3;
    c.stroke();
    if (!w.dungeon) for (const z of ZONES) { const e = entranceOf(z); c.fillStyle = '#80c0ff'; c.beginPath(); c.arc(tx(e.x), tz(e.z), 4, 0, 7); c.fill(); }
    for (const m of w.monsters) {
      if (m.dead) continue;
      const big = m.tier !== 'normal';
      c.fillStyle = TIERS[m.tier].color === '#e8e2d4' ? '#e04a38' : TIERS[m.tier].color;
      c.beginPath();
      c.arc(tx(m.pos.x), tz(m.pos.z), big ? 3.5 : 2, 0, Math.PI * 2);
      c.fill();
    }
    for (const g of w.ground) {
      c.fillStyle = g.color;
      c.fillRect(tx(g.x) - 1, tz(g.z) - 1, 2, 2);
    }
    // 보스 위치 표시
    for (const sp of w.spawners) {
      if (sp.tier !== 'boss') continue;
      c.fillStyle = sp.mon ? '#ff5a4a' : 'rgba(255,90,74,0.3)';
      c.font = '13px sans-serif';
      c.fillText('☠', tx(sp.x) - 5, tz(sp.z) + 5);
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
