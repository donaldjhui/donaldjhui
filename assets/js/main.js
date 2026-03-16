document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const menuBtn = document.getElementById('menuBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const questDrawer = document.getElementById('questDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const questText = document.getElementById('questText');
    const pointsValue = document.getElementById('pointsValue');

    // --- State ---
    let points = 0;
    let sfxOn = true;

    // --- Settings Menu ---
    if (menuBtn && settingsMenu) {
        menuBtn.onclick = (e) => {
            e.stopPropagation();
            settingsMenu.classList.toggle('active');
        };
    }

    // Close menu when clicking outside
    window.onclick = (e) => {
        if (settingsMenu && !settingsMenu.contains(e.target) && e.target !== menuBtn) {
            settingsMenu.classList.remove('active');
        }
    };

    // --- Quest Drawer ---
    if (questText && questDrawer) {
        questText.onclick = () => {
            questDrawer.classList.add('open');
            if(drawerOverlay) drawerOverlay.classList.add('active');
        };
    }

    if (drawerOverlay) {
        drawerOverlay.onclick = () => {
            questDrawer.classList.remove('open');
            drawerOverlay.classList.remove('active');
        };
    }

    // --- Toggles ---
    const sfxToggle = document.getElementById('sfxToggle');
    if (sfxToggle) {
        sfxToggle.onclick = () => {
            sfxOn = !sfxOn;
            sfxToggle.innerText = `SFX: ${sfxOn ? 'ON' : 'OFF'}`;
        };
    }

    const resetBtn = document.getElementById('pointsResetBtn');
    if (resetBtn) {
        resetBtn.onclick = () => {
            points = 0;
            if(pointsValue) pointsValue.innerText = points;
        };
    }

    console.log("System Ready.");
});
