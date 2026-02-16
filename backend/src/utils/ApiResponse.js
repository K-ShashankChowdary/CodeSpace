/**
 * Custom API Response Class
 * Ensures every successful response has a consistent format:
 * { statusCode, data, message, success: true }
 */
class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400; // True if status is 2xx or 3xx
    }
}

export { ApiResponse };