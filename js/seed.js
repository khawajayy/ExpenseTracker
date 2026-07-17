// Starter data imported from Expense_Tracker_July_Claude.xlsx (July 2026).
// user_id is filled in automatically by the DB (default auth.uid()) on insert.

const H = "Housing & Utilities";
const F = "Food & Groceries";
const O = "Outside Food (Takeaway/Dining Out)";
const T = "Transport";
const L = "Health & Lifestyle";
const S = "Savings, Investment & Other";

// [day, description, amount, category(null for IN), direction]
const ROWS = [
  [1, "June Salary + Balance from June", 297100, null, "IN"],
  [1, "Rent Payment", 63125, H, "OUT"],
  [1, "Stormfiber bill", 3400, H, "OUT"],
  [1, "Mahaana Save+", 27500, S, "OUT"],
  [1, "Mama monthly + papa committee + committee", 70000, S, "OUT"],
  [1, "Electricity bill", 20000, H, "OUT"],
  [1, "Maid", 14000, H, "OUT"],
  [1, "Chair + Table", 26500, L, "OUT"],
  [1, "Old PC sell", 10000, null, "IN"],
  [2, "Misc", 5000, O, "OUT"],
  [2, "Netflix", 1000, L, "OUT"],
  [2, "Jalal Sons", 2500, F, "OUT"],
  [2, "Intel Profit", 14200, null, "IN"],
  [2, "Tehzeeb Mango Cake + Smash", 5000, O, "OUT"],
  [2, "Al meezan withdraw", 5000, null, "IN"],
  [3, "Savings", 19000, S, "OUT"],
  [3, "Table + Chair old sell", 5500, null, "IN"],
  [3, "Bundu Khan", 1820, O, "OUT"],
  [3, "Desi Oven", 1200, O, "OUT"],
  [3, "Papa Medical Claim", 6700, null, "IN"],
  [4, "Lasani", 600, O, "OUT"],
  [4, "Padel x2", 4400, L, "OUT"],
  [5, "JS - Grocery", 9500, F, "OUT"],
  [5, "Trousers/shorts", 3000, L, "OUT"],
  [5, "Padel Racket", 12000, L, "OUT"],
  [6, "Misc", 2500, F, "OUT"],
  [6, "Yummy Boy", 2700, O, "OUT"],
  [6, "Shizza package", 1800, H, "OUT"],
  [7, "Freelance - Incoming", 51580, null, "IN"],
  [8, "Invest in Intel", 50000, S, "OUT"],
  [8, "Lasani + 786", 1250, O, "OUT"],
  [8, "Oxygen sensor", 5500, T, "OUT"],
  [8, "Savings", 6000, S, "OUT"],
  [8, "Shizza - Incoming", 5000, null, "IN"],
  [12, "Donation - Alkhidmat", 2000, S, "OUT"],
  [12, "Intel Investment", 200000, S, "OUT"],
  [12, "KFC and other Misc", 6250, L, "OUT"],
  [12, "Car headlights + maintenance - Passo", 12600, T, "OUT"],
  [12, "Dividend", 40000, null, "IN"],
  [12, "Noor mart etc", 4000, H, "OUT"],
  [12, "Bhaiya return", 5000, S, "OUT"],
  [12, "Mtag", 1000, T, "OUT"],
  [12, "White Castle - Pizza", 2100, O, "OUT"],
  [12, "Papa- Money", 19000, null, "IN"],
  [13, "Intel Investment", 30000, S, "OUT"],
  [14, "Finqalab withdrawal", 250000, null, "IN"],
  [14, "Grocery", 7000, F, "OUT"],
  [14, "Intel Investment", 50000, S, "OUT"],
  [15, "Daraz", 1400, L, "OUT"],
  [15, "K&Ns", 2320, F, "OUT"],
  [15, "Lasani", 1000, O, "OUT"],
  [15, "Magnesium", 3000, L, "OUT"],
  [15, "Wraps & Groceries", 600, F, "OUT"],
  [15, "Padel", 1800, L, "OUT"],
  [15, "Rox package", 1700, L, "OUT"],
  [15, "Daraz", 1300, L, "OUT"],
];

const pad = (n) => String(n).padStart(2, "0");

export const SEED_TRANSACTIONS = ROWS.map(([day, description, amount, category, direction]) => ({
  txn_date: `2026-07-${pad(day)}`,
  description,
  amount,
  category,
  direction,
}));

export const SEED_ACCOUNTS = [
  // Assets / Money Bound
  { name: "Car",              kind: "asset", balance: 2700000, sort_order: 0 },
  { name: "House Security",   kind: "asset", balance: 180000,  sort_order: 1 },
  { name: "Crypto Gold – Mama", kind: "asset", balance: 500000, sort_order: 2 },
  { name: "Finqalab",         kind: "asset", balance: 0,       sort_order: 3 },
  { name: "Intel Investment", kind: "asset", balance: 330000,  sort_order: 4 },
  { name: "Provident Fund",   kind: "asset", balance: 486000,  sort_order: 5 },
  { name: "Binance - Me",     kind: "asset", balance: 0,       sort_order: 6 },
  { name: "Mahaana - VPS",    kind: "asset", balance: 10000,   sort_order: 7 },
  // Bank Accounts
  { name: "SC",       kind: "bank", balance: 7480, sort_order: 0 },
  { name: "Naya",     kind: "bank", balance: 2100, sort_order: 1 },
  { name: "ABL",      kind: "bank", balance: 1000, sort_order: 2 },
  { name: "Jazzcash", kind: "bank", balance: 0,    sort_order: 3 },
  { name: "Cash",     kind: "bank", balance: 500,  sort_order: 4 },
  { name: "Meezan",   kind: "bank", balance: 0,    sort_order: 5 },
];
