function mulberry32(seed: number): () => number {
  let a = seed >>> 0 // force to 32-bit unsigned

  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 // 0 ≤ result < 1
  }
}

export function rand(seed: number): number {
  const rng = mulberry32(seed)
  return rng()
}

export function randInt(seed: number, min: number, max: number): number {
  return Math.floor(rand(seed) * (max - min + 1)) + min
}
