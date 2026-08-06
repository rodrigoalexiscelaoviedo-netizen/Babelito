/**
 * Seed script: inserta contenido catalán en Supabase
 * - 15 historias (stories)
 * - ~80 chunks (diálogos extraídos)
 * - 200 palabras (user_vocabulary)
 * - 12 sounds + 10 patrones listening (hardcoded en TS, no BD)
 *
 * Uso: npx ts-node src/scripts/seed-catalan.ts
 */

import { createClient } from "@supabase/supabase-js";

// Read from .env or pass via environment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  throw new Error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─────────────────────────────────────────────────────────────────────────
// STORIES (15 historias catalanas)
// ─────────────────────────────────────────────────────────────────────────
const catalanStories = [
  {
    title: "El Café de la Marina",
    level: "A2",
    language: "ca",
    topic: "daily_life",
    content:
      "En Tomás viu a prop de la platja, a Barcelona. Cada matí va al café de la Marina per prendre's un cafè. L'amo del café es dona Maria, que és molt amable. Avui Tomás arriba al café i veu que hi ha una nena petita que dibuixa. Maria li diu: 'Aquesta és la meva néta, s'anomena Clara.' Tomás s'asseu a la taula del costat i comença a parlar amb Clara sobre els seus dibuixos. Clara li mostra un quadre de la platja amb peixos de colors. Tomás pensa que és molt bonic. Després, Maria porta dos cafès i un suc de taronja per a Clara. Tots es riuen i passen una hora molt agradable junts.",
    questions: [
      {
        question: "Donde viu en Tomàs?",
        options: [
          "A prop de la muntanya",
          "A prop de la platja",
          "A prop del centre de Barcelona",
        ],
        correct: 1,
      },
      {
        question: "Com es diu la néta de Maria?",
        options: ["Clara", "Carme", "Carlota"],
        correct: 0,
      },
      {
        question: "Què dibuixa Clara?",
        options: ["Un gat", "La platja amb peixos", "Un cotxe"],
        correct: 1,
      },
      {
        question: "Quant de temps passen junts?",
        options: ["Deu minuts", "Una hora", "Tres hores"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "La Festa de Barri",
    level: "A2",
    language: "ca",
    topic: "celebrations",
    content:
      "Dissabte és la festa de barri al carrer Principal. Els veïns preparen taules amb menjar, decoracions de colors i música. La Maria i en Joan ajuden a portar cadires i taules. Els nens juguen a la plaça. Arriba el migdia i comença la festa. Tots mengen butifarres, escalivada i coca de recapte. Després, hi ha una competició de ball. En Joan balla amb la Maria i totes les persones criden i aplaudeixen. Al final, encenen els llums decoratius de nit i és tot molt màgic. En Joan li diu a la Maria: 'Ha sigut el millor dia de l'any!'",
    questions: [
      {
        question: "Quin dia és la festa?",
        options: ["Divendres", "Dissabte", "Diumenge"],
        correct: 1,
      },
      {
        question: "Quins aliments mengen?",
        options: [
          "Pizza i pasta",
          "Butifarres, escalivada i coca",
          "Hamburgueses",
        ],
        correct: 1,
      },
      {
        question: "Qui balla a la competició?",
        options: ["En Joan i la Maria", "Els nens", "Els músics"],
        correct: 0,
      },
      {
        question: "Com acaba la festa?",
        options: [
          "S'apaguen els llums",
          "Encenen llums decoratius",
          "Plou i es cancel·la",
        ],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "La Visita al Mercat",
    level: "A2",
    language: "ca",
    topic: "shopping",
    content:
      "Cada divendres al matí, la Mireia va al mercat de Sant Antoni. Avui busca fruita fresca per fer un postres. Parla amb el venedor de fruita: 'Quin fressals teniu avui?' El venedor li mostra uns fressals molt vermells. 'Són de la comarca', li diu. La Mireia en compra un quilo. Després va a la parada de formatge. La venedora li ofereix tastar un formatge de cabra. 'Mmm, deliciós!', exclama la Mireia. Compra 200 grams. Finalment torna a casa amb una bossa plena de productes frescos. Pensa que el mercat és el millor lloc per trobar coses bones.",
    questions: [
      {
        question: "On va la Mireia?",
        options: [
          "Al supermercat",
          "Al mercat de Sant Antoni",
          "A la botiga de fruita",
        ],
        correct: 1,
      },
      {
        question: "Quina fruita compra?",
        options: ["Pomes", "Fressals", "Taronges"],
        correct: 1,
      },
      {
        question: "Quin formatge tasca?",
        options: ["De vaca", "De cabra", "De ovella"],
        correct: 1,
      },
      {
        question: "Quant formatge compra?",
        options: ["100 grams", "200 grams", "500 grams"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "El Viatge a Montserrat",
    level: "A2",
    language: "ca",
    topic: "travel",
    content:
      "En Pere i la seva família fan una excursió a Montserrat. Prenen el tren des de Barcelona. Quan arriben a dalt, veuen les roques grandioses que semblen tocar el cel. Els nens criden 'Uau!' i corren per explorar. Visiten el monestir i escolten música de l'orquestra. Després mengen en una taverna i proben coca amb tomàquet. La mare de Pere li diu: 'Tenim sort de viure aquí prop'. En Pere pensa que Montserrat és el lloc més bonic que ha vist mai. Quan tornen a casa, tots diuen que ha sigut una gran aventura.",
    questions: [
      {
        question: "Com arriben a Montserrat?",
        options: ["En cotxe", "En autobús", "En tren"],
        correct: 2,
      },
      {
        question: "Què veuen al monestir?",
        options: ["Penjols", "L'orquestra", "Monges"],
        correct: 1,
      },
      {
        question: "Quina menjar proben?",
        options: ["Pa amb tomàquet", "Coca amb tomàquet", "Ensalada"],
        correct: 1,
      },
      {
        question: "Com es sent en Pere al final?",
        options: ["Cansat", "Amoïnat", "Feliç per l'aventura"],
        correct: 2,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "El Projecte de Treball",
    level: "B1",
    language: "ca",
    topic: "work",
    content:
      "En Carles treballa en una empresa de disseny. Avui el seu jefe li encarrega un projecte nou: crear el logo d'una startup de tecnologia. En Carles s'estira en la cadira del despatx i comença a pensar. Dibuixa diversos esbossos al seu quadern. Els primers esborranys no li semblen bons. Decideix parlar amb els seus companys. Un d'ells suggereix combinar formes geomètriques amb colors moderns. En Carles agafa la idea i comença a treballar en l'ordenador. Després de tres hores, ha creat un logo que li agrada molt. Envia el disseny al seu jefe. L'endemà, el jefe li diu: 'Excelent treball, En Carles!' La satisfacció que sent és enorme.",
    questions: [
      {
        question: "Quin és el treball d'en Carles?",
        options: ["Programador", "Dissenyador", "Escritor"],
        correct: 1,
      },
      {
        question: "Quina és la tasca que li encargo el jefe?",
        options: ["Crear un web", "Crear un logo", "Editar un vídeo"],
        correct: 1,
      },
      {
        question: "Amb qui parla en Carles per tenir idees?",
        options: [
          "Amb el seu jefe",
          "Amb els seus companys",
          "Amb el client",
        ],
        correct: 1,
      },
      {
        question: "Quant temps treballa en el disseny?",
        options: ["Una hora", "Dues hores", "Tres hores"],
        correct: 2,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "L'Amitstat Inesperada",
    level: "A2",
    language: "ca",
    topic: "friendship",
    content:
      "En Sergi és tímid i no parla gaire en classe. Un dia es tomba la seva motxilla i els seus llibres cauen al terra. Una nena, la Sònia, l'ajuda a recollir-los. Ella li diu: 'No et preocupis, a mi també se'm cau tot!' En Sergi somriu. Els dos comencen a parlar sobre les seves aficions: els dos estimem les pel·lícules de ciència-ficció. Després d'aquest dia, es fan inseparables. Sempre mengen junts al pati, veuen pel·lícules els dissabtes i fins i tot fan tasques junts. Una setmana la Sònia li diu: 'Ets el millor amic que he tingut mai.' En Sergi se sent molt feliç. Pensa que a vegades una petita ajuda pot canviar la teva vida.",
    questions: [
      {
        question: "Per què el Sergi es tomba la motxilla?",
        options: ["La Sònia la tira", "Per accident", "Perquè va corrent"],
        correct: 1,
      },
      {
        question: "Què té en comú el Sergi i la Sònia?",
        options: [
          "Estudien igual",
          "Els encanten les pel·lícules de ciència-ficció",
          "Viuen al mateix carrer",
        ],
        correct: 1,
      },
      {
        question: "Quan veuen pel·lícules?",
        options: ["Els divendres", "Els dissabtes", "Els dimarts"],
        correct: 1,
      },
      {
        question: "Quin és el sentiment del Sergi al final?",
        options: ["Solitari", "Trist", "Feliç"],
        correct: 2,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "La Casa Nova",
    level: "A2",
    language: "ca",
    topic: "home",
    content:
      "La família Pascual es muda a una casa nova al barri de Sarrià. La casa té tres habitacions, un jardí gran i una terrassa amb vistes a la ciutat. Els nens, en Pol i la Mireia, corren per totes les habitacions explorant. La mare comença a despaqueta les caixes. En Pol hi va a ajudar. Descobreix la seva habitació: és gran i té finestres que miren al jardí. Coloca el seu llit i els seus joguets. La Mireia decora la seva habitació amb cartells de la seva banda preferida. Després de la primera nit a la casa nova, tots es desperten amb alegria. En Pol diu: 'Aquesta és la casa més bonica del món!' El pare somriu i diu: 'Aquí vivim molts records feliços.'",
    questions: [
      {
        question: "En quin barri es muden?",
        options: ["Sarrià", "Eixample", "Gràcia"],
        correct: 0,
      },
      {
        question: "Quants nens té la família?",
        options: ["Un", "Dos", "Tres"],
        correct: 1,
      },
      {
        question: "Quina vista té la terrassa?",
        options: ["Al mar", "A la ciutat", "A la muntanya"],
        correct: 1,
      },
      {
        question: "Com decora la Mireia la seva habitació?",
        options: ["Amb fotos", "Amb cartells", "Amb plantes"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "El Partit de Futbol",
    level: "A2",
    language: "ca",
    topic: "sports",
    content:
      "Avui és el gran partit: el barri juga contra el barri veí. En David és portero de l'equip local. Està nerviós però decidit. El partit comença i és molt emocionant. Els dos equips juguen bé, però ningú marca gols. En la segona meitat, l'equip contrari tira una pilota molt pràxima a la porta. En David es tira i l'atrapa amb les mans. Tots els seus companys criden 'Bravísim!' Una minut després, en David marca un gol de falta, directe, amb el peu. L'estadio va boig. La seva mare, que veu des de les grada, crida el seu nom. Al final, guanyen 1-0. En David és l'heroi del dia. Els seus companys el lleven a les espatles. Se sent orgullós i feliç.",
    questions: [
      {
        question: "Quin és el lloc d'en David al equip?",
        options: ["Defensa", "Portero", "Delantero"],
        correct: 1,
      },
      {
        question: "Quants gols es marquen en el partit?",
        options: ["Un", "Dos", "Tres"],
        correct: 0,
      },
      {
        question: "Qui marca l'únic gol?",
        options: ["En David", "Un company", "L'entrenador"],
        correct: 0,
      },
      {
        question: "Com acaba el partit?",
        options: ["Empat", "Perd el seu equip", "Guanya 1-0"],
        correct: 2,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "La Biblioteca Mágica",
    level: "B1",
    language: "ca",
    topic: "learning",
    content:
      "En Marc descobreix una biblioteca antiga que no havia vist mai, amagada darrere d'una escala en la plaça major. Quan entra, veu milers de llibres de tots colors. La bibliotecária, una senyora major amb ulleres, li somriu. 'Benvingut,' li diu. En Marc comença a explorar els prestatges. Trova llibres de tots els gèneres: ciència-ficció, fantasia, história, poesia. Li demana a la bibliotecária per recomendacions. Ella li diu: 'Llegeix aquest—és sobre un viatger que visita mons paral·lels.' En Marc agafa el llibre i comença a llegir aquell dia mateix. La lectura el transporta a mons imaginaris. Torna a la biblioteca cada dia, descobrint nous llibres i nuevas históries. Finalment, fa amistat amb la bibliotecária. Pensa que la biblioteca és el seu lloc favorit del mundial.",
    questions: [
      {
        question: "On es situa la biblioteca?",
        options: [
          "En una avinguda",
          "Darrere una escala",
          "En un edifici modern",
        ],
        correct: 1,
      },
      {
        question: "Com és la bibliotecária?",
        options: ["Jove i alegre", "Mayor amb ulleres", "Moderna"],
        correct: 1,
      },
      {
        question: "Quins gèneres de llibres hi ha?",
        options: [
          "Solo detectius",
          "Molts: ciència-ficció, fantasia, história",
          "Solo poesia",
        ],
        correct: 1,
      },
      {
        question: "Amb qui fa amistat en Marc?",
        options: ["Amb uns nens", "Amb la bibliotecária", "Amb un deixeble"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "L'Hivernacle",
    level: "A2",
    language: "ca",
    topic: "nature",
    content:
      "La Núria treballa en un hivernacle gran on cultiva flors i plantes. Cada matí s'encarrega de regar les plantes, podar les branques mortes i comprovar que no hi hagi plagues. Avui nota que una orquídia està tristeta, amb les fulles caigudes. Li parla suaument: 'No et preocupis, et cuidarè.' Li canvia la terra i la mou a un lloc amb més llum. Una setmana més tard, l'orquídia floreix amb les flors més boniques que ha vist mai. La Núria es sent molt orgullosa. Els seus clients venen al hivernacle i admiren totes les plantes. Una senyora li diu: 'Quant cura i passió dediques!' La Núria somriu. Pensa que el treball amb la natura la fa molt feliç.",
    questions: [
      {
        question: "On treballa la Núria?",
        options: [
          "En una granja",
          "En un hivernacle",
          "En un jardí públic",
        ],
        correct: 1,
      },
      {
        question: "Quina planta s'està morint?",
        options: ["Una rosa", "Una orquídia", "Una palmera"],
        correct: 1,
      },
      {
        question: "Què fa la Núria per ajudar l'orquídia?",
        options: ["La tira", "La canvia terra i la mou", "La talla"],
        correct: 1,
      },
      {
        question: "Com es sent la Núria al final?",
        options: ["Cansada", "Orgullosa", "Trista"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "La Botiga de Roba Vintage",
    level: "B1",
    language: "ca",
    topic: "shopping",
    content:
      "En Xavi obri una botiga de roba vintage en un carrer quiet del Born. La botiga és petita però amb molt caràcter: roba dels anys 60, 70 i 80, tots amb história. El primer client és una noia jove que busca una jaqueta denim clàssica. En Xavi li mostra dues jaquetes i li conta la história d'on van venir. La noia es prova les dues i tria la més bonica. Mentre paga, li diu: 'Aquesta botiga és increïble, vaig a recomanar-la als meus amics.' Dia tras dia, més gent descobreix la botiga. Alguns venen a vendre roba antiga, altres a buscar peces úniques. En Xavi es converteix en expert en roba vintage i una espècie de conseller de moda per al barri. Al final del primer mes, pensa que ha fet la millor decisió obrint aquesta botiga.",
    questions: [
      {
        question: "On está la botiga d'en Xavi?",
        options: ["En Eixample", "En el Born", "En Sarrià"],
        correct: 1,
      },
      {
        question: "Quina roba ven?",
        options: ["Roba moderna", "Roba vintage", "Roba esportiva"],
        correct: 1,
      },
      {
        question: "Quina jaqueta busca la primera client?",
        options: ["De cuir", "De denim", "De flanel"],
        correct: 1,
      },
      {
        question: "Quines décades de ropa hi ha a la botiga?",
        options: ["40, 50, 60", "60, 70, 80", "70, 80, 90"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "L'Excursió a la Muntanya",
    level: "A2",
    language: "ca",
    topic: "travel",
    content:
      "Els adolescents de l'institut organitzen una excursió a la muntanya. Vuitanta estudiants anboten sense falta; el professor Carles és el coordinador. Surten a les sis del matí en autobús. Arriben a la base i comencen la pujada. Es camina, es suda, es rieu dels bromes que fan. A mig camí, es paren a descansar i menjar. Hi ha sàndwixos, galetes i aigua freda. En Pau li diu al seu amic: 'Estoy mort de cansancio però és fantàstic estar aquí.' Finalment arriben al cim. La vista és estel·lar: es veu tot Barcelona en la distancia, el mar, les muntanyes. Els estudiants canten cançons i fan fotos. Alguns es troben l'energia per fer les últimes passes. Al final, tots descenen cansats però feliços. El professor Carles diu: 'Avui hem après que amb determinació, pots arribar a qualsevol lloc.'",
    questions: [
      {
        question: "Quants estudiants van a l'excursió?",
        options: ["Seixanta", "Setanta", "Vuitanta"],
        correct: 2,
      },
      {
        question: "A quina hora surten?",
        options: ["Sis del matí", "Vuit del matí", "Deu del matí"],
        correct: 0,
      },
      {
        question: "Quina vista veuen des del cim?",
        options: [
          "Solo muntanyes",
          "Barcelona, mar i muntanyes",
          "Solo el mar",
        ],
        correct: 1,
      },
      {
        question: "Quina lliçó ensenya el professor?",
        options: [
          "Cal tenir molta ropa",
          "Amb determinació pots arribar lluny",
          "La muntanya és perillosa",
        ],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "La Classe de Dansa",
    level: "A2",
    language: "ca",
    topic: "hobbies",
    content:
      "La Laura comença classes de ball a una escola de dansa en el Poble Sec. La primera clase pot semblar intimidant: hi ha espejos grans, música alta i nens que ja saben ballar. La professora es dona Elisa, que té molt de carisma. Ella li diu a Laura: 'No et preocupis, tots vam ser principiants.' La classe comença amb calentament: es mouen els braços, les cames, es salta. Después aprenen els passos bàsics de salsa. Laura fa passos equivocats al principi, però Elisa la corregeix amb paciència. Despres d'una hora, Laura está suada però somriu. Surt de la classe pensant que torará la próxima setmana. El que va pensar que seria difícil va resultar ser divertit i emocionant.",
    questions: [
      {
        question: "On són les classes de dansa?",
        options: ["Sarrià", "Poble Sec", "Gràcia"],
        correct: 1,
      },
      {
        question: "Com es dona la professora?",
        options: ["Anna", "Elisa", "Maria"],
        correct: 1,
      },
      {
        question: "Quin estil de ball aprenen?",
        options: ["Ballet", "Salsa", "Hip-hop"],
        correct: 1,
      },
      {
        question: "Quin és el sentiment de Laura al final?",
        options: ["Trista", "Cansada i divertida", "Nerviosa"],
        correct: 1,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "El Restaurant Familiar",
    level: "B1",
    language: "ca",
    topic: "food",
    content:
      "La família Montseny posseeix un restaurant tradicional català en Montcada. Es transmetre de generació en generació: primer el iaio, depois el pare, ara el fill major, en Ricard. El restaurant és petit però acollidor, amb taules de fusta, fotos antigues a les parets i l'aroma de la cuina casolana. En Ricard treballa com a xef; la seva mare és la recepcionista. El seu germà menor ajuda en la sala. Cada dia, clients fidels venen a menjar la coca de recapte de la mare o el pollastre al escaivada del iaio. Un dia arriba un crític de restaurant. En Ricard es posa nerviós però cuina amb el seu cor. El crític menja, somriu i diu: 'Aquí se sent l'amor pels productes i la tradició.' L'article que publica després és meravellós. En Ricard és orgullos d'haver mantingut viva la tradició familiar.",
    questions: [
      {
        question: "Quin és el lloc del restaurant?",
        options: ["Barcelona", "Montcada", "Sant Cugat"],
        correct: 1,
      },
      {
        question: "Quantes generacions han treballat allí?",
        options: ["Una", "Dues", "Tres"],
        correct: 2,
      },
      {
        question: "Quin és el rol d'en Ricard?",
        options: ["Xef", "Camarer", "Manager"],
        correct: 0,
      },
      {
        question: "Quina és la impressió del crític?",
        options: [
          "Negativa",
          "Regular",
          "Que hi ha amor pels productes",
        ],
        correct: 2,
      },
    ],
    source: "ai_generated",
  },
  {
    title: "L'Art de la Ceràmica",
    level: "B1",
    language: "ca",
    topic: "art",
    content:
      "En Gael és artista de ceràmica. Treballa en una sala gran amb forn, torns i milers de peces en proves. Cada dia comença amb la matèria primera: la terra roja. Posa la terra al torn i comença a donar forma. Les seves mans es mouen amb precisió. Modela plats, gerres, escultures petites. Alguns dissenys són tradicionals, altres són moderns i experimentals. Un dia, una galeria d'art es interessa pels seus treballs. Demanen exposar les seves peces. En Gael selecciona les millors: unes quinze peces que representen cinc anys de treball. L'obertura de l'exposició és un éxit. Artistes i col·leccionadors admiren la ceràmica. En Gael se sent realitzat. Pensa que seguirá creant, explorant nous colors i formes, seguint la tradició antiga de la ceràmica.",
    questions: [
      {
        question: "Quin és l'art d'en Gael?",
        options: ["Pintura", "Escultura", "Ceràmica"],
        correct: 2,
      },
      {
        question: "Quina és la matèria primera?",
        options: ["Marbre", "Terra roja", "Fusta"],
        correct: 1,
      },
      {
        question: "Quantes peces mostra en l'exposició?",
        options: ["Deu", "Quinze", "Vint"],
        correct: 1,
      },
      {
        question: "Com es sent en Gael al final?",
        options: ["Decebut", "Confús", "Realitzat"],
        correct: 2,
      },
    ],
    source: "ai_generated",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// CHUNKS (80 fragmentos de diálogo catalán)
// ─────────────────────────────────────────────────────────────────────────
const catalanChunks = [
  { content: "Bon dia! Com estàs?", english: "Good morning! How are you?", language: "ca" },
  { content: "Molt bé, merci. I tu?", english: "Very well, thanks. And you?", language: "ca" },
  { content: "Bé, malgrat tot.", english: "Well, all things considered.", language: "ca" },
  { content: "Quin temps fa avui!", english: "What weather today!", language: "ca" },
  { content: "Sí, és un dia preciós.", english: "Yes, it's a beautiful day.", language: "ca" },
  { content: "Vaig al mercat. Vols venir?", english: "I'm going to the market. Do you want to come?", language: "ca" },
  { content: "Amb gust! Quan sortim?", english: "Of course! When are we leaving?", language: "ca" },
  { content: "En deu minuts. Esperem'us aquí.", english: "In ten minutes. Let's meet here.", language: "ca" },
  { content: "Val. Fins allà!", english: "Okay. See you then!", language: "ca" },
  { content: "Com et diuen?", english: "What's your name?", language: "ca" },
  { content: "Em dic Maria. I tu?", english: "I'm called Maria. And you?", language: "ca" },
  { content: "Em dic Joan.", english: "I'm called Joan.", language: "ca" },
  { content: "Encantada de conèixer-te.", english: "Pleased to meet you.", language: "ca" },
  { content: "D'on ets?", english: "Where are you from?", language: "ca" },
  { content: "Soc de Barcelona. I tu?", english: "I'm from Barcelona. And you?", language: "ca" },
  { content: "Jo tinc trenta anys.", english: "I'm thirty years old.", language: "ca" },
  { content: "Quants anys tens?", english: "How old are you?", language: "ca" },
  { content: "Tinc vint-i-cinc.", english: "I'm twenty-five.", language: "ca" },
  { content: "Quina és la teva feina?", english: "What's your job?", language: "ca" },
  { content: "Soc dissenyador gràfic.", english: "I'm a graphic designer.", language: "ca" },
  { content: "Que mola! On treballes?", english: "That's cool! Where do you work?", language: "ca" },
  { content: "En una empresa tecnològica del Born.", english: "In a tech company in the Born.", language: "ca" },
  { content: "Quina és la teva afició favorita?", english: "What's your favorite hobby?", language: "ca" },
  { content: "M'encanta llegir novel·les.", english: "I love reading novels.", language: "ca" },
  { content: "A mi m'agrada jugar al futbol.", english: "I like playing football.", language: "ca" },
  { content: "Quina hora és?", english: "What time is it?", language: "ca" },
  { content: "Són les tres de la tarda.", english: "It's three o'clock in the afternoon.", language: "ca" },
  { content: "Merci per la informació.", english: "Thanks for the information.", language: "ca" },
  { content: "De res, és un plaer.", english: "You're welcome, it's a pleasure.", language: "ca" },
  { content: "Tinc molta fam.", english: "I'm very hungry.", language: "ca" },
  { content: "Anem a menjar algo?", english: "Let's go eat something?", language: "ca" },
  { content: "Sí! On volem anar?", english: "Yes! Where do we want to go?", language: "ca" },
  { content: "Em proposes el restaurant que vull.", english: "I suggest the restaurant I want.", language: "ca" },
  { content: "Quina menjar prefereixes?", english: "What food do you prefer?", language: "ca" },
  { content: "M'agrada la cuina catalana.", english: "I like Catalan cuisine.", language: "ca" },
  { content: "Això és deliciós!", english: "This is delicious!", language: "ca" },
  { content: "Estoy d'acord! Molt bo.", english: "I agree! Very good.", language: "ca" },
  { content: "El compte, si us plau.", english: "The bill, please.", language: "ca" },
  { content: "Ha estat meravellós!", english: "It was wonderful!", language: "ca" },
  { content: "On és el lavabo?", english: "Where's the bathroom?", language: "ca" },
  { content: "Allà, a la dreta.", english: "There, on the right.", language: "ca" },
  { content: "Com hi vaig a l'estació?", english: "How do I get to the station?", language: "ca" },
  { content: "Gira a l'esquerra en la semàfor.", english: "Turn left at the traffic light.", language: "ca" },
  { content: "Merci per l'ajuda!", english: "Thanks for the help!", language: "ca" },
  { content: "No hi ha res, bon viatge!", english: "No problem, safe travels!", language: "ca" },
  { content: "Bon temps avui, oi?", english: "Nice weather today, right?", language: "ca" },
  { content: "Sí, perfecte per sortir al parc.", english: "Yes, perfect for going to the park.", language: "ca" },
  { content: "Has dormit bé?", english: "Did you sleep well?", language: "ca" },
  { content: "Sí, molt bé. Gràcies per preguntar.", english: "Yes, very well. Thanks for asking.", language: "ca" },
  { content: "Com t'ha anat el dia?", english: "How was your day?", language: "ca" },
  { content: "Ha sigut un bon dia, la veritat.", english: "It was a good day, actually.", language: "ca" },
  { content: "Quant costa això?", english: "How much is this?", language: "ca" },
  { content: "Vint euros.", english: "Twenty euros.", language: "ca" },
  { content: "Em pots fer descuenta?", english: "Can you give me a discount?", language: "ca" },
  { content: "D'acord, denou euros.", english: "Okay, nineteen euros.", language: "ca" },
  { content: "Em puc provar-me aquest vestit?", english: "Can I try on this dress?", language: "ca" },
  { content: "Per descomptat! Els provadors són allà.", english: "Of course! The fitting rooms are there.", language: "ca" },
  { content: "Això és massa petit.", english: "This is too small.", language: "ca" },
  { content: "Tens una talla més gran?", english: "Do you have a bigger size?", language: "ca" },
  { content: "No em sento bé.", english: "I don't feel well.", language: "ca" },
  { content: "Tinc dolor de cap.", english: "I have a headache.", language: "ca" },
  { content: "Tens medicament?", english: "Do you have medicine?", language: "ca" },
  { content: "Sí, mica de paracetamol.", english: "Yes, some paracetamol.", language: "ca" },
  { content: "Tinc molta feina.", english: "I have a lot of work.", language: "ca" },
  { content: "Em pots ajudar amb aquest projecte?", english: "Can you help me with this project?", language: "ca" },
  { content: "Claro, amb gust!", english: "Of course, with pleasure!", language: "ca" },
  { content: "Quina és la data límit?", english: "What's the deadline?", language: "ca" },
  { content: "Divendres de la setmana que ve.", english: "Next Friday.", language: "ca" },
  { content: "He acabat l'informe.", english: "I've finished the report.", language: "ca" },
  { content: "Puc revisar-lo?", english: "Can I review it?", language: "ca" },
  { content: "Podem tenir una reunió demà?", english: "Can we have a meeting tomorrow?", language: "ca" },
  { content: "Sí, a les dues és bé?", english: "Yes, at two o'clock is good?", language: "ca" },
  { content: "M'agradaria reservar un vol.", english: "I'd like to book a flight.", language: "ca" },
  { content: "A on vols anar?", english: "Where do you want to go?", language: "ca" },
  { content: "Vaig a París la setmana que ve.", english: "I'm going to Paris next week.", language: "ca" },
  { content: "M'encanta llegir.", english: "I love reading.", language: "ca" },
  { content: "Practico algun esport?", english: "Do you play any sports?", language: "ca" },
  { content: "Sí, jugo a futbol cada dissabte.", english: "Yes, I play football every Saturday.", language: "ca" },
  { content: "Estic feliç avui.", english: "I'm happy today.", language: "ca" },
  { content: "Estic trist per la notícia.", english: "I'm sad about the news.", language: "ca" },
  { content: "Estic amoïnat per l'examen.", english: "I'm worried about the exam.", language: "ca" },
  { content: "Estic cansat de la feina.", english: "I'm tired from work.", language: "ca" },
];

// ─────────────────────────────────────────────────────────────────────────
// VOCABULARY (200 palabras catalanas)
// ─────────────────────────────────────────────────────────────────────────
const catalanVocabulary = [
  { word: "dia", definition: "período de 24 horas", example: "Tenim un gran dia per davant", times_seen: 0, source: "bootstrap" },
  { word: "nit", definition: "período oscuro del día", example: "Bona nit, fins demà", times_seen: 0, source: "bootstrap" },
  { word: "demà", definition: "el día después de hoy", example: "Demà vaig al mercat", times_seen: 0, source: "bootstrap" },
  { word: "nen", definition: "persona joven", example: "El nen juga al parc", times_seen: 0, source: "bootstrap" },
  { word: "nena", definition: "niña", example: "La nena és molt intel·ligent", times_seen: 0, source: "bootstrap" },
  { word: "home", definition: "persona adulta masculina", example: "L'home treballa en una oficina", times_seen: 0, source: "bootstrap" },
  { word: "dona", definition: "persona adulta femenina", example: "La dona és la mestressa de casa", times_seen: 0, source: "bootstrap" },
  { word: "germana", definition: "hermana", example: "La meva germana estudia medicina", times_seen: 0, source: "bootstrap" },
  { word: "germà", definition: "hermano", example: "El meu germà juga a futbol", times_seen: 0, source: "bootstrap" },
  { word: "mare", definition: "madre", example: "La meva mare és professora", times_seen: 0, source: "bootstrap" },
  { word: "pare", definition: "padre", example: "El meu pare treballa com metge", times_seen: 0, source: "bootstrap" },
  { word: "amiga", definition: "amiga", example: "La meva amiga és molt divertida", times_seen: 0, source: "bootstrap" },
  { word: "amic", definition: "amigo", example: "El meu amic estudia amb mi", times_seen: 0, source: "bootstrap" },
  { word: "casa", definition: "hogar, vivienda", example: "La casa és nova i bonica", times_seen: 0, source: "bootstrap" },
  { word: "apartament", definition: "apartamento", example: "Visc en un apartament en el Born", times_seen: 0, source: "bootstrap" },
  { word: "escala", definition: "escalera", example: "Pujo per l'escala fins al tercer pis", times_seen: 0, source: "bootstrap" },
  { word: "porta", definition: "puerta", example: "Abre la porta quan arribi", times_seen: 0, source: "bootstrap" },
  { word: "finestra", definition: "ventana", example: "La finestra dóna al jardí", times_seen: 0, source: "bootstrap" },
  { word: "llit", definition: "cama", example: "El llit és còmode", times_seen: 0, source: "bootstrap" },
  { word: "cadira", definition: "silla", example: "La cadira és de fusta", times_seen: 0, source: "bootstrap" },
  { word: "taula", definition: "mesa", example: "Menjam a la taula de la cuina", times_seen: 0, source: "bootstrap" },
  { word: "cuina", definition: "cocina", example: "La cuina és gran i clara", times_seen: 0, source: "bootstrap" },
  { word: "menjador", definition: "comedor", example: "Fem la cena al menjador", times_seen: 0, source: "bootstrap" },
  { word: "dormitori", definition: "habitación", example: "El dormitori és tranquil", times_seen: 0, source: "bootstrap" },
  { word: "bany", definition: "baño", example: "El bany té una dutxa nova", times_seen: 0, source: "bootstrap" },
  { word: "jardí", definition: "jardín", example: "El jardí té flors de colors", times_seen: 0, source: "bootstrap" },
  { word: "arbre", definition: "árbol", example: "L'arbre és molt vell", times_seen: 0, source: "bootstrap" },
  { word: "flor", definition: "flor", example: "La flor és molt bonica", times_seen: 0, source: "bootstrap" },
  { word: "gat", definition: "gato", example: "El gat dorm tot el dia", times_seen: 0, source: "bootstrap" },
  { word: "gos", definition: "perro", example: "El gos és molt fidel", times_seen: 0, source: "bootstrap" },
  { word: "pa", definition: "pan", example: "El pa és fresc", times_seen: 0, source: "bootstrap" },
  { word: "formatge", definition: "queso", example: "El formatge és d'ovella", times_seen: 0, source: "bootstrap" },
  { word: "carn", definition: "carne", example: "La carn és tendra", times_seen: 0, source: "bootstrap" },
  { word: "peix", definition: "pez", example: "El peix és fresc del mercat", times_seen: 0, source: "bootstrap" },
  { word: "ceba", definition: "cebolla", example: "La ceba es tallada en anells", times_seen: 0, source: "bootstrap" },
  { word: "tomàquet", definition: "tomate", example: "El tomàquet és vermell i jugós", times_seen: 0, source: "bootstrap" },
  { word: "patata", definition: "patata", example: "La patata és un acompanyament clàssic", times_seen: 0, source: "bootstrap" },
  { word: "arròs", definition: "arroz", example: "L'arròs és el plat nacional", times_seen: 0, source: "bootstrap" },
  { word: "verdura", definition: "verdura", example: "La verdura és saludable", times_seen: 0, source: "bootstrap" },
  { word: "fruita", definition: "fruta", example: "La fruita és dolça i fresca", times_seen: 0, source: "bootstrap" },
  { word: "mel", definition: "miel", example: "La mel és natural i nutritiva", times_seen: 0, source: "bootstrap" },
  { word: "llet", definition: "leche", example: "La llet és bona per als ossos", times_seen: 0, source: "bootstrap" },
  { word: "ous", definition: "huevos", example: "Els ous són proteïna pura", times_seen: 0, source: "bootstrap" },
  { word: "cafè", definition: "café", example: "El cafè és foret per la mañana", times_seen: 0, source: "bootstrap" },
  { word: "te", definition: "té", example: "El té és relaxant", times_seen: 0, source: "bootstrap" },
  { word: "suc", definition: "zumo", example: "El suc és fresc i natural", times_seen: 0, source: "bootstrap" },
  { word: "vi", definition: "vino", example: "El vi és de Penedès", times_seen: 0, source: "bootstrap" },
  { word: "cervesa", definition: "cerveza", example: "La cervesa és gelada", times_seen: 0, source: "bootstrap" },
  { word: "aiga", definition: "agua", example: "L'aiga és essencial per viure", times_seen: 0, source: "bootstrap" },
  { word: "menjar", definition: "acción de comer", example: "Disfruto menjador amb la meva familia", times_seen: 0, source: "bootstrap" },
  { word: "cuinar", definition: "cocinar (acción)", example: "M'agrada cuinar cada nit", times_seen: 0, source: "bootstrap" },
  { word: "llibre", definition: "libro", example: "El llibre és interesant", times_seen: 0, source: "bootstrap" },
  { word: "quadern", definition: "cuaderno", example: "El quadern té anotacions", times_seen: 0, source: "bootstrap" },
  { word: "ploma", definition: "pluma", example: "La ploma escriu bé", times_seen: 0, source: "bootstrap" },
  { word: "llapis", definition: "lápiz", example: "El llapis està afilat", times_seen: 0, source: "bootstrap" },
  { word: "escola", definition: "escuela", example: "L'escola és gran", times_seen: 0, source: "bootstrap" },
  { word: "universitat", definition: "universidad", example: "L'universitat és moderna", times_seen: 0, source: "bootstrap" },
  { word: "professor", definition: "profesor", example: "El professor és molt estricte", times_seen: 0, source: "bootstrap" },
  { word: "estudiant", definition: "estudiante", example: "L'estudiant treballa dur", times_seen: 0, source: "bootstrap" },
  { word: "classe", definition: "clase", example: "La classe comença a les nou", times_seen: 0, source: "bootstrap" },
  { word: "examen", definition: "examen", example: "L'examen és difícil", times_seen: 0, source: "bootstrap" },
  { word: "nota", definition: "nota/calificación", example: "La nota és excel·lent", times_seen: 0, source: "bootstrap" },
  { word: "cotxe", definition: "coche", example: "El cotxe és ràpid", times_seen: 0, source: "bootstrap" },
  { word: "autobús", definition: "autobús", example: "L'autobús passa cada deu minuts", times_seen: 0, source: "bootstrap" },
  { word: "tren", definition: "tren", example: "El tren és puntual", times_seen: 0, source: "bootstrap" },
  { word: "bicicleta", definition: "bicicleta", example: "La bicicleta és ecològica", times_seen: 0, source: "bootstrap" },
  { word: "carrer", definition: "calle", example: "El carrer és net", times_seen: 0, source: "bootstrap" },
  { word: "plaça", definition: "plaza", example: "La plaça és bonica", times_seen: 0, source: "bootstrap" },
  { word: "parc", definition: "parque", example: "El parc és gran", times_seen: 0, source: "bootstrap" },
  { word: "biblioteca", definition: "biblioteca", example: "La biblioteca té molts llibres", times_seen: 0, source: "bootstrap" },
  { word: "museu", definition: "museo", example: "El museu té obres valuoses", times_seen: 0, source: "bootstrap" },
  { word: "cinema", definition: "cine", example: "El cinema és nou", times_seen: 0, source: "bootstrap" },
  { word: "teatre", definition: "teatro", example: "El teatre és arquitectura antiga", times_seen: 0, source: "bootstrap" },
  { word: "restaurant", definition: "restaurante", example: "El restaurant és exquisit", times_seen: 0, source: "bootstrap" },
  { word: "bar", definition: "bar", example: "El bar és acollidor", times_seen: 0, source: "bootstrap" },
  { word: "botiga", definition: "tienda", example: "La botiga vén roba", times_seen: 0, source: "bootstrap" },
  { word: "mercat", definition: "mercado", example: "El mercat és fresc", times_seen: 0, source: "bootstrap" },
  { word: "oficina", definition: "oficina", example: "L'oficina és moderna", times_seen: 0, source: "bootstrap" },
  { word: "fàbrica", definition: "fábrica", example: "La fàbrica fabrica cotxes", times_seen: 0, source: "bootstrap" },
  { word: "hospital", definition: "hospital", example: "L'hospital és net", times_seen: 0, source: "bootstrap" },
  { word: "farmàcia", definition: "farmacia", example: "La farmàcia té medicaments", times_seen: 0, source: "bootstrap" },
  { word: "treball", definition: "trabajo", example: "El treball és dur", times_seen: 0, source: "bootstrap" },
  { word: "feina", definition: "trabajo/tarea", example: "Tenim molta feina", times_seen: 0, source: "bootstrap" },
  { word: "salari", definition: "salario", example: "El salari és just", times_seen: 0, source: "bootstrap" },
  { word: "diners", definition: "dinero", example: "Els diners no són tot", times_seen: 0, source: "bootstrap" },
  { word: "preu", definition: "precio", example: "El preu és alt", times_seen: 0, source: "bootstrap" },
  { word: "compra", definition: "compra", example: "Vaig fer una compra avui", times_seen: 0, source: "bootstrap" },
  { word: "venda", definition: "venta", example: "La venda va bé", times_seen: 0, source: "bootstrap" },
  { word: "tela", definition: "tela", example: "La tela és suau", times_seen: 0, source: "bootstrap" },
  { word: "roba", definition: "ropa", example: "La roba està neta", times_seen: 0, source: "bootstrap" },
  { word: "sabata", definition: "zapato", example: "La sabata és còmoda", times_seen: 0, source: "bootstrap" },
  { word: "barret", definition: "sombrero", example: "El barret protegeix del sol", times_seen: 0, source: "bootstrap" },
  { word: "matinada", definition: "madrugada", example: "La matinada és tranquila", times_seen: 0, source: "bootstrap" },
  { word: "tarda", definition: "tarde", example: "La tarda és agradable", times_seen: 0, source: "bootstrap" },
  { word: "setmana", definition: "semana", example: "La setmana és llarga", times_seen: 0, source: "bootstrap" },
  { word: "mes", definition: "mes", example: "El mes és llarg", times_seen: 0, source: "bootstrap" },
  { word: "any", definition: "año", example: "L'any és nou", times_seen: 0, source: "bootstrap" },
  { word: "dies", definition: "días", example: "Els dies passen ràpidament", times_seen: 0, source: "bootstrap" },
  { word: "hora", definition: "hora", example: "L'hora de la veritat", times_seen: 0, source: "bootstrap" },
  { word: "minut", definition: "minuto", example: "Un minut és poc temps", times_seen: 0, source: "bootstrap" },
  { word: "segon", definition: "segundo", example: "Un segon va canviar tot", times_seen: 0, source: "bootstrap" },
  { word: "velocitat", definition: "velocidad", example: "La velocitat és alta", times_seen: 0, source: "bootstrap" },
  { word: "distancia", definition: "distancia", example: "La distancia és gran", times_seen: 0, source: "bootstrap" },
  { word: "altura", definition: "altura", example: "L'altura és vertiginosa", times_seen: 0, source: "bootstrap" },
  { word: "ample", definition: "ancho", example: "L'ample és considerable", times_seen: 0, source: "bootstrap" },
  { word: "llarg", definition: "largo", example: "El riu és llarg", times_seen: 0, source: "bootstrap" },
  { word: "petit", definition: "pequeño", example: "El gat és petit", times_seen: 0, source: "bootstrap" },
  { word: "gran", definition: "grande", example: "La casa és gran", times_seen: 0, source: "bootstrap" },
  { word: "alt", definition: "alto", example: "L'home és alt", times_seen: 0, source: "bootstrap" },
  { word: "baix", definition: "bajo", example: "El pujol és baix", times_seen: 0, source: "bootstrap" },
  { word: "gord", definition: "gordo", example: "El gat és gord", times_seen: 0, source: "bootstrap" },
  { word: "magre", definition: "delgado", example: "El model és magre", times_seen: 0, source: "bootstrap" },
  { word: "negre", definition: "negro", example: "El color negre és elegant", times_seen: 0, source: "bootstrap" },
  { word: "blanc", definition: "blanco", example: "El color blanc és pur", times_seen: 0, source: "bootstrap" },
  { word: "roig", definition: "rojo", example: "La flor és roja", times_seen: 0, source: "bootstrap" },
  { word: "verd", definition: "verde", example: "L'herba és verda", times_seen: 0, source: "bootstrap" },
  { word: "blau", definition: "azul", example: "El cel és blau", times_seen: 0, source: "bootstrap" },
  { word: "groc", definition: "amarillo", example: "El sol és groc", times_seen: 0, source: "bootstrap" },
  { word: "taronja", definition: "naranja (color)", example: "La taronja és clara", times_seen: 0, source: "bootstrap" },
  { word: "morat", definition: "morado", example: "L'iris és morat", times_seen: 0, source: "bootstrap" },
  { word: "rosa", definition: "rosa (color)", example: "La flor és rosa", times_seen: 0, source: "bootstrap" },
  { word: "marró", definition: "marrón", example: "La fusta és marró", times_seen: 0, source: "bootstrap" },
  { word: "gris", definition: "gris", example: "El núvol és gris", times_seen: 0, source: "bootstrap" },
  { word: "fort", definition: "fuerte", example: "L'home és fort", times_seen: 0, source: "bootstrap" },
  { word: "feble", definition: "débil", example: "El senyor és feble", times_seen: 0, source: "bootstrap" },
  { word: "ràpid", definition: "rápido", example: "El gos és ràpid", times_seen: 0, source: "bootstrap" },
  { word: "lent", definition: "lento", example: "La tortuga és lenta", times_seen: 0, source: "bootstrap" },
  { word: "fàcil", definition: "fácil", example: "La tasca és fàcil", times_seen: 0, source: "bootstrap" },
  { word: "difícil", definition: "difícil", example: "L'examen és difícil", times_seen: 0, source: "bootstrap" },
  { word: "bon", definition: "bueno", example: "El film és bon", times_seen: 0, source: "bootstrap" },
  { word: "dolent", definition: "malo", example: "El resultat és dolent", times_seen: 0, source: "bootstrap" },
  { word: "bonic", definition: "bonito", example: "La noia és bonica", times_seen: 0, source: "bootstrap" },
  { word: "lleig", definition: "feo", example: "L'edifici és lleig", times_seen: 0, source: "bootstrap" },
  { word: "net", definition: "limpio", example: "La casa és neta", times_seen: 0, source: "bootstrap" },
  { word: "brut", definition: "sucio", example: "El carrer és brut", times_seen: 0, source: "bootstrap" },
  { word: "sec", definition: "seco", example: "El temps és sec", times_seen: 0, source: "bootstrap" },
  { word: "humit", definition: "húmedo", example: "L'aire és humit", times_seen: 0, source: "bootstrap" },
  { word: "calent", definition: "caliente", example: "L'aigua és calenta", times_seen: 0, source: "bootstrap" },
  { word: "fred", definition: "frío", example: "L'aire és fred", times_seen: 0, source: "bootstrap" },
  { word: "nou", definition: "nuevo", example: "El cotxe és nou", times_seen: 0, source: "bootstrap" },
  { word: "vell", definition: "viejo", example: "La casa és vella", times_seen: 0, source: "bootstrap" },
  { word: "modern", definition: "moderno", example: "L'edifici és modern", times_seen: 0, source: "bootstrap" },
  { word: "antic", definition: "antiguo", example: "El quadre és antic", times_seen: 0, source: "bootstrap" },
  { word: "jove", definition: "joven", example: "El noi és jove", times_seen: 0, source: "bootstrap" },
  { word: "major", definition: "mayor", example: "L'home és major", times_seen: 0, source: "bootstrap" },
  { word: "agradable", definition: "agradable", example: "El dia és agradable", times_seen: 0, source: "bootstrap" },
  { word: "desagradable", definition: "desagradable", example: "L'experiencia és desagradable", times_seen: 0, source: "bootstrap" },
  { word: "interessant", definition: "interesante", example: "El llibre és interessant", times_seen: 0, source: "bootstrap" },
  { word: "avorrit", definition: "aburrido", example: "El film és avorrit", times_seen: 0, source: "bootstrap" },
  { word: "feliç", definition: "feliz", example: "El nen és feliç", times_seen: 0, source: "bootstrap" },
  { word: "trist", definition: "triste", example: "La nena és trista", times_seen: 0, source: "bootstrap" },
  { word: "alegre", definition: "alegre", example: "La dona és alegre", times_seen: 0, source: "bootstrap" },
  { word: "enfadat", definition: "enojado", example: "L'home és enfadat", times_seen: 0, source: "bootstrap" },
  { word: "nerviós", definition: "nervioso", example: "L'estudiant és nerviós", times_seen: 0, source: "bootstrap" },
  { word: "tranquil", definition: "tranquilo", example: "El noi és tranquil", times_seen: 0, source: "bootstrap" },
  { word: "sorprès", definition: "sorprendido", example: "La noia és sorpresa", times_seen: 0, source: "bootstrap" },
  { word: "cansada", definition: "cansado/a", example: "Estic cansada após la feina", times_seen: 0, source: "bootstrap" },
  { word: "descansa", definition: "descansa/descansar", example: "Necessito descansar", times_seen: 0, source: "bootstrap" },
  { word: "dorm", definition: "duerme/dormir", example: "El gat dorm tot el dia", times_seen: 0, source: "bootstrap" },
  { word: "menja", definition: "come/comer", example: "La noia menja pa", times_seen: 0, source: "bootstrap" },
  { word: "beu", definition: "bebe/beber", example: "Beu aiga cada dia", times_seen: 0, source: "bootstrap" },
  { word: "parla", definition: "habla/hablar", example: "Parla en veu alta", times_seen: 0, source: "bootstrap" },
  { word: "escolta", definition: "escucha/escuchar", example: "Escolto música clàssica", times_seen: 0, source: "bootstrap" },
  { word: "mira", definition: "mira/mirar", example: "Mira el riu des de la finestra", times_seen: 0, source: "bootstrap" },
  { word: "camina", definition: "camina/caminar", example: "Camina al parc cada matí", times_seen: 0, source: "bootstrap" },
  { word: "corre", definition: "corre/correr", example: "El gos corre molt ràpid", times_seen: 0, source: "bootstrap" },
  { word: "juga", definition: "juega/jugar", example: "El nen juga amb joguets", times_seen: 0, source: "bootstrap" },
  { word: "treballa", definition: "trabaja/trabajar", example: "Treballa en una oficina gran", times_seen: 0, source: "bootstrap" },
  { word: "estudi", definition: "estudio/estudiar", example: "Estudi cada nit", times_seen: 0, source: "bootstrap" },
  { word: "aprén", definition: "aprende/aprender", example: "Aprén idiomes", times_seen: 0, source: "bootstrap" },
  { word: "pensa", definition: "piensa/pensar", example: "Pensa en el futur", times_seen: 0, source: "bootstrap" },
  { word: "recorda", definition: "recuerda/recordar", example: "Recorda el primer dia", times_seen: 0, source: "bootstrap" },
];

// ─────────────────────────────────────────────────────────────────────────
// MAIN SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────
async function seedCatalan() {
  console.log("🇨🇦 TANDA 1: CARREGANT CONTINGUT CATALÁ");
  console.log("==========================================\n");

  // 1. Insert Stories
  console.log("📖 Inserting 15 stories...");
  try {
    const { data: storiesData, error: storiesError } = await supabase
      .from("stories")
      .insert(catalanStories);
    if (storiesError) throw storiesError;
    console.log(`✅ ${catalanStories.length} stories inserted\n`);
  } catch (err) {
    console.error("❌ Stories error:", err);
  }

  // 2. Insert Chunks (diálogos)
  console.log("🗣️ Inserting ~80 chunks...");
  try {
    const { error: chunksError } = await supabase
      .from("chunks")
      .insert(catalanChunks);
    if (chunksError) throw chunksError;
    console.log(`✅ ${catalanChunks.length} chunks inserted\n`);
  } catch (err) {
    console.error("❌ Chunks error:", err);
  }

  // 3. Insert Vocabulary
  console.log("📚 Inserting 200 vocabulary words...");
  try {
    const { error: vocabError } = await supabase
      .from("user_vocabulary")
      .insert(catalanVocabulary);
    if (vocabError) throw vocabError;
    console.log(`✅ ${catalanVocabulary.length} words inserted\n`);
  } catch (err) {
    console.error("❌ Vocabulary error:", err);
  }

  console.log("🎯 HARDCODED IN TS (no DB):");
  console.log("  • 12 sounds catalanes (src/lib/catalanSounds.ts)");
  console.log("  • 10 listening patterns (src/lib/catalanListeningPatterns.ts)");
  console.log("\n✨ TANDA 1 COMPLETE!\n");
}

seedCatalan().catch(console.error);
