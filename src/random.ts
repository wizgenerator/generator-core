function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

export interface SeededRandom {
  next(): number;
  integer(minimum: number, maximum: number): number;
  pick<T>(values: readonly T[]): T;
}

export function createSeededRandom(seed: string | number): SeededRandom {
  let state = hashSeed(seed);
  const next = (): number => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  return {
    next,
    integer(minimum, maximum) {
      if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum > maximum) {
        throw new RangeError("integer requires safe integer bounds with minimum <= maximum");
      }
      return minimum + Math.floor(next() * (maximum - minimum + 1));
    },
    pick<T>(values: readonly T[]): T {
      if (values.length === 0) throw new RangeError("pick requires at least one value");
      return values[Math.floor(next() * values.length)] as T;
    },
  };
}
