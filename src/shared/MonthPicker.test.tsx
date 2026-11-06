// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MonthPicker } from "./MonthPicker";

afterEach(cleanup);
describe("выбор даты", () => {
  it("сохраняет выбор только после подтверждения и переключает месяц", () => {
    const onSelect = vi.fn();
    render(
      <MonthPicker
        selected="2026-11-06"
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Ноябрь 2026" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Следующий месяц" }));
    expect(screen.getByRole("heading", { name: "Декабрь 2026" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /15 декабря 2026/ }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Готово" }));
    expect(onSelect).toHaveBeenCalledWith("2026-12-15");
  });
});
