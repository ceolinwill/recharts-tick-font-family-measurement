import "@fontsource/roboto/400.css";
import "@fontsource/roboto-mono/400.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { Line, LineChart, XAxis } from "recharts";

const variant = new URLSearchParams(location.search).get("variant") ?? "bug";
document.documentElement.dataset.variant = variant;

const data = [
  { day: "October 27", score: 62 },
  { day: "October 28", score: 64 },
  { day: "October 29", score: 63 },
  { day: "October 30", score: 67 },
  { day: "October 31", score: 70 },
  { day: "November 1", score: 69 },
  { day: "November 2", score: 72 },
];

function Chart() {
  return (
    <LineChart width={360} height={120} data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
      <XAxis
        dataKey="day"
        interval="preserveStartEnd"
        tick={{ fontFamily: "Roboto Mono", fontSize: 12 }}
      />
      <Line dataKey="score" isAnimationActive={false} />
    </LineChart>
  );
}

// Load both web fonts first, so every run measures with the same fonts on any OS.
await Promise.all([document.fonts.load('12px "Roboto"'), document.fonts.load('12px "Roboto Mono"')]);

createRoot(document.getElementById("root")).render(<Chart />);
