/* UI glue: binds DOM to Game API */
document.addEventListener("DOMContentLoaded", () => {
  const bitsEl = document.querySelector("#bits");
  const perClickEl = document.querySelector("#per-click");
  const perSecondEl = document.querySelector("#per-second");
  const clickBtn = document.querySelector("#click-btn");
  const upgradeListEl = document.querySelector("#upgrade-list");
  const resetBtn = document.querySelector("#reset-btn");
  const sciToggleEl = document.querySelector("#sci-toggle");
  const template = document.querySelector("#upgrade-template");

  const upgradeButtons = new Map();

  function initUpgradeButtons() {
    for (const upgrade of Game.getUpgradeDefs()) {
      const node = template.content.firstElementChild.cloneNode(true);
      node.querySelector(".upgrade-name").textContent = upgrade.name;
      node.querySelector(".upgrade-desc").textContent = upgrade.description;
      node.addEventListener("click", () => Game.buyUpgrade(upgrade.id));
      upgradeButtons.set(upgrade.id, node);
      upgradeListEl.appendChild(node);
    }
  }

  function render() {
    const state = Game.getState();
    sciToggleEl.checked = Boolean(state.scientificAtTrillion);
    bitsEl.textContent = Game.formatNum(state.bits);
    perClickEl.textContent = Game.formatNum(Game.getEffectivePerClick());
    perSecondEl.textContent = Game.formatNum(Game.getEffectivePerSecond());

    for (const upgrade of Game.getUpgradeDefs()) {
      const owned = state.upgrades[upgrade.id] || 0;
      const cost = Game.calculateCost(upgrade, owned);
      const button = upgradeButtons.get(upgrade.id);
      if (!button) continue;
      button.querySelector(".upgrade-cost").textContent = `${Game.formatNum(cost)} bits`;
      button.querySelector(".upgrade-owned").textContent = `Owned: ${owned}`;
      button.disabled = state.bits < cost;
    }
  }

  initUpgradeButtons();
  render();

  Game.onChange(render);

  // Click effect: increases visual intensity when clicked continuously
  let clickStreak = 0;
  let lastClick = 0;
  let decayTimer = null;

  function setIntensity(v) {
    clickBtn.style.setProperty("--click-intensity", String(v));
    if (v > 0) clickBtn.classList.add("cool");
    else clickBtn.classList.remove("cool");
  }

  clickBtn.addEventListener("click", () => {
    Game.clickCore();
    const now = Date.now();
    if (now - lastClick < 400) {
      clickStreak = Math.min(12, clickStreak + 1);
    } else {
      clickStreak = 1;
    }
    lastClick = now;

    // reduce growth effect by 50%: both multiplier and cap halved
    let intensity = Math.min(1.5, clickStreak * 0.14);
    setIntensity(intensity);

    // small press feedback
    clickBtn.classList.add("pressed");
    setTimeout(() => clickBtn.classList.remove("pressed"), 100);

    // spawn particle burst (count proportional to intensity)
    const particleCount = Math.max(4, Math.round(intensity * 8));
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const angle = Math.random() * Math.PI * 2;
      const baseDist = 28 + Math.random() * 34; // base distance
      const dist = baseDist * (0.6 + intensity * 0.8); // scale with intensity
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist * 0.7; // slightly flattened
      p.style.setProperty("--dx", `${dx.toFixed(2)}px`);
      p.style.setProperty("--dy", `${dy.toFixed(2)}px`);
      const size = Math.round(6 + Math.random() * 8 + intensity * 6);
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      // color mix between accent and accent-2
      const useAlt = Math.random() > 0.6;
      p.style.background = useAlt
        ? "radial-gradient(circle, rgba(72,255,155,0.95), transparent 45%)"
        : "radial-gradient(circle, rgba(0,212,255,0.95), transparent 45%)";
      clickBtn.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }

    // decay intensity over time (fades faster now)
    if (decayTimer) clearTimeout(decayTimer);
    decayTimer = setTimeout(() => {
      (function fade() {
        intensity = Math.max(0, intensity - 0.12);
        setIntensity(intensity);
        if (intensity > 0.02) setTimeout(fade, 80);
      })();
    }, 140);
  });

  resetBtn.addEventListener("click", () => {
    const ok = window.confirm("Reset all progress for Digital Clicker?");
    if (!ok) return;
    Game.resetAll();
  });

  sciToggleEl.addEventListener("change", () => Game.setScientificAtTrillion(sciToggleEl.checked));
});
