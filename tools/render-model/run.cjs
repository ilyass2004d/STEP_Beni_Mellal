const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); p.on('console', m => console.log('page:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8765/index.html');
  await p.waitForFunction(() => window.setup);
  const W = +(process.env.W || 2400), H = Math.round(W * 770.64 / 579.4);
  console.log('parts', await p.evaluate(([w, h]) => setup(w, h), [W, H]), W, H);
  const save = (n, u) => fs.writeFileSync(n, Buffer.from(u.split(',')[1], 'base64'));
  save('out_beauty.png', await p.evaluate(() => beauty())); fs.writeFileSync('mats.json', JSON.stringify(await p.evaluate(() => window._mats), null, 1)); if (process.env.ONLY) { await b.close(); return; }
  const masks = { Pretraitement:['Pretraitement'], Bassin_de_sechage:['Bassin_de_sechage'], Bassins_decantation:['Bassins_decantation'], Fosse_vannes_LB:['Fosse_vannes_LB'], Lits_bacteriens:['Lits_bacteriens'], Clarificateurs:['Clarificateurs'], Station_pompage:['Station_pompage'], Filtration_coagulation:['Filtration_coagulation'], Zone_UV_dalle_basse:['Zone_UV_dalle_basse'], Eau_sale_lavage:['Eau_sale_lavage'], Centre_de_controle:['Centre_de_controle'], Chambre_des_pompes:['Chambre_des_pompes'], Cuves_blanches:['Cuves_blanches'], Batiments:['Batiments_terracotta','Batiment_bloc_1','Batiment_bloc_2','Batiment_bloc_3'], Lagunes:['Lagunes'], Enceinte:['Enceinte'] };
  fs.mkdirSync('masks', { recursive: true });
  for (const [k, ids] of Object.entries(masks)) save(`masks/${k}.png`, await p.evaluate(i => mask(i), ids));
  await b.close();
})();
