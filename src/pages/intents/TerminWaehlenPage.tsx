/**
 * Termin wählen — 4-Schritt-Wizard zum Abschließen einer Umfrage.
 * Steps: 1) Umfrage wählen → 2) Terminvorschläge mit Zusagen ansehen & Termin übernehmen → 3) Hinweis zum Ergebnis → 4) Prüfen & abschließen.
 * Reads: umfragen, terminvorschlaege (bezeichnung, beginn, ende, anzahl_zusagen). Writes: umfragen (gewaehlter_termin, ergebnis_hinweis, status = abgeschlossen) via useTerminWaehlenFlow.
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IconTrophy } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Button } from '@/components/ui/button';
import { fieldText, fieldNumber, fieldDate, fieldRef } from '@/lib/journey';
import { useTerminWaehlenFlow } from '@/lib/journey/flows/TerminWaehlen';
import { tx } from '@/i18n';

function whenText(start: string | null, end: string | null): string {
  if (!start) return '';
  const s = format(parseISO(start), 'dd.MM.yyyy HH:mm');
  return end ? `${s} – ${format(parseISO(end), 'dd.MM.yyyy HH:mm')}` : s;
}

export default function TerminWaehlenPage() {
  const [step, setStep] = useState(1);
  const flow = useTerminWaehlenFlow({
    steps: { umfragen: 1, gewaehlter_termin: 2, ergebnis_hinweis: 3 },
    items: {
      umfragen: r => ({ id: r.id, title: fieldText(r, 'titel'), subtitle: fieldText(r, 'ort') || undefined }),
      gewaehlter_termin: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: whenText(fieldDate(r, 'beginn'), fieldDate(r, 'ende')),
        stats: [{ label: tx('Zusagen'), value: fieldNumber(r, 'anzahl_zusagen') ?? 0 }],
      }),
    },
  });

  const umfrageId = flow.pick('umfragen').selectedId ?? null;
  const terminPick = flow.picks.gewaehlter_termin;

  // Terminvorschläge der gewählten Umfrage, meiste Zusagen zuerst
  const records = useMemo(() => {
    const own = terminPick.records.filter(r => !umfrageId || fieldRef(r, 'umfrage') === umfrageId);
    return [...own].sort((a, b) => (fieldNumber(b, 'anzahl_zusagen') ?? 0) - (fieldNumber(a, 'anzahl_zusagen') ?? 0));
  }, [terminPick.records, umfrageId]);

  const items = useMemo(() => {
    if (records.length === 0) return terminPick.select.items;
    const order = new Map(records.map((r, i) => [r.id, i]));
    return terminPick.select.items
      .filter(i => order.has(i.id))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [terminPick.select.items, records]);

  const best = records[0];
  const bestCount = best ? fieldNumber(best, 'anzahl_zusagen') ?? 0 : 0;
  const pickTermin = flow.pick('gewaehlter_termin');

  return (
    <IntentWizardShell
      title={tx('Termin wählen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Den Termin mit den meisten Zusagen übernehmen und die Umfrage abschließen.'),
        needs: [tx('Eine laufende Umfrage mit Terminvorschlägen')],
      }}
    >
      <WizardStep label={tx('Umfrage')} description={tx('Welche Umfrage möchtest du abschließen?')}>
        <EntitySelectStep {...flow.picks.umfragen.select} {...flow.pick('umfragen')} searchPlaceholder={tx('Titel suchen …')} />
      </WizardStep>

      <WizardStep
        label={tx('Termin')}
        needs={['umfragen']}
        description={tx('Die Terminvorschläge mit ihren Zusagen — wähle den Gewinner.')}
      >
        <div className="space-y-4">
          {best && bestCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-2xl border bg-card p-4">
              <div className="flex min-w-0 items-center gap-3">
                <IconTrophy size={24} className="shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{fieldText(best, 'bezeichnung')}</p>
                  <p className="text-sm text-muted-foreground">{tx`${bestCount} Zusagen — die meisten`}</p>
                </div>
              </div>
              <Button type="button" onClick={() => { pickTermin.onSelect(best.id); }}>
                {tx('Diesen Termin übernehmen')}
              </Button>
            </div>
          )}
          <EntitySelectStep
            {...terminPick.select}
            items={items}
            onSearch={undefined}
            create={false}
            {...pickTermin}
          />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Hinweis')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Hinweis')} description={tx('Optional: ein Hinweis zum Ergebnis für die Teilnehmenden.')}>
        <div className="space-y-4">
          <Bound form={flow.forms.umfragen} name="ergebnis_hinweis" rows={4} />
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Status'), value: tx('Abgeschlossen') }]}
            whatHappensNext={tx('Die Umfrage wird mit dem gewählten Termin abgeschlossen.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Personen einladen'), href: '#/intents/personen-einladen' },
            { label: tx('Neue Umfrage anlegen'), href: '#/intents/umfrage-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
