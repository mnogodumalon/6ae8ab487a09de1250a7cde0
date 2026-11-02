/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'personen'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.personen.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.personen.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.personen.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.personen              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   personen: vorname, nachname, email, telefon, organisation, notiz  ·  ← einladungen_und_antworten (list + contextual +)
 *   umfragen: titel, beschreibung, ort, antwortfrist, status, ergebnis_hinweis, gewaehlter_termin  ·  → terminvorschlaege · ← terminvorschlaege (list + contextual +) · ← einladungen_und_antworten (list + contextual +)
 *   terminvorschlaege: umfrage, bezeichnung, beginn, ende, anzahl_zusagen  ·  → umfragen · ← umfragen (list + contextual +) · ← einladungen_und_antworten (list + contextual + + choose existing)
 *   einladungen_und_antworten: person, versanddatum, antwortlink, einladungsstatus, antwortdatum, kommentar, ergebnis_versendet, umfrage, …  ·  → personen · → umfragen · → terminvorschlaege
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Personen, Umfragen, Terminvorschlaege, EinladungenUndAntworten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordIds } from '@/services/livingAppsService';
import { enrichUmfragen, enrichTerminvorschlaege, enrichEinladungenUndAntworten } from '@/lib/enrich';
import type { EnrichedUmfragen, EnrichedTerminvorschlaege, EnrichedEinladungenUndAntworten } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { PersonenDialog, type PersonenDialogDefaults } from '@/components/dialogs/PersonenDialog';
import { PersonenDetails } from '@/components/details/PersonenDetails';
import { UmfragenDialog, type UmfragenDialogDefaults } from '@/components/dialogs/UmfragenDialog';
import { UmfragenDetails } from '@/components/details/UmfragenDetails';
import { TerminvorschlaegeDialog, type TerminvorschlaegeDialogDefaults } from '@/components/dialogs/TerminvorschlaegeDialog';
import { TerminvorschlaegeDetails } from '@/components/details/TerminvorschlaegeDetails';
import { EinladungenUndAntwortenDialog, type EinladungenUndAntwortenDialogDefaults } from '@/components/dialogs/EinladungenUndAntwortenDialog';
import { EinladungenUndAntwortenDetails } from '@/components/details/EinladungenUndAntwortenDetails';
import { PickExistingDialog } from '@/components/PickExistingDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'personen'; record: Personen }
  | { type: 'umfragen'; record: EnrichedUmfragen }
  | { type: 'terminvorschlaege'; record: EnrichedTerminvorschlaege }
  | { type: 'einladungenUndAntworten'; record: EnrichedEinladungenUndAntworten };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  personen: EntityCrudApi<Personen, PersonenDialogDefaults>;
  umfragen: EntityCrudApi<Umfragen, UmfragenDialogDefaults>;
  terminvorschlaege: EntityCrudApi<Terminvorschlaege, TerminvorschlaegeDialogDefaults>;
  einladungenUndAntworten: EntityCrudApi<EinladungenUndAntworten, EinladungenUndAntwortenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { personen: Personen[]; umfragen: EnrichedUmfragen[]; terminvorschlaege: EnrichedTerminvorschlaege[]; einladungenUndAntworten: EnrichedEinladungenUndAntworten[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [personenDialog, setPersonenDialog] = useState<{ defaults?: PersonenDialogDefaults; editing?: Personen } | null>(null);
  const [umfragenDialog, setUmfragenDialog] = useState<{ defaults?: UmfragenDialogDefaults; editing?: Umfragen } | null>(null);
  const [terminvorschlaegeDialog, setTerminvorschlaegeDialog] = useState<{ defaults?: TerminvorschlaegeDialogDefaults; editing?: Terminvorschlaege } | null>(null);
  const [einladungenUndAntwortenDialog, setEinladungenUndAntwortenDialog] = useState<{ defaults?: EinladungenUndAntwortenDialogDefaults; editing?: EinladungenUndAntworten } | null>(null);
  // „Vorhandene wählen" für den Listenfeld-Rückbezug einladungen_und_antworten.passende_termine → terminvorschlaege: hält die Hub-record_id.
  const [pickTerminvorschlaegeEinladungenUndAntworten, setPickTerminvorschlaegeEinladungenUndAntworten] = useState<string | null>(null);
  const enrichedUmfragen = useMemo(() => enrichUmfragen(data.umfragen, { terminvorschlaegeMap: data.terminvorschlaegeMap }), [data.umfragen, data.terminvorschlaegeMap]);
  const enrichedTerminvorschlaege = useMemo(() => enrichTerminvorschlaege(data.terminvorschlaege, { umfragenMap: data.umfragenMap }), [data.terminvorschlaege, data.umfragenMap]);
  const enrichedEinladungenUndAntworten = useMemo(() => enrichEinladungenUndAntworten(data.einladungenUndAntworten, { personenMap: data.personenMap, umfragenMap: data.umfragenMap, terminvorschlaegeMap: data.terminvorschlaegeMap }), [data.einladungenUndAntworten, data.personenMap, data.umfragenMap, data.terminvorschlaegeMap]);

  function detailPersonen(record: Personen, push = false) {
    const item: OverlayItem = { type: 'personen', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitPersonen(fields: Personen['fields']) {
    const editing = personenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setPersonen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updatePersonenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('personen')} — ${t('crud_updated')}`, async () => {
        data.setPersonen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updatePersonenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createPersonenEntry(fields);
      undoToast(`${appLabel('personen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailUmfragen(record: Umfragen, push = false) {
    const rec = enrichedUmfragen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'umfragen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitUmfragen(fields: Umfragen['fields']) {
    const editing = umfragenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setUmfragen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateUmfragenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('umfragen')} — ${t('crud_updated')}`, async () => {
        data.setUmfragen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateUmfragenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createUmfragenEntry(fields);
      undoToast(`${appLabel('umfragen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailTerminvorschlaege(record: Terminvorschlaege, push = false) {
    const rec = enrichedTerminvorschlaege.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'terminvorschlaege', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitTerminvorschlaege(fields: Terminvorschlaege['fields']) {
    const editing = terminvorschlaegeDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setTerminvorschlaege(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateTerminvorschlaegeEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('terminvorschlaege')} — ${t('crud_updated')}`, async () => {
        data.setTerminvorschlaege(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateTerminvorschlaegeEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createTerminvorschlaegeEntry(fields);
      undoToast(`${appLabel('terminvorschlaege')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  // Link an EXISTING EinladungenUndAntworten to the Terminvorschlaege hub: append the hub URL to the
  // source's list field. Optimistic setter first, PATCH, undoToast counter-write.
  async function linkTerminvorschlaegeEinladungenUndAntworten(sourceId: string) {
    const hub = pickTerminvorschlaegeEinladungenUndAntworten;
    const src = data.einladungenUndAntworten.find(r => r.record_id === sourceId);
    if (!hub || !src) return;
    const ids = extractRecordIds(src.fields.passende_termine);
    if (ids.includes(hub)) return;
    const next = [...ids, hub].map(id => createRecordUrl(APP_IDS.TERMINVORSCHLAEGE, id));
    data.setEinladungenUndAntworten(list => list.map(r => (r.record_id === sourceId ? { ...r, fields: { ...r.fields, passende_termine: next } } : r)));
    try {
      await LivingAppsService.updateEinladungenUndAntwortenEntry(sourceId, { passende_termine: next });
    } catch (err) {
      data.fetchAll();
      throw err;
    }
    undoToast(`${appLabel('einladungen_und_antworten')} — ${t('pick_linked')}`, async () => {
      data.setEinladungenUndAntworten(list => list.map(r => (r.record_id === sourceId ? src : r)));
      try { await LivingAppsService.updateEinladungenUndAntwortenEntry(sourceId, { passende_termine: src.fields.passende_termine }); } catch { data.fetchAll(); }
    });
  }

  function detailEinladungenUndAntworten(record: EinladungenUndAntworten, push = false) {
    const rec = enrichedEinladungenUndAntworten.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'einladungenUndAntworten', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitEinladungenUndAntworten(fields: EinladungenUndAntworten['fields']) {
    const editing = einladungenUndAntwortenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setEinladungenUndAntworten(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateEinladungenUndAntwortenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('einladungen_und_antworten')} — ${t('crud_updated')}`, async () => {
        data.setEinladungenUndAntworten(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateEinladungenUndAntwortenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createEinladungenUndAntwortenEntry(fields);
      undoToast(`${appLabel('einladungen_und_antworten')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <PersonenDialog
        open={personenDialog !== null}
        onClose={() => setPersonenDialog(null)}
        onSubmit={submitPersonen}
        defaultValues={personenDialog?.defaults}
        recordId={personenDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Personen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
      />
      <UmfragenDialog
        open={umfragenDialog !== null}
        onClose={() => setUmfragenDialog(null)}
        onSubmit={submitUmfragen}
        defaultValues={umfragenDialog?.defaults}
        recordId={umfragenDialog?.editing?.record_id}
        terminvorschlaegeList={data.terminvorschlaege}
        enablePhotoScan={AI_PHOTO_SCAN['Umfragen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Umfragen']}
      />
      <TerminvorschlaegeDialog
        open={terminvorschlaegeDialog !== null}
        onClose={() => setTerminvorschlaegeDialog(null)}
        onSubmit={submitTerminvorschlaege}
        defaultValues={terminvorschlaegeDialog?.defaults}
        recordId={terminvorschlaegeDialog?.editing?.record_id}
        umfragenList={data.umfragen}
        enablePhotoScan={AI_PHOTO_SCAN['Terminvorschlaege']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Terminvorschlaege']}
      />
      <EinladungenUndAntwortenDialog
        open={einladungenUndAntwortenDialog !== null}
        onClose={() => setEinladungenUndAntwortenDialog(null)}
        onSubmit={submitEinladungenUndAntworten}
        defaultValues={einladungenUndAntwortenDialog?.defaults}
        recordId={einladungenUndAntwortenDialog?.editing?.record_id}
        personenList={data.personen}
        umfragenList={data.umfragen}
        terminvorschlaegeList={data.terminvorschlaege}
        enablePhotoScan={AI_PHOTO_SCAN['EinladungenUndAntworten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['EinladungenUndAntworten']}
      />
      <PickExistingDialog
        open={pickTerminvorschlaegeEinladungenUndAntworten !== null}
        onClose={() => setPickTerminvorschlaegeEinladungenUndAntworten(null)}
        title={t('pick_title', { title: appLabel('einladungen_und_antworten') })}
        items={data.einladungenUndAntworten
          .filter(r => !extractRecordIds(r.fields.passende_termine).includes(pickTerminvorschlaegeEinladungenUndAntworten ?? ''))
          .map(r => ({ id: r.record_id, label: String(appLabel('einladungen_und_antworten')), hint: r.fields.versanddatum ? String(r.fields.versanddatum) : undefined }))}
        onPick={linkTerminvorschlaegeEinladungenUndAntworten}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'personen') {
            return (
              <>
                <RecordHeader title={top.record.fields.vorname ?? appLabel('personen')} subtitle={undefined} />
                <PersonenDetails
                  record={top.record}
                  einladungenUndAntwortenList={data.einladungenUndAntworten}
                  onOpenEinladungenUndAntworten={(r) => detailEinladungenUndAntworten(r, true)}
                  onAddEinladungenUndAntworten={perms.canWrite('einladungen_und_antworten') ? () => setEinladungenUndAntwortenDialog({ defaults: { person: createRecordUrl(APP_IDS.PERSONEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'umfragen') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('umfragen')} subtitle={top.record.fields.antwortfrist ? formatDate(top.record.fields.antwortfrist) : undefined} />
                <UmfragenDetails
                  record={top.record}
                  terminvorschlaegeList={data.terminvorschlaege}
                  onOpenTerminvorschlaege={(r) => detailTerminvorschlaege(r, true)}
                  terminvorschlaegeUmfrageList={data.terminvorschlaege}
                  onOpenTerminvorschlaegeUmfrage={(r) => detailTerminvorschlaege(r, true)}
                  onAddTerminvorschlaegeUmfrage={perms.canWrite('terminvorschlaege') ? () => setTerminvorschlaegeDialog({ defaults: { umfrage: createRecordUrl(APP_IDS.UMFRAGEN, top.record.record_id) } }) : undefined}
                  einladungenUndAntwortenList={data.einladungenUndAntworten}
                  onOpenEinladungenUndAntworten={(r) => detailEinladungenUndAntworten(r, true)}
                  onAddEinladungenUndAntworten={perms.canWrite('einladungen_und_antworten') ? () => setEinladungenUndAntwortenDialog({ defaults: { umfrage: createRecordUrl(APP_IDS.UMFRAGEN, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'terminvorschlaege') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('terminvorschlaege')} subtitle={top.record.fields.beginn ? formatDate(top.record.fields.beginn) : undefined} />
                <TerminvorschlaegeDetails
                  record={top.record}
                  umfragenList={data.umfragen}
                  onOpenUmfragen={(r) => detailUmfragen(r, true)}
                  umfragenGewaehlterTerminList={data.umfragen}
                  onOpenUmfragenGewaehlterTermin={(r) => detailUmfragen(r, true)}
                  onAddUmfragenGewaehlterTermin={perms.canWrite('umfragen') ? () => setUmfragenDialog({ defaults: { gewaehlter_termin: createRecordUrl(APP_IDS.TERMINVORSCHLAEGE, top.record.record_id) } }) : undefined}
                  einladungenUndAntwortenList={data.einladungenUndAntworten}
                  onOpenEinladungenUndAntworten={(r) => detailEinladungenUndAntworten(r, true)}
                  onAddEinladungenUndAntworten={perms.canWrite('einladungen_und_antworten') ? () => setEinladungenUndAntwortenDialog({ defaults: { passende_termine: [createRecordUrl(APP_IDS.TERMINVORSCHLAEGE, top.record.record_id)] } }) : undefined}
                  onPickEinladungenUndAntworten={perms.canWrite('einladungen_und_antworten') ? () => setPickTerminvorschlaegeEinladungenUndAntworten(top.record.record_id) : undefined}
                />
              </>
            );
          }
          if (top.type === 'einladungenUndAntworten') {
            return (
              <>
                <RecordHeader title={appLabel('einladungen_und_antworten')} subtitle={top.record.fields.versanddatum ? formatDate(top.record.fields.versanddatum) : undefined} />
                <EinladungenUndAntwortenDetails
                  record={top.record}
                  personenList={data.personen}
                  onOpenPersonen={(r) => detailPersonen(r, true)}
                  umfragenList={data.umfragen}
                  onOpenUmfragen={(r) => detailUmfragen(r, true)}
                  terminvorschlaegeList={data.terminvorschlaege}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'personen') return perms.canWrite('personen');
          if (top.type === 'umfragen') return perms.canWrite('umfragen');
          if (top.type === 'terminvorschlaege') return perms.canWrite('terminvorschlaege');
          if (top.type === 'einladungenUndAntworten') return perms.canWrite('einladungen_und_antworten');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'personen') setPersonenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'umfragen') setUmfragenDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'terminvorschlaege') setTerminvorschlaegeDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'einladungenUndAntworten') setEinladungenUndAntwortenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    personen: {
      openCreate: (defaults?: PersonenDialogDefaults) => (perms.canWrite('personen') ? setPersonenDialog({ defaults }) : refuse()),
      openEdit: (record: Personen) => (perms.canWrite('personen') ? setPersonenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Personen) => detailPersonen(record, false),
      canWrite: perms.canWrite('personen'),
    },
    umfragen: {
      openCreate: (defaults?: UmfragenDialogDefaults) => (perms.canWrite('umfragen') ? setUmfragenDialog({ defaults }) : refuse()),
      openEdit: (record: Umfragen) => (perms.canWrite('umfragen') ? setUmfragenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Umfragen) => detailUmfragen(record, false),
      canWrite: perms.canWrite('umfragen'),
    },
    terminvorschlaege: {
      openCreate: (defaults?: TerminvorschlaegeDialogDefaults) => (perms.canWrite('terminvorschlaege') ? setTerminvorschlaegeDialog({ defaults }) : refuse()),
      openEdit: (record: Terminvorschlaege) => (perms.canWrite('terminvorschlaege') ? setTerminvorschlaegeDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Terminvorschlaege) => detailTerminvorschlaege(record, false),
      canWrite: perms.canWrite('terminvorschlaege'),
    },
    einladungenUndAntworten: {
      openCreate: (defaults?: EinladungenUndAntwortenDialogDefaults) => (perms.canWrite('einladungen_und_antworten') ? setEinladungenUndAntwortenDialog({ defaults }) : refuse()),
      openEdit: (record: EinladungenUndAntworten) => (perms.canWrite('einladungen_und_antworten') ? setEinladungenUndAntwortenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: EinladungenUndAntworten) => detailEinladungenUndAntworten(record, false),
      canWrite: perms.canWrite('einladungen_und_antworten'),
    },
    enriched: { personen: data.personen, umfragen: enrichedUmfragen, terminvorschlaege: enrichedTerminvorschlaege, einladungenUndAntworten: enrichedEinladungenUndAntworten },
  };
}
