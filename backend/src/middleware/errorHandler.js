export function notFoundHandler(req, res) {
  res.status(404).json({ error: "Not found." });
}

export function errorHandler(err, req, res, _next) {
  // Postgres unique-violation → map to a clean 409 instead of a 500 wall of text.
  if (err && err.code === "23505") {
    return res.status(409).json({ error: "That value is already in use." });
  }
  if (err && err.code === "23503") {
    return res.status(400).json({ error: "Referenced resource does not exist." });
  }
  if (err && err.name === "ZodError") {
    return res.status(422).json({ error: "Validation failed.", details: err.issues });
  }
  console.error(err);
  const status = err?.status || 500;
  res.status(status).json({ error: status === 500 ? "Internal server error." : err.message });
}
