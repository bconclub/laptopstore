// Removes a near-white/light studio background from a product photo and
// hands the result through the same de-halo pipeline as dehalo.js (colour
// decontamination + alpha threshold + heavy blur) so the cutout reads clean
// on any background colour, not just white.
//
// Flood-fill starts at every border pixel and grows through neighbours whose
// colour is close to the CURRENT pixel (not a fixed global colour), so it
// follows soft gradients/vignettes in the studio backdrop without leaking
// into the product itself where the colour jumps sharply.
const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");
const sharp = require("sharp");

// A pixel qualifies as background if it's bright AND fairly neutral (grey/white),
// matching the studio backdrop but not the product (dark body, saturated screen).
const BRIGHTNESS_MIN = 214;
const SATURATION_MAX = 18;

async function removeBg(file, outFile) {
  const img = sharp(file);
  const meta = await img.metadata();
  const { width, height } = meta;
  const { data: rgb } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const n = width * height;
  const bg = new Uint8Array(n); // 1 = flooded background
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qHead = 0, qTail = 0;

  const isBg = (p) => {
    const r = rgb[p * 3], g = rgb[p * 3 + 1], b = rgb[p * 3 + 2];
    const min = Math.min(r, g, b), max = Math.max(r, g, b);
    return min > BRIGHTNESS_MIN && max - min < SATURATION_MAX;
  };

  const pushBorder = (x, y) => {
    const p = y * width + x;
    if (!visited[p] && isBg(p)) {
      visited[p] = 1;
      bg[p] = 1;
      queue[qTail++] = p;
    } else {
      visited[p] = 1;
    }
  };
  for (let x = 0; x < width; x++) { pushBorder(x, 0); pushBorder(x, height - 1); }
  for (let y = 0; y < height; y++) { pushBorder(0, y); pushBorder(width - 1, y); }

  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % width, y = (p / width) | 0;
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const np = ny * width + nx;
      if (visited[np]) continue;
      visited[np] = 1;
      if (isBg(np)) {
        bg[np] = 1;
        queue[qTail++] = np;
      }
    }
  }

  // Build RGBA with hard alpha mask from the flood result
  const rgba = Buffer.alloc(n * 4);
  for (let p = 0; p < n; p++) {
    rgba[p * 4] = rgb[p * 3];
    rgba[p * 4 + 1] = rgb[p * 3 + 1];
    rgba[p * 4 + 2] = rgb[p * 3 + 2];
    rgba[p * 4 + 3] = bg[p] ? 0 : 255;
  }

  const png = new PNG({ width, height });
  rgba.copy(png.data);
  const tmp = outFile + ".tmp.png";
  fs.writeFileSync(tmp, PNG.sync.write(png));
  return tmp;
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

  // Heavily smooth the alpha to round off webp block-compression jaggies at
  // the true object edge (no erosion here — the flood-fill boundary is
  // already conservative, erosion only sharpened the blockiness).
  let alpha = new Float32Array(n);
  for (let p = 0; p < n; p++) alpha[p] = data[p * 4 + 3] >= 128 ? 255 : 0;
  for (let i = 0; i < 5; i++) alpha = boxBlur(alpha, width, height, 3);

  // Colour-decontaminate edge pixels
  let r = new Float32Array(n), g = new Float32Array(n), b = new Float32Array(n);
  let resolved = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    r[p] = data[p * 4]; g[p] = data[p * 4 + 1]; b[p] = data[p * 4 + 2];
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
            if (resolved[q]) { sr += r[q]; sg += g[q]; sb += b[q]; cnt++; }
          }
        }
        if (cnt > 0) { nr[p] = sr / cnt; ng[p] = sg / cnt; nb[p] = sb / cnt; nres[p] = 1; changed = true; }
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
}

async function run() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/remove-bg.js <input> <output.png>");
    process.exit(1);
  }
  const tmp = await removeBg(input, output);
  fs.renameSync(tmp, output);
  dehalo(output);
  console.log("cleaned ->", path.basename(output));
}

run();
