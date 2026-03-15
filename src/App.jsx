import { useState, useEffect } from "react"

import MoodSelector from "./components/MoodSelector"
import Playlist from "./components/Playlist"
import Player from "./components/Player"
import RecentlyPlayed from "./components/RecentlyPlayed"
import Favorites from "./components/Favorites"

import { generatePlaylists } from "./utils/playlistEngine"
import { roastUser } from "./utils/roastEngine"
import { fetchSongs } from "./services/musicService"

function App(){

const [songs,setSongs] = useState([])
const [currentSong,setCurrentSong] = useState(null)
const [mood,setMood] = useState("all")
const [search,setSearch] = useState("")
const [view,setView] = useState("songs")
const [shuffle,setShuffle] = useState(false)
const [repeat,setRepeat] = useState(false)

const [loading,setLoading] = useState(true)
const [error,setError] = useState(null)

const moods = ["happy","chill","workout","romantic"]

// fetch songs
useEffect(()=>{

fetchSongs()

.then(data => {

const formattedSongs = data.map(song => ({
id: song.id,
title: song.name,
artist: song.artist_name,
src: song.audio,
cover: song.album_image,
mood: moods[Math.floor(Math.random()*moods.length)]
}))

setSongs(formattedSongs)
setLoading(false)

})

.catch(err => {

setError("Failed to load songs")
setLoading(false)

})

},[])


// playlists
const playlists = generatePlaylists(songs)


// filtering songs
const filteredSongs = songs.filter(song => {

const moodMatch =
mood === "all" || song.mood === mood

const searchMatch =
song.title.toLowerCase().includes(search.toLowerCase()) ||
song.artist.toLowerCase().includes(search.toLowerCase())

return moodMatch && searchMatch

})


// favorites from localStorage
const favorites =
JSON.parse(localStorage.getItem("favorites")) || []

// liked songs from localStorage
const likedSongs =
JSON.parse(localStorage.getItem("likedSongs")) || []


// determine which songs to show
const displaySongs =
view === "songs"
? filteredSongs
: view === "favorites"
? favorites
: likedSongs


// next song
const nextSong = () => {

if(!currentSong) return

// shuffle mode
if(shuffle){
const randomIndex = Math.floor(Math.random()*songs.length)
setCurrentSong(songs[randomIndex])
return
}

const index = songs.findIndex(song => song.id === currentSong.id)

setCurrentSong(songs[(index + 1) % songs.length])

}


// previous song
const prevSong = () => {

if(!currentSong) return

const index = songs.findIndex(song => song.id === currentSong.id)

setCurrentSong(songs[(index - 1 + songs.length) % songs.length])

}


// loading
if(loading){
return <h2 className="text-white p-6">Loading songs...</h2>
}

// error
if(error){
return <h2 className="text-red-500 p-6">{error}</h2>
}


return(

<div className="h-screen flex bg-gray-900 text-white">


{/* Sidebar */}

<div className="w-60 bg-black p-6">

<h1 className="text-2xl font-bold mb-8">
Dramatunes 🎵
</h1>

<button
className="block mb-3 hover:text-purple-400"
onClick={()=>setView("songs")}
>
🎵 All Songs
</button>

<button
className="block mb-3 hover:text-purple-400"
onClick={()=>setView("favorites")}
>
❤️ Favorites
</button>

<button
className="block mb-6 hover:text-purple-400"
onClick={()=>setView("liked")}
>
👍 Liked Songs
</button>

<MoodSelector setMood={setMood}/>

<button
className="mt-6 bg-purple-600 px-3 py-2 rounded hover:bg-purple-700"
onClick={()=>alert(roastUser())}
>
Roast My Taste 🔥
</button>

</div>


{/* Main Content */}

<div className="flex-1 overflow-y-auto">

<RecentlyPlayed/>

{/* Search */}

<div className="p-6">

<input
type="text"
placeholder="Search songs..."
className="w-full p-3 rounded bg-gray-800 text-white"
value={search}
onChange={(e)=>setSearch(e.target.value)}
/>

</div>


{/* Smart Playlists */}

<div className="p-6">

<h2 className="text-xl font-bold mb-4">
Smart Playlists
</h2>

<div className="grid grid-cols-2 md:grid-cols-4 gap-4">

{Object.keys(playlists).map(mood => (

<div
key={mood}
className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700"
onClick={()=>setMood(mood)}
>

<h3 className="capitalize font-semibold">
{mood} Mix
</h3>

<p className="text-sm text-gray-400">
{playlists[mood].length} songs
</p>

</div>

))}

</div>

</div>


{/* Playlist */}

<Playlist
songs={displaySongs}
setCurrentSong={setCurrentSong}
/>

</div>


{/* Player */}

<div className="fixed bottom-0 w-full bg-gray-800 p-4">

<Player
song={currentSong}
nextSong={nextSong}
prevSong={prevSong}
repeat={repeat}
/>

</div>

</div>

)

}

export default App