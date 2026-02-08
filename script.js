const SAVE_KEY = "digital_clicker_save_v1";

const UPGRADE_DEFS = [
  {
    id: "finger-rig",
    name: "Finger Rig",
    description: "+1 per click",
    baseCost: 15,
    growth: 1.45,
    apply: (state) => {
      state.perClick += 1;
    },
  },
  {
    id: "auto-pinger",
    name: "Auto Pinger",
    description: "+0.5 bits/sec",
    baseCost: 40,
    growth: 1.5,
    apply: (state) => {
      state.perSecond += 0.5;
    },
  },
  {
    id: "server-rack",
    name: "Server Rack",
    description: "+4 per click, +1.5 bits/sec",
    baseCost: 140,
    growth: 1.65,
    apply: (state) => {
      state.perClick += 4;
      state.perSecond += 1.5;
    },
  },
  {
    id: "data-center",
    name: "Data Center",
    description: "+15 per click, +6 bits/sec",
    baseCost: 900,
    growth: 1.75,
    apply: (state) => {
      state.perClick += 15;
      state.perSecond += 6;
    },
  },
  {
    id: "super-cluster",
    name: "Super Cluster",
    description: "+75 per click, +30 bits/sec",
    baseCost: 6500,
    growth: 1.9,
    apply: (state) => {
      state.perClick += 75;
      state.perSecond += 30;
    },
  },
];

const defaultState = () => ({
  bits: 0,
  perClick: 1,
  perSecond: 0,
  upgrades: Object.fromEntries(UPGRADE_DEFS.map((u) => [u.id, 0])),
});

const state = loadState();

const bitsEl = document.querySelector("#bits");
const perClickEl = document.querySelector("#per-click");
const perSecondEl = document.querySelector("#per-second");
const clickBtn = document.querySelector("#click-btn");
const upgradeListEl = document.querySelector("#upgrade-list");
const resetBtn = document.querySelector("#reset-btn");
const template = document.querySelector("#upgrade-template");

const upgradeButtons = new Map();

initUpgradeButtons();
render();

clickBtn.addEventListener("click", () => {
  state.bits += state.perClick;
  render();
});

resetBtn.addEventListener("click", () => {
  const ok = window.confirm("Reset all progress for Digital Clicker?");
  if (!ok) return;

  Object.assign(state, defaultState());
  saveState();
  render();
});

setInterval(() => {
  if (state.perSecond > 0) {
    state.bits += state.perSecond;
    render();
  }
}, 1000);

setInterval(() => {
  saveState();
}, 5000);

window.addEventListener("beforeunload", saveState);

function initUpgradeButtons() {
  for (const upgrade of UPGRADE_DEFS) {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector(".upgrade-name").textContent = upgrade.name;
    node.querySelector(".upgrade-desc").textContent = upgrade.description;

    node.addEventListener("click", () => {
      buyUpgrade(upgrade.id);
    });

    upgradeButtons.set(upgrade.id, node);
    upgradeListEl.appendChild(node);
  }
}

function buyUpgrade(upgradeId) {
  const upgrade = UPGRADE_DEFS.find((u) => u.id === upgradeId);
  if (!upgrade) return;

  const owned = state.upgrades[upgrade.id] || 0;
  const cost = calculateCost(upgrade, owned);

  if (state.bits < cost) return;

  state.bits -= cost;
  state.upgrades[upgrade.id] = owned + 1;
  upgrade.apply(state);
  render();
}

function calculateCost(upgrade, owned) {
  return Math.floor(upgrade.baseCost * upgrade.growth ** owned);
}

function render() {
  bitsEl.textContent = formatNum(state.bits);
  perClickEl.textContent = formatNum(state.perClick);
  perSecondEl.textContent = formatNum(state.perSecond);

  for (const upgrade of UPGRADE_DEFS) {
    const owned = state.upgrades[upgrade.id] || 0;
    const cost = calculateCost(upgrade, owned);
    const button = upgradeButtons.get(upgrade.id);
    if (!button) continue;

    button.querySelector(".upgrade-cost").textContent = `${formatNum(cost)} bits`;
    button.querySelector(".upgrade-owned").textContent = `Owned: ${owned}`;
    button.disabled = state.bits < cost;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();

    const parsed = JSON.parse(raw);
    const clean = defaultState();

    if (typeof parsed.bits === "number" && Number.isFinite(parsed.bits)) {
      clean.bits = Math.max(0, parsed.bits);
    }
    if (typeof parsed.perClick === "number" && Number.isFinite(parsed.perClick)) {
      clean.perClick = Math.max(0, parsed.perClick);
    }
    if (typeof parsed.perSecond === "number" && Number.isFinite(parsed.perSecond)) {
      clean.perSecond = Math.max(0, parsed.perSecond);
    }
    if (parsed.upgrades && typeof parsed.upgrades === "object") {
      for (const key of Object.keys(clean.upgrades)) {
        const value = parsed.upgrades[key];
        if (typeof value === "number" && Number.isFinite(value)) {
          clean.upgrades[key] = Math.max(0, Math.floor(value));
        }
      }
    }

    return clean;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function formatNum(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.floor(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
}
