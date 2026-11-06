import { useState } from "react";
import { IconButton } from "../../shared/TaskControls";
import type { Task } from "./model";
export function TaskForm({
  task,
  date,
  initialDraft,
  onDirty,
  onClose,
  onSave,
  onDelete,
}: {
  task?: Task;
  date?: string;
  initialDraft?: Task;
  revision?: string;
  onDirty: (draft: Task) => void;
  onClose: () => void;
  onSave: (t: Task) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<Task>(
    () =>
      initialDraft ||
      task || {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        date: date || "",
        time: "",
        completed: false,
        deleted: false,
        order: Date.now(),
        reminder: false,
        notified: false,
      },
  );
  const [message, setMessage] = useState("");
  const update = (patch: Partial<Task>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    onDirty(next);
  };
  async function remind() {
    if (draft.reminder) {
      update({ reminder: false });
      return;
    }
    if (!draft.date || !draft.time) {
      setMessage("Укажите дату и время задачи.");
      return;
    }
    if (!("Notification" in window)) {
      setMessage("Этот браузер не поддерживает уведомления.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      update({ reminder: true, notified: false });
      setMessage("");
    } else setMessage("Уведомления недоступны. Проверьте разрешения браузера.");
  }
  return (
    <form
      className="task-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.title.trim()) {
          setMessage("Введите название задачи.");
          return;
        }
        onSave({ ...draft, title: draft.title.trim() });
      }}
    >
      <div className="sheet-head">
        <h1>{task ? "Редактировать задачу" : "Новая задача"}</h1>
        <IconButton name="close" label="Закрыть" onClick={onClose} />
      </div>
      <label className="field">
        <span>НАЗВАНИЕ</span>
        <input
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Что нужно сделать?"
          maxLength={200}
        />
      </label>
      {message === "Введите название задачи." && (
        <div className="warning" role="alert">
          Введите название задачи
        </div>
      )}
      <label className="field">
        <span>ОПИСАНИЕ · НЕОБЯЗАТЕЛЬНО</span>
        <textarea
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Добавить описание"
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>ДАТА</span>
          <input
            type="date"
            value={draft.date}
            onChange={(e) =>
              update({
                date: e.target.value,
                ...(!e.target.value
                  ? { time: "", reminder: false }
                  : { notified: false }),
              })
            }
          />
        </label>
        <label className="field">
          <span>ВРЕМЯ</span>
          <input
            type="time"
            value={draft.time}
            disabled={!draft.date}
            onChange={(e) =>
              update({
                time: e.target.value,
                notified: false,
                ...(!e.target.value ? { reminder: false } : {}),
              })
            }
          />
        </label>
      </div>
      <div className="reminder">
        <div>
          <b>Напомнить</b>
          <small>Только когда приложение открыто</small>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.reminder}
          aria-label="Напомнить"
          className={`switch ${draft.reminder ? "" : "off"}`}
          onClick={remind}
        />
      </div>
      {message && message !== "Введите название задачи." && (
        <p className="warning" role="alert">
          {message}
        </p>
      )}
      <button className="primary">
        {task ? "Сохранить изменения" : "Добавить задачу"}
      </button>
      {task && (
        <button type="button" className="delete" onClick={onDelete}>
          Удалить задачу
        </button>
      )}
    </form>
  );
}
