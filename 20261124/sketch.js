let akaShiba;   // 赤柴 (玩家操作)
let kuroShiba;  // 黑柴 (AI 自由移動)
let clouds = [];
let flowers = [];

// 遊戲狀態變數
let gameState = 'PLAYING'; // 狀態: 'PLAYING', 'QUIZ', 'GAMEOVER'
let score = 0;
let questionCount = 0;
const maxQuestions = 10;
let cooldown = 0; // 相遇冷卻時間，避免連續重複觸發

// 題目相關變數
let currentQuestion = "";
let options = [];
let correctAnswer = 0;
let optionBoxes = []; // 儲存選項按鈕的座標與大小
let feedbackText = "";
let feedbackTimer = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial, sans-serif');

  // 初始化赤柴 (左下位置)
  akaShiba = {
    x: width * 0.25,
    y: height * 0.7,
    speed: 5,
    dir: 1 // 1 朝右, -1 朝左
  };

  // 初始化黑柴 (右下位置)
  kuroShiba = {
    x: width * 0.75,
    y: height * 0.7,
    vx: 2,
    vy: 1.5,
    dir: -1,
    changeDirTimer: 0
  };

  // 初始化白雲
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: random(width),
      y: random(height * 0.08, height * 0.35),
      speed: random(0.3, 0.8),
      size: random(0.8, 1.3)
    });
  }

  // 初始化草原小花
  for (let i = 0; i < 30; i++) {
    flowers.push({
      x: random(width),
      y: random(height * 0.52, height * 0.96),
      color: random(['#FFFFFF', '#FFEB3B', '#FF8A80'])
    });
  }
}

function draw() {
  // 1. 繪製背景場景 (天空、太陽、雲朵、草原、小花)
  drawScenery();

  // 2. 更新角色邏輯與繪製
  if (gameState === 'PLAYING') {
    updateAkaShiba();
    updateKuroShiba();

    if (cooldown > 0) {
      cooldown--;
    } else {
      checkCollision();
    }
  }

  // 繪製兩隻柴犬 (依照 Y 軸排序產生前後遮擋立體感)
  if (akaShiba.y < kuroShiba.y) {
    drawShiba(akaShiba.x, akaShiba.y, 'aka', akaShiba.dir);
    drawShiba(kuroShiba.x, kuroShiba.y, 'kuro', kuroShiba.dir);
  } else {
    drawShiba(kuroShiba.x, kuroShiba.y, 'kuro', kuroShiba.dir);
    drawShiba(akaShiba.x, akaShiba.y, 'aka', akaShiba.dir);
  }

  // 3. 繪製左上角計分板與操作提示
  drawHUD();

  // 4. 繪製答題回饋訊息 (答對/答錯提示)
  if (feedbackTimer > 0) {
    drawFeedback();
    feedbackTimer--;
  }

  // 5. 根據遊戲狀態繪製介面
  if (gameState === 'QUIZ') {
    drawQuizModal();
  } else if (gameState === 'GAMEOVER') {
    drawGameOverModal();
  }
}

// --- 場景繪製 ---
function drawScenery() {
  // 天空
  background('#87CEEB');

  // 太陽
  noStroke();
  fill('#FFD54F');
  circle(width * 0.88, height * 0.15, 90);
  fill(255, 213, 79, 80);
  circle(width * 0.88, height * 0.15, 120);

  // 雲朵
  fill(255, 255, 255, 220);
  for (let c of clouds) {
    c.x += c.speed;
    if (c.x > width + 100) c.x = -100;
    push();
    translate(c.x, c.y);
    scale(c.size);
    circle(0, 0, 50);
    circle(30, -10, 60);
    circle(65, 0, 50);
    circle(30, 10, 45);
    pop();
  }

  // 遠方山丘
  fill('#7CB342');
  ellipse(width * 0.2, height * 0.52, width * 0.6, 180);
  ellipse(width * 0.8, height * 0.52, width * 0.7, 220);

  // 主草原
  fill('#8BC34A');
  rect(0, height * 0.5, width, height * 0.5);

  // 草原上的小花
  for (let f of flowers) {
    fill(f.color);
    circle(f.x, f.y, 8);
    fill('#FFA000');
    circle(f.x, f.y, 3);
  }
}

// --- 赤柴控制 (方向鍵或 WASD) ---
function updateAkaShiba() {
  let moved = false;
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // A
    akaShiba.x -= akaShiba.speed;
    akaShiba.dir = -1;
    moved = true;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // D
    akaShiba.x += akaShiba.speed;
    akaShiba.dir = 1;
    moved = true;
  }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // W
    akaShiba.y -= akaShiba.speed;
    moved = true;
  }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { // S
    akaShiba.y += akaShiba.speed;
    moved = true;
  }

  // 限制赤柴只能在草原範圍內移動
  akaShiba.x = constrain(akaShiba.x, 50, width - 50);
  akaShiba.y = constrain(akaShiba.y, height * 0.52, height - 45);
}

// --- 黑柴自由移動 ---
function updateKuroShiba() {
  kuroShiba.changeDirTimer--;
  if (kuroShiba.changeDirTimer <= 0) {
    // 隨機改變方向與速度
    let angle = random(TWO_PI);
    let spd = random(1.8, 3.2);
    kuroShiba.vx = cos(angle) * spd;
    kuroShiba.vy = sin(angle) * spd;
    kuroShiba.changeDirTimer = int(random(60, 150));
  }

  kuroShiba.x += kuroShiba.vx;
  kuroShiba.y += kuroShiba.vy;

  // 碰到邊界反彈
  if (kuroShiba.x < 50 || kuroShiba.x > width - 50) {
    kuroShiba.vx *= -1;
    kuroShiba.x = constrain(kuroShiba.x, 50, width - 50);
  }
  if (kuroShiba.y < height * 0.52 || kuroShiba.y > height - 45) {
    kuroShiba.vy *= -1;
    kuroShiba.y = constrain(kuroShiba.y, height * 0.52, height - 45);
  }

  // 更新朝向
  if (kuroShiba.vx > 0.1) kuroShiba.dir = 1;
  if (kuroShiba.vx < -0.1) kuroShiba.dir = -1;
}

// --- 繪製柴犬函數 ---
function drawShiba(x, y, type, dir) {
  push();
  translate(x, y);
  scale(dir, 1); // 根據方向左右翻轉

  // 配色設定
  let mainColor = type === 'aka' ? '#E08E45' : '#2C2C2C'; // 赤柴橘 vs 黑柴黑
  let subColor = '#FFF8E7'; // 奶白色腹部與臉頰
  let browColor = type === 'aka' ? '#FFF8E7' : '#D49A6A'; // 黑柴豆豆眉為咖啡色

  // 地面陰影
  noStroke();
  fill(0, 0, 0, 40);
  ellipse(0, 32, 75, 20);

  // 捲捲尾巴
  stroke(mainColor);
  strokeWeight(11);
  noFill();
  arc(-35, -5, 24, 24, PI * 0.5, TWO_PI);

  noStroke();
  // 後腳
  fill(mainColor);
  rect(-26, 12, 11, 20, 5);
  rect(14, 12, 11, 20, 5);

  // 身體
  fill(mainColor);
  ellipse(0, 5, 68, 42);
  // 胸前白毛
  fill(subColor);
  arc(18, 6, 32, 34, -HALF_PI, HALF_PI);

  // 前腳
  fill(mainColor);
  rect(-16, 15, 11, 20, 5);
  rect(20, 15, 11, 20, 5);

  // 頭部區塊
  push();
  translate(26, -18);

  // 後耳
  fill(mainColor);
  triangle(-8, -14, -18, -32, 2, -20);

  // 頭型
  fill(mainColor);
  circle(0, 0, 44);

  // 臉頰白毛 (柴犬招牌配色)
  fill(subColor);
  ellipse(6, 7, 34, 24);
  ellipse(16, 5, 18, 15); // 吻部

  // 前耳
  fill(mainColor);
  triangle(-2, -14, -8, -34, 8, -18);
  fill('#F4B886'); // 耳內粉膚色
  triangle(-2, -16, -6, -29, 4, -19);

  // 豆豆眉
  fill(browColor);
  circle(5, -7, 5);
  circle(15, -7, 5);

  // 眼睛
  fill('#1A1A1A');
  circle(7, -1, 5);
  circle(17, -1, 5);
  fill(255);
  circle(8, -2, 2); // 眼神光
  circle(18, -2, 2);

  // 鼻子
  fill('#1A1A1A');
  circle(23, 3, 6);

  // 微笑嘴巴
  stroke('#1A1A1A');
  strokeWeight(1.5);
  noFill();
  arc(19, 7, 8, 6, 0, PI);
  pop();

  pop();
}

// --- 相遇碰撞偵測 ---
function checkCollision() {
  let d = dist(akaShiba.x, akaShiba.y, kuroShiba.x, kuroShiba.y);
  if (d < 65) {
    generateQuestion();
    gameState = 'QUIZ';
  }
}

// --- 產生數學加減選擇題 ---
function generateQuestion() {
  questionCount++;
  let isAddition = random() > 0.5;
  let num1, num2;

  if (isAddition) {
    num1 = int(random(1, 50));
    num2 = int(random(1, 50));
    correctAnswer = num1 + num2;
    currentQuestion = `第 ${questionCount} 題： ${num1} + ${num2} = ?`;
  } else {
    num1 = int(random(15, 99));
    num2 = int(random(1, num1)); // 確保結果不為負數
    correctAnswer = num1 - num2;
    currentQuestion = `第 ${questionCount} 題： ${num1} - ${num2} = ?`;
  }

  // 產生 3 個不重複的選項 (1個正確 + 2個干擾項)
  options = [correctAnswer];
  while (options.length < 3) {
    let offset = int(random(-10, 11));
    let wrongAns = correctAnswer + offset;
    if (offset !== 0 && wrongAns >= 0 && !options.includes(wrongAns)) {
      options.push(wrongAns);
    }
  }
  // 打亂選項順序
  options = shuffle(options);
}

// --- 繪製遊戲資訊列 (HUD) ---
function drawHUD() {
  fill(0, 0, 0, 120);
  noStroke();
  rect(20, 20, 290, 90, 12);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text(`進度：${questionCount} / ${maxQuestions} 題`, 36, 32);
  text(`答對題數：${score} 題`, 36, 60);
  textSize(13);
  fill('#FFE082');
  text("操作方式：使用 方向鍵 或 WASD 移動赤柴", 36, 86);
}

// --- 繪製答題回饋 ---
function drawFeedback() {
  push();
  textAlign(CENTER, CENTER);
  textSize(28);
  stroke(0);
  strokeWeight(4);
  fill(feedbackText.includes("答對") ? '#69F0AE' : '#FF5252');
  text(feedbackText, width / 2, height * 0.25);
  pop();
}

// --- 繪製數學選擇題視窗 ---
function drawQuizModal() {
  // 半透明黑色遮罩
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);

  // 題目卡片底框
  let boxW = min(460, width * 0.9);
  let boxH = 320;
  let boxX = width / 2 - boxW / 2;
  let boxY = height / 2 - boxH / 2;

  fill('#FFFDF7');
  stroke('#E08E45');
  strokeWeight(5);
  rect(boxX, boxY, boxW, boxH, 20);

  // 標題與題目文字
  noStroke();
  fill('#E08E45');
  textAlign(CENTER, CENTER);
  textSize(20);
  text("🐕 兩隻柴犬相遇了！請回答問題：", width / 2, boxY + 45);

  fill('#333333');
  textSize(32);
  textStyle(BOLD);
  text(currentQuestion, width / 2, boxY + 105);
  textStyle(NORMAL);

  // 繪製 3 個選項按鈕
  optionBoxes = [];
  let btnW = 100;
  let btnH = 65;
  let gap = 25;
  let startX = width / 2 - (btnW * 3 + gap * 2) / 2;
  let btnY = boxY + 185;

  for (let i = 0; i < options.length; i++) {
    let bx = startX + i * (btnW + gap);
    optionBoxes.push({ x: bx, y: btnY, w: btnW, h: btnH, value: options[i] });

    // 滑鼠懸停變色效果
    let isHover = mouseX > bx && mouseX < bx + btnW && mouseY > btnY && mouseY < btnY + btnH;
    fill(isHover ? '#FFB74D' : '#8BC34A');
    stroke('#558B2F');
    strokeWeight(2);
    rect(bx, btnY, btnW, btnH, 12);

    // 選項數字
    noStroke();
    fill(255);
    textSize(26);
    text(options[i], bx + btnW / 2, btnY + btnH / 2);
  }
}

// --- 繪製結束結算畫面 ---
function drawGameOverModal() {
  fill(0, 0, 0, 160);
  rect(0, 0, width, height);

  let boxW = min(440, width * 0.9);
  let boxH = 280;
  let boxX = width / 2 - boxW / 2;
  let boxY = height / 2 - boxH / 2;

  fill('#FFFDF7');
  stroke('#8BC34A');
  strokeWeight(5);
  rect(boxX, boxY, boxW, boxH, 20);

  noStroke();
  fill('#333333');
  textAlign(CENTER, CENTER);
  textSize(30);
  textStyle(BOLD);
  text("🎉 挑戰完成！", width / 2, boxY + 55);
  textStyle(NORMAL);

  textSize(24);
  text(`總共 ${maxQuestions} 題，你答對了 ${score} 題！`, width / 2, boxY + 115);

  // 重新開始按鈕
  let btnW = 180;
  let btnH = 55;
  let btnX = width / 2 - btnW / 2;
  let btnY = boxY + 175;
  optionBoxes = [{ x: btnX, y: btnY, w: btnW, h: btnH, value: 'RESTART' }];

  let isHover = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  fill(isHover ? '#FF9800' : '#E08E45');
  rect(btnX, btnY, btnW, btnH, 12);

  fill(255);
  textSize(22);
  text("再玩一次", width / 2, btnY + btnH / 2);
}

// --- 滑鼠點擊事件處理 ---
function mousePressed() {
  if (gameState === 'QUIZ') {
    for (let btn of optionBoxes) {
      if (mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
        // 檢查答案
        if (btn.value === correctAnswer) {
          score++;
          feedbackText = "⭕ 答對了！好棒！";
        } else {
          feedbackText = `❌ 答錯囉！正確答案是 ${correctAnswer}`;
        }
        feedbackTimer = 90; // 顯示提示約 1.5 秒

        // 判斷是否已達 10 題
        if (questionCount >= maxQuestions) {
          gameState = 'GAMEOVER';
        } else {
          gameState = 'PLAYING';
          cooldown = 120; // 設定 2 秒冷卻時間，讓兩隻柴犬有時間分開
        }
        break;
      }
    }
  } else if (gameState === 'GAMEOVER') {
    let btn = optionBoxes[0];
    if (btn && mouseX > btn.x && mouseX < btn.x + btn.w && mouseY > btn.y && mouseY < btn.y + btn.h) {
      // 重置遊戲狀態
      score = 0;
      questionCount = 0;
      cooldown = 60;
      akaShiba.x = width * 0.25;
      akaShiba.y = height * 0.7;
      kuroShiba.x = width * 0.75;
      kuroShiba.y = height * 0.7;
      gameState = 'PLAYING';
    }
  }
}

// --- 視窗大小改變時自動調整全螢幕畫布 ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}