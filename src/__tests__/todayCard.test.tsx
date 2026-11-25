import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));

import TodayCard, { type TodayCardProps } from "../components/TodayCard";
import type { DailyLesson } from "../lib/dailyLesson";

const lesson: DailyLesson = {
  id: "l1",
  user_id: "u1",
  lesson_date: "2026-11-25",
  chunk_id: 1,
  word: "thorough",
  topic: "Your last holiday",
  completed: false,
  completed_at: null,
  chunk_done: false,
  convo_done: false,
  word_done: false,
  chunk: { id: 1, english: "It slipped my mind", spanish: "Se me pasó", category: null },
};

const tasks = [
  { id: "review", title: "Review 3 items", detail: "Due today", minutes: 3, to: "/review", done: false },
  { id: "talk", title: "Have a conversation", detail: "Five minutes", minutes: 5, to: "/conversation", done: false },
  { id: "listen", title: "Train your ear", detail: "Dictation", minutes: 4, to: "/dictation", done: true },
];

function setup(over: Partial<TodayCardProps> = {}) {
  const props: TodayCardProps = {
    lang: "en",
    lesson,
    tasks,
    loading: false,
    error: "",
    itemError: "",
    completing: false,
    streak: 4,
    freezesLeft: 0,
    wordDef: null,
    onRetry: vi.fn(),
    onToggle: vi.fn(),
    onComplete: vi.fn(),
    onSpeak: vi.fn(),
    ...over,
  };
  render(
    <MemoryRouter>
      <TodayCard {...props} />
    </MemoryRouter>
  );
  return props;
}

describe("TodayCard (una sola lista del día)", () => {
  it("junta práctica y recomendadas sin repetir la conversación", () => {
    setup();
    expect(screen.getByText("Your last holiday")).toBeInTheDocument();
    expect(screen.queryByText("Have a conversation")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Review 3 items/ })).toHaveAttribute("href", "/review");
    expect(screen.getByText("0 of 3 done")).toBeInTheDocument();
    // Solo suma los minutos de lo pendiente.
    expect(screen.getByText("about 3 min")).toBeInTheDocument();
  });

  it("la frase se marca con un botón y no se puede cerrar el día incompleto", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Mark as done: Chunk of the day" }));
    expect(props.onToggle).toHaveBeenCalledWith("chunk_done");
    expect(screen.getByRole("button", { name: /Complete today's practice/ })).toBeDisabled();
  });

  it("con el día cerrado siguen visibles las recomendadas", () => {
    setup({ lesson: { ...lesson, completed: true } });
    expect(screen.getByText("All done for today!")).toBeInTheDocument();
    expect(screen.getByText("Review 3 items")).toBeInTheDocument();
  });

  it("si falla la carga ofrece reintentar", () => {
    const props = setup({ lesson: null, error: "network" });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalled();
  });

  it("en catalán muestra los textos en catalán", () => {
    setup({ lang: "ca" });
    expect(screen.getByText("Per tancar el dia")).toBeInTheDocument();
  });
});
