export default function Loading({ label = "Loading" }) {
  return (
    <div className="loading-state" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
