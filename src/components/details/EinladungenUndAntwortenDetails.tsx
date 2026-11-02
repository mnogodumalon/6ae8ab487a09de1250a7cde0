import type { EinladungenUndAntworten, Personen, Umfragen, Terminvorschlaege } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface EinladungenUndAntwortenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: EinladungenUndAntworten;
  /** N:1-Ziel „Personen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  personenList: Personen[];
  /** Klick auf die Personen-Relation → overlay.push auf dessen Detail. */
  onOpenPersonen?: (record: Personen) => void;
  /** N:1-Ziel „Umfragen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  umfragenList: Umfragen[];
  /** Klick auf die Umfragen-Relation → overlay.push auf dessen Detail. */
  onOpenUmfragen?: (record: Umfragen) => void;
  /** N:1-Ziel „Terminvorschlaege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  terminvorschlaegeList: Terminvorschlaege[];
  /** Reserviert — Terminvorschlaege ist hier nur über ein Mehrfach-Feld verknüpft (Text-Join, keine Einzel-Relation); Übergabe erlaubt, aber ohne Wirkung. */
  onOpenTerminvorschlaege?: (record: Terminvorschlaege) => void;
}

export function EinladungenUndAntwortenDetails({
  record,
  personenList,
  onOpenPersonen,
  umfragenList,
  onOpenUmfragen,
  terminvorschlaegeList,
}: EinladungenUndAntwortenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const personTarget = personenList.find(r => r.record_id === extractRecordId(record.fields.person));
  const umfrageTarget = umfragenList.find(r => r.record_id === extractRecordId(record.fields.umfrage));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('einladungen_und_antworten', 'versanddatum')} value={record.fields.versanddatum} format="datetime" />
        <RecordField label={fieldLabel('einladungen_und_antworten', 'antwortlink')} value={record.fields.antwortlink} format="url" />
        <RecordField label={fieldLabel('einladungen_und_antworten', 'einladungsstatus')} value={record.fields.einladungsstatus} format="pill" />
        <RecordField label={fieldLabel('einladungen_und_antworten', 'antwortdatum')} value={record.fields.antwortdatum} format="datetime" />
        <RecordField label={fieldLabel('einladungen_und_antworten', 'kommentar')} value={record.fields.kommentar} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('einladungen_und_antworten', 'ergebnis_versendet')} value={record.fields.ergebnis_versendet} format="bool" />
        <RecordField label={fieldLabel('einladungen_und_antworten', 'passende_termine')} value={Array.isArray(record.fields.passende_termine) ? record.fields.passende_termine.map((u: unknown) => terminvorschlaegeList.find(t => t.record_id === extractRecordId(u))?.fields.bezeichnung ?? '—').join(', ') : null} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={2}>
        <RecordRelation
          label={fieldLabel('einladungen_und_antworten', 'person')}
          name={personTarget?.fields.vorname ?? '—'}
          meta={[personTarget?.fields.email, personTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={personTarget && onOpenPersonen ? () => onOpenPersonen!(personTarget!) : undefined}
        />
        <RecordRelation
          label={fieldLabel('einladungen_und_antworten', 'umfrage')}
          name={umfrageTarget?.fields.titel ?? '—'}
          meta={[umfrageTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={umfrageTarget && onOpenUmfragen ? () => onOpenUmfragen!(umfrageTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.EINLADUNGEN_UND_ANTWORTEN} recordId={record.record_id} readOnly={!perms.canWrite('einladungen_und_antworten')} />
    </>
  );
}
