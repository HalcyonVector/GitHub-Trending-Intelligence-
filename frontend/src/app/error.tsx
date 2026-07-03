"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="fade-up" style={{ marginTop: 56 }}>
      <div className="kicker">Something broke</div>
      <h1 className="big">
        An <span className="ember">error</span> occurred.
      </h1>
      <p className="standfirst">
        This page hit an unexpected error — most often the backend being unreachable. Try again, or
        head back to the dashboard.
      </p>
      <div className="note">{error?.message || "Unknown error."}</div>
      <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
        <button className="watchbtn on" onClick={reset}>
          Try again
        </button>
        <a className="watchbtn" href="/">
          ← Dashboard
        </a>
      </div>
    </div>
  );
}
