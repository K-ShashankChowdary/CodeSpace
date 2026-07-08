import { ApiError } from "../utils/ApiError.js";

/**
 * Validates request data against a Zod schema.
 * @param {import('zod').ZodSchema} schema - The Zod schema to validate against.
 * @param {string} source - The request property to validate ('body', 'query', 'params').
 */
export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const parsedData = schema.parse(req[source]);
      // Override request data with sanitized/transformed Zod output
      req[source] = parsedData;
      next();
    } catch (error) {
      if (error.name === "ZodError") {
        // Extract the first error message
        const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        return next(new ApiError(400, message));
      }
      return next(error);
    }
  };
};
