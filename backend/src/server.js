import { app } from "./app.js";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Gaming companion API listening on :${port}`);
});
