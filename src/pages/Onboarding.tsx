import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

function getGoalsForLanguage(lang: "en" | "ca") {
  if (lang === "ca") {
    return [
      { key: "work", label: "Treball i reunions", emoji: "💼" },
      { key: "career", label: "Millor feina", emoji: "🚀" },
      { key: "travel", label: "Viatjar", emoji: "✈️" },
      { key: "exams", label: "Exàmens / certificat", emoji: "🎓" },
      { key: "general", label: "Fluïdesa general", emoji: "💬" },
    ];
  }
  return [
    { key: "work", label: "Work & meetings", emoji: "💼" },
    { key: "career", label: "Get a better job", emoji: "🚀" },
    { key: "travel", label: "Travel", emoji: "✈️" },
    { key: "exams", label: "Exams / certificate", emoji: "🎓" },
    { key: "general", label: "General fluency", emoji: "💬" },
  ];
}

function getLevelsForLanguage(lang: "en" | "ca") {
  if (lang === "ca") {
    return [
      { key: "A1", label: "Acabo de començar" },
      { key: "A2", label: "Frases bàsiques" },
      { key: "B1", label: "Em defenc" },
      { key: "B2", label: "Força còmode" },
      { key: "C1", label: "Força avançat" },
    ];
  }
  return [
    { key: "A1", label: "Just starting" },
    { key: "A2", label: "Basic phrases" },
    { key: "B1", label: "I get by" },
    { key: "B2", label: "Fairly comfortable" },
    { key: "C1", label: "Quite advanced" },
  ];
}

const VARIANTS = [
  { key: "British", label: "British 🇬🇧" },
  { key: "American", label: "American 🇺🇸" },
];

const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "ca", label: "Català" },
];

export default function Onboarding() {
  const { session, refreshProfile } = useAuth();
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
        profile_json: { interests },
      })
      .eq("id", session.user.id);
    await refreshProfile();
    navigate("/diagnostic", { replace: true });
  }

  const steps = [
    {
      title: learningLanguage === "ca"
        ? "Quin idioma vols aprendre?"
        : "What do you want to learn?",
      sub: learningLanguage === "ca"
        ? "Ho pots canviar més tard a Configuració."
        : "You can switch this later in Settings.",
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
      title: learningLanguage === "ca"
        ? "Per què estàs aprenent català?"
        : "Why are you learning English?",
      sub: learningLanguage === "ca"
        ? "Això forma els temes que el teu coach proposa."
        : "This shapes the topics your coach brings up.",
      body: (
        <div className="grid sm:grid-cols-2 gap-3">
          {getGoalsForLanguage(learningLanguage || "en").map((g) => (
            <button
              key={g.key}
              onClick={() => setGoal(g.key)}
              className={`card flex items-center gap-3 px-4 py-4 text-left transition ${
                goal === g.key ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              <span className="text-2xl">{g.emoji}</span>
              <span className="font-medium">{g.label}</span>
            </button>
          ))}
        </div>
      ),
      canNext: !!goal,
    },
    {
      title: learningLanguage === "ca"
        ? "Com t'avalues tu mateix en català?"
        : "How would you rate your English right now?",
      sub: learningLanguage === "ca"
        ? "És una sensació — ho mesurarem bé més tard."
        : "Just a gut feeling — we'll measure it properly next.",
      body: (
        <div className="flex flex-col gap-2">
          {getLevelsForLanguage(learningLanguage || "en").map((l) => (
            <button
              key={l.key}
              onClick={() => setLevel(l.key)}
              className={`card flex items-center justify-between px-4 py-3.5 text-left transition ${
                level === l.key ? "ring-2 ring-coral border-coral" : "hover:border-ink-500"
              }`}
            >
              <span className="font-medium">{l.label}</span>
              <span className="font-mono text-xs text-paper-muted">{l.key}</span>
            </button>
          ))}
        </div>
      ),
      canNext: !!level,
    },
    {
      title: learningLanguage === "ca"
        ? "Quin accent vols?"
        : "Which accent do you want to sound like?",
      sub: learningLanguage === "ca"
        ? "El teu coach usarà aquest variant."
        : "Your coach will lean into this variant.",
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
      title: learningLanguage === "ca"
        ? "De quin tema t'encanta parlar?"
        : "What do you love talking about?",
      sub: learningLanguage === "ca"
        ? "Aficions, treball, el que sigui. El teu coach usa això per fer que les converses semblin teves."
        : "Hobbies, work, anything. Your coach uses this to make conversations feel like yours.",
      body: (
        <textarea
          className="input min-h-[120px] resize-none"
          placeholder={learningLanguage === "ca"
            ? "Ex: Sóc gerent de vendes, dj els cap de setmana, m'encanta el futbol i viatjar…"
            : "e.g. I'm a sales manager, I DJ on weekends, I love football and travelling…"}
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

        <p className="eyebrow mb-2">
          {learningLanguage === "ca" ? "Pas" : "Step"} {step + 1} {learningLanguage === "ca" ? "de" : "of"} {steps.length}
        </p>
        <h1 className="font-display text-3xl font-bold mb-1">{current.title}</h1>
        <p className="text-paper-muted mb-7">{current.sub}</p>

        {current.body}

        <div className="flex justify-between mt-8">
          <button
            className="btn-ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            {learningLanguage === "ca" ? "Enrere" : "Back"}
          </button>
          {isLast ? (
            <button className="btn-coral" onClick={finish} disabled={!current.canNext || busy}>
              {busy
                ? (learningLanguage === "ca" ? "Guardant…" : "Saving…")
                : (learningLanguage === "ca" ? "Fes la prova de nivell →" : "Take the level test →")}
            </button>
          ) : (
            <button
              className="btn-coral"
              onClick={() => setStep((s) => s + 1)}
              disabled={!current.canNext}
            >
              {learningLanguage === "ca" ? "Continua" : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
