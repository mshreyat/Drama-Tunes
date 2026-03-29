// src/components/RecentlyPlayed.jsx
import { useEffect, useState } from "react"
import { getRecentSongs } from "../services/historyService"

function RecentlyPlayed({ setCurrentSong }) {

    const [recent, setRecent] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        getRecentSongs()
            .then(songs => {
                setRecent(songs)
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to load recent songs:", err)
                setLoading(false)
            })
    }, [])

    if (loading) return null
    if (recent.length === 0) return null

    return (
        <div className="p-6">

            <h2 className="text-xl font-bold mb-4">Recently Played</h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {recent.slice(0, 10).map((song, index) => (
                    <div
                        key={index}
                        className="bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700 group relative"
                        onClick={() => setCurrentSong(song)}
                    >
                        <div className="relative">
                            <img
                                src={song.cover || "https://via.placeholder.com/100"}
                                alt={song.title}
                                className="w-full aspect-square object-cover rounded mb-2"
                                onError={(e) => { e.target.src = "https://via.placeholder.com/100" }}
                            />
                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                                <span className="text-3xl">▶️</span>
                            </div>
                        </div>

                        <p className="text-sm font-medium truncate">{song.title}</p>
                        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                    </div>
                ))}
            </div>

        </div>
    )
}

export default RecentlyPlayed
