import numpy as np

# Standard Guitar Tuning (E2, A2, D3, G3, B3, E4)
# MIDI numbers: E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
STRING_OPEN_PITCHES = [40, 45, 50, 55, 59, 64]
NUM_STRINGS = 6
MAX_FRET = 22

def get_possible_positions(pitch):
    """
    Returns a list of (string_index, fret) tuples for a given MIDI pitch.
    string_index: 0 (Low E) to 5 (High E)
    """
    positions = []
    for string_idx, open_pitch in enumerate(STRING_OPEN_PITCHES):
        fret = pitch - open_pitch
        if 0 <= fret <= MAX_FRET:
            positions.append((string_idx, fret))
    return positions

def calculate_hand_cost(notes_in_window, hand_center_fret):
    """
    Calculates a cost for a given hand position (center fret) based on the notes in the window.
    Lower cost is better.
    """
    cost = 0
    
    # Range of "easy" reach: [center, center + 4]
    # We allow some stretch: [center - 1, center + 5] with penalty
    min_reach = hand_center_fret
    max_reach = hand_center_fret + 4
    
    if len(notes_in_window) == 0:
        return 0 # No cost for empty window

    for note in notes_in_window:
        pitch = note['pitch']
        possible_pos = get_possible_positions(pitch)
        
        if not possible_pos:
            return 9999 # Impossible note (too high/low)

        # Find best fit position for this specific note given the hand center
        best_note_cost = float('inf')
        
        for s_idx, f in possible_pos:
            note_cost = 0
            
            # Distance from "box"
            if f < min_reach:
                note_cost += (min_reach - f) * 10 # Stretching down is hard
            elif f > max_reach:
                note_cost += (f - max_reach) * 5 # Stretching up is okay-ish
            
            # String skip penalty (heuristic: prefer middle strings? no, maybe just distance)
            
            best_note_cost = min(best_note_cost, note_cost)
        
        cost += best_note_cost

    # Bias towards lower frets (User requirement: prioritize low frets 0-5)
    # Add a small linear penalty for higher positions
    cost += hand_center_fret * 0.5 

    return cost

def calculate_hand_positions(notes, duration_seconds, time_step=0.1):
    """
    Estimates hand positions over time.
    
    Args:
        notes: List of dicts {'start': float, 'end': float, 'pitch': int, 'velocity': int}
        duration_seconds: float
        time_step: seconds per analysis window
        
    Returns:
        List of dicts {'time': float, 'center_fret': int}
    """
    timeline = []
    current_time = 0.0
    
    # We can use a simple DP or just a greedy smoothed approach.
    # Let's try a simple smoothed greedy approach first for responsiveness.
    # State: Current Hand Position
    
    current_hand_pos = 0 # Start at open position
    
    # Define possible hand centers (e.g., 0, 2, 5, 7, 9, 12, ...)
    # Or just every fret.
    possible_centers = range(0, 16) 

    while current_time < duration_seconds:
        window_end = current_time + time_step
        
        # Get notes active in this window
        active_notes = [
            n for n in notes 
            if (n['start'] < window_end and n['end'] > current_time)
        ]
        
        # simple average pitch check? No, need to fit the box.
        
        best_pos = current_hand_pos
        min_cost = float('inf')
        
        for pos in possible_centers:
            # Base cost for this position
            cost = calculate_hand_cost(active_notes, pos)
            
            # smoothing cost: penalty for moving hand
            dist = abs(pos - current_hand_pos)
            if dist > 0:
                cost += dist * 2 # Penalty for moving
            
            if cost < min_cost:
                min_cost = cost
                best_pos = pos
        
        timeline.append({
            'time': round(current_time, 2),
            'center_fret': best_pos
        })
        
        current_hand_pos = best_pos
        current_time += time_step
        
    return timeline
