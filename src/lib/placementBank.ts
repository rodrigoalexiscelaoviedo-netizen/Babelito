/**
 * Banco del test de nivel: 8 ítems por escalón (A1–C1), con 4 formatos:
 * choice (elegir), fix (cuál frase es correcta), listen (escuchar y elegir), visual (emoji).
 * Ver docs/DISENO-test-nivel.md. Los textos del banco están en código porque el test
 * es estable; si crece, se pasan a la base de datos.
 */
import type { PlacementItem } from "./placement";
import type { Level } from "./types";

type Row = [Level, PlacementItem["format"], PlacementItem["skill"], string, string[], number, string?];

function build(prefix: string, rows: Row[]): PlacementItem[] {
  return rows.map(([level, format, skill, a, opts, answer, extra], i) => {
    const item: PlacementItem = {
      id: `${prefix}-${String(i + 1).padStart(2, "0")}`,
      level,
      skill,
      format,
      prompt: a,
      options: opts,
      answer,
    };
    if (format === "listen") item.audio = extra ?? a;
    if (format === "visual") item.visual = extra ?? a;
    return item;
  });
}

// ── Inglés ─────────────────────────────────────────────────────────────────────

export const PLACEMENT_EN: PlacementItem[] = build("en", [
  // A1
  ["A1", "choice", "grammar", "I ___ a teacher.", ["am", "is", "are", "be"], 0],
  ["A1", "choice", "vocab", "The opposite of 'hot' is ___.", ["cold", "tall", "new", "fast"], 0],
  ["A1", "choice", "grammar", "We ___ to school every day.", ["go", "goes", "going", "gone"], 0],
  ["A1", "fix", "grammar", "Which sentence is correct?", ["She like pizza.", "She likes pizza.", "She liking pizza.", "She is like pizza."], 1],
  ["A1", "listen", "listening", "Listen and choose the sentence you hear.", ["I have a red bag.", "I have a red cat.", "I hate a red bag.", "I have a bed bag."], 0, "I have a red bag."],
  ["A1", "listen", "listening", "Listen and choose the sentence you hear.", ["The cat is under the table.", "The cat is on the table.", "The hat is under the table.", "The cat is under the chair."], 0, "The cat is under the table."],
  ["A1", "visual", "visual", "What is this?", ["apple", "banana", "orange", "bread"], 0, "🍎"],
  ["A1", "fix", "grammar", "Which sentence is correct?", ["I am a student.", "I is a student.", "I are a student.", "I be a student."], 0],
  // A2
  ["A2", "choice", "grammar", "I ___ to learn English.", ["need", "need to", "needs", "needing"], 1],
  ["A2", "choice", "grammar", "She is taller ___ her sister.", ["that", "than", "then", "as"], 1],
  ["A2", "choice", "vocab", "We usually ___ breakfast at eight.", ["do", "make", "have", "take"], 2],
  ["A2", "choice", "grammar", "How ___ water do you drink every day?", ["many", "much", "few", "lot"], 1],
  ["A2", "fix", "grammar", "Which sentence is correct?", ["I went to the cinema yesterday.", "I go to the cinema yesterday.", "I going to the cinema yesterday.", "I have went to the cinema yesterday."], 0],
  ["A2", "fix", "grammar", "Which sentence is correct?", ["There are two books on the table.", "There is two books on the table.", "There be two books on the table.", "There are two book on the table."], 0],
  ["A2", "listen", "listening", "Listen and choose the sentence you hear.", ["Can you open the window, please?", "Can you close the window, please?", "Can you open the door, please?", "Can you open the windows, please?"], 0, "Can you open the window, please?"],
  ["A2", "visual", "visual", "What is the weather like?", ["It's sunny.", "It's raining.", "It's snowing.", "It's windy."], 1, "🌧️"],
  // B1
  ["B1", "choice", "grammar", "If I ___ more time, I would travel.", ["have", "had", "will have", "would have"], 1],
  ["B1", "choice", "grammar", "I've lived here ___ 2019.", ["for", "since", "during", "from"], 1],
  ["B1", "choice", "vocab", "Let me ___ you through the report.", ["walk", "pass", "drive", "go"], 0],
  ["B1", "choice", "grammar", "He suggested ___ to the beach.", ["to go", "going", "go", "went"], 1],
  ["B1", "fix", "grammar", "Which sentence is correct?", ["I haven't finished my homework yet.", "I haven't finish my homework yet.", "I didn't finish my homework yet.", "I not finished my homework yet."], 0],
  ["B1", "fix", "grammar", "Which sentence is correct?", ["I'm used to waking up early.", "I'm used to wake up early.", "I used to waking up early.", "I'm use to waking up early."], 0],
  ["B1", "listen", "listening", "Listen and choose the sentence you hear.", ["I was going to call you last week.", "I was going to call you next week.", "I was going to fall you last week.", "I was going to call you last weekend."], 0, "I was going to call you last week."],
  ["B1", "visual", "visual", "What does this show?", ["a calendar", "a map", "a book", "a clock"], 0, "📅"],
  // B2
  ["B2", "choice", "grammar", "By next year, I ___ here for a decade.", ["will work", "will be working", "will have worked", "work"], 2],
  ["B2", "choice", "grammar", "The report ___ by the manager before the meeting.", ["was written", "wrote", "has wrote", "is writing"], 0],
  ["B2", "choice", "vocab", "To 'chase up' something means to:", ["abandon it", "follow up / remind", "speed up", "cancel"], 1],
  ["B2", "choice", "grammar", "I'd rather you ___ me before you decide.", ["told", "tell", "will tell", "telling"], 0],
  ["B2", "fix", "grammar", "Which sentence is correct?", ["She asked me where I lived.", "She asked me where did I live.", "She asked me where I did live.", "She asked me I lived where."], 0],
  ["B2", "fix", "grammar", "Which sentence is correct?", ["Had I known, I would have come.", "Had I knew, I would have come.", "If I had knew, I would have come.", "Had I known, I would come."], 0],
  ["B2", "listen", "listening", "Listen and choose the sentence you hear.", ["Despite the rain, we went for a long walk.", "Because of the rain, we went for a long walk.", "Despite the rain, we stayed at home.", "Despite the train, we went for a long walk."], 0, "Despite the rain, we went for a long walk."],
  ["B2", "visual", "visual", "What is happening?", ["They are arguing.", "They are shaking hands.", "They are running.", "They are sleeping."], 1, "🤝"],
  // C1
  ["C1", "choice", "grammar", "___ harder, she would have passed.", ["If she studied", "Had she studied", "She had studied", "Did she study"], 1],
  ["C1", "choice", "grammar", "Not only ___ late, but he also forgot the documents.", ["he arrived", "did he arrive", "he did arrive", "arrived he"], 1],
  ["C1", "choice", "vocab", "'Ubiquitous' means:", ["very rare", "found everywhere", "dangerous", "extremely old"], 1],
  ["C1", "choice", "vocab", "The plan was ___ at the last minute.", ["scrapped", "scrap", "scrapping", "scrapes"], 0],
  ["C1", "fix", "usage", "Which sentence is correct?", ["At the end of the day, results matter.", "In the end of the day, results matter.", "At the final of the day, results matter.", "By the end of day, results matter."], 0],
  ["C1", "fix", "grammar", "Which sentence is correct?", ["Had she been warned, she would have acted.", "Had she been warn, she would have acted.", "If she was warned, she would have acted.", "Had she been warned, she would act."], 0],
  ["C1", "listen", "listening", "Listen and choose the sentence you hear.", ["The committee's decision was far from unanimous.", "The committee's decision was quite unanimous.", "The committee's decision was far from ruinous.", "The committee's decisions were far from unanimous."], 0, "The committee's decision was far from unanimous."],
  ["C1", "visual", "visual", "This symbol represents:", ["justice", "money", "time", "power"], 0, "⚖️"],
]);

// ── Català ─────────────────────────────────────────────────────────────────────

export const PLACEMENT_CA: PlacementItem[] = build("ca", [
  // A1
  ["A1", "choice", "grammar", "Jo ___ de Barcelona.", ["sóc", "ets", "és", "som"], 0],
  ["A1", "choice", "vocab", "L'antònim de 'gran' és ___.", ["petit", "alt", "llarg", "ample"], 0],
  ["A1", "choice", "grammar", "Ahir ___ al cinema.", ["vaig anar", "vaig anat", "anar", "vaig"], 0],
  ["A1", "fix", "grammar", "Quina frase és correcta?", ["Jo tinc dos germans.", "Jo tinc dues germans.", "Jo soc dos germans.", "Jo té dos germans."], 0],
  ["A1", "listen", "listening", "Escolta i tria la frase que sents.", ["Tinc un gat negre.", "Tinc un gos negre.", "Tinc un gat verd.", "Tinc una gata negra."], 0, "Tinc un gat negre."],
  ["A1", "listen", "listening", "Escolta i tria la frase que sents.", ["La cadira és a la cuina.", "La taula és a la cuina.", "La cadira és al bany.", "La cadira és a la sala."], 0, "La cadira és a la cuina."],
  ["A1", "visual", "visual", "Com es diu?", ["poma", "pera", "taronja", "pa"], 0, "🍎"],
  ["A1", "fix", "grammar", "Quina frase és correcta?", ["Jo sóc estudiant.", "Jo ets estudiant.", "Jo és estudiant.", "Jo som estudiant."], 0],
  // A2
  ["A2", "choice", "grammar", "Jo ___ aprendre català.", ["vull", "vulc", "vol", "volen"], 0],
  ["A2", "choice", "vocab", "Ella ___ els ulls blaus.", ["té", "és", "fa", "va"], 0],
  ["A2", "choice", "usage", "___ molt el cafè.", ["M'agrada", "Em gusta", "Jo agrado", "Me gusta"], 0],
  ["A2", "choice", "grammar", "Ahir ___ a casa a les deu.", ["vaig arribar", "arribava", "arribo", "arribaré"], 0],
  ["A2", "fix", "usage", "Quina frase és natural?", ["Fa molt fred avui.", "Fa molta fred avui.", "Fa molt frio avui.", "Té molt fred avui."], 0],
  ["A2", "fix", "grammar", "Quina frase és correcta?", ["Els meus pares viuen a Girona.", "Els meus pares viu a Girona.", "Els meus pares vivim a Girona.", "Els meus pares vius a Girona."], 0],
  ["A2", "listen", "listening", "Escolta i tria la frase que sents.", ["Vull un cafè amb llet, si us plau.", "Vull un té amb llet, si us plau.", "Vull un cafè sense llet, si us plau.", "Vull un cafè amb pa, si us plau."], 0, "Vull un cafè amb llet, si us plau."],
  ["A2", "visual", "visual", "Quin temps fa?", ["Fa sol.", "Plou.", "Neva.", "Fa vent."], 1, "🌧️"],
  // B1
  ["B1", "choice", "grammar", "Si ___ més temps, viatjaria.", ["tingués", "tindria", "tinc", "tindré"], 0],
  ["B1", "choice", "grammar", "Visc aquí ___ 2019.", ["des de", "durant", "fa", "des"], 0],
  ["B1", "choice", "vocab", "Ens hem ___ a les vuit al bar.", ["quedat", "trobat", "vist", "mirat"], 0],
  ["B1", "choice", "usage", "'Doncs' en català sol significar:", ["encara", "llavors / per tant", "mai", "tanmateix"], 1],
  ["B1", "fix", "grammar", "Quina frase és correcta?", ["Encara no he acabat els deures.", "Encara no he acabat els deures jo.", "Encara no acabat els deures.", "Encara no he acabar els deures."], 0],
  ["B1", "fix", "grammar", "Quina frase és correcta?", ["Espero que surti bé el teu examen.", "Espero que sortirà bé el teu examen.", "Espero que sortís bé el teu examen.", "Espero que surtir bé el teu examen."], 0],
  ["B1", "listen", "listening", "Escolta i tria la frase que sents.", ["Ahir vaig veure una pel·lícula molt bona.", "Ahir vaig veure una pel·lícula molt dolenta.", "Demà vaig veure una pel·lícula molt bona.", "Ahir vaig llegir una pel·lícula molt bona."], 0, "Ahir vaig veure una pel·lícula molt bona."],
  ["B1", "visual", "visual", "Què mostra?", ["un calendari", "un mapa", "un llibre", "un rellotge"], 0, "📅"],
  // B2
  ["B2", "choice", "grammar", "Per l'any que ve, ja ___ aquí durant una dècada.", ["hauré treballat", "treballaré", "treballo", "treballava"], 0],
  ["B2", "choice", "grammar", "Li vaig demanar que ___ la finestra.", ["tanqués", "tanco", "tancaria", "tancat"], 0],
  ["B2", "choice", "vocab", "'Fer un seguiment' vol dir:", ["abandonar-ho", "fer el seguiment / recordar", "accelerar", "cancel·lar"], 1],
  ["B2", "choice", "usage", "En una reunió, la frase més natural és:", ["Vull que tu facis això.", "M'agradaria que t'encarreguessis d'això.", "Jo vull tu fer això.", "Vull que fas això."], 1],
  ["B2", "fix", "grammar", "Quina frase és correcta?", ["Si hagués sabut, hauria vingut.", "Si hagués sabut, vindria.", "Si sabia, hauria vingut.", "Si hauria sabut, hauria vingut."], 0],
  ["B2", "fix", "grammar", "Quina frase és correcta?", ["Malgrat la pluja, vam sortir a caminar.", "Malgrat la pluja, sortim a caminar ahir.", "Per la pluja, vam sortir a caminar.", "Malgrat la pluja, vam sortir caminar."], 0],
  ["B2", "listen", "listening", "Escolta i tria la frase que sents.", ["Han arribat tard perquè hi havia molt trànsit.", "Han arribat aviat perquè hi havia molt trànsit.", "Han arribat tard perquè no hi havia trànsit.", "Han sortit tard perquè hi havia molt trànsit."], 0, "Han arribat tard perquè hi havia molt trànsit."],
  ["B2", "visual", "visual", "Què està passant?", ["Discuteixen.", "Es donen la mà.", "Corren.", "Dormen."], 1, "🤝"],
  // C1
  ["C1", "choice", "grammar", "Si hagués estudiat més, ___.", ["aprovaria", "hauria aprovat", "aproveria", "aprovés"], 1],
  ["C1", "choice", "grammar", "Espero que ___ bé el teu examen.", ["sortís", "sorti", "surti", "surtirà"], 2],
  ["C1", "choice", "vocab", "Una 'objecció justa' és una cosa:", ["completament errònia", "raonable / vàlida", "injusta", "avorrida"], 1],
  ["C1", "choice", "usage", "Va ser una decisió ___ polèmica.", ["força", "forçada", "forçar", "forces"], 0],
  ["C1", "fix", "usage", "Quina frase és correcta?", ["Al cap i a la fi, els resultats importen.", "A la fi del final, els resultats importen.", "Al final del dia, els resultats importen.", "Al cap de la fi, els resultats importen."], 0],
  ["C1", "fix", "grammar", "Quina frase és correcta?", ["Va dir que vindria, però no va venir.", "Va dir que vindrà, però no va venir.", "Va dir que vindria, però no ve.", "Va dir que ve, però no va venir."], 0],
  ["C1", "listen", "listening", "Escolta i tria la frase que sents.", ["La reunió ha estat força productiva, tot i les discrepàncies.", "La reunió ha estat poc productiva, tot i les discrepàncies.", "La reunió ha estat força productiva, sense discrepàncies.", "La reunió ha estat força costosa, tot i les discrepàncies."], 0, "La reunió ha estat força productiva, tot i les discrepàncies."],
  ["C1", "visual", "visual", "Aquest símbol representa:", ["la justícia", "els diners", "el temps", "el poder"], 0, "⚖️"],
]);

export function bankFor(lang: "en" | "ca"): PlacementItem[] {
  return lang === "ca" ? PLACEMENT_CA : PLACEMENT_EN;
}
