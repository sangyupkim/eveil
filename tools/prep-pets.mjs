// 펫 그림: Quaternius 동물 묶음(CC0)의 3D 개 · 고양이를 8방향으로 찍어 enemies.json에 넣는다
// node tools/prep-pets.mjs  (개발 서버 node tools/serve.mjs 가 켜져 있어야 한다)
import fs from 'node:fs';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), sharp = req('sharp');
const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.goto('http://localhost:5173/tools/extra/pets/render.html'); await p.waitForFunction(() => window.ready);
const J = 'assets/flare/enemies.json', E = JSON.parse(fs.readFileSync(J, 'utf8'));
for (const [key, name, pre, pal] of [['pet_dog', 'Dog', 'DogArmature', { Dog: 0xa8784a }], ['pet_cat', 'Cat', 'CatArmature', { Grey: 0xb07a40, White: 0xe8dccc, Pink: 0xe08a98 }]]) {
  await p.evaluate(([pal, yaw]) => { window.PAL = pal; window.YAW = yaw; }, [pal, Number(process.env.YAW ?? Math.PI / 2)]);
  const r = await p.evaluate(([name, pre]) => window.sheet(name, [['stance', pre + '|Idle', 6, 900, 'looped'], ['run', pre + '|Walking', 8, 500, 'looped']]), [name, pre]);
  const buf = Buffer.from(r.png.split(',')[1], 'base64');
  await sharp(buf).webp({ quality: 82, alphaQuality: 90 }).toFile(`assets/flare/enemies/${key}.webp`);
  const d = r.def; d.images = { default: `enemies/${key}.webp` };
  for (const a of ['swing', 'hit', 'die', 'critdie', 'block', 'cast', 'shoot']) d.anims[a] = d.anims.stance;
  E[key] = d;
  console.log(key, Object.keys(d.anims).join(','));
}
fs.writeFileSync(J, JSON.stringify(E));
await b.close();
