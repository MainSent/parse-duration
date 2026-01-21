import {describe, it, expect} from 'vitest';
import {parseDurationMs, isDurationUnit} from './index.js';

// Helper to build test tables tersely
interface Case<I = string, O = number> {
    input: I;
    expected: O;
}

describe('parseDurationMs', () => {
    describe('empty and whitespace inputs', () => {
        const cases: Case[] = [
            {input: '', expected: 0},
            {input: '   ', expected: 0},
            {input: '\n\t  ', expected: 0},
        ];

        for (const {input, expected} of cases) {
            it(`"${input.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}" -> ${expected}`, () => {
                expect(parseDurationMs(input)).toBe(expected);
            });
        }
    });

    describe('unitless numeric inputs (milliseconds)', () => {
        const cases: Case[] = [
            {input: '0', expected: 0},
            {input: '1500', expected: 1500},
            {input: '-1500', expected: -1500},
            {input: '1500.4', expected: 1500},
            {input: '1500.5', expected: 1501},
            {input: '-1500.5', expected: -1500},
            {input: '  123.9  ', expected: 124},
            {input: '9007199254740991', expected: 9007199254740991},
        ];

        for (const {input, expected} of cases) {
            it(`unitless "${input}" -> ${expected}`, () => {
                expect(parseDurationMs(input)).toBe(expected);
            });
        }

        it('Infinity as bare string cannot be parsed', () => {
            expect(() => parseDurationMs('Infinity')).toThrowError(
                'parseDurationMs: could not fully parse "Infinity"',
            );
        });

        it('-Infinity as bare string cannot be parsed', () => {
            expect(() => parseDurationMs('-Infinity')).toThrowError(
                'parseDurationMs: could not fully parse "-Infinity"',
            );
        });

        it('NaN as bare string cannot be parsed', () => {
            expect(() => parseDurationMs('NaN')).toThrowError(
                'parseDurationMs: could not fully parse "NaN"',
            );
        });
    });

    describe('simple single-unit tokens', () => {
        const milliCases: Case[] = [
            {input: '1ms', expected: 1},
            {input: '10 ms', expected: 10},
            {input: '1msec', expected: 1},
            {input: '2 msecs', expected: 2},
            {input: '5 millisecond', expected: 5},
            {input: '5 milliseconds', expected: 5},
            {input: '10MS', expected: 10},
            {input: '1.5ms', expected: 2},
            {input: '-2ms', expected: -2},
        ];

        const secondCases: Case[] = [
            {input: '1s', expected: 1000},
            {input: '2 sec', expected: 2000},
            {input: '3secs', expected: 3000},
            {input: '4 second', expected: 4000},
            {input: '5 seconds', expected: 5000},
            {input: '1S', expected: 1000},
            {input: '10SecS', expected: 10000},
            {input: '1.5s', expected: 1500},
            {input: '-1s', expected: -1000},
        ];

        const minuteCases: Case[] = [
            {input: '1m', expected: 60000},
            {input: '2 min', expected: 120000},
            {input: '3mins', expected: 180000},
            {input: '4 minute', expected: 240000},
            {input: '5 minutes', expected: 300000},
            {input: '1M', expected: 60000},
            {input: '10MiN', expected: 600000},
            {input: '1.5m', expected: 90000},
            {input: '-2m', expected: -120000},
        ];

        const hourCases: Case[] = [
            {input: '1h', expected: 3600000},
            {input: '2 hr', expected: 7200000},
            {input: '3hrs', expected: 10800000},
            {input: '4 hour', expected: 14400000},
            {input: '5 hours', expected: 18000000},
            {input: '1H', expected: 3600000},
            {input: '2HrS', expected: 7200000},
            {input: '1.5h', expected: 5400000},
            {input: '-4h', expected: -14400000},
        ];

        const dayCases: Case[] = [
            {input: '1d', expected: 86400000},
            {input: '2 day', expected: 172800000},
            {input: '3 days', expected: 259200000},
            {input: '1D', expected: 86400000},
            {input: '2DaYs', expected: 172800000},
            {input: '1.5d', expected: 129600000},
            {input: '-1d', expected: -86400000},
        ];

        const allCases = [
            ...milliCases,
            ...secondCases,
            ...minuteCases,
            ...hourCases,
            ...dayCases,
        ];

        for (const {input, expected} of allCases) {
            it(`"${input}" -> ${expected}`, () => {
                expect(parseDurationMs(input)).toBe(expected);
            });
        }
    });

    describe('mixed tokens and spacing', () => {
        const cases: Case[] = [
            {input: '1h 30m', expected: 5400000},
            {input: '1h30m', expected: 5400000},
            {input: '1 h 30 m', expected: 5400000},
            {input: '1h 30m 15s', expected: 5415000},
            {
                input: '2d 3h 4m 5s 6ms',
                expected:
                    2 * 86400000 +
                    3 * 3600000 +
                    4 * 60000 +
                    5 * 1000 +
                    6,
            },
            {input: '30m 1h', expected: 5400000},
            {input: '1h -30m', expected: 1800000},
            {input: '+1h', expected: 3600000},
            // 0.5h is 30 minutes already; adding 30m makes 1h total
            {input: '0.5h 30m', expected: 3600000},
            {input: '  1h   30m  ', expected: 5400000},
            {input: '1h\t30m\n15s', expected: 5415000},
        ];

        for (const {input, expected} of cases) {
            it(`"${input.replace(/\n/g, '\\n').replace(/\t/g, '\\t')}" -> ${expected}`, () => {
                expect(parseDurationMs(input)).toBe(expected);
            });
        }
    });

    describe('rounding behavior for fractional sums', () => {
        const cases: Case[] = [
            {input: '0.1ms', expected: 0},
            {input: '0.4ms', expected: 0},
            {input: '0.5ms', expected: 1},
            {input: '0.25ms 0.25ms', expected: 1},
            // Math.round(-0.5) === -0 in JS
            {input: '-0.5ms', expected: -0},
            {input: '1.2345ms', expected: 1},
            {input: '0.0005s', expected: 1}, // 0.5ms
        ];

        for (const {input, expected} of cases) {
            it(`rounding "${input}" -> ${expected}`, () => {
                expect(parseDurationMs(input)).toBe(expected as number);
            });
        }
    });

    describe('error conditions for token syntax', () => {
        describe('unknown units', () => {
            it('1x', () => {
                expect(() => parseDurationMs('1x')).toThrowError(
                    'parseDurationMs: unknown unit "x" in "1x"',
                );
            });

            it('10 foo', () => {
                expect(() => parseDurationMs('10 foo')).toThrowError(
                    'parseDurationMs: unknown unit "foo" in "10 foo"',
                );
            });

            it('10 XYZ', () => {
                expect(() => parseDurationMs('10 XYZ')).toThrowError(
                    'parseDurationMs: unknown unit "XYZ" in "10 XYZ"',
                );
            });
        });

        describe('invalid numbers in tokens', () => {
            it('NaNh', () => {
                expect(() => parseDurationMs('NaNh')).toThrowError(
                    'parseDurationMs: could not fully parse "NaNh"',
                );
            });

            it('Infinityh', () => {
                expect(() => parseDurationMs('Infinityh')).toThrowError(
                    'parseDurationMs: could not fully parse "Infinityh"',
                );
            });

            it('1..5h', () => {
                expect(() => parseDurationMs('1..5h')).toThrowError(
                    'parseDurationMs: could not fully parse "1..5h"',
                );
            });
        });

        describe('leftover / unparsed junk', () => {
            const junkCases: {input: string; message: string}[] = [
                {input: '1h abc', message: 'parseDurationMs: could not fully parse "1h abc"'},
                {input: '1h30', message: 'parseDurationMs: could not fully parse "1h30"'},
                {input: 'abc', message: 'parseDurationMs: could not fully parse "abc"'},
                {input: '1h2', message: 'parseDurationMs: could not fully parse "1h2"'},
                {input: '1h,', message: 'parseDurationMs: could not fully parse "1h,"'},
            ];

            for (const {input, message} of junkCases) {
                it(input, () => {
                    expect(() => parseDurationMs(input)).toThrowError(message);
                });
            }
        });

        describe('mixed colon and tokens', () => {
            it('1:30h', () => {
                expect(() => parseDurationMs('1:30h')).toThrowError(
                    'parseDurationMs: invalid ":" duration "1:30h"',
                );
            });
        });
    });

    describe('colon-delimited formats', () => {
        describe('basic HH:MM', () => {
            const cases: Case[] = [
                {input: '00:00', expected: 0},
                {input: '00:01', expected: 60000},
                {input: '01:00', expected: 3600000},
                {input: '01:30', expected: 5400000},
                {input: '10:05', expected: 10 * 3600000 + 5 * 60000},
            ];

            for (const {input, expected} of cases) {
                it(input, () => {
                    expect(parseDurationMs(input)).toBe(expected);
                });
            }
        });

        describe('HH:MM with sign and whitespace', () => {
            const cases: Case[] = [
                {input: ' 01:30 ', expected: 5400000},
                {input: '+01:30', expected: 5400000},
                {input: '-01:30', expected: -5400000},
                {input: ' -00:30 ', expected: -1800000},
            ];

            for (const {input, expected} of cases) {
                it(`"${input}"`, () => {
                    expect(parseDurationMs(input)).toBe(expected);
                });
            }
        });

        describe('HH:MM:SS', () => {
            const cases: Case[] = [
                {input: '00:00:00', expected: 0},
                {input: '00:00:01', expected: 1000},
                {input: '00:01:00', expected: 60000},
                {input: '01:00:00', expected: 3600000},
                {input: '01:30:15', expected: 5415000},
                {input: '10:05:30', expected: 36330000},
            ];

            for (const {input, expected} of cases) {
                it(input, () => {
                    expect(parseDurationMs(input)).toBe(expected);
                });
            }
        });

        describe('HH:MM:SS(.sss) fractional seconds', () => {
            const cases: Case[] = [
                {input: '00:00:00.000', expected: 0},
                {input: '00:00:00.500', expected: 500},
                {input: '00:00:00.5', expected: 500},
                {input: '00:00:01.250', expected: 1250},
                {input: '01:30:15.250', expected: 5415250},
                {input: '00:00:00.499', expected: 499},
                {input: '00:00:00.500', expected: 500},
                {input: '-00:00:00.500', expected: -500},
            ];

            for (const {input, expected} of cases) {
                it(input, () => {
                    expect(parseDurationMs(input)).toBe(expected);
                });
            }
        });

        describe('large hour values', () => {
            it('999:59', () => {
                const expected = 999 * 3600000 + 59 * 60000;
                expect(parseDurationMs('999:59')).toBe(expected);
            });

            it('-999:59:59.999', () => {
                const expected = -(
                    999 * 3600000 +
                    59 * 60000 +
                    59.999 * 1000
                );
                expect(parseDurationMs('-999:59:59.999')).toBe(expected);
            });
        });

        describe('invalid colon formats', () => {
            const invalids = [
                ':',
                '::',
                '1::2',
                '1:',
                ':30',
                ':30:00',
                '1:2:3:4',
                '1.5:30',
                '01:3a',
                '01:-30',
                '01:60',
                '00:00:-1',
                '00:00:60',
                '00:00:3a',
                '00:00:01.',
                '00:00:01.2.3',
                '00:00:abc',
                '1:30abc',
                'abc1:30',
            ];

            for (const input of invalids) {
                it(input, () => {
                    expect(() => parseDurationMs(input)).toThrowError(
                        `parseDurationMs: invalid ":" duration "${input}"`,
                    );
                });
            }
        });
    });
});

describe('isDurationUnit', () => {
    it('returns true for all valid units', () => {
        const validUnits = [
            'ms', 'millisecond', 'milliseconds', 'msec', 'msecs',
            's', 'sec', 'secs', 'second', 'seconds',
            'm', 'min', 'mins', 'minute', 'minutes',
            'h', 'hr', 'hrs', 'hour', 'hours',
            'd', 'day', 'days',
        ] as const;

        for (const u of validUnits) {
            expect(isDurationUnit(u)).toBe(true);
        }
    });

    it('is case-sensitive and returns false for capitalised variants', () => {
        const invalid = ['MS', 'Sec', 'H'];
        for (const u of invalid) {
            expect(isDurationUnit(u)).toBe(false);
        }
    });

    it('returns false for invalid or malformed units', () => {
        const invalid = [
            '',
            'x',
            'foo',
            'millis',
            'minute ',
            ' sec',
            '1s',
            's2',
            'thisisnotavalidunit',
        ];

        for (const u of invalid) {
            expect(isDurationUnit(u)).toBe(false);
        }
    });
});
