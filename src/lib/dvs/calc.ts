import { CATALOG } from "./content";
import type { FlowBand, Job, Unit } from "./types";

/** Inside area of a 4 in round duct, in square feet. */
export const DUCT_AREA_SQFT = Math.PI * (2 / 12) ** 2;
export const CODE_LIMIT_FT = 35;
export const LINT_CARRY_FPM = 1000;

export function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addYearsISO(iso: string, years: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, d || 1);
  dt.setFullYear(dt.getFullYear() + years);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function formatISODate(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export function formatMonthYear(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y || 2026, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

/** Sequential job numbers: the first job is DVS-1001, then DVS-1002, ... */
export function sequentialJobId(counter: number) {
  return `DVS-${1000 + Math.max(1, Math.floor(counter) || 1)}`;
}

export function toCfm(value: number, unit: Unit) {
  if (!Number.isFinite(value)) return 0;
  switch (unit) {
    case "CFM":
      return value;
    case "FPM":
      return value * DUCT_AREA_SQFT;
    case "MPH":
      return value * 88 * DUCT_AREA_SQFT;
    case "km/h":
      return (value / 1.60934) * 88 * DUCT_AREA_SQFT;
  }
}

export function fromCfm(cfm: number, unit: Unit) {
  switch (unit) {
    case "CFM":
      return Math.round(cfm);
    case "FPM":
      return Math.round(cfm / DUCT_AREA_SQFT);
    case "MPH":
      return Math.round((cfm / DUCT_AREA_SQFT / 88) * 10) / 10;
    case "km/h":
      return Math.round(((cfm / DUCT_AREA_SQFT / 88) * 1.60934) * 10) / 10;
  }
}
export function flowFromCfm(cfm: number) {
  const fpm = cfm / DUCT_AREA_SQFT;
  const mph = fpm / 88;
  return {
    cfm: Math.round(cfm),
    fpm: Math.round(fpm),
    mph: Math.round(mph * 10) / 10,
    kmh: Math.round(mph * 1.60934 * 10) / 10,
  };
}

export function flowBand(cfm: number): FlowBand {
  if (cfm >= 160) return "excellent";
  if (cfm >= 120) return "good";
  if (cfm >= 80) return "marginal";
  if (cfm >= 40) return "poor";
  return "critical";
}

export function gainPct(before: number, after: number) {
  if (before > 0 && after >= before) return Math.round(((after - before) / before) * 100);
  if (before === 0 && after > 0) return null;
  if (after < before && before > 0) return Math.round(((after - before) / before) * 100);
  return 0;
}

export function ductLimit(job: Pick<Job, "limitFt">) {
  const n = Number(job.limitFt);
  return Number.isFinite(n) && n > 0 ? n : CODE_LIMIT_FT;
}

export function equivalentLength(job: Pick<Job, "ductFeet" | "elbows90" | "elbows45">) {
  const feet = Number(job.ductFeet) || 0;
  const e90 = Number(job.elbows90) || 0;
  const e45 = Number(job.elbows45) || 0;
  const ded = feet + e90 * 5 + e45 * 2.5;
  return Math.round(ded * 10) / 10;
}

export type PricedLine = {
  id: string;
  name: string;
  price: number;
  catalog: boolean;
};

export function pricedLines(job: Job, lang: "en" | "es" | "he"): PricedLine[] {
  const lines: PricedLine[] = [];
  for (const id of job.catalogOn) {
    const item = CATALOG.find((c) => c.id === id);
    if (!item) continue;
    lines.push({
      id,
      name: item.name[lang],
      price: job.priceOverrides[id] ?? item.price,
      catalog: true,
    });
  }
  for (const custom of job.customItems) {
    lines.push({ id: custom.id, name: custom.name, price: custom.price, catalog: false });
  }
  return lines;
}

export function totals(job: Job) {
  const subtotal = pricedLines(job, "en").reduce((sum, line) => sum + (Number(line.price) || 0), 0);
  const raw = Math.max(0, Number(job.discount) || 0);
  const discount =
    job.discountMode === "pct"
      ? Math.round(subtotal * (Math.min(raw, 100) / 100) * 100) / 100
      : Math.min(raw, subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const taxRate = Math.max(0, Number(job.taxRate) || 0);
  const tax = Math.round(taxable * (taxRate / 100) * 100) / 100;
  const total = taxable + tax;
  const deposit = Math.min(total, Math.max(0, Number(job.deposit) || 0));
  return { subtotal, discount, taxRate, tax, total, deposit, balance: Math.max(0, total - deposit) };
}

export function readiness(job: Job) {
  const phoneDigits = job.clientPhone.replace(/\D/g, "").length;
  const checks: { key: string; ok: boolean; weight: number }[] = [
    { key: "missingName", ok: job.clientName.trim().length > 1, weight: 15 },
    { key: "missingAddress", ok: job.clientAddress.trim().length > 3, weight: 15 },
    { key: "missingPhone", ok: phoneDigits >= 10, weight: 10 },
    { key: "missingAir", ok: job.airAfter > 0 && !job.readingsAreSample, weight: 15 },
    { key: "missingWork", ok: job.docKind === "estimate" || job.actions.length > 0, weight: 10 },
    { key: "missingPrice", ok: job.catalogOn.length + job.customItems.length > 0, weight: 15 },
    { key: "missingSig", ok: Boolean(job.signature), weight: 10 },
    { key: "missingPhotos", ok: job.photoBefore.length > 0 && job.photoAfter.length > 0, weight: 10 },
  ];
  const score = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  return { score, missing: checks.filter((check) => !check.ok).map((check) => check.key) };
}

export function unitStep(unit: Unit) {
  if (unit === "MPH" || unit === "km/h") return 0.5;
  if (unit === "FPM") return 50;
  return 1;
}

export function clampReading(n: number, step: number) {
  if (!Number.isFinite(n)) return 0;
  const decimals = step < 1 ? 1 : 0;
  return Number(Math.min(20000, Math.max(0, n)).toFixed(decimals));
}

export function tagAddress(current: string, tag: string) {
  const town = tag.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!current.trim()) return tag;
  if (town && current.toLowerCase().includes(town)) return current;
  return `${current.replace(/[,\s]+$/, "")}, ${tag}`;
}

export function digitsPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `1${digits}`;
  return digits;
}
