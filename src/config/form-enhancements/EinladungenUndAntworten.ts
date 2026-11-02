// Auto-generated. Per-entity form-enhancements config for "Einladungen und Antworten".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["umfrage", "person"], "cols": "1fr 1fr"}, "einladungsstatus", {"row": ["versanddatum", "antwortdatum"], "cols": "1fr 1fr"}, "antwortlink", "passende_termine", "ergebnis_versendet", "kommentar"],
  defaults: {
    'versanddatum': { kind: 'today', withTime: true },
    'einladungsstatus': { kind: 'lookup', key: 'offen', label: 'Offen' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
