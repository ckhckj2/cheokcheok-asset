'use strict';
const Assumptions=(()=>{
  const model=typeof module!=='undefined'?require('./investment'):Investment;
  const KEY='cheokcheok.asset.assumptions.v1',area=20000;
  const cases=[
    {id:'A',name:'A · 같은 권역 오피스',rent:25000,vacancy:8,opex:10,area:20000,basis:'임대 가능 면적',source:'체결 계약 요약 · 3개월 전',note:'우리 건물처럼 준공 10년·보통 시설. 임대료는 무상 임대 기간을 반영한 실효 금액이에요.'},
    {id:'B',name:'B · 신축 오피스',rent:28000,vacancy:6,opex:11,area:20000,basis:'임대 가능 면적',source:'체결 계약 요약 · 1개월 전',note:'같은 권역이지만 준공 2년·좋은 시설. 신축 프리미엄을 우리 건물에 그대로 적용해도 될까요?'},
    {id:'C',name:'C · 외곽 오피스',rent:23000,vacancy:15,opex:9,area:20000,basis:'임대 가능 면적',source:'체결 계약 요약 · 6개월 전',note:'준공 12년으로 비슷하지만 역에서 더 멀어요. 입지와 조사 시점의 차이를 확인해야 해요.'},
    {id:'D',name:'D · 중심 상업시설',rent:32000,vacancy:4,opex:12,area:20000,basis:'연면적 · 환산 자료 없음',source:'매물 광고 희망가 · 현재',note:'용도·면적 기준이 다르고 체결 가격도 아니에요. 단순 평균에 넣기 어렵고, 추가 자료가 필요해요.'}
  ];
  const baseline={rent:25000,vacancy:10,opex:10};
  function normalize(raw){
    if(!raw||typeof raw!=='object')throw Error('가정을 확인해 주세요.');
    const n={};
    for(const [key,min,max] of [['rent',10000,50000],['vacancy',0,40],['opex',3,20]]){
      if(typeof raw[key]!=='number'||!Number.isFinite(raw[key])||raw[key]<min||raw[key]>max)throw Error('임대료·공실률·운영비의 입력 범위를 확인해 주세요.');n[key]=raw[key];
    }return n;
  }
  function calculate(raw){
    const input=normalize(raw),potential=area*input.rent*12/100000000,loss=potential*input.vacancy/100,revenue=potential-loss,noi=revenue-input.opex;
    const equity=330,debt=700,interest=28,annual=noi-interest,netSale=378;
    const flows=[-equity,annual,annual,annual+netSale],profit=annual*3+netSale-equity;
    return {input,potential,loss,revenue,noi,equity,debt,interest,annual,netSale,flows,profit,irr:model.irr(flows)};
  }
  function record(raw){
    const input=normalize(raw.input);
    if(!Array.isArray(raw.refs)||!raw.refs.length||raw.refs.some(id=>!cases.some(c=>c.id===id)))throw Error('비교 자료를 하나 이상 선택해 주세요.');
    const reasons={};for(const key of ['rent','vacancy','opex']){
      const value=raw.reasons?.[key];if(typeof value!=='string'||value.trim().length<10||value.length>1000)throw Error('각 가정의 근거를 10~1,000자로 적어 주세요.');reasons[key]=value.trim();
    }
    if(typeof raw.reflection!=='string'||raw.reflection.trim().length<10||raw.reflection.length>1000)throw Error('결과 복기를 10~1,000자로 적어 주세요.');
    return {input,refs:[...new Set(raw.refs)],reasons,reflection:raw.reflection.trim()};
  }
  function create(storage){
    let state={version:1,promoted:false,records:[]},message='',writable=true;
    function clean(raw){
      if(!raw||raw.version!==1||typeof raw.promoted!=='boolean'||!Array.isArray(raw.records))throw Error('Invalid assumptions record');
      const records=raw.records.flatMap(r=>{try{if(!r||typeof r.id!=='string'||r.id.length>100||!Number.isSafeInteger(r.time)||r.time<0)return [];return [{...record(r),id:r.id,time:r.time}];}catch(e){return [];}}).sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)).slice(-20);
      return {version:1,promoted:raw.promoted,records};
    }
    const read=()=>{const value=storage.getItem(KEY);return value===null?{version:1,promoted:false,records:[]}:clean(JSON.parse(value));};
    const merge=(a,b)=>clean({version:1,promoted:a.promoted||b.promoted,records:[...new Map([...a.records,...b.records].map(r=>[r.id,r])).values()]});
    try{state=read();}catch(e){writable=false;message='가정 기록을 읽지 못했어요. 기존 기록은 덮어쓰지 않고 이번 방문에만 유지해요.';}
    function sync(){if(writable)try{state=merge(state,read());}catch(e){writable=false;message='저장소를 읽지 못해 이번 방문의 기록만 유지해요.';}return state;}
    function save(next){if(writable)try{next=merge(read(),next);storage.setItem(KEY,JSON.stringify(next));}catch(e){writable=false;message='가정 기록을 저장하지 못했어요. 새로고침하면 이번 기록이 사라질 수 있어요.';}state=next;}
    return {get state(){return state;},get message(){return message;},sync,
      promote(eligible){sync();if(!eligible)return false;if(!state.promoted)save({...state,promoted:true});return true;},
      add(raw){sync();let r;try{r=record(raw);}catch(e){return false;}
        const time=Math.max(Date.now(),...state.records.map(r=>r.time+1)),id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():time.toString(36)+'-'+Math.random().toString(36).slice(2);
        save(merge(state,{...state,records:[{...r,id,time}]}));return true;
      }
    };
  }
  return {KEY,area,cases,baseline,normalize,calculate,record,create};
})();
if(typeof module!=='undefined')module.exports=Assumptions;
