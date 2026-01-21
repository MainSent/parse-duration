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
    s: 1000,
    sec: 1000,
    secs: 1000,
    second: 1000,
    seconds: 1000,

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
const TOKEN_REG_EX = /([+-]?\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g;

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
    let matchedAny = false;
    for (const match of trimmed.matchAll(TOKEN_REG_EX)) {
        matchedAny = true;
        const value = Number(match[1]);
        const unit = match[2].toLowerCase() as DurationUnit;
        if (!Number.isFinite(value)) {
            throw new Error(`parseDurationMs: invalid number "${match[1]}" in "${raw}"`);
        }
        const msPer = UNIT_MS[unit];
        if (!msPer) {
            throw new Error(`parseDurationMs: unknown unit "${match[2]}" in "${raw}"`);
        }
        total += value * msPer;
    }

    // Ensure we didn't ignore junk
    const remainder = trimmed.replace(TOKEN_REG_EX, '').trim();
    if (!matchedAny || remainder.length > 0) {
        throw new Error(`parseDurationMs: could not fully parse "${raw}"`);
    }

    // Final rounding
    return Math.round(total);
}
