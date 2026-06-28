export interface Scenario {
  id: number;
  title: string;
  description: string;
  coach_role: string;
  opening: string;
  difficulty: string;
  icon: string;
}

// Escenarios genéricos, sirven para cualquier usuario. El coach los adapta
// al nivel y contexto de cada uno vía el system prompt.
export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: "Job interview",
    description: "You're interviewing for a role at an international company.",
    coach_role: "A friendly but direct HR manager at a British company.",
    opening: "Good morning, thanks for coming in. Could you start by telling me a bit about yourself?",
    difficulty: "B1",
    icon: "Briefcase",
  },
  {
    id: 2,
    title: "Team meeting",
    description: "You're leading a weekly meeting with your team in English.",
    coach_role: "A team member who's a bit confused about this week's goals.",
    opening: "Hi, before we start — can you clarify what the main goal is for this week?",
    difficulty: "B1",
    icon: "Users",
  },
  {
    id: 3,
    title: "Client call",
    description: "You're on a call with a potential client interested in your services.",
    coach_role: "A curious potential client who asks lots of questions.",
    opening: "Hi! A colleague mentioned your company. Can you tell me what you offer exactly?",
    difficulty: "B1",
    icon: "Phone",
  },
  {
    id: 4,
    title: "Networking",
    description: "You're at an event and someone strikes up a conversation about what you do.",
    coach_role: "A relaxed, enthusiastic person at a social/professional event.",
    opening: "Hey! I don't think we've met — so what do you do?",
    difficulty: "B1",
    icon: "Wine",
  },
  {
    id: 5,
    title: "Presenting results",
    description: "You're presenting last quarter's results to a director.",
    coach_role: "A results-focused director who wants specific numbers and next steps.",
    opening: "Thanks for putting this together. Give me the highlights — what worked and what didn't?",
    difficulty: "B2",
    icon: "TrendingUp",
  },
  {
    id: 6,
    title: "Small talk",
    description: "Casual conversation while waiting for a meeting to start.",
    coach_role: "A warm colleague making relaxed small talk.",
    opening: "Morning! Did you get up to anything nice over the weekend?",
    difficulty: "A2",
    icon: "Coffee",
  },
];
