import AudioPlayer from "react-h5-audio-player"
import "react-h5-audio-player/lib/styles.css"

function Player({ song, nextSong, prevSong }) {

if(!song) return null

return(

<div className="flex items-center gap-4">

<img src={song.cover} className="w-14 h-14 rounded"/>

<div className="flex-1">

<p>{song.title}</p>
<p className="text-sm text-gray-400">{song.artist}</p>

<AudioPlayer
src={song.src}
autoPlay
showSkipControls
showJumpControls={false}
onClickNext={nextSong}
onClickPrevious={prevSong}
/>

</div>

</div>

)

}

export default Player