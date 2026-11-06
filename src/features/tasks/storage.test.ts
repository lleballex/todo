import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyData } from "./model";
import { readData, writeData } from "./storage";

let stored: string | null = null;
beforeEach(() => {
  stored = null;
  vi.stubGlobal("localStorage", {
    getItem: () => stored,
    setItem: (_key: string, value: string) => {
      stored = value;
    },
  });
  vi.stubGlobal("crypto", { randomUUID: () => "revision-1" });
});
describe("хранилище", () => {
  it("сохраняет данные с новой ревизией", () => {
    const saved = writeData({ ...emptyData(), welcomed: true }, "");
    expect(readData()).toEqual(saved);
    expect(saved.revision).toBe("revision-1");
  });
  it("не перезаписывает более новую ревизию", () => {
    writeData(emptyData(), "");
    expect(() => writeData({ ...emptyData(), welcomed: true }, "")).toThrow();
    expect(readData().welcomed).toBe(false);
  });
  it("не перезаписывает повреждённые данные", () => {
    stored = "invalid";
    expect(() => writeData(emptyData(), "")).toThrow();
    expect(stored).toBe("invalid");
  });
});
