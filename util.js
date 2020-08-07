/* Specifically for offset grid diagrams */
function makeRectangularShape(minCol, maxCol, minRow, maxRow, convert) {
    let results = [];
    for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
            let hex = convert(new OffsetCoord(col, row));
            hex.col = col;
            hex.row = row;
            results.push(hex);
        }
    }
    return results;
}

function makeHexagonalShape(N) {
    let results = [];
    for (let q = -N; q <= N; q++) {
        for (let r = -N; r <= N; r++) {
            let hex = new Hex(q, r, -q - r);
            if (hex.len() <= N) {
                results.push(hex);
            }
        }
    }
    return results;
}

// Adapted from: https://css-tricks.com/converting-color-spaces-in-javascript/
function RGBToHSL(rgbInput) {
    const sep = rgbInput.indexOf(",") > -1 ? "," : " ";
    const rgb = rgbInput.substr(4).split(")")[0].split(sep);

    for (let R in rgb) {
        const r = rgb[R];
        if (r.indexOf("%") > -1) {
            rgb[R] = Math.round(r.substr(0, r.length - 1) / 100 * 255);
        }
    }

    // Make r, g, and b fractions of 1
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;

    // Find greatest and smallest channel values
    const cMin = Math.min(r, g, b);
    const cMax = Math.max(r, g, b);
    const delta = cMax - cMin;
    let h = 0;
    let s = 0;
    let l = 0;

    // Calculate hue
    // No difference
    if (delta == 0)
        h = 0;
    // Red is max
    else if (cMax == r)
        h = ((g - b) / delta) % 6;
    // Green is max
    else if (cMax == g)
        h = (b - r) / delta + 2;
    // Blue is max
    else
        h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    // Make negative hues positive behind 360°
    if (h < 0) {
        h += 360;
    }

    // Calculate lightness
    l = (cMax + cMin) / 2;

    // Calculate saturation
    s = delta == 0
        ? 0
        : delta / (1 - Math.abs(2 * l - 1));

    // Multiply l and s by 100
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [h, s, l];
}

function hslFromSelector(selector, attribute) {
    return RGBToHSL(
        getComputedStyle(document.querySelector(selector))[attribute]
    );
}

// https://blog.bitsrc.io/understanding-throttling-and-debouncing-973131c1ba07
function debounce(fn, timeout) {
    this.timer = -1;

    return {
        hold: (...args) => {
            if (this.timer !== -1) clearTimeout(this.timer);
            this.timer = setTimeout(() => fn(...args), timeout);
        },
        clear: () => {
            if (this.timer !== -1) clearTimeout(this.timer);
        }
    }
}

//#Source https://bit.ly/2neWfJ2
const clampNumber = (num, a, b) => Math.max(
    Math.min(num, Math.max(a, b)),
    Math.min(a, b)
);

function drawHeightIndicator(
    { ctx, x, y, minHeight, maxHeight, tileHeight }
        = { minHeight: 1, maxHeight: 7 }
) {
    if (tileHeight === undefined) throw new Error(`Undefined tile height`);
    const clampedTileHeight = clampNumber(tileHeight, minHeight, maxHeight);
    const tileCount = maxHeight - minHeight + 1;
    const xOffset = x - 30;
    const height = 100;
    const width = 20;

    ctx.beginPath();
    // x, y, radiusX, radiusY, rotation, startAngle, endAngle [, anticlockwise]
    ctx.ellipse(xOffset, y, width, height, 0, 0, 2 * Math.PI);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = `purple`;
    ctx.fill();
    ctx.fillStyle = `gold`;

    const xCentered = xOffset - width / 2 + 3;
    const bottom = height - 10;
    const heightDelta = (height * 2 - 14) / tileCount;
    const ellipseBottom = y + bottom;

    ctx.font = `bold 26px serif`;

    for (let i = 0; i < tileCount; i++) {
        ctx.fillText(`${i + 1}`, xCentered, ellipseBottom - heightDelta * i);
    }

    // Clip around ellipse
    ctx.beginPath();
    ctx.ellipse(xOffset, y, width, height, 0, 0, 2 * Math.PI);
    ctx.clip();

    // Paint lines to highlight current tile height
    ctx.beginPath();
    ctx.strokeStyle = `gold`;

    const leftX = xOffset - width;
    const rightX = xOffset + width;
    const linePadding = 5;
    const normalizedTileHeight = clampedTileHeight - minHeight + 1;

    // Guiding lines around tile height indicator
    ctx.moveTo(leftX, ellipseBottom - heightDelta * normalizedTileHeight + linePadding);
    ctx.lineTo(rightX, ellipseBottom - heightDelta * normalizedTileHeight + linePadding);
    ctx.moveTo(leftX, ellipseBottom - heightDelta * (normalizedTileHeight - 1) + linePadding);
    ctx.lineTo(rightX, ellipseBottom - heightDelta * (normalizedTileHeight - 1) + linePadding);

    ctx.stroke();

    return ({ newY }) => {
        // deltaDiff is inverted to account for browser coordinates
        const deltaDiff = -Math.floor((newY - y) / heightDelta);
        const newTileHeight = clampedTileHeight + deltaDiff;
        drawHeightIndicator({ ctx, x, y, minHeight, maxHeight, tileHeight: newTileHeight });
        return newTileHeight;
    }
}