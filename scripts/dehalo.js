// The source cutouts carry two problems baked in from the original tool:
//  1. White background bleed directly in the RGB of edge pixels (classic
//     un-premultiplied-alpha contamination).
//  2. A dithered, discrete alpha (only a handful of levels, not a gradient) —
//     the "anti-aliasing" is actually a per-pixel checkerboard.
// Both read fine on white but speckle badly on any darker background. Fix:
//  A. Colour-decontaminate edge pixels: replace their RGB with the average of
//     nearby fully-opaque pixels (dilated inward over a few rounds).
//  B. Alpha: threshold the dither to a hard edge, then heavily box-blur
//     (radius 2, 4 passes) to round the jagged boundary into a smooth curve.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const targets = process.argv.slice(2);
if (!targets.length) {
  console.error("usage: node scripts/dehalo.js <file1.png> [file2.png ...]");
  process.exit(1);
}

function boxBlur(field, width, height, radius) {
  const out = new Float32Array(field.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, cnt = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          sum += field[yy * width + xx];
          cnt++;
        }
      }
      out[y * width + x] = sum / cnt;
    }
  }
  return out;
}

function dehalo(file) {
  const buf = fs.readFileSync(file);
  const png = PNG.sync.read(buf);
  const { width, height, data } = png;
  const n = width * height;

  // ── Alpha: threshold the dither, then heavily smooth ──────────────
  let alpha = new Float32Array(n);
  for (let p = 0; p < n; p++) alpha[p] = data[p * 4 + 3] >= 128 ? 255 : 0;
  for (let i = 0; i < 4; i++) alpha = boxBlur(alpha, width, height, 2);

  // ── Colour: decontaminate edge pixels from baked-in white bleed ───
  let r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n);
  let resolved = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    r[p] = data[p * 4];
    g[p] = data[p * 4 + 1];
    b[p] = data[p * 4 + 2];
    resolved[p] = data[p * 4 + 3] === 255 ? 1 : 0;
  }

  for (let round = 0; round < 6; round++) {
    const nr = r.slice(), ng = g.slice(), nb = b.slice(), nres = resolved.slice();
    let changed = false;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (resolved[p]) continue;
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            const q = yy * width + xx;
            if (resolved[q]) {
              sr += r[q]; sg += g[q]; sb += b[q]; cnt++;
            }
          }
        }
        if (cnt > 0) {
          nr[p] = sr / cnt; ng[p] = sg / cnt; nb[p] = sb / cnt;
          nres[p] = 1;
          changed = true;
        }
      }
    }
    r = nr; g = ng; b = nb; resolved = nres;
    if (!changed) break;
  }

  for (let p = 0; p < n; p++) {
    data[p * 4] = Math.round(r[p]);
    data[p * 4 + 1] = Math.round(g[p]);
    data[p * 4 + 2] = Math.round(b[p]);
    data[p * 4 + 3] = Math.round(alpha[p]);
  }

  fs.writeFileSync(file, PNG.sync.write(png));
  console.log("de-haloed", path.basename(file));
}

targets.forEach(dehalo);
