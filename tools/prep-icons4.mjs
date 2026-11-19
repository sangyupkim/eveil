// 넷째 아이콘 묶음 icons4.webp (2000번부터, v0.49.24): 드라이브 아이콘 묶음(assets/drive)을 하나로 합친다
// 주문 2000~ · 흑마법 2144~ · 불꽃 2200~ · 보물 2272~ · 두루마리 2296~ · 화살 묶음 2351  (번호는 src/ui/icons.js sheetOf · src/data/flareWorld.js 끝)
import sharp from 'sharp';
const parts = [['spell_icons', 140, 0], ['warlock_icons', 50, 144], ['fire_icons', 70, 200], ['loot_icons', 20, 272], ['scroll_icons', 55, 296], ['quiver_icon', 1, 351]]; // 화살 묶음(2351): Flare 화살 그림 셋 + 허리띠를 합친 것
const comp = [];
for (const [f, n, off] of parts) {
  for (let i = 0; i < n; i++) {
    const c = await sharp(`assets/drive/${f}.webp`).extract({ left: (i % 8) * 64, top: Math.floor(i / 8) * 64, width: 64, height: 64 }).png().toBuffer();
    const k = off + i;
    comp.push({ input: c, left: (k % 8) * 64, top: Math.floor(k / 8) * 64 });
  }
}
await sharp({ create: { width: 512, height: 44 * 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comp).webp({ quality: 88 }).toFile('assets/flare/icons4.webp');
console.log('icons4.webp');
