export type Channel =
  | "telegram"
  | "whatsapp"
  | "x"
  | "reddit"
  | "instagram"
  | "email"
  | "seo";

export type Verdict = "frontpage" | "test" | "hold" | "kill";

export type Category =
  | "Audio"
  | "Mobiles"
  | "Kitchen"
  | "Computing"
  | "Grocery"
  | "Fashion"
  | "Home";

export type Deal = {
  id: string;
  brand: string;
  title: string;
  category: Category;
  price: number;
  mrp: number;
  couponValue: number;
  couponCode: string | null;
  rating: number;
  reviews: number;
  historyLow: number;
  seenHoursAgo: number;
  inStock: boolean;
  spike: boolean;
  mentions: number;
};

export type Weights = {
  depth: number;
  low: number;
  trust: number;
  fresh: number;
  stock: number;
  coupon: number;
  social: number;
};

export const DEFAULT_WEIGHTS: Weights = {
  depth: 30,
  low: 18,
  trust: 20,
  fresh: 10,
  stock: 10,
  coupon: 6,
  social: 6,
};

export type Part = {
  key: keyof Weights;
  label: string;
  points: number;
  max: number;
  note: string;
};

export type WaterStep = {
  id: string;
  field: string;
  source: string;
  rule: string;
  value: string;
  confident: boolean;
};

export type Scored = {
  deal: Deal;
  effective: number;
  discount: number;
  newLow: boolean;
  parts: Part[];
  total: number;
  verdict: Verdict;
  steps: WaterStep[];
  hook: string;
};

export type QueueItem = {
  id: string;
  dealId: string;
  channel: Channel;
  due: string;
  status: "ready" | "sent";
};

export type ViewId = "post" | "desk" | "radar" | "studio" | "routes" | "method";

export const CHANNELS: { id: Channel; label: string; hint: string }[] = [
  { id: "telegram", label: "Telegram", hint: "First touch. Number in line one." },
  { id: "whatsapp", label: "WhatsApp", hint: "Opt-in list only. After the stock recheck." },
  { id: "x", label: "X", hint: "One short post. Link your page." },
  { id: "reddit", label: "Reddit", hint: "Price in the title. Affiliate disclosed." },
  { id: "instagram", label: "Instagram", hint: "Three lines on screen. Link in bio." },
  { id: "email", label: "Alerts", hint: "People who asked. Never a bought list." },
  { id: "seo", label: "Search page", hint: "A question a shopper actually types." },
];
