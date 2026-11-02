import type { Terminvorschlaege, Umfragen, EinladungenUndAntworten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface TerminvorschlaegeDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Terminvorschlaege;
  /** N:1-Ziel „Umfragen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  umfragenList: Umfragen[];
  /** Klick auf die Umfragen-Relation → overlay.push auf dessen Detail. */
  onOpenUmfragen?: (record: Umfragen) => void;
  /** 1:N „Umfragen" (gewaehlter_termin): VOLLE Liste — der Block filtert auf diesen Record. */
  umfragenGewaehlterTerminList: Umfragen[];
  /** Zeilen-Klick → overlay.push auf das Umfragen-Detail (nie der Edit-Dialog). */
  onOpenUmfragenGewaehlterTermin: (record: Umfragen) => void;
  /** Kontextuelles „+": öffnet den Umfragen-Dialog mit diesem Record vorgesetzt. */
  onAddUmfragenGewaehlterTermin?: () => void;
  /** 1:N „Einladungen und Antworten" (passende_termine): VOLLE Liste — der Block filtert auf diesen Record. */
  einladungenUndAntwortenList: EinladungenUndAntworten[];
  /** Zeilen-Klick → overlay.push auf das EinladungenUndAntworten-Detail (nie der Edit-Dialog). */
  onOpenEinladungenUndAntworten: (record: EinladungenUndAntworten) => void;
  /** Kontextuelles „+": öffnet den EinladungenUndAntworten-Dialog mit diesem Record vorgesetzt. */
  onAddEinladungenUndAntworten?: () => void;
  /** „Vorhandene wählen": Listenfeld-Rückbezug — hängt diesen Record an einen bestehenden EinladungenUndAntworten-Datensatz. */
  onPickEinladungenUndAntworten?: () => void;
}

export function TerminvorschlaegeDetails({
  record,
  umfragenList,
  onOpenUmfragen,
  umfragenGewaehlterTerminList,
  onOpenUmfragenGewaehlterTermin,
  onAddUmfragenGewaehlterTermin,
  einladungenUndAntwortenList,
  onOpenEinladungenUndAntworten,
  onAddEinladungenUndAntworten,
  onPickEinladungenUndAntworten,
}: TerminvorschlaegeDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const umfrageTarget = umfragenList.find(r => r.record_id === extractRecordId(record.fields.umfrage));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('terminvorschlaege', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('terminvorschlaege', 'beginn')} value={record.fields.beginn} format="datetime" />
        <RecordField label={fieldLabel('terminvorschlaege', 'ende')} value={record.fields.ende} format="datetime" />
        <RecordField label={fieldLabel('terminvorschlaege', 'anzahl_zusagen')} value={record.fields.anzahl_zusagen} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('terminvorschlaege', 'umfrage')}
          name={umfrageTarget?.fields.titel ?? '—'}
          meta={[umfrageTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={umfrageTarget && onOpenUmfragen ? () => onOpenUmfragen!(umfrageTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('umfragen')} · ${fieldLabel('umfragen', 'gewaehlter_termin')}`}
        items={umfragenGewaehlterTerminList.filter(r => extractRecordId(r.fields.gewaehlter_termin) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('umfragen'), meta: r.fields.antwortfrist })}
        onOpen={onOpenUmfragenGewaehlterTermin}
        onAdd={onAddUmfragenGewaehlterTermin}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('einladungen_und_antworten')}
        items={einladungenUndAntwortenList.filter(r => Array.isArray(r.fields.passende_termine) && r.fields.passende_termine.some((u: unknown) => extractRecordId(u) === record.record_id))}
        map={r => ({ name: appLabel('einladungen_und_antworten'), meta: r.fields.versanddatum })}
        onOpen={onOpenEinladungenUndAntworten}
        onAdd={onAddEinladungenUndAntworten}
        onPick={onPickEinladungenUndAntworten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TERMINVORSCHLAEGE} recordId={record.record_id} readOnly={!perms.canWrite('terminvorschlaege')} />
    </>
  );
}
