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