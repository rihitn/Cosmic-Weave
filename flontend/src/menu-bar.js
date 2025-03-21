// グローバル変数
window.supabaseClient = null;
window.stars = window.stars || [];
window.defaultColor = 0xffffff;
let highlightedStar = null;
// Supabase環境変数の取得
async function fetchConfig() {
  try {
    const response = await fetch("https://cosmic-weave-604389536871.us-central1.run.app/config");
    const config = await response.json();
    if (!config.SUPABASE_URL || !config.SUPABASE_KEY) {
      throw new Error("環境変数が取得できませんでした。");
    }
    // Supabase初期化
    window.supabaseClient = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY);
    console.log(":チェックマーク_緑: Supabase クライアントが正常に設定されました");
    // 初期表示
    await loadUrls();
    if (typeof fetchStarDataAndCreateStars === "function") {
      fetchStarDataAndCreateStars();
    }
  } catch (error) {
    console.error(":警告: Supabase設定失敗:", error);
  }
}
// URL追加関数
async function addUrl() {
  const url = document.getElementById("url").value;
  if (!url) return alert("URLを入力してください");
  if (!(url.startsWith("https://") || url.startsWith("http://"))) return alert("URLは https:// または http:// で始めてください");
  const { error } = await window.supabaseClient.from("websites").insert([{ url, created_at: new Date() }]);
  if (error) {
    console.error(error);
    if (error.code === "23505") alert("このURLはすでに登録されています");
    else alert("URLの追加に失敗しました");
    return;
  }
  document.getElementById("url").value = "";
  try {
    const response = await fetch("https://cosmic-weave-604389536871.us-central1.run.app/process_pipeline", { method: "POST" });
    const result = await response.json();
    if (result.status === "success") {
      window.location.href = "/public/index.html";
    } else {
      alert("パイプラインの実行に失敗しました");
    }
  } catch (err) {
    console.error("パイプライン失敗:", err);
  }
}
// URL一覧取得
async function loadUrls() {
  if (!supabaseClient) return console.error(":x: supabaseClient が未設定");
  const { data, error } = await supabaseClient.from("websites").select("*");
  if (error) return alert("URLの取得に失敗しました");
  // 重複排除（URLが同一なものは1つだけ表示）
  const unique = {};
  const uniqueData = data.filter(item => {
    if (!unique[item.url]) {
      unique[item.url] = true;
      return true;
    }
    return false;
  });
  const urlList = document.getElementById("url-list");
  urlList.innerHTML = "";
  const urlCounter = document.querySelector(".url-counter");
  if (urlCounter) urlCounter.textContent = `URL数: ${uniqueData.length}`;
  uniqueData.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${item.url}" target="_blank">${item.title || item.url}</a>
      <button class="delete-button" data-id="${item.id}">削除</button>
    `;
    li.querySelector(".delete-button").addEventListener("click", () => deleteUrl(item.id));
    urlList.appendChild(li);
  });
}
// URL削除
async function deleteUrl(id) {
  const { error } = await supabaseClient.from("websites").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("削除に失敗しました");
  } else {
    loadUrls();
  }
}
// --- 検索機能 ---
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
function displaySearchResults(results) {
  searchResults.innerHTML = "";
  if (results.length === 0) {
    searchResults.style.display = "none";
    return;
  }
  searchResults.style.display = "block";
  results.forEach((result) => {
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.textContent = result.title || result.url;
    div.addEventListener("click", () => {
      highlightStar(result.url);
      searchInput.value = result.title || result.url;
      // searchResults.style.display = "none"; // ここで非表示にしないことでハイライトが維持される
    });
    searchResults.appendChild(div);
  });
}
function highlightStar(url) {
  // 前回のハイライトを元に戻す
  stars.forEach((s) => s.material.color.setHex(defaultColor));
  // 新しいハイライト対象を探す
  const target = stars.find((s) => s.url === url);
  if (target) {
    target.material.color.setHex(0xffff00); // 黄色でハイライト
    highlightedStar = target;
  }
}
// 検索入力の監視
searchInput.addEventListener("input", (e) => {
  const keyword = e.target.value.toLowerCase();
  if (!keyword) {
    searchResults.style.display = "none";
    if (highlightedStar) {
      highlightedStar.material.color.setHex(defaultColor);
      highlightedStar = null;
    }
    return;
  }
  const results = stars.filter((s) => {
    const title = (s.title || "").toLowerCase();
    const url = s.url.toLowerCase();
    return title.includes(keyword) || url.includes(keyword);
  });
  displaySearchResults(results);
});
// メニューの表示切替
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}
// 初期化実行
document.addEventListener("DOMContentLoaded", fetchConfig);