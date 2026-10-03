# 安否通 · 市府監看介面（Demo）

地震後，系統主動向轄內弱勢機構點名，機構一鍵回報，市府只處理尚未確認的那幾家。
依 `../design_handoff_anfu/`（README 視覺規格、`anfu-platform-spec.md` 行為規格）實作，純前端，無後端。

## 執行

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 狀態轉移與排序的驗收測試
npm run build      # 靜態輸出到 dist/，可直接放 GitHub Pages（HashRouter + base './'）
```

## 路由

| 代號 | 路由 | 畫面 |
|---|---|---|
| S2 | `#/board` | 未回報優先佇列（預設） |
| S1 | `#/drill/new` | 發起點名 |
| S3 | `#/r/:token` | 機構回報頁（獨立頁，無導覽） |
| S4 | `#/facilities` | 機構名冊 |
| S5 | `#/history`、`#/history/:id` | 點名紀錄 |

## 檔案

```
src/config.ts            CONFIG：升級時點、權重、TTL、模擬時鐘。只在這裡改數字
src/types.ts             資料模型（規格書四之一）
src/labels.ts            詞彙表的顯示文字
src/data/                42 家種子機構、回報腳本、兩筆歷史點名
src/store/reducer.ts     所有狀態轉移；只有 RESPOND（與 Demo 模擬器）會寫 callout.status
src/store/selectors.ts   佇列排序、指標、升級進度、歷史統計 —— 畫面不自己算
src/store/persist.ts     localStorage 讀寫（含形狀檢查）
src/hooks/useSimClock.ts 每 1 秒推進 1 模擬分鐘，暫停即停掉 interval
src/components/          DemoBar、QueueList（FLIP 動畫）、QueueRow、KpiStrip、ReplyCurve…
src/screens/             Board / DrillNew / Respond / Facilities / History
```

## 注意事項（不要改壞的地方）

- **市府端不能改回報狀態。** `MARK_OPS` 只動 `opsNote`。新增 action 時不要讓它寫 `status`。
- **時間點只放 `CONFIG`。** 把 `escalation[0].minute` 從 5 改成 2，佇列、展開列、S5 曲線都會跟著變。
- **token 一次性。** S3 只有在「開啟時仍為尚未確認」的頁面才顯示送出後畫面；重新開啟已用過的連結會看到失效頁。
- **Demo 專屬**：`SIM_*` actions、`data/script.ts`、DemoBar、S2 的「開啟回報頁（Demo）」按鈕。正式產品應移除，只留「模擬資料」標示。
- 主題用 `<html data-theme>` 切換，色票在 `src/index.css`。淡色文字 `--ink-faint` 比交付稿略深，以通過 AA 4.5:1。

## 不適用的 AGENTS.md 規則

- SEC-02／SEC-06／SEC-08：沒有後端，信任邊界不存在；「市府不能代填回報」在 reducer 層強制，但正式版必須在伺服器端再做一次。
- OBS-02／OBS-03：Demo 沒有監控服務，只在 console 記錄讀寫失敗。
- 尚未建立 git repo（GIT-*、SHIP-*）；`.gitignore` 已先備好。
