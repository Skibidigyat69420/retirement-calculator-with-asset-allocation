/**
 * Deterministic random number generators.
 *
 * The app uses unseeded Math.random() by default so UI outputs vary between
 * runs. Passing an explicit `seed` makes Monte Carlo and MVO reproducible,
 * which is required for regression tests, support, and audit trails.
 */

export interface SeededRandom {
  random: () => number;
  reset: () => void;
}

/**
 * Mulberry32: a tiny, fast, seeded PRNG with acceptable statistical quality
 * for simulation work. Returns values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform using a seeded random source.
 */
export function createBoxMuller(random: () => number) {
  return () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };
}

/**
 * Create a deterministic random source from a string or numeric seed.
 */
export function createSeededRandom(seed?: string | number | null): SeededRandom | null {
  if (seed === undefined || seed === null || seed === '') return null;

  let numericSeed: number;
  if (typeof seed === 'number') {
    numericSeed = Number.isFinite(seed) ? seed : 0;
  } else {
    // Simple string hash to numeric seed.
    numericSeed = 0;
    for (let i = 0; i < seed.length; i++) {
      numericSeed = (numericSeed << 5) - numericSeed + seed.charCodeAt(i);
      numericSeed |= 0;
    }
  }

  const generator = mulberry32(numericSeed);
  let current = generator;

  return {
    random: () => current(),
    reset: () => {
      current = mulberry32(numericSeed);
    },
  };
}
