// Sanity checks for the draft algorithm. Run: node test.mjs
import { draftOrder, normalizeSeed, canonicalTeams } from "./draft.js";

const TEAMS = [
  "Gridiron Gurus", "End Zone Elite", "Blitz Brigade", "Hail Mary",
  "Pigskin Pros", "Fourth and Long", "Red Zone Raiders", "Sunday Scaries",
  "Waiver Wire Wizards", "Touchdown Town",
];

let failures = 0;
function check(name, cond) {
  console.log(`${cond ? "ok " : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

// determinism: same seed, repeated runs
const a = await draftOrder("AB12CD34", TEAMS);
const b = await draftOrder("AB12CD34", TEAMS);
check("same seed twice gives identical order", JSON.stringify(a.order) === JSON.stringify(b.order));

// case-insensitive seed
const c = await draftOrder("ab12cd34", TEAMS);
check("lowercase seed gives same order", JSON.stringify(a.order) === JSON.stringify(c.order));

// entry order of teams must not matter
const d = await draftOrder("AB12CD34", [...TEAMS].reverse());
check("team entry order does not matter", JSON.stringify(a.order) === JSON.stringify(d.order));

// different seed, different order (overwhelmingly likely)
const e = await draftOrder("ZZ99XX11", TEAMS);
check("different seed gives different order", JSON.stringify(a.order) !== JSON.stringify(e.order));

// order is a permutation of the teams
check("result is a permutation", [...a.order].sort().join("|") === [...TEAMS].sort().join("|"));

// seed validation: only empty/whitespace-only seeds are rejected
for (const bad of ["", "   ", "\t\n"]) {
  let threw = false;
  try { normalizeSeed(bad); } catch { threw = true; }
  check(`rejects empty seed ${JSON.stringify(bad)}`, threw);
}
// any non-empty string is a valid seed now
for (const good of ["A", "GO HAWKS 2026!", "🏈🏈🏈", "x".repeat(500)]) {
  let threw = false;
  try { await draftOrder(good, TEAMS); } catch { threw = true; }
  check(`accepts seed ${JSON.stringify(good.slice(0, 20))}`, !threw);
}
// trim + case normalization
const t1 = await draftOrder("  go hawks  ", TEAMS);
const t2 = await draftOrder("GO HAWKS", TEAMS);
check("trimmed/uppercased seeds are equivalent", JSON.stringify(t1.order) === JSON.stringify(t2.order));
// interior spacing is significant
const t3 = await draftOrder("GOHAWKS", TEAMS);
check("interior spaces are significant", JSON.stringify(t2.order) !== JSON.stringify(t3.order));

// duplicate team names rejected (case-insensitive)
let dupThrew = false;
try { canonicalTeams(["Alpha", "Beta", "alpha"]); } catch { dupThrew = true; }
check("rejects duplicate team names", dupThrew);

// fairness: over many seeds, each team should land pick 1 roughly evenly
const N = 2000;
const firsts = Object.fromEntries(TEAMS.map((t) => [t, 0]));
for (let i = 0; i < N; i++) {
  const seed = String(i).padStart(8, "0");
  const r = await draftOrder(seed, TEAMS);
  firsts[r.order[0]]++;
}
const expected = N / TEAMS.length;
const worst = Math.max(...Object.values(firsts).map((v) => Math.abs(v - expected)));
check(`pick-1 distribution roughly uniform over ${N} seeds (worst dev ${worst}, expect < ${expected * 0.35})`,
  worst < expected * 0.35);
console.log("   pick-1 counts:", Object.values(firsts).join(", "));

// stable published vector: if the algorithm ever changes, this fails loudly.
// Old 8-char seeds MUST keep producing the same order they always did.
const vector = await draftOrder("TEST1234", ["A", "B", "C", "D"]);
check("TEST1234 vector unchanged (B, C, D, A)", vector.order.join(", ") === "B, C, D, A");

process.exit(failures ? 1 : 0);
