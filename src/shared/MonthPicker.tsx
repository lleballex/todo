import { useState } from "react";
import {
  addDays,
  formatDate,
  localDate,
  withoutYearSuffix,
} from "../features/tasks/model";
import { Icon, IconButton } from "./TaskControls";
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
export function MonthPicker({
  selected,
  onSelect,
  onClose,
}: {
  selected: string;
  onSelect: (d: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => selected.slice(0, 7));
  const [chosen, setChosen] = useState(selected);
  const first = new Date(`${month}-01T12:00:00`);
  const offset = (first.getDay() + 6) % 7;
  const start = addDays(`${month}-01`, -offset);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const count = offset + days;
  const change = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(localDate(d).slice(0, 7));
  };
  return (
    <>
      <div className="sheet-head">
        <h1>
          {capital(
            withoutYearSuffix(
              formatDate(`${month}-01`, { month: "long", year: "numeric" }),
            ),
          )}
        </h1>
        <IconButton name="close" label="Закрыть" onClick={onClose} />
      </div>
      <div className="month-controls">
        <button
          type="button"
          onClick={() => change(-1)}
          aria-label="Предыдущий месяц"
        >
          <Icon name="chevronLeft" />
        </button>
        <span>Выберите день</span>
        <button
          type="button"
          onClick={() => change(1)}
          aria-label="Следующий месяц"
        >
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="month-grid">
        {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {Array.from({ length: count }, (_, i) => {
          const d = addDays(start, i);
          return (
            <button
              key={d}
              className={`${d === chosen ? "date-selected" : ""} ${!d.startsWith(month) ? "outside" : ""}`}
              aria-label={formatDate(d, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              aria-pressed={d === chosen}
              onClick={() => {
                setChosen(d);
                setMonth(d.slice(0, 7));
              }}
            >
              {Number(d.slice(-2))}
            </button>
          );
        })}
      </div>
      <button className="primary" onClick={() => onSelect(chosen)}>
        Готово
      </button>
    </>
  );
}
