import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDw6PZ6TcohnAKLgjbEQSbWzxTlserQT_o",
  authDomain: "cost-trend.firebaseapp.com",
  projectId: "cost-trend",
  storageBucket: "cost-trend.firebasestorage.app",
  messagingSenderId: "1085437731609",
  appId: "1:1085437731609:web:fd4a69984b32ee52ca1b88",
  measurementId: "G-M2G5SNT5TT",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const DEFAULT_MASTERS = [
  ["월급", "월급", 3000000, "고정", "MG"],
  ["저축", "청년 도약 계좌", -700000, "고정", "KB"],
  ["저축", "청년 미래 적금", -500000, "고정", "KB"],
  ["저축", "보험", -160000, "고정", "MG"],
  ["교통", "유류비", -150000, "유동", "KB"],
  ["교통", "교통비/톨비", -100000, "고정", "KB"],
  ["생활비", "1달 음식값", -150000, "유동", "KB"],
  ["생활비", "집 생활 용품", -150000, "유동", "KB"],
  ["생활비", "Hair cut 비용", -35000, "유동", "KAKAO"],
  ["생활비", "휴대폰 통신 비용", -50000, "고정", "KB"],
  ["생활비", "데이트", -500000, "유동", "KB"],
  ["집", "가스/전기", -55000, "고정", "KB"],
  ["집", "월세", -400000, "고정", "KB"],
  ["유동 현금", "병원/차량수리/경조사/결혼식", -50000, "유동", "KAKAO"],
];

const PALETTE = [
  "#20639b", "#3caea3", "#f6c453", "#ed553b", "#173f5f",
  "#7b61a8", "#6f9e45", "#d98324", "#4b7bec", "#9b59b6",
  "#2f8f6b", "#c44569", "#577590", "#f9844a", "#43aa8b",
];

const state = {
  user: null,
  masters: [],
  transactions: [],
  assets: [],
  unsubscribers: [],
  charts: {},
  activeView: "dashboard",
  statsMonths: [],
  statsCriteriaTouched: false,
};

const $ = (id) => document.getElementById(id);
const els = {
  authScreen: $("auth-screen"), appShell: $("app-shell"), authForm: $("auth-form"),
  authEmail: $("auth-email"), authPassword: $("auth-password"), authMessage: $("auth-message"),
  signupBtn: $("signup-btn"), logoutBtn: $("logout-btn"), userEmail: $("user-email"),
  syncStatus: $("sync-status"), toast: $("toast"), pageTitle: $("page-title"), pageKicker: $("page-kicker"),
  quickAddBtn: $("quick-add-btn"), mainNav: $("main-nav"),
  dashboardMonth: $("dashboard-month"), dashboardKpis: $("dashboard-kpis"), dashboardAlerts: $("dashboard-alerts"),
  dashboardBudgetSummary: $("dashboard-budget-summary"), dashboardCriteriaTbody: $("dashboard-criteria-tbody"),
  dashboardCriteriaTfoot: $("dashboard-criteria-tfoot"), dashboardQuarterCards: $("dashboard-quarter-cards"),
  dashboardQuarterSummary: $("dashboard-quarter-summary"),
  transactionForm: $("transaction-form"), transactionId: $("transaction-id"), transactionDate: $("transaction-date"),
  transactionCriteria: $("transaction-criteria"), transactionItem: $("transaction-item"), transactionAmount: $("transaction-amount"),
  transactionBank: $("transaction-bank"), transactionPlace: $("transaction-place"), transactionMemo: $("transaction-memo"),
  transactionHint: $("transaction-hint"), transactionCancelBtn: $("transaction-cancel-btn"),
  transactionFormTitle: $("transaction-form-title"), ledgerMonth: $("ledger-month"), ledgerSearch: $("ledger-search"),
  ledgerTbody: $("ledger-tbody"), exportCsvBtn: $("export-csv-btn"),
  showArchived: $("show-archived"), seedMasterBtn: $("seed-master-btn"), addMasterBtn: $("add-master-btn"),
  masterTbody: $("master-tbody"), masterSummary: $("master-summary"), masterTotal: $("master-total"),
  masterDialog: $("master-dialog"), masterForm: $("master-form"), masterDialogTitle: $("master-dialog-title"),
  masterId: $("master-id"), masterCriteria: $("master-criteria"), masterItem: $("master-item"),
  masterAmount: $("master-amount"), masterFlowType: $("master-flow-type"), masterBank: $("master-bank"),
  masterDialogClose: $("master-dialog-close"), masterDialogCancel: $("master-dialog-cancel"),
  statsStartMonth: $("stats-start-month"), statsEndMonth: $("stats-end-month"), statsRefreshBtn: $("stats-refresh-btn"),
  statsKpis: $("stats-kpis"), statsItemCriteria: $("stats-item-criteria"),
  statsPlaceItem: $("stats-place-item"), quarterTrendSummary: $("quarter-trend-summary"),
  budgetKpiMonth: $("budget-kpi-month"), budgetKpiTbody: $("budget-kpi-tbody"),
  spcItemSelect: $("spc-item-select"), spcSummary: $("spc-summary"), dailyRangeSummary: $("daily-range-summary"),
  assetForm: $("asset-form"), assetId: $("asset-id"), assetDate: $("asset-date"),
  assetSalaryBonus: $("asset-salary-bonus"), assetCash: $("asset-cash"), assetStock: $("asset-stock"), assetInsurance: $("asset-insurance"),
  assetTotalPreview: $("asset-total-preview"), assetCancelBtn: $("asset-cancel-btn"),
  assetFormTitle: $("asset-form-title"), assetTbody: $("asset-tbody"),
};

const VIEW_META = {
  dashboard: ["OVERVIEW", "대시보드"],
  ledger: ["LEDGER", "가계부"],
  master: ["MASTER DATA", "기준표"],
  statistics: ["ANALYTICS", "통계 · SPC"],
  assets: ["NET WORTH", "월말 자산"],
};

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonth() { return todayString().slice(0, 7); }

function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(start, end) {
  if (!start || !end || start > end) return [];
  const result = [];
  let cursor = start;
  while (cursor <= end && result.length < 240) {
    result.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }
  return result;
}

function formatWon(value, signed = false) {
  const amount = Number(value || 0);
  const prefix = signed && amount > 0 ? "+" : "";
  return `${prefix}₩${Math.round(amount).toLocaleString("ko-KR")}`;
}

function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(digits)}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleStd(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
}

function cpkOneSided(usl, values) {
  if (!values.length) return null;
  const avg = mean(values);
  const sd = sampleStd(values);
  if (sd === 0) return avg <= usl ? Infinity : -Infinity;
  return (usl - avg) / (3 * sd);
}

function masterById(id) { return state.masters.find((item) => item.id === id); }
function activeMasters() { return state.masters.filter((item) => item.active !== false); }
function expenseMasters() { return activeMasters().filter((item) => Number(item.monthlyAmount) < 0); }
function variableExpenseMasters() { return activeMasters().filter((item) => item.flowType === "유동" && Number(item.monthlyAmount) < 0); }
function txMonth(tx) { return String(tx.date || "").slice(0, 7); }
function txQuarter(tx) {
  const day = Number(String(tx.date || "").slice(8, 10));
  if (!Number.isFinite(day) || day < 1) return null;
  if (day <= 7) return "Q1";
  if (day <= 14) return "Q2";
  if (day <= 21) return "Q3";
  return "Q4";
}
function absAmount(tx) { return Math.abs(Number(tx.amount || 0)); }


function daysInMonth(month) {
  const [year, monthNumber] = String(month || "").split("-").map(Number);
  if (!year || !monthNumber) return 30;
  return new Date(year, monthNumber, 0).getDate();
}

function fundingAssetForMonth(month) {
  const sourceMonth = shiftMonth(month, -1);
  return [...state.assets]
    .filter((asset) => String(asset.date || "").slice(0, 7) === sourceMonth)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}

function incomeForMonth(month) {
  const asset = fundingAssetForMonth(month);
  const hasSalary = Boolean(asset) && asset.salaryBonus !== undefined && asset.salaryBonus !== null && asset.salaryBonus !== "" && Number.isFinite(Number(asset.salaryBonus));
  return {
    amount: hasSalary ? Number(asset.salaryBonus) : 0,
    sourceDate: asset?.date || "",
    hasSalary,
    asset,
  };
}

function criteriaBudgetRows(month) {
  const budgetMap = new Map();
  expenseMasters().forEach((master) => {
    budgetMap.set(master.criteria, (budgetMap.get(master.criteria) || 0) + Math.abs(Number(master.monthlyAmount || 0)));
  });

  const actualMap = new Map();
  monthlyTransactions(month).filter((tx) => Number(tx.amount) < 0).forEach((tx) => {
    const criteria = tx.criteriaSnapshot || "미분류";
    actualMap.set(criteria, (actualMap.get(criteria) || 0) + absAmount(tx));
  });

  const criteria = [...new Set([...budgetMap.keys(), ...actualMap.keys()])];
  return criteria.map((name) => {
    const budget = budgetMap.get(name) || 0;
    const used = actualMap.get(name) || 0;
    const remaining = budget - used;
    const utilization = budget > 0 ? used / budget * 100 : (used > 0 ? Infinity : 0);
    return { criteria: name, budget, used, remaining, utilization, over: used > budget };
  }).sort((a, b) => b.budget - a.budget || b.used - a.used || a.criteria.localeCompare(b.criteria, "ko"));
}

function quarterBudgetRows(month, monthlyBudget) {
  const totalDays = daysInMonth(month);
  const definitions = [
    { key: "Q1", label: "1~7일", start: 1, end: Math.min(7, totalDays) },
    { key: "Q2", label: "8~14일", start: 8, end: Math.min(14, totalDays) },
    { key: "Q3", label: "15~21일", start: 15, end: Math.min(21, totalDays) },
    { key: "Q4", label: `22~${totalDays}일`, start: 22, end: totalDays },
  ];
  const txs = monthlyTransactions(month).filter((tx) => Number(tx.amount) < 0);
  const today = todayString();
  const selectedMonthIsPast = month < today.slice(0, 7);
  const selectedMonthIsCurrent = month === today.slice(0, 7);
  const todayDay = selectedMonthIsCurrent ? Number(today.slice(8, 10)) : 0;
  let carryIn = 0;

  return definitions.map((quarter) => {
    const dayCount = Math.max(0, quarter.end - quarter.start + 1);
    const baseBudget = totalDays ? monthlyBudget * dayCount / totalDays : monthlyBudget / 4;
    const adjustedBudget = baseBudget + carryIn;
    const used = txs.filter((tx) => txQuarter(tx) === quarter.key).reduce((sum, tx) => sum + absAmount(tx), 0);
    const remaining = adjustedBudget - used;
    const isClosed = selectedMonthIsPast || (selectedMonthIsCurrent && todayDay > quarter.end);
    const isCurrent = selectedMonthIsCurrent && todayDay >= quarter.start && todayDay <= quarter.end;

    // 완료된 Quarter는 잔액/초과액 전부 이월합니다.
    // 진행 중이거나 아직 시작하지 않은 Quarter는 확정된 초과액만 다음 Quarter에서 즉시 차감합니다.
    const carryOut = isClosed ? remaining : Math.min(remaining, 0);
    const utilization = adjustedBudget > 0 ? used / adjustedBudget * 100 : (used > 0 ? Infinity : 0);
    const row = {
      ...quarter,
      dayCount,
      baseBudget,
      carryIn,
      adjustedBudget,
      budget: adjustedBudget,
      used,
      remaining,
      carryOut,
      utilization,
      over: remaining < 0,
      isClosed,
      isCurrent,
    };
    carryIn = carryOut;
    return row;
  });
}

function transactionMatchesMaster(tx, master) {
  if (!master) return false;
  return tx.masterId === master.id
    || (!tx.masterId && tx.criteriaSnapshot === master.criteria && tx.itemSnapshot === master.item);
}

function highestSpendCriteria(month, fallbackTransactions = [], allowedCriteria = []) {
  const allowed = new Set(allowedCriteria.filter(Boolean));
  const isAllowed = (tx) => tx.criteriaSnapshot && (!allowed.size || allowed.has(tx.criteriaSnapshot));
  const monthTransactions = state.transactions.filter((tx) => tx.amount < 0 && txMonth(tx) === month && isAllowed(tx));
  const source = monthTransactions.length ? monthTransactions : fallbackTransactions.filter(isAllowed);
  const totals = new Map();
  source.forEach((tx) => {
    const criteria = tx.criteriaSnapshot;
    totals.set(criteria, (totals.get(criteria) || 0) + absAmount(tx));
  });
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || allowedCriteria[0] || "";
}

function setSync(text, type = "busy") {
  els.syncStatus.textContent = text;
  els.syncStatus.className = `sync-status ${type}`;
}

let toastTimer;
function toast(message, type = "success") {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => { els.toast.className = "toast"; }, 2800);
}

function humanError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
    "auth/email-already-in-use": "이미 사용 중인 이메일입니다.",
    "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
    "auth/invalid-email": "이메일 형식을 확인해 주세요.",
    "auth/operation-not-allowed": "Firebase Authentication에서 이메일/비밀번호 로그인을 활성화해 주세요.",
    "permission-denied": "Firestore Rules 권한을 확인해 주세요.",
  };
  return map[code] || error?.message || "처리 중 오류가 발생했습니다.";
}

function userCollection(name) {
  if (!state.user) throw new Error("로그인이 필요합니다.");
  return collection(db, "users", state.user.uid, name);
}

function userDoc(collectionName, id) {
  if (!state.user) throw new Error("로그인이 필요합니다.");
  return doc(db, "users", state.user.uid, collectionName, id);
}

function resetCharts() {
  Object.values(state.charts).forEach((chart) => chart?.destroy?.());
  state.charts = {};
}

function chart(name, canvasId, config) {
  if (!window.Chart) return;
  state.charts[name]?.destroy?.();
  const canvas = $(canvasId);
  if (!canvas) return;
  state.charts[name] = new window.Chart(canvas, config);
}

function baseChartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, font: { size: 10 } } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatWon(ctx.parsed.y ?? ctx.parsed)}` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, grid: { color: "rgba(104,115,134,.12)" }, ticks: { callback: (v) => `${Math.round(v / 10000).toLocaleString()}만`, font: { size: 10 } } },
    },
    ...extra,
  };
}

function renderKpiCards(container, cards) {
  container.innerHTML = cards.map((card) => `
    <div class="kpi-card ${card.tone || ""}">
      <div class="label">${escapeHtml(card.label)}</div>
      <div class="value">${escapeHtml(card.value)}</div>
      <div class="sub">${escapeHtml(card.sub || "")}</div>
    </div>
  `).join("");
}

function setView(view) {
  if (!VIEW_META[view]) return;

  const activateView = () => {
    state.activeView = view;
    document.querySelectorAll(".view").forEach((node) => node.classList.toggle("active", node.id === `view-${view}`));
    document.querySelectorAll(".nav-item").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
    els.pageKicker.textContent = VIEW_META[view][0];
    els.pageTitle.textContent = VIEW_META[view][1];
    els.quickAddBtn.classList.toggle("hidden", view === "ledger");
    if (view === "dashboard") renderDashboard();
    if (view === "ledger") renderLedger();
    if (view === "master") renderMasterTable();
    if (view === "statistics") renderStatistics();
    if (view === "assets") renderAssets();
  };

  const current = document.querySelector(".view.active")?.id?.replace("view-", "");
  if (current === view) {
    activateView();
  } else if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.startViewTransition(activateView);
  } else {
    activateView();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function subscribeData() {
  state.unsubscribers.forEach((fn) => fn());
  state.unsubscribers = [];
  setSync("Firestore 연결 중", "busy");

  state.unsubscribers.push(onSnapshot(userCollection("masters"), (snapshot) => {
    state.masters = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
      .sort((a, b) => `${a.criteria}${a.item}`.localeCompare(`${b.criteria}${b.item}`, "ko"));
    populateTransactionSelectors();
    populateStatisticsSelectors();
    refreshActiveView();
    setSync("동기화 완료", "ok");
  }, handleSnapshotError));

  state.unsubscribers.push(onSnapshot(userCollection("transactions"), (snapshot) => {
    state.transactions = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt?.seconds || 0).localeCompare(String(a.createdAt?.seconds || 0)));
    refreshActiveView();
    setSync("동기화 완료", "ok");
  }, handleSnapshotError));

  state.unsubscribers.push(onSnapshot(userCollection("assets"), (snapshot) => {
    state.assets = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    refreshActiveView();
    setSync("동기화 완료", "ok");
  }, handleSnapshotError));
}

function handleSnapshotError(error) {
  setSync("동기화 오류", "error");
  toast(humanError(error), "error");
}

function refreshActiveView() {
  if (state.activeView === "dashboard") renderDashboard();
  if (state.activeView === "ledger") renderLedger();
  if (state.activeView === "master") renderMasterTable();
  if (state.activeView === "statistics") renderStatistics();
  if (state.activeView === "assets") renderAssets();
}

async function seedDefaultMasters(onlyMissing = true) {
  if (!state.user) return;
  const existingKeys = new Set(state.masters.map((m) => `${m.criteria}::${m.item}`));
  const rows = DEFAULT_MASTERS.filter(([criteria, item]) => !onlyMissing || !existingKeys.has(`${criteria}::${item}`));
  if (!rows.length) {
    toast("추가할 기본 항목이 없습니다.");
    return;
  }
  setSync("기본표 저장 중", "busy");
  const batch = writeBatch(db);
  rows.forEach(([criteria, item, monthlyAmount, flowType, bank]) => {
    const ref = doc(userCollection("masters"));
    batch.set(ref, { criteria, item, monthlyAmount, flowType, bank, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  });
  await batch.commit();
  toast(`${rows.length}개 기본 항목을 추가했습니다.`);
}

function populateTransactionSelectors() {
  const currentTx = state.transactions.find((tx) => tx.id === els.transactionId.value);
  const masters = activeMasters().slice();
  if (currentTx) {
    const archived = masterById(currentTx.masterId);
    if (archived && !masters.some((m) => m.id === archived.id)) masters.push(archived);
  }
  const criteria = [...new Set(masters.map((m) => m.criteria))].sort((a, b) => a.localeCompare(b, "ko"));
  const previous = els.transactionCriteria.value;
  els.transactionCriteria.innerHTML = `<option value="">선택</option>${criteria.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}`;
  if (criteria.includes(previous)) els.transactionCriteria.value = previous;
  populateTransactionItems();
  populateBankOptions();
}

function populateTransactionItems(selectedId = null) {
  const criteria = els.transactionCriteria.value;
  const currentTx = state.transactions.find((tx) => tx.id === els.transactionId.value);
  const masters = state.masters.filter((m) => m.criteria === criteria && (m.active !== false || m.id === currentTx?.masterId));
  const previous = selectedId || els.transactionItem.value;
  els.transactionItem.innerHTML = `<option value="">선택</option>${masters.map((m) => `<option value="${m.id}">${escapeHtml(m.item)}${m.active === false ? " (보관)" : ""}</option>`).join("")}`;
  if (masters.some((m) => m.id === previous)) els.transactionItem.value = previous;
  updateTransactionHint();
}

function populateBankOptions(selected = null) {
  const master = masterById(els.transactionItem.value);
  const banks = [...new Set([...state.masters.map((m) => m.bank), ...state.transactions.map((tx) => tx.bankSnapshot || tx.bank), "KB", "MG", "KAKAO"].filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"));
  const current = selected || els.transactionBank.value || master?.bank || "";
  els.transactionBank.innerHTML = `<option value="">선택</option>${banks.map((bank) => `<option value="${escapeHtml(bank)}">${escapeHtml(bank)}</option>`).join("")}`;
  if (current) {
    if (!banks.includes(current)) els.transactionBank.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(current)}">${escapeHtml(current)}</option>`);
    els.transactionBank.value = current;
  }
}

function updateTransactionHint() {
  const master = masterById(els.transactionItem.value);
  if (!master) {
    els.transactionHint.textContent = "Criteria와 Item을 선택하면 기준 금액과 자동 부호가 표시됩니다.";
    return;
  }
  const type = Number(master.monthlyAmount) >= 0 ? "수입(+)" : "지출(-)";
  els.transactionHint.innerHTML = `월 기준 <strong>${formatWon(master.monthlyAmount, true)}</strong> · ${escapeHtml(master.flowType)} · 기본 Bank ${escapeHtml(master.bank)} · 저장 부호 ${type}`;
}

function resetTransactionForm() {
  els.transactionForm.reset();
  els.transactionId.value = "";
  els.transactionDate.value = todayString();
  els.transactionFormTitle.textContent = "가계부 작성";
  els.transactionCancelBtn.classList.add("hidden");
  populateTransactionSelectors();
}

async function saveTransaction(event) {
  event.preventDefault();
  const master = masterById(els.transactionItem.value);
  if (!master) return toast("Item을 선택해 주세요.", "error");
  const rawAmount = Math.abs(Number(els.transactionAmount.value));
  if (!rawAmount) return toast("금액을 입력해 주세요.", "error");
  const signedAmount = Number(master.monthlyAmount) >= 0 ? rawAmount : -rawAmount;
  const payload = {
    date: els.transactionDate.value,
    month: els.transactionDate.value.slice(0, 7),
    masterId: master.id,
    criteriaSnapshot: master.criteria,
    itemSnapshot: master.item,
    monthlyAmountSnapshot: Number(master.monthlyAmount),
    flowTypeSnapshot: master.flowType,
    bankSnapshot: els.transactionBank.value,
    amount: signedAmount,
    place: els.transactionPlace.value.trim(),
    memo: els.transactionMemo.value.trim(),
    updatedAt: serverTimestamp(),
  };
  setSync("가계부 저장 중", "busy");
  try {
    if (els.transactionId.value) {
      await updateDoc(userDoc("transactions", els.transactionId.value), payload);
      toast("가계부 기록을 수정했습니다.");
    } else {
      await addDoc(userCollection("transactions"), { ...payload, createdAt: serverTimestamp() });
      toast("가계부 기록을 저장했습니다.");
    }
    resetTransactionForm();
  } catch (error) { toast(humanError(error), "error"); }
}

function transactionOutlierMap() {
  const grouped = new Map();
  state.transactions.filter((tx) => Number(tx.amount) < 0).forEach((tx) => {
    const key = tx.masterId || `${tx.criteriaSnapshot}::${tx.itemSnapshot}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(absAmount(tx));
  });
  const limits = new Map();
  grouped.forEach((values, key) => {
    if (values.length < 5) return;
    limits.set(key, mean(values) + 1.96 * sampleStd(values));
  });
  const result = new Map();
  state.transactions.forEach((tx) => {
    const key = tx.masterId || `${tx.criteriaSnapshot}::${tx.itemSnapshot}`;
    const limit = limits.get(key);
    result.set(tx.id, { outlier: Number.isFinite(limit) && absAmount(tx) > limit, upper95: limit });
  });
  return result;
}

function renderLedger() {
  if (!els.ledgerMonth.value) els.ledgerMonth.value = currentMonth();
  const month = els.ledgerMonth.value;
  const query = els.ledgerSearch.value.trim().toLowerCase();
  const outliers = transactionOutlierMap();
  const rows = state.transactions.filter((tx) => {
    if (month && txMonth(tx) !== month) return false;
    if (!query) return true;
    return [tx.criteriaSnapshot, tx.itemSnapshot, tx.place, tx.memo, tx.bankSnapshot].join(" ").toLowerCase().includes(query);
  });

  els.ledgerTbody.innerHTML = rows.length ? rows.map((tx) => {
    const outlier = outliers.get(tx.id);
    const status = outlier?.outlier ? `<span class="badge danger" title="개인 결제금액 95% 상한 ${formatWon(outlier.upper95)} 초과">95% 이탈</span>` : `<span class="badge ok">정상</span>`;
    return `
      <tr class="${outlier?.outlier ? "outlier" : ""}">
        <td>${escapeHtml(tx.date)}</td>
        <td>${escapeHtml(tx.criteriaSnapshot)}</td>
        <td>${escapeHtml(tx.itemSnapshot)}</td>
        <td>${escapeHtml(tx.place || "-")}</td>
        <td><span class="badge ${tx.flowTypeSnapshot === "유동" ? "variable" : "fixed"}">${escapeHtml(tx.flowTypeSnapshot || "-")}</span></td>
        <td>${escapeHtml(tx.bankSnapshot || "-")}</td>
        <td class="number ${Number(tx.amount) >= 0 ? "amount-income" : "amount-expense"}">${formatWon(tx.amount, true)}</td>
        <td>${status}</td>
        <td><div class="row-actions"><button class="table-btn" data-action="edit-tx" data-id="${tx.id}">수정</button><button class="table-btn danger" data-action="delete-tx" data-id="${tx.id}">삭제</button></div></td>
      </tr>`;
  }).join("") : `<tr><td colspan="9"><div class="empty-state">조건에 맞는 가계부 기록이 없습니다.</div></td></tr>`;
}

function editTransaction(id) {
  const tx = state.transactions.find((item) => item.id === id);
  if (!tx) return;
  setView("ledger");
  els.transactionId.value = tx.id;
  els.transactionDate.value = tx.date;
  populateTransactionSelectors();
  els.transactionCriteria.value = tx.criteriaSnapshot;
  populateTransactionItems(tx.masterId);
  els.transactionAmount.value = absAmount(tx);
  populateBankOptions(tx.bankSnapshot);
  els.transactionPlace.value = tx.place || "";
  els.transactionMemo.value = tx.memo || "";
  els.transactionFormTitle.textContent = "가계부 수정";
  els.transactionCancelBtn.classList.remove("hidden");
  updateTransactionHint();
  els.transactionForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removeTransaction(id) {
  if (!confirm("이 가계부 기록을 삭제할까요?")) return;
  try {
    await deleteDoc(userDoc("transactions", id));
    toast("가계부 기록을 삭제했습니다.");
  } catch (error) { toast(humanError(error), "error"); }
}

function exportLedgerCsv() {
  const month = els.ledgerMonth.value;
  const rows = state.transactions.filter((tx) => !month || txMonth(tx) === month);
  const header = ["날짜", "Criteria", "Item", "사용처", "고정/유동", "Bank", "금액", "메모"];
  const csvRows = [header, ...rows.map((tx) => [tx.date, tx.criteriaSnapshot, tx.itemSnapshot, tx.place || "", tx.flowTypeSnapshot || "", tx.bankSnapshot || "", tx.amount, tx.memo || ""])];
  const csv = csvRows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cost-trend-ledger-${month || "all"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderMasterTable() {
  const showArchived = els.showArchived.checked;
  const rows = state.masters.filter((m) => showArchived || m.active !== false);
  const total = activeMasters().reduce((sum, item) => sum + Number(item.monthlyAmount || 0), 0);
  const income = activeMasters().filter((m) => m.monthlyAmount > 0).reduce((sum, m) => sum + Number(m.monthlyAmount), 0);
  const outflow = activeMasters().filter((m) => m.monthlyAmount < 0).reduce((sum, m) => sum + Math.abs(Number(m.monthlyAmount)), 0);
  renderKpiCards(els.masterSummary, [
    { label: "활성 항목", value: `${activeMasters().length}개`, sub: `보관 ${state.masters.length - activeMasters().length}개` },
    { label: "월 기준 수입", value: formatWon(income), tone: "good", sub: "양수 항목 합계" },
    { label: "월 기준 유출", value: formatWon(outflow), tone: "bad", sub: "지출·저축 합계" },
    { label: "월 기준 잔액", value: formatWon(total, true), tone: total >= 0 ? "good" : "bad", sub: "TTL" },
  ]);
  els.masterTotal.textContent = formatWon(total, true);
  els.masterTbody.innerHTML = rows.length ? rows.map((m) => `
    <tr class="${m.active === false ? "archived" : ""}">
      <td>${escapeHtml(m.criteria)}</td><td>${escapeHtml(m.item)}</td>
      <td class="number ${m.monthlyAmount >= 0 ? "amount-income" : "amount-expense"}">${formatWon(m.monthlyAmount, true)}</td>
      <td><span class="badge ${m.flowType === "유동" ? "variable" : "fixed"}">${escapeHtml(m.flowType)}</span></td>
      <td>${escapeHtml(m.bank)}</td>
      <td><span class="badge ${m.active === false ? "neutral" : "ok"}">${m.active === false ? "보관" : "사용 중"}</span></td>
      <td><div class="row-actions"><button class="table-btn" data-action="edit-master" data-id="${m.id}">수정</button><button class="table-btn ${m.active === false ? "" : "danger"}" data-action="toggle-master" data-id="${m.id}">${m.active === false ? "복원" : "보관"}</button></div></td>
    </tr>`).join("") : `<tr><td colspan="7"><div class="empty-state">기준 항목이 없습니다. 기본표를 추가해 주세요.</div></td></tr>`;
}

function openMasterDialog(master = null) {
  els.masterForm.reset();
  els.masterId.value = master?.id || "";
  els.masterCriteria.value = master?.criteria || "";
  els.masterItem.value = master?.item || "";
  els.masterAmount.value = master?.monthlyAmount ?? "";
  els.masterFlowType.value = master?.flowType || "고정";
  els.masterBank.value = master?.bank || "";
  els.masterDialogTitle.textContent = master ? "기준 항목 수정" : "기준 항목 추가";
  els.masterDialog.showModal();
}

async function saveMaster(event) {
  event.preventDefault();
  const payload = {
    criteria: els.masterCriteria.value.trim(),
    item: els.masterItem.value.trim(),
    monthlyAmount: Number(els.masterAmount.value),
    flowType: els.masterFlowType.value,
    bank: els.masterBank.value.trim().toUpperCase(),
    active: true,
    updatedAt: serverTimestamp(),
  };
  if (!payload.criteria || !payload.item || !payload.bank || !Number.isFinite(payload.monthlyAmount)) return toast("모든 항목을 확인해 주세요.", "error");
  try {
    if (els.masterId.value) {
      await updateDoc(userDoc("masters", els.masterId.value), payload);
      toast("기준 항목을 수정했습니다. 과거 가계부 스냅샷은 유지됩니다.");
    } else {
      await addDoc(userCollection("masters"), { ...payload, createdAt: serverTimestamp() });
      toast("기준 항목을 추가했습니다.");
    }
    els.masterDialog.close();
  } catch (error) { toast(humanError(error), "error"); }
}

async function toggleMaster(id) {
  const master = masterById(id);
  if (!master) return;
  const nextActive = master.active === false;
  const action = nextActive ? "복원" : "보관";
  if (!nextActive && !confirm(`'${master.item}' 항목을 보관할까요? 과거 가계부 기록은 삭제되지 않습니다.`)) return;
  try {
    await updateDoc(userDoc("masters", id), { active: nextActive, updatedAt: serverTimestamp() });
    toast(`기준 항목을 ${action}했습니다.`);
  } catch (error) { toast(humanError(error), "error"); }
}

function monthlyTransactions(month) { return state.transactions.filter((tx) => txMonth(tx) === month); }

function actualByMaster(month) {
  const map = new Map();
  monthlyTransactions(month).filter((tx) => Number(tx.amount) < 0).forEach((tx) => {
    const key = tx.masterId || `${tx.criteriaSnapshot}::${tx.itemSnapshot}`;
    map.set(key, (map.get(key) || 0) + absAmount(tx));
  });
  return map;
}

function budgetRows(month) {
  const actual = actualByMaster(month);
  return expenseMasters().map((master) => {
    const usl = Math.abs(Number(master.monthlyAmount));
    const used = actual.get(master.id) || 0;
    const utilization = usl ? used / usl * 100 : 0;
    return { master, usl, used, diff: usl - used, utilization, over: used > usl };
  });
}

function renderDashboard() {
  if (!els.dashboardMonth.value) els.dashboardMonth.value = currentMonth();
  const month = els.dashboardMonth.value;
  const txs = monthlyTransactions(month);
  const incomeInfo = incomeForMonth(month);
  const availableIncome = incomeInfo.amount;
  const criteriaRows = criteriaBudgetRows(month);
  const plannedBudget = criteriaRows.reduce((sum, row) => sum + row.budget, 0);
  const totalOutflow = criteriaRows.reduce((sum, row) => sum + row.used, 0);
  const budgetRemaining = plannedBudget - totalOutflow;
  const incomeRemaining = availableIncome - totalOutflow;
  const allocationGap = availableIncome - plannedBudget;
  const latestAsset = [...state.assets].filter((a) => String(a.date).slice(0, 7) <= month).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];

  renderKpiCards(els.dashboardKpis, [
    {
      label: "월급 (+상여금)",
      value: incomeInfo.hasSalary ? formatWon(availableIncome) : "미입력",
      tone: incomeInfo.hasSalary ? "good" : "warn",
      sub: incomeInfo.hasSalary ? `${incomeInfo.sourceDate} 입력 · ${month} 사용` : `${shiftMonth(month, -1)} 월말 자산에서 입력`,
    },
    { label: "Criteria 계획 총액", value: formatWon(plannedBudget), tone: "", sub: `${criteriaRows.filter((row) => row.budget > 0).length}개 Criteria 합계` },
    { label: "실시간 사용", value: formatWon(totalOutflow), tone: totalOutflow > plannedBudget ? "bad" : "warn", sub: `${month} 가계부 지출·저축` },
    { label: "예산 기준 남은 금액", value: formatWon(budgetRemaining), tone: budgetRemaining >= 0 ? "good" : "bad", sub: `사용률 ${formatPercent(plannedBudget ? totalOutflow / plannedBudget * 100 : 0)}` },
    { label: "수입 기준 남은 금액", value: incomeInfo.hasSalary ? formatWon(incomeRemaining) : "-", tone: incomeInfo.hasSalary && incomeRemaining >= 0 ? "good" : incomeInfo.hasSalary ? "bad" : "warn", sub: incomeInfo.hasSalary ? `수입 - 실사용 · 배분 후 ${formatWon(allocationGap)}` : "월급(+상여금) 입력 필요" },
    { label: "최근 총자산", value: latestAsset ? formatWon(latestAsset.total) : "미입력", tone: "", sub: latestAsset?.date || "월말 자산에서 입력" },
  ]);

  els.dashboardBudgetSummary.textContent = incomeInfo.hasSalary
    ? `${incomeInfo.sourceDate} 월급(+상여금) ${formatWon(availableIncome)} · Criteria 배분 ${formatWon(plannedBudget)} · 미배분/초과 계획 ${formatWon(allocationGap)}`
    : `${shiftMonth(month, -1)} 월말 자산에 월급(+상여금)을 입력하면 수입 기준 잔액이 계산됩니다.`;

  els.dashboardCriteriaTbody.innerHTML = criteriaRows.length ? criteriaRows.map((row) => `
    <tr class="${row.over ? "budget-over" : ""}">
      <td><strong>${escapeHtml(row.criteria)}</strong></td>
      <td class="number">${formatWon(row.budget)}</td>
      <td class="number">${formatWon(row.used)}</td>
      <td class="number ${row.remaining < 0 ? "amount-expense" : "amount-income"}">${formatWon(row.remaining)}</td>
      <td><div class="progress ${row.over ? "over" : ""}"><span style="width:${Math.min(Number.isFinite(row.utilization) ? row.utilization : 100, 100)}%"></span></div><small>${Number.isFinite(row.utilization) ? formatPercent(row.utilization) : "예산 없음"}</small></td>
      <td><span class="badge ${row.over ? "danger" : row.utilization >= 80 ? "warn" : "ok"}">${row.over ? "초과" : row.utilization >= 80 ? "주의" : "여유"}</span></td>
    </tr>`).join("") : `<tr><td colspan="6"><div class="empty-state">기준표에 지출·저축 Criteria를 추가해 주세요.</div></td></tr>`;
  els.dashboardCriteriaTfoot.innerHTML = criteriaRows.length ? `<tr><th>TTL</th><th class="number">${formatWon(plannedBudget)}</th><th class="number">${formatWon(totalOutflow)}</th><th class="number">${formatWon(budgetRemaining)}</th><th>${formatPercent(plannedBudget ? totalOutflow / plannedBudget * 100 : 0)}</th><th></th></tr>` : "";

  const quarterRows = quarterBudgetRows(month, plannedBudget);
  const today = todayString();
  const currentQuarterKey = today.slice(0, 7) === month ? txQuarter({ date: today }) : null;
  els.dashboardQuarterCards.innerHTML = quarterRows.map((row) => {
    const carryLabel = row.carryIn > 0 ? `이월 +${formatWon(row.carryIn)}` : row.carryIn < 0 ? `초과 차감 ${formatWon(row.carryIn)}` : "이월 없음";
    const statusLabel = row.isClosed ? "마감" : row.isCurrent ? "진행 중" : "예정";
    return `
    <div class="quarter-card ${row.over ? "over" : ""} ${row.key === currentQuarterKey ? "current" : ""}">
      <div class="quarter-card-head"><strong>${row.key}</strong><span>${row.label} · ${row.dayCount}일 · ${statusLabel}</span></div>
      <div class="quarter-remaining ${row.remaining < 0 ? "negative" : ""}">${formatWon(row.remaining)}</div>
      <div class="quarter-adjustment ${row.carryIn < 0 ? "negative" : row.carryIn > 0 ? "positive" : ""}">${carryLabel}</div>
      <div class="quarter-meta"><span>기본 ${formatWon(row.baseBudget)}</span><span>조정 ${formatWon(row.adjustedBudget)}</span></div>
      <div class="quarter-meta"><span>사용 ${formatWon(row.used)}</span><span>${row.remaining < 0 ? "초과" : "잔액"} ${formatWon(Math.abs(row.remaining))}</span></div>
      <div class="progress ${row.over ? "over" : ""}"><span style="width:${Math.min(Number.isFinite(row.utilization) ? row.utilization : 100, 100)}%"></span></div>
    </div>`;
  }).join("");
  const currentQuarter = quarterRows.find((row) => row.key === currentQuarterKey);
  els.dashboardQuarterSummary.textContent = currentQuarter
    ? `${month} 현재 ${currentQuarter.key} 사용 가능 ${formatWon(currentQuarter.remaining)} · 이전 Quarter 잔액은 이월, 초과액은 다음 Quarter에서 차감`
    : `${month} Quarter 마감 순서대로 잔액은 다음 Quarter에 이월되고, 초과액은 다음 Quarter 사용 가능 금액에서 차감됩니다.`;

  chart("dashboardQuarterBalance", "dashboard-quarter-balance-chart", {
    type: "bar",
    data: {
      labels: quarterRows.map((row) => `${row.key} ${row.label}`),
      datasets: [
        { label: "기본 배정", data: quarterRows.map((row) => row.baseBudget), backgroundColor: "rgba(32,99,155,.22)", borderRadius: 5 },
        { label: "이월 반영 예산", data: quarterRows.map((row) => row.adjustedBudget), backgroundColor: "rgba(32,99,155,.62)", borderRadius: 5 },
        { label: "실사용", data: quarterRows.map((row) => row.used), backgroundColor: "rgba(214,69,69,.7)", borderRadius: 5 },
        { label: "Quarter 종료 잔액", data: quarterRows.map((row) => row.remaining), backgroundColor: quarterRows.map((row) => row.remaining >= 0 ? "rgba(47,143,107,.72)" : "rgba(214,69,69,.9)"), borderRadius: 5 },
      ],
    },
    options: baseChartOptions(),
  });

  const months = monthRange(shiftMonth(month, -11), month);
  const monthMetrics = months.map((m) => {
    const monthRows = criteriaBudgetRows(m);
    const budget = monthRows.reduce((sum, row) => sum + row.budget, 0);
    const used = monthRows.reduce((sum, row) => sum + row.used, 0);
    const income = incomeForMonth(m).amount;
    return { month: m, budget, used, budgetRemaining: budget - used, income, cashRemaining: income - used };
  });

  chart("dashboardBudgetTrend", "dashboard-budget-trend-chart", {
    type: "line",
    data: {
      labels: months,
      datasets: [
        { label: "Criteria 예산", data: monthMetrics.map((row) => row.budget), borderColor: PALETTE[0], backgroundColor: `${PALETTE[0]}20`, tension: .25, pointRadius: 3 },
        { label: "실사용", data: monthMetrics.map((row) => row.used), borderColor: PALETTE[3], backgroundColor: `${PALETTE[3]}20`, tension: .25, pointRadius: 3 },
        { label: "예산 잔액", data: monthMetrics.map((row) => row.budgetRemaining), borderColor: PALETTE[1], backgroundColor: `${PALETTE[1]}20`, tension: .25, pointRadius: 3 },
      ],
    },
    options: baseChartOptions(),
  });

  chart("dashboardCashflow", "dashboard-cashflow-chart", {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        { label: "월급(+상여금)", data: monthMetrics.map((row) => row.income), backgroundColor: "rgba(47,143,107,.72)", borderRadius: 5 },
        { label: "실제 유출", data: monthMetrics.map((row) => row.used), backgroundColor: "rgba(214,69,69,.7)", borderRadius: 5 },
        { type: "line", label: "수입 기준 잔액", data: monthMetrics.map((row) => row.cashRemaining), borderColor: PALETTE[0], backgroundColor: `${PALETTE[0]}22`, borderWidth: 2, tension: .25, pointRadius: 4 },
      ],
    },
    options: baseChartOptions(),
  });

  const categoryRows = criteriaRows.filter((row) => row.used > 0);
  chart("dashboardCategory", "dashboard-category-chart", {
    type: "doughnut",
    data: { labels: categoryRows.map((row) => row.criteria), datasets: [{ data: categoryRows.map((row) => row.used), backgroundColor: categoryRows.map((_, i) => PALETTE[i % PALETTE.length]), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: "63%", plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${formatWon(ctx.parsed)} · ${totalOutflow ? formatPercent(ctx.parsed / totalOutflow * 100) : "0%"}` } } } },
  });

  const outlierMap = transactionOutlierMap();
  const alerts = [];
  criteriaRows.filter((row) => row.over).forEach((row) => alerts.push({ title: `${row.criteria} Criteria`, detail: `예산 ${formatWon(row.budget)} / 실사용 ${formatWon(row.used)} / 초과 ${formatWon(Math.abs(row.remaining))}`, badge: "Criteria 초과" }));
  budgetRows(month).filter((row) => row.over).forEach((row) => alerts.push({ title: `${row.master.criteria} · ${row.master.item}`, detail: `USL ${formatWon(row.usl)} / Actual ${formatWon(row.used)}`, badge: "Item 초과" }));
  txs.filter((tx) => outlierMap.get(tx.id)?.outlier).forEach((tx) => alerts.push({ title: `${tx.itemSnapshot} · ${tx.place || "사용처 미입력"}`, detail: `${tx.date} 개인 결제 ${formatWon(absAmount(tx))}`, badge: "95% 이탈" }));
  els.dashboardAlerts.className = alerts.length ? "alert-list" : "alert-list empty-state";
  els.dashboardAlerts.innerHTML = alerts.length ? alerts.slice(0, 10).map((item) => `<div class="alert-item"><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></div><span class="badge danger">${escapeHtml(item.badge)}</span></div>`).join("") : "선택 월에 예산 초과 또는 통계적 이상 지출이 없습니다.";
}

function populateStatisticsSelectors() {
  const criteria = [...new Set(activeMasters().map((m) => m.criteria))].sort((a, b) => a.localeCompare(b, "ko"));
  const previous = els.statsItemCriteria.value;
  els.statsItemCriteria.innerHTML = criteria.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  if (criteria.includes(previous)) els.statsItemCriteria.value = previous;

  populatePlaceItems();

  const variables = variableExpenseMasters();
  const previousSpc = els.spcItemSelect.value;
  els.spcItemSelect.innerHTML = variables.map((m) => `<option value="${m.id}">${escapeHtml(m.criteria)} · ${escapeHtml(m.item)}</option>`).join("");
  if (variables.some((m) => m.id === previousSpc)) els.spcItemSelect.value = previousSpc;
}

function populatePlaceItems() {
  const criteria = els.statsItemCriteria.value;
  const items = activeMasters().filter((m) => m.criteria === criteria);
  const previous = els.statsPlaceItem.value;
  els.statsPlaceItem.innerHTML = items.map((m) => `<option value="${m.id}">${escapeHtml(m.item)}</option>`).join("");
  if (items.some((m) => m.id === previous)) {
    els.statsPlaceItem.value = previous;
    return;
  }

  const month = els.statsEndMonth.value || currentMonth();
  const best = items
    .map((master) => ({
      master,
      amount: state.transactions
        .filter((tx) => tx.amount < 0 && txMonth(tx) === month && transactionMatchesMaster(tx, master))
        .reduce((sum, tx) => sum + absAmount(tx), 0),
    }))
    .sort((a, b) => b.amount - a.amount)[0]?.master;
  if (best) els.statsPlaceItem.value = best.id;
}

function groupMonthly(months, transactions, keyGetter) {
  const keys = [...new Set(transactions.map(keyGetter).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ko"));
  return keys.map((key, index) => ({
    label: key,
    data: months.map((month) => transactions.filter((tx) => txMonth(tx) === month && keyGetter(tx) === key).reduce((sum, tx) => sum + absAmount(tx), 0)),
    borderColor: PALETTE[index % PALETTE.length],
    backgroundColor: `${PALETTE[index % PALETTE.length]}33`,
    tension: .25,
    pointRadius: 3,
    fill: false,
  }));
}

function renderQuarterTrend(months, transactions) {
  const quarters = [
    { key: "Q1", label: "Q1 · 1~7일", color: "#20639b" },
    { key: "Q2", label: "Q2 · 8~14일", color: "#3caea3" },
    { key: "Q3", label: "Q3 · 15~21일", color: "#f6c453" },
    { key: "Q4", label: "Q4 · 22일~말일", color: "#ed553b" },
  ];
  const values = quarters.map((quarter) => months.map((month) => transactions
    .filter((tx) => txMonth(tx) === month && txQuarter(tx) === quarter.key)
    .reduce((sum, tx) => sum + absAmount(tx), 0)));
  const monthlyMax = months.map((_, monthIndex) => Math.max(0, ...values.map((row) => row[monthIndex])));

  chart("quarterTrend", "quarter-trend-chart", {
    type: "bar",
    data: {
      labels: months,
      datasets: quarters.map((quarter, quarterIndex) => ({
        label: quarter.label,
        data: values[quarterIndex],
        backgroundColor: values[quarterIndex].map((value, monthIndex) => value > 0 && value === monthlyMax[monthIndex] ? `${quarter.color}dd` : `${quarter.color}77`),
        borderColor: values[quarterIndex].map((value, monthIndex) => value > 0 && value === monthlyMax[monthIndex] ? "#d64545" : quarter.color),
        borderWidth: values[quarterIndex].map((value, monthIndex) => value > 0 && value === monthlyMax[monthIndex] ? 3 : 1),
        borderRadius: 5,
      })),
    },
    options: baseChartOptions({
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, font: { size: 10 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatWon(ctx.parsed.y ?? 0)}`,
            footer: (items) => {
              const monthIndex = items[0]?.dataIndex;
              if (monthIndex === undefined) return "";
              const monthTotal = values.reduce((sum, row) => sum + Number(row[monthIndex] || 0), 0);
              return `월 전체 유출: ${formatWon(monthTotal)}`;
            },
          },
        },
      },
    }),
  });

  const focusIndex = months.length - 1;
  if (!els.quarterTrendSummary) return;
  if (focusIndex < 0 || monthlyMax[focusIndex] <= 0) {
    els.quarterTrendSummary.textContent = "Q1 1~7일 · Q2 8~14일 · Q3 15~21일 · Q4 22일~말일 · 조회 기간 데이터 없음";
    return;
  }
  const bestQuarterIndex = values.findIndex((row) => row[focusIndex] === monthlyMax[focusIndex]);
  els.quarterTrendSummary.textContent = `Q1 1~7일 · Q2 8~14일 · Q3 15~21일 · Q4 22일~말일 · ${months[focusIndex]} 최고 ${quarters[bestQuarterIndex].key} ${formatWon(monthlyMax[focusIndex])}`;
}

function renderStatistics() {
  if (!els.statsEndMonth.value) els.statsEndMonth.value = currentMonth();
  if (!els.statsStartMonth.value) els.statsStartMonth.value = shiftMonth(els.statsEndMonth.value, -11);
  if (!els.budgetKpiMonth.value) els.budgetKpiMonth.value = els.statsEndMonth.value;
  const months = monthRange(els.statsStartMonth.value, els.statsEndMonth.value);
  state.statsMonths = months;
  const txs = state.transactions.filter((tx) => months.includes(txMonth(tx)) && tx.amount < 0);
  const total = txs.reduce((sum, tx) => sum + absAmount(tx), 0);
  const avgMonthly = months.length ? total / months.length : 0;
  const overCount = months.reduce((sum, month) => sum + budgetRows(month).filter((row) => row.over).length, 0);
  const outliers = transactionOutlierMap();
  const outlierCount = txs.filter((tx) => outliers.get(tx.id)?.outlier).length;
  const cpkValues = variableExpenseMasters().map((m) => {
    const values = months.map((month) => state.transactions.filter((tx) => txMonth(tx) === month && tx.masterId === m.id && tx.amount < 0).reduce((sum, tx) => sum + absAmount(tx), 0));
    return cpkOneSided(Math.abs(m.monthlyAmount), values);
  }).filter((value) => Number.isFinite(value));
  const avgCpk = cpkValues.length ? mean(cpkValues) : null;
  renderKpiCards(els.statsKpis, [
    { label: "기간 총 유출", value: formatWon(total), tone: "bad", sub: `${months.length}개월` },
    { label: "월평균 유출", value: formatWon(avgMonthly), sub: "지출·저축 포함" },
    { label: "USL 초과", value: `${overCount}건`, tone: overCount ? "bad" : "good", sub: "Item × Month" },
    { label: "95% 이상 결제", value: `${outlierCount}건`, tone: outlierCount ? "warn" : "good", sub: "개인 결제 단위" },
    { label: "평균 Cpk", value: avgCpk === null ? "-" : avgCpk.toFixed(2), tone: avgCpk !== null && avgCpk < 1.33 ? "bad" : "good", sub: "유동 Item 단측 Cpk" },
  ]);

  chart("bankTrend", "bank-trend-chart", { type: "line", data: { labels: months, datasets: groupMonthly(months, txs, (tx) => tx.bankSnapshot || "미지정") }, options: baseChartOptions() });
  chart("criteriaTrend", "criteria-trend-chart", { type: "line", data: { labels: months, datasets: groupMonthly(months, txs, (tx) => tx.criteriaSnapshot) }, options: baseChartOptions() });
  renderQuarterTrend(months, txs);

  const criteriaOptions = [...els.statsItemCriteria.options].map((option) => option.value);
  if (!state.statsCriteriaTouched || !criteriaOptions.includes(els.statsItemCriteria.value)) {
    const defaultCriteria = highestSpendCriteria(els.statsEndMonth.value, txs, criteriaOptions);
    if (defaultCriteria) els.statsItemCriteria.value = defaultCriteria;
  }
  populatePlaceItems();

  const itemCriteria = els.statsItemCriteria.value;
  const itemTxs = txs.filter((tx) => tx.criteriaSnapshot === itemCriteria);
  chart("itemTrend", "item-trend-chart", { type: "line", data: { labels: months, datasets: groupMonthly(months, itemTxs, (tx) => tx.itemSnapshot) }, options: baseChartOptions() });

  const placeMaster = masterById(els.statsPlaceItem.value);
  const placeTxs = txs.filter((tx) => transactionMatchesMaster(tx, placeMaster));
  chart("placeTrend", "place-trend-chart", { type: "line", data: { labels: months, datasets: groupMonthly(months, placeTxs, (tx) => tx.place || "미입력") }, options: baseChartOptions() });

  renderBudgetKpi();
  renderSpc();
}

function renderDailySpendRange(master, months) {
  if (!master || !months.length) {
    if (els.dailyRangeSummary) els.dailyRangeSummary.textContent = "선택한 SPC Item의 일별 데이터가 없습니다.";
    chart("dailyRange", "daily-range-chart", { type: "line", data: { labels: [], datasets: [] }, options: baseChartOptions() });
    return;
  }

  const byMonthAndDate = new Map(months.map((month) => [month, new Map()]));
  state.transactions
    .filter((tx) => tx.amount < 0 && months.includes(txMonth(tx)) && transactionMatchesMaster(tx, master))
    .forEach((tx) => {
      const month = txMonth(tx);
      const daily = byMonthAndDate.get(month);
      daily.set(tx.date, (daily.get(tx.date) || 0) + absAmount(tx));
    });

  const stats = months.map((month) => {
    const values = [...(byMonthAndDate.get(month)?.values() || [])];
    return {
      min: values.length ? Math.min(...values) : null,
      avg: values.length ? mean(values) : null,
      max: values.length ? Math.max(...values) : null,
      count: values.length,
    };
  });

  const allDailyValues = [...byMonthAndDate.values()].flatMap((daily) => [...daily.values()]);
  const upper95 = allDailyValues.length >= 5 ? mean(allDailyValues) + 1.96 * sampleStd(allDailyValues) : null;
  const maxOutliers = stats.map((row) => row.max !== null && upper95 !== null && row.max > upper95);
  const outlierCount = maxOutliers.filter(Boolean).length;

  if (els.dailyRangeSummary) {
    els.dailyRangeSummary.textContent = upper95 === null
      ? `${master.criteria} · ${master.item} · 일별 표본 ${allDailyValues.length}일 (95% 상한은 5일 이상 필요)`
      : `${master.criteria} · ${master.item} · 95% 일별 상한 ${formatWon(upper95)} · Max 이상점 ${outlierCount}개`;
  }

  chart("dailyRange", "daily-range-chart", {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "일별 Min",
          data: stats.map((row) => row.min),
          borderColor: "#3caea3",
          backgroundColor: "rgba(60,174,163,.10)",
          tension: .22,
          pointRadius: 3,
          spanGaps: true,
        },
        {
          label: "일별 Avg",
          data: stats.map((row) => row.avg),
          borderColor: "#20639b",
          backgroundColor: "rgba(32,99,155,.10)",
          tension: .22,
          pointRadius: 4,
          spanGaps: true,
        },
        {
          label: "일별 Max",
          data: stats.map((row) => row.max),
          borderColor: "#ed553b",
          backgroundColor: "rgba(237,85,59,.10)",
          tension: .22,
          pointBackgroundColor: maxOutliers.map((isOutlier) => isOutlier ? "#d64545" : "#ed553b"),
          pointBorderColor: maxOutliers.map((isOutlier) => isOutlier ? "#d64545" : "#ed553b"),
          pointRadius: maxOutliers.map((isOutlier) => isOutlier ? 7 : 4),
          pointHoverRadius: maxOutliers.map((isOutlier) => isOutlier ? 9 : 6),
          spanGaps: true,
        },
        {
          label: "95% 일별 상한",
          data: months.map(() => upper95),
          borderColor: "#d64545",
          borderDash: [7, 5],
          pointRadius: 0,
          fill: false,
          spanGaps: true,
        },
      ],
    },
    options: baseChartOptions(),
  });
}

function renderBudgetKpi() {
  const month = els.budgetKpiMonth.value || currentMonth();
  const rows = budgetRows(month);
  els.budgetKpiTbody.innerHTML = rows.length ? rows.map((row) => `
    <tr class="${row.over ? "outlier" : ""}">
      <td>${escapeHtml(row.master.criteria)}</td><td>${escapeHtml(row.master.item)}</td>
      <td><span class="badge ${row.master.flowType === "유동" ? "variable" : "fixed"}">${escapeHtml(row.master.flowType)}</span></td>
      <td class="number">${formatWon(row.usl)}</td><td class="number">${formatWon(row.used)}</td>
      <td class="number ${row.diff < 0 ? "amount-expense" : ""}">${formatWon(row.diff, true)}</td>
      <td><div class="progress ${row.over ? "over" : ""}" title="${formatPercent(row.utilization)}"><span style="width:${Math.min(row.utilization, 100)}%"></span></div></td>
      <td><span class="badge ${row.over ? "danger" : row.utilization >= 80 ? "warn" : "ok"}">${row.over ? "USL 초과" : row.utilization >= 80 ? "주의" : "정상"}</span></td>
    </tr>`).join("") : `<tr><td colspan="8"><div class="empty-state">활성 지출 기준 항목이 없습니다.</div></td></tr>`;
}

function renderSpc() {
  const master = masterById(els.spcItemSelect.value) || variableExpenseMasters()[0];
  if (!master || !state.statsMonths.length) {
    els.spcSummary.innerHTML = `<div class="empty-state">유동 지출 Item을 추가하면 SPC를 계산합니다.</div>`;
    chart("spc", "spc-chart", { type: "line", data: { labels: [], datasets: [] }, options: baseChartOptions() });
    chart("dailyRange", "daily-range-chart", { type: "line", data: { labels: [], datasets: [] }, options: baseChartOptions() });
    chart("cpk", "cpk-chart", { type: "line", data: { labels: [], datasets: [] }, options: baseChartOptions() });
    if (els.dailyRangeSummary) els.dailyRangeSummary.textContent = "유동 지출 Item을 추가하면 일별 Min · Avg · Max를 계산합니다.";
    return;
  }
  els.spcItemSelect.value = master.id;
  const months = state.statsMonths;
  const monthlyValues = months.map((month) => state.transactions.filter((tx) => transactionMatchesMaster(tx, master) && txMonth(tx) === month && tx.amount < 0).reduce((sum, tx) => sum + absAmount(tx), 0));
  const usl = Math.abs(Number(master.monthlyAmount));
  const breaches = monthlyValues.map((value) => value > usl);
  const rises = monthlyValues.map((_, index) => index >= 5 && monthlyValues.slice(index - 5, index + 1).every((value, i, arr) => i === 0 || value > arr[i - 1]));
  const pointColors = monthlyValues.map((_, i) => breaches[i] || rises[i] ? "#d64545" : "#20639b");
  const itemTxValues = state.transactions.filter((tx) => transactionMatchesMaster(tx, master) && tx.amount < 0).map(absAmount);
  const upper95 = itemTxValues.length >= 5 ? mean(itemTxValues) + 1.96 * sampleStd(itemTxValues) : null;
  const cpk = cpkOneSided(usl, monthlyValues);
  const rolling = monthlyValues.map((_, index) => index < 2 ? null : cpkOneSided(usl, monthlyValues.slice(0, index + 1)));

  chart("spc", "spc-chart", {
    type: "line",
    data: { labels: months, datasets: [
      { label: "월 사용액", data: monthlyValues, borderColor: "#20639b", backgroundColor: "rgba(32,99,155,.12)", tension: .2, fill: true, pointBackgroundColor: pointColors, pointBorderColor: pointColors, pointRadius: monthlyValues.map((_, i) => breaches[i] || rises[i] ? 6 : 3) },
      { label: "USL", data: months.map(() => usl), borderColor: "#d64545", borderDash: [7, 5], pointRadius: 0, fill: false },
    ] },
    options: baseChartOptions(),
  });

  chart("cpk", "cpk-chart", {
    type: "line",
    data: { labels: months, datasets: [
      { label: "Rolling Cpk", data: rolling.map((v) => Number.isFinite(v) ? v : null), borderColor: "#3caea3", backgroundColor: "rgba(60,174,163,.12)", fill: true, tension: .25, pointBackgroundColor: rolling.map((v) => v !== null && v < 1.33 ? "#d64545" : "#3caea3"), pointRadius: 4 },
      { label: "관리 기준 1.33", data: months.map(() => 1.33), borderColor: "#f0a500", borderDash: [6, 5], pointRadius: 0 },
    ] },
    options: baseChartOptions({ scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: "rgba(104,115,134,.12)" }, ticks: { font: { size: 10 } } } }, plugins: { legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 7, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(3) ?? "-"}` } } } }),
  });

  renderDailySpendRange(master, months);

  const cpkText = cpk === Infinity ? "∞" : cpk === -Infinity ? "-∞" : cpk === null ? "-" : cpk.toFixed(3);
  const cpkStatus = cpk !== null && cpk >= 1.33 ? "양호" : "개선 필요";
  els.spcSummary.innerHTML = `
    <div class="metric-row"><span>대상</span><strong>${escapeHtml(master.criteria)} · ${escapeHtml(master.item)}</strong></div>
    <div class="metric-row"><span>월 USL</span><strong>${formatWon(usl)}</strong></div>
    <div class="metric-row"><span>월 평균</span><strong>${formatWon(mean(monthlyValues))}</strong></div>
    <div class="metric-row"><span>월 표준편차</span><strong>${formatWon(sampleStd(monthlyValues))}</strong></div>
    <div class="metric-row"><span>단측 Cpk</span><strong>${cpkText} · ${cpkStatus}</strong></div>
    <div class="metric-row"><span>개별 결제 95% 상한</span><strong>${upper95 === null ? "5건 이상 필요" : formatWon(upper95)}</strong></div>
    <div class="metric-row"><span>Spec 초과 월</span><strong>${breaches.filter(Boolean).length}개</strong></div>
    <div class="metric-row"><span>6-point rise</span><strong>${rises.filter(Boolean).length}회</strong></div>`;
}

function nextAssetDefaultDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(30, day)).padStart(2, "0")}`;
}

function updateAssetPreview() {
  const total = Number(els.assetCash.value || 0) + Number(els.assetStock.value || 0) + Number(els.assetInsurance.value || 0);
  els.assetTotalPreview.textContent = formatWon(total);
}

function resetAssetForm() {
  els.assetForm.reset();
  els.assetId.value = "";
  els.assetDate.value = nextAssetDefaultDate();
  els.assetSalaryBonus.value = "";
  els.assetFormTitle.textContent = "월말 자산 입력";
  els.assetCancelBtn.classList.add("hidden");
  updateAssetPreview();
}

function normalizedAsset(asset) {
  const cash = Number(asset.cash || 0);
  const stock = Number(asset.stock || 0);
  const insurance = Number(asset.insurance || 0);
  return {
    ...asset,
    salaryBonus: Number(asset.salaryBonus || 0),
    cash,
    stock,
    insurance,
    total: cash + stock + insurance,
  };
}

function replaceAssetInLocalState(asset, removedId = "") {
  state.assets = state.assets
    .filter((item) => item.id !== removedId && item.id !== asset.id)
    .concat(normalizedAsset(asset))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (state.activeView === "assets") renderAssets();
  if (state.activeView === "dashboard") renderDashboard();
}

async function saveAsset(event) {
  event.preventDefault();
  const date = els.assetDate.value;
  const salaryBonus = Number(els.assetSalaryBonus.value);
  const cash = Number(els.assetCash.value);
  const stock = Number(els.assetStock.value);
  const insurance = Number(els.assetInsurance.value);
  const values = { date, month: date.slice(0, 7), salaryBonus, cash, stock, insurance, total: cash + stock + insurance };
  const payload = { ...values, updatedAt: serverTimestamp() };
  const editingId = els.assetId.value;
  const sameDate = state.assets.find((asset) => asset.date === date && asset.id !== editingId);

  try {
    if (editingId && sameDate) {
      const batch = writeBatch(db);
      batch.update(userDoc("assets", sameDate.id), payload);
      batch.delete(userDoc("assets", editingId));
      await batch.commit();
      replaceAssetInLocalState({ id: sameDate.id, ...values }, editingId);
      toast("같은 기준일 기록에 변경값을 합쳐 Trend를 갱신했습니다.");
    } else if (editingId) {
      await updateDoc(userDoc("assets", editingId), payload);
      replaceAssetInLocalState({ id: editingId, ...values });
      toast("월말 자산 기록과 Trend를 수정했습니다.");
    } else if (sameDate) {
      await updateDoc(userDoc("assets", sameDate.id), payload);
      replaceAssetInLocalState({ id: sameDate.id, ...values });
      toast("같은 기준일의 자산 기록과 Trend를 갱신했습니다.");
    } else {
      const created = await addDoc(userCollection("assets"), { ...payload, createdAt: serverTimestamp() });
      replaceAssetInLocalState({ id: created.id, ...values });
      toast("월말 자산을 저장하고 Trend에 반영했습니다.");
    }
    resetAssetForm();
  } catch (error) { toast(humanError(error), "error"); }
}

function renderAssets() {
  const assets = state.assets.map(normalizedAsset).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const labels = assets.map((a) => a.date);
  chart("assets", "asset-trend-chart", {
    type: "line",
    data: { labels, datasets: [
      { label: "월급(+상여금)", data: assets.map((a) => a.salaryBonus), borderColor: PALETTE[4], borderDash: [7, 5], borderWidth: 2, tension: .2, pointRadius: 4, pointStyle: "rectRot" },
      { label: "Cash", data: assets.map((a) => a.cash), borderColor: PALETTE[0], tension: .2, pointRadius: 4 },
      { label: "Stock", data: assets.map((a) => a.stock), borderColor: PALETTE[1], tension: .2, pointRadius: 4 },
      { label: "Insurance", data: assets.map((a) => a.insurance), borderColor: PALETTE[2], tension: .2, pointRadius: 4 },
      { label: "All", data: assets.map((a) => a.total), borderColor: PALETTE[3], borderWidth: 3, tension: .2, pointRadius: 5 },
    ] },
    options: baseChartOptions(),
  });
  els.assetTbody.innerHTML = assets.length ? [...assets].reverse().map((a) => `
    <tr><td>${escapeHtml(a.date)}</td><td class="number"><strong>${formatWon(a.salaryBonus)}</strong></td><td class="number">${formatWon(a.cash)}</td><td class="number">${formatWon(a.stock)}</td><td class="number">${formatWon(a.insurance)}</td><td class="number"><strong>${formatWon(a.total)}</strong></td><td><div class="row-actions"><button class="table-btn" data-action="edit-asset" data-id="${a.id}">수정</button><button class="table-btn danger" data-action="delete-asset" data-id="${a.id}">삭제</button></div></td></tr>`).join("") : `<tr><td colspan="7"><div class="empty-state">월급 수령일 기준 자산과 월급(+상여금)을 입력해 주세요.</div></td></tr>`;
}

function editAsset(id) {
  const asset = state.assets.find((item) => item.id === id);
  if (!asset) return;
  els.assetId.value = asset.id;
  els.assetDate.value = asset.date;
  els.assetSalaryBonus.value = Number(asset.salaryBonus || 0);
  els.assetCash.value = asset.cash;
  els.assetStock.value = asset.stock;
  els.assetInsurance.value = asset.insurance;
  els.assetFormTitle.textContent = "월말 자산 수정";
  els.assetCancelBtn.classList.remove("hidden");
  updateAssetPreview();
  els.assetForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function removeAsset(id) {
  if (!confirm("이 월말 자산 기록을 삭제할까요?")) return;
  try { await deleteDoc(userDoc("assets", id)); toast("월말 자산 기록을 삭제했습니다."); }
  catch (error) { toast(humanError(error), "error"); }
}

function bindEvents() {
  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.authMessage.textContent = "";
    try { await signInWithEmailAndPassword(auth, els.authEmail.value.trim(), els.authPassword.value); }
    catch (error) { els.authMessage.textContent = humanError(error); }
  });

  els.signupBtn.addEventListener("click", async () => {
    els.authMessage.textContent = "";
    try {
      const credential = await createUserWithEmailAndPassword(auth, els.authEmail.value.trim(), els.authPassword.value);
      state.user = credential.user;
      await seedDefaultMasters(false);
    } catch (error) { els.authMessage.textContent = humanError(error); }
  });

  els.logoutBtn.addEventListener("click", () => signOut(auth));
  els.mainNav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) setView(button.dataset.view);
  });
  document.addEventListener("click", (event) => {
    const go = event.target.closest("[data-go]");
    if (go) setView(go.dataset.go);
  });
  els.quickAddBtn.addEventListener("click", () => { setView("ledger"); els.transactionForm.scrollIntoView({ behavior: "smooth" }); });

  els.dashboardMonth.addEventListener("change", renderDashboard);
  els.transactionCriteria.addEventListener("change", () => { populateTransactionItems(); populateBankOptions(); });
  els.transactionItem.addEventListener("change", () => { populateBankOptions(masterById(els.transactionItem.value)?.bank); updateTransactionHint(); });
  els.transactionForm.addEventListener("submit", saveTransaction);
  els.transactionCancelBtn.addEventListener("click", resetTransactionForm);
  els.ledgerMonth.addEventListener("change", renderLedger);
  els.ledgerSearch.addEventListener("input", renderLedger);
  els.exportCsvBtn.addEventListener("click", exportLedgerCsv);
  els.ledgerTbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit-tx") editTransaction(button.dataset.id);
    if (button.dataset.action === "delete-tx") removeTransaction(button.dataset.id);
  });

  els.addMasterBtn.addEventListener("click", () => openMasterDialog());
  els.seedMasterBtn.addEventListener("click", () => seedDefaultMasters(true).catch((e) => toast(humanError(e), "error")));
  els.showArchived.addEventListener("change", renderMasterTable);
  els.masterForm.addEventListener("submit", saveMaster);
  els.masterDialogClose.addEventListener("click", () => els.masterDialog.close());
  els.masterDialogCancel.addEventListener("click", () => els.masterDialog.close());
  els.masterTbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit-master") openMasterDialog(masterById(button.dataset.id));
    if (button.dataset.action === "toggle-master") toggleMaster(button.dataset.id);
  });

  els.statsRefreshBtn.addEventListener("click", () => {
    state.statsCriteriaTouched = false;
    renderStatistics();
  });
  els.statsItemCriteria.addEventListener("change", () => {
    state.statsCriteriaTouched = true;
    populatePlaceItems();
    renderStatistics();
  });
  els.statsPlaceItem.addEventListener("change", renderStatistics);
  els.budgetKpiMonth.addEventListener("change", renderBudgetKpi);
  els.spcItemSelect.addEventListener("change", renderSpc);

  els.assetForm.addEventListener("submit", saveAsset);
  [els.assetCash, els.assetStock, els.assetInsurance].forEach((input) => input.addEventListener("input", updateAssetPreview));
  els.assetCancelBtn.addEventListener("click", resetAssetForm);
  els.assetTbody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit-asset") editAsset(button.dataset.id);
    if (button.dataset.action === "delete-asset") removeAsset(button.dataset.id);
  });
}

function initializeDefaults() {
  els.dashboardMonth.value = currentMonth();
  els.ledgerMonth.value = currentMonth();
  els.statsEndMonth.value = currentMonth();
  els.statsStartMonth.value = shiftMonth(currentMonth(), -11);
  els.budgetKpiMonth.value = currentMonth();
  resetTransactionForm();
  resetAssetForm();
}

bindEvents();
initializeDefaults();

onAuthStateChanged(auth, (user) => {
  state.user = user;
  state.statsCriteriaTouched = false;
  if (user) {
    els.authScreen.classList.add("hidden");
    els.appShell.classList.remove("hidden");
    els.userEmail.textContent = user.email || user.uid;
    subscribeData();
    setView("dashboard");
  } else {
    state.unsubscribers.forEach((fn) => fn());
    state.unsubscribers = [];
    state.masters = [];
    state.transactions = [];
    state.assets = [];
    resetCharts();
    els.appShell.classList.add("hidden");
    els.authScreen.classList.remove("hidden");
    setSync("로그인 필요", "error");
  }
});
