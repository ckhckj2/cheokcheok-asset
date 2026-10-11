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
