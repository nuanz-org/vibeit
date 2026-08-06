/**
 * Minimal ZIP (store / no compression) for client-side multi-file download (M7c).
 *
 * Avoids adding a zip dependency for PNG-sequence export.
 * Spec: APPNOTE.TXT local file + central directory + EOCD (store method only).
 */

const enc = new TextEncoder();

/** CRC-32 (ISO 3309 / PNG-compatible). */
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c ^= data[i]!;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  return b;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = n & 0xff;
  b[1] = (n >>> 8) & 0xff;
  b[2] = (n >>> 16) & 0xff;
  b[3] = (n >>> 24) & 0xff;
  return b;
}

function concat(parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export type ZipStoreEntry = {
  /** Path inside the archive (use `/` separators; no leading slash). */
  name: string;
  data: Uint8Array;
};

/**
 * Build an uncompressed ZIP blob from named file entries.
 */
export function createStoreZip(entries: ZipStoreEntry[]): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const size = data.byteLength;

    // Local file header
    const localHeader = concat([
      u32(0x04034b50), // signature
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method: store
      u16(0), // mod time
      u16(0), // mod date
      u32(crc),
      u32(size),
      u32(size),
      u16(nameBytes.length),
      u16(0), // extra len
      nameBytes,
    ]);

    const localOffset = offset;
    localParts.push(localHeader, data);
    offset += localHeader.length + data.length;

    // Central directory header
    centralParts.push(
      concat([
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed
        u16(0),
        u16(0), // store
        u16(0),
        u16(0),
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0), // extra
        u16(0), // comment
        u16(0), // disk start
        u16(0), // int attrs
        u32(0), // ext attrs
        u32(localOffset),
        nameBytes,
      ]),
    );
  }

  const central = concat(centralParts);
  const centralOffset = offset;
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(central.length),
    u32(centralOffset),
    u16(0), // comment
  ]);

  const bytes = concat([...localParts, central, eocd]);
  // Copy into a fresh ArrayBuffer so BlobPart typing is happy (avoid SharedArrayBuffer).
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return new Blob([ab], { type: "application/zip" });
}

/** Async helper: Blob entries → ZIP. */
export async function createStoreZipFromBlobs(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  const mapped: ZipStoreEntry[] = [];
  for (const e of entries) {
    const buf = new Uint8Array(await e.blob.arrayBuffer());
    mapped.push({ name: e.name, data: buf });
  }
  return createStoreZip(mapped);
}
