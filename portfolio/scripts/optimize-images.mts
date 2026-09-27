/**
 * Re-encode public/images/ in place with sharp, keeping every file's name,
 * format and pixel size. Run with `make images`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..", "public", "images");
// Lossy output is re-encoded on every run, so a small win is not worth
// another generation of loss.
const MIN_SAVING = 0.1;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function encode(file: string, input: Buffer): Promise<Buffer> | null {
  const img = sharp(input);
  // Lower qualities visibly soften the dark hero plates, the globe's graticule first.
  switch (path.extname(file).toLowerCase()) {
    case ".webp":
      return img.webp({ quality: 90, effort: 6, smartSubsample: true }).toBuffer();
    case ".jpg":
    case ".jpeg":
      return img.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    default:
      return null;
  }
}

let before = 0;
let after = 0;
for await (const file of walk(ROOT)) {
  const input = await fs.readFile(file);
  const pending = encode(file, input);
  if (!pending) continue;
  const output = await pending;
  const keep = output.length < input.length * (1 - MIN_SAVING);
  if (keep) await fs.writeFile(file, output);
  before += input.length;
  after += keep ? output.length : input.length;
  const rel = path.relative(ROOT, file);
  console.log(`${keep ? "wrote" : "kept "} ${rel}  ${input.length} -> ${keep ? output.length : input.length}`);
}
console.log(`total ${before} -> ${after} bytes`);
