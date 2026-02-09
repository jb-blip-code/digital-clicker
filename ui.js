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

    let intensity = Math.min(3, clickStreak * 0.28);
    setIntensity(intensity);

    // small press feedback
    clickBtn.classList.add("pressed");
    setTimeout(() => clickBtn.classList.remove("pressed"), 120);

    // decay intensity over time
    if (decayTimer) clearTimeout(decayTimer);
    decayTimer = setTimeout(() => {
      (function fade() {
        intensity = Math.max(0, intensity - 0.18);
        setIntensity(intensity);
        if (intensity > 0.02) setTimeout(fade, 90);
      })();
    }, 180);
  });

  resetBtn.addEventListener("click", () => {
    const ok = window.confirm("Reset all progress for Digital Clicker?");
    if (!ok) return;
    Game.resetAll();
  });

  sciToggleEl.addEventListener("change", () => Game.setScientificAtTrillion(sciToggleEl.checked));
});
