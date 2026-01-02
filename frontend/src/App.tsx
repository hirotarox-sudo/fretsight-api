import React, { useState, useMemo } from 'react';
import Fretboard from './components/Fretboard';
import HandControls from './components/HandControls';
import Player from './components/Player';
import AudioRecorder from './components/AudioRecorder';
import Manual from './components/Manual';
import { getBestPosition } from './utils/guitarUtils';

// Types
interface Note {
  start: number;
  end: number;
  pitch: number;
  velocity: number;
  bend_value?: number;
  string?: number;
  fret?: number;
  is_vibrato?: boolean;
  vibrato_depth?: number;
}

interface HandPosition {
  time: number;
  center_fret: number;
}

interface AnalysisResult {
  duration: number;
  notes: Note[];
  hand_positions: HandPosition[];
  pitch_bends?: { time: number; pitch: number }[];
}

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Input Mode State
  const [inputMode, setInputMode] = useState<'upload' | 'mic' | 'system'>('upload');

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Hand Logic State
  const [isAutoHand, setIsAutoHand] = useState(true);
  const [manualCenterFret, setManualCenterFret] = useState(2); // Default
  const [noteLabelMode, setNoteLabelMode] = useState<'none' | 'name' | 'fret'>('name');
  const [fretboardStyle, setFretboardStyle] = useState<'lespaul' | 'fender'>('lespaul');

  // Derived State: Current Hand Position
  const currentCenterFret = useMemo(() => {
    if (!result) return 2;

    if (isAutoHand) {
      // Find the latest hand position <= currentTime
      const relevant = result.hand_positions.filter(p => p.time <= currentTime);
      const pos = relevant.length > 0 ? relevant[relevant.length - 1] : undefined;
      // console.log("AutoHand: Time", currentTime, "Pos", pos?.center_fret);
      return pos ? pos.center_fret : 0;
    } else {
      return manualCenterFret;
    }
  }, [result, currentTime, isAutoHand, manualCenterFret]);

  // Derived State: Active Notes
  const activeNotes = useMemo(() => {
    if (!result) return [];

    // Filter notes in current time window
    const notesInTime = result.notes.filter(n => n.start <= currentTime && n.end > currentTime);

    // console.log("Time:", currentTime, "Active Notes Raw:", notesInTime.length);

    return notesInTime.map(n => {
      // Default: Use backend-optimized fingering
      let finalString = n.string;
      let finalFret = n.fret;

      // Fallback/Override: 
      // 1. If Auto Hand is OFF, force Manual recalibration.
      // 2. If Auto Hand is ON but backend provided no string/fret, calculate it.
      if (!isAutoHand || finalString === undefined || finalFret === undefined) {
        const targetCenter = isAutoHand ? currentCenterFret : manualCenterFret;
        const bestPos = getBestPosition(n.pitch, targetCenter);

        if (bestPos) {
          finalString = bestPos.string;
          finalFret = bestPos.fret;
        }
      }

      return {
        ...n,
        string: finalString,
        fret: finalFret
      };
    });
  }, [result, currentTime, isAutoHand, manualCenterFret]);

  const currentBend = useMemo(() => {
    if (!result?.pitch_bends) return 0;
    const relevantBends = result.pitch_bends.filter(b => b.time <= currentTime);
    const bend = relevantBends.length > 0 ? relevantBends[relevantBends.length - 1] : undefined;
    if (!bend) return 0;
    return bend.pitch;
  }, [result, currentTime]);

  // DEBUG: Log status
  // console.log("Render App: ", { 
  //   hasResult: !!result, 
  //   isPlaying, 
  //   currentTime, 
  //   activeNotesCount: activeNotes.length, 
  //   centerFret: currentCenterFret 
  // });

  const handleUpload = async () => {
    if (!file) return;
    setAnalyzing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Unknown Error" }));
        throw new Error(errData.detail || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);

      // Create object URL for audio
      setAudioUrl(URL.createObjectURL(file));
      setIsAutoHand(true);

    } catch (e: any) {
      console.error(e);
      alert(`Error analyzing file: ${e.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRecordingComplete = (recFile: File) => {
    setFile(recFile);
    setInputMode('upload'); // Switch back to upload view to show "Start Analysis"
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 gap-6 items-center">
      <header className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        FretSight
      </header>

      {!result ? (
        <>
          {/* Input Method Selector (Only show if no file selected yet, or allow re-select) */}
          {!file && inputMode === 'upload' && (
            <div className="flex gap-4 mb-4">
              <button onClick={() => setInputMode('upload')} className="px-4 py-2 rounded-full font-bold transition hover:bg-blue-700 bg-blue-600">Upload File</button>
              <button onClick={() => setInputMode('mic')} className="px-4 py-2 rounded-full font-bold transition hover:bg-blue-700 bg-gray-700">Microphone</button>
              <button onClick={() => setInputMode('system')} className="px-4 py-2 rounded-full font-bold transition hover:bg-blue-700 bg-gray-700">Browser Audio</button>
            </div>
          )}

          {inputMode === 'upload' ? (
            <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md gap-4 p-8 border-2 border-dashed border-gray-700 rounded-xl bg-gray-800 animate-fade-in">
              {file ? (
                <div className="text-center">
                  <p className="text-green-400 font-bold mb-2">Ready to analyze:</p>
                  <p className="text-white bg-gray-700 px-4 py-2 rounded">{file.name}</p>
                  <button onClick={() => setFile(null)} className="text-xs font-black uppercase tracking-wider text-black bg-gradient-to-b from-[#eebb00] to-[#b8860b] border border-[#664400] px-2 py-0.5 rounded-sm shadow-sm hover:brightness-110 mt-2">Remove</button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              )}

              <button
                onClick={handleUpload}
                className="w-full py-4 rounded-md font-bold text-white uppercase tracking-widest border-b-4 border-red-900 transition-all active:border-b-0 active:translate-y-1 bg-red-600 border-red-800 hover:brightness-110 disabled:opacity-50 disabled:translate-y-1 disabled:border-b-0"
              >
                {analyzing ? 'ANALYZING...' : 'START ANALYSIS'}
              </button>
              <p className="text-xs text-gray-500 mt-2">Powered by Spotify Basic Pitch</p>
            </div>
          ) : (
            <AudioRecorder
              source={inputMode}
              onRecordingComplete={handleRecordingComplete}
              onCancel={() => setInputMode('upload')}
            />
          )}
          <Manual />
        </>
      ) : (
        <div className="w-full max-w-5xl flex flex-col gap-6 animate-fade-in">
          <div className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <div>
                <h2 className="text-lg font-semibold">{file?.name}</h2>
                <p className="text-sm text-gray-400">Duration: {result.duration.toFixed(1)}s</p>
              </div>
              {/* Style Toggle */}
              <button
                onClick={() => setFretboardStyle(prev => prev === 'lespaul' ? 'fender' : 'lespaul')}
                className="px-3 py-1 bg-gradient-to-b from-[#eebb00] to-[#b8860b] border border-[#664400] rounded-sm text-black text-xs font-black uppercase tracking-wide shadow-md hover:brightness-110"
              >
                Style: {fretboardStyle === 'lespaul' ? 'Les Paul' : 'Fender'}
              </button>

              <button
                onClick={() => setNoteLabelMode(prev => {
                  if (prev === 'none') return 'name';
                  if (prev === 'name') return 'fret';
                  return 'none';
                })}
                className="px-3 py-1 bg-gradient-to-b from-[#eebb00] to-[#b8860b] border border-[#664400] rounded-sm text-black text-xs font-black uppercase tracking-wide shadow-md hover:brightness-110"
              >
                Label: {noteLabelMode.toUpperCase()}
              </button>
            </div>
            <button onClick={() => { setIsPlaying(false); setResult(null); }} className="text-xs font-black uppercase tracking-wider text-black bg-gradient-to-b from-[#eebb00] to-[#b8860b] border border-[#664400] px-3 py-1 rounded-sm shadow-sm hover:brightness-110">
              Reset
            </button>
          </div>

          {/* Visualization Area */}
          <Fretboard
            activeNotes={activeNotes}
            centerFret={currentCenterFret}
            filterOutOfRange={false}
            noteLabelMode={noteLabelMode}
            currentBend={currentBend}
            style={fretboardStyle}
          />

          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HandControls
              centerFret={currentCenterFret}
              isAuto={isAutoHand}
              onFretChange={(val) => setManualCenterFret(val)}
              onToggleAuto={setIsAutoHand}
            />
            <Player
              audioUrl={audioUrl}
              isPlaying={isPlaying}
              onPlayStateChange={setIsPlaying}
              onTimeUpdate={setCurrentTime}
              onDurationChange={() => { }}
              noteLabelMode={noteLabelMode}
              onToggleNoteLabelMode={() => setNoteLabelMode(prev => prev === 'name' ? 'fret' : 'name')}
            />
          </div>
        </div>
      )
      }
    </div >
  );
}

export default App;
