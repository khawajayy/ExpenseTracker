// Expense categories — mirror the Excel exactly. `key` is stored in the DB;
// `emoji` + `key` are shown in the UI. Income transactions have no category.
export const CATEGORIES = [
  { key: "Housing & Utilities",                    emoji: "🏠" },
  { key: "Food & Groceries",                       emoji: "🛒" },
  { key: "Outside Food (Takeaway/Dining Out)",     emoji: "🍔" },
  { key: "Transport",                              emoji: "🚗" },
  { key: "Health & Lifestyle",                     emoji: "💊" },
  { key: "Savings, Investment & Other",            emoji: "📈" },
];

export const CATEGORY_EMOJI = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.emoji])
);

export function categoryEmoji(key) {
  return CATEGORY_EMOJI[key] || "🏷️";
}
