/* =========================================================
   main.js (desktop preserved + mobile friendly + settings fixed)
   + Points rewards:
     - +250 points when unlocking a section
     - every 1000 points: motivational toast
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
const isCoarse = matchMedia?.("(pointer: coarse)")?.matches || "ontouchstart" in window;

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
const LS_ARCADE = "arcadeMode";
const LS_FX = "fxHigh";
const LS_SFX_ON = "sfxOn";
const LS_MUSIC_ON = "musicOn";
const LS_POINTS = "points_v1";
const LS_ACH = "achievements_v3";
/* NEW: store last thousand milestone we toasted */
const LS_MILESTONE = "points_milestone_v1";

/* ---------- State ---------- */
let arcadeMode = (lsGet(LS_ARCADE) ?? "0") === "1";
let fxHigh = (lsGet(LS_FX) ?? "0") === "1";
let sfxOn = (lsGet(LS_SFX_ON) ?? "1") === "1";
let musicOn = (lsGet(LS_MUSIC_ON) ?? "0") === "1";

root.dataset.arcade = arcadeMode ? "1" : "0";
root.dataset.fx = fxHigh ? "1" : "0";

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

/* ---------- Motivational quotes every 1000 points ---------- */
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

/* ---------- Points ---------- */
let points = 0;
const pointsEl = document.getElementById("pointsValue");

// Points reset every page load
points = 0;
if (pointsEl) pointsEl.textContent = "0";
checkPointMilestone();

function renderPoints() { if (pointsEl) pointsEl.textContent = String(points); }

function addPoints(n){
  points = Math.max(0, points + n);
  renderPoints();
  checkPointMilestone();
}

function resetPoints(){
  points = 0;
  renderPoints();

  lastMilestone = 0;
  lsSet(LS_MILESTONE, "0");
}
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
  if (isCoarse) return false;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.innerWidth < 860) return false;
  return true;
}

window.addEventListener("pointermove", (e) => {
  const xPct = (e.clientX / window.innerWidth) * 100;
  const yPct = (e.clientY / window.innerHeight) * 100;
  root.style.setProperty("--mx", xPct.toFixed(2) + "%");
  root.style.setProperty("--my", yPct.toFixed(2) + "%");

  if (reticle && !isCoarse) {
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

/* ---------- Settings dropdown: close only by gear/outside/esc (no auto close on toggle) ---------- */
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

/* ---------- Settings toggles ---------- */
(() => {
  const arcadeBtn = document.getElementById("arcadeToggle");
  const fxBtn = document.getElementById("fxToggle");
  const sfxBtn = document.getElementById("sfxToggle");
  const musicBtn = document.getElementById("musicToggle");

  function syncToggleUI() {
    if (arcadeBtn) {
      arcadeBtn.setAttribute("aria-pressed", arcadeMode ? "true" : "false");
      arcadeBtn.textContent = `ARCADE: ${arcadeMode ? "ON" : "OFF"}`;
    }
    if (fxBtn) {
      fxBtn.setAttribute("aria-pressed", fxHigh ? "true" : "false");
      fxBtn.textContent = `FX: ${fxHigh ? "HIGH" : "LOW"}`;
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
    root.dataset.fx = fxHigh ? "1" : "0";
  }

  syncToggleUI();

  arcadeBtn?.addEventListener("click", () => {
    arcadeMode = !arcadeMode;
    lsSet(LS_ARCADE, arcadeMode ? "1" : "0");
    syncToggleUI();
    unlock("arcade", "Arcade Mode", arcadeMode ? "Enabled." : "Disabled.");
    bleep(520, 0.05, "sawtooth", 0.8);
  });

  fxBtn?.addEventListener("click", () => {
    fxHigh = !fxHigh;
    lsSet(LS_FX, fxHigh ? "1" : "0");
    syncToggleUI();
    unlock("fx_toggle", "FX", fxHigh ? "High effects." : "Low effects.");
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
  });

  if (!isCoarse) {
    document.addEventListener("pointerdown", (e) => {
      if (!sfxOn) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("a, button, .btn")) bleep(520, 0.04, "square", 0.75);
    }, { passive: true });
  }
})();

/* ---------- Muzzle ---------- */
function muzzleFlash(x, y) {
  if (!muzzle || !fxHigh) return;
  if (isCoarse) return;
  muzzle.style.left = x + "px";
  muzzle.style.top = y + "px";
  muzzle.classList.remove("fire");
  void muzzle.offsetWidth;
  muzzle.classList.add("fire");
}

/* ---------- Particles ---------- */
const fx = document.getElementById("fx");
const ctx2 = fx?.getContext("2d");

let rafId = null;
let running = false;
let lastT = 0;

const particleCap = 600;
const particles = [];

function resizeFx() {
  if (!fx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = Math.floor(innerWidth * dpr);
  fx.height = Math.floor(innerHeight * dpr);
  fx.style.width = innerWidth + "px";
  fx.style.height = innerHeight + "px";
  if (ctx2) ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeFx, { passive: true });
resizeFx();

function startFX() {
  if (running) return;
  running = true;
  lastT = performance.now();
  rafId = requestAnimationFrame(tick);
}
function stopFX() {
  if (!running) return;
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function spawn(x, y, n = 18, power = 1) {
  if (!ctx2 || !fxHigh) return;

  if (innerWidth < 980) n = Math.max(6, Math.floor(n * 0.6));

  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (Math.random() * 2.6 + 1.2) * power;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      r: Math.random() * 2.2 + 0.8,
      hue: [190, 310, 95][Math.floor(Math.random() * 3)],
    });
  }

  if (particles.length > particleCap) particles.splice(0, particles.length - particleCap);
  startFX();
}

function tick(t) {
  if (!ctx2) return stopFX();
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  ctx2.clearRect(0, 0, innerWidth, innerHeight);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.9 * dt;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy = p.vy * 0.98 + 0.03;

    if (p.life <= 0) { particles.splice(i, 1); continue; }

    ctx2.globalAlpha = Math.max(p.life, 0);
    ctx2.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.life})`;
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx2.fill();
  }
  ctx2.globalAlpha = 1;

  if (!particles.length) return stopFX();
  rafId = requestAnimationFrame(tick);
}

if (!isCoarse) {
  document.addEventListener("pointerdown", (e) => {
    spawn(e.clientX, e.clientY, arcadeMode ? 22 : 12, arcadeMode ? 1.05 : 0.85);
  }, { passive: true });
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

    // +250 points for unlocking a section
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

    const expanded = wrap.classList.toggle("expanded");
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");

    const sub = btn.querySelector(".target-sub");
    if (sub) {
      const word = isCoarse ? "Tap" : "Shoot";
      sub.textContent = expanded ? `${word} to collapse` : `${word} to expand`;
    }

    const tile = btn.closest(".tile");
    if (tile) setPanelHeights(tile);
  }

  if (isCoarse) {
    document.querySelectorAll(".target.main-target .target-sub").forEach((el) => (el.textContent = "Tap to reveal"));
    document.querySelectorAll('.target[data-action="resumeExpand"] .target-sub').forEach((el) => (el.textContent = "Tap to expand"));
  }

  measureAll();
  window.addEventListener("load", () => { measureAll(); requestAnimationFrame(measureAll); }, { passive: true });
  window.addEventListener("resize", () => measureAll(), { passive: true });

  // Mobile: tap buttons
  if (isCoarse) {
    document.addEventListener("click", (e) => {
      const btn = e.target instanceof Element ? e.target.closest(".target") : null;
      if (!btn) return;

      if (btn.dataset.action === "resumeExpand") return toggleResumePreview(btn);
      if (btn.classList.contains("main-target")) return unlockFromMainTarget(btn);
    }, { passive: true });

    return;
  }

  // Desktop: shoot
  function shootAt(x, y) {
    bleep(180, 0.035, "square", 1.0);
    bleep(90, 0.02, "sine", 0.7);

    const sx = reticle ? parseFloat(reticle.style.left) || x : x;
    const sy = reticle ? parseFloat(reticle.style.top) || y : y;

    muzzleFlash(sx, sy);
    spawn(x, y, arcadeMode ? 18 : 10, arcadeMode ? 1.05 : 0.85);

    const stack = document.elementsFromPoint(x, y);
    const hitTarget = stack.find((n) => n instanceof Element && n.classList?.contains("target"));
    if (!hitTarget) return;

    if (hitTarget.dataset.action === "resumeExpand") return toggleResumePreview(hitTarget);
    if (hitTarget.classList.contains("main-target")) return unlockFromMainTarget(hitTarget);
  }

  document.addEventListener("pointerdown", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    if (el && el.closest(".topbar, footer, a, button:not(.target), .btn, .card, .card *, input, textarea, select")) return;
    shootAt(e.clientX, e.clientY);
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
    shootAt(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
  });
})();

/* ---------- HUD ---------- */
(() => {
  const hud = document.getElementById("targetsHud");
  if (!hud) return;

  const items = [
    { label: "Summary", sel: "#summary" },
    { label: "Profile", sel: "#about" },
    { label: "Projects", sel: "#projects" },
    { label: "Resume", sel: "#resume" },
    { label: "Contact", sel: "#contact" },
  ];

  hud.innerHTML = items.map((i) => `<button class="hud-target" type="button" data-target="${i.sel}">${i.label}</button>`).join("");
  const btns = Array.from(hud.querySelectorAll(".hud-target"));

  function topbarH() {
    const topbar = document.querySelector(".topbar");
    return topbar ? Math.ceil(topbar.getBoundingClientRect().height) : 70;
  }
  function containerLeft() {
    const c = document.querySelector(".container");
    return c ? c.getBoundingClientRect().left : 0;
  }

  function dockDesktop() {
    if (isCoarse) return; // mobile bottom nav is handled by CSS
    const padX = 12;
    const gap = 6;
    const y0 = topbarH() + 18;
    const gutterRight = Math.max(padX, Math.floor(containerLeft() - padX));

    let y = y0;
    btns.forEach((btn) => {
      btn.style.left = "0px";
      btn.style.top = "0px";
      btn.style.transform = `translate(${padX}px, ${y}px)`;
      const r = btn.getBoundingClientRect();
      btn.style.display = r.right > gutterRight ? "none" : "";
      y += r.height + gap;
    });
  }

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const sel = btn.getAttribute("data-target") || "";
      document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!isCoarse) bleep(660, 0.03, "square", 0.55);
    }, { passive: true });
  });

  window.addEventListener("resize", dockDesktop, { passive: true });
  window.addEventListener("load", dockDesktop, { passive: true });
  dockDesktop();
})();

/* ---------- Game Targets: desktop only (Arcade = DVD bounce) ---------- */
(() => {
  if (isCoarse) return;

  const layer = document.getElementById("gameLayer");
  if (!layer) return;

  const MIN = 5, MAX = 10;
  const POINTS_PER_HIT = 10;
  const SIZE = 54;
  const PAD = 10;

  let ents = [];
  let raf = null;
  let last = 0;

  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

  function candidateRect(x, y) { return { l: x, t: y, r: x + SIZE, b: y + SIZE }; }

  function protectedRects() {
    const blocks = [];
    const bento = document.querySelector(".bento");
    if (bento) blocks.push(expandRect(rectOf(bento), 8));
    const topbar = document.querySelector(".topbar");
    if (topbar) blocks.push(expandRect(rectOf(topbar), 6));
    const footerC = document.querySelector("footer .container");
    if (footerC) blocks.push(expandRect(rectOf(footerC), 8));
    document.querySelectorAll("#targetsHud .hud-target").forEach((btn) => blocks.push(expandRect(rectOf(btn), 10)));
    return blocks;
  }

  function worldBounds() { return { l: PAD, t: PAD, r: innerWidth - PAD, b: innerHeight - PAD }; }

  function overlapsLiveTargets(rr) {
    for (const e of ents) {
      if (!e.alive) continue;
      if (intersects(rr, candidateRect(e.x, e.y))) return true;
    }
    return false;
  }

  function isValidSpawn(x, y) {
    const bounds = worldBounds();
    const rr = candidateRect(x, y);
    if (rr.l < bounds.l || rr.t < bounds.t || rr.r > bounds.r || rr.b > bounds.b) return false;
    const blocks = protectedRects();
    if (blocks.some((b) => intersects(rr, b))) return false;
    if (overlapsLiveTargets(rr)) return false;
    return true;
  }

  function pickSpawnPoint() {
    const bounds = worldBounds();
    for (let tries = 0; tries < 1400; tries++) {
      const x = randInt(bounds.l, Math.max(bounds.l, bounds.r - SIZE));
      const y = randInt(bounds.t, Math.max(bounds.t, bounds.b - SIZE));
      if (isValidSpawn(x, y)) return { x, y };
    }
    return null;
  }

  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function setPos(e) { e.el.style.transform = `translate(${e.x}px, ${e.y}px)`; }
  function clearWave() { stop(); ents = []; layer.innerHTML = ""; }
  function waveCleared() { return ents.length > 0 && ents.every((e) => !e.alive); }

  function hit(e) {
    if (!e.alive) return;
    e.alive = false;

    addPoints(POINTS_PER_HIT);
    bleep(740, 0.04, "square", 0.75);

    e.el.classList.add("hit");
    setTimeout(() => {
      try { e.el.remove(); } catch { }
      if (waveCleared()) setTimeout(spawnWave, 500);
    }, 260);
  }

  function giveVelocity(ent) {
    // DVD-style: constant speed, diagonal-ish
    const speed = 180 + Math.random() * 170; // px/s
    const ang = Math.random() * Math.PI * 2;
    ent.vx = Math.cos(ang) * speed;
    ent.vy = Math.sin(ang) * speed;
  }

  function spawnWave() {
    clearWave();

    const count = randInt(MIN, MAX);
    for (let i = 0; i < count; i++) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "game-target";
      el.textContent = String(i + 1);
      layer.appendChild(el);

      const p = pickSpawnPoint();
      if (!p) { el.remove(); break; }

      const ent = {
        el,
        alive: true,
        x: p.x,
        y: p.y,
        vx: 0,
        vy: 0,
        w: SIZE,
        h: SIZE,
      };

      // If arcade is on at spawn time, start moving
      if (arcadeMode) giveVelocity(ent);

      setPos(ent);
      el.addEventListener("click", () => hit(ent), { passive: true });
      ents.push(ent);
    }

    if (arcadeMode) start();
  }

  function tick(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    const bounds = worldBounds();
    const blocks = protectedRects();

    for (const e of ents) {
      if (!e.alive) continue;

      // if arcade toggled off, freeze
      if (!arcadeMode) {
        e.vx = 0; e.vy = 0;
        setPos(e);
        continue;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // bounce on screen edges (DVD)
      if (e.x <= bounds.l) { e.x = bounds.l; e.vx *= -1; }
      if (e.y <= bounds.t) { e.y = bounds.t; e.vy *= -1; }
      if (e.x + e.w >= bounds.r) { e.x = bounds.r - e.w; e.vx *= -1; }
      if (e.y + e.h >= bounds.b) { e.y = bounds.b - e.h; e.vy *= -1; }

      // bounce away from protected rects
      const rr = { l: e.x, t: e.y, r: e.x + e.w, b: e.y + e.h };
      if (blocks.some((b) => intersects(rr, b))) {
        // revert and flip direction
        e.x -= e.vx * dt;
        e.y -= e.vy * dt;
        e.vx *= -1;
        e.vy *= -1;
      }

      setPos(e);
    }

    raf = requestAnimationFrame(tick);
  }

  function start() {
    stop();
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // Priority hit handler
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

  // Re-clamp positions on resize
  window.addEventListener("resize", () => {
    const bounds = worldBounds();
    ents.forEach((e) => {
      if (!e.alive) return;
      e.x = clamp(e.x, bounds.l, bounds.r - e.w);
      e.y = clamp(e.y, bounds.t, bounds.b - e.h);
      setPos(e);
    });
  }, { passive: true });

  // IMPORTANT: keep arcadeMode in sync when the button changes root.dataset.arcade
  const mo = new MutationObserver(() => {
    arcadeMode = root.dataset.arcade === "1";

    if (arcadeMode) {
      // give velocities to any live stationary targets
      ents.forEach((e) => {
        if (!e.alive) return;
        if (e.vx === 0 && e.vy === 0) giveVelocity(e);
      });
      start();
    } else {
      stop();
      ents.forEach((e) => { e.vx = 0; e.vy = 0; setPos(e); });
    }
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-arcade"] });

  spawnWave();
})();
