/* =========================================================
   main.js (REFactor - drop-in)
   - Section unlock: ONE combined toast (+points)
   - Game target hit: points toast per hit
   - Arcade targets: real 2D elastic wall bounce (left/right/top/bottom)
   - Arcade targets: bounce off protected UI blocks (no shatter/despawn)
   - Mobile perf optimizations:
       * fewer shards + shorter shard lifetime
       * fewer targets + lower FPS on mobile
       * less frequent protected-rect recalcs on mobile
       * keep RAF alive even when Arcade is OFF
   - CHANGE: Disable ARCADE MOTION on mobile (fastest/cleanest)
     (Arcade toggle still affects music + UI label, but targets stay still on mobile.)
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
const mqMobile = matchMedia("(max-width: 767px)");
const isTouchDevice = () =>
  (navigator.maxTouchPoints || 0) > 0 ||
  matchMedia("(pointer: coarse)").matches;

// "No space on left/right for targets" (portrait monitors, narrow windows, etc.)
function noSideSpaceNow() {
  const vv = window.visualViewport;
  const w = vv?.width ?? innerWidth;
  const h = vv?.height ?? innerHeight;

  const TARGET = 54; // keep in sync with game cfg SIZE
  const PAD = 10;    // keep in sync with game cfg PAD
  const MIN_GUTTER_EACH_SIDE = 70; // required empty space on both sides

  const portraitLike = h / Math.max(1, w) >= 1.25;
  const minNeededWidth = (PAD * 2) + TARGET + (MIN_GUTTER_EACH_SIDE * 2);

  return portraitLike || w < minNeededWidth;
}

// Used everywhere (shards + targets): now includes portrait monitors too
const isMobileNow = () => mqMobile.matches || isTouchDevice() || noSideSpaceNow();

const $ = (sel, rootEl = document) => rootEl.querySelector(sel);
const $$ = (sel, rootEl = document) => Array.from(rootEl.querySelectorAll(sel));

function lsGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, val); } catch { } }

function rectOf(el) {
  const r = el.getBoundingClientRect();
  return { l: r.left, t: r.top, r: r.right, b: r.bottom };
}
function expandRect(r, m) { return { l: r.l - m, t: r.t - m, r: r.r + m, b: r.b + m }; }
function intersects(a, b) { return !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b); }

const yearEl = $("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const heroCard = $(".hero-main");
const reticle = $(".reticle");
const muzzle = $("#muzzle");
const xpFill = $("#xpFill");
const toastHost = $("#toast");

/* ---------- Storage keys ---------- */
const LS = Object.freeze({
  SFX_ON: "sfxOn",
  MUSIC_ON: "musicOn",
  ARCADE_ON: "arcadeOn",
  ACH: "achievements_v3",
  MILESTONE: "points_milestone_v1",
});

let arcadeMode = (lsGet(LS.ARCADE_ON) ?? "0") === "1"; // default OFF
let sfxOn = (lsGet(LS.SFX_ON) ?? "1") === "1";         // default ON
let musicOn = (lsGet(LS.MUSIC_ON) ?? "0") === "1";     // default OFF

/* FX always HIGH */
const fxHigh = true;

root.dataset.arcade = arcadeMode ? "1" : "0";
root.dataset.fx = "1";

/* ---------- Break audio ---------- */
const breakAudio = new Audio("./assets/audio/effect_break.mp3");
function playBreakAudio() {
  if (!sfxOn) return;
  const a = breakAudio.cloneNode();
  a.volume = 0.15;
  a.play().catch(() => { });
}

/* ---------- Toasts / Achievements ---------- */
function toast(title, msg, { ms = 5000 } = {}) {
  if (!toastHost) return;
  const el = document.createElement("div");
  el.className = "t";
  el.innerHTML = `
    <div class="title">${title}</div>
    <div class="msg">${msg}</div>
    <div class="bar"><i></i></div>
  `;
  toastHost.prepend(el);
  setTimeout(() => el.remove(), ms);
}

let achievedArr = [];
try { achievedArr = JSON.parse(lsGet(LS.ACH) || "[]"); } catch { achievedArr = []; }
const achieved = new Set(achievedArr);

function unlock(key, title, msg, { silent = false } = {}) {
  if (achieved.has(key)) return false;
  achieved.add(key);
  lsSet(LS.ACH, JSON.stringify([...achieved]));
  if (!silent) toast("ACHIEVEMENT UNLOCKED", `${title} — ${msg}`);
  return true;
}

/* ---------- Points (reset every load) ---------- */
let points = 0;
const pointsEl = $("#pointsValue");
function renderPoints() { if (pointsEl) pointsEl.textContent = String(points); }

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
  "Discipline beats motivation every time.",
  "You don’t need more time — you need more focus.",
  "Small progress is still progress.",
  "Consistency turns average into excellence.",
  "The work you avoid is the life you want.",
  "Stay focused — results are coming.",
  "Effort today pays off tomorrow.",
  "You’re closer than you think.",
  "Do it tired. Do it unmotivated. Just do it.",
  "Winners are just people who didn’t quit.",
  "You didn’t come this far to only come this far.",
  "Future you is watching. Don’t embarrass them.",
  "You can do hard things… unfortunately.",
  "No one’s coming to save you. That’s the good news.",
  "You vs you. Try not to lose.",
  "Get up. The grind won’t grind itself.",
  "Be disciplined… or be disappointed.",
  "If it was easy, you’d already be bored.",
  "Do it for the version of you that’s tired of this.",
  "Progress is progress, even if it’s ugly.",
  "Comfort is expensive. Growth is cheaper.",
  "You’re not stuck — you’re just not moving.",
  "Excuses don’t build results.",
  "You know what to do. Now do it.",
  "Stop negotiating with yourself.",
  "Average is crowded. Leave.",
  "You’re capable — act like it.",
  "The only shortcut is discipline.",
  "No pressure, but your future depends on this.",
  "Lock in or fall behind.",
  "XP doesn’t earn itself.",
  "You just leveled up. Don’t log off now.",
  "Grind now, flex later.",
  "Skill issue? Fix it.",
  "You missed 100% of the shots you didn’t take.",
  "Respawn. Try again. Win.",
  "You’re in the build phase. Keep going.",
  "Main character energy only.",
  "Achievement unlocked: Still going.",
  "Pause is not quit.",
];

let lastMilestone = 0;
{
  const saved = parseInt(lsGet(LS.MILESTONE) || "0", 10);
  lastMilestone = Number.isFinite(saved) ? saved : 0;
}

function checkPointMilestone() {
  const milestone = Math.floor(points / 1000) * 1000;
  if (milestone >= 1000 && milestone > lastMilestone) {
    lastMilestone = milestone;
    lsSet(LS.MILESTONE, String(lastMilestone));
    const quote = QUOTES[(Math.random() * QUOTES.length) | 0];
    toast("MILESTONE", `${milestone} points — ${quote}`);
  }
}

function addPoints(n) {
  points = Math.max(0, points + n);
  renderPoints();
  checkPointMilestone();
}

function awardPoints(amount, title = "POINTS", msg = "", { toastMs = 5000 } = {}) {
  addPoints(amount);
  toast(title, msg ? `${msg} — +${amount} points` : `+${amount} points`, { ms: toastMs });
}

function resetPoints() {
  points = 0;
  renderPoints();
  lastMilestone = 0;
  lsSet(LS.MILESTONE, "0");
}

resetPoints();
$("#pointsResetBtn")?.addEventListener("click", resetPoints);

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
  const noiseEl = $(".noise");
  if (noiseEl) noiseEl.style.backgroundImage = `url("${url}")`;
})();

/* ---------- Reveal on scroll ---------- */
(() => {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) e.target.classList.add("in");
  }, { threshold: 0.12 });

  $$(".reveal").forEach((el) => { try { io.observe(el); } catch { } });
})();

/* ---------- Boot overlay ---------- */
(() => {
  const boot = $("#boot");
  if (!boot) return;

  const dismiss = () => {
    boot.classList.add("off");
    setTimeout(() => boot.remove(), 550);
  };

  window.addEventListener("load", () => setTimeout(dismiss, 900));
  boot.addEventListener("pointerdown", dismiss, { passive: true });
  window.addEventListener("keydown", dismiss, { once: true });
})();

/* ---------- SFX (bleeps) ---------- */
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
const SFX_BASE_GAIN = 0.15;

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
const bgmAmbient = $("#bgmAmbient");
const bgmArcade = $("#bgmArcade");
let bgmUnlocked = false;
const MUSIC_VOL = 0.15;

function applyMusicState() {
  if (!musicOn) {
    try { bgmAmbient?.pause(); } catch { }
    try { bgmArcade?.pause(); } catch { }
    return;
  }

  const on = arcadeMode ? bgmArcade : bgmAmbient;
  const off = arcadeMode ? bgmAmbient : bgmArcade;

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

/* ---------- Settings dropdown ---------- */
(() => {
  const settingsMenu = $("#settingsMenu");
  if (!settingsMenu) return;

  const closeSettings = () => { if (settingsMenu.open) settingsMenu.open = false; };

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
  const arcadeBtn = $("#arcadeToggle");
  const sfxBtn = $("#sfxToggle");
  const musicBtn = $("#musicToggle");

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
    lsSet(LS.ARCADE_ON, arcadeMode ? "1" : "0");
    syncToggleUI();
    unlock("arcade", "Arcade Mode", arcadeMode ? "Enabled." : "Disabled.");
    bleep(520, 0.05, "sawtooth", 0.8);
    applyMusicState();
  });

  sfxBtn?.addEventListener("click", () => {
    sfxOn = !sfxOn;
    lsSet(LS.SFX_ON, sfxOn ? "1" : "0");
    syncToggleUI();
    if (sfxOn) {
      ensureAudio();
      bleep(740, 0.06, "square", 1.0);
      bleep(990, 0.06, "square", 0.95);
    }
  });

  musicBtn?.addEventListener("click", () => {
    musicOn = !musicOn;
    lsSet(LS.MUSIC_ON, musicOn ? "1" : "0");
    syncToggleUI();
    unlock("music_toggle", "Music", musicOn ? "Enabled." : "Disabled.");
    bgmUnlocked = true;
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

/* ---------- Shatter effect ---------- */
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

  const pickColor = () => {
    const r = Math.random();
    if (r < 0.7) {
      const neutrals = [
        "rgba(245,247,250,.95)",
        "rgba(210,218,228,.95)",
        "rgba(160,170,182,.90)",
        "rgba(90,98,110,.85)",
        "rgba(35,40,48,.80)",
      ];
      return neutrals[(Math.random() * neutrals.length) | 0];
    }
    if (r < 0.9) return "rgba(245,247,250,.95)";
    if (r < 0.97) return "rgba(0,229,255,.55)";
    return "rgba(255,43,214,.40)";
  };

  const mobile = isMobileNow();
  const removeAfter = mobile ? 650 : 1000;

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
    s.style.boxShadow = isBright ? "0 0 10px rgba(255,255,255,.22)" : "0 0 8px rgba(0,0,0,.16)";

    const ang = Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 90;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist;
    const rot = (Math.random() * 720 - 360) + "deg";

    s.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1, filter: mobile ? "none" : "blur(0px)" },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot}) scale(.75)`, opacity: 0, filter: mobile ? "none" : "blur(.2px)" },
      ],
      { duration: 520 + Math.random() * 320, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" }
    );

    layer.appendChild(s);
    setTimeout(() => s.remove(), removeAfter);
  }
}

/* ---------- Resume click achievement ---------- */
$$('a[href$=".pdf"], a[href*="Donald_Hui_Resume"]').forEach((a) => {
  a.addEventListener("click", () => unlock("resume_open", "Paper Trail", "Opened the resume."), { passive: true });
});

/* ---------- Tiles: unlock logic (+250 points) ---------- */
(() => {
  const tiles = $$(".tile");
  const SECTION_UNLOCK_POINTS = 250;

  const isPinnedOpen = (tile) =>
    tile?.classList.contains("hero-main") || tile?.dataset.subject === "Summary";

  function setPanelHeights(tile) {
    const panel = tile.querySelector(".panel");
    if (!panel) return;

    const prev = panel.style.maxHeight;
    panel.style.maxHeight = "none";
    const h = Math.ceil(panel.scrollHeight);
    panel.style.maxHeight = prev;

    tile.style.setProperty("--panel-open", h + "px");
  }

  const measureAll = () => tiles.forEach(setPanelHeights);

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

    if (tile.id === "resume") {
      const wrap = $("#resumePreviewWrap");
      if (wrap) {
        wrap.classList.add("expanded");
        wrap.classList.remove("collapsed");
      }
      window.dispatchEvent(new Event("scroll"));
    }

    const subject = tile.dataset.subject || tile.id || "Section";
    const achKey = "target_" + (tile.id || Math.random().toString(16).slice(2));

    unlock(achKey, "Section Opened", subject, { silent: true });
    awardPoints(SECTION_UNLOCK_POINTS, "SECTION OPENED", subject);

    tile.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleResumePreview(btn) {
    const wrap = $("#resumePreviewWrap");
    if (!wrap) return;

    const isExpanded = wrap.classList.toggle("expanded");
    wrap.classList.toggle("collapsed", !isExpanded);

    btn.setAttribute("aria-expanded", isExpanded ? "true" : "false");

    const sub = btn.querySelector(".target-sub");
    if (sub) sub.textContent = isExpanded ? "Shoot to collapse" : "Shoot to expand";

    window.dispatchEvent(new Event("scroll"));

    const tile = btn.closest(".tile");
    if (tile) setPanelHeights(tile);
  }

  measureAll();
  window.addEventListener("load", () => { measureAll(); requestAnimationFrame(measureAll); }, { passive: true });
  window.addEventListener("resize", measureAll, { passive: true });

  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest(".target") : null;
    if (!btn) return;

    if (btn.dataset.action === "resumeExpand") return toggleResumePreview(btn);
    if (btn.classList.contains("main-target")) return unlockFromMainTarget(btn);
  }, { passive: true });

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

/* ---------- Hamburger nav ---------- */
(() => {
  const navMenu = $("#navMenu");
  const panel = $("#navMenu .nav-panel");
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

  document.addEventListener("pointerdown", (e) => {
    if (!navMenu.open) return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest("#navMenu")) return;
    navMenu.open = false;
  }, { capture: true });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") navMenu.open = false;
  });
})();

/* ---------- Game Targets (Option A: mobile OR no-side-space = no spawn + hide layer) ---------- */
(() => {
  const layer = $("#gameLayer");
  if (!layer) return;

  // "OFF" means: no targets + hide layer (mobile, touch, portrait monitor, narrow layout...)
  const isOffLayout = () => isMobileNow();

  let offActive = false;

  // ✅ desktop perf cfg
  const getCfg = () => ({
    MIN: 5,
    MAX: 10,
    FPS: 60,
    SIZE: 54,
    PAD: 10,
    POINTS_PER_HIT: 100,
  });

  const arcadeMotionEnabled = () => arcadeMode; // when ON layout, arcadeMode controls motion

  let cachedBlocks = [];
  let blocksDirty = true;

  let ents = [];
  let raf = null;
  let last = 0;
  let lastFrameTime = 0;
  let frameCount = 0;

  let targetGoal = 0;
  let respawnRAF = null;
  let enforceRAF = null;

  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function viewportInfo() {
    const vv = window.visualViewport;
    const w = vv?.width ?? innerWidth;
    const h = vv?.height ?? innerHeight;
    const ox = vv?.offsetLeft ?? 0;
    const oy = vv?.offsetTop ?? 0;
    return { w, h, ox, oy };
  }

  function worldBounds(cfg) {
    const { w, h, ox, oy } = viewportInfo();
    return { l: cfg.PAD + ox, t: cfg.PAD + oy, r: ox + w - cfg.PAD, b: oy + h - cfg.PAD };
  }

  const candidateRect = (cfg, x, y) => ({ l: x, t: y, r: x + cfg.SIZE, b: y + cfg.SIZE });

  function computeProtectedRects() {
    const blocks = [];
    const { w: vw, h: vh, ox, oy } = viewportInfo();
    const view = { l: ox, t: oy, r: ox + vw, b: oy + vh };

    const pushIfVisible = (el, pad) => {
      if (!el) return;
      const r = rectOf(el);
      const rw = r.r - r.l;
      const rh = r.b - r.t;
      if (rw <= 10 || rh <= 10) return;
      if (!intersects(r, view)) return;
      blocks.push(expandRect(r, pad));
    };

    $$(".tile.locked .target.main-target").forEach((t) => pushIfVisible(t, 10));
    pushIfVisible($(".topbar"), 6);
    pushIfVisible($("footer .container"), 8);
    $$(".tile.unlocked .panel").forEach((p) => pushIfVisible(p, 8));

    const resumeWrap = $("#resumePreviewWrap");
    if (resumeWrap?.classList.contains("expanded")) pushIfVisible(resumeWrap, 8);

    const settingsPanel = $("#settingsMenu[open] .settings-panel");
    pushIfVisible(settingsPanel, 8);

    if (toastHost) pushIfVisible(toastHost, 8);

    return blocks.filter((r) => {
      const rw = Math.max(0, r.r - r.l);
      const rh = Math.max(0, r.b - r.t);
      return !(rw > vw * 0.98 && rh > vh * 0.9);
    });
  }

  function overlapsLiveTargets(cfg, rr) {
    for (const e of ents) {
      if (!e.alive) continue;
      if (intersects(rr, candidateRect(cfg, e.x, e.y))) return true;
    }
    return false;
  }

  function isValidSpawn(cfg, bounds, blocks, x, y) {
    const rr = candidateRect(cfg, x, y);
    if (rr.l < bounds.l || rr.t < bounds.t || rr.r > bounds.r || rr.b > bounds.b) return false;
    if (blocks.some((b) => intersects(rr, b))) return false;
    if (overlapsLiveTargets(cfg, rr)) return false;
    return true;
  }

  function pickSpawnPoint(cfg, bounds, blocks) {
    const maxX = Math.max(bounds.l, bounds.r - cfg.SIZE);
    const maxY = Math.max(bounds.t, bounds.b - cfg.SIZE);

    for (let tries = 0; tries < 1400; tries++) {
      const x = randInt(bounds.l, maxX);
      const y = randInt(bounds.t, maxY);
      if (isValidSpawn(cfg, bounds, blocks, x, y)) return { x, y };
    }
    return null;
  }

  function setPos(ent) {
    ent.el.style.transform = `translate(${ent.x}px, ${ent.y}px)`;
  }

  function giveVelocity(ent) {
    const baseSpeed = 180;
    const speed = baseSpeed + Math.random() * 140;
    const ang = Math.random() * Math.PI * 2;
    ent.vx = Math.cos(ang) * speed;
    ent.vy = Math.sin(ang) * speed;
  }

  function reflectVelocity(ent, nx, ny) {
    const vdot = ent.vx * nx + ent.vy * ny;
    ent.vx = ent.vx - 2 * vdot * nx;
    ent.vy = ent.vy - 2 * vdot * ny;
  }

  function rectOverlapDepth(a, b) {
    const left = a.r - b.l;
    const right = b.r - a.l;
    const top = a.b - b.t;
    const bottom = b.b - a.t;
    return { left, right, top, bottom };
  }

  function resolveAgainstBlocks(ent, blocks, bounds, cfg) {
    if (!blocks.length) return;

    for (let iter = 0; iter < 5; iter++) {
      const rr = candidateRect(cfg, ent.x, ent.y);
      const hit = blocks.find((b) => intersects(rr, b));
      if (!hit) return;

      const d = rectOverlapDepth(rr, hit);

      let dx = -d.left, dy = 0, min = d.left;
      if (d.right < min) { min = d.right; dx = d.right; dy = 0; }
      if (d.top < min) { min = d.top; dx = 0; dy = -d.top; }
      if (d.bottom < min) { min = d.bottom; dx = 0; dy = d.bottom; }

      const eps = 0.75;
      if (dx !== 0) ent.x += dx + Math.sign(dx) * eps;
      if (dy !== 0) ent.y += dy + Math.sign(dy) * eps;

      let nx = 0, ny = 0;
      if (dx !== 0) nx = Math.sign(dx);
      else ny = Math.sign(dy);

      reflectVelocity(ent, nx, ny);

      ent.x = clamp(ent.x, bounds.l, bounds.r - ent.w);
      ent.y = clamp(ent.y, bounds.t, bounds.b - ent.h);
    }
  }

  const aliveCount = () => ents.reduce((n, e) => n + (e.alive ? 1 : 0), 0);

  function start() {
    stop();
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function clearAll() {
    stop();
    if (respawnRAF) cancelAnimationFrame(respawnRAF);
    if (enforceRAF) cancelAnimationFrame(enforceRAF);
    respawnRAF = null;
    enforceRAF = null;
    ents = [];
    layer.innerHTML = "";
  }

  function hit(ent) {
    if (!ent.alive) return;
    ent.alive = false;

    const cfg = getCfg();
    awardPoints(cfg.POINTS_PER_HIT, "TARGET HIT", "Bullseye", { toastMs: 1200 });

    const r = ent.el.getBoundingClientRect();
    shatterAt(r.left + r.width / 2, r.top + r.height / 2, 22);
    playBreakAudio();

    ent.el.classList.add("hit");
    setTimeout(() => {
      try { ent.el.remove(); } catch {}
      ents = ents.filter((x) => x !== ent);
      scheduleRespawn();
    }, 260);
  }

  function enforceNoCollisions() {
    if (offActive) return;

    const cfg = getCfg();
    const bounds = worldBounds(cfg);
    const blocks = computeProtectedRects();

    for (const e of ents) {
      if (!e.alive) continue;

      if (!arcadeMotionEnabled()) {
        e.vx = 0;
        e.vy = 0;
        e.x = clamp(e.x, bounds.l, bounds.r - e.w);
        e.y = clamp(e.y, bounds.t, bounds.b - e.h);
      } else {
        resolveAgainstBlocks(e, blocks, bounds, cfg);
      }
      setPos(e);
    }
  }

  function fillToGoal() {
    if (offActive) return;

    const cfg = getCfg();
    const bounds = worldBounds(cfg);
    const blocks = computeProtectedRects();

    while (aliveCount() < targetGoal) {
      const p = pickSpawnPoint(cfg, bounds, blocks);
      if (!p) break;

      const el = document.createElement("button");
      el.type = "button";
      el.className = "game-target";
      el.setAttribute("aria-label", "Target");
      layer.appendChild(el);

      const ent = { el, alive: true, x: p.x, y: p.y, vx: 0, vy: 0, w: cfg.SIZE, h: cfg.SIZE };
      if (arcadeMotionEnabled()) giveVelocity(ent);

      setPos(ent);
      ents.push(ent);
    }
  }

  function scheduleRespawn() {
    if (offActive) return;
    if (respawnRAF) return;
    respawnRAF = requestAnimationFrame(() => {
      respawnRAF = null;
      enforceNoCollisions();
      fillToGoal();
    });
  }

  function spawnInitialWave() {
    clearAll();
    if (offActive) return;

    const cfg = getCfg();
    targetGoal = randInt(cfg.MIN, cfg.MAX);

    fillToGoal();
    enforceNoCollisions();
    fillToGoal();

    start();
  }

  function tick(t) {
    if (offActive) return;

    const cfg = getCfg();
    const interval = 1000 / cfg.FPS;

    if (t - lastFrameTime < interval) {
      raf = requestAnimationFrame(tick);
      return;
    }
    lastFrameTime = t;

    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    if (!arcadeMotionEnabled()) {
      raf = requestAnimationFrame(tick);
      return;
    }

    frameCount++;

    const bounds = worldBounds(cfg);

    const refreshEvery = 3;
    if (frameCount % refreshEvery === 0 || blocksDirty) {
      cachedBlocks = computeProtectedRects();
      blocksDirty = false;
    }
    const blocks = cachedBlocks;

    for (const e of ents) {
      if (!e.alive) continue;

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (e.x <= bounds.l) { e.x = bounds.l; if (e.vx < 0) e.vx = -e.vx; }
      else if (e.x + e.w >= bounds.r) { e.x = bounds.r - e.w; if (e.vx > 0) e.vx = -e.vx; }

      if (e.y <= bounds.t) { e.y = bounds.t; if (e.vy < 0) e.vy = -e.vy; }
      else if (e.y + e.h >= bounds.b) { e.y = bounds.b - e.h; if (e.vy > 0) e.vy = -e.vy; }

      if (blocks.length) resolveAgainstBlocks(e, blocks, bounds, cfg);

      setPos(e);
    }

    raf = requestAnimationFrame(tick);
  }

  // Pointer handler (will early-out when offActive)
  document.addEventListener("pointerdown", (e) => {
    if (offActive) return;

    const el = e.target instanceof Element ? e.target : null;
    if (el && el.closest(".topbar, footer, a, button:not(.game-target):not(.target), .btn, .card, .card *, input, textarea, select")) {
      return;
    }

    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    const btn = stack.find((n) => n instanceof Element && n.classList?.contains("game-target"));
    if (!btn) return;

    const ent = ents.find((en) => en.el === btn);
    if (!ent) return;

    hit(ent);
    e.preventDefault();
    e.stopPropagation();
  }, { capture: true, passive: false });

  function scheduleEnforce() {
    if (offActive) return;
    if (enforceRAF) return;
    enforceRAF = requestAnimationFrame(() => {
      enforceRAF = null;
      blocksDirty = true;
      enforceNoCollisions();
      scheduleRespawn();
    });
  }

  const onLayoutChange = () => {
    blocksDirty = true;
    scheduleEnforce();
  };

  window.addEventListener("scroll", onLayoutChange, { passive: true });
  window.addEventListener("resize", onLayoutChange, { passive: true });
  window.visualViewport?.addEventListener("resize", onLayoutChange, { passive: true });
  window.visualViewport?.addEventListener("scroll", onLayoutChange, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(onLayoutChange, 250), { passive: true });

  const mo = new MutationObserver(() => {
    arcadeMode = root.dataset.arcade === "1";
    applyMusicState();

    if (offActive) return;

    if (arcadeMotionEnabled()) {
      ents.forEach((e) => { if (e.alive && e.vx === 0 && e.vy === 0) giveVelocity(e); });
      start();
    } else {
      ents.forEach((e) => { e.vx = 0; e.vy = 0; setPos(e); });
      if (!raf) start();
    }

    scheduleEnforce();
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-arcade"] });

  // ✅ Dynamic enable/disable when layout changes (mobile <-> desktop, portrait <-> landscape, etc.)
  function reconcileOffLayout() {
    const shouldOff = isOffLayout();

    if (shouldOff === offActive) {
      // still update CSS state (e.g. aria/display) just in case
      layer.style.display = shouldOff ? "none" : "";
      layer.toggleAttribute("aria-hidden", shouldOff);
      return;
    }

    offActive = shouldOff;

    layer.style.display = offActive ? "none" : "";
    layer.toggleAttribute("aria-hidden", offActive);

    if (offActive) {
      clearAll();
    } else {
      spawnInitialWave();
      scheduleEnforce();
    }
  }

  // init
  reconcileOffLayout();
  if (!offActive) spawnInitialWave();

  // watch for changes
  mqMobile.addEventListener?.("change", reconcileOffLayout);
  window.addEventListener("resize", reconcileOffLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", reconcileOffLayout, { passive: true });
  window.visualViewport?.addEventListener("scroll", reconcileOffLayout, { passive: true });
  window.addEventListener("orientationchange", () => setTimeout(reconcileOffLayout, 250), { passive: true });
})();
