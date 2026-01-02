/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                fretboard: '#3e2723', // Dark wood
                fret: '#cfd8dc', // Silver
                inlay: '#fff9c4', // Pearl/Cream
                maple: '#f5deb3', // Maple/Wheat
                'fender-inlay': '#000000', // Black dots
            },
            backgroundImage: {
                'wood-pattern': "url('https://www.transparenttextures.com/patterns/wood-pattern.png')", // Simple placeholder pattern
            }
        },
    },
    plugins: [],
}
