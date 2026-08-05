// ============================================================
//  Student Market Palace — Chatbot Widget  v4.0
//  New: Typing sounds, Developer modal, Better branding,
//       Realistic typing animation, Character-by-character reveal
// ============================================================
(function () {
  'use strict';

  // ── Audio Engine ────────────────────────────────────────────
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let soundEnabled = true;

  function getAudioCtx() {
    if (!audioCtx && AudioCtx) {
      audioCtx = new AudioCtx();
    }
    return audioCtx;
  }

  function playTypingClick() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {}
  }

  function playMessageSent() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  }

  function playMessageReceived() {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      [0, 0.08].forEach(function(delay, i) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 700 : 900, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0.07, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.1);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.1);
      });
    } catch (e) {}
  }

  // ── Inject CSS ──────────────────────────────────────────────
  const css = `
    /* ── FAB ── */
    #smp-fab {
      position: fixed !important;
      bottom: 32px !important;
      right: 32px !important;
      z-index: 2147483647 !important;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex !important;
      align-items: center;
      justify-content: center;
      font-size: 30px;
      background: linear-gradient(135deg, #7c3aed, #a855f7, #06b6d4);
      background-size: 200% 200%;
      box-shadow: 0 8px 32px rgba(124,58,237,0.55), 0 0 0 0 rgba(168,85,247,0.4);
      animation: smp-dance 1.8s ease-in-out infinite, smp-gradshift 3s ease infinite, smp-pulse-ring 2s ease-out infinite;
      transform-origin: center;
      transition: transform 0.2s;
    }
    #smp-fab:hover {
      transform: scale(1.15) rotate(-5deg) !important;
      box-shadow: 0 12px 48px rgba(124,58,237,0.75), 0 0 60px rgba(168,85,247,0.4);
    }
    @keyframes smp-dance {
      0%   { transform: translateY(0px) rotate(0deg); }
      15%  { transform: translateY(-12px) rotate(-8deg); }
      30%  { transform: translateY(-6px) rotate(6deg); }
      45%  { transform: translateY(-14px) rotate(-5deg); }
      60%  { transform: translateY(-4px) rotate(4deg); }
      75%  { transform: translateY(-10px) rotate(-3deg); }
      90%  { transform: translateY(-2px) rotate(2deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    @keyframes smp-gradshift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes smp-pulse-ring {
      0%   { box-shadow: 0 8px 32px rgba(124,58,237,0.55), 0 0 0 0 rgba(168,85,247,0.5); }
      70%  { box-shadow: 0 8px 32px rgba(124,58,237,0.55), 0 0 0 18px rgba(168,85,247,0); }
      100% { box-shadow: 0 8px 32px rgba(124,58,237,0.55), 0 0 0 0 rgba(168,85,247,0); }
    }
    #smp-fab .smp-fab-emoji {
      display: block;
      animation: smp-emoji-bounce 1.8s ease-in-out infinite;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
    }
    @keyframes smp-emoji-bounce {
      0%,100% { transform: scale(1) rotate(0deg); }
      25%     { transform: scale(1.2) rotate(-10deg); }
      50%     { transform: scale(0.95) rotate(8deg); }
      75%     { transform: scale(1.1) rotate(-5deg); }
    }
    #smp-fab .smp-badge {
      position: absolute;
      top: -2px; right: -2px;
      width: 20px; height: 20px;
      background: #f43f5e;
      border-radius: 50%;
      border: 2px solid white;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: white; font-weight: bold;
      animation: smp-badge-pop 1s ease infinite alternate;
    }
    @keyframes smp-badge-pop {
      from { transform: scale(1); }
      to   { transform: scale(1.2); }
    }

    /* ── Chat Window ── */
    #smp-win {
      position: fixed !important;
      bottom: 115px !important;
      right: 32px !important;
      z-index: 2147483646 !important;
      width: 370px;
      max-height: calc(100vh - 140px);
      display: none;
      flex-direction: column;
      border-radius: 24px;
      overflow: hidden;
      background: rgba(10, 7, 25, 0.92);
      backdrop-filter: blur(32px) saturate(180%);
      -webkit-backdrop-filter: blur(32px) saturate(180%);
      border: 1px solid rgba(168, 85, 247, 0.28);
      box-shadow:
        0 32px 80px rgba(0,0,0,0.65),
        0 0 0 1px rgba(255,255,255,0.05) inset,
        0 0 80px rgba(124,58,237,0.18) inset;
    }
    #smp-win.smp-open {
      display: flex !important;
      animation: smp-window-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes smp-window-in {
      0%   { opacity: 0; transform: scale(0.7) translateY(40px); transform-origin: bottom right; }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes smp-window-out {
      0%   { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: scale(0.7) translateY(40px); transform-origin: bottom right; }
    }

    /* ── Header ── */
    #smp-header {
      padding: 14px 16px;
      background: linear-gradient(135deg, rgba(124,58,237,0.65), rgba(6,182,212,0.25));
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      position: relative;
    }
    .smp-h-logo {
      width: 46px; height: 46px;
      border-radius: 14px;
      background: linear-gradient(135deg, #7c3aed, #06b6d4);
      display: flex; align-items: center; justify-content: center;
      font-size: 24px;
      box-shadow: 0 0 24px rgba(139,92,246,0.6), 0 0 0 2px rgba(255,255,255,0.12);
      flex-shrink: 0;
      animation: smp-logo-glow 2.5s ease-in-out infinite;
      position: relative;
      overflow: hidden;
    }
    .smp-h-logo::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.18), transparent);
      border-radius: 14px;
    }
    @keyframes smp-logo-glow {
      0%,100% { box-shadow: 0 0 24px rgba(139,92,246,0.6), 0 0 0 2px rgba(255,255,255,0.12); }
      50%     { box-shadow: 0 0 40px rgba(6,182,212,0.7), 0 0 0 2px rgba(255,255,255,0.2); }
    }
    .smp-h-info { flex: 1; overflow: hidden; }
    .smp-h-name {
      color: white;
      font-weight: 800;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: -0.2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .smp-h-sub {
      color: rgba(255,255,255,0.55);
      font-size: 11px;
      font-family: sans-serif;
      margin-top: 1px;
      white-space: nowrap;
    }
    .smp-h-status {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 3px;
    }
    .smp-dot {
      width: 7px; height: 7px;
      background: #22c55e;
      border-radius: 50%;
      animation: smp-dot-pulse 1.5s ease-in-out infinite;
    }
    @keyframes smp-dot-pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%     { opacity: 0.5; transform: scale(0.7); }
    }
    .smp-h-status span { color: rgba(255,255,255,0.6); font-size: 11px; font-family: sans-serif; }
    .smp-h-actions { display: flex; gap: 6px; align-items: center; }

    /* Sound toggle */
    #smp-sound-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.7);
      width: 30px; height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    #smp-sound-btn:hover { background: rgba(168,85,247,0.25); color: white; }
    #smp-sound-btn.muted { opacity: 0.5; }

    /* Developer button — pinned in header */
    #smp-dev-btn {
      background: linear-gradient(135deg, rgba(124,58,237,0.4), rgba(6,182,212,0.3));
      border: 1px solid rgba(168,85,247,0.5);
      color: rgba(255,255,255,0.9);
      padding: 4px 10px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 11px;
      font-family: sans-serif;
      font-weight: 600;
      display: flex; align-items: center; gap: 4px;
      transition: all 0.2s;
      flex-shrink: 0;
      white-space: nowrap;
      animation: smp-dev-glow 2s ease-in-out infinite;
      letter-spacing: 0.2px;
    }
    #smp-dev-btn:hover {
      background: linear-gradient(135deg, rgba(124,58,237,0.7), rgba(6,182,212,0.5));
      border-color: #a855f7;
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(124,58,237,0.5);
    }
    @keyframes smp-dev-glow {
      0%,100% { box-shadow: 0 0 0px rgba(168,85,247,0); }
      50%     { box-shadow: 0 0 10px rgba(168,85,247,0.5), 0 0 20px rgba(6,182,212,0.2); }
    }
    .smp-dev-dot {
      width: 6px; height: 6px;
      background: #a855f7;
      border-radius: 50%;
      animation: smp-dev-dot-bounce 1.4s ease-in-out infinite;
    }
    @keyframes smp-dev-dot-bounce {
      0%,100% { transform: translateY(0); background: #a855f7; }
      50%     { transform: translateY(-3px); background: #06b6d4; }
    }

    #smp-close-btn {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(255,255,255,0.7);
      width: 30px; height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    #smp-close-btn:hover {
      background: rgba(244,63,94,0.3);
      border-color: #f43f5e;
      color: white;
      transform: rotate(90deg);
    }

    /* ── Messages ── */
    #smp-msgs {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scroll-behavior: smooth;
    }
    #smp-msgs::-webkit-scrollbar { width: 4px; }
    #smp-msgs::-webkit-scrollbar-track { background: transparent; }
    #smp-msgs::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 4px; }

    .smp-m {
      max-width: 85%;
      padding: 11px 15px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      word-wrap: break-word;
      animation: smp-msg-in 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes smp-msg-in {
      0%   { opacity: 0; transform: translateY(16px) scale(0.9); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }
    .smp-m.bot {
      align-self: flex-start;
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.93);
      border: 1px solid rgba(255,255,255,0.1);
      border-bottom-left-radius: 4px;
    }
    .smp-m.user {
      align-self: flex-end;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      border-bottom-right-radius: 4px;
      box-shadow: 0 4px 20px rgba(124,58,237,0.4);
    }

    /* Typing indicator */
    .smp-typing {
      align-self: flex-start;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 13px 16px;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      display: flex;
      gap: 5px; align-items: center;
      animation: smp-msg-in 0.3s ease;
    }
    .smp-typing span {
      width: 7px; height: 7px;
      background: #a855f7;
      border-radius: 50%;
      display: block;
      animation: smp-tdot 1.2s ease-in-out infinite;
    }
    .smp-typing span:nth-child(2) { animation-delay: 0.2s; }
    .smp-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes smp-tdot {
      0%,60%,100% { transform: translateY(0); opacity: 0.4; }
      30%         { transform: translateY(-7px); opacity: 1; }
    }

    /* Typing text cursor */
    .smp-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: rgba(168,85,247,0.9);
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: smp-blink 0.7s step-end infinite;
    }
    @keyframes smp-blink {
      0%,100% { opacity: 1; }
      50%     { opacity: 0; }
    }

    /* ── Suggestions ── */
    #smp-sugg {
      padding: 8px 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex-shrink: 0;
      border-top: 1px solid rgba(255,255,255,0.05);
    }
    .smp-sq {
      padding: 5px 11px;
      background: rgba(124,58,237,0.18);
      border: 1px solid rgba(168,85,247,0.3);
      border-radius: 20px;
      color: rgba(255,255,255,0.85);
      font-size: 11.5px;
      cursor: pointer;
      font-family: sans-serif;
      transition: all 0.2s;
    }
    .smp-sq:hover {
      background: rgba(168,85,247,0.38);
      border-color: #a855f7;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(124,58,237,0.3);
    }

    /* ── Input Row ── */
    #smp-input-row {
      padding: 12px 14px;
      display: flex;
      gap: 8px; align-items: center;
      border-top: 1px solid rgba(255,255,255,0.07);
      background: rgba(0,0,0,0.25);
      flex-shrink: 0;
    }
    #smp-input {
      flex: 1;
      padding: 10px 14px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px;
      color: white;
      font-size: 13.5px;
      font-family: sans-serif;
      outline: none;
      transition: all 0.2s;
      min-width: 0;
    }
    #smp-input:focus {
      background: rgba(255,255,255,0.1);
      border-color: rgba(168,85,247,0.6);
      box-shadow: 0 0 0 3px rgba(124,58,237,0.18);
    }
    #smp-input::placeholder { color: rgba(255,255,255,0.28); }
    #smp-send {
      width: 40px; height: 40px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      font-size: 16px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(124,58,237,0.4);
    }
    #smp-send:hover { transform: scale(1.1) rotate(-10deg); box-shadow: 0 6px 24px rgba(124,58,237,0.6); }
    #smp-send:active { transform: scale(0.95); }
    #smp-send:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    /* ── Developer Modal ── */
    #smp-dev-overlay {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483648 !important;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    #smp-dev-overlay.open {
      display: flex !important;
      animation: smp-overlay-in 0.3s ease;
    }
    @keyframes smp-overlay-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    #smp-dev-card {
      width: 100%;
      max-width: 400px;
      background: rgba(10, 7, 28, 0.96);
      border: 1px solid rgba(168,85,247,0.35);
      border-radius: 24px;
      overflow: hidden;
      box-shadow:
        0 40px 100px rgba(0,0,0,0.7),
        0 0 80px rgba(124,58,237,0.2) inset,
        0 0 0 1px rgba(255,255,255,0.06) inset;
      animation: smp-card-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      max-height: 90vh;
      overflow-y: auto;
    }
    @keyframes smp-card-in {
      from { opacity: 0; transform: scale(0.85) translateY(30px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    #smp-dev-card::-webkit-scrollbar { width: 4px; }
    #smp-dev-card::-webkit-scrollbar-thumb { background: rgba(168,85,247,0.4); border-radius: 4px; }

    .smp-dev-hero {
      padding: 28px 24px 20px;
      background: linear-gradient(135deg, rgba(124,58,237,0.5), rgba(6,182,212,0.25));
      border-bottom: 1px solid rgba(255,255,255,0.07);
      text-align: center;
      position: relative;
    }
    .smp-dev-close {
      position: absolute;
      top: 14px; right: 14px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7);
      width: 30px; height: 30px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .smp-dev-close:hover { background: rgba(244,63,94,0.35); color: white; transform: rotate(90deg); }

    .smp-dev-avatar {
      width: 80px; height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #a855f7, #06b6d4);
      background-size: 200% 200%;
      animation: smp-gradshift 3s ease infinite;
      display: flex; align-items: center; justify-content: center;
      font-size: 36px;
      margin: 0 auto 14px;
      box-shadow: 0 0 40px rgba(124,58,237,0.6), 0 0 0 3px rgba(168,85,247,0.3);
    }
    .smp-dev-name {
      color: white;
      font-size: 22px;
      font-weight: 800;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      letter-spacing: -0.5px;
    }
    .smp-dev-title {
      color: rgba(168,85,247,0.9);
      font-size: 13px;
      font-family: sans-serif;
      margin-top: 4px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .smp-dev-tagline {
      color: rgba(255,255,255,0.55);
      font-size: 12px;
      font-family: sans-serif;
      margin-top: 8px;
      line-height: 1.5;
    }

    .smp-dev-body { padding: 20px 22px 24px; }
    .smp-dev-section { margin-bottom: 20px; }
    .smp-dev-section-title {
      color: rgba(255,255,255,0.4);
      font-size: 10px;
      font-family: sans-serif;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .smp-tech-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .smp-tech-tag {
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11.5px;
      font-family: sans-serif;
      font-weight: 600;
      border: 1px solid;
      transition: transform 0.2s;
      cursor: default;
    }
    .smp-tech-tag:hover { transform: translateY(-2px); }
    .smp-tt-purple { background: rgba(124,58,237,0.2); border-color: rgba(168,85,247,0.45); color: #c4b5fd; }
    .smp-tt-cyan   { background: rgba(6,182,212,0.15); border-color: rgba(6,182,212,0.4); color: #67e8f9; }
    .smp-tt-green  { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.4); color: #86efac; }
    .smp-tt-orange { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.4); color: #fdba74; }

    .smp-contrib-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; }
    .smp-contrib-item {
      display: flex; align-items: flex-start; gap: 9px;
      color: rgba(255,255,255,0.75);
      font-size: 12.5px;
      font-family: sans-serif;
      line-height: 1.45;
    }
    .smp-contrib-icon {
      width: 22px; height: 22px;
      border-radius: 6px;
      background: rgba(124,58,237,0.25);
      border: 1px solid rgba(168,85,247,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .smp-dev-footer {
      padding: 14px 22px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      justify-content: center;
      gap: 10px;
    }
    .smp-dev-link {
      padding: 8px 18px;
      border-radius: 12px;
      font-size: 12px;
      font-family: sans-serif;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      display: flex; align-items: center; gap: 6px;
    }
    .smp-dev-link.primary {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      border: none;
      box-shadow: 0 4px 16px rgba(124,58,237,0.4);
    }
    .smp-dev-link.primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124,58,237,0.55); }
    .smp-dev-link.secondary {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.8);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .smp-dev-link.secondary:hover { background: rgba(255,255,255,0.12); transform: translateY(-2px); }

    /* Responsive */
    @media (max-width: 440px) {
      #smp-win { width: calc(100vw - 24px) !important; right: 12px !important; }
      #smp-fab { bottom: 20px !important; right: 16px !important; }
      #smp-dev-card { border-radius: 20px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Build HTML ──────────────────────────────────────────────
  const fab = document.createElement('button');
  fab.id = 'smp-fab';
  fab.setAttribute('aria-label', 'Open SMP Chat');
  fab.innerHTML = `
    <span class="smp-fab-emoji">🤖</span>
    <div class="smp-badge">1</div>
  `;

  const win = document.createElement('div');
  win.id = 'smp-win';
  win.innerHTML = `
    <div id="smp-header">
      <div class="smp-h-logo">🏪</div>
      <div class="smp-h-info">
        <div class="smp-h-name">Student Market Palace</div>
        <div class="smp-h-sub">AI Assistant</div>
        <div class="smp-h-status">
          <div class="smp-dot"></div>
          <span>Online · Ready to help</span>
        </div>
      </div>
      <div class="smp-h-actions">
        <button id="smp-sound-btn" aria-label="Toggle sound" title="Toggle sound">🔊</button>
        <button id="smp-dev-btn" aria-label="Developer info">
          <div class="smp-dev-dot"></div>
          Dev
        </button>
        <button id="smp-close-btn" aria-label="Close chat">✕</button>
      </div>
    </div>
    <div id="smp-msgs">
      <div class="smp-m bot">
        👋 <strong>Welcome to Student Market Palace AI Assistant!</strong><br><br>
        I can help you with:<br>
        🛒 Buying and selling products<br>
        🗺️ Website navigation<br>
        ⚙️ Marketplace features<br>
        👤 Account assistance<br>
        ❓ General SMP-related questions<br><br>
        <em>Developed by Arslan Saeed 🚀</em>
      </div>
    </div>
    <div id="smp-sugg">
      <button class="smp-sq">🛒 How to sell?</button>
      <button class="smp-sq">📬 Contact info</button>
      <button class="smp-sq">💰 Kitna free hai?</button>
      <button class="smp-sq">🛡️ Safety tips</button>
    </div>
    <div id="smp-input-row">
      <input id="smp-input" type="text" placeholder="Kuch poochho…" maxlength="400" autocomplete="off" />
      <button id="smp-send" aria-label="Send">➤</button>
    </div>
  `;

  // Developer Modal
  const devOverlay = document.createElement('div');
  devOverlay.id = 'smp-dev-overlay';
  devOverlay.innerHTML = `
    <div id="smp-dev-card">
      <div class="smp-dev-hero">
        <button class="smp-dev-close" id="smp-dev-close-btn">✕</button>
        <div class="smp-dev-avatar">👨‍💻</div>
        <div class="smp-dev-name">Arslan Saeed</div>
        <div class="smp-dev-title">Creator & Full-Stack Developer</div>
        <div class="smp-dev-tagline">
          Built Student Market Palace with dedication to help<br>
          students buy, sell, and connect through a modern<br>
          campus marketplace platform.
        </div>
      </div>
      <div class="smp-dev-body">
        <div class="smp-dev-section">
          <div class="smp-dev-section-title">Technologies Used</div>
          <div class="smp-tech-grid">
            <span class="smp-tech-tag smp-tt-orange">HTML5</span>
            <span class="smp-tech-tag smp-tt-orange">CSS3</span>
            <span class="smp-tech-tag smp-tt-orange">JavaScript ES6+</span>
            <span class="smp-tech-tag smp-tt-cyan">FastAPI</span>
            <span class="smp-tech-tag smp-tt-cyan">Python</span>
            <span class="smp-tech-tag smp-tt-purple">PostgreSQL</span>
            <span class="smp-tech-tag smp-tt-purple">Supabase</span>
            <span class="smp-tech-tag smp-tt-green">REST APIs</span>
            <span class="smp-tech-tag smp-tt-green">Vercel</span>
            <span class="smp-tech-tag smp-tt-green">Git & GitHub</span>
          </div>
        </div>
        <div class="smp-dev-section">
          <div class="smp-dev-section-title">Key Contributions</div>
          <ul class="smp-contrib-list">
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">🏗️</div>
              Designed &amp; developed the complete platform architecture
            </li>
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">🔐</div>
              Implemented user authentication and security features
            </li>
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">📱</div>
              Built responsive mobile and desktop interfaces
            </li>
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">⚡</div>
              Developed backend APIs and database integration
            </li>
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">🚀</div>
              Managed deployment and hosting on Railway &amp; Vercel
            </li>
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">🔍</div>
              Created marketplace listing and search functionality
            </li>
            <li class="smp-contrib-item">
              <div class="smp-contrib-icon">🤖</div>
              Integrated AI-powered chatbot support system
            </li>
          </ul>
        </div>
      </div>
      <div class="smp-dev-footer">
        <a class="smp-dev-link secondary" href="mailto:arslanbrall@gmail.com">
          📧 Email
        </a>
        <a class="smp-dev-link primary" href="https://github.com" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(win);
  document.body.appendChild(devOverlay);

  // ── Knowledge Base ──────────────────────────────────────────
  const KB = [
    {
      keywords: ['sell','selling','bechna','becho','list','listing','post ad','add product','upload','apload'],
      answer: '🛒 <strong>Selling is super easy!</strong><br><br>1️⃣ Click "Post Ad" on homepage<br>2️⃣ Choose a category<br>3️⃣ Add title, price, photos & description<br>4️⃣ Enter your WhatsApp/email<br>5️⃣ Submit — goes live instantly!<br><br>✅ <strong>Completely FREE for all students!</strong>'
    },
    {
      keywords: ['buy','buying','kharidna','purchase','order','khareedna','khareed'],
      answer: '🔍 <strong>Buying on SMP:</strong><br><br>1️⃣ Browse or search listings<br>2️⃣ Click product to see details<br>3️⃣ Hit "Contact Seller" (WhatsApp/Email)<br>4️⃣ Agree on price, meet safely on campus<br><br>💡 No online payment — direct student deals!'
    },
    {
      keywords: ['contact','email','whatsapp','reach','support','help','helpline','admin'],
      answer: '📬 <strong>SMP Support:</strong><br><br>📧 arslanbrall@gmail.com<br>💬 WhatsApp: +92-300-8971489<br>🕐 Mon–Sat, 9am–6pm<br><br>Or use "Contact Seller" on any listing!'
    },
    {
      keywords: ['free','cost','price','fee','charge','kitna','paid','muft','paisa','paise','rupay','rupees'],
      answer: '✅ <strong>100% FREE!</strong><br><br>• No listing fee<br>• No commission<br>• No hidden charges<br>• No subscription<br><br>Just register with your student email and go!'
    },
    {
      keywords: ['safety','safe','scam','fraud','tips','secure','dhoka','trust','fake'],
      answer: '🛡️ <strong>Safety Tips:</strong><br><br>• Meet in a public / on-campus place<br>• Never pay in advance<br>• Verify seller on WhatsApp first<br>• Don\'t share CNIC or bank details<br>• Prefer cash on delivery<br>• Report fakes to admin instantly<br><br>🚨 Suspicious? Email us!'
    },
    {
      keywords: ['account','register','signup','sign up','login','log in','profile'],
      answer: '👤 <strong>Create Account:</strong><br><br>1️⃣ Click "Register" in navigation<br>2️⃣ Enter name & student email<br>3️⃣ Set strong password<br>4️⃣ Verify email (check spam too!)<br>5️⃣ Done — start posting!<br><br>💡 Already registered? Just click Login!'
    },
    {
      keywords: ['delete','remove','edit','update','change','modify','hatana','badalna'],
      answer: '✏️ <strong>Edit / Delete listing:</strong><br><br>1️⃣ Log in to your account<br>2️⃣ Profile icon → "My Listings"<br>3️⃣ Find your item<br>4️⃣ ✏️ Edit OR 🗑️ Delete<br><br>⏰ Listings auto-expire after 30 days.'
    },
    {
      keywords: ['category','categories','books','electronics','clothes','notes','uniform','laptop','mobile','phone'],
      answer: '📦 <strong>Available Categories:</strong><br><br>📚 Books & Notes<br>💻 Electronics & Gadgets<br>👕 Clothes & Uniforms<br>🛋️ Dorm & Room Items<br>🎮 Games & Hobbies<br>🍱 Food & Snacks<br>🧪 Lab Equipment<br>📐 Stationery & Supplies<br><br>More coming soon!'
    },
    {
      keywords: ['password','forgot','reset','bhool','change password'],
      answer: '🔑 <strong>Forgot Password?</strong><br><br>1️⃣ Click Login → "Forgot Password?"<br>2️⃣ Enter registered email<br>3️⃣ Check inbox for reset link<br>4️⃣ Set new password<br><br>📧 No email? Check spam or contact us!'
    },
    {
      keywords: ['search','find','dhundna','dhundo','item','product','kahan'],
      answer: '🔎 <strong>Search on SMP:</strong><br><br>• Use the Search Bar at top of homepage<br>• Filter by category, price, location<br>• Sort by Newest or Lowest Price<br><br>💡 Use simple keywords for best results!'
    },
    {
      keywords: ['photo','image','picture','tasveer','upload photo','add photo'],
      answer: '📷 <strong>Adding Photos:</strong><br><br>• Up to 5 photos per listing<br>• Formats: JPG, PNG, WEBP<br>• Max 5MB per photo<br><br>💡 Natural daylight = best quality photos!'
    },
    {
      keywords: ['smp','student market palace','kya hai','what is','about','platform'],
      answer: '🎓 <strong>About SMP:</strong><br><br>Student Market Palace is a FREE marketplace built for university students!<br><br>✅ Buy & sell books, electronics, clothes & more<br>✅ Connect directly with fellow students<br>✅ Safe, simple, 100% free<br>✅ No middleman!<br><br>🚀 Built by students, for students!'
    },
    {
      keywords: ['developer','dev','arslan','creator','who made','who built','about dev'],
      answer: '👨‍💻 <strong>About the Developer:</strong><br><br>SMP was built by <strong>Arslan Saeed</strong>, a Cyber Security student at UMT Lahore.<br><br>🔧 Stack: FastAPI, Python, PostgreSQL, Supabase, HTML/CSS/JS, Vercel<br><br>Click the <strong>Dev</strong> button in the header for full profile! 🚀'
    },
  ];

  const FALLBACK = '🤔 <strong>Samajh nahi aaya!</strong><br><br>Yeh poochh saktay ho:<br>• 🛒 Selling / Buying<br>• 👤 Account banana<br>• 📬 Contact info<br>• 🛡️ Safety tips<br>• 📦 Categories<br>• 💰 Fees / Cost<br><br>📧 arslanbrall@gmail.com';

  function getReply(txt) {
    const lower = txt.toLowerCase().trim();
    if (!lower) return '😊 Kuch to likho! Main yahan hun!';
    for (const e of KB) {
      if (e.keywords.some(function(kw) { return lower.includes(kw); })) return e.answer;
    }
    return FALLBACK;
  }

  // ── Toggle Logic ────────────────────────────────────────────
  let isOpen = false;

  function openChat() {
    isOpen = true;
    win.style.display = 'flex';
    win.classList.add('smp-open');
    const badge = fab.querySelector('.smp-badge');
    if (badge) badge.style.display = 'none';
    setTimeout(function() {
      const inp = document.getElementById('smp-input');
      if (inp) inp.focus();
    }, 420);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('smp-open');
    win.style.animation = 'smp-window-out 0.3s ease forwards';
    setTimeout(function() {
      win.style.display = 'none';
      win.style.animation = '';
    }, 300);
  }

  function openDevModal() {
    devOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDevModal() {
    devOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Events ──────────────────────────────────────────────────
  fab.addEventListener('click', function(e) {
    e.stopPropagation();
    isOpen ? closeChat() : openChat();
  });

  document.addEventListener('click', function(e) {
    if (isOpen && !win.contains(e.target) && e.target !== fab) {
      closeChat();
    }
  });

  devOverlay.addEventListener('click', function(e) {
    if (e.target === devOverlay) closeDevModal();
  });

  // ── Wire Events ──────────────────────────────────────────────
  function wireEvents() {
    const closeBtn  = document.getElementById('smp-close-btn');
    const sendBtn   = document.getElementById('smp-send');
    const input     = document.getElementById('smp-input');
    const suggBox   = document.getElementById('smp-sugg');
    const soundBtn  = document.getElementById('smp-sound-btn');
    const devBtn    = document.getElementById('smp-dev-btn');
    const devClose  = document.getElementById('smp-dev-close-btn');

    if (!closeBtn || !sendBtn || !input) { setTimeout(wireEvents, 50); return; }

    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); closeChat(); });
    sendBtn.addEventListener('click', function(e) { e.stopPropagation(); doSend(); });
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    win.addEventListener('click', function(e) { e.stopPropagation(); });

    // Sound toggle
    if (soundBtn) {
      soundBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        soundEnabled = !soundEnabled;
        soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
        soundBtn.classList.toggle('muted', !soundEnabled);
        // Unlock AudioContext on first user gesture
        if (soundEnabled && AudioCtx) {
          try { getAudioCtx(); } catch(e) {}
        }
      });
    }

    // Developer modal
    if (devBtn)   devBtn.addEventListener('click', function(e)  { e.stopPropagation(); openDevModal(); });
    if (devClose) devClose.addEventListener('click', function(e) { e.stopPropagation(); closeDevModal(); });

    // Suggestion chips
    if (suggBox) {
      suggBox.addEventListener('click', function(e) {
        const btn = e.target.closest('.smp-sq');
        if (!btn) return;
        input.value = btn.textContent.replace(/^[^\w\u0600-\u06FF]+/, '').trim();
        suggBox.style.display = 'none';
        doSend();
      });
    }

    // Typing sound on keydown in input
    input.addEventListener('keydown', function(e) {
      if (e.key.length === 1 || e.key === 'Backspace') {
        playTypingClick();
      }
    });
  }

  wireEvents();

  // ── Send Message ────────────────────────────────────────────
  function doSend() {
    const input   = document.getElementById('smp-input');
    const sendBtn = document.getElementById('smp-send');
    const suggBox = document.getElementById('smp-sugg');
    if (!input || !sendBtn) return;

    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;

    if (suggBox) suggBox.style.display = 'none';
    input.value = '';
    sendBtn.disabled = true;

    playMessageSent();
    addMsg(text, 'user');

    // Typing indicator
    const msgsEl = document.getElementById('smp-msgs');
    const typEl  = document.createElement('div');
    typEl.className = 'smp-typing';
    typEl.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(typEl);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    const delay = 600 + Math.random() * 500;
    setTimeout(function() {
      if (typEl.parentNode) typEl.remove();
      const reply = getReply(text);
      playMessageReceived();
      addMsgTyped(reply, function() {
        sendBtn.disabled = false;
        if (input) input.focus();
      });
    }, delay);
  }

  // Plain instant add (for user messages)
  function addMsg(html, cls) {
    const msgsEl = document.getElementById('smp-msgs');
    if (!msgsEl) return;
    const el = document.createElement('div');
    el.className = 'smp-m ' + cls;
    el.innerHTML = html;
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // Typewriter effect for bot messages
  function addMsgTyped(html, onDone) {
    const msgsEl = document.getElementById('smp-msgs');
    if (!msgsEl) { if (onDone) onDone(); return; }

    const el = document.createElement('div');
    el.className = 'smp-m bot';
    msgsEl.appendChild(el);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    // Parse html into a temp div to get plain text with structure
    // We'll type out text node by node, preserving HTML tags
    const cursor = document.createElement('span');
    cursor.className = 'smp-cursor';

    // Strategy: reveal characters from innerHTML progressively
    const fullHtml = html;
    let charIndex = 0;
    // Strip tags to count visible chars
    const textOnly = fullHtml.replace(/<[^>]*>/g, '');
    const totalChars = textOnly.length;
    let visibleChars = 0;

    function revealNext() {
      if (visibleChars >= totalChars) {
        el.innerHTML = fullHtml;
        msgsEl.scrollTop = msgsEl.scrollHeight;
        if (onDone) onDone();
        return;
      }
      // Reveal 2-4 chars at a time for speed
      const step = 2 + Math.floor(Math.random() * 3);
      visibleChars = Math.min(visibleChars + step, totalChars);

      // Reconstruct HTML up to visibleChars visible characters
      el.innerHTML = revealHtmlChars(fullHtml, visibleChars) + '<span class="smp-cursor"></span>';
      msgsEl.scrollTop = msgsEl.scrollHeight;

      // Occasional typing sound
      if (Math.random() < 0.35) playTypingClick();

      const speed = 18 + Math.random() * 18;
      setTimeout(revealNext, speed);
    }

    revealNext();
  }

  // Reveal N visible characters from an HTML string, preserving tags
  function revealHtmlChars(html, count) {
    let result = '';
    let visible = 0;
    let i = 0;
    while (i < html.length && visible < count) {
      if (html[i] === '<') {
        // consume entire tag
        const end = html.indexOf('>', i);
        if (end === -1) { result += html[i++]; } else {
          result += html.slice(i, end + 1);
          i = end + 1;
        }
      } else {
        result += html[i++];
        visible++;
      }
    }
    return result;
  }

})();
