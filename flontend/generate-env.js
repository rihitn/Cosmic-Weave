const fs = require("fs");
const path = require("path");

// プロジェクトのルートディレクトリの.envファイルを読み込む
const envPath = path.resolve(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");

// 変数を抽出
const envVars = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length === 2) {
    const key = parts[0].trim();
    const value = parts[1].trim();
    if (key && value) {
      envVars[key] = value;
    }
  }
});

// env.jsを生成
const envJsContent = `// このファイルは自動生成されています - 直接編集しないでください
// generate-env.jsスクリプトによってプロジェクトルートの.envから生成されています
window.ENV = ${JSON.stringify(envVars, null, 2)};`;

const envJsPath = path.resolve(__dirname, "src", "env.js");
fs.writeFileSync(envJsPath, envJsContent);

console.log("env.jsが正常に生成されました!");
