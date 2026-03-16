// --- Core State ---
let points = 0;
let sfxOn = true;
let musicOn = false;
let fxHigh = window.innerWidth > 980;
let arcadeMode = false;

// --- Elements ---
const menuBtn = document.getElementById('menuBtn');
const settingsMenu = document.getElementById('settingsMenu');
const questDrawer = document.getElementById('questDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const questText = document.getElementById('questText');

// --- Settings Menu Logic ---
menuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  settingsMenu.classList.toggle('active');
  if (sfxOn) bleep(600, 0.05);
});

document.addEventListener('click', (e) => {
  if (settingsMenu && !settingsMenu.contains(e.target) && e.target !== menuBtn) {
    settingsMenu.classList.remove('active');
  }
});

// --- Quest Log Drawer Logic (Mobile) ---
questText?.addEventListener('click', () => {
  if (window.innerWidth <= 980) {
    questDrawer.classList.add('open');
    drawerOverlay.classList.add('active');
  }
});

drawerOverlay?.addEventListener('click', () => {
  questDrawer.classList.remove('open');
  drawerOverlay.classList.remove('active');
});

// --- Toggle Functionality ---
document.getElementById('sfxToggle')?.addEventListener('click', (e) => {
  sfxOn = !sfxOn;
  e.target.textContent = `SFX: ${sfxOn ? 'ON' : 'OFF'}`;
});

document.getElementById('musicToggle')?.addEventListener('click', (e) => {
  musicOn = !musicOn;
  e.target.textContent = `MUSIC: ${musicOn ? 'ON' : 'OFF'}`;
  // Add your music play/stop logic here
});

document.getElementById('fxToggle')?.addEventListener('click', (e) => {
  fxHigh = !fxHigh;
  e.target.textContent = `FX: ${fxHigh ? 'HIGH' : 'LOW'}`;
  document.documentElement.dataset.fx = fxHigh ? "1" : "0";
});

document.getElementById('arcadeToggle')?.addEventListener('click', (e) => {
  arcadeMode = !arcadeMode;
  e.target.textContent = `ARCADE: ${arcadeMode ? 'ON' : 'OFF'}`;
  document.documentElement.dataset.arcade = arcadeMode ? "1" : "0";
});

document.getElementById('pointsResetBtn')?.addEventListener('click', () => {
  points = 0;
  document.getElementById('pointsValue').textContent = "0";
});

// --- Target / Reveal System ---
document.querySelectorAll('.target').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.closest('section');
    const panelId = btn.getAttribute('aria-controls');
    section.classList.remove('locked');
    section.classList.add('unlocked');
    document.getElementById(panelId).hidden = false;
    btn.style.display = 'none';
    
    points += 100;
    document.getElementById('pointsValue').textContent = points;
    if (sfxOn) bleep(880, 0.1, "square");
  });
});

// --- Intersection Observer (Reveal) ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// --- Basic SFX ---
function bleep(freq = 660, dur = 0.05, type = "sine") {
  if (!sfxOn) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

// Set Year
document.getElementById('year').textContent = new Date().getFullYear();

// Dismiss Boot
document.getElementById('boot').addEventListener('click', () => {
  document.getElementById('boot').style.display = 'none';
});
setTimeout(() => document.getElementById('boot').style.display = 'none', 2500);
