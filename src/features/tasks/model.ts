export interface Task {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  completed: boolean;
  deleted: boolean;
  deletedAt?: string;
  order: number;
  reminder: boolean;
  notified: boolean;
}
export interface Data {
  version: 1;
  revision: string;
  welcomed: boolean;
  tasks: Task[];
}
export const emptyData = (): Data => ({
  version: 1,
  revision: "",
  welcomed: false,
  tasks: [],
});
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.valueOf()) && localDate(d) === value;
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(value: string, days: number): string {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function parseData(raw: string): Data {
  const d: unknown = JSON.parse(raw);
  if (!d || typeof d !== "object") throw Error("Некорректные данные");
  const x = d as Data;
  if (
    x.version !== 1 ||
    typeof x.revision !== "string" ||
    typeof x.welcomed !== "boolean" ||
    !Array.isArray(x.tasks) ||
    !x.tasks.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        typeof t.description === "string" &&
        typeof t.date === "string" &&
        (!t.date || validDate(t.date)) &&
        typeof t.time === "string" &&
        (!t.time || /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time)) &&
        (!t.time || !!t.date) &&
        typeof t.reminder === "boolean" &&
        typeof t.notified === "boolean" &&
        typeof t.completed === "boolean" &&
        typeof t.deleted === "boolean" &&
        (t.deletedAt === undefined ||
          (typeof t.deletedAt === "string" && validDate(t.deletedAt))) &&
        typeof t.order === "number" &&
        Number.isFinite(t.order),
    )
  )
    throw Error("Некорректный формат данных");
  return x;
}
export const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("ru-RU", options).format(
    new Date(`${date}T12:00:00`),
  );

export const withoutYearSuffix = (value: string) => value.replace(/\sг\.$/, "");
