import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import TutorStage from "../components/live/TutorStage";

describe("TutorStage con avatar", () => {
  it("muestra el avatar del coach y el estado en texto", () => {
    render(<TutorStage mode="listening" name="Babelito" label="Your turn" getLevel={() => 0} />);
    expect(screen.getByTestId("tutor-avatar")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Your turn");
  });

  it("el avatar es decorativo: no lo lee el lector de pantalla", () => {
    render(<TutorStage mode="speaking" name="Babelito" label="Speaking" getLevel={() => 0.5} />);
    expect(screen.getByTestId("tutor-avatar")).toHaveAttribute("aria-hidden");
  });

  it("al conectar se ve atenuado", () => {
    render(<TutorStage mode="connecting" name="Babelito" label="Connecting" getLevel={() => 0} />);
    expect(screen.getByTestId("tutor-avatar").getAttribute("class")).toContain("opacity-50");
  });
});
