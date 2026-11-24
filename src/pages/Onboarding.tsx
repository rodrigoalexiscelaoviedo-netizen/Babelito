import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { tFor } from "../i18n";
import { perLangData } from "../lib/studyLanguage";

const GOAL_KEYS = [
  { key: "work", emoji: "💼" },
  { key: "career", emoji: "🚀" },
  { key: "travel", emoji: "✈️" },
  { key: "exams", emoji: "🎓" },
  { key: "general", emoji: "💬" },
] as const;

const LEVEL_KEYS = ["A1", "A2", "B1", "B2", "C1"] as const;

const VARIANTS = [
  { key: "British", label: "British 🇬🇧" },
  { key: "American", label: "American 🇺🇸" },
];

const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "ca", label: "Català" },
];

export default function Onboarding() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  // Sin default silencioso: el usuario DEBE elegir idioma explícitamente.
  // (Antes arrancaba en "en" y se podía pasar el paso sin tocar nada → quedaba
  //  en inglés sin querer. Fue el bug que encerró a Nadia en el test inglés.)
  const [learningLanguage, setLearningLanguage] = useState<"en" | "ca" | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [variant, setVariant] = useState("British");
  const [interests, setInterests] = useState("");
  const [busy, setBusy] = useState(false);
  // Antes de elegir idioma la pantalla sigue al que se toca; después, al elegido.
  const t = tFor(learningLanguage ?? "en");

  async function finish() {
    if (!session || !learningLanguage) return;
    setBusy(true);
    await supabase
      .from("profiles")
      .update({
        learning_language: learningLanguage,
        learning_goal: goal,
        self_assessed_level: level,
        english_variant: variant,
        onboarding_complete: true,
        profile_json: { ...(profile?.profile_json ?? {}), interests, onboarded: { ...perLangData(profile?.profile_json).onboarded, [learningLanguage]: true } },
      })
      .eq("id", session.user.id);
    await refreshProfile();
    // Si este idioma ya tiene nivel (se estudió antes), no hace falta repetir la prueba.
    const hasLevel = perLangData(profile?.profile_json).levels[learningLanguage] != null;
    navigate(hasLevel ? "/" : "/diagnostic", { replace: true });
  }

  const steps = [
    {
      title: t("onboarding.langTitle"),
      sub: t("onboarding.langSub"),
      body: (
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLearningLanguage(l.key as "en" | "ca")}
              className={`card px-4 py-6 text-center text-lg font-medium transition ${
                learningLanguage === l.key ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      ),
      canNext: !!learningLanguage,
    },
    {
      title: t("onboarding.goalTitle"),
      sub: t("onboarding.goalSub"),
      body: (
        <div className="grid sm:grid-cols-2 gap-3">
          {GOAL_KEYS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGoal(g.key)}
              className={`card flex items-center gap-3 px-4 py-4 text-left transition ${
                goal === g.key ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="font-medium">{t(`onboarding.goals.${g.key}`)}</span>
            </button>
          ))}
        </div>
      ),
      canNext: !!goal,
    },
    {
      title: t("onboarding.levelTitle"),
      sub: t("onboarding.levelSub"),
      body: (
        <div className="flex flex-col gap-2">
          {LEVEL_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => setLevel(key)}
              className={`card flex items-center justify-between px-4 py-3.5 text-left transition ${
                level === key ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              <span className="font-medium">{t(`onboarding.levels.${key}`)}</span>
              <span className="font-mono text-xs text-paper-muted">{key}</span>
            </button>
          ))}
        </div>
      ),
      canNext: !!level,
    },
    {
      title: t("onboarding.accentTitle"),
      sub: t("onboarding.accentSub"),
      // El acento británico/americano es solo para inglés.
      skip: learningLanguage === "ca",
      body: (
        <div className="grid grid-cols-2 gap-3">
          {VARIANTS.map((v) => (
            <button
              key={v.key}
              onClick={() => setVariant(v.key)}
              className={`card px-4 py-6 text-center text-lg font-medium transition ${
                variant === v.key ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      ),
      canNext: !!variant,
    },
    {
      title: t("onboarding.interestsTitle"),
      sub: t("onboarding.interestsSub"),
      body: (
        <textarea
          aria-label={t("onboarding.interestsAria")}
          className="input min-h-[120px] resize-none"
          placeholder={t("onboarding.interestsPlaceholder")}
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
        />
      ),
      canNext: interests.trim().length > 2,
    },
  ].filter((s) => !s.skip);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-up">
        {/* Progreso */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-coral" : "bg-ink-600"
              }`}
            />
          ))}
        </div>

        <p className="eyebrow mb-2">{t("onboarding.stepOf", { i: step + 1, n: steps.length })}</p>
        <h1 className="page-title mb-1">{current.title}</h1>
        <p className="text-paper-muted mb-7">{current.sub}</p>

        {current.body}

        <div className="flex justify-between mt-8">
          <button
            className="btn-ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            {t("onboarding.back")}
          </button>
          {isLast ? (
            <button className="btn-coral" onClick={finish} disabled={!current.canNext || busy}>
              {busy ? t("onboarding.saving") : t("onboarding.takeTest")}
            </button>
          ) : (
            <button
              className="btn-coral"
              onClick={() => setStep((s) => s + 1)}
              disabled={!current.canNext}
            >
              {t("onboarding.next")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
