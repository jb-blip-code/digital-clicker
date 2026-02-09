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

  clickBtn.addEventListener("click", () => Game.clickCore());

  resetBtn.addEventListener("click", () => {
    const ok = window.confirm("Reset all progress for Digital Clicker?");
    if (!ok) return;
    Game.resetAll();
  });

  sciToggleEl.addEventListener("change", () => Game.setScientificAtTrillion(sciToggleEl.checked));
});
