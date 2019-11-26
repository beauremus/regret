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

    update(points, ...args) {
        this.clear();
        points.forEach(point => {
            this.drawCanvas(
                layout.polygonCorners(
                    layout.pixelToHex(
                        new Point(point.x, point.y)
                    ).round()
                ),
                ...args
            )
        });
        this.shouldRAF = true;
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
    constructor(selector) {
        super(selector);
    }

    drawGrid(layout) {
        return () => {
            for (let qq = 0; qq < window.innerWidth; qq++) {
                const qOffset = Math.floor(qq / 2);
                for (let rr = -qOffset; rr < window.innerHeight - qOffset; rr++) {
                    this.drawHex(layout.polygonCorners(new Hex(qq, rr, -qq - rr)));
                }
            }
        }
    }
}

class Map extends HexDrawer {
    constructor(selector, draw) {
        super(selector, draw);
        this.selectedHexes = [];
        this.maxHeight = 4;
        this.minHeight = -4;
        this.tileType = `grass`;
        this.hue = 120;
        this.shouldRemoveHeight = false;
        this.shouldRemoveTile = false;
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

    update(x, y, layout) {
        return () => {
            const clickedHex = layout.pixelToHex(new Point(x, y)).round();
            const hexIndex = this.selectedHexes.findIndex(hex => hex.location.isSame(clickedHex));

            if (hexIndex === -1) {
                this.selectedHexes.push({
                    location: clickedHex,
                    hue: this.hue,
                    height: 0
                });
            } else {
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

            this.clear();

            this.selectedHexes.forEach(hex => {
                this.drawHex(
                    layout.polygonCorners(hex.location),
                    true,
                    {
                        color: `hsl(${hex.hue + hex.height * 5}, ${50 + hex.height * 10}%, ${50 + hex.height * 10}%)`
                    }
                );
            });

            this.shouldRAF = true;
        }
    }
}

class Mouse extends HexDrawer {
    constructor(selector) {
        super(selector);
    }

    drawMouse(x, y, layout, ...args) {
        return () => {
            this.clear();
            this.drawHex(
                layout.polygonCorners(
                    layout.pixelToHex(
                        new Point(x, y)
                    ).round()
                ),
                true,
                ...args
            );
            this.shouldRAF = true;
        }
    }
}
class Game {
    constructor() {
        this.layout = new Layout(
            Layout.flat,
            new Point(28.0, 12.0),
            new Point(0, 0)
        );
    }

    start(container) {
        this.grid = new Grid(`${container} > #grid`);
        this.map = new Map(`#map`);
        this.mouse = new Mouse(`#mouse`);

        requestAnimationFrame(this.grid.drawGrid(this.layout));

        document.querySelector(container)
            .addEventListener(`mousemove`, event => {
                if (this.mouse.shouldRAF) {
                    this.mouse.shouldRAF = false;
                    requestAnimationFrame(
                        this.mouse.drawMouse(event.clientX, event.clientY, this.layout)
                    );
                }
            });

        document.querySelector(container)
            .querySelectorAll(`.tileTypeSelector`)
            .forEach(node => {
                node.addEventListener(`click`, event => {
                    event.stopPropagation();
                    this.map.setTileType(event.currentTarget.dataset.tileType);
                })
            });

        document.querySelector(container)
            .addEventListener(`click`, event => {
                if (this.map.shouldRAF) {
                    this.map.shouldRAF = false;
                    this.map.shouldRemoveHeight = event.altKey;
                    requestAnimationFrame(
                        this.map.update(event.clientX, event.clientY, this.layout)
                    );
                }
            });

        document.querySelector(container)
            .addEventListener(`contextmenu`, event => {
                event.preventDefault();
                if (this.map.shouldRAF) {
                    this.map.shouldRAF = false;
                    this.map.shouldRemoveTile = true;
                    requestAnimationFrame(
                        this.map.update(event.clientX, event.clientY, this.layout)
                    );
                }
            });
    }
}

const game = new Game();

game.start(`#game`);