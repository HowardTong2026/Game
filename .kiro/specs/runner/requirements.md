# Requirements Document

## Introduction

一款以《地鐵跑酷》（Subway Surfers）為設計參考的三線無盡跑酷瀏覽器遊戲。角色持續自動向前奔跑，玩家使用鍵盤左右方向鍵切換跑道、閃避障礙物、收集金幣累積分數。遊戲難度隨時間推移自動提升。以純 HTML／CSS／JavaScript 實作，不需後端、框架、登入、資料庫、多人連線或排行榜功能。

---

## Glossary

- **Runner**：本遊戲系統的整體名稱。
- **Player**：控制角色移動的使用者。
- **Character**：玩家操控的遊戲角色，以視覺圖形（色塊或幾何形狀）呈現於其中一條跑道上。
- **Lane**：三條平行跑道之一，從左至右編號為 1（左）、2（中）、3（右）。
- **Obstacle**：在跑道上向玩家方向移動的障礙物件，碰觸後觸發遊戲結束。
- **Coin**：在跑道上向玩家方向移動的可收集物件，碰觸後增加得分。
- **Score**：玩家在本局遊戲中收集金幣所累積的整數分數。
- **GameSpeed**：障礙物與金幣在畫面上的移動速度，單位為像素每秒（px/s）。
- **SpawnInterval**：連續兩次生成障礙物或金幣之間的時間間隔。
- **CollisionDetector**：負責判斷角色與障礙物或金幣是否在視覺範圍上重疊的模組。
- **ScoreDisplay**：畫面上持續顯示目前累積分數的 UI 元件。
- **StartScreen**：遊戲尚未開始時顯示的畫面，包含「開始遊戲」按鈕。
- **GameOverScreen**：遊戲結束時顯示的畫面，包含最終得分與「重新開始」按鈕。
- **Renderer**：負責將遊戲狀態轉換為畫面視覺輸出的模組。

---

## Requirements

### 需求一：遊戲畫面渲染

**使用者故事：** 身為玩家，我希望看到清晰的三條跑道與一個持續奔跑的角色，讓我能直覺判斷目前位置並規劃閃避路線。

#### 驗收條件

1. WHEN 遊戲頁面載入完成，THE Renderer SHALL 在畫面上顯示三條從左至右明確區隔的跑道（Lane 1、Lane 2、Lane 3）。
2. WHEN 遊戲開始，THE Renderer SHALL 在畫面上顯示一個位於 Lane 2（中間跑道）的 Character。
3. WHILE 遊戲進行中，THE Renderer SHALL 以持續向畫面底部移動的視覺效果呈現障礙物與金幣，模擬 Character 向前奔跑的感覺。
4. WHEN 遊戲畫面渲染，THE Renderer SHALL 以簡單 2D 色塊或幾何圖形呈現所有遊戲物件，不需要複雜角色模型或骨架動畫。
5. WHEN 遊戲在現代桌面瀏覽器（Chrome、Firefox、Edge）中開啟，THE Runner SHALL 在不安裝任何額外軟體或外掛的情況下正確顯示畫面。

---

### 需求二：角色跑道切換控制

**使用者故事：** 身為玩家，我希望能用鍵盤左右方向鍵控制角色切換跑道，讓我可以即時反應並閃避迎面而來的障礙物。

#### 驗收條件

1. WHEN 玩家按下左方向鍵，THE Character SHALL 移動到左邊相鄰的跑道（例如：從 Lane 3 移至 Lane 2、從 Lane 2 移至 Lane 1）。
2. WHEN 玩家按下右方向鍵，THE Character SHALL 移動到右邊相鄰的跑道（例如：從 Lane 1 移至 Lane 2、從 Lane 2 移至 Lane 3）。
3. IF 玩家按下左方向鍵且 Character 目前位於 Lane 1，THEN THE Character SHALL 維持在 Lane 1，不得移出畫面左側邊界。
4. IF 玩家按下右方向鍵且 Character 目前位於 Lane 3，THEN THE Character SHALL 維持在 Lane 3，不得移出畫面右側邊界。
5. WHEN 玩家按下方向鍵，THE Character SHALL 每次僅移動一條跑道，不得跨越兩條或以上的跑道。
6. WHEN 玩家按下方向鍵，THE Renderer SHALL 在 100ms 以內呈現 Character 的跑道切換視覺效果。

---

### 需求三：障礙物生成與移動

**使用者故事：** 身為玩家，我希望遊戲中隨機出現障礙物，讓我需要持續判斷並切換跑道，維持遊戲的挑戰性與趣味性。

#### 驗收條件

1. WHILE 遊戲進行中，THE Runner SHALL 以隨機方式按照 SpawnInterval 在三條跑道上生成 Obstacle，並以 GameSpeed 向畫面底部移動。
2. WHEN 一組 Obstacle 生成時，THE Runner SHALL 確保同一時間點三條跑道中至少有一條未被 Obstacle 封閉，保留玩家至少一條可通行跑道。
3. WHEN CollisionDetector 偵測到 Character 與 Obstacle 的視覺範圍重疊，THE Runner SHALL 立即結束遊戲。
4. WHEN Obstacle 移動至超出畫面底部邊界，THE Runner SHALL 將該 Obstacle 從遊戲狀態中移除，使其不再佔用跑道或消耗運算資源。
5. WHEN 遊戲結束，THE Runner SHALL 停止所有 Obstacle 的移動與新生成。

---

### 需求四：金幣生成、收集與得分

**使用者故事：** 身為玩家，我希望跑道上出現可以收集的金幣，讓我在閃避障礙的同時也有得分目標，增加遊戲動力。

#### 驗收條件

1. WHILE 遊戲進行中，THE Runner SHALL 在三條跑道上以隨機方式生成 Coin，並以與 Obstacle 相同的 GameSpeed 向畫面底部移動。
2. WHEN CollisionDetector 偵測到 Character 與 Coin 的視覺範圍重疊，THE Runner SHALL 立即將該 Coin 從畫面移除，並且將 Score 增加 1 分。
3. WHILE 遊戲進行中，THE ScoreDisplay SHALL 在畫面上持續顯示玩家目前累積的 Score 整數值。
4. WHEN 遊戲開始或重新開始，THE Runner SHALL 將 Score 重置為 0。
5. WHEN Coin 移動至超出畫面底部邊界，THE Runner SHALL 將該 Coin 從遊戲狀態中移除，不增加 Score。

---

### 需求五：遊戲開始、結束與重新開始流程

**使用者故事：** 身為玩家，我希望遊戲有明確的開始與結束流程，讓我可以在失敗後快速重新挑戰，而不需要重新整理頁面。

#### 驗收條件

1. WHEN 遊戲頁面載入完成，THE Runner SHALL 顯示 StartScreen，其中包含「開始遊戲」按鈕，且遊戲迴圈尚未啟動。
2. WHEN 玩家點擊「開始遊戲」按鈕，THE Runner SHALL 隱藏 StartScreen、將 Score 設為 0、將 Character 置於 Lane 2，並啟動遊戲迴圈，開始生成 Obstacle 與 Coin。
3. WHEN CollisionDetector 偵測到 Character 與 Obstacle 碰撞，THE Runner SHALL 停止遊戲迴圈，並顯示 GameOverScreen，其中包含本局最終 Score 數值。
4. WHEN GameOverScreen 顯示，THE Runner SHALL 在同一畫面上提供「重新開始」按鈕。
5. WHEN 玩家點擊「重新開始」按鈕，THE Runner SHALL 清除所有現存的 Obstacle 與 Coin、將 Score 重置為 0、將 Character 移回 Lane 2、將 GameSpeed 重置為初始值，並立即重新啟動遊戲迴圈，不需重新整理瀏覽器頁面。

---

### 需求六：難度遞增機制

**使用者故事：** 身為玩家，我希望遊戲隨時間推移逐漸加速，讓挑戰性隨著遊玩時間增加，確保長期遊玩時仍有持續的挑戰感。

#### 驗收條件

1. WHILE 遊戲持續進行，THE Runner SHALL 每隔固定時間間隔（不超過 10 秒）提高一次 GameSpeed，使 Obstacle 與 Coin 的移動速度持續增加。
2. WHILE 遊戲持續進行，THE Runner SHALL 隨 GameSpeed 提高同步縮短 SpawnInterval，使障礙物生成頻率隨遊戲進行而增加。
3. WHEN 遊戲重新開始，THE Runner SHALL 將 GameSpeed 與 SpawnInterval 重置為初始預設值，不沿用上局的難度設定。

---

### 需求七：碰撞判定準確性

**使用者故事：** 身為玩家，我希望碰撞判定能準確反映視覺呈現，讓我不會因為不合理的誤判而感到挫折。

#### 驗收條件

1. WHEN CollisionDetector 判斷 Character 與 Obstacle 是否碰撞，THE CollisionDetector SHALL 以 Character 與 Obstacle 的實際視覺邊界框（bounding box）作為判定依據。
2. IF Character 的視覺邊界框與 Obstacle 的視覺邊界框未重疊，THEN THE CollisionDetector SHALL 不觸發碰撞事件。
3. IF Character 的視覺邊界框與 Obstacle 的視覺邊界框已重疊，THEN THE CollisionDetector SHALL 觸發碰撞事件，不得遺漏。
4. WHEN CollisionDetector 判斷 Character 與 Coin 是否碰撞，THE CollisionDetector SHALL 以相同的視覺邊界框方式判定收集事件。

---

### 需求八：流暢動畫效能

**使用者故事：** 身為玩家，我希望遊戲動畫流暢不卡頓，讓操作感受直覺且不影響遊戲判斷。

#### 驗收條件

1. WHEN 遊戲在現代桌面瀏覽器（Chrome、Firefox、Edge）中運行，THE Renderer SHALL 以不低於 30 幀每秒（fps）的速率更新畫面，確保視覺動畫流暢。
2. WHEN Renderer 進行畫面更新，THE Runner SHALL 使用瀏覽器原生 `requestAnimationFrame` API 驅動遊戲迴圈，避免使用固定時間間隔的 `setInterval` 作為主要渲染驅動。

---

## 範圍限制

以下功能**不在本規格範圍內**，實作時不得加入：

- 跳躍（Jump）或滑行（Slide）動作
- 商店、角色升級或皮膚系統
- 排行榜或跨局分數紀錄（需後端支援）
- 多人連線功能
- 使用者登入或帳號系統
- 行動裝置觸控操作支援
- 音效或背景音樂
- 多關卡或關卡選擇畫面
