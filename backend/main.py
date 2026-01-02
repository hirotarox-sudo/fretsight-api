from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import tempfile
import subprocess
from basic_pitch.inference import predict, Model
from basic_pitch import ICASSP_2022_MODEL_PATH
import pretty_midi
import sys
import os

# Create backend directory plain to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from logic import calculate_hand_positions
import imageio_ffmpeg
import sys
import gc
# from spleeter.separator import Separator # Disabled
import numpy as np

# Import Optimizer
from optimizer import optimize_fingering

app = FastAPI(title="FretSight")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Models
basic_pitch_model = None

def get_basic_pitch_model():
    global basic_pitch_model
    if basic_pitch_model is None:
        try:
            print("Loading Basic Pitch model...")
            basic_pitch_model = Model(ICASSP_2022_MODEL_PATH)
        except Exception as e:
            print(f"Failed to load Basic Pitch model: {e}")
            return None
    return basic_pitch_model

# Initialize Basic Pitch model on startup
get_basic_pitch_model()

@app.post("/analyze")
def analyze_audio(file: UploadFile = File(...)):
    """
    Synchronous endpoint to handle heavy ML tasks.
    """
    temp_dir = tempfile.mkdtemp()
    temp_audio_path = None
    wav_path = None
    
    try:
        # Save uploaded file
        input_filename = "input_audio" + os.path.splitext(file.filename)[1]
        temp_audio_path = os.path.join(temp_dir, input_filename)
        
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Conversion
        # Use simple conversion, force 22050 for Basic Pitch compatibility
        wav_filename = "converted.wav"
        wav_path = os.path.join(temp_dir, wav_filename)
        
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        try:
            subprocess.check_call([ffmpeg_exe, '-i', temp_audio_path, '-ar', '22050', '-ac', '1', '-y', wav_path])
            print(f"Conversion successful: {wav_path}")
        except Exception as e:
            print(f"FFmpeg conversion failed: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid audio format: {e}")

        target_analysis_file = wav_path
        
        # 3. Basic Pitch Analysis
        print(f"Analyzing: {target_analysis_file}")
        
        # Default Parameters - Adjusted for Higher Sensitivity
        onset_th = 0.3
        frame_th = 0.2
        
        model = get_basic_pitch_model()

        model_output, midi_data, note_events = predict(
            target_analysis_file,
            model_or_model_path=model,
            onset_threshold=onset_th,
            frame_threshold=frame_th,
            multiple_pitch_bends=True
        )
            
        # Parse MIDI data
        raw_notes = []
        for instrument in midi_data.instruments:
            for note in instrument.notes:
                start = float(note.start)
                end = float(note.end)
                
                # --- PITCH CORRECTION ---
                # Reverted: Returning to raw analysis. Frontend handles correction.
                corrected_pitch = int(note.pitch)

                
                # Window logic
                start_win = max(0.0, start - 0.05)
                end_win = end + 0.05
                
                note_bends_raw = []
                for b in instrument.pitch_bends:
                    if start_win <= b.time <= end_win:
                        note_bends_raw.append(b.pitch)
                
                # Normalize (4096 = 1 semitone)
                note_bends_semitones = [(p - 8192) / 4096.0 for p in note_bends_raw]
                
                # Bend Detection
                max_bend = 0.0
                if note_bends_semitones:
                    max_val = max(note_bends_semitones)
                    min_val = min(note_bends_semitones)
                    
                    # Dynamic Range Detection
                    # User Definition: "Analog change" (Movement) is choking. Static offset is not.
                    pitch_range = max_val - min_val
                    
                    # Only consider it a bend if the pitch MOVES by more than 0.2 semitones within the note
                    if pitch_range > 0.2:
                        # Assign the maximum absolute deviation to represent the "depth" of the bend
                        if abs(min_val) > abs(max_val):
                             max_bend = min_val
                        else:
                             max_bend = max_val
                    else:
                        max_bend = 0.0
                
                bend_value = max_bend

                # Vibrato Detection
                is_vibrato = False
                vibrato_depth = 0.0
                
                if len(note_bends_semitones) >= 5:
                    std_dev = np.std(note_bends_semitones)
                    # Low threshold 0.02
                    if std_dev > 0.02:
                        mean_val = np.mean(note_bends_semitones)
                        centered_signal = np.array(note_bends_semitones) - mean_val
                        crossings = np.count_nonzero(np.diff(np.sign(centered_signal)))
                        
                        if crossings >= 2:
                            is_vibrato = True
                            vibrato_depth = min(1.0, std_dev * 5.0)

                raw_notes.append({
                    "start": start,
                    "end": end,
                    "pitch": corrected_pitch, # Offset applied
                    "velocity": int(note.velocity),
                    "bend_value": float(f"{bend_value:.3f}"),
                    "is_vibrato": is_vibrato,
                    "vibrato_depth": float(f"{vibrato_depth:.3f}")
                })
        
        # 4. Run Optimizer with CORRECTED pitches
        print("Optimizing fingering...")
        optimized_notes = optimize_fingering(raw_notes)
        
        duration = midi_data.get_end_time()
        hand_positions = calculate_hand_positions(optimized_notes, duration)

        pitch_bends = [] 
        
        return {
            "duration": float(duration),
            "notes": optimized_notes,
            "hand_positions": hand_positions,
            "pitch_bends": pitch_bends
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")
        
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        gc.collect()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
