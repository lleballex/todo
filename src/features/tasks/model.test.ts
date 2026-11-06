import { describe, expect, it } from "vitest";
import { addDays, emptyData, localDate, parseData, validDate } from "./model";

describe("даты задач", () => {
  it("проверяет реальные календарные даты", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2025-13-01")).toBe(false);
  });
  it("переходит через границы месяца и года", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(localDate(new Date(2026, 0, 2))).toBe("2026-01-02");
  });
});
describe("данные", () => {
  it("принимает корректную версию и отклоняет повреждённые данные", () => {
    expect(parseData(JSON.stringify(emptyData()))).toEqual(emptyData());
    expect(() => parseData("{")).toThrow();
    expect(() => parseData('{"version":2}')).toThrow();
  });
});
