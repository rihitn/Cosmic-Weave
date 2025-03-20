// メニューバーの表示・非表示を切り替える関数
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = (menu.style.display === "block") ? "none" : "block";
}

// 環境変数の取得
const SUPABASE_URL = window.ENV.SUPABASE_URL;
const SUPABASE_KEY = window.ENV.SUPABASE_KEY;

// Supabaseの設定
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

  // Supabaseにデータを挿入
  const { data, error } = await supabaseClient
    .from("websites")
    .insert([{ url, created_at: new Date() }]);

  if (error) {
    console.error(error);
    alert("URLの追加に失敗しました");
  } else {
    document.getElementById("url").value = "";
    loadUrls();
  }

  // パイプライン実行
  try {
    const response = await fetch("https://cosmic-weave-604389536871.us-central1.run.app/process_pipeline", {
      method: "POST",
    });
    const result = await response.json();
    console.log("Pipeline response:", result);
    if (result.status === "success") {
      window.location.href = "/frontend/public/index.html"; // リダイレクト
    } else {
      alert("パイプラインの実行に失敗しました");
    }
  } catch (err) {
    console.error("Pipelineの実行に失敗:", err);
  }
}

// Supabase から URL を取得する関数
async function loadUrls() {
  const { data, error } = await supabaseClient.from("websites").select("*");

  if (error) {
    console.error(error);
    alert("URLの取得に失敗しました");
    return;
  }

  // URLリストを更新
  const urlList = document.getElementById("url-list");
  urlList.innerHTML = "";
  data.forEach((urlRecord) => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="${urlRecord.url}" target="_blank">${urlRecord.url}</a>
      <button class="delete-button" onclick="deleteUrl('${urlRecord.id}')">削除</button>`;
    urlList.appendChild(li);
  });
}

// URLを削除する関数
async function deleteUrl(id) {
  const { data, error } = await supabaseClient
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

// ページ読み込み時にURLをロード
loadUrls();
