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

    drawHex(hex, filled, options = { color: `black`, lineWidth: 1 }) {
        this.ctx.beginPath();
        this.ctx.moveTo(hex[0].x, hex[0].y);

        for (let point of hex) {
            this.ctx.lineTo(point.x, point.y);
        }

        this.ctx.lineTo(hex[0].x, hex[0].y);

        if (filled) {
            this.ctx.fillStyle = options.color;
            this.ctx.fill();
        } else {
            this.ctx.strokeStyle = options.color;
            this.ctx.lineWidth = options.lineWidth;
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

        this.holdWait = 200;
        this.click = debounce((x, y) => {
            game.holding = true;
            const tileHeight = this.getTileHeight(x, y);

            if (tileHeight !== null) {
                this.updateHeightIndicator
                    = drawHeightIndicator({
                        ctx: this.ctx,
                        x,
                        y,
                        minHeight: this.minHeight,
                        maxHeight: this.maxHeight,
                        tileHeight: tileHeight
                    });
            }
        }, this.holdWait);
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

    refresh(shouldDraw = true) {
        localStorage.setItem('map', JSON.stringify(this.selectedHexes));

        if (shouldDraw)
        this.draw(this.layout);
    }

    setTileHeight(x, y, newHeight) {
        const hexIndex = this.findHexFromPoint(x, y);
        if (hexIndex !== -1) {
            this.selectedHexes[hexIndex].height = newHeight;
            this.refresh(false);
            return newHeight;
        }
        return null;
    }

    rotate(direction) {
        if (direction === undefined) throw new Error("Direction for rotation is undefined");
        this.selectedHexes.forEach(hex => {
            const rotation = `rotate${direction}`;
            hex.location = hex.location[rotation]();
        });

        this.refresh();
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

    increaseHeight(hexIndex) {
        if (hexIndex === -1) return;
        if (this.selectedHexes[hexIndex].height < this.maxHeight) {
            ++this.selectedHexes[hexIndex].height;
        }

        this.refresh();
    }

    decreaseHeight(hexIndex) {
        if (hexIndex === -1) return;
        if (this.selectedHexes[hexIndex].height > this.minHeight) {
            --this.selectedHexes[hexIndex].height;
        }

        this.refresh();
    }

    clearHexes() {
        this.selectedHexes = [];
        this.refresh();
    }

    removeHex({ x, y }) {
        const hexIndex = this.findHexFromPoint(x, y);

        if (hexIndex === -1) return;
        this.selectedHexes.splice(hexIndex, 1);

        this.refresh();
    }

    insert(hex) {
        this.selectedHexes.push({
            location: hex,
            hue: this.hue,
            saturation: this.saturation,
            lightness: this.lightness,
            height: 0
        });

        this.refresh();
    }

    updateType(hexIndex) {
        this.selectedHexes[hexIndex].hue = this.hue;
        this.selectedHexes[hexIndex].saturation = this.saturation;
        this.selectedHexes[hexIndex].lightness = this.lightness;
        this.selectedHexes[hexIndex].height = -1;
    }

    upsert({ x, y, shouldDecreaseHeight } = { shouldDecreaseHeight: false }) {
        const hexIndex = this.findHexFromPoint(x, y);
        const clickedHex = this.pointToHex(x, y, this.layout);

        // Hex doesn't exist
        if (hexIndex === -1) {
            if (shouldDecreaseHeight) {
                // Trying to reduce height on tile that doesn't exist, bail out
                return;
            } else {
                this.insert(clickedHex);
            }
        } else { // Modify existing hex
            if (this.selectedHexes[hexIndex].hue !== this.hue) {
                this.updateType(hexIndex);
            }

            if (shouldDecreaseHeight) {
                this.decreaseHeight(hexIndex);
            } else {
                this.increaseHeight(hexIndex);
            }
        }
    }

    showHeight(x, y) {
        this.click.hold(x, y);
    }

    hideHeight() {
        this.click.clear();
        this.draw();
    }
}

class Mouse extends HexDrawer {
    constructor(selector, layout) {
        super(selector);
        this.layout = layout;
        this.x = 0;
        this.y = 0;
    }

    drawMouse(x, y, ...args) {
        this.x = x;
        this.y = y;
        this.animate(() => {
            this.drawHex(
                this.layout.polygonCorners(
                    this.layout.pixelToHex(
                        new Point(x, y)
                    ).round()
                ),
                false,
                {
                    color: 'blue',
                    lineWidth: 3,
                    ...args
                }
            );
        });
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
        this.holding = false;
        this.isMouseCaptured = false;
    }

    update() {
        this.grid.draw();
        this.map.draw();
    }

    rotate(direction) {
        this.map.rotate(direction);
    }

    handleHeightAdjustment(originX, originY) {
        return (event) => {
            // TODO: NOT WORKING
            const newHeight = this.map.updateHeightIndicator({ newY: event.clientY });
            this.map.setTileHeight(originX, originY, newHeight);
        }
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
                this.mouse.drawMouse(event.clientX, event.clientY);
            });

        containerElement
            .querySelectorAll(`.tileTypeSelector`)
            .forEach(node => {
                node.addEventListener(`click`, event => {
                    // Prevent ancestral container from running events
                    event.stopPropagation();
                    // Turn off selected attribute on exiting selected element
                    document.querySelector(`.tileTypeSelector[selected]`)
                        .toggleAttribute(`selected`);
                    // Turn on selected attribute on clicked element
                    event.currentTarget.toggleAttribute(`selected`);
                    this.map.setTileType(event.currentTarget.dataset.tileType);
                })
            });

        containerElement
            .querySelector(`#rotateLeft`)
            .addEventListener(`click`, event => {
                // Prevent ancestral container from running events
                event.stopPropagation();
                this.rotate(`Left`);
            });

        containerElement
            .querySelector(`#rotateRight`)
            .addEventListener(`click`, event => {
                // Prevent ancestral container from running events
                event.stopPropagation();
                this.rotate(`Right`);
            });

        containerElement
            .addEventListener(`mousedown`, event => {
                this.map.showHeight(event.clientX, event.clientY);
                this.eventStorage = this.handleHeightAdjustment(event.clientX, event.clientY);
                containerElement
                    .addEventListener(`mousemove`, this.eventStorage);
            });

        containerElement
            .addEventListener(`mouseup`, event => {
                this.map.hideHeight();
                containerElement
                    .removeEventListener(`mousemove`, this.eventStorage);

                if (this.isMouseCaptured) {
                    this.isMouseCaptured = false;
                } else {
                    if (this.holding) {
                        this.holding = false;
                    } else {
                        this.map.upsert({
                            x: event.clientX,
                            y: event.clientY,
                            shouldDecreaseHeight: event.altKey
                        });
                    }
                }
            });

        containerElement
            .addEventListener(`contextmenu`, event => {
                event.preventDefault();
                this.isMouseCaptured = true;
                this.map.removeHex({ x: event.clientX, y: event.clientY });
            });
    }
}

const game = new Game(Layout.flat);

game.start(`#game`);
