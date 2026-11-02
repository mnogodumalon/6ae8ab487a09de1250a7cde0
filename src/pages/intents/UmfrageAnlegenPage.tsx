/**
 * Umfrage anlegen — 3-Schritt-Wizard.
 * Steps: 1) Umfrage beschreiben → 2) Terminvorschläge erfassen → 3) Prüfen & speichern.
 * Reads: — (nur Eingaben). Writes: umfragen (Status „Entwurf“), terminvorschlaege (mehrere, verknüpft mit der Umfrage).
 * Composes: IntentWizardShell, Bound, ListEntries, StepNav, SummaryStep, SuccessStep (Hook: useUmfrageAnlegenFlow).
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { ListEntries } from '@/components/blocks/ListEntries';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useUmfrageAnlegenFlow } from '@/lib/journey/flows/UmfrageAnlegen';
import { tx } from '@/i18n';

export default function UmfrageAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useUmfrageAnlegenFlow({
    steps: { titel: 1, beschreibung: 1, ort: 1, antwortfrist: 1, bezeichnung: 2, beginn: 2, ende: 2 },
  });

  return (
    <IntentWizardShell
      title={tx('Umfrage anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Lege eine Terminumfrage an und schlage gleich mehrere Termine vor.'),
        needs: [tx('Titel der Umfrage'), tx('Mögliche Termine mit Beginn und Ende')],
      }}
    >
      <WizardStep label={tx('Umfrage')} description={tx('Worum geht es und bis wann sollen die Gäste antworten?')}>
        <div className="space-y-4">
          <Bound form={flow.forms.umfragen} name="titel" />
          <Bound form={flow.forms.umfragen} name="beschreibung" rows={3} />
          <Bound form={flow.forms.umfragen} name="ort" />
          <Bound form={flow.forms.umfragen} name="antwortfrist" />
          <StepNav hideBack onNext={() => flow.validateStep(1)} nextStepLabel={tx('Terminvorschläge')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Terminvorschläge')} description={tx('Erfasse alle Termine, aus denen die Gäste wählen können.')}>
        <div className="space-y-4">
          <ListEntries list={flow.lists.terminvorschlaege}>
            <Bound form={flow.forms.terminvorschlaege} name="bezeichnung" />
            <Bound form={flow.forms.terminvorschlaege} name="beginn" />
            <Bound form={flow.forms.terminvorschlaege} name="ende" />
          </ListEntries>
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Status'), value: tx('Entwurf') }]}
            whatHappensNext={tx('Die Umfrage wird als Entwurf gespeichert. Danach kannst du Personen einladen.')}
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
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Lade jetzt Personen ein, damit sie ihre Zusagen für die Termine geben können.')}
        />
      )}
    </IntentWizardShell>
  );
}
