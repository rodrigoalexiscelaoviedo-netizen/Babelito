export interface ReadingText {
  id: string;
  title: string;
  author: string;
  level: "A2" | "B1" | "B2";
  content: string;
}

export const READING_TEXTS: ReadingText[] = [
  {
    id: "happy-prince-1",
    title: "The Happy Prince",
    author: "Oscar Wilde",
    level: "A2",
    content: `High above the city, on a tall column, stood the statue of the Happy Prince. He was covered all over with thin leaves of fine gold, his eyes were made of two bright sapphires, and a great red ruby glowed on his sword-handle.

He was very much admired indeed. "He is as beautiful as a weathercock," said one of the Town Councillors who wished to gain a reputation for having artistic tastes. "Only not quite so useful," he added, afraid that people would think him unpractical, which he really was not.

"Why can't you be like the Happy Prince?" asked a sensible mother of her little boy who was crying for the moon. "The Happy Prince never dreams of crying for anything," she said.

One night there flew over the city a little Swallow. His friends had gone away to Egypt six weeks before, but he had stayed behind. He was in love with the most beautiful Reed. He had met her early in the spring as he was flying down the river after a big yellow moth.`,
  },
  {
    id: "selfish-giant",
    title: "The Selfish Giant",
    author: "Oscar Wilde",
    level: "A2",
    content: `Every afternoon, as they were coming from school, the children used to go and play in the Giant's garden. It was a large lovely garden, with soft green grass. Here and there over the grass stood beautiful flowers like stars, and there were twelve peach-trees that in the spring-time broke out into delicate blossoms of pink and pearl.

The Giant had been away for seven years. He had gone to visit his friend the Cornish ogre, and had stayed with him. When he returned, he saw the children playing in the garden. "What are you doing here?" he cried in a very gruff voice, and the children ran away.

"My own garden is my own garden," said the Giant, "anyone can understand that, and I will allow nobody to play in it but myself." So he built a high wall all round it, and put up a notice-board: TRESPASSERS WILL BE PROSECUTED.`,
  },
  {
    id: "gift-of-magi",
    title: "The Gift of the Magi",
    author: "O. Henry",
    level: "B1",
    content: `One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by negotiating with the grocery store owner and the vegetable seller until one's cheeks burned with silent humiliation.

Della counted three times. One dollar and eighty-seven cents. And the next day would be Christmas.

There was clearly nothing to do but sit on the old couch and cry. So Della did it.

While the mistress of the home is slowly becoming less upset, let's look at the home. A furnished flat at eight dollars a week. It did not exactly beggar description, but it certainly had that word on the lookout for the mendicancy squad.

In the lobby below was a letter-box into which no letter would go, and an electric button from which no mortal finger could coax a ring. Also there was a card bearing the name "Mr. James Dillingham Young."

Della finished her cry and went to work on her cheeks with the powder rag. She stood by the window and looked out at a grey cat walking along a grey fence in a grey backyard. Tomorrow would be Christmas Day, and she had only one dollar and eighty-seven cents to buy Jim a present.`,
  },
  {
    id: "necklace",
    title: "The Necklace",
    author: "Guy de Maupassant",
    level: "B1",
    content: `She was one of those pretty and charming girls, born into a family of clerks, with no money and no prospects. She had no means of meeting some rich and distinguished man, so she let herself be married to a minor official at the Ministry of Education.

She suffered endlessly, feeling that she was made for luxury and comfort. She suffered from the poverty of her apartment, from the shabby walls, the worn chairs, and the faded curtains. All these things, which another woman of her class would not even have noticed, tormented and insulted her.

When she sat down to dinner, opposite her husband, who uncovered the soup tureen and declared enthusiastically, "Ah, good old beef stew! I don't know anything better than that," she dreamed of elegant dinners, of gleaming silverware, of tapestries depicting ancient figures and exotic birds in an enchanted forest.

She had no dresses, no jewels, nothing. And she loved nothing but these things; she felt made for them. She burned with the desire to please, to be attractive, to be sought after.`,
  },
  {
    id: "tell-tale-heart",
    title: "The Tell-Tale Heart",
    author: "Edgar Allan Poe",
    level: "B2",
    content: `True! Nervous, very, very dreadfully nervous I had been and am; but why will you say that I am mad? The disease had sharpened my senses, not destroyed, not dulled them. Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell. How, then, am I mad? Hearken! and observe how healthily, how calmly I can tell you the whole story.

It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me. He had never given me insult. For his gold I had no desire. I think it was his eye! Yes, it was this! One of his eyes resembled that of a vulture — a pale blue eye, with a film over it. Whenever it fell upon me, my blood ran cold; and so by degrees, very gradually, I made up my mind to take the life of the old man, and thus rid myself of the eye forever.`,
  },
  {
    id: "sherlock-study",
    title: "A Study in Scarlet",
    author: "Arthur Conan Doyle",
    level: "B2",
    content: `In the year 1878 I took my degree of Doctor of Medicine of the University of London, and proceeded to Netley to go through the course prescribed for surgeons in the army. Having completed my studies there, I was duly attached to the Fifth Northumberland Fusiliers as Assistant Surgeon.

We proceeded to India by the troopship Orontes, where I underwent a series of adventures which left me with a constitution much shaken. I was struck on the shoulder by a Jezail bullet, which shattered the bone and grazed the subclavian artery. Had it not been for the promptitude and skill of my orderly, James Murray, who half carried, half supported me under fire to a place of safety, I should certainly have died.

I was removed from the regiment and conveyed back to England. For months my life was despaired of, and when at last I came to myself and became convalescent, I was so weak and emaciated that a medical board determined that not a day should be lost in sending me back to England. I came to London with the weak remnant of a once robust constitution.`,
  },
];

// Textos en català — vida quotidiana a Barcelona, cultura i tradicions
export const READING_TEXTS_CA: ReadingText[] = [
  {
    id: "barcelona-matí-a2",
    title: "Un matí al barri",
    author: "Babelito",
    level: "A2",
    content: `Cada matí em desperto al mateix moment. Primer vaig al balcó i miro la Sagrada Família que es veu entre els edificis. Després descendo a la cuina i preparo el café. M'agrada molt amb llet calenta, especial si és un dia de fred.

La meva rutina és sempre igual. A les set de la matinada, surt de casa. Camino per la Rambla, on vull salons i gent tocant música. Compro un periòdic al quiosc de la cantonada i em sento en una terrassa a llegir i beure un altre café.

Vaig al treball a peu, una caminada de vint minuts pel barri gòtic. Els carrers són estrets i plens de vida. Hi ha cases velles, balconades de fusta i flors per les finestres. Els veïns me saluden —aquí tothom es coneix— i jo els saludo amb un somriure.

L'hora més bonica és quan torna la llum del matí i els carres que són esbotzats ja prenen color. Barcelona em sembla una ciutat mágica, plena de secrets esperant que algú els descobreixi.`,
  },
  {
    id: "festa-major-a2",
    title: "La festa major del barri",
    author: "Babelito",
    level: "A2",
    content: `La festa major arriba sempre la primera setmana d'agost. El barri es transforma. Pengen banderoles de colors entre els edificis, posen escenaris a la plaça i instal·len jocs per als nens.

Tot el barri col·labora. Els veïns coquen coca de recapte i pa amb tomaquet. A la plaça hi ha xeremies, sardanes, i fins i tot gresca. Els nens corren pels carrers disfressats de gegants i els adults beuen vermouth mentre escolten música.

La meva part favorita és la nit de la pólvora: a la plaça es cremen els pólvores i el cel s'il·lumina de colors. Tothom canta, dansa i celebra. Fins i tot els més grans del barri es posen a ballar!

Aquella nit no durmo. Resta'd'una que la festa major uneix els veïns, crea memòries i fa que la ciutat sigui un lloc especial per viure.`,
  },
  {
    id: "mercat-boqueria-b1",
    title: "Una tarda al mercat de la Boqueria",
    author: "Babelito",
    level: "B1",
    content: `El mercat de la Boqueria és un lloc que no pots explicar bé només amb paraules. Cal veure-ho amb els teus propis ulls. Cada tarda, després de les dues, hi ha un bullici especial: les parades buiden i es preparen per a la nit.

Els venedors són amables i parladors. Si demanes tomàquets, t'expliquen si són de la comarca o de l'Empordà, i et donen consells de com cuinar-los. Els peixatans tallen peix a velocitat de vertig, mentre que els fruiters tracten la fruita com si fos or.

Vaig a comprar una mica de tot. Una verdura nova que no reconec, uns bolets de tardor, uns formatges de la Serra de Collserola. Cada compra és una petita aventura. A la barra del fons, beu gent que menja una cervesa freda i uns escopinyes crus: la vida Barcelona en la seva expressió més pura.

El mercat no és només un lloc per comprar; és un microcosm de la vida barcelonina. Aquí pots sentir el pols de la ciutat, conèixer els seus secrets culinaris i entendre per què els barcelonins som tant orgullosos de la nostra cultura gastronòmica.`,
  },
  {
    id: "montjuïc-b1",
    title: "Pujada a Montjuïc",
    author: "Babelito",
    level: "B1",
    content: `Dissabte vaig decidir pujar a Montjuïc sense pressa, sense pla prefixat. Vaig triar el camí pels jardins, no la tirolina com fan els turistes. Els jardins de Montjuïc són secrets ben guardats pels barcelonins.

Camino entre plantes exòtiques i flors que no sé ni com es diuen. Els jardins s'eleven per terrasses i cada vegada que puj, descobreixo una perspectiva nova de la ciutat. A baix, Barcelona s'estén com un mapa viu.

Al capdamunt trobo el castell, aquest edifici que ha vist guerres i revolucions, que ha canviat de mans més vegades que les maons a la ciutat. Avui és un museu, però els murs semblen guardar encara historis d'antics tants.

Mentre baix, el sol comença a canviar de colors. Els taronja i vermells il·luminen els edificis moderns de la base de la muntanya. Des de dalt, vull que Barcelona és antiga i jove alhora, tradicional i ultramoderna. Montjuïc és el millor mirador per comprendre aquesta contradicció.`,
  },
  {
    id: "tradició-castellers-b2",
    title: "Els castellers: patrimoni viu de Catalunya",
    author: "Babelito",
    level: "B2",
    content: `Els castellers representen quelcom profund en la identitat catalana, una pràctica que combina força, confiança, disciplina i comunitat. Els castells són torres humanes que es basteixen durant festes majors, i la seva construcció és un art que ha pervivut durant segles.

La complexitat dels castells va molt més enllà del que sembla a primera vista. Centenars de persones s'entrellacen en formacions precises, amb rols específics: els baixos que suporten el pes, els aixafadors que asseguren l'estructura, i els xiquets més petits que pujant al capdamunt. Cada pessoa té responsabilitat cap als altres.

Quan un castell "cau" —és a dir, quan la torre es desploma de manera controlada—, no hi ha vergonya, sinó celebració. El fracàs és part del procés. Els castellers riuen, es polsen l'un a l'altre i comencen de nou. Aquesta resiliència exemplifica la filosofia catalana moderna.

El 2010, la UNESCO va reconèixer els castells com Patrimoni Cultural Immaterial de la Humanitat. Avui en dia, nens i nenes de tota Catalunya practiquen aquesta tradició. És una manera de connectar amb les arrels mentre se segueix creixent com a persona i comunitat. Els castellers no són només un espectacle; són una metàfora de vida.`,
  },
  {
    id: "gaudí-arquitectura-b2",
    title: "Gaudí: el geni que va transformar Barcelona",
    author: "Babelito",
    level: "B2",
    content: `Antoni Gaudí (1852-1926) va ser més que un arquitecte; va ser un visionari que va canviar per sempre la manera com viem l'arquitectura. Els seus edificis no segueixen les normes dels seus contemporanis, sinó que semblen organismes vius, amb formes organiques i simètriques que reflecteixen la natura.

La Sagrada Família és la seva obra mestra inacabada. Per a molts, rappresenta l'essència de Barcelona: ambiciosa, imperfecta però grandiosa. Cada façana conta una historia diferent, cada detall és pensament. Gaudí passà els últims anys de la seva vida dedicat totalment a aquest projecte, dormint a les obres.

Però Gaudí no és només la Sagrada Família. La Casa Batlló és una casa que sembla respirar, amb façana ondulada com ones de mar. El Parc Güell transforma una muntanya en una fantasía de colors i ceràmica. Fins i tot els seus edificis menys famosos, com la Casa Vicens o la Casa Calvet, són revolucionaris.

L'herència de Gaudí va molt més enllà de les estructures físiques. Va demostrar que l'arquitectura pot ser poesia, que les matemàtiques naturals es peuvent traduir en bellesa. Més de cent anys després de la seva mort, Barcelona continua atraient milions de persones que venen a sentir la magic de les seves creacions.`,
  },
];
