import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Personen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    organisation?: string;
    notiz?: string;
  };
}

export interface Umfragen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beschreibung?: string;
    ort?: string;
    antwortfrist?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    ergebnis_hinweis?: string;
    gewaehlter_termin?: RecordUrl; // applookup -> URL zu 'Terminvorschlaege' Record
  };
}

export interface Terminvorschlaege {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    umfrage?: RecordUrl; // applookup -> URL zu 'Umfragen' Record
    bezeichnung?: string;
    beginn?: string; // Format: YYYY-MM-DD oder ISO String
    ende?: string; // Format: YYYY-MM-DD oder ISO String
    anzahl_zusagen?: number;
  };
}

export interface EinladungenUndAntworten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    person?: RecordUrl; // applookup -> URL zu 'Personen' Record
    versanddatum?: string; // Format: YYYY-MM-DD oder ISO String
    antwortlink?: string;
    einladungsstatus?: LookupValue;
    antwortdatum?: string; // Format: YYYY-MM-DD oder ISO String
    kommentar?: string;
    ergebnis_versendet?: boolean;
    umfrage?: RecordUrl; // applookup -> URL zu 'Umfragen' Record
    passende_termine?: RecordUrl[];
  };
}

export const APP_IDS = {
  PERSONEN: '6ae8ab2f866e1e0a9d7b2808',
  UMFRAGEN: '6ae8ab33412d15e876b6ce99',
  TERMINVORSCHLAEGE: '6ae8ab34213cefc18ef3abac',
  EINLADUNGEN_UND_ANTWORTEN: '6ae8ab35302b4021035fd9f6',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'umfragen': {
    status: [{ key: "entwurf", get label() { return lookupLabel('umfragen', 'status', "entwurf") ?? "Entwurf"; } }, { key: "laeuft", get label() { return lookupLabel('umfragen', 'status', "laeuft") ?? "Läuft"; } }, { key: "abgeschlossen", get label() { return lookupLabel('umfragen', 'status', "abgeschlossen") ?? "Abgeschlossen"; } }],
  },
  'einladungen_und_antworten': {
    einladungsstatus: [{ key: "offen", get label() { return lookupLabel('einladungen_und_antworten', 'einladungsstatus', "offen") ?? "Offen"; } }, { key: "beantwortet", get label() { return lookupLabel('einladungen_und_antworten', 'einladungsstatus', "beantwortet") ?? "Beantwortet"; } }, { key: "abgesagt", get label() { return lookupLabel('einladungen_und_antworten', 'einladungsstatus', "abgesagt") ?? "Abgesagt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'personen': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'organisation': 'string/text',
    'notiz': 'string/textarea',
  },
  'umfragen': {
    'titel': 'string/text',
    'beschreibung': 'string/textarea',
    'ort': 'string/text',
    'antwortfrist': 'date/date',
    'status': 'lookup/radio',
    'ergebnis_hinweis': 'string/textarea',
    'gewaehlter_termin': 'applookup/select',
  },
  'terminvorschlaege': {
    'umfrage': 'applookup/select',
    'bezeichnung': 'string/text',
    'beginn': 'date/datetimeminute',
    'ende': 'date/datetimeminute',
    'anzahl_zusagen': 'number',
  },
  'einladungen_und_antworten': {
    'person': 'applookup/select',
    'versanddatum': 'date/datetimeminute',
    'antwortlink': 'string/url',
    'einladungsstatus': 'lookup/select',
    'antwortdatum': 'date/datetimeminute',
    'kommentar': 'string/textarea',
    'ergebnis_versendet': 'bool',
    'umfrage': 'applookup/select',
    'passende_termine': 'multipleapplookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreatePersonen = StripLookup<Personen['fields']>;
export type CreateUmfragen = StripLookup<Umfragen['fields']>;
export type CreateTerminvorschlaege = StripLookup<Terminvorschlaege['fields']>;
export type CreateEinladungenUndAntworten = StripLookup<EinladungenUndAntworten['fields']>;