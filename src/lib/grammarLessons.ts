/**
 * Mini lecciones de gramática en inglés, explicadas en español neutro.
 * Cada una se asocia a los tipos de error (errorTypes.ts) que el coach detecta,
 * así "My mistakes" puede recomendar la lección justa.
 */
import type { QuizQuestion } from "./situationsData";

export interface GrammarExample {
  en: string;
  es: string;
}

export interface GrammarRule {
  title: string;
  body: string;
  examples: GrammarExample[];
}

export interface CommonMistake {
  wrong: string;
  right: string;
  why: string;
}

export interface GrammarLesson {
  id: string;
  title: string;
  level: "A1" | "A2" | "B1" | "B2";
  /** Claves de ERROR_TYPES que esta lección ayuda a corregir. */
  errorTypes: string[];
  summary: string;
  rules: GrammarRule[];
  mistakes: CommonMistake[];
  quiz: QuizQuestion[];
}

export const GRAMMAR_LESSONS: GrammarLesson[] = [
  {
    id: "subject-pronouns",
    title: "Always say the subject",
    level: "A1",
    errorTypes: ["omitting_subject"],
    summary: "En inglés casi todas las frases llevan sujeto, incluso cuando en español lo omitimos.",
    rules: [
      {
        title: "El sujeto no se omite",
        body: "En español decimos “Es importante” o “Llueve”. En inglés hace falta un sujeto: usa it, there o el pronombre que corresponda.",
        examples: [
          { en: "It is important.", es: "Es importante." },
          { en: "It rains a lot here.", es: "Llueve mucho aquí." },
          { en: "He works in a bank.", es: "Trabaja en un banco." },
        ],
      },
      {
        title: "There is / There are para “hay”",
        body: "Para decir que algo existe o está presente usa there is (singular) o there are (plural).",
        examples: [
          { en: "There is a café near here.", es: "Hay un café cerca de aquí." },
          { en: "There are two bedrooms.", es: "Hay dos habitaciones." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Is possible to pay by card.", right: "It is possible to pay by card.", why: "Falta el sujeto “it”." },
      { wrong: "Is a nice city.", right: "It is a nice city.", why: "El verbo “is” necesita sujeto." },
      { wrong: "Have two bedrooms.", right: "There are two bedrooms.", why: "Para “hay” se usa there is / there are." },
    ],
    quiz: [
      { q: "¿Cuál es correcta para “Es muy tarde”?", right: "It is very late.", wrong: ["Is very late.", "Very late is."] },
      { q: "¿Cuál es correcta para “Hay una farmacia aquí cerca”?", right: "There is a pharmacy near here.", wrong: ["Has a pharmacy near here.", "Is a pharmacy near here."] },
      { q: "¿Cuál es correcta para “Llueve mucho”?", right: "It rains a lot.", wrong: ["Rains a lot.", "Is raining a lot it."] },
      { q: "¿Cuál es correcta para “Trabaja los sábados”?", right: "She works on Saturdays.", wrong: ["Works on Saturdays.", "Is work on Saturdays."] },
    ],
  },
  {
    id: "want-to-verb",
    title: "want / need / like + to + verb",
    level: "A1",
    errorTypes: ["missing_to"],
    summary: "Tras want, need, would like, hope, decide… el verbo siguiente lleva “to”.",
    rules: [
      {
        title: "Verbo + to + infinitivo",
        body: "Después de want, need, would like, hope, plan, decide y try, el segundo verbo va con “to”.",
        examples: [
          { en: "I want to learn English.", es: "Quiero aprender inglés." },
          { en: "She needs to leave early.", es: "Ella necesita irse temprano." },
          { en: "We decided to stay home.", es: "Decidimos quedarnos en casa." },
        ],
      },
      {
        title: "Con can, must, should NO va “to”",
        body: "Los verbos modales (can, could, must, should, will) van seguidos del verbo sin “to”.",
        examples: [
          { en: "I can swim.", es: "Sé nadar." },
          { en: "You should rest.", es: "Deberías descansar." },
        ],
      },
    ],
    mistakes: [
      { wrong: "I need learn more words.", right: "I need to learn more words.", why: "need + to + verbo." },
      { wrong: "I want go home.", right: "I want to go home.", why: "want + to + verbo." },
      { wrong: "I can to swim.", right: "I can swim.", why: "Tras “can” no se usa “to”." },
    ],
    quiz: [
      { q: "“Quiero comprar un billete.”", right: "I want to buy a ticket.", wrong: ["I want buy a ticket.", "I want buying a ticket."] },
      { q: "“Necesito hablar contigo.”", right: "I need to talk to you.", wrong: ["I need talk to you.", "I need to talking you."] },
      { q: "“Puedes entrar.”", right: "You can come in.", wrong: ["You can to come in.", "You can coming in."] },
      { q: "“Esperamos verte pronto.”", right: "We hope to see you soon.", wrong: ["We hope see you soon.", "We hope seeing you soon."] },
    ],
  },
  {
    id: "verb-prepositions",
    title: "Verbs with prepositions",
    level: "A2",
    errorTypes: ["missing_to_listen", "preposition"],
    summary: "Muchos verbos van con una preposición fija que no siempre coincide con el español.",
    rules: [
      {
        title: "listen to, look at, wait for",
        body: "En español “escuchar música” y “esperar el autobús” no llevan preposición. En inglés sí: listen to, wait for, look at, look for.",
        examples: [
          { en: "I listen to music every day.", es: "Escucho música todos los días." },
          { en: "We are waiting for the bus.", es: "Estamos esperando el autobús." },
          { en: "Look at this photo.", es: "Mira esta foto." },
          { en: "I'm looking for my keys.", es: "Estoy buscando mis llaves." },
        ],
      },
      {
        title: "Otros que conviene memorizar",
        body: "depend on (depender de), arrive in/at (llegar a), think about (pensar en), talk to (hablar con), agree with (estar de acuerdo con).",
        examples: [
          { en: "It depends on the weather.", es: "Depende del tiempo." },
          { en: "We arrived in Madrid at noon.", es: "Llegamos a Madrid al mediodía." },
          { en: "I agree with you.", es: "Estoy de acuerdo contigo." },
        ],
      },
    ],
    mistakes: [
      { wrong: "I listen music.", right: "I listen to music.", why: "listen siempre va con “to”." },
      { wrong: "I'm waiting the bus.", right: "I'm waiting for the bus.", why: "wait + for." },
      { wrong: "I'm agree with you.", right: "I agree with you.", why: "agree es un verbo; no se usa “be”." },
    ],
    quiz: [
      { q: "“Estoy buscando mi pasaporte.”", right: "I'm looking for my passport.", wrong: ["I'm looking my passport.", "I'm looking at my passport for."] },
      { q: "“Escucho podcasts en el tren.”", right: "I listen to podcasts on the train.", wrong: ["I listen podcasts on the train.", "I listen at podcasts on the train."] },
      { q: "“Depende de ti.”", right: "It depends on you.", wrong: ["It depends of you.", "It depends you."] },
      { q: "“Estoy de acuerdo.”", right: "I agree.", wrong: ["I am agree.", "I have agree."] },
    ],
  },
  {
    id: "adjectives",
    title: "Adjectives never take -s",
    level: "A1",
    errorTypes: ["adjective_plural"],
    summary: "El adjetivo en inglés no cambia con el plural ni con el género, y va antes del sustantivo.",
    rules: [
      {
        title: "Sin plural, sin género",
        body: "Solo el sustantivo se pluraliza. El adjetivo se queda igual: a big house, two big houses.",
        examples: [
          { en: "They are tall students.", es: "Son estudiantes altos." },
          { en: "She has green eyes.", es: "Ella tiene ojos verdes." },
        ],
      },
      {
        title: "Antes del sustantivo",
        body: "El adjetivo va antes del sustantivo (al revés que en español): a red car, un coche rojo.",
        examples: [
          { en: "I live in a small flat.", es: "Vivo en un piso pequeño." },
          { en: "We saw an interesting film.", es: "Vimos una película interesante." },
        ],
      },
    ],
    mistakes: [
      { wrong: "They are differents.", right: "They are different.", why: "Los adjetivos no llevan -s." },
      { wrong: "I have a car red.", right: "I have a red car.", why: "El adjetivo va antes del sustantivo." },
      { wrong: "Two importants things.", right: "Two important things.", why: "important no se pluraliza." },
    ],
    quiz: [
      { q: "“Tienen coches rápidos.”", right: "They have fast cars.", wrong: ["They have fasts cars.", "They have cars fast."] },
      { q: "“Son muy simpáticos.”", right: "They are very nice.", wrong: ["They are very nices.", "They are very nice ones."] },
      { q: "“Una casa grande.”", right: "A big house.", wrong: ["A house big.", "A bigs house."] },
      { q: "“Dos problemas importantes.”", right: "Two important problems.", wrong: ["Two importants problems.", "Two problems importants."] },
    ],
  },
  {
    id: "false-friends",
    title: "False friends (falsos amigos)",
    level: "A2",
    errorTypes: ["false_friend"],
    summary: "Palabras que se parecen al español pero significan otra cosa.",
    rules: [
      {
        title: "Los más traicioneros",
        body: "Estas palabras parecen españolas, pero no lo son.",
        examples: [
          { en: "actually = en realidad (no “actualmente”: currently)", es: "Actually, I prefer tea. / Currently, I live in Madrid." },
          { en: "embarrassed = avergonzado (no “embarazada”: pregnant)", es: "I was embarrassed. / She is pregnant." },
          { en: "library = biblioteca (no “librería”: bookshop)", es: "I borrow books from the library." },
          { en: "sensible = sensato (no “sensible”: sensitive)", es: "That is a sensible idea." },
          { en: "assist = ayudar (no “asistir a”: attend)", es: "I attend classes on Monday." },
          { en: "realise = darse cuenta (no “realizar”: carry out)", es: "I realised my mistake." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Actually I live in Madrid.", right: "Currently I live in Madrid.", why: "“Actually” significa “en realidad”." },
      { wrong: "I was very embarrassed (para decir “embarazada”).", right: "She is pregnant.", why: "embarrassed = avergonzado." },
      { wrong: "I assist the English class.", right: "I attend the English class.", why: "assist = ayudar." },
    ],
    quiz: [
      { q: "“Actualmente vivo en Barcelona.”", right: "Currently, I live in Barcelona.", wrong: ["Actually, I live in Barcelona.", "Nowadays I am living actually in Barcelona."] },
      { q: "“Voy a clase todos los lunes.” (asistir)", right: "I attend class every Monday.", wrong: ["I assist class every Monday.", "I assist to class every Monday."] },
      { q: "“Compré un libro en la librería.”", right: "I bought a book at the bookshop.", wrong: ["I bought a book at the library.", "I bought a book at the librery."] },
      { q: "“Me dio vergüenza.”", right: "I was embarrassed.", wrong: ["I was embarrased pregnant.", "I felt embarazada."] },
    ],
  },
  {
    id: "have-take-make-do",
    title: "have, take, make, do",
    level: "A2",
    errorTypes: ["meal_verb"],
    summary: "Cuatro verbos muy comunes que forman expresiones fijas.",
    rules: [
      {
        title: "have para comidas",
        body: "Las comidas y bebidas se “tienen”: have breakfast, have lunch, have a coffee.",
        examples: [
          { en: "I have breakfast at eight.", es: "Desayuno a las ocho." },
          { en: "Let's have a coffee.", es: "Tomemos un café." },
        ],
      },
      {
        title: "take, make y do",
        body: "take a shower / a photo / a break; make a decision / a mistake / a plan; do homework / the dishes / a job.",
        examples: [
          { en: "I take a shower every morning.", es: "Me ducho cada mañana." },
          { en: "She made a mistake.", es: "Ella cometió un error." },
          { en: "He does his homework after school.", es: "Hace los deberes después de clase." },
        ],
      },
    ],
    mistakes: [
      { wrong: "I make breakfast at eight.", right: "I have breakfast at eight.", why: "Para tomar una comida se usa have (make = prepararla)." },
      { wrong: "I do a lot of mistakes.", right: "I make a lot of mistakes.", why: "mistake va con make." },
      { wrong: "I make my homework.", right: "I do my homework.", why: "homework va con do." },
    ],
    quiz: [
      { q: "“Cometí un error.”", right: "I made a mistake.", wrong: ["I did a mistake.", "I had a mistake."] },
      { q: "“Hago los deberes por la tarde.”", right: "I do my homework in the afternoon.", wrong: ["I make my homework in the afternoon.", "I take my homework in the afternoon."] },
      { q: "“Almuerzo a las dos.”", right: "I have lunch at two.", wrong: ["I make lunch at two.", "I eat the lunch at two o'clock of."] },
      { q: "“Voy a darme una ducha.”", right: "I'm going to take a shower.", wrong: ["I'm going to make a shower.", "I'm going to do a shower."] },
    ],
  },
  {
    id: "word-order",
    title: "Word order in statements & questions",
    level: "A2",
    errorTypes: ["word_order"],
    summary: "El orden en inglés es fijo: sujeto + verbo + objeto, y las preguntas usan un auxiliar.",
    rules: [
      {
        title: "Afirmaciones: sujeto + verbo + objeto",
        body: "No se puede mover el sujeto al final como en español (“Llegó Ana”).",
        examples: [
          { en: "Ana arrived late.", es: "Llegó Ana tarde." },
          { en: "I like this city a lot.", es: "Me gusta mucho esta ciudad." },
        ],
      },
      {
        title: "Preguntas: palabra interrogativa + auxiliar + sujeto + verbo",
        body: "En las preguntas hace falta do/does/did (o be/can/will) antes del sujeto.",
        examples: [
          { en: "Where do you live?", es: "¿Dónde vives?" },
          { en: "What time does the train leave?", es: "¿A qué hora sale el tren?" },
          { en: "Can you help me?", es: "¿Puedes ayudarme?" },
        ],
      },
    ],
    mistakes: [
      { wrong: "Where you live?", right: "Where do you live?", why: "Falta el auxiliar do." },
      { wrong: "Arrived Ana late.", right: "Ana arrived late.", why: "El sujeto va primero." },
      { wrong: "What means this word?", right: "What does this word mean?", why: "Auxiliar + sujeto + verbo." },
    ],
    quiz: [
      { q: "“¿Dónde trabajas?”", right: "Where do you work?", wrong: ["Where you work?", "Where work you?"] },
      { q: "“¿Qué significa esta palabra?”", right: "What does this word mean?", wrong: ["What means this word?", "What this word means?"] },
      { q: "“¿A qué hora empieza la película?”", right: "What time does the film start?", wrong: ["What time starts the film?", "What time the film starts?"] },
      { q: "“Me encanta la comida italiana.”", right: "I love Italian food.", wrong: ["I love food Italian.", "Love I Italian food."] },
    ],
  },
  {
    id: "past-simple",
    title: "Past simple",
    level: "A2",
    errorTypes: ["verb_tense"],
    summary: "Para acciones terminadas en un momento del pasado: -ed en los regulares y formas propias en los irregulares.",
    rules: [
      {
        title: "Verbos regulares: -ed",
        body: "Añade -ed: work → worked, visit → visited. En negativas y preguntas se usa did + verbo base.",
        examples: [
          { en: "I visited my aunt yesterday.", es: "Visité a mi tía ayer." },
          { en: "Did you work last Sunday?", es: "¿Trabajaste el domingo pasado?" },
          { en: "She didn't call me.", es: "Ella no me llamó." },
        ],
      },
      {
        title: "Irregulares frecuentes",
        body: "go → went, have → had, see → saw, eat → ate, buy → bought, make → made, take → took.",
        examples: [
          { en: "Last weekend I went to the beach.", es: "El fin de semana pasado fui a la playa." },
          { en: "We ate pizza.", es: "Comimos pizza." },
        ],
      },
    ],
    mistakes: [
      { wrong: "Yesterday I go to the cinema.", right: "Yesterday I went to the cinema.", why: "Con “yesterday” va el pasado." },
      { wrong: "We eated pizza.", right: "We ate pizza.", why: "eat es irregular: ate." },
      { wrong: "Did you went there?", right: "Did you go there?", why: "Tras did va el verbo base." },
    ],
    quiz: [
      { q: "“Ayer compré un abrigo.”", right: "Yesterday I bought a coat.", wrong: ["Yesterday I buyed a coat.", "Yesterday I buy a coat."] },
      { q: "“¿Viste la película?”", right: "Did you see the film?", wrong: ["Did you saw the film?", "You saw the film?"] },
      { q: "“No fui a trabajar.”", right: "I didn't go to work.", wrong: ["I didn't went to work.", "I no went to work."] },
      { q: "“Cenamos tarde.”", right: "We had dinner late.", wrong: ["We have dinner late yesterday.", "We haved dinner late."] },
    ],
  },
  {
    id: "present-perfect",
    title: "Present perfect vs past simple",
    level: "B1",
    errorTypes: ["verb_tense"],
    summary: "Present perfect para experiencias y situaciones que conectan con el presente; past simple para un momento concreto.",
    rules: [
      {
        title: "have/has + participio",
        body: "Úsalo para experiencias (ever, never), cambios recientes y cosas que duran hasta ahora (for, since).",
        examples: [
          { en: "I have been to London twice.", es: "He estado en Londres dos veces." },
          { en: "She has lived here for five years.", es: "Ella vive aquí desde hace cinco años." },
          { en: "Have you ever tried sushi?", es: "¿Alguna vez has probado el sushi?" },
        ],
      },
      {
        title: "Con un momento concreto, past simple",
        body: "Si dices cuándo ocurrió (yesterday, last week, in 2020), usa past simple.",
        examples: [
          { en: "I went to London last year.", es: "Fui a Londres el año pasado." },
          { en: "We met in 2019.", es: "Nos conocimos en 2019." },
        ],
      },
    ],
    mistakes: [
      { wrong: "I live here since 2020.", right: "I have lived here since 2020.", why: "since/for + situación que continúa: present perfect." },
      { wrong: "I have seen him yesterday.", right: "I saw him yesterday.", why: "Con “yesterday” se usa past simple." },
      { wrong: "Did you ever go to Italy?", right: "Have you ever been to Italy?", why: "Experiencias de vida: present perfect." },
    ],
    quiz: [
      { q: "“Vivo aquí desde 2018.”", right: "I have lived here since 2018.", wrong: ["I live here since 2018.", "I am living here since 2018."] },
      { q: "“Lo vi ayer.”", right: "I saw him yesterday.", wrong: ["I have seen him yesterday.", "I have saw him yesterday."] },
      { q: "“¿Has estado alguna vez en Roma?”", right: "Have you ever been to Rome?", wrong: ["Did you ever be to Rome?", "Are you ever been to Rome?"] },
      { q: "“No he terminado todavía.”", right: "I haven't finished yet.", wrong: ["I didn't finished yet.", "I don't have finished yet."] },
    ],
  },
  {
    id: "in-on-at",
    title: "in / on / at (time and place)",
    level: "A2",
    errorTypes: ["preposition"],
    summary: "Tres preposiciones, una lógica: de lo más amplio (in) a lo más puntual (at).",
    rules: [
      {
        title: "Tiempo",
        body: "in + meses, años, estaciones, partes del día (in May, in 2024, in the morning). on + días y fechas (on Monday, on 5 May). at + horas y momentos (at 7 o'clock, at night, at the weekend en inglés británico).",
        examples: [
          { en: "My birthday is in May.", es: "Mi cumpleaños es en mayo." },
          { en: "The meeting is on Monday.", es: "La reunión es el lunes." },
          { en: "I wake up at seven.", es: "Me despierto a las siete." },
        ],
      },
      {
        title: "Lugar",
        body: "in + espacios cerrados o ciudades (in the room, in Madrid). on + superficies (on the table). at + puntos concretos (at the station, at home, at work).",
        examples: [
          { en: "She lives in Valencia.", es: "Vive en Valencia." },
          { en: "Your phone is on the table.", es: "Tu móvil está sobre la mesa." },
          { en: "I'll wait for you at the station.", es: "Te espero en la estación." },
        ],
      },
    ],
    mistakes: [
      { wrong: "I'll see you in Monday.", right: "I'll see you on Monday.", why: "Los días llevan on." },
      { wrong: "I arrive on the airport at 5.", right: "I arrive at the airport at 5.", why: "Un punto concreto: at." },
      { wrong: "I was born at 1995.", right: "I was born in 1995.", why: "Los años llevan in." },
    ],
    quiz: [
      { q: "“Nos vemos el viernes.”", right: "See you on Friday.", wrong: ["See you in Friday.", "See you at Friday."] },
      { q: "“Nací en 1998.”", right: "I was born in 1998.", wrong: ["I was born on 1998.", "I was born at 1998."] },
      { q: "“Estoy en casa.”", right: "I'm at home.", wrong: ["I'm in home.", "I'm on home."] },
      { q: "“La clase empieza a las nueve.”", right: "The class starts at nine.", wrong: ["The class starts in nine.", "The class starts on nine."] },
    ],
  },
  {
    id: "articles",
    title: "a / an / the / no article",
    level: "A2",
    errorTypes: ["article"],
    summary: "Cuándo usar a/an, cuándo the y cuándo ningún artículo.",
    rules: [
      {
        title: "a / an: algo nuevo o uno cualquiera",
        body: "Usa a antes de sonido consonante y an antes de sonido vocal. Presenta algo por primera vez o habla de un ejemplo cualquiera.",
        examples: [
          { en: "I have a dog and an umbrella.", es: "Tengo un perro y un paraguas." },
          { en: "She is an engineer.", es: "Ella es ingeniera." },
        ],
      },
      {
        title: "the: algo ya conocido o único",
        body: "Usa the cuando quien escucha sabe de qué hablas, o es único (the sun, the Internet).",
        examples: [
          { en: "I saw a film. The film was great.", es: "Vi una película. La película fue genial." },
          { en: "Close the door, please.", es: "Cierra la puerta, por favor." },
        ],
      },
      {
        title: "Sin artículo",
        body: "No se usa artículo para hablar en general en plural o incontables (I love music), ni con la mayoría de ciudades y países.",
        examples: [
          { en: "I love music.", es: "Me encanta la música." },
          { en: "Life is beautiful.", es: "La vida es bella." },
          { en: "I live in Spain.", es: "Vivo en España." },
        ],
      },
    ],
    mistakes: [
      { wrong: "I love the music.", right: "I love music.", why: "En general no lleva artículo." },
      { wrong: "She is teacher.", right: "She is a teacher.", why: "Las profesiones llevan a/an." },
      { wrong: "I have an umbrella of black.", right: "I have a black umbrella.", why: "Antes de “black” suena consonante: a." },
    ],
    quiz: [
      { q: "“Soy médico.”", right: "I'm a doctor.", wrong: ["I'm doctor.", "I'm the doctor."] },
      { q: "“Me gusta el café.” (en general)", right: "I like coffee.", wrong: ["I like the coffee.", "I like a coffee."] },
      { q: "“Necesito un paraguas.”", right: "I need an umbrella.", wrong: ["I need a umbrella.", "I need umbrella."] },
      { q: "“Cierra la ventana.”", right: "Close the window.", wrong: ["Close window.", "Close a window."] },
    ],
  },
  {
    id: "modals",
    title: "can, could, should, must",
    level: "B1",
    errorTypes: ["verb_tense", "missing_to"],
    summary: "Los verbos modales: habilidad, permiso, consejo y obligación. Siempre seguidos del verbo base.",
    rules: [
      {
        title: "Qué expresa cada uno",
        body: "can/could = habilidad o permiso (could es más cortés); should = consejo; must = obligación fuerte; have to = obligación externa.",
        examples: [
          { en: "Could you open the window?", es: "¿Podrías abrir la ventana?" },
          { en: "You should see a doctor.", es: "Deberías ir al médico." },
          { en: "You must wear a seatbelt.", es: "Debes llevar el cinturón." },
        ],
      },
      {
        title: "Sin -s, sin to",
        body: "Los modales no añaden -s en he/she/it y van seguidos del verbo base sin “to”.",
        examples: [
          { en: "She can speak three languages.", es: "Ella sabe hablar tres idiomas." },
          { en: "He should study more.", es: "Él debería estudiar más." },
        ],
      },
    ],
    mistakes: [
      { wrong: "She cans swim.", right: "She can swim.", why: "Los modales no llevan -s." },
      { wrong: "You should to rest.", right: "You should rest.", why: "Tras should no va “to”." },
      { wrong: "Can you to help me?", right: "Can you help me?", why: "Tras can no va “to”." },
    ],
    quiz: [
      { q: "“Deberías dormir más.”", right: "You should sleep more.", wrong: ["You should to sleep more.", "You should sleeping more."] },
      { q: "“Ella sabe cocinar.”", right: "She can cook.", wrong: ["She cans cook.", "She can to cook."] },
      { q: "“¿Podría ayudarme, por favor?”", right: "Could you help me, please?", wrong: ["Could you to help me, please?", "Could you helping me, please?"] },
      { q: "“No debes fumar aquí.”", right: "You mustn't smoke here.", wrong: ["You mustn't to smoke here.", "You don't must smoke here."] },
    ],
  },
];

export function getLesson(id: string | undefined): GrammarLesson | undefined {
  return GRAMMAR_LESSONS.find((l) => l.id === id);
}

/** Lecciones recomendadas para un tipo de error (la más básica primero). */
export function lessonsForError(errorType: string): GrammarLesson[] {
  return GRAMMAR_LESSONS.filter((l) => l.errorTypes.includes(errorType));
}
