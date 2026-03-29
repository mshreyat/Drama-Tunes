import { useState, useEffect } from "react"

function Playlist({ songs, setCurrentSong, setSelectedSong, setShowPlaylistPicker }) {

  const [favorites, setFavorites] = useState([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("favorites")) || []
    setFavorites(stored)
  }, [])

  const toggleFavorite = (song) => {
    let updated
    const exists = favorites.find(s => s.id === song.id)

    if (exists) {
      updated = favorites.filter(s => s.id !== song.id)
    } else {
      updated = [...favorites, song]
    }

    setFavorites(updated)
    localStorage.setItem("favorites", JSON.stringify(updated))

    let playlists = JSON.parse(localStorage.getItem("playlists")) || []
    let favPlaylist = playlists.find(p => p.name === "Favorites")

    if (!favPlaylist) {
      favPlaylist = { name: "Favorites", songs: [] }
      playlists.push(favPlaylist)
    }

    if (exists) {
      favPlaylist.songs = favPlaylist.songs.filter(s => s.id !== song.id)
    } else {
      favPlaylist.songs.push(song)
    }

    localStorage.setItem("playlists", JSON.stringify(playlists))
  }

  const isFavorite = (song) => favorites.some(s => s.id === song.id)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

      {songs.map((song) => (
        <div
          key={song.id}
          className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-700 transition-all cursor-pointer group"
        >

          {/* Cover Image */}
          <div className="relative" onClick={() => setCurrentSong(song)}>
            <img
              src={song.cover || "https://via.placeholder.com/300"}
              alt={song.title}
              className="w-full aspect-square object-cover"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/300"
              }}
            />
            {/* Play overlay on hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-4xl">▶️</span>
            </div>
          </div>

          {/* Song Info + Actions */}
          <div className="p-3 flex justify-between items-center">

            <div
              className="overflow-hidden cursor-pointer"
              onClick={() => setCurrentSong(song)}
            >
              <h3 className="font-semibold text-sm truncate">{song.title}</h3>
              <p className="text-xs text-gray-400 truncate">{song.artist}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 ml-2 shrink-0">

              <button
                onClick={() => toggleFavorite(song)}
                className={isFavorite(song) ? "text-red-500" : "text-gray-400"}
              >
                {isFavorite(song) ? "❤️" : "🤍"}
              </button>

              <button
                onClick={() => {
                  if (!setSelectedSong || !setShowPlaylistPicker) return
                  setSelectedSong(song)
                  setShowPlaylistPicker(true)
                }}
              >
                ➕
              </button>

            </div>
          </div>

        </div>
      ))}

    </div>
  )
}

export default Playlist
