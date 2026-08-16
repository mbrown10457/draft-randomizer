// Deterministic draft-order algorithm.
// Everything here is pure and auditable: same seed + same team names
// always produce the same order, in any browser, forever.
//
// How it works, step by step:
//   1. The seed is any non-empty text. It is trimmed and uppercased, so
//      "ab12cd34" and " AB12CD34 " are the same seed. (Interior spaces
//      and punctuation are significant.)
//   2. Team names are trimmed and sorted alphabetically (case-insensitive,
//      by code point). Because of this, the ORDER the names were entered in
//      can never affect the result — only the set of names matters.
//   3. Randomness comes from SHA-256: block i of the random stream is
//      SHA-256("<SEED>:<i>"). SHA-256 is a public standard; every browser
//      computes it identically.
//   4. The sorted list is shuffled with a Fisher-Yates shuffle. Each random
//      index is drawn with rejection sampling so every permutation is
//      exactly equally likely (no modulo bias).
//
// Works in browsers and in Node (node --test test.mjs).

const subtle = globalThis.crypto.subtle;

export function normalizeSeed(raw) {
  const s = String(raw).trim().toUpperCase();
  if (!s) throw new Error("Seed cannot be empty.");
  return s;
}

export function canonicalTeams(rawList) {
  const teams = rawList.map((t) => String(t).trim()).filter((t) => t.length > 0);
  if (teams.length < 2) throw new Error("Need at least 2 team names.");
  const seen = new Set();
  for (const t of teams) {
    const key = t.toLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate team name: "${t}"`);
    seen.add(key);
  }
  // Code-point sort on the lowercased name: locale-independent, so every
  // browser sorts identically. Entry order is irrelevant after this.
  return [...teams].sort((a, b) => {
    const x = a.toLowerCase();
    const y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  });
}

async function sha256Bytes(text) {
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
  return new Uint8Array(digest);
}

export async function sha256Hex(text) {
  const bytes = await sha256Bytes(text);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Deterministic random stream: SHA-256("<SEED>:0"), SHA-256("<SEED>:1"), ...
// consumed 4 bytes at a time as big-endian unsigned 32-bit integers.
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
    this.block = 0;
    this.bytes = null;
    this.offset = 0;
  }

  async nextUint32() {
    if (this.bytes === null || this.offset + 4 > this.bytes.length) {
      this.bytes = await sha256Bytes(`${this.seed}:${this.block}`);
      this.block += 1;
      this.offset = 0;
    }
    const b = this.bytes;
    const o = this.offset;
    this.offset += 4;
    return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  }

  // Uniform integer in [0, n) via rejection sampling — no modulo bias.
  async nextInt(n) {
    const limit = Math.floor(0x100000000 / n) * n;
    while (true) {
      const v = await this.nextUint32();
      if (v < limit) return v % n;
    }
  }
}

// Returns { seed, teams, order }:
//   seed  — the normalized (uppercased) seed actually used
//   teams — the canonical alphabetized team list actually shuffled
//   order — order[0] gets pick 1, order[1] gets pick 2, ...
export async function draftOrder(rawSeed, rawTeams) {
  const seed = normalizeSeed(rawSeed);
  const teams = canonicalTeams(rawTeams);
  const rng = new SeededRandom(seed);
  const order = [...teams];
  for (let i = order.length - 1; i > 0; i--) {
    const j = await rng.nextInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { seed, teams, order };
}
