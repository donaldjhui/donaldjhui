// Year (defensive)
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Elements
const root = document.documentElement;
const hero = document.querySelector(".hero-main");

// Storage keys
const LS_ARCADE = "arcadeMode";
const LS_FX = "fxHigh";          // "1" HIGH, "0" LOW
const LS_SFX_ON = "sfxOn";       // "1" ON, "0" OFF
const LS_MUSIC_ON = "musicOn";   // "1" ON, "0" OFF

// Points (reset on every page load)
const LS_POINTS = "points_v1";
let points = 0;
try { localStorage.setItem(LS_POINTS, "0"); } catch {}

const pointsEl = document.getElementById("pointsValue");
function renderPoints() {
  if (pointsEl) pointsEl.textContent = String(points);
}
function addPoints(n) {
  points += n;
  if (points < 0) points = 0;
  try { localStorage.setItem(LS_POINTS, String(points)); } catch {}
  renderPoints();
}
function resetPoints() {
  points = 0;
  try { localStorage.setItem(LS_POINTS, "0"); } catch {}
  renderPoints();
}
renderPoints();

// State
let arcadeMode = false; // default OFF (ignores saved state)
try { localStorage.setItem(LS_ARCADE, "0"); } catch {}

let fxHigh = null;
try { fxHigh = localStorage.getItem(LS_FX); } catch {}
fxHigh = fxHigh === null ? false : fxHigh === "1"; // default LOW

// Defaults: SFX ON (responsive), MUSIC OFF (professional)
let sfxOn = null;
try { sfxOn = localStorage.getItem(LS_SFX_ON); } catch {}
sfxOn = sfxOn === null ? true : sfxOn === "1";

let musicOn = null;
try { musicOn = localStorage.getItem(LS_MUSIC_ON); } catch {}
musicOn = musicOn === null ? false : musicOn === "1";

root.dataset.arcade = arcadeMode ? "1" : "0";
root.dataset.fx = fxHigh ? "1" : "0";

// Pointer reactive tilt (disabled in FX low / reduced motion / small screens)
function shouldTilt() {
  if (!fxHigh) return false;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.innerWidth < 860) return false;
  return true;
}

window.addEventListener("pointermove", (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  root.style.setProperty("--mx", x.toFixed(2) + "%");
  root.style.setProperty("--my", y.toFixed(2) + "%");

  if (!hero || !shouldTilt()) return;
  const rect = hero.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (e.clientX - cx) / rect.width;
  const dy = (e.clientY - cy) / rect.height;

  root.style.setProperty("--tiltY", (dx * 6).toFixed(2) + "deg");
  root.style.setProperty("--tiltX", (-dy * 6).toFixed(2) + "deg");
}, { passive: true });

// Unique noise per page load (no external files)
(function makeNoise() {
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

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) e.target.classList.add("in");
  }
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => {
  try { io.observe(el); } catch {}
});

// Boot overlay
const boot = document.getElementById("boot");
function dismissBoot() {
  if (!boot) return;
  boot.classList.add("off");
  setTimeout(() => boot.remove(), 550);
}
if (boot) {
  window.addEventListener("load", () => setTimeout(dismissBoot, 900));
  boot.addEventListener("pointerdown", dismissBoot, { passive: true });
  window.addEventListener("keydown", dismissBoot, { once: true });
}

// Scroll XP bar
const xpFill = document.getElementById("xpFill");
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

// Reticle follow (always)
const reticle = document.querySelector(".reticle");
window.addEventListener("pointermove", (e) => {
  if (!reticle) return;
  reticle.style.left = e.clientX + "px";
  reticle.style.top = e.clientY + "px";
}, { passive: true });

/* ----------------------------
   SFX (WebAudio) — separate from Music (ON/OFF)
-----------------------------*/
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

const SFX_BASE_GAIN = 0.13;

function sfxGain() {
  return sfxOn ? SFX_BASE_GAIN : 0;
}

function bleep(freq = 660, dur = 0.05, type = "sine", gainMult = 1) {
  const base = sfxGain();
  if (base <= 0) return;
  const ctx = ensureAudio();
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();

  o.type = type;
  o.frequency.setValueAtTime(freq, t0);

  const peak = Math.min(0.9, base * gainMult);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/* ----------------------------
   Toasts / Achievements
-----------------------------*/
const toastHost = document.getElementById("toast");
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

const LS_ACH = "achievements_v3";
let achievedArr = [];
try { achievedArr = JSON.parse(localStorage.getItem(LS_ACH) || "[]"); } catch {}
const achieved = new Set(achievedArr);

function unlock(key, title, msg) {
  if (achieved.has(key)) return;
  achieved.add(key);
  try { localStorage.setItem(LS_ACH, JSON.stringify([...achieved])); } catch {}
  toast("ACHIEVEMENT UNLOCKED", `${title} — ${msg}`);

  if (arcadeMode) {
    bleep(196, 0.06, "sawtooth", 1.1);
    bleep(392, 0.07, "square", 1.0);
    bleep(784, 0.06, "square", 1.0);
    spawn(Math.min(innerWidth - 70, innerWidth * 0.88), Math.min(innerHeight - 70, innerHeight * 0.86), 42, 1.15);
  } else {
    bleep(880, 0.05, "square", 0.9);
    bleep(1320, 0.045, "square", 0.8);
    spawn(Math.min(innerWidth - 70, innerWidth * 0.88), Math.min(innerHeight - 70, innerHeight * 0.86), 16, 0.9);
  }
}

/* ----------------------------
   Background music (Two-track + crossfade) — ON/OFF
-----------------------------*/
const bgmAmbient = document.getElementById("bgmAmbient");
const bgmArcade = document.getElementById("bgmArcade");
let bgmUnlocked = false;

const MUSIC_VOL = 0.16;

function musicBaseVolume() {
  return musicOn ? MUSIC_VOL : 0.0;
}
function targetVolumes() {
  const base = musicBaseVolume();
  return arcadeMode ? { ambient: 0.0, arcade: base } : { ambient: base, arcade: 0.0 };
}
function setImmediateVolumes() {
  const { ambient, arcade } = targetVolumes();
  if (bgmAmbient) bgmAmbient.volume = ambient;
  if (bgmArcade) bgmArcade.volume = arcade;
}
async function tryPlay(el) {
  if (!el) return false;
  try { await el.play(); return true; } catch { return false; }
}
function stopAllBgm() {
  if (bgmAmbient) { try { bgmAmbient.pause(); } catch {} }
  if (bgmArcade) { try { bgmArcade.pause(); } catch {} }
}
function ensureBgmState() {
  if (!musicOn) {
    stopAllBgm();
    setImmediateVolumes();
    return;
  }
  Promise.all([tryPlay(bgmAmbient), tryPlay(bgmArcade)]).then((res) => {
    if (res.some(Boolean)) bgmUnlocked = true;
    setImmediateVolumes();
  });
}

let fadeRAF = null;
function crossfadeToTargets(durationMs = 900) {
  if (!musicOn) {
    stopAllBgm();
    setImmediateVolumes();
    return;
  }

  ensureBgmState();

  const start = performance.now();
  const fromA = bgmAmbient ? bgmAmbient.volume : 0;
  const fromB = bgmArcade ? bgmArcade.volume : 0;
  const { ambient: toA, arcade: toB } = targetVolumes();

  if (fadeRAF) cancelAnimationFrame(fadeRAF);

  const tick = (t) => {
    const p = Math.min(1, (t - start) / durationMs);
    const e = p * p * (3 - 2 * p);

    const a = fromA + (toA - fromA) * e;
    const b = fromB + (toB - fromB) * e;

    if (bgmAmbient) bgmAmbient.volume = a;
    if (bgmArcade) bgmArcade.volume = b;

    if (p < 1) fadeRAF = requestAnimationFrame(tick);
  };
  fadeRAF = requestAnimationFrame(tick);
}

function syncBgmWithMusic() {
  if (!musicOn) {
    stopAllBgm();
    setImmediateVolumes();
    return;
  }
  ensureBgmState();
  crossfadeToTargets(350);
}
function syncBgmWithArcade() {
  if (!musicOn) {
    stopAllBgm();
    setImmediateVolumes();
    return;
  }
  crossfadeToTargets(900);
}

window.addEventListener("pointerdown", () => {
  if (!bgmUnlocked && musicOn) ensureBgmState();
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    stopAllBgm();
  } else {
    if (musicOn) ensureBgmState();
  }
});

setImmediateVolumes();

/* ----------------------------
   Toggles UI
-----------------------------*/
const arcadeBtn = document.getElementById("arcadeToggle");
const fxBtn = document.getElementById("fxToggle");
const sfxBtn = document.getElementById("sfxToggle");
const musicBtn = document.getElementById("musicToggle");

function sfxLabel() { return `SFX: ${sfxOn ? "ON" : "OFF"}`; }
function musicLabel() { return `MUSIC: ${musicOn ? "ON" : "OFF"}`; }

function syncToggleUI() {
  arcadeBtn?.setAttribute("aria-pressed", arcadeMode ? "true" : "false");
  if (arcadeBtn) arcadeBtn.textContent = `ARCADE: ${arcadeMode ? "ON" : "OFF"}`;

  fxBtn?.setAttribute("aria-pressed", fxHigh ? "true" : "false");
  if (fxBtn) fxBtn.textContent = `FX: ${fxHigh ? "HIGH" : "LOW"}`;

  sfxBtn?.setAttribute("aria-pressed", sfxOn ? "true" : "false");
  if (sfxBtn) sfxBtn.textContent = sfxLabel();

  musicBtn?.setAttribute("aria-pressed", musicOn ? "true" : "false");
  if (musicBtn) musicBtn.textContent = musicLabel();
}
syncToggleUI();

document.getElementById("pointsResetBtn")?.addEventListener("click", () => {
  resetPoints();
  unlock("points_reset", "Reset", "Points reset to 0.");
});

arcadeBtn?.addEventListener("click", () => {
  arcadeMode = !arcadeMode;
  root.dataset.arcade = arcadeMode ? "1" : "0";
  try { localStorage.setItem(LS_ARCADE, arcadeMode ? "1" : "0"); } catch {}
  syncToggleUI();
  unlock("arcade", "Arcade Mode", "Chaos enabled (optional).");
  bleep(520, 0.05, "sawtooth", 0.8);
  syncBgmWithArcade();
});

fxBtn?.addEventListener("click", () => {
  fxHigh = !fxHigh;
  root.dataset.fx = fxHigh ? "1" : "0";
  try { localStorage.setItem(LS_FX, fxHigh ? "1" : "0"); } catch {}
  syncToggleUI();
  unlock("fx_toggle", "FX Settings", `Effects set to ${fxHigh ? "HIGH" : "LOW"}.`);
});

sfxBtn?.addEventListener("click", () => {
  sfxOn = !sfxOn;
  try { localStorage.setItem(LS_SFX_ON, sfxOn ? "1" : "0"); } catch {}
  syncToggleUI();

  if (sfxOn) {
    ensureAudio();
    bleep(740, 0.06, "square", 1.0);
    bleep(990, 0.06, "square", 0.95);
    unlock("sfx_on", "SFX Online", "SFX enabled.");
  } else {
    unlock("sfx_off", "Quiet UI", "SFX disabled.");
  }
});

musicBtn?.addEventListener("click", () => {
  musicOn = !musicOn;
  try { localStorage.setItem(LS_MUSIC_ON, musicOn ? "1" : "0"); } catch {}
  syncToggleUI();

  if (musicOn) {
    unlock("music_on", "Soundtrack", "Music enabled.");
  } else {
    unlock("music_off", "No Soundtrack", "Music disabled.");
  }
  syncBgmWithMusic();
});

// UI click sounds (SFX only)
document.addEventListener("pointerdown", (e) => {
  if (!sfxOn) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest("a, button, .btn")) bleep(520, 0.04, "square", 0.75);
}, { passive: true });

// Hover bleep only in Arcade + SFX ON + desktop
document.addEventListener("pointerover", (e) => {
  if (!arcadeMode) return;
  if (!sfxOn) return;
  if (window.innerWidth < 980) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest("a, button, .btn, .card")) bleep(880, 0.02, "sine", 0.55);
}, { passive: true });

/* ----------------------------
   Prevent “bounce” when clicking a hash link to the section you're already at.
-----------------------------*/
function topbarOffset() {
  const topbar = document.querySelector(".topbar");
  const h = topbar ? topbar.getBoundingClientRect().height : 80;
  return Math.round(h + 10);
}

document.addEventListener("click", (e) => {
  const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
  if (!a) return;

  const href = a.getAttribute("href") || "";
  if (href === "#" || href.length < 2) return;

  const id = href.slice(1);
  const target = document.getElementById(id);
  if (!target) return;

  const off = topbarOffset();
  const delta = target.getBoundingClientRect().top - off;

  if (Math.abs(delta) <= 2) {
    e.preventDefault();
    history.replaceState(null, "", "#" + id);
  }
});

/* ----------------------------
   Particles (performance guarded)
-----------------------------*/
const fx = document.getElementById("fx");
const ctx2 = fx?.getContext("2d");

function isHidden() { return document.visibilityState === "hidden"; }

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

  // Reduce particle count significantly for mobile performance
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    n = Math.max(4, Math.floor(n * 0.4));
    power *= 0.8;
  }

  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = (Math.random() * 2.6 + 1.2) * power;
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 1,
      r: Math.random() * 2.2 + 0.8,
      hue: [190, 310, 95][Math.floor(Math.random() * 3)]
    });
  }

  if (particles.length > particleCap) {
    particles.splice(0, particles.length - particleCap);
  }

  startFX();
}

function tick(t) {
  if (!ctx2) { stopFX(); return; }
  if (isHidden()) { stopFX(); return; }

  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  ctx2.clearRect(0, 0, innerWidth, innerHeight);

  // Spark rain only when Arcade + FX high
  if (arcadeMode && fxHigh) {
    const rate = innerWidth < 980 ? 1 : 3;
    for (let k = 0; k < rate; k++) {
      if (Math.random() < 0.75) {
        const x = Math.random() * innerWidth;
        const y = -10;
        for (let i = 0; i < 2; i++) {
          particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: (Math.random() * 3.2 + 2.2),
            life: 1,
            r: Math.random() * 1.6 + 0.6,
            hue: [190, 310, 95][Math.floor(Math.random() * 3)]
          });
        }
      }
    }
    if (particles.length > particleCap) {
      particles.splice(0, particles.length - particleCap);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= (0.9 * dt);
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

  if (particles.length === 0 && !(arcadeMode && fxHigh)) {
    stopFX();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (particles.length > 0 || (arcadeMode && fxHigh)) startFX();
  }
});

// Click particles (kept)
document.addEventListener("pointerdown", (e) => {
  spawn(e.clientX, e.clientY, arcadeMode ? 22 : 12, arcadeMode ? 1.05 : 0.85);
}, { passive: true });

document.addEventListener("pointerover", (e) => {
  if (!fxHigh) return;
  const t = e.target;
  if (!(t instanceof Element)) return;
  if (t.closest(".card, .btn")) {
    const r = t.getBoundingClientRect();
    spawn(r.left + r.width * 0.5, r.top + 8, arcadeMode ? 8 : 5, 0.6);
  }
}, { passive: true });

/* ----------------------------
   Quest log: active + done + % + 100% CLEAR
-----------------------------*/
const questLinks = Array.from(document.querySelectorAll(".minimap .q"));
const questFill = document.getElementById("questFill");
const questText = document.getElementById("questText");

const sectionEls = questLinks
  .map(a => document.querySelector(a.getAttribute("href")))
  .filter(Boolean);

const LS_QUEST = "questsDone_v2";
let doneArr = [];
try { doneArr = JSON.parse(localStorage.getItem(LS_QUEST) || "[]"); } catch {}
const done = new Set(doneArr);

function setQuestLabel(a, checked) {
  const txt = a.textContent.replace(/^\[\s?[x ]\s?\]\s*/i, "");
  a.textContent = `${checked ? "[x]" : "[ ]"} ${txt}`;
}

questLinks.forEach(a => {
  const id = (a.getAttribute("href") || "").slice(1);
  const isDone = done.has(id);
  if (isDone) a.classList.add("done");
  setQuestLabel(a, isDone);
});

function updateQuestMeter() {
  const total = questLinks.length || 1;
  const pct = Math.round((done.size / total) * 100);
  if (questFill) questFill.style.width = pct + "%";
  if (questText) questText.textContent = `${pct}% CLEAR`;
  if (pct === 100) unlock("clear_100", "100% CLEAR", "All quests completed.");
}
updateQuestMeter();

function setDone(id) {
  done.add(id);
  try { localStorage.setItem(LS_QUEST, JSON.stringify([...done])); } catch {}
  questLinks.forEach(a => {
    if (a.getAttribute("href") === "#" + id) {
      a.classList.add("done");
      setQuestLabel(a, true);
    }
  });
  updateQuestMeter();
}

const secIO = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    const id = en.target.id;
    const link = questLinks.find(a => a.getAttribute("href") === "#" + id);
    if (!link) return;

    if (en.isIntersecting) {
      questLinks.forEach(a => a.classList.remove("active"));
      link.classList.add("active");

      if (!done.has(id)) {
        setDone(id);
        unlock("quest_" + id, "Quest Progress", `Visited: ${id}`);
      }
    }
  });
}, { threshold: 0.35 });

sectionEls.forEach(s => {
  try { secIO.observe(s); } catch {}
});

// Resume click achievement
document.querySelectorAll('a[href$=".pdf"], a[href*="Donald_Hui_Resume"]').forEach(a => {
  a.addEventListener("click", () => unlock("resume_open", "Paper Trail", "Opened the resume."), { passive: true });
});

// Prevent tiny scroll jumps when clicking interactive elements
document.addEventListener("pointerdown", (e) => {
  const el = e.target instanceof Element ? e.target.closest("a, button, .btn") : null;
  if (!el) return;

  // Never interfere with quest log navigation
  if (el.closest(".minimap")) return;

  if (el.tagName === "A") {
    const href = el.getAttribute("href") || "";
    if (href.startsWith("#")) return; // allow normal anchor scroll
  }

  if (typeof el.focus === "function") el.focus({ preventScroll: true });
}, { passive: true });

/* ----------------------------
   Shooting Targets (unlock + resume preview) + shoot-anywhere-to-hide
-----------------------------*/
(function initTargetsShooting() {
  const tiles = Array.from(document.querySelectorAll(".tile"));

  function lockTile(tile){
    if(!tile) return;
    const panel = tile.querySelector(".panel");
    const mainTarget = tile.querySelector(".target.main-target");
    tile.classList.remove("unlocked");
    tile.classList.add("locked");
    if(panel) panel.hidden = true;
    if(mainTarget) mainTarget.setAttribute("aria-expanded", "false");

    // If locking Resume, reset preview state/label
    if(tile.id === "resume"){
      document.getElementById("resumePreviewWrap")?.classList.remove("expanded");
      const previewBtn = tile.querySelector('.target[data-action="resumeExpand"]');
      previewBtn?.setAttribute("aria-expanded", "false");
      const sub = previewBtn?.querySelector(".target-sub");
      if(sub) sub.textContent = "Shoot to expand";
    }
  }

  function unlockFromMainTarget(targetBtn) {
    const tile = targetBtn.closest(".tile");
    if (!tile) return;
    const panel = tile.querySelector(".panel");
    if (!panel) return;
    if (tile.classList.contains("unlocked")) return;

    tile.classList.remove("locked");
    tile.classList.add("unlocked");
    panel.hidden = false;

    targetBtn.setAttribute("aria-expanded", "true");

    unlock(
      "target_" + (tile.id || Math.random().toString(16).slice(2)),
      "Target Hit",
      `Unlocked: ${tile.dataset.subject || tile.id || "section"}`
    );

    tile.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleResumePreview(btn){
    const wrap = document.getElementById("resumePreviewWrap");
    if(!wrap) return;
    const expanded = wrap.classList.toggle("expanded");
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    const sub = btn.querySelector(".target-sub");
    if(sub) sub.textContent = expanded ? "Shoot to collapse" : "Shoot to expand";
    unlock("resume_preview", "Preview Mode", expanded ? "Expanded resume preview." : "Collapsed resume preview.");
  }

  // Ensure locked panels are hidden on load
  tiles.forEach(tile => {
    const mainTarget = tile.querySelector(".target.main-target");
    const panel = tile.querySelector(".panel");
    if (!mainTarget || !panel) return;
    if (tile.classList.contains("locked")) {
      panel.hidden = true;
      mainTarget.setAttribute("aria-expanded", "false");
    }
  });

  function shootAt(x, y){
    addPoints(10);
    bleep(180, 0.035, "square", 1.0);
    bleep(90, 0.02, "sine", 0.7);

    // impact particles
    spawn(x, y, arcadeMode ? 28 : 16, arcadeMode ? 1.15 : 0.95);

    const stack = document.elementsFromPoint(x, y);

    // 1) If you hit a target, handle it
    const hitTarget = stack.find(n => n instanceof Element && n.classList && n.classList.contains("target"));
    if(hitTarget){
      const r = hitTarget.getBoundingClientRect();
      spawn(r.left + r.width/2, r.top + r.height/2, arcadeMode ? 44 : 28, arcadeMode ? 1.35 : 1.1);

      if(hitTarget.dataset.action === "resumeExpand"){
        toggleResumePreview(hitTarget);
        return;
      }

      // Only main targets unlock tiles
      if(hitTarget.classList.contains("main-target")){
        unlockFromMainTarget(hitTarget);
      }
      return;
    }

    // 2) Otherwise, if you shot inside an unlocked panel, hide that tile
    const hitPanel = stack.find(n => n instanceof Element && n.classList && n.classList.contains("panel"));
    if(hitPanel){
      const tile = hitPanel.closest(".tile");
      if(tile && tile.classList.contains("unlocked")){
        lockTile(tile);
        unlock("section_hide_" + (tile.id || "tile"), "Hidden", `Collapsed: ${tile.dataset.subject || tile.id || "section"}`);
        return;
      }
    }
  }

  // Pointer shooting
  document.addEventListener("pointerdown", (e) => {
    const el = e.target instanceof Element ? e.target : null;

    // Let normal UI behave normally (no shooting)
    if (el && el.closest(".topbar, .minimap, footer, a, button:not(.target), .btn, .card, .card *, input, textarea, select")) return;

    shootAt(e.clientX, e.clientY);
  }, { passive: false });

  // Keyboard shooting (center screen)
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
    shootAt(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
  });
})();

(function initClickableCards(){
  document.querySelectorAll(".card").forEach(card => {
    const href =
      card.getAttribute("data-href") ||
      card.querySelector('a[href]')?.getAttribute("href");

    if(!href) return;

    card.style.cursor = "pointer";
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    const go = () => window.open(href, "_blank", "noopener");

    card.addEventListener("click", (e) => {
      // If user clicked an actual link/button inside, let that handle it
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      go();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go();
      }
    });
  });
})();

const menuBtn = document.getElementById('menuBtn');
const settingsMenu = document.getElementById('settingsMenu');
const questDrawer = document.getElementById('questDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');

// Toggle Settings
menuBtn?.addEventListener('click', () => {
  settingsMenu.classList.toggle('active');
  bleep(800, 0.05, "square");
});

// Open Quest Log when clicking the Quest Meter Text (or add a dedicated button)
document.getElementById('questText')?.addEventListener('click', () => {
  questDrawer.classList.add('open');
  drawerOverlay.classList.add('active');
});

// Close drawer when clicking overlay
drawerOverlay?.addEventListener('click', () => {
  questDrawer.classList.remove('open');
  drawerOverlay.classList.remove('active');
});

// Optional: Close drawer when a quest link is clicked
document.querySelectorAll('.minimap .q').forEach(link => {
  link.addEventListener('click', () => {
    questDrawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
  });
});
