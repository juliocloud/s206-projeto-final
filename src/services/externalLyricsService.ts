import app from "./externalLyricsApp";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Lyrics server running on http://localhost:${PORT}`);
});
