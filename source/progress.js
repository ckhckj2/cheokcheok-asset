'use strict';
// Learning gates guide study; they are not authentication or proof of competence.
const LearningProgress = (() => {
  const KEY = 'cheokcheok.asset.learning.v1';
  function empty(){return {version:1,completed:[],positions:{},resume:{},last:null};}
  function normalize(raw,lessons){
    if(!raw || raw.version!==1 || !Array.isArray(raw.completed) || !raw.positions || typeof raw.positions!=='object') throw new Error('Invalid progress');
    const result=empty();
    for(const lesson of lessons){
      if(!lesson.sections.length || !raw.completed.includes(lesson.id)) break;
      result.completed.push(lesson.id);
    }
    for(const lesson of lessons){
      const n=raw.positions[lesson.id];
      if(lesson.sections.length && Number.isInteger(n) && n>=0) result.positions[lesson.id]=Math.min(n,lesson.sections.length);
      const cursor=raw.resume?.[lesson.id];
      if(Number.isInteger(cursor)&&cursor>=0&&cursor<=(result.positions[lesson.id]||0))result.resume[lesson.id]=cursor;
    }
    if(lessons.some(l=>l.id===raw.last)) result.last=raw.last;
    return result;
  }
  function status(lesson,lessons,state){
    if(!lesson.sections.length) return 'pending';
    if(state.completed.includes(lesson.id)) return 'completed';
    const index=lessons.indexOf(lesson);
    return index===0 || lessons.slice(0,index).every(l=>state.completed.includes(l.id)) ? 'open' : 'locked';
  }
  function nextLesson(lessons,state){return lessons.find(l=>status(l,lessons,state)==='open') || null;}
  function merge(a,b,lessons){
    const positions={...a.positions};
    for(const [id,n] of Object.entries(b.positions)) positions[id]=Math.max(n,positions[id]||0);
    return normalize({version:1,completed:[...new Set([...a.completed,...b.completed])],positions,resume:{...a.resume,...b.resume},last:b.last||a.last},lessons);
  }
  function create(storage,lessons){
    let state=empty(),writable=true,message='';
    function read(){const raw=storage.getItem(KEY);return raw===null?empty():normalize(JSON.parse(raw),lessons);}
    try{state=read();}catch(error){writable=false;message='저장된 진도를 읽을 수 없어 이번 방문의 진도만 유지해요. 기존 기록은 덮어쓰지 않아요.';}
    function save(next){
      if(writable){
        try{const persisted=read();next=merge(persisted,next,lessons);if(JSON.stringify(next)!==JSON.stringify(persisted))storage.setItem(KEY,JSON.stringify(next));}
        catch(error){writable=false;message='진도를 저장하지 못했어요. 이번 방문에서는 계속 공부할 수 있지만, 새로고침하면 기록이 사라질 수 있어요.';}
      }
      state=next;return state;
    }
    return {
      get state(){return state;},get message(){return message;},
      sync(){if(writable){try{state=merge(state,read(),lessons);}catch(error){writable=false;message='진도 저장소가 변경되어 이번 방문의 기록만 유지해요. 기존 기록은 덮어쓰지 않아요.';}}return state;},
      visit(id,position){this.sync();const lesson=lessons.find(l=>l.id===id);if(!lesson||!['open','completed'].includes(status(lesson,lessons,state)))return false;
        const max=state.positions[id]||0;if(!Number.isInteger(position)||position<0||position>lesson.sections.length||position>max+1)return false;
        save({...state,positions:{...state.positions,[id]:Math.max(max,position)},resume:{...state.resume,[id]:position},last:id});return true;},
      complete(id){this.sync();const lesson=lessons.find(l=>l.id===id);if(!lesson||status(lesson,lessons,state)==='locked'||!lesson.sections.length||(state.positions[id]||0)<lesson.sections.length)return false;
        save({...state,completed:[...new Set([...state.completed,id])],last:id});return true;}
    };
  }
  return {KEY,empty,normalize,status,nextLesson,create};
})();
if(typeof module!=='undefined')module.exports=LearningProgress;
