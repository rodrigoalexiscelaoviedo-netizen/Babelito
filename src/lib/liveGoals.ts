/**
 * Tres objetivos por situación: dan a la llamada un propósito claro y algo que
 * tachar. Solo inglés; sin objetivos, la llamada funciona igual.
 */
export const LIVE_GOALS: Record<string, [string, string, string]> = {
  "job-interview": ["Introduce yourself and your experience", "Describe one strength with an example", "Ask the interviewer a question"],
  shopping: ["Ask for a size or colour", "Ask the price", "Say whether you'll buy it and how you'll pay"],
  transport: ["Ask which bus goes to your destination", "Buy a ticket", "Ask where to get off"],
  airport: ["Check in and say where you're flying", "Ask for the seat you want", "Solve the problem before boarding"],
  tourist: ["Ask for directions", "Ask about opening times", "Ask for a place to eat"],
  restaurant: ["Ask for a table", "Order food and a drink", "Ask for the bill"],
  hotel: ["Check in with your booking", "Ask about breakfast", "Explain a problem with your room"],
  health: ["Explain your symptoms", "Say how long you've had them", "Ask what you should do"],
  "making-friends": ["Introduce yourself", "Find something you have in common", "Suggest a plan to meet again"],
  "phone-calls": ["Say who you are and why you're calling", "Ask to change your appointment", "Confirm the new day and time"],
  "work-meetings": ["Explain your plan", "Disagree politely with a concern", "Agree on the next steps"],
  "renting-home": ["Ask about the price and bills", "Ask about the contract", "Arrange a viewing or the next step"],
  bank: ["Say you want to open an account", "Ask about fees", "Explain a problem with your card"],
  gym: ["Ask about membership prices", "Ask about opening hours or classes", "Ask for help with a machine"],
  "moving-home": ["Ask for internet at your new address", "Compare or ask about the plan", "Change the installation appointment"],
  complaints: ["Explain what happened with your order", "Say how it affected you, politely", "Ask for a solution"],
  "first-date": ["Ask about their interests", "Share something about yourself", "Suggest meeting again"],
  "remote-work": ["Report a tech problem and fix it", "Share your plan", "Agree on a time across time zones"],
};

export function goalsFor(situationId: string): string[] {
  return LIVE_GOALS[situationId] ?? [];
}
