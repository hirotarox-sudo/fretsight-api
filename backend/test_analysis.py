import numpy as np
import scipy.io.wavfile as wav
import os
import sys

# Add current dir to path to import main logic if needed
sys.path.append(os.getcwd())

def generate_sine_wave(frequency, duration, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    audio = 0.5 * np.sin(2 * np.pi * frequency * t)
    return (audio * 32767).astype(np.int16)

def test_pitch_detection():
    # Test Frequencies
    # E2 = 82.41 Hz (MIDI 40)
    # A2 = 110.00 Hz (MIDI 45)
    # A4 = 440.00 Hz (MIDI 69)
    
    tests = [
        ("E2", 82.41, 40),
        ("A2", 110.0, 45),
        ("A4", 440.0, 69)
    ]
    
    import tempfile
    from basic_pitch.inference import predict, Model
    from basic_pitch import ICASSP_2022_MODEL_PATH
    
    print("Loading Model...")
    model = Model(ICASSP_2022_MODEL_PATH)
    
    for name, freq, expected_midi in tests:
        print(f"\n--- Testing {name} ({freq} Hz) ---")
        
        # Create temp wav
        fd, path = tempfile.mkstemp(suffix=".wav")
        try:
            audio = generate_sine_wave(freq, 2.0) # 2 seconds
            wav.write(path, 44100, audio)
            
            # Predict
            # Use same params as main.py
            model_output, midi_data, note_events = predict(
                path,
                model_or_model_path=model,
                onset_threshold=0.35,
                frame_threshold=0.3,
                multiple_pitch_bends=True
            )
            
            # Check notes
            detected_pitches = []
            for inst in midi_data.instruments:
                for note in inst.notes:
                    detected_pitches.append(note.pitch)
            
            print(f"Expected MIDI: {expected_midi}")
            print(f"Detected MIDI: {detected_pitches}")
            
            if detected_pitches:
                avg = sum(detected_pitches)/len(detected_pitches)
                diff = avg - expected_midi
                print(f"Difference: {diff:.2f} semitones")
                
                if abs(diff) > 1.0:
                    print(">> FAIL: Significant Pitch Shift Detected!")
                else:
                    print(">> PASS: Accurate.")
            else:
                print(">> FAIL: No notes detected.")
                
        finally:
            os.close(fd)
            os.remove(path)

if __name__ == "__main__":
    test_pitch_detection()
