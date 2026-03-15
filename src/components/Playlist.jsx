function Playlist({ songs, setCurrentSong }) {

return (

<div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6">

{songs.map(song => (

<div
key={song.id}
onClick={()=>{

// play song
setCurrentSong(song)

// recently played
let history = JSON.parse(localStorage.getItem("recentSongs")) || []

history.unshift(song)

history = history.slice(0,5)

localStorage.setItem("recentSongs",JSON.stringify(history))

}}
className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700 relative"
>

{/* Like Button */}

<button
className="absolute top-2 right-2 text-red-400"
onClick={(e)=>{

e.stopPropagation()

let fav = JSON.parse(localStorage.getItem("favorites")) || []

if(!fav.find(s => s.id === song.id)){
fav.push(song)
}

localStorage.setItem("favorites",JSON.stringify(fav))

}}
>
❤️
</button>

<img
src={song.cover}
className="rounded mb-3"
/>

<h4 className="font-semibold">{song.title}</h4>

<p className="text-gray-400 text-sm">
{song.artist}
</p>

</div>

))}

</div>

)

}

export default Playlist