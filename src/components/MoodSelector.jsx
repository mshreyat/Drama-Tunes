function MoodSelector({ setMood }) {

return (

<div style={{margin:"20px"}}>

<button onClick={()=>setMood("all")}></button>
<button onClick={()=>setMood("happy")}></button>
<button onClick={()=>setMood("chill")}></button>
<button onClick={()=>setMood("workout")}></button>
<button onClick={()=>setMood("romantic")}></button>

</div>

)

}

export default MoodSelector