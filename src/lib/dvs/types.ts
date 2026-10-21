export type Unit = "CFM" | "MPH" | "km/h" | "FPM";
export type PayStatus = "paid" | "due" | "estimate";
export type PayMethod = "cash" | "zelle" | "card" | "check" | "invoice" | "other";
export type DocKind = "certificate" | "estimate";
export type UiLang = "en" | "he";
export type Theme = "light" | "dark";
export type ReportLang = "en" | "es" | "he";
export type Screen = "intake" | "air" | "work" | "quote" | "send";
export type FlowBand = "critical" | "poor" | "marginal" | "good" | "excellent";

export type Localized = { en: string; es: string; he: string };

/** Max vent photos kept per side (before / after) on one job. */
export const MAX_PHOTOS_PER_SIDE = 8;

export type Job = {
  id: string;
  createdAt: string;
  serviceDate: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  termination: string;
  dryer: string;
  unit: Unit;
  airBefore: number;
  airAfter: number;
  coPpm: number;
  readingsAreSample: boolean;
  ductFeet: number;
  elbows90: number;
  elbows45: number;
  hazards: string[];
  actions: string[];
  catalogOn: string[];
  priceOverrides: Record<string, number>;
  customItems: { id: string; name: string; price: number }[];
  discount: number;
  discountMode: "usd" | "pct";
  deposit: number;
  limitFt: number;
  taxRate: number;
  payStatus: PayStatus;
  payMethod: PayMethod;
  showPricing: boolean;
  docKind: DocKind;
  notes: string;
  photoBefore: string[];
  photoAfter: string[];
  meterBefore: string | null;
  meterAfter: string | null;
  signature: string | null;
  autoPrice: boolean;
};

export type SavedJob = {
  savedAt: string;
  job: Job;
};

export type Settings = {
  businessName: string;
  techName: string;
  phone: string;
  email: string;
  site: string;
  reviewLink: string;
  defaultTax: number;
  uiLang: UiLang;
  theme: Theme;
};
