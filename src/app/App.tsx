import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDays,
  emptyData,
  formatDate,
  localDate,
  validDate,
  withoutYearSuffix,
  type Data,
  type Task,
} from "../features/tasks/model";
import { readData, writeData } from "../features/tasks/storage";

import { Icon, IconButton, TaskRow } from "../shared/TaskControls";
import { Empty } from "../shared/Empty";
import { MonthPicker } from "../shared/MonthPicker";
import { TaskForm } from "../features/tasks/TaskForm";
import {
  CompletionCelebration,
  type CelebrationPosition,
} from "../features/tasks/CompletionCelebration";

type Modal =
  | {
      type: "form";
      task?: Task;
      date?: string;
      draft?: Task;
      revision?: string;
    }
  | { type: "actions"; task: Task }
  | { type: "delete"; task: Task }
  | { type: "discard" }
  | { type: "month" }
  | null;
const today = () => localDate();
const taskGenitive = (n: number) =>
  n % 10 === 1 && n % 100 !== 11 ? "задачи" : "задач";
const taskWord = (n: number) =>
  n % 100 >= 11 && n % 100 <= 14
    ? "задач"
    : n % 10 === 1
      ? "задача"
      : n % 10 >= 2 && n % 10 <= 4
        ? "задачи"
        : "задач";
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
const dateText = (date: string) =>
  date === today()
    ? "Сегодня"
    : date === addDays(today(), -1)
      ? "Вчера"
      : date === addDays(today(), 1)
        ? "Завтра"
        : formatDate(date, { day: "numeric", month: "long" });
function App() {
  const [data, setData] = useState<Data>(() => {
    try {
      return readData();
    } catch {
      return emptyData();
    }
  });
  const [error, setError] = useState(() => {
    try {
      readData();
      return "";
    } catch {
      return "Не удалось прочитать сохранённые данные. Они не будут перезаписаны.";
    }
  });
  const [location, setLocation] = useState(
    () => window.location.pathname + window.location.search,
  );
  const [modal, setModal] = useState<Modal>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<Task | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [celebrations, setCelebrations] = useState<CelebrationPosition[]>([]);
  const celebrationId = useRef(0);
  const finishCelebration = useCallback(
    (id: number) =>
      setCelebrations((items) => items.filter((item) => item.id !== id)),
    [],
  );
  const [clock, setClock] = useState(Date.now());
  const previousForm = useRef<Modal>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const navigate = useCallback((url: string, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    setLocation(window.location.pathname + window.location.search);
    window.scrollTo(0, 0);
  }, []);
  const save = useCallback((next: Data) => {
    try {
      const saved = writeData(next, dataRef.current.revision);
      dataRef.current = saved;
      setData(saved);
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить данные.");
      return false;
    }
  }, []);
  useEffect(() => {
    const f = () => {
      if (history.state?.modal) {
        return;
      }
      if (modal) {
        if (dirty) {
          history.pushState({ modal: true }, "");
          setModal({ type: "discard" });
        } else setModal(null);
      } else setLocation(locationFromWindow());
    };
    window.addEventListener("popstate", f);
    return () => window.removeEventListener("popstate", f);
  }, [modal, dirty]);
  useEffect(() => {
    const f = (e: StorageEvent) => {
      if (e.key === "dela.data") {
        try {
          const d = readData();
          dataRef.current = d;
          setData(d);
          setError(
            "Данные обновлены в другой вкладке. Проверьте изменения перед сохранением.",
          );
        } catch {
          setError("Не удалось прочитать данные из другой вкладки.");
        }
      }
    };
    window.addEventListener("storage", f);
    return () => window.removeEventListener("storage", f);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!data.welcomed && !location.startsWith("/welcome")) {
      sessionStorage.setItem("dela.return", location);
      // Browser location must follow the persisted onboarding state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      navigate("/welcome", true);
    } else if (data.welcomed && location.startsWith("/welcome"))
      navigate("/", true);
  }, [data.welcomed, location, navigate]);
  useEffect(() => {
    if (!modal) return;
    const prev = lastFocus.current;
    const el = modalRef.current;
    el?.querySelector<HTMLElement>("input,button,textarea")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
      if (e.key === "Tab" && el) {
        const nodes = Array.from(
          el.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input:not([disabled]),textarea:not([disabled])",
          ),
        );
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [modal]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted")
      return;
    const due = data.tasks.filter(
      (t) =>
        t.reminder &&
        !t.notified &&
        !t.completed &&
        !t.deleted &&
        t.date &&
        t.time &&
        new Date(`${t.date}T${t.time}`).getTime() <= clock,
    );
    if (!due.length) return;
    for (const t of due)
      new Notification("Пора выполнить задачу", { body: t.title });
    save({
      ...data,
      tasks: data.tasks.map((t) =>
        due.some((d) => d.id === t.id) ? { ...t, notified: true } : t,
      ),
    });
  }, [clock, data, save]);
  const openModal = (m: Modal) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setDirty(false);
    history.pushState({ modal: true }, "");
    setModal(m?.type === "form" ? { ...m, revision: data.revision } : m);
  };
  function closeModal() {
    if (dirty && modal?.type === "form") {
      setModal({ type: "discard" });
      return;
    }
    setDirty(false);
    setModal(null);
    if (history.state?.modal) history.back();
  }
  const changeTask = (task: Task) =>
    save({
      ...data,
      tasks: data.tasks.map((t) => (t.id === task.id ? task : t)),
    });
  const toggle = (t: Task, button: HTMLButtonElement) => {
    const bounds = (
      button.closest(".task, .event") || button
    ).getBoundingClientRect();
    if (!changeTask({ ...t, completed: !t.completed }) || t.completed) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    setCelebrations((items) => [
      ...items,
      {
        id: ++celebrationId.current,
        left: bounds.left,
        top: bounds.top + bounds.height / 2,
        width: bounds.width,
      },
    ]);
  };
  const edit = (t: Task) => openModal({ type: "form", task: t });
  const actions = (t: Task) => openModal({ type: "actions", task: t });
  const row = (t: Task) => (
    <TaskRow
      key={t.id}
      task={t}
      onToggle={(button) => toggle(t, button)}
      onEdit={() => edit(t)}
      onActions={() => actions(t)}
    />
  );
  const url = new URL(location, "http://localhost");
  const path = url.pathname;
  const rawView = url.searchParams.get("view");
  const view = rawView === "upcoming" || rawView === "all" ? rawView : "today";
  const selected = validDate(url.searchParams.get("date") || "")
    ? url.searchParams.get("date")!
    : today();
  const live = data.tasks
    .filter((t) => !t.deleted)
    .sort((a, b) => a.order - b.order);
  const todayTasks = live.filter((t) => t.date === today());
  const done = todayTasks.filter((t) => t.completed).length;
  const visible = live.filter(
    (t) =>
      view === "all" ||
      (view === "upcoming" ? t.date > today() : !!t.date && t.date <= today()),
  );
  const active = visible.filter((t) => !t.completed);
  const overdue = active.filter(
    (t) => t.date && t.date < today() && view === "today",
  );
  const current = active.filter((t) => !overdue.includes(t));
  const completed = visible.filter((t) => t.completed);
  const dayTasks = live.filter((t) => t.date === selected);
  const openForm = (date?: string) => openModal({ type: "form", date });
  const welcome = path === "/welcome";
  return (
    <div className={welcome ? "welcome-view" : "desktop-view"}>
      {welcome ? (
        <main className="phone intro">
          <div className="intro-art" />
          <div className="intro-panel">
            <h1>
              Место
              <br />
              для ваших <span>дел</span>
            </h1>
            <div className="intro-bottom">
              Начать{" "}
              <IconButton
                name="arrow"
                label="Начать"
                onClick={() => {
                  if (save({ ...data, welcomed: true })) {
                    const target = sessionStorage.getItem("dela.return") || "/";
                    sessionStorage.removeItem("dela.return");
                    navigate(target, true);
                  }
                }}
              />
            </div>
          </div>
        </main>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <button className="brand" onClick={() => navigate("/")}>
              <span className="brand-mark">/</span> дела
              <span className="brand-dot">.</span>
            </button>
            <span className="nav-label">ПРОСТРАНСТВО</span>
            <nav className="side-nav">
              <button
                className={path === "/" ? "is-current" : ""}
                onClick={() => navigate("/")}
              >
                <span className="nav-icon">
                  <Icon name="tasks" />
                </span>{" "}
                Задачи
              </button>
              <button
                className={path === "/calendar" ? "is-current" : ""}
                onClick={() => navigate("/calendar")}
              >
                <span className="nav-icon">
                  <Icon name="calendar" />
                </span>{" "}
                Календарь
              </button>
              <button
                className={path === "/trash" ? "is-current" : ""}
                onClick={() => navigate("/trash")}
              >
                <span className="nav-icon">
                  <Icon name="trash" />
                </span>{" "}
                Удалённые
              </button>
            </nav>
            <div className="side-bottom">
              <div className="side-art" />
              <p>
                Место для ваших
                <br />
                <strong>важных дел.</strong>
              </p>
            </div>
          </aside>
          <main
            className={`phone ${path === "/calendar" ? "desktop-calendar" : ""}`}
          >
            {path === "/" && (
              <div className="content home-content">
                <div className="top">
                  <div>
                    <div className="eyebrow">
                      {capital(
                        formatDate(today(), {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }),
                      )}
                    </div>
                    <h1 className="heading">
                      {new Date().getHours() < 12
                        ? "Доброе"
                        : new Date().getHours() < 18
                          ? "Добрый"
                          : "Добрый"}
                      <br />
                      <span>
                        {new Date().getHours() < 12
                          ? "утро"
                          : new Date().getHours() < 18
                            ? "день"
                            : "вечер"}
                      </span>
                    </h1>
                  </div>
                  <div className="actions header-actions">
                    <IconButton
                      name="calendar"
                      label="Календарь"
                      onClick={() => navigate("/calendar")}
                    />
                    <IconButton
                      name="dots"
                      label="Меню"
                      onClick={() => navigate("/menu")}
                    />
                  </div>
                </div>
                <div className="progress">
                  <small>
                    {formatDate(today(), { day: "numeric", month: "long" })},{" "}
                    {formatDate(today(), { weekday: "long" })}
                  </small>
                  <h2>Прогресс сегодня</h2>
                  <div className="stat">
                    {todayTasks.length
                      ? `Выполнено ${done} из ${todayTasks.length} ${taskGenitive(todayTasks.length)}`
                      : "На сегодня пока нет задач"}
                  </div>
                  <strong
                    className={!todayTasks.length ? "progress-empty" : ""}
                  >
                    {todayTasks.length
                      ? `${Math.round((done / todayTasks.length) * 100)}%`
                      : "Всё впереди"}
                  </strong>
                  <div className="stripes" />
                </div>
                <nav className="tabs" aria-label="Представление задач">
                  {(
                    [
                      ["today", "Сегодня"],
                      ["upcoming", "Предстоящие"],
                      ["all", "Все задачи"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      className={`tab ${view === v ? "active" : ""}`}
                      onClick={() =>
                        navigate(v === "today" ? "/" : `/?view=${v}`)
                      }
                    >
                      {label}
                    </button>
                  ))}
                </nav>
                {error && !modal && (
                  <div className="warning storage-inline" role="alert">
                    {error}{" "}
                    <button onClick={() => setError("")}>Закрыть</button>
                  </div>
                )}
                {visible.length === 0 ? (
                  <Empty
                    title="Здесь пока пусто"
                    text="Добавьте задачу, чтобы начать планировать день."
                  />
                ) : (
                  <>
                    {overdue.length > 0 && (
                      <>
                        <h2 className="section-title">
                          Просрочено{" "}
                          <span className="count">{overdue.length}</span>
                        </h2>
                        {overdue.map(row)}
                      </>
                    )}
                    {view === "upcoming" &&
                      (() => {
                        const nextMonday = addDays(
                          today(),
                          7 -
                            ((new Date(`${today()}T12:00:00`).getDay() + 6) %
                              7),
                        );
                        const groups = new Map<string, Task[]>();
                        [...current]
                          .sort(
                            (a, b) =>
                              a.date.localeCompare(b.date) || a.order - b.order,
                          )
                          .forEach((task) => {
                            const label =
                              task.date === addDays(today(), 1)
                                ? "Завтра"
                                : task.date >= nextMonday &&
                                    task.date < addDays(nextMonday, 7)
                                  ? "На следующей неделе"
                                  : capital(
                                      formatDate(task.date, {
                                        day: "numeric",
                                        month: "long",
                                      }),
                                    );
                            groups.set(label, [
                              ...(groups.get(label) || []),
                              task,
                            ]);
                          });
                        return [...groups].map(([label, group]) => (
                          <div className="task-group" key={label}>
                            <h2 className="section-title">
                              {label}{" "}
                              <span className="count">{group.length}</span>
                            </h2>
                            {group.map(row)}
                          </div>
                        ));
                      })()}
                    {view !== "upcoming" && current.length > 0 && (
                      <>
                        <h2 className="section-title">
                          {view === "all" ? "Активные" : "В работе"}{" "}
                          <span className="count">{current.length}</span>
                        </h2>
                        {current.map(row)}
                      </>
                    )}
                    {completed.length > 0 && (
                      <>
                        <button
                          className="section-title section-button"
                          onClick={() => setExpanded(!expanded)}
                          aria-expanded={expanded}
                        >
                          Выполнено{" "}
                          <span className="count">{completed.length}</span>{" "}
                          <span
                            className={`section-chevron ${expanded ? "" : "is-collapsed"}`}
                          >
                            <Icon name="chevronDown" />
                          </span>
                        </button>
                        {expanded && completed.map(row)}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
            {path === "/calendar" && (
              <>
                <div className="cal-header">
                  <div className="month">
                    <IconButton
                      name="back"
                      label="Назад"
                      onClick={() => navigate("/")}
                    />
                    <button
                      className="month-picker"
                      onClick={() => openModal({ type: "month" })}
                    >
                      {capital(
                        withoutYearSuffix(
                          formatDate(selected, {
                            month: "long",
                            year: "numeric",
                          }),
                        ),
                      )}{" "}
                      <Icon name="chevronDown" />
                    </button>
                  </div>
                  <div
                    className="desktop-month"
                    aria-label={capital(
                      formatDate(selected, { month: "long", year: "numeric" }),
                    )}
                  >
                    {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(
                      (day, i) => (
                        <span className="month-weekday" key={i}>
                          {day}
                        </span>
                      ),
                    )}
                    {(() => {
                      const month = selected.slice(0, 7);
                      const first = `${month}-01`;
                      const start = addDays(
                        first,
                        -((new Date(`${first}T12:00:00`).getDay() + 6) % 7),
                      );
                      const last = new Date(
                        new Date(`${first}T12:00:00`).getFullYear(),
                        new Date(`${first}T12:00:00`).getMonth() + 1,
                        0,
                      ).getDate();
                      const count =
                        ((new Date(`${first}T12:00:00`).getDay() + 6) % 7) +
                        last;
                      return Array.from({ length: count }, (_, i) => {
                        const value = addDays(start, i);
                        return (
                          <button
                            key={value}
                            className={`${value === selected ? "month-selected" : ""} ${!value.startsWith(month) ? "month-outside" : ""}`}
                            aria-label={formatDate(value, {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                            aria-current={
                              value === selected ? "date" : undefined
                            }
                            onClick={() => navigate(`/calendar?date=${value}`)}
                          >
                            {Number(value.slice(-2))}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <div className="week">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(`${selected}T12:00:00`);
                      const monday = (d.getDay() + 6) % 7;
                      const value = addDays(selected, i - monday);
                      return (
                        <button
                          key={value}
                          className={`day ${value === selected ? "selected" : ""}`}
                          onClick={() => navigate(`/calendar?date=${value}`)}
                        >
                          <small>
                            {formatDate(value, { weekday: "short" }).replace(
                              ".",
                              "",
                            )}
                          </small>
                          <b>{new Date(`${value}T12:00:00`).getDate()}</b>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="calendar-body">
                  <div className="calendar-label">
                    {dayTasks.length
                      ? `${dayTasks.length} ${taskWord(dayTasks.length)} · ${dateText(selected).toLowerCase()}`
                      : "Нет задач"}
                  </div>
                  <h1 className="heading">
                    {capital(formatDate(selected, { weekday: "long" }))}
                  </h1>
                  <p className="selected-date">
                    {withoutYearSuffix(
                      formatDate(selected, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }),
                    )}
                  </p>
                  {dayTasks.filter((t) => !t.time).length > 0 && (
                    <div className="untimed">
                      {dayTasks
                        .filter((t) => !t.time)
                        .map((t) => (
                          <TaskRow
                            key={t.id}
                            task={t}
                            onToggle={(button) => toggle(t, button)}
                            onEdit={() => edit(t)}
                            onActions={() => actions(t)}
                            calendar
                          />
                        ))}
                    </div>
                  )}
                  {dayTasks.length === 0 ? (
                    <Empty
                      title="Свободный день"
                      text="На этот день задач пока нет. Можно добавить первую."
                      action={() => openForm(selected)}
                    />
                  ) : (
                    <div className="timeline">
                      {(() => {
                        const hours = dayTasks
                          .filter((t) => t.time)
                          .map((t) => Number(t.time.slice(0, 2)));
                        const start = hours.length
                          ? Math.max(0, Math.min(...hours) - 1)
                          : 10;
                        const end = hours.length
                          ? Math.min(
                              23,
                              Math.max(start + 5, Math.max(...hours) + 1),
                            )
                          : 15;
                        return Array.from(
                          { length: end - start + 1 },
                          (_, offset) => {
                            const i = start + offset;
                            const tasks = dayTasks.filter(
                              (t) => t.time && Number(t.time.slice(0, 2)) === i,
                            );
                            return (
                              <div className="timeline-row" key={i}>
                                <div className="time">
                                  {String(i).padStart(2, "0")}:00
                                </div>
                                <div className="line">
                                  {tasks.map((t) => (
                                    <div className="event" key={t.id}>
                                      <button
                                        className={`check ${t.completed ? "done" : ""}`}
                                        onClick={(event) =>
                                          toggle(t, event.currentTarget)
                                        }
                                        aria-label={`Изменить выполнение: ${t.title}`}
                                      >
                                        {t.completed && <Icon name="check" />}
                                      </button>
                                      <button
                                        className="event-title task-open"
                                        onClick={() => edit(t)}
                                      >
                                        {t.time.endsWith(":00")
                                          ? t.title
                                          : `${t.time} · ${t.title}`}
                                      </button>
                                      <button
                                        className="more"
                                        onClick={() => actions(t)}
                                        aria-label={`Действия: ${t.title}`}
                                      >
                                        <Icon name="dots" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            )}
            {path === "/menu" && (
              <div className="content">
                <div className="menu-mobile-top top">
                  <div>
                    <div className="eyebrow">
                      {capital(
                        formatDate(today(), {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }),
                      )}
                    </div>
                    <h1 className="heading">
                      <a
                        href="/"
                        onClick={(event) => {
                          if (
                            event.button === 0 &&
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            !event.altKey
                          ) {
                            event.preventDefault();
                            navigate("/");
                          }
                        }}
                      >
                        {new Date().getHours() < 12 ? "Доброе" : "Добрый"}
                        <br />
                        <span>
                          {new Date().getHours() < 12
                            ? "утро"
                            : new Date().getHours() < 18
                              ? "день"
                              : "вечер"}
                        </span>
                      </a>
                    </h1>
                  </div>
                  <div className="actions header-actions">
                    <IconButton
                      name="calendar"
                      label="Календарь"
                      onClick={() => navigate("/calendar")}
                    />
                    <IconButton
                      name="dots"
                      label="Меню"
                      onClick={() => navigate("/menu")}
                    />
                  </div>
                </div>
                <h1 className="page-title">Меню</h1>
                <div className="menu navigation-menu">
                  <button
                    className="mobile-menu-link"
                    onClick={() => navigate("/")}
                  >
                    Задачи <span aria-hidden="true">↗</span>
                  </button>
                  <button
                    className="mobile-menu-link"
                    onClick={() => navigate("/calendar")}
                  >
                    Календарь <span aria-hidden="true">↗</span>
                  </button>
                  <button onClick={() => navigate("/trash")}>
                    Удалённые задачи <span>↗</span>
                  </button>
                </div>
              </div>
            )}
            {path === "/trash" && (
              <div className="content trash-content">
                <div className="nav-back">
                  <IconButton
                    name="back"
                    label="Назад"
                    onClick={() =>
                      navigate(
                        window.matchMedia("(min-width: 761px)").matches
                          ? "/"
                          : "/menu",
                      )
                    }
                  />{" "}
                  Назад
                </div>
                <h1 className="page-title">Удалённые</h1>
                {data.tasks.some((t) => t.deleted) && (
                  <p className="description">
                    Здесь можно восстановить задачи или удалить их навсегда.
                  </p>
                )}
                {data.tasks.filter((t) => t.deleted).length === 0 ? (
                  <Empty
                    title="Здесь ничего нет"
                    text="Удалённые задачи появятся здесь — их можно будет восстановить."
                  />
                ) : (
                  data.tasks
                    .filter((t) => t.deleted)
                    .map((t) => (
                      <div className="trash-row" key={t.id}>
                        <div className="task-name">{t.title}</div>
                        {t.deletedAt && (
                          <div className="task-meta">
                            Удалена{" "}
                            {formatDate(t.deletedAt, {
                              day: "numeric",
                              month: "long",
                            })}
                          </div>
                        )}
                        <div className="trash-actions">
                          <button
                            className="chip"
                            onClick={() =>
                              changeTask({
                                ...t,
                                deleted: false,
                                deletedAt: undefined,
                              })
                            }
                          >
                            Восстановить
                          </button>
                          <button
                            className="chip danger"
                            onClick={() =>
                              openModal({ type: "delete", task: t })
                            }
                          >
                            Удалить навсегда
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
            {!["/", "/calendar", "/menu", "/trash"].includes(path) && (
              <div className="content">
                <div className="nav-back">
                  <IconButton
                    name="back"
                    label="На главную"
                    onClick={() => navigate("/")}
                  />{" "}
                  На главную
                </div>
                <Empty
                  title="Страница не найдена"
                  text="Возможно, адрес изменился или в нём опечатка."
                />
              </div>
            )}
            {(path === "/" || path === "/calendar") && (
              <button
                className="fab"
                aria-label="Добавить задачу"
                onClick={() =>
                  openForm(path === "/calendar" ? selected : undefined)
                }
              >
                <Icon name="plus" />
              </button>
            )}
          </main>
        </div>
      )}
      {celebrations.map((position) => (
        <CompletionCelebration
          key={position.id}
          position={position}
          onFinish={finishCelebration}
        />
      ))}
      {error && (path !== "/" || modal) && (
        <div className="storage-warning" role="alert">
          {error} <button onClick={() => setError("")}>Закрыть</button>
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          Задача удалена{" "}
          <button
            onClick={() => {
              changeTask({ ...notice, deleted: false, deletedAt: undefined });
              setNotice(null);
            }}
          >
            Отменить
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-layer"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="sheet" role="dialog" aria-modal="true" ref={modalRef}>
            <div className="handle" />
            {modal.type === "form" && (
              <TaskForm
                key={modal.task?.id || "new"}
                task={modal.task}
                date={modal.date}
                initialDraft={modal.draft}
                revision={modal.revision}
                onDirty={(draft) => {
                  setDirty(true);
                  previousForm.current = { ...modal, draft };
                }}
                onClose={closeModal}
                onDelete={
                  modal.task
                    ? () => {
                        if (
                          changeTask({
                            ...modal.task!,
                            deleted: true,
                            deletedAt: today(),
                          })
                        ) {
                          setNotice(modal.task!);
                          setDirty(false);
                          setModal(null);
                          if (history.state?.modal) history.back();
                          setTimeout(() => setNotice(null), 6000);
                        }
                      }
                    : undefined
                }
                onSave={(task) => {
                  if (modal.revision !== data.revision) {
                    setError(
                      "Данные изменились в другой вкладке. Закройте форму и откройте её снова.",
                    );
                    return;
                  }
                  const next = modal.task
                    ? data.tasks.map((t) => (t.id === task.id ? task : t))
                    : [...data.tasks, task];
                  if (save({ ...data, tasks: next })) {
                    setDirty(false);
                    setModal(null);
                    if (history.state?.modal) history.back();
                  }
                }}
              />
            )}
            {modal.type === "actions" && (
              <>
                <div className="sheet-head">
                  <h1>Действия с задачей</h1>
                  <IconButton
                    name="close"
                    label="Закрыть"
                    onClick={closeModal}
                  />
                </div>
                <p className="description">{modal.task.title}</p>
                <div className="menu action-menu">
                  <button
                    onClick={() => {
                      setModal({
                        type: "form",
                        task: modal.task,
                        revision: data.revision,
                      });
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => {
                      changeTask({ ...modal.task, date: today() });
                      closeModal();
                    }}
                  >
                    Перенести на сегодня
                  </button>
                  <button
                    onClick={() => {
                      changeTask({ ...modal.task, date: addDays(today(), 1) });
                      closeModal();
                    }}
                  >
                    Перенести на завтра
                  </button>
                  {[-1, 1].map((dir) => (
                    <button
                      key={dir}

                      onClick={() => {
                        const sorted = live.filter((t) => !t.completed);
                        const index = sorted.findIndex(
                          (t) => t.id === modal.task.id,
                        );
                        const other = sorted[index + dir];
                        if (other)
                          save({
                            ...data,
                            tasks: data.tasks.map((t) =>
                              t.id === modal.task.id
                                ? { ...t, order: other.order }
                                : t.id === other.id
                                  ? { ...t, order: modal.task.order }
                                  : t,
                            ),
                          });
                        closeModal();
                      }}
                    >
                      Переместить {dir < 0 ? "выше ↑" : "ниже ↓"}
                    </button>
                  ))}
                  <button
                    className="action-delete"
                    onClick={() => {
                      if (
                        changeTask({
                          ...modal.task,
                          deleted: true,
                          deletedAt: today(),
                        })
                      ) {
                        setNotice(modal.task);
                        closeModal();
                        setTimeout(() => setNotice(null), 6000);
                      }
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </>
            )}
            {modal.type === "delete" && (
              <>
                <h1 className="heading">Удалить навсегда?</h1>
                <p className="description">
                  Задачу «{modal.task.title}» больше нельзя будет восстановить.
                </p>
                <button
                  className="primary primary-danger"
                  onClick={() => {
                    if (
                      save({
                        ...data,
                        tasks: data.tasks.filter((t) => t.id !== modal.task.id),
                      })
                    )
                      closeModal();
                  }}
                >
                  Удалить навсегда
                </button>
                <button className="secondary" onClick={closeModal}>
                  Отмена
                </button>
              </>
            )}
            {modal.type === "discard" && (
              <>
                <h1 className="heading">Закрыть без сохранения?</h1>
                <p className="description">Изменения в задаче не сохранятся.</p>
                <button
                  className="primary"
                  onClick={() => setModal(previousForm.current)}
                >
                  Продолжить редактирование
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    setDirty(false);
                    setModal(null);
                    if (history.state?.modal) history.back();
                  }}
                >
                  Закрыть без сохранения
                </button>
              </>
            )}
            {modal.type === "month" && (
              <MonthPicker
                selected={selected}
                onSelect={(d) => {
                  setModal(null);
                  if (history.state?.modal) history.back();
                  setTimeout(() => navigate(`/calendar?date=${d}`), 0);
                }}
                onClose={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function locationFromWindow() {
  return window.location.pathname + window.location.search;
}
export default App;
