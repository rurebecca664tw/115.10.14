/* Google 試算表題庫設定：請先將試算表設為可公開檢視或發布到網路。 */ // 說明雲端資料的公開讀取條件。
/* Google Sheet 欄位：question,optionA,optionB,optionC,optionD,answer,icon。 */ // 說明題庫必須使用的欄位名稱。
/* answer 使用 0、1、2、3，依序代表 A、B、C、D。 */ // 說明正確答案的索引規則。
/* icon 使用 staff、time、note、rest、piano；按 R 可重新讀取題庫。 */ // 說明圖案欄位與重新載入方式。

const GOOGLE_SHEET_ID = "111kBeLxGMau6CMQYUSeHZYu46cuQJLleVXG-i6Uw0DE"; // 設定 Google 試算表 ID。
const GOOGLE_SHEET_GID = "133901803"; // 設定工作表 GID。
const GOOGLE_SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${GOOGLE_SHEET_GID}`; // 建立 Google 試算表 CSV 匯出網址。

const BG = "#feeac7"; // 設定全螢幕畫布的背景顏色。
const BUTTON = "#c9ada7"; // 設定導覽按鈕與重新開始按鈕的顏色。
const CORRECT = "#cad182"; // 設定答對選項與正確答案的顏色。
const WRONG = "#d88180"; // 設定答錯選項與錯誤回饋的顏色。
const INK = "#403b38"; // 設定主要文字與程式圖案的顏色。
const MUTED = "#766b66"; // 設定進度與輔助說明文字的顏色。
const TOTAL = 5; // 設定每次測驗固定抽取五題。
const POINTS = 20; // 設定每題分數為二十分。
const VALID_ICONS = ["staff", "time", "note", "rest", "piano"]; // 設定允許的程式圖案名稱。
const CSV_HEADERS = ["question", "optionA", "optionB", "optionC", "optionD", "answer", "icon"]; // 設定 CSV 必須具備的欄位。
const FETCH_TIMEOUT_MS = 12000; // 設定雲端讀取的最長等待時間。

const FALLBACK_QUESTION_BANK = [ // 建立雲端無法讀取時使用的內建備援題庫。
  { question: "五線譜中，從下往上數的第一條線是哪一個音？", options: ["Do", "Re", "Mi", "Fa"], answer: 2, icon: "staff" }, // 建立五線譜基礎題。
  { question: "在四四拍中，一小節通常有幾拍？", options: ["兩拍", "三拍", "四拍", "六拍"], answer: 2, icon: "time" }, // 建立拍號基礎題。
  { question: "四分音符在四四拍中通常等於幾拍？", options: ["半拍", "一拍", "兩拍", "四拍"], answer: 1, icon: "note" }, // 建立音符時值題。
  { question: "哪一個符號表示音樂休息或不發出聲音？", options: ["音符", "休止符", "拍號", "譜號"], answer: 1, icon: "rest" }, // 建立休止符基礎題。
  { question: "一般標準鋼琴鍵盤總共有幾顆琴鍵？", options: ["88", "87", "86", "85"], answer: 0, icon: "piano" }, // 建立鋼琴鍵盤題。
  { question: "高音譜號又常被稱為哪一種譜號？", options: ["G 譜號", "F 譜號", "C 譜號", "D 譜號"], answer: 0, icon: "staff" }, // 建立譜號基礎題。
  { question: "二分音符在四四拍中通常有幾拍？", options: ["一拍", "兩拍", "三拍", "四拍"], answer: 1, icon: "note" }, // 建立二分音符題。
  { question: "四四拍的拍號上方數字代表什麼？", options: ["每拍的音符種類", "每小節的拍數", "歌曲速度", "音量大小"], answer: 1, icon: "time" }, // 建立拍號意義題。
  { question: "全音符在四四拍中通常可以延續幾拍？", options: ["一拍", "兩拍", "三拍", "四拍"], answer: 3, icon: "note" }, // 建立全音符題。
  { question: "休止符出現時，演奏者通常應該怎麼做？", options: ["提高音量", "保持安靜", "加快速度", "重複演奏"], answer: 1, icon: "rest" }, // 建立休止符應用題。
  { question: "音樂速度較快時，演奏的感覺通常是什麼？", options: ["輕快", "完全停止", "沒有節拍", "一定很小聲"], answer: 0, icon: "time" }, // 建立速度感受題。
  { question: "五線譜由幾條平行的線組成？", options: ["三條", "四條", "五條", "六條"], answer: 2, icon: "staff" }, // 建立五線譜結構題。
  { question: "音樂開始前，大家依照拍子一起準備有助於什麼？", options: ["統一節奏", "改變歌詞", "增加琴鍵", "取消休止"], answer: 0, icon: "time" } // 建立節奏合作題。
]; // 結束內建備援題庫。

let questions = []; // 儲存目前這一場實際抽出的五題。
let availableQuestionBank = FALLBACK_QUESTION_BANK.slice(); // 儲存目前可用的完整題庫。
let questionIndex = 0; // 儲存目前題目的索引。
let answers = Array(TOTAL).fill(-1); // 儲存每題答案，負一代表尚未作答。
let completed = Array(TOTAL).fill(false); // 儲存每題是否已經作答。
let resultPage = false; // 儲存目前是否顯示結果頁。
let dataReady = false; // 儲存題庫是否已完成第一次載入處理。
let isLoading = false; // 儲存目前是否正在讀取雲端題庫。
let usingFallbackBank = true; // 儲存目前是否使用內建備援題庫。
let loadMessage = "正在載入雲端題庫…"; // 儲存載入或錯誤狀態文字。
let loadMessageIsError = false; // 儲存目前狀態是否屬於錯誤提示。
let shakeStart = 0; // 儲存答錯搖晃動畫的起始時間。
let confetti = []; // 儲存答對時飛出的彩帶粒子。
let oscillator = null; // 儲存可選用的 p5.sound 振盪器。
let soundReady = false; // 儲存 p5.sound 是否存在。
let lastTouchTime = -1000; // 儲存上一次觸控時間以避免重複觸發。
let lastTouchX = -9999; // 儲存上一次觸控的水平座標。
let lastTouchY = -9999; // 儲存上一次觸控的垂直座標。

function setup() { // 建立畫布並初始化測驗系統。
  createCanvas(max(1, windowWidth), max(1, windowHeight)); // 建立符合瀏覽器視窗大小的畫布。
  textFont("sans-serif"); // 設定跨裝置可用的無襯線字體。
  textAlign(LEFT, TOP); // 設定預設文字靠左並靠上對齊。
  textWrap(WORD); // 啟用 p5.js 的文字換行模式。
  rectMode(CORNER); // 設定矩形預設使用左上角座標。
  angleMode(RADIANS); // 設定旋轉角度使用弧度。
  noStroke(); // 設定初始繪圖不使用外框。
  soundReady = typeof p5 !== "undefined" && typeof p5.Oscillator === "function"; // 安全檢查音效函式庫是否存在。
  questions = pickRandomQuestions(availableQuestionBank); // 先使用備援題庫建立暫時測驗。
  loadQuestionBankFromGoogle(false); // 啟動第一次雲端題庫讀取。
} // 結束初始化函式。

function draw() { // 每一幀繪製整個測驗畫面。
  background(BG); // 使用指定背景色清除上一幀內容。
  if (!dataReady) { drawLoadingScreen(); } else if (resultPage) { drawResult(); } else { drawQuiz(); } // 依狀態顯示載入頁、結果頁或作答頁。
  drawConfetti(); // 更新並繪製答對時飛出的彩帶粒子。
} // 結束每幀繪圖函式。

function drawLoadingScreen() { // 繪製雲端題庫載入畫面。
  fill(INK); // 設定載入標題顏色。
  textAlign(CENTER, CENTER); // 將載入標題水平置中。
  textStyle(BOLD); // 設定載入標題使用粗體。
  textSize(constrain(width * 0.055, 24, 42)); // 依畫布寬度設定載入標題大小。
  text(loadMessage, width / 2, height * 0.42); // 顯示目前載入狀態。
  fill(MUTED); // 設定載入說明文字顏色。
  textStyle(NORMAL); // 設定載入說明使用一般字重。
  textSize(constrain(width * 0.032, 15, 22)); // 依畫布寬度設定載入說明大小。
  text("請稍候，網站正在讀取 Google 試算表。", width / 2, height * 0.53); // 顯示雲端資料讀取說明。
} // 結束載入畫面函式。

function drawQuiz() { // 繪製目前題目的作答畫面。
  const data = questions[questionIndex] || FALLBACK_QUESTION_BANK[0]; // 安全取得目前題目資料。
  const layout = getLayout(data); // 依畫布大小計算響應式版面。
  fill(MUTED); // 設定進度文字顏色。
  textStyle(NORMAL); // 設定進度文字使用一般字重。
  textSize(layout.progressSize); // 設定進度文字大小。
  textAlign(LEFT, TOP); // 設定進度文字靠左靠上對齊。
  text(`第 ${questionIndex + 1} / ${TOTAL} 題`, layout.margin, layout.progressY); // 顯示目前題數。
  fill(INK); // 設定題目文字顏色。
  textStyle(BOLD); // 設定題目文字使用粗體。
  textSize(layout.questionSize); // 設定題目文字大小。
  drawTextLines(layout.questionLines, width / 2, layout.questionY, layout.questionLineHeight, CENTER, layout.questionHeight); // 將題目自動換行並水平置中。
  drawIcon(questionIndex === 0 ? "staff" : data.icon, layout.iconBox.x + layout.iconBox.w / 2, layout.iconBox.y + layout.iconBox.h / 2, layout.iconScale); // 第一題與其他題都使用程式繪製圖案。
  layout.cards.forEach((card, index) => { drawCard(card, index, data); }); // 逐一繪製四個選項卡片。
  if (completed[questionIndex]) { drawFeedback(data, layout); } // 作答完成後顯示中央回饋。
  drawNavigation(layout); // 繪製上一題與下一題按鈕。
  if (loadMessageIsError) { drawCloudStatus(); } // 雲端失敗時顯示備援題庫狀態。
} // 結束作答畫面函式。

function drawCloudStatus() { // 繪製雲端讀取錯誤與備援狀態。
  fill(WRONG); // 設定錯誤狀態文字顏色。
  textAlign(CENTER, TOP); // 將狀態文字水平置中。
  textStyle(NORMAL); // 設定狀態文字使用一般字重。
  textSize(constrain(width * 0.022, 12, 16)); // 設定狀態文字大小。
  text(loadMessage, width / 2, max(4, height - 25)); // 在畫布底部顯示錯誤與備援資訊。
} // 結束雲端狀態函式。

function drawCard(card, index, data) { // 繪製一張選項卡片。
  const selected = answers[questionIndex]; // 取得目前題目的作答索引。
  const isAnswered = completed[questionIndex]; // 取得目前題目是否已作答。
  const isCorrect = index === data.answer; // 判斷目前卡片是否為正確答案。
  const isSelected = index === selected; // 判斷目前卡片是否為玩家選取答案。
  let cardColor = color(255, 249, 239); // 設定未作答卡片的底色。
  if (isAnswered && isCorrect) { cardColor = color(CORRECT); } // 作答後將正確答案標示為綠色。
  if (isAnswered && isSelected && !isCorrect) { cardColor = color(WRONG); } // 作答後將錯誤選項標示為紅色。
  let shift = 0; // 設定卡片預設不位移。
  if (isAnswered && isSelected && !isCorrect && millis() - shakeStart < 720) { shift = sin((millis() - shakeStart) * 0.08) * card.shake; } // 讓錯誤選項左右搖晃。
  push(); // 保存卡片繪圖狀態。
  translate(shift, 0); // 套用錯誤卡片的水平位移。
  fill(cardColor); // 設定卡片填色。
  stroke(255, 255, 255, 150); // 設定卡片半透明白色外框。
  strokeWeight(card.border); // 設定卡片外框粗細。
  rect(card.x, card.y, card.w, card.h, card.radius); // 繪製圓角卡片。
  noStroke(); // 關閉卡片文字後續不需要的外框。
  fill(INK); // 設定選項文字顏色。
  textStyle(BOLD); // 設定選項字母使用粗體。
  textSize(card.labelSize); // 設定選項字母大小。
  textAlign(LEFT, CENTER); // 將選項字母靠左並垂直置中。
  text(`${String.fromCharCode(65 + index)}.`, card.x + card.padding, card.y + card.h / 2); // 繪製 A、B、C、D 標籤。
  textStyle(NORMAL); // 設定選項內容使用一般字重。
  textSize(card.optionSize); // 設定經過量測的選項文字大小。
  drawTextLines(card.optionLines, card.x + card.textX, card.y + card.textY, card.optionLineHeight, LEFT, card.textHeight); // 將選項文字限制在卡片內並自動換行。
  pop(); // 還原卡片繪圖狀態。
} // 結束選項卡片函式。

function drawFeedback(data, layout) { // 繪製答題後的中央回饋。
  const correct = answers[questionIndex] === data.answer; // 判斷玩家是否答對。
  fill(correct ? INK : WRONG); // 依答題結果設定回饋顏色。
  textStyle(BOLD); // 設定回饋文字使用粗體。
  textSize(layout.feedbackSize); // 設定回饋文字大小。
  drawTextLines(layout.feedbackLines, width / 2, layout.feedbackY, layout.feedbackLineHeight, CENTER, layout.feedbackHeight); // 將回饋文字固定在畫面水平中央。
} // 結束回饋函式。

function drawNavigation(layout) { // 繪製題目頁的導覽按鈕。
  if (questionIndex > 0) { drawButton(layout.previous, "上一題"); } // 除第一題外顯示上一題按鈕。
  if (completed[questionIndex]) { drawButton(layout.next, questionIndex === TOTAL - 1 ? "查看結果" : "下一題"); } // 作答後顯示下一題或查看結果按鈕。
} // 結束導覽函式。

function drawButton(button, label) { // 繪製可用滑鼠與觸控操作的按鈕。
  const hover = !isTouchDevice() && inside(mouseX, mouseY, button); // 在非觸控裝置上判斷滑鼠懸停狀態。
  fill(hover ? lerpColor(color(BUTTON), color(255), 0.15) : color(BUTTON)); // 依懸停狀態設定按鈕顏色。
  noStroke(); // 設定按鈕不使用外框。
  rect(button.x, button.y, button.w, button.h, button.radius); // 繪製圓角按鈕。
  fill(INK); // 設定按鈕文字顏色。
  textStyle(BOLD); // 設定按鈕文字使用粗體。
  textSize(button.textSize); // 設定按鈕文字大小。
  textAlign(CENTER, CENTER); // 將按鈕文字水平與垂直置中。
  text(label, button.x + button.w / 2, button.y + button.h / 2); // 繪製按鈕文字。
} // 結束按鈕函式。

function drawResult() { // 繪製測驗結果頁。
  const result = getResultLayout(); // 取得結果頁響應式版面。
  const count = getCorrectCount(); // 計算答對題數。
  const score = count * POINTS; // 計算百分制總分。
  drawIcon("note", result.noteX, result.iconY, result.iconScale); // 在結果頁左側繪製音符圖案。
  drawIcon("piano", result.pianoX, result.iconY, result.iconScale); // 在結果頁右側繪製鋼琴圖案。
  fill(INK); // 設定結果標題與統計文字顏色。
  textStyle(BOLD); // 設定結果標題使用粗體。
  textSize(result.titleSize); // 設定結果標題大小。
  textAlign(CENTER, TOP); // 將結果標題水平置中並靠上繪製。
  text("測驗完成！", width / 2, result.titleY); // 顯示測驗完成標題。
  textStyle(NORMAL); // 設定統計資訊使用一般字重。
  textSize(result.bodySize); // 設定統計資訊大小。
  text(`答對題數：${count} / ${TOTAL} 題`, width / 2, result.countY); // 顯示答對題數。
  text(`總分：${score} / 100 分`, width / 2, result.scoreY); // 顯示總分。
  fill(MUTED); // 設定鼓勵文字顏色。
  textSize(result.messageSize); // 設定鼓勵文字大小。
  drawTextLines(result.messageLines, width / 2, result.messageY, result.messageLineHeight, CENTER, result.messageHeight); // 將鼓勵文字自動換行並置中。
  drawButton(result.restart, "重新開始（R）"); // 顯示重新開始按鈕。
  if (loadMessageIsError) { drawCloudStatus(); } // 雲端失敗時在結果頁顯示備援狀態。
} // 結束結果頁函式。

function makeConfetti(card) { // 建立答對時由卡片左右飛出的彩帶粒子。
  const palette = ["#e8a87c", "#82b4a8", "#9b87c8", "#f2c14e", WRONG]; // 設定彩帶粒子的顏色集合。
  const sizeScale = constrain(min(width, height) / 700, 0.55, 1.25); // 依畫布大小調整粒子比例。
  [-1, 1].forEach((side) => { // 分別處理左右兩側的發射方向。
    for (let i = 0; i < 14; i += 1) { // 每側建立十四個彩帶粒子。
      confetti.push({ x: side < 0 ? card.x : card.x + card.w, y: card.y + card.h / 2, vx: side * random(1.2, 4.2) * sizeScale, vy: random(-4.8, -1.8) * sizeScale, size: random(4, 8) * sizeScale, angle: random(TWO_PI), spin: random(-0.16, 0.16), shade: color(random(palette)), life: 255 }); // 將粒子加入彩帶陣列。
    } // 結束單側粒子迴圈。
  }); // 結束左右兩側粒子建立。
} // 結束彩帶建立函式。

function drawConfetti() { // 更新並繪製飛行中的彩帶粒子。
  confetti = confetti.filter((item) => item.life > 0); // 移除生命值歸零的粒子。
  confetti.forEach((item) => { // 逐一更新現存粒子。
    item.x += item.vx; // 更新粒子的水平位置。
    item.y += item.vy; // 更新粒子的垂直位置。
    item.vy += 0.12 * constrain(min(width, height) / 700, 0.55, 1.25); // 對粒子加入依畫布大小調整的重力。
    item.angle += item.spin; // 更新粒子旋轉角度。
    item.life -= 2; // 逐幀降低粒子生命值。
    push(); // 保存粒子繪圖狀態。
    translate(item.x, item.y); // 將繪圖原點移到粒子位置。
    rotate(item.angle); // 依粒子角度旋轉。
    fill(red(item.shade), green(item.shade), blue(item.shade), item.life); // 依生命值設定粒子透明度。
    rectMode(CENTER); // 將粒子矩形改為中心定位。
    rect(0, 0, item.size, item.size * 1.8, 2); // 繪製單一彩帶粒子。
    rectMode(CORNER); // 還原矩形定位模式。
    pop(); // 還原粒子繪圖狀態。
  }); // 結束粒子更新迴圈。
} // 結束彩帶繪製函式。

function drawIcon(name, cx, cy, scaleValue) { // 依名稱繪製所有音樂程式圖案。
  push(); // 保存圖案繪圖狀態。
  translate(cx, cy); // 將圖案原點移到指定中心。
  scale(max(0.05, scaleValue)); // 將圖案縮放到適合目前版面的大小。
  stroke(INK); // 設定圖案線條顏色。
  strokeWeight(4); // 設定圖案線條粗細。
  strokeCap(ROUND); // 設定線段端點使用圓角。
  noFill(); // 設定圖案預設不填色。
  if (name === "staff") { // 判斷是否繪製五線譜圖案。
    for (let i = -2; i <= 2; i += 1) { line(-105, i * 15, 105, i * 15); } // 繪製五條水平五線譜。
    fill(CORRECT); // 設定五線譜音符頭顏色。
    ellipse(-42, 19, 25, 17); // 繪製左側音符頭。
    line(-30, 17, -30, -43); // 繪製左側音符符桿。
    ellipse(43, -11, 25, 17); // 繪製右側音符頭。
    line(55, -12, 55, -72); // 繪製右側音符符桿。
    line(-30, -43, 55, -72); // 繪製連接音符的符尾。
  } else if (name === "time") { // 判斷是否繪製四四拍拍號圖案。
    for (let i = -2; i <= 2; i += 1) { line(-82, i * 14, 82, i * 14); } // 繪製拍號背景五線譜。
    noStroke(); // 關閉拍號文字外框。
    fill(INK); // 設定拍號文字顏色。
    textAlign(CENTER, CENTER); // 將拍號文字置中。
    textStyle(BOLD); // 設定拍號文字使用粗體。
    textSize(58); // 設定拍號文字大小。
    text("4", 0, -27); // 繪製拍號上方的四。
    text("4", 0, 30); // 繪製拍號下方的四。
  } else if (name === "note") { // 判斷是否繪製四分音符圖案。
    fill(CORRECT); // 設定音符顏色。
    ellipse(-10, 35, 44, 28); // 繪製音符頭。
    line(11, 34, 11, -72); // 繪製音符符桿。
    line(11, -72, 55, -55); // 繪製音符符尾。
    line(55, -55, 55, -34); // 延伸音符符尾。
  } else if (name === "rest") { // 判斷是否繪製休止符圖案。
    noStroke(); // 關閉休止符外框。
    fill(WRONG); // 設定休止符顏色。
    beginShape(); // 開始建立休止符多邊形。
    vertex(-52, -35); // 設定休止符左上角。
    vertex(45, -35); // 設定休止符右上角。
    vertex(15, -4); // 設定休止符上方凹點。
    vertex(48, 25); // 設定休止符右下角。
    vertex(-45, 25); // 設定休止符左下角。
    vertex(-12, -4); // 設定休止符下方凹點。
    endShape(CLOSE); // 完成休止符圖形。
    ellipse(0, 42, 35, 15); // 繪製休止符底部圓點。
  } else if (name === "piano") { // 判斷是否繪製鋼琴鍵盤圖案。
    fill(255, 249, 239); // 設定白鍵填色。
    stroke(INK); // 設定琴鍵外框顏色。
    strokeWeight(3); // 設定琴鍵外框粗細。
    rect(-105, -42, 210, 84, 8); // 繪製鋼琴鍵盤外框。
    for (let i = -6; i <= 6; i += 1) { line(i * 15, -42, i * 15, 42); } // 繪製白鍵分隔線。
    fill(INK); // 設定黑鍵顏色。
    noStroke(); // 關閉黑鍵外框。
    [-75, -45, 0, 30, 60].forEach((x) => { rect(x, -42, 10, 50, 3); }); // 繪製鋼琴黑鍵。
  } // 結束圖案類型判斷。
  pop(); // 還原圖案繪圖狀態。
} // 結束程式圖案函式。

function loadQuestionBankFromGoogle(isReload) { // 從 Google Sheet 公開 CSV 讀取最新題庫。
  if (isLoading) { return; } // 避免同時發出多個雲端請求。
  isLoading = true; // 標記目前正在讀取題庫。
  dataReady = false; // 讀取期間顯示載入畫面。
  loadMessage = isReload ? "正在重新讀取雲端題庫…" : "正在載入雲端題庫…"; // 更新載入狀態文字。
  loadMessageIsError = false; // 開始新請求時清除舊錯誤提示。
  const controller = typeof AbortController === "function" ? new AbortController() : null; // 建立支援逾時取消的控制器。
  const timer = controller ? setTimeout(() => { controller.abort(); }, FETCH_TIMEOUT_MS) : null; // 設定請求逾時處理。
  const requestUrl = `${GOOGLE_SHEET_CSV_URL}${GOOGLE_SHEET_CSV_URL.includes("?") ? "&" : "?"}_=${Date.now()}`; // 加入時間參數避免使用舊快取。
  const requestOptions = controller ? { method: "GET", mode: "cors", cache: "no-store", signal: controller.signal } : { method: "GET", mode: "cors", cache: "no-store" }; // 設定跨來源與不使用快取的請求選項。
  fetch(requestUrl, requestOptions).then((response) => { if (!response.ok) { throw new Error(`HTTP ${response.status}`); } return response.text(); }).then((csvText) => { const parsedBank = parseAndValidateCsv(csvText); if (parsedBank.length < TOTAL) { throw new Error(`有效題目只有 ${parsedBank.length} 題，至少需要 ${TOTAL} 題`); } availableQuestionBank = parsedBank; usingFallbackBank = false; startQuizFromBank(availableQuestionBank); loadMessage = `雲端題庫已更新，共 ${parsedBank.length} 題。`; loadMessageIsError = false; dataReady = true; }).catch((error) => { handleQuestionLoadError(error); }).finally(() => { if (timer) { clearTimeout(timer); } isLoading = false; }); // 完成資料讀取、驗證、抽題與狀態清理。
} // 結束雲端題庫讀取函式。

function handleQuestionLoadError(error) { // 統一處理網路、權限與資料格式錯誤。
  const detail = error && error.message ? error.message : "無法取得 Google Sheet CSV"; // 取得可讀的錯誤原因。
  availableQuestionBank = FALLBACK_QUESTION_BANK.slice(); // 雲端失敗時切換到完整內建備援題庫。
  usingFallbackBank = true; // 標記目前使用內建備援題庫。
  startQuizFromBank(availableQuestionBank); // 以備援題庫重新抽取五題。
  loadMessage = `雲端題庫載入失敗（${detail}），目前使用內建備援題庫。`; // 顯示錯誤與備援狀態。
  loadMessageIsError = true; // 開啟畫面底部錯誤提示。
  dataReady = true; // 結束載入狀態並讓測驗可以使用。
} // 結束錯誤處理函式。

function parseAndValidateCsv(csvText) { // 解析並驗證 Google Sheet CSV 題庫。
  if (typeof csvText !== "string" || csvText.trim() === "") { throw new Error("CSV 內容為空白"); } // 阻擋空白回應。
  const rows = parseCsvText(csvText); // 使用自訂解析器處理標準 CSV。
  if (rows.length < 2) { throw new Error("CSV 沒有標題列或題目資料"); } // 確認至少有標題與一筆題目。
  const headers = rows[0].map((value) => String(value).replace(/^\uFEFF/, "").trim()); // 清除 BOM 並整理標題文字。
  const missingHeaders = CSV_HEADERS.filter((header) => !headers.includes(header)); // 找出缺少的必要欄位。
  if (missingHeaders.length > 0) { throw new Error(`缺少欄位：${missingHeaders.join(", ")}`); } // 欄位不完整時拒絕使用資料。
  const indexOf = (header) => headers.indexOf(header); // 建立依欄位名稱查找索引的工具。
  const cleaned = []; // 建立有效題目陣列。
  rows.slice(1).forEach((row) => { const question = cleanCell(row[indexOf("question")]); const options = ["optionA", "optionB", "optionC", "optionD"].map((header) => cleanCell(row[indexOf(header)])); const answerText = cleanCell(row[indexOf("answer")]); const icon = cleanCell(row[indexOf("icon")]).toLowerCase(); const answer = Number(answerText); const valid = question !== "" && options.length === 4 && options.every((option) => option !== "") && /^[0-3]$/.test(answerText) && Number.isInteger(answer) && answer >= 0 && answer <= 3 && VALID_ICONS.includes(icon); if (valid) { cleaned.push({ question, options, answer, icon }); } }); // 逐列過濾空白題目、錯誤答案與不合法圖案。
  return cleaned; // 回傳通過驗證的題庫。
} // 結束 CSV 驗證函式。

function parseCsvText(csvText) { // 解析含引號、逗號與換行的 CSV 文字。
  const rows = []; // 建立 CSV 列陣列。
  let row = []; // 建立目前資料列。
  let cell = ""; // 建立目前儲存格文字。
  let quoted = false; // 記錄目前是否位於引號欄位內。
  for (let i = 0; i < csvText.length; i += 1) { // 逐字掃描 CSV 內容。
    const character = csvText[i]; // 取得目前字元。
    const next = csvText[i + 1]; // 取得下一個字元供判斷跳脫引號。
    if (character === '"' && quoted && next === '"') { cell += '"'; i += 1; } else if (character === '"') { quoted = !quoted; } else if (character === "," && !quoted) { row.push(cell); cell = ""; } else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && next === "\n") { i += 1; } row.push(cell); rows.push(row); row = []; cell = ""; } else { cell += character; } // 依 CSV 規則處理引號、逗號與換行。
  } // 結束 CSV 字元掃描。
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); } // 補上沒有換行結尾的最後一列。
  return rows; // 回傳二維 CSV 資料。
} // 結束 CSV 解析函式。

function cleanCell(value) { // 清理單一 CSV 儲存格。
  return value === undefined || value === null ? "" : String(value).trim(); // 將不存在的值轉成空字串並移除前後空白。
} // 結束儲存格清理函式。

function pickRandomQuestions(bank) { // 從完整題庫不重複抽取五題。
  const source = Array.isArray(bank) ? bank.filter((item) => item && Array.isArray(item.options) && item.options.length === 4) : []; // 建立安全題庫來源。
  const shuffled = source.slice(); // 複製題庫避免修改原陣列。
  fisherYatesShuffle(shuffled); // 使用 Fisher-Yates 演算法洗牌。
  return shuffled.slice(0, TOTAL); // 取出前五題。
} // 結束隨機抽題函式。

function fisherYatesShuffle(items) { // 使用 Fisher-Yates 演算法將陣列洗牌。
  for (let i = items.length - 1; i > 0; i -= 1) { const j = floor(random(i + 1)); const temporary = items[i]; items[i] = items[j]; items[j] = temporary; } // 從尾端往前隨機交換資料。
  return items; // 回傳洗牌後的陣列。
} // 結束洗牌函式。

function startQuizFromBank(bank) { // 使用完整題庫建立一場新的五題測驗。
  const selected = pickRandomQuestions(bank); // 從完整題庫隨機抽取五題。
  questions = selected.length >= TOTAL ? selected : pickRandomQuestions(FALLBACK_QUESTION_BANK); // 題庫不足時改用內建備援題庫。
  questionIndex = 0; // 將題目索引重設為第一題。
  answers = Array(TOTAL).fill(-1); // 清除上一場答案。
  completed = Array(TOTAL).fill(false); // 清除上一場作答狀態。
  resultPage = false; // 回到單題作答頁。
  shakeStart = 0; // 清除答錯動畫時間。
  confetti = []; // 清除上一場彩帶粒子。
} // 結束建立測驗函式。

function getLayout(data) { // 依畫布大小計算題目頁響應式版面。
  const viewportWidth = max(1, width); // 取得安全的畫布寬度。
  const viewportHeight = max(1, height); // 取得安全的畫布高度。
  const narrow = viewportWidth < 680; // 判斷是否為窄畫面。
  const compact = viewportHeight < 520; // 判斷是否為低高度畫面。
  const veryCompact = viewportHeight < 380; // 判斷是否為極低高度畫面。
  const columns = narrow ? 1 : 2; // 窄畫面使用單欄，寬畫面使用雙欄。
  const rows = ceil(4 / columns); // 計算四個選項需要的列數。
  const margin = constrain(min(viewportWidth * 0.055, viewportHeight * 0.07), 10, 64); // 計算響應式左右邊界。
  const contentWidth = max(40, viewportWidth - margin * 2); // 計算主要內容寬度。
  const navHeight = constrain(viewportHeight * 0.095, veryCompact ? 34 : 44, 56); // 計算導覽按鈕高度。
  const navY = max(0, viewportHeight - navHeight - max(6, viewportHeight * 0.018)); // 計算導覽按鈕頂端位置。
  const progressSize = constrain(min(viewportWidth * 0.032, viewportHeight * 0.035), veryCompact ? 10 : 13, 18); // 計算進度文字大小。
  const progressY = max(6, viewportHeight * 0.022); // 計算進度文字位置。
  const questionSize = constrain(min(viewportWidth * 0.043, viewportHeight * 0.052), veryCompact ? 12 : 17, narrow ? 28 : 34); // 計算題目文字大小。
  const questionWidth = contentWidth * 0.94; // 設定題目最大寬度。
  const questionLines = getWrappedLines(data.question, questionWidth, questionSize, BOLD); // 取得題目自動換行內容。
  const questionLineHeight = questionSize * (veryCompact ? 1.15 : 1.28); // 計算題目行距。
  const questionHeight = questionLines.length * questionLineHeight; // 計算題目文字高度。
  const questionY = progressY + progressSize + (compact ? 3 : 8); // 計算題目起始位置。
  const iconGap = compact ? 3 : 8; // 設定題目與圖案間距。
  const iconHeight = constrain(viewportHeight * (veryCompact ? 0.08 : 0.13), veryCompact ? 22 : 40, compact ? 86 : 132); // 計算圖案區域高度。
  const iconY = questionY + questionHeight + iconGap; // 計算圖案區域起始位置。
  const iconBox = { x: margin, y: iconY, w: contentWidth, h: iconHeight }; // 建立圖案容器資料。
  const cardGap = columns === 1 ? (veryCompact ? 4 : compact ? 7 : 11) : (veryCompact ? 6 : compact ? 9 : 15); // 計算卡片間距。
  const cardTop = iconY + iconHeight + (compact ? 4 : 10); // 計算卡片區域起始位置。
  const feedbackText = completed[questionIndex] ? (answers[questionIndex] === data.answer ? "答對了！太棒了！" : `再想一想！正確答案是 ${String.fromCharCode(65 + data.answer)}：${data.options[data.answer]}`) : ""; // 依作答狀態建立回饋內容。
  const feedbackSize = constrain(min(viewportWidth * 0.036, viewportHeight * 0.035), veryCompact ? 10 : 13, 19); // 計算回饋文字大小。
  const feedbackWidth = contentWidth * 0.94; // 設定回饋文字最大寬度。
  const feedbackLines = feedbackText ? getWrappedLines(feedbackText, feedbackWidth, feedbackSize, BOLD) : []; // 取得回饋自動換行內容。
  const feedbackLineHeight = feedbackSize * 1.24; // 計算回饋行距。
  const feedbackHeight = feedbackLines.length * feedbackLineHeight; // 計算回饋文字高度。
  const feedbackGap = completed[questionIndex] ? (veryCompact ? 2 : 6) : 0; // 設定回饋與卡片的間距。
  const cardBottom = navY - (completed[questionIndex] ? feedbackHeight + feedbackGap + 2 : 2); // 計算卡片可到達的底部。
  const cardAvailable = max(20, cardBottom - cardTop); // 計算卡片區域可用高度。
  const cardWidth = columns === 1 ? contentWidth : (contentWidth - cardGap) / 2; // 計算單張卡片寬度。
  const cardHeight = max(24, min(columns === 1 ? 88 : 122, (cardAvailable - cardGap * (rows - 1)) / rows)); // 計算單張卡片高度。
  const cards = data.options.map((option, index) => { // 逐一計算四張卡片的響應式資料。
    const column = index % columns; // 計算卡片所在欄位。
    const row = floor(index / columns); // 計算卡片所在列位。
    const x = margin + column * (cardWidth + cardGap); // 計算卡片水平座標。
    const y = cardTop + row * (cardHeight + cardGap); // 計算卡片垂直座標。
    const padding = constrain(cardWidth * 0.045, 8, 20); // 計算卡片內距。
    const labelSize = constrain(cardHeight * 0.24, veryCompact ? 10 : 13, 23); // 計算選項標籤大小。
    const labelWidth = max(24, measureText(`${String.fromCharCode(65 + index)}.`, labelSize, BOLD)); // 量測選項標籤寬度。
    const textX = padding + labelWidth + max(7, padding * 0.6); // 計算選項文字起點。
    const textWidth = max(22, cardWidth - textX - padding); // 計算選項文字可用寬度。
    const textHeight = max(16, cardHeight - max(5, padding * 0.8) * 2); // 計算選項文字可用高度。
    const startSize = constrain(cardHeight * 0.22, veryCompact ? 9 : 13, 21); // 設定選項文字起始大小。
    const optionSize = fitTextSize(option, textWidth, textHeight, startSize, veryCompact ? 8 : 10, NORMAL); // 逐步縮小選項文字避免超出卡片。
    const optionLines = getWrappedLines(option, textWidth, optionSize, NORMAL); // 取得選項自動換行內容。
    const optionLineHeight = optionSize * 1.2; // 計算選項行距。
    const renderedHeight = min(textHeight, optionLines.length * optionLineHeight); // 計算選項實際顯示高度。
    return { x, y, w: cardWidth, h: cardHeight, padding, labelSize, textX, textY: max(1, (cardHeight - renderedHeight) / 2), textHeight, optionLines, optionSize, optionLineHeight, radius: constrain(cardHeight * 0.22, 7, 18), border: constrain(cardHeight * 0.02, 1, 2), shake: constrain(cardWidth * 0.025, 4, 12) }; // 回傳卡片完整版面資料。
  }); // 結束卡片版面計算。
  const feedbackY = cards.length > 0 ? cards[cards.length - 1].y + cards[cards.length - 1].h + feedbackGap : cardTop; // 計算回饋起始位置。
  const buttonGap = columns === 1 ? max(6, viewportWidth * 0.025) : 12; // 計算導覽按鈕間距。
  const buttons = getQuizButtons(margin, navY, navHeight, buttonGap); // 建立上一題與下一題按鈕資料。
  return { margin, progressY, progressSize, questionY, questionSize, questionLines, questionLineHeight, questionHeight, iconBox, iconScale: min(iconBox.w / 230, iconBox.h / 145), cards, feedbackY, feedbackSize, feedbackLines, feedbackLineHeight, feedbackHeight, previous: buttons.previous, next: buttons.next }; // 回傳題目頁完整版面。
} // 結束題目版面函式。

function getQuizButtons(margin, y, buttonHeight, gap) { // 計算題目頁導覽按鈕位置與大小。
  const bothVisible = questionIndex > 0 && completed[questionIndex]; // 判斷是否會同時顯示兩個按鈕。
  const availableWidth = max(80, width - margin * 2); // 計算按鈕列可用寬度。
  const buttonWidth = bothVisible ? min(148, (availableWidth - gap) / 2) : min(154, max(108, availableWidth * 0.38)); // 依按鈕數量計算寬度。
  const textSizeValue = constrain(min(buttonWidth * 0.14, buttonHeight * 0.38), 11, 18); // 計算按鈕文字大小。
  const radius = constrain(buttonHeight * 0.32, 8, 16); // 計算按鈕圓角半徑。
  const common = { h: buttonHeight, textSize: textSizeValue, radius }; // 建立按鈕共用樣式。
  const previous = { x: margin, y, w: buttonWidth, ...common }; // 建立上一題按鈕資料。
  const next = { x: width - margin - buttonWidth, y, w: buttonWidth, ...common }; // 建立下一題按鈕資料。
  return { previous, next }; // 回傳兩個導覽按鈕。
} // 結束按鈕版面函式。

function getResultLayout() { // 計算結果頁響應式版面。
  const lowHeight = height < 500; // 判斷是否為低高度畫面。
  const veryLowHeight = height < 360; // 判斷是否為極低高度畫面。
  const margin = constrain(min(width * 0.06, height * 0.07), 12, max(12, width * 0.12)); // 計算結果頁邊界。
  const buttonHeight = constrain(height * 0.095, veryLowHeight ? 36 : 44, 54); // 計算重新開始按鈕高度。
  const buttonY = max(0, height - max(6, height * 0.018) - buttonHeight); // 計算重新開始按鈕位置。
  const iconScale = constrain(min(width / 900, height / 720), veryLowHeight ? 0.25 : 0.4, 1.05); // 計算結果圖案大小。
  const iconY = max(28, height * (lowHeight ? 0.13 : 0.18)); // 計算結果圖案垂直位置。
  const iconOffset = min(width * 0.25, 185); // 計算左右圖案距離中心的距離。
  const titleSize = constrain(min(width * 0.075, height * 0.075), veryLowHeight ? 18 : 25, 48); // 計算結果標題大小。
  const titleY = min(height * 0.34, iconY + 70 * iconScale); // 計算結果標題位置。
  const bodySize = constrain(min(width * 0.045, height * 0.052), veryLowHeight ? 13 : 18, 30); // 計算結果統計大小。
  const countY = titleY + titleSize * (lowHeight ? 1.42 : 1.68); // 計算答對題數位置。
  const scoreY = countY + bodySize * (lowHeight ? 1.62 : 1.78); // 計算總分位置。
  const messageSize = constrain(min(width * 0.032, height * 0.035), veryLowHeight ? 10 : 14, 18); // 計算鼓勵文字大小。
  const messageLines = getWrappedLines("每題 20 分，繼續練習就會越來越熟悉！", min(width - margin * 2, 620), messageSize, NORMAL); // 取得鼓勵文字自動換行內容。
  const messageLineHeight = messageSize * 1.25; // 計算鼓勵文字行距。
  const messageHeight = messageLines.length * messageLineHeight; // 計算鼓勵文字高度。
  const messageY = scoreY + bodySize * (lowHeight ? 1.48 : 1.68); // 計算鼓勵文字位置。
  const buttonWidth = min(190, max(140, width * 0.48)); // 計算重新開始按鈕寬度。
  const restart = { x: width / 2 - buttonWidth / 2, y: buttonY, w: buttonWidth, h: buttonHeight, textSize: constrain(buttonWidth * 0.095, 11, 18), radius: constrain(buttonHeight * 0.32, 8, 16) }; // 建立重新開始按鈕資料。
  return { iconScale, iconY, noteX: width / 2 - iconOffset, pianoX: width / 2 + iconOffset, titleSize, titleY, bodySize, countY, scoreY, messageSize, messageLines, messageLineHeight, messageHeight, messageY, restart }; // 回傳結果頁完整版面。
} // 結束結果版面函式。

function getWrappedLines(value, maxWidth, size, style) { // 逐字量測中英文並產生不超過寬度的文字行。
  textStyle(style); // 設定文字量測字重。
  textSize(size); // 設定文字量測字級。
  const safeWidth = max(12, maxWidth); // 確保文字區域有安全寬度。
  const paragraphs = String(value === undefined || value === null ? "" : value).split("\n"); // 依原始換行符號分割段落。
  const lines = []; // 建立換行結果陣列。
  paragraphs.forEach((paragraph) => { // 逐一處理每個段落。
    let line = ""; // 建立目前累積中的文字行。
    for (const character of paragraph) { // 逐字處理中文與其他字元。
      const candidate = line + character; // 建立加入下一字元後的候選行。
      if (line.length > 0 && textWidth(candidate) > safeWidth) { lines.push(line); line = character; } else { line = candidate; } // 超過寬度時換行，否則繼續累積。
    } // 結束逐字處理。
    lines.push(line || " "); // 儲存段落最後一行並保留空段落高度。
  }); // 結束段落處理。
  return lines; // 回傳自動換行後的文字行。
} // 結束文字換行函式。

function fitTextSize(value, maxWidth, maxHeight, startSize, minSize, style) { // 逐步縮小字級以避免選項文字超出卡片。
  let size = max(startSize, minSize); // 從預設字級開始測試。
  while (size >= minSize) { // 持續測試到符合高度或達到最小字級。
    const lines = getWrappedLines(value, maxWidth, size, style); // 取得目前字級的換行結果。
    if (lines.length * size * 1.2 <= maxHeight) { return size; } // 文字高度足夠時回傳目前字級。
    size -= 1; // 文字過高時縮小一級。
  } // 結束字級測試。
  return minSize; // 回傳安全的最小字級。
} // 結束字級適配函式。

function measureText(value, size, style) { // 量測指定樣式與大小的文字寬度。
  textStyle(style); // 設定量測文字字重。
  textSize(size); // 設定量測文字字級。
  return textWidth(value); // 回傳文字寬度。
} // 結束文字量測函式。

function drawTextLines(lines, centerX, topY, lineHeight, alignMode, maxHeight) { // 繪製已完成換行的多行文字。
  textAlign(alignMode, TOP); // 設定文字水平對齊並從上方開始繪製。
  const safeLines = Array.isArray(lines) && lines.length > 0 ? lines : [" "]; // 確保沒有文字時仍有安全行。
  const safeHeight = max(1, maxHeight); // 確保文字區域高度至少為一。
  const totalHeight = min(safeLines.length * lineHeight, safeHeight); // 計算並限制文字總高度。
  const startY = topY + max(0, (safeHeight - totalHeight) / 2); // 將多行文字在區域內垂直置中。
  safeLines.forEach((line, index) => { text(line, centerX, startY + index * lineHeight); }); // 逐行繪製文字。
} // 結束多行文字繪製函式。

function inside(px, py, box) { // 判斷座標是否位於指定矩形內。
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h; // 回傳座標是否在矩形範圍內。
} // 結束範圍判斷函式。

function isTouchDevice() { // 判斷目前瀏覽器是否支援觸控。
  return typeof window !== "undefined" && (("ontouchstart" in window) || (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0)); // 安全讀取觸控能力。
} // 結束觸控判斷函式。

function mousePressed() { // 處理滑鼠按下事件。
  handlePointer(mouseX, mouseY, false); // 將滑鼠座標交由共用指標函式處理。
} // 結束滑鼠事件函式。

function touchStarted() { // 處理手機與平板觸控事件。
  if (typeof touches !== "undefined" && touches.length > 0) { handlePointer(touches[0].x, touches[0].y, true); } // 使用第一個觸控點執行操作。
  return false; // 阻止瀏覽器預設觸控行為干擾畫布。
} // 結束觸控事件函式。

function handlePointer(px, py, isTouch) { // 統一處理滑鼠與觸控操作。
  const now = millis(); // 取得目前事件時間。
  if (isTouch && now - lastTouchTime < 260 && dist(px, py, lastTouchX, lastTouchY) < 24) { return; } // 忽略短時間同位置的重複觸控。
  if (isTouch) { lastTouchTime = now; lastTouchX = px; lastTouchY = py; } // 儲存本次觸控資料供去重。
  if (!dataReady || isLoading) { return; } // 題庫未準備完成時忽略操作。
  if (resultPage) { if (inside(px, py, getResultLayout().restart)) { restartQuiz(); } return; } // 結果頁只處理重新開始按鈕。
  const data = questions[questionIndex] || FALLBACK_QUESTION_BANK[0]; // 安全取得目前題目。
  const layout = getLayout(data); // 取得目前題目的版面資料。
  if (!completed[questionIndex]) { for (let i = 0; i < layout.cards.length; i += 1) { if (inside(px, py, layout.cards[i])) { selectAnswer(i); return; } } } // 尚未作答時檢查選項卡片。
  if (completed[questionIndex] && inside(px, py, layout.next)) { goNext(); return; } // 作答後點擊下一題或查看結果。
  if (questionIndex > 0 && inside(px, py, layout.previous)) { goPrevious(); } // 非第一題時處理上一題按鈕。
} // 結束共用指標函式。

function keyPressed() { // 處理鍵盤快捷鍵與方向鍵。
  const pressed = String(key).toUpperCase(); // 將鍵盤輸入轉為大寫。
  if (pressed === "R") { loadQuestionBankFromGoogle(true); return; } // 按下 R 重新讀取雲端題庫並抽取五題。
  if (!dataReady || isLoading) { return; } // 題庫尚未完成或正在載入時停止其他鍵盤操作。
  if (resultPage) { return; } // 結果頁不處理選項鍵。
  if (!completed[questionIndex] && ["A", "B", "C", "D"].includes(pressed)) { selectAnswer(pressed.charCodeAt(0) - 65); return; } // 使用 A、B、C、D 鍵選答。
  if (keyCode === RIGHT_ARROW && completed[questionIndex]) { goNext(); } // 使用右方向鍵前往下一題或結果頁。
  if (keyCode === LEFT_ARROW && questionIndex > 0) { goPrevious(); } // 使用左方向鍵回到上一題。
} // 結束鍵盤函式。

function selectAnswer(index) { // 處理玩家選取答案。
  const data = questions[questionIndex] || FALLBACK_QUESTION_BANK[0]; // 安全取得目前題目。
  if (completed[questionIndex] || index < 0 || index >= data.options.length) { return; } // 防止重複作答或無效索引。
  answers[questionIndex] = index; // 儲存玩家選取的答案。
  completed[questionIndex] = true; // 將目前題目標記為已完成。
  if (index === data.answer) { makeConfetti(getLayout(data).cards[index]); } else { shakeStart = millis(); } // 答對產生彩帶，答錯啟動搖晃。
  playSound(index === data.answer); // 依結果播放音效。
} // 結束選答函式。

function playSound(correct) { // 播放答題音效並兼容沒有音效函式庫的情況。
  if (!soundReady) { return; } // 沒有音效函式庫時安全略過。
  try { // 使用例外保護避免音訊權限中斷測驗。
    if (typeof userStartAudio === "function") { userStartAudio(); } // 在使用者操作後啟動音訊環境。
    if (oscillator === null) { oscillator = new p5.Oscillator(correct ? "sine" : "square"); oscillator.start(); oscillator.amp(0); } // 第一次使用時建立並靜音啟動振盪器。
    oscillator.freq(correct ? 660 : 180); // 依答題結果設定音高。
    oscillator.amp(0.24, 0.01); // 快速提高音量產生回饋。
    oscillator.amp(0, correct ? 0.24 : 0.32); // 短時間後將音量降回零。
  } catch (error) { // 捕捉瀏覽器音效建立或播放錯誤。
    soundReady = false; // 發生音效錯誤後停止後續嘗試。
    oscillator = null; // 清除可能不完整的振盪器。
  } // 結束音效例外保護。
} // 結束音效函式。

function goNext() { // 前往下一題或結果頁。
  if (!completed[questionIndex]) { return; } // 尚未作答時禁止前進。
  if (questionIndex === TOTAL - 1) { resultPage = true; confetti = []; return; } // 第五題完成後顯示結果頁。
  questionIndex += 1; // 將題目索引增加一題。
  shakeStart = 0; // 清除下一題的搖晃動畫時間。
  confetti = []; // 清除上一題的彩帶粒子。
} // 結束前進函式。

function goPrevious() { // 回到上一題並保留既有答案。
  if (questionIndex > 0) { questionIndex -= 1; shakeStart = 0; confetti = []; } // 回到上一題並清除動畫。
} // 結束返回函式。

function getCorrectCount() { // 計算整份測驗的答對題數。
  return questions.reduce((total, data, index) => total + (answers[index] === data.answer ? 1 : 0), 0); // 累計所有答對題目數量。
} // 結束答對數計算函式。

function restartQuiz() { // 重新讀取雲端題庫並開始新測驗。
  loadQuestionBankFromGoogle(true); // 依需求重新取得最新資料並隨機抽題。
} // 結束重新開始函式。

function windowResized() { // 處理瀏覽器視窗尺寸改變。
  resizeCanvas(max(1, windowWidth), max(1, windowHeight)); // 重新調整畫布尺寸以支援直向與橫向裝置。
} // 結束視窗尺寸函式。
