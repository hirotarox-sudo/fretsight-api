import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
    source: 'mic' | 'system';
    onRecordingComplete: (file: File) => void;
    onCancel: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ source, onRecordingComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const originalStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => cleanup();
    }, [source]);

    useEffect(() => {
        if (isRecording) {
            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRecording]);

    const cleanup = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (originalStreamRef.current) {
            originalStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) audioContextRef.current.close();
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const setupStream = async () => {
        try {
            let rawStream: MediaStream;

            if (source === 'mic') {
                rawStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setStream(rawStream);
                setupVisualizer(rawStream);
            } else {
                rawStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });

                originalStreamRef.current = rawStream;

                const audioTracks = rawStream.getAudioTracks();
                if (audioTracks.length === 0) {
                    alert("No audio captured. Please ensure you checked 'Share system audio' in the selector.");
                    rawStream.getTracks().forEach(t => t.stop());
                    return;
                }

                const audioOnlyStream = new MediaStream(audioTracks);
                setStream(audioOnlyStream);
                setupVisualizer(audioOnlyStream);

                audioTracks[0].onended = () => {
                    if (isRecording) stopRecording();
                };
            }

        } catch (err) {
            console.error("Error accessing media devices:", err);
            if ((err as any).name !== 'NotAllowedError') {
                alert("Could not access audio source.");
            }
        }
    };

    const setupVisualizer = (mediaStream: MediaStream) => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;

        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(mediaStream);
        source.connect(analyser);

        drawVisualizer();
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyserRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);

            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#1f2937'; // gray-800
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];

                const r = barHeight + (25 * (i / bufferLength));
                const g = 250 * (i / bufferLength);
                const b = 50;

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

                x += barWidth + 1;
            }
        };

        draw();
    };

    const startRecording = () => {
        if (!stream) return;

        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg'
        ];

        let selectedMimeType = '';
        for (const type of mimeTypes) {
            if (MediaRecorder.isTypeSupported(type)) {
                selectedMimeType = type;
                break;
            }
        }

        try {
            const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: selectedMimeType || 'audio/webm' });

                let ext = 'webm';
                if (selectedMimeType.includes('mp4')) ext = 'mp4';
                else if (selectedMimeType.includes('ogg')) ext = 'ogg';
                else if (selectedMimeType.includes('wav')) ext = 'wav';

                const file = new File([blob], `recording_${Date.now()}.${ext}`, { type: selectedMimeType || 'audio/webm' });
                onRecordingComplete(file);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (e) {
            console.error("MediaRecorder error:", e);
            alert("Could not start recording.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    if (!stream) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md animate-fade-in gap-6">
                <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">
                        Connect {source === 'mic' ? 'Microphone' : 'System Audio'}
                    </h3>
                    <p className="text-sm text-gray-400">
                        {source === 'mic'
                            ? "Click below to grant microphone access."
                            : "Click below to open the browser sharing dialog. Remember to check 'Share system audio'."}
                    </p>
                </div>

                <button
                    onClick={setupStream}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-bold text-lg text-white shadow-xl transition transform hover:scale-105"
                >
                    Select Audio Source
                </button>

                <button
                    onClick={onCancel}
                    className="text-sm text-gray-400 hover:text-white underline"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-6 p-8 bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md animate-fade-in">
            <h3 className="text-xl font-bold text-white">
                Recording...
            </h3>

            {/* Visualizer */}
            <div className="relative w-full h-32 bg-gray-900 rounded-lg overflow-hidden border border-gray-600">
                <canvas ref={canvasRef} width={400} height={128} className="w-full h-full" />
            </div>

            <div className={`text-4xl font-mono font-bold ${isRecording ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                {formatTime(duration)}
            </div>

            <div className="flex gap-4 w-full">
                {!isRecording ? (
                    <button
                        onClick={startRecording}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white shadow-lg transition"
                    >
                        REC ●
                    </button>
                ) : (
                    <button
                        onClick={stopRecording}
                        className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white shadow-lg transition"
                    >
                        STOP ■
                    </button>
                )}

                <button
                    onClick={() => {
                        cleanup();
                        setStream(null);
                        onCancel();
                    }}
                    disabled={isRecording}
                    className="px-6 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 transition disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>

            {source === 'system' && (
                <p className="text-xs text-yellow-500 text-center">
                    Recording system audio. Ensure the visualizer is moving!
                </p>
            )}
        </div>
    );
};

// Helper for time formatting
const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default AudioRecorder;
