import { useEffect, useState } from "react"

function Favorites(){

const [favorites,setFavorites] = useState([])

useEffect(()=>{

const stored = JSON.parse(localStorage.getItem("favorites")) || []

setFavorites(stored)

},[])

if(favorites.length === 0) return null

return(

<div className="p-6">

<h2 className="text-xl font-bold mb-4">
❤️ Favorites
</h2>

<div className="grid grid-cols-2 md:grid-cols-5 gap-4">

{favorites.map(song => (

<div
key={song.id}
className="bg-gray-800 p-3 rounded"
>

<img src={song.cover} className="rounded mb-2"/>

<p className="text-sm">{song.title}</p>

</div>

))}

</div>

</div>

)

}

export default Favorites