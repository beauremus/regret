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