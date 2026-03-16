// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Elements
const root = document.documentElement;
const hero = document.querySelector(".hero-main");

// Storage keys
const LS_ARCADE = "arcadeMode";
const LS_FX = "fxHigh";          // "1" HIGH, "0" LOW
const LS_SFX_LEVEL = "sfxLevel"; // 0 OFF, 1 LOW, 2 HIGH
const LS_MUSIC_LEVEL = "musicLevel"; // 0 OFF, 1 LOW, 2 HIGH

// State
let arcadeMode = false; // default OFF (ignores saved state)
localStorage.setItem(LS_ARCADE, "0");
let fxHigh = localStorage.getItem(LS_FX);
fxHigh = fxHigh === null ? false : fxHigh === "1"; // default LOW

// Defaults: SFX LOW (so it feels responsive), MUSIC OFF (professional)
let sfxLevel = localStorage.getItem(LS_SFX_LEVEL);
sfxLevel = sfxLevel === null ? 1 : Number(sfxLevel);

let musicLevel = localStorage.getItem(LS_MUSIC_LEVEL);
musicLevel = musicLevel === null ? 0 : Number(musicLevel);

root.dataset.arcade = arcadeMode ? "1" : "0";
root.dataset.fx = fxHigh ? "1" : "0";

// Pointer reactive tilt (disabled in FX low / reduced motion / small screens)
function shouldTilt(){
  if(!fxHigh) return false;
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
(function makeNoise(){
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
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// Boot overlay
const boot = document.getElementById("boot");
function dismissBoot(){
  if(!boot) return;
  boot.classList.add("off");
  setTimeout(() => boot.remove(), 550);
}
if(boot){
  window.addEventListener("load", () => setTimeout(dismissBoot, 900));
  boot.addEventListener("pointerdown", dismissBoot, { passive:true });
  window.addEventListener("keydown", dismissBoot, { once:true });
}

// Scroll XP bar
const xpFill = document.getElementById("xpFill");
function updateXP(){
  if(!xpFill) return;
  const h = document.documentElement;
  const scrollTop = h.scrollTop || document.body.scrollTop;
  const scrollHeight = (h.scrollHeight || document.body.scrollHeight) - h.clientHeight;
  const p = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
  xpFill.style.width = p.toFixed(2) + "%";
}
window.addEventListener("scroll", updateXP, { passive:true });
updateXP();

// Reticle follow
const reticle = document.querySelector(".reticle");
window.addEventListener("pointermove", (e) => {
  if(!reticle || !fxHigh) return;
  reticle.style.left = e.clientX + "px";
  reticle.style.top = e.clientY + "px";
}, { passive:true });

/* ----------------------------
   SFX (WebAudio) — separate from Music
-----------------------------*/
let audioCtx = null;
function ensureAudio(){
  if(audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function sfxGain(){
  // louder than before so SFX stands out vs music
  if(sfxLevel === 1) return 0.04; // LOW
  if(sfxLevel === 2) return 0.08; // HIGH
  return 0;
}
function bleep(freq=660, dur=0.05, type="sine", gainMult=1){
  const base = sfxGain();
  if(base <= 0) return;
  const ctx = ensureAudio();
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(base * gainMult, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/* ----------------------------
   Toasts / Achievements
-----------------------------*/
const toastHost = document.getElementById("toast");
function toast(title, msg){
  if(!toastHost) return;
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
const achieved = new Set(JSON.parse(localStorage.getItem(LS_ACH) || "[]"));

function shake(){
  if(!fxHigh) return;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  document.body.classList.remove("shake");
void document.body.offsetWidth;
document.body.classList.add("shake");
setTimeout(() => document.body.classList.remove("shake"), 420);
}

function unlock(key, title, msg){
  if(achieved.has(key)) return;
  achieved.add(key);
  localStorage.setItem(LS_ACH, JSON.stringify([...achieved]));
  toast("ACHIEVEMENT UNLOCKED", `${title} — ${msg}`);

  if(arcadeMode){
    shake();
    bleep(196, 0.06, "sawtooth", 1.1);
    bleep(392, 0.07, "square", 1.0);
    bleep(784, 0.06, "square", 1.0);
    spawn(Math.min(innerWidth - 70, innerWidth * 0.88), Math.min(innerHeight - 70, innerHeight * 0.86), 42, 1.15);
  }else{
    bleep(880, 0.05, "square", 0.9);
    bleep(1320, 0.045, "square", 0.8);
    spawn(Math.min(innerWidth - 70, innerWidth * 0.88), Math.min(innerHeight - 70, innerHeight * 0.86), 16, 0.9);
  }
}

/* ----------------------------
   Background music (Two-track + crossfade)
   - Controlled by MUSIC: OFF/LOW/HIGH
   - Ambient plays in normal mode
   - Arcade track plays in Arcade mode
-----------------------------*/
const bgmAmbient = document.getElementById("bgmAmbient");
const bgmArcade = document.getElementById("bgmArcade");
let bgmUnlocked = false;

function musicBaseVolume(){
  if(musicLevel === 1) return 0.10; // LOW
  if(musicLevel === 2) return 0.18; // HIGH
  return 0.0; // OFF
}
function targetVolumes(){
  const base = musicBaseVolume();
  return arcadeMode ? { ambient: 0.0, arcade: base } : { ambient: base, arcade: 0.0 };
}
function setImmediateVolumes(){
  const { ambient, arcade } = targetVolumes();
  if(bgmAmbient) bgmAmbient.volume = ambient;
  if(bgmArcade) bgmArcade.volume = arcade;
}
async function tryPlay(el){
  if(!el) return false;
  try{ await el.play(); return true; } catch { return false; }
}
function stopAllBgm(){
  if(bgmAmbient) { try { bgmAmbient.pause(); } catch{} }
  if(bgmArcade)  { try { bgmArcade.pause(); } catch{} }
}
function ensureBgmState(){
  if(musicLevel === 0){
    stopAllBgm();
    setImmediateVolumes();
    return;
  }
  Promise.all([tryPlay(bgmAmbient), tryPlay(bgmArcade)]).then((res) => {
    if(res.some(Boolean)) bgmUnlocked = true;
    setImmediateVolumes();
  });
}

let fadeRAF = null;
function crossfadeToTargets(durationMs = 900){
  if(musicLevel === 0){
    stopAllBgm();
    setImmediateVolumes();
    return;
  }

  ensureBgmState();

  const start = performance.now();
  const fromA = bgmAmbient ? bgmAmbient.volume : 0;
  const fromB = bgmArcade ? bgmArcade.volume : 0;
  const { ambient: toA, arcade: toB } = targetVolumes();

  if(fadeRAF) cancelAnimationFrame(fadeRAF);

  const tick = (t) => {
    const p = Math.min(1, (t - start) / durationMs);
    const e = p * p * (3 - 2 * p); // smoothstep

    const a = fromA + (toA - fromA) * e;
    const b = fromB + (toB - fromB) * e;

    if(bgmAmbient) bgmAmbient.volume = a;
    if(bgmArcade) bgmArcade.volume = b;

    if(p < 1) fadeRAF = requestAnimationFrame(tick);
  };
  fadeRAF = requestAnimationFrame(tick);
}

function syncBgmWithMusic(){
  if(musicLevel === 0){
    stopAllBgm();
    setImmediateVolumes();
    return;
  }
  ensureBgmState();
  crossfadeToTargets(350); // settle to new base
}
function syncBgmWithArcade(){
  if(musicLevel === 0){
    stopAllBgm();
    setImmediateVolumes();
    return;
  }
  crossfadeToTargets(900);
}

// try unlock after first gesture if music already enabled
window.addEventListener("pointerdown", () => {
  if(!bgmUnlocked && musicLevel > 0) ensureBgmState();
}, { passive: true });

// pause/resume on tab visibility
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "hidden"){
    stopAllBgm();
  }else{
    if(musicLevel > 0) ensureBgmState();
  }
});

// init volumes (no autoplay)
setImmediateVolumes();

/* ----------------------------
   Toggles UI
-----------------------------*/
const arcadeBtn = document.getElementById("arcadeToggle");
const fxBtn = document.getElementById("fxToggle");
const sfxBtn = document.getElementById("sfxToggle");
const musicBtn = document.getElementById("musicToggle");

function sfxLabel(){
  if(sfxLevel === 0) return "SFX: OFF";
  if(sfxLevel === 1) return "SFX: LOW";
  return "SFX: HIGH";
}
function musicLabel(){
  if(musicLevel === 0) return "MUSIC: OFF";
  if(musicLevel === 1) return "MUSIC: LOW";
  return "MUSIC: HIGH";
}

function syncToggleUI(){
  arcadeBtn?.setAttribute("aria-pressed", arcadeMode ? "true" : "false");
  if(arcadeBtn) arcadeBtn.textContent = `ARCADE: ${arcadeMode ? "ON" : "OFF"}`;

  fxBtn?.setAttribute("aria-pressed", fxHigh ? "true" : "false");
  if(fxBtn) fxBtn.textContent = `FX: ${fxHigh ? "HIGH" : "LOW"}`;

  sfxBtn?.setAttribute("aria-pressed", sfxLevel > 0 ? "true" : "false");
  if(sfxBtn) sfxBtn.textContent = sfxLabel();

  musicBtn?.setAttribute("aria-pressed", musicLevel > 0 ? "true" : "false");
  if(musicBtn) musicBtn.textContent = musicLabel();
}
syncToggleUI();

arcadeBtn?.addEventListener("click", () => {
  arcadeMode = !arcadeMode;
  root.dataset.arcade = arcadeMode ? "1" : "0";
  localStorage.setItem(LS_ARCADE, arcadeMode ? "1" : "0");
  syncToggleUI();
  unlock("arcade", "Arcade Mode", "Chaos enabled (optional).");
  bleep(520, 0.05, "sawtooth", 0.8);

  syncBgmWithArcade();
});

fxBtn?.addEventListener("click", () => {
  fxHigh = !fxHigh;
  root.dataset.fx = fxHigh ? "1" : "0";
  localStorage.setItem(LS_FX, fxHigh ? "1" : "0");
  syncToggleUI();
  unlock("fx_toggle", "FX Settings", `Effects set to ${fxHigh ? "HIGH" : "LOW"}.`);
});

sfxBtn?.addEventListener("click", () => {
  sfxLevel = (sfxLevel + 1) % 3; // OFF -> LOW -> HIGH -> OFF
  localStorage.setItem(LS_SFX_LEVEL, String(sfxLevel));
  syncToggleUI();

  if(sfxLevel > 0){
    ensureAudio(); // user gesture unlocks WebAudio
    bleep(740, 0.05, "square", 1.0);
    bleep(990, 0.05, "square", 0.9);
    unlock("sfx_on", "SFX Online", `SFX set to ${sfxLevel === 1 ? "LOW" : "HIGH"}.`);
  }else{
    unlock("sfx_off", "Quiet UI", "SFX disabled.");
  }
});

musicBtn?.addEventListener("click", () => {
  musicLevel = (musicLevel + 1) % 3; // OFF -> LOW -> HIGH -> OFF
  localStorage.setItem(LS_MUSIC_LEVEL, String(musicLevel));
  syncToggleUI();

  if(musicLevel > 0){
    unlock("music_on", "Soundtrack", `Music set to ${musicLevel === 1 ? "LOW" : "HIGH"}.`);
  }else{
    unlock("music_off", "No Soundtrack", "Music disabled.");
  }

  syncBgmWithMusic();
});

// UI click sounds (SFX only)
document.addEventListener("pointerdown", (e) => {
  const t = e.target;
  if(!(t instanceof Element)) return;
  if(t.closest("a, button, .btn")) bleep(520, 0.04, "square", 0.7);
}, { passive:true });

// Hover bleep only in Arcade + SFX HIGH + desktop
document.addEventListener("pointerover", (e) => {
  if(!arcadeMode) return;
  if(sfxLevel !== 2) return;
  if(window.innerWidth < 980) return;
  const t = e.target;
  if(!(t instanceof Element)) return;
  if(t.closest("a, button, .btn, .card")) bleep(880, 0.02, "sine", 0.5);
}, { passive:true });

/* ----------------------------
   Particles (performance guarded)
-----------------------------*/
const fx = document.getElementById("fx");
const ctx2 = fx?.getContext("2d");

function isHidden(){ return document.visibilityState === "hidden"; }

let rafId = null;
let running = false;
let lastT = 0;

const particleCap = 600;
const particles = [];

function resizeFx(){
  if(!fx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = Math.floor(innerWidth * dpr);
  fx.height = Math.floor(innerHeight * dpr);
  fx.style.width = innerWidth + "px";
  fx.style.height = innerHeight + "px";
  if(ctx2) ctx2.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resizeFx, { passive:true });
resizeFx();

function startFX(){
  if(running) return;
  running = true;
  lastT = performance.now();
  rafId = requestAnimationFrame(tick);
}
function stopFX(){
  if(!running) return;
  running = false;
  if(rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function spawn(x,y, n=18, power=1){
  if(!ctx2) return;
  if(!fxHigh) return;

  if(innerWidth < 980) n = Math.max(6, Math.floor(n * 0.6));

  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const s = (Math.random()*2.6 + 1.2) * power;
    particles.push({
      x, y,
      vx: Math.cos(a)*s,
      vy: Math.sin(a)*s,
      life: 1,
      r: Math.random()*2.2 + 0.8,
      hue: [190, 310, 95][Math.floor(Math.random()*3)]
    });
  }

  if(particles.length > particleCap){
    particles.splice(0, particles.length - particleCap);
  }

  startFX();
}

function tick(t){
  if(!ctx2){ stopFX(); return; }
  if(isHidden()){ stopFX(); return; }

  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  ctx2.clearRect(0,0,innerWidth,innerHeight);

  // Spark rain only when Arcade + FX high
  if(arcadeMode && fxHigh){
    const rate = innerWidth < 980 ? 1 : 3;
    for(let k=0; k<rate; k++){
      if(Math.random() < 0.75){
        const x = Math.random() * innerWidth;
        const y = -10;
        for(let i=0;i<2;i++){
          particles.push({
            x, y,
            vx: (Math.random()-0.5) * 0.8,
            vy: (Math.random()*3.2 + 2.2),
            life: 1,
            r: Math.random()*1.6 + 0.6,
            hue: [190, 310, 95][Math.floor(Math.random()*3)]
          });
        }
      }
    }
    if(particles.length > particleCap){
      particles.splice(0, particles.length - particleCap);
    }
  }

  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life -= (0.9 * dt);
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.vy = p.vy*0.98 + 0.03;

    if(p.life <= 0){ particles.splice(i,1); continue; }

    ctx2.globalAlpha = Math.max(p.life, 0);
    ctx2.fillStyle = `hsla(${p.hue}, 100%, 65%, ${p.life})`;
    ctx2.beginPath();
    ctx2.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx2.fill();
  }
  ctx2.globalAlpha = 1;

  if(particles.length === 0 && !(arcadeMode && fxHigh)){
    stopFX();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    if(particles.length > 0 || (arcadeMode && fxHigh)) startFX();
  }
});

document.addEventListener("pointerdown", (e) => {
  spawn(e.clientX, e.clientY, arcadeMode ? 22 : 12, arcadeMode ? 1.05 : 0.85);
  if(arcadeMode && fxHigh) shake();
}, { passive:true });

document.addEventListener("pointerover", (e) => {
  if(!fxHigh) return;
  const t = e.target;
  if(!(t instanceof Element)) return;
  if(t.closest(".card, .btn")){
    const r = t.getBoundingClientRect();
    spawn(r.left + r.width*0.5, r.top + 8, arcadeMode ? 8 : 5, 0.6);
  }
}, { passive:true });

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
const done = new Set(JSON.parse(localStorage.getItem(LS_QUEST) || "[]"));

function setQuestLabel(a, checked){
  const txt = a.textContent.replace(/^\[\s?[x ]\s?\]\s*/i, "");
  a.textContent = `${checked ? "[x]" : "[ ]"} ${txt}`;
}

questLinks.forEach(a => {
  const id = (a.getAttribute("href") || "").slice(1);
  const isDone = done.has(id);
  if(isDone) a.classList.add("done");
  setQuestLabel(a, isDone);
});

function updateQuestMeter(){
  const total = questLinks.length || 1;
  const pct = Math.round((done.size / total) * 100);
  if(questFill) questFill.style.width = pct + "%";
  if(questText) questText.textContent = `${pct}% CLEAR`;
  if(pct === 100) unlock("clear_100", "100% CLEAR", "All quests completed.");
}
updateQuestMeter();

function setDone(id){
  done.add(id);
  localStorage.setItem(LS_QUEST, JSON.stringify([...done]));
  questLinks.forEach(a => {
    if(a.getAttribute("href") === "#" + id){
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
    if(!link) return;

    if(en.isIntersecting){
      questLinks.forEach(a => a.classList.remove("active"));
      link.classList.add("active");

      if(!done.has(id)){
        setDone(id);
        unlock("quest_" + id, "Quest Progress", `Visited: ${id}`);
      }
    }
  });
}, { threshold: 0.35 });

sectionEls.forEach(s => secIO.observe(s));

// Resume click achievement
document.querySelectorAll('a[href$=".pdf"], a[href*="Donald_Hui_Resume"]').forEach(a => {
  a.addEventListener("click", () => unlock("resume_open", "Paper Trail", "Opened the resume."), { passive:true });
});

// Prevent tiny scroll jumps when clicking interactive elements (keeps keyboard focus normal)
document.addEventListener("pointerdown", (e) => {
  const el = e.target instanceof Element ? e.target.closest("a, button, .btn") : null;
  if (!el) return;

  // Only for pointer interactions (mouse/touch), not keyboard.
  // Prevents the browser from "scrolling to focused element".
  if (typeof el.focus === "function") el.focus({ preventScroll: true });
}, { passive: true });
