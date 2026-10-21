import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CLEAN_IDS, SUGGEST_FOR_HAZARD, TIER_FOR_TERMINATION } from "./content";
import { clampReading, fromCfm, sequentialJobId, todayISO, toCfm, unitStep } from "./calc";
import { idbStorage } from "./idb";
import type { DocKind, Job, PayMethod, PayStatus, ReportLang, SavedJob, Settings, Unit } from "./types";

export const REVIEW_LINK_DEFAULT = "https://g.page/r/CSb74Pe3W9RVEBE/review";

export const DEFAULT_SETTINGS: Settings = {
  businessName: "Dryer Vent Services",
  techName: "Chanoch",
  phone: "347-244-9382",
  email: "office@dryer-ventservices.com",
  site: "dryer-ventservices.com",
  reviewLink: REVIEW_LINK_DEFAULT,
  defaultTax: 0,
  uiLang: "en",
  theme: "light",
};

/** Field defaults used to normalize jobs saved by older builds. */
const JOB_DEFAULTS: Omit<Job, "id" | "createdAt"> = {
  serviceDate: todayISO(),
  clientName: "",
  clientPhone: "",
  clientAddress: "",
  termination: "side1",
  dryer: "gas",
  unit: "CFM",
  airBefore: 0,
  airAfter: 0,
  coPpm: 0,
  readingsAreSample: false,
  ductFeet: 0,
  elbows90: 0,
  elbows45: 0,
  hazards: [],
  actions: [],
  catalogOn: [],
  priceOverrides: {},
  customItems: [],
  discount: 0,
  discountMode: "usd",
  deposit: 0,
  limitFt: 35,
  taxRate: 0,
  payStatus: "due",
  payMethod: "zelle",
  showPricing: true,
  docKind: "certificate",
  notes: "",
  photoBefore: null,
  photoAfter: null,
  meterBefore: null,
  meterAfter: null,
  signature: null,
  autoPrice: true,
};

export function withDefaults(job: Job): Job {
  return { ...JOB_DEFAULTS, ...job };
}

export function freshJob(id: string): Job {
  return {
    ...JOB_DEFAULTS,
    id,
    createdAt: new Date().toISOString(),
    serviceDate: todayISO(),
    catalogOn: ["c1"],
  };
}

type Confirm =
  | null
  | { kind: "new" }
  | { kind: "clear" }
  | { kind: "delete"; id: string }
  | { kind: "load"; id: string };

type PhotoKey = "photoBefore" | "photoAfter" | "meterBefore" | "meterAfter";

type DvsState = {
  hydrated: boolean;
  counter: number;
  job: Job;
  archive: SavedJob[];
  settings: Settings;
  reportLang: ReportLang;
  screen: "intake" | "air" | "work" | "quote" | "send";
  overlay: null | "jobs" | "settings";
  confirm: Confirm;
  setHydrated: (v: boolean) => void;
  patch: (partial: Partial<Job>) => void;
  setScreen: (screen: DvsState["screen"]) => void;
  setOverlay: (overlay: DvsState["overlay"]) => void;
  setConfirm: (confirm: Confirm) => void;
  setReportLang: (reportLang: ReportLang) => void;
  patchSettings: (partial: Partial<Settings>) => void;
  setUnit: (unit: Unit) => void;
  setReading: (which: "airBefore" | "airAfter", value: number) => void;
  bumpReading: (which: "airBefore" | "airAfter", dir: -1 | 1) => void;
  setCount: (key: "ductFeet" | "elbows90" | "elbows45", value: number) => void;
  setTermination: (termination: string) => void;
  toggleHazard: (id: string) => void;
  toggleAction: (id: string) => void;
  toggleCatalog: (id: string) => void;
  addSuggestion: (id: string) => void;
  setPrice: (id: string, price: number) => void;
  addCustom: (name: string, price: number) => void;
  removeLine: (id: string) => void;
  setDiscount: (discount: number) => void;
  setPayStatus: (payStatus: PayStatus) => void;
  setPayMethod: (payMethod: PayMethod) => void;
  setDocKind: (docKind: DocKind) => void;
  setPhoto: (which: PhotoKey, data: string | null) => void;
  setSignature: (signature: string | null) => void;
  loadSample: (notes: string) => void;
  newJob: () => void;
  saveJob: () => void;
  loadJob: (id: string) => void;
  deleteJob: (id: string) => void;
  clearArchive: () => void;
};

function withTier(job: Job, termination: string): Job {
  const tier = TIER_FOR_TERMINATION[termination];
  if (!job.autoPrice || !tier) return { ...job, termination };
  const catalogOn = [...job.catalogOn.filter((id) => !CLEAN_IDS.includes(id as (typeof CLEAN_IDS)[number])), tier];
  return { ...job, termination, catalogOn };
}

type PersistedState = {
  job: Job;
  archive: SavedJob[];
  settings: Settings;
  reportLang: ReportLang;
  counter: number;
};

export const useDvs = create<DvsState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      counter: 1,
      job: freshJob(sequentialJobId(1)),
      archive: [],
      settings: DEFAULT_SETTINGS,
      reportLang: "en",
      screen: "intake",
      overlay: null,
      confirm: null,
      setHydrated: (hydrated) => set({ hydrated }),
      patch: (partial) => set({ job: { ...get().job, ...partial } }),
      setScreen: (screen) => set({ screen, overlay: null }),
      setOverlay: (overlay) => set({ overlay }),
      setConfirm: (confirm) => set({ confirm }),
      setReportLang: (reportLang) => set({ reportLang }),
      patchSettings: (partial) => set({ settings: { ...get().settings, ...partial } }),
      setUnit: (unit) => {
        const job = get().job;
        if (unit === job.unit) return;
        set({
          job: {
            ...job,
            unit,
            airBefore: fromCfm(toCfm(job.airBefore, job.unit), unit),
            airAfter: fromCfm(toCfm(job.airAfter, job.unit), unit),
            readingsAreSample: false,
          },
        });
      },
      setReading: (which, value) =>
        set({
          job: {
            ...get().job,
            [which]: clampReading(value, unitStep(get().job.unit)),
            readingsAreSample: false,
          },
        }),
      bumpReading: (which, dir) => {
        const job = get().job;
        const step = unitStep(job.unit);
        const next = clampReading(job[which] + dir * step, step);
        set({ job: { ...job, [which]: next, readingsAreSample: false } });
      },
      setCount: (key, value) => {
        const n = Math.max(0, Math.round(Number(value) || 0));
        set({ job: { ...get().job, [key]: n } });
      },
      setTermination: (termination) => set({ job: withTier(get().job, termination) }),
      toggleHazard: (id) => {
        const job = get().job;
        const hazards = job.hazards.includes(id)
          ? job.hazards.filter((item) => item !== id)
          : [...job.hazards, id];
        set({ job: { ...job, hazards } });
      },
      toggleAction: (id) => {
        const job = get().job;
        const actions = job.actions.includes(id)
          ? job.actions.filter((item) => item !== id)
          : [...job.actions, id];
        set({ job: { ...job, actions } });
      },
      toggleCatalog: (id) => {
        const job = get().job;
        const isClean = CLEAN_IDS.includes(id as (typeof CLEAN_IDS)[number]);
        const on = job.catalogOn.includes(id);
        let catalogOn = job.catalogOn;
        if (isClean) {
          catalogOn = catalogOn.filter((item) => !CLEAN_IDS.includes(item as (typeof CLEAN_IDS)[number]));
          if (!on) catalogOn = [...catalogOn, id];
        } else {
          catalogOn = on ? catalogOn.filter((item) => item !== id) : [...catalogOn, id];
        }
        set({ job: { ...job, catalogOn, autoPrice: isClean ? false : job.autoPrice } });
      },
      addSuggestion: (id) => {
        const job = get().job;
        if (job.catalogOn.includes(id)) return;
        set({ job: { ...job, catalogOn: [...job.catalogOn, id] } });
      },
      setPrice: (id, price) => {
        const job = get().job;
        const custom = job.customItems.find((item) => item.id === id);
        if (custom) {
          set({
            job: {
              ...job,
              customItems: job.customItems.map((item) =>
                item.id === id ? { ...item, price: Math.max(0, price) } : item,
              ),
            },
          });
          return;
        }
        set({ job: { ...job, priceOverrides: { ...job.priceOverrides, [id]: Math.max(0, price) } } });
      },
      addCustom: (name, price) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const job = get().job;
        set({
          job: {
            ...job,
            customItems: [...job.customItems, { id: `cu-${Date.now()}`, name: trimmed, price: Math.max(0, price) }],
          },
        });
      },
      removeLine: (id) => {
        const job = get().job;
        set({
          job: {
            ...job,
            catalogOn: job.catalogOn.filter((item) => item !== id),
            customItems: job.customItems.filter((item) => item.id !== id),
          },
        });
      },
      setDiscount: (discount) => set({ job: { ...get().job, discount: Math.max(0, discount) } }),
      setPayStatus: (payStatus) =>
        set({
          job: {
            ...get().job,
            payStatus,
            docKind: payStatus === "estimate" ? "estimate" : get().job.docKind === "estimate" ? "certificate" : get().job.docKind,
          },
        }),
      setPayMethod: (payMethod) => set({ job: { ...get().job, payMethod } }),
      setDocKind: (docKind) =>
        set({
          job: {
            ...get().job,
            docKind,
            payStatus: docKind === "estimate" ? "estimate" : get().job.payStatus === "estimate" ? "due" : get().job.payStatus,
          },
        }),
      setPhoto: (which, data) => set({ job: { ...get().job, [which]: data } }),
      setSignature: (signature) => set({ job: { ...get().job, signature } }),
      loadSample: (notes) =>
        set({
          job: {
            ...freshJob(get().job.id),
            airBefore: 38,
            airAfter: 152,
            ductFeet: 15,
            elbows90: 2,
            hazards: ["h1", "h2"],
            actions: ["a1", "a2", "a5"],
            payStatus: "paid",
            clientName: "Jordan Miller",
            clientPhone: "718-555-0199",
            clientAddress: "184 Howard Avenue, Staten Island, NY",
            notes,
            readingsAreSample: false,
            signature: null,
          },
        }),
      newJob: () => {
        const counter = get().counter + 1;
        set({
          counter,
          job: { ...freshJob(sequentialJobId(counter)), taxRate: Math.max(0, get().settings.defaultTax || 0) },
          confirm: null,
          screen: "intake",
          overlay: null,
        });
      },
      saveJob: () => {
        const job = structuredClone(get().job);
        const archive = [{ savedAt: new Date().toISOString(), job }, ...get().archive.filter((item) => item.job.id !== job.id)];
        set({ archive });
      },
      loadJob: (id) => {
        const found = get().archive.find((item) => item.job.id === id);
        if (!found) return;
        set({ job: withDefaults(structuredClone(found.job)), confirm: null, overlay: null, screen: "intake" });
      },
      deleteJob: (id) => set({ archive: get().archive.filter((item) => item.job.id !== id), confirm: null }),
      clearArchive: () => set({ archive: [], confirm: null }),
    }),
    {
      name: "dvs-field-command-v1",
      skipHydration: true,
      version: 2,
      partialize: (state): PersistedState => ({
        job: state.job,
        archive: state.archive,
        settings: state.settings,
        reportLang: state.reportLang,
        counter: state.counter,
      }),
      migrate: (persisted) => {
        const state = persisted as Partial<PersistedState>;
        const archive = (state.archive ?? []).map((entry) => ({
          savedAt: entry.savedAt,
          job: withDefaults(entry.job),
        }));
        return {
          job: state.job ? withDefaults(state.job) : freshJob(sequentialJobId(1)),
          archive,
          settings: { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) },
          reportLang: state.reportLang ?? "en",
          counter: typeof state.counter === "number" && state.counter > 0 ? state.counter : archive.length + 1,
        };
      },
      storage: createJSONStorage(() => idbStorage),
    },
  ),
);

export function pendingSuggestions(job: Job) {
  const ids = new Set<string>();
  for (const hazard of job.hazards) {
    const addon = SUGGEST_FOR_HAZARD[hazard];
    if (addon && !job.catalogOn.includes(addon)) ids.add(addon);
  }
  return [...ids];
}

/** Serialize everything worth keeping (settings + saved jobs) for a backup file. */
export function exportBackup(): string {
  const state = useDvs.getState();
  return JSON.stringify(
    {
      app: "dvs-field-suite",
      version: 2,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      counter: state.counter,
      archive: state.archive,
    },
    null,
    2,
  );
}

/** Restore a backup produced by exportBackup. Returns the number of jobs imported. */
export function importBackup(json: string): number {
  const data = JSON.parse(json) as {
    settings?: Partial<Settings>;
    counter?: number;
    archive?: SavedJob[];
  };
  if (!data || !Array.isArray(data.archive)) throw new Error("invalid backup");
  const state = useDvs.getState();
  const known = new Set(state.archive.map((entry) => `${entry.job.id}|${entry.savedAt}`));
  const incoming = data.archive
    .filter((entry) => entry && entry.job && typeof entry.job.id === "string")
    .map((entry) => ({ savedAt: entry.savedAt || new Date().toISOString(), job: withDefaults(entry.job) }))
    .filter((entry) => !known.has(`${entry.job.id}|${entry.savedAt}`));
  const archive = [...incoming, ...state.archive].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
  useDvs.setState({
    archive,
    settings: data.settings ? { ...state.settings, ...data.settings } : state.settings,
    counter: typeof data.counter === "number" && data.counter > state.counter ? data.counter : state.counter,
  });
  return incoming.length;
}
