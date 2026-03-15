const CLIENT_ID = "08313fde"

export async function fetchSongs(){

const response = await fetch(
`https://api.jamendo.com/v3.0/tracks/?client_id=${"08313fde"}&limit=20`
)

const data = await response.json()

return data.results

}