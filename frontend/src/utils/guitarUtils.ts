export const NUM_STRINGS = 6;
export const MAX_FRET = 22;

// 1st (High E), 2nd (B), 3rd (G), 4th (D), 5th (A), 6th (Low E)// Standard MIDI Numbers: 0:Low-E, 1:A, 2:D, 3:G, 4:B, 5:High-E
export const TUNING = [40, 45, 50, 55, 59, 64];

export type Note = {
    string: number;
    fret: number;
    pitch: number;
};

export const getPossiblePositions = (pitch: number): Note[] => {
    const positions: Note[] = [];
    TUNING.forEach((openPitch, stringIdx) => {
        const fret = pitch - openPitch;
        if (fret >= 0 && fret <= MAX_FRET) {
            positions.push({ string: stringIdx, fret, pitch });
        }
    });
    return positions;
};

export const getBestPosition = (pitch: number, centerFret: number): Note | null => {
    const positions = getPossiblePositions(pitch);
    if (positions.length === 0) return null;

    // Find position closest to centerFret
    // Prioritize being within the [center, center+4] box if possible

    // Simple distance metric
    return positions.reduce((prev, curr) => {
        const prevDist = Math.abs(prev.fret - centerFret);
        const currDist = Math.abs(curr.fret - centerFret);
        return currDist < prevDist ? curr : prev;
    });
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const getNoteName = (pitch: number): string => {
    return NOTE_NAMES[pitch % 12];
};
