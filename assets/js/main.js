// Year
document.getElementById("year").textContent = new Date().getFullYear();

// Elements
const root = document.documentElement;
const hero = document.querySelector(".hero-main");

// Defaults: professional
const LS_ARCADE = "arcadeMode";
const LS_FX = "fxHigh";          // "1" = HIGH (default), "0" = LOW
const LS_SOUND_LEVEL = "soundLevel"; // "0" OFF, "1" LOW, "2" HIGH

let arcadeMode = localStorage.getItem(LS_ARCADE) === "1";
let fxHigh = localStorage.getItem(LS_FX);
fxHigh = fxHigh === null ? true : fxHigh === "1";

let soundLevel = localStorage.getItem(LS_SOUND_LEVEL);
soundLevel = soundLevel === null ? 0 : Number(soundLevel); // 0/1/2

root.dataset.arcade = arcadeMode ? "1" : "0";
root.dataset.fx = fxHigh ? "1" : "0";

// Pointer-reactive aurora + hero tilt (reduced on mobile / FX low)
function shouldTilt(){
  if(!fxHigh) return false;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  // reduce tilt on smaller screens
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

// Reticle follow (disabled if FX low or mobile via CSS)
const reticle = document.querySelector(".reticle");
window.addEventListener("pointermove", (e) => {
  if(!reticle || !fxHigh) return;
  reticle.style.left = e.clientX + "px";
  reticle.style.top = e.clientY + "px";
}, { passive:true });

/* ----------------------------
   Sound system (OFF/LOW/HIGH)
-----------------------------*/
let audioCtx = null;
function ensureAudio(){
  if(audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function levelGain(){
  // tuned to be subtle; HIGH is still not obnoxious
  if(soundLevel === 1) return 0.018;
  if(soundLevel === 2) return 0.04;
  return 0;
}
function bleep(freq=660, dur=0.05, type="sine", gainMult=1){
  const base = levelGain();
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

const LS_ACH = "achievements_v2";
const achieved = new Set(JSON.parse(localStorage.getItem(LS_ACH) || "[]"));

function shake(){
  if(!fxHigh) return;
  if (matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.remove("shake");
  void document.documentElement.offsetWidth;
  document.documentElement.classList.add("shake");
  setTimeout(() => document.documentElement.classList.remove("shake"), 420);
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
    spawn(Math.min(innerWidth - 70, innerWidth * 0.88), Math.min(innerHeight - 70, innerHeight * 0.86), 48, 1.25);
  }else{
    bleep(880, 0.05, "square", 0.9);
    bleep(1320, 0.045, "square", 0.8);
    spawn(Math.min(innerWidth - 70, innerWidth * 0.88), Math.min(innerHeight - 70, innerHeight * 0.86), 18, 0.9);
  }
}

/* ----------------------------
   Toggles UI
-----------------------------*/
const arcadeBtn = document.getElementById("arcadeToggle");
const fxBtn = document.getElementById("fxToggle");
const soundBtn = document.getElementById("soundToggle");

function soundLabel(){
  if(soundLevel === 0) return "SOUND: OFF";
  if(soundLevel === 1) return "SOUND: LOW";
  return "SOUND: HIGH";
}
function syncToggleUI(){
  arcadeBtn?.setAttribute("aria-pressed", arcadeMode ? "true" : "false");
  if(arcadeBtn) arcadeBtn.textContent = `ARCADE: ${arcadeMode ? "ON" : "OFF"}`;

  fxBtn?.setAttribute("aria-pressed", fxHigh ? "true" : "false");
  if(fxBtn) fxBtn.textContent = `FX: ${fxHigh ? "HIGH" : "LOW"}`;

  soundBtn?.setAttribute("aria-pressed", soundLevel > 0 ? "true" : "false");
  if(soundBtn) soundBtn.textContent = soundLabel();
}
syncToggleUI();

arcadeBtn?.addEventListener("click", () => {
  arcadeMode = !arcadeMode;
  root.dataset.arcade = arcadeMode ? "1" : "0";
  localStorage.setItem(LS_ARCADE, arcadeMode ? "1" : "0");
  syncToggleUI();
  unlock("arcade", "Arcade Mode", "Chaos enabled (optional).");
  bleep(520, 0.05, "sawtooth", 0.8);
});

fxBtn?.addEventListener("click", () => {
  fxHigh = !fxHigh;
  root.dataset.fx = fxHigh ? "1" : "0";
  localStorage.setItem(LS_FX, fxHigh ? "1" : "0");
  syncToggleUI();
  unlock("fx_toggle", "FX Settings", `Effects set to ${fxHigh ? "HIGH" : "LOW"}.`);
});

soundBtn?.addEventListener("click", () => {
  // cycle OFF -> LOW -> HIGH -> OFF
  soundLevel = (soundLevel + 1) % 3;
  localStorage.setItem(LS_SOUND_LEVEL, String(soundLevel));
  syncToggleUI();

  if(soundLevel > 0){
    ensureAudio(); // user gesture
    bleep(740, 0.05, "square", 0.9);
    bleep(990, 0.05, "square", 0.85);
    unlock("sound", "Sound System", `Audio set to ${soundLevel === 1 ? "LOW" : "HIGH"}.`);
  }else{
    unlock("sound_off", "Silence", "Audio disabled.");
  }
});

// UI click sounds (no hover sounds on mobile)
document.addEventListener("pointerdown", (e) => {
  const t = e.target;
  if(!(t instanceof Element)) return;
  if(t.closest("a, button, .btn")) bleep(520, 0.04, "square", 0.7);
}, { passive:true });

// Hover bleep only in Arcade + Sound HIGH + desktop
document.addEventListener("pointerover", (e) => {
  if(!arcadeMode) return;
  if(soundLevel !== 2) return;
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

function isHidden(){
  return document.visibilityState === "hidden";
}

let rafId = null;
let running = false;
let lastT = 0;

let particleCap = 600; // guardrail
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

function spawn(x,y, n=18, power=1){
  if(!ctx2) return;
  if(!fxHigh) return;

  // reduce counts on small screens automatically
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

  // cap
  if(particles.length > particleCap){
    particles.splice(0, particles.length - particleCap);
  }

  startFX();
}

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

function tick(t){
  if(!ctx2){ stopFX(); return; }
  if(isHidden()){
    // pause rendering to save power
    stopFX();
    return;
  }

  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  ctx2.clearRect(0,0,innerWidth,innerHeight);

  // Spark rain ONLY when Arcade + FX high
  if(arcadeMode && fxHigh){
    // rate scales with desktop vs mobile
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

  // update/draw
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

  // If nothing to draw and Arcade rain is off, stop RAF
  if(particles.length === 0 && !(arcadeMode && fxHigh)){
    stopFX();
    return;
  }

  rafId = requestAnimationFrame(tick);
}

// resume after tab becomes visible
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible"){
    if(particles.length > 0 || (arcadeMode && fxHigh)) startFX();
  }
});

// Interaction particles + optional click shake in Arcade
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
  // change [ ] -> [x] for non-color indicator
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