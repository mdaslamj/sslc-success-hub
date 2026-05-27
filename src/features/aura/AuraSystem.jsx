
import { useState, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   AURA — Complete App · All 5 Screens
   Karnataka SSLC Adaptive Study Operating System
   ═══════════════════════════════════════════════════════════ */

// ── STUDENT ──────────────────────────────────────────────────
const STUDENT = { name:"Arjun", streak:7, xp:2340, momentum:68, daysToExam:298, examDate:"March 21, 2027" };

const RANKS = [
  {name:"Beginner",icon:"🌱",minXP:0},    {name:"Student",icon:"📖",minXP:500},
  {name:"Scholar", icon:"🎓",minXP:2000}, {name:"Expert", icon:"⚡",minXP:4000},
  {name:"Topper",  icon:"🏆",minXP:7000}, {name:"Legend", icon:"👑",minXP:12000},
];

// ── TOKENS ───────────────────────────────────────────────────
const SUB = {
  "Science":        {color:"#38BDF8",dark:"#0C2A3D",abbr:"SCI", glow:"#38BDF866"},
  "Mathematics":    {color:"#FBBF24",dark:"#2D2000",abbr:"MATH",glow:"#FBBF2466"},
  "Social Science": {color:"#4ADE80",dark:"#0A2D1A",abbr:"SSc", glow:"#4ADE8066"},
};
const URG = {
  critical:{color:"#F87171",filled:5,label:"CRITICAL"},
  warning: {color:"#FB923C",filled:4,label:"HIGH"},
  revision:{color:"#C084FC",filled:3,label:"REVISION"},
  good:    {color:"#4ADE80",filled:2,label:"STEADY"},
};

// ── DATA ─────────────────────────────────────────────────────
const CHAPTERS = [
  {id:"s1",s:"Science",       name:"Chemical Reactions & Equations",   m:72,lpd:8, mc:false,bm:14},
  {id:"s2",s:"Science",       name:"Acids, Bases & Salts",             m:45,lpd:15,mc:true, bm:10},
  {id:"s3",s:"Science",       name:"Metals & Non-metals",              m:38,lpd:22,mc:true, bm:12},
  {id:"s4",s:"Science",       name:"Carbon Compounds",                 m:28,lpd:35,mc:true, bm:12},
  {id:"s5",s:"Science",       name:"Life Processes",                   m:65,lpd:5, mc:false,bm:16},
  {id:"s6",s:"Science",       name:"Control & Coordination",           m:55,lpd:12,mc:false,bm:10},
  {id:"s7",s:"Science",       name:"Light – Reflection & Refraction",  m:80,lpd:45,mc:false,bm:12},
  {id:"s8",s:"Science",       name:"Electricity",                      m:42,lpd:18,mc:true, bm:14},
  {id:"s9",s:"Science",       name:"Magnetic Effects",                 m:60,lpd:9, mc:false,bm:8 },
  {id:"m1",s:"Mathematics",   name:"Real Numbers",                     m:85,lpd:60,mc:false,bm:8 },
  {id:"m2",s:"Mathematics",   name:"Polynomials",                      m:70,lpd:30,mc:false,bm:8 },
  {id:"m3",s:"Mathematics",   name:"Pair of Linear Equations",         m:55,lpd:14,mc:true, bm:10},
  {id:"m4",s:"Mathematics",   name:"Quadratic Equations",              m:40,lpd:20,mc:true, bm:12},
  {id:"m5",s:"Mathematics",   name:"Arithmetic Progressions",          m:62,lpd:10,mc:false,bm:10},
  {id:"m6",s:"Mathematics",   name:"Triangles",                        m:33,lpd:28,mc:true, bm:14},
  {id:"m7",s:"Mathematics",   name:"Coordinate Geometry",              m:58,lpd:8, mc:false,bm:8 },
  {id:"m8",s:"Mathematics",   name:"Trigonometry",                     m:48,lpd:16,mc:true, bm:12},
  {id:"m9",s:"Mathematics",   name:"Statistics",                       m:72,lpd:20,mc:false,bm:10},
  {id:"e1",s:"Social Science",name:"Nationalism in India",             m:75,lpd:7, mc:false,bm:10},
  {id:"e2",s:"Social Science",name:"The Nationalist Movement",         m:60,lpd:20,mc:false,bm:8 },
  {id:"e3",s:"Social Science",name:"Resources & Development",          m:45,lpd:25,mc:true, bm:10},
  {id:"e4",s:"Social Science",name:"Power Sharing",                    m:68,lpd:12,mc:false,bm:8 },
  {id:"e5",s:"Social Science",name:"Development (Economics)",          m:52,lpd:18,mc:true, bm:10},
  {id:"e6",s:"Social Science",name:"Water Resources",                  m:70,lpd:14,mc:false,bm:8 },
  {id:"e7",s:"Social Science",name:"Federalism",                       m:65,lpd:8, mc:false,bm:8 },
  {id:"e8",s:"Social Science",name:"Money & Credit",                   m:48,lpd:22,mc:true, bm:8 },
];

const QUESTS = [
  {id:"q1",subject:"Mathematics",  name:"Triangles",             mastery:33,xp:180,mins:45,urgency:"critical",mc:true, lpd:28,marks:14,
   tip:"14 marks sit here. One deep session today can push you from 33% to 50% — that's real points secured for March."},
  {id:"q2",subject:"Science",      name:"Carbon Compounds",      mastery:28,xp:170,mins:45,urgency:"critical",mc:true, lpd:35,marks:12,
   tip:"Misconception flagged here. Start with concept review — don't attempt problems first. Clear the confusion, then drill."},
  {id:"q3",subject:"Social Science",name:"Resources & Development",mastery:45,xp:120,mins:35,urgency:"warning",mc:true,lpd:25,marks:10,
   tip:"25 days of circling this chapter. Today you go in. Even 20 minutes will unlock the pattern — start small."},
];

const INSIGHTS = [
  {id:"i1",icon:"🔍",color:"#FB923C",bg:"#1C1000",border:"#FB923C33",tag:"PATTERN",
   title:"Avoidance pattern detected",
   body:"Carbon Compounds has been skipped for 35 days straight. This isn't laziness — it's a confidence block. The chapter feels overwhelming, so you avoid the door entirely. The fix is micro-entry: 10 minutes today, no pressure on results. Just open it."},
  {id:"i2",icon:"🌙",color:"#C084FC",bg:"#160D24",border:"#C084FC33",tag:"HABIT",
   title:"You're studying too late",
   body:"3 of your last 5 sessions happened after 10 PM. Late-night study hurts retention — your brain consolidates memories during sleep, but needs processing time before it. One afternoon session this week would compound your progress more than you think."},
  {id:"i3",icon:"💪",color:"#4ADE80",bg:"#0A1C0D",border:"#4ADE8033",tag:"STRENGTH",
   title:"Your discipline is real",
   body:"6 out of 7 days last week. For a board exam student managing school, pressure, and life — that is elite-level consistency. Don't let one missed day erase that narrative. You are someone who shows up. That matters more than any single session."},
  {id:"i4",icon:"📅",color:"#F87171",bg:"#1C0A0A",border:"#F8717133",tag:"URGENT",
   title:"298 days — don't be deceived",
   body:"298 days feels comfortable. It isn't. With 26 chapters across 3 subjects, you need 2–3 focused sessions per day to build proper mastery with revision cycles. Starting now gives you buffer. Starting in October gives you regret."},
];

const ACHIEVEMENTS = [
  {id:"a1",icon:"🔥",name:"7-Day Scholar",   desc:"7 consecutive days",    earned:true },
  {id:"a2",icon:"⚡",name:"Quick Starter",   desc:"Opened app on Day 1",   earned:true },
  {id:"a3",icon:"🎯",name:"First Quest",     desc:"Completed 1st quest",   earned:true },
  {id:"a4",icon:"📖",name:"Chapter Hunter",  desc:"Practiced 10 chapters", earned:true },
  {id:"a5",icon:"🏆",name:"Comeback King",   desc:"Returned after 3-day gap",earned:false},
  {id:"a6",icon:"👑",name:"Topper Mode",     desc:"Reach Expert rank",     earned:false},
  {id:"a7",icon:"💎",name:"Blueprint Master",desc:"Master all high-mark chapters",earned:false},
  {id:"a8",icon:"🌟",name:"30-Day Legend",   desc:"30-day consistency",    earned:false},
];

const TREND = [2,3,1,4,3,5,4,0,3,4,5,4,6,5];

// ── ALGORITHMS ───────────────────────────────────────────────
function priority(ch) {
  return (100-ch.m)*0.4 + ch.bm*1.5 + (ch.mc?20:0) + (ch.lpd>30?15:ch.lpd>20?7:0);
}
function sessionsNeeded(ch) {
  let b = ch.m<40?5:ch.m<60?4:ch.m<75?3:ch.m<90?2:1;
  if(ch.mc) b++; if(ch.lpd>30) b++;
  return b;
}
function sessionMins(ch) { return ch.m<40?45:ch.m<60?35:ch.m<75?30:25; }
function urgency(ch) {
  if(ch.m<40||(ch.mc&&ch.m<55)) return "critical";
  if(ch.m<65||ch.mc) return "warning";
  if(ch.lpd>30) return "revision";
  return "good";
}
function rankInfo(xp) {
  let cur=RANKS[0],nxt=RANKS[1];
  for(let i=0;i<RANKS.length-1;i++) {
    if(xp>=RANKS[i].minXP && xp<RANKS[i+1].minXP) { cur=RANKS[i]; nxt=RANKS[i+1]; break; }
  }
  if(xp>=RANKS[RANKS.length-1].minXP) { cur=RANKS[RANKS.length-1]; nxt=null; }
  const pct = nxt ? Math.round(((xp-cur.minXP)/(nxt.minXP-cur.minXP))*100) : 100;
  return {cur,nxt,pct};
}
function makeWeekPlan() {
  const sorted=[...CHAPTERS].sort((a,b)=>priority(b)-priority(a));
  return ["Today","Tomorrow","Wed","Thu","Fri","Sat","Sun"].map((label,i)=>{
    const off=(i*3)%sorted.length;
    const rot=[...sorted.slice(off),...sorted.slice(0,off)];
    const slots=[]; let mins=0; const subs=new Set();
    for(const ch of rot) {
      if(slots.length>=3||mins>=120) break;
      if(subs.size>=2) break;
      const m=sessionMins(ch);
      slots.push({...ch,mins:m,isRevision:ch.lpd>25&&ch.m>60});
      mins+=m; subs.add(ch.s);
    }
    return {label,slots,totalMins:mins};
  });
}

// ── SHARED UI ATOMS ───────────────────────────────────────────
function SectionLabel({children,style={}}) {
  return <div style={{fontSize:10,color:"#4B5563",letterSpacing:"0.12em",fontWeight:700,fontFamily:"'JetBrains Mono',monospace",marginBottom:12,...style}}>{children}</div>;
}
function SubBadge({subject}) {
  const s=SUB[subject];
  return <span style={{backgroundColor:s.dark,border:`1px solid ${s.color}44`,borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:700,color:s.color,letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace"}}>{s.abbr}</span>;
}
function XPPill({xp}) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,backgroundColor:"#1C1800",border:"1px solid #FBBF2444",borderRadius:20,padding:"3px 9px",fontSize:11,fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace"}}>⚡ +{xp} XP</span>;
}
function HPBar({mastery,color,glow}) {
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
        <span style={{fontSize:10,color:"#4B5563",letterSpacing:"0.08em",fontWeight:600}}>MASTERY HP</span>
        <span style={{fontSize:11,color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{mastery}%</span>
      </div>
      <div style={{height:6,backgroundColor:"#0A0A14",borderRadius:3,overflow:"hidden"}}>
        <div style={{width:`${mastery}%`,height:"100%",borderRadius:3,background:`linear-gradient(90deg,${color}66,${color})`,boxShadow:`0 0 8px ${glow}`,transition:"width 0.5s ease"}}/>
      </div>
    </div>
  );
}
function Card({children,style={}}) {
  return <div style={{backgroundColor:"#0F0F1C",border:"1px solid #1E1E30",borderRadius:14,...style}}>{children}</div>;
}

// ── SVG ATOMS ─────────────────────────────────────────────────
function CircleGauge({value,label,color="#8B5CF6",size=108}) {
  const r=44,cx=54,cy=54,circ=2*Math.PI*r,dash=circ*(value/100);
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox="0 0 108 108">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1E1E30" strokeWidth="8"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={circ-dash} strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} style={{filter:`drop-shadow(0 0 5px ${color}88)`}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:21,fontWeight:800,color:"#F0F0FA",lineHeight:1,fontFamily:"'JetBrains Mono',monospace"}}>{value}</span>
        <span style={{fontSize:8,color:"#4B5563",letterSpacing:"0.08em",marginTop:3,textAlign:"center"}}>{label}</span>
      </div>
    </div>
  );
}
function TrendLine({data}) {
  const W=280,H=58,p=6,max=Math.max(...data,1);
  const pts=data.map((v,i)=>`${p+(i/(data.length-1))*(W-2*p)},${H-p-(v/max)*(H-2*p)}`).join(" ");
  const area=`${p},${H-p} ${pts} ${W-p},${H-p}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:58}}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#tg)"/>
      <polyline points={pts} fill="none" stroke="#8B5CF6" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
        style={{filter:"drop-shadow(0 0 4px #8B5CF688)"}}/>
      {data.map((v,i)=> v===0
        ? <circle key={i} cx={p+(i/(data.length-1))*(W-2*p)} cy={H-p-(v/max)*(H-2*p)} r={3} fill="#F87171"/>
        : null
      )}
    </svg>
  );
}

// ── QUEST CARD (used on Today) ────────────────────────────────
function DiffDots({urgency:urg}) {
  const u=URG[urg];
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      {[1,2,3,4,5].map(i=>(
        <div key={i} style={{width:6,height:6,borderRadius:"50%",backgroundColor:i<=u.filled?u.color:"#1E1E30",boxShadow:i<=u.filled?`0 0 5px ${u.color}`:"none"}}/>
      ))}
      <span style={{fontSize:10,fontWeight:700,color:u.color,marginLeft:4,letterSpacing:"0.08em",fontFamily:"'JetBrains Mono',monospace"}}>{u.label}</span>
    </div>
  );
}
function StartBtn({color,glow,onClick}) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{padding:"9px 16px",background:`linear-gradient(135deg,${color},${color}AA)`,border:"none",borderRadius:9,cursor:"pointer",fontSize:11,fontWeight:800,color:"#08080E",fontFamily:"'Syne',sans-serif",letterSpacing:"0.06em",boxShadow:h?`0 0 20px ${glow}`:`0 4px 12px ${glow}44`,transform:h?"scale(1.04)":"scale(1)",transition:"all 0.15s"}}>
      START →
    </button>
  );
}
function QuestCard({quest,done,onStart}) {
  const [hov,setHov]=useState(false);
  const s=SUB[quest.subject];
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      borderRadius:16,
      background:done?"linear-gradient(135deg,#0D1C10,#0A160D)":"linear-gradient(155deg,#13131F,#0F0F1A)",
      border:done?"1px solid #4ADE8044":hov?`1px solid ${s.color}66`:"1px solid #1E1E30",
      padding:"18px",position:"relative",overflow:"hidden",
      transition:"all 0.2s",opacity:done?0.6:1,
      transform:hov&&!done?"translateY(-2px)":"none",
      boxShadow:hov&&!done?`0 8px 28px ${s.glow}`:"none",
      animation:"cardIn 0.3s ease both",
    }}>
      <div style={{position:"absolute",top:-40,right:-20,width:120,height:120,borderRadius:"50%",background:`radial-gradient(circle,${s.color}14,transparent)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",left:0,top:14,bottom:14,width:3,borderRadius:"0 3px 3px 0",backgroundColor:done?"#4ADE80":s.color,boxShadow:`0 0 10px ${done?"#4ADE80":s.glow}`}}/>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,paddingLeft:10}}>
        <SubBadge subject={quest.subject}/>
        {quest.mc&&<span style={{fontSize:9,color:"#F87171",backgroundColor:"#200A0A",border:"1px solid #F8717144",borderRadius:4,padding:"2px 7px",fontWeight:700,letterSpacing:"0.06em"}}>⚡ MISCONCEPTION</span>}
      </div>
      <div style={{fontSize:20,fontWeight:800,color:done?"#4ADE80":"#F0F0FA",fontFamily:"'Syne',sans-serif",marginBottom:8,paddingLeft:10,lineHeight:1.2,textDecoration:done?"line-through":"none"}}>{done?"✓ ":""}{quest.name}</div>
      <div style={{marginBottom:12,paddingLeft:10}}><DiffDots urgency={quest.urgency}/></div>
      <div style={{paddingLeft:10,marginBottom:12}}><HPBar mastery={quest.mastery} color={s.color} glow={s.glow}/></div>
      <div style={{backgroundColor:"#0A0A14",borderRadius:8,border:"1px solid #1E1E30",padding:"10px 12px",marginBottom:14,fontSize:12,color:"#6B7280",lineHeight:1.65,fontStyle:"italic"}}>"{quest.tip}"</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingLeft:10}}>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:12,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>⏱ {quest.mins}m</span>
          <XPPill xp={quest.xp}/>
        </div>
        {done ? <span style={{fontSize:12,fontWeight:700,color:"#4ADE80"}}>COMPLETE ✓</span>
               : <StartBtn color={s.color} glow={s.glow} onClick={onStart}/>}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  SCREEN 1 — TODAY
// ════════════════════════════════════════════════
function TodayScreen({done,onStart,earnedXP,totalXP}) {
  const doneCount=done.size, allDone=doneCount===QUESTS.length;
  const totalQXP=QUESTS.reduce((s,q)=>s+q.xp,0);
  const rank=rankInfo(totalXP);
  const greeting=STUDENT.streak>=5?`You've earned momentum, ${STUDENT.name}.`:`Morning, ${STUDENT.name} 👋`;
  return (
    <div style={{padding:"24px 18px 0"}}>
      {/* Greeting + streak */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontSize:11,color:"#4B5563",letterSpacing:"0.1em",fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>WEDNESDAY · 27 MAY 2026</div>
          <div style={{fontSize:22,fontWeight:800,fontFamily:"'Syne',sans-serif",lineHeight:1.2}}>{greeting}</div>
        </div>
        <div style={{backgroundColor:"#130C00",border:"1px solid #FB923C44",borderRadius:14,padding:"10px 14px",textAlign:"center",boxShadow:"0 0 16px #FB923C1A",flexShrink:0}}>
          <div style={{fontSize:24,animation:"streakPulse 2s ease-in-out infinite"}}>🔥</div>
          <div style={{fontSize:20,fontWeight:800,color:"#FB923C",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{STUDENT.streak}</div>
          <div style={{fontSize:9,color:"#78350F",letterSpacing:"0.1em",marginTop:2}}>STREAK</div>
        </div>
      </div>

      {/* Rank bar */}
      <Card style={{padding:"12px 14px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
          <span style={{fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{rank.cur.icon} {rank.cur.name}</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13,fontWeight:700,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace"}}>{totalXP.toLocaleString()} XP</span>
            {rank.nxt&&<span style={{fontSize:11,color:"#4B5563"}}>→ {rank.nxt.name}</span>}
          </div>
        </div>
        <div style={{height:5,backgroundColor:"#08080E",borderRadius:3,overflow:"hidden"}}>
          <div style={{width:`${rank.pct}%`,height:"100%",borderRadius:3,background:"linear-gradient(90deg,#7C3AED,#FBBF24)",transition:"width 0.7s ease"}}/>
        </div>
      </Card>

      {/* Quest hero */}
      <div style={{background:"linear-gradient(135deg,#160D30,#0C1628)",border:"1px solid #2E1F5E",borderRadius:16,padding:"18px",marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-30,width:150,height:150,borderRadius:"50%",background:"radial-gradient(circle,#8B5CF622,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <SectionLabel>TODAY'S QUESTS</SectionLabel>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              <span style={{fontSize:48,fontWeight:800,lineHeight:1,fontFamily:"'Syne',sans-serif"}}>{doneCount}</span>
              <span style={{fontSize:24,color:"#2A2A40",fontWeight:700,fontFamily:"'Syne',sans-serif"}}>/{QUESTS.length}</span>
            </div>
            <div style={{fontSize:13,color:allDone?"#4ADE80":"#6B7280",marginTop:4,fontWeight:allDone?700:400}}>
              {allDone?"🏆 Perfect day! All quests done.":`${QUESTS.length-doneCount} remaining today`}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"#FBBF24",letterSpacing:"0.1em",fontWeight:700,marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>AVAILABLE</div>
            <div style={{fontSize:30,fontWeight:800,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",textShadow:"0 0 16px #FBBF2466"}}>⚡{totalQXP-earnedXP}</div>
            {earnedXP>0&&<div style={{fontSize:11,color:"#4ADE80",fontWeight:600,marginTop:2}}>+{earnedXP} earned</div>}
          </div>
        </div>
        <div style={{marginTop:14,height:4,backgroundColor:"#08080E",borderRadius:2,overflow:"hidden"}}>
          <div style={{width:`${(doneCount/QUESTS.length)*100}%`,height:"100%",borderRadius:2,background:"linear-gradient(90deg,#7C3AED,#34D399)",transition:"width 0.5s"}}/>
        </div>
      </div>

      {/* Quest cards */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {QUESTS.map(q=>(
          <QuestCard key={q.id} quest={q} done={done.has(q.id)} onStart={()=>onStart(q)}/>
        ))}
      </div>

      {/* Streak bonus */}
      <div style={{marginTop:14,background:"linear-gradient(135deg,#1C1000,#140C00)",border:"1px solid #FB923C33",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28,flexShrink:0}}>🔥</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:"#FB923C",fontFamily:"'Syne',sans-serif",marginBottom:3}}>Protect your {STUDENT.streak}-day streak</div>
          <div style={{fontSize:12,color:"#78350F"}}>Complete all quests today to earn +50 bonus XP.</div>
        </div>
        <div style={{backgroundColor:"#FB923C22",border:"1px solid #FB923C44",borderRadius:8,padding:"5px 10px",fontSize:12,fontWeight:800,color:"#FB923C",fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>+50</div>
      </div>

      {/* Coach card */}
      <Card style={{padding:"14px 16px",marginTop:14}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✦</div>
          <span style={{fontSize:10,color:"#8B5CF6",letterSpacing:"0.1em",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>AURA COACH</span>
        </div>
        <div style={{fontSize:13,color:"#9CA3AF",lineHeight:1.75}}>
          Triangles is your highest-risk chapter — 14 marks, only 33% mastered. One focused session today could push that to 50%. That's the difference between a grade and a rank.
        </div>
      </Card>

      <div style={{marginTop:14,textAlign:"center",paddingBottom:6}}>
        <span style={{fontSize:11,color:"#1E1E30",fontFamily:"'JetBrains Mono',monospace"}}>{STUDENT.daysToExam} days to SSLC · {STUDENT.examDate}</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  SCREEN 2 — COACH
// ════════════════════════════════════════════════
function CoachScreen() {
  const [expanded,setExpanded]=useState(null);
  return (
    <div style={{padding:"24px 18px 0"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <div style={{width:46,height:46,borderRadius:"50%",flexShrink:0,background:"linear-gradient(135deg,#7C3AED,#4F46E5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,boxShadow:"0 0 20px #7C3AED66"}}>✦</div>
        <div>
          <div style={{fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>Aura Coach</div>
          <div style={{fontSize:12,color:"#4B5563",marginTop:1}}>Your adaptive study mentor</div>
        </div>
      </div>

      {/* Emotional state */}
      <div style={{backgroundColor:"#0A1C10",border:"1px solid #4ADE8044",borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:9,height:9,borderRadius:"50%",backgroundColor:"#4ADE80",boxShadow:"0 0 8px #4ADE80",flexShrink:0,animation:"streakPulse 3s ease-in-out infinite"}}/>
        <div style={{fontSize:13,lineHeight:1.5}}>
          <span style={{color:"#4ADE80",fontWeight:700}}>Momentum building </span>
          <span style={{color:"#6B7280"}}>— consistency improving, 2 chapters in avoidance zone</span>
        </div>
      </div>

      <SectionLabel>AURA HAS NOTICED — {INSIGHTS.length} PATTERNS</SectionLabel>

      {/* Insight cards */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {INSIGHTS.map(ins=>(
          <div key={ins.id} onClick={()=>setExpanded(expanded===ins.id?null:ins.id)}
            style={{backgroundColor:ins.bg,border:`1px solid ${ins.border}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",transition:"all 0.2s",boxShadow:expanded===ins.id?`0 0 20px ${ins.color}22`:"none"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
              <span style={{fontSize:22,flexShrink:0,marginTop:1}}>{ins.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#F0F0FA",fontFamily:"'Syne',sans-serif",lineHeight:1.2,flex:1}}>{ins.title}</div>
                  <span style={{fontSize:9,fontWeight:700,color:ins.color,backgroundColor:`${ins.color}18`,border:`1px solid ${ins.color}44`,borderRadius:4,padding:"2px 6px",letterSpacing:"0.08em",flexShrink:0,marginLeft:8,fontFamily:"'JetBrains Mono',monospace"}}>{ins.tag}</span>
                </div>
                <div style={{fontSize:13,color:"#9CA3AF",lineHeight:1.7,overflow:"hidden",maxHeight:expanded===ins.id?"400px":"3.4em",transition:"max-height 0.3s ease"}}>{ins.body}</div>
                {expanded!==ins.id&&<div style={{fontSize:11,color:ins.color,marginTop:4,fontWeight:600}}>Read more ↓</div>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Week in review */}
      <Card style={{padding:"16px",marginTop:16}}>
        <SectionLabel>WEEK IN REVIEW</SectionLabel>
        <div style={{display:"flex",gap:10}}>
          {[{l:"Sessions",v:"8",i:"📚",c:"#8B5CF6"},{l:"Streak",v:"7d",i:"🔥",c:"#FB923C"},{l:"XP",v:"1,240",i:"⚡",c:"#FBBF24"},{l:"Discipline",v:"86%",i:"💪",c:"#4ADE80"}].map(s=>(
            <div key={s.l} style={{flex:1,textAlign:"center",backgroundColor:"#0A0A14",borderRadius:10,padding:"10px 4px"}}>
              <div style={{fontSize:18,marginBottom:4}}>{s.i}</div>
              <div style={{fontSize:15,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{s.v}</div>
              <div style={{fontSize:9,color:"#4B5563",marginTop:3,letterSpacing:"0.06em"}}>{s.l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Emotional message */}
      <div style={{marginTop:14,background:"linear-gradient(135deg,#0D0A1E,#0A0D1A)",border:"1px solid #8B5CF633",borderRadius:14,padding:"16px"}}>
        <div style={{fontSize:10,color:"#8B5CF6",letterSpacing:"0.12em",fontWeight:700,marginBottom:10,fontFamily:"'JetBrains Mono',monospace"}}>FROM AURA, TODAY</div>
        <div style={{fontSize:14,color:"#D1D5DB",lineHeight:1.8,fontStyle:"italic"}}>
          "A timetable tells you what to do. I understand what you can handle. Today, you handle three things — nothing more, nothing less. That's enough to keep moving forward."
        </div>
      </div>
      <div style={{height:16}}/>
    </div>
  );
}

// ════════════════════════════════════════════════
//  SCREEN 3 — CHAPTER MAP
// ════════════════════════════════════════════════
function MapScreen() {
  const [activeSub,setActiveSub]=useState("Science");
  const [detail,setDetail]=useState(null);
  const subjects=["Science","Mathematics","Social Science"];
  const filtered=[...CHAPTERS].filter(c=>c.s===activeSub).sort((a,b)=>priority(b)-priority(a));
  const avgM=Math.round(filtered.reduce((s,c)=>s+c.m,0)/filtered.length);

  return (
    <div style={{padding:"24px 18px 0"}}>
      <div style={{fontSize:20,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:4}}>Chapter Map</div>
      <div style={{fontSize:13,color:"#4B5563",marginBottom:18}}>All chapters · health at a glance · tap to expand</div>

      {/* Subject tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {subjects.map(sub=>{
          const s=SUB[sub], active=activeSub===sub;
          return (
            <button key={sub} onClick={()=>{setActiveSub(sub);setDetail(null);}} style={{
              padding:"7px 14px",borderRadius:20,border:active?`1px solid ${s.color}66`:"1px solid #1E1E30",
              cursor:"pointer",flexShrink:0,transition:"all 0.2s",
              backgroundColor:active?s.dark:"transparent",color:active?s.color:"#4B5563",
              fontSize:12,fontWeight:active?700:400,boxShadow:active?`0 0 12px ${s.color}22`:"none",
            }}>{sub}</button>
          );
        })}
      </div>

      {/* Stats strip */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[
          {l:"Critical",n:filtered.filter(c=>urgency(c)==="critical").length,c:"#F87171"},
          {l:"High",    n:filtered.filter(c=>urgency(c)==="warning").length, c:"#FB923C"},
          {l:"Revision",n:filtered.filter(c=>urgency(c)==="revision").length,c:"#C084FC"},
          {l:"Steady",  n:filtered.filter(c=>urgency(c)==="good").length,    c:"#4ADE80"},
        ].map(s=>(
          <div key={s.l} style={{flex:1,backgroundColor:"#0F0F1C",border:`1px solid ${s.c}22`,borderRadius:10,padding:"8px 4px",textAlign:"center"}}>
            <div style={{fontSize:18,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.n}</div>
            <div style={{fontSize:9,color:"#4B5563",letterSpacing:"0.06em"}}>{s.l.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Subject avg mastery */}
      <Card style={{padding:"12px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,color:"#9CA3AF"}}>
          <span style={{color:SUB[activeSub].color,fontWeight:700}}>{activeSub}</span> avg mastery
        </div>
        <div>
          <span style={{fontSize:18,fontWeight:800,color:SUB[activeSub].color,fontFamily:"'JetBrains Mono',monospace"}}>{avgM}%</span>
          <div style={{height:4,width:80,backgroundColor:"#08080E",borderRadius:2,overflow:"hidden",marginTop:4}}>
            <div style={{width:`${avgM}%`,height:"100%",borderRadius:2,backgroundColor:SUB[activeSub].color}}/>
          </div>
        </div>
      </Card>

      {/* Chapter list */}
      <Card style={{overflow:"hidden"}}>
        {filtered.map((ch,i)=>{
          const u=urgency(ch),ug=URG[u],isOpen=detail?.id===ch.id;
          return (
            <div key={ch.id} onClick={()=>setDetail(isOpen?null:ch)}
              style={{padding:"13px 16px",borderBottom:i<filtered.length-1?"1px solid #1E1E30":"none",cursor:"pointer",transition:"background 0.15s",backgroundColor:isOpen?"#0A0A14":"transparent"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:4,height:38,borderRadius:2,backgroundColor:ug.color,flexShrink:0,boxShadow:`0 0 8px ${ug.color}66`}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                    <span style={{fontSize:14,fontWeight:600,color:"#F0F0FA",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{ch.name}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:8}}>
                      {ch.mc&&<span style={{fontSize:10,color:"#F87171"}}>⚡</span>}
                      {ch.lpd>30&&<span style={{fontSize:10,color:"#C084FC"}}>🔄</span>}
                      <span style={{fontSize:10,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>{ch.bm}m</span>
                    </div>
                  </div>
                  <div style={{height:4,backgroundColor:"#08080E",borderRadius:2,overflow:"hidden"}}>
                    <div style={{width:`${ch.m}%`,height:"100%",borderRadius:2,backgroundColor:ug.color,transition:"width 0.5s"}}/>
                  </div>
                  {isOpen&&(
                    <div style={{marginTop:12,display:"flex",gap:12,flexWrap:"wrap"}}>
                      {[
                        {l:"Mastery",v:`${ch.m}%`,c:ug.color},
                        {l:"Sessions needed",v:sessionsNeeded(ch),c:"#8B5CF6"},
                        {l:"Last practiced",v:`${ch.lpd}d ago`,c:"#4B5563"},
                        {l:"Blueprint marks",v:ch.bm,c:"#FBBF24"},
                      ].map(s=>(
                        <div key={s.l} style={{minWidth:60}}>
                          <div style={{fontSize:14,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</div>
                          <div style={{fontSize:9,color:"#4B5563",letterSpacing:"0.05em"}}>{s.l.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </Card>
      <div style={{height:16}}/>
    </div>
  );
}

// ════════════════════════════════════════════════
//  SCREEN 4 — PLANNER
// ════════════════════════════════════════════════
function PlanScreen() {
  const weekPlan=useMemo(()=>makeWeekPlan(),[]);
  const [activeDay,setActiveDay]=useState(0);
  const day=weekPlan[activeDay];

  return (
    <div style={{padding:"24px 18px 0"}}>
      {/* Exam banner */}
      <div style={{background:"linear-gradient(135deg,#1C0A0A,#160808)",border:"1px solid #F8717133",borderRadius:14,padding:"14px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:10,color:"#F87171",letterSpacing:"0.1em",fontWeight:700,marginBottom:4,fontFamily:"'JetBrains Mono',monospace"}}>EXAM COUNTDOWN</div>
          <div style={{fontSize:13,color:"#F0F0FA"}}>Karnataka SSLC · {STUDENT.examDate}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:32,fontWeight:800,color:"#F87171",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{STUDENT.daysToExam}</div>
          <div style={{fontSize:10,color:"#4B5563",letterSpacing:"0.06em"}}>DAYS LEFT</div>
        </div>
      </div>

      <SectionLabel>7-DAY MISSION MAP</SectionLabel>

      {/* Day strip */}
      <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
        {weekPlan.map((d,i)=>(
          <button key={d.label} onClick={()=>setActiveDay(i)} style={{
            flexShrink:0,minWidth:62,padding:"10px 6px",
            backgroundColor:activeDay===i?"#1A1228":i===0?"#0F0F1C":"transparent",
            border:activeDay===i?"1px solid #8B5CF666":i===0?"1px solid #1E1E30":"1px solid #14141E",
            borderRadius:12,cursor:"pointer",textAlign:"center",
            boxShadow:activeDay===i?"0 0 16px #8B5CF622":"none",transition:"all 0.2s",
          }}>
            <div style={{fontSize:10,fontWeight:700,color:activeDay===i?"#8B5CF6":"#4B5563",letterSpacing:"0.08em",marginBottom:6}}>{d.label.toUpperCase().slice(0,3)}</div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:6,alignItems:"center"}}>
              {d.slots.slice(0,2).map(s=>(
                <div key={s.id} style={{width:8,height:8,borderRadius:"50%",backgroundColor:SUB[s.s]?.color||"#999",boxShadow:`0 0 4px ${SUB[s.s]?.glow||"#999"}`}}/>
              ))}
            </div>
            <div style={{fontSize:9,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>{d.totalMins}m</div>
          </button>
        ))}
      </div>

      {/* Day detail */}
      <Card style={{padding:"16px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:16,fontWeight:800,fontFamily:"'Syne',sans-serif"}}>{day.label}</div>
          <span style={{fontSize:12,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>{day.totalMins} min · {day.slots.length} chapters</span>
        </div>
        {day.slots.map((slot,i)=>(
          <div key={slot.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<day.slots.length-1?"1px solid #1E1E30":"none"}}>
            <div style={{width:4,height:40,borderRadius:2,backgroundColor:slot.isRevision?"#C084FC":SUB[slot.s]?.color,flexShrink:0,boxShadow:`0 0 8px ${slot.isRevision?"#C084FC66":SUB[slot.s]?.glow}`}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <span style={{fontSize:13,fontWeight:600,color:"#F0F0FA",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{slot.name}</span>
                {slot.isRevision&&<span style={{fontSize:9,color:"#C084FC",backgroundColor:"#1A0D28",border:"1px solid #C084FC44",borderRadius:4,padding:"1px 6px",fontWeight:700,flexShrink:0}}>🔄 REVISION</span>}
              </div>
              <div style={{height:3,backgroundColor:"#08080E",borderRadius:2,overflow:"hidden",width:60}}>
                <div style={{width:`${slot.m}%`,height:"100%",backgroundColor:SUB[slot.s]?.color}}/>
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,color:"#F0F0FA",fontFamily:"'JetBrains Mono',monospace"}}>{slot.mins}m</div>
              <div style={{fontSize:10,color:"#4B5563"}}>{slot.bm} marks</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Recovery mode note */}
      <Card style={{padding:"14px 16px",marginBottom:14}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:20,flexShrink:0}}>🎯</span>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#F0F0FA",fontFamily:"'Syne',sans-serif",marginBottom:4}}>This week's strategy</div>
            <div style={{fontSize:12,color:"#6B7280",lineHeight:1.65}}>
              Front-load critical chapters early in the week when focus is highest. Revision sessions for mastered-but-stale chapters are auto-scheduled for Thursday and Saturday. Stay on plan — 3 sessions/day is enough to stay ahead.
            </div>
          </div>
        </div>
      </Card>

      {/* Spaced rep due */}
      {CHAPTERS.filter(c=>c.lpd>30&&c.m>=65).length>0&&(
        <div style={{backgroundColor:"#160D24",border:"1px solid #C084FC33",borderRadius:14,padding:"14px 16px"}}>
          <div style={{fontSize:10,color:"#C084FC",letterSpacing:"0.1em",fontWeight:700,marginBottom:8,fontFamily:"'JetBrains Mono',monospace"}}>🔄 SPACED REPETITION DUE</div>
          {CHAPTERS.filter(c=>c.lpd>30&&c.m>=65).slice(0,3).map(ch=>(
            <div key={ch.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:6,height:6,borderRadius:"50%",backgroundColor:SUB[ch.s].color,flexShrink:0}}/>
                <span style={{fontSize:13,color:"#D1D5DB"}}>{ch.name}</span>
              </div>
              <span style={{fontSize:11,color:"#C084FC",fontFamily:"'JetBrains Mono',monospace"}}>{ch.lpd}d ago</span>
            </div>
          ))}
          <div style={{fontSize:11,color:"#7C3AED",marginTop:6,lineHeight:1.5}}>Mastered but fading — scheduled for this week's revision slots.</div>
        </div>
      )}
      <div style={{height:16}}/>
    </div>
  );
}

// ════════════════════════════════════════════════
//  SCREEN 5 — PROFILE
// ════════════════════════════════════════════════
function ProfileScreen({totalXP}) {
  const rank=rankInfo(totalXP);
  const avgM=Math.round(CHAPTERS.reduce((s,c)=>s+c.m,0)/CHAPTERS.length);
  return (
    <div style={{padding:"24px 18px 0"}}>
      {/* Rank card */}
      <div style={{borderRadius:18,background:"linear-gradient(135deg,#1A0D30,#0C1228,#0A0A1C)",border:"1px solid #3B2F6044",padding:"22px",marginBottom:16,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-50,right:-30,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,#8B5CF622,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-60,left:-20,width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle,#FBBF2414,transparent 70%)",pointerEvents:"none"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:10,color:"#8B5CF6",letterSpacing:"0.12em",fontWeight:700,marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>CURRENT RANK</div>
            <div style={{fontSize:34,marginBottom:4}}>{rank.cur.icon}</div>
            <div style={{fontSize:28,fontWeight:800,fontFamily:"'Syne',sans-serif",lineHeight:1}}>{rank.cur.name}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"#FBBF24",letterSpacing:"0.12em",fontWeight:700,marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>TOTAL XP</div>
            <div style={{fontSize:32,fontWeight:800,color:"#FBBF24",fontFamily:"'JetBrains Mono',monospace",textShadow:"0 0 20px #FBBF2466"}}>{totalXP.toLocaleString()}</div>
            {rank.nxt&&<div style={{fontSize:11,color:"#4B5563",marginTop:4}}>{(rank.nxt.minXP-totalXP).toLocaleString()} XP → {rank.nxt.name}</div>}
          </div>
        </div>
        <div style={{marginTop:16,height:6,backgroundColor:"#08080E",borderRadius:3,overflow:"hidden"}}>
          <div style={{width:`${rank.pct}%`,height:"100%",borderRadius:3,background:"linear-gradient(90deg,#7C3AED,#A78BFA,#FBBF24)",boxShadow:"0 0 12px #8B5CF666",transition:"width 0.7s"}}/>
        </div>
        {rank.nxt&&<div style={{fontSize:10,color:"#4B5563",marginTop:6,textAlign:"right",fontFamily:"'JetBrains Mono',monospace"}}>{rank.pct}% to {rank.nxt.name}</div>}
      </div>

      {/* Stats grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {icon:"🔥",value:`${STUDENT.streak}d`,label:"Streak",color:"#FB923C"},
          {icon:"⚡",value:`${totalXP.toLocaleString()}`,label:"Total XP",color:"#FBBF24"},
          {icon:"📊",value:`${avgM}%`,label:"Avg Mastery",color:"#8B5CF6"},
          {icon:"✓",value:"8",label:"Sessions",color:"#4ADE80"},
        ].map(s=>(
          <Card key={s.label} style={{padding:"14px",display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:24,flexShrink:0}}>{s.icon}</span>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:s.color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{s.value}</div>
              <div style={{fontSize:10,color:"#4B5563",letterSpacing:"0.06em",marginTop:3}}>{s.label.toUpperCase()}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Gauges */}
      <Card style={{padding:"16px",marginBottom:16}}>
        <SectionLabel>PERFORMANCE GAUGES</SectionLabel>
        <div style={{display:"flex",justifyContent:"space-around",alignItems:"center"}}>
          <CircleGauge value={STUDENT.momentum} label="MOMENTUM"  color="#8B5CF6"/>
          <CircleGauge value={avgM}              label="READINESS" color="#FBBF24"/>
          <CircleGauge value={86}                label="DISCIPLINE" color="#4ADE80"/>
        </div>
      </Card>

      {/* Trend */}
      <Card style={{padding:"16px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <SectionLabel style={{marginBottom:0}}>14-DAY DISCIPLINE TREND</SectionLabel>
          <span style={{fontSize:10,color:"#F87171"}}>● = missed</span>
        </div>
        <TrendLine data={TREND}/>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}>
          <span style={{fontSize:10,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>14d ago</span>
          <span style={{fontSize:10,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>Today</span>
        </div>
      </Card>

      {/* Achievements */}
      <SectionLabel>ACHIEVEMENTS</SectionLabel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {ACHIEVEMENTS.map(a=>(
          <div key={a.id} style={{
            backgroundColor:a.earned?"#0F0F1C":"#0A0A12",
            border:a.earned?"1px solid #2A2A40":"1px solid #12121A",
            borderRadius:12,padding:"12px",opacity:a.earned?1:0.4,
          }}>
            <div style={{fontSize:24,marginBottom:6,filter:a.earned?"none":"grayscale(1)"}}>{a.icon}</div>
            <div style={{fontSize:12,fontWeight:700,color:a.earned?"#F0F0FA":"#4B5563",fontFamily:"'Syne',sans-serif"}}>{a.name}</div>
            <div style={{fontSize:10,color:"#4B5563",marginTop:2,lineHeight:1.4}}>{a.desc}</div>
            {a.earned&&<div style={{fontSize:9,color:"#4ADE80",marginTop:5,fontWeight:700}}>EARNED ✓</div>}
          </div>
        ))}
      </div>

      {/* Parent summary */}
      <button style={{width:"100%",padding:"14px",backgroundColor:"#0F0F1C",border:"1px solid #1E1E30",borderRadius:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        <span style={{fontSize:18}}>👨‍👩‍👦</span>
        <span style={{fontSize:14,fontWeight:600,color:"#9CA3AF"}}>Share progress with parent</span>
        <span style={{fontSize:12,color:"#4B5563",marginLeft:"auto"}}>→</span>
      </button>
      <div style={{height:16}}/>
    </div>
  );
}

// ════════════════════════════════════════════════
//  OVERLAYS
// ════════════════════════════════════════════════
function PracticeSheet({quest,onClose,onComplete}) {
  if(!quest) return null;
  const s=SUB[quest.subject];
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,zIndex:300,backgroundColor:"rgba(0,0,0,0.75)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:480,background:`linear-gradient(180deg,#1A1A2E,#0F0F1C)`,borderRadius:"22px 22px 0 0",border:`1px solid ${s.color}33`,borderBottom:"none",padding:"24px 22px 44px",animation:"slideUp 0.3s ease"}}>
        <div style={{width:40,height:4,borderRadius:2,backgroundColor:"#2A2A40",margin:"0 auto 22px"}}/>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
          <SubBadge subject={quest.subject}/><XPPill xp={quest.xp}/>
          <span style={{fontSize:12,color:"#4B5563",fontFamily:"'JetBrains Mono',monospace"}}>⏱ {quest.mins}m</span>
        </div>
        <div style={{fontSize:26,fontWeight:800,color:"#F0F0FA",marginBottom:4,fontFamily:"'Syne',sans-serif",lineHeight:1.2}}>{quest.name}</div>
        <div style={{fontSize:13,color:"#4B5563",marginBottom:20}}>{quest.marks} marks on the paper · Mastery at {quest.mastery}%</div>
        <div style={{backgroundColor:"#0A0A14",borderRadius:12,border:"1px solid #1E1E30",padding:"14px 16px",marginBottom:22}}>
          <div style={{fontSize:10,color:"#8B5CF6",letterSpacing:"0.12em",fontWeight:700,marginBottom:8,fontFamily:"'JetBrains Mono',monospace"}}>AURA COACH</div>
          <div style={{fontSize:14,color:"#D1D5DB",lineHeight:1.75}}>{quest.tip}</div>
        </div>
        <button onClick={()=>{onComplete(quest.id);onClose();}} style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${s.color},${s.color}AA)`,border:"none",borderRadius:14,cursor:"pointer",fontSize:16,fontWeight:800,color:"#08080E",fontFamily:"'Syne',sans-serif",letterSpacing:"0.06em",boxShadow:`0 6px 28px ${s.glow}`,marginBottom:12}}>
          ⚡ Start Adaptive Practice
        </button>
        <button onClick={onClose} style={{width:"100%",padding:"12px",background:"transparent",color:"#6B7280",border:"1px solid #1E1E30",borderRadius:12,cursor:"pointer",fontSize:14}}>Not now</button>
      </div>
    </div>
  );
}
function XPBurst({amount,visible}) {
  if(!visible) return null;
  return (
    <div style={{position:"fixed",top:"35%",left:"50%",transform:"translateX(-50%)",zIndex:500,pointerEvents:"none",animation:"burstUp 1.5s ease forwards"}}>
      <div style={{fontSize:34,fontWeight:800,color:"#FBBF24",fontFamily:"'Syne',sans-serif",textShadow:"0 0 30px #FBBF24, 0 0 60px #FBBF2466",whiteSpace:"nowrap"}}>⚡ +{amount} XP</div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  BOTTOM NAV
// ════════════════════════════════════════════════
const NAV=[
  {id:"today",symbol:"⬡",label:"Today"},
  {id:"coach",symbol:"✦",label:"Coach"},
  {id:"map",  symbol:"⊞",label:"Chapters"},
  {id:"plan", symbol:"▦",label:"Planner"},
  {id:"me",   symbol:"◉",label:"Profile"},
];
function BottomNav({active,onSelect}) {
  return (
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:200}}>
      <div style={{backgroundColor:"#0D0D18",borderTop:"1px solid #1E1E30",display:"flex"}}>
        {NAV.map(item=>{
          const on=active===item.id;
          return (
            <button key={item.id} onClick={()=>onSelect(item.id)} style={{flex:1,padding:"11px 4px 14px",backgroundColor:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.2s"}}>
              <span style={{fontSize:15,lineHeight:1,color:on?"#8B5CF6":"#4B5563",filter:on?"drop-shadow(0 0 6px #8B5CF6)":"none",transition:"all 0.2s"}}>{item.symbol}</span>
              <span style={{fontSize:9,letterSpacing:"0.06em",fontWeight:on?700:400,color:on?"#8B5CF6":"#4B5563",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>{item.label.toUpperCase()}</span>
              {on&&<div style={{width:18,height:2,borderRadius:1,backgroundColor:"#8B5CF6",boxShadow:"0 0 8px #8B5CF6",marginTop:1}}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════
export default function AuraApp() {
  const [tab,setTab]=useState("today");
  const [done,setDone]=useState(new Set());
  const [sheet,setSheet]=useState(null);
  const [earnedXP,setEarnedXP]=useState(0);
  const [burst,setBurst]=useState({on:false,amt:0});
  const totalXP=STUDENT.xp+earnedXP;

  function completeQuest(id) {
    if(done.has(id)) return;
    const q=QUESTS.find(q=>q.id===id); if(!q) return;
    setDone(p=>new Set([...p,id]));
    setEarnedXP(p=>p+q.xp);
    setBurst({on:true,amt:q.xp});
    setTimeout(()=>setBurst({on:false,amt:0}),1600);
  }

  const screens={
    today:<TodayScreen done={done} onStart={setSheet} earnedXP={earnedXP} totalXP={totalXP}/>,
    coach:<CoachScreen/>,
    map:  <MapScreen/>,
    plan: <PlanScreen/>,
    me:   <ProfileScreen totalXP={totalXP}/>,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
        html,body{background:#08080E;overscroll-behavior:none;}
        @keyframes cardIn    {from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes slideUp   {from{transform:translateY(100%)}to{transform:none}}
        @keyframes burstUp   {0%{opacity:1;transform:translateX(-50%) scale(1)}60%{opacity:1;transform:translateX(-50%) translateY(-40px) scale(1.1)}100%{opacity:0;transform:translateX(-50%) translateY(-80px) scale(0.9)}}
        @keyframes streakPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#08080E}::-webkit-scrollbar-thumb{background:#1E1E30;border-radius:2px}
      `}</style>

      <div style={{
        minHeight:"100vh",
        background:"radial-gradient(ellipse at 20% 0%,#130D2A 0%,#08080E 45%),#08080E",
        fontFamily:"'Plus Jakarta Sans',sans-serif",
        color:"#F0F0FA",maxWidth:480,margin:"0 auto",
        paddingBottom:80,position:"relative",overflowX:"hidden",
      }}>
        <div style={{position:"fixed",inset:0,maxWidth:480,margin:"0 auto",backgroundImage:"radial-gradient(#1E1E3055 1px,transparent 1px)",backgroundSize:"28px 28px",pointerEvents:"none",zIndex:0,opacity:0.35}}/>
        <div style={{position:"relative",zIndex:1}}>{screens[tab]}</div>
      </div>

      <BottomNav active={tab} onSelect={setTab}/>
      <PracticeSheet quest={sheet} onClose={()=>setSheet(null)} onComplete={completeQuest}/>
      <XPBurst visible={burst.on} amount={burst.amt}/>
    </>
  );
}
