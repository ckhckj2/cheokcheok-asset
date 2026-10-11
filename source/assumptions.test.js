'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('./assumptions'),I=require('./investment'),L=require('./progress'),Q=require('./quiz-progress');
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
const b=A.calculate(A.baseline);assert.equal(b.potential,60);assert.equal(b.loss,6);assert.equal(b.revenue,54);assert.equal(b.noi,44);assert.equal(b.annual,16);assert.equal(b.profit,96);assert.deepEqual(b.flows,[-330,16,16,394]);near(b.flows.reduce((s,v,t)=>s+v/(1+b.irr)**t,0),0);
const higher=A.calculate({rent:28000,vacancy:10,opex:10});near(higher.potential,67.2);near(higher.revenue,60.48);near(higher.noi,50.48);near(higher.annual,22.48);near(higher.profit,115.44);
const vacant=A.calculate({...A.baseline,vacancy:20});assert.equal(vacant.revenue,48);assert.equal(vacant.noi,38);assert.equal(vacant.annual,10);assert.equal(vacant.profit,78);
const expensive=A.calculate({...A.baseline,opex:15});assert.equal(expensive.annual,11);const bad=A.calculate({rent:10000,vacancy:40,opex:20});assert.ok(bad.annual<0);assert.ok(bad.profit<0);assert.ok(bad.irr<0);near(bad.flows.reduce((s,v,t)=>s+v/(1+bad.irr)**t,0),0);
for(const input of [{...A.baseline,rent:NaN},{...A.baseline,vacancy:41},{...A.baseline,opex:2},{...A.baseline,rent:'25000'}])assert.throws(()=>A.calculate(input));
function memory(seed=[]){const values=new Map(seed);let writes=0;return {getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes++;values.set(k,v);},get values(){return values;},get writes(){return writes;}};}
const reason='A와 입지와 준공 시점이 비슷해서 계약 조건을 참고해요.',reflection='실제 계약서와 비용 명세, 임차인 만기를 더 확인할게요.';
const rec={input:A.baseline,refs:['A'],reasons:{rent:reason,vacancy:reason,opex:reason},reflection};
const m=memory(),store=A.create(m);assert.equal(store.promote(false),false);assert.equal(m.writes,0);assert.equal(store.promote(true),true);assert.equal(A.create(m).state.promoted,true);assert.equal(store.add({...rec,refs:[]}),false);assert.equal(store.add({...rec,refs:['constructor']}),false);assert.equal(store.add({...rec,reasons:{...rec.reasons,rent:'짧음'}}),false);assert.equal(store.add(rec),true);
assert.equal(A.create(m).state.records.length,1);const writes=m.writes;store.sync();assert.equal(m.writes,writes);
const tab=A.create(m);tab.add({...rec,input:{...A.baseline,vacancy:20}});store.add({...rec,input:{...A.baseline,opex:15}});tab.sync();assert.equal(tab.state.records.length,3);
for(let n=0;n<25;n++)store.add(rec);assert.equal(store.state.records.length,20);
const corrupt=memory([[A.KEY,'{bad']]),broken=A.create(corrupt);assert.ok(broken.message);broken.add(rec);assert.equal(corrupt.values.get(A.KEY),'{bad');
const future=memory([[A.KEY,JSON.stringify({version:2,promoted:true,records:[]})]]);A.create(future).add(rec);assert.equal(JSON.parse(future.values.get(A.KEY)).version,2);
const quota=A.create({getItem:()=>null,setItem:()=>{throw Error('quota');}});quota.add(rec);assert.ok(quota.message);assert.equal(quota.state.records.length,1);
console.log('PASS: independent rent-unit conversion, vacancy loss, fixed operating cost, cash flows and IRR, invalid inputs, record validation, reload, history cap, non-writing merges, corrupt/future/blocked preservation');
function browser(seed=[]){
 const nodes=new Map(),handlers={},local=memory(seed),session=memory();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'학습',innerHTML:'',dataset:{},focus(){},replaceChildren(){},addEventListener(name,fn){handlers[id+':'+name]=fn;},setAttribute(){},getAttribute(){return 'false';},removeAttribute(){},classList:{toggle(){}},querySelector(){return node('child');}});return nodes.get(id);}
 const ctx={document:{title:'',getElementById:node,createElement:()=>node('new'),querySelectorAll:()=>[],querySelector:()=>node('heading')},location:{hash:'#assumptions'},history:{replaceState(){}},window:{localStorage:local,sessionStorage:{getItem:session.getItem,setItem:session.setItem,removeItem:k=>session.values.delete(k)},scrollTo(){},addEventListener(name,fn){handlers[name]=fn;}}};
 vm.createContext(ctx);vm.runInContext(['curriculum.js','easy.js','progress.js','review-mode.js','investment.js','assumptions.js','quiz-bank.js','quiz-progress.js','quiz-ui.js','investment-ui.js','assumptions-ui.js','app.js'].map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n'),ctx);
 const run=s=>vm.runInContext(s,ctx),click=action=>handlers['view-assumptions:click']({target:{closest(){return {disabled:false,dataset:{assumptionAction:action}};}}});
 const submit=(id,values,refs=['A'])=>handlers['view-assumptions:submit']({preventDefault(){},target:{id,elements:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{value:String(v)}])),querySelectorAll:()=>refs.map(value=>({value}))}});
 return {ctx,local,handlers,node,run,click,submit};
}
const form={...A.baseline,rentReason:reason,vacancyReason:reason,opexReason:reason};
const review=browser(),before=JSON.stringify([...review.local.values]);assert.equal(review.run('assumptionsOpen()'),false);review.click('start');assert.equal(review.run('assumptionsSession'),null);
review.handlers['adminToggle:click']();assert.equal(review.run('assumptionsOpen()'),true);review.click('promote');assert.equal(review.run('assumptionsProgress.state.promoted'),false);review.click('start');
review.submit('assumptionsForm',form,[]);assert.equal(review.run('assumptionsSession.result'),null);assert.ok(review.node('assumptionsError').textContent);
review.submit('assumptionsForm',{...form,vacancy:''});assert.equal(review.run('assumptionsSession.result'),null);
review.submit('assumptionsForm',form,['A','D']);assert.equal(review.run('assumptionsSession.result.profit'),96);assert.ok(review.node('view-assumptions').innerHTML.includes('네 줄로 정리'));assert.ok(review.node('view-assumptions').innerHTML.includes('D는 용도'));
review.submit('assumptionsReflection',{reflection});assert.equal(review.run('reviewAssumptionsProgress.state.records.length'),1);assert.equal(review.run('assumptionsProgress.state.records.length'),0);assert.equal(JSON.stringify([...review.local.values]),before);
review.handlers['adminExit:click']();assert.equal(review.run('assumptionsOpen()'),false);assert.equal(review.run('assumptionsSession'),null);assert.equal(JSON.stringify([...review.local.values]),before);
const lessons=vm.runInNewContext(fs.readFileSync(__dirname+'/curriculum.js','utf8')+'\ncurriculum'),all=lessons.map(l=>l.id),questions=require('./quiz-bank');questions.forEach(q=>q.lessonId=lessons[q.lesson-1].id);
const seed=memory();seed.setItem(L.KEY,JSON.stringify({version:1,completed:all,positions:Object.fromEntries(all.map(id=>[id,3])),resume:{},last:all[19]}));const qp=Q.create(seed,questions);qp.submit('final',Object.fromEntries(questions.filter(q=>q.quizId==='final').map(q=>[q.id,q.answer])),all);qp.promote(all);
const deputy=browser([...seed.values]);assert.equal(deputy.run('managerEligible()'),false);deputy.click('promote');assert.equal(deputy.run('managerEarned()'),false);
I.create(seed).add({input:I.baseline,decision:'hold',reason,reflection});const normal=browser([...seed.values]),legacy=JSON.stringify([normal.local.values.get(L.KEY),normal.local.values.get(Q.KEY),normal.local.values.get(I.KEY)]);
assert.equal(normal.run('managerEligible()'),true);assert.equal(normal.run('assumptionsOpen()'),false);normal.click('promote');assert.equal(normal.run('managerEarned()'),true);assert.equal(normal.node('currentLevel').textContent,'LV.3 · 과장');
const markup='<img src=x onerror=alert(1)> 자료를 다시 확인해요.';normal.submit('assumptionsForm',{...form,rent:28000,rentReason:markup});assert.ok(normal.node('view-assumptions').innerHTML.includes('&lt;img'));assert.ok(!normal.node('view-assumptions').innerHTML.includes('<img src=x'));near(normal.run('assumptionsSession.result.profit'),115.44);
normal.handlers.storage({key:A.KEY});assert.equal(normal.run('assumptionsSession.input.rent'),28000);const beforeSave=normal.local.writes;normal.submit('assumptionsReflection',{reflection:markup});assert.equal(normal.local.writes,beforeSave+1);normal.submit('assumptionsReflection',{reflection});assert.equal(normal.local.writes,beforeSave+1);
assert.equal(JSON.stringify([normal.local.values.get(L.KEY),normal.local.values.get(Q.KEY),normal.local.values.get(I.KEY)]),legacy);normal.click('hub');assert.ok(normal.node('view-assumptions').innerHTML.includes('&lt;img'));const restored=browser([...normal.local.values]);assert.equal(restored.run('managerEarned()'),true);assert.equal(restored.run('assumptionsProgress.state.records.length'),1);
console.log('PASS: real UI normal/admin gates, explicit promotion, invalid/blank form inputs, comparison and summary, isolated review saves, exit, escaped user text, duplicate guard, storage refresh, reload and unchanged previous learning/quiz/investment records');
