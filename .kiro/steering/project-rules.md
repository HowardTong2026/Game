# 專案規則

## 技術棧

- 純 HTML／CSS／JavaScript，不使用任何框架（React、Vue、Angular 等）
- 不使用 Node.js、Vite、Webpack 或其他建置工具
- 不呼叫任何外部 API

## 目錄結構

- 所有網站檔案放在 `docs/` 資料夾底下
- GitHub Pages 從 `main` 分支的 `docs/` 資料夾發布

## 資料與語言

- 使用模擬資料（hardcoded 或 JS 物件），不串接後端
- 介面語言使用繁體中文

## 響應式設計

- 所有頁面必須支援響應式佈局，適配桌機、平板、手機
- 使用 CSS Flexbox 或 Grid 實現排版，避免依賴外部 CSS 框架

## 部署

- GitHub Pages 設定：Branch `main`，資料夾 `/docs`
