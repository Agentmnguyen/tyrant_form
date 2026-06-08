"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, Send } from "lucide-react";
import { ChoiceToggle, Field, SelectField, TextInput } from "@/components/FormControls";
import { Button, Hero, cx } from "@/components/ui";
import { voiceCallSummary } from "@/lib/format";
import { ROSTER_CONFIG, type JoinHeroOption } from "@/lib/rosterConfig";
import {
  initialParticipationForm,
  type ParticipationEntry,
  type ParticipationForm,
  type RosterEvent
} from "@/lib/rosterTypes";
import { toggleHeroSelection, validateForm, validateStep } from "@/lib/rosterValidation";

type Message = {
  type: "error" | "success";
  text: string;
} | null;

const stepNames = ["Player Info", "Availability", "Troops", "Heroes", "Review"];

export function RosterSignupWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ParticipationForm>(initialParticipationForm);
  const [message, setMessage] = useState<Message>(null);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ParticipationEntry | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [openEvent, setOpenEvent] = useState<RosterEvent | null>(null);

  const selectedEvent = openEvent;
  const progress = useMemo(() => `${((Math.min(step + 1, stepNames.length) / stepNames.length) * 100).toFixed(0)}%`, [step]);
  const validation = validateForm(form);
  const fieldErrors = !validation.ok && errorStep === step ? validation.fieldErrors : {};

  useEffect(() => {
    let active = true;

    async function loadOpenEvents() {
      try {
        const response = await fetch("/api/events/open");
        const body = await response.json();

        if (!active) return;

        if (!response.ok || !body.ok) {
          setMessage({ type: "error", text: body.message || "Unable to load the open event." });
          return;
        }

        const currentEvent = body.data.openEvent || null;
        setOpenEvent(currentEvent);
        setForm((current) => ({ ...current, eventId: currentEvent?.id || "" }));
      } catch (error) {
        if (active) {
          setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to load the open event." });
        }
      } finally {
        if (active) {
          setStatusLoading(false);
        }
      }
    }

    void loadOpenEvents();

    return () => {
      active = false;
    };
  }, []);

  function update<K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function goNext() {
    const error = validateStep(step, form);
    setMessage(null);

    if (error) {
      setErrorStep(step);
      setMessage({ type: "error", text: error });
      return;
    }

    setErrorStep(null);

    if (step === stepNames.length - 1) {
      void submit();
      return;
    }

    setStep((current) => current + 1);
  }

  async function submit() {
    const result = validateForm(form);
    setMessage(null);

    if (!result.ok) {
      setErrorStep(step);
      setMessage({ type: "error", text: Object.values(result.fieldErrors)[0] || "Review your participation details." });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data)
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        setMessage({ type: "error", text: body.message || "Unable to submit. Please try again." });
        return;
      }

      setSubmitted(body.data.participationEntry);
      setMessage({ type: "success", text: "Participation saved." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to submit." });
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm({ ...initialParticipationForm, eventId: openEvent?.id || "" });
    setStep(0);
    setSubmitted(null);
    setErrorStep(null);
    setMessage(null);
  }

  if (submitted) {
    return (
      <main className="app-shell narrow">
        <Hero
          title="Participation saved"
          subtitle="Your availability, troop readiness, and hero readiness were saved."
          pill={submitted.event.name}
        />
        <section className="panel confirmation-panel">
          <CheckCircle2 aria-hidden="true" />
          <h2>All set</h2>
          <p>Your event participation entry has been saved successfully.</p>
          <Button variant="primary" onClick={reset}>
            Submit another entry
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell narrow">
      <Hero
        title={ROSTER_CONFIG.appName}
        subtitle="Submit your participation for the currently open event."
        pill={selectedEvent ? selectedEvent.name : "Event participation"}
      />

      {statusLoading && (
        <section className="panel state-panel">
          <div className="loading-dot" />
          <h2>Checking active events</h2>
          <p>Loading the open event before showing the participation form.</p>
        </section>
      )}

      {!statusLoading && !openEvent && (
        <section className="panel state-panel closed">
          <Lock aria-hidden="true" />
          <h2>No events are open</h2>
          <p>There are no public participation forms open right now. Check with leadership before trying again.</p>
          {message && <div className={`message ${message.type}`}>{message.text}</div>}
        </section>
      )}

      {!statusLoading && openEvent && (
        <>
          <div className="progress-card">
            <div className="progress-label">
              <span>Step {step + 1} of {stepNames.length}</span>
              <strong>{stepNames[step]}</strong>
            </div>
            <div className="progress-track" aria-label={`${progress} complete`}>
              <span style={{ width: progress }} />
            </div>
          </div>

          <section className="panel form-panel">
            <div className="step-transition" key={step}>
              {step === 0 && <PlayerInfoStep errors={fieldErrors} form={form} update={update} />}
              {step === 1 && <AvailabilityStep errors={fieldErrors} form={form} update={update} />}
              {step === 2 && <TroopsStep errors={fieldErrors} form={form} update={update} />}
              {step === 3 && <HeroesStep errors={fieldErrors} form={form} update={update} />}
              {step === 4 && <ReviewStep event={selectedEvent} form={form} onEdit={setStep} />}
            </div>

            {message && <div className={`message ${message.type}`}>{message.text}</div>}

            <div className={cx("wizard-actions", step === 0 && "single")}>
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep((current) => current - 1)} disabled={submitting}>
                  <ChevronLeft aria-hidden="true" />
                  Back
                </Button>
              )}
              <Button variant="primary" onClick={goNext} disabled={submitting}>
                {step === stepNames.length - 1 ? (
                  <>
                    <Send aria-hidden="true" />
                    {submitting ? "Submitting" : "Submit"}
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function PlayerInfoStep({
  form,
  errors,
  update
}: {
  form: ParticipationForm;
  errors: Record<string, string>;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <div className="step-stack">
      <StepTitle title="Player Information" />
      <Field label="Player Name" error={errors.playerName}>
        <TextInput value={form.playerName} onChange={(event) => update("playerName", event.target.value)} autoComplete="nickname" />
      </Field>
      <Field label="Player ID" error={errors.playerGameId}>
        <TextInput value={form.playerGameId} onChange={(event) => update("playerGameId", event.target.value)} inputMode="numeric" />
      </Field>
      <Field label="Alliance" error={errors.alliance}>
        <SelectField
          placeholder="Choose alliance"
          value={form.alliance}
          options={ROSTER_CONFIG.alliances.map((alliance) => ({ value: alliance, label: alliance }))}
          onChange={(event) => update("alliance", event.target.value as ParticipationForm["alliance"])}
        />
      </Field>
    </div>
  );
}

function AvailabilityStep({
  form,
  errors,
  update
}: {
  form: ParticipationForm;
  errors: Record<string, string>;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <div className="step-stack">
      <StepTitle title="Availability" note="Choose the closest estimate for this event." />
      <div className="choice-grid">
        {ROSTER_CONFIG.availabilityOptions.map((option) => (
          <ChoiceToggle key={option} selected={form.availability === option} onClick={() => update("availability", option)}>
            {option}
          </ChoiceToggle>
        ))}
      </div>
      {errors.availability && <small className="field-error">{errors.availability}</small>}
    </div>
  );
}

function TroopsStep({
  form,
  errors,
  update
}: {
  form: ParticipationForm;
  errors: Record<string, string>;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <div className="step-stack">
      <StepTitle title="Troops" />
      <div className="troop-strength-grid">
        <TroopSection
          label="Infantry"
          fcField="infantryFcLevel"
          heliosField="infantryHelios"
          fcValue={form.infantryFcLevel}
          heliosValue={form.infantryHelios}
          error={errors.infantryFcLevel}
          update={update}
        />
        <TroopSection
          label="Lancer"
          fcField="lancerFcLevel"
          heliosField="lancerHelios"
          fcValue={form.lancerFcLevel}
          heliosValue={form.lancerHelios}
          error={errors.lancerFcLevel}
          update={update}
        />
        <TroopSection
          label="Marksmen"
          fcField="marksmenFcLevel"
          heliosField="marksmenHelios"
          fcValue={form.marksmenFcLevel}
          heliosValue={form.marksmenHelios}
          error={errors.marksmenFcLevel}
          update={update}
        />
      </div>
    </div>
  );
}

function TroopSection({
  label,
  fcField,
  heliosField,
  fcValue,
  heliosValue,
  error,
  update
}: {
  label: string;
  fcField: "infantryFcLevel" | "lancerFcLevel" | "marksmenFcLevel";
  heliosField: "infantryHelios" | "lancerHelios" | "marksmenHelios";
  fcValue: ParticipationForm[typeof fcField];
  heliosValue: boolean;
  error?: string;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <section className="troop-strength-card">
      <h3>{label}</h3>
      <Field label="FC Level" error={error}>
        <SelectField
          placeholder="Choose FC level"
          value={fcValue}
          options={ROSTER_CONFIG.fcLevels.map((level) => ({ value: level, label: level }))}
          onChange={(event) => update(fcField, event.target.value as ParticipationForm[typeof fcField])}
        />
      </Field>
      <div className="field-block">
        <span className="field-label">Helios?</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={heliosValue} onClick={() => update(heliosField, true)}>
            Yes
          </ChoiceToggle>
          <ChoiceToggle selected={!heliosValue} onClick={() => update(heliosField, false)}>
            No
          </ChoiceToggle>
        </div>
      </div>
    </section>
  );
}

function HeroesStep({
  form,
  errors,
  update
}: {
  form: ParticipationForm;
  errors: Record<string, string>;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  function toggleJoinHero(hero: JoinHeroOption) {
    update("joinHeroes", toggleHeroSelection(form.joinHeroes, hero));
  }

  return (
    <div className="step-stack">
      <HeroChoiceSection
        title="Rally / Defense Heroes"
        subtitle="Select all heroes at 4★ with Level 5 Expedition Skill."
        options={ROSTER_CONFIG.joinHeroOptions}
        selected={form.joinHeroes}
        onToggle={toggleJoinHero}
      />
      {errors.joinHeroes && <small className="field-error">{errors.joinHeroes}</small>}
      <div className="field-block">
        <span className="field-label">Do you plan to join Voice Call?</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={form.joinVoiceCall === true} onClick={() => update("joinVoiceCall", true)}>
            Yes
          </ChoiceToggle>
          <ChoiceToggle selected={form.joinVoiceCall === false} onClick={() => update("joinVoiceCall", false)}>
            No
          </ChoiceToggle>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ form, event, onEdit }: { form: ParticipationForm; event: RosterEvent | null; onEdit: (step: number) => void }) {
  const rows = [
    ["Event", event?.name || "Not selected", 0],
    ["Player Name", form.playerName, 0],
    ["Player ID", form.playerGameId, 0],
    ["Alliance", form.alliance, 0],
    ["Availability", form.availability, 1],
    ["Infantry", troopReview(form.infantryFcLevel, form.infantryHelios), 2],
    ["Lancer", troopReview(form.lancerFcLevel, form.lancerHelios), 2],
    ["Marksmen", troopReview(form.marksmenFcLevel, form.marksmenHelios), 2],
    ["Rally / Defense Heroes", heroReview(form.joinHeroes), 3],
    ["Voice Call", voiceCallSummary(form.joinVoiceCall), 3]
  ] as const;

  return (
    <div className="step-stack">
      <StepTitle title="Review & Submit" note="Check your participation entry before final submission." />
      <div className="review-grid">
        {rows.map(([label, value, editStep]) => (
          <div className="kv" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <button type="button" onClick={() => onEdit(editStep)}>
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroChoiceSection<T extends string>({
  title,
  subtitle,
  options,
  selected,
  onToggle
}: {
  title: string;
  subtitle: string;
  options: readonly T[];
  selected: readonly T[];
  onToggle: (hero: T) => void;
}) {
  return (
    <section className="hero-choice-section">
      <StepTitle title={title} note={subtitle} />
      <div className="choice-grid">
        {options.map((hero) => (
          <ChoiceToggle key={hero} selected={selected.includes(hero)} onClick={() => onToggle(hero)}>
            {hero}
          </ChoiceToggle>
        ))}
      </div>
    </section>
  );
}

function troopReview(fcLevel: string, helios: boolean) {
  return `${fcLevel || "Not selected"} / Helios: ${helios ? "Yes" : "No"}`;
}

function heroReview(heroes: readonly string[]) {
  return heroes.length > 0 ? heroes.join(", ") : "None selected";
}

function StepTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h2>{title}</h2>
      {note && <p className="step-note">{note}</p>}
    </div>
  );
}
