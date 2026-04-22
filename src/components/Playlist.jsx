import { saveFavorites } from "../services/storageService"

function Playlist({ songs, setCurrentSong, setSelectedSong, setShowPlaylistPicker, onDelete }) {

  // read directly from localStorage (single source of truth)
  const getStoredFavorites = () => {
    return JSON.parse(localStorage.getItem("favorites")) || []
  }

  const toggleFavorite = async (song) => {
    const stored = getStoredFavorites()
    const exists = stored.find(s => s.id === song.id)

    let updated
    if (exists) {
      updated = stored.filter(s => s.id !== song.id)
    } else {
      updated = [...stored, song]
    }

    // save locally first (works offline)
    localStorage.setItem("favorites", JSON.stringify(updated))

    // sync to firebase only if online
    if (navigator.onLine) {
      try {
        await saveFavorites(updated)
      } catch (e) {
        console.log("Offline: Firebase sync skipped")
      }
    }

    // sync Favorites playlist
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

    // force UI refresh everywhere
    window.dispatchEvent(new Event("storage"))
  }

  const isFavorite = (song) =>
    getStoredFavorites().some(s => s.id === song.id)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {songs.map((song) => (
        <div
          key={song.id}
          className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-700 transition-all cursor-pointer group"
        >

          {/* IMAGE / PLAY */}
          <div className="relative" onClick={() => setCurrentSong(song)}>
            <img
              src={song.cover || "https://via.placeholder.com/300"}
              alt={song.title}
              className="w-full aspect-square object-cover"
              onError={(e) => {
                e.target.src = "https://via.placeholder.com/300"
              }}
            />

            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-4xl">▶️</span>
            </div>
          </div>

          {/* INFO + ACTIONS */}
          <div className="p-3 flex justify-between items-center">

            <div
              className="overflow-hidden cursor-pointer"
              onClick={() => setCurrentSong(song)}
            >
              <h3 className="font-semibold text-sm truncate">
                {song.title}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {song.artist}
              </p>
            </div>

            <div className="flex gap-2 ml-2 shrink-0">

              {/* FAVORITE */}
              <button
                onClick={() => toggleFavorite(song)}
                className={isFavorite(song) ? "text-red-500" : "text-gray-400"}
              >
                {isFavorite(song) ? "❤️" : "🤍"}
              </button>

              {/* ADD TO PLAYLIST */}
              <button
                onClick={() => {
                  if (!setSelectedSong || !setShowPlaylistPicker) return
                  setSelectedSong(song)
                  setShowPlaylistPicker(true)
                }}
                className="text-gray-300 hover:text-white"
              >
                ➕
              </button>

              {/* DELETE (optional) */}
              {onDelete && (
                <button
                  onClick={() => onDelete(song)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  🗑
                </button>
              )}

            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default Playlist