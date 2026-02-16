/**
 * Custom API Error Class
 * Extends the native Error class to include HTTP status codes and structured error arrays.
 */
class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = null; // Standardizes response structure
        this.message = message;
        this.success = false; // Flag for frontend logic
        this.errors = errors;

        // Capture stack trace for debugging in development
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };