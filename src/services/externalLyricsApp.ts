import express from "express";

const app = express();

app.use(express.json());

app.get("/lyrics", async (req, res) => {
  res.json({
    lyrics: "Meu escritório é na praia, eu to sempre na área",
  });
});

export default app;
