import { useEffect, useMemo, useState } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import {
  useStepForm,
  useJourneySubmit,
  useRecordSearch,
  fieldText,
  fieldDate,
  recordIdOf,
  formatFieldValue,
  nowIso,
} from '@/lib/journey';
import { createPublicPort } from '@/lib/journey/publicPort';
import { IntentWizardShell, type WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Bound } from '@/components/blocks/Bound';
import { Field } from '@/components/blocks/Field';
import { tx } from '@/i18n';

export default function TerminAbstimmen() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig('termin-abstimmen').then(c => {
      setCfg(c);
      setPage(c?.pages['termin-abstimmen'] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return (
    <PublicShell title={page.title} description={page.description}>
      <Wizard cfg={cfg} page={page} />
    </PublicShell>
  );
}

function Wizard({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [step, setStep] = useState(1);
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);

  const f = useStepForm('einladungen_und_antworten', {
    fields: ['umfrage', 'person', 'passende_termine', 'kommentar', 'antwortdatum'],
    required: { umfrage: true, person: true, passende_termine: true, kommentar: false, antwortdatum: false },
    steps: { umfrage: 1, person: 2, passende_termine: 3, kommentar: 3 },
    initial: { antwortdatum: nowIso() },
    autoComplete: true,
  });

  const umfrageId = (f.get('umfrage') as string | null) ?? null;

  const umfragen = useRecordSearch(port, 'umfragen', {
    searchFields: ['titel', 'ort'],
    toItem: r => ({
      id: r.id,
      title: fieldText(r, 'titel'),
      subtitle: [fieldText(r, 'ort'), fieldText(r, 'beschreibung')].filter(Boolean).join(' · ') || undefined,
    }),
  });
  const personen = useRecordSearch(port, 'personen', {
    searchFields: ['vorname', 'nachname'],
    toItem: r => ({ id: r.id, title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim() }),
  });
  const termine = useRecordSearch(port, 'terminvorschlaege', {
    searchFields: ['bezeichnung'],
    where: r => !!umfrageId && recordIdOf(r.fields.umfrage) === umfrageId,
    toItem: r => {
      const von = formatFieldValue('terminvorschlaege', 'beginn', fieldDate(r, 'beginn'));
      const bis = fieldDate(r, 'ende');
      return {
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: bis ? `${von} – ${formatFieldValue('terminvorschlaege', 'ende', bis)}` : von,
      };
    },
  });

  const submit = useJourneySubmit(
    port,
    [{ key: 'antwort', entity: 'einladungen_und_antworten', form: f, primary: true }],
    { draftKey: 'termin-abstimmen' },
  );

  const steps: WizardStep[] = [
    { label: tx('Umfrage'), heading: tx('Welche Umfrage?'), description: tx('Wähle die Umfrage, an der du teilnimmst.') },
    { label: tx('Person'), heading: tx('Wer bist du?'), description: tx('Suche und wähle deinen Namen.') },
    { label: tx('Termine'), heading: tx('Welche Termine passen dir?'), description: tx('Kreuze alle passenden Termine an.') },
    { label: tx('Prüfen') },
  ];

  return (
    <IntentWizardShell
      steps={steps}
      currentStep={step}
      onStepChange={setStep}
      back={false}
      forms={[f]}
      draftKey="termin-abstimmen"
    >
      {step === 1 && (
        <>
          <EntitySelectStep
            {...umfragen.select}
            selectedId={umfrageId}
            onSelect={id => {
              if (id !== umfrageId) f.set('passende_termine', [], undefined);
              f.set('umfrage', id, umfragen.labelOf(id));
            }}
            create={false}
          />
          <StepNav hideBack onNext={() => f.validate(['umfrage'])} nextStepLabel={tx('Person')} />
        </>
      )}
      {step === 2 && (
        <>
          <EntitySelectStep
            {...personen.select}
            avatar="initials"
            selectedId={(f.get('person') as string | null) ?? null}
            onSelect={id => f.set('person', id, personen.labelOf(id))}
            create={false}
          />
          <StepNav onBack={() => setStep(1)} onNext={() => f.validate(['person'])} nextStepLabel={tx('Termine')} />
        </>
      )}
      {step === 3 && (
        <>
          <Field form={f} name="passende_termine" label={tx('Passende Termine')}>
            <EntitySelectStep
              {...termine.select}
              {...f.records('passende_termine', termine.labelOf)}
              avatar="none"
              create={false}
              emptyText={tx('Für diese Umfrage gibt es noch keine kommenden Terminvorschläge.')}
            />
          </Field>
          <Bound form={f} name="kommentar" label={tx('Kommentar')} />
          <StepNav onBack={() => setStep(2)} onNext={() => f.validate(['passende_termine'])} nextStepLabel={tx('Prüfen')} />
        </>
      )}
      {step === 4 && !submit.done && (
        <>
          <SummaryStep
            forms={[f]}
            submit={submit}
            whatHappensNext={tx('Deine Antwort wird gespeichert und der Organisator sieht deine passenden Termine.')}
          />
          <StepNav onBack={() => setStep(3)} hideBack={false} nextDisabled />
        </>
      )}
      {submit.result && <SuccessStep result={submit.result} forms={[f]} submit={submit} />}
    </IntentWizardShell>
  );
}
