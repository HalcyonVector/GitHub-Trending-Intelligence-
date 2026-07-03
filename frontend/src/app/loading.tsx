export default function Loading() {
  return (
    <div style={{ marginTop: 44 }} aria-busy="true">
      <div className="skel" style={{ height: 54, width: "58%", marginBottom: 16 }} />
      <div className="skel" style={{ height: 20, width: "42%", marginBottom: 34 }} />
      <div className="skel" style={{ height: 220 }} />
    </div>
  );
}
