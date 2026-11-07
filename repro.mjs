import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const variants = {
  bug: "page font Roboto, tick font Roboto Mono",
  "body-matches-tick": "page font Roboto Mono, tick font Roboto Mono",
  "span-matches-tick": "page font Roboto, tick font Roboto Mono, #recharts_measurement_span set to Roboto Mono",
};

const server = await createServer({ logLevel: "error" });
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await mkdir("screenshots", { recursive: true });

const recharts = (await import("recharts/package.json", { with: { type: "json" } })).default.version;
console.log(`recharts ${recharts}, ${browser.browserType().name()} ${browser.version()}\n`);

const failures = [];

for (const [variant, description] of Object.entries(variants)) {
  await page.goto(`${server.resolvedUrls.local[0]}?variant=${variant}`);
  await page.waitForSelector(".recharts-cartesian-axis-tick-value");
  // Let the axis re-render after it reads the tick's computed font size.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

  const result = await page.evaluate(() => {
    const svg = document.querySelector(".recharts-surface").getBoundingClientRect();
    const ticks = [...document.querySelectorAll(".recharts-cartesian-axis-tick-value")];
    const span = document.getElementById("recharts_measurement_span");
    // Measure in the same span, with the same inline style, that Recharts used for the ticks.
    const measure = (tick) => {
      span.textContent = tick.textContent;
      return {
        text: tick.textContent,
        measured: span.getBoundingClientRect().width,
        rendered: tick.getComputedTextLength(),
      };
    };
    return {
      svg: { x: svg.x, y: svg.y, width: svg.width, height: svg.height },
      spanFont: getComputedStyle(span).fontFamily,
      tickFont: getComputedStyle(ticks[0]).fontFamily,
      labels: ticks.map((tick) => tick.textContent),
      first: { ...measure(ticks[0]), past: svg.left - ticks[0].getBoundingClientRect().left },
      last: { ...measure(ticks.at(-1)), past: ticks.at(-1).getBoundingClientRect().right - svg.right },
    };
  });

  const fits = result.first.past <= 0.5 && result.last.past <= 0.5;
  if (!fits) failures.push(variant);

  const describe = (label, side) =>
    `  ${side === "left" ? "first" : "last"} label "${label.text}": measured ${label.measured.toFixed(1)}px wide, rendered ${label.rendered.toFixed(1)}px wide, ` +
    (label.past > 0.5 ? `${label.past.toFixed(1)}px past the SVG's ${side} edge (clipped)` : `inside the SVG's ${side} edge`);
  console.log(`${variant}: ${description}`);
  console.log(`  measurement span font: ${result.spanFont}`);
  console.log(`  tick font:             ${result.tickFont}`);
  console.log(`  shown labels:          ${result.labels.join(", ")}`);
  console.log(describe(result.first, "left"));
  console.log(describe(result.last, "right"));
  console.log(`  ${fits ? "OK" : "FAIL"}\n`);

  const pad = 12;
  await page.screenshot({
    path: `screenshots/${variant}.png`,
    clip: {
      x: result.svg.x - pad,
      y: result.svg.y - pad,
      width: result.svg.width + pad * 2,
      height: result.svg.height + pad * 2,
    },
  });
}

await browser.close();
await server.close();

if (failures.length > 0) {
  console.error(`Tick labels run past the SVG in: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("All tick labels fit inside the SVG.");
