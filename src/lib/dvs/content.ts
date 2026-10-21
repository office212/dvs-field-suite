import type { Localized } from "./types";

export const COMPANY = {
  name: "Dryer Vent Services",
  region: "New York & New Jersey",
};

export const CLEAN_IDS = ["c1", "c2", "c3", "c11", "c10"] as const;

export const TIER_FOR_TERMINATION: Record<string, string> = {
  side1: "c1",
  wall2: "c2",
  wall3: "c3",
  roof: "c11",
  commercial: "c10",
};

export const SUGGEST_FOR_HAZARD: Record<string, string> = {
  h3: "c4",
  h6: "c5",
  h4: "c6",
  h5: "c6",
  h8: "c7",
};

export const AREAS: { id: string; he: string; en: string; text: string }[] = [
  { id: "si", en: "Staten Island", he: "סטטן איילנד", text: "Staten Island, NY" },
  { id: "bk", en: "Brooklyn", he: "ברוקלין", text: "Brooklyn, NY" },
  { id: "qn", en: "Queens", he: "קווינס", text: "Queens, NY" },
  { id: "bx", en: "Bronx", he: "ברונקס", text: "Bronx, NY" },
  { id: "mn", en: "Manhattan", he: "מנהטן", text: "Manhattan, NY" },
  { id: "nj", en: "New Jersey", he: "ניו ג'רזי", text: "New Jersey" },
];

export const TERMINATIONS: { id: string; name: Localized }[] = [
  {
    id: "side1",
    name: {
      en: "Side wall — 1st floor / basement",
      es: "Pared lateral — 1er piso / sótano",
      he: "קיר צד — קומה 1 / מרתף",
    },
  },
  {
    id: "wall2",
    name: {
      en: "2nd floor exterior (ladder)",
      es: "2do piso exterior (escalera)",
      he: "קומה 2 חיצונית (סולם)",
    },
  },
  {
    id: "wall3",
    name: {
      en: "3rd floor / high exterior",
      es: "3er piso / altura",
      he: "קומה 3 / גובה",
    },
  },
  {
    id: "roof",
    name: {
      en: "Roof termination cap",
      es: "Salida en el techo",
      he: "יציאה בגג",
    },
  },
  {
    id: "commercial",
    name: {
      en: "Commercial / laundromat stack",
      es: "Comercial / lavandería",
      he: "מסחרי / מכבסה",
    },
  },
];

export const DRYERS: { id: string; name: Localized }[] = [
  {
    id: "gas",
    name: {
      en: "Gas dryer (CO and fire critical)",
      es: "Secadora a gas (CO y fuego)",
      he: "מייבש גז (CO ואש)",
    },
  },
  {
    id: "electric",
    name: {
      en: "Electric dryer (240V)",
      es: "Secadora eléctrica (240V)",
      he: "מייבש חשמלי (240V)",
    },
  },
  {
    id: "stacked",
    name: {
      en: "Stacked washer / dryer",
      es: "Torre lavadora / secadora",
      he: "מגדל כביסה / ייבוש",
    },
  },
];

export const HAZARDS: { id: string; name: Localized }[] = [
  {
    id: "h1",
    name: {
      en: "Heavy lint accumulation (fire hazard)",
      es: "Acumulación pesada de pelusa (riesgo de incendio)",
      he: "הצטברות כבדה של מוך (סיכון אש)",
    },
  },
  {
    id: "h2",
    name: {
      en: "Crushed or kinked transition hose",
      es: "Manguera de transición aplastada o doblada",
      he: "צינור מעבר מעוך או מקופל",
    },
  },
  {
    id: "h3",
    name: {
      en: "Non-compliant foil or vinyl flex hose",
      es: "Manguera flexible de foil o vinilo no permitida",
      he: "צינור גמיש מאלומיניום דק או ויניל — לא תקני",
    },
  },
  {
    id: "h4",
    name: {
      en: "Stuck or clogged exterior damper",
      es: "Compuerta exterior atascada o tapada",
      he: "מדף חיצוני תקוע או סתום",
    },
  },
  {
    id: "h5",
    name: {
      en: "Bird screen or mesh trapping lint",
      es: "Malla contra pájaros atrapando pelusa",
      he: "רשת ציפורים שלוכדת מוך",
    },
  },
  {
    id: "h6",
    name: {
      en: "Unsealed wall penetration (draft and pests)",
      es: "Paso de pared sin sellar (corriente y plagas)",
      he: "חדירת קיר לא אטומה (רוח ומזיקים)",
    },
  },
  {
    id: "h7",
    name: {
      en: "Moisture or condensation in the duct",
      es: "Humedad o condensación en el ducto",
      he: "לחות או עיבוי בתעלה",
    },
  },
  {
    id: "h8",
    name: {
      en: "Bird or rodent nest blockage",
      es: "Bloqueo por nido de ave o roedor",
      he: "חסימה מקן ציפור או מכרסם",
    },
  },
  {
    id: "h9",
    name: {
      en: "Duct disconnected inside the wall or ceiling",
      es: "Ducto desconectado dentro de la pared o el techo",
      he: "תעלה מנותקת בתוך הקיר או התקרה",
    },
  },
];

export const ACTIONS: { id: string; name: Localized }[] = [
  {
    id: "a1",
    name: {
      en: "35 ft rotary brush and high-CFM vacuum extraction",
      es: "Cepillo rotativo de 35 ft y extracción al vacío de alto CFM",
      he: "מברשת סיבובית 35 רגל ושאיבה בעוצמה גבוהה",
    },
  },
  {
    id: "a2",
    name: {
      en: "Turbo-jet blower high-velocity line purge",
      es: "Purga de alta velocidad con soplador turbo",
      he: "ניקוי בלחץ עם מפוח טורבו",
    },
  },
  {
    id: "a3",
    name: {
      en: "Upgraded to 4 in UL-2158A semi-rigid aluminum transition",
      es: "Actualización a transición de aluminio semirrígido 4 in UL-2158A",
      he: "שדרוג לצינור אלומיניום חצי קשיח 4 אינץ' UL-2158A",
    },
  },
  {
    id: "a4",
    name: {
      en: "Sealed wall penetration with fireblock and copper mesh",
      es: "Paso de pared sellado con cortafuego y malla de cobre",
      he: "איטום חדירת הקיר בקצף חסין אש ורשת נחושת",
    },
  },
  {
    id: "a5",
    name: {
      en: "Deep-cleaned lint-trap housing and cavity",
      es: "Limpieza profunda de la carcasa del filtro de pelusa",
      he: "ניקוי יסודי של בית מלכודת המוך",
    },
  },
  {
    id: "a6",
    name: {
      en: "Serviced or replaced the exterior weather hood",
      es: "Servicio o reemplazo de la capota exterior",
      he: "טיפול או החלפה של המכסה החיצוני",
    },
  },
  {
    id: "a7",
    name: {
      en: "Verified gas connection and exhaust backpressure",
      es: "Conexión de gas y contrapresión de escape verificadas",
      he: "נבדקו חיבור הגז ולחץ נגדי בפליטה",
    },
  },
  {
    id: "a8",
    name: {
      en: "Freed and tested the exterior damper",
      es: "Compuerta exterior liberada y probada",
      he: "המדף החיצוני שוחרר ונבדק",
    },
  },
];

export type CatalogItem = {
  id: string;
  price: number;
  group: "clean" | "addon";
  name: Localized;
};

export const CATALOG: CatalogItem[] = [
  {
    id: "c1",
    price: 175,
    group: "clean",
    name: {
      en: "Dryer vent cleaning — basement / 1st floor",
      es: "Limpieza de ducto — sótano / 1er piso",
      he: "ניקוי תעלת מייבש — מרתף / קומה 1",
    },
  },
  {
    id: "c2",
    price: 225,
    group: "clean",
    name: {
      en: "Dryer vent cleaning — 2nd floor exterior",
      es: "Limpieza de ducto — 2do piso exterior",
      he: "ניקוי תעלת מייבש — קומה 2 חיצונית",
    },
  },
  {
    id: "c3",
    price: 275,
    group: "clean",
    name: {
      en: "Dryer vent cleaning — 3rd floor / high reach",
      es: "Limpieza de ducto — 3er piso / altura",
      he: "ניקוי תעלת מייבש — קומה 3 / גובה",
    },
  },
  {
    id: "c11",
    price: 295,
    group: "clean",
    name: {
      en: "Dryer vent cleaning — roof termination",
      es: "Limpieza de ducto — salida en el techo",
      he: "ניקוי תעלת מייבש — יציאת גג",
    },
  },
  {
    id: "c10",
    price: 350,
    group: "clean",
    name: {
      en: "Dryer vent cleaning — commercial / laundromat stack",
      es: "Limpieza de ducto — comercial / lavandería",
      he: "ניקוי תעלת מייבש — מסחרי / מכבסה",
    },
  },
  {
    id: "c4",
    price: 65,
    group: "addon",
    name: {
      en: "UL-2158A 4 in semi-rigid aluminum transition",
      es: "Transición de aluminio semirrígido 4 in UL-2158A",
      he: "צינור אלומיניום חצי קשיח 4 אינץ' UL-2158A",
    },
  },
  {
    id: "c5",
    price: 55,
    group: "addon",
    name: {
      en: "Fireblock foam and copper mesh wall seal",
      es: "Sellado cortafuego y malla de cobre",
      he: "איטום קיר בקצף חסין אש ורשת נחושת",
    },
  },
  {
    id: "c6",
    price: 85,
    group: "addon",
    name: {
      en: "Exterior vent hood / pest guard",
      es: "Capota exterior / guarda contra plagas",
      he: "מכסה חיצוני / מגן מזיקים",
    },
  },
  {
    id: "c7",
    price: 95,
    group: "addon",
    name: {
      en: "Bird nest extraction and sanitizing",
      es: "Extracción de nido y sanitización",
      he: "הוצאת קן וחיטוי תעלה",
    },
  },
  {
    id: "c8",
    price: 125,
    group: "addon",
    name: {
      en: "Diagnostic service call",
      es: "Cargo de diagnóstico",
      he: "דמי אבחון",
    },
  },
  {
    id: "c9",
    price: 25,
    group: "addon",
    name: {
      en: "After-hours / emergency dispatch",
      es: "Recargo de emergencia / fuera de horario",
      he: "תוספת חירום / אחרי שעות",
    },
  },
];

export function byId<T extends { id: string }>(list: T[], id: string) {
  return list.find((item) => item.id === id);
}
