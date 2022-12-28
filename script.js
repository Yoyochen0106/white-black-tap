
class TextStack {
  constructor() {
    this.buffer = [];
  }

  push(text) {
    this.buffer.push(text);
  }

  draw(x, y) {
    push();
    fill(0);
    textSize(20);
    stroke(255, 255, 255, 128);
    strokeWeight(10);
    this.buffer.forEach(str => {
      text(str, x, y);
      y += 30;
    });
    this.buffer = [];
    pop()
  }
}

let Handle_root = {
  x: 0,
  y: 0,
}
class Handle {

  constructor(relX, relY, m = Handle_root) {
    this.relX = relX;
    this.relY = relY;
    this.m = m;
  }

  get x() { return this.m.x + this.relX; }
  get y() { return this.m.y + this.relY; }
  get master() { return this.m; }

  touchMouse() {
    let dist = Math.hypot(mouseX - this.x, mouseY - this.y);
    if (dist < 10) {
      return true;
    } else {
      return false;
    }
  }

  update(relX, relY) {
    this.relX += relX;
    this.relY += relY;
  }
}

function lineLineIntersection(A, B, C, D)
{
    // Line AB represented as a1x + b1y = c1
    let a1 = B.y - A.y;
    let b1 = A.x - B.x;
    let c1 = a1*(A.x) + b1*(A.y);

    // Line CD represented as a2x + b2y = c2
    let a2 = D.y - C.y;
    let b2 = C.x - D.x;
    let c2 = a2*(C.x)+ b2*(C.y);

    let determinant = a1*b2 - a2*b1;

    if (determinant === 0)
    {
        // The lines are parallel. This is simplified
        // by returning a pair of FLT_MAX
        return null;
    }
    else
    {
        let x = (b2*c1 - b1*c2)/determinant;
        let y = (a1*c2 - a2*c1)/determinant;
        return { x: x, y: y };
    }
}

function segmentFitScreen(p1, p2) {
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  let toLeft_DistY = p1.x / dx * dy;
  let toTop_DistX = p1.y / dy * dx;
  let toRight_DistY = (width - p2.x) / dx * dy;
  let toBottom_DistX = (height - p2.y) / dy * dx;
  let lowSide1 = { x: p1.x - toTop_DistX, y: 0 };
  let lowSide2 = { x: 0, y: p1.y - toLeft_DistY };
  let highSide1 = { x: p2.x + toBottom_DistX, y: height };
  let highSide2 = { x: width, y: p2.y + toRight_DistY };

  let screenCenter = { x: width / 2, y: height / 2 };
  let pts = [lowSide1, lowSide2, highSide1, highSide2];
  pts.sort((a, b) => {
    return distance(a, screenCenter) - distance(b, screenCenter);
  })

  return pts.slice(0, 2);
}

function dashLine(x1, y1, x2, y2, dashLength) {
  let percentageLength = dashLength / dist(x1, y1, x2, y2);
  for (let p = 0; p < 1; p += 2 * percentageLength) {
    line(
      lerp(x1, x2, p),
      lerp(y1, y2, p),
      lerp(x1, x2, p + percentageLength),
      lerp(y1, y2, p + percentageLength),
    );
  }
}

function distance(p1, p2) {
  return Math.hypot(p1.x-p2.x, p1.y-p2.y);
}

function lsToPt(ls) {
  return { x: ls[0], y: ls[1] };
};

let canvasMarginX = 0;
let canvasMarginY = 0;

function setup() {
  createCanvas(windowWidth - canvasMarginX, windowHeight - canvasMarginY);
  frameRate(60);

  scrD.width = windowWidth;
  scrD.height = windowHeight;
  scrD.blkW = scrD.width / scrD.columns;
  scrD.blkH = scrD.height / scrD.rows;
  renderer.setData(0, scrD);
}

let textStack = new TextStack();

class Renderer {
  constructor() {
    this.data = [];
  }
  setData(index, data) {
    this.data[index] = data;
  }

  render() {
    push();
    noStroke();

    let scrD = this.data[0];
    let lvD = this.data[1];
    let blkW = scrD.blkW;
    let blkH = scrD.blkH;

    let mx = Math.floor(mouseX / blkW);
    let my = Math.floor(mouseY / blkH);

    let vertShift = lvD.animRatio * blkH;

    for (let r = 0; r < scrD.rows; r++) {
      for (let c = 0; c < scrD.columns; c++) {
        let doFill = false;
        if (mx == c && my == r) {
          fill(0, 0, 255);
          let px = blkW * c;
          let py = blkH * r;
          // rect(px, vertShift + py, blkW, blkH);
        }
        if (lvD.isBlack(r, c)) {
          fill(0);
          let px = blkW * c;
          let py = height - blkH - blkH * r;
          let m = 1;
          rect(px+m, vertShift + py+m, blkW-m*2, blkH-m*2);
        }
    }
    }
    pop();
  }
}

class LevelProvider {
  constructor(columns) {
    this.last = 0;
    this.lastLR = 'L';
    this.columns = columns;

    this.collapseCount = 0;
    this.preview = [];
  }

  isBlack(r, c) {
    while (r > this.preview.length - 1) {
      // console.log(`add ${this.preview.length}`);
      this.preview.push(this.nextRow());
    }
    // console.log(`pvg ${this.preview.length} ${r} ${c}`);
    return this.preview[r].includes(c);
  }

  nextRow() {
    let c = this.columns;
    let rn = Math.random();
    let nextBlack;
    if (this.lastLR == 'L') {
      nextBlack = Math.floor(map(rn, 0, 1, this.last + 1, c));
      nextBlack = Math.min(c - 1, nextBlack);
      nextBlack = Math.max(1, nextBlack);
      this.lastLR = 'R';
    } else {
      nextBlack = Math.floor(map(rn, 0, 1, 0, this.last));
      nextBlack = Math.min(c - 1, nextBlack);
      nextBlack = Math.max(0, nextBlack);
      this.lastLR = 'L';
    }
    this.last = nextBlack;
    return [nextBlack];
  }

  collapseRows(count) {
    if (count == 0) return;
    while (count--) {
      this.preview.shift();
      this.collapseCount++;
    }
  }
}

class Interactor {
  constructor(levelProvider) {
    this.levelProvider = levelProvider;
    this.animRatio = 0;
    this.isMouseReleased = true;
  }

  update() {
    this.animRatio = this.animRatio * 0.8;
  }

  mouseUp() {
    this.isMouseReleased = true;
  }

  mouseDown(x, y) {
    if (!this.isMouseReleased)
      return;
    let lvp = this.levelProvider;
    let col = Math.floor(x / scrD.blkW);
    console.log(col);
    this.isMouseReleased = false;
    if (lvp.isBlack(0, col)) {
      console.log("clicked");
      lvp.collapseRows(1);
      this.animRatio = -1;
    }
    console.log("nope");
  }
}


let scrD = {
  rows: 10,
  columns: 5,
};
;
let lvD;

let renderer = new Renderer();
let levelProvider = new LevelProvider(scrD.columns);
let interactor = new Interactor(levelProvider);

let animRatio = 0;

function draw() {
  background(220);

  strokeWeight(2);

  renderer.setData(1, {
    isBlack: (r, c) => levelProvider.isBlack(r, c),
    animRatio: interactor.animRatio,
  })

  noStroke();
  fill(color(0));

  interactor.update();
  renderer.render();

  // textStack.push('123890');
  // textStack.draw(20, 40);
}

function mousePressed() {
  interactor.mouseDown(mouseX, mouseY);
}

function mouseClicked() {
  interactor.mouseUp();
}

function mouseDragged() {
  if (mouseButton === CENTER) {
  }
  if (mouseButton === LEFT) {
  }
  return false;
}

function mouseReleased() {
}

let enableTheThirdCircle = false;
function keyPressed() {
  if (key === ' ') {
  }
}

function keyReleased() {
}

function windowResized() {
  resizeCanvas(windowWidth - canvasMarginX, windowHeight - canvasMarginY);
}
