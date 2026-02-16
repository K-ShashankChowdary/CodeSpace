/**
 * Async Handler Wrapper
 * Automatically catches errors in async functions and passes them to Next()
 * This cleaner approach avoids repetitive try-catch blocks in controllers.
 */
const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export { asyncHandler };