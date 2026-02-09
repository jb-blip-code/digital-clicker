const SAVE_KEY = "digital_clicker_save_v1";
const BASE_AUTO_INTERVAL_MS = 1000;
const MIN_AUTO_INTERVAL_MS = 100;
const SCI_NOTATION_THRESHOLD = 1_000_000_000_000;
const INNER_LOOP_INTERVAL_STEP_MS = 100;
const INNER_LOOP_OVERCLOCK_MULTIPLIER = 1.5;
const MAX_INNER_LOOP_SPEED_RANKS =
  (BASE_AUTO_INTERVAL_MS - MIN_AUTO_INTERVAL_MS) / INNER_LOOP_INTERVAL_STEP_MS;
const LARGE_NUM_SUFFIXES = [
  { value: 1_000_000_000_000_000_000_000_000_000_000_000, suffix: "De" },
  { value: 1_000_000_000_000_000_000_000_000_000_000, suffix: "No" },
  { value: 1_000_000_000_000_000_000_000_000_000, suffix: "Oc" },
  { value: 1_000_000_000_000_000_000_000_000, suffix: "Sp" },
  { value: 1_000_000_000_000_000_000_000, suffix: "Sx" },
  { value: 1_000_000_000_000_000_000, suffix: "Qi" },
  { value: 1_000_000_000_000_000, suffix: "Qa" },
  { value: 1_000_000_000_000, suffix: "T" },
  { value: 1_000_000_000, suffix: "B" },
  { value: 1_000_000, suffix: "M" },
];

const UPGRADE_DEFS = [
  {
    id: "finger-rig",
    name: "GPU Rig",
    description: "+1 per click",
    baseCost: 15,
    growth: 1.45,
    apply: (state) => {
      state.perClick += 1;
    },
  },
  {
    id: "auto-pinger",
    name: "ASIC Rig",
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
  {
    id: "inner-loop",
    name: "Shrink Inner Loop",
    description: "-0.1s auto interval; cap: +50% bits",
    baseCost: 18000,
    growth: 1.9,
    apply: (state) => {
      if (state.autoIntervalMs > MIN_AUTO_INTERVAL_MS) {
        state.autoIntervalMs = Math.max(
          MIN_AUTO_INTERVAL_MS,
          state.autoIntervalMs - INNER_LOOP_INTERVAL_STEP_MS,
        );
        return;
      }

      state.innerLoopOverclock *= INNER_LOOP_OVERCLOCK_MULTIPLIER;
    },
  },
  {
    id: "prompt-foundry",
    name: "Prompt Foundry",
    description: "+260 per click, +120 bits/sec",
    baseCost: 28000,
    growth: 1.95,
    apply: (state) => {
      state.perClick += 260;
      state.perSecond += 120;
    },
  },
  {
    id: "tensor-bloom-array",
    name: "Recursive Learning",
    description: "x2 bits gained multiplier",
    baseCost: 120000,
    growth: 2,
    apply: (state) => {
      state.bitsMultiplier *= 2;
    },
  },
  {
    id: "orbital-ai-satellite",
    name: "Orbital AI Satellite",
    description: "+6400 per click, +2800 bits/sec",
    baseCost: 650000,
    growth: 2.1,
    apply: (state) => {
      state.perClick += 6400;
      state.perSecond += 2800;
    },
  },
  {
    id: "dyson-swarm",
    name: "Dyson Swarm",
    description: "+42000 per click, +19000 bits/sec",
    baseCost: 4500000,
    growth: 2.2,
    apply: (state) => {
      state.perClick += 42000;
      state.perSecond += 19000;
    },
  },
];

const defaultState = () => ({
  bits: 0,
  perClick: 1,
  perSecond: 0,
  bitsMultiplier: 1,
  innerLoopOverclock: 1,
  scientificAtTrillion: false,
  autoIntervalMs: BASE_AUTO_INTERVAL_MS,
  upgrades: Object.fromEntries(UPGRADE_DEFS.map((u) => [u.id, 0])),
});

const state = loadState();

const bitsEl = document.querySelector("#bits");
const perClickEl = document.querySelector("#per-click");
const perSecondEl = document.querySelector("#per-second");
const clickBtn = document.querySelector("#click-btn");
const upgradeListEl = document.querySelector("#upgrade-list");
const resetBtn = document.querySelector("#reset-btn");
const sciToggleEl = document.querySelector("#sci-toggle");
const template = document.querySelector("#upgrade-template");

const upgradeButtons = new Map();
let passiveTimerId = null;

initUpgradeButtons();
render();
restartPassiveLoop();

clickBtn.addEventListener("click", () => {
  state.bits += getEffectivePerClick();
  render();
});

resetBtn.addEventListener("click", () => {
  const ok = window.confirm("Reset all progress for Digital Clicker?");
  if (!ok) return;

  Object.assign(state, defaultState());
  saveState();
  restartPassiveLoop();
  render();
});

sciToggleEl.addEventListener("change", () => {
  state.scientificAtTrillion = sciToggleEl.checked;
  saveState();
  render();
});

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
  restartPassiveLoop();
  render();
}

function calculateCost(upgrade, owned) {
  return Math.floor(upgrade.baseCost * upgrade.growth ** owned);
}

function render() {
  sciToggleEl.checked = Boolean(state.scientificAtTrillion);
  bitsEl.textContent = formatNum(state.bits);
  perClickEl.textContent = formatNum(getEffectivePerClick());
  perSecondEl.textContent = formatNum(getEffectivePerSecond());

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
    const hasSavedInnerLoopOverclock =
      typeof parsed.innerLoopOverclock === "number" && Number.isFinite(parsed.innerLoopOverclock);

    if (typeof parsed.bits === "number" && Number.isFinite(parsed.bits)) {
      clean.bits = Math.max(0, parsed.bits);
    }
    if (typeof parsed.perClick === "number" && Number.isFinite(parsed.perClick)) {
      clean.perClick = Math.max(0, parsed.perClick);
    }
    if (typeof parsed.perSecond === "number" && Number.isFinite(parsed.perSecond)) {
      clean.perSecond = Math.max(0, parsed.perSecond);
    }
    if (typeof parsed.bitsMultiplier === "number" && Number.isFinite(parsed.bitsMultiplier)) {
      clean.bitsMultiplier = Math.max(1, parsed.bitsMultiplier);
    }
    if (typeof parsed.scientificAtTrillion === "boolean") {
      clean.scientificAtTrillion = parsed.scientificAtTrillion;
    }
    if (hasSavedInnerLoopOverclock) {
      clean.innerLoopOverclock = Math.max(1, parsed.innerLoopOverclock);
    }
    if (typeof parsed.autoIntervalMs === "number" && Number.isFinite(parsed.autoIntervalMs)) {
      clean.autoIntervalMs = Math.min(
        BASE_AUTO_INTERVAL_MS,
        Math.max(MIN_AUTO_INTERVAL_MS, parsed.autoIntervalMs),
      );
    }
    if (parsed.upgrades && typeof parsed.upgrades === "object") {
      for (const key of Object.keys(clean.upgrades)) {
        const value = parsed.upgrades[key];
        if (typeof value === "number" && Number.isFinite(value)) {
          clean.upgrades[key] = Math.max(0, Math.floor(value));
        }
      }
    }

    if (!hasSavedInnerLoopOverclock) {
      const innerLoopOwned = clean.upgrades["inner-loop"] || 0;
      const overflowRanks = Math.max(0, innerLoopOwned - MAX_INNER_LOOP_SPEED_RANKS);
      clean.innerLoopOverclock = INNER_LOOP_OVERCLOCK_MULTIPLIER ** overflowRanks;
    }

    return clean;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function restartPassiveLoop() {
  if (passiveTimerId !== null) {
    clearTimeout(passiveTimerId);
  }

  const tick = () => {
    if (state.perSecond > 0) {
      state.bits += state.perSecond * state.bitsMultiplier * state.innerLoopOverclock;
      render();
    }
    passiveTimerId = window.setTimeout(tick, state.autoIntervalMs);
  };

  passiveTimerId = window.setTimeout(tick, state.autoIntervalMs);
}

function getEffectivePerSecond() {
  return (
    state.perSecond *
    state.bitsMultiplier *
    state.innerLoopOverclock *
    (BASE_AUTO_INTERVAL_MS / state.autoIntervalMs)
  );
}

function getEffectivePerClick() {
  return state.perClick * state.bitsMultiplier * state.innerLoopOverclock;
}

function formatNum(value) {
  const absValue = Math.abs(value);

  if (state.scientificAtTrillion && absValue >= SCI_NOTATION_THRESHOLD) {
    return value.toExponential(2);
  }

  for (const unit of LARGE_NUM_SUFFIXES) {
    if (absValue >= unit.value) {
      const digits = unit.value >= SCI_NOTATION_THRESHOLD ? 2 : 1;
      return `${(value / unit.value).toFixed(digits)}${unit.suffix}`;
    }
  }

  if (absValue >= 10_000) return `${Math.floor(value / 1_000)}K`;
  if (absValue >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(1);
}
