import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────
   CSS
───────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --font-sans: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'DM Serif Display', Georgia, serif;
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --transition: 0.4s var(--ease-out);
  --max-w: 1080px;
}

[data-theme="dark"] {
  --bg: #08050f;
  --bg2: #0d0818;
  --bg3: #120c20;
  --surface: rgba(255,255,255,0.038);
  --surface-hover: rgba(255,255,255,0.065);
  --border: rgba(180,140,255,0.09);
  --border-glow: rgba(160,110,255,0.28);
  --text: #f0ecff;
  --text-secondary: rgba(210,190,255,0.48);
  --accent: #a78bf5;
  --accent2: #c084fc;
  --accent3: #7c3aed;
  --cta-bg: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  --cta-shadow: rgba(120,60,235,0.4);
  --glass: rgba(12,7,22,0.68);
  --orb1: rgba(120,60,220,0.18);
  --orb2: rgba(80,40,180,0.14);
  --orb3: rgba(160,90,255,0.10);
  --nav-bg: rgba(8,5,15,0.76);
  --dot-color: rgba(180,140,255,0.038);
  --bubble-bg: rgba(35,20,65,0.9);
  --bubble-out: rgba(100,60,200,0.88);
  --section-alt: rgba(120,60,220,0.04);
  --card-shadow: 0 6px 32px rgba(0,0,0,0.4);
  --footer-bg: #050309;
  --gradient-text: linear-gradient(135deg,#c084fc,#a78bf5);
}

[data-theme="light"] {
  --bg: #faf8ff;
  --bg2: #f3effb;
  --bg3: #ece5f8;
  --surface: rgba(255,255,255,0.72);
  --surface-hover: rgba(255,255,255,0.92);
  --border: rgba(120,80,210,0.12);
  --border-glow: rgba(100,60,220,0.25);
  --text: #0e0820;
  --text-secondary: rgba(40,20,90,0.48);
  --accent: #6d28d9;
  --accent2: #7c3aed;
  --accent3: #4f46e5;
  --cta-bg: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
  --cta-shadow: rgba(100,40,200,0.28);
  --glass: rgba(250,248,255,0.76);
  --orb1: rgba(120,60,220,0.13);
  --orb2: rgba(80,40,200,0.10);
  --orb3: rgba(160,90,255,0.08);
  --nav-bg: rgba(250,248,255,0.82);
  --dot-color: rgba(110,50,210,0.06);
  --bubble-bg: rgba(230,220,255,0.95);
  --bubble-out: rgba(90,45,200,0.88);
  --section-alt: rgba(110,50,210,0.03);
  --card-shadow: 0 6px 32px rgba(100,50,200,0.09);
  --footer-bg: #ede8fa;
  --gradient-text: linear-gradient(135deg,#6d28d9,#4f46e5);
  --hero-mesh: radial-gradient(ellipse 80% 60% at 20% 50%, rgba(120,60,230,0.13) 0%, transparent 60%),
               radial-gradient(ellipse 60% 70% at 80% 30%, rgba(90,40,200,0.10) 0%, transparent 55%),
               radial-gradient(ellipse 50% 50% at 55% 80%, rgba(160,100,255,0.08) 0%, transparent 50%);
}

html { scroll-behavior: smooth; }
body { overflow-x: hidden; }

#aura-root {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  transition: background var(--transition), color var(--transition);
  position: relative;
  overflow-x: hidden;
}

#aura-root::before {
  content: "";
  position: fixed; inset: 0;
  background-image: radial-gradient(var(--dot-color) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none; z-index: 0;
  transition: background var(--transition);
}

/* ── Orbs ── */
.orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none; z-index: 0; animation: orbDrift 20s ease-in-out infinite alternate; transition: background var(--transition); }
.orb-1 { width: 480px; height: 480px; background: var(--orb1); top: -120px; left: -100px; animation-duration: 22s; }
.orb-2 { width: 360px; height: 360px; background: var(--orb2); top: 28%; right: -60px; animation-duration: 26s; animation-delay: -9s; }
.orb-3 { width: 280px; height: 280px; background: var(--orb3); bottom: 12%; left: 32%; animation-duration: 18s; animation-delay: -5s; }
@keyframes orbDrift { from { transform: translate(0,0) scale(1); } to { transform: translate(24px,16px) scale(1.06); } }

/* ── Hero mesh overlay (light mode) ── */
[data-theme="light"] .hero::before {
  content: "";
  position: fixed; inset: 0;
  background: var(--hero-mesh);
  pointer-events: none; z-index: 0;
  border-radius: 0;
}

/* ── Dark hero vignette ── */
[data-theme="dark"] #aura-root::after {
  content: "";
  position: fixed; inset: 0;
  background: radial-gradient(ellipse 70% 60% at 15% 40%, rgba(100,40,200,0.12) 0%, transparent 55%),
              radial-gradient(ellipse 50% 50% at 85% 20%, rgba(80,30,160,0.10) 0%, transparent 50%);
  pointer-events: none; z-index: 0;
}

/* ── Navbar ── */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 36px; height: 54px;
  background: var(--nav-bg);
  backdrop-filter: blur(28px) saturate(1.7);
  -webkit-backdrop-filter: blur(28px) saturate(1.7);
  border-bottom: 1px solid var(--border);
  transition: background var(--transition), border-color var(--transition);
}
.nav-logo { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; letter-spacing: -0.2px; color: var(--text); cursor: default; }
.logo-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--cta-bg); display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: 0 3px 10px var(--cta-shadow); flex-shrink: 0; animation: logoBreath 4s ease-in-out infinite; }
@keyframes logoBreath { 0%,100% { box-shadow: 0 3px 10px var(--cta-shadow); } 50% { box-shadow: 0 3px 20px var(--cta-shadow); } }
.nav-actions { display: flex; align-items: center; gap: 8px; }
.btn-ghost { padding: 6px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 500; font-family: var(--font-sans); color: var(--text); background: transparent; border: 1px solid var(--border); cursor: pointer; transition: background 0.2s, border-color 0.2s, transform 0.15s var(--ease-spring); }
.btn-ghost:hover { background: var(--surface-hover); border-color: var(--border-glow); transform: translateY(-1px); }
.btn-primary { padding: 6px 16px; border-radius: 8px; font-size: 12.5px; font-weight: 600; font-family: var(--font-sans); color: #fff; background: var(--cta-bg); border: none; cursor: pointer; box-shadow: 0 3px 12px var(--cta-shadow); transition: box-shadow 0.2s, transform 0.15s var(--ease-spring); }
.btn-primary:hover { box-shadow: 0 5px 20px var(--cta-shadow); transform: translateY(-1px); }
.theme-toggle { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.2s, border-color 0.2s, transform 0.2s var(--ease-spring); }
.theme-toggle:hover { background: var(--surface-hover); transform: rotate(18deg) scale(1.06); }

/* ── Hero ── */
.hero { position: relative; z-index: 1; min-height: 100vh; display: flex; align-items: center; padding: 70px 36px 36px; gap: 36px; max-width: var(--max-w); margin: 0 auto; }
.hero-visual { flex: 1 1 0; position: relative; display: flex; align-items: center; justify-content: center; min-height: 440px; }
.phone-mockup { position: relative; width: 176px; height: 344px; border-radius: 30px; border: 1.5px solid var(--border-glow); background: var(--glass); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 26px 64px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08); overflow: hidden; animation: phoneFloat 6s ease-in-out infinite; flex-shrink: 0; }
@keyframes phoneFloat { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-14px) rotate(1deg); } }
.phone-notch { width: 64px; height: 18px; border-radius: 0 0 11px 11px; background: var(--bg); margin: 0 auto 10px; }
.phone-chat-area { padding: 0 10px; display: flex; flex-direction: column; gap: 8px; }
.msg { max-width: 75%; padding: 6px 10px; border-radius: 12px; font-size: 9.5px; line-height: 1.45; color: var(--text); opacity: 0; transform: translateY(6px); animation: msgPop 0.35s var(--ease-spring) forwards; }
.msg-in  { background: var(--bubble-bg); border-bottom-left-radius: 3px; align-self: flex-start; }
.msg-out { background: var(--bubble-out); border-bottom-right-radius: 3px; align-self: flex-end; color: #fff; }
@keyframes msgPop { to { opacity: 1; transform: translateY(0); } }
.typing-indicator { display: flex; gap: 3px; align-items: center; padding: 6px 10px; background: var(--bubble-bg); border-radius: 12px 12px 12px 3px; width: fit-content; margin-left: 10px; }
.typing-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: typingBounce 1.2s ease-in-out infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
.orbit-ring { position: absolute; border-radius: 50%; border: 1px dashed var(--border-glow); animation: orbitSpin linear infinite; }
.orbit-ring-1 { width: 260px; height: 260px; animation-duration: 28s; }
.orbit-ring-2 { width: 360px; height: 360px; animation-duration: 40s; animation-direction: reverse; opacity: 0.45; }
@keyframes orbitSpin { to { transform: rotate(360deg); } }
.orbit-dot { position: absolute; width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); top: -3.5px; left: calc(50% - 3.5px); }
.orbit-dot-2 { background: var(--accent3); box-shadow: 0 0 8px var(--accent3); }
.chip { position: absolute; display: flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 40px; background: var(--glass); border: 1px solid var(--border-glow); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); font-size: 10px; font-weight: 500; color: var(--text); white-space: nowrap; box-shadow: 0 6px 18px rgba(0,0,0,0.1); animation: chipFloat 4s ease-in-out infinite; }
.chip-icon { font-size: 12px; }
.chip-1 { top: 48px; left: -16px; animation-delay: 0s; }
.chip-2 { top: 116px; right: -24px; animation-delay: 1.2s; }
.chip-3 { bottom: 80px; left: -24px; animation-delay: 0.6s; }
.chip-4 { bottom: 48px; right: -8px; animation-delay: 1.8s; }
@keyframes chipFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.particles-canvas { position: absolute; inset: 0; pointer-events: none; }
.hero-content { flex: 1 1 0; display: flex; flex-direction: column; gap: 18px; max-width: 480px; }
.hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 40px; border: 1px solid var(--border-glow); background: var(--surface); font-size: 10.5px; font-weight: 500; color: var(--accent); width: fit-content; animation: fadeSlideUp 0.6s var(--ease-out) both; }
.badge-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 5px var(--accent); animation: pulseDot 2s ease-in-out infinite; }
@keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
.hero-title { font-family: var(--font-serif); font-size: clamp(30px, 4vw, 48px); font-weight: 700; letter-spacing: -0.5px; line-height: 1.1; color: var(--text); animation: fadeSlideUp 0.6s var(--ease-out) 0.1s both; }
.hero-title .grad { background: var(--cta-bg); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.hero-subtitle { font-size: 13px; line-height: 1.75; color: var(--text-secondary); max-width: 380px; animation: fadeSlideUp 0.6s var(--ease-out) 0.2s both; }
.hero-ctas { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; animation: fadeSlideUp 0.6s var(--ease-out) 0.3s both; }
.btn-large { padding: 10px 22px; border-radius: 11px; font-size: 13px; font-weight: 600; font-family: var(--font-sans); color: #fff; background: var(--cta-bg); border: none; cursor: pointer; box-shadow: 0 5px 22px var(--cta-shadow); transition: box-shadow 0.2s, transform 0.15s var(--ease-spring); display: flex; align-items: center; gap: 6px; }
.btn-large:hover { box-shadow: 0 8px 32px var(--cta-shadow); transform: translateY(-1px); }
.hero-stats { display: flex; gap: 24px; animation: fadeSlideUp 0.6s var(--ease-out) 0.4s both; padding-top: 4px; }
.stat { display: flex; flex-direction: column; gap: 1px; }
.stat-value { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: var(--text); }
.stat-label { font-size: 10.5px; color: var(--text-secondary); font-weight: 400; }
.stat-divider { width: 1px; background: var(--border); align-self: stretch; }
.social-proof { display: flex; align-items: center; gap: 8px; animation: fadeSlideUp 0.6s var(--ease-out) 0.5s both; }
.avatars { display: flex; }
.avatar { width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid var(--bg); margin-right: -6px; font-size: 9px; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; }
.av1 { background: #3b82f6; } .av2 { background: #8b5cf6; } .av3 { background: #06b6d4; } .av4 { background: #ec4899; }
.social-proof-text { margin-left: 12px; font-size: 11px; color: var(--text-secondary); }
.stars { color: #f59e0b; font-size: 10px; margin-right: 3px; }
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }

/* ── Ticker ── */
.ticker-wrap { position: relative; z-index: 1; background: var(--section-alt); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); overflow: hidden; padding: 11px 0; }
.ticker-track { display: flex; gap: 48px; width: max-content; animation: tickerScroll 28s linear infinite; }
.ticker-item { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 500; color: var(--text-secondary); white-space: nowrap; }
.ticker-icon { font-size: 13px; }
.ticker-sep { color: var(--border-glow); }
@keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ── Section shared ── */
.section { position: relative; z-index: 1; padding: 80px 36px; }
.section-alt { background: var(--section-alt); }
.section-inner { max-width: var(--max-w); margin: 0 auto; }
.section-label { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 40px; border: 1px solid var(--border-glow); background: var(--surface); font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.9px; color: var(--accent); margin-bottom: 13px; }
.section-title { font-family: var(--font-serif); font-size: clamp(24px, 3.2vw, 38px); font-weight: 400; letter-spacing: -0.5px; line-height: 1.12; color: var(--text); margin-bottom: 12px; }
.section-sub { font-size: 13px; line-height: 1.75; color: var(--text-secondary); max-width: 440px; margin-bottom: 44px; }
.section-title .grad { background: var(--gradient-text); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

/* ── Features ── */
.features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.feature-card {
  padding: 24px 22px; border-radius: 16px;
  background: var(--surface); border: 1px solid var(--border);
  transition: background 0.25s, border-color 0.25s, transform 0.25s var(--ease-spring), box-shadow 0.25s;
  cursor: default; position: relative; overflow: hidden;
}
.feature-card::before { content: ""; position: absolute; inset: 0; background: var(--cta-bg); opacity: 0; transition: opacity 0.25s; border-radius: 16px; z-index: 0; }
.feature-card:hover { border-color: var(--border-glow); transform: translateY(-4px); box-shadow: var(--card-shadow); }
.feature-card:hover::before { opacity: 0.035; }
.feature-card > * { position: relative; z-index: 1; }
.feature-icon-wrap { width: 38px; height: 38px; border-radius: 11px; background: var(--surface-hover); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 14px; transition: background 0.2s, border-color 0.2s; }
.feature-card:hover .feature-icon-wrap { border-color: var(--border-glow); }
.feature-name { font-size: 13px; font-weight: 600; letter-spacing: -0.1px; color: var(--text); margin-bottom: 6px; }
.feature-desc { font-size: 12px; line-height: 1.65; color: var(--text-secondary); }
.feature-tag { display: inline-block; margin-top: 12px; padding: 2px 8px; border-radius: 40px; background: var(--surface-hover); border: 1px solid var(--border-glow); font-size: 10px; font-weight: 500; color: var(--accent); }

/* ── How it works ── */
.how-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
.how-steps { display: flex; flex-direction: column; gap: 0; }
.how-step { display: flex; gap: 16px; padding: 18px 0; border-bottom: 1px solid var(--border); cursor: pointer; transition: border-color 0.2s; position: relative; }
.how-step:last-child { border-bottom: none; }
.how-step.active { border-color: var(--border-glow); }
.step-num { width: 30px; height: 30px; border-radius: 8px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-secondary); flex-shrink: 0; transition: background 0.2s, border-color 0.2s, color 0.2s; }
.how-step.active .step-num { background: var(--cta-bg); border-color: transparent; color: #fff; }
.step-content { flex: 1; }
.step-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.step-desc { font-size: 12px; line-height: 1.65; color: var(--text-secondary); }
.step-progress { position: absolute; left: 0; bottom: 0; height: 1.5px; background: var(--cta-bg); transition: width 0.1s linear; border-radius: 2px; }
.how-visual { position: relative; display: flex; align-items: center; justify-content: center; min-height: 360px; }
.how-screen { width: 240px; height: 312px; border-radius: 22px; border: 1.5px solid var(--border-glow); background: var(--glass); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); box-shadow: 0 20px 64px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; transition: all 0.4s var(--ease-out); }
.how-screen-header { padding: 13px 14px 10px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; }
.hsh-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--cta-bg); display: flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; font-weight: 600; flex-shrink: 0; }
.hsh-info { flex: 1; }
.hsh-name { font-size: 11px; font-weight: 600; color: var(--text); }
.hsh-status { font-size: 9.5px; color: var(--accent); }
.hsh-dots { display: flex; gap: 4px; }
.hsh-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-secondary); }
.how-screen-body { flex: 1; padding: 11px 11px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.how-screen-footer { padding: 10px 11px; border-top: 1px solid var(--border); display: flex; align-items: center; gap: 6px; }
.how-input-bar { flex: 1; height: 26px; border-radius: 13px; background: var(--surface-hover); border: 1px solid var(--border); display: flex; align-items: center; padding: 0 10px; font-size: 9.5px; color: var(--text-secondary); }
.how-send-btn { width: 26px; height: 26px; border-radius: 50%; background: var(--cta-bg); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }

/* ── Testimonials ── */
.testimonials-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.testi-card { padding: 22px 20px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); transition: border-color 0.25s, transform 0.25s var(--ease-spring), box-shadow 0.25s; cursor: default; }
.testi-card:hover { border-color: var(--border-glow); transform: translateY(-3px); box-shadow: var(--card-shadow); }
.testi-stars { color: #f59e0b; font-size: 11px; margin-bottom: 11px; letter-spacing: 1.5px; }
.testi-text { font-size: 12px; line-height: 1.72; color: var(--text-secondary); margin-bottom: 14px; font-style: italic; }
.testi-author { display: flex; align-items: center; gap: 8px; }
.testi-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
.testi-name { font-size: 11.5px; font-weight: 600; color: var(--text); }
.testi-role { font-size: 10.5px; color: var(--text-secondary); }

/* ── Community / Replace Download Section ── */
.community-section { position: relative; z-index: 1; padding: 80px 36px; }
.community-inner { max-width: var(--max-w); margin: 0 auto; }
.community-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: center; }
.community-content { display: flex; flex-direction: column; gap: 16px; }
.community-title { font-family: var(--font-serif); font-size: clamp(22px, 2.8vw, 34px); font-weight: 400; letter-spacing: -0.4px; line-height: 1.14; color: var(--text); }
.community-sub { font-size: 13px; line-height: 1.75; color: var(--text-secondary); max-width: 360px; }
.community-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
.metric-card { padding: 18px 16px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); transition: border-color 0.2s, transform 0.2s var(--ease-spring); }
.metric-card:hover { border-color: var(--border-glow); transform: translateY(-2px); }
.metric-val { font-size: 22px; font-weight: 700; letter-spacing: -0.8px; color: var(--text); margin-bottom: 2px; }
.metric-val .grad { background: var(--gradient-text); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.metric-label { font-size: 10.5px; color: var(--text-secondary); }
.community-visual { position: relative; display: flex; align-items: center; justify-content: center; min-height: 320px; }
.globe-wrap { position: relative; width: 260px; height: 260px; }
.globe-ring { position: absolute; border-radius: 50%; border: 1px solid var(--border-glow); animation: orbitSpin linear infinite; top: 50%; left: 50%; transform-origin: center; }
.globe-ring:nth-child(1) { width: 260px; height: 260px; margin: -130px 0 0 -130px; animation-duration: 22s; }
.globe-ring:nth-child(2) { width: 200px; height: 200px; margin: -100px 0 0 -100px; animation-duration: 16s; animation-direction: reverse; opacity: 0.7; }
.globe-ring:nth-child(3) { width: 140px; height: 140px; margin: -70px 0 0 -70px; animation-duration: 12s; opacity: 0.5; }
.globe-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 70px; height: 70px; border-radius: 50%; background: var(--cta-bg); display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 0 40px var(--cta-shadow); animation: logoBreath 3s ease-in-out infinite; }
.globe-dot { position: absolute; width: 7px; height: 7px; border-radius: 50%; top: -3.5px; left: calc(50% - 3.5px); }
.gdot-blue { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.gdot-purple { background: var(--accent3); box-shadow: 0 0 8px var(--accent3); }
.gdot-cyan { background: var(--accent2); box-shadow: 0 0 8px var(--accent2); }
.geo-chip { position: absolute; display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 30px; background: var(--glass); border: 1px solid var(--border-glow); backdrop-filter: blur(14px); font-size: 10px; font-weight: 500; color: var(--text); white-space: nowrap; animation: chipFloat 4s ease-in-out infinite; }
.geo-chip-1 { top: 10px; right: -10px; animation-delay: 0s; }
.geo-chip-2 { bottom: 30px; left: -10px; animation-delay: 1.4s; }
.geo-chip-3 { top: 50%; right: -20px; animation-delay: 0.7s; }

/* ── FAQ ── */
.faq-list { display: flex; flex-direction: column; gap: 0; max-width: 620px; margin: 0 auto; }
.faq-item { border-bottom: 1px solid var(--border); overflow: hidden; }
.faq-item:first-child { border-top: 1px solid var(--border); }
.faq-question { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 16px 4px; font-size: 13px; font-weight: 600; color: var(--text); background: none; border: none; cursor: pointer; font-family: var(--font-sans); text-align: left; gap: 14px; }
.faq-chevron { font-size: 10px; color: var(--text-secondary); transition: transform 0.3s var(--ease-out); flex-shrink: 0; }
.faq-chevron.open { transform: rotate(180deg); }
.faq-answer { font-size: 12px; line-height: 1.78; color: var(--text-secondary); padding: 0 4px; max-height: 0; overflow: hidden; transition: max-height 0.35s var(--ease-out), padding 0.35s; }
.faq-answer.open { max-height: 180px; padding-bottom: 16px; }

/* ── CTA Banner ── */
.cta-section { position: relative; z-index: 1; padding: 64px 36px; }
.cta-inner { max-width: var(--max-w); margin: 0 auto; }
.cta-card { border-radius: 26px; padding: 56px 48px; text-align: center; position: relative; overflow: hidden; background: var(--glass); border: 1px solid var(--border-glow); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); }
.cta-bg-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
.cta-orb1 { width: 280px; height: 280px; background: var(--orb1); top: -80px; left: -60px; }
.cta-orb2 { width: 280px; height: 280px; background: var(--orb2); bottom: -80px; right: -60px; }
.cta-title { font-family: var(--font-serif); font-size: clamp(26px, 3.2vw, 40px); font-weight: 400; letter-spacing: -0.5px; line-height: 1.12; color: var(--text); margin-bottom: 12px; position: relative; z-index: 1; }
.cta-sub { font-size: 13px; line-height: 1.75; color: var(--text-secondary); max-width: 380px; margin: 0 auto 28px; position: relative; z-index: 1; }
.cta-btns { display: flex; align-items: center; justify-content: center; gap: 10px; position: relative; z-index: 1; flex-wrap: wrap; }
.cta-note { font-size: 11px; color: var(--text-secondary); margin-top: 14px; position: relative; z-index: 1; }

/* ── Footer ── */
.footer { position: relative; z-index: 1; background: var(--footer-bg); border-top: 1px solid var(--border); padding: 32px 36px; transition: background var(--transition); }
.footer-inner { max-width: var(--max-w); margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.footer-logo { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--text); }
.footer-logo-icon { width: 22px; height: 22px; border-radius: 7px; background: var(--cta-bg); display: flex; align-items: center; justify-content: center; font-size: 10px; }
.footer-copy { font-size: 11px; color: var(--text-secondary); }

/* ── Scroll reveal ── */
.reveal { opacity: 0; transform: translateY(26px); transition: opacity 0.7s var(--ease-out), transform 0.7s var(--ease-out); }
.reveal.visible { opacity: 1; transform: translateY(0); }

/* ── Scrollbar ── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .testimonials-grid { grid-template-columns: repeat(2, 1fr); }
  .how-layout { grid-template-columns: 1fr; }
  .how-visual { display: none; }
  .community-grid { grid-template-columns: 1fr; }
  .community-visual { display: none; }
}
@media (max-width: 640px) {
  .hero { flex-direction: column; padding: 80px 20px 48px; min-height: unset; }
  .hero-visual { display: none; }
  .hero-content { max-width: 100%; }
  .hero-content { max-width: 100%; }
  .navbar { padding: 0 16px; }
  .section { padding: 56px 20px; }
  .features-grid { grid-template-columns: 1fr; }
  .testimonials-grid { grid-template-columns: 1fr; }
  .cta-card { padding: 40px 22px; }
  .footer-inner { flex-direction: column; text-align: center; }
}
`;

/* ─────────────────────────────────────────
   DATA
───────────────────────────────────────── */
const FEATURES = [
  { icon: "🔒", name: "End-to-End Encryption", desc: "Every message and call protected with military-grade AES-256. Zero knowledge — not even we can read your chats.", tag: "Privacy First" },
  { icon: "⚡", name: "Instant Delivery", desc: "Sub-50ms message delivery via our globally distributed edge network. Your messages arrive before you finish typing.", tag: "Ultra Fast" },
  { icon: "🤖", name: "AI Smart Replies", desc: "Context-aware suggestions powered by on-device AI. Smarter conversations, less typing, more connecting.", tag: "AI Powered" },
  { icon: "🎨", name: "Expressive Reactions", desc: "React with any emoji, create custom stickers, and send animated GIFs. Express yourself without limits.", tag: "Expressive" },
  { icon: "🌐", name: "Cross-Platform Sync", desc: "Seamless sync across iPhone, Android, Mac, Windows and web. Start anywhere, continue everywhere.", tag: "All Devices" },
];

const STEPS = [
  { num: "01", title: "Create your account", desc: "Sign up in seconds. No phone number required — just your email and a secure password." },
  { num: "02", title: "Find your contacts", desc: "Invite friends via link, QR code, or username. Your contact list syncs automatically." },
  { num: "03", title: "Start chatting", desc: "Send messages, voice notes, and reactions instantly. Groups, channels, and DMs in one place." },
  { num: "04", title: "Customize your experience", desc: "Choose themes, notification preferences, and AI settings. Make Aura truly yours." },
];

const SCREEN_CONTENT = [
  { header: "Sarah Chen", status: "● Online", msgs: [{ t: "in", txt: "Ready for the project meeting?" }, { t: "out", txt: "Yes! Sending the deck now 📎" }] },
  { header: "Team Alpha", status: "● 8 members", msgs: [{ t: "in", txt: "Great work everyone! 🎉" }, { t: "out", txt: "Thanks! Let's ship it." }] },
  { header: "AI Assistant", status: "● Always on", msgs: [{ t: "in", txt: "How can I help you today?" }, { t: "out", txt: "Summarize my last 5 chats" }] },
  { header: "Alex Rivera", status: "● Typing...", msgs: [{ t: "in", txt: "Did you see the update? 👀" }, { t: "out", txt: "Just saw it — looks amazing!" }] },
];

const TESTIMONIALS = [
  { stars: "★★★★★", text: "Switched from every major messaging app and never looked back. The speed and design are on another level.", name: "Jordan Kim", role: "Product Designer @ Figma", color: "#3b82f6" },
  { stars: "★★★★★", text: "The encryption gives me real peace of mind. As a journalist dealing with sensitive sources, Aura is the only app I trust.", name: "Priya Sharma", role: "Senior Journalist, The Atlantic", color: "#8b5cf6" },
  { stars: "★★★★★", text: "The AI replies feel genuinely smart, not spammy. It learns my tone and suggests responses I'd actually send.", name: "Zara Malik", role: "Startup Founder", color: "#ec4899" },
  { stars: "★★★★★", text: "Cross-device sync is flawless. iPhone at lunch, MacBook at work, web anywhere. Always in perfect sync.", name: "David Park", role: "Software Engineer @ Stripe", color: "#10b981" },
  { stars: "★★★★★", text: "I run a community of 50k+ members. Aura channels handle it effortlessly. The moderation tools are chef's kiss.", name: "Nina Torres", role: "Community Lead", color: "#f59e0b" },
  { stars: "★★★★★", text: "Our whole creative studio migrated in a week. The interface is just leagues above anything else out there.", name: "Marcus Chen", role: "Creative Director @ Studio M", color: "#06b6d4" },
];

const FAQS = [
  { q: "Is Aura Messenger really free?", a: "Yes — the Free plan is free forever with unlimited messages and 5GB storage. Pro and Team plans unlock advanced features like larger file transfers, AI tools, and priority support." },
  { q: "How does the end-to-end encryption work?", a: "Every conversation uses the Signal Protocol combined with AES-256 key exchange. Keys are generated on your device and never leave it. Aura servers only route encrypted data — we physically cannot read your messages." },
  { q: "Can I use Aura on multiple devices?", a: "Absolutely. Aura syncs seamlessly across iOS, Android, macOS, Windows, and web browsers. All messages, files, and settings stay in perfect sync in real time." },
  { q: "How do I migrate from WhatsApp or Telegram?", a: "Use our one-click import tool in Settings → Migration. It transfers contacts and chat history automatically. Most users complete migration in under 3 minutes." },
];

const MESSAGES_CHAT = [
  { type: "in", text: "Hey! Did you see the new features? 👀", delay: 0 },
  { type: "out", text: "Yes! The animations are insane 🔥", delay: 1200 },
  { type: "in", text: "End-to-end encrypted too!", delay: 2400 },
];

/* ─────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────── */
function PhoneMockup() {
  const [visible, setVisible] = useState([]);
  const [showTyping, setShowTyping] = useState(false);
  useEffect(() => {
    const launch = () => {
      setVisible([]); setShowTyping(false);
      setTimeout(() => {
        MESSAGES_CHAT.forEach((m, i) => setTimeout(() => setVisible(v => [...v, i]), m.delay + 600));
        setTimeout(() => setShowTyping(true), 800);
        setTimeout(() => setShowTyping(false), 1400);
      }, 100);
    };
    launch();
    const loop = setInterval(launch, 5800);
    return () => clearInterval(loop);
  }, []);
  return (
    <div className="phone-mockup">
      <div className="phone-notch" />
      <div className="phone-chat-area">
        {visible.includes(0) && <div className="msg msg-in">{MESSAGES_CHAT[0].text}</div>}
        {showTyping && <div className="typing-indicator"><div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" /></div>}
        {visible.includes(1) && <div className="msg msg-out">{MESSAGES_CHAT[1].text}</div>}
        {visible.includes(2) && <div className="msg msg-in">{MESSAGES_CHAT[2].text}</div>}
      </div>
    </div>
  );
}

function ParticlesCanvas({ theme }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const count = 28;
    const particles = Array.from({ length: count }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.4 + 0.4, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, o: Math.random() * 0.4 + 0.15 }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const color = theme === "dark" ? "94,168,224" : "37,99,235";
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color},${p.o})`; ctx.fill();
      });
      for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) { ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y); ctx.strokeStyle = `rgba(${color},${0.1 * (1 - dist / 80)})`; ctx.lineWidth = 0.6; ctx.stroke(); }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, [theme]);
  return <canvas ref={canvasRef} className="particles-canvas" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }), { threshold: 0.1 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function HowItWorks() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 3200;
  useEffect(() => {
    let start = null;
    const tick = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) { setActive(a => (a + 1) % STEPS.length); start = null; setProgress(0); }
      timerRef.current = requestAnimationFrame(tick);
    };
    timerRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(timerRef.current);
  }, [active]);
  const screen = SCREEN_CONTENT[active];
  return (
    <div className="how-layout">
      <div className="how-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`how-step${active === i ? " active" : ""}`} onClick={() => { setActive(i); setProgress(0); }}>
            <div className="step-num">{s.num}</div>
            <div className="step-content">
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
            {active === i && <div className="step-progress" style={{ width: `${progress}%` }} />}
          </div>
        ))}
      </div>
      <div className="how-visual">
        <div className="how-screen">
          <div className="how-screen-header">
            <div className="hsh-avatar">{screen.header[0]}</div>
            <div className="hsh-info">
              <div className="hsh-name">{screen.header}</div>
              <div className="hsh-status">{screen.status}</div>
            </div>
            <div className="hsh-dots"><div className="hsh-dot" /><div className="hsh-dot" /><div className="hsh-dot" /></div>
          </div>
          <div className="how-screen-body">
            {screen.msgs.map((m, i) => (
              <div key={i} className={`msg msg-${m.t}`} style={{ animationDelay: `${i * 300}ms` }}>{m.txt}</div>
            ))}
          </div>
          <div className="how-screen-footer">
            <div className="how-input-bar">Type a message…</div>
            <div className="how-send-btn">➤</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunitySection() {
  return (
    <section className="community-section section-alt">
      <div className="community-inner">
        <div className="community-grid">
          <div className="community-content reveal">
            <div className="section-label">✦ Global Community</div>
            <div className="community-title">A world of people,<br /><span style={{ background: "var(--gradient-text)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>all connected</span></div>
            <div className="community-sub">Aura connects millions of people across 190+ countries. Whether it's a one-on-one conversation or a community of thousands, we scale with you.</div>
            <div className="community-metrics">
              {[
                { val: "2M+", label: "Active users worldwide" },
                { val: "190+", label: "Countries supported" },
                { val: "99.9%", label: "Uptime guaranteed" },
                { val: "< 50ms", label: "Average latency" },
              ].map((m, i) => (
                <div key={i} className="metric-card">
                  <div className="metric-val"><span className="grad">{m.val}</span></div>
                  <div className="metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="community-visual reveal">
            <div className="globe-wrap">
              <div className="globe-ring"><div className="globe-dot gdot-blue" /></div>
              <div className="globe-ring"><div className="globe-dot gdot-purple" style={{ top: "-3.5px", left: "calc(50% - 3.5px)" }} /></div>
              <div className="globe-ring"><div className="globe-dot gdot-cyan" style={{ top: "-3.5px", left: "calc(50% - 3.5px)" }} /></div>
              <div className="globe-center">🌐</div>
              <div className="geo-chip geo-chip-1">🇺🇸 San Francisco</div>
              <div className="geo-chip geo-chip-2">🇯🇵 Tokyo</div>
              <div className="geo-chip geo-chip-3">🇬🇧 London</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <div className="faq-list">
      {FAQS.map((f, i) => (
        <div key={i} className="faq-item">
          <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
            <span>{f.q}</span>
            <span className={`faq-chevron${open === i ? " open" : ""}`}>▼</span>
          </button>
          <div className={`faq-answer${open === i ? " open" : ""}`}>{f.a}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN
───────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState("light");
  const toggle = () => setTheme(t => t === "dark" ? "light" : "dark");
  useReveal();

  const tickerItems = ["🔒 Military-Grade Encryption", "⚡ 50ms Message Delivery", "🌍 190+ Countries", "🤖 On-Device AI", "🎨 Custom Themes", "🔔 Smart Notifications", "👥 Group Chats & Channels"];

  return (
    <>
      <style>{css}</style>
      <div id="aura-root" data-theme={theme}>
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

        {/* ── Navbar ── */}
        <nav className="navbar">
          <div className="nav-logo">
            <div className="logo-icon">▼</div>
            Aura Messenger
          </div>
          <div className="nav-actions">
            <button className="btn-ghost" onClick={() => navigate('/onboarding?mode=login')}>Log in</button>
            <button className="btn-primary" onClick={() => navigate('/onboarding')}>Get Started</button>
            <button className="theme-toggle" onClick={toggle}>{theme === "dark" ? "☀️" : "🌙"}</button>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="hero">
          <div className="hero-visual">
            <ParticlesCanvas theme={theme} />
            <div className="orbit-ring orbit-ring-1" style={{ position: "absolute" }}><div className="orbit-dot" /></div>
            <div className="orbit-ring orbit-ring-2" style={{ position: "absolute" }}><div className="orbit-dot orbit-dot-2" /></div>
            <div className="chip chip-1"><span className="chip-icon">🔒</span>End-to-End Encrypted</div>
            <div className="chip chip-2"><span className="chip-icon">⚡</span>Instant Delivery</div>
            <div className="chip chip-3"><span className="chip-icon">🌐</span>Cross-Platform</div>
            <div className="chip chip-4"><span className="chip-icon">🤖</span>AI-Powered</div>
            <PhoneMockup />
          </div>
          <div className="hero-content">
            <div className="hero-badge"><span className="badge-dot" />Now available on all platforms</div>
            <h1 className="hero-title">Connect with<br /><span className="grad">clarity &amp; style</span></h1>
            <p className="hero-subtitle">Aura Messenger blends stunning design with blazing speed. Privacy-first, AI-enhanced conversations that feel as natural as being in the same room.</p>
            <div className="social-proof">
              <div className="avatars">
                <div className="avatar av1">A</div><div className="avatar av2">B</div>
                <div className="avatar av3">C</div><div className="avatar av4">D</div>
              </div>
              <div className="social-proof-text"><span className="stars">★★★★★</span>Loved by <strong>2M+</strong> users worldwide</div>
            </div>
            <div className="hero-ctas">
              <button className="btn-large" onClick={() => navigate('/onboarding')}><span>Get Started Free</span><span>→</span></button>
            </div>
            <div className="hero-stats">
              <div className="stat"><span className="stat-value">2M+</span><span className="stat-label">Active Users</span></div>
              <div className="stat-divider" />
              <div className="stat"><span className="stat-value">99.9%</span><span className="stat-label">Uptime</span></div>
              <div className="stat-divider" />
              <div className="stat"><span className="stat-value">&lt; 50ms</span><span className="stat-label">Latency</span></div>
            </div>
          </div>
        </section>

        {/* ── Ticker ── */}
        <div className="ticker-wrap">
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <div key={i} className="ticker-item">
                <span>{item}</span>
                {i < tickerItems.length * 2 - 1 && <span className="ticker-sep">·</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Features ── */}
        <section className="section section-alt" id="features">
          <div className="section-inner">
            <div className="reveal">
              <div className="section-label">✦ Features</div>
              <h2 className="section-title">Everything you need,<br /><span className="grad">nothing you don't</span></h2>
              <p className="section-sub">Built with obsessive attention to detail. Every feature designed to make conversations faster, safer, and more expressive.</p>
            </div>
            <div className="features-grid">
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-card reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                  <div className="feature-icon-wrap">{f.icon}</div>
                  <div className="feature-name">{f.name}</div>
                  <div className="feature-desc">{f.desc}</div>
                  <div className="feature-tag">{f.tag}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="section" id="how">
          <div className="section-inner">
            <div className="reveal">
              <div className="section-label">✦ How it Works</div>
              <h2 className="section-title">Up and running in<br /><span className="grad">under 2 minutes</span></h2>
              <p className="section-sub">No complicated setup. No learning curve. Just sign up and start connecting.</p>
            </div>
            <div className="reveal">
              <HowItWorks />
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="section section-alt" id="testimonials">
          <div className="section-inner">
            <div className="reveal" style={{ textAlign: "center" }}>
              <div className="section-label" style={{ margin: "0 auto 13px" }}>✦ Testimonials</div>
              <h2 className="section-title">Loved by millions,<br /><span className="grad">trusted by creators</span></h2>
              <p className="section-sub" style={{ margin: "0 auto 44px" }}>Don't take our word for it. Here's what real Aura users say.</p>
            </div>
            <div className="testimonials-grid">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="testi-card reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                  <div className="testi-stars">{t.stars}</div>
                  <div className="testi-text">"{t.text}"</div>
                  <div className="testi-author">
                    <div className="testi-avatar" style={{ background: t.color }}>{t.name[0]}</div>
                    <div><div className="testi-name">{t.name}</div><div className="testi-role">{t.role}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Community Section (replaces Download) ── */}
        <CommunitySection />

        {/* ── FAQ ── */}
        <section className="section" id="faq">
          <div className="section-inner">
            <div className="reveal" style={{ textAlign: "center" }}>
              <div className="section-label" style={{ margin: "0 auto 13px" }}>✦ FAQ</div>
              <h2 className="section-title">Common <span className="grad">questions</span></h2>
              <p className="section-sub" style={{ margin: "0 auto 40px" }}>Everything you need to know before you start. Can't find an answer? Chat with our team.</p>
            </div>
            <div className="reveal"><FAQ /></div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="cta-section">
          <div className="cta-inner">
            <div className="cta-card reveal">
              <div className="cta-bg-orb cta-orb1" />
              <div className="cta-bg-orb cta-orb2" />
              <div className="cta-title">Ready to experience<br /><span className="grad">the future of messaging?</span></div>
              <p className="cta-sub">Join 2 million people who've already made the switch. Free forever — no credit card required.</p>
              <div className="cta-btns">
                <button className="btn-large" onClick={() => navigate('/onboarding')}><span>Create Free Account</span><span>→</span></button>
              </div>
              <p className="cta-note">✓ No credit card &nbsp;&nbsp;✓ Free forever plan &nbsp;&nbsp;✓ Setup in 60 seconds</p>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-logo">
              <div className="footer-logo-icon">✦</div>
              Aura Messenger
            </div>
            <div className="footer-copy">© 2026 Aura Messenger. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}