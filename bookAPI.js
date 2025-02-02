const OpenLibraryURL = 'https://openlibrary.org'
const headers = new Headers({
  'User-Agent': 'book-club-helper (andresgabriel.kessler@gmail.com)',
})

async function getBook(title, author) {
  const safeTitle = title.replace(/[^\p{L}\p{N}\s]/gu, '')
  const res = await fetch(
    OpenLibraryURL +
      `/search.json?` +
      new URLSearchParams({
        q: `title: ${safeTitle} ${author ? 'author: ' + author : ''}`,
        limit: 5,
        lang: 'es',
      }),
    { headers: headers }
  )

  const data = await res.json()

  return data.docs[0]
}

async function getWork(key) {
  const res = await fetch(OpenLibraryURL + `${key}.json`, { headers: headers })
  const data = await res.json()

  return data
}

async function getAuthor(key) {
  const res = await fetch(OpenLibraryURL + `${key}.json`, { headers: headers })
  const data = await res.json()

  return data
}

async function getRating(key) {
  const res = await fetch(OpenLibraryURL + `${key}/ratings.json`, {
    headers: headers,
  })
  const data = await res.json()

  return data
}

export { getBook, getWork, getAuthor, getRating }
