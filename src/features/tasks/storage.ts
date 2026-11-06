import { emptyData, parseData, type Data } from "./model";
const KEY = "dela.data";
export function readData(): Data {
  const raw = localStorage.getItem(KEY);
  return raw === null ? emptyData() : parseData(raw);
}
export function writeData(data: Data, expectedRevision: string): Data {
  const current = readData();
  if (current.revision !== expectedRevision)
    throw Error(
      "Данные изменились в другой вкладке. Обновите страницу, чтобы продолжить.",
    );
  const next = { ...data, revision: crypto.randomUUID() };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
