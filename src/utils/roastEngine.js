// src/utils/roastEngine.js

import { auth, db } from "../firebase";
import { ref, get } from "firebase/database";

export async function roastUser() {
  let favorites = [];
  let recentSongs = [];
  let playlists = [];

  try {
    const user = auth.currentUser;

    if (user) {
      // ✅ Fetch from Firebase
      const snapshot = await get(ref(db, `users/${user.uid}`));

      if (snapshot.exists()) {
        const data = snapshot.val();

        favorites = Object.values(data.favorites || {});
        recentSongs = Object.values(data.recentSongs || {});
        playlists = Object.values(data.playlists || {});
      }
    }
  } catch (err) {
    console.warn("Firebase fetch failed, using localStorage");
  }

  // ⚡ Fallback to localStorage if Firebase empty
  if (favorites.length === 0 && recentSongs.length === 0) {
    favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    recentSongs = JSON.parse(localStorage.getItem("recentSongs")) || [];
    playlists = JSON.parse(localStorage.getItem("playlists")) || [];
  }

  // 🧠 Normalize data (avoid undefined errors)
  const favoriteArtists = [
    ...new Set(favorites.map((s) => s.artist || "Unknown")),
  ];
  const recentArtists = [
    ...new Set(recentSongs.map((s) => s.artist || "Unknown")),
  ];
  const favoriteTitles = favorites.map((s) => s.title || "Unknown").slice(0, 5);
  const recentTitles = recentSongs.map((s) => s.title || "Unknown").slice(0, 5);
  const playlistNames = playlists.map((p) => p.name || "Untitled");

  const hasEnoughData = favorites.length > 0 || recentSongs.length > 0;

  // ❌ No data fallback
  if (!hasEnoughData) {
    return "You haven't listened to anything yet. Even silence has more personality than your current music history. 💀";
  }

  // 🧠 Build prompt
  const prompt = `
You are a savage but funny music roast comedian. 
Roast this user's music taste based on their listening data. 
Be creative, funny, and personal — reference their actual songs/artists. 
Keep it to 2-3 sentences max. Be clever, not mean-spirited.

User's music data:
- Favorite songs: ${favoriteTitles.join(", ")}
- Favorite artists: ${favoriteArtists.join(", ")}
- Recently played songs: ${recentTitles.join(", ")}
- Recently played artists: ${recentArtists.join(", ")}
- Playlist names: ${playlistNames.join(", ")}
- Total favorites: ${favorites.length}
- Total recent plays: ${recentSongs.length}

Write one roast only.
  `.trim();

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const roastText = data?.content?.[0]?.text?.trim();

    if (!roastText) throw new Error("Empty response");

    return roastText;
  } catch (err) {
    console.error("Roast AI failed:", err);

    // 🔥 Smart fallback roasts
    const fallbacks = [
      `${favoriteArtists[0] ? `A ${favoriteArtists[0]} fan?` : "No favorites?"} Bold of you to call that a personality.`,
      `You've played ${recentSongs.length} songs and still haven't found good taste.`,
      `${favoriteTitles[0] ? `"${favoriteTitles[0]}" again?` : "That top song?"} Even your shuffle is tired of you.`,
      "Your playlist feels like it was made during an identity crisis.",
      "Even autoplay is confused by your choices.",
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}
