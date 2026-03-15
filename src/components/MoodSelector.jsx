function MoodSelector({ setMood }) {

return (

<div style={{margin:"20px"}}>

<button onClick={()=>setMood("all")}>All</button>
<button onClick={()=>setMood("happy")}>Happy</button>
<button onClick={()=>setMood("chill")}>Chill</button>
<button onClick={()=>setMood("workout")}>Workout</button>
<button onClick={()=>setMood("romantic")}>Romantic</button>

</div>

)

}

export default MoodSelector