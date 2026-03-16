import { insertUrl, insertUrls, supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

const menuButton = document.querySelector(".menu-button");
menuButton.addEventListener("click", toggleMenu);

export let formIsActive = false;

export function setFormIsActive(value) {
  formIsActive = value;
}

export function getFormIsActive() {
  return formIsActive;
}


export function toggleAddForm() {
  const addForm = document.getElementById("add-urls-form");
  const urlInput = document.getElementById("url");
  const overlay = document.getElementById("screen-overlay");

  const isVisible = addForm.style.display === "block";
  addForm.style.display = isVisible ? "none" : "block";

  formIsActive = !isVisible;
  setFormIsActive(formIsActive); // ← ここでフラグを更新！

  overlay.style.display = formIsActive ? "block" : "none";

  if (!isVisible) {
    // フォーカス + クリップボード内容を挿入
    urlInput.focus();
    navigator.clipboard.readText()
      .then((text) => {
        if (/^https?:\/\/.+/.test(text)) {
          urlInput.value = text;
        }else{
          console.log("クリップボードにURLがありません")
        }
      })
      .catch((err) => {
        console.error("クリップボードの読み取りに失敗:", err);
      });
  }
}

const addButton = document.querySelector(".add-urls-button");
addButton.addEventListener("click", toggleAddForm);

// URLを追加する関数
async function addUrl() {
  const user = await getCurrentUser();
  if (!user) {
    alert("URLを追加するにはログインが必要です");
    return;
  }
  const url = document.getElementById("url").value;
  if (!url) {
    alert("URLを入力してください");
    return;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    alert("URLはhttps://もしくはhttp://で始まる必要があります");
    return;
  }
  const { error } = await insertUrl(url);
  if (!error) {
    console.log("パイプラインを実行します");
    try {
      const response = await fetch(
        "https://cosmic-weave-backend-604389536871.asia-northeast1.run.app/process_pipeline",
        {
          method: "POST",
        }
      );
      const result = await response.json();
      console.log("Pipeline response:", result);
      if (result.status === "success") {
        window.location.href = "/index.html"; // 処理完了後にリダイレクト
      } else {
        const detail = result.step
          ? `ステップ: ${result.step}\n${result.output || result.message || ""}`
          : result.message || JSON.stringify(result);
        alert(`パイプラインの実行に失敗しました\n\n${detail}`);
      }
    } catch (err) {
      console.error("Pipelineの実行に失敗:", err);
      alert(`パイプラインの実行に失敗しました\n\n${err.message}`);
    }
  }
}

const addUrlButton = document.querySelector(".addUrl-button");
addUrlButton.addEventListener("click", addUrl);

// === タブ切り替え ===
document.querySelectorAll(".url-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".url-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    document.getElementById("tab-single").style.display = target === "single" ? "block" : "none";
    document.getElementById("tab-bulk").style.display   = target === "bulk"   ? "block" : "none";
  });
});

// === 一括追加 ===
const bulkAddBtn = document.getElementById("bulk-add-btn");
const bulkStatus = document.getElementById("bulk-status");

bulkAddBtn.addEventListener("click", async () => {
  const user = await getCurrentUser();
  if (!user) { alert("URLを追加するにはログインが必要です"); return; }

  const raw = document.getElementById("bulk-urls").value.trim();
  if (!raw) { alert("URLを入力してください"); return; }

  const urls = raw.split("\n")
    .map(l => l.trim())
    .filter(l => l.startsWith("http://") || l.startsWith("https://"));

  if (urls.length === 0) { alert("有効なURLがありません（http:// または https:// で始まる行が必要です）"); return; }

  bulkStatus.textContent = `${urls.length}件を確認中...`;
  bulkStatus.className = "url-preview checking";
  bulkAddBtn.disabled = true;

  const { added, skipped, error } = await insertUrls(urls);

  if (error) {
    bulkStatus.textContent = "エラーが発生しました";
    bulkStatus.className = "url-preview duplicate";
    bulkAddBtn.disabled = false;
    return;
  }

  if (added === 0) {
    bulkStatus.textContent = `全て登録済みでした（${skipped}件スキップ）`;
    bulkStatus.className = "url-preview duplicate";
    bulkAddBtn.disabled = false;
    return;
  }

  bulkStatus.textContent = `${added}件追加完了、パイプライン実行中...`;
  bulkStatus.className = "url-preview checking";

  try {
    const response = await fetch(
      "https://cosmic-weave-backend-604389536871.asia-northeast1.run.app/process_pipeline",
      { method: "POST" }
    );
    const result = await response.json();
    if (result.status === "success") {
      window.location.href = "/index.html";
    } else {
      const detail = result.step
        ? `ステップ: ${result.step}\n${result.output || result.message || ""}`
        : result.message || JSON.stringify(result);
      bulkStatus.textContent = `追加: ${added}件、スキップ: ${skipped}件（パイプライン失敗）`;
      bulkStatus.className = "url-preview duplicate";
      console.error("Pipeline error:", detail);
    }
  } catch (err) {
    bulkStatus.textContent = `追加: ${added}件、スキップ: ${skipped}件（パイプライン失敗: ${err.message}）`;
    bulkStatus.className = "url-preview duplicate";
  }

  bulkAddBtn.disabled = false;
});

// === URL 重複チェック & プレビュー ===
const urlInput   = document.getElementById("url");
const urlPreview = document.getElementById("url-preview");
let checkTimeout = null;

urlInput.addEventListener("input", () => {
  clearTimeout(checkTimeout);
  const val = urlInput.value.trim();
  if (!val || !(val.startsWith("http://") || val.startsWith("https://"))) {
    urlPreview.textContent = "";
    urlPreview.className = "url-preview";
    return;
  }
  urlPreview.textContent = "確認中...";
  urlPreview.className = "url-preview checking";
  checkTimeout = setTimeout(async () => {
    const { data } = await supabase
      .from("websites")
      .select("id, title")
      .eq("url", val)
      .limit(1);
    if (data && data.length > 0) {
      urlPreview.textContent = `⚠️ 登録済み: ${data[0].title || val}`;
      urlPreview.className = "url-preview duplicate";
    } else {
      urlPreview.textContent = "✓ 新しいURL";
      urlPreview.className = "url-preview new-url";
    }
  }, 600);
});


