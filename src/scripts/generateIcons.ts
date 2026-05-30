/**
 * Generate branded Aura PWA icons (192, 512, and 180 apple-touch).
 *
 *   npx vite-node src/scripts/generateIcons.ts
 */
import { createCanvas } from "canvas";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

function generateIcon(size: number): Buffer {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const radius = size * 0.2;
  ctx.fillStyle = "#08080E";
  ctx.fillRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = "#8B5CF6";
  ctx.fill();

  const fontSize = size * 0.55;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", size / 2, size / 2 + fontSize * 0.05);

  return canvas.toBuffer("image/png");
}

const publicDir = join(process.cwd(), "public");
const outputs: { name: string; size: number }[] = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of outputs) {
  const outPath = join(publicDir, name);
  writeFileSync(outPath, generateIcon(size));
  console.log(`Wrote ${outPath} (${size}×${size})`);
}

console.log("Aura PWA icons generated.");
