// ═══ RENDER ═══════════════════════════════════════════════════════════════════
const TICK={color:'#555',font:{family:'DM Mono',size:9}};
const GRID={color:'#1a1a1a'};
function destroyC(k){if(charts[k]){try{charts[k].destroy();}catch(e){}charts[k]=null;}}

function render(){
  const me=mExp(),total=me.reduce((s,e)=>s+e.amount,0),lbl=ymFmt(curMonth);
  ['sd-month','mh-month'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=lbl;});
  ['sd-total','mh-total'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=fmt(total);});
  if(screen==='overview')renderOv(me,total);
  if(screen==='log')renderLog(me);
}

// Weekly helpers
function wkBounds(off=0){
  const n=new Date(),d=n.getDay()||7;
  const m=new Date(n);m.setDate(n.getDate()-(d-1)+off*7);
  const s=new Date(m);s.setDate(m.getDate()+6);
  const f=x=>x.toISOString().slice(0,10);
  return{s:f(m),e:f(s)};
}
function wkTotal(s,e){return expenses.filter(x=>x.date>=s&&x.date<=e).reduce((a,b)=>a+b.amount,0);}

// ═══ OVERVIEW ═════════════════════════════════════════════════════════════════
function renderOv(me,total){
  const big=me.length?me.reduce((a,b)=>b.amount>a.amount?b:a):null;
  const now=new Date();
  const isCurrentMonth=curMonth===now.toISOString().slice(0,7);
  const daysInMonth=new Date(+curMonth.slice(0,4),+curMonth.slice(5,7),0).getDate();
  const dayOfMonth=isCurrentMonth?now.getDate():daysInMonth;
  const daysLeft=isCurrentMonth?daysInMonth-dayOfMonth:0;
  const dailyAvg=dayOfMonth>0?total/dayOfMonth:0;
  const projected=isCurrentMonth?dailyAvg*daysInMonth:total;

  // Build cmap/cats early — used by both glance narrative and category section
  const cmap={};me.forEach(e=>{cmap[e.cat]=(cmap[e.cat]||0)+e.amount;});
  const cats=Object.entries(cmap).sort((a,b)=>b[1]-a[1]),maxC=cats[0]?.[1]||1;

  // ── Mobile KPI grid (always shown) ──────────────────────────────────────
  document.getElementById('kpi-grid').innerHTML=
    '<div class="kpi"><div class="kpi-lbl">Total</div><div class="kpi-val">'+fmt(total)+'</div><div class="kpi-sub">'+me.length+' entries</div></div>'+
    '<div class="kpi"><div class="kpi-lbl">Daily Avg</div><div class="kpi-val" style="font-size:13px">'+fmt(dailyAvg)+'</div><div class="kpi-sub">per day</div></div>'+
    '<div class="kpi"><div class="kpi-lbl">Biggest</div><div class="kpi-val" style="font-size:13px">'+(big?fmt(big.amount):'—')+'</div><div class="kpi-sub">'+(big?esc(big.label):'')+'</div></div>';

  // ── Desktop stat bar ─────────────────────────────────────────────────────
  const statBar=document.getElementById('ov-stat-bar');
  if(statBar){
    // Month vs previous month comparison
    const prevMonth=new Date(+curMonth.slice(0,4),+curMonth.slice(5,7)-2,1);
    const prevYM=prevMonth.getFullYear()+'-'+pad(prevMonth.getMonth()+1);
    const prevTotal=expenses.filter(e=>mOf(e)===prevYM).reduce((s,e)=>s+e.amount,0);
    const momDiff=prevTotal>0?((total-prevTotal)/prevTotal*100):0;
    const momDir=momDiff>0?'up':momDiff<0?'down':'same';
    const momTxt=momDir==='up'?'▲ '+Math.abs(momDiff).toFixed(0)+'% vs '+ymFmt(prevYM).split(' ')[0]:
                 momDir==='down'?'▼ '+Math.abs(momDiff).toFixed(0)+'% vs '+ymFmt(prevYM).split(' ')[0]:
                 'Same as '+ymFmt(prevYM).split(' ')[0];

    // Budget utilisation
    const budgetTotal=Object.values(budgets).reduce((s,v)=>s+v,0);
    const budgetUsed=budgetTotal>0?Math.round(total/budgetTotal*100):null;

    // Days left / progress
    const monthPct=Math.round(dayOfMonth/daysInMonth*100);

    statBar.innerHTML=
      '<div class="ov-stat" style="--stat-color:#f97316">'+
        '<div class="ov-stat-lbl">Total Spent</div>'+
        '<div class="ov-stat-val">'+fmt(total)+'</div>'+
        '<div class="ov-stat-sub">'+me.length+' entries · '+ymFmt(curMonth)+'</div>'+
        '<div class="ov-stat-delta '+momDir+'">'+momTxt+'</div>'+
      '</div>'+
      '<div class="ov-stat" style="--stat-color:#3b82f6">'+
        '<div class="ov-stat-lbl">Daily Average</div>'+
        '<div class="ov-stat-val" style="font-size:17px">'+fmt(dailyAvg)+'</div>'+
        '<div class="ov-stat-sub">over '+dayOfMonth+' day'+(dayOfMonth!==1?'s':'')+'</div>'+
        (isCurrentMonth?'<div class="ov-stat-delta '+(projected>prevTotal&&prevTotal>0?'up':'same')+'">Proj. '+fmt(projected)+' total</div>':'<div class="ov-stat-sub" style="margin-top:4px">Final</div>')+
      '</div>'+
      '<div class="ov-stat" style="--stat-color:#a855f7">'+
        '<div class="ov-stat-lbl">Biggest Expense</div>'+
        '<div class="ov-stat-val" style="font-size:'+(big?'17':'20')+'px">'+(big?fmt(big.amount):'—')+'</div>'+
        '<div class="ov-stat-sub">'+(big?esc(big.label):'No entries yet')+'</div>'+
        (big?'<div class="ov-stat-delta same">'+cOf(big.cat).icon+' '+big.cat+'</div>':'')+
      '</div>'+
      (isCurrentMonth?
        '<div class="ov-stat" style="--stat-color:#14b8a6">'+
          '<div class="ov-stat-lbl">Days Left</div>'+
          '<div class="ov-stat-val">'+daysLeft+'</div>'+
          '<div class="ov-stat-sub">of '+daysInMonth+' days · '+monthPct+'% through</div>'+
          '<div class="ov-stat-delta same" style="margin-top:6px;height:3px;background:var(--s3);border-radius:2px;overflow:hidden;padding:0"><div style="height:100%;width:'+monthPct+'%;background:#14b8a6;border-radius:2px"></div></div>'+
        '</div>'
      :
        '<div class="ov-stat" style="--stat-color:#14b8a6">'+
          '<div class="ov-stat-lbl">Month</div>'+
          '<div class="ov-stat-val" style="font-size:15px">'+ymFmt(curMonth).split(' ')[0]+'</div>'+
          '<div class="ov-stat-sub">'+ymFmt(curMonth).split(' ')[1]+'</div>'+
          '<div class="ov-stat-delta same">Past month</div>'+
        '</div>'
      )+
      (budgetTotal>0?
        '<div class="ov-stat" style="--stat-color:'+(budgetUsed>=100?'var(--danger)':budgetUsed>=75?'var(--warn)':'var(--success)')+'">'+
          '<div class="ov-stat-lbl">Budget Used</div>'+
          '<div class="ov-stat-val" style="font-size:22px;color:'+(budgetUsed>=100?'var(--danger)':budgetUsed>=75?'var(--warn)':'var(--success)')+'">'+budgetUsed+'%</div>'+
          '<div class="ov-stat-sub">'+fmt(total)+' of '+fmt(budgetTotal)+'</div>'+
          '<div class="ov-stat-delta '+(budgetUsed>=100?'up':budgetUsed>=75?'up':'down')+'">'+
            (budgetUsed>=100?'Over budget':budgetUsed>=75?'Watch your spend':'On track')+
          '</div>'+
        '</div>'
      :
        '<div class="ov-stat" style="--stat-color:var(--text3)">'+
          '<div class="ov-stat-lbl">Budget</div>'+
          '<div class="ov-stat-val" style="font-size:15px;color:var(--text3)">—</div>'+
          '<div class="ov-stat-sub">No budgets set</div>'+
          '<div class="ov-stat-delta same" style="cursor:pointer;color:var(--accent)" onclick="goScreen(&quot;budget&quot;)">Set budgets →</div>'+
        '</div>'
      );
  }

  // ── Desktop at-a-glance narrative ────────────────────────────────────────
  const glanceEl=document.getElementById('ov-glance');
  const isDesktop=window.innerWidth>=900;
  if(glanceEl&&isDesktop){
    if(me.length===0){
      glanceEl.style.display='none';
    } else {
      glanceEl.style.display='block';
      // Build narrative
      const prevMonth2=new Date(+curMonth.slice(0,4),+curMonth.slice(5,7)-2,1);
      const prevYM2=prevMonth2.getFullYear()+'-'+pad(prevMonth2.getMonth()+1);
      const prevTotal2=expenses.filter(e=>mOf(e)===prevYM2).reduce((s,e)=>s+e.amount,0);
      const topCat=cats.length?cats[0]:null;
      const momDiff2=prevTotal2>0?((total-prevTotal2)/prevTotal2*100):null;

      let narrative='';

      // Opening: how much spent so far
      if(isCurrentMonth){
        narrative+='You have spent <strong>'+fmt(total)+'</strong> so far in '+ymFmt(curMonth).split(' ')[0]+'.';
      } else {
        narrative+='You spent <strong>'+fmt(total)+'</strong> in '+ymFmt(curMonth)+'.';
      }

      // Month-over-month
      if(momDiff2!==null&&prevTotal2>0){
        const absDiff=Math.abs(total-prevTotal2);
        if(momDiff2>5){
          narrative+=' That is <span class="bad">'+fmt(absDiff)+' more</span> than '+ymFmt(prevYM2).split(' ')[0]+'.';
        } else if(momDiff2<-5){
          narrative+=' That is <span class="good">'+fmt(absDiff)+' less</span> than '+ymFmt(prevYM2).split(' ')[0]+' — good progress.';
        } else {
          narrative+=' Same as '+ymFmt(prevYM2).split(' ')[0]+'.';
        }
      }

      // Top category
      if(topCat){
        const topPct=total>0?(topCat[1]/total*100).toFixed(0):0;
        narrative+=' Your biggest category is <strong>'+cOf(topCat[0]).icon+' '+topCat[0]+'</strong> at <span class="highlight">'+topPct+'%</span> ('+fmt(topCat[1])+').';
      }

      // Projection or pace (current month only)
      if(isCurrentMonth&&daysLeft>0){
        const budgetTotal2=Object.values(budgets).reduce((s,v)=>s+v,0);
        if(budgetTotal2>0){
          const remaining=budgetTotal2-total;
          if(remaining<0){
            narrative+=' You are <span class="bad">'+fmt(Math.abs(remaining))+' over your total budget</span> with '+daysLeft+' days left.';
          } else {
            const dailyBudgetLeft=remaining/daysLeft;
            narrative+=' At this pace you will reach <span class="warn">'+fmt(projected)+'</span> by end of month — you have <span class="good">'+fmt(remaining)+'</span> left in budget (<span class="highlight">'+fmt(dailyBudgetLeft)+'/day</span>).';
          }
        } else {
          narrative+=' At this pace you are on track to spend <span class="highlight">'+fmt(projected)+'</span> by end of the month.';
        }
      }

      glanceEl.innerHTML='<div class="ov-glance-title">📋 This Month at a Glance</div><div class="ov-glance-text">'+narrative+'</div>';
    }
  }

  // ── Weekly ───────────────────────────────────────────────────────────────
  const tw=wkBounds(0),lw=wkBounds(-1),thisW=wkTotal(tw.s,tw.e),lastW=wkTotal(lw.s,lw.e);
  const diff=thisW-lastW,pct=lastW>0?Math.abs(diff/lastW*100).toFixed(0):'—';
  const dir=diff>0?'up':diff<0?'down':'same';
  const dirTxt=dir==='up'?'▲ +'+pct+'% more than last week':dir==='down'?'▼ '+pct+'% less than last week':'Same as last week';
  document.getElementById('week-grid').innerHTML=
    '<div class="week-card"><div class="week-lbl">This Week</div><div class="week-val">'+fmt(thisW)+'</div><div class="week-delta '+dir+'">'+dirTxt+'</div></div>'+
    '<div class="week-card"><div class="week-lbl">Last Week</div><div class="week-val">'+fmt(lastW)+'</div><div class="week-delta same">'+lw.s.slice(8)+'–'+lw.e.slice(8)+'/'+lw.s.slice(5,7)+'</div></div>';

  // ── Category breakdown ───────────────────────────────────────────────────
  document.getElementById('cat-list').innerHTML=cats.length
    ?cats.map(([cat,amt])=>{
        const pct=total?(amt/total*100).toFixed(1):0,c=cOf(cat);
        return '<div class="cat-row"><div class="cat-left"><div class="cat-dot" style="background:'+c.color+'"></div><div class="cat-info"><div class="cat-name">'+c.icon+' '+cat+'</div><div class="cat-bar-track"><div class="cat-bar-fill" style="width:'+(amt/maxC*100).toFixed(1)+'%;background:'+c.color+'"></div></div></div></div><div class="cat-right"><div class="cat-amt" style="color:'+c.color+'">'+fmt(amt)+'</div><div class="cat-pct">'+pct+'%</div></div></div>';
      }).join('')
    :'<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">No expenses</div></div>';

  // ── Charts ───────────────────────────────────────────────────────────────
  destroyC('pie');
  if(cats.length){
    charts.pie=new Chart(document.getElementById('pie-chart').getContext('2d'),{
      type:'doughnut',
      data:{labels:cats.map(c=>c[0]),datasets:[{data:cats.map(c=>c[1]),backgroundColor:cats.map(c=>cOf(c[0]).color),borderWidth:0,hoverOffset:8}]},
      options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+fmt(ctx.raw)}}},cutout:'60%',responsive:true,maintainAspectRatio:false}
    });
  }
  const dmap={};me.forEach(e=>{const d=+e.date.slice(8,10);dmap[d]=(dmap[d]||0)+e.amount;});
  const darr=Object.entries(dmap).sort((a,b)=>+a[0]-+b[0]);
  destroyC('bar');
  if(darr.length){
    charts.bar=new Chart(document.getElementById('bar-chart').getContext('2d'),{
      type:'bar',
      data:{labels:darr.map(d=>d[0]+''),datasets:[{data:darr.map(d=>d[1]),backgroundColor:'#f97316',borderRadius:4,borderSkipped:false}]},
      options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+fmt(ctx.raw)}}},scales:{x:{grid:GRID,ticks:TICK},y:{grid:GRID,ticks:{...TICK,callback:v=>currencySymbol+v}}},responsive:true,maintainAspectRatio:false}
    });
  }
  renderOvLoanSummary();
}

// Loan summary on overview
function renderOvLoanSummary(){
  const el=document.getElementById('ov-loan-summary');if(!el)return;
  const active=loansData.filter(l=>l.status!=='settled');
  if(!active.length){el.innerHTML='';return;}
  const lent=active.filter(l=>l.type==='lent').reduce((s,l)=>s+loanRemaining(l),0);
  const borrowed=active.filter(l=>l.type==='borrowed').reduce((s,l)=>s+loanRemaining(l),0);
  const overdueCount=active.filter(loanOverdue).length;
  const now=new Date(),monthStart=now.getFullYear()+'-'+pad(now.getMonth()+1)+'-01';
  const recovered=loansData.flatMap(l=>(l.payments||[]).filter(p=>p.date>=monthStart&&l.type==='lent')).reduce((s,p)=>s+p.amount,0);
  el.innerHTML='<div class="card" style="margin-top:0"><div class="card-title">🤝 Loans</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:'+(recovered||overdueCount?'10px':'0')+'"><div style="background:var(--s2);border-radius:var(--r-sm);padding:10px;text-align:center"><div style="font-family:var(--mono);font-size:7px;letter-spacing:2px;color:var(--success);text-transform:uppercase;margin-bottom:3px">Owed to You</div><div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--success)">'+fmt(lent)+'</div></div><div style="background:var(--s2);border-radius:var(--r-sm);padding:10px;text-align:center"><div style="font-family:var(--mono);font-size:7px;letter-spacing:2px;color:var(--danger);text-transform:uppercase;margin-bottom:3px">You Owe</div><div style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--danger)">'+fmt(borrowed)+'</div></div></div>'+(overdueCount?'<div style="font-family:var(--mono);font-size:10px;color:var(--danger);margin-bottom:4px">⚠ '+overdueCount+' loan'+(overdueCount>1?'s':'')+' overdue</div>':'')+(recovered?'<div style="font-family:var(--mono);font-size:10px;color:var(--success)">✓ '+fmt(recovered)+' recovered this month</div>':'')+'</div>';
}