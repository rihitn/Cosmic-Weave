// メニューバーの表示・非表示を切り替える関数
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = (menu.style.display === "block") ? "none" : "block";
}
// Supabase クライアントを格納するグローバル変数
window.supabaseClient = null;
// 環境変数を取得する関数
async function fetchConfig() {
  try {
    const response = await fetch("https://cosmic-weave-604389536871.us-central1.run.app/config");
    const config = await response.json();
    const SUPABASE_URL = config.SUPABASE_URL;
    const SUPABASE_KEY = config.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("環境変数が取得できませんでした。");
    }
    // Supabase クライアントの初期化
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(":チェックマーク_緑: Supabase クライアントが正常に設定されました");
    // 初期化完了後に実行
    loadUrls();
    // 星データの描画関数が存在すれば呼び出す
    if (typeof fetchStarDataAndCreateStars === "function") {
      window.stars = [];  // データの重複を防ぐ
      fetchStarDataAndCreateStars();
    }
  } catch (error) {
    console.error(":警告: 環境変数の取得に失敗しました:", error);
  }
}
fetchConfig();
// URLを追加する関数
async function addUrl() {
  const url = document.getElementById("url").value;
  if (!url) {
    alert("URLを入力してください");
    return;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    alert("URLはhttps://もしくはhttp://で始まる必要があります");
    return;
  }
  const { data, error } = await window.supabaseClient
    .from("websites")
    .insert([{ url, created_at: new Date() }]);
  if (error) {
    console.error(error);
    if (error.code === "23505") {
      alert("このURLは既に登録されています");
    } else {
      alert("URLの追加に失敗しました");
    }
  } else {
    document.getElementById("url").value = "";
    loadUrls();
  }
  try {
    const response = await fetch("https://cosmic-weave-604389536871.us-central1.run.app/process_pipeline", {
      method: "POST",
    });
    const result = await response.json();
    console.log("Pipeline response:", result);
    if (result.status === "success") {
      window.location.href = "/public/index.html"; // 処理完了後にリダイレクト
    } else {
      alert("パイプラインの実行に失敗しました");
    }
  } catch (err) {
    console.error("Pipelineの実行に失敗:", err);
  }
}
// URLをリストとして表示する関数
async function loadUrls() {
  if (!window.supabaseClient) return;
  const { data, error } = await supabaseClient.from("websites").select("*");
  if (error) {
    console.error(error);
    alert("URLの取得に失敗しました");
    return;
  }
  const urlList = document.getElementById("url-list");
  urlList.innerHTML = "";
  const urlCounter = document.querySelector(".url-counter");
  if (urlCounter) {
    urlCounter.textContent = `URL数: ${data.length}`;
  }
  data.forEach((urlRecord) => {
    const li = document.createElement("li");
    const displayText = urlRecord.title?.trim() !== "" ? urlRecord.title : urlRecord.url;
    li.innerHTML = `
      <a href="${urlRecord.url}" target="_blank">${displayText}</a>
      <button class="delete-button" data-id="${urlRecord.id}">削除</button>
    `;
    li.querySelector(".delete-button").addEventListener("click", () => {
      deleteUrl(urlRecord.id);
    });
    urlList.appendChild(li);
  });
}
// URLを削除する関数
async function deleteUrl(id) {
  if (!window.supabaseClient) return;
  const { error } = await supabaseClient
    .from("websites")
    .delete()
    .eq("id", id);
  if (error) {
    console.error(error);
    alert("URLの削除に失敗しました");
  } else {
    loadUrls();
  }
}
// 検索機能
let searchTimeout = null;
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
function displaySearchResults(results) {
  searchResults.innerHTML = "";
  if (results.length === 0) {
    searchResults.style.display = "none";
    return;
  }
  searchResults.style.display = "block";
  const seen = new Set(); // ← 重複を防ぐ
  results.forEach((result) => {
    if (seen.has(result.url)) return;
    seen.add(result.url);
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.textContent = result.title || result.url;
    div.addEventListener("click", () => {
      if (typeof window.highlightStar === "function") {
        window.highlightStar(result.url);
      }
      setTimeout(() => {
        searchInput.value = "";
        searchResults.style.display = "none";
      }, 300); // 少し待ってから検索欄を消す（ハイライトが消えないように）
    });
    searchResults.appendChild(div);
  });
}
function highlightStar(url) {
  if (!window.stars) return;
  window.stars.forEach((starData) => {
    starData.material.color.setHex(window.defaultColor);
  });
  const match = window.stars.find((s) => s.url === url);
  if (match) {
    match.material.color.setHex(0xffff00); // ハイライト色
  }
}
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  if (!term) {
    searchResults.style.display = "none";
    window.stars?.forEach((starData) => {
      starData.material.color.setHex(window.defaultColor);
    });
    return;
  }
  const results = window.stars?.filter((starData) => {
    const title = (starData.title || "").toLowerCase();
    const url = starData.url.toLowerCase();
    return title.includes(term) || url.includes(term);
  }) || [];
  displaySearchResults(results);
});