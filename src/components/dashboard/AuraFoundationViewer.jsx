import { useState } from "react";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
  ::-webkit-scrollbar{width:3px;height:3px}
  ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
  .nav-tab{cursor:pointer;transition:all .18s}
  .nav-tab:hover{opacity:.85}
  .tree-node{cursor:pointer;transition:background .12s}
  .tree-node:hover{background:#0f172a!important}
  .engine-card{cursor:pointer;transition:all .2s}
  .engine-card:hover{transform:translateY(-2px)}
  .phase-task{transition:background .12s;cursor:default}
  .phase-task:hover{background:#0f172a!important}
`;

// ── Schema sections
const SCHEMA_NODES = [
  {
    key:"student", label:"student", icon:"👤", color:"#6366f1",
    fields:[
      {name:"id",         type:"string",  note:"Unique student ID"},
      {name:"name",       type:"string",  note:""},
      {name:"grade",      type:"string",  note:"'Class X'"},
      {name:"targetScore",type:"number",  note:"Percent, 0–100"},
      {name:"daysToExam", type:"number",  note:"Countdown"},
    ]
  },
  {
    key:"archetype", label:"archetype", icon:"🧠", color:"#8b5cf6",
    fields:[
      {name:"current",          type:"'struggling'|'average'|'topper'", note:"NEVER self-report"},
      {name:"inferenceMethod",  type:"'behavioral'",  note:"Always behavioral"},
      {name:"archetypeScore",   type:"number",        note:"0–100 composite"},
      {name:"behavioralSignals",type:"BehavioralSignals", note:"8 signal dimensions"},
      {name:"archetypeHistory", type:"Array",         note:"Tracks changes over time"},
    ]
  },
  {
    key:"analytics", label:"analytics", icon:"📊", color:"#06b6d4",
    fields:[
      {name:"consistency",         type:"AnalyticsDimension", note:"Regular practice habit"},
      {name:"accuracy",            type:"AnalyticsDimension", note:"Question correctness"},
      {name:"recovery",            type:"AnalyticsDimension", note:"Weak chapter fix rate"},
      {name:"momentum",            type:"AnalyticsDimension", note:"Study energy & direction"},
      {name:"discipline",          type:"AnalyticsDimension", note:"Plan follow-through"},
      {name:"confidenceStability", type:"AnalyticsDimension", note:"⚠ Burnout predictor"},
    ]
  },
  {
    key:"chapterMastery", label:"chapterMastery", icon:"📚", color:"#f59e0b",
    fields:[
      {name:"mastery",        type:"number",  note:"0–100"},
      {name:"trend",          type:"'improving'|'declining'|'stable'", note:""},
      {name:"lastPracticed",  type:"string",  note:"ISO date"},
      {name:"attemptCount",   type:"number",  note:"Total sessions on this chapter"},
    ]
  },
  {
    key:"sessionHistory", label:"sessionHistory", icon:"📝", color:"#22c55e",
    fields:[
      {name:"score",           type:"number|null",  note:"0–100"},
      {name:"panicSignal",     type:"boolean",      note:"Key for confidence stability"},
      {name:"hintsUsed",       type:"number",       note:"helpSeekingFrequency signal"},
      {name:"retriesOnWrong",  type:"number",       note:"retryBehavior signal"},
      {name:"completedPlan",   type:"boolean",      note:"discipline signal"},
      {name:"engineType",      type:"SessionType",  note:"adaptive|recovery|timed_test..."},
    ]
  },
  {
    key:"nextAction", label:"nextAction", icon:"🎯", color:"#ef4444",
    fields:[
      {name:"recommendedAction", type:"string",   note:"Aura's #1 output"},
      {name:"estimatedGain",     type:"string",   note:"'+4.2 marks'"},
      {name:"timeRequired",      type:"number",   note:"Minutes"},
      {name:"urgency",           type:"UrgencyLevel", note:""},
      {name:"confidence",        type:"number",   note:"0–1, engine certainty"},
      {name:"rationale",         type:"string",   note:"Debug / transparency"},
      {name:"followUp",          type:"NextActionOutput|null", note:"Second priority"},
    ]
  },
  {
    key:"recoveryPlans", label:"recoveryPlans", icon:"🔧", color:"#f97316",
    fields:[
      {name:"marksAtRisk",    type:"number",  note:"Marks being lost"},
      {name:"recoverableMarks",type:"number", note:"Realistic gain"},
      {name:"sessionsNeeded", type:"number",  note:""},
      {name:"urgency",        type:"UrgencyLevel", note:"critical|high|medium|low"},
      {name:"status",         type:"'pending'|'active'|'completed'", note:""},
      {name:"recoveryProbability", type:"number", note:"0–1 behavioral estimate"},
      {name:"actionPlan",     type:"Array",   note:"Session-by-session plan"},
    ]
  },
  {
    key:"adaptiveMsg", label:"adaptiveMessaging", icon:"💬", color:"#a855f7",
    fields:[
      {name:"tone",            type:"'recovery'|'optimization'|'challenge'|'reassurance'", note:""},
      {name:"primaryMessage",  type:"string",  note:"Archetype headline"},
      {name:"onLogin",         type:"string",  note:"Contextual greeting"},
      {name:"onPanicDetected", type:"string",  note:"Calm reassurance"},
      {name:"onMissedDay",     type:"string",  note:"Non-judgmental nudge"},
    ]
  },
];

const ENGINES = [
  {
    id:"E1", name:"ScoreProjectionEngine", icon:"📊",
    phase:"A", priority:"P0",
    color:"#6366f1",
    formula:"Σ mastery[ch] × blueprintMarks[ch] / 100",
    inputs:["chapterMastery","blueprint"],
    outputs:["bySubject","total","totalMax","percentage","grade"],
    note:"Foundation. Every other engine reads from this.",
    deps:[],
  },
  {
    id:"E2", name:"StudentArchetypeEngine", icon:"🧠",
    phase:"B", priority:"P0",
    color:"#8b5cf6",
    formula:"8 behavioral signals → archetypeScore → band",
    inputs:["sessions","ScoreProjectionOutput"],
    outputs:["archetype","dashboardTone","layoutDensity","showMetrics"],
    note:"NO self-report. Infer silently from behavior only.",
    deps:["E1"],
  },
  {
    id:"E3", name:"RecoveryEngine", icon:"🔧",
    phase:"B", priority:"P1",
    color:"#ef4444",
    formula:"marksAtRisk = marks × (1 − mastery/100)",
    inputs:["chapterMastery","blueprint","sessions"],
    outputs:["items[marksAtRisk, recoverable, sessions, urgency]","top3"],
    note:"Aura's moat. 'Recoverable marks' is a killer feature.",
    deps:["E1"],
  },
  {
    id:"E4", name:"TargetGapEngine", icon:"🎯",
    phase:"B", priority:"P1",
    color:"#10b981",
    formula:"ROI = gainPossible / hoursEstimate",
    inputs:["targetScore","ScoreProjectionOutput","chapterMastery","blueprint"],
    outputs:["gap","rankedChapters","fastestPath","estimatedHours","reachableBy"],
    note:"Critical for toppers. 'Where to invest effort?' not 'What to study?'",
    deps:["E1"],
  },
  {
    id:"E5", name:"MomentumEngine", icon:"⚡",
    phase:"B", priority:"P2",
    color:"#f59e0b",
    formula:"streak × 13 + trend_bonus + session_count_bonus",
    inputs:["sessions"],
    outputs:["streak","trend","score","badge","weeklyPattern"],
    note:"Engagement layer. Drives daily return habit.",
    deps:[],
  },
  {
    id:"E6", name:"NextActionEngine", icon:"✦",
    phase:"B", priority:"P0",
    color:"#a855f7",
    formula:"Decision tree: critical recovery → streak guard → ROI → precision drill",
    inputs:["RecoveryOutput","TargetOutput","MomentumOutput","ArchetypeOutput","sessions"],
    outputs:["recommendedAction","estimatedGain","timeRequired","urgency","confidence","followUp"],
    note:"NEW. Aura's signature experience. Unifies all engines into ONE next move.",
    deps:["E1","E2","E3","E4","E5"],
  },
];

const PHASES = [
  {
    id:"A", label:"Foundation", color:"#6366f1", icon:"🏗",
    goal:"Stable intelligence layer before any advanced UI",
    tasks:[
      {id:"A1",title:"StudentLearningProfile JSON",        note:"Schema + sample data · Use this file",           done:true},
      {id:"A2",title:"ScoreProjectionEngine.ts",           note:"Core formula, 3-subject test suite",             done:false},
      {id:"A3",title:"Analytics data collection hooks",   note:"Track: session scores, hints, retries, panic",   done:false},
      {id:"A4",title:"6-dimension analytics scoring",     note:"Consistency/Accuracy/Recovery/Momentum/Discipline/Confidence", done:false},
    ]
  },
  {
    id:"B", label:"Intelligence", color:"#8b5cf6", icon:"🧠",
    goal:"Make Aura strategically intelligent",
    tasks:[
      {id:"B1",title:"StudentArchetypeEngine.ts",  note:"Behavioral inference, no self-report",           done:false},
      {id:"B2",title:"RecoveryEngine.ts",          note:"marksAtRisk + recoverableMarks + actionPlan",    done:false},
      {id:"B3",title:"NextActionEngine.ts",        note:"Unified 'smartest next move' — Aura's signature",done:false},
      {id:"B4",title:"TargetGapEngine.ts",         note:"ROI ranker + fastest path calculator",           done:false},
      {id:"B5",title:"MomentumEngine.ts",          note:"Streak + trend + momentum score",               done:false},
    ]
  },
  {
    id:"C", label:"Hero Dashboard", color:"#06b6d4", icon:"🖥",
    goal:"Zero-scroll single-screen intelligence visibility",
    tasks:[
      {id:"C1",title:"Hero Command Center",  note:"ScoreOrb + MissionCard + MomentumMeter",    done:false},
      {id:"C2",title:"Subject Heatmap",      note:"Animated risk bars + chapter drill-down",    done:false},
      {id:"C3",title:"Recovery Cards",       note:"Mark rescue UI + one-tap session launcher",  done:false},
      {id:"C4",title:"Today's Mission Plan", note:"Time-boxed tasks + XP tracker",             done:false},
    ]
  },
  {
    id:"D", label:"Adaptive UX", color:"#f59e0b", icon:"🎨",
    goal:"Emotionally intelligent, archetype-aware interface",
    tasks:[
      {id:"D1",title:"Archetype themes (3 modes)",    note:"struggling / average / topper color + tone", done:false},
      {id:"D2",title:"Adaptive messaging layer",      note:"Context messages from adaptiveMessaging JSON",done:false},
      {id:"D3",title:"Adaptive dashboard density",    note:"Simple for weak students · Advanced for toppers",done:false},
    ]
  },
  {
    id:"E", label:"Advanced", color:"#ef4444", icon:"🚀",
    goal:"Addictive for serious students — engagement & rank optimization",
    tasks:[
      {id:"E1",title:"Rank probability prediction",  note:"State-level percentile estimate",         done:false},
      {id:"E2",title:"Burnout detection engine",     note:"From confidenceStability + session trends",done:false},
      {id:"E3",title:"Competitive insights",         note:"Topper mode: benchmark comparisons",       done:false},
      {id:"E4",title:"Advanced revision optimizer",  note:"Spaced repetition + priority decay",       done:false},
    ]
  },
];

const DIVISION = [
  {
    tool:"Cursor",icon:"⌨",color:"#6366f1",
    handles:["All 6 engine TypeScript files","StudentLearningProfile schema","Session analytics hooks","JSON contracts","State management","Routing & integration","Engine pipeline runner"],
    avoids:["Redesigning UI randomly","Adding new UI components without engine backing"],
  },
  {
    tool:"Lovable",icon:"🎨",color:"#f59e0b",
    handles:["Dashboard redesign","Adaptive visual themes","Hero layout","Heatmap animations","Recovery card UI","Emotional engagement","Topper mode aesthetics"],
    avoids:["Engine logic","Analytics scoring","JSON schema changes"],
  },
];

// ── helpers
const PIX = {c:"#ef4444",l:"#f59e0b",m:"#f97316",h:"#a78bfa"};

function Tag({children,color,bg,border}) {
  return (
    <span style={{
      fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:3,letterSpacing:"0.04em",
      color:color||"#94a3b8",
      background:bg||"#1e293b",
      border:`1px solid ${border||color+"30"||"#334155"}`,
    }}>{children}</span>
  );
}

export default function AuraFoundationViewer() {
  const [tab, setTab] = useState("schema");
  const [selectedNode, setSelectedNode] = useState("nextAction");
  const [selectedEngine, setSelectedEngine] = useState("E6");
  const [selectedPhase, setSelectedPhase] = useState("A");

  const node = SCHEMA_NODES.find(n=>n.key===selectedNode);
  const eng  = ENGINES.find(e=>e.id===selectedEngine);
  const phase = PHASES.find(p=>p.id===selectedPhase);

  const TABS = [
    {id:"schema",   label:"📁 Data Model"},
    {id:"engines",  label:"⚙ Engine Contracts"},
    {id:"roadmap",  label:"📋 Execution Roadmap"},
    {id:"division", label:"🔀 Tool Division"},
  ];

  return (
    <div style={{
      height:"100vh",background:"#020817",color:"#e2e8f0",
      fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",overflow:"hidden",
    }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{
        padding:"14px 20px",borderBottom:"1px solid #0d1a2e",
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:30,height:30,borderRadius:8,
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,
          }}>✦</div>
          <div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:900,letterSpacing:"-0.01em"}}>
              AURA Foundation
            </div>
            <div style={{fontSize:9.5,color:"#334155"}}>
              Intelligence Layer · StudentLearningProfile v2 · 6 Engine Contracts
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4}}>
          {TABS.map(t=>(
            <button key={t.id} className="nav-tab"
              onClick={()=>setTab(t.id)}
              style={{
                padding:"5px 12px",borderRadius:6,border:"none",fontSize:10.5,fontWeight:700,
                background:tab===t.id?"#6366f1":"#0f172a",
                color:tab===t.id?"#fff":"#475569",
                cursor:"pointer",
              }}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* ══ TAB: DATA MODEL ══════════════════════════════════════════════════ */}
      {tab==="schema" && (
        <div style={{flex:1,display:"grid",gridTemplateColumns:"220px 1fr",gap:0,overflow:"hidden",animation:"fadeUp .3s ease"}}>

          {/* Left: node list */}
          <div style={{borderRight:"1px solid #0d1a2e",overflowY:"auto",padding:"12px 10px"}}>
            <div style={{fontSize:9,color:"#334155",fontWeight:700,letterSpacing:"0.06em",marginBottom:8,padding:"0 4px"}}>
              PROFILE SECTIONS
            </div>
            {SCHEMA_NODES.map(n=>(
              <div key={n.key} className="tree-node"
                onClick={()=>setSelectedNode(n.key)}
                style={{
                  padding:"8px 10px",borderRadius:8,marginBottom:3,
                  background:selectedNode===n.key?n.color+"18":"transparent",
                  border:`1px solid ${selectedNode===n.key?n.color+"35":"transparent"}`,
                  cursor:"pointer",
                }}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:14}}>{n.icon}</span>
                  <span style={{
                    fontSize:11.5,fontFamily:"'JetBrains Mono',monospace",
                    fontWeight:600,color:selectedNode===n.key?n.color:"#64748b",
                  }}>{n.label}</span>
                </div>
                <div style={{fontSize:9,color:"#1e293b",marginTop:2,paddingLeft:20}}>
                  {n.fields.length} fields
                </div>
              </div>
            ))}
          </div>

          {/* Right: node detail */}
          {node && (
            <div style={{padding:"20px 24px",overflowY:"auto",animation:"fadeUp .2s ease"}}>
              <div style={{
                display:"flex",alignItems:"center",gap:10,marginBottom:18,
                paddingBottom:14,borderBottom:"1px solid #0d1a2e",
              }}>
                <span style={{fontSize:28}}>{node.icon}</span>
                <div>
                  <div style={{
                    fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:600,
                    color:node.color,
                  }}>{node.label}</div>
                  <div style={{fontSize:10.5,color:"#475569",marginTop:1}}>
                    StudentLearningProfile.{node.label}
                  </div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {node.fields.map(f=>(
                  <div key={f.name} style={{
                    padding:"11px 14px",borderRadius:9,
                    background:"#080f1e",border:"1px solid #1a2744",
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:f.note?4:0}}>
                      <code style={{
                        fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,
                        color:"#e2e8f0",
                      }}>{f.name}</code>
                      <code style={{
                        fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                        color:node.color,background:node.color+"12",
                        padding:"2px 7px",borderRadius:4,
                      }}>{f.type}</code>
                    </div>
                    {f.note && (
                      <div style={{fontSize:10.5,color:"#475569",marginTop:3}}>{f.note}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Special callouts */}
              {node.key==="archetype" && (
                <div style={{
                  marginTop:14,padding:"12px 14px",borderRadius:9,
                  background:"#1a0a2e",border:"1px solid #8b5cf640",
                }}>
                  <div style={{fontSize:10,fontWeight:700,color:"#a855f7",marginBottom:4}}>
                    ⚠ CRITICAL RULE
                  </div>
                  <div style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.6}}>
                    <code style={{color:"#f87171",fontFamily:"'JetBrains Mono',monospace"}}>selfReport</code> field does NOT exist in this schema.
                    Archetype is always inferred from <code style={{color:"#34d399",fontFamily:"'JetBrains Mono',monospace"}}>behavioralSignals</code>.
                    Students must never classify themselves — Aura observes and decides silently.
                  </div>
                </div>
              )}
              {node.key==="analytics" && (
                <div style={{
                  marginTop:14,padding:"12px 14px",borderRadius:9,
                  background:"#0a1628",border:"1px solid #06b6d440",
                }}>
                  <div style={{fontSize:10,fontWeight:700,color:"#06b6d4",marginBottom:4}}>
                    ★ KEY INSIGHT — confidenceStability
                  </div>
                  <div style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.6}}>
                    Two students both scoring 85% can differ dramatically. One is stable. One is panic-driven.
                    This metric distinguishes them and predicts burnout before it happens.
                  </div>
                </div>
              )}
              {node.key==="nextAction" && (
                <div style={{
                  marginTop:14,padding:"12px 14px",borderRadius:9,
                  background:"#1a0a0a",border:"1px solid #ef444440",
                }}>
                  <div style={{fontSize:10,fontWeight:700,color:"#ef4444",marginBottom:4}}>
                    ★ AURA'S SIGNATURE EXPERIENCE
                  </div>
                  <div style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.6}}>
                    <code style={{color:"#fca5a5",fontFamily:"'JetBrains Mono',monospace"}}>nextAction</code> is the
                    single most important output in the entire system. It unifies Recovery + Target + Momentum
                    into one clear recommendation. This is what makes Aura feel like it "always knows what to do next."
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: ENGINE CONTRACTS ════════════════════════════════════════════ */}
      {tab==="engines" && (
        <div style={{flex:1,display:"grid",gridTemplateColumns:"260px 1fr",gap:0,overflow:"hidden",animation:"fadeUp .3s ease"}}>

          {/* Engine list */}
          <div style={{borderRight:"1px solid #0d1a2e",overflowY:"auto",padding:"12px 10px"}}>
            <div style={{fontSize:9,color:"#334155",fontWeight:700,letterSpacing:"0.06em",marginBottom:8,padding:"0 4px"}}>
              EXECUTION ORDER
            </div>

            {/* Dependency chain viz */}
            <div style={{
              padding:"10px 12px",borderRadius:8,background:"#050c1c",
              border:"1px solid #1a2744",marginBottom:10,
            }}>
              <div style={{fontSize:9,color:"#334155",marginBottom:7}}>PIPELINE</div>
              {ENGINES.map((e,i)=>(
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:4,marginBottom:i<ENGINES.length-1?4:0}}>
                  <div style={{
                    width:18,height:18,borderRadius:4,
                    background:e.color+"20",border:`1px solid ${e.color}40`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,
                  }}>{e.icon}</div>
                  <span style={{fontSize:9.5,color:e.color,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>
                    {e.name.replace("Engine","")}
                  </span>
                  {i<ENGINES.length-1 && <div style={{
                    width:1,height:8,background:"#1e293b",marginLeft:8,
                  }}/>}
                </div>
              ))}
            </div>

            {ENGINES.map(e=>(
              <div key={e.id} className="engine-card"
                onClick={()=>setSelectedEngine(e.id)}
                style={{
                  padding:"9px 11px",borderRadius:8,marginBottom:4,
                  background:selectedEngine===e.id?e.color+"18":"#050c1c",
                  border:`1px solid ${selectedEngine===e.id?e.color+"40":"#1a2744"}`,
                  cursor:"pointer",
                }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span>{e.icon}</span>
                    <span style={{
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,
                      color:selectedEngine===e.id?e.color:"#64748b",
                    }}>{e.id}</span>
                  </div>
                  <Tag color={e.priority==="P0"?"#ef4444":e.priority==="P1"?"#f59e0b":"#6366f1"}
                    bg={e.priority==="P0"?"#ef444414":e.priority==="P1"?"#f59e0b14":"#6366f114"}>
                    {e.priority}
                  </Tag>
                </div>
                <div style={{fontSize:10,color:"#475569",marginTop:3,paddingLeft:22,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {e.name.replace("Engine","")}Engine
                </div>
              </div>
            ))}
          </div>

          {/* Engine detail */}
          {eng && (
            <div style={{padding:"20px 24px",overflowY:"auto",animation:"fadeUp .2s ease"}}>
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                marginBottom:16,paddingBottom:14,borderBottom:"1px solid #0d1a2e",
              }}>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:26}}>{eng.icon}</span>
                  <div>
                    <div style={{
                      fontFamily:"'JetBrains Mono',monospace",fontSize:16,fontWeight:600,color:eng.color,
                    }}>{eng.name}</div>
                    <div style={{fontSize:10,color:"#475569",marginTop:1}}>Phase {eng.phase} · {eng.id}</div>
                  </div>
                </div>
                <Tag color={eng.priority==="P0"?"#ef4444":eng.priority==="P1"?"#f59e0b":"#6366f1"}
                  bg={eng.priority==="P0"?"#ef444414":eng.priority==="P1"?"#f59e0b14":"#6366f114"}>
                  {eng.priority} — {eng.priority==="P0"?"Foundation":"Core"}
                </Tag>
              </div>

              {/* Note callout */}
              <div style={{
                padding:"10px 14px",borderRadius:8,marginBottom:14,
                background:eng.color+"10",border:`1px solid ${eng.color}25`,
              }}>
                <div style={{fontSize:11.5,color:"#94a3b8",lineHeight:1.55}}>{eng.note}</div>
              </div>

              {/* Formula */}
              <div style={{
                padding:"12px 16px",borderRadius:9,background:"#050c1c",
                border:`1px solid ${eng.color}20`,marginBottom:12,
              }}>
                <div style={{fontSize:9,color:"#334155",letterSpacing:"0.06em",marginBottom:6}}>FORMULA / LOGIC</div>
                <code style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,
                  color:eng.color,
                }}>{eng.formula}</code>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                {/* Inputs */}
                <div style={{
                  padding:"12px 14px",borderRadius:9,background:"#050c1c",border:"1px solid #1a2744",
                }}>
                  <div style={{fontSize:9,color:"#334155",letterSpacing:"0.06em",marginBottom:7}}>INPUTS</div>
                  {eng.inputs.map(inp=>(
                    <div key={inp} style={{
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",
                      color:"#64748b",marginBottom:4,
                    }}>· {inp}</div>
                  ))}
                </div>
                {/* Outputs */}
                <div style={{
                  padding:"12px 14px",borderRadius:9,background:"#050c1c",border:`1px solid ${eng.color}18`,
                }}>
                  <div style={{fontSize:9,color:"#334155",letterSpacing:"0.06em",marginBottom:7}}>OUTPUTS</div>
                  {eng.outputs.map(out=>(
                    <div key={out} style={{
                      fontSize:11,fontFamily:"'JetBrains Mono',monospace",
                      color:eng.color,marginBottom:4,
                    }}>→ {out}</div>
                  ))}
                </div>
              </div>

              {/* Dependencies */}
              {eng.deps.length > 0 && (
                <div style={{
                  padding:"10px 14px",borderRadius:8,background:"#050c1c",border:"1px solid #1a2744",
                }}>
                  <div style={{fontSize:9,color:"#334155",letterSpacing:"0.06em",marginBottom:7}}>DEPENDS ON</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {eng.deps.map(d=>{
                      const de=ENGINES.find(e=>e.id===d);
                      return de && (
                        <span key={d} style={{
                          fontSize:10,fontFamily:"'JetBrains Mono',monospace",fontWeight:600,
                          padding:"3px 8px",borderRadius:4,
                          color:de.color,background:de.color+"15",
                          border:`1px solid ${de.color}30`,
                        }}>{de.icon} {d}</span>
                      );
                    })}
                  </div>
                </div>
              )}

              {eng.id==="E6" && (
                <div style={{
                  marginTop:12,padding:"12px 14px",borderRadius:9,
                  background:"#140a24",border:"1px solid #a855f740",
                }}>
                  <div style={{fontSize:9.5,fontWeight:700,color:"#a855f7",marginBottom:6}}>
                    DECISION TREE
                  </div>
                  {[
                    ["1","Critical chapter (mastery <50%, marks ≥6)?","→ Recommend recovery session"],
                    ["2","Streak at risk (missed yesterday)?",          "→ Easiest high-ROI chapter"],
                    ["3","Target gap >10%?",                            "→ Highest ROI from targetGap"],
                    ["4","Topper mode",                                 "→ Precision drill on near-mastered ch"],
                  ].map(([n,cond,action])=>(
                    <div key={n} style={{
                      display:"flex",gap:8,marginBottom:5,alignItems:"flex-start",
                    }}>
                      <span style={{
                        width:16,height:16,borderRadius:"50%",background:"#a855f720",
                        border:"1px solid #a855f740",flexShrink:0,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:8.5,fontWeight:700,color:"#a855f7",marginTop:1,
                      }}>{n}</span>
                      <div>
                        <div style={{fontSize:10.5,color:"#94a3b8"}}>{cond}</div>
                        <div style={{fontSize:10,color:"#c084fc",fontWeight:600,marginTop:1}}>{action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: ROADMAP ═════════════════════════════════════════════════════ */}
      {tab==="roadmap" && (
        <div style={{flex:1,display:"grid",gridTemplateColumns:"220px 1fr",gap:0,overflow:"hidden",animation:"fadeUp .3s ease"}}>

          {/* Phase list */}
          <div style={{borderRight:"1px solid #0d1a2e",overflowY:"auto",padding:"12px 10px"}}>
            <div style={{fontSize:9,color:"#334155",fontWeight:700,letterSpacing:"0.06em",marginBottom:8,padding:"0 4px"}}>
              5 PHASES
            </div>
            {PHASES.map(p=>(
              <div key={p.id} className="tree-node"
                onClick={()=>setSelectedPhase(p.id)}
                style={{
                  padding:"9px 10px",borderRadius:8,marginBottom:4,
                  background:selectedPhase===p.id?p.color+"18":"transparent",
                  border:`1px solid ${selectedPhase===p.id?p.color+"35":"transparent"}`,
                  cursor:"pointer",
                }}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                  <span style={{fontSize:14}}>{p.icon}</span>
                  <span style={{
                    fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:800,
                    color:selectedPhase===p.id?p.color:"#334155",
                  }}>Phase {p.id}</span>
                </div>
                <div style={{fontSize:10.5,color:selectedPhase===p.id?"#94a3b8":"#1e293b",paddingLeft:22}}>
                  {p.label}
                </div>
                <div style={{fontSize:9,color:"#1e293b",paddingLeft:22,marginTop:1}}>
                  {p.tasks.length} tasks
                </div>
              </div>
            ))}

            {/* Architecture rules */}
            <div style={{
              marginTop:12,padding:"10px 12px",borderRadius:8,
              background:"#050c1c",border:"1px solid #1a2744",
            }}>
              <div style={{fontSize:9,color:"#334155",fontWeight:700,letterSpacing:"0.06em",marginBottom:6}}>
                PHASE F — RULES
              </div>
              {["Git commit every stable change","Push after every integration","No massive refactors","Engines before UI","Keep Aura isolated until stable"].map(r=>(
                <div key={r} style={{
                  fontSize:9.5,color:"#334155",marginBottom:3,
                  display:"flex",alignItems:"flex-start",gap:4,
                }}>
                  <span style={{color:"#22c55e",flexShrink:0}}>✓</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phase detail */}
          {phase && (
            <div style={{padding:"20px 24px",overflowY:"auto",animation:"fadeUp .2s ease"}}>
              <div style={{
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                marginBottom:14,paddingBottom:12,borderBottom:"1px solid #0d1a2e",
              }}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:22}}>{phase.icon}</span>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800}}>
                      Phase {phase.id} — {phase.label}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:"#475569"}}>{phase.goal}</div>
                </div>
                <div style={{
                  padding:"4px 10px",borderRadius:5,
                  background:phase.color+"18",border:`1px solid ${phase.color}35`,
                  fontSize:9.5,fontWeight:700,color:phase.color,
                  whiteSpace:"nowrap",
                }}>{phase.tasks.length} tasks</div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {phase.tasks.map(t=>(
                  <div key={t.id} className="phase-task"
                    style={{
                      padding:"11px 14px",borderRadius:9,
                      background:t.done?"#071a0e":"#080f1e",
                      border:`1px solid ${t.done?"#22c55e30":"#1a2744"}`,
                      display:"flex",alignItems:"flex-start",gap:10,
                    }}>
                    <div style={{
                      width:22,height:22,borderRadius:6,flexShrink:0,
                      background:t.done?"#22c55e":"#1a2744",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,color:t.done?"#fff":"#334155",fontWeight:700,
                      marginTop:1,
                    }}>{t.done?"✓":""}</div>
                    <div style={{flex:1}}>
                      <div style={{
                        fontFamily:"'JetBrains Mono',monospace",fontSize:12.5,fontWeight:600,
                        color:t.done?"#22c55e":"#e2e8f0",marginBottom:3,
                      }}>{t.id} — {t.title}</div>
                      <div style={{fontSize:10.5,color:"#475569"}}>{t.note}</div>
                    </div>
                    {t.id==="A1" && (
                      <span style={{
                        fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3,
                        color:"#22c55e",background:"#22c55e14",border:"1px solid #22c55e30",
                        flexShrink:0,
                      }}>DONE ✓</span>
                    )}
                  </div>
                ))}
              </div>

              {phase.id==="A" && (
                <div style={{
                  marginTop:14,padding:"12px 16px",borderRadius:9,
                  background:"#071014",border:"1px solid #06b6d430",
                }}>
                  <div style={{fontSize:10,fontWeight:700,color:"#06b6d4",marginBottom:6}}>
                    ▶ NEXT STEP
                  </div>
                  <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.6}}>
                    <strong style={{color:"#e2e8f0"}}>StudentLearningProfile.json is ready (A1 ✓)</strong>
                    <br/>Now build <code style={{fontFamily:"'JetBrains Mono',monospace",color:"#6366f1"}}>ScoreProjectionEngine.ts</code> in Cursor.
                    Use the JSON contracts file as the TypeScript interface reference.
                    Test with the sample profile before any UI work.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: TOOL DIVISION ═══════════════════════════════════════════════ */}
      {tab==="division" && (
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px",animation:"fadeUp .3s ease"}}>
          <div style={{fontSize:11,color:"#475569",marginBottom:20,maxWidth:600,lineHeight:1.6}}>
            The two tools are not in conflict — they have <strong style={{color:"#e2e8f0"}}>different scopes</strong>.
            This boundary prevents architecture drift and UI-logic coupling.
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,maxWidth:700}}>
            {DIVISION.map(d=>(
              <div key={d.tool} style={{
                borderRadius:12,overflow:"hidden",
                border:`1.5px solid ${d.color}30`,
              }}>
                <div style={{
                  padding:"12px 16px",
                  background:`linear-gradient(135deg,${d.color}18,${d.color}06)`,
                  borderBottom:`1px solid ${d.color}20`,
                  display:"flex",alignItems:"center",gap:8,
                }}>
                  <span style={{fontSize:20}}>{d.icon}</span>
                  <div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:d.color}}>
                      {d.tool}
                    </div>
                  </div>
                </div>
                <div style={{padding:"12px 14px",background:"#080f1e"}}>
                  <div style={{fontSize:9,color:"#22c55e",fontWeight:700,letterSpacing:"0.06em",marginBottom:7}}>
                    HANDLES
                  </div>
                  {d.handles.map(h=>(
                    <div key={h} style={{
                      fontSize:11,color:"#94a3b8",marginBottom:4,
                      display:"flex",alignItems:"flex-start",gap:5,
                    }}>
                      <span style={{color:"#22c55e",flexShrink:0,fontSize:9,marginTop:2}}>✓</span>
                      <span>{h}</span>
                    </div>
                  ))}
                  <div style={{height:1,background:"#1a2744",margin:"10px 0"}}/>
                  <div style={{fontSize:9,color:"#ef4444",fontWeight:700,letterSpacing:"0.06em",marginBottom:7}}>
                    AVOIDS
                  </div>
                  {d.avoids.map(a=>(
                    <div key={a} style={{
                      fontSize:11,color:"#64748b",marginBottom:4,
                      display:"flex",alignItems:"flex-start",gap:5,
                    }}>
                      <span style={{color:"#ef4444",flexShrink:0,fontSize:9,marginTop:2}}>✗</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop:20,padding:"14px 18px",borderRadius:10,
            background:"#0a0f1e",border:"1px solid #1a2744",maxWidth:700,
          }}>
            <div style={{fontSize:10,fontWeight:700,color:"#6366f1",marginBottom:8}}>
              COMMUNICATION PROTOCOL
            </div>
            {[
              ["Cursor exports engine outputs","→","Lovable reads them from profile JSON"],
              ["Lovable never runs engine logic","→","Cursor never designs UI layout"],
              ["Both tools read StudentLearningProfile","→","Neither tool owns it — it's neutral ground"],
            ].map(([a,arr,b])=>(
              <div key={a} style={{
                display:"flex",gap:8,alignItems:"center",marginBottom:5,
                fontSize:11,color:"#64748b",
              }}>
                <code style={{
                  fontFamily:"'JetBrains Mono',monospace",fontSize:10,
                  color:"#6366f1",background:"#6366f114",padding:"2px 6px",borderRadius:3,
                  flexShrink:0,
                }}>{a}</code>
                <span style={{color:"#334155"}}>{arr}</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
