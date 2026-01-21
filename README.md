# parse-duration

A tiny utility to parse human-readable duration strings into milliseconds.

This library has a single function, `parseDurationMs`, plus a small helper `isDurationUnit`.

## Installation

Using pnpm (recommended):

```bash
pnpm add ms-parse-duration
```

Using npm:

```bash
npm install ms-parse-duration
```

Using Yarn:

```bash
yarn add ms-parse-duration
```

## API

### `parseDurationMs(input: string): number`

Parses a duration string and returns the total number of milliseconds as a JavaScript `number`.

- Returns `0` for empty or whitespace-only strings.
- Throws an `Error` for invalid or partially-parsed inputs.

#### Supported formats

##### 1. Plain millisecond numbers

If the string is just a (signed) number, it is interpreted directly as milliseconds.

```ts
parseDurationMs('1500');      // 1500
parseDurationMs('-200');      // -200
parseDurationMs('1500.4');    // 1500  (Math.round applied)
parseDurationMs('1500.5');    // 1501
parseDurationMs('  123.9  '); // 124
```

`Infinity`, `-Infinity`, and `NaN` as bare strings are **not** accepted and will throw:

```ts
parseDurationMs('Infinity');  // Error: parseDurationMs: could not fully parse "Infinity"
parseDurationMs('-Infinity'); // Error: parseDurationMs: could not fully parse "-Infinity"
parseDurationMs('NaN');       // Error: parseDurationMs: could not fully parse "NaN"
```

##### 2. Unit-suffixed tokens (ms, s, m, h, d)

A duration string can contain one or more "tokens" of the form:

```text
<number><optional space><unit>
```

These tokens are summed together. The numeric part may be integer or decimal; the unit is case-insensitive.

Supported units and aliases:

- **Milliseconds**
  - `ms`, `millisecond`, `milliseconds`, `msec`, `msecs`
- **Seconds**
  - `s`, `sec`, `secs`, `second`, `seconds`
- **Minutes**
  - `m`, `min`, `mins`, `minute`, `minutes`
- **Hours**
  - `h`, `hr`, `hrs`, `hour`, `hours`
- **Days**
  - `d`, `day`, `days`

Examples:

```ts
// milliseconds
parseDurationMs('1ms');             // 1
parseDurationMs('10 ms');           // 10
parseDurationMs('1.5ms');           // 2
parseDurationMs('-2ms');            // -2

// seconds
parseDurationMs('1s');              // 1000
parseDurationMs('2 sec');           // 2000
parseDurationMs('3secs');           // 3000
parseDurationMs('4 second');        // 4000
parseDurationMs('5 seconds');       // 5000
parseDurationMs('1.5s');            // 1500
parseDurationMs('-1s');             // -1000

// minutes
parseDurationMs('1m');              // 60000
parseDurationMs('2 min');           // 120000
parseDurationMs('3mins');           // 180000
parseDurationMs('4 minute');        // 240000
parseDurationMs('5 minutes');       // 300000
parseDurationMs('1.5m');            // 90000
parseDurationMs('-2m');             // -120000

// hours
parseDurationMs('1h');              // 3600000
parseDurationMs('2 hr');            // 7200000
parseDurationMs('3hrs');            // 10800000
parseDurationMs('4 hour');          // 14400000
parseDurationMs('5 hours');         // 18000000
parseDurationMs('1.5h');            // 5400000
parseDurationMs('-4h');             // -14400000

// days
parseDurationMs('1d');              // 86400000
parseDurationMs('2 day');           // 172800000
parseDurationMs('3 days');          // 259200000
parseDurationMs('1.5d');            // 129600000
parseDurationMs('-1d');             // -86400000
```

You can freely mix tokens and whitespace:

```ts
parseDurationMs('1h 30m');          // 5400000
parseDurationMs('1h30m');           // 5400000
parseDurationMs('1 h 30 m');        // 5400000
parseDurationMs('1h 30m 15s');      // 5415000
parseDurationMs('30m 1h');          // 5400000
parseDurationMs('1h -30m');         // 1800000
parseDurationMs('+1h');             // 3600000
parseDurationMs('0.5h 30m');        // 3600000 (0.5h is 30m; plus 30m = 1h)

// Whitespace characters are allowed
parseDurationMs('1h\t30m\n15s');   // 5415000
```

If any unknown unit is encountered, an error is thrown including the original unit and input string:

```ts
parseDurationMs('1x');    // Error: parseDurationMs: unknown unit "x" in "1x"
parseDurationMs('10 foo'); // Error: parseDurationMs: unknown unit "foo" in "10 foo"
```

##### 3. `HH:MM` and `HH:MM:SS(.sss)` formats

If the string contains a colon (`:`), `parseDurationMs` will attempt to parse it as a clock-style duration:

- `HH:MM`
- `HH:MM:SS`
- `HH:MM:SS.sss` (fractional seconds)

The hours part may be signed; the sign applies to the whole duration.

```ts
// HH:MM
parseDurationMs('00:00');           // 0
parseDurationMs('00:01');           // 60000
parseDurationMs('01:00');           // 3600000
parseDurationMs('01:30');           // 5400000
parseDurationMs('10:05');           // 10h + 5m

// Sign and whitespace
parseDurationMs(' 01:30 ');         // 5400000
parseDurationMs('+01:30');          // 5400000
parseDurationMs('-01:30');          // -5400000
parseDurationMs(' -00:30 ');        // -1800000

// HH:MM:SS
parseDurationMs('00:00:00');        // 0
parseDurationMs('00:00:01');        // 1000
parseDurationMs('00:01:00');        // 60000
parseDurationMs('01:00:00');        // 3600000
parseDurationMs('01:30:15');        // 5415000
parseDurationMs('10:05:30');        // 36330000

// Fractional seconds
parseDurationMs('00:00:00.500');    // 500
parseDurationMs('00:00:00.5');      // 500
parseDurationMs('00:00:01.250');    // 1250
parseDurationMs('01:30:15.250');    // 5415250
parseDurationMs('-00:00:00.500');   // -500
```

Invalid `:` formats (wrong segment counts, invalid ranges, non-numeric parts, etc.) raise a descriptive error:

```ts
parseDurationMs('1:2:3:4'); // Error: parseDurationMs: invalid ":" duration "1:2:3:4"
parseDurationMs('01:60');   // Error: parseDurationMs: invalid ":" duration "01:60"
parseDurationMs('00:00:60'); // Error: parseDurationMs: invalid ":" duration "00:00:60"
```

##### 4. Rounding

Internally, `parseDurationMs` works with floating-point numbers and calls `Math.round` on the final sum.

Key implications:

- Small fractions may round to `0` or `1`:

  ```ts
  parseDurationMs('0.1ms');        // 0
  parseDurationMs('0.5ms');        // 1
  parseDurationMs('0.0005s');      // 1 (0.5ms)
  ```

- Negative values follow JavaScript rounding rules, e.g. `Math.round(-0.5) === -0` and `Math.round(-1500.5) === -1500`.

### Errors

`parseDurationMs` throws when:

- No recognizable tokens or colon format can be parsed, or
- Only part of the string can be parsed and there is leftover junk.

Examples:

```ts
parseDurationMs('abc');    // Error: parseDurationMs: could not fully parse "abc"
parseDurationMs('1h abc'); // Error: parseDurationMs: could not fully parse "1h abc"
parseDurationMs('1h30');   // Error: parseDurationMs: could not fully parse "1h30"
parseDurationMs('1:30h');  // Error: parseDurationMs: invalid ":" duration "1:30h"
```

Error messages are designed to include the original, unmodified input to aid debugging.

### `isDurationUnit(unit: string): boolean`

Utility function that checks whether a given string is one of the supported duration unit **keywords**.

Note: this function is **case-sensitive**; it expects lowercase unit names.

```ts
isDurationUnit('ms');         // true
isDurationUnit('seconds');    // true
isDurationUnit('MS');         // false
isDurationUnit('foo');        // false
```

This can be useful if you want to validate or normalize user input before building your own duration strings.

## TypeScript support

The library is written in TypeScript and ships its compiled output under `build/`. You can import it from TypeScript or JavaScript code:

```ts
// ESM
import { parseDurationMs, isDurationUnit } from 'parse-duration';

// In this repo (local development)
import { parseDurationMs, isDurationUnit } from './src/index.js';
```

## Development

### Install dependencies

From the repository root:

```bash
pnpm install
```

### Run tests

Tests are written with [Vitest](https://vitest.dev/) and live in `src/index.test.ts`.

```bash
pnpm test
```

### Build

To compile the TypeScript source to `build/`:

```bash
pnpm run build
```

This will use the TypeScript configuration from `tsconfig.json`.

## License

MIT © MainSent GmbH

