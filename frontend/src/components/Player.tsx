import React, { useRef, useEffect } from 'react';

interface PlayerProps {
    audioUrl: string | null;
    onTimeUpdate: (time: number) => void;
    onDurationChange: (duration: number) => void;
    isPlaying: boolean;
    onPlayStateChange: (playing: boolean) => void;
    noteLabelMode: 'none' | 'name' | 'fret';
    onToggleNoteLabelMode: () => void;
}

const Player: React.FC<PlayerProps> = ({
    audioUrl,
    onTimeUpdate,
    onDurationChange,
    isPlaying,
    onPlayStateChange,
    noteLabelMode,
    onToggleNoteLabelMode
}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const requestRef = useRef<number | null>(null);

    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
        }
    }, [audioUrl]);

    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play();
            startTimer();
        } else {
            audioRef.current?.pause();
            stopTimer();
        }
    }, [isPlaying]);

    const startTimer = () => {
        const update = () => {
            if (audioRef.current) {
                onTimeUpdate(audioRef.current.currentTime);
            }
            requestRef.current = requestAnimationFrame(update);
        };
        requestRef.current = requestAnimationFrame(update);
    };

    const stopTimer = () => {
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };

    const getLabelText = () => {
        if (noteLabelMode === 'name') return 'Pitch Names';
        return 'Fret Numbers';
    };

    const [playbackRate, setPlaybackRate] = React.useState(1.0);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
            // Preserves pitch is default true in most browsers, but good to know it's there implicitly.
        }
    }, [playbackRate]);

    return (
        <div className="w-full bg-gray-900 p-4 rounded-b-lg border-t border-gray-700">
            <audio
                ref={audioRef}
                onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
                onEnded={() => onPlayStateChange(false)}
                controls={false}
            />

            <div className="flex flex-col gap-4">
                {/* Main Controls */}
                <div className="flex items-center gap-4 justify-center">
                    {/* Play/Pause: Red Illuminated Rocker Switch */}
                    <button
                        onClick={() => onPlayStateChange(!isPlaying)}
                        className={`px-6 py-2 rounded-md font-bold text-white uppercase tracking-widest border-b-4 border-red-900 transition-all active:border-b-0 active:translate-y-1 ${isPlaying
                                ? 'bg-red-600 shadow-[0_0_15px_#ef4444] border-red-800'
                                : 'bg-red-900 opacity-60 hover:opacity-100'
                            }`}
                        style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
                    >
                        {isPlaying ? 'PAUSE' : 'PLAY'}
                    </button>

                    {/* Label Toggle: Gold Metal Switch */}
                    <button
                        onClick={onToggleNoteLabelMode}
                        className={`px-4 py-2 rounded-sm font-black text-black text-sm uppercase transition-all bg-gradient-to-b from-[#eebb00] to-[#b8860b] border-2 border-[#664400] shadow-md hover:brightness-110 active:scale-95`}
                    >
                        {getLabelText()}
                    </button>

                    {/* Speed Controls: Gold Buttons in Black Box */}
                    <div className="flex items-center gap-1 bg-black rounded-sm p-1 border border-gray-700">
                        {[0.5, 0.75, 1.0].map(rate => (
                            <button
                                key={rate}
                                onClick={() => setPlaybackRate(rate)}
                                className={`px-3 py-1 rounded-sm text-xs font-black transition-all ${playbackRate === rate
                                        ? 'bg-gradient-to-b from-[#eebb00] to-[#b8860b] text-black border border-[#664400] shadow-[0_0_5px_#eebb00]'
                                        : 'bg-transparent text-[#eebb00] hover:text-white'
                                    }`}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-800 rounded-sm overflow-hidden border border-gray-700">
                    <div className="h-full bg-[#eebb00] w-0 shadow-[0_0_5px_#eebb00]" id="progress-bar-fill" />
                </div>
            </div>
        </div>
    );
};

export default Player;
