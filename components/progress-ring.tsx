"use client";

interface ProgressRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0-1
}

export function ProgressRing({ size = 64, stroke = 6, progress }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;

  return (
    <svg width={size} height={size} className="text-neutral-200">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={stroke}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeLinecap="round"
        stroke="#111827"
        fill="transparent"
        style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: "stroke-dashoffset 0.4s ease" }}
      />
    </svg>
  );
}
