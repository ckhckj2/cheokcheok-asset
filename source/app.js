'use strict';
// Shared navigation and level previews. Earned learning progress stays separate.
const icons={home:'<path d="M3 10 12 3l9 7v10H3z"/><path d="M9 20v-7h6v7"/>',learn:'<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z"/><path d="M12 6v15"/>',quiz:'<path d="M8 4h8v3H8z"/><path d="M8 5H5v16h14V5h-3"/><path d="m8 13 2 2 5-5"/>',invest:'<path d="M3 21h18M6 17v-4m6 4V9m6 8V5"/><path d="m4 8 6-4 5 2 5-4"/>',level:'<path d="M4 20h5v-5h5v-5h6V4M4 20V4"/>'};
const levels=[
{name:'신입사원',motto:'개념을 이해하고, 내 말로 설명하기',purpose:'금융·부동산 자산운용의 기초를 익히는 단계예요.',items:['금융 기초·투자 실무 입문 20강','용어사전과 숫자 예시','퀴즈·해설·오답 복습'],view:'learn',cta:'기초학습 구성 보기'},
{name:'대리',motto:'내 선택이 결과를 어떻게 바꾸는지 확인하기',purpose:'주어진 조건에서 투자 결정을 내리고, 선택 전후의 결과를 비교해요.',items:['매입·대출·운영·매각 조건 선택','현금흐름·수익률·위험 비교','판단 이유와 결과 복기'],view:'invest',cta:'모의투자 구성 보기'},
{name:'과장',motto:'자료를 비교하고, 가정의 근거 세우기',purpose:'비교 건물 자료를 읽고 임대료·공실률·운영비 가정을 직접 정해요.',items:['유사 건물의 비교 가능성 판단','가정과 선택 근거 입력','가정 변경에 따른 결과 비교'],view:'invest',cta:'가정 수립 구성 보기'},
{name:'팀장',motto:'전망이 달라져도 투자 판단이 타당한지 검토하기',purpose:'금리·공실·공사비·매각 조건이 달라지는 상황에서 투자 전략을 비교해요.',items:['금리 하락·유지·상승 시나리오','공실 증가·공사비 상승 민감도 분석','투자 여부·대출·보유·매각 전략 복기'],view:'invest',cta:'시나리오 구성 보기'}
];
function svg(key){return '<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">'+icons[key]+'</svg></span>';}
document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon);});
let previewLevel=0;
function setLevel(index){previewLevel=index;document.querySelectorAll('[data-preview-level]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.previewLevel)===index)));const item=levels[index];document.getElementById('levelNumber').textContent='0'+(index+1);document.getElementById('levelName').textContent='LV.'+(index+1)+' · '+item.name;document.getElementById('levelMotto').textContent=item.motto;document.getElementById('levelPurpose').textContent=item.purpose;const list=document.getElementById('levelFeatures');list.replaceChildren(...item.items.map(label=>{const li=document.createElement('li');li.textContent=label;return li;}));document.getElementById('levelCta').textContent=item.cta;}
function showView(name,focus=true){const allowed=['home','learn','quiz','invest','level','roadmap'];if(!allowed.includes(name))name='home';document.querySelectorAll('.view').forEach(section=>{const on=section.id==='view-'+name;section.hidden=!on;section.classList.toggle('active',on);});document.querySelectorAll('[data-nav]').forEach(btn=>{const on=btn.dataset.nav===name;btn.classList.toggle('active',on);if(on)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});document.title=(name==='home'?'척척 에셋':document.querySelector('#view-'+name+' h1').textContent+' · 척척 에셋');if(focus){window.scrollTo({top:0,behavior:'instant'});document.querySelector('#view-'+name+' h1').focus({preventScroll:true});}}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.level!==undefined)setLevel(Number(btn.dataset.level));location.hash=btn.dataset.view;}));
document.querySelectorAll('[data-preview-level]').forEach(btn=>btn.addEventListener('click',()=>setLevel(Number(btn.dataset.previewLevel))));
document.getElementById('levelCta').addEventListener('click',()=>{location.hash=levels[previewLevel].view;});
const progress=LearningProgress.create({getItem:key=>window.localStorage.getItem(key),setItem:(key,value)=>window.localStorage.setItem(key,value)},curriculum);
const learningView=document.getElementById('view-learn');
let activeLesson=null,activeStep=0;
function escapeText(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function lessonStatus(lesson){return LearningProgress.status(lesson,curriculum,progress.state);}
function updateProgressUI(){
  const count=progress.state.completed.length;
  const earnedLevel=quizProgress.level(progress.state.completed);
  document.getElementById('miniProgress').textContent=count+' / 20강 학습 완료 · '+(earnedLevel===2?'종합 퀴즈 통과':'퀴즈로 이해 확인');
  document.getElementById('currentLevel').textContent='LV.'+earnedLevel+' · '+(earnedLevel===2?'대리':'신입사원');
  document.getElementById('levelCurrentCopy').textContent=earnedLevel===2?'현재는 LV.2 · 대리예요. 수업과 퀴즈는 언제든 복습할 수 있어요.':'현재는 LV.1 · 신입사원이에요. 20강 완료와 종합 퀴즈 80점 이상을 달성하면 대리로 승급할 수 있어요.';
  document.getElementById('stageProgress').textContent='LV.'+earnedLevel+' · '+(earnedLevel===2?'대리':'신입사원')+' / '+count+'강 완료';
  const next=LearningProgress.nextLesson(curriculum,progress.state);
  const finished=count===curriculum.length;
  document.getElementById('homeNextTitle').textContent=next?next.number+'강 · '+next.title:finished?'20강 학습 완료 · 헷갈린 내용 복습하기':'다음 수업을 준비하고 있어요';
  document.getElementById('homeNextCopy').textContent=finished?'단원 퀴즈와 오답을 복습하고, 종합 퀴즈로 이해를 확인해보세요.':'먼저 기초를 익히고, 모의투자로 배운 내용을 적용할 거예요.';
  document.getElementById('homeLearningCta').textContent=finished?'복습할 수업 보기 →':'학습 시작하기 →';
}
function storageNotice(){return '<p class="storage-note" role="status">'+escapeText(progress.message||'진도는 이 기기·브라우저에 저장돼요. 브라우저 데이터를 지우면 기록도 사라져요.')+'</p>';}
function lessonRow(lesson){
  const status=lessonStatus(lesson),available=status==='open'||status==='completed';
  const label={completed:'복습하기',open:(progress.state.positions[lesson.id]||0)>0?'이어서 학습':'학습하기',locked:'이전 강 완료 후',pending:'수업 준비 중'}[status];
  return '<li><button type="button" class="lesson-row '+status+'" data-lesson="'+lesson.id+'" '+(available?'':'disabled')+'><span class="lesson-number">'+String(lesson.number).padStart(2,'0')+'</span><span class="lesson-row-copy"><b>'+escapeText(lesson.title)+'</b><small>'+escapeText(lesson.goal)+'</small></span><span class="lesson-state">'+label+'</span></button></li>';
}
function renderLearningList(notice=''){
  activeLesson=null;updateProgressUI();
  const next=LearningProgress.nextLesson(curriculum,progress.state);
  const completed=progress.state.completed.length;
  learningView.innerHTML='<header class="page-head"><span class="eyebrow">LEARNING</span><h1 tabindex="-1">기초학습</h1><p>쉽게 이해하고, 숫자로 확인하고, 내 말로 정리해요.</p></header>'+
    (notice?'<p class="lesson-note" role="status">'+escapeText(notice)+'</p>':'')+
    '<div class="learning-overview"><div><span class="eyebrow">나의 학습</span><h2>'+completed+' / 20강 완료</h2><p>완료한 수업은 언제든 다시 볼 수 있어요.</p></div>'+(next?'<button type="button" class="primary" data-lesson="'+next.id+'">'+next.number+'강 '+((progress.state.positions[next.id]||0)>0?'이어서 학습':'시작하기')+' →</button>':'<span class="status-label">'+(completed===curriculum.length?'20강 학습 완료 · 복습 가능':'다음 수업 준비 중')+'</span>')+'</div><progress class="learning-progress" max="20" value="'+completed+'" aria-label="20강 학습 완료 진도"></progress>'+storageNotice()+
    '<div class="lesson-group"><h2>01 · 금융 기초 <small>1~10강</small></h2><ol class="lesson-list">'+curriculum.slice(0,10).map(lessonRow).join('')+'</ol></div>'+
    '<div class="lesson-group"><h2>02 · 부동산 투자 실무 입문 <small>11~20강</small></h2><ol class="lesson-list">'+curriculum.slice(10).map(lessonRow).join('')+'</ol></div><p class="asset-footnote">1~20강이 모두 준비됐어요. 이전 강을 완료하면 다음 강이 열려요. 학습 완료는 스스로 읽고 정리한 기록이며, 퀴즈 점수나 승급을 의미하지 않아요.</p>';
}
function renderEasy(explanation){
  if(!explanation)return '';
  return '<div class="easy-help"><button type="button" class="easy-toggle" data-action="easy" aria-expanded="false" aria-controls="easyExplanation">더 쉽게 설명해줘</button><div id="easyExplanation" class="easy-explanation" hidden><span class="eyebrow">아주 쉬운 예시</span><h3>'+escapeText(explanation.title)+'</h3>'+explanation.paragraphs.map(line=>'<p>'+escapeText(line)+'</p>').join('')+'<div class="easy-limit"><b>실제 개념과 연결하면</b><p>'+escapeText(explanation.note)+'</p></div></div></div>';
}
function renderLesson(lesson,step,focus=true){
  if(!['open','completed'].includes(lessonStatus(lesson))){renderLearningList('이전 강을 완료한 뒤 학습할 수 있어요.');return;}
  activeLesson=lesson;activeStep=step;
  const done=lessonStatus(lesson)==='completed',summary=step===lesson.sections.length;
  const section=lesson.sections[step];
  learningView.innerHTML='<button class="text-button" type="button" data-action="list">← 전체 수업</button><header class="page-head lesson-head"><span class="eyebrow">'+(done?'REVIEW · 복습':'LESSON '+String(lesson.number).padStart(2,'0'))+'</span><h1 tabindex="-1">'+lesson.number+'강 · '+escapeText(lesson.title)+'</h1><p>'+escapeText(lesson.goal)+'</p></header><div class="lesson-steps" aria-label="수업 진행">'+lesson.sections.map((s,i)=>'<span class="'+(i===step?'current':i<step?'passed':'')+'">'+(i+1)+' · '+escapeText(s.title.split(' · ')[0])+'</span>').join('')+'<span class="'+(summary?'current':'')+'">정리</span></div>'+
    '<article class="lesson-body asset-panel"><span class="status-label">'+(summary?'핵심 요약':(step+1)+' / '+lesson.sections.length+' 소단원')+'</span><h2 tabindex="-1">'+escapeText(summary?'배운 내용, 네 줄로 정리':section.title)+'</h2>'+
    (summary?'<ul class="summary-lines">'+lesson.summary.map(line=>'<li>'+escapeText(line)+'</li>').join('')+'</ul><p>각 문장을 네 말로 설명할 수 있는지 떠올려보세요. 헷갈린 내용은 이전으로 돌아가 다시 읽어도 좋아요.</p>':section.html)+
    renderEasy(summary?lesson.easySummary:section.easy)+
    (!summary&&section.check?'<div class="understanding-check"><small>잠깐 생각해보기 · 채점하지 않아요</small><p>'+escapeText(section.check.question)+'</p><details><summary>설명 확인하기</summary><p>'+escapeText(section.check.answer)+'</p></details></div>':'')+
    (summary?'<details class="lesson-sources"><summary>개념 참고 자료</summary><ul>'+lesson.sources.map(([title,url])=>'<li><a href="'+url+'" target="_blank" rel="noopener noreferrer">'+escapeText(title)+'</a></li>').join('')+'</ul><p>교육용 가상 사례예요. 자료의 개념을 참고해 직접 설명했으며, 실제 거래의 계약·평가 기준은 별도로 확인해야 해요.</p></details>':'')+(summary&&done?'<a class="quiz-lesson-link" href="#quiz/lesson-'+lesson.number+'">이 단원 퀴즈 풀기 →</a>':'')+'</article>'+
    '<div class="lesson-controls"><button class="secondary" type="button" data-action="previous" '+(step===0?'disabled':'')+'>← 이전</button><span>'+(step+1)+' / '+(lesson.sections.length+1)+'</span>'+(summary?'<button class="primary" type="button" data-action="'+(done?'review-done':'complete')+'">'+(done?'복습 마치기':'학습 완료하기')+' →</button>':'<button class="primary" type="button" data-action="next">'+(step===lesson.sections.length-1?'핵심 요약 보기':'다음')+' →</button>')+'</div>'+storageNotice();
  document.title=lesson.number+'강 · '+lesson.title+' · 척척 에셋';
  if(focus){window.scrollTo({top:0,behavior:'instant'});learningView.querySelector('.lesson-body h2').focus({preventScroll:true});}
}
function route(focus=true,recordVisit=true){
  progress.sync();const parts=location.hash.slice(1).split('/');
  if(parts[0]==='learn'){
    const lesson=curriculum.find(l=>l.id===parts[1]);
    if(lesson&&['open','completed'].includes(lessonStatus(lesson))){
      const step=lessonStatus(lesson)==='completed'?0:progress.state.resume[lesson.id]??progress.state.positions[lesson.id]??0;
      if(recordVisit)progress.visit(lesson.id,step);renderLesson(lesson,step,false);
    }else renderLearningList(parts[1]?'이 수업은 아직 열리지 않았어요. 이전 강을 먼저 완료해 주세요.':'');
  }else if(parts[0]==='quiz'){quizRoute(parts,focus,!recordVisit);}
  else if(!learningView.querySelector('h1'))renderLearningList();
  showView(parts[0],focus);updateProgressUI();
  if(activeLesson&&parts[0]==='learn')document.title=activeLesson.number+'강 · '+activeLesson.title+' · 척척 에셋';
}
learningView.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.lesson){location.hash='learn/'+button.dataset.lesson;return;}
  if(!button.dataset.action)return;
  const action=button.dataset.action;
  if(action==='easy'){
    const expanded=button.getAttribute('aria-expanded')==='true';
    button.setAttribute('aria-expanded',String(!expanded));
    button.textContent=expanded?'더 쉽게 설명해줘':'쉬운 설명 접기';
    document.getElementById('easyExplanation').hidden=expanded;
    return;
  }
  if(action==='list'||action==='review-done'){location.hash='learn';return;}
  if(!activeLesson)return;
  if(action==='next'||action==='previous'){
    const step=activeStep+(action==='next'?1:-1);
    if(progress.visit(activeLesson.id,step)){renderLesson(activeLesson,step);updateProgressUI();}
    else route();
  }
  if(action==='complete'&&progress.complete(activeLesson.id)){
    updateProgressUI();const next=LearningProgress.nextLesson(curriculum,progress.state);
    const title=activeLesson.title;
    renderLearningList(title+' 학습을 완료했어요. '+(next?next.number+'강과 이번 단원 퀴즈가 열렸어요.':progress.state.completed.length===curriculum.length?'20강을 모두 마쳤어요. 퀴즈 메뉴에서 종합 퀴즈에 도전할 수 있어요.':'다음 수업이 추가되면 이어서 공부할 수 있어요.'));
    history.replaceState(null,'','#learn');showView('learn');
  }
});
window.addEventListener('hashchange',()=>route());
// Refresh the view on another tab's change without writing it back to storage.
window.addEventListener('storage',event=>{if(event.key===LearningProgress.KEY||event.key===QuizProgress.KEY){route(false,false);}});
setLevel(0);route(false);

