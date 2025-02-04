// グローバル変数
let operation = null;         // "addition" または "subtraction"
let currentLevel = 1;
let currentScore = 0;
let currentProblem = null;
let timerInterval = null;
let timeLeft = 0;
let recentProblems = [];      // 直近2問の問題文を保持する配列
let startTime = 0;            // 問題表示時の時刻（ms）

// エラー具体例の定型文マッピング
const errorExamples = {
  "くりあがりみす": {
    "くりあがりをするひつようがないのに、くりあがりをした。": "3+6=19\n24+53=87",
    "くりあがりをしなければならないのに、くりあがりをしなかった。": "7+6=3\n24+56=70",
    "くりあがりをいれるくらいをまちがえた。": "17+23=130\n104+157=351",
    "くりあげるすうじをまちがえた。": "79+89+29=187"
  },
  "ぼんみす": {
    "もんだいのすうじのみまちがい": "2+3を2+4やとおもいこむ",
    "たしざんのかんちがい": "2+3=6\n2+9=12",
    "たすくらいをまちがえていた": "24+6=84\n123+46=583"
  },
  "じがきたないみす": {
    "すうじをみまちがい": "「5」とかいたつもりなのに、「6」としてけいさんした。",
    "くらいをずらしていた": "387+690=387+69（いがんでひっさんをかいたせいで）"
  }
};

// DOMContentLoaded時に、フィードバックエリアに「もどる」ボタンを追加（初期状態は非表示）
document.addEventListener("DOMContentLoaded", () => {
  const feedbackContainer = document.getElementById("feedbackContainer");
  if (!document.getElementById("backBtn")) {
    const backBtn = document.createElement("button");
    backBtn.id = "backBtn";
    backBtn.innerText = "もどる";
    backBtn.classList.add("hidden");
    backBtn.addEventListener("click", () => {
      // もどる時は、第二段階エラー選択内容をクリアし非表示にし、第一段階を再表示
      const subErrorDiv = document.getElementById("subErrorSelection");
      subErrorDiv.innerHTML = "";
      subErrorDiv.classList.add("hidden");
      backBtn.classList.add("hidden");
      document.getElementById("errorSelection").classList.remove("hidden");
    });
    feedbackContainer.appendChild(backBtn);
  }
});

// メニューのボタン押下時
document.getElementById("additionBtn").addEventListener("click", () => {
  operation = "addition";
  currentLevel = 1;
  currentScore = 0;
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  updateStatus();
  newProblem();
});

document.getElementById("subtractionBtn").addEventListener("click", () => {
  operation = "subtraction";
  currentLevel = 1;
  currentScore = 0;
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");
  updateStatus();
  newProblem();
});

// 回答ボタンとエンターキーでの回答送信
document.getElementById("submitBtn").addEventListener("click", submitAnswer);
document.getElementById("answerInput").addEventListener("keyup", (event) => {
  if (event.key === "Enter") {
    submitAnswer();
  }
});

// 第一段階エラー選択（大分類）の各ボタン（たし算のみ対象）
document.getElementById("error1").addEventListener("click", () => {
  showSubErrorOptions("くりあがりみす");
});
document.getElementById("error2").addEventListener("click", () => {
  showSubErrorOptions("ぼんみす");
});
document.getElementById("error3").addEventListener("click", () => {
  showSubErrorOptions("じがきたないみす");
});

// 回答処理
function submitAnswer() {
  // タイマーが動作中ならクリア
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  const inputField = document.getElementById("answerInput");
  let userAnswer = parseInt(inputField.value);
  inputField.value = "";
  
  if (isNaN(userAnswer)) {
    showFeedback("数値を入力してください。");
    return;
  }
  
  // 経過時間の計測（秒、2桁表示）
  let elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (userAnswer === currentProblem.answer) {
    currentScore++;
    // 3問連続正解の場合、レベルアップか再挑戦かの選択を促す
    if (currentScore >= 3) {
      showFeedback("正解！ 3問連続正解しました。次のレベルへ進むか、同じレベルに再挑戦しますか？ 回答時間: " + elapsed + "秒");
      // 一旦回答入力欄と回答ボタンを無効化
      document.getElementById("answerInput").disabled = true;
      document.getElementById("submitBtn").disabled = true;
      showLevelChoice();
    } else {
      showFeedback("正解！ 回答時間: " + elapsed + "秒");
      updateStatus();
      setTimeout(newProblem, 1500);
    }
  } else {
    showFeedback("不正解。 正解は " + currentProblem.answer + " です。 回答時間: " + elapsed + "秒");
    if (operation === "addition") {
      if (currentLevel <= 3) {
        // レベル1～3はエラー選択なし
        setTimeout(newProblem, 1500);
      } else {
        // レベル4以上の場合：無効化してエラー選択へ
        document.getElementById("answerInput").disabled = true;
        document.getElementById("submitBtn").disabled = true;
        document.getElementById("errorSelection").classList.remove("hidden");
      }
    } else {
      // ひき算はエラー選択なし
      setTimeout(newProblem, 1500);
    }
  }
}

// ユーザーにレベル選択を促すUIを表示する関数
function showLevelChoice() {
  const feedbackContainer = document.getElementById("feedbackContainer");

  // 既に同IDのボタンが存在していないかチェックし、存在するなら削除
  const existingNext = document.getElementById("nextLevelBtn");
  if (existingNext) existingNext.remove();
  const existingRetry = document.getElementById("retryLevelBtn");
  if (existingRetry) existingRetry.remove();

  // 「次のレベルへ」ボタンの作成
  const nextLevelBtn = document.createElement("button");
  nextLevelBtn.id = "nextLevelBtn";
  nextLevelBtn.innerText = "次のレベルへ";
  nextLevelBtn.addEventListener("click", () => {
    currentLevel++;
    currentScore = 0;
    updateStatus();
    nextLevelBtn.remove();
    retryLevelBtn.remove();
    document.getElementById("answerInput").disabled = false;
    document.getElementById("submitBtn").disabled = false;
    setTimeout(newProblem, 500);
  });

  // 「同じレベルに再挑戦」ボタンの作成
  const retryLevelBtn = document.createElement("button");
  retryLevelBtn.id = "retryLevelBtn";
  retryLevelBtn.innerText = "同じレベルに再挑戦";
  retryLevelBtn.addEventListener("click", () => {
    currentScore = 0;
    updateStatus();
    nextLevelBtn.remove();
    retryLevelBtn.remove();
    document.getElementById("answerInput").disabled = false;
    document.getElementById("submitBtn").disabled = false;
    setTimeout(newProblem, 500);
  });

  feedbackContainer.appendChild(nextLevelBtn);
  feedbackContainer.appendChild(retryLevelBtn);
}

// 小分類エラー選択（第二段階）を表示する関数
function showSubErrorOptions(category) {
  // 非表示：第一段階エラー選択エリア
  document.getElementById("errorSelection").classList.add("hidden");
  
  const subErrorDiv = document.getElementById("subErrorSelection");
  subErrorDiv.innerHTML = ""; // 以前の内容をクリア
  
  const header = document.createElement("p");
  header.innerText = "詳細なエラーを選択してください";
  subErrorDiv.appendChild(header);
  
  let options = [];
  if (operation === "addition") {
    if (currentLevel >= 4 && currentLevel <= 5) {
      if (category === "くりあがりみす") {
         options = [
           "くりあがりをするひつようがないのに、くりあがりをした。",
           "くりあがりをしなければならないのに、くりあがりをしなかった。"
         ];
      } else if (category === "ぼんみす") {
         options = [
           "もんだいのすうじのみまちがい",
           "たしざんのかんちがい",
           "たすくらいをまちがえていた"
         ];
      } else if (category === "じがきたないみす") {
         options = [
           "すうじをみまちがい"
         ];
      }
    } else if (currentLevel >= 6 && currentLevel <= 11) {
      if (category === "くりあがりみす") {
         options = [
           "くりあがりをするひつようがないのに、くりあがりをした。",
           "くりあがりをしなければならないのに、くりあがりをしなかった。",
           "くりあがりをいれるくらいをまちがえた。"
         ];
      } else if (category === "ぼんみす") {
         options = [
           "もんだいのすうじのみまちがい",
           "たしざんのかんちがい",
           "たすくらいをまちがえていた"
         ];
      } else if (category === "じがきたないみす") {
         options = [
           "すうじをみまちがい",
           "くらいをずらしていた"
         ];
      }
    } else if (currentLevel >= 12 && currentLevel <= 16) {
      if (category === "くりあがりみす") {
         options = [
           "くりあがりをするひつようがないのに、くりあがりをした。",
           "くりあがりをしなければならないのに、くりあがりをしなかった。",
           "くりあがりをいれるくらいをまちがえた。",
           "くりあげるすうじをまちがえた。"
         ];
      } else if (category === "ぼんみす") {
         options = [
           "もんだいのすうじのみまちがい",
           "たしざんのかんちがい",
           "たすくらいをまちがえていた"
         ];
      } else if (category === "じがきたないみす") {
         options = [
           "すうじをみまちがい",
           "くらいをずらしていた"
         ];
      }
    }
  }
  
  // 各小分類エラー選択ごとにエラー選択ボタンと「れい」ぼたんを生成
  options.forEach(optionText => {
    // コンテナ作成
    const optionContainer = document.createElement("div");
    optionContainer.classList.add("option-container");
    
    // 小分類エラー選択ボタン
    const errorOptionBtn = document.createElement("button");
    errorOptionBtn.classList.add("error-btn");
    errorOptionBtn.innerText = optionText;
    errorOptionBtn.addEventListener("click", () => {
      // 具体例表示専用エリアが表示中なら選択は確定しない
      const exampleArea = document.getElementById("exampleArea");
      if (!exampleArea.classList.contains("hidden")) {
        return;
      }
      // 小分類のエラー選択が確定された場合、第二段階エラー選択エリアと【もどる】ボタンを非表示にして次の問題へ
      document.getElementById("subErrorSelection").classList.add("hidden");
      document.getElementById("backBtn").classList.add("hidden");
      newProblem();
    });
    
    // 「れい」ぼたんの作成
    const reiBtn = document.createElement("button");
    reiBtn.classList.add("error-btn");
    reiBtn.innerText = "れい";
    reiBtn.addEventListener("click", () => {
      const exampleArea = document.getElementById("exampleArea");
      // エラーに対応する具体例を上書き表示
      const exampleText = errorExamples[category][optionText];
      exampleArea.innerText = exampleText;
      exampleArea.classList.remove("hidden");
      
      // 既に「とじる」ぼたんが存在していれば削除
      let closeBtn = document.getElementById("closeExampleBtn");
      if (closeBtn) closeBtn.remove();
      
      // 「とじる」ぼたんを作成して専用エリアに追加
      closeBtn = document.createElement("button");
      closeBtn.id = "closeExampleBtn";
      closeBtn.innerText = "とじる";
      closeBtn.addEventListener("click", () => {
        exampleArea.classList.add("hidden");
        closeBtn.remove();
      });
      // 改行を追加してから「とじる」ぼたんを追加
      exampleArea.appendChild(document.createElement("br"));
      exampleArea.appendChild(closeBtn);
    });
    
    optionContainer.appendChild(errorOptionBtn);
    optionContainer.appendChild(reiBtn);
    subErrorDiv.appendChild(optionContainer);
  });
  
  // 表示：第二段階エラー選択エリアと【もどる】ボタン（もどるボタンは既存の処理）
  subErrorDiv.classList.remove("hidden");
  document.getElementById("backBtn").classList.remove("hidden");
}

// 問題生成・表示
function newProblem() {
  // 次の問題へ移行する際、回答入力欄と「回答する」ボタンを有効化
  document.getElementById("answerInput").disabled = false;
  document.getElementById("submitBtn").disabled = false;
  
  // エラー選択（第一段階・第二段階）および【もどる】ボタン、フィードバックの内容をクリア
  document.getElementById("errorSelection").classList.add("hidden");
  document.getElementById("subErrorSelection").classList.add("hidden");
  document.getElementById("backBtn").classList.add("hidden");
  showFeedback("");
  
  // 直近2問と同じ問題文にならないよう重複チェック
  let problem;
  let attempts = 0;
  do {
    if (operation === "addition") {
      problem = generateAdditionProblem(currentLevel);
    } else {
      problem = generateSubtractionProblem(currentLevel);
    }
    attempts++;
    if (attempts > 100) break;
  } while (recentProblems.includes(problem.question));
  
  currentProblem = problem;
  
  // recentProblems配列に追加（直近2問のみ保持）
  recentProblems.push(currentProblem.question);
  if (recentProblems.length > 2) {
    recentProblems.shift();
  }
  
  document.getElementById("questionDisplay").innerText = currentProblem.question;
  startTime = Date.now();
  
  // タイムリミットがある場合（例：レベル16）
  if (currentProblem.timeLimit) {
    document.getElementById("timer").classList.remove("hidden");
    timeLeft = currentProblem.timeLimit;
    document.getElementById("timeDisplay").innerText = timeLeft;
    timerInterval = setInterval(() => {
      timeLeft--;
      document.getElementById("timeDisplay").innerText = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        let elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        showFeedback("時間切れ！ 正解は " + currentProblem.answer + " です。 回答時間: " + elapsed + "秒");
        if (operation === "addition" && currentLevel > 3) {
          document.getElementById("errorSelection").classList.remove("hidden");
        } else {
          setTimeout(newProblem, 1500);
        }
      }
    }, 1000);
  } else {
    document.getElementById("timer").classList.add("hidden");
  }
}

// ステータス更新
function updateStatus() {
  document.getElementById("levelDisplay").innerText = currentLevel;
  document.getElementById("scoreDisplay").innerText = currentScore;
}

// フィードバック表示
function showFeedback(message) {
  document.getElementById("feedback").innerText = message;
}

// ヘルパー関数：min～max（両端含む）の乱数を返す
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ===========================================
   以下、問題生成関数（たし算・ひき算）
   ※ 各レベルの条件に沿って乱数で問題を作成
===========================================*/

// たし算の問題生成
function generateAdditionProblem(level) {
  let a, b, c, d, e, A, B, C;
  let problem = {};
  switch(level) {
    case 1: {
      a = getRandomInt(1, 9);
      b = getRandomInt(0, 9 - a);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 2: {
      a = getRandomInt(1, 9);
      b = 10 - a;
      problem.question = a + " + " + b + " = ?";
      problem.answer = 10;
      break;
    }
    case 3: {
      a = getRandomInt(1, 9);
      b = getRandomInt(Math.max(10 - a, 0), 9);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 4: {
      a = 10;
      b = getRandomInt(1, 9);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 5: {
      A = getRandomInt(1, 9);
      B = getRandomInt(0, 9);
      a = A * 10 + B;
      b = getRandomInt(0, 9 - B);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 6: {
      A = getRandomInt(1, 9);
      B = getRandomInt(1, 9);
      a = A * 10 + B;
      b = getRandomInt(10 - B, 9);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 7: {
      A = getRandomInt(1, 8);
      C = getRandomInt(1, 9 - A);
      let B_ = getRandomInt(0, 9);
      let D = getRandomInt(0, 9 - B_);
      a = A * 10 + B_;
      b = C * 10 + D;
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 8: {
      A = getRandomInt(1, 9);
      C = getRandomInt(1, Math.max(8 - A, 1));
      let B__ = getRandomInt(0, 9);
      let minD = 10 - B__;
      if (minD > 9) {
        B__ = getRandomInt(1, 9);
        minD = 10 - B__;
      }
      D = getRandomInt(minD, 9);
      a = A * 10 + B__;
      b = C * 10 + D;
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 9: {
      A = getRandomInt(1, 9);
      C = getRandomInt(Math.max(9 - A, 1), 9);
      let B__ = getRandomInt(0, 9);
      let minD = 10 - B__;
      if (minD > 9) {
        B__ = getRandomInt(1, 9);
        minD = 10 - B__;
      }
      D = getRandomInt(minD, 9);
      a = A * 10 + B__;
      b = C * 10 + D;
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 10: {
      a = getRandomInt(100, 999);
      b = getRandomInt(0, 9);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 11: {
      a = getRandomInt(100, 999);
      b = getRandomInt(10, 99);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 12: {
      a = getRandomInt(100, 999);
      b = getRandomInt(100, 999);
      problem.question = a + " + " + b + " = ?";
      problem.answer = a + b;
      break;
    }
    case 13: {
      a = getRandomInt(0, 9);
      b = getRandomInt(0, 9);
      c = getRandomInt(0, 9);
      problem.question = a + " + " + b + " + " + c + " = ?";
      problem.answer = a + b + c;
      break;
    }
    case 14: {
      a = getRandomInt(100, 999);
      b = getRandomInt(100, 999);
      c = getRandomInt(100, 999);
      problem.question = a + " + " + b + " + " + c + " = ?";
      problem.answer = a + b + c;
      break;
    }
    case 15: {
      a = getRandomInt(10, 90);
      b = 100 - a;
      c = getRandomInt(10, 99);
      problem.question = a + " + " + b + " + " + c + " = ?";
      problem.answer = a + b + c;
      break;
    }
    case 16: {
      a = getRandomInt(100, 999);
      b = getRandomInt(100, 999);
      c = getRandomInt(100, 999);
      d = getRandomInt(100, 999);
      e = getRandomInt(100, 999);
      problem.question = a + " + " + b + " + " + c + " + " + d + " + " + e + " = ?";
      problem.answer = a + b + c + d + e;
      problem.timeLimit = 15;
      break;
    }
    default: {
      problem.question = "エラー: 未定義レベル";
      problem.answer = null;
      break;
    }
  }
  return problem;
}

// ひき算の問題生成
function generateSubtractionProblem(level) {
  let a, b, c, d, A, B, C;
  let problem = {};
  switch(level) {
    case 1: {
      a = getRandomInt(0, 9);
      b = getRandomInt(0, a);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 2: {
      a = 10;
      b = getRandomInt(1, 9);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 3: {
      a = getRandomInt(10, 19);
      let ones = a % 10;
      b = getRandomInt(0, ones);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 4: {
      a = getRandomInt(10, 99);
      let onesA = a % 10;
      b = getRandomInt(0, onesA);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 5: {
      A = getRandomInt(1, 9);
      B = getRandomInt(0, 9);
      a = A * 10 + B;
      C = getRandomInt(1, A);
      d = getRandomInt(0, B);
      b = C * 10 + d;
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 6: {
      a = getRandomInt(10, 99);
      b = getRandomInt(10, a);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 7: {
      a = getRandomInt(100, 999);
      let onesDigit = a % 10;
      if (onesDigit >= 9) {
        a = a - (onesDigit - 8);
        onesDigit = a % 10;
      }
      b = getRandomInt(onesDigit + 1, 9);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 8: {
      let A_digit = getRandomInt(1, 9);
      let C_digit = getRandomInt(0, 8);
      a = A_digit * 100 + 0 * 10 + C_digit;
      b = getRandomInt(C_digit + 1, 9);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 9: {
      a = getRandomInt(100, 999);
      b = getRandomInt(0, 9);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 10: {
      a = getRandomInt(100, 999);
      b = getRandomInt(10, Math.min(a, 99));
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 11: {
      a = getRandomInt(100, 999);
      b = getRandomInt(100, a);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    case 12: {
      let thousands = getRandomInt(1, 9);
      let hundreds, tens;
      if (Math.random() < 0.5) {
        hundreds = 0;
        tens = getRandomInt(0, 9);
      } else {
        hundreds = getRandomInt(0, 9);
        tens = 0;
      }
      let ones = getRandomInt(0, 9);
      a = thousands * 1000 + hundreds * 100 + tens * 10 + ones;
      b = getRandomInt(100, 999);
      problem.question = a + " - " + b + " = ?";
      problem.answer = a - b;
      break;
    }
    default: {
      problem.question = "エラー: 未定義レベル";
      problem.answer = null;
      break;
    }
  }
  return problem;
}
