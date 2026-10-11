'use strict';
const investmentView=document.getElementById('view-invest');
const investmentProgress=Investment.create({getItem:k=>window.localStorage.getItem(k),setItem:(k,v)=>window.localStorage.setItem(k,v)});
const reviewInvestmentProgress=Investment.create({getItem:()=>null,setItem(){}});
let investmentSession=null;
const investStore=()=>ReviewMode.enabled?reviewInvestmentProgress:investmentProgress;
const investOpen=()=>ReviewMode.enabled||earnedQuizProgress.level(progress.state.completed)>=2;
const money=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:2}).format(Math.abs(n)<.000001?0:n);
const percent=n=>n===null?'계산 조건 확인':money(n*100)+'%';
const investmentHeader=(title,copy)=>'<header class="page-head"><span class="eyebrow">INVESTMENT PRACTICE</span><h1 tabindex="-1">'+escapeText(title)+'</h1><p>'+escapeText(copy)+'</p></header>';
const investmentNotice=()=>'<p class="storage-note" role="status">'+escapeText(ReviewMode.enabled?'관리자 검토 결과는 실제 투자 연습 기록에 반영되지 않아요.':investStore().message||'최근 20건의 조건·판단·복기를 이 기기·브라우저에 저장해요.')+'</p>';
function investmentAssumptions(){return '<details class="investment-assumptions"><summary>이 연습의 계산 조건 보기</summary><ul><li>금액 단위는 억 원이고, 모든 건물·수입·비용은 교육용 가상 조건이에요.</li><li>매입 거래비는 가격의 3%, 매각 비용은 매각가의 2%로 고정했어요. 실제 세율·수수료를 뜻하지 않아요.</li><li>대출은 보유 중 원금이 일정하고, 고정 금리로 매년 이자를 내며 매각 때 전액 상환해요. 중간 만기와 재대출은 생략했어요.</li><li>운영 현금은 매년 말 전액 분배해요. 시설 개선비는 처음 내고, 선택한 연 임대수입·운영비가 보유 기간 내내 같다고 가정해요.</li><li>세금·대출 수수료·추가 수선·매각 지연은 생략해요. 실제 투자 분석에는 별도로 넣어야 해요.</li><li>IRR은 연 단위의 자기자본 현금흐름으로 계산해요. 현금흐름 부호가 여러 번 바뀌거나 유입금이 없으면 단일 IRR을 표시하지 않아요.</li></ul></details>';}
function renderInvestmentHub(notice=''){
  progress.sync();investStore().sync();
  const open=investOpen();
  investmentView.innerHTML=investmentHeader('모의투자','같은 건물에서 조건을 바꾸고, 내 판단이 돈의 흐름을 어떻게 바꾸는지 확인해요.')+(notice?'<p class="lesson-note" role="status">'+escapeText(notice)+'</p>':'')+
    '<div class="asset-panel"><span class="status-label">'+(ReviewMode.enabled?'관리자 검토 · 바로 체험':open?'LV.2 · 대리 실습':'대리 승급 후 시작')+'</span><h2>가상 오피스 · 매입부터 매각까지</h2><p>매입가격 1,000 · 대출 70% · 금리 4% · 연 임대수입 60 · 운영비 10 · 3년 후 1,100에 매각하는 기준안을 먼저 봐요.</p><div class="flow-list"><div><small>01 · 조건 선택</small><b>가격·대출·운영·매각</b></div><div><small>02 · 비교</small><b>기준안과 내 현금흐름</b></div><div><small>03 · 복기</small><b>판단 근거와 놓친 위험</b></div></div><p>시설 개선이나 대출 축소가 무조건 좋은 선택일까요? 들어가는 돈과 나오는 돈을 같이 비교해보세요.</p>'+(open?'<button class="primary" data-invest-action="start">조건 정하고 연습하기 →</button>':'<a class="quiz-lesson-link" href="#quiz">20강 완료·종합 퀴즈 80점 이상으로 대리 승급하기 →</a>')+investmentAssumptions()+'</div>'+investmentNotice()+
    '<h2 class="section-caption">내 투자 판단 기록</h2>'+(investStore().records.length?'<ol class="investment-records">'+[...investStore().records].reverse().map(r=>{
      const calc=Investment.calculate(r.input);
      return '<li class="asset-panel"><span class="status-label">'+(r.decision==='invest'?'투자 검토':'보류')+' · '+escapeText(new Date(r.time).toLocaleDateString('ko-KR'))+'</span><h3>가격 '+money(r.input.price)+' · 대출 '+r.input.ltv+'% · '+r.input.years+'년 보유</h3><p>총 손익 '+money(calc.profit)+'억 · 연 IRR '+percent(calc.irr)+'</p><details><summary>판단·복기 읽기</summary><p><b>처음 판단:</b> '+escapeText(r.reason)+'</p><p><b>결과를 본 뒤:</b> '+escapeText(r.reflection)+'</p></details><button class="secondary" data-invest-record="'+escapeText(r.id)+'" '+(open?'':'disabled')+'>이 조건으로 다시 비교하기 →</button></li>';
    }).join('')+'</ol>':'<p class="asset-footnote">결과를 보고 판단과 복기를 남기면 여기서 다시 확인할 수 있어요.</p>')+
    '<div class="level-note investment-future"><b>다음 실습 구성도 살펴보세요</b><p>과장: 비교 건물 자료로 임대료·공실률·운영비 가정 세우기 · 실습 제공<br>팀장: 금리·공실·공사비 시나리오와 투자 전략 · 실습 제공</p><a class="quiz-lesson-link" href="#assumptions">과장 가정 수립 실습 보기 →</a><br><a class="quiz-lesson-link" href="#scenarios">팀장 시나리오 실습 보기 →</a><br><a class="quiz-lesson-link" href="#level">4레벨 구성·관리자 모드 보기 →</a></div>';
}
function startInvestment(raw=Investment.baseline){if(!investOpen()){renderInvestmentHub();return;}investmentSession={input:Investment.normalize(raw),decision:'hold',reason:ReviewMode.enabled?'기준안과 조건 변경의 영향을 비교하기 위한 검토입니다.':'',reflection:'',result:null,saved:false};renderInvestmentForm();}
function renderInvestmentForm(focus=true){
  if(!investOpen()){investmentSession=null;renderInvestmentHub();return;}
  const s=investmentSession,i=s.input;
  const numberField=(key,label,min,max,step)=>'<label>'+label+'<input name="'+key+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+i[key]+'" required></label>';
  investmentView.innerHTML='<button class="text-button" data-invest-action="hub">← 모의투자 목록</button>'+investmentHeader('01 · 조건을 정해봐요','수업에서 보던 건물이에요. 이번에는 거래비까지 포함해 처음 필요한 돈을 계산해요.')+'<form id="investmentForm" class="asset-panel investment-form"><div class="investment-fields">'+numberField('price','매입가격 · 억 원',500,1500,1)+'<label>대출 비율 · 매입가격 기준<select name="ltv">'+[50,60,70].map(n=>'<option value="'+n+'" '+(i.ltv===n?'selected':'')+'>'+n+'%</option>').join('')+'</select></label>'+numberField('rate','연 대출 금리 · %',1,12,.1)+'<label>보유 기간<select name="years">'+[3,5].map(n=>'<option value="'+n+'" '+(i.years===n?'selected':'')+'>'+n+'년</option>').join('')+'</select></label>'+numberField('sale','보유 기간 마지막 매각가격 · 억 원',0,2000,1)+'</div><fieldset class="investment-operation"><legend>운영 전략 · 효과는 이 연습의 가정이에요</legend>'+Object.entries(Investment.operations).map(([id,op])=>'<label class="quiz-option"><input type="radio" name="operation" value="'+id+'" '+(i.operation===id?'checked':'')+' required><span><b>'+op.label+'</b><br>연 수입 '+op.rent+' · 운영비 '+op.opex+' · 초기 개선비 '+op.upfront+'억</span></label>').join('')+'</fieldset><label class="investment-full">결과를 보기 전 내 판단<select name="decision"><option value="hold" '+(s.decision==='hold'?'selected':'')+'>보류 · 더 확인해보기</option><option value="invest" '+(s.decision==='invest'?'selected':'')+'>투자 검토 · 이 조건으로 비교하기</option></select></label><label class="investment-full">왜 그렇게 생각했나요? · 10자 이상<textarea name="reason" minlength="10" maxlength="1000" required placeholder="예: 대출을 줄이면 이자는 낮아지지만 내 돈이 더 많이 필요할 것 같아요.">'+escapeText(s.reason)+'</textarea></label><p id="investmentError" class="form-error" role="alert"></p>'+investmentAssumptions()+'<button class="primary" type="submit">기준안과 내 결과 비교하기 →</button></form>'+investmentNotice();
  if(focus){window.scrollTo({top:0,behavior:'instant'});investmentView.querySelector('h1').focus({preventScroll:true});}
}
function investmentComparison(r,b){
  const lines=[];
  if(r.debt<b.debt)lines.push('대출은 '+money(b.debt)+'억에서 '+money(r.debt)+'억으로 줄었어요. 이자 부담은 낮아질 수 있지만, 처음 필요한 내 돈도 함께 비교해야 해요.');
  else if(r.debt>b.debt)lines.push('대출은 '+money(b.debt)+'억에서 '+money(r.debt)+'억으로 늘었어요. 처음 넣는 내 돈과 매년 내는 이자가 어떻게 바뀌었는지 같이 봐요.');
  if(r.input.operation==='improve')lines.push('시설 개선에는 처음 20억이 더 들어가요. 연 NOI는 5억 늘어난다는 가정이에요. '+r.input.years+'년 동안 추가 NOI는 '+money(5*r.input.years)+'억이므로 개선비와 보유 기간을 함께 봐요. 실제 임대 효과는 별도 확인해야 해요.');
  if(r.input.years!==b.input.years)lines.push('기준안은 3년, 내 선택은 '+r.input.years+'년이에요. 더 오래 받은 임대수입을 더 좋은 연간 성과라고 바로 읽으면 안 돼요.');
  if(r.equity!==b.equity)lines.push('처음 필요한 내 돈은 '+money(b.equity)+'억 → '+money(r.equity)+'억, 매년 남는 돈은 '+money(b.annual)+'억 → '+money(r.annual)+'억이에요.');
  if(r.input.years===b.input.years&&r.profit!==b.profit&&r.irr!==null)lines.push('전체 손익은 '+money(b.profit)+'억 → '+money(r.profit)+'억, 연 IRR은 '+percent(b.irr)+' → '+percent(r.irr)+'예요. 이익 금액과 넣은 돈에 대한 수익률을 함께 읽어보세요.');
  if(!lines.length)lines.push('먼저 이 기준안의 돈 흐름을 읽어보세요. 조건을 다시 바꿔 보면 비용·회수금·수익률 중 무엇이 달라졌는지 비교할 수 있어요.');
  return '<div class="lesson-note"><b>숫자를 말로 풀어보면</b>'+lines.map(t=>'<p>'+escapeText(t)+'</p>').join('')+'</div>';
}
function renderInvestmentResults(focus=true){
  const s=investmentSession,r=s.result,b=Investment.calculate(Investment.baseline);
  const row=(label,a,c,suffix='억')=>'<tr><th scope="row">'+label+'</th><td>'+a+suffix+'</td><td>'+c+suffix+'</td></tr>';
  investmentView.innerHTML='<button class="text-button" data-invest-action="edit">← 조건 다시 바꾸기</button>'+investmentHeader('02 · 내 선택은 무엇을 바꿨을까요?','기준안과 같은 계산 방식으로 비교해요. 숫자가 좋게 나와도 생략한 위험을 확인해야 해요.')+'<div class="investment-metrics"><div><small>처음 필요한 내 돈</small><b>'+money(r.equity)+'억</b></div><div><small>매년 이자 후 현금</small><b>'+money(r.annual)+'억</b></div><div><small>전체 자기자본 손익</small><b>'+money(r.profit)+'억</b></div><div><small>연 자기자본 IRR</small><b>'+percent(r.irr)+'</b></div></div><details class="asset-panel investment-detail"><summary>기준안과 내 선택 · 상세 비교표</summary><div class="investment-table-wrap"><table class="investment-table"><caption>같은 금액 단위로 각 투자안의 보유 기간에 따라 계산한 결과</caption><thead><tr><th scope="col">항목</th><th scope="col">기준안 · 3년</th><th scope="col">내 선택 · '+r.input.years+'년</th></tr></thead><tbody>'+row('매입가격',money(b.input.price),money(r.input.price))+row('대출 원금',money(b.debt),money(r.debt))+row('초기 거래비',money(b.buyCost),money(r.buyCost))+row('초기 시설 개선비','0',money(Investment.operations[r.input.operation].upfront))+row('처음 넣는 자기자본',money(b.equity),money(r.equity))+row('연 NOI',money(b.noi),money(r.noi))+row('연 이자',money(b.interest),money(r.interest))+row('연 운영 현금 · 이자 후',money(b.annual),money(r.annual))+row('매각가격',money(b.input.sale),money(r.input.sale))+row('매각 비용',money(b.exitCost),money(r.exitCost))+row('매각 시 대출 상환 후 금액',money(b.netSale),money(r.netSale))+row('전체 자기자본 손익',money(b.profit),money(r.profit))+row('전체 자기자본 단순 수익률',percent(b.returnOnEquity),percent(r.returnOnEquity),'')+row('연 IRR',percent(b.irr),percent(r.irr),'')+'</tbody></table></div><p class="asset-footnote">보유 기간이 다르면 전체 손익을 같은 기간의 성과로 읽으면 안 돼요. 단순 수익률은 연 수익률이 아니에요.</p></details>'+investmentComparison(r,b)+'<div class="asset-panel investment-cash"><h2>내 주머니에서 오간 돈</h2><ol class="cashflow-list">'+r.flows.map((v,n)=>'<li><span>'+(!n?'처음':n+'년 말')+'</span><b>'+money(v)+'억</b><small>'+(!n?'매입·비용·개선비 − 대출':n===r.input.years?'운영 현금 + 매각 순회수':'운영 현금 · 전액 분배')+'</small></li>').join('')+'</ol><div class="calc-line">'+money(r.annual)+' × '+r.input.years+'년 + '+money(r.netSale)+' − '+money(r.equity)+' = 손익 '+money(r.profit)+'억</div><details><summary>더 쉽게 설명해줘</summary><p>처음에는 내 주머니에서 '+money(r.equity)+'억이 나가요. 매년 운영에서 '+money(r.noi)+'억이 남고, 이자 '+money(r.interest)+'억을 내면 '+money(r.annual)+'억이 남아요.</p><p>마지막에는 건물을 '+money(r.input.sale)+'억에 팔아요. 비용 '+money(r.exitCost)+'억과 대출 '+money(r.debt)+'억을 처리한 금액은 '+money(r.netSale)+'억이에요.'+(r.netSale<0?' 음수이므로 더 넣어야 할 돈이 있다는 뜻이에요.':'')+'</p><p>중간에 받은 돈과 마지막 회수금을 더한 뒤, 처음 넣은 돈을 빼면 전체 손익이에요. 마지막 해 운영 현금은 이미 연간 합계에 포함돼요.</p></details>'+investmentAssumptions()+'</div><div class="lesson-note"><b>이 결과에서 확인할 위험</b><ul>'+r.warnings.map(w=>'<li>'+escapeText(w)+'</li>').join('')+'<li>매각가 '+money(r.input.sale)+'억과 임대수입은 확정 결과가 아닌 가정이에요. 실제 근거를 확인해야 해요.</li></ul>'+(r.irr===null?'<p>유입금이 없거나 현금흐름 부호가 여러 번 바뀌는 경우에는 단일 IRR을 표시하지 않아요. 연간 현금과 부족액을 먼저 보세요.</p>':'')+'</div><form id="investmentReflection" class="asset-panel investment-form"><span class="eyebrow">03 · 판단 복기</span><h2>결과를 본 뒤 무엇을 더 확인할까요?</h2><p><b>처음 판단:</b> '+(s.decision==='invest'?'투자 검토':'보류')+' · '+escapeText(s.reason)+'</p><label class="investment-full">판단을 유지하거나 바꾸는 이유 · 10자 이상<textarea name="reflection" minlength="10" maxlength="1000" required placeholder="예: 현금은 늘었지만 추가 자기자본이 필요해요. 실제 매각가격의 근거도 확인하겠어요.">'+escapeText(s.reflection)+'</textarea></label><p id="investmentError" class="form-error" role="alert"></p><button class="primary" type="submit" '+(s.saved?'disabled':'')+'>'+(s.saved?'복기 기록 완료':ReviewMode.enabled?'검토용 복기 남기기':'판단·복기 기록하기')+' →</button><button class="secondary" type="button" data-invest-action="hub">내 투자 기록 보기 →</button></form>'+investmentNotice();
  if(focus){window.scrollTo({top:0,behavior:'instant'});investmentView.querySelector('h1').focus({preventScroll:true});}
}
investmentView.addEventListener('input',event=>{
  if(!investmentSession)return;const el=event.target;
  if(el.name==='reflection')investmentSession.reflection=el.value;
  else if(el.name==='reason')investmentSession.reason=el.value;
});
investmentView.addEventListener('submit',event=>{
  event.preventDefault();if(!investOpen()||!investmentSession)return;
  const form=event.target,s=investmentSession;
  if(form.id==='investmentForm'){
    const fields=form.elements;
    try{s.input=Investment.normalize({price:Number(fields.price.value),ltv:Number(fields.ltv.value),rate:Number(fields.rate.value),operation:fields.operation.value,years:Number(fields.years.value),sale:Number(fields.sale.value)});
      s.decision=fields.decision.value;s.reason=fields.reason.value.trim();if(s.reason.length<10||s.reason.length>1000||!['hold','invest'].includes(s.decision))throw Error('판단 이유를 10~1,000자로 적어 주세요.');
      s.result=Investment.calculate(s.input);s.saved=false;renderInvestmentResults();
    }catch(error){document.getElementById('investmentError').textContent=error.message;}
  }else if(form.id==='investmentReflection'&&!s.saved){
    s.reflection=form.elements.reflection.value.trim();if(!investStore().add(s)){document.getElementById('investmentError').textContent='복기를 10~1,000자로 적어 주세요.';return;}
    s.saved=true;renderInvestmentResults(false);document.getElementById('investmentError').textContent=ReviewMode.enabled?'검토용 복기를 남겼어요. 실제 학습 기록에는 반영되지 않아요.':investStore().message||'판단과 복기를 기록했어요.';
  }
});
investmentView.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.investRecord){const record=investStore().records.find(r=>r.id===button.dataset.investRecord);if(record)startInvestment(record.input);return;}
  switch(button.dataset.investAction){case 'start':startInvestment();break;case 'edit':if(investmentSession)renderInvestmentForm();break;case 'hub':investmentSession=null;renderInvestmentHub();window.scrollTo({top:0,behavior:'instant'});break;}
});
function investmentRoute(storageRefresh=false){
  if(!investOpen()){investmentSession=null;renderInvestmentHub();return;}
  if(storageRefresh&&investmentSession){investStore().sync();return;}
  investmentSession=null;renderInvestmentHub();
}
