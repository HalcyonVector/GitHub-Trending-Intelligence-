import { sparkPath, sparkLastY } from "@/lib/chart";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

/** Tiny inline SVG sparkline used across cards and rows. */
export function Sparkline({
  values,
  width = 64,
  height = 26,
  color = "var(--ember)",
  strokeWidth = 1.6,
}: Props) {
  if (!values || values.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const d = sparkPath(values, width, height);
  const lastY = sparkLastY(values, height);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle r="1.9" cx={width} cy={lastY.toFixed(1)} fill={color} />
    </svg>
  );
}
