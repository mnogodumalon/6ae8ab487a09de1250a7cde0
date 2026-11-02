import type { Personen, EinladungenUndAntworten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface PersonenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Personen;
  /** 1:N „Einladungen und Antworten" (person): VOLLE Liste — der Block filtert auf diesen Record. */
  einladungenUndAntwortenList: EinladungenUndAntworten[];
  /** Zeilen-Klick → overlay.push auf das EinladungenUndAntworten-Detail (nie der Edit-Dialog). */
  onOpenEinladungenUndAntworten: (record: EinladungenUndAntworten) => void;
  /** Kontextuelles „+": öffnet den EinladungenUndAntworten-Dialog mit diesem Record vorgesetzt. */
  onAddEinladungenUndAntworten?: () => void;
}

export function PersonenDetails({
  record,
  einladungenUndAntwortenList,
  onOpenEinladungenUndAntworten,
  onAddEinladungenUndAntworten,
}: PersonenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('personen', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('personen', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('personen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('personen', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('personen', 'organisation')} value={record.fields.organisation} format="text" />
        <RecordField label={fieldLabel('personen', 'notiz')} value={record.fields.notiz} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('einladungen_und_antworten')}
        items={einladungenUndAntwortenList.filter(r => extractRecordId(r.fields.person) === record.record_id)}
        map={r => ({ name: appLabel('einladungen_und_antworten'), meta: r.fields.versanddatum })}
        onOpen={onOpenEinladungenUndAntworten}
        onAdd={onAddEinladungenUndAntworten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.PERSONEN} recordId={record.record_id} readOnly={!perms.canWrite('personen')} />
    </>
  );
}
