import { useState, useEffect } from "react"
import { ref, set } from "firebase/database"
import { db, auth } from "./firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { logSongPlay } from "./services/historyService"
import RoastModal from "./components/RoastModal"
import MoodSelector from "./components/MoodSelector"
import Playlist from "./components/Playlist"
import Player from "./components/Player"
import RecentlyPlayed from "./components/RecentlyPlayed"
import Favorites from "./components/Favorites"
import AuthPage from "./components/AuthPage"
import { generatePlaylists } from "./utils/playlistEngine"
import { roastUser } from "./utils/roastEngine"
import { fetchSongs } from "./services/musicService"

function App() {

    const [songs, setSongs] = useState([])
    const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(null)
    const [currentSong, setCurrentSong] = useState(null)
    const [selectedSong, setSelectedSong] = useState(null)
    const [showPlaylistModal, setShowPlaylistModal] = useState(false)
    const [mood, setMood] = useState("all")
    const [search, setSearch] = useState("")
    const [view, setView] = useState("home")
    const [shuffle, setShuffle] = useState(false)
    const [repeat, setRepeat] = useState(false)
    const [roastText, setRoastText] = useState("")
    const [showRoastModal, setShowRoastModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [playlistsData, setPlaylistsData] = useState(
        JSON.parse(localStorage.getItem("playlists")) || []
    )
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [roastLoading, setRoastLoading] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState("")
    const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
    const [user, setUser] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)

    const moods = ["happy", "chill", "workout", "romantic"]

    // fetch songs
    useEffect(() => {
        fetchSongs()
            .then(data => {
                const formattedSongs = data.map(song => ({
                    id: song.trackId,
                    title: song.trackName,
                    artist: song.artistName,
                    src: song.previewUrl,
                    cover: song.artworkUrl100 || song.artworkUrl60 || "https://via.placeholder.com/100",
                    mood: moods[Math.floor(Math.random() * moods.length)]
                }))
                setSongs(formattedSongs)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setError("Failed to load songs")
            })
    }, [])

    // auth state listener
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser)
            setAuthLoading(false)
        })
        return () => unsub()
    }, [])

    // playlists
    const playlists = generatePlaylists(songs)

    // filtering songs
    const filteredSongs = songs.filter(song => {
        const moodMatch = mood === "all" || song.mood === mood
        const searchMatch =
            song.title.toLowerCase().includes(search.toLowerCase()) ||
            song.artist.toLowerCase().includes(search.toLowerCase())
        return moodMatch && searchMatch
    })

    // favorites from localStorage
    const favorites = JSON.parse(localStorage.getItem("favorites")) || []

    // liked songs from localStorage
    const likedSongs = JSON.parse(localStorage.getItem("likedSongs")) || []

    // next song
    const nextSong = () => {
        if (!currentSong) return
        if (shuffle) {
            const randomIndex = Math.floor(Math.random() * songs.length)
            setCurrentSong(songs[randomIndex])
            return
        }
        const index = songs.findIndex(song => song.id === currentSong.id)
        setCurrentSong(songs[(index + 1) % songs.length])
    }

    // previous song
    const prevSong = () => {
        if (!currentSong) return
        const index = songs.findIndex(song => song.id === currentSong.id)
        setCurrentSong(songs[(index - 1 + songs.length) % songs.length])
    }

    // auth loading
    if (authLoading) return <h2 className="text-white p-6">Loading...</h2>

    // not logged in
    if (!user) return <AuthPage onLogin={() => { }} />

    // songs loading
    if (loading) return <h2 className="text-white p-6">Loading songs...</h2>

    // error
    if (error) return <h2 className="text-red-500 p-6">{error}</h2>

    return (

        <div className="h-screen flex bg-gray-900 text-white">

            {/* Sidebar */}
            <div className="w-60 bg-black p-6 hidden md:flex flex-col">

                <h1 className="text-2xl font-bold mb-8">
                    Dramatunes 🎵
                </h1>

                {/* Navigation */}
                <button
                    className={`mb-3 p-2 rounded-lg text-left transition-all hover:bg-purple-700 ${view === "home" ? "bg-purple-600" : ""}`}
                    onClick={() => setView("home")}
                >
                    🏠 Home
                </button>

                <button
                    className={`mb-3 p-2 rounded-lg text-left transition-all hover:bg-purple-700 ${view === "search" ? "bg-purple-600" : ""}`}
                    onClick={() => setView("search")}
                >
                    🔍 Search
                </button>

                <button
                    className={`mb-6 p-2 rounded-lg text-left transition-all hover:bg-purple-700 ${view === "library" ? "bg-purple-600" : ""}`}
                    onClick={() => setView("library")}
                >
                    📚 Your Library
                </button>

                {/* Mood */}
                <MoodSelector setMood={setMood} />

                {/* Roast */}
                <button
                    className="mt-6 bg-purple-600 px-3 py-2 rounded-lg hover:bg-purple-700 transition-all"
                    onClick={async () => {
                        setRoastLoading(true)
                        const roast = await roastUser()
                        setRoastText(roast)
                        setShowRoastModal(true)
                        setRoastLoading(false)
                    }}
                >
                    {roastLoading ? "Cooking... 🔥" : "Roast My Taste 🔥"}
                </button>

                {/* Logout — pinned to bottom of sidebar */}
                <div className="mt-auto border-t border-gray-800 pt-4">
                    <p className="text-xs text-gray-500 truncate mb-2">
                        👤 {user.email}
                    </p>
                    <button
                        className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm py-2 px-3 rounded-lg transition-all text-left"
                        onClick={() => signOut(auth)}
                    >
                        🚪 Logout
                    </button>
                </div>

            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto pb-28 md:pb-6">

                {/* HOME */}
                {view === "home" && (
                    <>
                        <RecentlyPlayed setCurrentSong={setCurrentSong} />

                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Smart Playlists</h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.keys(playlists).map(mood => (
                                    <div
                                        key={mood}
                                        className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700"
                                        onClick={() => setMood(mood)}
                                    >
                                        <h3 className="capitalize font-semibold">{mood} Mix</h3>
                                        <p className="text-sm text-gray-400">{playlists[mood].length} songs</p>
                                    </div>
                                ))}
                            </div>

                            {/* Songs based on mood */}
                            <div className="p-6">
                                <h2 className="text-xl font-bold mb-4 capitalize">
                                    {mood === "all" ? "All Songs" : `${mood} Mix`}
                                </h2>
                                <Playlist
                                    songs={filteredSongs}
                                    setCurrentSong={setCurrentSong}
                                    setSelectedSong={setSelectedSong}
                                    setShowPlaylistPicker={setShowPlaylistPicker}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* SEARCH */}
                {view === "search" && (
                    <div className="p-6">
                        <input
                            type="text"
                            placeholder="Search songs..."
                            className="w-full p-3 rounded bg-gray-800 text-white"
                            value={search}
                            onChange={async (e) => {
                                const value = e.target.value
                                setSearch(value)

                                if (value.length === 0) {
                                    const data = await fetchSongs("bollywood")
                                    setSongs(data.map(song => ({
                                        id: song.trackId,
                                        title: song.trackName,
                                        artist: song.artistName,
                                        src: song.previewUrl,
                                        cover: song.artworkUrl100
                                            ? song.artworkUrl100.replace("100x100", "300x300")
                                            : "https://via.placeholder.com/300",
                                        mood: moods[Math.floor(Math.random() * moods.length)]
                                    })))
                                    return
                                }

                                if (value.length < 3) return

                                try {
                                    const data = await fetchSongs(value)
                                    if (!data || data.length === 0) return
                                    const formattedSongs = data.map(song => ({
                                        id: song.trackId,
                                        title: song.trackName,
                                        artist: song.artistName,
                                        src: song.previewUrl,
                                        cover: song.artworkUrl100,
                                        mood: moods[Math.floor(Math.random() * moods.length)]
                                    }))
                                    setSongs(formattedSongs)
                                } catch (err) {
                                    console.error("Search failed:", err)
                                }
                            }}
                        />

                        <div className="mt-6">
                            <Playlist
                                songs={filteredSongs}
                                setCurrentSong={setCurrentSong}
                                setSelectedSong={setSelectedSong}
                                setShowPlaylistPicker={setShowPlaylistPicker}
                            />
                        </div>
                    </div>
                )}

                {/* LIBRARY */}
                {view === "library" && (
                    <div className="p-6">
                        <button
                            className="mb-4 bg-purple-600 px-4 py-2 rounded hover:bg-purple-700"
                            onClick={() => setShowCreateModal(true)}
                        >
                            ➕ Create Playlist
                        </button>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {playlistsData.map((playlist, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700"
                                    onClick={() => {
                                        setSelectedPlaylistIndex(index)
                                        setView("playlist")
                                    }}
                                >
                                    <h3 className="font-semibold">{playlist.name}</h3>
                                    <p className="text-sm text-gray-400">{playlist.songs.length} songs</p>
                                </div>
                            ))}
                        </div>

                        <h2 className="text-xl font-bold mb-4">Your Library</h2>
                        <Playlist
                            songs={[...favorites, ...likedSongs]}
                            setCurrentSong={setCurrentSong}
                            setSelectedSong={setSelectedSong}
                            setShowPlaylistPicker={setShowPlaylistPicker}
                        />
                    </div>
                )}

                {/* PLAYLIST DETAIL */}
                {view === "playlist" && selectedPlaylistIndex !== null && (
                    <div className="p-6">
                        <button
                            className="mb-4 text-gray-400 hover:text-white"
                            onClick={() => setView("library")}
                        >
                            ← Back
                        </button>

                        <h2 className="text-2xl font-bold mb-4">
                            {playlistsData[selectedPlaylistIndex].name}
                        </h2>

                        {playlistsData[selectedPlaylistIndex].songs.length === 0 ? (
                            <p className="text-gray-400">No songs yet. Add some with the ➕ button!</p>
                        ) : (
                            <Playlist
                                songs={playlistsData[selectedPlaylistIndex].songs}
                                setCurrentSong={setCurrentSong}
                                setSelectedSong={setSelectedSong}
                                setShowPlaylistPicker={setShowPlaylistPicker}
                            />
                        )}
                    </div>
                )}

            </div>

            {/* Player */}
            <div className="fixed bottom-14 md:bottom-0 w-full bg-gray-800 p-4 z-40">
                <Player
                    song={currentSong}
                    nextSong={nextSong}
                    prevSong={prevSong}
                    repeat={repeat}
                />
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 w-full bg-black border-t border-gray-800 flex justify-around items-center md:hidden z-50 h-14">

                <button
                    className={`flex flex-col items-center text-xs transition-colors ${view === "home" ? "text-purple-400" : "text-gray-400"}`}
                    onClick={() => setView("home")}
                >
                    <span className="text-lg">🏠</span>
                    <span>Home</span>
                </button>

                <button
                    className={`flex flex-col items-center text-xs transition-colors ${view === "search" ? "text-purple-400" : "text-gray-400"}`}
                    onClick={() => setView("search")}
                >
                    <span className="text-lg">🔍</span>
                    <span>Search</span>
                </button>

                <button
                    className={`flex flex-col items-center text-xs transition-colors ${view === "library" || view === "playlist" ? "text-purple-400" : "text-gray-400"}`}
                    onClick={() => setView("library")}
                >
                    <span className="text-lg">📚</span>
                    <span>Library</span>
                </button>

                <button
                    className="flex flex-col items-center text-xs text-gray-400"
                    onClick={async () => {
                        setRoastLoading(true)
                        const roast = await roastUser()
                        setRoastText(roast)
                        setShowRoastModal(true)
                        setRoastLoading(false)
                    }}
                >
                    <span className="text-lg">{roastLoading ? "⏳" : "🔥"}</span>
                    <span>Roast</span>
                </button>

                <button
                    className="flex flex-col items-center text-xs text-red-400"
                    onClick={() => signOut(auth)}
                >
                    <span className="text-lg">🚪</span>
                    <span>Logout</span>
                </button>

            </div>

            {/* Roast Modal */}
            {showRoastModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-lg w-80 text-center">
                        <h2 className="text-xl font-bold mb-4">🔥 Your Music Roast</h2>
                        <p className="mb-4 text-gray-300">{roastText}</p>
                        <div className="flex justify-center gap-3">
                            <button
                                className="bg-purple-600 px-3 py-2 rounded"
                                onClick={() => navigator.clipboard.writeText(roastText)}
                            >
                                Copy
                            </button>
                            <button
                                className="bg-green-600 px-3 py-2 rounded"
                                onClick={() => navigator.share?.({ title: "My Music Roast", text: roastText })}
                            >
                                Share
                            </button>
                        </div>
                        <button
                            className="mt-4 text-gray-400"
                            onClick={() => setShowRoastModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Create Playlist Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-xl w-80">
                        <h2 className="text-lg font-bold mb-4">Create Playlist</h2>
                        <input
                            type="text"
                            placeholder="Playlist name"
                            className="w-full p-2 rounded bg-gray-800 mb-4 text-white outline-none focus:ring-2 focus:ring-purple-500"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && newPlaylistName) {
                                    const updated = [...playlistsData, { name: newPlaylistName, songs: [] }]
                                    setPlaylistsData(updated)
                                    localStorage.setItem("playlists", JSON.stringify(updated))
                                    setNewPlaylistName("")
                                    setShowCreateModal(false)
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                className="text-gray-400"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bg-purple-600 px-3 py-1 rounded"
                                onClick={() => {
                                    if (!newPlaylistName) return
                                    const updated = [...playlistsData, { name: newPlaylistName, songs: [] }]
                                    setPlaylistsData(updated)
                                    localStorage.setItem("playlists", JSON.stringify(updated))
                                    setNewPlaylistName("")
                                    setShowCreateModal(false)
                                }}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add to Playlist Picker Modal */}
            {showPlaylistPicker && selectedSong && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-xl w-80">
                        <h2 className="text-lg font-bold mb-4">Add to Playlist</h2>

                        {playlistsData.length === 0 ? (
                            <p className="text-gray-400 text-sm mb-4">
                                No playlists yet. Create one in Your Library!
                            </p>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {playlistsData.map((playlist, index) => (
                                    <div
                                        key={index}
                                        className="p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                                        onClick={() => {
                                            const updated = playlistsData.map((p, i) => {
                                                if (i !== index) return p
                                                if (p.songs.find(s => s.id === selectedSong.id)) return p
                                                return { ...p, songs: [...p.songs, selectedSong] }
                                            })
                                            setPlaylistsData(updated)
                                            localStorage.setItem("playlists", JSON.stringify(updated))
                                            setShowPlaylistPicker(false)
                                        }}
                                    >
                                        {playlist.name}
                                        <span className="text-xs text-gray-400 ml-2">
                                            {playlist.songs.length} songs
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            className="mt-4 text-gray-400"
                            onClick={() => setShowPlaylistPicker(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

        </div>
    )
}

export default App