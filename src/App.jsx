import { useState, useEffect, useRef } from "react"
import { ref, set } from "firebase/database"
import { db, auth } from "./firebase"
import { getPlaylists, savePlaylists, getFavorites, getLikedSongs } from "./services/storageService"
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
import { saveSongOffline, getOfflineSong, isSongOffline } from "./offlineDB"

// ─── Safe localStorage helpers ───────────────────────────────────────────────
const ls = {
    get: (key, fallback = null) => {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
        catch { return fallback }
    },
    set: (key, val) => {
        try { localStorage.setItem(key, JSON.stringify(val)) } catch { }
    },
}

const CACHED_USER_KEY = "cached_user"

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {

    const [songs, setSongs] = useState([])
    const [showPlayer, setShowPlayer] = useState(true)
    const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState(null)
    const [currentSong, setCurrentSong] = useState(null)
    const [selectedSong, setSelectedSong] = useState(null)
    const [currentPlaylist, setCurrentPlaylist] = useState(null)
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
    const [playlistsData, setPlaylistsData] = useState([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [roastLoading, setRoastLoading] = useState(false)
    const [newPlaylistName, setNewPlaylistName] = useState("")
    const [showPlaylistPicker, setShowPlaylistPicker] = useState(false)
    const [user, setUser] = useState(null)
    const [toast, setToast] = useState(null)
    const [authLoading, setAuthLoading] = useState(true)
    const [showSongPicker, setShowSongPicker] = useState(false)
    const [songPickerSearch, setSongPickerSearch] = useState("")
    const [favorites, setFavorites] = useState([])
    const [likedSongs, setLikedSongs] = useState([])
    const [isOffline, setIsOffline] = useState(!navigator.onLine)

    const authTimeoutRef = useRef(null)
    const moods = ["happy", "chill", "workout", "romantic"]

    // ── Online / offline detection ───────────────────────────────────────────
    useEffect(() => {
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)
        window.addEventListener("online", handleOnline)
        window.addEventListener("offline", handleOffline)
        return () => {
            window.removeEventListener("online", handleOnline)
            window.removeEventListener("offline", handleOffline)
        }
    }, [])

    // ── Toast helper ─────────────────────────────────────────────────────────
    const showToast = (message) => {
        setToast(message)
        setTimeout(() => setToast(null), 3000)
    }

    // ── Save playlists — silent offline failure ──────────────────────────────
    const savePlaylistsEverywhere = (updated) => {
        setPlaylistsData(updated)
        ls.set("playlists", updated)
        savePlaylists(updated).catch(() => { }) // don't crash offline
    }

    const playSong = async (song, playlist = null) => {
        try {
            // OFFLINE MODE
            if (!navigator.onLine) {
                const offlineBlob = await getOfflineSong(song.id)

                if (offlineBlob) {
                    const blobUrl = URL.createObjectURL(offlineBlob)
                    setCurrentSong({
                        ...song,
                        src: blobUrl,
                        isOffline: true
                    })
                } else {
                    showToast("⚠️ Song not downloaded for offline use")
                    return
                }
            } else {
                setCurrentSong(song)
            }

            setCurrentPlaylist(playlist)
        } catch (err) {
            showToast("Playback error")
        }
    }

    // ── Song formatting helper ───────────────────────────────────────────────
    const formatSongs = (data) =>
        data.map(song => ({
            id: song.trackId,
            title: song.trackName,
            artist: song.artistName,
            src: song.previewUrl,
            cover: song.artworkUrl100?.replace("100x100bb", "600x600bb") || "https://via.placeholder.com/600",
            mood: moods[Math.floor(Math.random() * moods.length)]
        }))

    // ── Songs — network first, cache fallback ────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchSongs()
                const formatted = formatSongs(data)
                setSongs(formatted)
                ls.set("songs_cache", formatted)
                ls.set("offline_songs_index", formatted)
                setError(null)
            } catch (err) {
                console.warn("Fetch failed — using cached songs")
                const cached = ls.get("songs_cache", [])
                const offline = ls.get("offline_songs", [])

                if (offline.length > 0) {
                    setSongs(offline)
                } else if (cached.length > 0) {
                    setSongs(cached)
                    setError(null)
                } else {
                    setError("No internet and no cached songs. Connect once to load songs.")
                }
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // ── Auth — cache-first with 5s Firebase timeout ──────────────────────────
    useEffect(() => {
        // Restore cached user immediately so UI never hangs offline
        const cachedUser = ls.get(CACHED_USER_KEY)
        if (cachedUser) {
            setUser(cachedUser)
            setAuthLoading(false)
        }

        // Give Firebase 5s to respond; if it doesn't, stay with cached user
        authTimeoutRef.current = setTimeout(() => {
            setAuthLoading(false)
        }, 5000)

        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            clearTimeout(authTimeoutRef.current)

            if (firebaseUser) {
                const minimal = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName
                }
                ls.set(CACHED_USER_KEY, minimal)
                setUser(minimal)
            } else {
                // Only clear if online — offline null = no network, not signed out
                if (navigator.onLine) {
                    ls.set(CACHED_USER_KEY, null)
                    setUser(null)
                }
            }

            setAuthLoading(false)
        })

        return () => {
            clearTimeout(authTimeoutRef.current)
            unsub()
        }
    }, [])

    // ── User data — localStorage first, Firebase syncs in background ─────────
    useEffect(() => {
        if (!user) return

        // Instant render from localStorage
        setPlaylistsData(ls.get("playlists", []))
        setFavorites(ls.get("favorites", []))
        setLikedSongs(ls.get("likedSongs", []))

        // Try Firebase in background — silently fails offline
        const syncFromFirebase = async () => {
            try {
                const [p, f, l] = await Promise.all([
                    getPlaylists(),
                    getFavorites(),
                    getLikedSongs(),
                ])
                if (p?.length) { setPlaylistsData(p); ls.set("playlists", p) }
                if (f?.length) { setFavorites(f); ls.set("favorites", f) }
                if (l?.length) { setLikedSongs(l); ls.set("likedSongs", l) }
            } catch {
                // Already loaded from localStorage above — no action needed
            }
        }

        syncFromFirebase()
    }, [user])

    // ── Playlist engine ──────────────────────────────────────────────────────
    const playlists = generatePlaylists(songs)

    // ── FIX: filteredSongs filters from all songs by mood + search ───────────
    const filteredSongs = songs.filter(song => {
        const moodMatch = mood === "all" || song.mood === mood
        const searchMatch =
            song.title.toLowerCase().includes(search.toLowerCase()) ||
            song.artist.toLowerCase().includes(search.toLowerCase())
        return moodMatch && searchMatch
    })

    const favSongs = [...favorites, ...likedSongs]

    // ── Player controls ──────────────────────────────────────────────────────
    const nextSong = () => {
        if (!currentSong) return
        const songList = currentPlaylist || songs
        if (shuffle) {
            setCurrentSong(songList[Math.floor(Math.random() * songList.length)])
            return
        }
        const index = songList.findIndex(song => song.id === currentSong.id)
        setCurrentSong(songList[(index + 1) % songList.length])
    }

    const prevSong = () => {
        if (!currentSong) return
        const songList = currentPlaylist || songs
        const index = songList.findIndex(song => song.id === currentSong.id)
        setCurrentSong(songList[(index - 1 + songList.length) % songList.length])
    }

    // ── Roast — offline guard ────────────────────────────────────────────────
    const handleRoast = async () => {
        if (isOffline) {
            setRoastText("You're so offline even your music taste can't connect. 🔥")
            setShowRoastModal(true)
            return
        }
        setRoastLoading(true)
        try {
            const roast = await roastUser()
            setRoastText(roast)
            setShowRoastModal(true)
        } catch {
            setRoastText("Roast engine is down. But your taste still is too. 🔥")
            setShowRoastModal(true)
        } finally {
            setRoastLoading(false)
        }
    }

    // ── Logout — works offline too ───────────────────────────────────────────
    const handleLogout = async () => {
        try {
            await signOut(auth)
        } catch {
            // Firebase signOut throws offline — clear locally anyway
        }
        ls.set(CACHED_USER_KEY, null)
        setUser(null)
    }

    const downloadSong = async (song) => {
        try {
            const res = await fetch(song.src)
            const blob = await res.blob()

            await saveSongOffline(song.id, blob)

            // store metadata for offline library rebuild
            const offlineLibrary = ls.get("offline_songs", [])
            const exists = offlineLibrary.some(s => s.id === song.id)

            if (!exists) {
                ls.set("offline_songs", [...offlineLibrary, song])
            }

            showToast("⬇️ Available offline now!")
        } catch (err) {
            showToast("Download failed")
        }
    }

    // ── Search with offline fallback ─────────────────────────────────────────
    const handleSearch = async (value) => {
        setSearch(value)

        if (isOffline) {
            // Just filter cached songs locally — no network call
            return
        }

        if (value.length === 0) {
            try {
                const data = await fetchSongs("bollywood")
                const formatted = formatSongs(data)
                setSongs(formatted)
                ls.set("songs_cache", formatted)
            } catch {
                // stay with existing cached songs
            }
            return
        }

        if (value.length < 3) return

        try {
            const data = await fetchSongs(value)
            if (!data || data.length === 0) return
            const formatted = formatSongs(data)
            setSongs(formatted)
            ls.set("songs_cache", formatted)
        } catch {
            console.warn("Search failed (offline?) — filtering local cache")
            // filteredSongs already handles local filtering via the search state
        }
    }

    // ── Loading / auth gates ─────────────────────────────────────────────────
    if (authLoading) return <h2 className="text-white p-6">Loading...</h2>
    if (!user) return <AuthPage onLogin={() => { }} />
    if (loading) return <h2 className="text-white p-6">Loading songs...</h2>
    if (error) return <h2 className="text-red-500 p-6">{error}</h2>

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="h-screen flex bg-gray-900 text-white">

            {/* Offline banner */}
            {isOffline && (
                <div className="fixed top-0 left-0 right-0 z-[200] bg-yellow-500 text-black text-center text-xs py-1 font-semibold">
                    ⚡ You're offline — playing from cache
                </div>
            )}

            {/* Sidebar */}
            <div
                className="w-60 bg-black p-6 hidden md:flex flex-col"
                style={{ paddingTop: isOffline ? "2rem" : undefined }}
            >
                <h1 className="text-2xl font-bold mb-8">Dramatunes 🎵</h1>

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

                <MoodSelector setMood={setMood} />

                <button
                    className="mt-6 bg-purple-600 px-3 py-2 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                    onClick={handleRoast}
                    disabled={roastLoading}
                >
                    {roastLoading ? "Cooking... 🔥" : "Roast My Taste 🔥"}
                </button>
            </div>

            {/* Main Content */}
            <div
                className="flex-1 overflow-y-auto pb-28 md:pb-6 relative"
                style={{ paddingTop: isOffline ? "1.75rem" : undefined }}
            >
                {/* Top-right logout */}
                <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
                    <span className="text-sm text-white hidden sm:block truncate max-w-[180px] font-medium">
                        👤 {user.email}
                    </span>
                    <button
                        className="bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm py-1.5 px-3 rounded-lg transition-all"
                        onClick={handleLogout}
                    >
                        🚪 Logout
                    </button>
                </div>

                {/* HOME */}
                {view === "home" && (
                    <>
                        <RecentlyPlayed setCurrentSong={(song) => playSong(song, null)} />

                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">Smart Playlists</h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.keys(playlists).map(moodKey => (
                                    <div
                                        key={moodKey}
                                        className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700"
                                        onClick={() => {
                                            setMood(moodKey)
                                            setCurrentPlaylist(playlists[moodKey])
                                        }}
                                    >
                                        <h3 className="capitalize font-semibold">{moodKey} Mix</h3>
                                        <p className="text-sm text-gray-400">{playlists[moodKey].length} songs</p>
                                    </div>
                                ))}
                            </div>

                            {/* ✅ FIX: was using favSongs, now correctly uses filteredSongs */}
                            <div className="mt-6">
                                <h2 className="text-xl font-bold mb-4 capitalize">
                                    {mood === "all" ? "All Songs" : `${mood} Mix`}
                                </h2>
                                <div className="max-h-[400px] overflow-y-auto pr-2">
                                    <Playlist
                                        songs={filteredSongs}
                                        setCurrentSong={(song) => playSong(song, filteredSongs)}
                                        setSelectedSong={setSelectedSong}
                                        setShowPlaylistPicker={setShowPlaylistPicker}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* SEARCH */}
                {view === "search" && (
                    <div className="p-6 pt-14">
                        <input
                            type="text"
                            placeholder={isOffline ? "Search cached songs..." : "Search songs..."}
                            className="w-full max-w-[70%] p-3 rounded bg-gray-800 text-white"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                        />

                        {isOffline && (
                            <p className="text-xs text-yellow-400 mt-2">
                                ⚡ Offline — searching cached songs only
                            </p>
                        )}

                        <div className="mt-6">
                            <Playlist
                                songs={filteredSongs}
                                setCurrentSong={(song) => playSong(song, null)}
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

                        <h2 className="text-xl font-bold mb-4">Your Favourites</h2>
                        <Playlist
                            songs={favSongs}
                            setCurrentSong={(song) => playSong(song, favSongs)}
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

                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold">
                                {playlistsData[selectedPlaylistIndex].name}
                            </h2>
                            <div className="flex gap-2">
                                {playlistsData[selectedPlaylistIndex].songs.length > 0 && (
                                    <button
                                        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                        onClick={() => {
                                            const playlistSongs = playlistsData[selectedPlaylistIndex].songs
                                            playSong(playlistSongs[0], playlistSongs)
                                        }}
                                    >
                                        ▶ Play All
                                    </button>
                                )}
                                <button
                                    className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                                    onClick={() => setShowSongPicker(true)}
                                >
                                    ➕ Add Songs
                                </button>
                            </div>
                        </div>

                        {playlistsData[selectedPlaylistIndex].songs.length === 0 ? (
                            <p className="text-gray-400">No songs yet. Add some with the ➕ button!</p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {playlistsData[selectedPlaylistIndex].songs.map((song, songIndex) => (
                                    <div
                                        key={song.id}
                                        className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-700 transition-all cursor-pointer group"
                                    >
                                        <div
                                            className="relative"
                                            onClick={() => playSong(song, playlistsData[selectedPlaylistIndex].songs)}
                                        >
                                            <img
                                                src={song.cover || "https://via.placeholder.com/300"}
                                                alt={song.title}
                                                className="w-full aspect-square object-cover"
                                                onError={(e) => { e.target.src = "https://via.placeholder.com/300" }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-4xl">▶️</span>
                                            </div>
                                        </div>
                                        <div className="p-3 flex justify-between items-center">
                                            <div
                                                className="overflow-hidden cursor-pointer"
                                                onClick={() => playSong(song, playlistsData[selectedPlaylistIndex].songs)}
                                            >
                                                <h3 className="font-semibold text-sm truncate">{song.title}</h3>
                                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                                            </div>
                                            <button
                                                className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-lg ml-2 shrink-0"
                                                onClick={() => {
                                                    const updated = playlistsData.map((p, i) => {
                                                        if (i !== selectedPlaylistIndex) return p
                                                        return {
                                                            ...p,
                                                            songs: p.songs.filter((_, si) => si !== songIndex)
                                                        }
                                                    })
                                                    savePlaylistsEverywhere(updated)
                                                    showToast("🗑 Song removed from playlist")
                                                }}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                    onClick={handleRoast}
                    disabled={roastLoading}
                >
                    <span className="text-lg">{roastLoading ? "⏳" : "🔥"}</span>
                    <span>Roast</span>
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
                                    savePlaylistsEverywhere(updated)
                                    setNewPlaylistName("")
                                    setShowCreateModal(false)
                                    showToast("🎵 Playlist created!")
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button className="text-gray-400" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="bg-purple-600 px-3 py-1 rounded"
                                onClick={() => {
                                    if (!newPlaylistName) return
                                    const updated = [...playlistsData, { name: newPlaylistName, songs: [] }]
                                    savePlaylistsEverywhere(updated)
                                    setNewPlaylistName("")
                                    setShowCreateModal(false)
                                    showToast("🎵 Playlist created!")
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
                                            savePlaylistsEverywhere(updated)
                                            setShowPlaylistPicker(false)
                                            showToast(`➕ Added to ${playlist.name}!`)
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

                        <button className="mt-4 text-gray-400" onClick={() => setShowPlaylistPicker(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Song Picker Modal */}
            {showSongPicker && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-xl w-96 max-h-[80vh] flex flex-col">
                        <h2 className="text-lg font-bold mb-4">Add Songs</h2>

                        <input
                            type="text"
                            placeholder="Search songs..."
                            className="w-full p-2 rounded bg-gray-800 mb-4 text-white outline-none focus:ring-2 focus:ring-purple-500"
                            value={songPickerSearch}
                            onChange={(e) => setSongPickerSearch(e.target.value)}
                        />

                        <div className="overflow-y-auto space-y-2 flex-1">
                            {songs
                                .filter(s =>
                                    s.title.toLowerCase().includes(songPickerSearch.toLowerCase()) ||
                                    s.artist.toLowerCase().includes(songPickerSearch.toLowerCase())
                                )
                                .map(song => {
                                    const alreadyAdded = playlistsData[selectedPlaylistIndex]?.songs.find(s => s.id === song.id)
                                    return (
                                        <div
                                            key={song.id}
                                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-all ${alreadyAdded ? "bg-gray-800 opacity-50" : "bg-gray-800 hover:bg-gray-700"}`}
                                            onClick={() => {
                                                if (alreadyAdded) return
                                                const updated = playlistsData.map((p, i) => {
                                                    if (i !== selectedPlaylistIndex) return p
                                                    return { ...p, songs: [...p.songs, song] }
                                                })
                                                savePlaylistsEverywhere(updated)
                                                showToast(`➕ Added to ${playlistsData[selectedPlaylistIndex].name}!`)
                                            }}
                                        >
                                            <img src={song.cover} alt={song.title} className="w-10 h-10 rounded object-cover" />
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm font-medium truncate">{song.title}</p>
                                                <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                                            </div>
                                            {alreadyAdded
                                                ? <span className="text-xs text-gray-500 shrink-0">Added</span>
                                                : <span className="text-green-400 shrink-0">➕</span>
                                            }
                                        </div>
                                    )
                                })
                            }
                        </div>

                        <button
                            className="mt-4 text-gray-400"
                            onClick={() => { setShowSongPicker(false); setSongPickerSearch("") }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-5 py-3 rounded-xl z-[100] text-sm font-medium">
                    {toast}
                </div>
            )}

        </div>
    )
}

export default App