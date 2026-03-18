/* =========================================================
   main.js (rewritten + cleaned)
   - Tiles unlock by shooting targets (no points from tile shooting)
   - Tiles DO NOT collapse after opening
   - Main target removed from layout when unlocked (CSS handles)
   - Game targets never spawn over main text content (hero + footer)
========================================================= */

/* ----------------------------
   Force start at top
-----------------------------*/
(() => {
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch { }

  if (location.hash) {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch { }
  }

  const forceTop = () => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
  };

  forceTop();
  window.addEventListener("DOMContentLoaded", forceTop, { once: true });
  window.addEventListener("load", () => requestAnimationFrame(forceTop), { once: true });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) forceTop();
  });
})();

/* ----------------------------
   Helpers
-----------------------------*/
const root = document.documentElement;

function lsGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch { }
}

function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function rectOf(el) {
  const r = el.getBoundingClientRect();
  return { l: r.left, t: r.top, r: r.right, b: r.bottom };
}
function intersects(a, b) {
  return !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b);
}

/* ----------------------------
   Elements
-----------------------------*/
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

const heroCard = document.querySelector(".hero-main");
const reticle = document.querySelector(".reticle");
const muzzle = document.getElementById("muzzle");
const xpFill = document.getElementById("xpFill");
const toastHost = document.getElementById("toast");

/* ----------------------------
   Storage keys
-----------------------------*/
const LS_ARCADE = "arcadeMode";
const LS_FX = "fxHigh";
const LS_SFX_ON = "sfxOn";
const LS_MUSIC_ON = "musicOn";
const LS_POINTS = "points_v1";
const LS_ACH = "achievements_v3";

/* ----------------------------
   State
-----------------------------*/
let arcadeMode = (lsGet(LS_ARCADE) ?? "0") === "1";
let fxHigh = (lsGet(LS_FX) ?? "0") === "1"; // default LOW
let sfxOn = (lsGet(LS_SFX_ON) ?? "1") === "1";
let musicOn = (lsGet(LS_MUSIC_ON) ?? "0") === "1";

root.dataset.arcade = arcadeMode ? "1" : "0";
root.dataset.fx = fxHigh ? "1" : "0";

/* ----------------------------
   Points (persist)
   NOTE: tile shooting does NOT add points; game targets do.
-----------------------------*/
let points = 0;
const pointsEl = document.getElementById("pointsValue");

(() => {
  const saved = lsGet(LS_POINTS);
  points = saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
  renderPoints();
})();

function renderPoints() {
  if (pointsEl) pointsEl.textContent = String(points);
}
function addPoints(n) {
  points = Math.max(0, points + n);
  lsSet(LS_POINTS, String(points));
  renderPoints();
}
function resetPoints() {
  points = 0;
  lsSet(LS_POINTS, "0");
  renderPoints();
}

/* ----------------------------
   Pointer: aurora + reticle + tilt
-----------------------------*/
function shouldTilt() {
  if (!fxHigh) return false;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.innerWidth < 860) return false;
  return true;
}

window.addEventListener(
  "pointermove",
  (e) => {
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
  },
  { passive: true }
);

/* ----------------------------
   Noise background (SVG)
-----------------------------*/
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

/* ----------------------------
   Reveal on scroll
-----------------------------*/
(() => {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) e.target.classList.add("in");
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach((el) => {
    try {
      io.observe(el);
    } catch { }
  });
})();

/* ----------------------------
   Boot overlay
-----------------------------*/
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

/* ----------------------------
   XP bar
-----------------------------*/
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

/* ----------------------------
   SFX (WebAudio)
-----------------------------*/
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

/* ----------------------------
   Toasts + Achievements
-----------------------------*/
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
try {
  achievedArr = JSON.parse(lsGet(LS_ACH) || "[]");
} catch {
  achievedArr = [];
}
const achieved = new Set(achievedArr);

function unlock(key, title, msg) {
  if (achieved.has(key)) return;
  achieved.add(key);
  lsSet(LS_ACH, JSON.stringify([...achieved]));
  toast("ACHIEVEMENT UNLOCKED", `${title} — ${msg}`);
}

/* ----------------------------
   Muzzle flash
-----------------------------*/
function muzzleFlash(x, y) {
  if (!muzzle || !fxHigh) return;
  muzzle.style.left = x + "px";
  muzzle.style.top = y + "px";
  muzzle.classList.remove("fire");
  void muzzle.offsetWidth;
  muzzle.classList.add("fire");
}

/* ----------------------------
   Background music (two-track)
-----------------------------*/
const bgmAmbient = document.getElementById("bgmAmbient");
const bgmArcade = document.getElementById("bgmArcade");
let bgmUnlocked = false;
const MUSIC_VOL = 0.16;

function musicBaseVolume() {
  return musicOn ? MUSIC_VOL : 0;
}
function targetVolumes() {
  const base = musicBaseVolume();
  return arcadeMode ? { ambient: 0, arcade: base } : { ambient: base, arcade: 0 };
}
function setImmediateVolumes() {
  const { ambient, arcade } = targetVolumes();
  if (bgmAmbient) bgmAmbient.volume = ambient;
  if (bgmArcade) bgmArcade.volume = arcade;
}
async function tryPlay(el) {
  if (!el) return false;
  try {
    await el.play();
    return true;
  } catch {
    return false;
  }
}
function stopAllBgm() {
  try { bgmAmbient?.pause(); } catch { }
  try { bgmArcade?.pause(); } catch { }
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
    const p = clamp((t - start) / durationMs, 0, 1);
    const e = p * p * (3 - 2 * p);

    if (bgmAmbient) bgmAmbient.volume = fromA + (toA - fromA) * e;
    if (bgmArcade) bgmArcade.volume = fromB + (toB - fromB) * e;

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

window.addEventListener(
  "pointerdown",
  () => {
    if (!bgmUnlocked && musicOn) ensureBgmState();
  },
  { passive: true }
);

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopAllBgm();
  else if (musicOn) ensureBgmState();
});

setImmediateVolumes();

/* ----------------------------
   Settings dropdown: close on outside click / ESC
-----------------------------*/
(() => {
  const settingsMenu = document.getElementById("settingsMenu");
  if (!settingsMenu) return;

  function closeSettings() {
    if (settingsMenu.open) settingsMenu.open = false;
  }

  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!settingsMenu.open) return;
      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;
      if (t.closest("#settingsMenu")) return;
      closeSettings();
    },
    { capture: true }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSettings();
  });

  document.addEventListener("click", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (!t.closest("#settingsMenu .settings-panel")) return;
    if (t.matches("button.toggle")) closeSettings();
  });
})();

/* ----------------------------
   Toggles UI
-----------------------------*/
(() => {
  const arcadeBtn = document.getElementById("arcadeToggle");
  const fxBtn = document.getElementById("fxToggle");
  const sfxBtn = document.getElementById("sfxToggle");
  const musicBtn = document.getElementById("musicToggle");

  function syncToggleUI() {
    arcadeBtn?.setAttribute("aria-pressed", arcadeMode ? "true" : "false");
    if (arcadeBtn) arcadeBtn.textContent = `ARCADE: ${arcadeMode ? "ON" : "OFF"}`;

    fxBtn?.setAttribute("aria-pressed", fxHigh ? "true" : "false");
    if (fxBtn) fxBtn.textContent = `FX: ${fxHigh ? "HIGH" : "LOW"}`;

    sfxBtn?.setAttribute("aria-pressed", sfxOn ? "true" : "false");
    if (sfxBtn) sfxBtn.textContent = `SFX: ${sfxOn ? "ON" : "OFF"}`;

    musicBtn?.setAttribute("aria-pressed", musicOn ? "true" : "false");
    if (musicBtn) musicBtn.textContent = `MUSIC: ${musicOn ? "ON" : "OFF"}`;
  }
  syncToggleUI();

  document.getElementById("pointsResetBtn")?.addEventListener("click", () => {
    resetPoints();
    unlock("points_reset", "Reset", "Points reset to 0.");
  });

  arcadeBtn?.addEventListener("click", () => {
    arcadeMode = !arcadeMode;
    root.dataset.arcade = arcadeMode ? "1" : "0";
    lsSet(LS_ARCADE, arcadeMode ? "1" : "0");
    syncToggleUI();
    unlock("arcade", "Arcade Mode", "Chaos enabled (optional).");
    bleep(520, 0.05, "sawtooth", 0.8);
    syncBgmWithArcade();
  });

  fxBtn?.addEventListener("click", () => {
    fxHigh = !fxHigh;
    root.dataset.fx = fxHigh ? "1" : "0";
    lsSet(LS_FX, fxHigh ? "1" : "0");
    syncToggleUI();
    unlock("fx_toggle", "FX Settings", `Effects set to ${fxHigh ? "HIGH" : "LOW"}.`);
  });

  sfxBtn?.addEventListener("click", () => {
    sfxOn = !sfxOn;
    lsSet(LS_SFX_ON, sfxOn ? "1" : "0");
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
    lsSet(LS_MUSIC_ON, musicOn ? "1" : "0");
    syncToggleUI();

    unlock(musicOn ? "music_on" : "music_off", "Soundtrack", musicOn ? "Music enabled." : "Music disabled.");
    syncBgmWithMusic();
  });

  // UI click bleep
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (!sfxOn) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("a, button, .btn")) bleep(520, 0.04, "square", 0.75);
    },
    { passive: true }
  );

  // Hover bleep: arcade + desktop
  document.addEventListener(
    "pointerover",
    (e) => {
      if (!arcadeMode || !sfxOn || window.innerWidth < 980) return;
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (t.closest("a, button, .btn, .card")) bleep(880, 0.02, "sine", 0.55);
    },
    { passive: true }
  );
})();

/* ----------------------------
   Hash-link: avoid bounce when already aligned
-----------------------------*/
(() => {
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
})();

/* ----------------------------
   Particles (canvas FX)
-----------------------------*/
const fx = document.getElementById("fx");
const ctx2 = fx?.getContext("2d");

function isHidden() {
  return document.visibilityState === "hidden";
}

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
      x,
      y,
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
  if (isHidden()) return stopFX();

  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  ctx2.clearRect(0, 0, innerWidth, innerHeight);

  if (arcadeMode && fxHigh) {
    const rate = innerWidth < 980 ? 1 : 3;
    for (let k = 0; k < rate; k++) {
      if (Math.random() < 0.75) {
        const x = Math.random() * innerWidth;
        const y = -10;
        for (let i = 0; i < 2; i++) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 0.8,
            vy: Math.random() * 3.2 + 2.2,
            life: 1,
            r: Math.random() * 1.6 + 0.6,
            hue: [190, 310, 95][Math.floor(Math.random() * 3)],
          });
        }
      }
    }
    if (particles.length > particleCap) particles.splice(0, particles.length - particleCap);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= 0.9 * dt;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy = p.vy * 0.98 + 0.03;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx2.globalAlpha = Math.max(p.life, 0);
    ctx2.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.life})`;
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx2.fill();
  }
  ctx2.globalAlpha = 1;

  if (particles.length === 0 && !(arcadeMode && fxHigh)) return stopFX();
  rafId = requestAnimationFrame(tick);
}

function tracer(x1, y1, x2, y2) {
  if (!ctx2 || !fxHigh) return;
  ctx2.save();
  ctx2.globalCompositeOperation = "lighter";
  ctx2.lineWidth = arcadeMode ? 2.2 : 1.8;
  ctx2.strokeStyle = arcadeMode ? "rgba(255,43,214,.75)" : "rgba(0,229,255,.7)";
  ctx2.beginPath();
  ctx2.moveTo(x1, y1);
  ctx2.lineTo(x2, y2);
  ctx2.stroke();
  ctx2.restore();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (particles.length > 0 || (arcadeMode && fxHigh)) startFX();
  }
});

// Click particles anywhere (visual only; no points)
document.addEventListener(
  "pointerdown",
  (e) => {
    spawn(e.clientX, e.clientY, arcadeMode ? 22 : 12, arcadeMode ? 1.05 : 0.85);
  },
  { passive: true }
);

document.addEventListener(
  "pointerover",
  (e) => {
    if (!fxHigh) return;
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(".card, .btn")) {
      const r = t.getBoundingClientRect();
      spawn(r.left + r.width * 0.5, r.top + 8, arcadeMode ? 8 : 5, 0.6);
    }
  },
  { passive: true }
);

/* ----------------------------
   Resume click achievement
-----------------------------*/
document.querySelectorAll('a[href$=".pdf"], a[href*="Donald_Hui_Resume"]').forEach((a) => {
  a.addEventListener("click", () => unlock("resume_open", "Paper Trail", "Opened the resume."), { passive: true });
});

/* ----------------------------
   Prevent tiny scroll jumps when focusing interactives
-----------------------------*/
document.addEventListener(
  "pointerdown",
  (e) => {
    const el = e.target instanceof Element ? e.target.closest("a, button, .btn") : null;
    if (!el) return;

    if (el.tagName === "A") {
      const href = el.getAttribute("href") || "";
      if (href.startsWith("#")) return;
    }

    if (typeof el.focus === "function") el.focus({ preventScroll: true });
  },
  { passive: true }
);

/* ----------------------------
   Tiles: Shoot to unlock (no collapse, no points)
-----------------------------*/
(() => {
  const tiles = Array.from(document.querySelectorAll(".tile"));

  function isPinnedOpen(tile) {
    return tile?.classList.contains("hero-main") || tile?.dataset.subject === "Summary";
  }

  function setPanelHeights(tile) {
    const panel = tile.querySelector(".panel");
    const mainTarget = tile.querySelector(".target.main-target");
    if (!panel) return;

    if (!mainTarget) {
      const prevMax = panel.style.maxHeight;
      panel.style.maxHeight = "none";
      tile.style.setProperty("--panel-open", panel.scrollHeight + "px");
      panel.style.maxHeight = prevMax;
      return;
    }

    const prevMax = panel.style.maxHeight;
    panel.style.maxHeight = "none";
    const openH = panel.scrollHeight;
    panel.style.maxHeight = prevMax;

    tile.style.setProperty("--panel-open", openH + "px");
  }

  function measureAllTiles() {
    tiles.forEach(setPanelHeights);
  }

  function unlockFromMainTarget(targetBtn) {
    const tile = targetBtn.closest(".tile");
    if (!tile || isPinnedOpen(tile)) return;

    const panel = tile.querySelector(".panel");
    if (!panel) return;

    if (tile.classList.contains("unlocked")) return;

    tile.classList.remove("closing");
    tile.classList.remove("locked");
    tile.classList.add("unlocked");

    setPanelHeights(tile);
    targetBtn.setAttribute("aria-expanded", "true");

    unlock("target_" + (tile.id || Math.random().toString(16).slice(2)), "Target Hit", `Unlocked: ${tile.dataset.subject || tile.id || "section"}`);

    tile.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleResumePreview(btn) {
    const wrap = document.getElementById("resumePreviewWrap");
    if (!wrap) return;

    const expanded = wrap.classList.toggle("expanded");
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");

    const sub = btn.querySelector(".target-sub");
    if (sub) sub.textContent = expanded ? "Shoot to collapse" : "Shoot to expand";

    unlock("resume_preview", "Preview Mode", expanded ? "Expanded resume preview." : "Collapsed resume preview.");

    const tile = btn.closest(".tile");
    if (tile) setPanelHeights(tile);
  }

  // Initial ARIA sync
  tiles.forEach((tile) => {
    const mainTarget = tile.querySelector(".target.main-target");
    if (!mainTarget) return;
    mainTarget.setAttribute("aria-expanded", tile.classList.contains("unlocked") ? "true" : "false");
  });

  // Measure at right times
  measureAllTiles();
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      measureAllTiles();
      requestAnimationFrame(measureAllTiles);
    }).catch(() => { });
  }
  window.addEventListener("load", () => { measureAllTiles(); requestAnimationFrame(measureAllTiles); }, { passive: true });
  window.addEventListener("resize", () => measureAllTiles(), { passive: true });

  document.querySelectorAll(".resume-object, object, iframe").forEach((el) => {
    el.addEventListener("load", () => { measureAllTiles(); requestAnimationFrame(measureAllTiles); }, { passive: true });
  });

  // Expose for HUD targets
  window.__unlockTileFromSection = (selector) => {
    const sec = document.querySelector(selector);
    if (!sec) return false;
    const tile = sec.closest(".tile") || sec;
    if (!(tile instanceof HTMLElement)) return false;
    if (isPinnedOpen(tile)) return false;

    const mainTarget = tile.querySelector(".target.main-target");
    if (!mainTarget) return false;
    unlockFromMainTarget(mainTarget);
    return true;
  };

  function shootAt(x, y) {
    // NO POINTS for tile shooting
    bleep(180, 0.035, "square", 1.0);
    bleep(90, 0.02, "sine", 0.7);

    const sx = reticle ? parseFloat(reticle.style.left) || x : x;
    const sy = reticle ? parseFloat(reticle.style.top) || y : y;

    muzzleFlash(sx, sy);
    tracer(sx, sy, x, y);
    spawn(x, y, arcadeMode ? 28 : 16, arcadeMode ? 1.15 : 0.95);

    const stack = document.elementsFromPoint(x, y);

    // hit a target button?
    const hitTarget = stack.find((n) => n instanceof Element && n.classList?.contains("target"));
    if (!hitTarget) return;

    if (hitTarget.dataset.action === "resumeExpand") {
      toggleResumePreview(hitTarget);
      return;
    }

    if (hitTarget.classList.contains("main-target")) {
      unlockFromMainTarget(hitTarget);
    }
  }

  // Pointer shooting (ignore normal UI)
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el && el.closest(".topbar, footer, a, button:not(.target), .btn, .card, .card *, input, textarea, select")) return;
      shootAt(e.clientX, e.clientY);
    },
    { passive: false }
  );

  // Keyboard shooting (center screen)
  window.addEventListener("keydown", (e) => {
    if (e.code !== "Space" && e.code !== "Enter") return;
    e.preventDefault();
    shootAt(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
  });
})();

/* ----------------------------
   HUD Targets (navigation only)
-----------------------------*/
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

  function dock() {
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
    btn.addEventListener(
      "click",
      () => {
        const sel = btn.getAttribute("data-target") || "";
        if (!sel) return;
        
        document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" });

        bleep(660, 0.03, "square", 0.55);
      },
      { passive: true }
    );
  });

  window.addEventListener("resize", dock, { passive: true });
  window.addEventListener("load", dock, { passive: true });
  dock();
})();

/* ----------------------------
   Game Targets (mini-game)
   Spawn ANYWHERE, but NEVER over text/content.
-----------------------------*/
(() => {
  const layer = document.getElementById("gameLayer");
  if (!layer) return;

  const reduceMotion = matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const MIN = 5, MAX = 10;
  const POINTS_PER_HIT = 10;
  const SIZE = 54;
  const PAD = 10;

  let ents = [];
  let raf = null, last = 0;

  const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { l: r.left, t: r.top, r: r.right, b: r.bottom };
  }

  function intersects(a, b) {
    return !(a.r <= b.l || a.l >= b.r || a.b <= b.t || a.t >= b.b);
  }

  function expandRect(r, m) {
    return { l: r.l - m, t: r.t - m, r: r.r + m, b: r.b + m };
  }

  function candidateRect(x, y) {
    return { l: x, t: y, r: x + SIZE, b: y + SIZE };
  }

  function protectedRects() {
    const blocks = [];

    // Protect the REAL content area (your text/cards)
    const bento = document.querySelector(".bento");
    if (bento) blocks.push(expandRect(rectOf(bento), 0));

    // Protect header + footer text
    const topbar = document.querySelector(".topbar");
    if (topbar) blocks.push(expandRect(rectOf(topbar), 6));

    const footerC = document.querySelector("footer .container");
    if (footerC) blocks.push(expandRect(rectOf(footerC), 8));

    // Protect transient UI
    const settingsPanel = document.querySelector("#settingsMenu[open] .settings-panel");
    if (settingsPanel) blocks.push(expandRect(rectOf(settingsPanel), 8));

    const toast = document.getElementById("toast");
    // NOTE: toast host can be empty height sometimes; only include if it has size
    if (toast) {
      const tr = rectOf(toast);
      if ((tr.r - tr.l) > 10 && (tr.b - tr.t) > 10) blocks.push(expandRect(tr, 8));
    }

    // Protect the actual HUD buttons (NOT the #targetsHud container, which is full-screen)
    document.querySelectorAll("#targetsHud .hud-target").forEach((btn) => {
      blocks.push(expandRect(rectOf(btn), 10));
    });

    // Filter out any accidental “full screen” rects (prevents top-left fallback bug)
    const vw = innerWidth, vh = innerHeight;
    return blocks.filter((r) => {
      const w = Math.max(0, r.r - r.l);
      const h = Math.max(0, r.b - r.t);
      return !(w > vw * 0.98 && h > vh * 0.90);
    });
  }

  function worldBounds() {
    return {
      l: PAD,
      t: PAD,
      r: innerWidth - PAD,
      b: innerHeight - PAD,
    };
  }

  function overlapsLiveTargets(rr) {
    for (const e of ents) {
      if (!e.alive) continue;
      const er = candidateRect(e.x, e.y);
      if (intersects(rr, er)) return true;
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

    // Try many random positions across the ENTIRE viewport
    for (let tries = 0; tries < 800; tries++) {
      const x = randInt(bounds.l, Math.max(bounds.l, bounds.r - SIZE));
      const y = randInt(bounds.t, Math.max(bounds.t, bounds.b - SIZE));
      if (isValidSpawn(x, y)) return { x, y };
    }

    // If space is very constrained, allow overlap with other targets but still avoid text
    const blocks = protectedRects();
    for (let tries = 0; tries < 800; tries++) {
      const x = randInt(bounds.l, Math.max(bounds.l, bounds.r - SIZE));
      const y = randInt(bounds.t, Math.max(bounds.t, bounds.b - SIZE));
      const rr = candidateRect(x, y);
      if (!blocks.some((b) => intersects(rr, b))) return { x, y };
    }

    // If still impossible, don't spawn a wave at all
    return null;
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function setPos(e) {
    e.el.style.transform = `translate(${e.x}px, ${e.y}px)`;
  }

  function clearWave() {
    stop();
    ents = [];
    layer.innerHTML = "";
  }

  function waveCleared() {
    return ents.length > 0 && ents.every((e) => !e.alive);
  }

  function hit(e) {
    if (!e.alive) return;
    e.alive = false;

    addPoints(POINTS_PER_HIT);
    if (typeof bleep === "function") bleep(740, 0.04, "square", 0.75);

    // optional particles (if you kept spawn() in your file)
    if (typeof spawn === "function") {
      const r = e.el.getBoundingClientRect();
      spawn(r.left + r.width / 2, r.top + r.height / 2, arcadeMode ? 26 : 14, arcadeMode ? 1.1 : 0.9);
    }

    e.el.classList.add("hit");
    setTimeout(() => {
      try { e.el.remove(); } catch { }
      if (waveCleared()) setTimeout(spawnWave, 500);
    }, 260);
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
      if (!p) {
        // No valid space: stop spawning further targets in this wave
        el.remove();
        break;
      }

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

      if (arcadeMode && !reduceMotion) {
        const speed = 140 + Math.random() * 140;
        const a = Math.random() * Math.PI * 2;
        ent.vx = Math.cos(a) * speed;
        ent.vy = Math.sin(a) * speed;
      }

      setPos(ent);
      el.addEventListener("click", () => hit(ent), { passive: true });
      ents.push(ent);
    }

    if (arcadeMode && !reduceMotion) start();
  }

  function tryHitAtPoint(x, y) {
    const stack = document.elementsFromPoint(x, y);
    const btn = stack.find((n) => n instanceof Element && n.classList?.contains("game-target"));
    if (!btn) return false;
    const ent = ents.find((e) => e.el === btn);
    if (!ent) return false;
    hit(ent);
    return true;
  }

  function tick(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;

    const bounds = worldBounds();
    const blocks = protectedRects();

    for (const e of ents) {
      if (!e.alive) continue;

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // bounce within viewport
      if (e.x <= bounds.l) { e.x = bounds.l; e.vx *= -1; }
      if (e.y <= bounds.t) { e.y = bounds.t; e.vy *= -1; }
      if (e.x + e.w >= bounds.r) { e.x = bounds.r - e.w; e.vx *= -1; }
      if (e.y + e.h >= bounds.b) { e.y = bounds.b - e.h; e.vy *= -1; }

      // never move over protected content
      const rr = { l: e.x, t: e.y, r: e.x + e.w, b: e.y + e.h };
      if (blocks.some((b) => intersects(rr, b))) {
        e.vx *= -1;
        e.vy *= -1;
        e.x = clamp(e.x, bounds.l, bounds.r - e.w);
        e.y = clamp(e.y, bounds.t, bounds.b - e.h);
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

  function syncMode() {
    if (arcadeMode && !reduceMotion) {
      ents.forEach((e) => {
        if (!e.alive) return;
        if (e.vx === 0 && e.vy === 0) {
          const speed = 140 + Math.random() * 140;
          const a = Math.random() * Math.PI * 2;
          e.vx = Math.cos(a) * speed;
          e.vy = Math.sin(a) * speed;
        }
      });
      start();
    } else {
      stop();
      ents.forEach((e) => { e.vx = 0; e.vy = 0; });
    }
  }

  // Make game target clicks take priority over tile shooting
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el && el.closest(".topbar, footer, a, button:not(.game-target):not(.target), .btn, .card, .card *, input, textarea, select")) return;

      if (tryHitAtPoint(e.clientX, e.clientY)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true, passive: false }
  );

  window.addEventListener("resize", () => {
    // Re-place all alive targets after layout changes
    ents.forEach((e) => {
      if (!e.alive) return;
      const p = pickSpawnPoint();
      if (!p) return;
      e.x = p.x;
      e.y = p.y;
      setPos(e);
    });
  }, { passive: true });

  const mo = new MutationObserver(syncMode);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-arcade"] });

  spawnWave();
})();

/* ----------------------------
   Clickable cards
-----------------------------*/
(() => {
  document.querySelectorAll(".card").forEach((card) => {
    const href = card.getAttribute("data-href") || card.querySelector('a[href]')?.getAttribute("href");
    if (!href) return;

    card.style.cursor = "pointer";
    card.setAttribute("role", "link");
    card.setAttribute("tabindex", "0");

    const go = () => window.open(href, "_blank", "noopener");

    card.addEventListener("click", (e) => {
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
