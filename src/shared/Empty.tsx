export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: () => void;
}) {
  return (
    <div className="empty">
      <div className="empty-mark" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="empty-action" onClick={action}>
          Добавить задачу
        </button>
      )}
    </div>
  );
}
