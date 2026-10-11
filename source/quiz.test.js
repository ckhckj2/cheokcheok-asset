'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const lessons=vm.runInNewContext(fs.readFileSync(__dirname+'/curriculum.js','utf8')+'\ncurriculum');
const questions=require('./quiz-bank');questions.forEach(q=>q.lessonId=lessons[q.lesson-1].id);
const Q=require('./quiz-progress'),L=require('./progress');
function memory(initial){const values=new Map(initial||[]);let writes=0;return {getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);writes++;},get values(){return values;},get writes(){return writes;}};}
const all=lessons.map(l=>l.id),store=memory();let q=Q.create(store,questions);
const answers=id=>Object.fromEntries(questions.filter(q=>q.quizId===id).map(q=>[q.id,q.answer]));
assert.equal(questions.length,70);assert.equal(new Set(questions.map(q=>q.id)).size,70);
for(const question of questions){assert.equal(question.options.length,3);assert.ok(question.options.every(o=>o.text&&o.why));assert.equal(question.explain.length,3);assert.ok(lessons.some(l=>l.id===question.lessonId));}
assert.equal(q.available('lesson-1',[]),false);assert.equal(q.available('lesson-1',all.slice(0,1)),true);assert.equal(q.available('final',all.slice(0,19)),false);assert.equal(q.available('final',Array(20).fill('unknown')),false);
assert.equal(q.submit('final',answers('final'),all.slice(0,19)),null);assert.equal(q.submit('lesson-2',answers('lesson-2'),all.slice(0,1)),null);
assert.equal(q.submit('lesson-1',{},all),null);assert.equal(q.submit('lesson-1',{'lesson-1-1':99},all),null);
assert.equal(q.promote(all),false);
const first=answers('lesson-1');first['lesson-1-1']=1;
let r=q.submit('lesson-1',first,all);assert.equal(r.correct,2);assert.equal(q.wrong(all).length,1);const storageBefore=store.writes;
q.sync();q.wrong(all);assert.equal(store.writes,storageBefore);
assert.equal(q.submit('review',{'lesson-2-1':0},all,['lesson-2-1']),null);
assert.equal(q.submit('review',{'lesson-1-1':0},all,['lesson-1-1','lesson-1-1']),null);
assert.equal(q.submit('review',{'lesson-1-1':0},all,['lesson-1-1']).correct,1);assert.equal(q.wrong(all).length,0);
// The same question can become an unresolved error again on a later attempt.
q.submit('lesson-1',first,all);assert.equal(q.wrong(all).length,1);q.submit('lesson-1',answers('lesson-1'),all);assert.equal(q.wrong(all).length,0);assert.equal(q.state.results['lesson-1'].best.correct,3);
const eight=answers('final');eight['exam-1']=1;eight['exam-2']=2;
r=q.submit('final',eight,all);assert.equal(r.correct,8);assert.equal(r.total,10);assert.equal(q.level(all),1);assert.equal(q.eligible(all),true);assert.equal(q.promote(all.slice(0,19)),false);assert.equal(q.promote(all),true);assert.equal(q.level(all),2);
q=Q.create(store,questions);assert.equal(q.level(all),2);assert.equal(q.wrong(all).length,2);const promoteWrites=store.writes;q.promote(all);assert.equal(store.writes,promoteWrites);
const seven={...eight,'exam-3':0};q.submit('final',seven,all);assert.equal(q.state.results.final.latest.correct,7);assert.equal(q.state.results.final.best.correct,8);assert.equal(q.level(all),2);
const unpassed=Q.create(memory(),questions);unpassed.submit('final',seven,all);assert.equal(unpassed.eligible(all),false);assert.equal(unpassed.promote(all),false);
// Scores are derived again from answers; supplied score fields never control promotion.
const tampered=JSON.parse(store.values.get(Q.KEY));tampered.results.final.best.correct=10;const derived=Q.create(memory([[Q.KEY,JSON.stringify(tampered)]]),questions);assert.equal(derived.state.results.final.best.correct,8);
const corrupt=memory([[Q.KEY,'{bad']]);const failed=Q.create(corrupt,questions);failed.submit('lesson-1',answers('lesson-1'),all);assert.ok(failed.message);assert.equal(corrupt.values.get(Q.KEY),'{bad');
const blocked=Q.create({getItem:()=>null,setItem:()=>{throw Error('quota');}},questions);assert.equal(blocked.submit('lesson-1',answers('lesson-1'),all).correct,3);assert.ok(blocked.message);
// New quiz storage is independent of old lesson storage, including multi-tab updates.
const learning=L.create(store,lessons);for(let pos=0;pos<=3;pos++)learning.visit(lessons[0].id,pos);learning.complete(lessons[0].id);const oldProgress=store.values.get(L.KEY);
const a=Q.create(store,questions),b=Q.create(store,questions);a.submit('lesson-2',answers('lesson-2'),all);b.submit('lesson-3',answers('lesson-3'),all);a.sync();assert.equal(a.state.results['lesson-2'].best.correct,3);assert.equal(a.state.results['lesson-3'].best.correct,3);assert.equal(store.values.get(L.KEY),oldProgress);
// A stale tab cannot grade an error review already resolved by another tab.
a.submit('lesson-1',first,all);b.sync();a.submit('review',{'lesson-1-1':0},all,['lesson-1-1']);assert.equal(b.submit('review',{'lesson-1-1':0},all,['lesson-1-1']),null);
console.log('PASS: 70 authored questions, lesson/exam gates, incomplete choices, grading, error resolution, 80-point promotion, best-score retention, reload, corrupt/blocked storage, independent learning records and shared tabs');
// Drive the real UI handlers with a minimal DOM: selection, previous, grading,
// retry and storage refresh must use the same session without losing answers.
const nodes=new Map(),handlers={};let memoryValues=new Map([[L.KEY,JSON.stringify({version:1,completed:all,positions:Object.fromEntries(all.map(id=>[id,3])),resume:{},last:all[19]})]]),uiWrites=0;
function node(id){if(!nodes.has(id))nodes.set(id,{id,textContent:'학습',innerHTML:'',dataset:{},focus(){},replaceChildren(){},addEventListener(name,fn){handlers[id+':'+name]=fn;},setAttribute(){},removeAttribute(){},classList:{toggle(){}},querySelector(){return node('child');}});return nodes.get(id);}
const ctx={document:{title:'',getElementById:node,createElement:()=>node('new'),querySelectorAll:()=>[],querySelector:()=>node('heading')},location:{hash:'#quiz/lesson-1'},history:{replaceState(){}},window:{localStorage:{getItem:k=>memoryValues.get(k)??null,setItem:(k,v)=>{uiWrites++;memoryValues.set(k,v);}},scrollTo(){},addEventListener(name,fn){handlers[name]=fn;}}};
vm.createContext(ctx);vm.runInContext(['curriculum.js','easy.js','progress.js','review-mode.js','investment.js','quiz-bank.js','quiz-progress.js','quiz-ui.js','investment-ui.js','app.js'].map(n=>fs.readFileSync(__dirname+'/'+n,'utf8')).join('\n'),ctx);
const read=code=>vm.runInContext(code,ctx),choose=n=>handlers['view-quiz:change']({target:{name:'choice',value:String(n)}}),submit=()=>handlers['view-quiz:submit']({preventDefault(){}}),click=action=>handlers['view-quiz:click']({target:{closest(){return {disabled:false,dataset:{quizAction:action}};}}});
assert.equal(read('quizSession.step'),0);submit();assert.equal(read('quizSession.step'),0);
choose(1);submit();assert.equal(read('quizSession.step'),1);choose(1);click('previous');assert.equal(read('quizSession.answers["lesson-1-2"]'),1);assert.equal(read('quizSession.step'),0);
submit();assert.equal(read('quizSession.step'),1);submit();assert.equal(read('quizSession.step'),2);choose(2);
const uiWritesBefore=uiWrites;handlers.storage({key:Q.KEY});assert.equal(read('quizSession.answers["lesson-1-3"]'),2);assert.equal(uiWrites,uiWritesBefore);
submit();assert.equal(read('quizSession.result.correct'),2);assert.ok(node('view-quiz').innerHTML.includes('67점'));assert.ok(node('view-quiz').innerHTML.includes('내 주머니 300'));
const gradedWrites=uiWrites;submit();assert.equal(uiWrites,gradedWrites);click('retry');assert.equal(read('quizSession.result'),null);assert.equal(read('quizSession.step'),0);assert.equal(read('Object.keys(quizSession.answers).length'),0);
ctx.location.hash='#quiz/lesson-999';handlers.hashchange();assert.equal(read('quizSession'),null);assert.ok(node('view-quiz').innerHTML.includes('해당 수업을 완료한 뒤'));
console.log('PASS: actual UI handlers for required answers, previous/next, explanations, retry, invalid routes and non-writing storage refresh during a quiz');
ctx.location.hash='#quiz/lesson-1';handlers.hashchange();
const displayed=Array.from(node('view-quiz').innerHTML.matchAll(/name="choice" value="(\d)"/g),m=>Number(m[1]));
assert.equal(JSON.stringify(displayed),read('JSON.stringify(quizSession.orders["lesson-1-1"])'));assert.equal(new Set(displayed).size,3);
choose(1);assert.equal(node('quizChoiceCount').textContent,'1 / 3개 선택');
read('quizProgress.submit("final",Object.fromEntries(quizQuestions.filter(q=>q.quizId==="final").map(q=>[q.id,q.answer])),progress.state.completed)');
click('promote');assert.equal(node('currentLevel').textContent,'LV.2 · 대리');assert.ok(node('view-quiz').innerHTML.includes('data-start-quiz="final"'));assert.ok(node('view-quiz').innerHTML.includes('종합 퀴즈 다시 풀기'));
console.log('PASS: shuffled display preserves canonical answer IDs, selected count updates immediately and comprehensive retry remains available after promotion');
