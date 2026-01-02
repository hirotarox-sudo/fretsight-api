import React from 'react';

interface HandControlsProps {
    centerFret: number;
    isAuto: boolean;
    onFretChange: (fret: number) => void;
    onToggleAuto: (auto: boolean) => void;
}

const HandControls: React.FC<HandControlsProps> = ({ centerFret, isAuto, onFretChange, onToggleAuto }) => {
    return (
        <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg shadow-lg">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-200">Hand Position</h3>
                <div className="flex items-center gap-2">
                    <span className={`text-sm ${isAuto ? 'text-green-400 font-bold' : 'text-gray-400'}`}>AUTO</span>
                    <button
                        onClick={() => onToggleAuto(!isAuto)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${isAuto ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isAuto ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-sm ${!isAuto ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>MANUAL</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <span className="text-gray-400 w-8 text-center">{centerFret}</span>
                <input
                    type="range"
                    min="0"
                    max="17"
                    value={centerFret}
                    onChange={(e) => {
                        onFretChange(parseInt(e.target.value));
                        if (isAuto) onToggleAuto(false); // Auto-switch to manual on drag
                    }}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="text-gray-500 text-xs">Fret 17</span>
            </div>

            {!isAuto && (
                <button
                    onClick={() => onToggleAuto(true)}
                    className="self-end text-xs text-blue-300 hover:text-blue-100 underline"
                >
                    Resume Auto-Tracking
                </button>
            )}
        </div>
    );
};

export default HandControls;
