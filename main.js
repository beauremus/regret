class Canvas {
  constructor(selector, draw) {
    this.canvas = document.querySelector(selector);
    this.ctx = this.canvas.getContext('2d');
    this.shouldRAF = true;
    this.draw = draw;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

  update(x, y, filled) {
    return () => {
            this.clear();
        this.draw(
            layout.polygonCorners(
                layout.pixelToHex(
                    new Point(x, y)
                ).round()
            ),
            filled
        );
        this.shouldRAF = true;
    }
  }
}

class Grid extends Canvas {
    constructor(selector, draw) {
        super(selector, draw);
    }

    update(x, y) {
        return () => {
            const newHex = layout.pixelToHex(new Point(x, y)).round();
            this.selectedHexes.push(newHex);

            this.clear();

            this.selectedHexes.forEach(hex => {
                this.draw(layout.polygonCorners(hex), true);
            });

            this.shouldRAF = true;
        }
    }
}

class Map extends Canvas {
    constructor(selector, draw) {
        super(selector, draw);
        this.selectedHexes = [];
    }

    update(x, y) {
        return () => {
            const newHex = layout.pixelToHex(new Point(x, y)).round();
            this.selectedHexes.push(newHex);

            clearCanvas.call(this);

            this.clear();

            this.selectedHexes.forEach(hex => {
                this.draw(layout.polygonCorners(hex), true);
            });

            this.shouldRAF = true;
        }
    }
}

class Mouse extends Canvas {
    constructor(selector, draw) {
        super(selector, draw);
    }

    update(x, y) {
        return () => {
            const newHex = layout.pixelToHex(new Point(x, y)).round();
            this.selectedHexes.push(newHex);

            this.clear();

            this.selectedHexes.forEach(hex => {
                this.draw(layout.polygonCorners(hex), true);
            });

            this.shouldRAF = true;
        }
    }
}

function drawHex(hex, filled) {
    this.ctx.beginPath();
    this.ctx.moveTo(hex[0].x, hex[0].y);

    for (let point of hex) {
      this.ctx.lineTo(point.x, point.y);
    }

    this.ctx.lineTo(hex[0].x, hex[0].y);

    if (filled) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
}

function drawMap(layout) {
    return function () {
        for (let qq = 0; qq < window.innerWidth; qq++) {
            const qOffset = Math.floor(qq/2);
            for (let rr = -qOffset; rr < window.innerHeight - qOffset; rr++) {
                drawHex.call(this, layout.polygonCorners(new Hex(qq, rr, -qq-rr)));
            }
        }
    }
}

const layout = new Layout(
    Layout.flat,
    new Point(28.0, 12.0),
    new Point(0, 0)
);

const grid = new Canvas('#grid', drawMap(layout));

requestAnimationFrame(grid.draw.bind(grid));

const mouse = new Canvas('#mouse', drawHex);

document.addEventListener('mousemove', event => {
    if (mouse.shouldRAF) {
        mouse.shouldRAF = false;
        requestAnimationFrame(
            mouse.update(event.clientX, event.clientY, true)
        );
    }
});

const map = new Map('#map', drawHex);

document.addEventListener('click', event => {
    if (map.shouldRAF) {
        map.shouldRAF = false;
        requestAnimationFrame(
            map.update(event.clientX, event.clientY)
        );
    }
});
  
window.onresize = () => {
    if (grid.shouldRAF && mouse.shouldRAF) {
        console.log('rerender');
        grid.update().call(grid);
        mouse.update(event.clientX, event.clientY, true)();
    }
};
