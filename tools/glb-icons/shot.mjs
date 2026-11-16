import { createRequire } from 'module'; import fs from 'fs'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
const D = process.argv[2]; const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader'] }); const p = await b.newPage();
p.on('pageerror', (e) => console.log('ERR', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('C', m.text()); });
await p.goto('http://localhost:5199/index.html'); await p.waitForFunction(() => window.ready);
fs.mkdirSync(D + '/out', { recursive: true });
for (const f of fs.readdirSync(D).filter((x) => x.endsWith('.glb'))) { const fl = (process.env.FLIP || '').split(',').includes(f.replace('_low.glb', '')); const u = await p.evaluate(([f, fl]) => window.shot(f, fl), [f, fl]); fs.writeFileSync(`${D}/out/${f.replace('_low.glb', '.png')}`, Buffer.from(u.split(',')[1], 'base64')); }
await b.close();
