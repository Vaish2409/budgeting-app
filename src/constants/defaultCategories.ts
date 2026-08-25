import { Category } from "../types/models";

/**
 * Seeded on first launch (FR17). Fully editable/deletable by the user afterward —
 * this is just the starting set, not a fixed enum.
 */
export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Groceries", color: "#4CAF50", icon: "shopping-cart", isDefault: true, sortOrder: 0 },
  { name: "Dining", color: "#FF9800", icon: "utensils", isDefault: true, sortOrder: 1 },
  { name: "Transport", color: "#2196F3", icon: "car", isDefault: true, sortOrder: 2 },
  { name: "Bills & Utilities", color: "#9C27B0", icon: "file-invoice", isDefault: true, sortOrder: 3 },
  { name: "Shopping", color: "#E91E63", icon: "shopping-bag", isDefault: true, sortOrder: 4 },
  { name: "Health", color: "#00BCD4", icon: "heart-pulse", isDefault: true, sortOrder: 5 },
  { name: "Entertainment", color: "#FFC107", icon: "film", isDefault: true, sortOrder: 6 },
  { name: "Travel", color: "#3F51B5", icon: "plane", isDefault: true, sortOrder: 7 },
  { name: "Subscriptions", color: "#795548", icon: "repeat", isDefault: true, sortOrder: 8 },
  { name: "Other", color: "#9E9E9E", icon: "ellipsis", isDefault: true, sortOrder: 9 },
];

/**
 * Seed keyword -> category name matches, used to bootstrap MerchantCategoryRule
 * rows for auto-categorization (FR18) before the user has corrected anything.
 * Keys are lowercase substrings matched against merchant/body text.
 */
export const DEFAULT_MERCHANT_KEYWORDS: Record<string, string> = {
  carrefour: "Groceries",
  lulu: "Groceries",
  "co-op": "Groceries",
  talabat: "Dining",
  "deliveroo": "Dining",
  starbucks: "Dining",
  mcdonald: "Dining",
  uber: "Transport",
  careem: "Transport",
  taxi: "Transport",
  petrol: "Transport",
  "electricity": "Bills & Utilities",
  ewa: "Bills & Utilities",
  stc: "Bills & Utilities",
  batelco: "Bills & Utilities",
  zain: "Bills & Utilities",
  amazon: "Shopping",
  noon: "Shopping",
  pharmacy: "Health",
  clinic: "Health",
  cinema: "Entertainment",
  netflix: "Subscriptions",
  spotify: "Subscriptions",
};
