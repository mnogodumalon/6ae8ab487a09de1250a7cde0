/**
 * Personen einladen — 3-Schritt-Wizard.
 * Steps: 1) Umfrage auswählen → 2) Mehrere Personen aus den Stammdaten einladen → 3) Prüfen & Einladungen anlegen (Umfrage startet).
 * Reads: umfragen, personen, einladungen_und_antworten (bereits Eingeladene).
 * Writes: einladungen_und_antworten (je Person ein Datensatz, Status Offen), umfragen (Status Läuft) — alles über usePersonenEinladenFlow.
 * Composes: IntentWizardShell, EntitySelectStep, ListEntries, Field, StepNav, SummaryStep, SuccessStep.
 */
import { useEffect, useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { ListEntries } from '@/components/blocks/ListEntries';
import { Field } from '@/components/blocks/Field';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup, fieldDate, fieldRef, refFilter } from '@/lib/journey';
import { usePersonenEinladenFlow } from '@/lib/journey/flows/PersonenEinladen';
import { optionsOf } from '@/lib/journey';
import { tx } from '@/i18n';

export default function PersonenEinladenPage() {
  const [step, setStep] = useState(1);
  const [invited, setInvited] = useState<string[]>([]);

  const flow = usePersonenEinladenFlow({
    steps: { umfragen: 1, umfrage: 2, person: 2 },
    items: {
      umfragen: r => ({
        id: r.id,
        title: fieldText(r, 'titel'),
        subtitle: fieldDate(r, 'antwortfrist') ? tx`Antwortfrist ${fieldDate(r, 'antwortfrist') ?? ''}` : undefined,
        status: fieldLookup(r, 'status') ?? undefined,
      } as never),
      person: r => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: [fieldText(r, 'email'), fieldText(r, 'organisation')].filter(Boolean).join(' · '),
      } as never),
    },
  });

  const invitations = flow.forms.einladungen_und_antworten;
  const umfrageId = flow.targets.umfragen.selectedId;
  const umfrageLabel = umfrageId ? flow.picks.umfragen.labelOf(umfrageId) ?? '' : '';
  const editorUmfrage = invitations.get('umfrage');

  // the picked survey is the survey of every invitation — the editor never asks for it again
  useEffect(() => {
    if (umfrageId && editorUmfrage !== umfrageId) invitations.set('umfrage', umfrageId, umfrageLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umfrageId, editorUmfrage]);

  // persons already invited to this survey
  useEffect(() => {
    let on = true;
    setInvited([]);
    if (!umfrageId) return;
    flow.port
      .list('einladungen_und_antworten', { filter: refFilter('umfrage', umfrageId), limit: 500 })
      .then(rs => { if (on) setInvited(rs.map(r => fieldRef(r, 'person')).filter((x): x is string => !!x)); })
      .catch(() => undefined);
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umfrageId]);

  const entries = flow.lists.einladungen_und_antworten.entries as unknown as { values?: Record<string, unknown>; rows: { key: string; value: string }[] }[];

  const checkPersons = (): string | undefined => {
    const ids = entries.map(e => e.values?.person).filter((x): x is string => typeof x === 'string');
    const current = invitations.get('person');
    if (typeof current === 'string' && current) ids.push(current);
    const seen = new Set<string>(invited);
    for (const id of ids) {
      if (seen.has(id)) return tx('Diese Person ist zu dieser Umfrage bereits eingeladen.');
      seen.add(id);
    }
    return undefined;
  };

  const statusLaeuft = optionsOf('umfragen', 'status').find(o => o.key === 'laeuft')?.label ?? '';
  const statusOffen = optionsOf('einladungen_und_antworten', 'einladungsstatus').find(o => o.key === 'offen')?.label ?? '';
  const names = entries.map(e => e.rows.find(r => r.key === 'person')?.value).filter(Boolean).join(', ');

  return (
    <IntentWizardShell
      title={tx('Personen einladen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Lade Personen zu einer Umfrage ein und starte sie.'),
        needs: [tx('Eine angelegte Umfrage'), tx('Personen in den Stammdaten')],
      }}
    >
      <WizardStep label={tx('Umfrage')} description={tx('Zu welcher Umfrage möchtest du einladen?')}>
        <EntitySelectStep {...flow.picks.umfragen.select} {...flow.pick('umfragen')} searchPlaceholder={tx('Titel suchen …')} emptyText={tx('Keine Umfrage im Entwurf oder laufend. Lege zuerst eine Umfrage an.')} />
      </WizardStep>
      <WizardStep label={tx('Personen')} description={tx('Wähle eine Person und füge sie hinzu — so oft du möchtest.')}>
        {umfrageId ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{tx`Umfrage: ${umfrageLabel}`}</p>
            <ListEntries list={flow.lists.einladungen_und_antworten} addLabel={tx('Person hinzufügen')}>
              <Field form={invitations} name="person">
                <EntitySelectStep {...flow.picks.person.select} {...flow.pick('person')} searchPlaceholder={tx('Name oder E-Mail …')} avatar="initials" />
              </Field>
            </ListEntries>
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => checkPersons() ?? flow.validateStep(2)}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>{tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}</StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              { key: 'einladungsstatus', label: tx('Status der Einladungen'), value: statusOffen },
              { key: 'umfragestatus', label: tx('Status der Umfrage'), value: statusLaeuft },
            ]}
            whatHappensNext={tx('Jede Person erhält eine Einladung mit Status Offen, die Umfrage wechselt auf Läuft.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          facts={[
            { label: tx('Eingeladene Personen'), value: names || '—' },
            { label: tx('Einladungsstatus'), value: statusOffen },
          ]}
          next={[
            { label: tx('Termin mit meisten Zusagen wählen'), href: '#/intents/termin-waehlen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
