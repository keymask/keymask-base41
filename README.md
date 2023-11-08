# Keymask (JavaScript)

[![Unit Tests](https://github.com/keymask/keymask-js/actions/workflows/test.yml/badge.svg)](https://github.com/keymask/keymask-js/actions/workflows/test.yml) [![npm](https://img.shields.io/npm/v/keymask)](https://www.npmjs.com/package/keymask)

`Keymask` maps integers and binary values of any length to and from compact,
random-looking character strings.

```
1 -> "FyFLmR"
2 -> "JwKVWj"
3 -> "XcCjDG"
```

Values are first transformed by a Linear Congruential Generator (a fast,
reversible pseudo-random number generator), then the result is encoded using a
Base41 encoding scheme. Minimum output length(s) can be specified, otherwise
the keymask length will scale as needed.

The `Keymask` instance can be personalized using a 256-bit seed value. As long
as this value is kept secret, it will be difficult for anyone who doesn't know
the seed to reverse map the encoded values.

## Motivation

Serial numbers and sequential database IDs are extremely useful, however, when
displayed publicly they can leak information about system internals, such as
how old a given record is, or the frequency of record creation (see
["German tank problem"](https://search.brave.com/search?q=german+tank+problem)).

`Keymask` encodes serial numbers in such a way that they can be displayed to
end-users without revealing these kinds of details.

## Installation

Releases are published to `npm` as `keymask`. Install the package normally
using your preferred package manager (`npm i keymask`, `yarn add keymask`,
`pnpm add keymask`, etc).

## Usage

The module exports three classes, `Keymask`, `KeymaskGenerator` (the LCG) and
`KeymaskEncoder` (the base41 encoder). These can be used independently of each
other, but for simple use cases, the main `Keymask` class is typically all you
need.

The `Keymask` class constructor can optionally be passed an object containing
various settings. When no settings are provided, the resulting class instance
will encode variable-length outputs (the output length will depend on the
magnitude of the input value), and decoded values will be returned as either a
`number`, a `bigint` or an `ArrayBuffer`, depending again on the magnitude of
the value.

**Options**

```Typescript
type KeymaskOptions = {
  seed?: ArrayBuffer;
  size?: number | number[];
  bigint?: boolean;
  encoder?: KeymaskEncoder;
};
```

**Example (Default settings, no seed, variable outputs)**

```JavaScript
import { Keymask } from "keymask";

const keymask = new Keymask();

const masked1 = keymask.mask(12); // "X"
const unmask1 = keymask.unmask("X"); // 12

const masked2 = keymask.mask(123456789); // "wMjMGR"
const unmask2 = keymask.unmask("wMjMGR"); // 123456789

const masked3 = keymask.mask(1234567890123456789n); // "csMvrvQsMdVG"
const unmask3 = keymask.unmask("csMvrvQsMdVG"); // 1234567890123456789n

const masked4 = keymask.mask(new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
]).buffer); // "NpRcJcFtscDkyxmQkD"

const unmask4 = kaymask.unmask("NpRcJcFtscDkyxmQkD"); // As above
```

### `seed`

If a `seed` value is provided, it will be used to initialize LCG offsets
and/or shuffle the Base41 encoding alphabet. This allows different `Keymask`
instances to produce completely different outputs.

The `seed` should be provided as an `ArrayBuffer`, and should be either 32 or 8
bytes long depending on whether a preconfigured `KeymaskEncoder` is used (see
`encoder` option below). When no `encoder` is provided, the full `32` bytes
are required.

Providing a randomized `seed` is highly recommended, as this makes the mappings
between inputs and outputs highly unpredictable, especially when the `seed` is
kept secret. The `seed` should generally not change for the lifetime of your
application (doing so would make it impossible to unmask previously masked
values).

**Example (Seeded)**

```JavaScript
import { Keymask } from "keymask";

const keymask = new Keymask({
  seed: new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
  ]).buffer
});

const masked1 = keymask.mask(12); // "P"
const unmask1 = keymask.unmask("P"); // 12

const masked2 = keymask.mask(123456789); // "GVSYBp"
const unmask2 = keymask.unmask("GVSYBp"); // 123456789

const masked3 = keymask.mask(1234567890123456789n); // "BVTFGGfNNqCX"
const unmask3 = keymask.unmask("BVTFGGfNNqCX"); // 1234567890123456789n

const masked4 = keymask.mask(new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
]).buffer); // "FYNGFBkhgnvBChrHQg"

const unmask4 = kaymask.unmask("FYNGFBkhgnvBChrHQg"); // As above
```

### `size`

The output length(s) can be specified by providing a number or an array of
numbers to the `size` option. If a single number is provided, it defines the
*minimum* output length; values that exceed this minimum length will scale
automatically, with additional characters added as needed.

If an array of numbers is provided, they represent successive allowable output
lengths. If the highest provided `size` is less than `12`, then longer outputs
will scale automatically, as above. If you do not want this auto-scaling
behaviour, be sure to include `12` as the last value in the `size` array.

Note that long inputs (greater than 64 bits) are processed in 64-bit blocks;
the `size` setting applies only to the final block. If your inputs are
word-aligned (to some multiple of 64 bits), it is generally recommended to
provide the setting `size: 12`, as this will ensure that unmasked values are
always a multiple of 64 bits long, even when the final block happens to contain
a value that can be encoded in fewer characters.

Valid `size`s are between `1` and `12`, inclusive. Other values will be
silently ignored.

This setting should generally not be changed for the lifetime of your
application, as this may interfere with the ability to unmask previously masked
values.

**Example (Defined output lengths)**

```JavaScript
import { Keymask } from "keymask";

const keymask = new Keymask({
  size: [5, 10]
});

const masked1 = keymask.mask(12); // "MxHqP"
const unmask1 = keymask.unmask("MxHqP"); // 12

const masked2 = keymask.mask(123456789); // "xMMJdmtCcf"
const unmask2 = keymask.unmask("xMMJdmtCcf"); // 123456789

const masked3 = keymask.mask(1234567890123456789n); // "csMvrvQsMdVG"
const unmask3 = keymask.unmask("csMvrvQsMdVG"); // 1234567890123456789n

const masked4 = keymask.mask(new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
]).buffer); // "NpRcJcFtscDkbZZXpWbVyd"

const unmask4 = kaymask.unmask("NpRcJcFtscDkbZZXpWbVyd"); // As above
```

### `bigint`

Normally, the return type of the `unmask` operation will depend on the encoding
range (only 11- or 12-character keymasks will be unmasked as a `bigint`;
shorter keymasks will be unmasked as a `number` and longer keymasks as an
`ArrayBuffer`). If you want *all* values to be returned as a `bigint`,
regardless of their magnitude, then supply the option `bigint: true`.

**Example (BigInt outputs)**

```JavaScript
import { Keymask } from "keymask";

const keymask = new Keymask({
  bigint: true
});

const masked1 = keymask.mask(12n); // "X"
const unmask1 = keymask.unmask("X"); // 12n

const masked2 = keymask.mask(123456789n); // "wMjMGR"
const unmask2 = keymask.unmask("wMjMGR"); // 123456789n

const masked3 = keymask.mask(1234567890123456789n); // "csMvrvQsMdVG"
const unmask3 = keymask.unmask("csMvrvQsMdVG"); // 1234567890123456789n

const masked4 = keymask.mask(new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
]).buffer); // "NpRcJcFtscDkTwJXjj"

const unmask4 = kaymask.unmask("NpRcJcFtscDkTwJXjj");
// 3727165692135864801209549313n
```

### `encoder`

It is common for an application to employ multiple serial numbers (for example,
multiple database tables with auto-incrementing primary keys). In such cases,
it may be desirable to have each of them map to a unique keymask sequence.

One way of doing this is to create multiple `Keymask` instances, each with a
unique 256-bit seed. A more efficient alternative is to have all of the
instances share a single `KeymaskEncoder`. The encoder can be seeded once
(requires a 192-bit seed) and passed into each `Keymask` instance. In
consequence, each instance only requires an additional 64-bit (8-byte) seed to
customize the LCG offsets.

**Example (Multiple instances with a shared encoder)**

```JavaScript
import { Keymask, KeymaskEncoder } from "keymask";

const sharedEncoder = new KeymaskEncoder(new Uint8Array([
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16,
  17, 18, 19, 20, 21, 22, 23, 24
]));

const keymask1 = new Keymask({
  encoder: sharedEncoder,
  seed: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
  size: 5
});

const keymask2 = new Keymask({
  encoder: sharedEncoder,
  seed: new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]),
  size: 5
});

const mask1a = keymask1.mask(1); // "bgLtm"
const mask1b = keymask1.mask(2); // "FVyHP"
const mask1c = keymask1.mask(3); // "vrMZL"

const mask2a = keymask2.mask(1); // "LjjWh"
const mask2b = keymask2.mask(2); // "RHRkJ"
const mask2c = keymask2.mask(3); // "xmXrp"
```

## Why Base41?

Base41 is a highly efficient encoding for 16-, 32- and 64-bit values,
comparable to Base57 or Base85 in this respect. The difference is that Base85
encodes 32 bits to 5 characters, while Base41 requires 6 characters. By way of
comparison, the decimal representation of a 32-bit value requires 10 characters
and the hexadecimal, 8 characters. It can therefore be said that Base41 is 25%
more efficient than hexadecimal and 40% more efficient than decimal, but 20%
*less* efficient than Base85.

The primary advantage that Base41 holds over Base85 is that it is free of
special characters, making it suitable for use in URLs or anywhere else that
non-alphanumeric characters have special meanings or functions. Raw Base85 is
more compact, but in certain situations its output may need to be further
encoded or escaped, negating its size advantage. For example, the URL-encoded
version of `d%E[q2^hjU` is `d%25E%5Bq2%5EhjU` which uses 16 characters to
represent a 64-bit value, the same as hexadecimal.

For its part, Base57 (or the somewhat more common Base58) is also free of
special characters, therefore URL-safe. However, since it includes virtually
the full range of alphanumeric characters, encoded values can inadvertently
contain recognizable words, phrases or slang, including potentially offensive
language. The Base58 encoding of `0x949545` is `rude`, and, needless to say,
there are even ruder examples. Although such instances are rare, they can be
problematic when the encoded values are displayed publicly.

Dropping down to Base41 allows us to remove all vowels and numerals from the
encoding alphabet, which makes it virtually impossible to generate crude or
otherwise offensive character combinations. The encoding is therefore both
URL-safe and "safe for all audiences". In addition, it is free of commonly
confused character sets, including `O` / `0` and `l` / `I` / `1`.

## Performance

On commodity hardware (2020 M1 Macbook Air), a single invocation of
`Keymask.mask()` (JIT-compiled) takes on the order of 10 microseconds, whereas
a tight loop of one million invocations takes an average of between 0.2 and 0.6
microseconds per call (for inputs up to 64 bits long). This amounts to well
over a million keymasks per second.

For best performance, the `Keymask` class instance should be cached for
repeated usage.
