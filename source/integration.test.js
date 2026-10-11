'use strict';
// Cross-module journeys and regressions found during stage 7.
// These use the app's event handlers with isolated storage, never a user's records.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const I = require('./investment');
const A = require('./assumptions');
const S = require('./scenarios');
const Q = require('./quiz-progress');
const reason = '임대수입과 이자 부담을 비교해서 투자 여부를 판단해요.';
const reflection = '추가 자금과 실제 임대 계약을 확인한 뒤 다시 판단해요.';
const investmentRecord = {input:I.baseline, decision:'hold', reason, reflection};
const assumptionRecord = {input:A.baseline, refs:['A'], reasons:{rent:reason,vacancy:reason,opex:reason}, reflection};
const scenarioRecord = {baseInput:A.baseline, scenarios:S.defaults(A.baseline), strategy:'maintain', decision:'hold', reason, reflection};

function memory(seed=[]) {
  const values = new Map(seed);
  let writes = 0;
  return {values, get writes(){return writes;}, getItem:k=>values.get(k)??null,
    setItem(k,v){writes++;values.set(k,v);}};
}
function browser(seed=[]) {
  const nodes = new Map(), handlers = {}, local = memory(seed), session = memory();
  let focused = null;
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, {
      textContent:'학습', innerHTML:'', dataset:{},
      focus(){focused=id;}, replaceChildren(){},
      addEventListener(name,fn){handlers[id+':'+name]=fn;},
      setAttribute(){}, getAttribute(){return 'false';}, removeAttribute(){},
      classList:{toggle(){}}, querySelector(){return node('child');}
    });
    return nodes.get(id);
  }
  const ctx = {
    document:{title:'',getElementById:node,createElement:()=>node('new'),querySelectorAll:()=>[],querySelector:selector=>node(selector)},
    location:{hash:'#home'},history:{replaceState(_a,_b,url){ctx.location.hash=url;}},
    window:{localStorage:local,sessionStorage:{...session,removeItem:k=>session.values.delete(k)},scrollTo(){},addEventListener(name,fn){handlers[name]=fn;}}
  };
  vm.createContext(ctx);
  const bundle = ['curriculum.js','easy.js','progress.js','review-mode.js','investment.js','assumptions.js','scenarios.js','quiz-bank.js','quiz-progress.js','quiz-ui.js','investment-ui.js','assumptions-ui.js','scenarios-ui.js','app.js'];
  vm.runInContext(bundle.map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n'),ctx);
  const run = code=>vm.runInContext(code,ctx);
  const go = hash=>{ctx.location.hash=hash;handlers.hashchange();};
  const click = (id,key,value)=>handlers[id+':click']({target:{closest:()=>({disabled:false,dataset:{[key]:value}})}});
  const submit = (view,id,values,refs=[])=>handlers[view+':submit']({preventDefault(){},target:{id,
    elements:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,{value:String(v)}])),
    querySelectorAll:()=>refs.map(value=>({value}))}});
  return {ctx,local,node,handlers,run,go,click,submit,get focused(){return focused;}};
}

test('partially damaged practice records are preserved byte for byte',()=>{
  for (const [model,record] of [[I,investmentRecord],[A,assumptionRecord],[S,scenarioRecord]]) {
    const initial = memory(); model.create(initial).add(record);
    const raw = JSON.parse(initial.values.get(model.KEY));
    raw.records.push({...raw.records[0],id:'damaged',reflection:42});
    const original = JSON.stringify(raw), storage = memory([[model.KEY,original]]);
    const store = model.create(storage);
    assert.ok(store.message, model.KEY+' must report damaged records');
    assert.equal(store.add(record),true);
    assert.equal(storage.values.get(model.KEY),original);
    assert.equal(storage.writes,0);
    // Damage appearing after a successful read must also stop subsequent writes.
    const later = memory([...initial.values]), active = model.create(later);
    later.values.set(model.KEY,original);
    active.add(record);
    assert.equal(later.values.get(model.KEY),original);
    assert.equal(later.writes,0);
  }
});

test('damaged known quiz responses do not silently disappear on the next attempt',()=>{
  const questions = require('./quiz-bank').map(q=>({...q,lessonId:'lesson-'+q.lesson}));
  const completed = Array.from({length:20},(_,n)=>'lesson-'+(n+1));
  const answers = Object.fromEntries(questions.filter(q=>q.quizId==='final').map(q=>[q.id,q.answer]));
  const storage = memory(), store = Q.create(storage,questions);
  store.submit('final',answers,completed);
  const raw = JSON.parse(storage.values.get(Q.KEY));
  raw.responses['exam-1'].choice=999;
  const original=JSON.stringify(raw), corrupt=memory([[Q.KEY,original]]), recovered=Q.create(corrupt,questions);
  assert.ok(recovered.message);
  recovered.submit('final',answers,completed);
  assert.equal(corrupt.values.get(Q.KEY),original);
  assert.equal(corrupt.writes,0);
});

test('zero operating cash is distinguished from a shortfall',()=>{
  const zero=I.calculate({...I.baseline,ltv:50,rate:10});
  assert.equal(zero.annual,0);
  assert.ok(zero.warnings.some(w=>w.includes('여유 현금')));
  assert.ok(!zero.warnings.some(w=>w.includes('이자를 모두 내지 못')));
  const app=browser();app.handlers['adminToggle:click']();app.go('#assumptions');
  app.click('view-assumptions','assumptionAction','start');
  app.submit('view-assumptions','assumptionsForm',{rent:25000,vacancy:20,opex:20,rentReason:reason,vacancyReason:reason,opexReason:reason},['A']);
  assert.equal(app.run('assumptionsSession.result.annual'),0);
  assert.ok(app.node('view-assumptions').innerHTML.includes('여유 현금'));
  assert.ok(!app.node('view-assumptions').innerHTML.includes('이자를 모두 내지 못'));
});

test('skip link keeps the route and storage notifications keep the reading position',()=>{
  const app=browser();app.handlers['adminToggle:click']();app.go('#learn/basics-equity');
  app.click('view-learn','action','next');app.click('view-learn','action','next');
  assert.equal(app.run('activeStep'),2);
  const before=app.local.writes;
  app.handlers.storage({key:S.KEY});
  assert.equal(app.run('activeStep'),2);
  assert.equal(app.local.writes,before);
  let prevented=false;
  assert.ok(app.handlers['skipContent:click']);
  app.handlers['skipContent:click']({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(app.ctx.location.hash,'#learn/basics-equity');
  assert.equal(app.focused,'.view.active h1');
});

test('fresh learner completes all lessons, then explicitly earns levels 2, 3 and 4',()=>{
  let app=browser();
  assert.equal(app.run('investOpen()'),false);
  assert.equal(app.run('assumptionsOpen()'),false);
  assert.equal(app.run('scenariosOpen()'),false);
  const ids=app.run('curriculum.map(l=>l.id)');
  for (let index=0;index<ids.length;index++) {
    app.go('#learn/'+ids[index]);
    for(let n=0;n<3;n++)app.click('view-learn','action','next');
    app.click('view-learn','action','complete');
    assert.equal(app.run('progress.state.completed.length'),index+1);
    // Reload midway verifies persisted sequential state rather than seeding completion.
    if(index===9)app=browser([...app.local.values]);
  }
  assert.equal(app.run('investOpen()'),false);
  app.go('#quiz/final');
  for(let n=0;n<10;n++) {
    const correct=app.run('quizSession.questions[quizSession.step].answer');
    app.handlers['view-quiz:change']({target:{name:'choice',value:String(correct)}});
    app.handlers['view-quiz:submit']({preventDefault(){}});
  }
  assert.equal(app.run('quizSession.result.correct'),10);
  assert.equal(app.run('investOpen()'),false);
  app.click('view-quiz','quizAction','promote');
  assert.equal(app.node('currentLevel').textContent,'LV.2 · 대리');
  app.go('#invest');app.click('view-invest','investAction','start');
  app.submit('view-invest','investmentForm',{...I.baseline,sale:'',decision:'hold',reason});
  assert.equal(app.run('investmentSession.result'),null);
  app.submit('view-invest','investmentForm',{...I.baseline,decision:'hold',reason});
  assert.equal(app.run('investmentSession.result.profit'),114);
  app.submit('view-invest','investmentReflection',{reflection});
  assert.equal(app.run('assumptionsOpen()'),false);
  app.go('#assumptions');app.click('view-assumptions','assumptionAction','promote');
  assert.equal(app.node('currentLevel').textContent,'LV.3 · 과장');
  app.submit('view-assumptions','assumptionsForm',{...A.baseline,rentReason:reason,vacancyReason:reason,opexReason:reason},['A']);
  assert.equal(app.run('assumptionsSession.result.profit'),96);
  app.submit('view-assumptions','assumptionsReflection',{reflection});
  assert.equal(app.run('scenariosOpen()'),false);
  app.go('#scenarios');app.click('view-scenarios','scenarioAction','promote');
  assert.equal(app.node('currentLevel').textContent,'LV.4 · 팀장');
  const fields=Object.fromEntries(S.defaults(A.baseline).flatMap(s=>Object.entries(s).filter(([k])=>k!=='id').map(([k,v])=>[s.id+'_'+k,v])));
  app.submit('view-scenarios','scenariosForm',{...fields,strategy:'maintain',decision:'hold',reason});
  assert.equal(app.run('scenariosSession.results[1].profit'),96);
  app.submit('view-scenarios','scenariosReflection',{reflection});
  const records=[...app.local.values];
  app=browser(records);
  assert.equal(app.node('currentLevel').textContent,'LV.4 · 팀장');
  assert.equal(app.run('scenariosProgress.state.records.length'),1);
  app.go('#learn/'+ids[0]);app.click('view-learn','action','next');
  const writes=app.local.writes;
  app.handlers.storage({key:S.KEY});
  assert.equal(app.run('activeStep'),1);
  assert.equal(app.local.writes,writes);
  const actual=JSON.stringify([...app.local.values]);
  app.handlers['adminToggle:click']();app.go('#invest');app.click('view-invest','investAction','start');
  app.submit('view-invest','investmentForm',{...I.baseline,decision:'hold',reason});
  app.submit('view-invest','investmentReflection',{reflection});
  app.handlers['adminExit:click']();
  assert.equal(app.node('currentLevel').textContent,'LV.4 · 팀장');
  assert.equal(JSON.stringify([...app.local.values]),actual);
});
