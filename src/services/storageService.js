import { ref, get, set } from "firebase/database"
import { db, auth } from "../firebase"

// ---- FAVORITES ----
export async function getFavorites() {
    const user = auth.currentUser
    if (!user) return []
    const snapshot = await get(ref(db, `users/${user.uid}/favorites`))
    return snapshot.exists() ? Object.values(snapshot.val()) : []
}

export async function saveFavorites(songs) {
    const user = auth.currentUser
    if (!user) return
    const data = {}
    songs.forEach(s => { data[s.id] = s })
    await set(ref(db, `users/${user.uid}/favorites`), data)
}

// ---- LIKED SONGS ----
export async function getLikedSongs() {
    const user = auth.currentUser
    if (!user) return []
    const snapshot = await get(ref(db, `users/${user.uid}/likedSongs`))
    return snapshot.exists() ? Object.values(snapshot.val()) : []
}

export async function saveLikedSongs(songs) {
    const user = auth.currentUser
    if (!user) return
    const data = {}
    songs.forEach(s => { data[s.id] = s })
    await set(ref(db, `users/${user.uid}/likedSongs`), data)
}

// ---- PLAYLISTS ----
export async function savePlaylists(playlists) {
    const user = auth.currentUser
    if (!user) {
        console.log("❌ savePlaylists: no user")
        return
    }
    console.log("✅ savePlaylists: saving", playlists)
    await set(ref(db, `users/${user.uid}/playlists`), playlists)
}

export async function getPlaylists() {
    const user = auth.currentUser
    if (!user) {
        console.log("❌ getPlaylists: no user")
        return []
    }
    const snapshot = await get(ref(db, `users/${user.uid}/playlists`))
    console.log("✅ getPlaylists: got", snapshot.val())
    if (!snapshot.exists()) return []

    const data = snapshot.val()
    const playlists = Array.isArray(data) ? data : Object.values(data)

    // also fix inner songs arrays
    return playlists.map(p => ({
        ...p,
        songs: p.songs
            ? Array.isArray(p.songs) ? p.songs : Object.values(p.songs)
            : []
    }))
}