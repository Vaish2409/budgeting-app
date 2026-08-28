import { Category } from "../types/models";

/**
 * Seeded on first launch (FR17). Fully editable/deletable by the user afterward —
 * this is just the starting set, not a fixed enum.
 */
export const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  {
    name: "Groceries",
    color: "#4CAF50",
    icon: "shopping-cart",
    isDefault: true,
    sortOrder: 0,
  },
  {
    name: "Dining",
    color: "#FF9800",
    icon: "utensils",
    isDefault: true,
    sortOrder: 1,
  },
  {
    name: "Transport",
    color: "#2196F3",
    icon: "car",
    isDefault: true,
    sortOrder: 2,
  },
  {
    name: "Bills & Utilities",
    color: "#9C27B0",
    icon: "file-invoice",
    isDefault: true,
    sortOrder: 3,
  },
  {
    name: "Shopping",
    color: "#E91E63",
    icon: "shopping-bag",
    isDefault: true,
    sortOrder: 4,
  },
  {
    name: "Health",
    color: "#00BCD4",
    icon: "heart-pulse",
    isDefault: true,
    sortOrder: 5,
  },
  {
    name: "Entertainment",
    color: "#FFC107",
    icon: "film",
    isDefault: true,
    sortOrder: 6,
  },
  {
    name: "Travel",
    color: "#3F51B5",
    icon: "plane",
    isDefault: true,
    sortOrder: 7,
  },
  {
    name: "Subscriptions",
    color: "#795548",
    icon: "repeat",
    isDefault: true,
    sortOrder: 8,
  },
  {
    name: "Other",
    color: "#9E9E9E",
    icon: "ellipsis",
    isDefault: true,
    sortOrder: 9,
  },
  {
    name: "Fuel",
    color: "#FF5722",
    icon: "gas-pump",
    isDefault: true,
    sortOrder: 10,
  },
];

/**
 * Seed keyword -> category name matches, used to bootstrap MerchantCategoryRule
 * rows for auto-categorization (FR18) before the user has corrected anything.
 * Keys are lowercase substrings matched against merchant/body text.
 */
export const DEFAULT_MERCHANT_KEYWORDS: Record<string, string> = {
  // Groceries
  carrefour: "Groceries",
  lulu: "Groceries",
  "co-op": "Groceries",
  hypermart: "Groceries",
  hypermarket: "Groceries",
  supermarket: "Groceries",
  spinneys: "Groceries",
  choithram: "Groceries",
  geant: "Groceries",
  panda: "Groceries",
  danube: "Groceries",
  "al maya": "Groceries",
  "al meera": "Groceries",
  monoprix: "Groceries",
  nesto: "Groceries",
  grocer: "Groceries",
  allday: "Groceries",

  // Dining
  talabat: "Dining",
  deliveroo: "Dining",
  starbucks: "Dining",
  mcdonald: "Dining",
  kfc: "Dining",
  "burger king": "Dining",
  costa: "Dining",
  caffe: "Dining",
  cafe: "Dining",
  restaurant: "Dining",
  zomato: "Dining",

  // Transport
  uber: "Transport",
  careem: "Transport",
  taxi: "Transport",
  petrol: "Transport",
  fuel: "Transport",
  "gas station": "Transport",
  parking: "Transport",
  metro: "Transport",
  rta: "Transport",

  // Bills & Utilities
  electricity: "Bills & Utilities",
  ewa: "Bills & Utilities",
  stc: "Bills & Utilities",
  batelco: "Bills & Utilities",
  zain: "Bills & Utilities",
  etisalat: "Bills & Utilities",
  dewa: "Bills & Utilities",
  internet: "Bills & Utilities",

  // Shopping
  amazon: "Shopping",
  noon: "Shopping",
  ikea: "Shopping",
  "h&m": "Shopping",
  zara: "Shopping",
  mall: "Shopping",

  // Health
  pharmacy: "Health",
  clinic: "Health",
  hospital: "Health",
  boots: "Health",

  // Entertainment
  cinema: "Entertainment",
  vox: "Entertainment",
  reel: "Entertainment",

  // Subscriptions
  netflix: "Subscriptions",
  spotify: "Subscriptions",
  "apple.com/bill": "Subscriptions",
  "google play": "Subscriptions",
  "amazon prime": "Subscriptions",

  //Fuel
  bapco: "Fuel",
};
