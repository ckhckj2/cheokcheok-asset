'use strict';
const assert=require('node:assert/strict');
const lessons=require('./curriculum');const P=require('./progress');
function memory(initial){let value=initial??null;return {getItem:()=>value,setItem:(key,next)=>{value=next;},get value(){return value;}};}
const store=memory();let app=P.create(store,lessons);
assert.equal(P.status(lessons[0],lessons,app.state),'open');assert.equal(P.status(lessons[1],lessons,app.state),'locked');assert.equal(P.status(lessons[4],lessons,app.state),'pending');
assert.equal(app.visit(lessons[3].id,0),false);assert.equal(app.complete(lessons[0].id),false);assert.equal(app.visit(lessons[0].id,3),false);
for(let i=0;i<4;i++){
 const l=lessons[i];for(let pos=0;pos<=l.sections.length;pos++)assert.equal(app.visit(l.id,pos),true);
 assert.equal(app.complete(l.id),true);assert.equal(P.status(l,lessons,app.state),'completed');
 app=P.create(store,lessons);assert.equal(app.state.completed.length,i+1);
}
assert.equal(P.nextLesson(lessons,app.state),null);assert.equal(app.complete(lessons[4].id),false);
assert.equal(app.visit(lessons[0].id,0),true);assert.equal(app.complete(lessons[0].id),true);assert.equal(app.state.completed.length,4);
const corrupt=memory('{broken');const fail=P.create(corrupt,lessons);assert.ok(fail.message);fail.visit(lessons[0].id,1);assert.equal(corrupt.value,'{broken');
const blocked=P.create({getItem:()=>null,setItem:()=>{throw Error('quota');}},lessons);assert.equal(blocked.visit(lessons[0].id,1),true);assert.ok(blocked.message);assert.equal(blocked.state.positions[lessons[0].id],1);
const hostile=P.normalize({version:1,completed:[lessons[3].id,'unknown'],positions:{[lessons[0].id]:999},last:'unknown'},lessons);assert.deepEqual(hostile.completed,[]);assert.equal(hostile.positions[lessons[0].id],3);assert.equal(hostile.last,null);
const shared=memory();const a=P.create(shared,lessons),b=P.create(shared,lessons);for(let n=0;n<=3;n++)a.visit(lessons[0].id,n);a.complete(lessons[0].id);b.visit(lessons[1].id,0);assert.equal(b.state.completed.length,1);a.sync();assert.equal(a.state.last,lessons[1].id);
assert.equal(60-10,50);assert.equal(700*.04,28);assert.equal(1100+20-700-5,415);assert.equal(50/1000,.05);assert.ok(Math.abs(50/.06-833.333333)<.00001);assert.ok(Math.abs((121/100)**.5-1-.1)<.000001);
assert.equal(lessons.length,20);assert.equal(new Set(lessons.map(l=>l.id)).size,20);assert.equal(lessons[19].title,'모의 투자심사 및 실전 퀴즈');
for(const lesson of lessons.slice(0,4))assert.ok(lesson.summary.length>=3&&lesson.summary.length<=5);
console.log('PASS: sequential access, pending lessons, summary gate, reload, review, corrupt/blocked storage, shared tabs, stable IDs, example arithmetic');
