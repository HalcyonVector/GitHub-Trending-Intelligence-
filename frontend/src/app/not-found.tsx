import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fade-up" style={{ marginTop: 56 }}>
      <div className="kicker">404</div>
      <h1 className="big">
        This page <span className="ember">isn&apos;t on the board.</span>
      </h1>
      <p className="standfirst">
        The link you followed doesn&apos;t exist, or the repository has stopped being tracked.
      </p>
      <div style={{ marginTop: 22 }}>
        <Link className="watchbtn on" href="/">
          ← Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
