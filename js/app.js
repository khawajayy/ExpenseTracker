import { supabase, isConfigured } from "@supabase";
import { CURRENCY_PREFIX } from "@config";
import { CATEGORIES, categoryEmoji } from "@constants";
import { SEED_TRANSACTIONS, SEED_ACCOUNTS } from "@seed";

// ---------------------------------------------------------------------------
//  State
// ---------------------------------------------------------------------------
const state = {
  user: null,
  view: "transactions",
  month: startOfCurrentMonth(),   // {year, month}  month is 1-12
  direction: "OUT",               // current form direction
  editingId: null,
  transactions: [],               // for selected month
  accounts: [],                   // all (global)
  searchQuery: "",                // transaction search filter
  filterCategory: "",             // transaction category filter
};

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------
function startOfCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
const pad = (n) => String(n).padStart(2, "0");
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function monthRange({ year, month }) {
  const start = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad(month)}-${pad(lastDay)}`;
  return { start, end };
}

function fmt(n) {
  const num = Number(n) || 0;
  const s = num.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${CURRENCY_PREFIX} ${s}`;
}

function fmtCount(n) {
  return Number(n).toLocaleString("en-US");
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, Hamza ☀️";
  if (hour < 17) return "Good afternoon, Hamza 🌤️";
  if (hour < 21) return "Good evening, Hamza 🌆";
  return "Good night, Hamza 🌙";
}

function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast" + (isError ? " error" : "");
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 2600);
}

// ---------------------------------------------------------------------------
//  Modal system (replaces native confirm/prompt)
// ---------------------------------------------------------------------------
let _modalResolve = null;

function showModal({ title, message, inputType = null, inputPlaceholder = "", confirmText = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    _modalResolve = resolve;
    $("modal-title").textContent = title;
    $("modal-message").textContent = message;
    const inputWrap = $("modal-input-wrap");
    const input = $("modal-input");
    if (inputType) {
      input.type = inputType;
      input.placeholder = inputPlaceholder;
      input.value = "";
      if (inputType === "number") input.setAttribute("inputmode", "decimal");
      else input.removeAttribute("inputmode");
      inputWrap.classList.remove("hidden");
    } else {
      inputWrap.classList.add("hidden");
    }
    const confirmBtn = $("modal-confirm");
    confirmBtn.textContent = confirmText;
    confirmBtn.className = danger ? "btn btn-danger" : "btn btn-primary";
    $("modal-overlay").classList.remove("hidden");
    if (inputType) { input.focus(); } else { confirmBtn.focus(); }
  });
}

function closeModal(result) {
  $("modal-overlay").classList.add("hidden");
  if (_modalResolve) {
    _modalResolve(result);
    _modalResolve = null;
  }
}

function modalConfirm(title, message, { confirmText = "Confirm", danger = false } = {}) {
  return showModal({ title, message, confirmText, danger });
}

function modalPrompt(title, message, { inputType = "text", placeholder = "" } = {}) {
  return showModal({ title, message, inputType, inputPlaceholder: placeholder, confirmText: "Confirm" });
}

// ---------------------------------------------------------------------------
//  Boot
// ---------------------------------------------------------------------------
async function boot() {
  populateCategorySelect();
  populateFilterCategories();
  wireStaticHandlers();

  if (!isConfigured) {
    $("boot-screen").classList.add("hidden");
    $("auth-screen").classList.remove("hidden");
    $("auth-config-warning").classList.remove("hidden");
    $("auth-submit").disabled = true;
    return;
  }

  const { data } = await supabase.auth.getSession();
  await onAuthChange(data.session);

  supabase.auth.onAuthStateChange((_event, session) => {
    onAuthChange(session);
  });
}

async function onAuthChange(session) {
  $("boot-screen").classList.add("hidden");
  if (session && session.user) {
    state.user = session.user;
    $("auth-screen").classList.add("hidden");
    $("app").classList.remove("hidden");
    $("greeting").textContent = getGreeting();
    await loadAll();
  } else {
    state.user = null;
    $("app").classList.add("hidden");
    $("auth-screen").classList.remove("hidden");
  }
}

// ---------------------------------------------------------------------------
//  Auth UI
// ---------------------------------------------------------------------------
let authMode = "signin";

function setAuthMode(mode) {
  authMode = mode;
  $("auth-submit").textContent = mode === "signin" ? "Sign in" : "Create account";
  $("auth-toggle-text").textContent = mode === "signin" ? "New here?" : "Already have an account?";
  $("auth-toggle-btn").textContent = mode === "signin" ? "Create an account" : "Sign in";
  $("auth-error").classList.add("hidden");
  $("auth-message").classList.add("hidden");
  $("auth-password").autocomplete = mode === "signin" ? "current-password" : "new-password";
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const btn = $("auth-submit");
  const errBox = $("auth-error");
  const msgBox = $("auth-message");
  errBox.classList.add("hidden");
  msgBox.classList.add("hidden");
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = "Please wait…";

  try {
    if (authMode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user && !data.session) {
        msgBox.textContent = "Account created. Check your email to confirm, then sign in.";
        msgBox.classList.remove("hidden");
        setAuthMode("signin");
      }
    }
  } catch (err) {
    errBox.textContent = err.message || "Something went wrong.";
    errBox.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

// ---------------------------------------------------------------------------
//  Data loading
// ---------------------------------------------------------------------------
async function loadAll() {
  await Promise.all([loadTransactions(), loadAccounts()]);
  renderAll();
}

async function loadTransactions() {
  const { start, end } = monthRange(state.month);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("txn_date", start)
    .lte("txn_date", end)
    .order("txn_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) { toast(error.message, true); return; }
  state.transactions = data || [];
}

async function loadAccounts() {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("kind", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) { toast(error.message, true); return; }
  state.accounts = data || [];
}

// ---------------------------------------------------------------------------
//  Filtering
// ---------------------------------------------------------------------------
function getFilteredTransactions() {
  let list = state.transactions;
  const q = state.searchQuery.toLowerCase().trim();
  const cat = state.filterCategory;

  if (q) {
    list = list.filter((t) =>
      t.description.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q))
    );
  }
  if (cat === "__income__") {
    list = list.filter((t) => t.direction === "IN");
  } else if (cat) {
    list = list.filter((t) => t.direction === "OUT" && t.category === cat);
  }
  return list;
}

function populateFilterCategories() {
  const sel = $("txn-filter-cat");
  sel.innerHTML = `<option value="">All Categories</option>
    <option value="__income__">💰 Income</option>` +
    CATEGORIES.map((c) => `<option value="${escapeHtml(c.key)}">${c.emoji} ${escapeHtml(c.key)}</option>`).join("");
}

// ---------------------------------------------------------------------------
//  Rendering
// ---------------------------------------------------------------------------
function renderAll() {
  renderMonthLabel();
  renderGreeting();
  renderDashboard();
  renderTransactions();
  renderAccounts();
  const empty = state.transactions.length === 0 && state.accounts.length === 0;
  $("seed-btn").classList.toggle("hidden", !empty);
}

function renderGreeting() {
  $("greeting").textContent = getGreeting();
}

function renderMonthLabel() {
  $("month-label").textContent = `${MONTH_NAMES[state.month.month - 1]} ${state.month.year}`;
  $("dash-month-sub").textContent = `${MONTH_NAMES[state.month.month - 1]} ${state.month.year}`;
}

function totals() {
  let income = 0, expenses = 0;
  for (const t of state.transactions) {
    if (t.direction === "IN") income += Number(t.amount);
    else expenses += Number(t.amount);
  }
  return { income, expenses, net: income - expenses };
}

function renderDashboard() {
  const { income, expenses, net } = totals();
  $("stat-income").textContent = fmt(income);
  $("stat-expenses").textContent = fmt(expenses);
  const netEl = $("stat-net");
  netEl.textContent = fmt(net);
  netEl.classList.toggle("negative", net < 0);

  // Savings rate badge
  const badge = $("savings-badge");
  const rateEl = $("savings-rate");
  if (income > 0) {
    const rate = Math.round(((income - expenses) / income) * 100);
    rateEl.textContent = `💰 Savings Rate: ${rate}%`;
    badge.className = "savings-badge";
    if (rate >= 20) badge.classList.add("positive");
    else if (rate >= 0) badge.classList.add("warning");
    else badge.classList.add("negative");
  } else {
    rateEl.textContent = "No income this month";
    badge.className = "savings-badge";
  }

  // Category breakdown (expenses only)
  const byCat = {};
  for (const t of state.transactions) {
    if (t.direction !== "OUT") continue;
    const key = t.category || "Uncategorised";
    byCat[key] = (byCat[key] || 0) + Number(t.amount);
  }
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const container = $("category-breakdown");
  if (entries.length === 0) {
    container.innerHTML = `<p class="empty-note">No expenses recorded for this month yet.</p>`;
  } else {
    const max = entries[0][1];
    container.innerHTML = entries.map(([cat, amt]) => {
      const pct = expenses > 0 ? Math.round((amt / expenses) * 100) : 0;
      const barW = max > 0 ? Math.round((amt / max) * 100) : 0;
      return `
        <div class="cat-row">
          <span class="cat-name">${categoryEmoji(cat)} ${escapeHtml(cat)}</span>
          <span class="cat-amount">${fmt(amt)}<span class="cat-pct">${pct}%</span></span>
          <div class="cat-bar"><div class="cat-bar-fill" style="width:${barW}%"></div></div>
        </div>`;
    }).join("");
  }

  // Net worth summary
  const { assets, banks, debts, net: nw } = accountTotals();
  $("dash-assets").textContent = fmt(assets);
  $("dash-banks").textContent = fmt(banks);
  $("dash-debts").textContent = "− " + fmt(debts);
  $("dash-networth").textContent = fmt(nw);
}

function renderTransactions() {
  const filtered = getFilteredTransactions();
  const list = $("txn-list");
  $("txn-count").textContent = state.transactions.length
    ? `${fmtCount(state.transactions.length)} this month` +
      (filtered.length !== state.transactions.length ? ` · ${fmtCount(filtered.length)} shown` : "")
    : "";

  if (filtered.length === 0) {
    const msg = state.transactions.length === 0
      ? "No transactions this month."
      : "No transactions match your search.";
    list.innerHTML = `<p class="empty-note">${msg}</p>`;
    return;
  }
  // group by day (descending — newest first)
  const groups = {};
  for (const t of filtered) {
    (groups[t.txn_date] ||= []).push(t);
  }
  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  list.innerHTML = days.map((day) => {
    const d = new Date(day + "T00:00:00");
    const header = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const rows = groups[day].map(txnRow).join("");
    return `<div class="txn-day-group"><div class="txn-day-header">${header}</div>${rows}</div>`;
  }).join("");

  list.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => startEdit(b.dataset.edit)));
  list.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => deleteTransaction(b.dataset.del)));
}

function txnRow(t) {
  const isIn = t.direction === "IN";
  const icon = isIn ? "💰" : categoryEmoji(t.category);
  const sub = isIn ? "Income" : (t.category || "Uncategorised");
  const sign = isIn ? "+" : "−";
  return `
    <div class="txn-item">
      <div class="txn-icon">${icon}</div>
      <div class="txn-main">
        <div class="txn-desc">${escapeHtml(t.description)}</div>
        <div class="txn-cat">${escapeHtml(sub)}</div>
      </div>
      <div class="txn-amt ${isIn ? "in" : "out"}">${sign} ${fmt(t.amount)}</div>
      <div class="txn-actions">
        <button data-edit="${t.id}" title="Edit">✎</button>
        <button class="del" data-del="${t.id}" title="Delete">🗑</button>
      </div>
    </div>`;
}

function accountTotals() {
  let assets = 0, banks = 0, debts = 0;
  for (const a of state.accounts) {
    if (a.kind === "asset") assets += Number(a.balance);
    else if (a.kind === "bank") banks += Number(a.balance);
    else if (a.kind === "debt") debts += Number(a.balance);
  }
  return { assets, banks, debts, net: assets + banks - debts };
}

function renderAccounts() {
  const assetRows = state.accounts.filter((a) => a.kind === "asset");
  const bankRows = state.accounts.filter((a) => a.kind === "bank");
  const debtRows = state.accounts.filter((a) => a.kind === "debt");
  $("assets-list").innerHTML = assetRows.map(accountRow).join("") ||
    `<p class="empty-note">No assets yet.</p>`;
  $("banks-list").innerHTML = bankRows.map(accountRow).join("") ||
    `<p class="empty-note">No bank accounts yet.</p>`;
  $("debts-list").innerHTML = debtRows.map(accountRow).join("") ||
    `<p class="empty-note">No debts recorded — nice.</p>`;

  renderAccountTotals();

  document.querySelectorAll(".account-bal").forEach((inp) => {
    inp.addEventListener("change", () => updateAccountBalance(inp.dataset.id, inp.value));
  });
  document.querySelectorAll(".account-del").forEach((b) => {
    b.addEventListener("click", () => deleteAccount(b.dataset.id));
  });
  document.querySelectorAll("[data-repay]").forEach((b) =>
    b.addEventListener("click", () => adjustDebt(b.dataset.repay, "repay")));
  document.querySelectorAll("[data-borrow]").forEach((b) =>
    b.addEventListener("click", () => adjustDebt(b.dataset.borrow, "borrow")));
}

function accountRow(a) {
  const debtActions = a.kind === "debt"
    ? `<button class="debt-btn repay" data-repay="${a.id}" title="Record a repayment (logs an expense)">Repay</button>
       <button class="debt-btn borrow" data-borrow="${a.id}" title="Record new borrowing (logs income)">Borrow</button>`
    : "";
  return `
    <div class="account-row">
      <span class="account-name">${escapeHtml(a.name)}</span>
      ${debtActions}
      <input class="account-bal" type="number" step="0.01" inputmode="decimal"
             value="${Number(a.balance)}" data-id="${a.id}" aria-label="${escapeHtml(a.name)} balance" />
      <button class="account-del" data-id="${a.id}" title="Remove">✕</button>
    </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------------------
//  Transaction CRUD
// ---------------------------------------------------------------------------
function populateCategorySelect() {
  $("txn-category").innerHTML = CATEGORIES
    .map((c) => `<option value="${escapeHtml(c.key)}">${c.emoji} ${escapeHtml(c.key)}</option>`)
    .join("");
}

function setDirection(dir) {
  state.direction = dir;
  document.querySelectorAll(".seg").forEach((s) =>
    s.classList.toggle("active", s.dataset.dir === dir));
  $("category-wrap").style.visibility = dir === "OUT" ? "visible" : "hidden";
}

async function handleTxnSubmit(e) {
  e.preventDefault();
  const date = $("txn-date").value;
  const amount = parseFloat($("txn-amount").value);
  const description = $("txn-desc").value.trim();
  const direction = state.direction;
  const category = direction === "OUT" ? $("txn-category").value : null;

  if (!date || !description || !(amount >= 0)) {
    toast("Please fill in date, description and a valid amount.", true);
    return;
  }
  const payload = { txn_date: date, amount, description, direction, category };
  const btn = $("txn-submit");
  btn.disabled = true;

  try {
    if (state.editingId) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", state.editingId);
      if (error) throw error;
      toast("Transaction updated");
    } else {
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) throw error;
      // Auto-sync the Debts section from the title:
      //   "Debt paid - Name"  -> reduce that debt
      //   "Debt - Name"       -> create / add to that debt
      const paidName = parseDebtPayment(description);
      const addName = paidName ? null : parseDebtTitle(description);
      if (paidName) {
        const found = await reduceDebtFromTitle(paidName, amount);
        toast(found ? `Transaction added · debt "${paidName}" reduced` : `Transaction added · no debt named "${paidName}"`);
      } else if (addName) {
        await upsertDebtFromTitle(addName, amount);
        toast(`Transaction added · debt "${addName}" updated`);
      } else {
        toast("Transaction added");
      }
    }
    resetTxnForm();
    // jump the selected month to match the transaction's month, then reload
    const [y, m] = date.split("-").map(Number);
    state.month = { year: y, month: m };
    await Promise.all([loadTransactions(), loadAccounts()]);
    renderAll();
  } catch (err) {
    toast(err.message || "Could not save.", true);
  } finally {
    btn.disabled = false;
  }
}

// A transaction titled "Debt - Car loan" (also accepts ":" or no spaces) maps to
// a debt named "Car loan". Returns the debt name, or null if it isn't a debt title.
function parseDebtTitle(desc) {
  const m = String(desc).match(/^\s*debt\s*[-:–—]\s*(.+?)\s*$/i);
  return m && m[1] ? m[1].trim() : null;
}

// A transaction titled "Debt paid - Car loan" (also paid/repaid/payment/repayment)
// maps to reducing the debt named "Car loan". Returns the name, or null.
function parseDebtPayment(desc) {
  const m = String(desc).match(/^\s*debt\s+(?:paid|repaid|payment|repayment)\s*[-:–—]\s*(.+?)\s*$/i);
  return m && m[1] ? m[1].trim() : null;
}

// Reduce the named debt's balance (floored at 0). Returns false if no such debt.
async function reduceDebtFromTitle(name, amount) {
  const existing = state.accounts.find(
    (a) => a.kind === "debt" && a.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (!existing) return false;
  const newBalance = Math.max(0, Number(existing.balance) - Number(amount));
  const { error } = await supabase.from("accounts").update({ balance: newBalance }).eq("id", existing.id);
  if (error) throw error;
  existing.balance = newBalance;
  return true;
}

// Create the named debt, or add to its balance if one with that name already exists.
async function upsertDebtFromTitle(name, amount) {
  const existing = state.accounts.find(
    (a) => a.kind === "debt" && a.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    const newBalance = Number(existing.balance) + Number(amount);
    const { error } = await supabase.from("accounts").update({ balance: newBalance }).eq("id", existing.id);
    if (error) throw error;
    existing.balance = newBalance;
  } else {
    const sort_order = state.accounts.filter((a) => a.kind === "debt").length;
    const { error } = await supabase.from("accounts").insert({ name, kind: "debt", balance: amount, sort_order });
    if (error) throw error;
  }
}

function startEdit(id) {
  const t = state.transactions.find((x) => x.id === id);
  if (!t) return;
  state.editingId = id;
  $("txn-id").value = id;
  $("txn-date").value = t.txn_date;
  $("txn-amount").value = Number(t.amount);
  $("txn-desc").value = t.description;
  setDirection(t.direction);
  if (t.category) $("txn-category").value = t.category;
  $("txn-form-title").textContent = "✎ Edit Transaction";
  $("txn-submit").textContent = "Save Changes";
  $("txn-cancel").classList.remove("hidden");
  switchView("transactions");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetTxnForm() {
  state.editingId = null;
  $("txn-form").reset();
  $("txn-id").value = "";
  $("txn-date").value = defaultFormDate();
  setDirection("OUT");
  $("txn-form-title").textContent = "➕ Add Transaction";
  $("txn-submit").textContent = "Add Transaction";
  $("txn-cancel").classList.add("hidden");
}

function defaultFormDate() {
  // default to today if today is within the selected month, else 1st of month
  const now = new Date();
  if (now.getFullYear() === state.month.year && now.getMonth() + 1 === state.month.month) {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
  return `${state.month.year}-${pad(state.month.month)}-01`;
}

async function deleteTransaction(id) {
  const t = state.transactions.find((x) => x.id === id);
  const confirmed = await modalConfirm(
    "Delete Transaction",
    `Are you sure you want to delete "${t ? t.description : "this transaction"}"? This cannot be undone.`,
    { confirmText: "Delete", danger: true }
  );
  if (!confirmed) return;
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) { toast(error.message, true); return; }
  toast("Deleted");
  await loadTransactions();
  renderAll();
}

// ---------------------------------------------------------------------------
//  Account CRUD
// ---------------------------------------------------------------------------
async function addAccount(kind, nameInput, balInput) {
  const name = nameInput.value.trim();
  const balance = parseFloat(balInput.value) || 0;
  if (!name) return;
  const sort_order = state.accounts.filter((a) => a.kind === kind).length;
  const { error } = await supabase.from("accounts").insert({ name, kind, balance, sort_order });
  if (error) { toast(error.message, true); return; }
  nameInput.value = ""; balInput.value = "";
  toast("Added");
  await loadAccounts();
  renderAll();
}

function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

// Repay (reduce debt, log an OUT expense) or Borrow (increase debt, log an IN).
async function adjustDebt(id, mode) {
  const debt = state.accounts.find((a) => a.id === id);
  if (!debt) return;
  const verb = mode === "repay" ? "repay" : "borrow";
  const raw = await modalPrompt(
    mode === "repay" ? "Record Repayment" : "Record Borrowing",
    `How much did you ${verb} for "${debt.name}"?`,
    { inputType: "number", placeholder: "Amount in Rs" }
  );
  if (raw === null) return;
  const amount = parseFloat(raw);
  if (!(amount > 0)) { toast("Enter an amount greater than 0.", true); return; }

  const current = Number(debt.balance);
  const newBalance = mode === "repay" ? Math.max(0, current - amount) : current + amount;
  const txn = mode === "repay"
    ? { txn_date: todayISO(), amount, description: `Repaid: ${debt.name}`, direction: "OUT", category: "Debt & Loans" }
    : { txn_date: todayISO(), amount, description: `Borrowed: ${debt.name}`, direction: "IN", category: null };

  try {
    const { error: e1 } = await supabase.from("accounts").update({ balance: newBalance }).eq("id", id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("transactions").insert(txn);
    if (e2) throw e2;
    debt.balance = newBalance;
    // show the month the logged transaction landed in so the user sees it
    const [y, m] = txn.txn_date.split("-").map(Number);
    state.month = { year: y, month: m };
    await loadTransactions();
    renderAll();
    toast(mode === "repay" ? "Repayment logged" : "Borrowing logged");
  } catch (err) {
    toast(err.message || "Could not update debt.", true);
  }
}

async function updateAccountBalance(id, value) {
  const balance = parseFloat(value) || 0;
  const { error } = await supabase.from("accounts").update({ balance }).eq("id", id);
  if (error) { toast(error.message, true); return; }
  const acc = state.accounts.find((a) => a.id === id);
  if (acc) acc.balance = balance;
  renderDashboard();
  renderAccountTotals();
  flashSaved();
}

function renderAccountTotals() {
  const { assets, banks, debts, net: nw } = accountTotals();
  $("assets-total").textContent = fmt(assets);
  $("banks-total").textContent = fmt(banks);
  $("debts-total").textContent = fmt(debts);
  $("nwf-assets").textContent = fmt(assets);
  $("nwf-banks").textContent = fmt(banks);
  $("nwf-debts").textContent = "− " + fmt(debts);
  $("nw-final").textContent = fmt(nw);
}

async function deleteAccount(id) {
  const a = state.accounts.find((x) => x.id === id);
  const confirmed = await modalConfirm(
    "Remove Account",
    `Are you sure you want to remove "${a ? a.name : "this account"}"? This cannot be undone.`,
    { confirmText: "Remove", danger: true }
  );
  if (!confirmed) return;
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) { toast(error.message, true); return; }
  await loadAccounts();
  renderAll();
}

function flashSaved() {
  const el = $("save-indicator");
  el.textContent = "✓ Saved";
  clearTimeout(flashSaved._t);
  flashSaved._t = setTimeout(() => (el.textContent = ""), 1500);
}

// ---------------------------------------------------------------------------
//  CSV Export
// ---------------------------------------------------------------------------
function exportCSV() {
  if (state.transactions.length === 0) {
    toast("No transactions to export.", true);
    return;
  }
  const header = "Date,Description,Category,Direction,Amount";
  const rows = state.transactions.map((t) => {
    const desc = `"${t.description.replace(/"/g, '""')}"`;
    const cat = t.direction === "IN" ? "Income" : (t.category || "Uncategorised");
    return `${t.txn_date},${desc},${cat},${t.direction},${t.amount}`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hamza_expenses_${MONTH_NAMES[state.month.month - 1]}_${state.month.year}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("CSV exported!");
}

// ---------------------------------------------------------------------------
//  Seed import
// ---------------------------------------------------------------------------
async function importSeed() {
  const confirmed = await modalConfirm(
    "Import Starter Data",
    "Import the July 2026 starter data (56 transactions + account balances)? This will add sample data to your account.",
    { confirmText: "Import" }
  );
  if (!confirmed) return;
  const btn = $("seed-btn");
  btn.disabled = true;
  btn.textContent = "Importing…";
  try {
    const { error: e1 } = await supabase.from("transactions").insert(SEED_TRANSACTIONS);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("accounts").insert(SEED_ACCOUNTS);
    if (e2) throw e2;
    toast("Starter data imported!");
    state.month = { year: 2026, month: 7 };
    await loadAll();
  } catch (err) {
    toast(err.message || "Import failed.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Import starter data (July 2026)";
  }
}

// ---------------------------------------------------------------------------
//  View switching + month nav
// ---------------------------------------------------------------------------
function switchView(view) {
  state.view = view;
  document.querySelectorAll(".tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) =>
    v.classList.toggle("active", v.id === `view-${view}`));
}

async function changeMonth(delta) {
  let { year, month } = state.month;
  month += delta;
  if (month < 1) { month = 12; year--; }
  if (month > 12) { month = 1; year++; }
  state.month = { year, month };
  resetTxnForm();
  await loadTransactions();
  renderAll();
}

// ---------------------------------------------------------------------------
//  Wiring
// ---------------------------------------------------------------------------
function wireStaticHandlers() {
  $("auth-form").addEventListener("submit", handleAuthSubmit);
  $("auth-toggle-btn").addEventListener("click", () =>
    setAuthMode(authMode === "signin" ? "signup" : "signin"));

  $("signout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => switchView(t.dataset.view)));

  $("month-prev").addEventListener("click", () => changeMonth(-1));
  $("month-next").addEventListener("click", () => changeMonth(1));
  $("month-label").addEventListener("click", async () => {
    state.month = startOfCurrentMonth();
    resetTxnForm();
    await loadTransactions();
    renderAll();
  });

  document.querySelectorAll(".seg").forEach((s) =>
    s.addEventListener("click", () => setDirection(s.dataset.dir)));

  $("txn-form").addEventListener("submit", handleTxnSubmit);
  $("txn-cancel").addEventListener("click", resetTxnForm);

  $("asset-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addAccount("asset", $("asset-name"), $("asset-balance"));
  });
  $("bank-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addAccount("bank", $("bank-name"), $("bank-balance"));
  });
  $("debt-add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    addAccount("debt", $("debt-name"), $("debt-balance"));
  });

  $("seed-btn").addEventListener("click", importSeed);

  // Search & filter
  $("txn-search").addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderTransactions();
  });
  $("txn-filter-cat").addEventListener("change", (e) => {
    state.filterCategory = e.target.value;
    renderTransactions();
  });

  // CSV export
  $("csv-export").addEventListener("click", exportCSV);

  // Modal
  $("modal-cancel").addEventListener("click", () => closeModal(null));
  $("modal-confirm").addEventListener("click", () => {
    const inputWrap = $("modal-input-wrap");
    if (!inputWrap.classList.contains("hidden")) {
      closeModal($("modal-input").value);
    } else {
      closeModal(true);
    }
  });
  $("modal-overlay").addEventListener("click", (e) => {
    if (e.target === $("modal-overlay")) closeModal(null);
  });
  // Close modal on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("modal-overlay").classList.contains("hidden")) {
      closeModal(null);
    }
  });
  // Submit modal on Enter when input is focused
  $("modal-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      closeModal($("modal-input").value);
    }
  });

  // initial form defaults
  setDirection("OUT");
  $("txn-date").value = defaultFormDate();
}

boot();
