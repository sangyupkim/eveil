// 창: 가방(장비) · 스킬 · 능력(스탯/성향) · 상점 · 메뉴
import { STATS, STAT_NAMES, STAT_COLORS, STAT_DESC, CONFIG } from '../data/config.js';
import { SKILLS, BOOK_TIERS } from '../data/skills.js';
import { BASES, SLOTS, SLOT_NAMES, RARITY, WEAPON_CLASSES } from '../data/items.js';
import { itemName, itemColor, itemValue, affixText, isBook, makeItem } from '../game/items.js';
import { scaledArmor, scaledDmg, totalStats, derive } from '../game/player.js';
import { addItem } from '../game/inventory.js';
import { skillExpNeeded, skillValues, meetsReq } from '../game/skills.js';
import { expNeeded } from '../game/growth.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const ICON = { weapon: '⚔', offhand: '⛨', helm: '⛑', armor: '♜', gloves: '✋', boots: '⛸', belt: '➰', amulet: '✧', ring: '◯', ring1: '◯', ring2: '◯' };
function icon(it) {
  if (isBook(it)) return '📖';
  const b = BASES[it.base];
  if (b.type === 'potion') return b.restore.hp ? '<span style="color:#ff5060">♥</span>' : '<span style="color:#5f9bff">◆</span>';
  return ICON[b.slot] || '?';
}

export class Windows {
  constructor(world, save) {
    this.w = world;
    this.save = save;
    this.el = $('#window');
    this.kind = null;
    this.sel = null;     // 선택한 아이템 { from: 'inv'|'equip', uid|slot }
    this.skillSel = null;
    $('.close', this.el).onclick = () => this.close();
    this.el.addEventListener('pointerdown', (e) => { if (e.target === this.el) this.close(); });
  }

  get open() { return !this.el.hidden; }

  toggle(kind) {
    if (this.open && this.kind === kind) this.close();
    else this.show(kind);
  }

  show(kind) {
    if (kind === 'shop' && !this.w.inTown) { this.w.ui.toast('상점은 마을에서만 이용할 수 있습니다'); return; }
    this.kind = kind;
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.el.hidden = true;
    this.kind = null;
    this.sel = null;
  }

  refresh() { if (this.open) this.render(); }

  render() {
    const titles = { inv: '가방 · 장비', skills: '스킬', char: '능력 · 성향', shop: '상점 — 상인 오르텐', menu: '메뉴' };
    $('h2', this.el).textContent = titles[this.kind];
    const body = $('.body', this.el);
    body.innerHTML = this[this.kind]();
    this.bind(body);
  }

  // ───── 아이템 설명 ─────
  describe(it, where) {
    const st = this.w.st;
    if (!it) return '<div class="note">아이템을 눌러 보세요.</div>';
    const b = BASES[it.base];
    let h = `<div class="nm" style="color:${itemColor(it)}">${esc(itemName(it))}</div>`;
    if (isBook(it)) {
      const sk = SKILLS[it.book];
      const known = st.skills[it.book];
      h += `<div class="sub">${BOOK_TIERS[sk.tier].name} 스킬북</div><div>${sk.desc}</div>`;
      h += `<div class="sub">MP ${sk.mp} · 재사용 ${sk.cd}초</div>`;
      h += reqLine(sk.req, totalStats(st));
      h += known ? `<div class="aff">이미 아는 스킬 — 사용하면 숙련 EXP로 흡수</div>` : '';
    } else if (b.type === 'potion') {
      h += `<div class="sub">소모품 ×${it.qty}</div><div>${b.restore.hp ? `HP ${b.restore.hp} 회복` : `MP ${b.restore.mp} 회복`}</div>`;
    } else {
      h += `<div class="sub">${RARITY[it.rarity].name} ${SLOT_NAMES[b.slot]} · 아이템 레벨 ${it.ilvl}</div>`;
      if (b.dmg) { const d = scaledDmg(it); h += `<div>${WEAPON_CLASSES[b.cls].name} · 피해 ${d[0]}~${d[1]} · 속도 ${b.speed}</div><div class="sub">주 스탯: ${STAT_NAMES[WEAPON_CLASSES[b.cls].ap]} (이 무기로 싸우면 ${STAT_NAMES[WEAPON_CLASSES[b.cls].ap]}이 오른다)</div>`; }
      if (b.armor) h += `<div>방어력 ${scaledArmor(it)}</div>`;
      if (b.block) h += `<div>막기 확률 ${Math.round(b.block * 100)}%</div>`;
      if (b.mods) for (const k in b.mods) h += `<div>${k === 'maxMp' ? '최대 MP' : k} +${b.mods[k]}</div>`;
      for (const a of it.affixes) h += `<div class="aff">${affixText(a)}</div>`;
      h += reqLine(b.req, totalStats(st));
    }
    h += `<div class="sub">판매가 ${itemValue(it)} 골드</div>`;
    h += '<div class="btns">';
    if (where === 'inv') {
      if (isBook(it)) h += `<button class="btn" data-act="use">배우기</button>`;
      else if (b.type === 'potion') h += `<button class="btn" data-act="use">사용</button>`;
      else h += `<button class="btn" data-act="use">장착</button>`;
      if (this.kind === 'shop' || this.w.inTown) h += `<button class="btn" data-act="sell">판매</button>`;
      h += `<button class="btn" data-act="drop">버리기</button>`;
    } else if (where === 'equip') {
      h += `<button class="btn" data-act="unequip">해제</button>`;
    }
    h += '</div>';
    return h;
  }

  inv() {
    const st = this.w.st;
    let eq = '<div class="equipGrid">';
    for (const s of SLOTS) {
      const it = st.equip[s];
      const sel = this.sel?.from === 'equip' && this.sel.slot === s ? ' sel' : '';
      eq += `<div class="cell${sel}" data-eq="${s}" style="${it ? `color:${itemColor(it)};border-color:${itemColor(it)}55` : ''}"><span class="lab">${SLOT_NAMES[s]}</span>${it ? icon(it) : ''}</div>`;
    }
    eq += '</div>';
    let grid = '<div class="grid">';
    for (let i = 0; i < CONFIG.inventorySize; i++) {
      const it = st.inv[i];
      if (!it) { grid += '<div class="cell"></div>'; continue; }
      const sel = this.sel?.from === 'inv' && this.sel.uid === it.uid ? ' sel' : '';
      grid += `<div class="cell${sel}" data-uid="${it.uid}" style="color:${itemColor(it)};border-color:${itemColor(it)}44">${icon(it)}${it.qty > 1 ? `<span class="q">${it.qty}</span>` : ''}</div>`;
    }
    grid += '</div>';
    const cur = this.sel?.from === 'equip' ? st.equip[this.sel.slot] : this.sel?.from === 'inv' ? st.inv.find((x) => x.uid === this.sel.uid) : null;
    let cmp = '';
    if (this.sel?.from === 'inv' && cur && BASES[cur.base]?.slot) {
      const slot = BASES[cur.base].slot === 'ring' ? 'ring1' : BASES[cur.base].slot;
      if (st.equip[slot]) cmp = `<h3>착용 중</h3>${this.describe(st.equip[slot], 'none')}`;
    }
    return `<div class="cols"><div>${eq}<div class="detail">${this.describe(cur, this.sel?.from)}</div>${cmp ? `<div class="detail" style="margin-top:6px;opacity:.8">${cmp}</div>` : ''}</div>
      <div><div class="note" style="margin-bottom:4px">가방 ${st.inv.length}/${CONFIG.inventorySize} · ● ${st.gold.toLocaleString()} 골드</div>${grid}
      <div class="note" style="margin-top:6px">장비는 사냥으로 얻는다. 몬스터가 강할수록 좋은 등급이 나온다.</div></div></div>`;
  }

  skills() {
    const st = this.w.st;
    const ids = Object.keys(st.skills);
    const stats = totalStats(st);
    let list = '';
    if (!ids.length) list = '<div class="note">아직 배운 스킬이 없습니다. 사냥 중 떨어지는 <b>스킬북</b>으로 배울 수 있습니다.<br>강한 몬스터(정예 · 네임드 · 보스)일수록 높은 등급의 책을 떨어뜨립니다.</div>';
    for (const id of ids) {
      const sk = SKILLS[id], s = st.skills[id];
      const v = skillValues(id, s.rank);
      const max = s.rank >= CONFIG.skillMaxRank;
      const need = skillExpNeeded(s.rank);
      const slot = st.quick.indexOf(id);
      const ok = meetsReq(st, sk.req, stats);
      list += `<div class="row ${this.skillSel === id ? 'on' : ''}" data-skill="${id}" style="cursor:pointer;${this.skillSel === id ? 'background:rgba(232,195,106,.08)' : ''}">
        <div class="sicon" style="background:radial-gradient(circle at 35% 30%, ${sk.color}, #1a120a 90%)">${sk.glyph}</div>
        <div class="grow"><b>${sk.name}</b> <span style="color:${BOOK_TIERS[sk.tier].color};font-size:.8em">${BOOK_TIERS[sk.tier].name}</span>
          <span class="note">· 랭크 ${s.rank}${max ? ' (최대)' : ''} · MP ${v.mp} · ${v.cd.toFixed(1)}초${ok ? '' : ' · <span style="color:#ff6a5a">조건 부족</span>'}</span>
          <div class="mini"><i style="width:${max ? 100 : (s.exp / need) * 100}%;background:${sk.color}"></i></div>
          <div class="note">${sk.desc} ${max ? '' : `숙련 ${Math.floor(s.exp)}/${need}`}</div></div>
        <div class="note">${slot >= 0 ? `슬롯 ${slot + 1}` : ''}</div></div>`;
    }
    let slots = '';
    if (this.skillSel) {
      slots = `<div class="btns"><span class="note" style="align-self:center">${SKILLS[this.skillSel].name} → 퀵슬롯:</span>`;
      for (let i = 0; i < CONFIG.quickSlots; i++) slots += `<button class="btn" data-qs="${i}">${i + 1}${st.quick[i] ? ` (${SKILLS[st.quick[i]].glyph})` : ''}</button>`;
      slots += `<button class="btn" data-qs="-1">빼기</button></div>`;
    }
    return `<div class="note">스킬은 <b>사용할 때마다</b> 숙련 EXP가 쌓여 랭크가 오른다 (최대 ${CONFIG.skillMaxRank}). 적중·처치하면 더 많이 쌓인다.</div>${slots}${list}`;
  }

  char() {
    this.w.d = derive(this.w.st, this.w.buffValues());
    const st = this.w.st, d = this.w.d;
    const stats = d.stats;
    const apSum = STATS.reduce((a, s) => a + st.ap[s], 0) || 1;
    let rows = '';
    for (const s of STATS) {
      const bonus = stats[s] - st.stats[s];
      const share = st.ap[s] / apSum;
      rows += `<div class="statRow"><span style="color:${STAT_COLORS[s]}">${STAT_NAMES[s]}</span><b>${stats[s]}${bonus > 0 ? `<small style="color:#8fb4ff;font-size:.7em"> +${bonus}</small>` : ''}</b>
        <div><div class="mini" style="height:8px"><i style="width:${share * 100}%;background:${STAT_COLORS[s]}"></i></div><div class="note">${STAT_DESC[s]} · 성향 ${Math.round(share * 100)}%</div></div></div>`;
    }
    const need = expNeeded(st.awakenings);
    const pct = (v) => `${Math.round(v * 100)}%`;
    const kv = [
      ['피해', `${Math.round(d.dmg[0])}~${Math.round(d.dmg[1])}`], ['공격 속도', `${d.atkRate.toFixed(2)}/초`],
      ['치명타', pct(d.crit)], ['회피', pct(d.dodge)], ['막기', pct(d.block)], ['방어력', Math.round(d.armor)],
      ['주문 배율', `×${d.spellMult.toFixed(2)}`], ['회복 배율', `×${d.healMult.toFixed(2)}`],
      ['HP 회복', `${d.hpRegen.toFixed(1)}/초`], ['MP 회복', `${d.mpRegen.toFixed(1)}/초`], ['이동 속도', d.moveSpeed.toFixed(1)],
      ['좋은 아이템 발견', `+${d.magicFind}%`],
    ].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
    const total = STATS.reduce((a, s) => a + st.apTotal[s], 0) || 1;
    const hist = STATS.map((s) => `<span style="color:${STAT_COLORS[s]}">${STAT_NAMES[s]} ${Math.round((st.apTotal[s] / total) * 100)}%</span>`).join(' · ');
    return `<div class="cols"><div>
        <h3>${esc(st.name)} — 각성 ${st.awakenings}회</h3>
        <div class="note">각성 EXP ${Math.floor(st.exp)} / ${need}. EXP가 다 차면 <b>성향 게이지 비율대로</b> 스탯 ${CONFIG.awakenPoints}점이 오른다.</div>
        ${rows}
        <div class="note" style="margin-top:6px">지금까지의 행동: ${hist}</div>
      </div><div>
        <h3>세부 능력치</h3><div class="kv">${kv}</div>
        <h3 style="margin-top:10px">무엇이 무엇을 키우나</h3>
        <div class="note">근접 무기로 공격 → 힘 (단검은 민첩)<br>석궁 사격 · 치명타 · 회피 → 민첩<br>공격 주문 · 완드/지팡이 → 지능<br>회복·보조 주문 · MP 소모 → 정신<br>피해를 받음 · 막기 · 위기에서 처치 → 체력<br>
        <span style="color:#ff9a6a">너무 약한 적은 성장에 도움이 되지 않는다. 자동 사냥은 성장 80%.</span></div>
      </div></div>`;
  }

  shop() {
    const st = this.w.st;
    const goods = Object.keys(BASES).filter((id) => BASES[id].shop);
    let list = '';
    for (const id of goods) {
      const b = BASES[id];
      const desc = b.dmg ? `피해 ${b.dmg[0]}~${b.dmg[1]} · ${WEAPON_CLASSES[b.cls].name}` : b.armor ? `방어력 ${b.armor}${b.block ? ` · 막기 ${b.block * 100}%` : ''}` : b.restore ? (b.restore.hp ? `HP ${b.restore.hp}` : `MP ${b.restore.mp}`) : '';
      const qty = b.stack ? [1, 5, 20] : [1];
      list += `<div class="row"><div class="sicon" style="background:#2a2218">${icon({ base: id })}</div><div class="grow"><b>${b.name}</b> <span class="note">${desc}</span></div>
        ${qty.map((q) => `<button class="btn" data-buy="${id}" data-q="${q}" ${st.gold < b.price * q ? 'disabled' : ''}>${q > 1 ? `×${q} ` : ''}${b.price * q}G</button>`).join('')}</div>`;
    }
    return `<div class="cols"><div><div class="note">상점은 <b>기본 장비</b>와 소모품만 판다. 좋은 장비와 스킬북은 사냥으로 얻는다. · ● ${st.gold.toLocaleString()} 골드</div>${list}</div>
      <div><h3>팔기</h3><div class="note">가방에서 아이템을 고르고 [판매]. </div>${this.inv().replace('<div class="cols">', '<div>')}</div></div>`;
  }

  menu() {
    const st = this.w.st;
    const t = Math.floor(st.playTime / 60);
    return `<div class="note">플레이 시간 ${Math.floor(t / 60)}시간 ${t % 60}분 · 각성 ${st.awakenings}회 · 배운 스킬 ${Object.keys(st.skills).length}개</div>
      <h3>자동 사냥</h3>
      <div class="row"><div class="grow">자동 물약 (HP가 이 아래로 내려가면)</div>${[0.3, 0.4, 0.5, 0.6].map((v) => `<button class="btn ${st.settings.autoPotion === v ? 'on' : ''}" data-pot="${v}">${v * 100}%</button>`).join('')}</div>
      <div class="row"><div class="grow">마을에서 물약 자동 구매 (체력 15 · 마나 8개까지)</div><button class="btn ${st.settings.autoBuy !== false ? 'on' : ''}" data-buy-auto="1">켜기</button><button class="btn ${st.settings.autoBuy === false ? 'on' : ''}" data-buy-auto="0">끄기</button></div>
      <div class="note">자동 사냥 중에는 EXP · 행동 기록 · 스킬 숙련 · 드랍 확률이 ${Math.round(CONFIG.autoPenalty * 100)}%로 줄어든다. 퀵슬롯 순서대로 스킬을 쓴다.</div>
      <h3>그래픽</h3>
      <div class="row"><div class="grow">그림자 (끄면 휴대폰에서 더 부드럽다)</div><button class="btn ${st.settings.shadows ? 'on' : ''}" data-shadow="1">켜기</button><button class="btn ${!st.settings.shadows ? 'on' : ''}" data-shadow="0">끄기</button></div>
      <div class="row"><div class="grow">전체 화면</div><button class="btn" data-full="1">전환</button></div>
      <h3>저장</h3>
      <div class="btns"><button class="btn" data-save="1">지금 저장</button><button class="btn" data-reset="1" style="color:#ff6a5a">캐릭터 삭제 (처음부터)</button></div>
      <div class="note" style="margin-top:8px">게임은 이 브라우저에 자동 저장된다 (${CONFIG.autosaveInterval}초마다).</div>`;
  }

  bind(body) {
    const w = this.w, st = w.st;
    body.querySelectorAll('[data-uid]').forEach((el) => {
      el.onclick = () => {
        const uid = Number(el.dataset.uid);
        if (this.sel?.from === 'inv' && this.sel.uid === uid) { w.useItem(uid); this.sel = null; }
        else this.sel = { from: 'inv', uid };
        this.render();
      };
    });
    body.querySelectorAll('[data-eq]').forEach((el) => {
      el.onclick = () => { if (st.equip[el.dataset.eq]) { this.sel = { from: 'equip', slot: el.dataset.eq }; this.render(); } };
    });
    body.querySelectorAll('[data-act]').forEach((el) => {
      el.onclick = () => {
        const a = el.dataset.act;
        if (a === 'use') { w.useItem(this.sel.uid); this.sel = null; }
        if (a === 'unequip') { w.unequip(this.sel.slot); this.sel = null; }
        if (a === 'drop') { w.dropItem(this.sel.uid); this.sel = null; }
        if (a === 'sell') {
          const i = st.inv.findIndex((x) => x.uid === this.sel.uid);
          if (i >= 0) { const it = st.inv.splice(i, 1)[0]; st.gold += itemValue(it); w.ui.toast(`${itemName(it)} 판매: +${itemValue(it)}G`); }
          this.sel = null;
          w.ui.dirty();
        }
        this.render();
      };
    });
    body.querySelectorAll('[data-skill]').forEach((el) => {
      el.onclick = () => { this.skillSel = this.skillSel === el.dataset.skill ? null : el.dataset.skill; this.render(); };
    });
    body.querySelectorAll('[data-qs]').forEach((el) => {
      el.onclick = () => {
        const i = Number(el.dataset.qs);
        const id = this.skillSel;
        const cur = st.quick.indexOf(id);
        if (cur >= 0) st.quick[cur] = null;
        if (i >= 0) st.quick[i] = id;
        w.ui.dirty();
        this.render();
      };
    });
    body.querySelectorAll('[data-buy]').forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.buy, q = Number(el.dataset.q), b = BASES[id];
        if (st.gold < b.price * q) return;
        const it = makeItem(id, { rarity: 'common', ilvl: 1, qty: q }, st);
        if (!addItem(st, it)) { w.ui.toast('가방이 가득 찼습니다'); return; }
        st.gold -= b.price * q;
        w.ui.toast(`${b.name}${q > 1 ? ` ×${q}` : ''} 구매`);
        w.ui.dirty();
        this.render();
      };
    });
    body.querySelectorAll('[data-pot]').forEach((el) => { el.onclick = () => { st.settings.autoPotion = Number(el.dataset.pot); this.render(); }; });
    body.querySelectorAll('[data-shadow]').forEach((el) => {
      el.onclick = () => {
        st.settings.shadows = el.dataset.shadow === '1';
        w.stage.renderer.shadowMap.enabled = st.settings.shadows;
        w.stage.sun.castShadow = st.settings.shadows;
        w.stage.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
        this.render();
      };
    });
    body.querySelectorAll('[data-buy-auto]').forEach((el) => { el.onclick = () => { st.settings.autoBuy = el.dataset.buyAuto === '1'; this.render(); }; });
    body.querySelectorAll('[data-full]').forEach((el) => { el.onclick = () => toggleFullscreen(); });
    body.querySelectorAll('[data-save]').forEach((el) => { el.onclick = () => { this.save(); w.ui.toast('저장했습니다'); }; });
    body.querySelectorAll('[data-reset]').forEach((el) => {
      el.onclick = () => {
        if (confirm('정말 캐릭터를 지우고 처음부터 시작할까요? 되돌릴 수 없습니다.')) {
          localStorage.removeItem('ashen-save');
          window.__noSave = true;
          location.reload();
        }
      };
    });
  }
}

function reqLine(req, stats) {
  if (!req) return '';
  const parts = Object.entries(req).map(([k, v]) => `<span class="${(stats[k] || 0) < v ? 'bad' : ''}">${STAT_NAMES[k]} ${v}</span>`);
  return `<div class="sub">요구: ${parts.join(', ')}</div>`;
}

export function toggleFullscreen() {
  const d = document;
  if (!d.fullscreenElement) {
    d.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  } else d.exitFullscreen?.();
}
