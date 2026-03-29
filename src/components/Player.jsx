// src/components/Player.jsx
import AudioPlayer from "react-h5-audio-player"
import "react-h5-audio-player/lib/styles.css"
import { logSongPlay } from "../services/historyService"

function Player({ song, nextSong, prevSong, repeat }) {

    if (!song) return (
        <div className="text-gray-500 text-sm text-center">
            Select a song to start playing 🎵
        </div>
    )

    return (
        <div className="flex items-center gap-4">

            <img
                src={song.cover || "https://via.placeholder.com/56"}
                alt={song.title}
                className="w-14 h-14 rounded object-cover shrink-0"
                onError={(e) => { e.target.src = "https://via.placeholder.com/56" }}
            />

            <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{song.title}</p>
                <p className="text-sm text-gray-400 truncate">{song.artist}</p>

                <AudioPlayer
                    src={song.src}
                    autoPlay
                    showSkipControls
                    showJumpControls={false}
                    loop={repeat}
                    onClickNext={nextSong}
                    onClickPrevious={prevSong}
                    onEnded={nextSong}
                    onPlay={() => logSongPlay(song)} // 👈 logs to Firebase when song plays
                />
            </div>

        </div>
    )
}

export default Player