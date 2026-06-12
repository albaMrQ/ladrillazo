/* ============================================================
   LADRILLAZO — game + UI engine (vanilla JS, no frameworks)
   ============================================================ */
(function(){
'use strict';
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const rnd = (a,b)=>a+Math.random()*(b-a);
const pick = a=>a[Math.floor(Math.random()*a.length)];
const fmt = n => '£'+(n).toFixed(2);

/* ---------- 8.1 multiplier & collapse table (exact) ---------- */
const TABLE = [
  {f:0, mult:0.96, col:0},    {f:1, mult:0.97, col:1.5},
  {f:2, mult:1.00, col:2.8},  {f:3, mult:1.05, col:4.3},
  {f:4, mult:1.12, col:6.2},  {f:5, mult:1.22, col:8.5},
  {f:6, mult:1.37, col:11.0}, {f:7, mult:1.59, col:13.9},
  {f:8, mult:1.92, col:17.0}, {f:9, mult:2.42, col:20.5},
  {f:10,mult:3.19, col:24.4}, {f:11,mult:4.47, col:28.5},
  {f:12,mult:6.66, col:33.0}, {f:13,mult:10.70,col:37.7},
  {f:14,mult:18.72,col:42.8}, {f:15,mult:36.18,col:48.3},
  {f:16,mult:78.66,col:55.0}, {f:17,mult:174.80,col:55.0},
  {f:18,mult:388.43,col:55.0}, {f:19,mult:863.19,col:55.0},
];
const MAXF = TABLE.length-1;
const band = f => f<=0?'plot':f<=4?'apt':f<=8?'office':f<=12?'hotel':f<=15?'pent':'folly';

/* ---------- 8.5 characters ---------- */
// p = build appetite (target floor it greedily aims for); j = jitter
const YOU_IMG = 'assets/avatars/you.png?v=3';
const YOU_BODY = 'assets/bodies/you.png?v=2';
const ROSTER = [
  {name:'La Jefa',         short:'JEFA',    img:'assets/avatars/jefa.png',      body:'assets/bodies/jefa.png?v=2',      target:11, j:1.0},
  {name:'El Flipper',      short:'FLIPPER', img:'assets/avatars/flipper.png',   body:'assets/bodies/flipper.png?v=2',   target:7,  j:1.3},
  {name:'Doña Cemento',    short:'CEMENTO', img:'assets/avatars/cemento.png',   body:'assets/bodies/cemento.png?v=2',   target:9,  j:0.8},
  {name:'The Slumlord',    short:'SLUM',    img:'assets/avatars/slumlord.png',  body:'assets/bodies/slumlord.png?v=2',  target:10, j:1.1},
  {name:'The Architect',   short:'ARCHI',   img:'assets/avatars/architect.png', body:'assets/bodies/architect.png?v=2', target:6,  j:0.6},
  {name:'DiamondHands',    short:'DIAMOND', img:'assets/avatars/diamond.png',   body:'assets/bodies/diamond.png?v=2',   target:19, j:0.4},
  {name:'Council Insider', short:'COUNCIL', img:'assets/avatars/council.png',   body:'assets/bodies/council.png?v=2',   target:10, j:1.2},
];
const EPITHETS = {
  win:['Rode it to the moon ☄️','Built the whole damn district','Cashed out like a pro'],
  midSold:['Banked it before the wobble','Knew when to walk away','Took the money & ran'],
  earlySold:['Chickened out at the bottom','Sold on floor one, classic','Cautious to a fault'],
  down:['Ate dirt at floor {f} 💥','Greedy till the rubble','The bubble found them','Tower went sideways']
};

/* ---------- 8.3 market events ---------- */
const EVENTS = [
  {ic:'🏦',t:'Interest Rate Hike',s:'Rates up! Everyone panics.',risk:+1,storm:true},
  {ic:'🏗',t:'Permits Approved',s:'Build away.',risk:-1},
  {ic:'🚛',t:'Cement Shortage',s:"Next floor's dicey.",risk:+1},
  {ic:'🧱',t:'Materials Surplus',s:"Next floor's safer.",risk:-1},
  {ic:'📈',t:'Property Boom',s:'The bubble inflates.',risk:+1,storm:false},
  {ic:'👷',t:'Safety Inspections',s:'Tall towers beware.',risk:+1},
  {ic:'📰',t:'Media Hype Cycle',s:'Valuations soar.',risk:0},
  {ic:'🏦',t:'Central Bank Stimulus',s:'Cheap, safe building!',risk:-1},
  {ic:'⚡',t:'Power Grid Failure',s:'No building this round.',risk:0,nobuild:true,storm:true},
  {ic:'🚨',t:'Bubble Warning',s:'Big swing coming next round.',risk:+1,storm:true},
];

/* ---------- 8.4 favor cards ---------- */
const FAVORS = [
  {ic:'🔍',name:'Building Inspection', eff:"rival +8% risk", type:'OFF', cls:'fc-off',   kind:'offense'},
  {ic:'🚧',name:'Red Tape',            eff:"rival can't SELL", type:'TMP', cls:'fc-tempo', kind:'tempo'},
  {ic:'🤝',name:'Bribe Inspector',     eff:'cancel a sabotage', type:'DEF', cls:'fc-def',  kind:'defence'},
];

const TICKER = [
  '🏗 LADRILLAZO CITY HERALD',
  'Mayor opens 14th floor, immediately regrets it',
  '★ Cement prices "absolutely fine" says cement matriarch',
  'DiamondHands Dave still has not sold',
  'Penthouse market described as "a vibe"',
  '🚨 Pigeon unionises on floor 9',
  'Local brick achieves sentience, starts podcast',
];

/* ============================================================ STATE */
const G = {
  stake:5, balance:94.50, autoSell:false, autoTarget:2.42,
  sessionStart:Date.now(), sessionNet:0,
  towers:[], me:null, round:0, eventIdx:0, armed:null, defenceLeft:0,
  roundClock:null, rivalTimers:[], over:false, calm:false, design:false,
};

/* ============================================================ SCALER */
function scale(){
  const pad=24, w=innerWidth-pad, h=innerHeight-pad;
  const s=Math.min(w/390, h/844, 1.05);
  $('#phoneWrap').style.transform=`scale(${s})`;
}
addEventListener('resize',scale); scale();

/* ============================================================ ROUTING */
let current='lobby';
function go(name){
  $$('.screen').forEach(s=>s.classList.toggle('active', s.dataset.screen===name));
  current=name;
  if(name==='match') runMatchmaking();
  if(name==='hud')   startPlay();
  if(name==='onboard') startOnboard();
}
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));

/* toast */
let toastT;
function toast(msg,ms=1900){
  const t=$('#toast'); t.innerHTML=msg; t.classList.add('show');
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),ms);
}

/* ============================================================ 6.1 LOBBY */
const ROOMS=[
  {stake:0.50, count:8, state:'full',  pay:'avg 1.8×'},
  {stake:1,    count:7, state:'fill',  pay:'avg 2.1×'},
  {stake:5,    count:5, state:'fill',  pay:'avg 2.4×'},
  {stake:20,   count:2, state:'empty', pay:'bots fill in'},
];
function miniSky(n){let h='';for(let i=0;i<6;i++){const ht=20+((i*37+n*13)%70);h+=`<i style="height:${ht}%"></i>`;}return h;}
function buildLobby(){
  $('#rooms').innerHTML = ROOMS.map(r=>{
    const liveCls = r.state==='full'?'full':r.state==='empty'?'empty':'';
    const isFull = r.state==='full';
    const liveTxt = isFull?'8/8 · <span class="blink-full">FULL</span>': r.state==='empty'? `${r.count}/8 · bots fill in` : `${r.count}/8 <span class="blink-build">building</span>`;
    return `<div class="room${isFull?' disabled':''}" data-stake="${r.stake}"${isFull?' aria-disabled="true"':''}>
      <div class="room-info">
        <div class="room-stake">£${r.stake.toFixed(2).replace('.00','')}</div>
        <div class="room-sub">${r.pay}</div>
        <div class="room-live ${liveCls}"><span class="led"></span>${liveTxt}</div>
      </div>
      <div class="room-go">${isFull?'FULL':'JOIN'}</div>
    </div>`;
  }).join('');
  $$('#rooms .room').forEach(el=>{
    if(el.classList.contains('disabled')) return; // full room is not joinable
    // tap the card body → select it (highlight + set stake)
    el.addEventListener('click',()=>{
      $$('#rooms .room').forEach(r=>r.classList.remove('sel'));
      el.classList.add('sel');
      setStake(parseFloat(el.dataset.stake));
    });
    // tap JOIN → join the room
    el.querySelector('.room-go').addEventListener('click',(e)=>{
      e.stopPropagation();
      setStake(parseFloat(el.dataset.stake)); go('bet');
    });
  });
  // no room pre-selected — all cards look the same until tapped
}
$('#lobbyPlay').addEventListener('click',()=>{
  const sel=$('#rooms .room.sel');
  setStake(sel?parseFloat(sel.dataset.stake):5); go('bet');
});

/* ============================================================ 6.3 BET */
function setStake(v){ G.stake=v; syncBet(); }
function nearestFloorVal(floor){ return G.stake*TABLE[floor].mult; }
function syncBet(){
  $('#stakeVal').textContent = G.stake%1===0? G.stake : G.stake.toFixed(2);
  $('#betHelper').innerHTML = `Worth <b>${fmt(nearestFloorVal(8))}</b> at floor 8 · <b>${fmt(nearestFloorVal(9))}</b> at floor 9`;
  $('#betConfirm').textContent = `Confirm stake · ${fmt(G.stake).replace('.00','')}`;
  $$('#stakeChips .chip').forEach(c=>c.classList.toggle('sel', parseFloat(c.dataset.stake)===G.stake));
  // soft near-limit warning over £20
  const warn = G.stake>=20;
  $('#rgSoft').classList.toggle('warn',warn);
  $('#rgSoft').textContent = warn ? '⚠ Approaching your £25 stake limit. Cash out any time.' : '';
  [$('#lobbyBal'),$('#betBal')].forEach(b=>b.textContent=fmt(G.balance));
}
$('#stepUp').addEventListener('click',()=>{ G.stake=Math.min(50, +(G.stake+ (G.stake<5?0.5:1)).toFixed(2)); syncBet();});
$('#stepDown').addEventListener('click',()=>{ G.stake=Math.max(0.5, +(G.stake-(G.stake<=5?0.5:1)).toFixed(2)); syncBet();});
$$('#stakeChips .chip').forEach(c=>c.addEventListener('click',()=>{
  G.stake=parseFloat(c.dataset.stake); syncBet();
}));
$('#autoToggle').addEventListener('click',function(){
  G.autoSell=!G.autoSell; this.setAttribute('aria-checked',G.autoSell);
  $('#asDial').classList.toggle('show',G.autoSell);
});
$$('#dialChips .chip').forEach(c=>c.addEventListener('click',function(){
  $$('#dialChips .chip').forEach(x=>x.classList.remove('sel')); this.classList.add('sel');
  G.autoTarget=parseFloat(this.dataset.mult);
}));
$('#betConfirm').addEventListener('click',()=>{ go('match'); });

/* ============================================================ 6.2 MATCHMAKING */
let matchTO=[];
/* Set true to freeze the matchmaking/loading screen for design work
   (no auto-fill animation, no auto-advance to the HUD). */
const FREEZE_MATCH = false;

function runMatchmaking(){
  matchTO.forEach(clearTimeout); matchTO=[];
  const seats=$('#seats'); seats.innerHTML='';
  // seat 0 = me, rest fill over time
  const order = shuffle([...ROSTER]).slice(0,7);
  const slots = [{me:true,name:'YOU',short:'YOU',img:YOU_IMG}, ...order.map(r=>({name:r.name,short:r.short,img:r.img,bot:Math.random()<0.4}))];
  slots.forEach((s,i)=>{
    const el=document.createElement('div'); el.className='seat empty'; el.dataset.i=i;
    el.innerHTML=`<div class="av ph"></div><div class="nm">…</div>`;
    seats.appendChild(el);
  });

  if(FREEZE_MATCH || G.design){
    // static representative state: 6/8 filled — me, 4 players, 1 bot, 2 empty
    const frozen=[
      {me:true,short:'YOU',img:YOU_IMG}, {short:'JEFA',img:'assets/avatars/jefa.png'}, {short:'FLIPPER',img:'assets/avatars/flipper.png',bot:true},
      {short:'CEMENTO',img:'assets/avatars/cemento.png'}, {short:'ARCHI',img:'assets/avatars/architect.png'}, {short:'DIAMOND',img:'assets/avatars/diamond.png'},
    ];
    frozen.forEach((s,i)=>fillSeat(i,s));
    $$('#seats .seat').forEach(s=>s.classList.remove('pop')); // static, no entrance anim while frozen
    setRing(frozen.length);
    $('#matchTip').textContent='Median tower falls around floor 9. Sweet spot: floors 6–10.';
    return; // hold here — no timers, no auto-advance
  }

  let filled=1;
  fillSeat(0,slots[0]); setRing(filled);
  const tips=['Median tower falls around floor 9. Sweet spot: floors 6–10.',
    'Sabotage raises a rival\'s risk AND reward — their number flashes up. Fair\'s fair.',
    'Auto-Sell banks you the instant you hit your target. Set it on the stake screen.',
    'Build to climb · Sell to bank. Pick your moment.'];
  let ti=0; const tipInt=setInterval(()=>{ ti=(ti+1)%tips.length; $('#matchTip').textContent=tips[ti]; },2600); matchTO.push(tipInt);
  for(let i=1;i<8;i++){
    matchTO.push(setTimeout(()=>{ fillSeat(i,slots[i]); filled++; setRing(filled);
      if(filled===8){ matchTO.push(setTimeout(()=>go('hud'),900)); }
    }, 500+i*rnd(380,720)));
  }
}
function fillSeat(i,s){
  const el=$(`#seats .seat[data-i="${i}"]`); if(!el)return;
  el.className='seat pop'+(s.me?' me':'');
  el.innerHTML=`<div class="av${s.img?'':' ph'}">${s.img?`<img src="${s.img}" alt="">`:''}</div><div class="nm">${s.me?'YOU':s.short}</div>${s.bot?'<span class="bot">BOT</span>':''}`;
}
function setRing(n){ const c=$('#seatCount'); if(c) c.textContent=n; const r=$('#ringFg'); if(r) r.style.strokeDashoffset = 327*(1-n/8); }
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ============================================================ 6.4 HUD ENGINE */
function startPlay(){
  // reset
  G.over=false; G.round=0; G.armed=null; G.defenceLeft=1;
  if(!G.design) G.balance = +(G.balance - G.stake).toFixed(2);
  $('#hudBal').textContent = fmt(G.balance);
  // build roster: 7 rivals + me, me in the middle (index 3 of 7? we render me separately centred)
  const rivals = shuffle([...ROSTER]).slice(0,7).map(r=>mkTower(r,false));
  G.me = mkTower({name:'YOU',av:'YOUR\\navatar',img:YOU_IMG,target:99,j:0},true);
  // arrange: 3 rivals | me | 4 rivals  → me centred-ish
  G.towers = [rivals[0],rivals[1],rivals[2], G.me, rivals[3],rivals[4],rivals[5],rivals[6]];
  G.eventIdx=0;
  renderTowers(); renderFavors(); buildTicker();
  updateMy(true);
  // skyline state
  $('#skyline').classList.remove('storm','targeting');
  $('#eventBanner').classList.remove('show');
  $('#favors').classList.remove('open');
  setButtons(true);
  $('#hudHint').textContent='Build to climb · Sell to bank';
  $('#blockWindow').classList.remove('show');
  // timers
  clearInterval(G.roundClock); G.rivalTimers.forEach(clearInterval); G.rivalTimers=[];
  if(G.design){
    // design mode: static, controllable HUD — no timers, rivals, events or auto-advance
    $('#timerFill').style.width='100%'; $('#timerNum').textContent='6.0s';
    $('#roundNo').textContent='07';
    seedRivals();
    renderTowers(); updateMy(true);
    return;
  }
  startRoundClock();
  G.towers.forEach((t,i)=>{ if(!t.isMe) scheduleRival(t, 900+i*260); });
  // demo a market event + an incoming sabotage early
  setTimeout(()=>{ if(current==='hud'&&!G.over) fireEvent(); }, 5200);
  setTimeout(()=>{ if(current==='hud'&&!G.over) incomingSabotage(); }, 11000);
}
function mkTower(c,isMe){
  return {name:c.name, short:c.short||'YOU', av:c.av, img:c.img, body:c.body||(isMe?YOU_BODY:null), floor:0, state:'build', soldMult:null,
    target:c.target, j:c.j||1, isMe, riskBump:0, noSell:false,
    surv:1, mult:TABLE[0].mult};   /* surv = running survival product; mult = 0.96/surv (EV-neutral) */
}
/* EV-NEUTRAL multiplier: derived from a tower's realised survival so any risk modifier
   (event or sabotage) raises reward in lockstep with risk. Falls back to the static table
   for design-mode seeds / un-built towers. RTP stays a constant 96%. */
function curMult(t){ return t.soldMult ?? t.mult ?? TABLE[Math.min(MAXF,t.floor)].mult; }
function nextRisk(t){ const nf=Math.min(MAXF,t.floor+1); return Math.min(55, TABLE[nf].col + t.riskBump); }

function renderTowers(){
  const wrap=$('#towers'); wrap.innerHTML='';
  const leaderId = leader();
  G.towers.forEach((t,idx)=>{
    const col=document.createElement('div');
    col.className='tower-col '+t.state+(t.isMe?' me':'');
    col.dataset.idx=idx;
    if(swayOn(t)) col.classList.add('sway');
    const isLead = idx===leaderId && t.state!=='down';
    col.innerHTML = `
      <div class="t-flag">
        <div class="t-mult">${curMult(t).toFixed(2)}×</div>
        <div class="t-av${t.img?'':' ph'}">${t.img?`<img src="${t.img}" alt="">`:''}</div>
        <div class="t-name${t.isMe?' you-name':''}">${t.isMe?'YOU':t.short}</div>
      </div>
      <div class="t-stack">${stackHTML(t)}</div>`;
    if(!t.isMe) col.addEventListener('click',()=>onTowerTap(idx));
    wrap.appendChild(col);
  });
}
function stackHTML(t){
  if(t.state==='down') return `<div class="rubble-heap"><span class="smoke sm1"></span><span class="smoke sm2"></span><span class="smoke sm3"></span><span class="smoke sm4"></span><i class="r1"></i><i class="r2"></i><i class="r3"></i><i class="r4"></i></div>`;
  let h=`<div class="floor fl-plot"></div>`;
  for(let f=1; f<=t.floor; f++){
    const cap = f===t.floor;
    h+=`<div class="floor fl-${band(f)} ${cap?'cap':''}"></div>`;
  }
  if(t.state==='sold') h+=`<div class="sold-tag"><span class="spark sp1">✦</span>SOLD<span class="spark sp2">✦</span></div>`;
  if(t.state==='hold') h+=`<div class="hold-tag">HOLD</div>`;
  if(t.state==='build') h+=`<span class="crane"><i class="jib"></i><i class="mast"></i><i class="cable"></i><i class="load"></i></span>`;
  return h;
}
function badgeHTML(t){
  const m={build:['b-build','BUILD'],hold:['b-hold','HOLD'],sold:['b-sold','SOLD'],down:['b-down','DOWN']};
  const [cls,lbl]=m[t.state];
  return `<span class="badge ${cls}"><span class="dot"></span>${lbl}</span>`;
}
function swayOn(t){ return t.state==='build' && nextRisk(t)>=28 && !G.calm; }
function leader(){
  let best=-1,bi=-1;
  G.towers.forEach((t,i)=>{ if(t.state==='down')return; const v=curMult(t); if(v>best){best=v;bi=i;} });
  return bi;
}

/* ---- my readout ---- */
function updateMy(silent){
  const t=G.me;
  $('#myMult').textContent = curMult(t).toFixed(2);
  if(!silent){ const mm=$('.my-mult'); mm.classList.remove('up'); void mm.offsetWidth; mm.classList.add('up'); }
  const pay = G.stake*curMult(t);
  $('#myPay').textContent = fmt(pay);
  const mb=$('#myBadge');
  if(mb){ mb.className='badge '+({build:'b-build',hold:'b-hold',sold:'b-sold',down:'b-down'})[t.state];
    mb.innerHTML = `<span class="dot"></span>${t.state.toUpperCase()}${t.state==='sold'?' '+t.soldMult.toFixed(2)+'×':''}`; }
  const r=nextRisk(t);
  const fill=$('#myRisk>i'); fill.style.width=Math.min(100,r/55*100)+'%';
  fill.style.background = r<12?'var(--risk-lo)':r<28?'var(--risk-mid)':'var(--risk-hi)';
  $('#myRiskPct').textContent = (t.state==='build'||t.state==='hold')? Math.round(r)+'%' : '—';
}

/* ---- buttons ---- */
function setButtons(on){
  const me=G.me, can = on && (me.state==='build'||me.state==='hold') && !G.over;
  const noBuild = G.nobuild;
  $('#buildBtn').disabled = !can || noBuild;
  $('#sellBtn').disabled  = !can || me.floor===0 ? !can || me.floor<1 : false;
  if(me.floor<1) $('#sellBtn').disabled = !can; // can sell the plot at 0.96 too (crash games let you), keep enabled
  $('#sellBtn').disabled = !can || me.noSell;
}

$('#buildBtn').addEventListener('click',()=>doBuild(G.me,true));
$('#sellBtn').addEventListener('click',()=>doSell(G.me,true));

function doBuild(t,isMe){
  if(G.design)return;
  if(t.state!=='build'&&t.state!=='hold')return;
  if(isMe&&G.nobuild){toast('⚡ Power grid down — no building this round');return;}
  const nf=Math.min(MAXF,t.floor+1);
  const chance=Math.max(0, nextRisk(t));   /* effective collapse % for THIS floor, incl. modifiers */
  t.riskBump=0;
  if(Math.random()*100 < chance){ collapse(t,isMe); return; }
  t.floor=nf; t.state='build';
  /* EV-neutral payout: fold the actual (possibly modified) collapse chance into survival,
     so a riskier floor pays proportionally more. Unmodified, this reproduces TABLE.mult to 2dp. */
  t.surv = (t.surv ?? 1) * (1 - chance/100);
  t.mult = +(0.96 / t.surv).toFixed(2);
  if(isMe){
    coinPop();
    updateMy();
    // auto-sell check
    if(G.autoSell && curMult(t)>=G.autoTarget){ setTimeout(()=>doSell(t,true,true),260); }
  }
  refreshTowers();
}
function doSell(t,isMe,auto){
  if(G.design)return;
  if(t.state!=='build'&&t.state!=='hold')return;
  if(isMe&&t.noSell){toast('🚧 Red Tape — you can\'t sell this round');return;}
  t.soldMult=curMult(t); t.state='sold';
  if(isMe){
    const pay=+(G.stake*t.soldMult).toFixed(2);
    G.balance=+(G.balance+pay).toFixed(2); G.sessionNet=+(G.sessionNet+pay-G.stake).toFixed(2);
    $('#hudBal').textContent=fmt(G.balance);
    confetti(t.soldMult);
    toast(`💰 ${auto?'Auto-':''}Sold @ ${t.soldMult.toFixed(2)}× → ${fmt(pay)}`,2200);
    updateMy(); setButtons(false);
    $('#hudHint').textContent='Banked. Watch the city burn 🍿';
    endSoon();
  }
  refreshTowers();
}
function collapse(t,isMe){
  t.state='down'; t.soldMult=null;
  refreshTowers();
  if(isMe){
    G.sessionNet=+(G.sessionNet-G.stake).toFixed(2);
    shakeScreen();
    toast(`💥 Down at floor ${t.floor}. The house keeps your stake.`,2400);
    $('#hudHint').textContent='Ouch. Everything that goes up…';
    updateMy(); setButtons(false);
    endSoon();
  }
}
function refreshTowers(){
  // re-render but keep it light: just rebuild (small DOM)
  renderTowers();
}

/* ---- round clock (atmosphere + timer-low state) ---- */
function startRoundClock(){
  nextRound();
}
function nextRound(){
  if(G.over||G.design)return;
  G.round++; $('#roundNo').textContent=String(G.round).padStart(2,'0');
  let dur=6000, t=dur;
  const bar=$('#timerbar'), fill=$('#timerFill');
  bar.classList.remove('low');
  clearInterval(G.roundClock);
  G.roundClock=setInterval(()=>{
    t-=100; const pct=Math.max(0,t/dur*100);
    fill.style.width=pct+'%';
    $('#timerNum').textContent=(t/1000).toFixed(1)+'s';
    if(t<=1000) bar.classList.add('low');
    if(t<=0){ clearInterval(G.roundClock);
      // clear per-round modifiers
      G.nobuild=false; G.me.noSell=false; setButtons(true);
      $('#skyline').classList.remove('storm');
      nextRound();
    }
  },100);
}

/* ---- rivals AI ---- */
function scheduleRival(t, delay){
  const tick=()=>{
    if(G.over||t.state==='down'||t.state==='sold')return;
    // decide
    const risk=nextRisk(t);
    const greedy = t.floor < t.target;
    const sellUrge = (risk>34) || (!greedy && Math.random()<0.55) || (t.floor>=t.target && Math.random()<0.7);
    if(t.name==='DiamondHands' && t.floor<18){ // never sells until very high / dies
      doBuild(t,false);
    } else if(sellUrge && t.floor>=2){
      doSell(t,false);
    } else {
      doBuild(t,false);
    }
  };
  const loop=()=>{
    if(G.over||G.design)return;
    if(t.state==='build'){ tick(); }
    const id=setTimeout(loop, rnd(1100,2100)/t.j);
    G.rivalTimers.push(id);
  };
  const id=setTimeout(loop, delay); G.rivalTimers.push(id);
}

/* ---- market event (6.5) ---- */
function evTone(ev){ return ev.risk<0?'good':ev.risk>0?'bad':'neutral'; }
function fireEvent(){
  if(G.over||G.design)return;
  const ev=EVENTS[G.eventIdx % EVENTS.length]; G.eventIdx++;
  $('#evIcon').textContent=ev.ic; $('#evTitle').textContent=ev.t; $('#evSub').textContent=ev.s;
  const b=$('#eventBanner'); b.classList.remove('show','ev-good','ev-bad','ev-neutral');
  b.classList.add('ev-'+evTone(ev)); void b.offsetWidth; b.classList.add('show');
  if(ev.storm) $('#skyline').classList.add('storm');
  // apply effect to risk bumps for the round
  G.towers.forEach(t=>{ t.riskBump = ev.risk*4; });
  if(ev.nobuild){ G.nobuild=true; setButtons(false); }
  updateMy(true); refreshTowers();
  setTimeout(()=>{ b.classList.remove('show'); }, 2500);
  // schedule next event
  setTimeout(()=>{ if(current==='hud'&&!G.over) fireEvent(); }, rnd(9000,13000));
}

/* ---- favors tray (6.6) ---- */
let favs=[];
function renderFavors(){
  favs = FAVORS.map(f=>({...f, used:false}));
  $('#favCount').textContent=favs.length;
  $('#favTray').innerHTML = favs.map((f,i)=>`
    <div class="fav-card ${f.cls}" data-i="${i}">
      <span class="fc-type">${f.type}</span>
      <span class="fc-ico">${f.ic}</span>
      <span class="fc-name">${f.name}</span>
      <span class="fc-eff">${f.eff}</span>
    </div>`).join('');
  $$('#favTray .fav-card').forEach(el=>el.addEventListener('click',()=>armFavor(+el.dataset.i)));
}
function armFavor(i){
  if(G.design)return;
  const f=favs[i]; if(f.used)return;
  if(f.kind==='defence'){
    f.used=true; G.defenceLeft++;
    $('#favCount').textContent = favs.filter(x=>!x.used).length;
    $(`#favTray .fav-card[data-i="${i}"]`).classList.add('used');
    toast('🛡 '+f.name+' ready — next sabotage on you is cancelled');
    return;
  }
  // offense/tempo → arm + targeting
  G.armed={i,f};
  $$('#favTray .fav-card').forEach(c=>c.classList.remove('armed'));
  $(`#favTray .fav-card[data-i="${i}"]`).classList.add('armed');
  $('#skyline').classList.add('targeting');
  $('#favHint').textContent='now tap a rival tower →';
}
function onTowerTap(idx){
  if(!G.armed)return;
  const t=G.towers[idx]; if(t.isMe||t.state==='down'||t.state==='sold'){ return; }
  const {i,f}=G.armed;
  // resolve
  flyCard(f.ic, idx);
  if(f.kind==='offense'){ t.riskBump+=8; }
  if(f.kind==='tempo'){ t.noSell=true; toast(`🚧 ${t.name} can't sell next round`); }
  // fairness: their reward flashes UP
  setTimeout(()=>{
    const col=$(`#towers .tower-col[data-idx="${idx}"]`);
    if(col){ const chip=col.querySelector('.t-mult'); chip&&chip.classList.add('flash'); }
    if(f.kind==='offense') toast(`🔍 ${f.name} on ${t.name} — risk +8%, reward up too`);
  },420);
  // consume
  favs[i].used=true; G.armed=null;
  $('#favCount').textContent=favs.filter(x=>!x.used).length;
  $(`#favTray .fav-card[data-i="${i}"]`).classList.add('used','');
  $$('#favTray .fav-card').forEach(c=>c.classList.remove('armed'));
  $('#skyline').classList.remove('targeting');
  $('#favHint').textContent='Tap a card to arm it, then tap a rival tower.';
  refreshTowers();
}
function flyCard(ic,idx){
  const col=$(`#towers .tower-col[data-idx="${idx}"]`); if(!col)return;
  const r=col.getBoundingClientRect(), s=$('#screen').getBoundingClientRect();
  const el=document.createElement('div');
  el.textContent=ic; el.style.cssText=`position:absolute;z-index:45;font-size:30px;left:20px;bottom:120px;
    transition:all .42s cubic-bezier(.4,1.3,.4,1);filter:drop-shadow(0 3px 0 #1d1733);`;
  $('#screen').appendChild(el);
  requestAnimationFrame(()=>{ el.style.left=(r.left-s.left+r.width/2-15)+'px'; el.style.bottom=(s.bottom-r.bottom+10)+'px'; el.style.transform='rotate(360deg) scale(1.4)'; });
  setTimeout(()=>{ col.classList.add('hit'); setTimeout(()=>col.classList.remove('hit'),500); el.remove(); },440);
}

/* ---- incoming sabotage on me + BLOCK window ---- */
function incomingSabotage(){
  if(G.over||G.design||G.me.state!=='build')return;
  const bw=$('#blockWindow'); bw.classList.add('show');
  let t=3000; const fill=$('#bwFill');
  const hasDef=G.defenceLeft>0;
  $('#blockBtn').style.display = hasDef?'inline-block':'none';
  const int=setInterval(()=>{ t-=100; fill.style.width=Math.max(0,t/3000*100)+'%';
    if(t<=0){ clearInterval(int); resolveSab(false); } },100);
  $('#blockBtn').onclick=()=>{ clearInterval(int); resolveSab(true); };
  function resolveSab(blocked){
    bw.classList.remove('show');
    if(blocked){ G.defenceLeft--; toast('🛡 BLOCKED! Hard-hat clang 🔨'); }
    else { G.me.riskBump+=15; updateMy(true);
      toast('🚛 Cement Shortage hits you — next floor +15% risk (but pays more too)'); refreshTowers(); }
  }
}

/* ---- feedback fx ---- */
function shakeScreen(){ if(G.calm)return; const s=$('#screen'); s.classList.add('shake'); setTimeout(()=>s.classList.remove('shake'),520); }
function coinPop(){
  if(G.calm)return;
  const el=document.createElement('div'); el.textContent='🪙';
  el.style.cssText='position:absolute;left:30%;bottom:200px;font-size:24px;z-index:25;pointer-events:none;transition:all .6s ease;';
  $('#screen').appendChild(el);
  requestAnimationFrame(()=>{ el.style.bottom='320px'; el.style.opacity='0'; el.style.transform='scale(1.6) rotate(40deg)'; });
  setTimeout(()=>el.remove(),650);
}
function confetti(mult){
  if(G.calm)return;
  const n=Math.min(60, 8+Math.round(mult*4));
  for(let i=0;i<n;i++){
    const c=document.createElement('div');
    const col=pick(['#ffc62e','#13c46a','#1f6bff','#ff5fa2','#fff']);
    c.style.cssText=`position:absolute;z-index:70;width:8px;height:12px;background:${col};border:1.5px solid #1d1733;
      left:${rnd(10,90)}%;top:-12px;pointer-events:none;border-radius:2px;`;
    $('#screen').appendChild(c);
    const dx=rnd(-40,40), dur=rnd(900,1700);
    c.animate([{transform:'transl(0,0) rotate(0)',opacity:1},{transform:`translate(${dx}px,${rnd(500,800)}px) rotate(${rnd(180,720)}deg)`,opacity:.9}],{duration:dur,easing:'cubic-bezier(.3,.7,.4,1)'});
    setTimeout(()=>c.remove(),dur);
  }
}
function buildTicker(){
  const items = TICKER.map((s,i)=>`<span class="${i===0?'hot':''}">${s}</span>`).join('');
  $('#ticker').innerHTML = items + items; // duplicated for a seamless continuous loop
}

/* ---- end the match shortly after I'm out ---- */
function endSoon(){
  if(G.design)return;
  setTimeout(()=>{ finalizeMatch(); }, 1500);
}
function finalizeMatch(){
  if(G.over)return; G.over=true;
  clearInterval(G.roundClock); G.rivalTimers.forEach(clearTimeout); G.rivalTimers=[];
  // resolve any still-building rivals: fast-forward them toward their personality target
  G.towers.forEach(t=>{
    if(t.isMe||t.state==='down'||t.state==='sold')return;
    const aim=Math.min(MAXF, Math.max(2, t.target + Math.round(rnd(-2,2))));
    let collapsed=false;
    while(t.floor<aim){
      const nf=t.floor+1;
      if(Math.random()*100 < TABLE[nf].col){ collapsed=true; break; }
      t.floor=nf;
    }
    if(collapsed){ t.state='down'; t.soldMult=null; }
    else { t.mult=TABLE[t.floor].mult; t.soldMult=t.mult; t.state='sold'; }
  });
  buildEnd(); buildResults();
  setTimeout(()=>go('end'),300);
}

/* ============================================================ 6.7 END */
function epithet(t){
  if(t.state==='down') return pick(EPITHETS.down).replace('{f}',t.floor);
  const m=t.soldMult||0;
  if(m>=4) return pick(EPITHETS.win);
  if(m>=1.5) return pick(EPITHETS.midSold);
  return pick(EPITHETS.earlySold);
}
function ranked(){
  return [...G.towers].map(t=>({t, val: t.state==='down'?-1:curMult(t)}))
    .sort((a,b)=>b.val-a.val);
}
function buildEnd(){
  const r=ranked();
  const top3=r.slice(0,3);
  const order=[1,0,2]; // visual: 2nd, 1st, 3rd
  $('#podium').innerHTML = order.map(pos=>{
    const e=top3[pos]; if(!e)return'';
    const t=e.t, rank=pos+1;
    const pay = t.state==='down'?'—':fmt(G.stake_each(t));
    return `<div class="pod p${rank}">
      <div class="pod-bubble"><b class="pb-name">${t.isMe?'YOU':t.short}</b>${epithet(t)}</div>
      <div class="pod-body">${t.body?`<img src="${t.body}" alt="">`:`<div class="pod-av${t.img?'':' ph'}">${t.img?`<img src="${t.img}" alt="">`:''}</div>`}</div>
      <div class="pod-block">
        <div class="pod-rank">#${rank}</div>
        <div class="pod-mult">${t.state==='down'?'💥':curMult(t).toFixed(2)+'×'}</div>
        <div class="pod-pay">${pay}</div>
      </div>
    </div>`;
  }).join('');
  $('#board').innerHTML = r.slice(3).map((e,i)=>{
    const t=e.t, rank=i+4;
    return `<div class="brow ${t.state==='down'?'collapsed':''} ${t.isMe?'me':''}">
      <span class="br-rank">#${rank}</span>
      <span class="br-av${t.img?'':' ph'}">${t.img?`<img src="${t.img}" alt="">`:''}</span>
      <span class="br-name">${t.isMe?'YOU':t.name}<br><span class="br-epi">${epithet(t)}</span></span>
      <span class="br-mult">${t.state==='down'?'COLLAPSED':curMult(t).toFixed(2)+'×'}</span>
    </div>`;
  }).join('');
}
// payout per tower for podium (uses each player's own stake = my stake for demo)
G.stake_each = t => G.stake * (t.soldMult||curMult(t));
$('#endAgain').addEventListener('click',()=>go('match'));

/* ============================================================ 6.8 RESULTS */
function buildResults(){
  const me=G.me; const won = me.state==='sold';
  const pay = won? +(G.stake*me.soldMult).toFixed(2) : 0;
  const net = won? +(pay-G.stake).toFixed(2) : -G.stake;
  const bestFloor = me.floor;
  $('#resBody').innerHTML = won ? `
    <div class="res-emoji">${me.soldMult>=4?'🤑':'😎'}</div>
    <div class="res-head">You banked</div>
    <div class="res-big win">${me.soldMult.toFixed(2)}× → ${fmt(pay)}</div>
    <div class="res-sub">${net>=0?'+':''}${fmt(net)} this round</div>
    <div class="res-stats">
      <div class="res-stat"><div class="rs-num">${bestFloor}</div><div class="rs-lbl">best floor</div></div>
      <div class="res-stat"><div class="rs-num">${me.soldMult.toFixed(2)}×</div><div class="rs-lbl">cashed at</div></div>
      <div class="res-stat"><div class="rs-num">🔥${Math.max(1,Math.round(me.soldMult))}</div><div class="rs-lbl">streak</div></div>
    </div>
    <div class="res-xp"><div class="xp-top"><span>Level 6 · Site Foreman</span><span>+${20+bestFloor*5} XP</span></div><div class="xp-bar"><i id="xpFill"></i></div></div>
  ` : `
    <div class="res-emoji">😵</div>
    <div class="res-head">Your tower ate dirt</div>
    <div class="res-big loss">💥 floor ${bestFloor}</div>
    <div class="res-sub">The house keeps your ${fmt(G.stake)} stake.</div>
    <div class="res-stats">
      <div class="res-stat"><div class="rs-num">${bestFloor}</div><div class="rs-lbl">best floor</div></div>
      <div class="res-stat"><div class="rs-num">${TABLE[bestFloor].mult.toFixed(2)}×</div><div class="rs-lbl">peaked at</div></div>
      <div class="res-stat"><div class="rs-num">−${fmt(G.stake).replace('£','£')}</div><div class="rs-lbl">net</div></div>
    </div>
    <div class="res-xp"><div class="xp-top"><span>Level 6 · Site Foreman</span><span>+${10+bestFloor*3} XP</span></div><div class="xp-bar"><i id="xpFill"></i></div></div>
  `;
  setTimeout(()=>{ const x=$('#xpFill'); if(x) x.style.width=(won?72:48)+'%'; },350);
  // RG strip
  const mins=Math.floor((Date.now()-G.sessionStart)/60000), secs=Math.floor((Date.now()-G.sessionStart)/1000)%60;
  $('#sessTime').textContent=`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  const ne=$('#sessNet'); ne.textContent=(G.sessionNet>=0?'+':'−')+fmt(Math.abs(G.sessionNet)).replace('£','£');
  ne.className=G.sessionNet>=0?'net-pos':'net-neg';
}
// play again with 5s requeue
let reqInt;
$('#resAgain').addEventListener('click',()=>go('match'));
$$('[data-screen="results"]').forEach(()=>{});
// start countdown when results shown
const obs=new MutationObserver(()=>{
  const r=$('[data-screen="results"]');
  if(r.classList.contains('active') && !G.design){
    let n=5; $('#reqTimer').textContent=n; clearInterval(reqInt);
    reqInt=setInterval(()=>{ n--; if(n<=0){clearInterval(reqInt); if(current==='results')go('match');} else $('#reqTimer').textContent=n; },1000);
  } else clearInterval(reqInt);
});
obs.observe($('[data-screen="results"]'),{attributes:true,attributeFilter:['class']});

/* ============================================================ 6.9 ONBOARDING */
let obFloor=0, obStep=0;
const OB_SCRIPT=[
  '¡Hola! I\'m El Ladrillo. Tap <b>BUILD</b> to stack a floor — your number climbs.',
  'Nice! Higher floor = bigger multiplier… but a bigger chance it all tumbles. 🧱',
  'Keep building if you\'re brave. When you\'re happy — <b>SELL</b> to bank it.',
  'That\'s it! Build to climb, sell to bank. Now go fleece some rival developers. 😏',
];
function renderObFavors(){
  const tray=$('#obFavTray'); if(!tray)return;
  tray.innerHTML = FAVORS.map((f,i)=>`
    <div class="fav-card ${f.cls}" data-i="${i}">
      <span class="fc-type">${f.type}</span>
      <span class="fc-ico">${f.ic}</span>
      <span class="fc-name">${f.name}</span>
      <span class="fc-eff">${f.eff}</span>
    </div>`).join('');
  tray.querySelectorAll('.fav-card').forEach(el=>el.addEventListener('click',()=>{
    const f=FAVORS[+el.dataset.i];
    tray.querySelectorAll('.fav-card').forEach(c=>c.classList.remove('armed'));
    el.classList.add('armed');
    $('#obSpeech').innerHTML = `<b>${f.ic} ${f.name}</b> — ${f.eff}. In a match, arm a favor then tap a rival to play it. Sabotage bumps their risk <b>and</b> their reward. 😏`;
  }));
}
function startOnboard(){ obFloor=0; obStep=0; const sec=$('.screen[data-screen="onboard"]'); sec.classList.remove('fav-on','ob-collapsing'); $('#obTower').classList.remove('sway-ob','tumble'); renderObTower(); $('#obSpeech').innerHTML=OB_SCRIPT[0]; $('#obFavors').hidden=true; $('#skipOnboard').textContent='Skip ›'; renderObFavors(); }
function renderObTower(){
  $('#obTower').innerHTML='<div class="floor fl-plot"></div>'+Array.from({length:obFloor},(_,i)=>`<div class="floor fl-${band(i+1)} ${i+1===obFloor?'cap':''}"></div>`).join('');
}
function obCollapse(){
  const sec=$('.screen[data-screen="onboard"]'); const tw=$('#obTower');
  sec.classList.add('ob-collapsing'); tw.classList.remove('sway-ob'); tw.classList.add('tumble');
  $('#obSpeech').innerHTML='💥 ¡Se cayó! It toppled — you pushed too high. Build to climb, but <b>SELL before it falls</b>.';
  toast('💥 Collapsed at the top! The house keeps the stake.',2600);
  setTimeout(()=>{
    sec.classList.remove('ob-collapsing'); tw.classList.remove('tumble'); obFloor=0; renderObTower();
    // reveal the favors after the fall, same as cashing out
    $('#obFavors').hidden=false; sec.classList.add('fav-on');
    $('#obSpeech').innerHTML="That's the risk! One last trick — up top are your <b>Favors</b>. Tap one to see what it does, then hit <b>Let's play</b>.";
    $('#skipOnboard').textContent="Let's play ›";
  },2400);
}
$('#obBuild').addEventListener('click',()=>{
  const sec=$('.screen[data-screen="onboard"]');
  if(sec.classList.contains('fav-on')){ startOnboard(); return; }
  if(sec.classList.contains('ob-collapsing')) return;
  obFloor=Math.min(16,obFloor+1);
  renderObTower();
  $('#obTower').classList.toggle('sway-ob', obFloor>=9);
  if(obFloor>=16){ obCollapse(); return; }
  if(obFloor>=10) $('#obSpeech').innerHTML='Careful — the taller it climbs, the wilder it sways. <b>SELL</b> to bank before it falls!';
  else $('#obSpeech').innerHTML=OB_SCRIPT[Math.min(2,obFloor>=2?2:obFloor)];
});
$('#obSell').addEventListener('click',()=>{
  const sec=$('.screen[data-screen="onboard"]');
  if(sec.classList.contains('fav-on')){ startOnboard(); return; }
  if(sec.classList.contains('ob-collapsing')) return;
  $('#obTower').classList.remove('sway-ob');
  toast(`💰 Sold @ ${TABLE[obFloor].mult.toFixed(2)}×! You've got it.`,2200);
  // reveal favors at the top now the build/sell lesson is done
  $('#obFavors').hidden=false;
  $('.screen[data-screen="onboard"]').classList.add('fav-on');
  $('#obSpeech').innerHTML='Banked it! One last trick — up top are your <b>Favors</b>. Tap one to see what it does, then hit <b>Let\'s play</b>.';
  $('#skipOnboard').textContent="Let's play ›";
});
$('#skipOnboard').addEventListener('click',()=>go('lobby'));

/* ============================================================ SPLASH */
function buildSplash(){ /* city skyline is drawn via CSS background (assets/city.png) */ }
const splashTap=$('#splashTap');
if(splashTap) splashTap.addEventListener('click',()=>go('lobby'));

/* ============================================================ CALM MODE */
$('#calmToggle').addEventListener('click',function(){
  G.calm=!G.calm; document.body.classList.toggle('calm',G.calm);
  this.querySelector('b').textContent=G.calm?'on':'off';
});

/* ============================================================ DESIGN-MODE API (Tweaks) */
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
// give the 7 rivals a representative spread so the skyline looks alive while frozen
function seedRivals(){
  const preset=[{f:6,s:'build'},{f:9,s:'hold'},{f:4,s:'sold'},{f:11,s:'build'},{f:13,s:'build'},{f:7,s:'sold'},{f:5,s:'down'}];
  let i=0;
  G.towers.forEach(t=>{ if(t.isMe)return; const p=preset[i++%preset.length];
    t.floor=p.f; t.state=p.s; t.riskBump=0; t.soldMult = p.s==='sold'?TABLE[p.f].mult:null; });
}
function seedFinishedMatch(outcome){
  const rivals = shuffle([...ROSTER]).slice(0,7).map(r=>mkTower(r,false));
  G.me = mkTower({name:'YOU',short:'YOU',av:'YOUR\\navatar',img:YOU_IMG,target:99,j:0},true);
  G.towers=[rivals[0],rivals[1],rivals[2],G.me,rivals[3],rivals[4],rivals[5],rivals[6]];
  const preset=[{f:10,s:'sold'},{f:9,s:'down'},{f:6,s:'sold'},{f:13,s:'sold'},{f:4,s:'down'},{f:8,s:'sold'},{f:11,s:'sold'}];
  let i=0; G.towers.forEach(t=>{ if(t.isMe)return; const p=preset[i++]; t.floor=p.f; t.state=p.s; t.soldMult=p.s==='sold'?TABLE[p.f].mult:null; });
  if(outcome==='loss'){ G.me.floor=11; G.me.state='down'; G.me.soldMult=null; }
  else { G.me.floor=9; G.me.state='sold'; G.me.soldMult=TABLE[9].mult; }
}
function applyHud(tw){
  G.design=true;
  if(current!=='hud' || !G.me){ go('hud'); } // builds static towers (design branch)
  const me=G.me; if(!me) return;
  me.floor = clampN(tw.myFloor|0,0,MAXF); me.riskBump=0;
  if(tw.myState==='sold'){ me.state='sold'; me.soldMult=TABLE[me.floor].mult; }
  else if(tw.myState==='down'){ me.state='down'; me.soldMult=null; }
  else { me.state = tw.myState==='hold'?'hold':'build'; me.soldMult=null; }
  $('#roundNo').textContent=String(tw.round||7).padStart(2,'0');
  // event banner
  const evWrap=$('#eventBanner');
  if(tw.event && tw.event!=='none'){
    const ev=EVENTS.find(e=>e.t===tw.event)||EVENTS[0];
    $('#evIcon').textContent=ev.ic; $('#evTitle').textContent=ev.t; $('#evSub').textContent=ev.s;
    evWrap.classList.remove('show','ev-good','ev-bad','ev-neutral');
    evWrap.classList.add('ev-'+evTone(ev)); void evWrap.offsetWidth; evWrap.classList.add('show');
  } else evWrap.classList.remove('show');
  $('#skyline').classList.toggle('storm', !!tw.storm);
  const bar=$('#timerbar');
  bar.classList.toggle('low', !!tw.timerLow);
  $('#timerFill').style.width = tw.timerLow ? '11%' : '100%';
  $('#timerNum').textContent = tw.timerLow ? '0.6s' : '6.0s';
  $('#skyline').classList.toggle('targeting', !!tw.targeting);
  $('#blockWindow').classList.toggle('show', !!tw.blockWindow);
  setButtons(!tw.buttonsLocked);
  renderTowers(); updateMy(true);
}
window.LAD = {
  setDesign(on){ G.design=!!on; if(on){ clearInterval(G.roundClock); G.rivalTimers.forEach(clearTimeout); G.rivalTimers=[]; } else { G.over=false; } },
  go(name){
    if(name==='end'||name==='results'){ seedFinishedMatch(arguments[1]); }
    go(name);
    if(name==='end') buildEnd();
    if(name==='results') buildResults();
  },
  applyHud,
  EVENTS,
  current(){ return current; }
};

/* ============================================================ BOOT */
// Freeze is controlled live from the Tweaks panel ("Freeze game" toggle).
let FREEZE_GAME = false;
buildLobby(); buildSplash(); syncBet();
if(FREEZE_GAME){ G.design=true; go('hud'); }
else { go('splash'); }
})();
