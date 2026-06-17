# GitHub Pages + Firebase 線上練習測驗

這是一個部署在 GitHub Pages 的靜態練習測驗網站，使用 Firebase Auth Email/Password 登入，並使用 Firestore 儲存題目與作答紀錄。

## 檔案

- `index.html`: 網站畫面
- `style.css`: 響應式版面樣式
- `app.js`: Firebase Auth、Firestore 讀題、前端計分與紀錄寫入
- `firestore-rules.txt`: 建議貼到 Firebase Firestore Rules 的規則
- `assets/oracle-erp-hero.png`: 首頁主視覺圖片

## Firebase 設定

### Authentication

1. 到 Firebase Console。
2. 開啟 `Build > Authentication`。
3. 啟用 `Email/Password` 登入。
4. 只需要開啟第一個 `Email/Password`，不用開啟 Email link。
5. 按 Save。

### Authorized domains

Email/Password 登入通常不需要額外 OAuth redirect 設定，但仍建議在 Authorized domains 確認有：

```text
ocp1595.github.io
```
4. 在 Authorized domains 確認有：

```text
ocp1595.github.io
```

### Firestore 題庫

建立 collection：

```text
quizzes
```

建立 document：

```text
oracle-basic
```

在 `oracle-basic` 底下建立 subcollection：

```text
questions
```

每一題 document 欄位格式：

```text
text          string
options       array
answerIndex   number
explanation   string
```

範例：

```text
text: 下列哪一項最接近「修辭」的意思？
options: 整理資料表, 美化與調整語言表達, 設定網路連線, 建立程式索引
answerIndex: 1
explanation: 修辭是調整語言表達，使文字更精確、生動或有感染力。
```

### Firestore Rules

把 `firestore-rules.txt` 的內容貼到：

```text
Firestore Database > Rules
```

然後按 Publish。

## 部署

```powershell
git add .
git commit -m "Add Firebase quiz app"
git push
```

GitHub Pages 網址：

```text
https://ocp1595.github.io/
```
