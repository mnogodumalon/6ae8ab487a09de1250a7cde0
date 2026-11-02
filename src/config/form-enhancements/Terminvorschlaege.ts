// Auto-generated. Per-entity form-enhancements config for "Terminvorschläge".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["bezeichnung", "umfrage", {"row": ["beginn", "ende"]}, "anzahl_zusagen"],
  defaults: {
    'beginn': { kind: 'today', withTime: true },
    'anzahl_zusagen': { kind: 'literal', value: 0 },
  },
  computed: {
    '_termin_dauer_stunden': { kind: 'dateDiff', from: 'beginn', to: 'ende', unit: 'hours' },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
