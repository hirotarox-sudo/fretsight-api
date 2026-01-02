import React from 'react';

const Manual: React.FC = () => {
    return (
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg mt-8 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">How to Use FretSight</h2>
            <div className="space-y-4 text-gray-300">
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Select Input</h3>
                        <p>Upload an audio file (MP3, WAV), use your microphone, or capture system audio.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">2</div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Analyze</h3>
                        <p>Click "START ANALYSIS". FretSight uses AI to transcribe audio to guitar tablature. Wait for the process to finish.</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">3</div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Visualize & Play</h3>
                        <p>Once analyzed, you'll see the fretboard visualization. Use the player controls to listen and watch the notes in real-time.</p>
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-yellow-500 flex items-center gap-2">
                <p><strong>Note:</strong> This application is compatible with <strong>Google Chrome</strong> only.</p>
            </div>
        </div>
    );
};

export default Manual;
