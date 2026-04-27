// ═══ QUICK ADD ════════════════════════════════════════════════════════════════
function renderQuickAdd(){
  const seen=new Set(),recent=[];
  for(let i=expenses.length-1;i>=0&&recent.length<5;i--){
    const e=expenses[i],k=e.label+'|'+e.cat+'|'+e.amount;
    if(!seen.has(k)){seen.add(k);recent.push(e);}
  }
  const el=document.getElementById('quick-add-row');
  if(!recent.length){el.innerHTML='';return;}
  el.innerHTML='<div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--text3);text-transform:uppercase;margin-bottom:8px">Quick Add</div><div class="quick-strip">'+recent.map(e=>'<div class="quick-chip" data-label="'+esc(e.label)+'" data-cat="'+e.cat+'" data-amt="'+e.amount+'"><div class="quick-chip-lbl">'+cOf(e.cat).icon+' '+esc(e.label)+'</div><div class="quick-chip-sub">'+fmt(e.amount)+' · '+e.cat+'</div></div>').join('')+'</div>';
  el.querySelectorAll('.quick-chip').forEach(chip=>chip.addEventListener('click',()=>{
    expenses.push({id:uid(),date:todayStr(),label:chip.dataset.label,amount:parseFloat(chip.dataset.amt),cat:chip.dataset.cat});
    save();curMonth=todayStr().slice(0,7);toast('Added '+chip.dataset.label,'ok');render();
  }));
}

// ═══ LOG ══════════════════════════════════════════════════════════════════════
function hlText(text,q){
  if(!q)return esc(text);
  const re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
  return esc(text).replace(re,'<span class="hl">$1</span>');
}
document.getElementById('search-input').addEventListener('input',function(){searchQ=this.value.trim();render();});
document.getElementById('search-clear').addEventListener('click',()=>{document.getElementById('search-input').value='';searchQ='';render();});

function renderLog(me){
  renderQuickAdd();
  const used=[...new Set(me.map(e=>e.cat))];
  document.getElementById('filter-strip').innerHTML='<button class="fchip '+(filter==='ALL'?'active':'')+'" data-f="ALL">ALL</button>'+used.map(c=>'<button class="fchip '+(filter===c?'active':'')+'" data-f="'+c+'">'+cOf(c).icon+' '+c+'</button>').join('');
  document.querySelectorAll('.fchip').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.f;renderLog(me);}));
  let fil=filter==='ALL'?me:me.filter(e=>e.cat===filter);
  if(searchQ){const q=searchQ.toLowerCase();fil=(filter==='ALL'?expenses:expenses.filter(e=>e.cat===filter)).filter(e=>e.label.toLowerCase().includes(q));}
  const grp={};fil.forEach(e=>{if(!grp[e.date])grp[e.date]=[];grp[e.date].push(e);});
  const dates=Object.keys(grp).sort().reverse();
  const logEl=document.getElementById('log-list');
  if(!dates.length){logEl.innerHTML='<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">'+(searchQ?'No results':'No expenses')+'</div></div>';return;}
  let html=searchQ?'<div class="search-results-lbl">'+fil.length+' result'+(fil.length!==1?'s':'')+' for "'+esc(searchQ)+'"</div>':'';
  html+=dates.map(date=>{
    const items=grp[date],dt=items.reduce((s,e)=>s+e.amount,0);
    const dl=new Date(date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'}).toUpperCase();
    return '<div class="day-group"><div class="day-hdr"><span class="day-date-lbl">'+dl+'</span><span class="day-total-lbl">'+fmt(dt)+'</span></div>'+
      items.map(e=>{
        const c=cOf(e.cat);
        return '<div class="swipe-container"><div class="swipe-bg" data-del="'+e.id+'">Delete</div>'+
          '<div class="exp-row"><div class="exp-left"><span class="exp-icon">'+c.icon+'</span>'+
          '<div class="exp-info"><div class="exp-lbl">'+hlText(e.label,searchQ)+'</div><div class="exp-cat-tag">'+e.cat+'</div></div></div>'+
          '<span class="exp-amt" style="color:'+c.color+'">'+fmt(e.amount)+'</span>'+
          '<div class="exp-actions"><button class="edit-btn" data-id="'+e.id+'">✏️</button><button class="del-btn" data-id="'+e.id+'">✕</button></div>'+
          '</div></div>';
      }).join('')+'</div>';
  }).join('');
  logEl.innerHTML=html;
  logEl.querySelectorAll('.edit-btn').forEach(b=>b.addEventListener('click',ev=>{ev.stopPropagation();openEdit(b.dataset.id);}));
  logEl.querySelectorAll('.del-btn').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation();
    const item=expenses.find(e=>e.id===b.dataset.id);
    if(!item)return;
    openDel('Delete "'+item.label+'"?','You will have 5 seconds to undo.',()=>{
      undoItem={...item};
      expenses=expenses.filter(e=>e.id!==item.id);save();render();
      toast('Deleted "'+undoItem.label+'" — Undo?','err',true);
      clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5000);
    });
  }));
  attachSwipe();
}

function attachSwipe(){
  document.querySelectorAll('.swipe-container').forEach(con=>{
    const row=con.querySelector('.exp-row'),bg=con.querySelector('.swipe-bg');
    let sx=0,dx=0,active=false;const MAX=72;
    const start=e=>{const t=e.touches?e.touches[0]:e;sx=t.clientX;dx=0;active=true;};
    const move=e=>{if(!active)return;const t=e.touches?e.touches[0]:e;dx=Math.min(0,Math.max(-MAX,t.clientX-sx));row.style.transform='translateX('+dx+'px)';bg.style.opacity=String(Math.abs(dx)/MAX);if(Math.abs(dx)>5&&e.cancelable)e.preventDefault();};
    const end=()=>{
      if(!active)return;active=false;
      if(dx<-MAX*.6){
        row.style.transform='translateX(-'+MAX+'px)';
        const id=bg.dataset.del;
        setTimeout(()=>{
          const item=expenses.find(e=>e.id===id);
          row.style.transform='';bg.style.opacity='0';
          if(!item)return;
          openDel('Delete "'+item.label+'"?','You will have 5 seconds to undo.',()=>{
            undoItem={...item};expenses=expenses.filter(e=>e.id!==id);save();render();
            toast('Deleted "'+undoItem.label+'" — Undo?','err',true);
            clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5000);
          });
        },200);
      } else {row.style.transform='';bg.style.opacity='0';}
      dx=0;
    };
    row.addEventListener('touchstart',start,{passive:true});
    row.addEventListener('touchmove',move,{passive:false});
    row.addEventListener('touchend',end);
  });
}

// ═══ VALIDATION ═══════════════════════════════════════════════════════════════
function vDate(iId,eId,wId){
  const v=document.getElementById(iId).value,eEl=document.getElementById(eId),wEl=wId?document.getElementById(wId):null,inp=document.getElementById(iId);
  eEl.textContent='';if(wEl)wEl.textContent='';inp.classList.remove('err-input');
  if(!v){eEl.textContent='Required.';inp.classList.add('err-input');return false;}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v)){eEl.textContent='Invalid date.';inp.classList.add('err-input');return false;}
  if(wEl&&isFuture(v))wEl.textContent='⚠ Future date';
  return true;
}
function vAmt(iId,eId){
  const v=parseFloat(document.getElementById(iId).value),eEl=document.getElementById(eId),inp=document.getElementById(iId);
  eEl.textContent='';inp.classList.remove('err-input');
  if(isNaN(v)||v<=0){eEl.textContent='Enter amount > 0.';inp.classList.add('err-input');return false;}
  return true;
}
function vDesc(iId,eId){
  const v=document.getElementById(iId).value.trim(),eEl=document.getElementById(eId),inp=document.getElementById(iId);
  eEl.textContent='';inp.classList.remove('err-input');
  if(!v){eEl.textContent='Required.';inp.classList.add('err-input');return false;}
  return true;
}

// ═══ ADD EXPENSE ══════════════════════════════════════════════════════════════
function openAddExpense(){
  const sel=document.getElementById('add-cat');
  if(!sel.options.length)CKEYS.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=cOf(k).icon+' '+k;sel.appendChild(o);});
  document.getElementById('add-date').value=todayStr();
  document.getElementById('add-amt').value='';
  document.getElementById('add-desc').value='';
  ['add-date-err','add-date-warn','add-amt-err','add-desc-err'].forEach(id=>document.getElementById(id).textContent='');
  ['add-date','add-amt','add-desc'].forEach(id=>document.getElementById(id).classList.remove('err-input'));
  document.getElementById('add-expense-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('add-desc').focus(),120);
}
document.getElementById('add-expense-cancel').addEventListener('click',()=>document.getElementById('add-expense-overlay').classList.remove('open'));
document.getElementById('add-expense-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('add-expense-overlay').classList.remove('open');});
document.getElementById('add-save').addEventListener('click',()=>{
  if(!vDate('add-date','add-date-err','add-date-warn')||!vAmt('add-amt','add-amt-err')||!vDesc('add-desc','add-desc-err'))return;
  const date=document.getElementById('add-date').value,amt=parseFloat(document.getElementById('add-amt').value),desc=document.getElementById('add-desc').value.trim(),cat=document.getElementById('add-cat').value;
  expenses.push({id:uid(),date,label:desc,amount:amt,cat});save();
  curMonth=date.slice(0,7);
  document.getElementById('add-expense-overlay').classList.remove('open');
  toast('Saved!','ok');
  render();
});

// ═══ TOGGLE HELPER ════════════════════════════════════════════════════════════
function setToggle(el,state){el.classList.toggle('on',state);}

// ═══ EDIT EXPENSE ═════════════════════════════════════════════════════════════
function openEdit(id){
  const e=expenses.find(x=>x.id===id);if(!e)return;editingId=id;
  const sel=document.getElementById('edit-cat');
  if(!sel.options.length)CKEYS.forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=cOf(k).icon+' '+k;sel.appendChild(o);});
  document.getElementById('edit-date').value=e.date;
  document.getElementById('edit-amt').value=e.amount;
  document.getElementById('edit-desc').value=e.label;
  sel.value=e.cat;
  ['edit-date-err','edit-date-warn','edit-amt-err','edit-desc-err'].forEach(i=>document.getElementById(i).textContent='');
  ['edit-date','edit-amt','edit-desc'].forEach(i=>document.getElementById(i).classList.remove('err-input'));
  document.getElementById('edit-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('edit-desc').focus(),100);
}
document.getElementById('edit-cancel').addEventListener('click',()=>{document.getElementById('edit-overlay').classList.remove('open');editingId=null;});
document.getElementById('edit-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('edit-overlay').classList.remove('open');editingId=null;}});
document.getElementById('edit-save').addEventListener('click',()=>{
  if(!editingId)return;
  if(!vDate('edit-date','edit-date-err','edit-date-warn')||!vAmt('edit-amt','edit-amt-err')||!vDesc('edit-desc','edit-desc-err'))return;
  const idx=expenses.findIndex(x=>x.id===editingId);if(idx===-1)return;
  expenses[idx]={...expenses[idx],date:document.getElementById('edit-date').value,amount:parseFloat(document.getElementById('edit-amt').value),label:document.getElementById('edit-desc').value.trim(),cat:document.getElementById('edit-cat').value};
  save();curMonth=expenses[idx].date.slice(0,7);
  document.getElementById('edit-overlay').classList.remove('open');editingId=null;render();toast('Updated','ok');
});

// ═══ BUDGETS ══════════════════════════════════════════════════════════════════
function renderBudget(){
  const me=mExp(),cmap={};me.forEach(e=>{cmap[e.cat]=(cmap[e.cat]||0)+e.amount;});
  document.getElementById('budget-list').innerHTML=CKEYS.map(cat=>{
    const spent=cmap[cat]||0,limit=budgets[cat]||0,pct=limit>0?Math.min(spent/limit*100,100):0;
    const cls=pct>=100?'budget-over':pct>=75?'budget-warn':'budget-ok',c=cOf(cat);
    return '<div class="budget-row"><div class="budget-top"><div class="budget-name">'+c.icon+' '+cat+'</div>'+
      '<div style="display:flex;align-items:center;gap:8px"><div class="budget-nums">'+fmt(spent)+(limit>0?' / '+fmt(limit):'')+'</div>'+
      '<button class="budget-set-btn" data-cat="'+cat+'">'+(limit>0?'Edit':'Set')+'</button></div></div>'+
      (limit>0?'<div class="budget-track"><div class="budget-fill '+cls+'" style="width:'+pct.toFixed(1)+'%"></div></div>':'<div style="font-family:var(--mono);font-size:9px;color:var(--text3);margin-top:4px">No budget set</div>')+
      '</div>';
  }).join('');
  document.querySelectorAll('.budget-set-btn[data-cat]').forEach(b=>b.addEventListener('click',()=>openBudget(b.dataset.cat)));
  const bCats=CKEYS.filter(c=>budgets[c]||cmap[c]);
  destroyC('budget');
  if(bCats.length){
    charts.budget=new Chart(document.getElementById('budget-chart').getContext('2d'),{
      type:'bar',
      data:{labels:bCats.map(c=>c.split(' ')[0]),datasets:[
        {label:'Spent',data:bCats.map(c=>cmap[c]||0),backgroundColor:'#f97316',borderRadius:[4,4,0,0],borderSkipped:false},
        {label:'Budget',data:bCats.map(c=>budgets[c]||0),backgroundColor:'rgba(255,255,255,.08)',borderRadius:[4,4,0,0],borderSkipped:false}
      ]},
      options:{plugins:{legend:{display:true,labels:{color:'#555',font:{family:'DM Mono',size:9},boxWidth:10}},tooltip:{callbacks:{label:ctx=>' '+ctx.dataset.label+': '+fmt(ctx.raw)}}},scales:{x:{grid:GRID,ticks:TICK},y:{grid:GRID,ticks:{...TICK,callback:v=>currencySymbol+v}}},responsive:true,maintainAspectRatio:false}
    });
  }
}
function openBudget(cat){
  budgetCat=cat;
  document.getElementById('budget-modal-title').textContent='Budget: '+cat;
  document.getElementById('budget-input').value=budgets[cat]||'';
  document.getElementById('budget-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('budget-input').focus(),100);
}
document.getElementById('budget-cancel').addEventListener('click',()=>{document.getElementById('budget-overlay').classList.remove('open');budgetCat=null;});
document.getElementById('budget-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('budget-overlay').classList.remove('open');budgetCat=null;}});
document.getElementById('budget-save').addEventListener('click',()=>{
  if(!budgetCat)return;
  const val=parseFloat(document.getElementById('budget-input').value);
  if(val<=0||isNaN(val))delete budgets[budgetCat];else budgets[budgetCat]=val;
  saveBudgets();document.getElementById('budget-overlay').classList.remove('open');budgetCat=null;renderBudget();toast('Budget updated','ok');
});
document.getElementById('reset-budgets-btn').addEventListener('click',()=>{
  openDel('Reset all budgets?','All budget limits will be cleared.',()=>{budgets={};saveBudgets();renderBudget();toast('Budgets cleared','');},'Reset');
});

// ═══ SUBSCRIPTIONS ════════════════════════════════════════════════════════════
const CYCLE_MONTHS={monthly:1,quarterly:3,halfyearly:6,yearly:12};
const CYCLE_LABEL={monthly:'Monthly',quarterly:'Every 3 Months',halfyearly:'Every 6 Months',yearly:'Yearly'};

function toMonthly(amount,cycle){return amount/(CYCLE_MONTHS[cycle]||1);}
function toPeriodAmt(amount,cycle,vp){return toMonthly(amount,cycle)*(CYCLE_MONTHS[vp]||1);}

function calcNextBilling(s){
  const today=new Date();today.setHours(0,0,0,0);
  const cm=CYCLE_MONTHS[s.cycle||'monthly']||1;
  const anchor=s.lastPaidDate||s.nextBillingDate||s.startDate;
  if(anchor){
    let d=new Date(anchor+'T00:00:00');
    if(s.lastPaidDate){while(d<=today)d=new Date(d.getFullYear(),d.getMonth()+cm,d.getDate());}
    else if(d>today){return d;}
    else{while(d<=today)d=new Date(d.getFullYear(),d.getMonth()+cm,d.getDate());}
    return d;
  }
  return null;
}

function daysUntil(d){if(!d)return null;const t=new Date();t.setHours(0,0,0,0);return Math.round((d-t)/(864e5));}
function paymentHistory(s){return expenses.filter(e=>e.cat==='Subscriptions'&&e.label.toLowerCase()===s.name.toLowerCase()).sort((a,b)=>b.date.localeCompare(a.date));}

function renderSubs(){
  const active=subsData.filter(s=>s.status!=='cancelled');

  // Upcoming
  const upcoming=active.map(s=>({s,next:calcNextBilling(s),days:daysUntil(calcNextBilling(s))})).filter(x=>x.days!==null&&x.days>=0&&x.days<=14).sort((a,b)=>a.days-b.days);
  const upEl=document.getElementById('subs-upcoming');
  if(upcoming.length){
    upEl.innerHTML='<div style="background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.25);border-radius:var(--r-sm);padding:12px;margin-top:14px"><div style="font-family:var(--mono);font-size:9px;letter-spacing:2px;color:var(--warn);text-transform:uppercase;margin-bottom:8px">⏰ Upcoming Billing</div>'+
      upcoming.map(({s,next,days})=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(234,179,8,.15)"><div><div style="font-size:13px;color:var(--text)">'+esc(s.name)+'</div><div style="font-family:var(--mono);font-size:9px;color:var(--text3);margin-top:2px">Due '+fmtDate(next)+'</div></div><div style="text-align:right;display:flex;align-items:center;gap:10px"><div><div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--success)">'+fmt(s.amount)+'</div><div class="upcoming-badge">'+(days===0?'Today':days===1?'Tomorrow':days+' days')+'</div></div><button class="subs-action-btn" data-spay="'+s.id+'" style="padding:5px 10px;white-space:nowrap">✓ Paid</button></div></div>').join('')+
    '</div>';
    upEl.querySelectorAll('[data-spay]').forEach(b=>b.addEventListener('click',()=>openSubsPaid(b.dataset.spay)));
  } else {
    upEl.innerHTML='';
  }

  // List
  const listEl=document.getElementById('subs-list');
  if(!subsData.length){listEl.innerHTML='<div class="empty" style="padding:20px 0"><div class="empty-icon">💳</div><div class="empty-text">No subscriptions yet</div></div>';return;}
  listEl.innerHTML=subsData.map(s=>{
    const statusCls='status-'+(s.status||'active');
    const statusLbl=(s.status||'active').charAt(0).toUpperCase()+(s.status||'active').slice(1);
    const next=calcNextBilling(s);
    const nextLabel=next?'Next: '+fmtDate(next):'Add next billing date';
    const startInfo=s.startDate?'Since '+new Date(s.startDate+'T00:00:00').toLocaleDateString('en-IN',{month:'short',year:'numeric'}):'';
    const hist=paymentHistory(s);
    const histLabel=hist.length?hist.length+' payment'+(hist.length>1?'s':'')+' · '+fmt(hist.reduce((t,e)=>t+e.amount,0))+' total':'';
    return '<div class="subs-item">'+
      '<div class="subs-item-top"><div style="flex:1;min-width:0"><div class="subs-item-name">'+esc(s.name)+'</div></div>'+
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0"><div class="subs-item-amt">'+fmt(s.amount)+'</div><span class="subs-status '+statusCls+'">'+statusLbl+'</span></div></div>'+
      '<div class="subs-item-meta">'+
        '<span>🔄 '+CYCLE_LABEL[s.cycle||'monthly']+'</span>'+
        '<span>📅 '+fmt(toMonthly(s.amount,s.cycle||'monthly'))+'/mo</span>'+
        '<span style="color:'+(next&&daysUntil(next)<=7?'var(--warn)':'var(--text3)')+'">📆 '+nextLabel+'</span>'+
        (startInfo?'<span>🗓 '+startInfo+'</span>':'')+
        (histLabel?'<span>💰 '+histLabel+'</span>':'')+
      '</div>'+
      '<div class="subs-item-actions">'+
        '<button class="subs-action-btn" data-sedit="'+s.id+'">✏️ Edit</button>'+
        '<button class="subs-action-btn" data-spay="'+s.id+'" style="color:var(--success);border-color:rgba(20,184,166,.3)">✓ Paid</button>'+
        '<button class="subs-action-btn" data-stoggle="'+s.id+'">'+(s.status==='paused'?'▶ Resume':'⏸ Pause')+'</button>'+
        '<button class="subs-action-btn" data-sdel="'+s.id+'" style="color:var(--danger);border-color:rgba(244,63,94,.2)">✕</button>'+
      '</div></div>';
  }).join('');
  listEl.querySelectorAll('[data-sedit]').forEach(b=>b.addEventListener('click',()=>openSubsEdit(b.dataset.sedit)));
  listEl.querySelectorAll('[data-spay]').forEach(b=>b.addEventListener('click',()=>openSubsPaid(b.dataset.spay)));
  listEl.querySelectorAll('[data-stoggle]').forEach(b=>b.addEventListener('click',()=>{
    const s=subsData.find(x=>x.id===b.dataset.stoggle);if(!s)return;
    s.status=s.status==='paused'?'active':'paused';saveSubs();renderSubs();
  }));
  listEl.querySelectorAll('[data-sdel]').forEach(b=>b.addEventListener('click',()=>{
    const s=subsData.find(x=>x.id===b.dataset.sdel);if(!s)return;
    openDel('Remove "'+s.name+'"?','This subscription will be deleted.',()=>{
      subsData=subsData.filter(x=>x.id!==s.id);saveSubs();renderSubs();toast('Removed','ok');
    });
  }));

  // Summary
  const vp=subsPeriod;
  const activeOnly=subsData.filter(s=>s.status==='active');
  const totalB=activeOnly.reduce((s,x)=>s+toPeriodAmt(x.amount,x.cycle||'monthly',vp),0);
  const cutoff=new Date();cutoff.setMonth(cutoff.getMonth()-CYCLE_MONTHS[vp]);
  const totalA=expenses.filter(e=>e.cat==='Subscriptions'&&new Date(e.date+'T00:00:00')>=cutoff).reduce((s,e)=>s+e.amount,0);
  const diff=totalA-totalB;
  document.getElementById('subs-kpi').innerHTML=
    '<div class="subs-kpi"><div class="subs-kpi-lbl">Budgeted</div><div class="subs-kpi-val">'+fmt(totalB)+'</div><div class="subs-kpi-sub">'+CYCLE_LABEL[vp]+'</div></div>'+
    '<div class="subs-kpi"><div class="subs-kpi-lbl">Actually Spent</div><div class="subs-kpi-val" style="color:'+(diff>0?'var(--danger)':'var(--success)')+'">'+fmt(totalA)+'</div><div class="subs-kpi-sub" style="color:'+(diff>0?'var(--danger)':'var(--success)')+'">'+( diff>0?'▲ '+fmt(Math.abs(diff))+' over':diff<0?'▼ '+fmt(Math.abs(diff))+' under':'On budget')+'</div></div>';
  const maxAmt=Math.max(...activeOnly.map(s=>toPeriodAmt(s.amount,s.cycle||'monthly',vp)),1);
  document.getElementById('subs-breakdown').innerHTML=activeOnly.length?activeOnly.map(s=>{
    const pa=toPeriodAmt(s.amount,s.cycle||'monthly',vp);
    const pct=totalB>0?(pa/totalB*100).toFixed(1):0;
    const w=(pa/maxAmt*100).toFixed(1);
    return '<div class="subs-bar-row"><div class="subs-bar-top"><div class="subs-bar-label">'+esc(s.name)+'</div><div class="subs-bar-val">'+fmt(pa)+' <span style="font-size:9px;color:var(--text3)">'+pct+'%</span></div></div><div class="subs-bar-track"><div class="subs-bar-fill" style="width:'+w+'%"></div></div></div>';
  }).join(''):'<div style="font-family:var(--mono);font-size:10px;color:var(--text3);text-align:center;padding:14px">No active subscriptions</div>';

  destroyC('subs');
  const subExp=expenses.filter(e=>e.cat==='Subscriptions');
  if(subExp.length){
    const mmap={};subExp.forEach(e=>{const m=e.date.slice(0,7);mmap[m]=(mmap[m]||0)+e.amount;});
    const months=Object.keys(mmap).sort();
    charts.subs=new Chart(document.getElementById('subs-chart').getContext('2d'),{
      type:'bar',
      data:{labels:months.map(m=>ymFmt(m).slice(0,3)+' '+m.slice(2,4)),datasets:[{data:months.map(m=>mmap[m]),backgroundColor:'#14b8a6',borderRadius:4,borderSkipped:false}]},
      options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+fmt(ctx.raw)}}},scales:{x:{grid:GRID,ticks:TICK},y:{grid:GRID,ticks:{...TICK,callback:v=>currencySymbol+v}}},responsive:true,maintainAspectRatio:false}
    });
  }
  document.getElementById('subs-period-select').value=vp;
}

// Add subscription
document.getElementById('subs-add-btn').addEventListener('click',()=>{
  const name=document.getElementById('subs-name').value.trim();
  const amount=parseFloat(document.getElementById('subs-amt').value);
  const cycle=document.getElementById('subs-cycle').value;
  const nextBillingDate=document.getElementById('subs-next-billing').value;
  const startDate=document.getElementById('subs-start').value;
  if(!name||isNaN(amount)||amount<=0){toast('Enter name and amount','err');return;}
  subsData.push({id:uid(),name,amount,cycle,nextBillingDate:nextBillingDate||'',startDate:startDate||'',status:'active'});
  saveSubs();
  document.getElementById('subs-name').value='';
  document.getElementById('subs-amt').value='';
  document.getElementById('subs-next-billing').value='';
  document.getElementById('subs-start').value='';
  renderSubs();toast('Added '+name,'ok');
});
document.getElementById('subs-period-select').addEventListener('change',function(){subsPeriod=this.value;renderSubs();});

// Edit subscription
function openSubsEdit(id){
  const s=subsData.find(x=>x.id===id);if(!s)return;editingSubId=id;
  document.getElementById('se-name').value=s.name;
  document.getElementById('se-amt').value=s.amount;
  document.getElementById('se-cycle').value=s.cycle||'monthly';
  document.getElementById('se-next-billing').value=s.nextBillingDate||'';
  document.getElementById('se-start').value=s.startDate||'';
  document.getElementById('se-status').value=s.status||'active';
  updateSePreview();
  document.getElementById('subs-edit-overlay').classList.add('open');
}
function updateSePreview(){
  const preview={cycle:document.getElementById('se-cycle').value,nextBillingDate:document.getElementById('se-next-billing').value,startDate:document.getElementById('se-start').value,lastPaidDate:(editingSubId?subsData.find(x=>x.id===editingSubId)?.lastPaidDate:null)||''};
  const next=calcNextBilling(preview);
  const el=document.getElementById('se-next-preview');
  if(el)el.textContent=next?fmtDate(next):'Set next billing date for accurate preview';
}
['se-cycle','se-next-billing','se-start'].forEach(id=>{
  document.getElementById(id)?.addEventListener('change',updateSePreview);
  document.getElementById(id)?.addEventListener('input',updateSePreview);
});
document.getElementById('se-cancel').addEventListener('click',()=>{document.getElementById('subs-edit-overlay').classList.remove('open');editingSubId=null;});
document.getElementById('subs-edit-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('subs-edit-overlay').classList.remove('open');editingSubId=null;}});
document.getElementById('se-save').addEventListener('click',()=>{
  if(!editingSubId)return;
  const idx=subsData.findIndex(x=>x.id===editingSubId);if(idx===-1)return;
  const name=document.getElementById('se-name').value.trim();
  const amount=parseFloat(document.getElementById('se-amt').value);
  if(!name||isNaN(amount)||amount<=0){toast('Enter valid name and amount','err');return;}
  subsData[idx]={...subsData[idx],name,amount,cycle:document.getElementById('se-cycle').value,nextBillingDate:document.getElementById('se-next-billing').value,startDate:document.getElementById('se-start').value,status:document.getElementById('se-status').value};
  saveSubs();document.getElementById('subs-edit-overlay').classList.remove('open');editingSubId=null;renderSubs();toast('Updated','ok');
});

// Mark as paid
function openSubsPaid(id){
  const s=subsData.find(x=>x.id===id);if(!s)return;payingSubId=id;
  document.getElementById('subs-paid-sub').textContent=s.name+' — '+fmt(s.amount);
  document.getElementById('subs-paid-date').value=todayStr();
  document.getElementById('subs-paid-amt').value=s.amount;
  document.getElementById('subs-paid-overlay').classList.add('open');
}
document.getElementById('subs-paid-cancel').addEventListener('click',()=>{document.getElementById('subs-paid-overlay').classList.remove('open');payingSubId=null;});
document.getElementById('subs-paid-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('subs-paid-overlay').classList.remove('open');payingSubId=null;}});
document.getElementById('subs-paid-confirm').addEventListener('click',()=>{
  if(!payingSubId)return;
  const s=subsData.find(x=>x.id===payingSubId);if(!s)return;
  const date=document.getElementById('subs-paid-date').value;
  const amount=parseFloat(document.getElementById('subs-paid-amt').value);
  if(!date||isNaN(amount)||amount<=0){toast('Enter valid date and amount','err');return;}
  expenses.push({id:uid(),date,label:s.name,amount,cat:'Subscriptions'});save();
  const idx=subsData.findIndex(x=>x.id===payingSubId);
  if(idx!==-1){
    subsData[idx].lastPaidDate=date;
    const next=calcNextBilling({...subsData[idx],lastPaidDate:date});
    if(next){const y=next.getFullYear(),mo=pad(next.getMonth()+1),d=pad(next.getDate());subsData[idx].nextBillingDate=y+'-'+mo+'-'+d;}
    saveSubs();
  }
  payingSubId=null;document.getElementById('subs-paid-overlay').classList.remove('open');
  const next=calcNextBilling(subsData[idx]??{});
  toast('Paid '+fmt(amount)+(next?' — Next: '+fmtDate(next):''),'ok');
  curMonth=date.slice(0,7);renderSubs();render();
});

// ═══ MONTHS ════════════════════════════════════════════════════════════════════
function renderMonths(){
  const ms=allM();
  const data=ms.map(m=>({m,label:ymFmt(m),year:m.slice(0,4),total:expenses.filter(e=>mOf(e)===m).reduce((s,e)=>s+e.amount,0),count:expenses.filter(e=>mOf(e)===m).length}));
  const maxT=Math.max(...data.map(d=>d.total),1);
  destroyC('month');
  if(data.length){
    charts.month=new Chart(document.getElementById('month-chart').getContext('2d'),{
      type:'bar',
      data:{labels:data.map(d=>d.label.slice(0,3)),datasets:[{data:data.map(d=>d.total),backgroundColor:'#f97316',borderRadius:5,borderSkipped:false}]},
      options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+fmt(ctx.raw)}}},scales:{x:{grid:GRID,ticks:TICK},y:{grid:GRID,ticks:{...TICK,callback:v=>currencySymbol+v}}},responsive:true,maintainAspectRatio:false}
    });
  }
  const byYear={};
  [...data].reverse().forEach(d=>{if(!byYear[d.year])byYear[d.year]=[];byYear[d.year].push(d);});
  let html='<div class="card-title">All Months</div>';
  if(!data.length)html+='<div class="empty"><div class="empty-icon">📅</div><div class="empty-text">No data yet</div></div>';
  else Object.entries(byYear).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([year,months])=>{
    const yT=months.reduce((s,d)=>s+d.total,0),yC=months.reduce((s,d)=>s+d.count,0);
    html+='<div class="year-hdr"><div class="year-hdr-left"><span class="year-hdr-label">'+year+'</span><span class="year-hdr-sub">'+yC+' entries · '+fmt(yT)+'</span></div><button class="del-year-btn" data-year="'+year+'">✕ Delete '+year+'</button></div>';
    html+=months.map(d=>'<div class="month-row'+(d.m===curMonth?' cur':'')+'" data-month="'+d.m+'">'+
      '<div style="flex:1;min-width:0"><div class="month-row-name">'+d.label+'</div><div class="month-mini-bar"><div class="month-mini-fill" style="width:'+(d.total/maxT*100).toFixed(1)+'%"></div></div></div>'+
      '<div style="text-align:right;flex-shrink:0;margin-left:10px"><div class="month-row-val">'+fmt(d.total)+'</div><div class="month-row-ct">'+d.count+' entries</div></div>'+
      '<button class="del-month-btn" data-month="'+d.m+'">✕</button></div>').join('');
  });
  document.getElementById('month-list').innerHTML=html;
  document.querySelectorAll('.month-row').forEach(r=>r.addEventListener('click',ev=>{if(ev.target.closest('.del-month-btn'))return;curMonth=r.dataset.month;goScreen('overview');}));
  document.querySelectorAll('.del-month-btn').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation();
    const ym=b.dataset.month,label=ymFmt(ym),count=expenses.filter(e=>mOf(e)===ym).length;
    if(!count)return;
    openDel('Delete '+label+'?',count+' entries will be removed.',()=>{
      const prev=[...expenses];
      expenses=expenses.filter(e=>mOf(e)!==ym);save();
      const ms2=allM();curMonth=ms2.length?ms2[ms2.length-1]:new Date().toISOString().slice(0,7);
      renderMonths();render();
      undoItem={_type:'expenses_bulk',_data:prev};
      toast('Deleted '+label+' — Undo?','err',true);
      clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5500);
    });
  }));
  document.querySelectorAll('.del-year-btn').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation();
    const year=b.dataset.year,count=expenses.filter(e=>e.date.startsWith(year)).length;
    if(!count)return;
    openDel('Delete all of '+year+'?',count+' entries across all months.',()=>{
      const prev=[...expenses];
      expenses=expenses.filter(e=>!e.date.startsWith(year));save();
      const ms2=allM();curMonth=ms2.length?ms2[ms2.length-1]:new Date().toISOString().slice(0,7);
      renderMonths();render();
      undoItem={_type:'expenses_bulk',_data:prev};
      toast('Deleted '+year+' — Undo?','err',true);
      clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5500);
    });
  }));
}

// ═══ LOANS ════════════════════════════════════════════════════════════════════
function loanPaid(l){return(l.payments||[]).reduce((s,p)=>s+p.amount,0);}
function loanRemaining(l){return Math.max(0,l.principal-loanPaid(l));}
function loanOverdue(l){
  if(l.status==='settled'||!l.dueDate)return false;
  return new Date(l.dueDate+'T00:00:00')<new Date(todayStr()+'T00:00:00')&&loanRemaining(l)>0;
}
function loanDaysOverdue(l){
  if(!loanOverdue(l))return 0;
  const due=new Date(l.dueDate+'T00:00:00'),today=new Date();today.setHours(0,0,0,0);
  return Math.floor((today-due)/864e5);
}

function renderLoans(){
  const active=loansData.filter(l=>l.status!=='settled');
  const lentAmt=active.filter(l=>l.type==='lent').reduce((s,l)=>s+loanRemaining(l),0);
  const borrowAmt=active.filter(l=>l.type==='borrowed').reduce((s,l)=>s+loanRemaining(l),0);
  const net=lentAmt-borrowAmt;

  const kpiEl=document.getElementById('loans-kpi'),netArea=document.getElementById('loan-net-area');
  if(loansData.length){
    kpiEl.style.display='grid';
    kpiEl.innerHTML='<div class="loan-kpi"><div class="loan-kpi-lbl">Owed to You</div><div class="loan-kpi-val" style="color:var(--success)">'+fmt(lentAmt)+'</div><div class="loan-kpi-sub">'+active.filter(l=>l.type==='lent').length+' active</div></div>'+
      '<div class="loan-kpi"><div class="loan-kpi-lbl">You Owe</div><div class="loan-kpi-val" style="color:var(--danger)">'+fmt(borrowAmt)+'</div><div class="loan-kpi-sub">'+active.filter(l=>l.type==='borrowed').length+' active</div></div>';
    netArea.innerHTML='<div class="loan-net" style="margin-bottom:14px"><div class="loan-net-lbl">Net Position</div><div class="loan-net-val">'+fmt(Math.abs(net))+'</div><div style="font-family:var(--mono);font-size:9px;color:var(--accent);margin-top:3px">'+(net>0?'You are owed more':net<0?'You owe more':'Balanced')+'</div></div>';
  } else {
    kpiEl.style.display='none';netArea.innerHTML='';
  }

  let filtered=loansData;
  if(loanTab==='lent')filtered=loansData.filter(l=>l.type==='lent'&&l.status!=='settled');
  else if(loanTab==='borrowed')filtered=loansData.filter(l=>l.type==='borrowed'&&l.status!=='settled');
  else if(loanTab==='settled')filtered=loansData.filter(l=>l.status==='settled');
  else filtered=loansData.filter(l=>l.status!=='settled');

  const el=document.getElementById('loans-list');
  if(!filtered.length){el.innerHTML='<div class="empty"><div class="empty-icon">🤝</div><div class="empty-text">'+(loanTab==='settled'?'No settled loans':'No active loans')+'</div></div>';return;}

  filtered=filtered.slice().sort((a,b)=>{
    if(loanOverdue(a)&&!loanOverdue(b))return -1;
    if(!loanOverdue(a)&&loanOverdue(b))return 1;
    if(a.dueDate&&b.dueDate)return a.dueDate.localeCompare(b.dueDate);
    return 0;
  });

  el.innerHTML=filtered.map(loan=>{
    const paid=loanPaid(loan),remaining=loanRemaining(loan),pct=loan.principal>0?Math.min(paid/loan.principal*100,100):0;
    const ov=loanOverdue(loan),daysOD=loanDaysOverdue(loan);
    const today=new Date();today.setHours(0,0,0,0);
    const dtd=loan.dueDate?Math.ceil((new Date(loan.dueDate+'T00:00:00')-today)/864e5):null;
    const badgeCls=loan.status==='settled'?'badge-settled':ov?'badge-overdue':'badge-active';
    const badgeTxt=loan.status==='settled'?'Settled':ov?'Overdue '+daysOD+'d':'Active';
    let dueStr='';
    if(loan.dueDate&&loan.status!=='settled'){
      if(ov)dueStr='<span class="loan-overdue-text">⚠ '+daysOD+' day'+(daysOD!==1?'s':'')+' overdue</span>';
      else if(dtd===0)dueStr='<span style="color:var(--warn)">Due today</span>';
      else if(dtd<=7)dueStr='<span style="color:var(--warn)">Due in '+dtd+' days ('+fmtDate(new Date(loan.dueDate+'T00:00:00'))+')</span>';
      else dueStr='<span>Due '+fmtDate(new Date(loan.dueDate+'T00:00:00'))+'</span>';
    }
    const pmts=loan.payments||[];
    const pmtHtml=pmts.length?pmts.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>
      '<div class="loan-payment-row"><span style="flex:1">'+fmtDate(new Date(p.date+'T00:00:00'))+(p.note?' · '+esc(p.note):'')+'</span>'+
      '<span style="color:var(--success);font-weight:600">'+fmt(p.amount)+'</span>'+
      '<button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:2px 4px;flex-shrink:0" data-ep-loan="'+loan.id+'" data-ep-id="'+p.id+'">✏️</button></div>'
    ).join(''):'<div style="font-family:var(--mono);font-size:10px;color:var(--text3);padding:4px 0">No payments yet</div>';

    return '<div class="loan-card'+(loan.status==='settled'?' settled':ov?' overdue':'')+'" id="lcard-'+loan.id+'">'+
      '<div class="loan-top"><div><div class="loan-name">'+esc(loan.person)+'</div>'+
      '<div style="font-family:var(--mono);font-size:9px;color:var(--text3);margin-top:2px">'+(loan.type==='lent'?'Lent':'Borrowed')+(loan.date?' · '+fmtDate(new Date(loan.date+'T00:00:00')):'')+(loan.note?' · '+esc(loan.note):'')+'</div></div>'+
      '<span class="loan-badge '+badgeCls+'">'+badgeTxt+'</span></div>'+
      '<div class="loan-amounts">'+
        '<div class="loan-amt-box"><div class="loan-amt-lbl">Principal</div><div class="loan-amt-val" style="color:var(--text2)">'+fmt(loan.principal)+'</div></div>'+
        '<div class="loan-amt-box"><div class="loan-amt-lbl">Paid</div><div class="loan-amt-val" style="color:var(--success)">'+fmt(paid)+'</div></div>'+
        '<div class="loan-amt-box"><div class="loan-amt-lbl">Remaining</div><div class="loan-amt-val" style="color:'+(ov?'var(--danger)':remaining>0?'var(--accent)':'var(--success)')+'">'+fmt(remaining)+'</div></div>'+
      '</div>'+
      '<div class="loan-progress-track"><div class="loan-progress-fill" style="width:'+pct.toFixed(1)+'%;background:'+(ov?'var(--danger)':'var(--success)')+'"></div></div>'+
      '<div class="loan-meta">'+(dueStr||'')+(pmts.length?'<span>💰 '+pmts.length+' payment'+(pmts.length!==1?'s':'')+'</span>':'')+'</div>'+
      (loan.status!=='settled'?
        '<div class="loan-actions">'+
          '<button class="loan-action-btn" data-lpay="'+loan.id+'">💸 Payment</button>'+
          '<button class="loan-action-btn" data-ledit="'+loan.id+'">✏️ Edit</button>'+
          '<button class="loan-action-btn" data-lsettle="'+loan.id+'">✓ Settle</button>'+
          '<button class="loan-action-btn" data-ldel="'+loan.id+'" style="color:var(--danger);border-color:rgba(244,63,94,.2)">✕</button>'+
        '</div>'
      :
        '<div class="loan-actions">'+
          '<button class="loan-action-btn" data-lreopen="'+loan.id+'">↩ Reopen</button>'+
          '<button class="loan-action-btn" data-ldel="'+loan.id+'" style="color:var(--danger);border-color:rgba(244,63,94,.2)">✕ Delete</button>'+
        '</div>'
      )+
      '<div class="loan-payments-toggle" data-ltoggle="'+loan.id+'"><span>Payment History</span><span id="ltarrow-'+loan.id+'">'+(pmts.length?'▲':'▼')+'</span></div>'+
      '<div class="loan-payments'+(pmts.length?' open':'')+'" id="lpay-'+loan.id+'">'+pmtHtml+'</div>'+
    '</div>';
  }).join('');

  // Wire events
  el.querySelectorAll('[data-lpay]').forEach(b=>b.addEventListener('click',()=>{
    const l=loansData.find(x=>x.id===b.dataset.lpay);if(!l)return;
    payingLoanId=b.dataset.lpay;
    document.getElementById('loan-payment-sub').textContent=l.person+' — Remaining: '+fmt(loanRemaining(l));
    document.getElementById('lp-amount').value=loanRemaining(l).toFixed(2);
    document.getElementById('lp-date').value=todayStr();
    document.getElementById('lp-note').value='';
    document.getElementById('loan-payment-overlay').classList.add('open');
  }));
  el.querySelectorAll('[data-ledit]').forEach(b=>b.addEventListener('click',()=>{
    const l=loansData.find(x=>x.id===b.dataset.ledit);if(!l)return;
    editingLoanId=b.dataset.ledit;
    document.getElementById('el-person').value=l.person;
    document.getElementById('el-amount').value=l.principal;
    document.getElementById('el-date').value=l.date||'';
    document.getElementById('el-due').value=l.dueDate||'';
    document.getElementById('el-note').value=l.note||'';
    document.getElementById('edit-loan-overlay').classList.add('open');
  }));
  el.querySelectorAll('[data-lsettle]').forEach(b=>b.addEventListener('click',()=>{
    const l=loansData.find(x=>x.id===b.dataset.lsettle);if(!l)return;
    const rem=loanRemaining(l);
    openDel(
      'Settle "'+l.person+'" loan?',
      rem>0?'Record final payment of '+fmt(rem)+' and mark as settled.':'Mark loan as fully settled.',
      ()=>{
        const prev=JSON.parse(JSON.stringify(loansData));
        // Auto-record remaining as final payment
        if(rem>0){
          if(!l.payments)l.payments=[];
          l.payments.push({id:uid(),amount:rem,date:todayStr(),note:'Final settlement'});
        }
        l.status='settled';
        saveLoans();renderLoans();renderOvLoanSummary();
        undoItem={_type:'loans_bulk',_data:prev};
        toast('Settled — Undo?','ok',true);
        clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5500);
      },
      'Settle'
    );
  }));
  el.querySelectorAll('[data-ldel]').forEach(b=>b.addEventListener('click',()=>{
    const l=loansData.find(x=>x.id===b.dataset.ldel);if(!l)return;
    openDel('Delete "'+l.person+'" loan?','All payments will also be removed.',()=>{
      const prev=JSON.parse(JSON.stringify(loansData));
      loansData=loansData.filter(x=>x.id!==b.dataset.ldel);saveLoans();renderLoans();renderOvLoanSummary();
      undoItem={_type:'loans_bulk',_data:prev};
      toast('Deleted "'+l.person+'" — Undo?','err',true);
      clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5500);
    });
  }));
  el.querySelectorAll('[data-lreopen]').forEach(b=>b.addEventListener('click',()=>{
    const l=loansData.find(x=>x.id===b.dataset.lreopen);if(!l)return;
    l.status='active';saveLoans();renderLoans();renderOvLoanSummary();toast('Loan reopened','ok');
  }));
  el.querySelectorAll('[data-ltoggle]').forEach(b=>b.addEventListener('click',()=>{
    const pane=document.getElementById('lpay-'+b.dataset.ltoggle);
    const arrow=document.getElementById('ltarrow-'+b.dataset.ltoggle);
    if(!pane)return;
    pane.classList.toggle('open');
    if(arrow)arrow.textContent=pane.classList.contains('open')?'▲':'▼';
  }));
  el.querySelectorAll('[data-ep-loan]').forEach(b=>b.addEventListener('click',ev=>{
    ev.stopPropagation();
    openEditPayment(b.dataset.epLoan,b.dataset.epId);
  }));
}

// Loan payment
document.getElementById('lp-save').addEventListener('click',()=>{
  if(!payingLoanId)return;
  const l=loansData.find(x=>x.id===payingLoanId);if(!l)return;
  const amount=parseFloat(document.getElementById('lp-amount').value);
  const date=document.getElementById('lp-date').value;
  const note=document.getElementById('lp-note').value.trim();
  if(isNaN(amount)||amount<=0||!date){toast('Enter valid amount and date','err');return;}
  if(!l.payments)l.payments=[];
  l.payments.push({id:uid(),amount,date,note});
  if(loanRemaining(l)<=0)l.status='settled';
  saveLoans();payingLoanId=null;
  document.getElementById('loan-payment-overlay').classList.remove('open');
  renderLoans();renderOvLoanSummary();toast('Payment of '+fmt(amount)+' recorded','ok');
});
document.getElementById('lp-cancel').addEventListener('click',()=>{document.getElementById('loan-payment-overlay').classList.remove('open');payingLoanId=null;});
document.getElementById('loan-payment-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('loan-payment-overlay').classList.remove('open');payingLoanId=null;}});

// Edit loan
document.getElementById('el-save').addEventListener('click',()=>{
  if(!editingLoanId)return;
  const idx=loansData.findIndex(x=>x.id===editingLoanId);if(idx===-1)return;
  const person=document.getElementById('el-person').value.trim();
  const principal=parseFloat(document.getElementById('el-amount').value);
  if(!person||isNaN(principal)||principal<=0){toast('Enter valid name and amount','err');return;}
  loansData[idx]={...loansData[idx],person,principal,date:document.getElementById('el-date').value,dueDate:document.getElementById('el-due').value,note:document.getElementById('el-note').value.trim()};
  saveLoans();editingLoanId=null;document.getElementById('edit-loan-overlay').classList.remove('open');renderLoans();renderOvLoanSummary();toast('Loan updated','ok');
});
document.getElementById('el-cancel').addEventListener('click',()=>{document.getElementById('edit-loan-overlay').classList.remove('open');editingLoanId=null;});
document.getElementById('edit-loan-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('edit-loan-overlay').classList.remove('open');editingLoanId=null;}});

// Add loan
document.getElementById('add-loan-save').addEventListener('click',()=>{
  const person=document.getElementById('loan-person').value.trim();
  const principal=parseFloat(document.getElementById('loan-amount').value);
  const type=document.getElementById('loan-type').value;
  const date=document.getElementById('loan-date').value;
  const dueDate=document.getElementById('loan-due').value;
  const note=document.getElementById('loan-note').value.trim();
  if(!person||isNaN(principal)||principal<=0){toast('Enter person name and amount','err');return;}
  loansData.push({id:uid(),person,type,principal,date:date||todayStr(),dueDate,note,status:'active',payments:[]});
  saveLoans();
  ['loan-person','loan-amount','loan-date','loan-due','loan-note'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('add-loan-overlay').classList.remove('open');
  if(screen==='loans')renderLoans();
  renderOvLoanSummary();
  toast('Loan added for '+person,'ok');
});
document.getElementById('add-loan-cancel').addEventListener('click',()=>document.getElementById('add-loan-overlay').classList.remove('open'));
document.getElementById('add-loan-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget)document.getElementById('add-loan-overlay').classList.remove('open');});

// Edit payment
function openEditPayment(loanId,paymentId){
  const l=loansData.find(x=>x.id===loanId);if(!l)return;
  const p=(l.payments||[]).find(x=>x.id===paymentId);if(!p)return;
  editingPaymentLoanId=loanId;editingPaymentId=paymentId;
  document.getElementById('ep-sub').textContent='Payment for '+l.person;
  document.getElementById('ep-amount').value=p.amount;
  document.getElementById('ep-date').value=p.date;
  document.getElementById('ep-note').value=p.note||'';
  document.getElementById('edit-loan-payment-overlay').classList.add('open');
}
document.getElementById('ep-cancel').addEventListener('click',()=>{document.getElementById('edit-loan-payment-overlay').classList.remove('open');editingPaymentLoanId=null;editingPaymentId=null;});
document.getElementById('edit-loan-payment-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('edit-loan-payment-overlay').classList.remove('open');editingPaymentLoanId=null;editingPaymentId=null;}});
document.getElementById('ep-save').addEventListener('click',()=>{
  if(!editingPaymentLoanId||!editingPaymentId)return;
  const l=loansData.find(x=>x.id===editingPaymentLoanId);if(!l)return;
  const idx=(l.payments||[]).findIndex(x=>x.id===editingPaymentId);if(idx===-1)return;
  const amount=parseFloat(document.getElementById('ep-amount').value);
  const date=document.getElementById('ep-date').value;
  if(isNaN(amount)||amount<=0||!date){toast('Enter valid amount and date','err');return;}
  l.payments[idx]={...l.payments[idx],amount,date,note:document.getElementById('ep-note').value.trim()};
  if(l.status==='settled'&&loanRemaining(l)>0)l.status='active';
  if(l.status==='active'&&loanRemaining(l)<=0)l.status='settled';
  saveLoans();document.getElementById('edit-loan-payment-overlay').classList.remove('open');editingPaymentLoanId=null;editingPaymentId=null;renderLoans();renderOvLoanSummary();toast('Payment updated','ok');
});
document.getElementById('ep-delete').addEventListener('click',()=>{
  if(!editingPaymentLoanId||!editingPaymentId)return;
  // Close edit modal first so del-overlay isn't behind it
  const capLoanId=editingPaymentLoanId,capPayId=editingPaymentId;
  document.getElementById('edit-loan-payment-overlay').classList.remove('open');
  editingPaymentLoanId=null;editingPaymentId=null;
  setTimeout(()=>{
    openDel('Delete this payment?','This cannot be undone.',()=>{
      const l=loansData.find(x=>x.id===capLoanId);if(!l)return;
      l.payments=(l.payments||[]).filter(x=>x.id!==capPayId);
      if(l.status==='settled'&&loanRemaining(l)>0)l.status='active';
      saveLoans();renderLoans();renderOvLoanSummary();toast('Payment deleted','ok');
    });
  },50);
});