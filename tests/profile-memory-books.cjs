// Synthetic photo-sized projects for repeatable model and browser measurements.
const fs = require('node:fs');
const path = require('node:path');
const { deflateSync } = require('node:zlib');
const load = require('./load-book-model.cjs');
const { validateBook, newElement, uid } = load('./memory-books');
const { newShowcase } = load('./book-showcase');
const { clonePage } = load('./studio-content');
const width = 1600, height = 1200;
const table = Array.from({ length: 256 }, (_, start) => {
  let value = start;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1;
  return value >>> 0;
});

function chunk(name, bytes) {
  const type = Buffer.from(name), output = Buffer.alloc(12 + bytes.length);
  output.writeUInt32BE(bytes.length); type.copy(output, 4); bytes.copy(output, 8);
  let checksum = 0xffffffff;
  for (const value of output.subarray(4, 8 + bytes.length)) checksum = table[(checksum ^ value) & 255] ^ checksum >>> 8;
  output.writeUInt32BE((checksum ^ 0xffffffff) >>> 0, 8 + bytes.length);
  return output;
}
function syntheticPhoto(seed) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let random = seed;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const index = y * (width * 3 + 1) + x * 3 + 1, noise = random >>> 28;
    const ground = y > 580 + Math.sin(x * .009) * 33;
    raw[index] = (ground ? 102 : 160) + (x >> 6) + noise;
    raw[index + 1] = (ground ? 123 : 173) + (y >> 7) + noise;
    raw[index + 2] = (ground ? 111 : 188) + noise + (x >> 7);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return { name: `Synthetic coast ${seed}.png`, data: 'data:image/png;base64,' + png.toString('base64') };
}

const images = { coast1: syntheticPhoto(1), coast2: syntheticPhoto(2) };
function fixture(count) {
  const book = newShowcase();
  const pages = book.pages;
  book.id = uid(); book.title = `Finishing Touch QA · ${count} pages`; book.assets = images;
  book.pages = Array.from({ length: count }, (_, index) => {
    const source = pages[count === 2 ? [5, 7][index] : index % pages.length];
    const page = clonePage(source);
    page.elements = page.elements.map(element => element.kind === 'polaroid' ? { ...element, assetId: index % 2 ? 'coast1' : 'coast2' } : element);
    if (index % 6 === 0) page.elements.push({ ...newElement('photo'), assetId: 'coast2', x: 8, y: 69,
      width: 25, height: 23, text: 'Synthetic coastline' });
    return page;
  });
  return validateBook(book);
}
for (const count of [2, 20, 100]) {
  const book = fixture(count);
  const json = JSON.stringify(book);
  const samples = Array.from({ length: 9 }, () => {
    const began = performance.now();
    validateBook(JSON.parse(JSON.stringify(book)));
    return performance.now() - began;
  }).sort((a, b) => a - b);
  if (process.argv[2]) fs.writeFileSync(path.join(process.argv[2], `finishing-touch-${count}.json`), json);
  console.log(JSON.stringify({ count, photos: 2, pixelsEach: width * height, bytes: Buffer.byteLength(json),
    modelRoundTripMedian: Number(samples[4].toFixed(2)), worst: Number(samples[8].toFixed(2)) }));
}
