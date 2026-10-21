import { ACTIONS, byId, DRYERS, HAZARDS, TERMINATIONS } from "./content";
import {
  addYearsISO,
  ductLimit,
  equivalentLength,
  flowBand,
  flowFromCfm,
  formatISODate,
  formatMonthYear,
  gainPct,
  money,
  pricedLines,
  toCfm,
  totals,
} from "./calc";
import { t } from "./i18n";
import type { Job, ReportLang, Settings } from "./types";

const LOCALES: Record<ReportLang, string> = {
  en: "en-US",
  es: "es-US",
  he: "he-IL",
};

export function jobMetrics(job: Job) {
  const beforeCfm = toCfm(job.airBefore, job.unit);
  const afterCfm = toCfm(job.airAfter, job.unit);
  const after = flowFromCfm(afterCfm);
  const before = flowFromCfm(beforeCfm);
  const ded = equivalentLength(job);
  const pct = gainPct(beforeCfm, afterCfm);
  const band = flowBand(afterCfm);
  const beforeBand = flowBand(beforeCfm);
  let safety: "resolved" | "restricted" | "maintained" = "restricted";
  if (beforeBand === "good" || beforeBand === "excellent") {
    safety = afterCfm >= beforeCfm ? "maintained" : "restricted";
  } else if (band === "good" || band === "excellent" || band === "marginal") {
    safety = "resolved";
  }
  return { beforeCfm, afterCfm, before, after, ded, pct, band, beforeBand, safety };
}

export function narrative(job: Job, lang: ReportLang) {
  const m = jobMetrics(job);
  const limit = m.ded <= ductLimit(job) ? t(lang, "pass") : t(lang, "longRun");
  if (m.beforeCfm <= 0 && m.afterCfm > 0) {
    return t(lang, "fromZero", {
      after: m.after.cfm,
      ded: m.ded,
      limit,
    });
  }
  const gain =
    m.pct === null ? "" : t(lang, "gainBit", { pct: m.pct > 0 ? `+${m.pct}` : String(m.pct) });
  return t(lang, "narrative", {
    before: m.before.cfm,
    after: m.after.cfm,
    gain,
    ded: m.ded,
    limit,
  });
}

function localizedName(
  list: { id: string; name: { en: string; es: string; he: string } }[],
  id: string,
  lang: ReportLang,
) {
  return byId(list, id)?.name[lang] ?? id;
}

export function buildReport(job: Job, lang: ReportLang, settings: Settings) {
  const m = jobMetrics(job);
  const lines = pricedLines(job, lang);
  const sum = totals(job);
  const locale = LOCALES[lang];
  const name = job.clientName.trim() || t(lang, "valued");
  const address = job.clientAddress.trim() || "New York / New Jersey";
  const date = formatISODate(job.serviceDate, locale);
  const next = formatMonthYear(addYearsISO(job.serviceDate, 1), locale);
  const lead = job.docKind === "estimate" ? t(lang, "estimateLead") : t(lang, "certificateLead");
  const out: string[] = [];

  out.push(`*${(settings.businessName || "Dryer Vent Services").toUpperCase()}*`);
  out.push(`*${lead}*`);
  out.push(`${t(lang, "date")}: ${date}  ·  ${t(lang, "ref")} ${job.id}`);
  out.push(`${t(lang, "client")}: ${name}`);
  out.push(`${t(lang, "property")}: ${address}`);
  if (job.clientPhone.trim()) out.push(`${t(lang, "phoneShort")}: ${job.clientPhone.trim()}`);
  out.push(
    `${t(lang, "system")}: ${localizedName(TERMINATIONS, job.termination, lang)} · ${localizedName(DRYERS, job.dryer, lang)}`,
  );

  if (job.docKind === "certificate" || job.airAfter > 0 || job.airBefore > 0) {
    out.push("");
    out.push(`*${t(lang, "airHead")}*`);
    out.push(`${t(lang, "beforeShort")}: ${job.airBefore} ${job.unit}`);
    out.push(`${t(lang, "afterShort")}: ${job.airAfter} ${job.unit}`);
    out.push(`${m.after.cfm} CFM · ${m.after.fpm} FPM · ${m.after.mph} MPH`);
    if (m.pct === null) out.push(`${t(lang, "recovery")}: ${t(lang, "restored")}`);
    else out.push(`${t(lang, "recovery")}: ${m.pct > 0 ? "+" : ""}${m.pct}%`);
    out.push(
      `${t(lang, "dedLine")}: ${m.ded} ft (${job.ductFeet} ft, ${job.elbows90}×90°, ${job.elbows45}×45°) — ${m.ded <= ductLimit(job) ? t(lang, "pass") : t(lang, "longRun")}`,
    );
    if (job.coPpm > 0) out.push(`${t(lang, "coLine")}: ${job.coPpm} ppm`);
    out.push(`${t(lang, "verdict")}: ${t(lang, m.safety)}`);
  }

  const hazards = job.hazards
    .map((id) => HAZARDS.find((h) => h.id === id))
    .filter((h) => h !== undefined);
  out.push("");
  out.push(`*${t(lang, "findingsHead")}*`);
  if (hazards.length === 0) out.push(`• ${t(lang, "routine")}`);
  else for (const hazard of hazards) out.push(`• ${hazard.name[lang]}`);

  const actions = job.actions
    .map((id) => ACTIONS.find((a) => a.id === id))
    .filter((a) => a !== undefined);
  if (actions.length) {
    out.push("");
    out.push(`*${t(lang, "workHead")}*`);
    for (const action of actions) out.push(`• ${action.name[lang]}`);
  }

  if (job.notes.trim()) {
    out.push("");
    out.push(`*${t(lang, "notesHead")}*`);
    out.push(job.notes.trim());
  }

  if (job.showPricing) {
    out.push("");
    out.push(`*${job.docKind === "estimate" ? t(lang, "quoteHead") : t(lang, "summaryHead")} — ${t(lang, job.payStatus)} · ${t(lang, job.payMethod)}*`);
    if (lines.length === 0) out.push(`• ${t(lang, "noLines")}`);
    for (const line of lines) out.push(`• ${line.name}: ${money(line.price)}`);
    if (sum.discount > 0) out.push(`• ${t(lang, "discount")}: -${money(sum.discount)}`);
    if (sum.tax > 0) out.push(`• ${t(lang, "tax")}: ${money(sum.tax)}`);
    out.push(`*${t(lang, "totalHead")}: ${money(sum.total)}*`);
    if (sum.deposit > 0) {
      out.push(`• ${t(lang, "deposit")}: -${money(sum.deposit)}`);
      out.push(`*${t(lang, "balance")}: ${money(sum.balance)}*`);
    }
  }

  out.push("");
  out.push(`${t(lang, "nextHead")}: ${next}`);
  out.push(t(lang, "why"));
  out.push(`${settings.techName} · ${settings.phone} · ${settings.site}`);
  if (settings.reviewLink.trim()) {
    out.push("");
    out.push(`${t(lang, "reviewAsk")}`);
    out.push(settings.reviewLink.trim());
  }
  return out.join("\n");
}

/** Short next-day message asking for a Google review. */
export function buildFollowUp(job: Job, lang: ReportLang, settings: Settings) {
  const locale = LOCALES[lang];
  const next = formatMonthYear(addYearsISO(job.serviceDate, 1), locale);
  return t(lang, "followUpText", {
    name: job.clientName.trim() || t(lang, "valued"),
    tech: settings.techName,
    biz: settings.businessName || "Dryer Vent Services",
    link: settings.reviewLink.trim(),
    next,
  });
}

/**
 * Plain-text job note for pasting into Housecall Pro: no WhatsApp asterisks,
 * no markdown, always English (it is an internal record).
 */
export function buildHcpNote(job: Job, settings: Settings) {
  const m = jobMetrics(job);
  const lines = pricedLines(job, "en");
  const sum = totals(job);
  const out: string[] = [];
  const biz = (settings.businessName || "Dryer Vent Services").toUpperCase();

  out.push(`${biz} — ${job.docKind === "estimate" ? "SERVICE ESTIMATE" : "SERVICE REPORT"}`);
  out.push(`Date: ${formatISODate(job.serviceDate, "en-US")}  ·  Ref ${job.id}`);
  out.push(`Client: ${job.clientName.trim() || "Valued customer"}`);
  out.push(`Property: ${job.clientAddress.trim() || "New York / New Jersey"}`);
  if (job.clientPhone.trim()) out.push(`Phone: ${job.clientPhone.trim()}`);
  out.push(
    `System: ${localizedName(TERMINATIONS, job.termination, "en")} · ${localizedName(DRYERS, job.dryer, "en")}`,
  );

  out.push("");
  out.push("AIRFLOW (digital anemometer, 4 in duct)");
  out.push(`Before: ${job.airBefore} ${job.unit}`);
  out.push(`After: ${job.airAfter} ${job.unit} (${m.after.cfm} CFM · ${m.after.fpm} FPM)`);
  if (m.pct === null) out.push("Recovery: Restored");
  else out.push(`Recovery: ${m.pct > 0 ? "+" : ""}${m.pct}%`);
  out.push(`Equivalent length: ${m.ded} ft (${job.ductFeet} ft, ${job.elbows90}x90, ${job.elbows45}x45)`);
  if (job.coPpm > 0) out.push(`CO reading: ${job.coPpm} ppm`);
  out.push(`Result: ${t("en", m.safety)}`);

  const hazards = job.hazards
    .map((id) => HAZARDS.find((h) => h.id === id))
    .filter((h) => h !== undefined);
  out.push("");
  out.push("FINDINGS");
  if (hazards.length === 0) out.push("- Routine preventive maintenance, no extra hazard noted");
  else for (const hazard of hazards) out.push(`- ${hazard.name.en}`);

  const actions = job.actions
    .map((id) => ACTIONS.find((a) => a.id === id))
    .filter((a) => a !== undefined);
  if (actions.length) {
    out.push("");
    out.push("WORK COMPLETED");
    for (const action of actions) out.push(`- ${action.name.en}`);
  }

  if (job.notes.trim()) {
    out.push("");
    out.push("NOTES");
    out.push(job.notes.trim());
  }

  if (job.showPricing) {
    out.push("");
    out.push(`CHARGES (${t("en", job.payStatus)} · ${t("en", job.payMethod)})`);
    if (lines.length === 0) out.push("- No charges recorded");
    for (const line of lines) out.push(`- ${line.name}: ${money(line.price)}`);
    if (sum.discount > 0) out.push(`- Discount: -${money(sum.discount)}`);
    if (sum.tax > 0) out.push(`- Tax (${sum.taxRate}%): ${money(sum.tax)}`);
    out.push(`TOTAL: ${money(sum.total)}`);
    if (sum.deposit > 0) {
      out.push(`- Deposit: -${money(sum.deposit)}`);
      out.push(`BALANCE DUE: ${money(sum.balance)}`);
    }
  }

  out.push("");
  out.push(`Next recommended inspection: ${formatMonthYear(addYearsISO(job.serviceDate, 1), "en-US")}`);
  out.push(`${settings.techName} · ${settings.phone} · ${settings.site}`);
  return out.join("\n");
}
