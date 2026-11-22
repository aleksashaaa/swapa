export const CATEGORIES = ["clothing", "books", "home"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  clothing: "Clothing",
  books: "Books",
  home: "Home",
};

export const CATEGORY_TAGLINES: Record<Category, string> = {
  clothing: "Clothes, shoes & accessories",
  books: "Books, textbooks & comics",
  home: "Kitchenware, decor & household",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  clothing: "shirt",
  books: "book",
  home: "home",
};

export const CONDITIONS = ["like_new", "good", "fair", "used"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  used: "Used",
};

export const ITEM_STATUSES = ["available", "reserved", "completed", "paused"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  completed: "Completed",
  paused: "Paused",
};

export const STATUS_STYLES: Record<ItemStatus, string> = {
  available: "status-available",
  reserved: "status-reserved",
  completed: "status-completed",
  paused: "status-paused",
};

export const INTERESTS = [
  "Fashion",
  "Vintage",
  "Books",
  "Design",
  "Home decor",
  "Cooking",
  "Sustainability",
  "Minimalism",
  "Art",
  "Photography",
  "Music",
  "Plants",
  "DIY",
  "Wellness",
] as const;

export const REPORT_REASONS = [
  "Prohibited or illegal item",
  "Counterfeit or fake item",
  "Offensive content",
  "Harassment or abuse",
  "Spam or scam",
  "Misleading description",
  "Other",
] as const;

export const MAX_ITEM_IMAGES = 5;
export const MAX_IMAGE_MB = 5;
export const MAX_AVATAR_MB = 2;

export const OPTIONAL_ATTRIBUTES: Record<
  Category,
  { key: string; label: string; placeholder?: string }[]
> = {
  clothing: [
    { key: "size", label: "Size", placeholder: "M, 38, One size…" },
    { key: "brand", label: "Brand", placeholder: "Uniqlo, Zara…" },
    { key: "clothing_type", label: "Clothing type", placeholder: "Jacket, dress, sneakers…" },
    { key: "season", label: "Season", placeholder: "All season, winter…" },
  ],
  books: [
    { key: "author", label: "Author", placeholder: "Author name" },
    { key: "genre", label: "Genre", placeholder: "Fiction, design, history…" },
    { key: "language", label: "Language", placeholder: "English, Russian…" },
    { key: "publication_year", label: "Publication year", placeholder: "2018" },
  ],
  home: [
    { key: "item_type", label: "Item type", placeholder: "Vase, lamp, pan…" },
    { key: "material", label: "Material", placeholder: "Ceramic, wood, glass…" },
    { key: "color", label: "Color", placeholder: "Sage, white…" },
    { key: "dimensions", label: "Dimensions", placeholder: "30 × 20 cm" },
  ],
};

export function categoryLabel(value: string | null | undefined) {
  return CATEGORY_LABELS[(value ?? "") as Category] ?? value ?? "—";
}

export function conditionLabel(value: string | null | undefined) {
  return CONDITION_LABELS[(value ?? "") as Condition] ?? value ?? "—";
}

export function statusLabel(value: string | null | undefined) {
  return STATUS_LABELS[(value ?? "") as ItemStatus] ?? value ?? "—";
}
