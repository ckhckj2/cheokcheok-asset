'use strict';
// Question IDs, lesson completion and quiz records are independent of screen order.
quizQuestions.forEach(q=>{q.lessonId=curriculum[q.lesson-1].id;});
let quizProgress=QuizProgress.create({getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)},quizQuestions);
const earnedQuizProgress=quizProgress;
const reviewQuizProgress=QuizProgress.create({getItem:()=>null,setItem(){}},quizQuestions);
const quizCompleted=()=>ReviewMode.enabled?curriculum.map(l=>l.id):progress.state.completed;
const quizView=document.getElementById('view-quiz');
let quizSession=null;
const quizTitle=id=>id==='final'?'종합 퀴즈 · 대리 승급':id==='review'?'오답 다시 풀기':Number(id.split('-')[1])+'강 · '+curriculum[Number(id.split('-')[1])-1].title;
const quizNotice=()=>'<p class="storage-note" role="status">'+escapeText(ReviewMode.enabled?'관리자 검토 · 풀이 결과는 실제 점수·오답·승급에 반영되지 않아요.':quizProgress.message||'퀴즈 점수·오답·승급은 이 기기·브라우저에 저장돼요. 다른 기기와 자동 동기화되지 않아요.')+'</p>';
function quizHeader(title,copy){return '<header class="page-head"><span class="eyebrow">QUIZ & REVIEW</span><h1 tabindex="-1">'+escapeText(title)+'</h1><p>'+escapeText(copy)+'</p></header>';}
function promotionPanel(){
  if(ReviewMode.enabled)return '<div class="asset-panel promotion-panel"><span class="status-label">관리자 검토 · 전체 퀴즈 해금</span><h2>학습 순서와 상관없이 검토해보세요</h2><p>모든 단원과 종합 퀴즈를 바로 풀 수 있어요. 검토 점수는 실제 학습·승급 기록에 반영되지 않아요.</p><button class="primary" data-start-quiz="final">종합 퀴즈 검토하기 →</button></div>';
  const completed=quizCompleted().length,best=quizProgress.state.results.final?.best;
  const earned=quizProgress.level(quizCompleted())===2,ready=quizProgress.eligible(quizCompleted());
  return '<div class="asset-panel promotion-panel"><span class="status-label">'+(earned?'LV.2 · 대리':ready?'승급 조건 달성':'LV.1 · 신입사원')+'</span><h2>'+(earned?'대리로 승급했어요':ready?'이제 배운 것을 적용할 준비가 됐어요':'이해하고, 확인하고, 대리로 나아가요')+'</h2><ul><li>20강 학습 완료: '+completed+' / 20</li><li>종합 퀴즈 8개 이상 정답: '+(best?best.correct+' / 10 · 최고 기록':'아직 응시 전')+'</li></ul><p>'+(earned?'모의투자가 열렸어요. 조건을 바꾸며 투자 판단을 연습하고, 수업과 퀴즈도 계속 복습할 수 있어요.':'단원 퀴즈는 연습용이에요. 승급은 20강을 마치고 종합 퀴즈에서 80점 이상 받은 뒤 직접 눌러 진행해요.')+'</p>'+(earned?'<button class="secondary" data-quiz-action="invest">모의투자 연습하기 →</button>':ready?'<button class="primary" data-quiz-action="promote">대리로 승급하기 →</button>':'<button class="primary" data-start-quiz="final" '+(completed===20?'':'disabled')+'>종합 퀴즈 '+(best?'다시 풀기':'시작하기')+' →</button>')+(earned||ready?'<button class="secondary quiz-repeat" data-start-quiz="final">종합 퀴즈 다시 풀기 →</button>':'')+'</div>';
}
function renderQuizHub(notice=''){
  quizProgress.sync();
  const wrong=quizProgress.wrong(quizCompleted()),count=Object.keys(quizProgress.state.results).filter(id=>id!=='final').length;
  quizView.innerHTML=quizHeader('퀴즈','수업에서 본 사례로 확인하고, 헷갈린 부분을 다시 풀어요.')+(notice?'<p class="lesson-note" role="status">'+escapeText(notice)+'</p>':'')+promotionPanel()+'<div class="quiz-summary"><div><small>단원 퀴즈 응시</small><b>'+count+' / 20강</b></div><div><small>남은 오답</small><b>'+wrong.length+'문제</b></div><button class="secondary" data-quiz-action="review" '+(wrong.length?'':'disabled')+'>오답 다시 풀기 →</button></div>'+quizNotice()+'<h2 class="section-caption">단원별 퀴즈 · 각 3문제</h2><p class="asset-footnote">'+(ReviewMode.enabled?'관리자 모드에서는 모든 단원 퀴즈를 바로 검토할 수 있어요.':'해당 수업을 완료하면 열려요. 풀이와 해설을 반복해도 기존 학습 진도는 바뀌지 않아요.')+'</p><ol class="lesson-list quiz-list">'+curriculum.map(l=>{
    const id='lesson-'+l.number,open=quizProgress.available(id,quizCompleted()),r=quizProgress.state.results[id];
    return '<li><button class="lesson-row '+(open?'open':'locked')+'" data-start-quiz="'+id+'" '+(open?'':'disabled')+'><span class="lesson-number">'+String(l.number).padStart(2,'0')+'</span><span class="lesson-row-copy"><b>'+escapeText(l.title)+'</b><small>'+(r?'최근 '+r.latest.correct+'/3 · 최고 '+r.best.correct+'/3':'수업의 개념·숫자·판단을 확인해요.')+'</small></span><span class="lesson-state">'+(open?r?'다시 풀기':'퀴즈 풀기':'수업 완료 후')+'</span></button></li>';
  }).join('')+'</ol>';
}
function startQuiz(id,focus=true){
  progress.sync();quizProgress.sync();
  let questions;
  if(id==='review')questions=quizProgress.wrong(quizCompleted());
  else if(quizProgress.available(id,quizCompleted()))questions=quizQuestions.filter(q=>q.quizId===id);
  if(!questions?.length){quizSession=null;renderQuizHub(id==='review'?'남은 오답이 없어요. 다른 퀴즈로 이해를 확인해보세요.':'해당 수업을 완료한 뒤 풀 수 있어요. 종합 퀴즈는 20강 완료 후 열려요.');return;}
  const orders={};for(const q of questions){const order=q.options.map((_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}orders[q.id]=order;}
  quizSession={id,questions,orders,answers:{},step:0,result:null};renderQuizQuestion(focus);
}
function renderQuizQuestion(focus=true){
  const s=quizSession,q=s.questions[s.step],chosen=s.answers[q.id];
  quizView.innerHTML='<button class="text-button" data-quiz-action="exit">← 퀴즈 목록 · 풀이는 채점 후 저장</button>'+quizHeader(quizTitle(s.id),'교육용 가상 사례예요. 금액 단위는 해당 수업과 같고, 생략 조건은 문제에 표시했어요.')+'<progress class="learning-progress" max="'+s.questions.length+'" value="'+(s.step+1)+'" aria-label="퀴즈 문항 진행"></progress><form id="quizForm"><fieldset class="asset-panel quiz-question"><legend><span class="status-label">'+(s.step+1)+' / '+s.questions.length+' · '+q.lesson+'강 연결</span></legend><h2 id="questionTitle" tabindex="-1">'+escapeText(q.stem)+'</h2><div class="quiz-options">'+s.orders[q.id].map((choice,i)=>{const o=q.options[choice];return '<label class="quiz-option"><input type="radio" name="choice" value="'+choice+'" '+(chosen===choice?'checked':'')+' required><span><small>'+String.fromCharCode(65+i)+'</small>'+escapeText(o.text)+'</span></label>';}).join('')+'</div></fieldset><div class="lesson-controls"><button class="secondary" type="button" data-quiz-action="previous" '+(s.step?'':'disabled')+'>← 이전 문제</button><span id="quizChoiceCount">'+Object.keys(s.answers).length+' / '+s.questions.length+'개 선택</span><button class="primary" type="submit">'+(s.step===s.questions.length-1?'채점하기':'다음 문제')+' →</button></div></form>'+quizNotice();
  if(focus){window.scrollTo({top:0,behavior:'instant'});document.getElementById('questionTitle').focus({preventScroll:true});}
}
function renderQuizResults(focus=true){
  const s=quizSession,r=s.result,score=Math.round(r.correct/r.total*100),wrong=s.questions.filter(q=>r.answers[q.id]!==q.answer);
  quizView.innerHTML='<button class="text-button" data-quiz-action="exit">← 퀴즈 목록</button>'+quizHeader('풀이 결과','맞힌 문제도 설명을 읽으며 네 말로 정리해보세요.')+'<div class="asset-panel quiz-result" role="status"><span class="eyebrow">'+escapeText(quizTitle(s.id))+'</span><h2 tabindex="-1" id="resultTitle">'+score+'점 · '+r.correct+' / '+r.total+'문제 정답</h2><p>'+(ReviewMode.enabled?'검토용 결과예요. 정답·오답 해설을 살펴보고 실제 학습 기록과는 별도로 확인해보세요.':s.id==='final'?(r.correct>=8?'종합 퀴즈 기준을 달성했어요. 퀴즈 목록에서 대리로 승급할 수 있어요.':'8문제 이상 맞히면 승급 기준을 달성해요. 아래 해설을 보고 다시 도전해보세요.'):wrong.length?'헷갈린 '+wrong.length+'문제를 오답에 기록했어요. 정답을 다시 고르면 해당 오답이 해결돼요.':'이번 문제를 모두 맞혔어요. 왜 맞는지도 설명해보세요.')+'</p><div class="quiz-result-actions"><button class="primary" data-quiz-action="retry">'+(s.id==='review'?'남은 오답 다시 풀기':'같은 퀴즈 다시 풀기')+' →</button><button class="secondary" data-quiz-action="exit">퀴즈 목록·승급 보기 →</button></div></div>'+quizNotice()+s.questions.map((q,i)=>{
    const chosen=r.answers[q.id],correct=chosen===q.answer,letter=choice=>String.fromCharCode(65+s.orders[q.id].indexOf(choice));
    return '<article class="asset-panel quiz-explanation '+(correct?'is-correct':'is-wrong')+'"><span class="status-label">'+(i+1)+' · '+(correct?'정답':'다시 이해하기')+'</span><h2>'+escapeText(q.stem)+'</h2><p><b>내 선택 '+letter(chosen)+':</b> '+escapeText(q.options[chosen].text)+'</p>'+(!correct?'<p class="choice-reason">'+escapeText(q.options[chosen].why)+'</p>':'')+'<div class="quiz-answer"><b>정답 '+letter(q.answer)+': '+escapeText(q.options[q.answer].text)+'</b></div><h3>차근차근 설명하면</h3>'+q.explain.map(t=>'<p>'+escapeText(t)+'</p>').join('')+'<details><summary>다른 보기는 왜 다를까?</summary>'+s.orders[q.id].map((choice,j)=>{const o=q.options[choice];return '<p><b>'+String.fromCharCode(65+j)+'. '+escapeText(o.text)+'</b><br>'+escapeText(o.why)+'</p>';}).join('')+'</details><a class="quiz-lesson-link" href="#learn/'+q.lessonId+'">'+q.lesson+'강 다시 읽기 →</a></article>';
  }).join('');
  if(focus){window.scrollTo({top:0,behavior:'instant'});document.getElementById('resultTitle').focus({preventScroll:true});}
}
quizView.addEventListener('change',event=>{if(quizSession&&!quizSession.result&&event.target.name==='choice'){const choice=Number(event.target.value);const q=quizSession.questions[quizSession.step];if(Number.isInteger(choice)&&choice>=0&&choice<q.options.length){quizSession.answers[q.id]=choice;document.getElementById('quizChoiceCount').textContent=Object.keys(quizSession.answers).length+' / '+quizSession.questions.length+'개 선택';}}});
quizView.addEventListener('submit',event=>{
  event.preventDefault();const s=quizSession;if(!s||s.result)return;
  if(s.answers[s.questions[s.step].id]===undefined)return;
  if(s.step<s.questions.length-1){s.step++;renderQuizQuestion();return;}
  progress.sync();s.result=quizProgress.submit(s.id,s.answers,quizCompleted(),s.id==='review'?s.questions.map(q=>q.id):[]);
  if(!s.result){quizSession=null;renderQuizHub('다른 탭에서 기록이 바뀌었거나 풀이가 완성되지 않았어요. 목록에서 다시 시작해 주세요.');return;}
  updateProgressUI();renderQuizResults();
});
quizView.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.startQuiz){const hash='quiz/'+button.dataset.startQuiz;if(location.hash==='#'+hash)startQuiz(button.dataset.startQuiz);else location.hash=hash;return;}
  switch(button.dataset.quizAction){
    case 'previous':if(quizSession&&!quizSession.result&&quizSession.step>0){quizSession.step--;renderQuizQuestion();}break;
    case 'exit':quizSession=null;if(location.hash==='#quiz')renderQuizHub();else location.hash='quiz';break;
    case 'retry':if(quizSession)startQuiz(quizSession.id);break;
    case 'review':location.hash='quiz/review';break;
    case 'invest':location.hash='invest';break;
    case 'promote':if(ReviewMode.enabled)break;progress.sync();if(quizProgress.promote(quizCompleted())){updateProgressUI();renderQuizHub('대리로 승급했어요. 앞으로 모의투자로 배운 내용을 적용할 거예요.');}break;
  }
});
function quizRoute(parts,focus,storageRefresh=false){
  quizProgress.sync();
  if(storageRefresh&&quizSession){if(quizSession.result)renderQuizResults(false);return;}
  if(parts[1])startQuiz(parts[1],focus);else{quizSession=null;renderQuizHub();}
}
