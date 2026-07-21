import crypto from 'crypto';

/**
 * Simulates a heavy string manipulation workload.
 * In a real scenario, this would mimic the output parsing of `jobworker.js`.
 */

export const name = 'heavy_strings_zero_allocation';

export async function setup() {
    // Generate 100 large output strings (100KB each) to simulate a massive test case payload
    const testCases = [];
    for (let i = 0; i < 50; i++) {
        // Generate random strings with lots of whitespace
        const randomData = crypto.randomBytes(50000).toString('hex');
        const withWhitespace = randomData.replace(/a/g, ' \n ').replace(/b/g, '\t');
        
        testCases.push({
            expected: withWhitespace,
            actual: withWhitespace + ' ' // slightly different but mostly same
        });
    }
    return testCases;
}

export async function execute(testCases) {
    // The zero-allocation method
    for (const tc of testCases) {
        compareOutputsZeroAlloc(tc.actual, tc.expected);
    }
}

// Replicate the jobworker zero-alloc function here for the benchmark
function isWhitespace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}
function isSpace(c) {
    return c === ' ' || c === '\t';
}

function compareOutputsZeroAlloc(actual, expected) {
    if (!actual) actual = "";
    if (!expected) expected = "";

    let i = 0;
    while (i < actual.length && isWhitespace(actual[i])) i++;
    let j = 0;
    while (j < expected.length && isWhitespace(expected[j])) j++;

    let endA = actual.length - 1;
    while (endA >= 0 && isWhitespace(actual[endA])) endA--;
    let endE = expected.length - 1;
    while (endE >= 0 && isWhitespace(expected[endE])) endE--;

    while (i <= endA || j <= endE) {
        let lineEndA = i;
        while (lineEndA <= endA && actual[lineEndA] !== '\n' && actual[lineEndA] !== '\r') lineEndA++;
        let lineLastCharA = lineEndA - 1;
        while (lineLastCharA >= i && isSpace(actual[lineLastCharA])) lineLastCharA--;

        let lineEndE = j;
        while (lineEndE <= endE && expected[lineEndE] !== '\n' && expected[lineEndE] !== '\r') lineEndE++;
        let lineLastCharE = lineEndE - 1;
        while (lineLastCharE >= j && isSpace(expected[lineLastCharE])) lineLastCharE--;

        const lenA = lineLastCharA - i + 1;
        const lenE = lineLastCharE - j + 1;

        if (lenA !== lenE) return false;

        for (let k = 0; k < lenA; k++) {
            if (actual[i + k].toLowerCase() !== expected[j + k].toLowerCase()) {
                return false;
            }
        }

        i = lineEndA;
        if (i <= endA && actual[i] === '\r') i++;
        if (i <= endA && actual[i] === '\n') i++;

        j = lineEndE;
        if (j <= endE && expected[j] === '\r') j++;
        if (j <= endE && expected[j] === '\n') j++;
    }

    return true;
}
