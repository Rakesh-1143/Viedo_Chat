export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body contains invalid JSON" });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Request body is too large" });
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) {
    console.error("Unhandled API error", {
      method: req.method,
      path: req.path,
      message: error.message,
    });
  }

  return res.status(status).json({
    message: status >= 500 ? "Internal Server Error" : error.message,
  });
};
