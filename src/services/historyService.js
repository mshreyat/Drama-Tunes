// src/services/historyService.js
import { ref, get, set } from "firebase/database"
import { db, auth } from "../firebase"

export async function logSongPlay(song) {
  const user = auth.currentUser
  if (!user) return

  const songRef = ref(db, `users/${user.uid}/recentSongs/${song.id}`)

  const snapshot = await get(songRef)
  const current = snapshot.exists()
    ? snapshot.val()
    : { title: song.title, artist: song.artist, cover: song.cover, src: song.src, plays: 0 }

  await set(songRef, {
    ...current,
    plays: current.plays + 1,
    lastPlayed: Date.now()
  })
}

export async function getRecentSongs() {
  const user = auth.currentUser
  if (!user) return []

  const historyRef = ref(db, `users/${user.uid}/recentSongs`)
  const snapshot = await get(historyRef)

  if (!snapshot.exists()) return []

  const songs = Object.values(snapshot.val())
  return songs
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
    .slice(0, 10)
}