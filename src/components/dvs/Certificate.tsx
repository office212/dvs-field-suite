import { ACTIONS, COMPANY, DRYERS, HAZARDS, TERMINATIONS, byId } from "@/lib/dvs/content";
import {
  addYearsISO,
  ductLimit,
  equivalentLength,
  formatISODate,
  formatMonthYear,
  money,
  pricedLines,
  totals,
} from "@/lib/dvs/calc";
import { t } from "@/lib/dvs/i18n";
import { jobMetrics } from "@/lib/dvs/report";
import type { Job, ReportLang, Settings } from "@/lib/dvs/types";

const LOCALES: Record<ReportLang, string> = { en: "en-US", es: "es-US", he: "he-IL" };

export function Certificate({
  job,
  settings,
  lang,
}: {
  job: Job;
  settings: Settings;
  lang: ReportLang;
}) {
  const metrics = jobMetrics(job);
  const locale = LOCALES[lang];
  const lines = pricedLines(job, lang);
  const sum = totals(job);
  const ded = equivalentLength(job);
  const gain =
    metrics.pct === null ? t(lang, "restored") : `${metrics.pct > 0 ? "+" : ""}${metrics.pct}%`;
  const stamp =
    job.docKind === "estimate" ? "stampEstimate" : job.payStatus === "paid" ? "stampPaid" : job.payStatus === "due" ? "stampDue" : "stampEstimate";
  const hazards = job.hazards.map((id) => byId(HAZARDS, id)).filter((item) => item !== undefined);
  const actions = job.actions.map((id) => byId(ACTIONS, id)).filter((item) => item !== undefined);
  const photos = job.photoBefore.length > 0 || job.photoAfter.length > 0;

  return (
    <article
      id="certificate"
      dir={lang === "he" ? "rtl" : "ltr"}
      className="certificate overflow-hidden rounded-xl border border-paper-line bg-paper text-paper-ink"
    >
      <header className="flex items-start justify-between gap-4 border-b-4 border-accent px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-widest text-accent uppercase">{COMPANY.region}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-paper-ink">
            {(settings.businessName || COMPANY.name).toUpperCase()}
          </h2>
          <p className="mt-1 text-sm text-paper-muted">{t(lang, "certified")}</p>
          <p className="mt-2 text-sm text-paper-ink">
            {settings.techName} · {settings.phone}
          </p>
          <p className="text-sm text-paper-muted">
            {settings.site} · {settings.email}
          </p>
        </div>
        <div className="shrink-0 text-end">
          <p className="inline-block rounded-md bg-ink px-2 py-1 text-xs font-bold tracking-wide text-paper uppercase">
            {job.docKind === "estimate" ? t(lang, "docEstimate") : t(lang, "docCertificate")}
          </p>
          <p className="mt-2 font-mono text-xs text-paper-muted">{formatISODate(job.serviceDate, locale)}</p>
          <p className="font-mono text-xs text-paper-ink">{job.id}</p>
          <p className="mt-2 text-xs font-bold tracking-wide text-paper-muted uppercase">{t(lang, stamp)}</p>
        </div>
      </header>

      <div className="grid gap-3 border-b border-paper-line px-4 py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold tracking-widest text-paper-muted uppercase">{t(lang, "client")}</p>
          <p className="mt-1 text-lg font-bold">{job.clientName.trim() || t(lang, "valued")}</p>
          <p className="text-sm">{job.clientAddress.trim() || "New York / New Jersey"}</p>
          {job.clientPhone.trim() ? <p className="font-mono text-sm">{job.clientPhone.trim()}</p> : null}
        </div>
        <div>
          <p className="text-xs font-bold tracking-widest text-paper-muted uppercase">{t(lang, "system")}</p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">{t(lang, "property")}: </span>
            {byId(TERMINATIONS, job.termination)?.name[lang]}
          </p>
          <p className="text-sm">
            <span className="font-semibold">{t(lang, "appliance")}: </span>
            {byId(DRYERS, job.dryer)?.name[lang]}
          </p>
          <p className="text-sm">
            <span className="font-semibold">{t(lang, "dedShort")}: </span>
            <span className="font-mono">
              {ded} ft · {ded <= ductLimit(job) ? t(lang, "pass") : t(lang, "longRun")}
            </span>
          </p>
          {job.coPpm > 0 ? (
            <p className="text-sm">
              <span className="font-semibold">{t(lang, "coLine")}: </span>
              <span className="font-mono">{job.coPpm} ppm</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 py-4">
        <Stat label={t(lang, "beforeShort")} value={`${job.airBefore} ${job.unit}`} caption={t(lang, "preCaption")} tone="danger" />
        <Stat label={t(lang, "afterShort")} value={`${job.airAfter} ${job.unit}`} caption={t(lang, "postCaption")} tone="ok" />
        <Stat label={t(lang, "gainLabel")} value={gain} caption={`${metrics.after.cfm} CFM`} tone="ink" />
      </div>

      <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
        <List title={t(lang, "findings")} items={hazards.map((item) => item.name[lang])} empty={t(lang, "routine")} />
        <List title={t(lang, "remediation")} items={actions.map((item) => item.name[lang])} empty={t(lang, "noneYet")} />
      </div>

      {job.notes.trim() ? (
        <p className="mx-4 mb-4 rounded-lg bg-paper-soft px-3 py-3 text-sm">
          <span className="font-bold">{t(lang, "techNotes")}: </span>
          {job.notes.trim()}
        </p>
      ) : null}

      {photos ? (
        <div className="space-y-3 px-4 pb-4">
          <PhotoGrid photos={job.photoBefore} label={t(lang, "beforePhoto")} />
          <PhotoGrid photos={job.photoAfter} label={t(lang, "afterPhoto")} />
        </div>
      ) : null}

      {job.meterBefore || job.meterAfter ? (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <Photo src={job.meterBefore} label={t(lang, "meterBefore")} />
          <Photo src={job.meterAfter} label={t(lang, "meterAfter")} />
        </div>
      ) : null}

      {job.showPricing ? (
        <div className="mx-4 mb-4 rounded-lg border border-paper-line px-3 py-3 text-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-bold tracking-wide uppercase">{t(lang, "investment")}</p>
            <p className="text-xs font-bold text-paper-muted">
              {t(lang, job.payStatus)} · {t(lang, job.payMethod)}
            </p>
          </div>
          <div className="space-y-1">
            {lines.length === 0 ? <p className="text-paper-muted">{t(lang, "noLines")}</p> : null}
            {lines.map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-3">
                <span>{line.name}</span>
                <span className="font-mono font-semibold">{money(line.price)}</span>
              </div>
            ))}
            {sum.discount > 0 ? (
              <div className="flex justify-between gap-3 text-paper-ok-ink">
                <span>{t(lang, "discount")}</span>
                <span className="font-mono">-{money(sum.discount)}</span>
              </div>
            ) : null}
            {sum.tax > 0 ? (
              <div className="flex justify-between gap-3">
                <span>
                  {t(lang, "tax")} ({sum.taxRate}%)
                </span>
                <span className="font-mono">{money(sum.tax)}</span>
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-paper-line pt-2 text-base font-extrabold">
            <span>{t(lang, "total")}</span>
            <span className="font-mono">{money(sum.total)}</span>
          </div>
          {sum.deposit > 0 ? (
            <div className="mt-1 space-y-1 text-sm">
              <div className="flex justify-between gap-3">
                <span>{t(lang, "deposit")}</span>
                <span className="font-mono">-{money(sum.deposit)}</span>
              </div>
              <div className="flex justify-between gap-3 font-bold">
                <span>{t(lang, "balance")}</span>
                <span className="font-mono">{money(sum.balance)}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <footer className="grid gap-4 border-t border-paper-line px-4 py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-paper-muted">{t(lang, "customerAck")}</p>
          <div className="mt-2 flex h-16 items-end border-b border-paper-ink">
            {job.signature ? <img src={job.signature} alt="" className="max-h-14" /> : null}
          </div>
          <p className="mt-1 text-xs font-bold text-paper-muted">{t(lang, "clientSig")}</p>
        </div>
        <div className="text-end text-sm">
          <p className="font-semibold">
            {t(lang, "nextDue")}: {formatMonthYear(addYearsISO(job.serviceDate, 1), locale)}
          </p>
          <p className="mt-2 text-paper-muted">{t(lang, "thanks")}</p>
          {settings.reviewLink.trim() ? (
            <p className="mt-2 text-xs break-all text-paper-muted">
              {t(lang, "reviewAsk")}
              <br />
              <span className="font-semibold text-paper-ink">{settings.reviewLink.trim()}</span>
            </p>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  tone: "danger" | "ok" | "ink";
}) {
  const box =
    tone === "danger"
      ? "border-paper-danger-ink bg-paper-danger text-paper-danger-ink"
      : tone === "ok"
        ? "border-paper-ok-ink bg-paper-ok text-paper-ok-ink"
        : "border-ink bg-ink text-paper";
  return (
    <div className={`rounded-lg border px-2 py-3 text-center ${box}`}>
      <p className="text-xs font-bold tracking-wide uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold leading-none">{value}</p>
      <p className="mt-1 text-xs opacity-80">{caption}</p>
    </div>
  );
}

function List({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg border border-paper-line p-3">
      <h3 className="mb-2 text-xs font-bold tracking-widest uppercase">{title}</h3>
      <ul className="list-disc space-y-1 ps-4 text-sm">
        {(items.length ? items : [empty]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PhotoGrid({ photos, label }: { photos: string[]; label: string }) {
  if (photos.length === 0) return null;
  return (
    <figure>
      <figcaption className="mb-1 text-xs font-bold tracking-wide uppercase">
        {label} · {photos.length}
      </figcaption>
      <div className="cert-photos grid grid-cols-4 gap-1.5">
        {photos.map((src, index) => (
          <img
            key={index}
            src={src}
            alt=""
            className="h-20 w-full rounded-md border border-paper-line object-cover"
          />
        ))}
      </div>
    </figure>
  );
}

function Photo({ src, label }: { src: string | null; label: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-paper-line">
      <figcaption className="px-2 py-1 text-xs font-bold tracking-wide uppercase">{label}</figcaption>
      {src ? <img src={src} alt="" className="h-36 w-full object-cover" /> : <div className="h-36 bg-paper-soft" />}
    </figure>
  );
}
