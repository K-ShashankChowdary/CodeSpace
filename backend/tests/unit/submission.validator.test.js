import { runSubmitSchema } from '../../src/validators/submission.validator.js';

describe('Submission Validator Unit Tests', () => {
    test('Valid submission payload should pass validation', () => {
        const payload = {
            problemId: "60b9b3b3b3b3b3b3b3b3b3b3",
            language: "cpp",
            code: "int main() { return 0; }",
            executionType: "submit"
        };
        const result = runSubmitSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });

    test('Missing required fields should fail validation', () => {
        const payload = {
            language: "cpp"
        };
        const result = runSubmitSchema.safeParse(payload);
        expect(result.success).toBe(false);
        const errorPaths = result.error.issues.map(e => e.path[0]);
        expect(errorPaths).toContain("problemId");
        expect(errorPaths).toContain("code");
    });

    test('Empty strings in required fields should fail validation', () => {
        const payload = {
            problemId: "",
            language: "python",
            code: ""
        };
        const result = runSubmitSchema.safeParse(payload);
        expect(result.success).toBe(false);
        const errorPaths = result.error.issues.map(e => e.path[0]);
        expect(errorPaths).toContain("problemId");
        expect(errorPaths).toContain("code");
    });

    test('Invalid language should fail validation', () => {
        const payload = {
            problemId: "123",
            language: "rust", // Not in enum
            code: "fn main() {}"
        };
        const result = runSubmitSchema.safeParse(payload);
        expect(result.success).toBe(false);
        expect(result.error.issues[0].path[0]).toBe("language");
    });

    test('Valid run payload with testcaseIndex should pass', () => {
        const payload = {
            problemId: "123",
            language: "javascript",
            code: "console.log('hello')",
            testcaseIndex: 1,
            executionType: "run"
        };
        const result = runSubmitSchema.safeParse(payload);
        expect(result.success).toBe(true);
    });
});
