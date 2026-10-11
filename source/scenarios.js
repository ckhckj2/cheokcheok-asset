'use strict';
// Stage 6 snapshots have a separate model/key; historical stage 4/5 results stay unchanged.
const Scenarios=(()=>{
  const investment=typeof module!=='undefined'?require('./investment'):Investment;
  const assumptions=typeof module!=='undefined'?require('./assumptions'):Assumptions;
  const KEY='cheokcheok.asset.scenarios.v1';
  const definitions=[{id:'favorable',label:'유리한 상황'},{id:'base',label:'기준 상황'},{id:'stress',label:'불리한 상황'}];
  const strategies={maintain:{label:'현재 조건 유지',ltv:70,years:3,improve:false},lowDebt:{label:'대출 50%로 줄이기',ltv:50,years:3,improve:false},improve:{label:'시설 개선하기',ltv:70,years:3,improve:true},earlyExit:{label:'2년 말 일찍 매각',ltv:70,years:2,improve:false}};
  function defaults(baseInput){const base=assumptions.normalize(baseInput);return [{id:'favorable',rate:3,vacancy:Math.max(0,base.vacancy-5),costShock:-10,cap:3.8},{id:'base',rate:4,vacancy:base.vacancy,costShock:0,cap:4},{id:'stress',rate:6,vacancy:Math.min(60,base.vacancy+10),costShock:25,cap:5}];}
  function normalizeScenario(raw){
    if(!raw||!definitions.some(s=>s.id===raw.id))throw Error('시나리오를 확인해 주세요.');
    const n={id:raw.id};for(const [key,min,max] of [['rate',1,12],['vacancy',0,60],['costShock',-30,100],['cap',2,10]]){
      if(typeof raw[key]!=='number'||!Number.isFinite(raw[key])||raw[key]<min||raw[key]>max)throw Error('금리·공실·공사비·매각 Cap Rate의 입력 범위를 확인해 주세요.');n[key]=raw[key];
    }return n;
  }
  function normalize(raw){
    if(!raw||!Object.hasOwn(strategies,raw.strategy)||!Array.isArray(raw.scenarios)||raw.scenarios.length!==3)throw Error('전략과 세 가지 시나리오를 확인해 주세요.');
    const baseInput=assumptions.normalize(raw.baseInput),scenarios=definitions.map(d=>{const matching=raw.scenarios.filter(s=>s?.id===d.id);if(matching.length!==1)throw Error('시나리오가 빠지거나 중복됐어요.');return normalizeScenario(matching[0]);});
    return {baseInput,scenarios,strategy:raw.strategy};
  }
  function calculate(baseInput,rawScenario,strategyId){
    const base=assumptions.normalize(baseInput),scenario=normalizeScenario(rawScenario);
    if(!Object.hasOwn(strategies,strategyId))throw Error('전략을 확인해 주세요.');
    const strategy=strategies[strategyId],potential=20000*base.rent*12/100000000*(strategy.improve?1.1:1),opex=base.opex+(strategy.improve?1:0),revenue=potential*(1-scenario.vacancy/100),noi=revenue-opex;
    const renovation=strategy.improve?30*(1+scenario.costShock/100):0,debt=1000*strategy.ltv/100,equity=1030+renovation-debt,interest=debt*scenario.rate/100,annual=noi-interest;
    // Nonpositive NOI cannot be priced with a positive cap-rate perpetuity model.
    const sale=noi>0?noi/(scenario.cap/100):null,exitCost=sale===null?null:sale*.02,netSale=sale===null?null:sale-exitCost-debt;
    const flows=[-equity,...Array.from({length:strategy.years},(_,i)=>i===strategy.years-1?(netSale===null?null:annual+netSale):annual)];
    const profit=netSale===null?null:annual*strategy.years+netSale-equity,irr=netSale===null?null:investment.irr(flows),coverage=noi/interest,breakEvenVacancy=(1-(opex+interest)/potential)*100;
    return {baseInput:base,scenario,strategyId,strategy,potential,opex,revenue,noi,renovation,debt,equity,interest,annual,sale,exitCost,netSale,flows,profit,irr,coverage,breakEvenVacancy,fundingNeed:Math.max(0,-annual)*strategy.years};
  }
  function compare(raw){const input=normalize(raw);return input.scenarios.map(s=>calculate(input.baseInput,s,input.strategy));}
  function sensitivity(baseInput,rawScenario,strategyId){
    const s=normalizeScenario(rawScenario),base=calculate(baseInput,s,strategyId);
    return [['금리','rate',Math.min(12,s.rate+1),'%'],['공실률','vacancy',Math.min(60,s.vacancy+5),'%'],['매각 Cap Rate','cap',Math.min(10,s.cap+.5),'%'],['공사비 변화','costShock',Math.min(100,s.costShock+10),'%']].map(([label,key,value,unit])=>({label:label+' '+s[key]+unit+' → '+value+unit,changed:value!==s[key],base,result:calculate(baseInput,{...s,[key]:value},strategyId)}));
  }
  function record(raw){
    const input=normalize(raw);if(!['invest','hold'].includes(raw.decision))throw Error('투자 검토 또는 보류를 선택해 주세요.');
    const text={};for(const key of ['reason','reflection']){if(typeof raw[key]!=='string'||raw[key].trim().length<10||raw[key].length>1000)throw Error('판단 이유와 복기를 10~1,000자로 적어 주세요.');text[key]=raw[key].trim();}
    return {...input,decision:raw.decision,...text};
  }
  function create(storage){
    let state={version:1,promoted:false,records:[]},message='',writable=true;
    function clean(raw){
      if(!raw||raw.version!==1||typeof raw.promoted!=='boolean'||!Array.isArray(raw.records))throw Error('Invalid scenario record');
      // A malformed row blocks writes to the snapshot instead of being silently deleted.
      const records=raw.records.map(r=>{if(!r||typeof r.id!=='string'||r.id.length>100||!Number.isSafeInteger(r.time)||r.time<0)throw Error('Invalid scenario entry');return {...record(r),id:r.id,time:r.time};}).sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)).slice(-20);
      return {version:1,promoted:raw.promoted,records};
    }
    const read=()=>{const v=storage.getItem(KEY);return v===null?{version:1,promoted:false,records:[]}:clean(JSON.parse(v));};
    const merge=(a,b)=>clean({version:1,promoted:a.promoted||b.promoted,records:[...new Map([...a.records,...b.records].map(r=>[r.id,r])).values()]});
    try{state=read();}catch(e){writable=false;message='시나리오 기록을 읽지 못해 기존 기록을 덮어쓰지 않고 이번 방문에만 유지해요.';}
    function sync(){if(writable)try{state=merge(state,read());}catch(e){writable=false;message='저장소를 읽지 못해 이번 방문의 시나리오 기록만 유지해요.';}return state;}
    function save(next){if(writable)try{next=merge(read(),next);storage.setItem(KEY,JSON.stringify(next));}catch(e){writable=false;message='시나리오 기록을 저장하지 못했어요. 새로고침하면 이번 기록이 사라질 수 있어요.';}state=next;}
    return {get state(){return state;},get message(){return message;},sync,
      promote(eligible){sync();if(!eligible)return false;if(!state.promoted)save({...state,promoted:true});return true;},
      add(raw){sync();let r;try{r=record(raw);}catch(e){return false;}
        const time=Math.max(Date.now(),...state.records.map(r=>r.time+1)),id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():time.toString(36)+'-'+Math.random().toString(36).slice(2);
        save(merge(state,{...state,records:[{...r,id,time}]}));return true;
      }
    };
  }
  return {KEY,definitions,strategies,defaults,normalizeScenario,normalize,calculate,compare,sensitivity,record,create};
})();
if(typeof module!=='undefined')module.exports=Scenarios;
