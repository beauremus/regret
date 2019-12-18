class Canvas {
    constructor(selector, draw) {
        this.canvas = document.querySelector(selector);
        this.ctx = this.canvas.getContext(`2d`);
        this.shouldRAF = true;
        this.drawCanvas = draw;

        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate(callback) {
        if (this.shouldRAF) {
            this.shouldRAF = false;
            requestAnimationFrame(() => {
                this.clear();
                callback();
                this.shouldRAF = true;
            });
        }
    }
}

class HexDrawer extends Canvas {
    constructor(selector, draw) {
        super(selector, draw);
    }

    drawHex(hex, filled, options = { color: `black` }) {
        this.ctx.beginPath();
        this.ctx.moveTo(hex[0].x, hex[0].y);

        for (let point of hex) {
            this.ctx.lineTo(point.x, point.y);
        }

        this.ctx.lineTo(hex[0].x, hex[0].y);
        this.ctx.fillStyle = options.color;

        if (filled) {
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }
    }
}

class Grid extends HexDrawer {
    constructor(selector, size, layout) {
        super(selector);
        this.size = size;
        this.layout = layout;
    }

    draw({ size, layout } = { size: this.size, layout: this.layout }) {
        this.animate(() => {
            makeHexagonalShape(size).forEach(hex => {
                this.drawHex(layout.polygonCorners(hex));
            });
        })
    }
}

class Map extends HexDrawer {
    constructor(selector, layout) {
        super(selector);
        this.layout = layout;
        let storedMap = localStorage.getItem('map');

        if (storedMap) {
            storedMap = JSON.parse(storedMap).map(hex => {
                const { q, r, s } = hex.location;
                hex.location = new Hex(q, r, s);
                return hex;
            });

            this.draw();
        }

        this.selectedHexes = storedMap || [];
        this.maxHeight = 3;
        this.minHeight = -3;
        this.tileType = `grass`;
        [this.hue, this.saturation, this.lightness] = hslFromSelector(`.tileTypeSelector[selected]`, `background-color`);
        this.shouldRemoveHeight = false;
        this.shouldRemoveTile = false;
    }

    pointToHex(x, y, layout) {
        const localLayout = layout || this.layout;
        return localLayout.pixelToHex(new Point(x, y)).round();
    }

    findHexFromPoint(x, y, layout) {
        const localLayout = layout || this.layout;
        const clickedHex = this.pointToHex(x, y, localLayout);
        return this.selectedHexes.findIndex(hex => hex.location.isSame(clickedHex));
    }

    getTileHeight(x, y) {
        const hexIndex = this.findHexFromPoint(x, y);
        if (hexIndex !== -1)
            return this.selectedHexes[hexIndex].height;
        return null;
    }

    rotate(direction) {
        if (direction === undefined) throw new Error("Direction for rotation is undefined");
        this.selectedHexes.forEach(hex => {
            const rotation = `rotate${direction}`;
            hex.location = hex.location[rotation]();
        });

        localStorage.setItem('map', JSON.stringify(this.selectedHexes));

        this.draw();
    }

    setTileType(type) {
        this.tileType = type;
        [this.hue, this.saturation, this.lightness] = hslFromSelector(`#${type}`, `background-color`);
    }

    draw(layout = this.layout) {
        this.animate(() => {
            this.selectedHexes.forEach(hex => {
                this.drawHex(
                    layout.polygonCorners(hex.location),
                    true,
                    {
                        color: `hsl(${hex.hue + hex.height * 5}, ${hex.saturation + hex.height * 10}%, ${hex.lightness + hex.height * 10}%)`
                    }
                );
            });
        });
    }

    updateTile(x, y, layout, add = true) {
        const hexIndex = this.findHexFromPoint(x, y);
        const clickedHex = this.pointToHex(x, y, layout);

        // Add hex to list if one doesn't exist
        if (hexIndex === -1 && add) {
            this.selectedHexes.push({
                location: clickedHex,
                hue: this.hue,
                saturation: this.saturation,
                lightness: this.lightness,
                height: 0
            });
        } else { // Modify existing hex
            if (this.selectedHexes[hexIndex].hue !== this.hue) {
                this.selectedHexes[hexIndex].hue = this.hue;
                this.selectedHexes[hexIndex].saturation = this.saturation;
                this.selectedHexes[hexIndex].lightness = this.lightness;
                this.selectedHexes[hexIndex].height = -1;
            }

            if (this.shouldRemoveHeight) {
                this.shouldRemoveHeight = false;
                if (this.selectedHexes[hexIndex].height > this.minHeight) {
                    --this.selectedHexes[hexIndex].height;
                }
            } else {
                if (this.selectedHexes[hexIndex].height < this.maxHeight) {
                    ++this.selectedHexes[hexIndex].height;
                }
            }

            if (this.shouldRemoveTile) {
                this.shouldRemoveTile = false;
                this.selectedHexes.splice(hexIndex, 1);
            }
        }

        localStorage.setItem('map', JSON.stringify(this.selectedHexes));

        this.draw(layout);
    }
}

class Mouse extends HexDrawer {
    constructor(selector, layout) {
        super(selector);
        this.layout = layout;
        this.x = 0;
        this.y = 0;
    }

    drawMouse(x = this.x, y = this.y, layout = this.layout, ...args) {
        this.x = x;
        this.y = y
        this.animate(() => {
            this.drawHex(
                layout.polygonCorners(
                    layout.pixelToHex(
                        new Point(x, y)
                    ).round()
                ),
                true,
                ...args
            );

            const tileHeight = game.map.getTileHeight(x, y);
            const minHeight = game.map.minHeight;
            const maxHeight = game.map.maxHeight;
            const tileCount = maxHeight - minHeight + 1;

            if (tileHeight !== null) {
                const xOffset = x - 30;
                const height = 100;
                const width = 20;
                this.ctx.beginPath();
                // x, y, radiusX, radiusY, rotation, startAngle, endAngle [, anticlockwise]
                this.ctx.ellipse(xOffset, y, width, height, 0, 0, 2 * Math.PI);
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                this.ctx.fillStyle = `purple`;
                this.ctx.fill();
                this.ctx.fillStyle = `gold`;
                const xCentered = xOffset - width / 2 + 3;
                const bottom = height - 10;
                const heightDelta = (height * 2 - 14) / tileCount;
                const ellipseBottom = y + bottom;
                this.ctx.font = `bold 26px serif`;

                for (let i = 0; i < tileCount; i++) {
                    this.ctx.fillText(`${i + 1}`, xCentered, ellipseBottom - heightDelta * i);
                }

                // Clip around ellipse
                this.ctx.beginPath();
                this.ctx.ellipse(xOffset, y, width, height, 0, 0, 2 * Math.PI);
                this.ctx.clip();
                // Paint lines to highlight current tile height
                this.ctx.beginPath();
                this.ctx.strokeStyle = `gold`;
                const leftX = xOffset - width;
                const rightX = xOffset + width;
                const linePadding = 5;
                const normalizedTileHeight = tileHeight - minHeight + 1;

                // Guiding lines around tile height indicator
                this.ctx.moveTo(leftX, ellipseBottom - heightDelta * normalizedTileHeight + linePadding);
                this.ctx.lineTo(rightX, ellipseBottom - heightDelta * normalizedTileHeight + linePadding);
                this.ctx.moveTo(leftX, ellipseBottom - heightDelta * (normalizedTileHeight - 1) + linePadding);
                this.ctx.lineTo(rightX, ellipseBottom - heightDelta * (normalizedTileHeight - 1) + linePadding);

                this.ctx.stroke();
            }
        })
    }
}

class Game {
    constructor(orientation) {
        this.hexWidth = 28;
        this.hexHeight = 12;
        this.layout = new Layout(
            orientation,
            new Point(this.hexWidth, this.hexHeight),
            new Point(window.innerWidth / 2, window.innerHeight / 2)
        );
    }

    update() {
        this.grid.draw();
        this.map.draw();
    }

    rotate(direction) {
        this.map.rotate(direction);
    }

    start(container) {
        const containerElement = document.querySelector(container);
        const containerWidth = containerElement.clientWidth;
        const containerHeight = containerElement.clientHeight;
        const gridWidth = containerWidth / this.hexWidth / 2;
        const gridHeight = containerHeight / this.hexHeight / 2;
        const hexSize = Math.ceil(Math.max(gridWidth, gridHeight));

        this.grid = new Grid(`${container} > #grid`, hexSize, this.layout);
        this.map = new Map(`#map`, this.layout);
        this.mouse = new Mouse(`#mouse`, this.layout);

        this.grid.draw();

        containerElement
            .addEventListener(`mousemove`, event => {
                this.mouse.drawMouse(event.clientX, event.clientY, this.layout);
            });

        containerElement
            .querySelectorAll(`.tileTypeSelector`)
            .forEach(node => {
                node.addEventListener(`click`, event => {
                    event.stopPropagation();
                    document.querySelector(`.tileTypeSelector[selected]`)
                        .toggleAttribute(`selected`);
                    event.currentTarget.toggleAttribute(`selected`);
                    this.map.setTileType(event.currentTarget.dataset.tileType);
                })
            });

        containerElement
            .querySelector(`#rotateLeft`)
            .addEventListener(`click`, event => {
                event.stopPropagation();
                this.rotate(`Left`);
            });

        containerElement
            .querySelector(`#rotateRight`)
            .addEventListener(`click`, event => {
                event.stopPropagation();
                this.rotate(`Right`);
            });

        containerElement
            .addEventListener(`click`, event => {
                this.map.shouldRemoveHeight = event.altKey;
                this.map.updateTile(event.clientX, event.clientY, this.layout);
                this.mouse.drawMouse();
            });

        containerElement
            .addEventListener(`contextmenu`, event => {
                event.preventDefault();
                this.map.shouldRemoveTile = true;
                this.map.updateTile(event.clientX, event.clientY, this.layout, false);
                this.mouse.drawMouse();
            });
    }
}

const game = new Game(Layout.flat);

game.start(`#game`);
