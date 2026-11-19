// 장면 도우미: 지역으로 옮기기 · 몬스터 무리 · 스킬 쓰기 · 죽지 않기
module.exports = (p) => ({
  goZone: (zi, dx = 0, dz = 0) => p.evaluate(async ([zi, dx, dz]) => {
    const { world: w } = window.__game; const { ZONES } = await import('/src/data/world.js'); const zn = ZONES[zi];
    const f = w.freeSpot(zn.x + dx, zn.z + dz, 1.5); w.player.pos.set(f.x, 0, f.z); w.moveTo = null; w.target = null;
    for (const m of w.monsters) { if (Math.hypot(m.pos.x - f.x, m.pos.z - f.z) < 14) { m.dead = true; w.stage.remove(m.actor); } } w.monsters = w.monsters.filter((m) => !m.dead);
    window.__god ||= setInterval(() => { const w = window.__game.world; w.st.hp = w.d.maxHp; w.st.mp = w.d.maxMp; }, 100);
    return [f.x, f.z];
  }, [zi, dx, dz]),
  pack: (zi, n = 8, opt = {}) => p.evaluate(async ([zi, n, opt]) => {
    const { world: w } = window.__game; const { ZONES } = await import('/src/data/world.js'); const zn = ZONES[zi], P = w.player.pos, out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3, d = (opt.r || 4) + (i % 3) * 0.8;
      const m = w.spawn({ zone: zn, x: P.x + Math.cos(a) * d, z: P.z + Math.sin(a) * d * 0.8, level: zn.levels[0], tier: opt.boss && i === 0 ? 'boss' : i % 4 === 3 ? 'elite' : 'normal', timer: 0, mon: null, forceType: opt.boss && i === 0 ? zn.boss?.type : undefined });
      if (m) { m.maxHp = m.hp = m.hp * 40; m.state = 'idle'; out.push(m); }
    }
    return out.length;
  }, [zi, n, opt]),
  cast: (ids, gap = 650) => p.evaluate(async ([ids, gap]) => {
    const w = window.__game.world;
    for (const id of ids) { w.cds = {}; w.target = w.nearestMonster(25) || w.target; if (w.target) w.useSkill(id, true); await new Promise((o) => setTimeout(o, gap)); }
  }, [ids, gap]),
  hideHud: (on) => p.evaluate((on) => { document.getElementById('hud').style.visibility = on ? 'hidden' : ''; }, on),
});
