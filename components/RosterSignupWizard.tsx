"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, Send } from "lucide-react";
import { ChoiceToggle, Field, SelectField, TextInput } from "@/components/FormControls";
import { LanguageProvider, LanguageSelect, useLanguage } from "@/components/LanguageProvider";
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
  return (
    <LanguageProvider>
      <SignupWizard />
    </LanguageProvider>
  );
}

function SignupWizard() {
  const { t } = useLanguage();
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
  const rawFieldErrors = !validation.ok && errorStep === step ? validation.fieldErrors : {};
  const fieldErrors = Object.fromEntries(Object.entries(rawFieldErrors).map(([key, value]) => [key, t(value)]));

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
        <LanguageSelect />
        <Hero
          title={t("Participation saved")}
          subtitle={t("Your availability, troop readiness, and hero readiness were saved.")}
          pill={submitted.event.name}
        />
        <section className="panel confirmation-panel">
          <CheckCircle2 aria-hidden="true" />
          <h2>{t("All set")}</h2>
          <p>{t("Your event participation entry has been saved successfully.")}</p>
          <Button variant="primary" onClick={reset}>
            {t("Submit another entry")}
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell narrow">
      <LanguageSelect />
      <Hero
        title={ROSTER_CONFIG.appName}
        subtitle={t("Submit your participation for the currently open event.")}
        pill={selectedEvent ? selectedEvent.name : t("Event participation")}
      />

      {statusLoading && (
        <section className="panel state-panel">
          <div className="loading-dot" />
          <h2>{t("Checking active events")}</h2>
          <p>{t("Loading the open event before showing the participation form.")}</p>
        </section>
      )}

      {!statusLoading && !openEvent && (
        <section className="panel state-panel closed">
          <Lock aria-hidden="true" />
          <h2>{t("No events are open")}</h2>
          <p>{t("There are no public participation forms open right now. Check with leadership before trying again.")}</p>
          {message && <div className={`message ${message.type}`}>{t(message.text)}</div>}
        </section>
      )}

      {!statusLoading && openEvent && (
        <>
          <div className="progress-card">
            <div className="progress-label">
              <span>{t("Step {n} of {total}", { n: step + 1, total: stepNames.length })}</span>
              <strong>{t(stepNames[step])}</strong>
            </div>
            <div className="progress-track" aria-label={t("{progress} complete", { progress })}>
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

            {message && <div className={`message ${message.type}`}>{t(message.text)}</div>}

            <div className={cx("wizard-actions", step === 0 && "single")}>
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep((current) => current - 1)} disabled={submitting}>
                  <ChevronLeft aria-hidden="true" />
                  {t("Back")}
                </Button>
              )}
              <Button variant="primary" onClick={goNext} disabled={submitting}>
                {step === stepNames.length - 1 ? (
                  <>
                    <Send aria-hidden="true" />
                    {submitting ? t("Submitting") : t("Submit")}
                  </>
                ) : (
                  <>
                    {t("Next")}
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
  const { t } = useLanguage();

  return (
    <div className="step-stack">
      <StepTitle title={t("Player Information")} />
      <Field label={t("Player Name")} error={errors.playerName}>
        <TextInput value={form.playerName} onChange={(event) => update("playerName", event.target.value)} autoComplete="nickname" />
      </Field>
      <Field label={t("Player ID")} error={errors.playerGameId}>
        <TextInput value={form.playerGameId} onChange={(event) => update("playerGameId", event.target.value)} inputMode="numeric" />
      </Field>
      <Field label={t("Alliance")} error={errors.alliance}>
        <SelectField
          placeholder={t("Choose alliance")}
          value={form.alliance}
          options={ROSTER_CONFIG.alliances.map((alliance) => ({ value: alliance, label: t(alliance) }))}
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
  const { t } = useLanguage();

  return (
    <div className="step-stack">
      <StepTitle title={t("Availability")} note={t("Choose the closest estimate for this event.")} />
      <div className="choice-grid">
        {ROSTER_CONFIG.availabilityOptions.map((option) => (
          <ChoiceToggle key={option} selected={form.availability === option} onClick={() => update("availability", option)}>
            {t(option)}
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
  const { t } = useLanguage();

  return (
    <div className="step-stack">
      <StepTitle title={t("Troops")} />
      <div className="troop-strength-grid">
        <TroopSection
          label={t("Infantry")}
          fcField="infantryFcLevel"
          heliosField="infantryHelios"
          exaltedT12Field="infantryExaltedT12"
          exaltedSkillLevelField="infantryExaltedSkillLevel"
          fcValue={form.infantryFcLevel}
          heliosValue={form.infantryHelios}
          exaltedT12Value={form.infantryExaltedT12}
          exaltedSkillLevelValue={form.infantryExaltedSkillLevel}
          error={errors.infantryFcLevel}
          skillLevelError={errors.infantryExaltedSkillLevel}
          update={update}
        />
        <TroopSection
          label={t("Lancer")}
          fcField="lancerFcLevel"
          heliosField="lancerHelios"
          exaltedT12Field="lancerExaltedT12"
          exaltedSkillLevelField="lancerExaltedSkillLevel"
          fcValue={form.lancerFcLevel}
          heliosValue={form.lancerHelios}
          exaltedT12Value={form.lancerExaltedT12}
          exaltedSkillLevelValue={form.lancerExaltedSkillLevel}
          error={errors.lancerFcLevel}
          skillLevelError={errors.lancerExaltedSkillLevel}
          update={update}
        />
        <TroopSection
          label={t("Marksmen")}
          fcField="marksmenFcLevel"
          heliosField="marksmenHelios"
          exaltedT12Field="marksmenExaltedT12"
          exaltedSkillLevelField="marksmenExaltedSkillLevel"
          fcValue={form.marksmenFcLevel}
          heliosValue={form.marksmenHelios}
          exaltedT12Value={form.marksmenExaltedT12}
          exaltedSkillLevelValue={form.marksmenExaltedSkillLevel}
          error={errors.marksmenFcLevel}
          skillLevelError={errors.marksmenExaltedSkillLevel}
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
  exaltedT12Field,
  exaltedSkillLevelField,
  fcValue,
  heliosValue,
  exaltedT12Value,
  exaltedSkillLevelValue,
  error,
  skillLevelError,
  update
}: {
  label: string;
  fcField: "infantryFcLevel" | "lancerFcLevel" | "marksmenFcLevel";
  heliosField: "infantryHelios" | "lancerHelios" | "marksmenHelios";
  exaltedT12Field: "infantryExaltedT12" | "lancerExaltedT12" | "marksmenExaltedT12";
  exaltedSkillLevelField: "infantryExaltedSkillLevel" | "lancerExaltedSkillLevel" | "marksmenExaltedSkillLevel";
  fcValue: ParticipationForm[typeof fcField];
  heliosValue: boolean;
  exaltedT12Value: boolean;
  exaltedSkillLevelValue: ParticipationForm[typeof exaltedSkillLevelField];
  error?: string;
  skillLevelError?: string;
  update: <K extends keyof ParticipationForm>(key: K, value: ParticipationForm[K]) => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="troop-strength-card">
      <h3>{label}</h3>
      <Field label={t("FC Level")} error={error}>
        <SelectField
          placeholder={t("Choose FC level")}
          value={fcValue}
          options={ROSTER_CONFIG.fcLevels.map((level) => ({ value: level, label: level }))}
          onChange={(event) => update(fcField, event.target.value as ParticipationForm[typeof fcField])}
        />
      </Field>
      <div className="field-block">
        <span className="field-label">Helios?</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={heliosValue} onClick={() => update(heliosField, true)}>
            {t("Yes")}
          </ChoiceToggle>
          <ChoiceToggle selected={!heliosValue} onClick={() => update(heliosField, false)}>
            {t("No")}
          </ChoiceToggle>
        </div>
      </div>
      <div className="field-block">
        <span className="field-label">Exalted T12</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={exaltedT12Value} onClick={() => update(exaltedT12Field, true)}>
            {t("Yes")}
          </ChoiceToggle>
          <ChoiceToggle
            selected={!exaltedT12Value}
            onClick={() => {
              update(exaltedT12Field, false);
              update(exaltedSkillLevelField, "");
            }}
          >
            {t("No")}
          </ChoiceToggle>
        </div>
      </div>
      {exaltedT12Value && (
        <Field label={t("Skill Level")} error={skillLevelError}>
          <SelectField
            placeholder={t("Choose skill level")}
            value={exaltedSkillLevelValue}
            options={ROSTER_CONFIG.exaltedSkillLevels.map((level) => ({ value: level, label: level }))}
            onChange={(event) =>
              update(exaltedSkillLevelField, event.target.value as ParticipationForm[typeof exaltedSkillLevelField])
            }
          />
        </Field>
      )}
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
  const { t } = useLanguage();

  function toggleJoinHero(hero: JoinHeroOption) {
    update("joinHeroes", toggleHeroSelection(form.joinHeroes, hero));
  }

  return (
    <div className="step-stack">
      <HeroChoiceSection
        title={t("Rally / Defense Heroes")}
        subtitle={t("Select all heroes at 4★ with Level 5 Expedition Skill.")}
        options={ROSTER_CONFIG.joinHeroOptions}
        selected={form.joinHeroes}
        onToggle={toggleJoinHero}
      />
      {errors.joinHeroes && <small className="field-error">{errors.joinHeroes}</small>}
      <div className="field-block">
        <span className="field-label">{t("Do you plan to join Voice Call?")}</span>
        <div className="choice-grid two compact-choice-grid">
          <ChoiceToggle selected={form.joinVoiceCall === true} onClick={() => update("joinVoiceCall", true)}>
            {t("Yes")}
          </ChoiceToggle>
          <ChoiceToggle selected={form.joinVoiceCall === false} onClick={() => update("joinVoiceCall", false)}>
            {t("No")}
          </ChoiceToggle>
        </div>
      </div>
    </div>
  );
}

function ReviewStep({ form, event, onEdit }: { form: ParticipationForm; event: RosterEvent | null; onEdit: (step: number) => void }) {
  const { t } = useLanguage();
  const rows = [
    ["Event", event?.name || t("Not selected"), 0],
    ["Player Name", form.playerName, 0],
    ["Player ID", form.playerGameId, 0],
    ["Alliance", form.alliance ? t(form.alliance) : "", 0],
    ["Availability", form.availability ? t(form.availability) : "", 1],
    ["Infantry", troopReview(t, form.infantryFcLevel, form.infantryHelios, form.infantryExaltedT12, form.infantryExaltedSkillLevel), 2],
    ["Lancer", troopReview(t, form.lancerFcLevel, form.lancerHelios, form.lancerExaltedT12, form.lancerExaltedSkillLevel), 2],
    ["Marksmen", troopReview(t, form.marksmenFcLevel, form.marksmenHelios, form.marksmenExaltedT12, form.marksmenExaltedSkillLevel), 2],
    ["Rally / Defense Heroes", heroReview(t, form.joinHeroes), 3],
    ["Voice Call", t(voiceCallSummary(form.joinVoiceCall)), 3]
  ] as const;

  return (
    <div className="step-stack">
      <StepTitle title={t("Review & Submit")} note={t("Check your participation entry before final submission.")} />
      <div className="review-grid">
        {rows.map(([label, value, editStep]) => (
          <div className="kv" key={label}>
            <span>{t(label)}</span>
            <strong>{value}</strong>
            <button type="button" onClick={() => onEdit(editStep)}>
              {t("Edit")}
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

type Translate = (text: string) => string;

function troopReview(t: Translate, fcLevel: string, helios: boolean, exaltedT12: boolean, exaltedSkillLevel: string) {
  const exalted = exaltedT12 ? `${t("Yes")}${exaltedSkillLevel ? ` (${t("Skill")} ${exaltedSkillLevel})` : ""}` : t("No");
  return `${fcLevel || t("Not selected")} / Helios: ${helios ? t("Yes") : t("No")} / Exalted T12: ${exalted}`;
}

function heroReview(t: Translate, heroes: readonly string[]) {
  return heroes.length > 0 ? heroes.join(", ") : t("None selected");
}

function StepTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h2>{title}</h2>
      {note && <p className="step-note">{note}</p>}
    </div>
  );
}
