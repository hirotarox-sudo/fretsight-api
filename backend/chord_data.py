"""
Standard Guitar Information and Chord Shapes.
Used for optimization lookup.
"""

# Standard Tuning MIDI numbers
# E2=40, A2=45, D3=50, G3=55, B3=59, E4=64
OPEN_STRINGS = [40, 45, 50, 55, 59, 64]
NUM_STRINGS = 6
MAX_FRET = 22

def get_interval_signature(pitches):
    """
    Returns a normalized signature of pitch classes intervals relative to the root.
    pitches: list of MIDI numbers
    """
    if not pitches:
        return tuple()
    
    # Sort and remove duplicates
    sorted_pitches = sorted(list(set(pitches)))
    root = sorted_pitches[0]
    
    # Relative intervals mod 12 (Pitch Class Profile)
    intervals = tuple(sorted([(p - root) % 12 for p in sorted_pitches]))
    return intervals

# Dictionary of standard open shapes
# Key: Interval Signature (relative to root)
# Value: List of (string_idx, relative_fret) tuples.
# Note: These are "shapes". We need to transpose them.
# actually, simpler approach:
# Store specific voicings for specific chords? Or relative shapes?
# Relative shapes (CAGED) are powerful but complex to transpose programmatically due to open strings.
# Let's start with a database of FIXED open chords first, as they are the most preferred.

# Format:
# Key: frozenset of pitch classes (0=C, 1=C#, ...)
# Value: List of (string_idx, fret) tuples
# Wait, pitch classes don't define the voicing.
# We want: if we detect a C Major triad (C, E, G), we prefer x-3-2-0-1-0.

# Strategy:
# When optimizing, we look at a cluster of notes.
# 1. Identify valid physical locations for each note.
# 2. Check if the combination matches a "Standard Shape".
#    If yes, give it HUGE bonus (0 cost).

# Let's define "Shapes" as a set of relative intervals on strings.
# But open chords rely on specific open strings.
# So we should define `STANDARD_VOICINGS` as a list of "good" (string, fret) sets.
# But there are thousands.

# Alternative:
# Just define the rules well.
# 1. Open strings are good.
# 2. Neighboring strings are good.
# 3. Small span is good.
# 4. "Barre" capability (index finger covering multiple strings at same fret).

# Let's explicitly define Open Chords because they break the "span" rules sometimes 
# (e.g. they use fret 0 and 3, span=3. But fret 0 is free).

STANDARD_OPEN_CHORDS = {
    # C Major
    frozenset([0, 4, 7]): [
        [(1, 3), (2, 2), (3, 0), (4, 1), (5, 0)], # x-C-E-G-C-E (x-3-2-0-1-0)
        [(0, 0), (1, 3), (2, 2), (3, 0), (4, 1), (5, 0)], # E-C-E-G-C-E (0-3-2-0-1-0 C/E)
    ],
    # G Major
    frozenset([7, 11, 2]): [
         [(0, 3), (1, 2), (2, 0), (3, 0), (4, 0), (5, 3)], # 3-2-0-0-0-3
         # [(0, 3), (1, 2), (2, 0), (3, 0), (4, 3), (5, 3)], # 3-2-0-0-3-3
    ],
    # D Major
    frozenset([2, 6, 9]): [
        [(3, 0), (4, 2), (5, 3), (2, 2)], # x-x-0-A-D-F# (x-x-0-2-3-2)
    ],
    # A Major
    frozenset([9, 1, 4]): [
        [(1, 0), (2, 2), (3, 2), (4, 2), (5, 0)], # x-0-2-2-2-0
    ],
    # E Major
    frozenset([4, 8, 11]): [
        [(0, 0), (1, 2), (2, 2), (3, 1), (4, 0), (5, 0)], # 0-2-2-1-0-0
    ],
    # A Minor
    frozenset([9, 0, 4]): [
         [(1, 0), (2, 2), (3, 2), (4, 1), (5, 0)], # x-0-2-2-1-0
    ],
    # E Minor
    frozenset([4, 7, 11]): [
        [(0, 0), (1, 2), (2, 2), (3, 0), (4, 0), (5, 0)], # 0-2-2-0-0-0
    ],
    # D Minor
    frozenset([2, 5, 9]): [
        [(3, 0), (4, 2), (5, 1), (2, 3)], # x-x-0-2-3-1
    ]
}

# We can handle more dynamically in the cost function.
