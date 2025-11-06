export function splitImage(image, gridSize, callback) {
    const tiles = [];
    const tileWidth = image.width / gridSize;
    const tileHeight = image.height / gridSize;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = tileWidth;
    canvas.height = tileHeight;

    let loadedTiles = 0;

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            ctx.clearRect(0, 0, tileWidth, tileHeight);
            ctx.drawImage(image, c * tileWidth, r * tileHeight, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
            
            const imageData = ctx.getImageData(0, 0, tileWidth, tileHeight);
            const brightness = calculateAverageBrightness(imageData.data);
            // Normalize brightness to a suitable height range (e.g., 0.1 to 2.0)
            const height = 0.1 + (brightness / 255) * 1.9; 

            tiles.push({
                x: c * tileWidth,
                y: r * tileHeight,
                width: tileWidth,
                height: height, // This is the calculated 3D height
                tilePixelHeight: tileHeight, // Actual pixel height of the tile
                brightness: brightness,
                // imageData: imageData // Storing full imageData can be memory intensive for large grids
            });
        }
    }
    if (callback) {
        callback(tiles);
    }
    return tiles;
}

function calculateAverageBrightness(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
        // Using a common luminance formula: (0.299*R + 0.587*G + 0.114*B)
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        sum += (0.299 * r + 0.587 * g + 0.114 * b);
    }
    return sum / (data.length / 4);
} 