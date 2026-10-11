'use strict';
// Public content-review mode only. This flag grants no account or server permissions.
const ReviewMode=(()=>{
  const KEY='cheokcheok.asset.review.v1';let enabled=false;
  try{enabled=window.sessionStorage.getItem(KEY)==='on';}catch(error){}
  return {KEY,get enabled(){return enabled;},set(value){enabled=Boolean(value);try{if(enabled)window.sessionStorage.setItem(KEY,'on');else window.sessionStorage.removeItem(KEY);}catch(error){}return enabled;}};
})();
