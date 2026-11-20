import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({ language: "en" }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "u1", learning_language: h.language } }),
}));
vi.mock("../lib/plan", () => ({
  loadPlanInput: () => Promise.resolve({}),
  buildPlan: () => ({
    doneToday: 1,
    tasks: [
      { id: "review", title: "Review 3 items", detail: "Your saved words", minutes: 5, to: "/review", done: true },
      { id: "talk", title: "Have a conversation", detail: "Ten minutes with your coach", minutes: 10, to: "/conversation", done: false },
    ],
    days: [],
    goals: [],
  }),
}));

import TodayTasks from "../components/TodayTasks";

describe("TodayTasks (plan de hoy en Inicio)", () => {
  beforeEach(() => {
    h.language = "en";
  });

  it("muestra las tareas de hoy con su avance y enlazan a su pantalla", async () => {
    render(
      <MemoryRouter>
        <TodayTasks />
      </MemoryRouter>
    );
    expect(await screen.findByText("Have a conversation")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done · about 10 min left")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Have a conversation/ })).toHaveAttribute("href", "/conversation");
  });

  it("en catalán no se muestra (el plan aún no tiene esa versión)", async () => {
    h.language = "ca";
    const { container } = render(
      <MemoryRouter>
        <TodayTasks />
      </MemoryRouter>
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
  });
});
