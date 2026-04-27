// ═══ CONSTANTS ════════════════════════════════════════════════════════════════
const CATS={'Food & Snacks':{color:'#f97316',icon:'🍜'},'Transport':{color:'#3b82f6',icon:'🚇'},'Personal Care':{color:'#a855f7',icon:'✂️'},'Shopping':{color:'#ec4899',icon:'🛍️'},'Subscriptions':{color:'#14b8a6',icon:'💳'},'Utilities':{color:'#eab308',icon:'📱'},'Health':{color:'#22c55e',icon:'💊'},'Entertainment':{color:'#f43f5e',icon:'🎬'},'Other':{color:'#94a3b8',icon:'📦'}};
const CKEYS=Object.keys(CATS);
const MLONG=['January','February','March','April','May','June','July','August','September','October','November','December'];
const SK='ledger_v3',SK_B='ledger_budgets',SK_S='ledger_subs_v2',SK_L='ledger_loans_v1',SK_C='ledger_currency';

// ═══ STATE ════════════════════════════════════════════════════════════════════
let expenses=[],budgets={},subsData=[],loansData=[];
let curMonth=new Date().toISOString().slice(0,7);
let filter='ALL',screen='overview',activePane='pane-budgets',subsPeriod='monthly',loanTab='all';
let editingId=null,delId=null,pendingJson=null,budgetCat=null;
let editingSubId=null,payingSubId=null;
let editingLoanId=null,payingLoanId=null,editingPaymentLoanId=null,editingPaymentId=null;
let undoItem=null,undoTimer=null,charts={};
let searchQ='',isDark=true;
let currencyCode='INR',currencySymbol='₹';
let _pendingDelFn=null;

// ═══ UTILS ════════════════════════════════════════════════════════════════════
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad=n=>String(n).padStart(2,'0');
const ymFmt=ym=>{const[y,m]=ym.split('-');return MLONG[+m-1]+' '+y;};
const mOf=e=>e.date.slice(0,7);
const allM=()=>[...new Set(expenses.map(mOf))].sort();
const mExp=()=>expenses.filter(e=>mOf(e)===curMonth);
const cOf=k=>CATS[k]||CATS['Other'];
const todayStr=()=>new Date().toISOString().slice(0,10);
const isFuture=d=>d>todayStr();
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fmtDate=d=>`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;

function fmt(n){
  const locale=currencyCode==='INR'?'en-IN':'en-US';
  return currencySymbol+Number(n).toLocaleString(locale,{minimumFractionDigits:2,maximumFractionDigits:2});
}

function autoCat(l){
  const lc=l.toLowerCase();
  if(/parking|metro|auto|cab|bus|train|uber|ola|rickshaw|fuel|petrol/.test(lc))return'Transport';
  if(/airtel|jio|vi|recharge|broadband|internet|electric|water|gas|bill/.test(lc))return'Utilities';
  if(/netflix|spotify|claude|prime|hotstar|subscription|membership|adobe/.test(lc))return'Subscriptions';
  if(/haircut|salon|spa|grooming|barber|parlour/.test(lc))return'Personal Care';
  if(/amazon|flipkart|cover|tempered|wallet|cloth|shirt|shoe|bag|shop|myntra/.test(lc))return'Shopping';
  if(/doctor|medicine|hospital|pharmacy|clinic|chemist/.test(lc))return'Health';
  if(/movie|cinema|concert|theatre/.test(lc))return'Entertainment';
  if(/pizza|chicken|burger|biryani|food|bhujia|zeera|momos|fries|muri|jhalmuri|banana|fruit|snack|roll|cake|coffee|chai|tea|dosa|kebab|tikka|popcorn|sweet/.test(lc))return'Food & Snacks';
  return'Other';
}

// ═══ STORAGE ══════════════════════════════════════════════════════════════════
function save(){try{localStorage.setItem(SK,JSON.stringify(expenses));}catch(e){}}
function saveBudgets(){try{localStorage.setItem(SK_B,JSON.stringify(budgets));}catch(e){}}
function saveSubs(){try{localStorage.setItem(SK_S,JSON.stringify(subsData));}catch(e){}}
function saveLoans(){try{localStorage.setItem(SK_L,JSON.stringify(loansData));}catch(e){}}
function saveCurrency(){try{localStorage.setItem(SK_C,currencyCode+'|'+currencySymbol);}catch(e){}}
function load(){try{const d=localStorage.getItem(SK);if(d){expenses=JSON.parse(d);return;}}catch(e){}expenses=[];}
function loadBudgets(){try{const d=localStorage.getItem(SK_B);if(d){budgets=JSON.parse(d);return;}}catch(e){}budgets={};}
function loadSubs(){try{const d=localStorage.getItem(SK_S);if(d){subsData=JSON.parse(d);return;}}catch(e){}subsData=[];}
function loadLoans(){try{const d=localStorage.getItem(SK_L);if(d){loansData=JSON.parse(d);return;}}catch(e){}loansData=[];}
function loadCurrency(){try{const d=localStorage.getItem(SK_C);if(d){const p=d.split('|');currencyCode=p[0];currencySymbol=p[1]||p[0];}}catch(e){}}

// ═══ CURRENCY ═════════════════════════════════════════════════════════════════
function applyCurrency(code,symbol){
  currencyCode=code;currencySymbol=symbol||code;
  saveCurrency();
  const sub=document.getElementById('currency-sub');
  if(sub)sub.textContent=`${code} (${symbol||code})`;
  // Update all amount labels
  const sym=symbol||code;
  [['add-amt-lbl','Amount ('+sym+')'],['edit-amt-lbl','Amount ('+sym+')'],
   ['subs-amt-lbl','Amount ('+sym+')'],['se-amt-lbl','Amount ('+sym+')'],
   ['subs-paid-amt-lbl','Amount ('+sym+')'],['loan-amt-lbl','Amount ('+sym+')'],
   ['lp-amt-lbl','Amount ('+sym+')'],['el-amt-lbl','Original Amount ('+sym+')'],
   ['ep-amt-lbl','Amount ('+sym+')'],['budget-input-lbl','Monthly Budget ('+sym+')']
  ].forEach(([id,txt])=>{const el=document.getElementById(id);if(el)el.textContent=txt;});
  // Re-render
  render();
  if(screen==='budget')renderActiveBudgetPane();
  if(screen==='loans')renderLoans();
}

document.getElementById('currency-select').addEventListener('change',function(){
  const val=this.value;
  const customRow=document.getElementById('currency-custom-row');
  if(val==='OTHER|'){
    customRow.style.display='block';
    document.getElementById('currency-custom-input').focus();
  } else {
    customRow.style.display='none';
    const p=val.split('|');
    applyCurrency(p[0],p[1]);
    toast('Currency set to '+p[0],'ok');
  }
});
document.getElementById('currency-custom-save').addEventListener('click',()=>{
  const code=document.getElementById('currency-custom-input').value.trim().toUpperCase();
  if(!code||code.length<2){toast('Enter a valid currency code','err');return;}
  applyCurrency(code,code);
  toast('Currency set to '+code,'ok');
});