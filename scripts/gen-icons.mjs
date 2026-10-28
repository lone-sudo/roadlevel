// Generates simple solid-color PWA icons without image dependencies.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function png(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // Draw: teal background, white "R" block pattern down the middle (simple, maskable-safe)
  const rows = [];
  const bg = [0x0e, 0x7c, 0x66];
  const fg = [0xff, 0xff, 0xff];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      // a simple road-like chevron band in the middle
      const dy = Math.abs(y - size / 2);
      const inBand = dy < size * 0.06;
      const dash = Math.abs(((x - (size * 0.15) + (size / 2 - y) * 1.0) % (size * 0.18)) - size * 0.09) < size * 0.02;
      const c = inBand && dash ? fg : inBand ? [0x0a, 0x5e, 0x4e] : bg;
      row[1 + x * 3] = c[0]; row[2 + x * 3] = c[1]; row[3 + x * 3] = c[2];
    }
    rows.push(row);
  }
  const raw = Buffer.concat(rows);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/pwa-192.png", png(192));
writeFileSync("public/pwa-512.png", png(512));
writeFileSync("public/favicon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0e7c66"/><rect x="6" y="29" width="52" height="6" rx="3" fill="#0a5e4e"/><rect x="12" y="30" width="8" height="4" fill="#fff"/><rect x="28" y="30" width="8" height="4" fill="#fff"/><rect x="44" y="30" width="8" height="4" fill="#fff"/></svg>`);
console.log("icons generated");
