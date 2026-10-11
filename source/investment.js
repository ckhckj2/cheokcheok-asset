'use strict';
const Investment=(()=>{
  const KEY='cheokcheok.asset.investment.v1';
  const operations={hold:{label:'현재 임대 유지',rent:60,opex:10,upfront:0},improve:{label:'시설 개선',rent:66,opex:11,upfront:20},cautious:{label:'보수적 임대 가정',rent:54,opex:10,upfront:0}};
  const baseline={price:1000,ltv:70,rate:4,operation:'hold',years:3,sale:1100};
  function normalize(raw){
    if(!raw||typeof raw!=='object')throw Error('조건을 확인해 주세요.');
    const n={};for(const [key,min,max] of [['price',500,1500],['rate',1,12],['sale',0,2000]]){
      if(typeof raw[key]!=='number'||!Number.isFinite(raw[key])||raw[key]<min||raw[key]>max)throw Error('입력 범위를 확인해 주세요.');n[key]=raw[key];}
    if(![50,60,70].includes(raw.ltv)||![3,5].includes(raw.years)||!Object.hasOwn(operations,raw.operation))throw Error('선택한 조건을 확인해 주세요.');
    return {...n,ltv:raw.ltv,years:raw.years,operation:raw.operation};
  }
  function irr(flows){
    // A single sign change yields one IRR for these annual investment flows.
    // Other sign patterns return null rather than selecting an ambiguous root.
    const signs=flows.filter(v=>v!==0).map(v=>Math.sign(v));
    if(!flows.every(Number.isFinite)||flows[0]>=0||signs.at(-1)!==1||signs.slice(1).filter((v,i)=>v!==signs[i]).length!==1)return null;
    const npv=r=>flows.reduce((sum,v,i)=>sum+v/(1+r)**i,0);
    let low=-.9999,high=1;while(npv(high)>0&&high<1024)high*=2;
    if(npv(low)<0||npv(high)>0)return null;
    for(let i=0;i<120;i++){const mid=(low+high)/2;if(npv(mid)>0)low=mid;else high=mid;}
    return (low+high)/2;
  }
  function calculate(raw){
    const input=normalize(raw),op=operations[input.operation],debt=input.price*input.ltv/100,buyCost=input.price*.03,exitCost=input.sale*.02;
    const equity=input.price+buyCost+op.upfront-debt,noi=op.rent-op.opex,interest=debt*input.rate/100,annual=noi-interest;
    const netSale=input.sale-exitCost-debt;
    const flows=[-equity,...Array.from({length:input.years},(_,i)=>annual+(i===input.years-1?netSale:0))];
    const profit=annual*input.years+netSale-equity,returnOnEquity=profit/equity;
    const warnings=[];
    if(annual<0)warnings.push('운영에서 남는 돈으로 이자를 모두 내지 못해요. 추가 자금이 필요할 수 있어요.');
    if(annual===0)warnings.push('이자는 낼 수 있지만 여유 현금이 없어요. 수입 감소나 추가 비용에 대비해야 해요.');
    if(netSale<0)warnings.push('매각대금에서 비용을 빼도 대출을 전부 갚지 못해요. 부족한 돈을 따로 마련해야 해요.');
    if(profit<0)warnings.push('이 가정에서는 전체 회수액이 처음 넣은 돈보다 적어요.');
    if(input.ltv===70)warnings.push('대출이 건물 가격의 70%예요. 가격·수입이 내려갈 때 자기자본 손실이 커질 수 있어요.');
    return {input,debt,buyCost,exitCost,equity,noi,interest,annual,netSale,flows,profit,returnOnEquity,irr:irr(flows),warnings};
  }
  function create(storage){
    let records=[],message='',writable=true;
    function clean(raw){
      if(!raw||raw.version!==1||!Array.isArray(raw.records))throw Error('Invalid investment record');
      // Reject a partially damaged snapshot so the next write cannot erase its rows.
      return raw.records.map(r=>{
        if(!r||typeof r.id!=='string'||r.id.length>=100||!Number.isSafeInteger(r.time)||r.time<0||!['invest','hold'].includes(r.decision)||typeof r.reason!=='string'||r.reason.trim().length<10||r.reason.length>1000||typeof r.reflection!=='string'||r.reflection.trim().length<10||r.reflection.length>1000)throw Error('Invalid investment entry');
        return {id:r.id,time:r.time,input:normalize(r.input),decision:r.decision,reason:r.reason,reflection:r.reflection};
      }).sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)).slice(-20);
    }
    const read=()=>{const value=storage.getItem(KEY);return value===null?[]:clean(JSON.parse(value));};
    const merge=(a,b)=>clean({version:1,records:[...new Map([...a,...b].map(r=>[r.id,r])).values()]});
    try{records=read();}catch(error){writable=false;message='투자 연습 기록을 읽지 못해 이번 방문의 기록만 유지해요. 기존 기록은 덮어쓰지 않아요.';}
    const sync=()=>{if(writable){try{records=merge(records,read());}catch(error){writable=false;message='저장소를 읽지 못해 이번 방문의 투자 기록만 유지해요.';}}return records;};
    return {get records(){return records;},get message(){return message;},sync,
      add(raw){sync();let input;try{input=normalize(raw.input);}catch(error){return false;}
        if(!['invest','hold'].includes(raw.decision)||typeof raw.reason!=='string'||raw.reason.trim().length<10||raw.reason.length>1000||typeof raw.reflection!=='string'||raw.reflection.trim().length<10||raw.reflection.length>1000)return false;
        const time=Math.max(Date.now(),...records.map(r=>r.time+1)),id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():time.toString(36)+'-'+Math.random().toString(36).slice(2);
        let next=merge(records,[{id,time,input,decision:raw.decision,reason:raw.reason.trim(),reflection:raw.reflection.trim()}]);
        if(writable){try{next=merge(read(),next);storage.setItem(KEY,JSON.stringify({version:1,records:next}));}catch(error){writable=false;message='투자 기록을 저장하지 못했어요. 새로고침하면 이번 기록이 사라질 수 있어요.';}}
        records=next;return true;
      }
    };
  }
  return {KEY,baseline,operations,normalize,calculate,irr,create};
})();
if(typeof module!=='undefined')module.exports=Investment;
