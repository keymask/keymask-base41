/**
 * LCG parameters from https://www.ams.org/journals/mcom/1999-68-225/S0025-5718-99-00996-5/S0025-5718-99-00996-5.pdf
 * In each case, the selected parameters are those that are least proximal to
 * low harmonic factors of the modulus (1...8). See `util/harmonics.js`. This
 * means that they are least likely to present repeating patterns across short
 * sequences of values.
 */
const lcgMap: (number[] | bigint[])[] = [
  [],
  [41, 22, 28],
  [1021, 331, 401], // 2^10 - 3
  [65521, 17364, 32236], // 2^16 - 15
  [2097143, 1043187, 1352851], // 2^21 - 9
  [67108859, 19552116, 24409594], // 2^26 - 5
  [4294967291n, 1588635695n, 3870709308n], // 2^32 - 5
  [137438953447n, 31450092817n, 76886758244n], // 2^37 - 25
  [4398046511093n, 2928603677866n, 3015630915308n], // 2^42 - 11
  [281474976710597n, 59279420901007n, 163724808306782n], // 2^48 - 59
  [9007199254740881n, 2082839274626558n, 3141627116318043n], // 2^53 - 111
  [288230376151711717n, 56502943171806276n, 101565695086122187n], // 2^58 - 27
  [18446744073709551557n, 9044836419713972268n, 13891176665706064842n] // 2^64 - 59
];

export class Generator {
  private offsets: (number | bigint)[];
  private bigint: boolean;

  constructor(seed?: ArrayBufferLike | ArrayBufferView, bigint: boolean = false) {
    this.offsets = new Array(13) as (number | bigint)[];
    if (seed && seed.byteLength >= 8) {
      if (ArrayBuffer.isView(seed)) {
        seed = seed.buffer;
      }
      seed = seed.slice(0, 8);
      const a32 = new Uint32Array(seed);
      const n32 = a32[0] ^ a32[1];
      const n64 = new BigUint64Array(seed)[0];
      this.offsets[1] = n32 % 40;
      this.offsets[2] = n32 % 1020;
      this.offsets[3] = n32 % 65520;
      this.offsets[4] = n32 % 2097142;
      this.offsets[5] = n32 % 67108858;
      this.offsets[6] = BigInt(n32 % 4294967290);
      this.offsets[7] = n64 % 137438953446n;
      this.offsets[8] = n64 % 4398046511092n;
      this.offsets[9] = n64 % 281474976710596n;
      this.offsets[10] = n64 % 9007199254740880n;
      this.offsets[11] = n64 % 288230376151711716n;
      this.offsets[12] = n64 % 18446744073709551556n;
    } else {
      for (let i = 1; i < 13; i++) {
        this.offsets[i] = i < 6 ? 0 : 0n;
      }
    }
    this.bigint = bigint;
  }

  next(value: number | bigint, range: number): number | bigint {
    if (!value) {
      return range > 10 || this.bigint ? 0n : 0;
    }
    const mod = lcgMap[range][0];
    const mult = lcgMap[range][1];
    const offset = this.offsets[range];

    if (range > 5) {
      if (typeof value === "number") {
        value = BigInt(value);
      }
      value = value * <bigint>mult % <bigint>mod + <bigint>offset;
      value = value < <bigint>mod ? value : value - <bigint>mod + 1n;
      return range > 10 || this.bigint ? value : Number(value);
    }
    if (typeof value === "bigint") {
      value = Number(value);
    }
    value = value * <number>mult % <number>mod + <number>offset;
    value = value < <number>mod ? value : value - <number>mod + 1;
    return this.bigint ? BigInt(value) : value;
  }

  previous(value: number | bigint, range: number): number | bigint {
    if (!value) {
      return range > 10 || this.bigint ? 0n : 0;
    }
    const mod = lcgMap[range][0];
    const mult = lcgMap[range][2];
    const offset = this.offsets[range];

    if (range > 5) {
      if (typeof value === "number") {
        value = BigInt(value);
      }
      value -= <bigint>offset;
      value = (value > 0 ? value : value + <bigint>mod - 1n) * <bigint>mult % <bigint>mod;
      return range > 10 || this.bigint ? value : Number(value);
    }
    if (typeof value === "bigint") {
      value = Number(value);
    }
    value -= <number>offset;
    value = (value > 0 ? value : value + <number>mod - 1) * <number>mult % <number>mod;
    return this.bigint ? BigInt(value) : value;
  }
}