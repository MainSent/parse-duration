/** All accepted unit spellings (case-insensitive at runtime; types use lowercase). */
export type DurationUnit =
    | 'd' | 'day' | 'days'
    | 'h' | 'hr' | 'hrs' | 'hour' | 'hours'
    | 'm' | 'min' | 'mins' | 'minute' | 'minutes'
    | 's' | 'sec' | 'secs' | 'second' | 'seconds'
    | 'ms' | 'msec' | 'msecs' | 'millisecond' | 'milliseconds';


/**
 * Mapping of duration units to their equivalent in milliseconds.
 */
const UNIT_MS: Record<DurationUnit, number> = {

    // milliseconds
    ms: 1,
    millisecond: 1,
    milliseconds: 1,
    msec: 1,
    msecs: 1,

    // seconds
    s: 1_000,
    sec: 1_000,
    secs: 1_000,
    second: 1_000,
    seconds: 1_000,

    // minutes
    m: 60_000,
    min: 60_000,
    mins: 60_000,
    minute: 60_000,
    minutes: 60_000,

    // hours
    h: 3_600_000,
    hr: 3_600_000,
    hrs: 3_600_000,
    hour: 3_600_000,
    hours: 3_600_000,

    // days
    d: 86_400_000,
    day: 86_400_000,
    days: 86_400_000,
};
const TOKEN_REG_EX = /([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z]+)/y;

/**
 * Check if a character is an ASCII digit (same as `\d` in a non-unicode RegExp).
 * @param char The character to check.
 * @returns True if the character is 0-9.
 */
function isDigit(char: string | undefined): boolean {
    return char != null && char >= '0' && char <= '9';
}

/**
 * Find all tokens in the same order as `input.matchAll(/<TOKEN_REG_EX>/g)` and collect the text
 * between them (what `input.replace(/<TOKEN_REG_EX>/g, '')` would leave), in linear time.
 *
 * A global regex search retries at every position of a digit run that is not followed by a unit,
 * which is quadratic. A token attempt that fails inside a digit run fails for every later position
 * of that run as well (they share the same continuation), so the run is skipped after one attempt.
 * @param input The input string.
 * @returns The token matches and the unmatched remainder.
 */
function scanTokens(input: string): {matches: RegExpExecArray[], remainder: string} {
    const matches: RegExpExecArray[] = [];
    let remainder = '';
    let gapStart = 0;
    let position = 0;
    while (position < input.length) {
        const char = input[position];
        const isSign = (char === '+' || char === '-');
        if (!isDigit(char) && !(isSign && isDigit(input[position + 1]))) {
            position++;
            continue;
        }
        TOKEN_REG_EX.lastIndex = position;
        const match = TOKEN_REG_EX.exec(input);
        if (match) {
            remainder += input.slice(gapStart, position);
            matches.push(match);
            position = gapStart = TOKEN_REG_EX.lastIndex;
            continue;
        }
        if (isSign) position++;
        while (isDigit(input[position])) position++;
    }
    remainder += input.slice(gapStart);
    return {matches, remainder};
}

/**
 * Parse a colon-delimited time string (HH:MM or HH:MM:SS(.sss)) into milliseconds.
 * @param s The input string.
 * @returns The duration in milliseconds, or null if invalid.
 */
function parseColonTimeToMs(s: string): number | null {
    const parts = s.split(':');
    if (parts.length !== 2 && parts.length !== 3) return null;
    const hStr = parts[0]?.trim();
    const mStr = parts[1]?.trim();
    const sStr = parts.length === 3 ? parts[2]!.trim() : undefined;

    // Hours can be fractional? We'll keep it strict-ish: hours integer for ":" format.
    if (!hStr || !mStr) return null;
    if (!/^[+-]?\d+$/.test(hStr)) return null;
    if (!/^\d+$/.test(mStr)) return null;
    if (sStr != null && !/^\d+(?:\.\d+)?$/.test(sStr)) return null;
    const sign = hStr.startsWith('-') ? -1 : 1;
    const hours = Math.abs(Number(hStr));
    const minutes = Number(mStr);
    const seconds = sStr != null ? Number(sStr) : 0;

    // Validate ranges
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    if (minutes < 0 || minutes >= 60) return null;
    if (seconds < 0 || seconds >= 60) return null;

    // Compute total
    const total = (hours * 3_600_000 + minutes * 60_000 + seconds * 1_000) * sign;
    return Math.round(total);
}

/**
 * Parse a duration string into milliseconds.
 *
 * Supported:
 * - Tokens: "23 h 30 min", "1.5h", "10 seconds", "500ms"
 * - Colon:  "01:30" (HH:MM), "01:30:15.250" (HH:MM:SS(.sss))
 * - Unitless: "1500" => 1500ms
 *
 * @param input The input duration string.
 * @returns The duration in milliseconds.
 * @throws Error If the input is invalid.
 */
export function parseDurationMs(input: string): number {
    const raw = String(input);
    const trimmed = raw.trim();
    if (!trimmed) return 0;

    // ":" delimiter
    if (trimmed.includes(':')) {
        const ms = parseColonTimeToMs(trimmed);
        if (ms == null) throw new Error(`parseDurationMs: invalid ":" duration "${raw}"`);
        return ms;
    }

    // Unitless => ms (fractional allowed; rounded to integer ms)
    if (/^[+-]?\d+(?:\.\d+)?$/.test(trimmed)) {
        const n = Number(trimmed);
        if (!Number.isFinite(n)) throw new Error(`parseDurationMs: invalid number "${raw}"`);
        return Math.round(n);
    }

    // Token list
    let total = 0;
    const {matches, remainder} = scanTokens(trimmed);
    for (const match of matches) {
        const value = Number(match[1]);
        const unit = match[2].toLowerCase();
        if (!Number.isFinite(value)) {
            throw new Error(`parseDurationMs: invalid number "${match[1]}" in "${raw}"`);
        }
        if (!isDurationUnit(unit)) {
            throw new Error(`parseDurationMs: unknown unit "${match[2]}" in "${raw}"`);
        }
        const msPer = UNIT_MS[unit];
        total += value * msPer;
    }

    // Ensure we didn't ignore junk
    if (!matches.length || remainder.trim().length > 0) {
        throw new Error(`parseDurationMs: could not fully parse "${raw}"`);
    }

    // Final rounding
    return Math.round(total);
}

/**
 * Check if a string is a valid duration unit.
 * @param unit The unit string to check.
 * @returns True if valid, false otherwise.
 */
export function isDurationUnit(unit: string): unit is DurationUnit {
    return unit in UNIT_MS;
}
