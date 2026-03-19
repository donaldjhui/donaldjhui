/* =========================================================
   main.js (FULL)
   - Same behavior on mobile + desktop (responsive layout handled by CSS)
   - Targets always spawn (if possible) on all devices
   - Arcade ON: DVD bounce forever / Arcade OFF: targets still
   - Points reset each page load
   - Arcade OFF by default each page load
   - +250 points per section unlock
   - +100 points per game target hit
   - every 1000 points: motivational toast
   - Music works (ambient vs arcade track)
   - FX always HIGH (no FX toggle)
   - Targets will NEVER overlap protected text/panels/preview/HUD/settings/toasts:
       If content scrolls/expands into them, they shatter + respawn.
       If nowhere valid exists, they despawn (do not spawn).
========================================================= */

(() => {
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { }
  if (location.hash) {
    try { history.replaceState(null, "", location.pathname + location.search); } catch { }
  }
  const forceTop = () => window.scrollTo(0, 0);
  forceTop();
  window.addEventListener("DOMContentLoaded", forceTop, { once: true });
  window.addEventListener("load", () => requestAnimationFrame(forceTop), { once: true });
  window.addEventListener("pageshow", (e) => { if (e.persisted) forceTop(); });
})();

const root = document.documentElement;

function lsGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); } catch { } }
function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
function rectOf(el) { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }
function intersects(a, b) { return !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b); }
function expandRect(r, m) { return { l: r.l - m, t: r.t - m, r: r.r + m, b: r.b + m }; }

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const heroCard = document.querySelector(".hero-main");
const reticle = document.querySelector(".reticle");
const muzzle = document.getElementById("muzzle");
const xpFill = document.getElementById("xpFill");
const toastHost = document.getElementById("toast");

/* ---------- Storage keys ---------- */
const LS_SFX_ON = "sfxOn";
const LS_MUSIC_ON = "musicOn";
const LS_ACH = "achievements_v3";
const LS_MILESTONE = "points_milestone_v1";

/* ---------- State ---------- */
/* Arcade OFF by default (not persisted) */
let arcadeMode = false;
root.dataset.arcade = "0";

/* FX always HIGH */
let fxHigh = true;
root.dataset.fx = "1";

/* Persist SFX + Music */
let sfxOn = (lsGet(LS_SFX_ON) ?? "1") === "1";
let musicOn = (lsGet(LS_MUSIC_ON) ?? "0") === "1";

/* ---------- Toasts / Achievements ---------- */
function toast(title, msg) {
  if (!toastHost) return;
  const el = document.createElement("div");
  el.className = "t";
  el.innerHTML = `
    <div class="title">${title}</div>
    <div class="msg">${msg}</div>
    <div class="bar"><i></i></div>
  `;
  toastHost.prepend(el);
  setTimeout(() => el.remove(), 3400);
}

let achievedArr = [];
try { achievedArr = JSON.parse(lsGet(LS_ACH) || "[]"); } catch { achievedArr = []; }
const achieved = new Set(achievedArr);

function unlock(key, title, msg) {
  if (achieved.has(key)) return;
  achieved.add(key);
  lsSet(LS_ACH, JSON.stringify([...achieved]));
  toast("ACHIEVEMENT UNLOCKED", `${title} — ${msg}`);
}

/* ---------- Points (reset every load) ---------- */
let points = 0;
const pointsEl = document.getElementById("pointsValue");
function renderPoints() { if (pointsEl) pointsEl.textContent = String(points); }

/* Motivational quotes every 1000 points */
const QUOTES = [
  "Keep going — consistency beats intensity.",
  "You’re building momentum. Stay with it.",
  "Small wins compound. Great job.",
  "Progress over perfection — every time.",
  "Lock in. One step at a time.",
  "Discipline creates options. You’re doing it.",
  "Stay focused — you’re closer than you think.",
  "Strong systems beat strong feelings. Keep executing.",
  "Today’s effort is tomorrow’s advantage.",
  "You showed up. That’s what pros do.",
];

let lastMilestone = 0;
(() => {
  const saved = parseInt(lsGet(LS_MILESTONE) || "0", 10);
  lastMilestone = Number.isFinite(saved) ? saved : 0;
})();

function checkPointMilestone() {
  const milestone = Math.floor(points / 1000) * 1000;
  if (milestone >= 1000 && milestone > lastMilestone) {
    lastMilestone = milestone;
    lsSet(LS_MILESTONE, String(lastMilestone));
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    toast("MILESTONE", `${milestone} points — ${quote}`);
  }
}

function addPoints(n) {
  points = Math.max(0, points + n);
  renderPoints();
  checkPointMilestone();
}

function resetPoints() {
  points = 0;
  renderPoints();
  lastMilestone = 0;
  lsSet(LS_MILESTONE, "0");
}

/* Reset every page load */
resetPoints();

/* Reset button (resets current session points) */
document.getElementById("pointsResetBtn")?.addEventListener("click", resetPoints);

/* ---------- XP bar ---------- */
function updateXP() {
  if (!xpFill) return;
  const h = document.documentElement;
  const scrollTop = h.scrollTop || document.body.scrollTop;
  const scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
  const p = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  xpFill.style.width = p.toFixed(2) + "%";
}
window.addEventListener("scroll", updateXP, { passive: true });
updateXP();

/* ---------- Tilt / reticle ---------- */
function shouldTilt() {
  if (!fxHigh) return false;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.innerWidth < 860) return false;
  return true;
}

window.addEventListener("pointermove", (e) => {
  const xPct = (e.clientX / window.innerWidth) * 100;
  const yPct = (e.clientY / window.innerHeight) * 100;
  root.style.setProperty("--mx", xPct.toFixed(2) + "%");
  root.style.setProperty("--my", yPct.toFixed(2) + "%");

  if (reticle) {
    reticle.style.left = e.clientX + "px";
    reticle.style.top = e.clientY + "px";
  }

  if (!heroCard || !shouldTilt()) return;
  const rect = heroCard.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (e.clientX - cx) / rect.width;
  const dy = (e.clientY - cy) / rect.height;

  root.style.setProperty("--tiltY", (dx * 6).toFixed(2) + "deg");
  root.style.setProperty("--tiltX", (-dy * 6).toFixed(2) + "deg");
}, { passive: true });

/* ---------- Noise background ---------- */
(() => {
  const seed = Math.floor(Math.random() * 1e9);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="420">
      <filter id="n">
        <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch" seed="${seed}"/>
        <feColorMatrix type="matrix" values="
          1 0 0 0 0
          0 1 0 0 0
          0 0 1 0 0
          0 0 0 .55 0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>`;
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  const noiseEl = document.querySelector(".noise");
  if (noiseEl) noiseEl.style.backgroundImage = `url("${url}")`;
})();

/* ---------- Reveal on scroll ---------- */
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add("in");
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach((el) => { try { io.observe(el); } catch { } });
})();

/* ---------- Boot overlay ---------- */
(() => {
  const boot = document.getElementById("boot");
  if (!boot) return;

  function dismiss() {
    boot.classList.add("off");
    setTimeout(() => boot.remove(), 550);
  }

  window.addEventListener("load", () => setTimeout(dismiss, 900));
  boot.addEventListener("pointerdown", dismiss, { passive: true });
  window.addEventListener("keydown", dismiss, { once: true });
})();

/* ---------- SFX ---------- */
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
const SFX_BASE_GAIN = 0.13;

function bleep(freq = 660, dur = 0.05, type = "sine", gainMult = 1) {
  if (!sfxOn) return;
  const ctx = ensureAudio();
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = type;
  o.frequency.setValueAtTime(freq, t0);

  const peak = Math.min(0.9, SFX_BASE_GAIN * gainMult);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/* ---------- Music engine ---------- */
const bgmAmbient = document.getElementById("bgmAmbient");
const bgmArcade = document.getElementById("bgmArcade");
let bgmUnlocked = false;
const MUSIC_VOL = 0.16;

function applyMusicState() {
  if (!musicOn) {
    try { bgmAmbient?.pause(); } catch { }
    try { bgmArcade?.pause(); } catch { }
    return;
  }

  const wantArcade = arcadeMode;
  const on = wantArcade ? bgmArcade : bgmAmbient;
  const off = wantArcade ? bgmAmbient : bgmArcade;

  try { off?.pause(); } catch { }
  if (on) on.volume = MUSIC_VOL;

  if (!bgmUnlocked) return;
  try { on?.play(); } catch { }
}

function unlockBgmOnce() {
  if (bgmUnlocked) return;
  bgmUnlocked = true;
  applyMusicState();
}

window.addEventListener("pointerdown", unlockBgmOnce, { once: true, passive: true });
window.addEventListener("keydown", unlockBgmOnce, { once: true });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    try { bgmAmbient?.pause(); } catch { }
    try { bgmArcade?.pause(); } catch { }
  } else {
    applyMusicState();
  }
});

/* ---------- Settings dropdown: do NOT auto-close on toggle ---------- */
(() => {
  const settingsMenu = document.getElementById("settingsMenu");
  if (!settingsMenu) return;

  function closeSettings() {
    if (settingsMenu.open) settingsMenu.open = false;
  }

  document.addEventListener("pointerdown", (e) => {
    if (!settingsMenu.open) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest("#settingsMenu")) return;
    closeSettings();
  }, { capture: true });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
  });
})();

/* ---------- Settings toggles (NO FX toggle) ---------- */
(() => {
  const arcadeBtn = document.getElementById("arcadeToggle");
  const sfxBtn = document.getElementById("sfxToggle");
  const musicBtn = document.getElementById("musicToggle");

  function syncToggleUI() {
    if (arcadeBtn) {
      arcadeBtn.setAttribute("aria-pressed", arcadeMode ? "true" : "false");
      arcadeBtn.textContent = `ARCADE: ${arcadeMode ? "ON" : "OFF"}`;
    }
    if (sfxBtn) {
      sfxBtn.setAttribute("aria-pressed", sfxOn ? "true" : "false");
      sfxBtn.textContent = `SFX: ${sfxOn ? "ON" : "OFF"}`;
    }
    if (musicBtn) {
      musicBtn.setAttribute("aria-pressed", musicOn ? "true" : "false");
      musicBtn.textContent = `MUSIC: ${musicOn ? "ON" : "OFF"}`;
    }

    root.dataset.arcade = arcadeMode ? "1" : "0";
    root.dataset.fx = "1";
  }

  syncToggleUI();

  arcadeBtn?.addEventListener("click", () => {
    arcadeMode = !arcadeMode;
    syncToggleUI();
    unlock("arcade", "Arcade Mode", arcadeMode ? "Enabled." : "Disabled.");
    bleep(520, 0.05, "sawtooth", 0.8);
    applyMusicState();
  });

  sfxBtn?.addEventListener("click", () => {
    sfxOn = !sfxOn;
    lsSet(LS_SFX_ON, sfxOn ? "1" : "0");
    syncToggleUI();
    if (sfxOn) {
      ensureAudio();
      bleep(740, 0.06, "square", 1.0);
      bleep(990, 0.06, "square", 0.95);
    }
  });

  musicBtn?.addEventListener("click", () => {
    musicOn = !musicOn;
    lsSet(LS_MUSIC_ON, musicOn ? "1" : "0");
    syncToggleUI();
    unlock("music_toggle", "Music", musicOn ? "Enabled." : "Disabled.");
    bgmUnlocked = true; // gesture
    applyMusicState();
  });
})();

/* ---------- Muzzle ---------- */
function muzzleFlash(x, y) {
  if (!muzzle || !fxHigh) return;
  muzzle.style.left = x + "px";
  muzzle.style.top = y + "px";
  muzzle.classList.remove("fire");
  void muzzle.offsetWidth;
  muzzle.classList.add("fire");
}

/* ---------- Shatter effect (DOM shards) ---------- */
let shardLayer = null;
function ensureShardLayer() {
  if (shardLayer) return shardLayer;
  shardLayer = document.createElement("div");
  shardLayer.className = "shard-layer";
  document.body.appendChild(shardLayer);
  return shardLayer;
}

function shatterAt(x, y, count = 18) {
  const layer = ensureShardLayer();

  function pickColor() {
    const r = Math.random();
    if (r < 0.70) {
      const neutrals = [
        "rgba(245,247,250,.95)",
        "rgba(210,218,228,.95)",
        "rgba(160,170,182,.90)",
        "rgba(90,98,110,.85)",
        "rgba(35,40,48,.80)",
      ];
      return neutrals[(Math.random() * neutrals.length) | 0];
    }
    if (r < 0.90) return "rgba(245,247,250,.95)";
    if (r < 0.97) return "rgba(0,229,255,.55)";
    return "rgba(255,43,214,.40)";
  }

  for (let i = 0; i < count; i++) {
    const s = document.createElement("i");
    s.className = "shard";
    s.style.left = x + "px";
    s.style.top = y + "px";

    const w = 4 + Math.random() * 10;
    const h = 3 + Math.random() * 9;
    s.style.width = w.toFixed(1) + "px";
    s.style.height = h.toFixed(1) + "px";
    s.style.borderRadius = (Math.random() < 0.55 ? 1 : 3) + "px";

    const c = pickColor();
    s.style.background = c;

    const isBright = c.includes("245,247,250") || c.includes("210,218,228");
    s.style.boxShadow = isBright
      ? "0 0 10px rgba(255,255,255,.22)"
      : "0 0 8px rgba(0,0,0,.16)";

    const ang = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 90;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    const rot = (Math.random() * 720 - 360) + "deg";

    s.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1, filter: "blur(0px)" },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}) scale(.75)`, opacity: 0, filter: "blur(.2px)" }
      ],
      { duration: 520 + Math.random() * 320, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );

    layer.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

/* ---------- Resume click achievement ---------- */
document.querySelectorAll('a[href$=".pdf"], a[href*="Donald_Hui_Resume"]').forEach((a) => {
  a.addEventListener("click", () => unlock("resume_open", "Paper Trail", "Opened the resume."), { passive: true });
});

/* ---------- Tiles: unlock logic (+250 points) ---------- */
(() => {
  const tiles = Array.from(document.querySelectorAll(".tile"));
  const SECTION_UNLOCK_POINTS = 250;

  function isPinnedOpen(tile) {
    return tile?.classList.contains("hero-main") || tile?.dataset.subject === "Summary";
  }

  function setPanelHeights(tile) {
    const panel = tile.querySelector(".panel");
    if (!panel) return;

    const prev = panel.style.maxHeight;
    panel.style.maxHeight = "none";
    const h = Math.ceil(panel.scrollHeight);
    panel.style.maxHeight = prev;

    tile.style.setProperty("--panel-open", h + "px");
  }

  function measureAll() { tiles.forEach(setPanelHeights); }

  function unlockFromMainTarget(btn) {
    const tile = btn.closest(".tile");
    if (!tile || isPinnedOpen(tile)) return;
    if (tile.classList.contains("unlocked")) return;

    setPanelHeights(tile);
    void tile.offsetHeight;

    tile.classList.remove("locked");
    tile.classList.add("unlocked");
    void tile.offsetHeight;

    btn.setAttribute("aria-expanded", "true");

    // If opening Resume, ensure preview starts open
    if (tile.id === "resume") {
      const wrap = document.getElementById("resumePreviewWrap");
      if (wrap) {
        wrap.classList.add("expanded");
        wrap.classList.remove("collapsed");
      }
      // force a "collision enforce" cycle in game targets (they listen to scroll)
      window.dispatchEvent(new Event("scroll"));
    }

    addPoints(SECTION_UNLOCK_POINTS);
    unlock(
      "target_" + (tile.id || Math.random().toString(16).slice(2)),
      "Section Opened",
      `+${SECTION_UNLOCK_POINTS} points — ${tile.dataset.subject || tile.id}`
    );

    tile.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleResumePreview(btn) {
    const wrap = document.getElementById("resumePreviewWrap");
    if (!wrap) return;

    const isExpanded = wrap.classList.toggle("expanded");
    wrap.classList.toggle("collapsed", !isExpanded);

    btn.setAttribute("aria-expanded", isExpanded ? "true" : "false");

    const sub = btn.querySelector(".target-sub");
    if (sub) sub.textContent = isExpanded ? "Shoot to collapse" : "Shoot to expand";

    // Trigger collision re-check so targets relocate if preview overlaps them
    window.dispatchEvent(new Event("scroll"));

    const tile = btn.closest(".tile");
    if (tile) setPanelHeights(tile);
  }

  measureAll();
  window.addEventListener("load", () => { measureAll(); requestAnimationFrame(measureAll); }, { passive: true });
  window.addEventListener("resize", () => measureAll(), { passive: true });

  // Click-to-open (works on mobile too)
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".target") : null;
    if (!btn) return;

    if (btn.dataset.action === "resumeExpand") return toggleResumePreview(btn);
    if (btn.classList.contains("main-target")) return unlockFromMainTarget(btn);
  }, { passive: true });

  // Desktop shooting also works
  function shootAt(x, y) {
    bleep(180, 0.035, "square", 1.0);
    bleep(90, 0.02, "sine", 0.7);

    const sx = reticle ? parseFloat(reticle.style.left) || x : x;
    const sy = reticle ? parseFloat(reticle.style.top) || y : y;

    muzzleFlash(sx, sy);

    const stack = document.elementsFromPoint(x, y);
    const hitTarget = stack.find((n) => n instanceof Element && n.classList?.contains("target"));
    if (!hitTarget) return;

    if (hitTarget.dataset.action === "resumeExpand") return toggleResumePreview(hitTarget);
    if (hitTarget.classList.contains("main-target")) return unlockFromMainTarget(hitTarget);
  }

  document.addEventListener("pointerdown", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (!el) return;

    // IMPORTANT: if user is interacting with a target button (like PREVIEW), let the click handler handle it
    if (el.closest(".target")) return;

    if (el.closest(".topbar, footer, a, button, .btn, .card, .card *, input, textarea, select")) return;

    shootAt(e.clientX, e.clientY);
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
    shootAt(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
  });
})();

/* ---------- Hamburger nav (replaces left HUD) ---------- */
(() => {
  const navMenu = document.getElementById("navMenu");
  const panel = document.querySelector("#navMenu .nav-panel");
  if (!navMenu || !panel) return;

  const items = [
    { label: "Summary", sel: "#summary" },
    { label: "Profile", sel: "#about" },
    { label: "Projects", sel: "#projects" },
    { label: "Resume", sel: "#resume" },
    { label: "Contact", sel: "#contact" },
  ];

  panel.innerHTML = items
    .map((i) => `<button class="nav-link" type="button" data-target="${i.sel}">${i.label}</button>`)
    .join("");

  panel.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = btn.getAttribute("data-target") || "";
      document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" });
      navMenu.open = false;
    });
  });

  // close on outside click
  document.addEventListener("pointerdown", (e) => {
    if (!navMenu.open) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest("#navMenu")) return;
    navMenu.open = false;
  }, { capture: true });

  // close on ESC
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") navMenu.open = false;
  });
})();

/* ---------- Game Targets (despawn-on-collision, INSTANT respawn when space exists) ---------- */
(() => {
  const layer = document.getElementById("gameLayer");
  if (!layer) return;

  const MIN = 5, MAX = 10;
  const POINTS_PER_HIT = 100;
  const SIZE = 54;
  const PAD = 10;

  let ents = [];
  let raf = null;
  let last = 0;

  let targetGoal = 0;

  // respawn scheduler (RAF id)
  let respawnTimer = null;

  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

  function candidateRect(x, y) { return { l: x, t: y, r: x + SIZE, b: y + SIZE }; }

  function viewportInfo() {
    const vv = window.visualViewport;
    const w = vv?.width ?? innerWidth;
    const h = vv?.height ?? innerHeight;
    const ox = vv?.offsetLeft ?? 0;
    const oy = vv?.offsetTop ?? 0;
    return { w, h, ox, oy };
  }

  // NOTE: we spawn in viewport coordinates (overlay), but use visualViewport offsets for mobile correctness
  function worldBounds() {
    const { w, h, ox, oy } = viewportInfo();
    return { l: PAD + ox, t: PAD + oy, r: ox + w - PAD, b: oy + h - PAD };
  }

  function protectedRects() {
    const blocks = [];
    const { w: vw, h: vh, ox, oy } = viewportInfo();

    // Visible viewport in *viewport coordinate space* (same as getBoundingClientRect)
    const view = { l: ox, t: oy, r: ox + vw, b: oy + vh };

    function pushIfVisible(rect, pad) {
      if (!rect) return;
      const rw = rect.r - rect.l;
      const rh = rect.b - rect.t;
      if (rw <= 10 || rh <= 10) return;
      if (!intersects(rect, view)) return;
      blocks.push(expandRect(rect, pad));
    }

    // Protect only visible "Shoot to reveal" buttons
    document.querySelectorAll(".tile.locked .target.main-target").forEach((t) => {
      pushIfVisible(rectOf(t), 10);
    });

    // Topbar
    const topbar = document.querySelector(".topbar");
    pushIfVisible(topbar ? rectOf(topbar) : null, 6);

    // Footer only when visible
    const footerC = document.querySelector("footer .container");
    pushIfVisible(footerC ? rectOf(footerC) : null, 8);

    // Open panels (only if visible)
    document.querySelectorAll(".tile.unlocked .panel").forEach((p) => {
      pushIfVisible(rectOf(p), 8);
    });

    // Resume preview when expanded (only if visible)
    const resumeWrap = document.getElementById("resumePreviewWrap");
    if (resumeWrap && resumeWrap.classList.contains("expanded")) {
      pushIfVisible(rectOf(resumeWrap), 8);
    }

    // Settings panel when open
    const settingsPanel = document.querySelector("#settingsMenu[open] .settings-panel");
    pushIfVisible(settingsPanel ? rectOf(settingsPanel) : null, 8);

    // Toast area
    if (toastHost) pushIfVisible(rectOf(toastHost), 8);

    // Drop accidental near-fullscreen blockers
    return blocks.filter((r) => {
      const rw = Math.max(0, r.r - r.l);
      const rh = Math.max(0, r.b - r.t);
      return !(rw > vw * 0.98 && rh > vh * 0.90);
    });
  }

  function overlapsLiveTargets(rr, ignoreEnt = null) {
    for (const e of ents) {
      if (!e.alive) continue;
      if (ignoreEnt && e === ignoreEnt) continue;
      if (intersects(rr, candidateRect(e.x, e.y))) return true;
    }
    return false;
  }

  function isValidSpawn(x, y, ignoreEnt = null) {
    const bounds = worldBounds();
    const rr = candidateRect(x, y);

    if (rr.l < bounds.l || rr.t < bounds.t || rr.r > bounds.r || rr.b > bounds.b) return false;

    const blocks = protectedRects();
    if (blocks.some((b) => intersects(rr, b))) return false;

    if (overlapsLiveTargets(rr, ignoreEnt)) return false;
    return true;
  }

  function pickSpawnPoint(ignoreEnt = null) {
    const bounds = worldBounds();
    for (let tries = 0; tries < 1400; tries++) {
      const x = randInt(bounds.l, Math.max(bounds.l, bounds.r - SIZE));
      const y = randInt(bounds.t, Math.max(bounds.t, bounds.b - SIZE));
      if (isValidSpawn(x, y, ignoreEnt)) return { x, y };
    }
    return null;
  }

  function setPos(e) { e.el.style.transform = `translate(${e.x}px, ${e.y}px)`; }

  function giveVelocity(ent) {
    const speed = 180 + Math.random() * 140;
    const ang = Math.random() * Math.PI * 2;
    ent.vx = Math.cos(ang) * speed;
    ent.vy = Math.sin(ang) * speed;
  }

  function start() {
    stop();
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function aliveCount() {
    return ents.filter((e) => e.alive).length;
  }

  function hit(e) {
    if (!e.alive) return;
    e.alive = false;

    addPoints(POINTS_PER_HIT);
    bleep(740, 0.04, "square", 0.75);

    const r = e.el.getBoundingClientRect();
    shatterAt(r.left + r.width / 2, r.top + r.height / 2, 22);

    e.el.classList.add("hit");
    setTimeout(() => {
      try { e.el.remove(); } catch {}
      ents = ents.filter((x) => x !== e);
      scheduleRespawn();
    }, 260);
  }

  function despawnEnt(e) {
    if (!e.alive) return;
    e.alive = false;

    const r = e.el.getBoundingClientRect();
    shatterAt(r.left + r.width / 2, r.top + r.height / 2, 18);

    try { e.el.remove(); } catch {}
    ents = ents.filter((x) => x !== e);

    scheduleRespawn();
  }

  function enforceNoCollisions() {
    const blocks = protectedRects();
    for (const e of [...ents]) {
      if (!e.alive) continue;
      const rr = candidateRect(e.x, e.y);
      if (blocks.some((b) => intersects(rr, b))) despawnEnt(e);
    }
  }

  // Spawn as many as possible immediately up to the goal
  function fillToGoal() {
    while (aliveCount() < targetGoal) {
      const p = pickSpawnPoint();
      if (!p) break;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "game-target";
      el.textContent = "";
      el.setAttribute("aria-label", "Target");
      layer.appendChild(el);

      const ent = { el, alive: true, x: p.x, y: p.y, vx: 0, vy: 0, w: SIZE, h: SIZE };
      if (arcadeMode) giveVelocity(ent);

      setPos(ent);
      el.addEventListener("click", () => hit(ent), { passive: true });
      ents.push(ent);
    }
  }

  function scheduleRespawn() {
    if (respawnTimer) return;
    respawnTimer = requestAnimationFrame(() => {
      respawnTimer = null;
      enforceNoCollisions();
      fillToGoal();
    });
  }

  function spawnInitialWave() {
    stop();
    ents = [];
    layer.innerHTML = "";

    targetGoal = randInt(MIN, MAX);

    fillToGoal();
    enforceNoCollisions();
    fillToGoal();

    if (arcadeMode) start();
  }

  function tick(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    if (!arcadeMode) return;

    const bounds = worldBounds();
    const blocks = protectedRects();

    for (const e of [...ents]) {
      if (!e.alive) continue;

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (e.x <= bounds.l) { e.x = bounds.l; e.vx *= -1; }
      if (e.y <= bounds.t) { e.y = bounds.t; e.vy *= -1; }
      if (e.x + e.w >= bounds.r) { e.x = bounds.r - e.w; e.vx *= -1; }
      if (e.y + e.h >= bounds.b) { e.y = bounds.b - e.h; e.vy *= -1; }

      const rr = candidateRect(e.x, e.y);
      if (blocks.some((b) => intersects(rr, b))) {
        despawnEnt(e);
        continue;
      }

      setPos(e);
    }

    raf = requestAnimationFrame(tick);
  }

  // priority hit handler
  document.addEventListener("pointerdown", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (el && el.closest(".topbar, footer, a, button:not(.game-target):not(.target), .btn, .card, .card *, input, textarea, select")) return;

    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    const btn = stack.find((n) => n instanceof Element && n.classList?.contains("game-target"));
    if (!btn) return;

    const ent = ents.find((en) => en.el === btn);
    if (!ent) return;

    hit(ent);
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });

  let enforceRAF = null;
  function scheduleEnforce() {
    if (enforceRAF) return;
    enforceRAF = requestAnimationFrame(() => {
      enforceRAF = null;
      enforceNoCollisions();
      scheduleRespawn();
    });
  }

  window.addEventListener("scroll", scheduleEnforce, { passive: true });
  window.addEventListener("resize", scheduleEnforce, { passive: true });

  // arcade toggle listener
  const mo = new MutationObserver(() => {
    arcadeMode = root.dataset.arcade === "1";
    applyMusicState();

    if (arcadeMode) {
      ents.forEach((e) => {
        if (!e.alive) return;
        if (e.vx === 0 && e.vy === 0) giveVelocity(e);
      });
      start();
    } else {
      stop();
      ents.forEach((e) => { e.vx = 0; e.vy = 0; setPos(e); });
    }

    scheduleEnforce();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-arcade"] });

  // Kick off
  spawnInitialWave();

  // One reliable "post-load settle" pass (boot fade + mobile URL bar)
  window.addEventListener("load", () => {
    setTimeout(scheduleEnforce, 950);
  }, { once: true });

  window.visualViewport?.addEventListener("resize", scheduleEnforce, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleEnforce, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(scheduleEnforce, 250), { passive: true });
})();
