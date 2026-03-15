export function generatePlaylists(songs){

const playlists = {
 workout: [],
 chill: [],
 happy: [],
 romantic: []
}

songs.forEach(song => {

 if(playlists[song.mood]){
   playlists[song.mood].push(song)
 }

})

return playlists

}