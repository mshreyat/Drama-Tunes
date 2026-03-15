export function roastUser(){

const history = JSON.parse(localStorage.getItem("history"))

if(!history) return "Your music journey has just begun."

let totalPlays = 0

Object.values(history).forEach(song => {
totalPlays += song.plays
})

if(totalPlays > 20)
return "You listen to music more than you study."

if(totalPlays > 10)
return "You clearly need music to survive."

return "Your playlist is still warming up."

}