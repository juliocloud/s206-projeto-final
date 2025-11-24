export const getLyrics = async (): Promise<string> => {
  const response = await fetch(`http://localhost:3000/lyrics`);

  if (!response.ok) {
    throw new Error(`Failed to fetch lyrics: ${response.statusText}`);
  }

  const data = await response.json();
  return data.lyrics || data;
};
