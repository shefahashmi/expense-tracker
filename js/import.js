// ═══ IMPORT / EXPORT ══════════════════════════════════════════════════════════
function parseImport(text){
  const lines=text.trim().split('\n');let curDate=null;const entries=[];
  for(const raw of lines){
    const line=raw.trim();if(!line)continue;
    const dp=line.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if(dp){let d=+dp[1],mo=+dp[2],y=+dp[3];if(y<100)y+=2000;curDate=y+'-'+pad(mo)+'-'+pad(d);continue;}
    const ep=line.match(/^([\d,]+(?:\.\d+)?)\s*\/\-\s*(.+)$/);
    if(ep&&curDate)entries.push({id:uid(),date:curDate,label:ep[2].trim(),amount:parseFloat(ep[1].replace(/,/g,'')),cat:autoCat(ep[2].trim())});
  }
  return entries;
}
document.getElementById('import-run').addEventListener('click',()=>{
  const text=document.getElementById('import-ta').value,msg=document.getElementById('import-msg');
  msg.innerHTML='';
  if(!text.trim()){msg.innerHTML='<div class="import-err">⚠ Paste your expense log first.</div>';return;}
  const entries=parseImport(text);
  if(!entries.length){msg.innerHTML='<div class="import-err">⚠ No expenses found.</div>';return;}
  const importDates=new Set(entries.map(e=>e.date));
  expenses=expenses.filter(e=>!importDates.has(e.date));
  expenses=[...expenses,...entries];save();
  curMonth=entries[0].date.slice(0,7);
  msg.innerHTML='<div class="import-ok">✓ Imported '+entries.length+' expenses into '+ymFmt(curMonth)+'</div>';
  document.getElementById('import-ta').value='';
  toast('Imported '+entries.length,'ok');
  setTimeout(()=>goScreen('overview'),1200);
});
document.getElementById('import-clear').addEventListener('click',()=>{document.getElementById('import-ta').value='';document.getElementById('import-msg').innerHTML='';});
document.getElementById('back-to-settings').addEventListener('click',()=>goScreen('settings'));
document.getElementById('open-text-import-btn').addEventListener('click',()=>goScreen('import'));

// ── Export / Import sheets ──────────────────────────────────────────────────
function openSheet(sheetId, overlayId){ document.getElementById(sheetId).classList.add('open');document.getElementById(overlayId).classList.add('open'); }
function closeSheet(sheetId, overlayId){ document.getElementById(sheetId).classList.remove('open');document.getElementById(overlayId).classList.remove('open'); }

document.getElementById('export-btn').addEventListener('click',()=>openSheet('export-sheet','export-sheet-overlay'));
document.getElementById('export-sheet-overlay').addEventListener('click',()=>closeSheet('export-sheet','export-sheet-overlay'));
document.getElementById('import-btn').addEventListener('click',()=>openSheet('import-sheet','import-sheet-overlay'));
document.getElementById('import-sheet-overlay').addEventListener('click',()=>closeSheet('import-sheet','import-sheet-overlay'));

// JSON export
document.getElementById('export-json-btn').addEventListener('click',()=>{
  closeSheet('export-sheet','export-sheet-overlay');
  try{
    const data={version:3,exported:new Date().toISOString(),expenses,budgets,subscriptions:subsData,loans:loansData};
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    a.download='ledger-backup-'+todayStr()+'.json';a.click();
    document.getElementById('backup-msg').innerHTML='<div class="import-ok" style="margin-top:10px">✓ Exported '+expenses.length+' expenses, '+loansData.length+' loans, '+subsData.length+' subscriptions</div>';
    toast('JSON exported','ok');
  }catch(e){document.getElementById('backup-msg').innerHTML='<div class="import-err" style="margin-top:10px">⚠ Export failed</div>';}
});

// CSV export
document.getElementById('export-csv-btn').addEventListener('click',()=>{
  closeSheet('export-sheet','export-sheet-overlay');
  try{
    const expHdr=['Date','Description','Amount','Category','Month'];
    const expRows=expenses.slice().sort((a,b)=>a.date.localeCompare(b.date))
      .map(e=>[e.date,'"'+e.label.replace(/"/g,'""')+'"',e.amount.toFixed(2),e.cat,ymFmt(e.date.slice(0,7))]);
    const loanHdr=['Person','Type','Principal','Paid','Remaining','Status','Date Issued','Due Date','Note'];
    const loanRows=loansData.map(l=>[
      '"'+l.person.replace(/"/g,'""')+'"',
      l.type==='lent'?'Lent':'Borrowed',
      l.principal.toFixed(2),loanPaid(l).toFixed(2),loanRemaining(l).toFixed(2),
      l.status,l.date||'',l.dueDate||'','"'+(l.note||'').replace(/"/g,'""')+'"'
    ]);
    const NL='\n';const csv=['=== EXPENSES ===',expHdr.join(','),...expRows.map(r=>r.join(',')),'','=== LOANS ===',loanHdr.join(','),...loanRows.map(r=>r.join(','))].join(NL);
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download='ledger-backup-'+todayStr()+'.csv';a.click();
    document.getElementById('backup-msg').innerHTML='<div class="import-ok" style="margin-top:10px">✓ CSV exported ('+expenses.length+' expenses, '+loansData.length+' loans)</div>';
    toast('CSV exported','ok');
  }catch(e){document.getElementById('backup-msg').innerHTML='<div class="import-err" style="margin-top:10px">⚠ Export failed</div>';}
});

// JSON import
document.getElementById('import-json-btn').addEventListener('click',()=>{
  closeSheet('import-sheet','import-sheet-overlay');
  document.getElementById('json-file-input').value='';
  document.getElementById('json-file-input').click();
});

// json-import-card replaced by import-json-btn
document.getElementById('json-file-input').addEventListener('change',function(){
  const file=this.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const raw=JSON.parse(ev.target.result);
      const arr=raw.expenses||raw;
      if(!Array.isArray(arr))throw new Error('Invalid format');
      const valid=arr.filter(e=>e.id&&e.date&&typeof e.amount==='number'&&e.label&&e.cat);
      if(!valid.length)throw new Error('No valid entries');
      pendingJson={expenses:valid,budgets:raw.budgets||null,subscriptions:raw.subscriptions||null,loans:raw.loans||null};
      document.getElementById('json-confirm-sub').textContent='Found '+valid.length+' expense entries.';
      document.getElementById('json-confirm-overlay').classList.add('open');
    }catch(e){document.getElementById('backup-msg').innerHTML='<div class="import-err" style="margin-top:10px">⚠ '+e.message+'</div>';}
  };
  reader.readAsText(file);
});
document.getElementById('json-merge-btn').addEventListener('click',()=>{
  if(!pendingJson)return;
  const ids=new Set(expenses.map(e=>e.id));
  const newI=pendingJson.expenses.filter(e=>!ids.has(e.id));
  expenses=[...expenses,...newI];save();
  if(pendingJson.budgets){Object.assign(budgets,pendingJson.budgets);saveBudgets();}
  if(pendingJson.subscriptions){const sids=new Set(subsData.map(s=>s.id));subsData=[...subsData,...(pendingJson.subscriptions.filter(s=>!sids.has(s.id)))];saveSubs();}
  if(pendingJson.loans){const lids=new Set(loansData.map(l=>l.id));loansData=[...loansData,...(pendingJson.loans.filter(l=>!lids.has(l.id)))];saveLoans();}
  const ms=allM();if(ms.length)curMonth=ms[ms.length-1];
  document.getElementById('json-confirm-overlay').classList.remove('open');
  document.getElementById('backup-msg').innerHTML='<div class="import-ok" style="margin-top:10px">✓ Merged '+newI.length+' new entries</div>';
  pendingJson=null;toast('Merged '+newI.length+' entries','ok');render();
});
document.getElementById('json-replace-btn').addEventListener('click',()=>{
  if(!pendingJson)return;
  expenses=[...pendingJson.expenses];save();
  if(pendingJson.budgets){budgets=pendingJson.budgets;saveBudgets();}
  if(pendingJson.subscriptions){subsData=pendingJson.subscriptions;saveSubs();}
  if(pendingJson.loans){loansData=pendingJson.loans;saveLoans();}
  const ms=allM();if(ms.length)curMonth=ms[ms.length-1];
  document.getElementById('json-confirm-overlay').classList.remove('open');
  document.getElementById('backup-msg').innerHTML='<div class="import-ok" style="margin-top:10px">✓ Restored '+expenses.length+' entries</div>';
  pendingJson=null;toast('Restored','ok');render();
});
document.getElementById('json-cancel-btn').addEventListener('click',()=>{document.getElementById('json-confirm-overlay').classList.remove('open');pendingJson=null;});
document.getElementById('json-confirm-overlay').addEventListener('click',e=>{if(e.target===e.currentTarget){document.getElementById('json-confirm-overlay').classList.remove('open');pendingJson=null;}});