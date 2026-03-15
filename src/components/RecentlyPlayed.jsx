import { useEffect, useState } from "react"

function RecentlyPlayed(){

const [recent,setRecent] = useState([])

useEffect(()=>{

const stored = JSON.parse(localStorage.getItem("recentSongs")) || []

setRecent(stored)

},[])

if(recent.length === 0) return null

return(

<div className="p-6">

<h2 className="text-xl font-bold mb-4">
Recently Played
</h2>

<div className="grid grid-cols-2 md:grid-cols-5 gap-4">

{recent.map((song,index)=>(

<div
key={index}
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

export default RecentlyPlayed