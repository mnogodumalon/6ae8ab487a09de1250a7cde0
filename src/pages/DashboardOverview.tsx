import { useMemo, useState } from 'react';
import { IconPlus, IconAlertTriangle, IconCalendarEvent, IconCalendarCheck, IconClock } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor } from '@/config/plan';
import { LOOKUP_OPTIONS } from '@/types/app';
import { extractRecordId, extractRecordIds } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { lookupKey } from '@/lib/formatters';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { tx } from '@/i18n';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DashboardGrid } from '@/components/DashboardGrid';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { KanbanWidget, type KanbanCard, type KanbanColumn, type KanbanTone } from '@/components/widgets/KanbanWidget';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';
import type { EnrichedEinladungenUndAntworten } from '@/types/enriched';

// Layout: hero = Umfragen mit abgelaufener Frist ohne gewählten Termin; wide + StatStrip,
// primary = Kanban der Umfragen nach Status (Kanban gewählt, weil Umfragen Phasen durchlaufen),
// aside-Band = offene Einladungen, beste Terminvorschläge, Einladungen nach Status.
// Mobil: Kanban pagt spaltenweise (Widget-intern), Work-Lists stehen davor.
export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { umfragen, terminvorschlaege } = data;
  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'umfragen') return undefined;
      const rec = top.record;
      if (rec.fields.gewaehlter_termin) return undefined;
      const best = bestTermin(rec.record_id);
      if (!best) return undefined;
      const go = flowActionFor('umfragen', 'gewaehlter_termin', rec.record_id, best.id);
      return go ? { label: tx('Termin wählen'), onClick: go } : undefined;
    },
  });
  const einladungen = crud.enriched.einladungenUndAntworten;
  const clock = useClock();
  const today = format(clock, 'yyyy-MM-dd');
  const [filter, setFilter] = useState<'ohneTermin' | null>(null);

  // Zusagen je Termin: aus beantworteten Einladungen gezählt, Feld als Untergrenze
  const zusagen = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of einladungen) {
      if (lookupKey(e.fields.einladungsstatus) !== 'beantwortet') continue;
      for (const id of extractRecordIds(e.fields.passende_termine)) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [einladungen]);

  const termineOf = (umfrageId: string) =>
    terminvorschlaege
      .filter(t => extractRecordId(t.fields.umfrage) === umfrageId)
      .map(t => ({ id: t.record_id, name: t.fields.bezeichnung ?? '', beginn: t.fields.beginn, n: Math.max(zusagen.get(t.record_id) ?? 0, t.fields.anzahl_zusagen ?? 0) }))
      .sort((a, b) => b.n - a.n);
  function bestTermin(umfrageId: string) {
    const list = termineOf(umfrageId);
    return list[0] && list[0].n > 0 ? list[0] : undefined;
  }
  const invitesOf = (umfrageId: string) => einladungen.filter(e => extractRecordId(e.fields.umfrage) === umfrageId);

  const aktiv = umfragen.filter(u => lookupKey(u.fields.status) !== 'abgeschlossen');
  const ohneTermin = aktiv.filter(u => !u.fields.gewaehlter_termin);
  const ueberfaellig = ohneTermin.filter(u => lookupKey(u.fields.status) === 'laeuft' && !!u.fields.antwortfrist && u.fields.antwortfrist.slice(0, 10) < today);
  const laufend = umfragen.filter(u => lookupKey(u.fields.status) === 'laeuft');
  const offene = einladungen.filter(e => {
    if (lookupKey(e.fields.einladungsstatus) !== 'offen') return false;
    const u = umfragen.find(x => x.record_id === extractRecordId(e.fields.umfrage));
    return !!u && lookupKey(u.fields.status) !== 'abgeschlossen';
  });
  const naechsteFrist = laufend
    .filter(u => u.fields.antwortfrist && u.fields.antwortfrist.slice(0, 10) >= today)
    .sort((a, b) => (a.fields.antwortfrist ?? '').localeCompare(b.fields.antwortfrist ?? ''))[0];

  const columns: KanbanColumn[] = (LOOKUP_OPTIONS['umfragen']?.['status'] ?? []).map(o => ({ key: o.key, label: o.label }));
  const cards: KanbanCard[] = umfragen
    .filter(u => filter !== 'ohneTermin' || (!u.fields.gewaehlter_termin && lookupKey(u.fields.status) !== 'abgeschlossen'))
    .map(u => {
      const st = lookupKey(u.fields.status) ?? columns[0]?.key ?? '';
      const inv = invitesOf(u.record_id);
      const beantwortet = inv.filter(e => lookupKey(e.fields.einladungsstatus) !== 'offen').length;
      const late = ueberfaellig.some(x => x.record_id === u.record_id);
      const tone: KanbanTone = late ? 'warning' : st === 'laeuft' ? 'primary' : 'default';
      const parts = [
        u.fields.antwortfrist ? tx`Frist ${formatDate(u.fields.antwortfrist)}` : tx('Ohne Frist'),
        tx`${beantwortet}/${inv.length} Antworten`,
        !u.fields.gewaehlter_termin && st !== 'abgeschlossen' ? tx('Kein Termin gewählt') : '',
      ].filter(Boolean);
      return { id: `umfrage:${u.record_id}`, column: st, title: u.fields.titel ?? tx('Ohne Titel'), subtitle: parts.join(' · '), tone };
    });

  const chartRows: ChartRow<EnrichedEinladungenUndAntworten>[] = einladungen.map(e => ({ id: `einladung:${e.record_id}`, data: e }));

  const sparkNames = namen(ueberfaellig.map(u => u.fields.titel ?? ''));
  const context = (() => {
    if (umfragen.length === 0) return tx('Lege deine erste Terminumfrage an.');
    if (ueberfaellig.length > 0) return tx`${sparkNames}: Frist abgelaufen, noch kein Termin gewählt.`;
    if (naechsteFrist) return tx`Als Nächstes endet die Frist von ${naechsteFrist.fields.titel ?? ''} am ${formatDate(naechsteFrist.fields.antwortfrist)}.`;
    if (offene.length > 0) return tx`${namen(offene.map(e => e.personName))} haben noch nicht geantwortet.`;
    return tx('Alle Umfragen sind auf Kurs.');
  })();

  const chooseFor = (umfrageId: string) => {
    const best = bestTermin(umfrageId);
    const go = best ? flowActionFor('umfragen', 'gewaehlter_termin', umfrageId, best.id) : null;
    return go ?? (() => { const r = umfragen.find(x => x.record_id === umfrageId); if (r) crud.umfragen.openDetail(r); });
  };

  const hero = ueberfaellig.length > 0 ? (
    <HeroBanner
      icon={<IconAlertTriangle size={18} />}
      action={{
        label: bestTermin(ueberfaellig[0].record_id) ? tx('Termin wählen') : tx('Umfrage öffnen'),
        onClick: chooseFor(ueberfaellig[0].record_id),
      }}
    >
      <b>{namen(ueberfaellig.map(u => u.fields.titel ?? ''))}</b>{' '}
      {tx`— Antwortfrist abgelaufen (${formatDate(ueberfaellig[0].fields.antwortfrist)}), aber noch kein Termin gewählt.`}
      {(() => {
        const b = bestTermin(ueberfaellig[0].record_id);
        return b ? ` ${tx`Vorn liegt „${b.name}“ mit ${b.n} Zusagen.`}` : '';
      })()}
    </HeroBanner>
  ) : umfragen.length === 0 && crud.umfragen.canWrite ? (
    <HeroBanner
      icon={<IconCalendarEvent size={48} />}
      action={{ label: tx('Erste Umfrage anlegen'), onClick: () => crud.umfragen.openCreate({ status: 'entwurf' }) }}
    >
      {tx('Noch keine Terminumfrage — lege eine an, schlage Termine vor und lade Personen ein.')}
    </HeroBanner>
  ) : undefined;

  const kpis = umfragen.length > 0 ? (
    <StatStrip>
      <StatStripItem
        title={tx('Laufende Umfragen')}
        value={laufend.length}
        icon={<IconClock size={16} className="text-muted-foreground" />}
      />
      <StatStripItem
        title={tx('Ohne gewählten Termin')}
        value={ohneTermin.length}
        icon={<IconCalendarCheck size={16} className="text-muted-foreground" />}
        tone={ohneTermin.length > 0 ? 'warning' : 'default'}
        onClick={() => setFilter(f => (f === 'ohneTermin' ? null : 'ohneTermin'))}
        active={filter === 'ohneTermin'}
      />
      <StatStripItem
        title={tx('Nächste Frist')}
        value={naechsteFrist ? formatDate(naechsteFrist.fields.antwortfrist) : tx('Keine offen')}
        icon={<IconCalendarEvent size={16} className="text-muted-foreground" />}
      />
    </StatStrip>
  ) : undefined;

  const bestItems = laufend.flatMap(u => {
    const b = termineOf(u.record_id)[0];
    if (!b) return [];
    const total = invitesOf(u.record_id).length;
    const chosen = !!u.fields.gewaehlter_termin;
    const go = chosen || b.n === 0 ? null : flowActionFor('umfragen', 'gewaehlter_termin', u.record_id, b.id);
    return [{
      id: u.record_id,
      title: u.fields.titel ?? '',
      secondLine: (
        <>
          <span className="font-medium text-primary">{tx`${b.n} von ${total} Zusagen`}</span>
          <span className="text-muted-foreground"> · {b.name}{b.beginn ? ` · ${formatDate(b.beginn)}` : ''}</span>
        </>
      ),
      action: go ? { label: tx('Wählen'), onClick: go } : undefined,
    }];
  });

  const aside = (
    <>
      <WorkList
        title={tx('Offene Einladungen')}
        items={offene.map(e => ({
          id: e.record_id,
          title: e.personName,
          secondLine: (
            <>
              <span className="font-medium text-amber-600">{tx('Wartet auf Antwort')}</span>
              <span className="text-muted-foreground"> · {e.umfrageName}</span>
            </>
          ),
          action: crud.einladungenUndAntworten.canWrite
            ? { label: tx('Antwort erfassen'), onClick: () => crud.einladungenUndAntworten.openEdit(e) }
            : undefined,
        }))}
        onItemClick={id => { const r = einladungen.find(x => x.record_id === id); if (r) crud.einladungenUndAntworten.openDetail(r); }}
        empty={{ text: tx('Alle Eingeladenen haben geantwortet.') }}
      />
      <WorkList
        title={tx('Termine mit den meisten Zusagen')}
        items={bestItems}
        onItemClick={id => { const r = umfragen.find(x => x.record_id === id); if (r) crud.umfragen.openDetail(r); }}
        empty={{ text: tx('Sobald Zusagen eingehen, siehst du hier den Favoriten je Umfrage.') }}
      />
      <ChartWidget<EnrichedEinladungenUndAntworten>
        title={tx('Einladungen nach Status')}
        rows={chartRows}
        dimension={{ kind: 'category', accessor: r => r.data.fields.einladungsstatus, label: tx('Status') }}
        tone={seg => (seg.key === 'offen' ? 'warning' : 'default')}
      />
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.umfragen.canWrite && (
          <Button onClick={() => crud.umfragen.openCreate({ status: 'entwurf' })} className="shrink-0">
            <IconPlus size={16} className="shrink-0" />
            {tx('Neue Umfrage')}
          </Button>
        )}
      </div>
      <DashboardGrid
        variant="wide"
        hero={hero}
        kpis={kpis}
        aside={aside}
        primary={
          <KanbanWidget
            cards={cards}
            columns={columns}
            defaultCollapsed={['abgeschlossen']}
            onCardClick={card => {
              const r = umfragen.find(u => u.record_id === card.id.split(':')[1]);
              if (r) crud.umfragen.openDetail(r);
            }}
            onCardMove={(cardId, col) => {
              const go = flowActionFor('umfragen', 'status', cardId.split(':')[1] ?? '', col);
              if (go) { go(); undoToast(tx('Ablauf geöffnet — Statuswechsel dort bestätigen')); }
              return tx('Statuswechsel bitte im Ablauf bestätigen');
            }}
            onAddCard={crud.umfragen.canWrite ? (col => crud.umfragen.openCreate({ status: col })) : undefined}
          />
        }
      />
      {crud.surfaces}
    </div>
  );
}
