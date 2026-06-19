import { Inbox } from "lucide-react";

export default function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <Inbox size={28} aria-hidden="true" />
      <h3>{title}</h3>
      {message ? <p>{message}</p> : null}
    </div>
  );
}
