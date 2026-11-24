/**
 * Mini lecciones de gramática en CATALÁN, explicadas en español neutro.
 * Pensadas para quien ya habla castellano: se centran en lo que cambia respecto
 * al castellano (ser/estar, pronombres febles, artículos, preposiciones, perfecto).
 * Mismo formato que grammarLessons.ts. PENDIENTE DE REVISIÓN POR HABLANTE NATIVO.
 */
import type { GrammarLesson } from "./grammarLessons";

export const GRAMMAR_LESSONS_CA: GrammarLesson[] = [
  {
    id: "ca-ser-estar",
    title: "ser o estar",
    level: "A1",
    errorTypes: ["verb_tense"],
    summary: "En català, ser és per a què és algú o alguna cosa; estar és per a com està o on és.",
    rules: [
      {
        title: "ser: identitat i característiques",
        body: "Fas servir ser per dir qui és algú, la professió, la nacionalitat o una característica estable.",
        examples: [
          { en: "Sóc professor.", es: "Soy profesor." },
          { en: "Ell és de Girona.", es: "Él es de Girona." },
          { en: "La casa és gran.", es: "La casa es grande." },
        ],
      },
      {
        title: "estar: estat i ubicació",
        body: "Fas servir estar per dir com està algú ahora mismo o on és alguna cosa.",
        examples: [
          { en: "Estic cansat.", es: "Estoy cansado." },
          { en: "Som a casa.", es: "Estamos en casa." },
          { en: "Com estàs?", es: "¿Cómo estás?" },
        ],
      },
    ],
    mistakes: [
      { wrong: "Sóc cansat.", right: "Estic cansat.", why: "El cansancio es un estado: estar." },
      { wrong: "Estic professor.", right: "Sóc professor.", why: "La profesión se dice con ser." },
      { wrong: "Ell està de Barcelona.", right: "Ell és de Barcelona.", why: "El origen se dice con ser." },
    ],
    quiz: [
      { q: "“Estoy cansado.”", right: "Estic cansat.", wrong: ["Sóc cansat.", "Ser cansat."] },
      { q: "“Soy profesora.”", right: "Sóc professora.", wrong: ["Estic professora.", "Sóc professor."] },
      { q: "“Estamos en el parque.”", right: "Estem al parc.", wrong: ["Som al parc.", "Estem ser al parc."] },
      { q: "“Mi hermano es alto.”", right: "El meu germà és alt.", wrong: ["El meu germà està alt.", "El meu germà ser alt."] },
    ],
  },
  {
    id: "ca-pronoms-en-hi",
    title: "Els pronoms en i hi",
    level: "A2",
    errorTypes: ["word_order"],
    summary: "En substitueix «de + nom» i hi substitueix un lloc o «a/en + lloc». Van davant del verb.",
    rules: [
      {
        title: "en = de + el que sigui",
        body: "Quan parles d'una quantitat o d'alguna cosa que ja saps, fas servir en. Va just davant del verb.",
        examples: [
          { en: "Tinc cotxe. En tinc un.", es: "Tengo coche. Tengo uno." },
          { en: "N'hi ha molts.", es: "Hay muchos." },
          { en: "No en vull.", es: "No quiero." },
        ],
      },
      {
        title: "hi = a/en + lloc",
        body: "Per no repetir un lloc fas servir hi, també davant del verb.",
        examples: [
          { en: "Vaig a Barcelona demà. Hi vaig demà.", es: "Voy a Barcelona mañana. Voy mañana." },
          { en: "Hi he estat dues vegades.", es: "He estado dos veces (allí)." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Veig-el cada dia.", right: "El veig cada dia.", why: "Els pronoms febles van davant del verb (excepte en l'imperatiu)." },
      { wrong: "Vaig a Madrid i vaig allà.", right: "Vaig a Madrid i hi vaig.", why: "Per no repetir el lloc, fas servir hi." },
      { wrong: "Tinc dos llibres. Tinc dos.", right: "Tinc dos llibres. En tinc dos.", why: "Per substituir «de + nom» fas servir en." },
    ],
    quiz: [
      { q: "“La veo todos los días.”", right: "La veig cada dia.", wrong: ["Veig-la cada dia.", "Veig la cada dia."] },
      { q: "“Voy allí mañana.”", right: "Hi vaig demà.", wrong: ["Vaig-hi demà.", "Vaig allà demà."] },
      { q: "“Tengo muchos amigos.”", right: "Tinc molts amics.", wrong: ["Hi tinc molts amics.", "N'tinc molts amics."] },
      { q: "“No quiero más.”", right: "No en vull més.", wrong: ["No vull més en.", "No hi vull més."] },
    ],
  },
  {
    id: "ca-articles",
    title: "Articles: el, la, l', els, les",
    level: "A1",
    errorTypes: ["article"],
    summary: "Els articles canvien amb el gènere i el nombre, i davant de vocal es fan l'.",
    rules: [
      {
        title: "el, la, els, les",
        body: "El i la són singular, els i les plural. Davant de vocal (i algunes h) es fa l' tant en masculí com en femení.",
        examples: [
          { en: "el cotxe / la casa", es: "el coche / la casa" },
          { en: "l'home / l'escola", es: "el hombre / la escuela" },
          { en: "els amics / les amigues", es: "los amigos / las amigas" },
        ],
      },
      {
        title: "Femení amb a- tònica",
        body: "Algunes paraules femenines que comencen per a- tònica prenen el en singular: l'aigua, l'àguila. En plural tornen a ser les: les aigües.",
        examples: [
          { en: "l'aigua freda", es: "el agua fría" },
          { en: "l'àguila", es: "el águila" },
        ],
      },
    ],
    mistakes: [
      { wrong: "el aigua", right: "l'aigua", why: "Davant d'a- tònica es fa l'." },
      { wrong: "la escola", right: "l'escola", why: "Davant de vocal: l'." },
      { wrong: "Els casa és gran.", right: "La casa és gran.", why: "Casa és femení singular: la." },
    ],
    quiz: [
      { q: "“El agua está fría.”", right: "L'aigua és freda.", wrong: ["El aigua és freda.", "La aigua és freda."] },
      { q: "“Las amigas llegan.”", right: "Les amigues arriben.", wrong: ["Les amiga arriben.", "Els amigues arriben."] },
      { q: "“El autobús llega tarde.”", right: "L'autobús arriba tard.", wrong: ["El autobús arriba tard.", "La autobús arriba tard."] },
      { q: "“La escuela es grande.”", right: "L'escola és gran.", wrong: ["La escola és gran.", "El escola és gran."] },
    ],
  },
  {
    id: "ca-adjectius",
    title: "Concordança dels adjectius",
    level: "A2",
    errorTypes: ["adjective_plural"],
    summary: "L'adjectiu concorda en gènere i nombre amb el nom, i normalment va després.",
    rules: [
      {
        title: "Gènere i nombre",
        body: "Canvia l'adjectiu com el nom: masculí/femení i singular/plural (alt, alta, alts, altes).",
        examples: [
          { en: "un noi alt / una noia alta", es: "un chico alto / una chica alta" },
          { en: "uns nois alts / unes noies altes", es: "unos chicos altos / unas chicas altas" },
        ],
      },
      {
        title: "Normalment després del nom",
        body: "A diferència del castellà, en català el qualificatiu va normalment després del nom.",
        examples: [
          { en: "una casa bonica", es: "una casa bonita" },
          { en: "un problema important", es: "un problema importante" },
        ],
      },
    ],
    mistakes: [
      { wrong: "una casa bonito", right: "una casa bonica", why: "Casa és femení: bonica." },
      { wrong: "uns nois altes", right: "uns nois alts", why: "Nois és masculí plural: alts." },
      { wrong: "un bonic casa", right: "una casa bonica", why: "Gènere i ordre: una casa bonica." },
    ],
    quiz: [
      { q: "“Unos coches rápidos.”", right: "Uns cotxes ràpids.", wrong: ["Uns cotxes ràpides.", "Uns cotxe ràpids."] },
      { q: "“Una ciudad bonita.”", right: "Una ciutat bonica.", wrong: ["Una ciutat bonic.", "Un ciutat bonica."] },
      { q: "“Son muy simpáticas.” (elles)", right: "Són molt simpàtiques.", wrong: ["Són molt simpàtics.", "Són molt simpàtica."] },
      { q: "“Dos problemas importantes.”", right: "Dos problemes importants.", wrong: ["Dos problemes importantes.", "Dues problemes importants."] },
    ],
  },
  {
    id: "ca-preposicions-temps",
    title: "a, en, de: temps i lloc",
    level: "A2",
    errorTypes: ["preposition"],
    summary: "Les preposicions del temps i el lloc no són les del castellà: fixa't en els mesos, les estacions i les hores.",
    rules: [
      {
        title: "Hores i mesos",
        body: "A les hores diem a les cinc. Els mesos i les estacions van amb al/a l'/a la: al maig, a l'agost, a la tardor, a l'hivern.",
        examples: [
          { en: "Ens veiem a les cinc.", es: "Nos vemos a las cinco." },
          { en: "Vaig de vacances al juliol.", es: "Me voy de vacaciones en julio." },
          { en: "Neva a l'hivern.", es: "Nieva en invierno." },
        ],
      },
      {
        title: "Anar a / estar a / viure a",
        body: "Amb ciutats i llocs petits fas servir a: viure a Girona, anar a Madrid. Amb països, en: viure en Espanya (o a Espanya, també és correcte).",
        examples: [
          { en: "Visc a Barcelona.", es: "Vivo en Barcelona." },
          { en: "Som a la feina.", es: "Estamos en el trabajo." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Ens veiem en les cinc.", right: "Ens veiem a les cinc.", why: "Amb hores: a les." },
      { wrong: "Vaig de vacances a juliol.", right: "Vaig de vacances al juliol.", why: "Els mesos porten article: al juliol." },
      { wrong: "Vivo per Barcelona.", right: "Visc a Barcelona.", why: "Viure amb ciutat: a." },
    ],
    quiz: [
      { q: "“Nos vemos a las ocho.”", right: "Ens veiem a les vuit.", wrong: ["Ens veiem en les vuit.", "Ens veiem per les vuit."] },
      { q: "“En verano hace calor.”", right: "A l'estiu fa calor.", wrong: ["En l'estiu fa calor.", "Al estiu fa calor."] },
      { q: "“Vivo en Valencia.”", right: "Visc a València.", wrong: ["Visc en València.", "Visc per València."] },
      { q: "“Nací en mayo.”", right: "Vaig néixer al maig.", wrong: ["Vaig néixer a maig.", "Vaig néixer en maig."] },
    ],
  },
  {
    id: "ca-per-per-a",
    title: "per o per a?",
    level: "B1",
    errorTypes: ["preposition"],
    summary: "Per indica causa o mitjà; per a indica destinatari o finalitat.",
    rules: [
      {
        title: "per: causa, lloc de pas, mitjà",
        body: "Fas servir per per dir per què, per on passes o amb quin mitjà.",
        examples: [
          { en: "Ho he fet per tu.", es: "Lo he hecho por ti." },
          { en: "Passo per la plaça.", es: "Paso por la plaza." },
          { en: "Vaig per tren.", es: "Voy en tren." },
        ],
      },
      {
        title: "per a: destinatari i finalitat",
        body: "Fas servir per a quan algú rep alguna cosa o quan és per a un ús concret.",
        examples: [
          { en: "Aquest regal és per a la mare.", es: "Este regalo es para mamá." },
          { en: "Això és per a estudiar.", es: "Esto es para estudiar." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Aquest regal és per la teva mare.", right: "Aquest regal és per a la teva mare.", why: "Destinatari: per a." },
      { wrong: "Vaig a Madrid per avió.", right: "Vaig a Madrid en avió.", why: "El mitjà de transport es diu en." },
      { wrong: "Ho faig per a estar bé.", right: "Ho faig per estar bé.", why: "Causa o finalitat amb verb: per + infinitiu." },
    ],
    quiz: [
      { q: "“Es para ti.”", right: "És per a tu.", wrong: ["És per tu.", "És a tu."] },
      { q: "“Lo hice por ti.”", right: "Ho vaig fer per tu.", wrong: ["Ho vaig fer per a tu.", "Ho vaig fer a tu."] },
      { q: "“Pasamos por el centro.”", right: "Passem pel centre.", wrong: ["Passem per a el centre.", "Passem al centre per."] },
      { q: "“Vamos en coche.”", right: "Anem en cotxe.", wrong: ["Anem per cotxe.", "Anem a cotxe."] },
    ],
  },
  {
    id: "ca-passat",
    title: "Passat: he fet o vaig fer?",
    level: "B1",
    errorTypes: ["verb_tense"],
    summary: "En català parlat, el passat més usat és la perífrasi amb anar (vaig fer); el perfet (he fet) és més de llibre.",
    rules: [
      {
        title: "vaig + infinitiu (passat del dia a dia)",
        body: "Per parlar d'algú que ja s'ha acabat, en parlar normal fas servir vaig/vas/va + infinitiu.",
        examples: [
          { en: "Ahir vaig anar al cinema.", es: "Ayer fui al cine." },
          { en: "Vam dinar a casa.", es: "Comimos en casa." },
        ],
      },
      {
        title: "he + participi (perfet)",
        body: "Fas servir el perfet per acció recent o que enllaça amb el present. És molt comú en escrit i també en el català oriental.",
        examples: [
          { en: "Avui he dormit poc.", es: "Hoy he dormido poco." },
          { en: "Has estat a Girona?", es: "¿Has estado en Girona?" },
        ],
      },
    ],
    mistakes: [
      { wrong: "Ahir he anat al cinema.", right: "Ahir vaig anar al cinema.", why: "Amb ahir, al parlar: vaig + infinitiu." },
      { wrong: "Ahir vaig ser al cinema.", right: "Ahir vaig anar al cinema.", why: "Anar és el verb de moviment." },
      { wrong: "Vaig fet els deures.", right: "He fet els deures.", why: "Per al perfet: he + participi." },
    ],
    quiz: [
      { q: "“Ayer fui al mercado.”", right: "Ahir vaig anar al mercat.", wrong: ["Ahir he anat al mercat.", "Ahir vaig ser al mercat."] },
      { q: "“He comido ya.”", right: "Ja he menjat.", wrong: ["Ja vaig menjat.", "Ja he menjar."] },
      { q: "“Hemos hablado con ella.”", right: "Hem parlat amb ella.", wrong: ["Hem parlar amb ella.", "Vam parlat amb ella."] },
      { q: "“¿Dónde estuviste ayer?”", right: "On vas estar ahir?", wrong: ["On has estat ahir?", "On vas ser ahir?"] },
    ],
  },
  {
    id: "ca-acabar-tenir-ganes",
    title: "Verbs amb preposició fixa",
    level: "B1",
    errorTypes: ["missing_to_listen", "missing_to"],
    summary: "Alguns verbs porten preposició fixa, d'altres no porten res. Fixa't en: escoltar, pensar en, tenir ganes de, acabar de.",
    rules: [
      {
        title: "Sense preposició",
        body: "Escoltar, mirar, esperar i buscar porten complement directe: escolto música, espero l'autobús, busco les claus.",
        examples: [
          { en: "Escolto música cada dia.", es: "Escucho música cada día." },
          { en: "Espero el tren.", es: "Espero el tren." },
        ],
      },
      {
        title: "Amb preposició",
        body: "Pensar en, parlar de, tenir ganes de i acabar de + infinitiu porten preposició.",
        examples: [
          { en: "Penso en tu.", es: "Pienso en ti." },
          { en: "Tinc ganes de viatjar.", es: "Tengo ganas de viajar." },
          { en: "Acabo d'arribar.", es: "Acabo de llegar." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Escolto a música.", right: "Escolto música.", why: "Escoltar no porta preposició." },
      { wrong: "Tinc ganes a viatjar.", right: "Tinc ganes de viatjar.", why: "Tenir ganes porta de." },
      { wrong: "Acabo arribar.", right: "Acabo d'arribar.", why: "Acabar de + infinitiu." },
    ],
    quiz: [
      { q: "“Escucho la radio.”", right: "Escolto la ràdio.", wrong: ["Escolto a la ràdio.", "Escolto de la ràdio."] },
      { q: "“Tengo ganas de dormir.”", right: "Tinc ganes de dormir.", wrong: ["Tinc ganes a dormir.", "Tinc ganes dormir."] },
      { q: "“Acabo de llegar.”", right: "Acabo d'arribar.", wrong: ["Acabo arribar.", "Acabo a arribar."] },
      { q: "“Hablamos de la película.”", right: "Parlem de la pel·lícula.", wrong: ["Parlem la pel·lícula.", "Parlem a la pel·lícula."] },
    ],
  },
  {
    id: "ca-castellanismes",
    title: "Castellanismes frequents",
    level: "A2",
    errorTypes: ["false_friend"],
    summary: "Paraules que en castellà es diuen d'una manera i en català d'una altra. Són els errors més típics de qui ve del castellà.",
    rules: [
      {
        title: "Les més traïdores",
        body: "Aquestes paraules s'assemblen al castellà però en català són diferents.",
        examples: [
          { en: "got = vaso", es: "vaso (en castellano)" },
          { en: "pollastre = pollo", es: "pollo (en castellano)" },
          { en: "agafar = coger / tomar", es: "coger / tomar (en castellano)" },
          { en: "pissarra = pizarra", es: "pizarra (en castellano)" },
        ],
      },
    ],
    mistakes: [
      { wrong: "Vull un vaso d'aigua.", right: "Vull un got d'aigua.", why: "Vaso = got." },
      { wrong: "Vaig coger el tren.", right: "Vaig agafar el tren.", why: "Coger = agafar." },
      { wrong: "Vaig comprar un pollo.", right: "Vaig comprar un pollastre.", why: "Pollo = pollastre." },
    ],
    quiz: [
      { q: "“Un vaso de agua.”", right: "Un got d'aigua.", wrong: ["Un vaso d'aigua.", "Un tassa d'aigua."] },
      { q: "“Cogí el autobús.”", right: "Vaig agafar l'autobús.", wrong: ["Vaig coger l'autobús.", "Vaig agafar el bus?"] },
      { q: "“Escribo en la pizarra.”", right: "Escric a la pissarra.", wrong: ["Escric a la pizarra.", "Escric al pizarra."] },
      { q: "“Pollo al horno.”", right: "Pollastre al forn.", wrong: ["Pollo al forn.", "Pollastre al horn."] },
    ],
  },
  {
    id: "ca-obligacio",
    title: "Haver de: obligació i consell",
    level: "B1",
    errorTypes: ["missing_to", "verb_tense"],
    summary: "Per dir que cal fer alguna cosa fas servir haver de + infinitiu. Per consell, hauries de.",
    rules: [
      {
        title: "haver de + infinitiu",
        body: "Conjuga haver: he de, has de, ha de, hem de, heu de, han de. Va seguit de l'infinitiu.",
        examples: [
          { en: "Has de venir demà.", es: "Tienes que venir mañana." },
          { en: "Hem de marxar ara.", es: "Tenemos que irnos ahora." },
        ],
      },
      {
        title: "Consell",
        body: "Per donar consell fas servir hauries de (deberías) o podries (podrías).",
        examples: [
          { en: "Hauries de dormir més.", es: "Deberías dormir más." },
          { en: "Podries provar-ho.", es: "Podrías probarlo." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Has venir demà.", right: "Has de venir demà.", why: "Haver de porta de." },
      { wrong: "Hem marxar ara.", right: "Hem de marxar ara.", why: "Obligació: haver de + infinitiu." },
      { wrong: "Hauries dormir més.", right: "Hauries de dormir més.", why: "Hauries de + infinitiu." },
    ],
    quiz: [
      { q: "“Tienes que estudiar.”", right: "Has d'estudiar.", wrong: ["Has estudiar.", "Has de estudiar?"] },
      { q: "“Deberíamos esperar.”", right: "Hauríem d'esperar.", wrong: ["Hauríem esperar.", "Hauríem de esperar?"] },
      { q: "“Tenemos que salir.”", right: "Hem de sortir.", wrong: ["Hem sortir.", "Tenim de sortir."] },
      { q: "“Podrías ayudarme.”", right: "Podries ajudar-me.", wrong: ["Podries de ajudar-me.", "Podries ajudar me."] },
    ],
  },
];

export function getLessonCa(id: string | undefined): GrammarLesson | undefined {
  return GRAMMAR_LESSONS_CA.find((l) => l.id === id);
}

/** Lecciones recomendadas para un tipo de error (la más básica primero). */
export function lessonsForErrorCa(errorType: string): GrammarLesson[] {
  return GRAMMAR_LESSONS_CA.filter((l) => l.errorTypes.includes(errorType));
}
