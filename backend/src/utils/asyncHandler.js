const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      // If the controller throws an error, this safely passes it to your app.js global error handler
      if (typeof next === 'function') {
        next(err);
      } else {
        console.error("Critical: 'next' is not a function. Check route definitions.", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
      }
    });
  };
};

export { asyncHandler };