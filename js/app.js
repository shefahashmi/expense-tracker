// ═══ THEME ════════════════════════════════════════════════════════════════════
function applyTheme(dark){
  isDark=dark;
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  document.getElementById('theme-color-meta').content=dark?'#0a0a0a':'#f5f4f0';
  const ico=dark?'🌙':'☀️';
  ['sd-theme','mh-theme'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=ico;});
  const si=document.getElementById('settings-theme-icon');if(si)si.textContent=ico;
  const ss=document.getElementById('settings-theme-sub');if(ss)ss.textContent=dark?'Dark mode':'Light mode';
  try{localStorage.setItem('ledger_theme',dark?'dark':'light');}catch(e){}
}
document.getElementById('sd-theme').addEventListener('click',()=>applyTheme(!isDark));
document.getElementById('mh-theme').addEventListener('click',()=>applyTheme(!isDark));
document.getElementById('theme-toggle-row').addEventListener('click',()=>applyTheme(!isDark));

// ═══ TOAST ════════════════════════════════════════════════════════════════════
let tT;
function toast(msg,type='',undoable=false){
  const el=document.getElementById('toast');
  document.getElementById('toast-msg').textContent=msg;
  el.className='toast show'+(type?' '+type:'');
  document.getElementById('toast-undo-btn').style.display=undoable?'inline-block':'none';
  clearTimeout(tT);tT=setTimeout(()=>{el.className='toast';},undoable?5500:2400);
}

// ═══ DELETE OVERLAY (unified) ═════════════════════════════════════════════════
function openDel(title,sub,onConfirm,confirmLabel){
  // Close any other open overlay first so del-overlay is always on top
  document.querySelectorAll('.overlay.open').forEach(o=>{
    if(o.id!=='del-overlay')o.classList.remove('open');
  });
  document.getElementById('del-title').textContent=title;
  document.getElementById('del-sub').textContent=sub||"You'll have 5 seconds to undo.";
  const btn=document.getElementById('del-confirm');
  btn.textContent=confirmLabel||'Delete';
  btn.className='pri-btn '+(confirmLabel&&confirmLabel!=='Delete'?'':'danger-btn');
  _pendingDelFn=onConfirm;
  delId=null;
  document.getElementById('del-overlay').classList.add('open');
}
document.getElementById('del-cancel').addEventListener('click',()=>{
  document.getElementById('del-overlay').classList.remove('open');
  delId=null;_pendingDelFn=null;
});
document.getElementById('del-confirm').addEventListener('click',()=>{
  document.getElementById('del-overlay').classList.remove('open');
  if(_pendingDelFn){const fn=_pendingDelFn;_pendingDelFn=null;fn();return;}
  if(!delId)return;
  const item=expenses.find(e=>e.id===delId);
  if(!item){delId=null;return;}
  undoItem={...item};expenses=expenses.filter(e=>e.id!==delId);save();delId=null;
  render();
  toast('Deleted "'+undoItem.label+'" — Undo?','err',true);
  clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoItem=null;},5000);
});
document.getElementById('del-overlay').addEventListener('click',e=>{
  if(e.target===e.currentTarget){document.getElementById('del-overlay').classList.remove('open');delId=null;_pendingDelFn=null;}
});

// ═══ UNDO ═════════════════════════════════════════════════════════════════════
document.getElementById('toast-undo-btn').addEventListener('click',()=>{
  if(!undoItem)return;
  clearTimeout(undoTimer);
  document.getElementById('toast').className='toast';
  if(undoItem._type==='expenses_bulk'){
    expenses=undoItem._data;save();
    const ms=allM();if(ms.length)curMonth=ms[ms.length-1];
    render();if(screen==='budget')renderActiveBudgetPane();
  } else if(undoItem._type==='loans_bulk'){
    loansData=undoItem._data;saveLoans();
    renderLoans();renderOvLoanSummary();
  } else {
    // single expense
    const m=undoItem.date.slice(0,7);
    expenses.push(undoItem);expenses.sort((a,b)=>a.date.localeCompare(b.date));save();curMonth=m;
    render();
  }
  undoItem=null;
  toast('Restored','ok');
});

// ═══ NAVIGATION ═══════════════════════════════════════════════════════════════
function goScreen(name){
  screen=name;searchQ='';
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('[data-screen]').forEach(el=>el.classList.toggle('active',el.dataset.screen===name));
  const sc=document.getElementById('screen-'+name);
  if(sc)sc.classList.add('active');
  render();
  if(name==='budget')renderActiveBudgetPane();
  if(name==='loans')renderLoans();
}

function renderActiveBudgetPane(){
  if(activePane==='pane-budgets')renderBudget();
  else if(activePane==='pane-subs')renderSubs();
  else if(activePane==='pane-months')renderMonths();
}

// Inner tabs (Budget)
document.querySelectorAll('.inner-tab[data-pane]').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.inner-tab[data-pane]').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  activePane=t.dataset.pane;
  document.querySelectorAll('.inner-pane').forEach(p=>p.classList.remove('active'));
  document.getElementById(t.dataset.pane).classList.add('active');
  renderActiveBudgetPane();
}));

// Loan tabs
document.querySelectorAll('[data-loan-tab]').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('[data-loan-tab]').forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  loanTab=t.dataset.loanTab;
  renderLoans();
}));

// Nav
function chMonth(dir){const ms=allM(),i=ms.indexOf(curMonth)+dir;if(i>=0&&i<ms.length){curMonth=ms[i];render();}}
['sd-prev','mh-prev'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>chMonth(-1)));
['sd-next','mh-next'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>chMonth(1)));
document.querySelectorAll('[data-screen]').forEach(el=>el.addEventListener('click',()=>goScreen(el.dataset.screen)));

// FAB
function openFabSheet(){
  document.getElementById('fab-sheet').classList.add('open');
  document.getElementById('fab-sheet-overlay').classList.add('open');
}
function closeFabSheet(){
  document.getElementById('fab-sheet').classList.remove('open');
  document.getElementById('fab-sheet-overlay').classList.remove('open');
}
document.getElementById('fab').addEventListener('click',openFabSheet);
document.getElementById('sd-add').addEventListener('click',openFabSheet);
document.getElementById('fab-sheet-overlay').addEventListener('click',closeFabSheet);
document.getElementById('fab-add-expense').addEventListener('click',()=>{closeFabSheet();openAddExpense();});
document.getElementById('fab-add-loan').addEventListener('click',()=>{
  closeFabSheet();
  document.getElementById('loan-date').value=todayStr();
  document.getElementById('add-loan-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('loan-person').focus(),120);
});

// Inner tab swipe (mobile — budget and loan panes only)
(function(){
  const BUDGET_PANES=['pane-budgets','pane-subs','pane-months'];
  const LOAN_TABS=['all','lent','borrowed','settled'];
  let tx=0,ty=0,sw=false,mv=false;
  const THR=55,MY=70;
  document.addEventListener('touchstart',e=>{
    if(screen!=='budget'&&screen!=='loans')return;
    if(e.target.closest('input,textarea,select,button,.finput,.loan-card'))return;
    tx=e.touches[0].clientX;ty=e.touches[0].clientY;sw=true;mv=false;
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!sw)return;
    const dx=e.touches[0].clientX-tx,dy=Math.abs(e.touches[0].clientY-ty);
    if(Math.abs(dx)>8)mv=true;
    if(mv&&Math.abs(dx)>dy&&dy<MY&&e.cancelable)e.preventDefault();
  },{passive:false});
  document.addEventListener('touchend',e=>{
    if(!sw||!mv){sw=false;return;}
    const dx=e.changedTouches[0].clientX-tx,dy=Math.abs(e.changedTouches[0].clientY-ty);
    sw=false;mv=false;
    if(Math.abs(dx)<THR||dy>MY)return;
    if(screen==='budget'){
      const i=BUDGET_PANES.indexOf(activePane),next=dx<0?BUDGET_PANES[i+1]:BUDGET_PANES[i-1];
      if(!next)return;
      const tab=document.querySelector('.inner-tab[data-pane="'+next+'"]');
      if(tab)tab.click();
    } else if(screen==='loans'){
      const i=LOAN_TABS.indexOf(loanTab),next=dx<0?LOAN_TABS[i+1]:LOAN_TABS[i-1];
      if(!next)return;
      const tab=document.querySelector('[data-loan-tab="'+next+'"]');
      if(tab)tab.click();
    }
  },{passive:true});
})();

// ═══ SETTINGS ═════════════════════════════════════════════════════════════════
document.getElementById('clear-all-btn').addEventListener('click',()=>{
  openDel('Clear ALL data?','Every expense, subscription and loan will be deleted.',()=>{
    expenses=[];save();budgets={};saveBudgets();subsData=[];saveSubs();loansData=[];saveLoans();
    curMonth=new Date().toISOString().slice(0,7);
    toast('All data cleared','err');goScreen('overview');
  });
});

// ═══ KEYBOARD ═════════════════════════════════════════════════════════════════
document.addEventListener('keydown',e=>{
  const active=document.activeElement,typing=active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName);
  if(typing)return;
  if(e.key==='Escape'){document.querySelectorAll('.overlay.open').forEach(o=>o.classList.remove('open'));closeFabSheet();return;}
  if(e.key==='n'||e.key==='N'){openAddExpense();return;}
  if(e.key==='/'){e.preventDefault();goScreen('log');setTimeout(()=>document.getElementById('search-input').focus(),120);return;}
  if(e.key==='o'||e.key==='O'){goScreen('overview');return;}
});

// ═══ iOS HINT ═════════════════════════════════════════════════════════════════
(function(){
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.navigator.standalone===true,dismissed=localStorage.getItem('ios_dismissed');
  if(isIOS&&!standalone&&!dismissed)document.getElementById('ios-hint').classList.add('show');
  document.getElementById('ios-close').addEventListener('click',()=>{document.getElementById('ios-hint').classList.remove('show');localStorage.setItem('ios_dismissed','1');});
})();

// ═══ BOOT ═════════════════════════════════════════════════════════════════════
load();loadBudgets();loadSubs();loadLoans();loadCurrency();
try{const t=localStorage.getItem('ledger_theme');applyTheme(t!=='light');}catch(e){applyTheme(true);}
// Sync currency UI
(function(){
  const sel=document.getElementById('currency-select');
  let matched=false;
  for(let i=0;i<sel.options.length;i++){
    if(sel.options[i].value.startsWith(currencyCode+'|')){sel.value=sel.options[i].value;matched=true;break;}
  }
  if(!matched){sel.value='OTHER|';document.getElementById('currency-custom-row').style.display='block';document.getElementById('currency-custom-input').value=currencyCode;}
  document.getElementById('currency-sub').textContent=currencyCode+' ('+currencySymbol+')';
  // Update amount labels with loaded currency
  applyCurrency(currencyCode,currencySymbol);
})();
const _ms=allM();if(_ms.length)curMonth=_ms[_ms.length-1];
goScreen('overview');