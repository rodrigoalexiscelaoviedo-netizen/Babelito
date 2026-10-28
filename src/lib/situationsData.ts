/**
 * Situaciones: misiones por temática para practicar a fondo un contexto real.
 * Cada una trae frases clave, vocabulario, un diálogo modelo, un quiz y un
 * roleplay con el coach. Todo en inglés (versión catalana pendiente); las
 * ayudas están en español neutro.
 *
 * Quiz: `right` es la respuesta correcta; `wrong` son los distractores (errores
 * típicos de hispanohablantes). El orden se mezcla al mostrarlo.
 */

export type SituationLevel = "A1" | "A2" | "B1" | "B2";

export interface Phrase {
  en: string;
  es: string;
}

export interface DialogueLine {
  who: "you" | "other";
  en: string;
}

export interface QuizQuestion {
  /** Situación en español neutro. */
  q: string;
  right: string;
  wrong: [string, string];
}

export interface Situation {
  id: string;
  title: string;
  level: SituationLevel;
  /** Nombre de un ícono de lucide-react (ver SITUATION_ICONS en la página). */
  icon: string;
  blurb: string;
  phrases: Phrase[];
  words: Phrase[];
  dialogue: { otherRole: string; lines: DialogueLine[] };
  quiz: QuizQuestion[];
  roleplay: { coachRole: string; opening: string; description: string };
}

export const SITUATIONS: Situation[] = [
  {
    id: "job-interview",
    title: "Job interview",
    level: "B1",
    icon: "Briefcase",
    blurb: "Introduce yourself, talk about your experience and ask smart questions.",
    phrases: [
      { en: "Thank you for having me.", es: "Gracias por recibirme." },
      { en: "I have three years of experience in sales.", es: "Tengo tres años de experiencia en ventas." },
      { en: "My greatest strength is staying calm under pressure.", es: "Mi mayor fortaleza es mantener la calma bajo presión." },
      { en: "I'm looking for a role where I can grow.", es: "Busco un puesto donde pueda crecer." },
      { en: "In my previous job, I was responsible for the website.", es: "En mi trabajo anterior, era responsable del sitio web." },
      { en: "Could you tell me more about the team?", es: "¿Podría contarme más sobre el equipo?" },
      { en: "I'm available to start in two weeks.", es: "Estoy disponible para empezar en dos semanas." },
      { en: "What are the next steps in the process?", es: "¿Cuáles son los siguientes pasos del proceso?" },
    ],
    words: [
      { en: "strength", es: "fortaleza" },
      { en: "weakness", es: "debilidad" },
      { en: "deadline", es: "fecha límite" },
      { en: "salary", es: "salario" },
      { en: "skills", es: "habilidades" },
      { en: "reference", es: "referencia (recomendación)" },
    ],
    dialogue: {
      otherRole: "Interviewer",
      lines: [
        { who: "other", en: "Thanks for coming in. Tell me a bit about yourself." },
        { who: "you", en: "Thank you for having me. I'm a marketing assistant with three years of experience." },
        { who: "other", en: "What's your biggest strength?" },
        { who: "you", en: "I work well in a team, and I stay calm under pressure." },
        { who: "other", en: "And a weakness?" },
        { who: "you", en: "Sometimes I take on too much work, but I'm learning to prioritise." },
        { who: "other", en: "Do you have any questions for us?" },
        { who: "you", en: "Yes. What are the next steps in the process?" },
      ],
    },
    quiz: [
      { q: "Te piden: “Tell me about yourself.” ¿Qué respuesta es la mejor?", right: "I'm a marketing assistant with three years of experience.", wrong: ["I am born in 1995 and I like pizza.", "Myself is Ana and I work."] },
      { q: "Quieres decir que tienes tres años de experiencia en ventas.", right: "I have three years of experience in sales.", wrong: ["I am three years of experience in sales.", "I have experience of sales since three years."] },
      { q: "Al final quieres saber qué viene después.", right: "What are the next steps in the process?", wrong: ["What is next step the process?", "Which is the following of the process?"] },
      { q: "Agradeces al entrar a la entrevista.", right: "Thank you for having me.", wrong: ["Thanks for have me.", "Thank you for I am here."] },
    ],
    roleplay: {
      coachRole: "A friendly but direct HR manager interviewing the user for a marketing job.",
      opening: "Good morning, and thanks for coming in. Could you start by telling me a bit about yourself?",
      description: "A full interview: introductions, strengths and your own questions.",
    },
  },
  {
    id: "shopping",
    title: "Shopping",
    level: "A2",
    icon: "ShoppingBag",
    blurb: "Ask prices and sizes, try things on, pay and return what you don't like.",
    phrases: [
      { en: "How much is this?", es: "¿Cuánto cuesta esto?" },
      { en: "Do you have this in a larger size?", es: "¿Lo tiene en una talla más grande?" },
      { en: "Can I try this on?", es: "¿Puedo probármelo?" },
      { en: "Where are the fitting rooms?", es: "¿Dónde están los probadores?" },
      { en: "I'm just looking, thanks.", es: "Solo estoy mirando, gracias." },
      { en: "Do you take credit cards?", es: "¿Aceptan tarjeta de crédito?" },
      { en: "Can I have a receipt, please?", es: "¿Me da el ticket, por favor?" },
      { en: "I'd like to return this.", es: "Quisiera devolver esto." },
    ],
    words: [
      { en: "size", es: "talla" },
      { en: "discount", es: "descuento" },
      { en: "cash", es: "efectivo" },
      { en: "receipt", es: "ticket de compra" },
      { en: "refund", es: "reembolso" },
      { en: "sale", es: "rebajas" },
    ],
    dialogue: {
      otherRole: "Shop assistant",
      lines: [
        { who: "other", en: "Hi, can I help you?" },
        { who: "you", en: "Yes, I'm looking for a blue jacket." },
        { who: "other", en: "Sure. What size are you?" },
        { who: "you", en: "I'm a medium. Can I try it on?" },
        { who: "other", en: "Of course. The fitting rooms are over there." },
        { who: "you", en: "It's perfect. How much is it?" },
        { who: "other", en: "It's sixty euros, but it's in the sale — forty-five." },
        { who: "you", en: "Great, I'll take it. Do you take credit cards?" },
      ],
    },
    quiz: [
      { q: "Quieres saber el precio de algo.", right: "How much is this?", wrong: ["How many is this?", "What price has this?"] },
      { q: "Quieres probarte una camisa.", right: "Can I try this on?", wrong: ["Can I test this shirt in?", "May I proof this?"] },
      { q: "Te preguntan si necesitas ayuda y solo estás mirando.", right: "I'm just looking, thanks.", wrong: ["I only see, thanks.", "I'm looking only for nothing."] },
      { q: "Quieres devolver una compra.", right: "I'd like to return this.", wrong: ["I want give back this.", "I would to return it me."] },
    ],
    roleplay: {
      coachRole: "A helpful shop assistant in a clothes shop.",
      opening: "Hi there! Can I help you find anything today?",
      description: "Find the right size, try it on, pay — and maybe return something.",
    },
  },
  {
    id: "transport",
    title: "Bus, train & taxi",
    level: "A1",
    icon: "Bus",
    blurb: "Buy tickets, ask which bus to take and get where you need to go.",
    phrases: [
      { en: "Which bus goes to the city centre?", es: "¿Qué autobús va al centro?" },
      { en: "Does this bus stop at the station?", es: "¿Este autobús para en la estación?" },
      { en: "One ticket to the airport, please.", es: "Un billete al aeropuerto, por favor." },
      { en: "How often do the buses run?", es: "¿Cada cuánto pasan los autobuses?" },
      { en: "What time is the next train?", es: "¿A qué hora sale el próximo tren?" },
      { en: "Which platform does it leave from?", es: "¿De qué andén sale?" },
      { en: "Could you tell me when to get off?", es: "¿Podría avisarme cuándo bajar?" },
      { en: "Please take me to this address.", es: "Lléveme a esta dirección, por favor." },
    ],
    words: [
      { en: "ticket", es: "billete" },
      { en: "platform", es: "andén" },
      { en: "stop", es: "parada" },
      { en: "timetable", es: "horario" },
      { en: "delay", es: "retraso" },
      { en: "fare", es: "tarifa" },
    ],
    dialogue: {
      otherRole: "Bus driver",
      lines: [
        { who: "you", en: "Excuse me, does this bus go to the city centre?" },
        { who: "other", en: "Yes, it does. Where are you going exactly?" },
        { who: "you", en: "To the main station. How much is a ticket?" },
        { who: "other", en: "Two euros fifty." },
        { who: "you", en: "One ticket, please. Could you tell me when to get off?" },
        { who: "other", en: "Sure. It's the fifth stop. I'll let you know." },
        { who: "you", en: "Thank you very much." },
        { who: "other", en: "No problem. Take a seat." },
      ],
    },
    quiz: [
      { q: "Quieres saber si este autobús va al centro.", right: "Does this bus go to the city centre?", wrong: ["Is this bus going centre city?", "This bus is for the centre?"] },
      { q: "Pides un billete al aeropuerto.", right: "One ticket to the airport, please.", wrong: ["A ticket for airport, give me.", "I want one ticket airport."] },
      { q: "Preguntas de qué andén sale el tren.", right: "Which platform does it leave from?", wrong: ["What is the platform it goes?", "Where platform is it leaves?"] },
      { q: "Le pides al conductor que te avise cuándo bajar.", right: "Could you tell me when to get off?", wrong: ["Can you say me when I go down?", "Tell me when I descend, please."] },
    ],
    roleplay: {
      coachRole: "A bus driver in a British city who answers questions about routes and tickets.",
      opening: "Hello! Where are you heading today?",
      description: "At the bus stop: find the right bus, buy a ticket and get off at the right place.",
    },
  },
  {
    id: "airport",
    title: "At the airport",
    level: "A2",
    icon: "Plane",
    blurb: "Check in, go through security and customs, and handle problems with luggage.",
    phrases: [
      { en: "I'd like to check in for the flight to Madrid.", es: "Quisiera hacer el check-in del vuelo a Madrid." },
      { en: "Can I have a window seat, please?", es: "¿Me puede dar asiento de ventanilla?" },
      { en: "I have one bag to check in.", es: "Tengo una maleta para facturar." },
      { en: "Where is gate twelve?", es: "¿Dónde está la puerta de embarque 12?" },
      { en: "Is the flight on time?", es: "¿El vuelo va a su hora?" },
      { en: "I've lost my luggage.", es: "He perdido mi equipaje." },
      { en: "I have nothing to declare.", es: "No tengo nada que declarar." },
      { en: "I'm here on holiday.", es: "Vengo de vacaciones." },
    ],
    words: [
      { en: "boarding pass", es: "tarjeta de embarque" },
      { en: "luggage", es: "equipaje" },
      { en: "gate", es: "puerta de embarque" },
      { en: "passport", es: "pasaporte" },
      { en: "delay", es: "retraso" },
      { en: "customs", es: "aduana" },
    ],
    dialogue: {
      otherRole: "Check-in agent",
      lines: [
        { who: "other", en: "Good morning. Passport, please." },
        { who: "you", en: "Here you are. I'd like to check in for the flight to Madrid." },
        { who: "other", en: "Thank you. Do you have any bags to check in?" },
        { who: "you", en: "Yes, one suitcase." },
        { who: "other", en: "Would you like a window or an aisle seat?" },
        { who: "you", en: "A window seat, please." },
        { who: "other", en: "Here's your boarding pass. Boarding is at gate twelve at ten fifteen." },
        { who: "you", en: "Thank you. Is the flight on time?" },
      ],
    },
    quiz: [
      { q: "Quieres facturar una maleta.", right: "I have one bag to check in.", wrong: ["I have one bag for put in.", "I check in one bag have."] },
      { q: "Quieres asiento de ventanilla.", right: "Can I have a window seat, please?", wrong: ["I want the seat of window.", "Give me window place."] },
      { q: "Perdiste tu equipaje.", right: "I've lost my luggage.", wrong: ["I have lost me the luggage.", "My luggage is disappeared me."] },
      { q: "En la aduana te preguntan si tienes algo que declarar.", right: "I have nothing to declare.", wrong: ["I have not nothing to declare.", "I don't have nothing for say."] },
    ],
    roleplay: {
      coachRole: "An airline check-in agent at an international airport.",
      opening: "Good morning! Where are you flying to today?",
      description: "Check in, choose a seat and sort out a problem before boarding.",
    },
  },
  {
    id: "tourist",
    title: "Being a tourist",
    level: "A2",
    icon: "Compass",
    blurb: "Ask for directions, opening times, tickets and local recommendations.",
    phrases: [
      { en: "Excuse me, how do I get to the museum?", es: "Disculpe, ¿cómo llego al museo?" },
      { en: "Is it far from here?", es: "¿Está lejos de aquí?" },
      { en: "Could you take a photo of us, please?", es: "¿Podría hacernos una foto, por favor?" },
      { en: "What time does it open?", es: "¿A qué hora abre?" },
      { en: "How much is the entrance fee?", es: "¿Cuánto cuesta la entrada?" },
      { en: "Is there a student discount?", es: "¿Hay descuento para estudiantes?" },
      { en: "Can you recommend a good place to eat?", es: "¿Puede recomendarme un buen sitio para comer?" },
      { en: "I'm lost. Can you show me on the map?", es: "Estoy perdido. ¿Me lo puede mostrar en el mapa?" },
    ],
    words: [
      { en: "map", es: "mapa" },
      { en: "entrance fee", es: "precio de entrada" },
      { en: "guide", es: "guía" },
      { en: "souvenir", es: "recuerdo" },
      { en: "sightseeing", es: "turismo (visitar lugares)" },
      { en: "landmark", es: "lugar emblemático" },
    ],
    dialogue: {
      otherRole: "Local passer-by",
      lines: [
        { who: "you", en: "Excuse me, how do I get to the cathedral?" },
        { who: "other", en: "Go straight and turn left at the traffic lights." },
        { who: "you", en: "Is it far from here?" },
        { who: "other", en: "No, it's about ten minutes on foot." },
        { who: "you", en: "Thank you. What time does it open?" },
        { who: "other", en: "At nine, I think. And it closes at six." },
        { who: "you", en: "Could you recommend a good place to eat nearby?" },
        { who: "other", en: "Yes, there's a nice café just behind the cathedral." },
      ],
    },
    quiz: [
      { q: "Preguntas cómo llegar al museo.", right: "How do I get to the museum?", wrong: ["How I arrive to the museum?", "Where goes the museum?"] },
      { q: "Preguntas a qué hora abre un lugar.", right: "What time does it open?", wrong: ["At what hour opens?", "When it is open time?"] },
      { q: "Le pides a alguien que os haga una foto.", right: "Could you take a photo of us, please?", wrong: ["Can you make us a photo please?", "You can to photo us?"] },
      { q: "Estás perdido y tienes un mapa.", right: "I'm lost. Can you show me on the map?", wrong: ["I am lose. Show me the map?", "I lost me. The map where?"] },
    ],
    roleplay: {
      coachRole: "A friendly local who helps a tourist in a European city.",
      opening: "Hello! You look a bit lost — can I help you find something?",
      description: "Ask a local for directions, opening times and a place to eat.",
    },
  },
  {
    id: "restaurant",
    title: "At a restaurant",
    level: "A1",
    icon: "UtensilsCrossed",
    blurb: "Book a table, order, mention allergies, complain politely and pay.",
    phrases: [
      { en: "A table for two, please.", es: "Una mesa para dos, por favor." },
      { en: "Could we see the menu, please?", es: "¿Podemos ver la carta, por favor?" },
      { en: "I'll have the chicken, please.", es: "Tomaré el pollo, por favor." },
      { en: "I'm allergic to nuts.", es: "Soy alérgico a los frutos secos." },
      { en: "Could we have some water, please?", es: "¿Nos trae agua, por favor?" },
      { en: "This isn't what I ordered.", es: "Esto no es lo que pedí." },
      { en: "Can we have the bill, please?", es: "¿Nos trae la cuenta, por favor?" },
      { en: "Is service included?", es: "¿El servicio está incluido?" },
    ],
    words: [
      { en: "menu", es: "carta" },
      { en: "starter", es: "entrante" },
      { en: "main course", es: "plato principal" },
      { en: "dessert", es: "postre" },
      { en: "bill", es: "cuenta" },
      { en: "tip", es: "propina" },
    ],
    dialogue: {
      otherRole: "Waiter",
      lines: [
        { who: "other", en: "Good evening. Do you have a reservation?" },
        { who: "you", en: "No, but a table for two, please." },
        { who: "other", en: "Of course. Here is the menu. Can I get you something to drink?" },
        { who: "you", en: "Some water, please. And a coffee for her." },
        { who: "other", en: "Are you ready to order?" },
        { who: "you", en: "Yes. I'll have the chicken, and she'll have the pasta." },
        { who: "other", en: "Anything else?" },
        { who: "you", en: "That's all, thank you." },
      ],
    },
    quiz: [
      { q: "Pides una mesa para dos.", right: "A table for two, please.", wrong: ["I want table of two.", "Table two have I."] },
      { q: "Avisas que eres alérgico a los frutos secos.", right: "I'm allergic to nuts.", wrong: ["I have allergy of nuts to me.", "I am allergy nuts."] },
      { q: "Pides la cuenta.", right: "Can we have the bill, please?", wrong: ["Give us the account please.", "We want pay the bill us."] },
      { q: "Pides el pollo.", right: "I'll have the chicken, please.", wrong: ["I want to eat chicken me.", "Chicken for I, please."] },
    ],
    roleplay: {
      coachRole: "A polite waiter in a small restaurant.",
      opening: "Good evening and welcome! Table for how many?",
      description: "Get a table, order food and drinks, and ask for the bill.",
    },
  },
  {
    id: "hotel",
    title: "At a hotel",
    level: "A2",
    icon: "BedDouble",
    blurb: "Check in, ask about breakfast and Wi-Fi, and report a problem with your room.",
    phrases: [
      { en: "I have a reservation under the name Garcia.", es: "Tengo una reserva a nombre de García." },
      { en: "Could I have a room with a view?", es: "¿Podría tener una habitación con vistas?" },
      { en: "What time is breakfast served?", es: "¿A qué hora se sirve el desayuno?" },
      { en: "What's the Wi-Fi password?", es: "¿Cuál es la contraseña del wifi?" },
      { en: "The air conditioning isn't working.", es: "El aire acondicionado no funciona." },
      { en: "Could I have an extra towel, please?", es: "¿Podría darme otra toalla, por favor?" },
      { en: "What time is check-out?", es: "¿A qué hora es el check-out?" },
      { en: "Could you call me a taxi, please?", es: "¿Podría llamarme un taxi, por favor?" },
    ],
    words: [
      { en: "reception", es: "recepción" },
      { en: "key card", es: "tarjeta llave" },
      { en: "single room", es: "habitación individual" },
      { en: "double room", es: "habitación doble" },
      { en: "towel", es: "toalla" },
      { en: "stay", es: "estancia" },
    ],
    dialogue: {
      otherRole: "Receptionist",
      lines: [
        { who: "you", en: "Hello, I have a reservation under the name Garcia." },
        { who: "other", en: "Yes, Mr Garcia. A double room for three nights, is that right?" },
        { who: "you", en: "That's right. What time is breakfast served?" },
        { who: "other", en: "From seven to ten, on the first floor." },
        { who: "you", en: "Great. And what's the Wi-Fi password?" },
        { who: "other", en: "It's on your key card. Your room is 304." },
        { who: "you", en: "Thank you. What time is check-out?" },
        { who: "other", en: "At twelve. Enjoy your stay!" },
      ],
    },
    quiz: [
      { q: "Llegas al hotel y tienes una reserva a nombre de García.", right: "I have a reservation under the name Garcia.", wrong: ["I have a reserve with Garcia name.", "My reservation is on Garcia."] },
      { q: "Quieres saber la contraseña del wifi.", right: "What's the Wi-Fi password?", wrong: ["Which is the key of the Wi-Fi?", "How is the password wifi?"] },
      { q: "El aire acondicionado no funciona.", right: "The air conditioning isn't working.", wrong: ["The air conditioning no works.", "The air is not functioning it."] },
      { q: "Preguntas a qué hora tienes que dejar la habitación.", right: "What time is check-out?", wrong: ["When is the exit of room?", "At what hour I leave?"] },
    ],
    roleplay: {
      coachRole: "A friendly hotel receptionist.",
      opening: "Good afternoon, welcome to the Riverside Hotel. How can I help you?",
      description: "Check in, ask about breakfast and solve a problem with your room.",
    },
  },
  {
    id: "health",
    title: "Doctor & pharmacy",
    level: "A2",
    icon: "Stethoscope",
    blurb: "Describe symptoms, understand advice and buy medicine.",
    phrases: [
      { en: "I don't feel well.", es: "No me siento bien." },
      { en: "I have a headache and a sore throat.", es: "Me duele la cabeza y la garganta." },
      { en: "I've had a fever since yesterday.", es: "Tengo fiebre desde ayer." },
      { en: "I'm allergic to penicillin.", es: "Soy alérgico a la penicilina." },
      { en: "Where does it hurt?", es: "¿Dónde le duele?" },
      { en: "How often should I take this?", es: "¿Con qué frecuencia debo tomarlo?" },
      { en: "Do I need a prescription?", es: "¿Necesito receta?" },
      { en: "I'd like something for a cold, please.", es: "Quisiera algo para el resfriado, por favor." },
    ],
    words: [
      { en: "pain", es: "dolor" },
      { en: "fever", es: "fiebre" },
      { en: "medicine", es: "medicina" },
      { en: "prescription", es: "receta médica" },
      { en: "pharmacy", es: "farmacia" },
      { en: "appointment", es: "cita" },
    ],
    dialogue: {
      otherRole: "Doctor",
      lines: [
        { who: "other", en: "Good morning. What seems to be the problem?" },
        { who: "you", en: "I don't feel well. I have a headache and a sore throat." },
        { who: "other", en: "How long have you had these symptoms?" },
        { who: "you", en: "Since yesterday. And I have a fever." },
        { who: "other", en: "Are you allergic to any medicine?" },
        { who: "you", en: "Yes, I'm allergic to penicillin." },
        { who: "other", en: "OK. Take this twice a day and rest." },
        { who: "you", en: "Thank you. Do I need to come back?" },
      ],
    },
    quiz: [
      { q: "Le dices al médico que no te sientes bien.", right: "I don't feel well.", wrong: ["I don't feel me good.", "I am not feeling of good."] },
      { q: "Te duelen la cabeza y la garganta.", right: "I have a headache and a sore throat.", wrong: ["I have pain head and throat.", "Me hurts the head and throat."] },
      { q: "Preguntas si necesitas receta.", right: "Do I need a prescription?", wrong: ["I need receipt for medicine?", "Is it necessary a recipe?"] },
      { q: "Avisas de tu alergia a la penicilina.", right: "I'm allergic to penicillin.", wrong: ["I have allergy to the penicillin me.", "Penicillin is allergic me."] },
    ],
    roleplay: {
      coachRole: "A calm, kind doctor at a medical centre.",
      opening: "Good morning, please take a seat. What seems to be the problem?",
      description: "Explain your symptoms and understand the doctor's advice.",
    },
  },
  {
    id: "making-friends",
    title: "Making friends",
    level: "A1",
    icon: "Smile",
    blurb: "Introduce yourself, ask about the other person and keep a conversation going.",
    phrases: [
      { en: "Hi, I'm Alex. Nice to meet you.", es: "Hola, soy Alex. Encantado." },
      { en: "Where are you from?", es: "¿De dónde eres?" },
      { en: "What do you do?", es: "¿A qué te dedicas?" },
      { en: "I've been learning English for a year.", es: "Llevo un año aprendiendo inglés." },
      { en: "What do you do in your free time?", es: "¿Qué haces en tu tiempo libre?" },
      { en: "Would you like to have a coffee sometime?", es: "¿Te gustaría tomar un café algún día?" },
      { en: "Sorry, could you repeat that?", es: "Perdón, ¿puedes repetirlo?" },
      { en: "It was great talking to you.", es: "Fue genial hablar contigo." },
    ],
    words: [
      { en: "neighbour", es: "vecino" },
      { en: "hobby", es: "pasatiempo" },
      { en: "colleague", es: "colega" },
      { en: "weekend", es: "fin de semana" },
      { en: "favourite", es: "favorito" },
      { en: "invite", es: "invitar" },
    ],
    dialogue: {
      otherRole: "New friend",
      lines: [
        { who: "other", en: "Hi! I'm Emma. Are you new here?" },
        { who: "you", en: "Hi, I'm Alex. Nice to meet you. Yes, I arrived last week." },
        { who: "other", en: "Where are you from?" },
        { who: "you", en: "I'm from Spain. What about you?" },
        { who: "other", en: "I'm from Manchester. What do you do?" },
        { who: "you", en: "I'm a designer. What do you do in your free time?" },
        { who: "other", en: "I love hiking. Would you like to come this weekend?" },
        { who: "you", en: "Yes, I'd love to! Thanks." },
      ],
    },
    quiz: [
      { q: "Te presentas a alguien nuevo.", right: "Hi, I'm Alex. Nice to meet you.", wrong: ["Hi, me Alex. Pleasure meet.", "Hello, I'm called Alex of meet you."] },
      { q: "Preguntas de dónde es la otra persona.", right: "Where are you from?", wrong: ["From where you are?", "Where you come from?"] },
      { q: "No entendiste y quieres que lo repita.", right: "Sorry, could you repeat that?", wrong: ["Sorry, repeat you that?", "What you said me again?"] },
      { q: "Invitas a alguien a tomar un café.", right: "Would you like to have a coffee sometime?", wrong: ["You want coffee me sometime?", "Do you want that we drink coffee?"] },
    ],
    roleplay: {
      coachRole: "A friendly person the user has just met at a language exchange event.",
      opening: "Hi! I don't think we've met. I'm Emma — are you new to the group?",
      description: "Meet someone new, find things in common and make a plan.",
    },
  },
  {
    id: "phone-calls",
    title: "Phone calls & appointments",
    level: "B1",
    icon: "Phone",
    blurb: "Book, change or cancel appointments and handle a call without seeing the other person.",
    phrases: [
      { en: "Hello, this is Alex speaking.", es: "Hola, habla Alex." },
      { en: "Could I speak to Mr Brown, please?", es: "¿Podría hablar con el señor Brown?" },
      { en: "I'm calling about my appointment.", es: "Llamo por mi cita." },
      { en: "Could you hold on a moment?", es: "¿Puede esperar un momento?" },
      { en: "I'm afraid he's not available right now.", es: "Me temo que ahora no está disponible." },
      { en: "Could I leave a message?", es: "¿Puedo dejar un mensaje?" },
      { en: "Could you speak more slowly, please?", es: "¿Podría hablar más despacio, por favor?" },
      { en: "I'd like to reschedule my appointment.", es: "Quisiera cambiar mi cita." },
    ],
    words: [
      { en: "appointment", es: "cita" },
      { en: "to book", es: "reservar" },
      { en: "to cancel", es: "cancelar" },
      { en: "voicemail", es: "buzón de voz" },
      { en: "extension", es: "extensión" },
      { en: "to confirm", es: "confirmar" },
    ],
    dialogue: {
      otherRole: "Receptionist",
      lines: [
        { who: "other", en: "Good morning, Dental Care. How can I help you?" },
        { who: "you", en: "Hello, this is Alex speaking. I'd like to reschedule my appointment." },
        { who: "other", en: "Of course. Could you tell me your date of birth?" },
        { who: "you", en: "The fifth of May, nineteen ninety-two." },
        { who: "other", en: "Thank you. Would next Tuesday at ten o'clock suit you?" },
        { who: "you", en: "Yes, that's perfect." },
        { who: "other", en: "Great. I'll send you a confirmation by email." },
        { who: "you", en: "Thank you very much. Goodbye." },
      ],
    },
    quiz: [
      { q: "Contestas el teléfono presentándote.", right: "Hello, this is Alex speaking.", wrong: ["Hello, I am Alex here.", "Hello, it's me Alex who talk."] },
      { q: "Pides hablar con el señor Brown.", right: "Could I speak to Mr Brown, please?", wrong: ["I can talk with Mr Brown?", "Give me Mr Brown please."] },
      { q: "Quieres dejar un mensaje.", right: "Could I leave a message?", wrong: ["Can I let a message?", "I want to left message."] },
      { q: "Quieres cambiar tu cita para otro día.", right: "I'd like to reschedule my appointment.", wrong: ["I want change my cite.", "I would to move the appointment of me."] },
    ],
    roleplay: {
      coachRole: "A receptionist at a dental clinic who answers the phone.",
      opening: "Good morning, Dental Care, how can I help you?",
      description: "A phone call: change an appointment and confirm the new time.",
    },
  },
  {
    id: "work-meetings",
    title: "Work meetings",
    level: "B2",
    icon: "Presentation",
    blurb: "Lead a discussion, disagree politely, clarify and close with clear next steps.",
    phrases: [
      { en: "Let's get started.", es: "Empecemos." },
      { en: "Could you clarify what you mean by that?", es: "¿Podrías aclarar a qué te refieres?" },
      { en: "I see your point, but I'd suggest a different approach.", es: "Entiendo tu punto, pero sugeriría otro enfoque." },
      { en: "Let me share my screen.", es: "Déjame compartir mi pantalla." },
      { en: "Can we circle back to that later?", es: "¿Podemos volver a eso más tarde?" },
      { en: "I'll follow up with an email after the meeting.", es: "Haré un seguimiento por email después de la reunión." },
      { en: "We're running out of time, so let's wrap up.", es: "Se nos acaba el tiempo, así que cerremos." },
      { en: "Who's going to take ownership of this?", es: "¿Quién se hará cargo de esto?" },
    ],
    words: [
      { en: "agenda", es: "orden del día" },
      { en: "deadline", es: "fecha límite" },
      { en: "stakeholder", es: "parte interesada" },
      { en: "action item", es: "tarea pendiente" },
      { en: "update", es: "novedad / actualización" },
      { en: "budget", es: "presupuesto" },
    ],
    dialogue: {
      otherRole: "Colleague",
      lines: [
        { who: "you", en: "Let's get started. The first item on the agenda is the launch date." },
        { who: "other", en: "I think we need two more weeks. The design isn't ready." },
        { who: "you", en: "I see your point, but I'd suggest a different approach. Could we launch a smaller version first?" },
        { who: "other", en: "That could work. What would it include?" },
        { who: "you", en: "Only the main features. Can we circle back to the details later?" },
        { who: "other", en: "Sure. Who's going to take ownership of the plan?" },
        { who: "you", en: "I will. I'll follow up with an email after the meeting." },
        { who: "other", en: "Perfect. Thanks, everyone." },
      ],
    },
    quiz: [
      { q: "Abres la reunión.", right: "Let's get started.", wrong: ["Start we now.", "We go to begin the meeting."] },
      { q: "Pides que te aclaren algo.", right: "Could you clarify what you mean by that?", wrong: ["You can explain what mean you?", "What do you want to say it?"] },
      { q: "Propones retomar un tema más tarde.", right: "Can we circle back to that later?", wrong: ["We can return to this after, no?", "Later we turn around?"] },
      { q: "Quedan pocos minutos y quieres cerrar.", right: "We're running out of time, so let's wrap up.", wrong: ["The time ends us, we finish.", "We have no time, finish all."] },
    ],
    roleplay: {
      coachRole: "A senior colleague chairing a weekly project meeting who is sceptical about the timeline.",
      opening: "Okay, let's get started. First item: the launch date. Where are we on that?",
      description: "Defend a plan, disagree politely and agree on next steps.",
    },
  },
  {
    id: "renting-home",
    title: "Renting a home",
    level: "B1",
    icon: "House",
    blurb: "Ask about price, deposit and contract, and arrange a viewing.",
    phrases: [
      { en: "I'm calling about the flat you advertised.", es: "Llamo por el piso que anunció." },
      { en: "Is it still available?", es: "¿Sigue disponible?" },
      { en: "How much is the rent per month?", es: "¿Cuánto es el alquiler mensual?" },
      { en: "Are bills included?", es: "¿Los gastos están incluidos?" },
      { en: "How much is the deposit?", es: "¿Cuánto es la fianza?" },
      { en: "Could I arrange a viewing?", es: "¿Podría concertar una visita?" },
      { en: "Is the flat furnished?", es: "¿El piso está amueblado?" },
      { en: "How long is the contract?", es: "¿Cuánto dura el contrato?" },
    ],
    words: [
      { en: "landlord", es: "propietario" },
      { en: "tenant", es: "inquilino" },
      { en: "deposit", es: "fianza" },
      { en: "lease", es: "contrato de alquiler" },
      { en: "furnished", es: "amueblado" },
      { en: "neighbourhood", es: "barrio" },
    ],
    dialogue: {
      otherRole: "Landlord",
      lines: [
        { who: "you", en: "Hello, I'm calling about the flat you advertised. Is it still available?" },
        { who: "other", en: "Yes, it is. It's a two-bedroom flat near the park." },
        { who: "you", en: "How much is the rent per month?" },
        { who: "other", en: "Nine hundred euros, and bills are not included." },
        { who: "you", en: "I see. How much is the deposit?" },
        { who: "other", en: "Two months' rent." },
        { who: "you", en: "Could I arrange a viewing this week?" },
        { who: "other", en: "Of course. How about Thursday at six?" },
      ],
    },
    quiz: [
      { q: "Preguntas si el piso sigue libre.", right: "Is it still available?", wrong: ["It is still free to rent?", "Has it still available?"] },
      { q: "Preguntas cuánto cuesta el alquiler al mes.", right: "How much is the rent per month?", wrong: ["How much cost the rent monthly?", "What is price of rent by month?"] },
      { q: "Preguntas si los gastos están incluidos.", right: "Are bills included?", wrong: ["Are the bills inside?", "The bills come with?"] },
      { q: "Pides una visita al piso.", right: "Could I arrange a viewing?", wrong: ["I can arrange a visit of it?", "I want see it, when?"] },
    ],
    roleplay: {
      coachRole: "A landlord showing a two-bedroom flat to a possible tenant.",
      opening: "Hello! Thanks for getting in touch about the flat. What would you like to know?",
      description: "Ask about the flat, the price and the contract, and arrange a viewing.",
    },
  },
];

export function getSituation(id: string | undefined): Situation | undefined {
  return SITUATIONS.find((s) => s.id === id);
}
