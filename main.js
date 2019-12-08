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
        this.selectedHexes = [];
        this.maxHeight = 4;
        this.minHeight = -4;
        this.tileType = `grass`;
        this.hue = 120;
        this.shouldRemoveHeight = false;
        this.shouldRemoveTile = false;
        this.layout = layout;
    }


    rotate(direction) {
        if (direction === undefined) throw new Error("Direction for rotation is undefined");
        this.selectedHexes.forEach(hex => {
            const rotation = `rotate${direction}`;
            hex.location = hex.location[rotation]();
        });

        this.draw();
    }

    setTileType(type) {
        this.tileType = type;

        switch (type) {
            case `grass`:
                this.hue = 120;
                break;
            case `water`:
                this.hue = 250;
                break;
            case `stone`:
                this.hue = 200;
                break;
            case `dessert`:
                this.hue = 50;
                break;
            default:
                break;
        }
    }

    draw(layout = this.layout) {
        this.animate(() => {
            this.selectedHexes.forEach(hex => {
                this.drawHex(
                    layout.polygonCorners(hex.location),
                    true,
                    {
                        color: `hsl(${hex.hue + hex.height * 5}, ${50 + hex.height * 10}%, ${50 + hex.height * 10}%)`
                    }
                );
            });
        });
    }

    updateTile(x, y, layout) {
        const clickedHex = layout.pixelToHex(new Point(x, y)).round();
        const hexIndex = this.selectedHexes.findIndex(hex => hex.location.isSame(clickedHex));

        // Add hex to list if one doesn't exist
        if (hexIndex === -1) {
            this.selectedHexes.push({
                location: clickedHex,
                hue: this.hue,
                height: 0
            });
        } else { // Modify existing hex
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

        this.draw(layout);
    }
}

class Mouse extends HexDrawer {
    constructor(selector) {
        super(selector);
    }

    drawMouse(x, y, layout, ...args) {
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
                this.map.updateTile(event.clientX, event.clientY, this.layout)
            });

        containerElement
            .addEventListener(`contextmenu`, event => {
                event.preventDefault();
                this.map.shouldRemoveTile = true;
                this.map.updateTile(event.clientX, event.clientY, this.layout)
            });
    }
}

const game = new Game(Layout.flat);

game.start(`#game`);
