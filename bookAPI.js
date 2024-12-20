const OpenLibraryURL = "https://openlibrary.org";
const headers = new Headers({
  "User-Agent": "book-club-helper (andresgabriel.kessler@gmail.com)",
});

async function getBook(title, author) {
  const res = await fetch(
    OpenLibraryURL +
      `/search.json?` +
      new URLSearchParams({
        q: `title: ${title} ${author ? "author: " + author : ""}`,
        limit: 5,
        lang: "es"
      }),
    { headers: headers }
  );
  const data = await res.json();

  return data.docs[0];
}

async function getWork(key) {
  const res = await fetch(OpenLibraryURL + `${key}.json`, { headers: headers });
  const data = await res.json();

  return data;
}

export { getBook, getWork };
