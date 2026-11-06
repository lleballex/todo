import type React from "react";
import {
  addDays,
  formatDate,
  localDate,
  type Task,
} from "../features/tasks/model";
const today = () => localDate();
const dateText = (date: string) =>
  date === today()
    ? "Сегодня"
    : date === addDays(today(), -1)
      ? "Вчера"
      : date === addDays(today(), 1)
        ? "Завтра"
        : formatDate(date, { day: "numeric", month: "long" });
export function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    tasks: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
      </>
    ),
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    back: <path d="M19 12H5m6-6-6 6 6 6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    calendar: (
      <>
        <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
        <path d="M8 3.5v4M16 3.5v4M4 10h16" />
      </>
    ),
    dots: (
      <>
        <circle cx="5" cy="12" r="1.5" />
        <circle cx="12" cy="12" r="1.5" />
        <circle cx="19" cy="12" r="1.5" />
      </>
    ),
    check: <path d="m5 12 4.5 4.5L19 7" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={
        name === "dots"
          ? "dots"
          : name.startsWith("chevron")
            ? "chevron-icon"
            : ""
      }
    >
      {paths[name]}
    </svg>
  );
}
export function IconButton({
  name,
  label,
  onClick,
}: {
  name: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className="icon-button" aria-label={label} onClick={onClick}>
      <Icon name={name} />
    </button>
  );
}
export function TaskRow({
  task,
  onToggle,
  onActions,
  onEdit,
  calendar = false,
}: {
  task: Task;
  onToggle: (button: HTMLButtonElement) => void;
  onActions: () => void;
  onEdit: () => void;
  calendar?: boolean;
}) {
  return (
    <div className={`task ${task.completed ? "completed" : ""}`}>
      <button
        className={`check ${task.completed ? "done" : ""}`}
        aria-label={`${task.completed ? "Вернуть в работу" : "Выполнить"}: ${task.title}`}
        onClick={(event) => onToggle(event.currentTarget)}
      >
        {task.completed && <Icon name="check" />}
      </button>
      <button className="task-body task-open" onClick={onEdit}>
        <span className="task-name">{task.title}</span>
        <span
          className={`task-meta ${task.date && task.date < today() && !task.completed ? "overdue" : ""}`}
        >
          {calendar && !task.time
            ? "Без времени"
            : task.date
              ? dateText(task.date)
              : "Без даты"}
          {task.time ? ` · ${task.time}` : ""}
          {!calendar && task.date && task.date < today() && !task.completed
            ? " · перенести"
            : ""}
        </span>
      </button>
      <button
        className="more"
        aria-label={`Действия: ${task.title}`}
        onClick={onActions}
      >
        <Icon name="dots" />
      </button>
    </div>
  );
}
