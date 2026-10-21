import { Archive, MapPin, Moon, Phone, Plus, Save, Settings as SettingsIcon, Sun } from "lucide-react";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { STORAGE_ERROR_EVENT, flushStorage, requestPersistence } from "@/lib/dvs/idb";
import { cn } from "@/lib/cn";
import {
  AirPanel,
  DispatchPanel,
  EvidencePanel,
  IntakePanel,
  JobsOverlay,
  NAV,
  QuotePanel,
  SettingsOverlay,
  WorkPanel,
} from "@/components/dvs/panels";
import { WhatsAppIcon } from "@/components/dvs/ui";
import { addYearsISO, digitsPhone, money, todayISO, totals } from "@/lib/dvs/calc";
import { t } from "@/lib/dvs/i18n";
import { buildFollowUp, jobMetrics } from "@/lib/dvs/report";
import { whatsappUrl } from "@/lib/dvs/share";
import { useDvs } from "@/lib/dvs/store";
import type { Job, SavedJob } from "@/lib/dvs/types";

function localISODate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function daysUntil(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y || 2026, (m || 1) - 1, d || 1);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/** Today's book from the archive: jobs serviced today or saved today, once per job id. */
function todaysBook(archive: SavedJob[]) {
  const today = todayISO();
  const seen = new Set<string>();
  const jobs: Job[] = [];
  for (const entry of archive) {
    const onDay = entry.job.serviceDate === today || localISODate(new Date(entry.savedAt)) === today;
    if (!onDay || seen.has(entry.job.id)) continue;
    seen.add(entry.job.id);
    jobs.push(entry.job);
  }
  let collected = 0;
  let outstanding = 0;
  for (const job of jobs) {
    const total = totals(job).total;
    if (job.payStatus === "paid") collected += total;
    else if (job.payStatus === "due") outstanding += total;
  }
  return { count: jobs.length, collected, outstanding };
}

/** Annual cleanings coming due: service date + 1 year (the interval the report uses). */
function comingDue(archive: SavedJob[]) {
  const rows: { job: Job; days: number }[] = [];
  const seen = new Set<string>();
  for (const entry of archive) {
    if (seen.has(entry.job.id)) continue;
    seen.add(entry.job.id);
    const days = daysUntil(addYearsISO(entry.job.serviceDate, 1));
    if (days > 60 || days < -45) continue;
    rows.push({ job: entry.job, days });
  }
  return rows.sort((a, b) => a.days - b.days).slice(0, 6);
}

function ShiftStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg px-2 py-2 text-center">
      <p className="font-mono text-sm font-bold">{value}</p>
      <p className="text-xs text-faint">{label}</p>
    </div>
  );
}

function ShiftBoard() {
  const lang = useDvs((state) => state.settings.uiLang);
  const archive = useDvs((state) => state.archive);
  const settings = useDvs((state) => state.settings);
  const reportLang = useDvs((state) => state.reportLang);
  const setConfirm = useDvs((state) => state.setConfirm);
  const book = todaysBook(archive);
  const due = comingDue(archive);

  return (
    <section className="no-print rounded-xl border border-line bg-surface p-4">
      <h2 className="text-xs font-bold tracking-widest text-muted uppercase">{t(lang, "shift")}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <ShiftStat label={t(lang, "visits")} value={String(book.count)} />
        <ShiftStat label={t(lang, "collected")} value={money(book.collected)} />
        <ShiftStat label={t(lang, "outstanding")} value={money(book.outstanding)} />
      </div>
      <h3 className="mt-4 text-sm font-semibold">{t(lang, "followUps")}</h3>
      {due.length === 0 ? <p className="mt-1 text-sm text-muted">{t(lang, "noneDue")}</p> : null}
      <div className="mt-2 space-y-2">
        {due.map(({ job, days }) => {
          const phone = job.clientPhone.trim();
          const address = job.clientAddress.trim();
          return (
            <div key={job.id} className="flex items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2">
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => setConfirm({ kind: "load", id: job.id })}
              >
                <span className="block truncate text-sm font-semibold">{job.clientName.trim() || t(lang, "valued")}</span>
                <span className="block truncate text-xs text-faint">{address || job.id}</span>
                <span className={cn("mt-0.5 block text-xs font-bold", days < 0 ? "text-danger" : "text-warn")}>
                  {days < 0 ? t(lang, "overdue") : t(lang, "dueIn", { n: days })}
                </span>
              </button>
              {phone ? (
                <a
                  href={`tel:${digitsPhone(phone)}`}
                  aria-label={t(lang, "call")}
                  title={t(lang, "call")}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-line"
                >
                  <Phone className="size-4" />
                </a>
              ) : null}
              {phone ? (
                <a
                  href={whatsappUrl(phone, buildFollowUp(job, reportLang, settings))}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t(lang, "whatsapp")}
                  title={t(lang, "whatsapp")}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-line"
                >
                  <WhatsAppIcon className="size-4" />
                </a>
              ) : null}
              {address ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t(lang, "map")}
                  title={t(lang, "map")}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-line"
                >
                  <MapPin className="size-4" />
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Pulse() {
  const lang = useDvs((state) => state.settings.uiLang);
  const job = useDvs((state) => state.job);
  const metrics = jobMetrics(job);
  const gain = metrics.pct === null ? t(lang, "restored") : `${metrics.pct > 0 ? "+" : ""}${metrics.pct}%`;
  return (
    <div className="no-print flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{job.clientName.trim() || t(lang, "valued")}</p>
        <p className="font-mono text-xs text-faint">{job.id}</p>
      </div>
      <div className="text-end">
        <p className={cn("font-mono text-sm font-bold", metrics.safety === "restricted" ? "text-danger" : "text-ok")}>
          {gain}
        </p>
        <p className="font-mono text-sm font-bold text-accent">{money(totals(job).total)}</p>
      </div>
    </div>
  );
}

export default function App() {
  const hydrated = useDvs((state) => state.hydrated);
  const setHydrated = useDvs((state) => state.setHydrated);
  const uiLang = useDvs((state) => state.settings.uiLang);
  const theme = useDvs((state) => state.settings.theme);
  const patchSettings = useDvs((state) => state.patchSettings);
  const businessName = useDvs((state) => state.settings.businessName);
  const jobId = useDvs((state) => state.job.id);
  const screen = useDvs((state) => state.screen);
  const setScreen = useDvs((state) => state.setScreen);
  const overlay = useDvs((state) => state.overlay);
  const setOverlay = useDvs((state) => state.setOverlay);
  const setConfirm = useDvs((state) => state.setConfirm);
  const saveJob = useDvs((state) => state.saveJob);
  const archiveCount = useDvs((state) => state.archive.length);

  // Load persisted state (IndexedDB) once, then reveal the app.
  useEffect(() => {
    let cancelled = false;
    const off = useDvs.persist.onFinishHydration(() => {
      if (!cancelled) setHydrated(true);
    });
    void useDvs.persist.rehydrate();
    return () => {
      cancelled = true;
      off();
    };
  }, [setHydrated]);

  // Warn (once) when the device refuses to store data, so nothing is lost silently.
  useEffect(() => {
    const onError = () => toast.error(t(useDvs.getState().settings.uiLang, "storageWarn"), { duration: 12000 });
    window.addEventListener(STORAGE_ERROR_EVENT, onError);
    void requestPersistence();
    return () => window.removeEventListener(STORAGE_ERROR_EVENT, onError);
  }, []);

  // Document direction follows the UI language.
  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.documentElement.dir = uiLang === "he" ? "rtl" : "ltr";
  }, [uiLang]);

  // Theme comes from the persisted setting (default light); the OS
  // preference no longer decides. Keep the browser chrome color in sync.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0B132B" : "#FFFFFF");
  }, [theme]);

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-fg">
        <div className="text-center">
          <img src="./favicon.svg" alt="" className="mx-auto size-16" />
          <p className="mt-3 text-sm font-semibold tracking-widest text-muted uppercase">DVS Field Suite</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-dvh bg-bg text-fg", uiLang === "he" && "font-he")}>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <img src="./favicon.svg" alt="" className="size-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base leading-tight font-extrabold tracking-tight">
              {(businessName || "Dryer Vent Services").toUpperCase()}
            </p>
            <p className="text-xs text-muted">
              {t(uiLang, "kicker")} · <span className="font-mono">{jobId}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="grid size-11 place-items-center rounded-lg border border-line bg-surface-2"
              onClick={() => setConfirm({ kind: "new" })}
              aria-label={t(uiLang, "newVisit")}
              title={t(uiLang, "newVisit")}
            >
              <Plus className="size-5" />
            </button>
            <button
              type="button"
              className="relative grid size-11 place-items-center rounded-lg border border-line bg-surface-2"
              onClick={() => setOverlay("jobs")}
              aria-label={t(uiLang, "jobs")}
              title={t(uiLang, "jobs")}
            >
              <Archive className="size-5" />
              {archiveCount > 0 ? (
                <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-ink">
                  {archiveCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-lg border border-line bg-surface-2"
              onClick={() => setOverlay("settings")}
              aria-label={t(uiLang, "settings")}
              title={t(uiLang, "settings")}
            >
              <SettingsIcon className="size-5" />
            </button>
            <button
              type="button"
              className="grid size-11 place-items-center rounded-lg border border-line bg-surface-2"
              onClick={() => patchSettings({ theme: theme === "dark" ? "light" : "dark" })}
              aria-label={`${t(uiLang, "theme")}: ${t(uiLang, theme === "dark" ? "dark" : "light")}`}
              title={`${t(uiLang, "theme")}: ${t(uiLang, theme === "dark" ? "dark" : "light")}`}
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <button
              type="button"
              className="flex h-11 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-bold text-ink"
              onClick={() => {
                saveJob();
                void flushStorage().then((ok) =>
                  ok ? toast.success(t(uiLang, "jobSaved")) : toast.error(t(uiLang, "saveFailed"), { duration: 8000 }),
                );
              }}
            >
              <Save className="size-4" />
              {t(uiLang, "save")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-4 pb-28">
        <Pulse />
        {screen === "intake" ? (
          <>
            <ShiftBoard />
            <IntakePanel />
          </>
        ) : null}
        {screen === "air" ? <AirPanel /> : null}
        {screen === "work" ? (
          <>
            <WorkPanel />
            <EvidencePanel />
          </>
        ) : null}
        {screen === "quote" ? <QuotePanel /> : null}
        {screen === "send" ? <DispatchPanel /> : null}
      </main>

      <nav className="nav-safe no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5 px-2 pt-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setScreen(item.id)}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-semibold",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-5" />
                {t(uiLang, item.key)}
              </button>
            );
          })}
        </div>
      </nav>

      {overlay === "jobs" ? <JobsOverlay /> : null}
      {overlay === "settings" ? <SettingsOverlay /> : null}
      <ConfirmDialog />
      <Toaster position="top-center" theme={theme} />
    </div>
  );
}

function ConfirmDialog() {
  const confirm = useDvs((state) => state.confirm);
  const setConfirm = useDvs((state) => state.setConfirm);
  const newJob = useDvs((state) => state.newJob);
  const clearArchive = useDvs((state) => state.clearArchive);
  const deleteJob = useDvs((state) => state.deleteJob);
  const loadJob = useDvs((state) => state.loadJob);
  const uiLang = useDvs((state) => state.settings.uiLang);

  if (!confirm) return null;

  const textKey =
    confirm.kind === "new"
      ? "confirmNew"
      : confirm.kind === "clear"
        ? "confirmClear"
        : confirm.kind === "delete"
          ? "confirmDelete"
          : "confirmLoad";

  function accept() {
    if (!confirm) return;
    if (confirm.kind === "new") newJob();
    else if (confirm.kind === "clear") clearArchive();
    else if (confirm.kind === "delete") deleteJob(confirm.id);
    else loadJob(confirm.id);
  }

  return (
    <div className="no-print fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-5">
        <p className="text-base font-semibold">{t(uiLang, textKey)}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            className="h-12 rounded-xl border border-line bg-surface-2 text-sm font-bold"
            onClick={() => setConfirm(null)}
          >
            {t(uiLang, "cancel")}
          </button>
          <button type="button" className="h-12 rounded-xl bg-accent text-sm font-bold text-ink" onClick={accept}>
            {t(uiLang, "confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
