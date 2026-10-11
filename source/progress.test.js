'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const lessons=vm.runInNewContext(fs.readFileSync(__dirname+'/curriculum.js','utf8')+'\n'+fs.readFileSync(__dirname+'/easy.js','utf8')+'\n curriculum');const P=require('./progress');
function memory(initial){let value=initial??null;return {getItem:()=>value,setItem:(key,next)=>{value=next;},get value(){return value;}};}
const store=memory();let app=P.create(store,lessons);
assert.equal(P.status(lessons[0],lessons,app.state),'open');assert.equal(P.status(lessons[1],lessons,app.state),'locked');assert.equal(P.status(lessons[10],lessons,app.state),'pending');
assert.equal(app.visit(lessons[3].id,0),false);assert.equal(app.complete(lessons[0].id),false);assert.equal(app.visit(lessons[0].id,3),false);
for(let i=0;i<10;i++){
 const l=lessons[i];for(let pos=0;pos<=l.sections.length;pos++)assert.equal(app.visit(l.id,pos),true);
 assert.equal(app.complete(l.id),true);assert.equal(P.status(l,lessons,app.state),'completed');
 app=P.create(store,lessons);assert.equal(app.state.completed.length,i+1);
}
assert.equal(P.nextLesson(lessons,app.state),null);
const prior=memory(JSON.stringify({version:1,completed:lessons.slice(0,4).map(l=>l.id),positions:Object.fromEntries(lessons.slice(0,4).map(l=>[l.id,3])),resume:{[lessons[3].id]:1},last:lessons[3].id}));const upgraded=P.create(prior,lessons);assert.equal(upgraded.state.completed.length,4);assert.equal(P.nextLesson(lessons,upgraded.state).number,5);assert.equal(upgraded.state.resume[lessons[3].id],1);assert.equal(app.complete(lessons[10].id),false);
assert.equal(app.visit(lessons[0].id,0),true);assert.equal(app.complete(lessons[0].id),true);assert.equal(app.state.completed.length,10);
const corrupt=memory('{broken');const fail=P.create(corrupt,lessons);assert.ok(fail.message);fail.visit(lessons[0].id,1);assert.equal(corrupt.value,'{broken');
const blocked=P.create({getItem:()=>null,setItem:()=>{throw Error('quota');}},lessons);assert.equal(blocked.visit(lessons[0].id,1),true);assert.ok(blocked.message);assert.equal(blocked.state.positions[lessons[0].id],1);
const hostile=P.normalize({version:1,completed:[lessons[3].id,'unknown'],positions:{[lessons[0].id]:999},last:'unknown'},lessons);assert.deepEqual(hostile.completed,[]);assert.equal(hostile.positions[lessons[0].id],3);assert.equal(hostile.last,null);
const shared=memory();const a=P.create(shared,lessons),b=P.create(shared,lessons);for(let n=0;n<=3;n++)a.visit(lessons[0].id,n);a.complete(lessons[0].id);b.visit(lessons[1].id,0);assert.equal(b.state.completed.length,1);a.sync();assert.equal(a.state.last,lessons[1].id);
assert.equal(60-10,50);assert.equal(700*.04,28);assert.equal(1100+20-700-5,415);assert.equal(50/1000,.05);assert.ok(Math.abs(50/.06-833.333333)<.00001);assert.ok(Math.abs((121/100)**.5-1-.1)<.000001);
assert.equal(lessons.length,20);assert.equal(new Set(lessons.map(l=>l.id)).size,20);assert.equal(lessons[19].title,'모의 투자심사 및 실전 퀴즈');
for(const lesson of lessons.slice(0,10))assert.ok(lesson.summary.length>=3&&lesson.summary.length<=5);
console.log('PASS: sequential access, pending lessons, summary gate, reload, review, corrupt/blocked storage, shared tabs, stable IDs, example arithmetic');

for(const lesson of lessons.slice(0,10)){assert.equal(lesson.sections.length,3);assert.ok(lesson.easySummary.paragraphs.length);for(const section of lesson.sections){assert.ok(section.easy.title);assert.ok(section.easy.paragraphs.length>=3);assert.ok(section.easy.note);}}
assert.ok(Math.abs(10/1.1+110/(1.1**2)-100)<1e-10);assert.equal(600*.06*.5,18);assert.equal(60-10-28-10-5,7);console.log('PASS: stage 2-A progress preserved, 5th lesson unlocked, 10 live lessons and 40 easy explanations, new example arithmetic');
