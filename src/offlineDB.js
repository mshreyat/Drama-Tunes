import { openDB } from "idb"

const DB_NAME = "music-db"
const STORE = "songs"

export const dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE)
        }
    },
})

// Save song audio
export async function saveSongOffline(songId, blob) {
    const db = await dbPromise
    await db.put(STORE, blob, songId)
}

// Get offline song
export async function getOfflineSong(songId) {
    const db = await dbPromise
    return await db.get(STORE, songId)
}

// Check if downloaded
export async function isSongOffline(songId) {
    const db = await dbPromise
    const res = await db.get(STORE, songId)
    return !!res
}