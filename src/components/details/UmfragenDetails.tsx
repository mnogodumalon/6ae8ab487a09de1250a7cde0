import type { Umfragen, Terminvorschlaege, EinladungenUndAntworten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface UmfragenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Umfragen;
  /** N:1-Ziel „Terminvorschlaege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  terminvorschlaegeList: Terminvorschlaege[];
  /** Klick auf die Terminvorschlaege-Relation → overlay.push auf dessen Detail. */
  onOpenTerminvorschlaege?: (record: Terminvorschlaege) => void;
  /** 1:N „Terminvorschläge" (umfrage): VOLLE Liste — der Block filtert auf diesen Record. */
  terminvorschlaegeUmfrageList: Terminvorschlaege[];
  /** Zeilen-Klick → overlay.push auf das Terminvorschlaege-Detail (nie der Edit-Dialog). */
  onOpenTerminvorschlaegeUmfrage: (record: Terminvorschlaege) => void;
  /** Kontextuelles „+": öffnet den Terminvorschlaege-Dialog mit diesem Record vorgesetzt. */
  onAddTerminvorschlaegeUmfrage?: () => void;
  /** 1:N „Einladungen und Antworten" (umfrage): VOLLE Liste — der Block filtert auf diesen Record. */
  einladungenUndAntwortenList: EinladungenUndAntworten[];
  /** Zeilen-Klick → overlay.push auf das EinladungenUndAntworten-Detail (nie der Edit-Dialog). */
  onOpenEinladungenUndAntworten: (record: EinladungenUndAntworten) => void;
  /** Kontextuelles „+": öffnet den EinladungenUndAntworten-Dialog mit diesem Record vorgesetzt. */
  onAddEinladungenUndAntworten?: () => void;
}

export function UmfragenDetails({
  record,
  terminvorschlaegeList,
  onOpenTerminvorschlaege,
  terminvorschlaegeUmfrageList,
  onOpenTerminvorschlaegeUmfrage,
  onAddTerminvorschlaegeUmfrage,
  einladungenUndAntwortenList,
  onOpenEinladungenUndAntworten,
  onAddEinladungenUndAntworten,
}: UmfragenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const gewaehlter_terminTarget = terminvorschlaegeList.find(r => r.record_id === extractRecordId(record.fields.gewaehlter_termin));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('umfragen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('umfragen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('umfragen', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('umfragen', 'antwortfrist')} value={record.fields.antwortfrist} format="date" />
        <RecordField label={fieldLabel('umfragen', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('umfragen', 'ergebnis_hinweis')} value={record.fields.ergebnis_hinweis} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('umfragen', 'gewaehlter_termin')}
          name={gewaehlter_terminTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={gewaehlter_terminTarget && onOpenTerminvorschlaege ? () => onOpenTerminvorschlaege!(gewaehlter_terminTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('terminvorschlaege')} · ${fieldLabel('terminvorschlaege', 'umfrage')}`}
        items={terminvorschlaegeUmfrageList.filter(r => extractRecordId(r.fields.umfrage) === record.record_id)}
        map={r => ({ name: r.fields.bezeichnung ?? appLabel('terminvorschlaege'), meta: r.fields.beginn })}
        onOpen={onOpenTerminvorschlaegeUmfrage}
        onAdd={onAddTerminvorschlaegeUmfrage}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('einladungen_und_antworten')}
        items={einladungenUndAntwortenList.filter(r => extractRecordId(r.fields.umfrage) === record.record_id)}
        map={r => ({ name: appLabel('einladungen_und_antworten'), meta: r.fields.versanddatum })}
        onOpen={onOpenEinladungenUndAntworten}
        onAdd={onAddEinladungenUndAntworten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.UMFRAGEN} recordId={record.record_id} readOnly={!perms.canWrite('umfragen')} />
    </>
  );
}
