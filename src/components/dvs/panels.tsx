import {
  Camera,
  Check,
  Copy,
  Download,
  Gauge,
  MessageSquare,
  Printer,
  Receipt,
  Save,
  Search,
  Send,
  Share2,
  Trash2,
  Upload,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  ductLimit,
  LINT_CARRY_FPM,
  clampReading,
  money,
  pricedLines,
  readiness,
  tagAddress,
  totals,
} from "@/lib/dvs/calc";
import {
  ACTIONS,
  AREAS,
  CATALOG,
  DRYERS,
  HAZARDS,
  TERMINATIONS,
  byId,
} from "@/lib/dvs/content";
import { t, type CopyKey } from "@/lib/dvs/i18n";
import { compressImage } from "@/lib/dvs/photos";
import { buildFollowUp, buildHcpNote, buildReport, jobMetrics, narrative } from "@/lib/dvs/report";
import { copyText, shareText, smsUrl, whatsappUrl } from "@/lib/dvs/share";
import { exportBackup, importBackup, pendingSuggestions, useDvs } from "@/lib/dvs/store";
import { MAX_PHOTOS_PER_SIDE, type PayMethod, type PayStatus, type ReportLang, type Unit } from "@/lib/dvs/types";
import { Certificate } from "./Certificate";
import { SignaturePad } from "./SignaturePad";
import { Chip, controlClass, Field, Section, Segment, SelectField, Stepper, WhatsAppIcon } from "./ui";

function useLang() {
  return useDvs((state) => state.settings.uiLang);
}

export function IntakePanel() {
  const lang = useLang();
  const job = useDvs((state) => state.job);
  const patch = useDvs((state) => state.patch);
  const setTermination = useDvs((state) => state.setTermination);
  const loadSample = useDvs((state) => state.loadSample);

  return (
    <Section
      title={t(lang, "clientProfile")}
      action={
        <button
          type="button"
          className="text-sm font-semibold text-accent"
          onClick={() => {
            loadSample(
              lang === "he"
                ? "מומלץ ניקוי שנתי — מסלול ארוך בין קורות המרתף."
                : "Annual cleaning recommended — long duct run through the basement joists.",
            );
            toast.success(t(lang, "sampleLoaded"));
          }}
        >
          {t(lang, "sample")}
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t(lang, "clientName")}>
          <input
            className={controlClass}
            autoComplete="name"
            placeholder={t(lang, "placeholderName")}
            value={job.clientName}
            onChange={(event) => patch({ clientName: event.target.value })}
          />
        </Field>
        <Field label={t(lang, "phone")}>
          <input
            className={cn(controlClass, "font-mono")}
            dir="ltr"
            autoComplete="tel"
            inputMode="tel"
            placeholder={t(lang, "placeholderPhone")}
            value={job.clientPhone}
            onChange={(event) => patch({ clientPhone: event.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t(lang, "address")}>
            <input
              className={controlClass}
              autoComplete="street-address"
              placeholder={t(lang, "placeholderAddress")}
              value={job.clientAddress}
              onChange={(event) => patch({ clientAddress: event.target.value })}
            />
          </Field>
          <div className="mt-2">
            <p className="mb-1.5 text-xs font-medium text-faint">{t(lang, "area")}</p>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  className="min-h-11 rounded-lg border border-line bg-surface-2 px-3 text-sm font-semibold text-fg"
                  onClick={() => patch({ clientAddress: tagAddress(job.clientAddress, area.text) })}
                >
                  {lang === "he" ? area.he : area.en}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Field label={t(lang, "serviceDate")}>
          <input
            type="date"
            className={controlClass}
            value={job.serviceDate}
            onChange={(event) => patch({ serviceDate: event.target.value || job.serviceDate })}
          />
        </Field>
        <div className="hidden sm:block" />
        <SelectField label={t(lang, "termination")} value={job.termination} onChange={setTermination}>
          {TERMINATIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name[lang]}
            </option>
          ))}
        </SelectField>
        <SelectField label={t(lang, "dryer")} value={job.dryer} onChange={(dryer) => patch({ dryer })}>
          {DRYERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name[lang]}
            </option>
          ))}
        </SelectField>
        <div className="sm:col-span-2">
          <Field label={t(lang, "notes")}>
            <textarea
              rows={3}
              className={cn(controlClass, "h-auto py-3")}
              placeholder={t(lang, "placeholderNotes")}
              value={job.notes}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </Field>
        </div>
      </div>
    </Section>
  );
}

export function AirPanel() {
  const lang = useLang();
  const job = useDvs((state) => state.job);
  const patch = useDvs((state) => state.patch);
  const setUnit = useDvs((state) => state.setUnit);
  const setReading = useDvs((state) => state.setReading);
  const bumpReading = useDvs((state) => state.bumpReading);
  const setCount = useDvs((state) => state.setCount);
  const metrics = jobMetrics(job);
  const limitFt = ductLimit(job);
  const within = metrics.ded <= limitFt;
  const barMax = Math.max(50, limitFt * 1.4);
  const units: Unit[] = ["CFM", "MPH", "km/h", "FPM"];

  return (
    <Section title={t(lang, "airTitle")}>
      <Segment
        label={t(lang, "readings")}
        value={job.unit}
        onChange={setUnit}
        options={units.map((unit) => ({ id: unit, label: unit }))}
      />
      {job.readingsAreSample ? <p className="mt-3 text-sm text-warn">{t(lang, "sampleHint")}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Stepper
          label={t(lang, "before")}
          value={job.airBefore}
          tone="danger"
          onChange={(value) => setReading("airBefore", value)}
          onBump={(dir) => bumpReading("airBefore", dir)}
        />
        <Stepper
          label={t(lang, "after")}
          value={job.airAfter}
          tone="ok"
          onChange={(value) => setReading("airAfter", value)}
          onBump={(dir) => bumpReading("airAfter", dir)}
        />
      </div>

      <AirGauge pct={metrics.pct} afterCfm={metrics.afterCfm} label={t(lang, "recovery")} restored={t(lang, "restored")} />

      <p className="text-sm text-muted">{narrative(job, lang)}</p>
      <p className="mt-1 text-xs text-faint">{t(lang, "normalized")}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Tile label="CFM" value={String(metrics.after.cfm)} />
        <Tile label="FPM" value={String(metrics.after.fpm)} />
        <Tile label="MPH" value={String(metrics.after.mph)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{t(lang, "status")}</span>
        <span
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-bold",
            metrics.safety === "restricted" ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok",
          )}
        >
          {t(lang, metrics.safety)}
        </span>
        <span
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold",
            metrics.band === "critical" || metrics.band === "poor"
              ? "bg-danger-soft text-danger"
              : metrics.band === "marginal"
                ? "bg-warn-soft text-warn"
                : "bg-ok-soft text-ok",
          )}
        >
          {t(lang, metrics.band)}
        </span>
      </div>
      <p className={cn("mt-2 text-sm", metrics.after.fpm < LINT_CARRY_FPM ? "text-warn" : "text-muted")}>
        {metrics.after.fpm < LINT_CARRY_FPM ? t(lang, "lintWarn") : t(lang, "lintOk")}
      </p>
      {job.dryer === "gas" && metrics.afterCfm < 80 ? (
        <p className="mt-3 rounded-lg border border-danger bg-danger-soft px-3 py-3 text-sm text-fg">{t(lang, "gasWarn")}</p>
      ) : null}
      {job.dryer === "gas" ? (
        <div className="mt-3 max-w-44">
          <MiniCount label={t(lang, "coPpm")} hint="ppm" value={job.coPpm} onChange={(value) => patch({ coPpm: value })} />
        </div>
      ) : null}

      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">{t(lang, "dedTitle")}</h3>
          <span className={cn("rounded-lg px-2 py-1 text-xs font-bold", within ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn")}>
            {metrics.ded} {t(lang, "ft")} · {within ? t(lang, "pass") : t(lang, "longRun")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <MiniCount label={t(lang, "pipe")} hint={t(lang, "ft")} value={job.ductFeet} onChange={(value) => setCount("ductFeet", value)} />
          <MiniCount label={t(lang, "e90")} hint={t(lang, "each5")} value={job.elbows90} onChange={(value) => setCount("elbows90", value)} />
          <MiniCount label={t(lang, "e45")} hint={t(lang, "each25")} value={job.elbows45} onChange={(value) => setCount("elbows45", value)} />
        </div>
        <div className="mt-2 max-w-44">
          <MiniCount label={t(lang, "mfrLimit")} hint={t(lang, "ft")} value={job.limitFt} onChange={(value) => patch({ limitFt: Math.max(1, Math.round(value) || 35) })} />
        </div>
        <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("absolute inset-y-0 start-0 rounded-full", within ? "bg-ok" : "bg-warn")}
            style={{ width: `${Math.min(100, (metrics.ded / barMax) * 100)}%` }}
          />
          <div className="absolute inset-y-0 w-px bg-fg" style={{ insetInlineStart: `${Math.min(100, (limitFt / barMax) * 100)}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-faint">
          <span>0</span>
          <span>
            {limitFt} {t(lang, "ft")} · {t(lang, "limit")}
          </span>
          <span>{Math.round(barMax)}</span>
        </div>
        <p className="mt-2 text-xs text-faint">{t(lang, "codeNote")}</p>
      </div>
    </Section>
  );
}

function AirGauge({
  pct,
  afterCfm,
  label,
  restored,
}: {
  pct: number | null;
  afterCfm: number;
  label: string;
  restored: string;
}) {
  const ratio = Math.min(1, Math.max(0.04, afterCfm / 200));
  const length = 251.3;
  const offset = length * (1 - ratio);
  const text = pct === null ? restored : `${pct > 0 ? "+" : ""}${pct}%`;
  return (
    <div className="relative mx-auto mt-2 h-36 w-full max-w-xs">
      <svg viewBox="0 0 200 120" className="h-full w-full">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="var(--color-surface-3)" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#dvsGauge)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="dvsGauge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-danger)" />
            <stop offset="55%" stopColor="var(--color-warn)" />
            <stop offset="100%" stopColor="var(--color-ok)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="font-mono text-3xl font-bold text-ok">{text}</div>
        <div className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg px-2 py-2 text-center">
      <div className="font-mono text-lg font-bold text-fg">{value}</div>
      <div className="text-xs text-faint">{label}</div>
    </div>
  );
}

function MiniCount({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <span className="block text-xs text-faint">{hint}</span>
      <input
        inputMode="numeric"
        className={cn(controlClass, "mt-1 px-2 text-center font-mono")}
        value={value}
        onChange={(event) => onChange(clampReading(Number(event.target.value), 1))}
      />
    </label>
  );
}

export function WorkPanel() {
  const lang = useLang();
  const job = useDvs((state) => state.job);
  const toggleHazard = useDvs((state) => state.toggleHazard);
  const toggleAction = useDvs((state) => state.toggleAction);
  const addSuggestion = useDvs((state) => state.addSuggestion);
  const suggestions = pendingSuggestions(job);

  return (
    <Section title={t(lang, "work")}>
      <h3 className="mb-2 text-sm font-semibold text-danger">{t(lang, "hazards")}</h3>
      <p className="mb-2 text-xs text-faint">{t(lang, "tapToggle")}</p>
      <div className="flex flex-wrap gap-2">
        {HAZARDS.map((hazard) => (
          <Chip key={hazard.id} tone="danger" on={job.hazards.includes(hazard.id)} onClick={() => toggleHazard(hazard.id)}>
            {hazard.name[lang]}
          </Chip>
        ))}
      </div>
      {suggestions.length > 0 ? (
        <div className="mt-4 space-y-2">
          {suggestions.map((id) => {
            const item = byId(CATALOG, id);
            if (!item) return null;
            return (
              <button
                key={id}
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-accent bg-accent-soft px-3 text-start text-sm"
                onClick={() => addSuggestion(id)}
              >
                <span>
                  <span className="block text-xs font-bold tracking-wide text-accent uppercase">{t(lang, "suggested")}</span>
                  {item.name[lang]}
                </span>
                <span className="font-mono font-bold text-accent">
                  {t(lang, "addIt")} {money(item.price)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <h3 className="mt-5 mb-2 text-sm font-semibold text-ok">{t(lang, "actions")}</h3>
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => (
          <Chip key={action.id} tone="ok" on={job.actions.includes(action.id)} onClick={() => toggleAction(action.id)}>
            {action.name[lang]}
          </Chip>
        ))}
      </div>
    </Section>
  );
}

export function QuotePanel() {
  const lang = useLang();
  const job = useDvs((state) => state.job);
  const patch = useDvs((state) => state.patch);
  const toggleCatalog = useDvs((state) => state.toggleCatalog);
  const setPrice = useDvs((state) => state.setPrice);
  const addCustom = useDvs((state) => state.addCustom);
  const removeLine = useDvs((state) => state.removeLine);
  const setDiscount = useDvs((state) => state.setDiscount);
  const setPayStatus = useDvs((state) => state.setPayStatus);
  const setPayMethod = useDvs((state) => state.setPayMethod);
  const setTermination = useDvs((state) => state.setTermination);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const lines = pricedLines(job, lang);
  const sum = totals(job);
  const pays: PayStatus[] = ["paid", "due", "estimate"];
  const methods: PayMethod[] = ["zelle", "cash", "card", "check", "invoice", "other"];

  return (
    <Section title={t(lang, "pricing")}>
      <label className="mb-3 flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={job.autoPrice}
          onChange={() => {
            const next = !job.autoPrice;
            patch({ autoPrice: next });
            if (next) setTermination(job.termination);
          }}
        />
        {t(lang, "autoPrice")}
      </label>
      <p className="mb-2 text-xs font-bold tracking-widest text-faint uppercase">{t(lang, "catalog")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CATALOG.filter((item) => item.group === "clean").map((item) => (
          <CatalogButton key={item.id} name={item.name[lang]} price={job.priceOverrides[item.id] ?? item.price} on={job.catalogOn.includes(item.id)} onClick={() => toggleCatalog(item.id)} />
        ))}
      </div>
      <p className="mt-4 mb-2 text-xs font-bold tracking-widest text-faint uppercase">{t(lang, "addons")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CATALOG.filter((item) => item.group === "addon").map((item) => (
          <CatalogButton key={item.id} name={item.name[lang]} price={job.priceOverrides[item.id] ?? item.price} on={job.catalogOn.includes(item.id)} onClick={() => toggleCatalog(item.id)} />
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {lines.length === 0 ? <p className="text-sm text-faint">{t(lang, "noLines")}</p> : null}
        {lines.map((line) => (
          <div key={line.id} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2">
            <span className="min-w-0 flex-1 text-sm">{line.name}</span>
            <input
              dir="ltr"
              inputMode="decimal"
              className="h-11 w-24 rounded-lg border border-line bg-surface px-2 text-end font-mono text-sm text-accent"
              value={line.price}
              onChange={(event) => setPrice(line.id, Number(event.target.value) || 0)}
            />
            <button type="button" className="grid size-11 place-items-center text-faint" onClick={() => removeLine(line.id)} aria-label={t(lang, "remove")}>
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className={cn(controlClass, "min-w-0 flex-1")}
          placeholder={t(lang, "customName")}
          value={customName}
          onChange={(event) => setCustomName(event.target.value)}
        />
        <input
          dir="ltr"
          inputMode="decimal"
          className={cn(controlClass, "w-24 font-mono")}
          placeholder={t(lang, "customPrice")}
          value={customPrice}
          onChange={(event) => setCustomPrice(event.target.value)}
        />
        <button
          type="button"
          className="h-12 rounded-lg bg-accent px-3 text-sm font-bold text-ink"
          onClick={() => {
            addCustom(customName, Number(customPrice) || 0);
            setCustomName("");
            setCustomPrice("");
          }}
        >
          {t(lang, "add")}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-sm font-medium text-muted">{t(lang, "discount")}</p>
          <div className="mb-2 flex gap-2">
            {(["usd", "pct"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={cn(
                  "min-h-11 w-14 rounded-lg border text-sm font-bold",
                  job.discountMode === mode ? "border-accent bg-accent text-ink" : "border-line bg-surface-2 text-fg",
                )}
                onClick={() => patch({ discountMode: mode, discount: 0 })}
              >
                {mode === "usd" ? "$" : "%"}
              </button>
            ))}
          </div>
          <div className="mb-2 flex gap-2">
            {(job.discountMode === "pct" ? [0, 5, 10] : [0, 25, 50]).map((amount) => (
              <button
                key={amount}
                type="button"
                className={cn(
                  "min-h-11 flex-1 rounded-lg border text-sm font-semibold",
                  job.discount === amount ? "border-accent bg-accent text-ink" : "border-line bg-surface-2 text-fg",
                )}
                onClick={() => setDiscount(amount)}
              >
                {job.discountMode === "pct" ? `${amount}%` : money(amount)}
              </button>
            ))}
          </div>
          <input
            dir="ltr"
            inputMode="decimal"
            className={cn(controlClass, "font-mono")}
            value={job.discount}
            onChange={(event) => setDiscount(Number(event.target.value) || 0)}
          />
          <p className="mb-1.5 mt-3 text-sm font-medium text-muted">{t(lang, "taxRate")}</p>
          <input
            dir="ltr"
            inputMode="decimal"
            className={cn(controlClass, "font-mono")}
            value={job.taxRate}
            onChange={(event) => patch({ taxRate: Math.max(0, Number(event.target.value) || 0) })}
          />
          <p className="mb-1.5 mt-3 text-sm font-medium text-muted">{t(lang, "deposit")}</p>
          <input
            dir="ltr"
            inputMode="decimal"
            className={cn(controlClass, "font-mono")}
            value={job.deposit}
            onChange={(event) => patch({ deposit: Math.max(0, Number(event.target.value) || 0) })}
          />
        </div>
        <div className="rounded-xl border border-accent bg-accent-soft p-4 text-end">
          <p className="text-xs font-bold tracking-widest text-muted uppercase">{t(lang, "subtotal")}</p>
          <p className="font-mono text-sm text-muted">{money(sum.subtotal)}</p>
          {sum.tax > 0 ? (
            <>
              <p className="mt-2 text-xs font-bold tracking-widest text-muted uppercase">{t(lang, "tax")}</p>
              <p className="font-mono text-sm text-muted">{money(sum.tax)}</p>
            </>
          ) : null}
          <p className="mt-2 text-xs font-bold tracking-widest text-muted uppercase">{t(lang, "total")}</p>
          <p className="font-mono text-3xl font-bold text-accent">{money(sum.total)}</p>
          {sum.deposit > 0 ? (
            <>
              <p className="mt-2 text-xs font-bold tracking-widest text-muted uppercase">{t(lang, "balance")}</p>
              <p className="font-mono text-lg font-bold text-fg">{money(sum.balance)}</p>
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-sm font-medium text-muted">{t(lang, "payStatus")}</p>
        <Segment value={job.payStatus} onChange={setPayStatus} options={pays.map((id) => ({ id, label: t(lang, id) }))} />
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-sm font-medium text-muted">{t(lang, "payMethod")}</p>
        <Segment value={job.payMethod} onChange={setPayMethod} options={methods.map((id) => ({ id, label: t(lang, id) }))} />
      </div>
      <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="size-5"
          checked={job.showPricing}
          onChange={() => patch({ showPricing: !job.showPricing })}
        />
        {t(lang, "showOnReport")}
      </label>
    </Section>
  );
}

function CatalogButton({ name, price, on, onClick }: { name: string; price: number; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-start text-sm font-semibold",
        on ? "border-accent bg-accent text-ink" : "border-line bg-surface-2 text-fg",
      )}
    >
      <span className="min-w-0">{name}</span>
      <span className={cn("shrink-0 font-mono", on ? "text-ink" : "text-accent")}>{money(price)}</span>
    </button>
  );
}

export function EvidencePanel() {
  const lang = useLang();
  const job = useDvs((state) => state.job);
  const setPhoto = useDvs((state) => state.setPhoto);
  const addPhotos = useDvs((state) => state.addPhotos);
  const removePhoto = useDvs((state) => state.removePhoto);
  const setSignature = useDvs((state) => state.setSignature);

  type VentKey = "photoBefore" | "photoAfter";
  type MeterKey = "meterBefore" | "meterAfter";

  async function onFile(file: File | undefined, which: MeterKey) {
    if (!file) return;
    try {
      setPhoto(which, await compressImage(file));
    } catch {
      // Never fail silently: an unreadable pick (e.g. a HEIC the converter
      // also rejected) must tell the tech what happened.
      toast.error(t(lang, "photoError"), { duration: 8000 });
    }
  }

  async function onFiles(files: FileList | null, which: VentKey) {
    if (!files || files.length === 0) return;
    const dataUrls: string[] = [];
    let failed = false;
    let skippedForCap = 0;
    // Sequential on purpose: each file runs the full decode/convert pipeline,
    // and the cap is checked against what is already stored plus this batch.
    for (const file of files) {
      if (job[which].length + dataUrls.length >= MAX_PHOTOS_PER_SIDE) {
        skippedForCap++;
        continue;
      }
      try {
        dataUrls.push(await compressImage(file));
      } catch {
        failed = true;
      }
    }
    if (dataUrls.length > 0) addPhotos(which, dataUrls);
    if (skippedForCap > 0) toast.info(t(lang, "photosFull"));
    if (failed) toast.error(t(lang, "photoError"), { duration: 8000 });
  }

  const firstBefore = job.photoBefore[0];
  const firstAfter = job.photoAfter[0];

  return (
    <Section title={t(lang, "photos")}>
      <div className="grid grid-cols-2 gap-3">
        <PhotoGallery
          label={t(lang, "beforePhoto")}
          hint={t(lang, "photoHintBefore")}
          photos={job.photoBefore}
          onFiles={(files) => void onFiles(files, "photoBefore")}
          onRemove={(index) => removePhoto("photoBefore", index)}
          addLabel={t(lang, "addPhoto")}
          countLabel={t(lang, "photoCount", { count: job.photoBefore.length, max: MAX_PHOTOS_PER_SIDE })}
          clearLabel={t(lang, "remove")}
        />
        <PhotoGallery
          label={t(lang, "afterPhoto")}
          hint={t(lang, "photoHintAfter")}
          photos={job.photoAfter}
          onFiles={(files) => void onFiles(files, "photoAfter")}
          onRemove={(index) => removePhoto("photoAfter", index)}
          addLabel={t(lang, "addPhoto")}
          countLabel={t(lang, "photoCount", { count: job.photoAfter.length, max: MAX_PHOTOS_PER_SIDE })}
          clearLabel={t(lang, "remove")}
        />
      </div>
      {firstBefore && firstAfter ? (
        <Compare before={firstBefore} after={firstAfter} label={t(lang, "compare")} />
      ) : null}
      <h3 className="mt-5 mb-2 text-sm font-semibold">{t(lang, "meters")}</h3>
      <div className="grid grid-cols-2 gap-3">
        <PhotoSlot
          label={t(lang, "meterBefore")}
          hint={t(lang, "meterHint")}
          src={job.meterBefore}
          onFile={(file) => void onFile(file, "meterBefore")}
          onClear={() => setPhoto("meterBefore", null)}
          clearLabel={t(lang, "remove")}
        />
        <PhotoSlot
          label={t(lang, "meterAfter")}
          hint={t(lang, "meterHint")}
          src={job.meterAfter}
          onFile={(file) => void onFile(file, "meterAfter")}
          onClear={() => setPhoto("meterAfter", null)}
          clearLabel={t(lang, "remove")}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t(lang, "signature")}</h3>
          <p className="text-xs text-faint">{t(lang, "signHint")}</p>
        </div>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-danger" onClick={() => setSignature(null)}>
          {t(lang, "clearSig")}
        </button>
      </div>
      <div className="mt-2">
        <SignaturePad value={job.signature} onChange={setSignature} />
      </div>
    </Section>
  );
}

function PhotoGallery({
  label,
  hint,
  photos,
  onFiles,
  onRemove,
  addLabel,
  countLabel,
  clearLabel,
}: {
  label: string;
  hint: string;
  photos: string[];
  onFiles: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  addLabel: string;
  countLabel: string;
  clearLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-faint">{countLabel}</span>
      </div>
      <p className="mb-2 text-xs text-faint">{hint}</p>
      <div className="grid grid-cols-2 gap-2">
        {photos.map((src, index) => (
          <div key={index} className="relative">
            <img src={src} alt="" className="aspect-square w-full rounded-lg border border-line object-cover" />
            <button
              type="button"
              className="absolute end-1 top-1 grid size-9 place-items-center rounded-lg bg-ink text-paper"
              onClick={() => onRemove(index)}
              aria-label={clearLabel}
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS_PER_SIDE ? (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line bg-bg text-center">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                onFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <Camera className="mb-1 size-5 text-accent" />
            <span className="px-2 text-sm font-semibold">{addLabel}</span>
          </label>
        ) : null}
      </div>
    </div>
  );
}

function PhotoSlot({
  label,
  hint,
  src,
  onFile,
  onClear,
  clearLabel,
}: {
  label: string;
  hint: string;
  src: string | null;
  onFile: (file: File | undefined) => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="relative">
      <label className="flex h-32 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-line bg-bg text-center">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <Camera className="mb-1 size-5 text-accent" />
            <span className="px-2 text-sm font-semibold">{label}</span>
            <span className="px-2 text-xs text-faint">{hint}</span>
          </>
        )}
      </label>
      {src ? (
        <button
          type="button"
          className="absolute end-1 top-1 grid size-11 place-items-center rounded-lg bg-ink text-paper"
          onClick={onClear}
          aria-label={clearLabel}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

function Compare({ before, after, label }: { before: string; after: string; label: string }) {
  const [pos, setPos] = useState(56);
  return (
    <div dir="ltr" className="mt-3">
      <p className="mb-1 text-xs text-faint">{label}</p>
      <div className="relative h-52 overflow-hidden rounded-lg border border-line">
        <img src={after} alt="" className="h-full w-full object-cover" />
        <img
          src={before}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div className="absolute inset-y-0 w-0.5 bg-paper" style={{ left: `${pos}%` }} />
      </div>
      <input
        className="mt-2 w-full"
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label={label}
        onChange={(event) => setPos(Number(event.target.value))}
      />
    </div>
  );
}

export function DispatchPanel() {
  const lang = useLang();
  const job = useDvs((state) => state.job);
  const settings = useDvs((state) => state.settings);
  const reportLang = useDvs((state) => state.reportLang);
  const setReportLang = useDvs((state) => state.setReportLang);
  const setDocKind = useDvs((state) => state.setDocKind);
  const saveJob = useDvs((state) => state.saveJob);
  const ready = readiness(job);
  const text = buildReport(job, reportLang, settings);
  const hcpNote = buildHcpNote(job, settings);
  const followUp = buildFollowUp(job, reportLang, settings);
  const langs: ReportLang[] = ["en", "es", "he"];

  async function copy() {
    const ok = await copyText(text);
    toast[ok ? "success" : "error"](t(lang, ok ? "copied" : "copyFail"));
  }

  async function copyHcp() {
    const ok = await copyText(hcpNote);
    toast[ok ? "success" : "error"](t(lang, ok ? "copied" : "copyFail"));
  }

  async function copyFollowUp() {
    const ok = await copyText(followUp);
    toast[ok ? "success" : "error"](t(lang, ok ? "copied" : "copyFail"));
  }

  return (
    <div className="space-y-4">
      <Section title={t(lang, "readiness")}>
        <div className="flex items-end justify-between gap-3">
          <p className="font-mono text-4xl font-bold text-accent">{ready.score}</p>
          <p className="text-sm text-muted">{t(lang, "openItems")}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-accent" style={{ width: `${ready.score}%` }} />
        </div>
        {ready.missing.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {ready.missing.map((key) => (
              <span key={key} className="rounded-lg bg-surface-3 px-2 py-1 text-xs text-muted">
                {t(lang, key as CopyKey)}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-ok">
            <Check className="size-4" />
            {t(lang, "readiness")}
          </p>
        )}
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-muted">{t(lang, "reportLang")}</p>
          <Segment
            value={reportLang}
            onChange={setReportLang}
            options={langs.map((id) => ({ id, label: id === "en" ? "English" : id === "es" ? "Español" : "עברית" }))}
          />
        </div>
        <div className="mt-3">
          <Segment
            value={job.docKind}
            onChange={setDocKind}
            options={[
              { id: "certificate" as const, label: t(lang, "docCertificate") },
              { id: "estimate" as const, label: t(lang, "docEstimate") },
            ]}
          />
        </div>
        {!job.clientPhone.trim() ? <p className="mt-3 text-xs text-faint">{t(lang, "noPhone")}</p> : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-ink" onClick={() => window.open(whatsappUrl(job.clientPhone, text), "_blank", "noopener,noreferrer")}>
            <WhatsAppIcon className="size-5" />
            {t(lang, "whatsapp")}
          </button>
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-bold" onClick={() => void copy()}>
            <Copy className="size-4" />
            {t(lang, "copy")}
          </button>
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-bold" onClick={() => window.open(smsUrl(job.clientPhone, text), "_self")}>
            <MessageSquare className="size-4" />
            {t(lang, "sms")}
          </button>
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-bold"
            onClick={() => {
              void shareText("Dryer Vent Services", text).then((result) => {
                if (result === "copied") toast.message(t(lang, "shareFail"));
                if (result === "failed") toast.error(t(lang, "copyFail"));
              });
            }}
          >
            <Share2 className="size-4" />
            {t(lang, "share")}
          </button>
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-bold" onClick={() => window.print()}>
            <Printer className="size-4" />
            {t(lang, "print")}
          </button>
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-bold" onClick={() => void copyHcp()}>
            <Copy className="size-4" />
            {t(lang, "hcpCopy")}
          </button>
        </div>
        <button
          type="button"
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-accent text-sm font-bold text-accent"
          onClick={() => {
            saveJob();
            toast.success(t(lang, "jobSaved"));
          }}
        >
          <Save className="size-4" />
          {t(lang, "saveJob")}
        </button>
      </Section>

      <Section title={t(lang, "preview")}>
        <pre
          dir={reportLang === "he" ? "rtl" : "ltr"}
          className="max-h-80 overflow-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg"
        >
          {text}
        </pre>
      </Section>

      <Section title={t(lang, "followUpTitle")}>
        <pre
          dir={reportLang === "he" ? "rtl" : "ltr"}
          className="max-h-60 overflow-auto rounded-lg border border-line bg-bg p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg"
        >
          {followUp}
        </pre>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-bold" onClick={() => void copyFollowUp()}>
            <Copy className="size-4" />
            {t(lang, "copy")}
          </button>
          <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-bold text-ink" onClick={() => window.open(whatsappUrl(job.clientPhone, followUp), "_blank", "noopener,noreferrer")}>
            <WhatsAppIcon className="size-5" />
            {t(lang, "whatsapp")}
          </button>
        </div>
      </Section>

      <div>
        <h2 className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">{t(lang, "liveDoc")}</h2>
        <Certificate job={job} settings={settings} lang={reportLang} />
      </div>
    </div>
  );
}

export function JobsOverlay() {
  const lang = useLang();
  const archive = useDvs((state) => state.archive);
  const setOverlay = useDvs((state) => state.setOverlay);
  const setConfirm = useDvs((state) => state.setConfirm);
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const items = archive.filter((entry) => {
    if (!needle) return true;
    const blob = `${entry.job.clientName} ${entry.job.clientAddress} ${entry.job.id}`.toLowerCase();
    return blob.includes(needle);
  });

  return (
    <div className="no-print fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">{t(lang, "jobs")}</h2>
          <button type="button" className="grid size-11 place-items-center rounded-lg border border-line" onClick={() => setOverlay(null)} aria-label={t(lang, "close")}>
            <X className="size-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input className={cn(controlClass, "ps-10")} placeholder={t(lang, "search")} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-line text-sm font-semibold"
            onClick={() => {
              const blob = new Blob([exportBackup()], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `dvs-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="size-4" />
            {t(lang, "backupExport")}
          </button>
          <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line text-sm font-semibold">
            <Upload className="size-4" />
            {t(lang, "backupImport")}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                void file
                  .text()
                  .then((text) => {
                    const count = importBackup(text);
                    toast.success(`${t(lang, "backupDone")} · ${t(lang, "jobsImported", { count })}`);
                  })
                  .catch(() => toast.error(t(lang, "backupFail")));
              }}
            />
          </label>
        </div>
        {archive.length > 0 ? (
          <button type="button" className="mt-3 text-sm font-semibold text-danger" onClick={() => setConfirm({ kind: "clear" })}>
            {t(lang, "clearAll")}
          </button>
        ) : null}
        <div className="mt-4 space-y-2 pb-16">
          {archive.length === 0 ? <p className="text-sm text-muted">{t(lang, "emptyJobs")}</p> : null}
          {archive.length > 0 && items.length === 0 ? <p className="text-sm text-muted">{t(lang, "emptySearch")}</p> : null}
          {items.map((entry) => {
            const sum = totals(entry.job);
            return (
              <article key={entry.job.id + entry.savedAt} className="rounded-xl border border-line bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{entry.job.clientName || t(lang, "valued")}</h3>
                    <p className="truncate text-sm text-muted">{entry.job.clientAddress || entry.job.id}</p>
                    <p className="font-mono text-xs text-faint">
                      {entry.job.id} · {new Date(entry.savedAt).toLocaleString(lang === "he" ? "he-IL" : "en-US")}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-accent">{money(sum.total)}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="h-11 flex-1 rounded-lg bg-accent text-sm font-bold text-ink" onClick={() => setConfirm({ kind: "load", id: entry.job.id })}>
                    {t(lang, "load")}
                  </button>
                  <button
                    type="button"
                    className="h-11 rounded-lg border border-line px-3 text-sm font-semibold"
                    onClick={() => {
                      void copyText(buildReport(entry.job, useDvs.getState().reportLang, useDvs.getState().settings)).then((ok) => {
                        toast[ok ? "success" : "error"](t(lang, ok ? "copied" : "copyFail"));
                      });
                    }}
                  >
                    {t(lang, "copy")}
                  </button>
                  <button type="button" className="grid size-11 place-items-center rounded-lg border border-line text-danger" onClick={() => setConfirm({ kind: "delete", id: entry.job.id })} aria-label={t(lang, "delete")}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line text-sm font-semibold"
                  onClick={() => {
                    const state = useDvs.getState();
                    window.open(
                      whatsappUrl(entry.job.clientPhone, buildFollowUp(entry.job, state.reportLang, state.settings)),
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  <WhatsAppIcon className="size-4" />
                  {t(lang, "followUpTitle")}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SettingsOverlay() {
  const settings = useDvs((state) => state.settings);
  const patchSettings = useDvs((state) => state.patchSettings);
  const setOverlay = useDvs((state) => state.setOverlay);
  const lang = settings.uiLang;

  return (
    <div className="no-print fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">{t(lang, "settings")}</h2>
          <button type="button" className="grid size-11 place-items-center rounded-lg border border-line" onClick={() => setOverlay(null)} aria-label={t(lang, "close")}>
            <X className="size-5" />
          </button>
        </div>
        <Section title={t(lang, "business")}>
          <div className="grid gap-3">
            <Field label={t(lang, "businessName")}>
              <input className={controlClass} value={settings.businessName} onChange={(event) => patchSettings({ businessName: event.target.value })} />
            </Field>
            <Field label={t(lang, "techName")}>
              <input className={controlClass} value={settings.techName} onChange={(event) => patchSettings({ techName: event.target.value })} />
            </Field>
            <Field label={t(lang, "companyPhone")}>
              <input dir="ltr" className={cn(controlClass, "font-mono")} value={settings.phone} onChange={(event) => patchSettings({ phone: event.target.value })} />
            </Field>
            <Field label={t(lang, "email")}>
              <input dir="ltr" className={controlClass} value={settings.email} onChange={(event) => patchSettings({ email: event.target.value })} />
            </Field>
            <Field label={t(lang, "website")}>
              <input dir="ltr" className={controlClass} value={settings.site} onChange={(event) => patchSettings({ site: event.target.value })} />
            </Field>
            <Field label={t(lang, "reviewLink")}>
              <input dir="ltr" className={controlClass} value={settings.reviewLink} onChange={(event) => patchSettings({ reviewLink: event.target.value })} />
            </Field>
            <Field label={t(lang, "defaultTax")}>
              <input
                dir="ltr"
                inputMode="decimal"
                className={cn(controlClass, "font-mono")}
                value={settings.defaultTax}
                onChange={(event) => patchSettings({ defaultTax: Math.max(0, Number(event.target.value) || 0) })}
              />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">{t(lang, "uiLanguage")}</p>
              <Segment
                value={settings.uiLang}
                onChange={(uiLang) => patchSettings({ uiLang })}
                options={[
                  { id: "en" as const, label: "English" },
                  { id: "he" as const, label: "עברית" },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-muted">{t(lang, "theme")}</p>
              <Segment
                value={settings.theme}
                onChange={(theme) => patchSettings({ theme })}
                options={[
                  { id: "light" as const, label: t(lang, "light") },
                  { id: "dark" as const, label: t(lang, "dark") },
                ]}
              />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

export const NAV = [
  { id: "intake" as const, key: "intake" as const, icon: UserRound },
  { id: "air" as const, key: "air" as const, icon: Gauge },
  { id: "work" as const, key: "work" as const, icon: Wrench },
  { id: "quote" as const, key: "quote" as const, icon: Receipt },
  { id: "send" as const, key: "send" as const, icon: Send },
];
