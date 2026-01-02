import React, { useMemo } from 'react';
import { getBestPosition, getNoteName, NUM_STRINGS, MAX_FRET } from '../utils/guitarUtils';

interface NoteData {
    pitch: number;
    velocity: number;
    bend_value?: number;
    string?: number;
    fret?: number;
    is_vibrato?: boolean;
    vibrato_depth?: number;
}

interface FretboardProps {
    activeNotes: NoteData[];
    centerFret: number;
    filterOutOfRange: boolean;
    noteLabelMode: 'none' | 'name' | 'fret';
    currentBend: number;
    style?: 'lespaul' | 'fender';
}

const Fretboard: React.FC<FretboardProps> = ({ activeNotes, centerFret, filterOutOfRange, noteLabelMode, currentBend, style = 'lespaul' }) => {

    const NUT_OFFSET = 50;
    const SCALE_LENGTH = 1500;
    const stringSpacing = 30;
    const edgeMargin = 12;

    // --- Trail / Persistence Logic ---
    const [renderedNotes, setRenderedNotes] = React.useState<{ [key: string]: any }>({});

    // Identify current active notes for rendering (logic ported from original useMemo)
    const currentActivePositions = useMemo(() => {
        const positions: { [key: string]: any } = {};
        for (const note of activeNotes) {
            let pos;
            if (note.string !== undefined && note.fret !== undefined) {
                pos = { string: note.string, fret: note.fret, pitch: note.pitch };
            } else {
                pos = getBestPosition(note.pitch, centerFret);
            }

            if (pos) {
                const isExplicit = note.string !== undefined;
                let shouldRender = false;
                if (isExplicit) {
                    shouldRender = true;
                } else {
                    const minReach = centerFret - 1;
                    const maxReach = centerFret + 5;
                    if (!filterOutOfRange || (pos.fret >= minReach && pos.fret <= maxReach)) {
                        shouldRender = true;
                    }
                }

                if (shouldRender) {
                    // Unique Key: string-fret
                    // If multiple notes map to same pos, last one wins (acceptable)
                    const key = `${pos.string}-${pos.fret}`;
                    positions[key] = { ...pos, ...note, isFading: false };
                }
            }
        }
        return positions;
    }, [activeNotes, centerFret, filterOutOfRange]);

    // Sync renderedNotes with currentActivePositions
    React.useEffect(() => {
        setRenderedNotes(prev => {
            const next = { ...prev };

            // 1. Mark existing fading notes
            Object.keys(next).forEach(key => {
                if (!currentActivePositions[key]) {
                    // If it was already fading, leave it. If it was active, start fading.
                    if (!next[key].isFading) {
                        next[key] = { ...next[key], isFading: true, fadeStartTime: Date.now() };
                    }
                } else {
                    // Still active, update data (bends etc) and ensure not fading
                    next[key] = { ...currentActivePositions[key], isFading: false };
                }
            });

            // 2. Add new active notes
            Object.keys(currentActivePositions).forEach(key => {
                next[key] = { ...currentActivePositions[key], isFading: false };
            });

            // 3. Cleanup very old notes (older than 500ms) to prevent memory leaks / DOM bloat
            // (Strictly speaking, CSS transition handles the visual, but we need to unmount eventually)
            const now = Date.now();
            Object.keys(next).forEach(key => {
                if (next[key].isFading && (now - next[key].fadeStartTime > 500)) {
                    delete next[key];
                }
            });

            return next;
        });
    }, [currentActivePositions]);

    // Cleanup Effect for fading notes (Run periodically or rely on updates? 
    // Since activeNotes updates frequently during playback, the above effect runs often enough to clean up.
    // But if playback stops, trails might stick? 
    // Let's add a self-cleanup interval if there are fading notes.)
    React.useEffect(() => {
        const hasFading = Object.values(renderedNotes).some((n: any) => n.isFading);
        if (!hasFading) return;

        const interval = setInterval(() => {
            setRenderedNotes(prev => {
                const next = { ...prev };
                const now = Date.now();
                let changed = false;
                Object.keys(next).forEach(key => {
                    if (next[key].isFading && (now - next[key].fadeStartTime > 500)) {
                        delete next[key];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [renderedNotes]);


    const getFretX = (n: number) => {
        if (n === 0) return NUT_OFFSET;
        return NUT_OFFSET + SCALE_LENGTH * (1 - Math.pow(2, -n / 12));
    };

    const getFretCenter = (n: number) => {
        if (n === 0) return NUT_OFFSET / 2;
        const prevX = getFretX(n - 1);
        const currX = getFretX(n);
        return prevX + (currX - prevX) / 2;
    };

    const maxFretX = getFretX(MAX_FRET);
    const boardWidth = maxFretX + 50;
    const bindingHeight = 6;
    const topMargin = 30;
    const visualBoardHeight = (NUM_STRINGS - 1) * stringSpacing + (edgeMargin * 2);
    const svgHeight = topMargin + visualBoardHeight;

    const isTrapezoid = style === 'lespaul';
    // Colors updated to use gradients instead of flat hex where possible
    const bindingColor = style === 'fender' ? '#deb887' : '#ffecb3';
    const inlayColor = style === 'fender' ? '#000000' : '#fff9c4';


    const handStartX = getFretX(centerFret > 0 ? centerFret - 1 : 0);
    const handEndX = getFretX(Math.min(centerFret + 4, MAX_FRET));
    const handWidth = Math.max(0, handEndX - handStartX);

    return (
        <div className="overflow-x-auto w-full rounded relative shadow-2xl" style={{ backgroundColor: 'transparent' }}>
            {/* Hand Position Marker */}
            <div
                className="absolute border-x-4 border-blue-500 bg-blue-500 bg-opacity-10 pointer-events-none transition-all duration-300 ease-linear"
                style={{ top: `${topMargin}px`, height: `${visualBoardHeight}px`, left: `${handStartX}px`, width: `${handWidth}px`, zIndex: 10 }}
            />

            <svg width={boardWidth} height={svgHeight} className="min-w-max">
                <defs>
                    {/* Premium Wood/Dark Gradients */}
                    <linearGradient id="lespaulGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#2d1b18" />
                        <stop offset="50%" stopColor="#1a0f0d" />
                        <stop offset="100%" stopColor="#2d1b18" />
                    </linearGradient>

                    <linearGradient id="fenderGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f5deb3" />
                        <stop offset="50%" stopColor="#e6ceaa" />
                        <stop offset="100%" stopColor="#f5deb3" />
                    </linearGradient>

                    {/* Enhanced Neon Glow */}
                    <filter id="neonGlow" x="-100%" y="-100%" width="300%" height="300%">
                        {/* Outer colored bloom */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
                        <feColorMatrix in="blur1" type="matrix" values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 1 0" result="coloredBlur" />

                        {/* Core white brightness */}
                        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur2" />

                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="blur2" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g transform={`translate(0, ${topMargin})`}>
                    {/* Main Board Background with Gradient */}
                    <rect x={0} y={0} width={boardWidth} height={visualBoardHeight} fill={style === 'fender' ? "url(#fenderGradient)" : "url(#lespaulGradient)"} rx="4" />
                    {/* Nut */}
                    <rect x={0} y={0} width={NUT_OFFSET} height={visualBoardHeight} fill={style === 'fender' ? '#d7ccc8' : '#black'} />
                    {/* Binding */}
                    <rect x={NUT_OFFSET} y={0} width={boardWidth - NUT_OFFSET} height={bindingHeight} fill={bindingColor} opacity="0.8" />
                    <rect x={NUT_OFFSET} y={visualBoardHeight - bindingHeight} width={boardWidth - NUT_OFFSET} height={bindingHeight} fill={bindingColor} opacity="0.8" />
                </g>

                {/* Frets & Inlays */}
                {Array.from({ length: MAX_FRET + 1 }).map((_, i) => {
                    const x = getFretX(i);
                    const centerX = i > 0 ? getFretCenter(i) : 0;
                    return (
                        <React.Fragment key={`fret-${i}`}>
                            <line
                                x1={x} y1={topMargin + bindingHeight}
                                x2={x} y2={topMargin + visualBoardHeight - bindingHeight}
                                stroke={i === 0 ? (style === 'fender' ? '#efebe9' : '#ffecb3') : "#cfd8dc"}
                                strokeWidth={i === 0 ? 6 : 2}
                                strokeOpacity="0.8"
                            />
                            {i > 0 && (
                                <>
                                    {/* Fret Numbers */}
                                    <text x={centerX} y={topMargin - 5} fill={style === 'fender' ? "#555" : "#888"} fontSize="12" fontWeight="bold" textAnchor="middle" style={{ fontFamily: 'monospace' }}>{i}</text>

                                    {/* Inlays */}
                                    {isTrapezoid && [3, 5, 7, 9, 12, 15, 17, 19, 21].includes(i) && (
                                        <polygon
                                            points={`${centerX - 12},${topMargin + visualBoardHeight / 2 - 1.5 * stringSpacing} ${centerX + 12},${topMargin + visualBoardHeight / 2 - 1.5 * stringSpacing} ${centerX + 16},${topMargin + visualBoardHeight / 2 + 1.5 * stringSpacing} ${centerX - 16},${topMargin + visualBoardHeight / 2 + 1.5 * stringSpacing}`}
                                            fill={inlayColor} opacity="0.9"
                                        />
                                    )}
                                    {!isTrapezoid && [3, 5, 7, 9, 15, 17, 19, 21].includes(i) && <circle cx={centerX} cy={topMargin + visualBoardHeight / 2} r="6" fill={inlayColor} opacity="0.9" />}
                                    {!isTrapezoid && i === 12 && <><circle cx={centerX} cy={topMargin + visualBoardHeight / 2 - stringSpacing} r="6" fill={inlayColor} opacity="0.9" /><circle cx={centerX} cy={topMargin + visualBoardHeight / 2 + stringSpacing} r="6" fill={inlayColor} opacity="0.9" /></>}
                                </>
                            )}
                        </React.Fragment>
                    );
                })}

                {/* Strings */}
                {Array.from({ length: NUM_STRINGS }).map((_, i) => {
                    const y = topMargin + edgeMargin + i * stringSpacing;
                    const isWound = i > 2; // Bottom 3 strings (visual 3,4,5 => data indices...) actually standard guitar strings 4,5,6 are wound.
                    // Visual i=0 (High E), i=5 (Low E).
                    // Strings 0,1,2 (E, B, G) plain. 3,4,5 (D, A, E) wound.
                    // i is Visual index. So i=3,4,5 are Wound.
                    return (
                        <g key={`str-${i}`}>
                            {/* String Shadow for depth */}
                            <line x1={0} y1={y + 1} x2={boardWidth} y2={y + 1} stroke="#000" strokeOpacity="0.3" strokeWidth={(i + 1) * 0.5 + 0.5} />
                            <line x1={0} y1={y} x2={boardWidth} y2={y} stroke={isWound ? "#d4d4d4" : "#e0e0e0"} strokeWidth={(i + 1) * 0.5 + 0.5} />
                        </g>
                    );
                })}

                {/* Active & Trailing Notes */}
                {Object.values(renderedNotes).map((note: any) => {
                    const isOpen = note.fret === 0;
                    const cx = isOpen ? NUT_OFFSET / 2 : getFretCenter(note.fret);

                    // Visual offset correction
                    if (note.string === undefined) return null;
                    const dataStringIndex = note.string;
                    const visualStringIndex = (6 - dataStringIndex) - 1; // Standard Alignment (High E at top)
                    const cy = topMargin + edgeMargin + visualStringIndex * stringSpacing;

                    // Dynamic Bend Logic
                    const isActive = !note.isFading;
                    const dynamicBend = isActive ? currentBend : (note.bend_value || 0);

                    // Use dynamicBend if available and non-zero, otherwise fall back to static note data
                    // Note: currentBend reflects the GLOBAL pitch wheel. Ideally, we should check if this specific note is the one bending.
                    // But for monophonic/clear solo situations, applying global bend to active notes is the standard approach.
                    const bendVal = Math.abs(dynamicBend) > 0.05 ? dynamicBend : 0;

                    // High threshold for visual color change (Yellow)
                    // Backend now filters for Range > 0.2, so we can trust smaller values here.
                    const isBending = Math.abs(bendVal) > 0.2;
                    // User Request: Stop movement for now
                    const bendPx = 0;
                    const isVibrato = note.is_vibrato;

                    // Color & Style
                    const noteColor = isBending ? "#facc15" : "#ef4444"; // Yellow for bend, Red for normal

                    // Transition Logic
                    const opacity = note.isFading ? 0 : 1;
                    const transitionDuration = note.isFading ? '500ms' : '0ms'; // Instant ON, Slow OFF
                    const transform = `translateY(${bendPx}px)`;

                    return (
                        <g
                            key={`note-${note.string}-${note.fret}`}
                            style={{
                                transform,
                                opacity,
                                transition: `transform 0.1s linear, opacity ${transitionDuration} ease-out` // Composite transition
                            }}
                        >
                            {/* The Note Marker */}
                            <circle
                                className={isVibrato ? "animate-vibrato" : ""}
                                cx={cx} cy={cy}
                                r={isBending ? 11 : 9}
                                fill={noteColor}
                                stroke="#fff" strokeWidth="2"
                                filter="url(#neonGlow)" // Use Enhanced Neon Glow
                            />

                            {/* Fret Label (if enabled) */}
                            {noteLabelMode !== 'none' && (
                                <text x={cx} y={cy + 4} fontSize="10" fill="white" textAnchor="middle" pointerEvents="none" fontWeight="bold"
                                    className={isVibrato ? "animate-vibrato" : ""}
                                >
                                    {noteLabelMode === 'name' ? getNoteName(note.pitch) : note.fret}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default Fretboard;
