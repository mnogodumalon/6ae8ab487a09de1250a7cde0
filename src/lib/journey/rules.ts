/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'personen' | 'umfragen' | 'terminvorschlaege' | 'einladungen_und_antworten';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "personen": "vorname" | "nachname" | "email" | "telefon" | "organisation" | "notiz";
  "umfragen": "titel" | "beschreibung" | "ort" | "ergebnis_hinweis";
  "terminvorschlaege": "bezeichnung";
  "einladungen_und_antworten": "antwortlink" | "kommentar";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "personen": never;
  "umfragen": "gewaehlter_termin";
  "terminvorschlaege": "umfrage";
  "einladungen_und_antworten": "person" | "umfrage" | "passende_termine";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it as a value. `file` is false: a file is UPLOADED
   *  (`form.file(key)` → FileField; the chosen file travels in the create as a data URL). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "personen": {
    "key": "personen",
    "appId": "6ae8ab2f866e1e0a9d7b2808",
    "label": "Personen",
    "pascal": "Personen",
    "single": "PersonenEntry"
  },
  "umfragen": {
    "key": "umfragen",
    "appId": "6ae8ab33412d15e876b6ce99",
    "label": "Umfragen",
    "pascal": "Umfragen",
    "single": "UmfragenEntry"
  },
  "terminvorschlaege": {
    "key": "terminvorschlaege",
    "appId": "6ae8ab34213cefc18ef3abac",
    "label": "Terminvorschläge",
    "pascal": "Terminvorschlaege",
    "single": "TerminvorschlaegeEntry"
  },
  "einladungen_und_antworten": {
    "key": "einladungen_und_antworten",
    "appId": "6ae8ab35302b4021035fd9f6",
    "label": "Einladungen und Antworten",
    "pascal": "EinladungenUndAntworten",
    "single": "EinladungenUndAntwortenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "personen": {
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "organisation": {
      "key": "organisation",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Organisation",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "organization"
    },
    "notiz": {
      "key": "notiz",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Notiz",
      "writable": true
    }
  },
  "umfragen": {
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Titel der Umfrage",
      "writable": true,
      "maxLength": 4000
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "antwortfrist": {
      "key": "antwortfrist",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Antwortfrist",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "entwurf",
        "laeuft",
        "abgeschlossen"
      ]
    },
    "ergebnis_hinweis": {
      "key": "ergebnis_hinweis",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Hinweis zum Ergebnis",
      "writable": true
    },
    "gewaehlter_termin": {
      "key": "gewaehlter_termin",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Gewählter Termin",
      "writable": true,
      "targetAppId": "6ae8ab34213cefc18ef3abac",
      "targetEntity": "terminvorschlaege"
    }
  },
  "terminvorschlaege": {
    "umfrage": {
      "key": "umfrage",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Umfrage",
      "writable": true,
      "targetAppId": "6ae8ab33412d15e876b6ce99",
      "targetEntity": "umfragen"
    },
    "bezeichnung": {
      "key": "bezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Bezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "beginn": {
      "key": "beginn",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Beginn",
      "writable": true
    },
    "ende": {
      "key": "ende",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": false,
      "label": "Ende",
      "writable": true
    },
    "anzahl_zusagen": {
      "key": "anzahl_zusagen",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Anzahl der Zusagen",
      "writable": true
    }
  },
  "einladungen_und_antworten": {
    "person": {
      "key": "person",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Person",
      "writable": true,
      "targetAppId": "6ae8ab2f866e1e0a9d7b2808",
      "targetEntity": "personen"
    },
    "versanddatum": {
      "key": "versanddatum",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": false,
      "label": "Versanddatum der Einladung",
      "writable": true
    },
    "antwortlink": {
      "key": "antwortlink",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Antwortlink",
      "writable": true,
      "autoComplete": "url"
    },
    "einladungsstatus": {
      "key": "einladungsstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Einladungsstatus",
      "writable": true,
      "options": [
        "offen",
        "beantwortet",
        "abgesagt"
      ]
    },
    "antwortdatum": {
      "key": "antwortdatum",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": false,
      "label": "Antwortdatum",
      "writable": true
    },
    "kommentar": {
      "key": "kommentar",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kommentar",
      "writable": true
    },
    "ergebnis_versendet": {
      "key": "ergebnis_versendet",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Ergebnis-E-Mail versendet",
      "writable": true
    },
    "umfrage": {
      "key": "umfrage",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Umfrage",
      "writable": true,
      "targetAppId": "6ae8ab33412d15e876b6ce99",
      "targetEntity": "umfragen"
    },
    "passende_termine": {
      "key": "passende_termine",
      "fulltype": "multipleapplookup/select",
      "kind": "multirecord",
      "required": false,
      "label": "Passende Termine",
      "writable": true,
      "targetAppId": "6ae8ab34213cefc18ef3abac",
      "targetEntity": "terminvorschlaege"
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "personen": [],
  "umfragen": [
    {
      "kind": "choice",
      "field": "status",
      "count": 3
    },
    {
      "kind": "record",
      "field": "gewaehlter_termin",
      "targetEntity": "terminvorschlaege"
    }
  ],
  "terminvorschlaege": [
    {
      "kind": "range",
      "from": "beginn",
      "to": "ende"
    },
    {
      "kind": "record",
      "field": "umfrage",
      "targetEntity": "umfragen"
    }
  ],
  "einladungen_und_antworten": [
    {
      "kind": "choice",
      "field": "einladungsstatus",
      "count": 3
    },
    {
      "kind": "record",
      "field": "person",
      "targetEntity": "personen"
    },
    {
      "kind": "record",
      "field": "umfrage",
      "targetEntity": "umfragen"
    },
    {
      "kind": "record",
      "field": "passende_termine",
      "targetEntity": "terminvorschlaege"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "personen": [
    "vorname",
    "nachname"
  ],
  "umfragen": [
    "titel"
  ],
  "terminvorschlaege": [
    "bezeichnung"
  ],
  "einladungen_und_antworten": [
    "antwortlink"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
