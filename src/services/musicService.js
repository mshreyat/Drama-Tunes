// src/services/musicService.js

const DEFAULT_TERMS = [
  "bollywood hits",
  "punjabi pop",
  "hindi romantic",
  "indie pop",
  "hip hop",
  "pop hits 2024",
  "lofi chill",
  "workout music",
  "taylor swift",
  "arijit singh",
  "ar rahman",
  "drake",
  "the weeknd",
  "jazz classics",
  "k-pop hits",
]

export async function fetchSongs(searchTerm = null) {

  // If a specific search term is given (user searched something), just fetch that
  if (searchTerm) {
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&entity=song&limit=50`
    )
    const data = await response.json()
    return data.results.filter(song => song.previewUrl) // only songs with preview
  }

  // Otherwise fetch from multiple genres in parallel
  const terms = DEFAULT_TERMS

  const requests = terms.map(term =>
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=20`)
      .then(res => res.json())
      .then(data => data.results || [])
      .catch(() => []) // if one fails, don't break everything
  )

  const results = await Promise.all(requests)

  // Flatten all results into one array
  const allSongs = results.flat()

  // Remove duplicates by trackId
  const seen = new Set()
  const uniqueSongs = allSongs.filter(song => {
    if (!song.trackId || !song.previewUrl) return false // skip songs without preview
    if (seen.has(song.trackId)) return false
    seen.add(song.trackId)
    return true
  })

  // Shuffle so it feels fresh every time
  return uniqueSongs.sort(() => Math.random() - 0.5)
}