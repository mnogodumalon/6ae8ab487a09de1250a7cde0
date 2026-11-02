/**
 * usePersonenEinladenFlow — the plumbing of the flow « Personen zur Umfrage einladen », generated from the plan.
 *
 * Writes `einladungen_und_antworten` SEVERAL times — one record per entry of `flow.lists.einladungen_und_antworten`; the form is the editor of one entry: asks `umfrage`, `person`; sets `einladungsstatus`, `versanddatum` itself.
Changes `umfragen` (only when the person fills it): the record to change is picked (`flow.pick('umfragen')`), the form is prefilled with its values; ; sets `status` itself.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   Lists (several records of one entity per run): `flow.lists.<key>` holds the
 *   entries — `add()` validates the editor form and takes its values as one more
 *   record, `remove(id)`, `edit(id)` (back into the editor), `entries`, `count`.
 *   Render the editor's fields INSIDE <ListEntries list={flow.lists.<key>}> (the
 *   block adds „Hinzufügen“ and the entry list); „Weiter“ on that step takes a
 *   filled editor as one more entry and needs at least one entry.
 *
 *   const flow = usePersonenEinladenFlow({
 *     steps: { umfragen: 1, umfrage: 2, person: 3 },
 *     items: { umfrage: r => ({ id: r.id, title: fieldText(r, 'titel') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.umfrage.select} {...flow.pick('umfrage')} />
 *     <EntitySelectStep {...flow.picks.person.select} {...flow.pick('person')} />
 *     // the record this flow changes: <EntitySelectStep {...flow.picks.umfragen.select} {...flow.pick('umfragen')} />
 *     <ListEntries list={flow.lists.einladungen_und_antworten}></ListEntries>
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import { useEffect, useState } from 'react';
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep, type SummaryItem,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
import { entityLabel } from '@/lib/journey/rules';
export type PersonenEinladenFieldKey = 'person' | 'umfrage' | 'umfragen';

export interface PersonenEinladenForms {
  einladungen_und_antworten: StepForm<'einladungen_und_antworten'>;
  umfragen: StepForm<'umfragen'>;
}

// Alias so the option generics stay readable.
type Key = PersonenEinladenFieldKey;

export interface PersonenEinladenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    umfrage?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    person?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    umfragen?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

/** One entry of a list the flow creates several records from (`flow.lists.<key>`). */
export interface ListEntry { id: string; values: FormValues; labels: Record<string, string>; rows: SummaryItem[] }

const DEFAULT_STEPS: Record<string, number> = {"person": 3, "umfrage": 2, "umfragen": 1};
export const PERSONENEINLADEN_REVIEW_STEP = 4;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function usePersonenEinladenFlow(options: PersonenEinladenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const [umfragenTargetId, setUmfragenTargetId] = useState<string | null>(null);
  const einladungen_und_antworten = useStepForm('einladungen_und_antworten', {
    fields: ["umfrage", "person"],
    steps: only(steps, ["umfrage", "person"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["umfrage", "person"]),
    messages: only(options.messages as Record<string, string> | undefined, ["umfrage", "person"]),
  });
  const umfragen = useStepForm('umfragen', {
    fields: [],
    steps: only(steps, []) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, []),
    messages: only(options.messages as Record<string, string> | undefined, []),
  });
  const [einladungen_und_antwortenEntries, setEinladungenUndAntwortenEntries] = useState<ListEntry[]>([]);
  const forms: PersonenEinladenForms = { einladungen_und_antworten, umfragen };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [umfragen];
  const allForms: StepForm[] = [einladungen_und_antworten, umfragen];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    umfrage: useRecordSearch(servicePort, 'umfragen', withPickPolicy('umfrage', {
      searchFields: ["titel"] as never,
      filter: "r.v_status in ['entwurf', 'laeuft']",
      where: (r: JourneyRecord) => ["entwurf", "laeuft"].includes(fieldLookup(r, "status")?.key ?? ''),
      toItem: options.items?.umfrage as never,
    })),
    person: useRecordSearch(servicePort, 'personen', withPickPolicy('person', {
      searchFields: ["vorname", "nachname", "email", "organisation"] as never,
      toItem: options.items?.person as never,
    })),
    umfragen: useRecordSearch(servicePort, 'umfragen', withPickPolicy('umfragen', {
      searchFields: ["titel"] as never,
      filter: "r.v_status in ['entwurf', 'laeuft']",
      where: (r: JourneyRecord) => ["entwurf", "laeuft"].includes(fieldLookup(r, "status")?.key ?? ''),
      toItem: options.items?.umfragen as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:personen-einladen:read:${entity}`);
  // a fixed value the flow sets itself, as a review row with the link that changes it
  const setting = (entity: EntityKey, field: string, value: unknown): SummaryItem => ({
    key: `setting:${entity}.${field}`, label: labelOf(entity, field),
    value: optionsOf(entity, field).find(o => o.key === String(value))?.label ?? String(value ?? ''),
    href: `#/verwaltung/anwendung?line=intent:personen-einladen:write:${entity}.${field}`,
  });
  const picks = {
    umfrage: { ...searches.umfrage, select: { ...searches.umfrage.select, create: false as boolean, hint: hintFor('umfrage', 'umfragen', {"conditions": [{"field": "status", "op": "in", "value": ["entwurf", "laeuft"]}], "mode": "any"} as PickWhere | null) } },
    person: { ...searches.person, select: { ...searches.person.select, create: false as boolean, hint: hintFor('person', 'personen', null as PickWhere | null) } },
    umfragen: { ...searches.umfragen, select: { ...searches.umfragen.select, create: false as boolean, hint: hintFor('umfragen', 'umfragen', {"conditions": [{"field": "status", "op": "in", "value": ["entwurf", "laeuft"]}], "mode": "any"} as PickWhere | null) } },
  };

  const umfragenFilled = hasValues(umfragen);
  // Lists — several records of one entity in one run („ein paar Termine“): the
  // editor form takes one entry at a time, `add()` validates it and puts it on
  // the list, the plan creates one record per entry (02.11.2026: the wish said
  // several, the flow made exactly one and nobody reported the difference)
  const lists = {
    einladungen_und_antworten: {
      entries: einladungen_und_antwortenEntries,
      count: einladungen_und_antwortenEntries.length,
      label: entityLabel('einladungen_und_antworten'),
      /** Validates the editor and takes its values as one more `einladungen_und_antworten`; false when a required field is empty. */
      add: (): boolean => {
        if (!einladungen_und_antworten.validate()) return false;
        const rows = einladungen_und_antworten.summary().filter(r => r.value !== '—');
        const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        setEinladungenUndAntwortenEntries(list => [...list, { id, values: einladungen_und_antworten.payload(), labels: { ...einladungen_und_antworten.labels }, rows }]);
        einladungen_und_antworten.reset();
        return true;
      },
      remove: (id: string) => setEinladungenUndAntwortenEntries(list => list.filter(e => e.id !== id)),
      /** Takes an entry back into the editor to change it. */
      edit: (id: string) => {
        const e = einladungen_und_antwortenEntries.find(x => x.id === id);
        if (!e) return;
        setEinladungenUndAntwortenEntries(list => list.filter(x => x.id !== id));
        einladungen_und_antworten.reset(e.values, e.labels);
      },
    },
  };
  const plan: PlanStep[] = [
    ...einladungen_und_antwortenEntries.map((entry, i) => ({
      key: `einladungen_und_antworten:${entry.id}`, entity: 'einladungen_und_antworten', label: `${entityLabel('einladungen_und_antworten')} ${i + 1}`,
      values: (): FormValues => ({
        ...entry.values,
        einladungsstatus: policyFixedValue('einladungen_und_antworten', 'einladungsstatus') ?? "offen",
        versanddatum: policyFixedValue('einladungen_und_antworten', 'versanddatum') ?? nowIso(),
      }),
      // the review lists every entry („1. Termin: …“); „Ändern“ leads back to the list's step
      review: () => entry.rows.map(r => ({ ...r, key: `einladungen_und_antworten:${entry.id}:${r.key}`, label: `${i + 1}. ${r.label}`, step: steps[r.key] })),
    } as PlanStep)),
    ...(umfragenFilled ? [{
      key: 'umfragen', entity: 'umfragen', form: umfragen, primary: true,
      updates: () => umfragenTargetId ?? undefined,
      // the review names the record this step changes; "Ändern" leads back to its pick
      target: () => umfragenTargetId
        ? { key: 'target:umfragen', label: entityLabel('umfragen'), value: picks.umfragen.labelOf(umfragenTargetId) ?? umfragenTargetId, step: steps.umfragen }
        : undefined,
      values: (): FormValues => ({
        status: policyFixedValue('umfragen', 'status') ?? "laeuft",
      }),

      // the review shows what this step sets itself — changeable on „Deine Anwendung“, not here
      settings: () => [setting('umfragen', 'status', policyFixedValue('umfragen', 'status') ?? "laeuft")],
    } as PlanStep] : []),
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'personen-einladen' });

  /** The record(s) this flow CHANGES: picked through {...flow.picks.<entity>.select} {...flow.pick('<entity>')};
   *  picking prefills the form with the record's current values, and the plan step updates that record. */
  const targets = {
    umfragen: {
      selectedId: umfragenTargetId,
      onSelect: (id: string) => {
        setUmfragenTargetId(id);
        const rec = picks.umfragen.recordOf(id);
        if (rec) umfragen.reset({ });
      },
      get record(): JourneyRecord | undefined { return umfragenTargetId ? picks.umfragen.recordOf(umfragenTargetId) : undefined; },
    },
  };
  // Opened for one record — `#/intents/personen-einladen?record=<id>`, the dashboard's
  // flowActionFor(): that record is the one to change. Loaded, taken into the
  // pick and selected — when this flow may change it at all (the pick's rule).
  const [linkedId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record'));
  useEffect(() => {
    if (!linkedId) return;
    let on = true;
    void servicePort.get('umfragen', linkedId).then(rec => {
      if (!on || !rec || !((r: JourneyRecord) => ["entwurf", "laeuft"].includes(fieldLookup(r, "status")?.key ?? ''))(rec)) return;
      picks.umfragen.adopt(rec);
      targets.umfragen.onSelect(rec.id);
    }).catch(() => undefined);
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per link
  }, [linkedId]);
  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: PersonenEinladenFieldKey) => {
    if (field in targets) {
      const t = targets[field as keyof typeof targets];
      return { selectedId: t.selectedId, onSelect: t.onSelect };
    }
    const owner = allForms.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: PersonenEinladenFieldKey) => {
    const owner = allForms.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)))    // the list's step: a filled editor is taken as one more entry; at least one entry is needed
    && (steps['umfrage'] !== n || (hasValues(einladungen_und_antworten) ? lists.einladungen_und_antworten.add() : einladungen_und_antwortenEntries.length > 0 || einladungen_und_antworten.validate()))    && Object.entries(targets).every(([k, t]) => steps[k] !== n || !!t.selectedId);
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); einladungen_und_antworten.reset(); setEinladungenUndAntwortenEntries([]); setUmfragenTargetId(null); };

  return {
    slug: 'personen-einladen' as const,
    draftKey: 'personen-einladen' as const,
    entity: 'umfragen' as const,
    form: umfragen,
    forms, formList, picks, submit, steps, targets, lists,    reviewStep: PERSONENEINLADEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type PersonenEinladenFlow = ReturnType<typeof usePersonenEinladenFlow>;
