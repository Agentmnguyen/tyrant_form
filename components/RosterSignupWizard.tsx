"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, Send } from "lucide-react";
import { ChoiceToggle, Field, SelectField, TextInput } from "@/components/FormControls";
import { Button, Hero, cx } from "@/components/ui";
import { NONE_HERO_OPTION, ROSTER_CONFIG, type HeroOption } from "@/lib/rosterConfig";
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

const stepNames = ["Select Event", "Player Info", "Availability", "Troops", "Heroes & Notes", "Review"];

export function RosterSignupWizard() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ParticipationForm>(initialParticipationForm);
  const [message, setMessage] = useState<Message>(null);
  const [errorStep, setErrorStep] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<ParticipationEntry | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [openEvents, setOpenEvents] = useState<RosterEvent[]>([]);

  const selectedEvent = openEvents.find((event) => event.id === form.eventId) || null;
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
          setMessage({ type: "error", text: body.message || "Unable to load open events." });
          return;
        }

        setOpenEvents(body.data.openEvents || []);
      } catch (error) {
        if (active) {
          setMessage({ type: "error", text: error instanceof Error ? error.message : "Unable to load open events." });
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
    setForm(initialParticipationForm);
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
          subtitle="Your availability, troop readiness, hero readiness, and notes were saved."
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
        subtitle="Track player availability, troop readiness, hero readiness, and participation across 1474 events."
        pill={selectedEvent ? selectedEvent.name : "Event participation"}
      />

      {statusLoading && (
        <section className="panel state-panel">
          <div className="loading-dot" />
          <h2>Checking active events</h2>
          <p>Loading open events before showing the participation form.</p>
        </section>
      )}

      {!statusLoading && openEvents.length === 0 && (
        <section className="panel state-panel closed">
          <Lock aria-hidden="true" />
          <h2>No events are open</h2>
          <p>There are no public participation forms open right now. Check with leadership before trying again.</p>
          {message && <div className={`message ${message.type}`}>{message.text}</div>}
        </section>
      )}

      {!statusLoading && openEvents.length > 0 && (
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
              {step === 0 && <EventStep errors={fieldErrors} events={openEvents} selectedEventId={form.eventId} update={update} />}
              {step === 1 && <PlayerInfoStep errors={fieldErrors} form={form} update={update} />}
              {step === 2 && <AvailabilityStep errors={fieldErrors} form={form} update={update} />}
              {step === 3 && <TroopsStep errors={fieldErrors} form={form} update={update} />}
              {step === 4 && <HeroesStep errors={fieldErrors} form={form} update={update} />}
              {step === 5 && <ReviewStep event={selectedEvent} form={form} onEdit={setStep} />}
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

function EventStep({
  events,
  selectedEventId,
  errors,
  update
}: {
  events: RosterEvent[];
  selectedEventId: string;
  errors: Record<string, string>;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  return (
    <div className="step-stack">
      <StepTitle title="Select Event" note="Choose the open event you are submitting participation for." />
      <div className="choice-grid">
        {events.map((event) => (
          <ChoiceToggle key={event.id} selected={selectedEventId === event.id} onClick={() => update("eventId", event.id)}>
            <span>
              <strong>{event.name}</strong>
              <small>{event.eventType}</small>
            </span>
          </ChoiceToggle>
        ))}
      </div>
      {errors.eventId && <small className="field-error">{errors.eventId}</small>}
    </div>
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
  function toggle(hero: HeroOption) {
    update("heroes", toggleHeroSelection(form.heroes, hero));
  }

  return (
    <div className="step-stack">
      <StepTitle title="Available 4★ Heroes" note="Select every listed hero you have at 4 star." />
      <div className="choice-grid">
        {ROSTER_CONFIG.heroOptions.map((hero) => (
          <ChoiceToggle key={hero} selected={form.heroes.includes(hero)} onClick={() => toggle(hero)}>
            {hero}
          </ChoiceToggle>
        ))}
      </div>
      {form.heroes.includes(NONE_HERO_OPTION) && <p className="hint">Selecting None clears all other hero choices.</p>}
      {errors.heroes && <small className="field-error">{errors.heroes}</small>}
      <Field label="Notes" hint="Optional">
        <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={4} />
      </Field>
    </div>
  );
}

function ReviewStep({ form, event, onEdit }: { form: ParticipationForm; event: RosterEvent | null; onEdit: (step: number) => void }) {
  const rows = [
    ["Event", event?.name || "Not selected", 0],
    ["Player Name", form.playerName, 1],
    ["Player ID", form.playerGameId, 1],
    ["Alliance", form.alliance, 1],
    ["Availability", form.availability, 2],
    ["Infantry", troopReview(form.infantryFcLevel, form.infantryHelios), 3],
    ["Lancer", troopReview(form.lancerFcLevel, form.lancerHelios), 3],
    ["Marksmen", troopReview(form.marksmenFcLevel, form.marksmenHelios), 3],
    ["Available 4★ Heroes", form.heroes.join(", "), 4],
    ["Notes", form.notes || "None", 4]
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

function troopReview(fcLevel: string, helios: boolean) {
  return `${fcLevel || "Not selected"} / Helios: ${helios ? "Yes" : "No"}`;
}

function StepTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h2>{title}</h2>
      {note && <p className="step-note">{note}</p>}
    </div>
  );
}
