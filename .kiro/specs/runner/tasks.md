# Implementation Plan: 三線跑酷遊戲（Runner）

## Overview

以單一 `index.html` 檔案實作純 HTML／CSS／JavaScript 三線無盡跑酷瀏覽器遊戲。按照設計文件中的模組層次逐步建構，從靜態骨架開始，依序加入狀態管理、輸入、渲染、物件生成、物理引擎，最後組裝 GameController 完成遊戲迴圈，再補充屬性測試與整合測試。

## Tasks

- [x] 1. 建立專案骨架與 GameConfig 常數
  - [x] 1.1 建立 `index.html`，設定 Canvas 元素（id="gameCanvas"，480×720）與基礎 CSS（置中、黑色背景、`object-fit: contain`）
    - 在 `<head>` 加入 `<style>` 區塊，使 canvas 在各尺寸視窗中等比例顯示
    - 在 `<body>` 加入 `<canvas id="gameCanvas">` 並以 JavaScript 取得 2D context
    - _Requirements: 1.1, 1.5, 8.1_
  - [x] 1.2 在 `index.html` 的 `<script>` 區塊內定義 `GameConfig` 物件，包含所有設計文件中列出的常數
    - 常數包含：`CANVAS_WIDTH`、`CANVAS_HEIGHT`、`LANE_COUNT`、`BASE_SPEED`、`ACCEL_RATE`、`MAX_SPEED`、`BASE_SPAWN_INTERVAL`、`MIN_SPAWN_INTERVAL`、`OBSTACLE_HEIGHT`、`COIN_RADIUS`、`COLLISION_INSET`、`PLAYER_Y_RATIO`、`MAX_DT`
    - _Requirements: 1.1, 6.1, 6.2_

- [x] 2. 實作 GameState 資料結構
  - [x] 2.1 定義 `GameState` 物件，包含所有可變遊戲狀態欄位
    - 欄位：`phase`（'IDLE'）、`score`（0）、`speed`（BASE_SPEED）、`spawnInterval`（BASE_SPAWN_INTERVAL）、`playerLane`（1）、`obstacles`（[]）、`coins`（[]）、`elapsedTime`（0）
    - 提供 `resetState()` 函式，將所有欄位還原至初始值（phase 改為 'RUNNING'）以供 restart 使用
    - _Requirements: 5.2, 5.5, 6.3, 4.4_

- [x] 3. 實作 InputHandler
  - [x] 3.1 實作 `InputHandler` 類別，在 `document` 上監聽 `keydown` 事件
    - `pendingMove` 屬性初始為 `null`，左方向鍵設為 `'LEFT'`，右方向鍵設為 `'RIGHT'`
    - `clearPendingMove()` 方法將 `pendingMove` 重設為 `null`
    - 每幀只保留最新一個指令（不累積佇列）
    - _Requirements: 2.1, 2.2, 2.5, 2.6_

- [x] 4. 實作 Renderer
  - [x] 4.1 實作 `Renderer` 類別骨架，建構子接收 `ctx`、`width`、`height`，提供 `draw(state)` 入口
    - `draw(state)` 依照 phase 呼叫對應的私有繪圖方法
    - _Requirements: 1.1, 1.4_
  - [x] 4.2 實作 `_drawBackground()` 與 `_drawLanes()`
    - 繪製深色背景，並以從底部向上收斂至消失點的透視線條分隔三條跑道
    - _Requirements: 1.1, 1.4_
  - [x] 4.3 實作 `_drawPlayer(lane)`
    - 依 `lane` 計算跑道中心 X，在固定 Y（`PLAYER_Y_RATIO × height`）位置繪製角色色塊
    - _Requirements: 1.2, 1.4_
  - [x] 4.4 實作 `_drawObstacles(obstacles)` 與 `_drawCoins(coins)`
    - 障礙物以紅色矩形繪製，金幣以黃色圓形繪製；位置依跑道索引與 `y` 計算
    - _Requirements: 1.3, 1.4_
  - [x] 4.5 實作 `_drawHUD(score)`
    - 在畫布左上角以白色文字顯示 `"Score: " + score`
    - _Requirements: 4.3_
  - [x] 4.6 實作 `_drawOverlay(phase)`
    - IDLE phase：顯示半透明覆蓋層與「開始遊戲」按鈕文字
    - GAME_OVER phase：顯示半透明覆蓋層、最終分數與「重新開始」按鈕文字
    - _Requirements: 5.1, 5.3, 5.4_

- [x] 5. 實作 SpawnManager
  - [x] 5.1 實作 `SpawnManager` 類別，包含計時累積器與 `trySpawn(state, dt)` 方法
    - 以 `state.spawnInterval` 作為生成計時基準，累積 `dt` 後觸發一次生成
    - _Requirements: 3.1, 6.2_
  - [x] 5.2 實作 `_spawnObstacles(state)`：隨機抽取 1 或 2 條跑道生成障礙物，強制確保至少一條跑道暢通
    - 演算法：從 {0,1,2} 隨機抽取跑道集合；若覆蓋全部三條則強制移除一條；在選定跑道頂端建立 `Obstacle` 物件並推入 `state.obstacles`
    - 加入防衛性保護：若迴圈超過 10 次仍無法滿足條件，跳過本次生成
    - _Requirements: 3.1, 3.2_
  - [x] 5.3 實作 `_spawnCoin(state)`：在未被障礙物佔用的跑道上隨機生成一枚金幣
    - 過濾掉目前頂端有障礙物的跑道後，從可用跑道中隨機選取，建立 `Coin` 物件
    - _Requirements: 4.1_

- [x] 6. 實作 PhysicsEngine
  - [x] 6.1 實作 `PhysicsEngine.update(state, dt)` 骨架，先做 `dt = Math.min(dt, MAX_DT)` 截斷，依序呼叫各子步驟
    - 回傳 `{ collided: boolean, scoreGained: number }`
    - _Requirements: 8.2_
  - [x] 6.2 實作速度曲線與生成間隔更新邏輯
    - `speed(t) = min(BASE_SPEED + ACCEL_RATE × t, MAX_SPEED)`
    - `spawnInterval(speed) = max(BASE_SPAWN_INTERVAL × (BASE_SPEED / speed), MIN_SPAWN_INTERVAL)`
    - 每幀更新 `state.elapsedTime`、`state.speed`、`state.spawnInterval`
    - _Requirements: 6.1, 6.2_
  - [x] 6.3 實作物件移動：遍歷 `state.obstacles` 與 `state.coins`，每幀依 `state.speed × dt` 增加 `y` 值
    - _Requirements: 1.3_
  - [x] 6.4 實作畫面外物件清除：以 `filter` 移除 `y > CANVAS_HEIGHT` 的障礙物與金幣
    - _Requirements: 3.4, 4.5_
  - [x] 6.5 實作 `_aabb(a, b)` 軸對齊包圍盒碰撞函式（含 `COLLISION_INSET` 收縮係數）
    - 障礙物碰撞：遍歷 `state.obstacles`，若同跑道且 AABB 重疊，回傳 `collided = true`
    - 金幣收集：遍歷 `state.coins`，若同跑道且距離在容忍範圍內，`score += 1` 並標記金幣為已收集，最後以 `filter` 移除已收集金幣
    - _Requirements: 3.3, 4.2, 7.1, 7.2, 7.3_

- [x] 7. 實作 GameController 與組裝遊戲迴圈
  - [x] 7.1 實作 `GameController` 類別建構子：初始化所有模組實例（`InputHandler`、`SpawnManager`、`PhysicsEngine`、`Renderer`），綁定 Canvas 的 `click` 事件處理開始與重新開始
    - _Requirements: 5.1, 5.2, 5.4_
  - [x] 7.2 實作 `start()` 方法：將 `GameState.phase` 從 `'IDLE'` 切換至 `'RUNNING'`，呼叫 `requestAnimationFrame` 啟動迴圈
    - _Requirements: 5.2_
  - [x] 7.3 實作 `restart()` 方法：呼叫 `resetState()`，將 phase 設為 `'RUNNING'`，清除 `SpawnManager` 計時器，重新啟動迴圈
    - _Requirements: 5.5, 4.4, 6.3_
  - [x] 7.4 實作 `_loop(timestamp)` 主迴圈：計算 `dt`、呼叫 `_update(dt)`、呼叫 `_render()`，若 phase 為 `'RUNNING'` 則繼續 `requestAnimationFrame`
    - _Requirements: 8.2_
  - [x] 7.5 實作 `_update(dt)`：若 phase 非 `'RUNNING'` 則直接返回；否則依序呼叫 `InputHandler` 讀取指令並更新 `playerLane`（含邊界 clamp）、`SpawnManager.trySpawn`、`PhysicsEngine.update`；若 `collided = true` 則呼叫 `_handleGameOver()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5_
  - [x] 7.6 實作 `_handleGameOver()`：將 phase 設為 `'GAME_OVER'`，停止迴圈（不再呼叫 `requestAnimationFrame`）
    - _Requirements: 5.3_

- [x] 8. 檢查點：確認核心遊戲流程可運行
  - 在瀏覽器開啟 `index.html`，確認三條跑道與開始畫面正確顯示
  - 點擊「開始遊戲」後，角色在中間跑道，障礙物與金幣由上往下移動
  - 鍵盤左右鍵可切換跑道，碰撞後顯示 GameOver 畫面，點擊「重新開始」可重玩
  - 確認所有核心邏輯無 JavaScript 主控台錯誤，如有問題請修正後繼續

- [ ] 9. 撰寫屬性測試（fast-check）
  - [x] 9.1 設定測試環境：建立 `tests/` 目錄，新增 `package.json`（`type: "module"`），安裝 `vitest` 與 `fast-check` 為開發依賴
    - 新增 `vitest.config.js`，設定測試環境為 `jsdom` 以模擬 Canvas API
    - _Requirements: (測試基礎設施)_
  - [x] 9.2 撰寫 Property 1 屬性測試：左移正確性
    - 任意 `lane ∈ {0, 1, 2}`，執行左移後新跑道 === `Math.max(lane - 1, 0)`
    - **Property 1: 左移正確性**
    - **Validates: Requirements 2.1, 2.3, 2.5**
  - [ ]* 9.3 撰寫 Property 2 屬性測試：右移正確性
    - 任意 `lane ∈ {0, 1, 2}`，執行右移後新跑道 === `Math.min(lane + 1, 2)`
    - **Property 2: 右移正確性**
    - **Validates: Requirements 2.2, 2.4, 2.5**
  - [ ]* 9.4 撰寫 Property 3 屬性測試：物件向畫面底部移動
    - 任意障礙物或金幣，`dt > 0` 時 `update` 後 `y` 值必須大於原始值
    - **Property 3: 物件向畫面底部移動**
    - **Validates: Requirements 1.3**
  - [ ]* 9.5 撰寫 Property 4 屬性測試：障礙物生成不全封閉
    - 呼叫 SpawnManager 生成後，所有障礙物佔用跑道數 < 3
    - **Property 4: 障礙物生成不全封閉**
    - **Validates: Requirements 3.2**
  - [ ]* 9.6 撰寫 Property 5 屬性測試：畫面外物件自動清除
    - `update` 後 `state.obstacles` 與 `state.coins` 中不得存在 `y > CANVAS_HEIGHT` 的物件
    - **Property 5: 畫面外物件自動清除**
    - **Validates: Requirements 3.4, 4.5**
  - [ ]* 9.7 撰寫 Property 6 屬性測試：碰撞偵測正確性
    - 同跑道且 AABB 重疊 → `collided = true`；無重疊 → `collided = false`
    - **Property 6: 碰撞偵測正確性**
    - **Validates: Requirements 3.3, 7.1, 7.2, 7.3**
  - [ ]* 9.8 撰寫 Property 7 屬性測試：金幣收集增加分數
    - 金幣與玩家同跑道且重疊，`update` 後 `score` 增加 1 且金幣從陣列移除
    - **Property 7: 金幣收集增加分數**
    - **Validates: Requirements 4.2**
  - [ ]* 9.9 撰寫 Property 8 屬性測試：HUD 分數顯示與狀態一致
    - 模擬 Canvas context，任意非負整數 `score`，`_drawHUD(score)` 呼叫的 `fillText` 參數必須包含該數值的字串表示
    - **Property 8: HUD 分數顯示與狀態一致**
    - **Validates: Requirements 4.3**
  - [ ]* 9.10 撰寫 Property 9 屬性測試：重新開始完整重置狀態
    - 任意非零 score、任意障礙物數量、任意速度，`restart()` 後所有欄位回到初始值
    - **Property 9: 重新開始完整重置狀態**
    - **Validates: Requirements 4.4, 5.5, 6.3**
  - [ ]* 9.11 撰寫 Property 10 屬性測試：速度單調遞增且有上限
    - 任意 `t1 < t2`，`speed(t2) >= speed(t1)`；且對所有 `t`，`speed(t) <= MAX_SPEED`
    - **Property 10: 速度單調遞增且有上限**
    - **Validates: Requirements 6.1**
  - [ ]* 9.12 撰寫 Property 11 屬性測試：生成間隔隨速度縮短
    - 任意 `s1 < s2`（均不超過 MAX_SPEED），`spawnInterval(s1) >= spawnInterval(s2)`
    - **Property 11: 生成間隔隨速度縮短**
    - **Validates: Requirements 6.2**

- [ ] 10. 撰寫整合測試
  - [~] 10.1 整合測試：完整遊戲週期
    - 模擬：頁面載入（IDLE）→ `start()`（RUNNING）→ 執行若干幀 → 注入碰撞 → 確認 GAME_OVER → `restart()` → 確認 `score === 0`、`obstacles.length === 0`
    - _Requirements: 5.2, 5.3, 5.5_
  - [ ]* 10.2 整合測試：分數累積
    - 模擬連續收集 N 枚金幣（手動注入同跑道、重疊位置），確認 `state.score === N`
    - _Requirements: 4.2, 4.3_
  - [ ]* 10.3 整合測試：難度遞增
    - 模擬 60 秒遊戲時間（直接設定 `state.elapsedTime = 60` 後執行 update），確認 `state.speed > BASE_SPEED` 且 `state.spawnInterval < BASE_SPAWN_INTERVAL`
    - _Requirements: 6.1, 6.2_
  - [ ]* 10.4 整合測試：GAME_OVER 靜止
    - 進入 GAME_OVER 後呼叫若干幀 `_update`，確認障礙物 `y` 值與數量不變
    - _Requirements: 3.5_

- [~] 11. 最終檢查點：執行所有測試
  - 在終端機執行 `npx vitest --run`，確認所有屬性測試與整合測試通過
  - 如有失敗，修正對應模組後重新執行，直至全部通過

## Notes

- 標有 `*` 的子任務為選填，可略過以加速 MVP 開發
- 所有測試皆為子任務，不單獨列為頂層任務
- 屬性測試使用 **fast-check**，每個屬性至少執行 100 次隨機迭代
- 單元測試使用 **Vitest**（`npx vitest --run` 單次執行，勿使用 `--watch` 以免阻塞）
- Canvas 2D 的 Renderer 視覺像素輸出以 Property 8 HUD 字串比對為主，完整像素輸出可補充快照測試
- `GameState` 集中存放所有可變狀態，方便 `restart()` 一次性重置

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "6.5"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "7.5", "7.6"] },
    { "id": 9, "tasks": ["9.1"] },
    { "id": 10, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "9.7", "9.8", "9.9", "9.10", "9.11", "9.12"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.3", "10.4"] }
  ]
}
```
