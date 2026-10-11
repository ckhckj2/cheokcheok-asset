'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const I=require('./investment'),L=require('./progress'),Q=require('./quiz-progress');
const lessons=vm.runInNewContext(fs.readFileSync(__dirname+'/curriculum.js','utf8')+'\ncurriculum');
const questions=require('./quiz-bank');questions.forEach(q=>q.lessonId=lessons[q.lesson-1].id);
const base=I.calculate(I.baseline);
assert.equal(base.equity,330);assert.equal(base.noi,50);assert.equal(base.interest,28);assert.equal(base.annual,22);assert.equal(base.netSale,378);assert.equal(base.profit,114);assert.deepEqual(base.flows,[-330,22,22,400]);
assert.ok(Math.abs(base.flows.reduce((n,v,t)=>n+v/(1+base.irr)**t,0))<1e-8);
assert.ok(Math.abs(I.irr([-100,121])-.21)<1e-8);assert.ok(Math.abs(I.irr([-100,0,121])-.1)<1e-8);assert.equal(I.irr([-100,0,0]),null);assert.equal(I.irr([-100,230,-132]),null);assert.ok(Number.isFinite(I.irr([-100,-20,150])));
const low=I.calculate({...I.baseline,ltv:50});assert.equal(low.equity,530);assert.equal(low.annual,30);assert.equal(low.profit,138);assert.ok(low.irr<base.irr);
const improve=I.calculate({...I.baseline,operation:'improve'});assert.equal(improve.equity,350);assert.equal(improve.annual,27);assert.equal(improve.profit,109);
const loss=I.calculate({...I.baseline,rate:12,sale:500});assert.equal(loss.annual,-34);assert.equal(loss.netSale,-210);assert.equal(loss.irr,null);assert.equal(loss.profit,-642);assert.ok(loss.warnings.length>=3);
assert.throws(()=>I.calculate({...I.baseline,price:NaN}));assert.throws(()=>I.calculate({...I.baseline,operation:'constructor'}));assert.throws(()=>I.calculate({...I.baseline,ltv:99}));assert.throws(()=>I.calculate({...I.baseline,years:4}));
function memory(seed=[]){const values=new Map(seed);let writes=0;return {getItem:k=>values.get(k)??null,setItem:(k,v)=>{writes++;values.set(k,v);},get values(){return values;},get writes(){return writes;}};}
const m=memory(),store=I.create(m),record={input:I.baseline,decision:'hold',reason:'매각가격과 임대수입의 근거를 더 확인해야 해요.',reflection:'이자 후 현금만으로 만기 위험을 판단하면 안 돼요.'};
assert.equal(store.add({...record,reflection:'짧음'}),false);assert.equal(store.add(record),true);assert.equal(I.create(m).records.length,1);
const old=m.writes;store.sync();assert.equal(m.writes,old);
const a=I.create(m),b=I.create(m);a.add({...record,input:{...I.baseline,ltv:50}});b.add({...record,input:{...I.baseline,sale:900}});a.sync();assert.equal(a.records.length,3);
for(let n=0;n<25;n++)store.add(record);assert.equal(store.records.length,20);
const corrupt=memory([[I.KEY,'{bad']]),broken=I.create(corrupt);assert.ok(broken.message);broken.add(record);assert.equal(corrupt.values.get(I.KEY),'{bad');
const blocked=I.create({getItem:()=>null,setItem:()=>{throw Error('quota');}});assert.equal(blocked.add(record),true);assert.ok(blocked.message);
console.log('PASS: independent cash-flow/IRR expectations, leverage/cost comparison, loss and invalid inputs, records, reload, capped history, corrupt/blocked storage and shared-tab merge');
function browser(seed=[]){
 const nodes=new Map(),handlers={},local=memory(seed),session=memory();
 function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'학습',innerHTML:'',dataset:{},focus(){},replaceChildren(){},addEventListener(name,fn){handlers[id+':'+name]=fn;},setAttribute(){},getAttribute(){return 'false';},removeAttribute(){},classList:{toggle(){}},querySelector(){return node('child');}});return nodes.get(id);}
 const ctx={document:{title:'',getElementById:node,createElement:()=>node('new'),querySelectorAll:()=>[],querySelector:()=>node('heading')},location:{hash:'#invest'},history:{replaceState(){}},window:{localStorage:local,sessionStorage:{getItem:session.getItem,setItem:session.setItem,removeItem:k=>session.values.delete(k)},scrollTo(){},addEventListener(name,fn){handlers[name]=fn;}}};
 vm.createContext(ctx);vm.runInContext(['curriculum.js','easy.js','progress.js','review-mode.js','investment.js','assumptions.js','quiz-bank.js','quiz-progress.js','quiz-ui.js','investment-ui.js','assumptions-ui.js','app.js'].map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n'),ctx);
 const run=s=>vm.runInContext(s,ctx),click=(id,key,action)=>handlers[id+':click']({target:{closest(){return {disabled:false,dataset:{[key]:action}};}}});
 const submit=(id,formId,values)=>handlers[id+':submit']({preventDefault(){},target:{id:formId,elements:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{value:String(v)}]))}});
 return {ctx,local,session,handlers,node,run,click,submit};
}
const review=browser();assert.ok(review.node('view-invest').innerHTML.includes('대리 승급 후 시작'));assert.equal(review.run('investOpen()'),false);
const realBefore=JSON.stringify([...review.local.values]);review.handlers['adminToggle:click']();assert.equal(review.run('ReviewMode.enabled'),true);assert.ok(review.node('view-invest').innerHTML.includes('조건 정하고 연습하기'));
// All content is accessible without filling or writing earned progress.
review.ctx.location.hash='#learn/practice-review';review.handlers.hashchange();assert.equal(review.run('activeLesson.number'),20);
for(let n=0;n<3;n++)review.click('view-learn','action','next');assert.equal(review.run('activeStep'),3);review.click('view-learn','action','complete');assert.equal(review.run('progress.state.completed.length'),0);
review.ctx.location.hash='#quiz/final';review.handlers.hashchange();assert.equal(review.run('quizSession.questions.length'),10);
for(let n=0;n<10;n++){const choice=review.run('quizSession.questions[quizSession.step].answer');review.handlers['view-quiz:change']({target:{name:'choice',value:String(choice)}});review.handlers['view-quiz:submit']({preventDefault(){}});}
assert.equal(review.run('quizSession.result.correct'),10);assert.equal(review.run('earnedQuizProgress.state.results.final'),undefined);
review.click('view-quiz','quizAction','promote');assert.equal(review.run('earnedQuizProgress.level(progress.state.completed)'),1);
review.ctx.location.hash='#invest';review.handlers.hashchange();review.click('view-invest','investAction','start');
review.submit('view-invest','investmentForm',{...I.baseline,decision:'hold',reason:record.reason});assert.equal(review.run('investmentSession.result.profit'),114);
review.submit('view-invest','investmentReflection',{reflection:record.reflection});assert.equal(review.run('reviewInvestmentProgress.records.length'),1);assert.equal(review.run('investmentProgress.records.length'),0);
assert.equal(JSON.stringify([...review.local.values]),realBefore);const beforeRefresh=review.local.writes;review.handlers.storage({key:I.KEY});assert.equal(review.local.writes,beforeRefresh);
review.handlers['adminExit:click']();assert.equal(review.run('ReviewMode.enabled'),false);assert.equal(review.run('investOpen()'),false);assert.equal(JSON.stringify([...review.local.values]),realBefore);
assert.equal(review.session.values.get('cheokcheok.asset.review.v1'),undefined);
console.log('PASS: real app review entry, all 20 lessons and final quiz unlocked, no earned progress/score/promotion/investment writes, review record separation and exit restores normal gates');
// An earned deputy can save a real practice; validation and duplicate-submit guard run through UI.
const passed=memory();const qp=Q.create(passed,questions),all=lessons.map(l=>l.id);qp.submit('final',Object.fromEntries(questions.filter(q=>q.quizId==='final').map(q=>[q.id,q.answer])),all);qp.promote(all);
passed.setItem(L.KEY,JSON.stringify({version:1,completed:all,positions:Object.fromEntries(all.map(id=>[id,3])),resume:{},last:all[19]}));
const normal=browser([...passed.values]);assert.equal(normal.run('investOpen()'),true);const learningBefore=normal.local.values.get(L.KEY),quizBefore=normal.local.values.get(Q.KEY);
normal.click('view-invest','investAction','start');normal.submit('view-invest','investmentForm',{...I.baseline,price:-1,decision:'hold',reason:record.reason});assert.equal(normal.run('investmentSession.result'),null);assert.ok(normal.node('investmentError').textContent);
normal.submit('view-invest','investmentForm',{...I.baseline,ltv:50,decision:'hold',reason:record.reason});assert.equal(normal.run('investmentSession.result.profit'),138);assert.ok(normal.node('view-invest').innerHTML.includes('숫자를 말로 풀어보면'));assert.ok(normal.node('view-invest').innerHTML.includes('530억'));
normal.submit('view-invest','investmentReflection',{reflection:record.reflection});assert.equal(normal.run('investmentProgress.records.length'),1);const savedWrites=normal.local.writes;normal.submit('view-invest','investmentReflection',{reflection:record.reflection});assert.equal(normal.local.writes,savedWrites);
assert.equal(normal.local.values.get(L.KEY),learningBefore);assert.equal(normal.local.values.get(Q.KEY),quizBefore);assert.equal(I.create(normal.local).records[0].input.ltv,50);
console.log('PASS: earned deputy gate, actual form validation, changed conditions, real record save/reload, duplicate submission guard and existing learning/quiz data preserved');
normal.click('view-invest','investAction','start');const markup='<img src=x onerror=alert(1)> 내용을 확인합니다.';
normal.submit('view-invest','investmentForm',{...I.baseline,decision:'hold',reason:markup});assert.ok(normal.node('view-invest').innerHTML.includes('&lt;img'));assert.ok(!normal.node('view-invest').innerHTML.includes('<img src=x'));
normal.submit('view-invest','investmentReflection',{reflection:markup});normal.click('view-invest','investAction','hub');assert.ok(normal.node('view-invest').innerHTML.includes('&lt;img'));assert.ok(!normal.node('view-invest').innerHTML.includes('<img src=x'));
console.log('PASS: user-entered judgment and reflection are escaped in results and stored-record display');
