'use strict';
const path = require('path');

/**
 * NOESIS — Webview Content v4
 * Tasks 3,6,7,8,11: confidence selector, timer, score, streak, drop warning.
 */
function getWebviewContent(filePath, analysis) {
  const fileName = path.basename(filePath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>NOESIS — Code Quiz</title>
<style>
:root {
  --bg:#0d0d14;--surface:#13131f;--card:#18182a;--border:#252540;--border2:#2e2e50;
  --fg:#e2e4f0;--muted:#6b6d8a;--accent:#6c63ff;--accent-h:#8880ff;
  --green:#4ade80;--red:#f87171;--yellow:#fbbf24;--blue:#60a5fa;--orange:#fb923c;
  --mono:'JetBrains Mono','Fira Code',Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --radius:10px;--radius-sm:6px;
  --shadow:0 4px 24px rgba(0,0,0,.45);--shadow-sm:0 2px 12px rgba(0,0,0,.3);
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--sans);background:var(--bg);color:var(--fg);font-size:13.5px;line-height:1.65;min-height:100vh;padding-bottom:72px;-webkit-font-smoothing:antialiased}
button,input,select{font-family:var(--sans)}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}

/* ── Header ── */
.header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 20px;position:sticky;top:0;z-index:20;box-shadow:var(--shadow-sm)}
.header-inner{display:flex;align-items:center;gap:12px;max-width:820px;margin:0 auto}
.logo{width:28px;height:28px;background:var(--accent);border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo svg{width:15px;height:15px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.header-text{flex:1;min-width:0}
.header-title{font-size:14px;font-weight:700;color:var(--fg)}
.header-file{font-size:11px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.diff-chip{padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;flex-shrink:0;border:1px solid transparent}
.diff-chip.easy{color:var(--green);border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.08)}
.diff-chip.medium{color:var(--yellow);border-color:rgba(251,191,36,.25);background:rgba(251,191,36,.08)}
.diff-chip.hard{color:var(--red);border-color:rgba(248,113,113,.25);background:rgba(248,113,113,.08)}

/* ── Meta bar ── */
.meta-bar{background:var(--surface);border-bottom:1px solid var(--border);padding:8px 20px}
.meta-inner{display:flex;flex-wrap:wrap;gap:6px;max-width:820px;margin:0 auto;align-items:center}
.meta-chip{padding:3px 9px;border-radius:4px;font-size:11px;font-weight:500;background:var(--card);border:1px solid var(--border);color:var(--muted);font-family:var(--mono)}
.meta-chip span{color:var(--fg)}

/* ── Changes panel ── */
.changes-panel{background:rgba(108,99,255,.05);border-bottom:1px solid rgba(108,99,255,.15);overflow:hidden;transition:max-height .3s ease}
.changes-panel.collapsed{max-height:0}.changes-panel.open{max-height:500px}
.changes-inner{padding:12px 20px;max-width:820px;margin:0 auto}
.changes-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;cursor:pointer}
.changes-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}
.changes-toggle{font-size:11px;color:var(--muted);background:none;border:none;cursor:pointer;padding:2px 6px}
.change-row{display:flex;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);align-items:flex-start}
.change-row:last-child{border:none}
.change-tag{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--accent);background:rgba(108,99,255,.12);border:1px solid rgba(108,99,255,.2);border-radius:4px;padding:2px 6px;white-space:nowrap;flex-shrink:0}
.change-detail{font-size:12px;color:var(--muted);line-height:1.4}

/* ── Perf strip ── */
.perf-strip{background:var(--surface);border-bottom:1px solid var(--border);padding:10px 20px}
.perf-inner{display:flex;align-items:center;gap:14px;max-width:820px;margin:0 auto;flex-wrap:wrap}
.ring-wrap{display:flex;align-items:center;gap:10px;flex-shrink:0}
.ring{position:relative;width:40px;height:40px}
.ring svg{transform:rotate(-90deg)}
.ring-bg{stroke:var(--border2)}.ring-fill{stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset .6s ease}
.ring-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
.ring-labels{font-size:12px}
.ring-labels b{display:block;color:var(--fg)}
.ring-labels span{font-size:10px;color:var(--muted)}
.v-divider{width:1px;height:32px;background:var(--border);flex-shrink:0}

/* Score + Streak widget (Task 1, 7) */
.score-wrap{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:64px}
.score-val{font-size:20px;font-weight:800;color:var(--accent);line-height:1;transition:color .3s}
.score-val.bump{color:var(--green)}
.score-val.drop{color:var(--red)}
.score-lbl{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.streak-wrap{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;background:rgba(251,146,60,.08);border:1px solid rgba(251,146,60,.2)}
.streak-icon{font-size:13px}
.streak-count{font-size:13px;font-weight:800;color:var(--orange)}
.streak-lbl{font-size:9px;color:var(--muted)}

/* Session progress */
.sess{flex:1;min-width:120px}
.sess-label{font-size:10px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em}
.track{height:5px;background:var(--border);border-radius:3px;overflow:hidden}
.track-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--green));transition:width .4s ease;width:0}
.sess-nums{font-size:10px;color:var(--muted);margin-top:4px;display:flex;justify-content:space-between}
.sess-nums b{color:var(--fg)}

/* Weak areas */
.weak-wrap{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.weak-title{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}
.weak-tag{padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:var(--red)}
.none-tag{padding:2px 8px;border-radius:3px;font-size:9px;background:var(--card);border:1px solid var(--border);color:var(--muted)}

/* ── Performance drop warning (Task 8) ── */
.drop-warning{background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);border-radius:8px;padding:10px 16px;margin:12px 20px;max-width:820px;margin-left:auto;margin-right:auto;display:flex;align-items:center;gap:10px;animation:fadeIn .3s ease}
.drop-warning.hidden{display:none!important}
.drop-icon{font-size:18px}
.drop-text{font-size:12.5px;color:var(--red);font-weight:600}
.drop-sub{font-size:11px;color:var(--muted);margin-top:2px}

/* ── Content ── */
.content{padding:20px;max-width:820px;margin:0 auto}

/* ── States ── */
.state-view{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px;text-align:center;gap:12px}
.state-view h2{font-size:16px;font-weight:600}
.state-view p{font-size:13px;color:var(--muted);max-width:300px;line-height:1.6}
.spinner{width:36px;height:36px;border:2.5px solid var(--border2);border-top-color:var(--accent);border-radius:50%;animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.state-icon-box{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:4px}
.state-icon-box svg{width:24px;height:24px;stroke-width:1.5}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:var(--radius-sm);font-size:12px;font-weight:600;cursor:pointer;border:none;transition:all .18s;letter-spacing:.02em}
.btn-primary{background:var(--accent);color:#fff}
.btn-primary:hover{background:var(--accent-h);transform:translateY(-1px);box-shadow:0 4px 14px rgba(108,99,255,.4)}
.btn-ghost{background:transparent;border:1px solid var(--border2);color:var(--muted)}
.btn-ghost:hover{border-color:var(--accent);color:var(--accent)}

/* ── Section head ── */
.section-head{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.section-line{flex:1;height:1px;background:var(--border)}
.section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);white-space:nowrap}

/* ── Question card ── */
.q-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:12px;transition:border-color .2s,box-shadow .2s;animation:slideUp .28s ease both}
.q-card:hover{border-color:var(--border2);box-shadow:var(--shadow-sm)}
@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.q-card:nth-child(1){animation-delay:0s}.q-card:nth-child(2){animation-delay:.05s}.q-card:nth-child(3){animation-delay:.1s}.q-card:nth-child(4){animation-delay:.15s}.q-card:nth-child(5){animation-delay:.2s}
.q-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap}
.q-num{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.q-badges{display:flex;gap:5px;flex-wrap:wrap;align-items:center}
.topic-badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:2px 7px;border-radius:3px;border:1px solid currentColor}
.topic-badge.functions{color:var(--blue)}.topic-badge.conditions{color:var(--yellow)}.topic-badge.loops{color:var(--orange)}
.topic-badge.classes{color:rgba(52,211,153,1)}.topic-badge.variables{color:var(--green)}.topic-badge.logic{color:var(--accent)}
.topic-badge.refactoring{color:var(--red)}.topic-badge.general{color:var(--muted)}
.qtype-badge{font-size:9px;padding:2px 7px;border-radius:3px;background:rgba(108,99,255,.1);border:1px solid rgba(108,99,255,.2);color:var(--accent)}
.weight-badge{font-size:9px;padding:2px 7px;border-radius:3px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:var(--yellow)}

/* ── Timer (Task 6) ── */
.timer-row{display:flex;align-items:center;gap:6px;margin-bottom:10px}
.timer-icon{font-size:11px;color:var(--muted)}
.timer-val{font-size:11px;font-weight:700;color:var(--muted);font-family:var(--mono);min-width:28px;transition:color .3s}
.timer-val.fast{color:var(--green)}
.timer-val.slow{color:var(--red)}

.q-text{font-size:14px;font-weight:500;line-height:1.6;margin-bottom:14px;color:var(--fg)}
.kbd-hint{font-size:10px;color:var(--muted);margin-bottom:10px;font-family:var(--mono)}

/* ── Options ── */
.options{display:flex;flex-direction:column;gap:7px}
.opt{position:relative}
.opt input[type=radio]{position:absolute;opacity:0;width:0;height:0}
.opt-lbl{display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;transition:border-color .15s,background .15s;background:var(--surface);font-size:13px;user-select:none}
.opt-lbl:hover{border-color:var(--border2);background:rgba(108,99,255,.05)}
.opt-dot{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:border-color .15s,background .15s}
.opt input:checked+.opt-lbl{border-color:var(--accent);background:rgba(108,99,255,.08)}
.opt input:checked+.opt-lbl .opt-dot{background:var(--accent);border-color:var(--accent)}
.opt input:checked+.opt-lbl .opt-dot::after{content:'';width:5px;height:5px;background:#fff;border-radius:50%}
.opt-key{font-size:10px;font-weight:700;color:var(--muted);background:var(--bg);border-radius:3px;padding:1px 5px;border:1px solid var(--border);font-family:var(--mono);flex-shrink:0}
.opt-lbl.correct{border-color:var(--green)!important;background:rgba(74,222,128,.08)!important}
.opt-lbl.wrong{border-color:var(--red)!important;background:rgba(248,113,113,.08)!important}
.opt-lbl.reveal{border-color:rgba(74,222,128,.4)!important;background:rgba(74,222,128,.04)!important}
.opt-lbl.correct .opt-dot,.opt-lbl.reveal .opt-dot{background:var(--green);border-color:var(--green)}
.opt-lbl.correct .opt-dot::after,.opt-lbl.reveal .opt-dot::after{content:'';width:5px;height:5px;background:#fff;border-radius:50%}

/* ── Confidence selector (Task 3) ── */
.confidence-row{display:flex;align-items:center;gap:10px;margin-top:14px;padding:10px 14px;background:rgba(108,99,255,.04);border:1px solid var(--border);border-radius:var(--radius-sm)}
.conf-label{font-size:11px;color:var(--muted);white-space:nowrap}
.conf-select{flex:1;background:var(--surface);border:1px solid var(--border2);color:var(--fg);border-radius:4px;font-size:12px;padding:4px 8px;cursor:pointer;outline:none}
.conf-select:focus{border-color:var(--accent)}
.conf-hint{font-size:10px;color:var(--muted);white-space:nowrap}

/* ── Submit row ── */
.submit-row{margin-top:12px;display:flex;align-items:center;gap:10px}

/* ── Explanation ── */
.explanation{margin-top:14px;padding:14px;border-radius:var(--radius-sm);border-left:2px solid var(--accent);background:rgba(108,99,255,.07);display:none;animation:fadeIn .25s ease}
.explanation.show{display:block}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.exp-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--accent);margin-bottom:6px}
.exp-text{font-size:12.5px;line-height:1.65;color:var(--muted)}
.fb-badge{display:inline-flex;align-items:center;gap:5px;margin-top:10px;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px}
.fb-badge.ok{background:rgba(74,222,128,.1);color:var(--green);border:1px solid rgba(74,222,128,.2)}
.fb-badge.partial{background:rgba(251,191,36,.1);color:var(--yellow);border:1px solid rgba(251,191,36,.25)}
.fb-badge.fail{background:rgba(248,113,113,.1);color:var(--red);border:1px solid rgba(248,113,113,.2)}
.fb-dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.score-delta{font-size:11px;font-weight:700;margin-top:6px;display:inline-block}
.score-delta.pos{color:var(--green)}.score-delta.neg{color:var(--red)}
/* Retry round section header */
.retry-section{margin:20px 0 10px;padding:8px 14px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:var(--radius-sm);display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--yellow)}

/* ── Retry badge (Task 9) ── */
.retry-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);color:var(--yellow);margin-left:6px}

/* ── Summary ── */
.summary{background:var(--card);border:1px solid var(--border2);border-radius:var(--radius);padding:28px 24px;text-align:center;margin-top:8px;display:none;animation:fadeIn .35s ease}
.summary.show{display:block}
.sum-score{font-size:52px;font-weight:800;line-height:1;background:linear-gradient(135deg,var(--accent),var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:4px}
.sum-sub{font-size:12px;color:var(--muted);margin-bottom:20px}
.sum-grid{display:flex;justify-content:center;gap:24px;margin-bottom:18px;flex-wrap:wrap}
.sum-stat strong{display:block;font-size:22px;font-weight:800}
.sum-stat span{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.sum-stat.g strong{color:var(--green)}.sum-stat.r strong{color:var(--red)}.sum-stat.b strong{color:var(--accent)}.sum-stat.y strong{color:var(--yellow)}.sum-stat.o strong{color:var(--orange)}
.sum-msg{font-size:13px;color:var(--muted);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 16px;margin-bottom:16px;line-height:1.6}
.sum-events{font-size:11px;color:var(--muted);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 14px;margin-bottom:14px;text-align:left;max-height:120px;overflow-y:auto}
.sum-events li{padding:2px 0;list-style:none;border-bottom:1px solid var(--border);font-family:var(--mono)}
.sum-events li:last-child{border:none}
.sum-actions{display:flex;justify-content:center;gap:9px;flex-wrap:wrap}

/* ── Footer ── */
.footer{position:fixed;bottom:0;left:0;right:0;background:var(--surface);border-top:1px solid var(--border);padding:8px 20px;display:flex;align-items:center;justify-content:space-between;font-size:10px;color:var(--muted)}
.footer a{color:var(--muted);text-decoration:none;cursor:pointer;padding:2px 6px;border-radius:3px;transition:color .15s,background .15s}
.footer a:hover{color:var(--fg);background:var(--card)}
.footer-links{display:flex;gap:4px}
.footer-score{font-size:11px;font-weight:700;color:var(--accent)}

.hidden{display:none!important}
</style>
</head>
<body>

<!-- HEADER -->
<header class="header">
  <div class="header-inner">
    <div class="logo">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    </div>
    <div class="header-text">
      <div class="header-title">NOESIS</div>
      <div class="header-file" id="hdr-file">Initializing...</div>
    </div>
    <div class="diff-chip hidden" id="diff-chip"></div>
  </div>
</header>

<!-- META BAR -->
<div class="meta-bar hidden" id="meta-bar">
  <div class="meta-inner" id="meta-inner"></div>
</div>

<!-- CHANGES PANEL -->
<div class="changes-panel collapsed" id="changes-panel">
  <div class="changes-inner">
    <div class="changes-head" id="changes-head">
      <span class="changes-label" id="changes-label">Code Changes</span>
      <button class="changes-toggle" id="changes-toggle">Show</button>
    </div>
    <div id="changes-list"></div>
  </div>
</div>

<!-- PERF STRIP -->
<div class="perf-strip">
  <div class="perf-inner">
    <!-- Accuracy ring -->
    <div class="ring-wrap">
      <div class="ring">
        <svg viewBox="0 0 40 40" width="40" height="40">
          <circle class="ring-bg" cx="20" cy="20" r="17" fill="none" stroke-width="3.5"/>
          <circle class="ring-fill" cx="20" cy="20" r="17" fill="none" stroke-width="3.5"
                  stroke-dasharray="106.8" stroke-dashoffset="106.8" id="ring-fill"/>
        </svg>
        <div class="ring-text" id="ring-text">--</div>
      </div>
      <div class="ring-labels">
        <b>Accuracy</b>
        <span id="acc-sub">No data yet</span>
      </div>
    </div>
    <div class="v-divider"></div>

    <!-- Score (Task 1) + Streak (Task 7) -->
    <div class="score-wrap">
      <div class="score-val" id="score-display">0</div>
      <div class="score-lbl">Score</div>
    </div>
    <div class="streak-wrap" id="streak-wrap">
      <span class="streak-icon">🔥</span>
      <span class="streak-count" id="streak-count">0</span>
      <span class="streak-lbl">streak</span>
    </div>
    <div class="v-divider"></div>

    <!-- Session progress -->
    <div class="sess">
      <div class="sess-label">Session</div>
      <div class="track"><div class="track-fill" id="track-fill"></div></div>
      <div class="sess-nums">
        <span><b id="sess-ans">0</b> answered</span>
        <span><b id="sess-cor">0</b> correct</span>
      </div>
    </div>
    <div class="v-divider"></div>

    <!-- Weak areas (Task 4) -->
    <div class="weak-wrap">
      <span class="weak-title">Weak areas</span>
      <span class="none-tag" id="weak-none">None yet</span>
      <div id="weak-tags" style="display:flex;gap:5px;flex-wrap:wrap"></div>
    </div>
  </div>
</div>

<!-- PERFORMANCE DROP WARNING (Task 8) -->
<div class="drop-warning hidden" id="drop-warning" style="margin:12px auto;max-width:820px;margin-left:20px;margin-right:20px">
  <span class="drop-icon">⚠️</span>
  <div>
    <div class="drop-text">Performance dropping. Focus required.</div>
    <div class="drop-sub">3 or more of your last 5 answers were wrong. Score penalised −20.</div>
  </div>
</div>

<!-- MAIN CONTENT -->
<main class="content" id="content">
  <div class="state-view" id="state-loading">
    <div class="spinner"></div>
    <h2>Waiting for analysis</h2>
    <p id="state-loading-msg">Save a supported file to generate questions.</p>
  </div>
  <div class="state-view hidden" id="state-error">
    <div class="state-icon-box" style="background:rgba(248,113,113,.1)">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
    <h2>Something went wrong</h2>
    <p id="state-error-msg">The API request failed.</p>
    <button class="btn btn-primary" id="retry-btn">Retry Analysis</button>
  </div>
  <div class="hidden" id="questions-view">
    <div class="section-head">
      <span class="section-label">Questions</span>
      <div class="section-line"></div>
      <span class="section-label" id="q-count-label"></span>
    </div>
    <div id="q-list"></div>
    <!-- Summary card -->
    <div class="summary" id="summary">
      <div class="sum-score" id="sum-pct"></div>
      <div class="sum-sub">Session Accuracy</div>
      <div class="sum-grid">
        <div class="sum-stat g"><strong id="sum-cor">0</strong><span>Correct</span></div>
        <div class="sum-stat r"><strong id="sum-wrg">0</strong><span>Wrong</span></div>
        <div class="sum-stat b"><strong id="sum-tot">0</strong><span>Total</span></div>
        <div class="sum-stat y"><strong id="sum-pts">0</strong><span>Points</span></div>
        <div class="sum-stat o"><strong id="sum-streak">0</strong><span>Best Streak</span></div>
      </div>
      <div class="sum-msg" id="sum-msg"></div>
      <ul class="sum-events hidden" id="sum-events"></ul>
      <div class="sum-actions">
        <button class="btn btn-ghost" onclick="window.scrollTo({top:0,behavior:'smooth'})">Review Answers</button>
        <button class="btn btn-ghost" id="btn-show-events">Show Score Log</button>
      </div>
    </div>
  </div>
</main>

<!-- FOOTER -->
<footer class="footer">
  <span>NOESIS &mdash; Code Understanding Validator &nbsp;|&nbsp; <span class="footer-score">Score: <span id="footer-score">0</span></span></span>
  <div class="footer-links">
    <a id="fp-settings">API Key</a>
    <a id="fp-reset">Reset Stats</a>
  </div>
</footer>

<script>
/* ═══════════════════════════════════════════════
   NOESIS WEBVIEW — Controller v4
   Tasks 1,3,6,7,8,9,10,11 integrated
═══════════════════════════════════════════════ */

const vscode = acquireVsCodeApi();

// ── State ────────────────────────────────────
const state = {
  questions:    [],
  answers:      {},        // qi → selectedIndex
  startTimes:   {},        // qi → Date.now()
  session:      { answered: 0, correct: 0 },
  changesBannerOpen: false,
  loadingTimeout: null,
  // Task 1,7
  score:   0,
  streak:  0,
  maxStreak: 0,
  // Task 6 — timers
  timerIds:      {},       // qi → intervalId
  elapsedSecs:   {},       // qi → seconds elapsed
  // Task 8
  performanceDrop: false,
  // Score log
  scoreEvents: [],
  // Task 9
  isRetryQuestion: false,
};

// ── API ──────────────────────────────────────
const api = {
  ready()        { vscode.postMessage({ command: 'webviewReady' }); },
  openSettings() { vscode.postMessage({ command: 'openSettings' }); },
  resetStats()   { vscode.postMessage({ command: 'resetStats'   }); },
  answerQuestion(qi, answer, ms, confidence, questionType) {
    vscode.postMessage({ command: 'answerQuestion', questionIndex: qi, answer, responseMs: ms, confidence, questionType });
  },
  sessionComplete(correct, total) {
    vscode.postMessage({ command: 'sessionComplete', correct, total });
  },
};

// ── Utils ────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function el(id)   { return document.getElementById(id); }
function show(id) { const e=el(id); if(e) e.classList.remove('hidden'); }
function hide(id) { const e=el(id); if(e) e.classList.add('hidden'); }

const QTYPE_WEIGHTS = { conceptual:5, 'logic-based':10, 'edge-case':15, 'output-predict':20 };

// ── Render ───────────────────────────────────
const render = {

  loading(msg) {
    show('state-loading'); hide('state-error'); hide('questions-view');
    el('state-loading-msg').textContent = msg || 'Analyzing code...';
    const msgs = ['Analyzing code structure...','Generating adaptive questions...','Almost ready...'];
    let i = 0;
    if (state.loadingTimeout) clearInterval(state.loadingTimeout);
    state.loadingTimeout = setInterval(() => {
      i = (i+1) % msgs.length;
      if (el('state-loading-msg')) el('state-loading-msg').textContent = msgs[i];
    }, 3000);
  },

  error(msg) {
    if (state.loadingTimeout) clearInterval(state.loadingTimeout);
    show('state-error'); hide('state-loading'); hide('questions-view');
    el('state-error-msg').textContent = msg || 'An unexpected error occurred.';
  },

  questions(qs) {
    if (state.loadingTimeout) clearInterval(state.loadingTimeout);
    hide('state-loading'); hide('state-error'); show('questions-view');

    // Stop any running timers
    Object.values(state.timerIds).forEach(clearInterval);

    state.questions   = qs;
    state.answers     = {};
    state.startTimes  = {};
    state.timerIds    = {};
    state.elapsedSecs = {};
    state.scoreEvents = [];

    el('q-count-label').textContent = qs.length + ' question' + (qs.length !== 1 ? 's' : '');
    el('q-list').innerHTML = qs.map((q, i) => render._card(q, i)).join('');

    qs.forEach((_, i) => {
      state.startTimes[i]   = Date.now();
      state.elapsedSecs[i]  = 0;
      // Start timer
      state.timerIds[i] = setInterval(() => {
        state.elapsedSecs[i]++;
        const t = el('timer-' + i);
        if (!t) { clearInterval(state.timerIds[i]); return; }
        const s = state.elapsedSecs[i];
        t.textContent = s + 's';
        t.className = 'timer-val' + (s < 10 ? ' fast' : s > 30 ? ' slow' : '');
      }, 1000);

      el('sub-' + i).addEventListener('click', () => events.submit(i));
      document.querySelectorAll('input[name="q' + i + '"]').forEach(r => {
        r.addEventListener('change', () => { el('sub-' + i).disabled = false; });
      });
    });
  },

  _card(q, i) {
    const topic    = q.topic       || 'general';
    const qtype    = q.questionType || 'conceptual';
    const weight   = QTYPE_WEIGHTS[qtype] ?? 5;
    const isRetry  = q._isRetry ? '<span class="retry-tag">↩ Retry</span>' : '';
    const keys     = ['A','B','C','D'];
    const opts = q.options.map((opt, oi) => \`
      <div class="opt" id="opt-\${i}-\${oi}">
        <input type="radio" name="q\${i}" id="q\${i}o\${oi}" value="\${oi}">
        <label class="opt-lbl" for="q\${i}o\${oi}">
          <span class="opt-dot"></span>
          <span class="opt-key">\${keys[oi]}</span>
          <span>\${esc(opt)}</span>
        </label>
      </div>\`).join('');

    return \`<div class="q-card" id="card-\${i}">
      <div class="q-top">
        <span class="q-num">Question \${i+1} of \${state.questions.length}\${isRetry}</span>
        <div class="q-badges">
          <span class="topic-badge \${topic}">\${esc(topic)}</span>
          <span class="qtype-badge">\${esc(qtype)}</span>
          <span class="weight-badge">×\${weight}</span>
        </div>
      </div>
      <div class="timer-row">
        <span class="timer-icon">⏱</span>
        <span class="timer-val fast" id="timer-\${i}">0s</span>
        <span style="font-size:10px;color:var(--muted)">— fast <10s gives +5 bonus</span>
      </div>
      <div class="q-text">\${esc(q.question)}</div>
      <div class="options">\${opts}</div>
      <div class="confidence-row">
        <span class="conf-label">Confidence:</span>
        <select class="conf-select" id="conf-\${i}">
          <option value="low">🟡 Low — small penalty if wrong</option>
          <option value="medium" selected>🟠 Medium — standard scoring</option>
          <option value="high">🔴 High — bonus if correct, penalty if wrong</option>
        </select>
        <span class="conf-hint" id="conf-hint-\${i}">Standard</span>
      </div>
      <div class="submit-row">
        <button class="btn btn-primary" id="sub-\${i}" disabled>Submit Answer</button>
      </div>
      <div class="explanation hidden" id="exp-\${i}">
        <div class="exp-label">Explanation</div>
        <div class="exp-text" id="exp-txt-\${i}"></div>
        <div class="fb-badge" id="fb-\${i}"></div>
        <div class="score-delta" id="delta-\${i}"></div>
      </div>
    </div>\`;
  },

  header(fileName, analysis, difficulty) {
    el('hdr-file').textContent = fileName || 'No file';
    const chip = el('diff-chip');
    if (difficulty) {
      chip.textContent = difficulty.toUpperCase();
      chip.className   = 'diff-chip ' + difficulty;
      show('diff-chip');
    }
    if (analysis) {
      show('meta-bar');
      el('meta-inner').innerHTML = [
        ['LANG',  analysis.language   || '--'],
        ['FN',    analysis.functions  || 0],
        ['CLASS', analysis.classes    || 0],
        ['LINES', analysis.lines      || '--'],
        ['CPX',   analysis.complexity || '--'],
      ].map(([k,v]) => \`<span class="meta-chip">\${k} <span>\${esc(String(v))}</span></span>\`).join('');
    }
  },

  changes(changes, isFirstSave) {
    if (!changes || changes.length === 0 || isFirstSave) return;
    el('changes-label').textContent = changes.length + ' Change' + (changes.length > 1 ? 's' : '') + ' Detected';
    el('changes-list').innerHTML = changes.map(c => {
      const tag = c.type.replace(/_/g,' ');
      return \`<div class="change-row"><span class="change-tag">\${esc(tag)}</span><span class="change-detail">\${esc(c.detail)}</span></div>\`;
    }).join('');
    const panel = el('changes-panel');
    panel.classList.remove('collapsed'); panel.classList.add('open');
    state.changesBannerOpen = true;
    el('changes-toggle').textContent = 'Hide';
  },

  perf(perf) {
    if (!perf) return;
    const pct  = perf.accuracy ?? null;
    const circ = 106.8;
    el('ring-fill').style.strokeDashoffset = pct === null ? circ : circ - (pct/100)*circ;
    el('ring-text').textContent  = pct === null ? '--' : pct + '%';
    el('acc-sub').textContent    = perf.totalQuestions === 0 ? 'No data yet' : perf.correctAnswers + '/' + perf.totalQuestions;

    // Score (Task 1)
    if (perf.sessionScore !== undefined) {
      state.score    = perf.sessionScore;
      state.streak   = perf.streak ?? 0;
      state.maxStreak = perf.maxStreak ?? 0;
      render.scoreDisplay(perf.sessionScore);
    }

    // Streak (Task 7)
    el('streak-count').textContent = state.streak;
    el('streak-wrap').style.opacity = state.streak > 0 ? '1' : '0.4';

    // Weak areas (Task 4)
    const weakAreas = perf.weakAreas || [];
    const hasWeak = weakAreas.length > 0;
    el('weak-none').style.display = hasWeak ? 'none' : '';
    el('weak-tags').innerHTML = hasWeak
      ? weakAreas.map(w => \`<span class="weak-tag" title="\${w.count} wrong">\${esc(w.topic)} (\${w.count})</span>\`).join('')
      : '';

    // Performance drop warning (Task 8)
    if (perf.performanceDrop) {
      show('drop-warning');
    }

    // Footer score
    el('footer-score').textContent = state.score;
  },

  scoreDisplay(score) {
    const el2 = el('score-display');
    el2.textContent = score;
    el2.className   = 'score-val ' + (score >= 0 ? 'bump' : 'drop');
    setTimeout(() => { el2.className = 'score-val'; }, 800);
    el('footer-score').textContent = score;
  },

  sessionStrip() {
    const total = state.questions.length;
    const ans   = Object.keys(state.answers).length;
    const cor   = Object.values(state.answers).filter((v,i) => v === state.questions[i]?.correct).length;
    el('sess-ans').textContent = ans;
    el('sess-cor').textContent = cor;
    el('track-fill').style.width = total > 0 ? Math.round((ans/total)*100)+'%' : '0%';
  },

  feedback(qi, selected, scoreResult, grade) {
    const q         = state.questions[qi];
    const isCorrect = selected === q.correct;
    // grade may be 'full'|'partial'|'wrong' from evaluator
    const resolvedGrade = grade || (isCorrect ? 'full' : 'wrong');
    // Stop timer
    clearInterval(state.timerIds[qi]);

    // Style options
    q.options.forEach((_, oi) => {
      const lbl = document.querySelector(\`label[for="q\${qi}o\${oi}"]\`);
      if (!lbl) return;
      if (oi === q.correct)    lbl.classList.add(selected === oi ? 'correct' : 'reveal');
      else if (oi === selected) lbl.classList.add('wrong');
    });

    // Explanation
    el('exp-txt-' + qi).textContent = q.explanation || '';
    const fb = el('fb-' + qi);
    const badgeClass = resolvedGrade === 'full' ? 'ok' : resolvedGrade === 'partial' ? 'partial' : 'fail';
    const badgeLabel = resolvedGrade === 'full' ? '✓ Correct' : resolvedGrade === 'partial' ? '◑ Partial credit' : '✗ Incorrect';
    fb.className = 'fb-badge ' + badgeClass;
    fb.innerHTML = \`<span class="fb-dot"></span>\${badgeLabel}\`;

    // Score delta (Task 1,2,3,6,7)
    if (scoreResult) {
      const d   = el('delta-' + qi);
      const val = scoreResult.delta;
      d.textContent  = (val >= 0 ? '+' : '') + val + ' pts';
      d.className    = 'score-delta ' + (val >= 0 ? 'pos' : 'neg');
      // Log events for summary
      (scoreResult.events || []).forEach(e => state.scoreEvents.push(e));
    }

    el('exp-' + qi).classList.remove('hidden');
    el('exp-' + qi).classList.add('show');

    // Disable all inputs
    document.querySelectorAll(\`input[name="q\${qi}"]\`).forEach(r => r.disabled = true);
    el('sub-' + qi).disabled    = true;
    el('sub-' + qi).textContent = resolvedGrade === 'full' ? '✓ Correct' : resolvedGrade === 'partial' ? '◑ Partial' : '✗ Answered';
    el('conf-' + qi).disabled   = true;
  },

  summary() {
    const total   = state.questions.length;
    const correct = state.questions.filter((q,i) => state.answers[i] === q.correct).length;
    const pct     = Math.round((correct/total)*100);
    el('sum-pct').textContent    = pct + '%';
    el('sum-cor').textContent    = correct;
    el('sum-wrg').textContent    = total - correct;
    el('sum-tot').textContent    = total;
    el('sum-pts').textContent    = state.score;
    el('sum-streak').textContent = state.maxStreak;
    el('sum-msg').textContent    = this._summaryMsg(pct);

    // Score event log
    el('sum-events').innerHTML = state.scoreEvents.map(e => \`<li>\${esc(e)}</li>\`).join('');

    const sum = el('summary');
    sum.classList.add('show');
    setTimeout(() => sum.scrollIntoView({ behavior:'smooth', block:'center' }), 100);
  },

  _summaryMsg(pct) {
    if (pct === 100) return 'Perfect score! Outstanding code understanding.';
    if (pct >= 80)   return 'Strong performance. Review the explanations to close any gaps.';
    if (pct >= 60)   return 'Good effort. Focus on the topics you missed.';
    if (pct >= 40)   return 'Keep going. Re-read the explanations carefully before moving on.';
    return 'Take time to review the explanations. Understanding improves with practice.';
  }
};

// ── Events ───────────────────────────────────
const events = {

  submit(qi) {
    if (state.answers[qi] !== undefined) return;
    const radio = document.querySelector(\`input[name="q\${qi}"]:checked\`);
    if (!radio) return;

    const selected     = parseInt(radio.value);
    const ms           = state.startTimes[qi] ? Date.now() - state.startTimes[qi] : 0;
    const confidence   = el('conf-' + qi)?.value || 'medium';
    const questionType = state.questions[qi]?.questionType || 'conceptual';

    state.answers[qi] = selected;

    render.feedback(qi, selected, null); // immediate visual feedback
    render.sessionStrip();
    api.answerQuestion(qi, selected, ms, confidence, questionType);

    if (Object.keys(state.answers).length === state.questions.length) {
      api.sessionComplete(
        state.questions.filter((q,i) => state.answers[i] === q.correct).length,
        state.questions.length
      );
      render.summary();
    }
  },

  toggleChanges() {
    const panel = el('changes-panel');
    state.changesBannerOpen = !state.changesBannerOpen;
    panel.classList.toggle('collapsed', !state.changesBannerOpen);
    panel.classList.toggle('open',      state.changesBannerOpen);
    el('changes-toggle').textContent = state.changesBannerOpen ? 'Hide' : 'Show';
  },

  _hovered: -1,
  keydown(e) {
    if (events._hovered < 0) return;
    const qi = events._hovered;
    if (state.answers[qi] !== undefined) return;
    const map = { a:0, b:1, c:2, d:3, '1':0, '2':1, '3':2, '4':3 };
    const oi  = map[e.key.toLowerCase()];
    if (oi === undefined) return;
    const q = state.questions[qi];
    if (!q || oi >= q.options.length) return;
    const r = document.getElementById(\`q\${qi}o\${oi}\`);
    if (r && !r.disabled) { r.checked = true; el('sub-' + qi).disabled = false; }
  }
};

// ── Confidence hint updates ───────────────────
document.addEventListener('change', e => {
  const s = e.target.closest('select.conf-select');
  if (!s) return;
  const idx   = s.id.replace('conf-','');
  const hints = { low:'Small penalty if wrong', medium:'Standard scoring', high:'+5 bonus if correct / big penalty if wrong' };
  const hint  = el('conf-hint-' + idx);
  if (hint) hint.textContent = hints[s.value] || '';
});

// ── Message Router ────────────────────────────
window.addEventListener('message', ({ data: msg }) => {
  switch (msg.command) {

    case 'init':
      render.header(msg.fileName, msg.analysis, msg.difficulty);
      render.changes(msg.changes, msg.isFirstSave);
      render.perf(msg.perfSummary);
      render.questions(msg.questions);
      break;

    case 'updateStats':
      render.perf(msg.perfSummary);
      render.sessionStrip();
      // Show inline score delta + grade badge if provided (G2: partial grade support)
      if (msg.scoreResult && msg.questionIndex !== undefined) {
        render.feedback(msg.questionIndex, state.answers[msg.questionIndex], msg.scoreResult, msg.grade);
      }
      break;

    // G4: Live difficulty chip update when adaptive level changes
    case 'updateDifficulty': {
      const chip = el('diff-chip');
      if (chip && msg.difficulty) {
        chip.textContent = msg.difficulty.toUpperCase();
        chip.className   = 'diff-chip ' + msg.difficulty;
        chip.classList.remove('hidden');
        // Brief flash animation to draw attention
        chip.style.transition = 'transform .2s ease, box-shadow .2s ease';
        chip.style.transform  = 'scale(1.15)';
        chip.style.boxShadow  = '0 0 10px rgba(108,99,255,.5)';
        setTimeout(() => {
          chip.style.transform = 'scale(1)';
          chip.style.boxShadow = '';
        }, 300);
      }
      break;
    }

    // G5: Task 9 — inject retry questions at end of session
    case 'injectRetry': {
      const retryQs = msg.retryQuestions;
      if (!Array.isArray(retryQs) || retryQs.length === 0) break;

      const startIdx = state.questions.length;
      // Append to state
      retryQs.forEach(q => state.questions.push(q));
      // Update question count label
      el('q-count-label').textContent = state.questions.length + ' question' + (state.questions.length !== 1 ? 's' : '');

      // Insert retry section header + new cards into DOM
      const qList = el('q-list');
      const header = document.createElement('div');
      header.className = 'retry-section';
      header.innerHTML = '↩ Retry Round &nbsp;—&nbsp; ' + retryQs.length + ' question' + (retryQs.length !== 1 ? 's' : '') + ' you got wrong';
      // Insert before the summary card (which comes after q-list)
      qList.appendChild(header);

      retryQs.forEach((q, offset) => {
        const qi = startIdx + offset;
        const cardHtml = render._card(q, qi);
        const div = document.createElement('div');
        div.innerHTML = cardHtml;
        const card = div.firstElementChild;
        qList.appendChild(card);

        // Wire up the new card's events
        state.startTimes[qi]  = Date.now();
        state.elapsedSecs[qi] = 0;
        state.timerIds[qi] = setInterval(() => {
          state.elapsedSecs[qi]++;
          const t = el('timer-' + qi);
          if (!t) { clearInterval(state.timerIds[qi]); return; }
          const s = state.elapsedSecs[qi];
          t.textContent = s + 's';
          t.className = 'timer-val' + (s < 10 ? ' fast' : s > 30 ? ' slow' : '');
        }, 1000);

        document.getElementById('sub-' + qi).addEventListener('click', () => events.submit(qi));
        document.querySelectorAll('input[name="q' + qi + '"]').forEach(r => {
          r.addEventListener('change', () => { el('sub-' + qi).disabled = false; });
        });
      });

      // Smooth scroll to retry section
      setTimeout(() => header.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      break;
    }

    case 'showLoading':
      render.loading(msg.message);
      break;

    case 'showError':
      render.error(msg.message);
      break;
  }
});

// ── Boot ─────────────────────────────────────
el('fp-settings').addEventListener('click', api.openSettings);
el('fp-reset').addEventListener('click', api.resetStats);
el('retry-btn').addEventListener('click', api.ready);
el('changes-head').addEventListener('click', events.toggleChanges);

el('btn-show-events').addEventListener('click', () => {
  const ev = el('sum-events');
  ev.classList.toggle('hidden');
  el('btn-show-events').textContent = ev.classList.contains('hidden') ? 'Show Score Log' : 'Hide Score Log';
});

document.addEventListener('mouseover', e => {
  const card = e.target.closest('.q-card');
  events._hovered = card ? parseInt(card.id.replace('card-','')) : -1;
});
document.addEventListener('keydown', e => events.keydown(e));

render.loading('Save a supported file (.js, .ts, .py) to generate questions.');
api.ready();
</script>
</body>
</html>`;
}

module.exports = { getWebviewContent };
