'use strict';
const QuizProgress=(()=>{
  const KEY='cheokcheok.asset.quiz.v1';
  const empty=()=>({version:1,results:{},responses:{},promotion:null});
  const compare=(a,b)=>a.time-b.time||a.id.localeCompare(b.id);
  function create(storage,questions){
    const byId=new Map(questions.map(q=>[q.id,q])),groups=new Map();
    for(const q of questions){if(!groups.has(q.quizId))groups.set(q.quizId,[]);groups.get(q.quizId).push(q);}
    let state=empty(),writable=true,message='';
    function response(raw,q){
      if(!raw||!Number.isInteger(raw.choice)||raw.choice<0||raw.choice>=q.options.length||!Number.isSafeInteger(raw.time)||raw.time<0||typeof raw.id!=='string'||raw.id.length>100)return null;
      return {choice:raw.choice,time:raw.time,id:raw.id};
    }
    function result(raw,id){
      const qs=groups.get(id);if(!raw||!qs||!raw.answers||typeof raw.answers!=='object'||!Number.isSafeInteger(raw.time)||raw.time<0||typeof raw.id!=='string'||raw.id.length>100)return null;
      const answers={};let correct=0;
      for(const q of qs){const choice=raw.answers[q.id];if(!Number.isInteger(choice)||choice<0||choice>=q.options.length)return null;answers[q.id]=choice;if(choice===q.answer)correct++;}
      return {id:raw.id,time:raw.time,answers,correct,total:qs.length};
    }
    function normalize(raw){
      if(!raw||raw.version!==1||!raw.results||typeof raw.results!=='object'||Array.isArray(raw.results)||!raw.responses||typeof raw.responses!=='object'||Array.isArray(raw.responses))throw Error('Invalid quiz record');
      const next=empty();
      for(const id of groups.keys()){
        const r=raw.results[id];if(!Object.hasOwn(raw.results,id))continue;
        if(!r)throw Error('Invalid quiz result');
        const latest=result(r.latest,id),best=result(r.best,id);
        if(!latest||!best)throw Error('Invalid quiz result');
        if(latest&&best){const winner=latest.correct>best.correct?latest:best;next.results[id]={latest,best:winner};}
      }
      for(const q of questions){if(!Object.hasOwn(raw.responses,q.id))continue;const r=response(raw.responses[q.id],q);if(!r)throw Error('Invalid quiz response');next.responses[q.id]=r;}
      // A promotion record is meaningful only alongside a passing full exam.
      if(raw.promotion&&response({choice:0,...raw.promotion},questions[0])&&next.results.final?.best.correct>=8)next.promotion={time:raw.promotion.time,id:raw.promotion.id};
      return next;
    }
    function merge(a,b){
      const merged=empty();
      for(const id of groups.keys()){
        const x=a.results[id],y=b.results[id];if(!x&&!y)continue;
        if(!x||!y){merged.results[id]=x||y;continue;}
        merged.results[id]={latest:compare(x.latest,y.latest)>0?x.latest:y.latest,best:x.best.correct>y.best.correct||x.best.correct===y.best.correct&&compare(x.best,y.best)>0?x.best:y.best};
      }
      for(const q of questions){const x=a.responses[q.id],y=b.responses[q.id];if(x||y)merged.responses[q.id]=!x?y:!y?x:compare(x,y)>0?x:y;}
      const x=a.promotion,y=b.promotion;merged.promotion=!x?y:!y?x:compare(x,y)>0?x:y;
      return normalize(merged);
    }
    const read=()=>{const value=storage.getItem(KEY);return value===null?empty():normalize(JSON.parse(value));};
    try{state=read();}catch(error){writable=false;message='퀴즈 기록을 읽을 수 없어 이번 방문의 기록만 유지해요. 기존 기록은 덮어쓰지 않아요.';}
    function sync(){if(writable){try{state=merge(state,read());}catch(error){writable=false;message='퀴즈 저장소를 읽지 못해 이번 방문의 기록만 유지해요. 기존 기록은 덮어쓰지 않아요.';}}return state;}
    function save(next){if(writable){try{const old=read();next=merge(old,next);if(JSON.stringify(old)!==JSON.stringify(next))storage.setItem(KEY,JSON.stringify(next));}catch(error){writable=false;message='퀴즈 기록을 저장하지 못했어요. 새로고침하면 이번 방문의 기록이 사라질 수 있어요.';}}state=next;return next;}
    function stamp(){const latest=Math.max(0,...Object.values(state.responses).map(r=>r.time),state.promotion?.time||0);return {time:Math.max(Date.now(),latest+1),id:typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)};}
    const allComplete=completed=>new Set(questions.map(q=>q.lessonId)).size===20&&questions.every(q=>completed.includes(q.lessonId));
    function available(id,completed){return id==='final'?allComplete(completed):groups.has(id)&&completed.includes(questions.find(q=>q.quizId===id)?.lessonId);}
    return {
      get state(){return state;},get message(){return message;},sync,
      available,
      wrong(completed){sync();return questions.filter(q=>completed.includes(q.lessonId)&&state.responses[q.id]&&state.responses[q.id].choice!==q.answer);},
      eligible(completed){sync();return allComplete(completed)&&(state.results.final?.best.correct||0)>=8;},
      level(completed){sync();return state.promotion&&allComplete(completed)&&(state.results.final?.best.correct||0)>=8?2:1;},
      submit(id,answers,completed,reviewIds=[]){
        sync();let qs;
        if(id==='review'){
          const allowed=new Set(this.wrong(completed).map(q=>q.id));
          if(!reviewIds.length||new Set(reviewIds).size!==reviewIds.length||reviewIds.some(q=>!allowed.has(q)))return null;
          qs=reviewIds.map(q=>byId.get(q));
        }else{if(!available(id,completed))return null;qs=groups.get(id);}
        if(!answers||qs.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>=q.options.length))return null;
        const tag=stamp(),chosen={},responses={...state.responses};let correct=0;
        for(const q of qs){chosen[q.id]=answers[q.id];responses[q.id]={...tag,choice:answers[q.id]};if(answers[q.id]===q.answer)correct++;}
        const graded={...tag,answers:chosen,correct,total:qs.length};const results={...state.results};
        if(id!=='review'){const old=results[id];results[id]={latest:graded,best:!old||graded.correct>=old.best.correct?graded:old.best};}
        save({...state,results,responses});return graded;
      },
      promote(completed){if(!this.eligible(completed))return false;if(!state.promotion)save({...state,promotion:stamp()});return true;}
    };
  }
  return {KEY,create};
})();
if(typeof module!=='undefined')module.exports=QuizProgress;
