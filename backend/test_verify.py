from backend.logic import calculate_hand_positions, calculate_hand_cost

def test_hand_position_logic():
    print("Testing Hand Position Logic...")
    
    # Mock notes: 4 low notes (E2), then 4 high notes (E4)
    # E2 = 40 (Open Low E), E4 = 64 (High E string open or D string 14th fret etc)
    
    notes = [
        {'start': 0.0, 'end': 0.5, 'pitch': 40, 'velocity': 100},
        {'start': 0.5, 'end': 1.0, 'pitch': 42, 'velocity': 100},
        {'start': 1.0, 'end': 1.5, 'pitch': 44, 'velocity': 100}, # Still low
        
        {'start': 2.0, 'end': 2.5, 'pitch': 64, 'velocity': 100}, # Jump high
        {'start': 2.5, 'end': 3.0, 'pitch': 67, 'velocity': 100},
        {'start': 3.0, 'end': 3.5, 'pitch': 69, 'velocity': 100},
    ]
    
    duration = 4.0
    timeline = calculate_hand_positions(notes, duration, time_step=1.0)
    
    for t in timeline:
        print(f"Time: {t['time']}, Center Fret: {t['center_fret']}")
        
    print("Test Complete")

if __name__ == "__main__":
    test_hand_position_logic()
