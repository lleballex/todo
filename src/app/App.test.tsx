// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  const storage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    };
  };
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});
describe("основной сценарий", () => {
  it("позволяет начать работу, создать и выполнить задачу", async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: "Начать" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Добавить задачу" }),
    );
    fireEvent.change(screen.getByPlaceholderText("Что нужно сделать?"), {
      target: { value: "Купить хлеб" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Добавить задачу",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Все задачи" }));
    expect(await screen.findByText("Купить хлеб")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Выполнить: Купить хлеб" }),
    );
    expect(
      screen.getByRole("button", { name: "Вернуть в работу: Купить хлеб" }),
    ).toBeTruthy();
    expect(
      document.querySelector(".completion-celebration[aria-hidden='true']"),
    ).toBeTruthy();
  });
  it("выполняет задачу без конфетти при уменьшении движения", async () => {
    localStorage.setItem(
      "dela.data",
      JSON.stringify({
        version: 1,
        revision: "",
        welcomed: true,
        tasks: [
          {
            id: "task-1",
            title: "Проверка",
            description: "",
            date: "",
            time: "",
            completed: false,
            deleted: false,
            order: 1,
            reminder: false,
            notified: false,
          },
        ],
      }),
    );
    history.replaceState({}, "", "/?view=all");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Выполнить: Проверка" }),
    );
    expect(
      screen.getByRole("button", { name: "Вернуть в работу: Проверка" }),
    ).toBeTruthy();
    expect(document.querySelector(".completion-celebration")).toBeNull();
  });
});
