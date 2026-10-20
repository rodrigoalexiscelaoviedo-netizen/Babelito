import { describe, expect, it } from "vitest";
import { addLocalDays, localDateISO, timestampToLocalDate } from "../lib/dates";

// Construimos fechas en hora LOCAL (new Date(y, m, d, h)) para que el test no
// dependa de la zona horaria de la máquina donde corre.
describe("localDateISO", () => {
  it("usa el día local aunque en UTC todavía sea el anterior", () => {
    // 00:30 local del 9 de octubre: en UTC sería todavía el 8 en zonas al este de Greenwich.
    expect(localDateISO(new Date(2026, 9, 9, 0, 30))).toBe("2026-10-09");
  });

  it("rellena mes y día con cero", () => {
    expect(localDateISO(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });
});

describe("timestampToLocalDate", () => {
  it("convierte un timestamp a la fecha local del dispositivo", () => {
    const local = new Date(2026, 9, 9, 1, 15);
    expect(timestampToLocalDate(local.toISOString())).toBe("2026-10-09");
  });
});

describe("addLocalDays", () => {
  it("retrocede un día cruzando el cambio de mes", () => {
    expect(addLocalDays(-1, new Date(2026, 9, 1, 12))).toBe("2026-09-30");
  });

  it("avanza siete días", () => {
    expect(addLocalDays(7, new Date(2026, 9, 9, 12))).toBe("2026-10-16");
  });
});
