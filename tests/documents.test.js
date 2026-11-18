const test=require('node:test');const assert=require('node:assert/strict');
const M=require('../model.js');const X=require('../materials.js');const D=require('../documents.js');

test('onderdelenlijst: elk stuk precies één keer, unieke ID en oplopende codes, gelijk aan het zaagplan',()=>{
 const p=M.demoProject();p.beams.push({id:'v1',name:'Extra ligger',axis:'x',x:0,y:300,z:0,length:900,profile:'70x70'});
 const rows=D.partsList(p,M),plan=M.boardPlan(p);
 assert.equal(rows.length,plan.pieces);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 assert.equal(rows[0].code,'D-001');assert.equal(rows.at(-1).code,'D-'+String(rows.length).padStart(3,'0'));
 assert.equal(rows.reduce((s,r)=>s+r.length,0),plan.totalLength);
 const free=rows.find(r=>r.id==='v1');assert.equal(free.status,'vrij onderdeel');assert.equal(free.profile,'70x70');
 assert.match(rows[0].place,/Staander 1/);
});
test('status volgt frame-overrides en wordt na herstel weer automatisch',()=>{
 const p=M.demoProject(),id=M.framePieces(p)[0].id;M.editFrameBeam(p,id,{length:700});
 assert.equal(D.partsList(p,M).find(r=>r.id===id).status,'handmatig aangepast');
 M.restoreFrameBeam(p,id);assert.equal(D.partsList(p,M).find(r=>r.id===id).status,'automatisch');
 M.editFrameBeam(p,id,{disabled:true});assert.equal(D.partsList(p,M).find(r=>r.id===id),undefined);
});
test('CSV: BOM, puntkomma, juiste rijen en bescherming tegen formule-injectie',()=>{
 const p=M.demoProject();p.beams.push({id:'x1',name:'=HYPERLINK("http://x")',axis:'x',x:0,y:0,z:0,length:500});
 const rows=D.partsList(p,M),csv=D.partsCSV(rows),lines=csv.split('\r\n');
 assert.ok(csv.startsWith('﻿"Code";'));assert.equal(lines.length,rows.length+1);
 assert.ok(lines.every(l=>!/;"=/.test(l)),'geen cel mag met = beginnen');assert.match(csv,/"'=HYPERLINK/);
});
test('tekeningen: geldige SVG met alle balken, juiste maatlijnen en viewBox',()=>{
 const p=M.demoProject();
 for(const view of ['front','side','top']){
  const svg=D.drawingSVG(p,M,view);
  assert.match(svg,/^<svg [^>]*viewBox="0 0 800 \d+"/);
  assert.equal((svg.match(/class="bm/g)||[]).length,M.allBeams(p).length,view);
  assert.ok(svg.includes('class="ct"'));
 }
 assert.ok(D.drawingSVG(p,M,'front').includes('1.875 mm'));assert.ok(D.drawingSVG(p,M,'front').includes('950 mm'));
 assert.ok(D.drawingSVG(p,M,'side').includes('870 mm'));assert.ok(D.drawingSVG(p,M,'top').includes('1.875 mm'));
 assert.ok(D.drawingSVG(p,M,'front').includes('>520<')&&D.drawingSVG(p,M,'front').includes('>600<')&&D.drawingSVG(p,M,'front').includes('>555<'));
 assert.throws(()=>D.drawingSVG(p,M,'schuin'));
});
test('tekeningen: balken blijven binnen het tekenvlak en namen worden ontsnapt',()=>{
 const p=M.freeProject();p.name='<script>alert(1)</script>';p.beams.push({id:'a"b',name:'x',axis:'x',x:0,y:0,z:0,length:1000});
 const svg=D.drawingSVG(p,M,'front');assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('data-id="a&quot;b"'));
 const vb=+/viewBox="0 0 800 (\d+)"/.exec(svg)[1];
 for(const m of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)){const [x,y,w,h]=m.slice(1).map(Number);assert.ok(x>=0&&x+w<=800&&y>=0&&y+h<=vb);}
});
test('bouwdocument bevat tekeningen, onderdelen, zaagplan, materiaallijst, controlepunten en het label ontwerpraming',()=>{
 const p=M.demoProject();p.name='A & B <test>';
 const html=D.documentHTML(p,M,X,{date:'18-11-2026',version:'1.0.0-rc1'});
 for(const s of ['ONTWERPRAMING','18-11-2026','1.0.0-rc1','MAATTEKENINGEN','ONDERDELENLIJST (28 STUKS)','ZAAGPLAN','MATERIAALLIJST','CONTROLEPUNTEN','A &amp; B &lt;test&gt;'])assert.ok(html.includes(s),s);
 assert.equal((html.match(/<svg /g)||[]).length,3);assert.ok(!html.includes('A & B <test>'));
 assert.ok(D.documentHTML(p,M,null).includes('ONDERDELENLIJST'),'werkt ook zonder materials.js');
});
