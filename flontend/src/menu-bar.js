// メニューバーの表示・非表示を切り替える関数
function toggleMenu() {
  const menu = document.getElementById("menu");
  if (menu.style.display === "block") {
    menu.style.display = "none"; // 非表示にする
  } else {
    menu.style.display = "block"; // 表示する
  }
}

//supabeseの設定
const SUPABASE_URL = window.ENV.SUPABASE_URL;
const SUPABASE_KEY = window.ENV.SUPABASE_KEY;
window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

//urlを追加する関数
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
  const { data, error } = await window.supabaseClient
    .from("websites")
    .insert([{ url, created_at: new Date() }]);

  if (error) {
    console.error(error);
    // 重複エラーの場合はユーザーフレンドリーなメッセージを表示
    if (error.code === "23505") {
      alert("このURLは既に登録されています");
    } else {
      alert("URLの追加に失敗しました");
    }
  } else {
    // フォームをクリアしてメモリストを更新
    document.getElementById("url").value = "";
    loadUrls();
  }

  try {
    const response = await fetch("http://localhost:5000/process_pipeline", {
      method: "POST",
    });
    const result = await response.json();
    console.log("Pipeline response:", result);
    if (result.status === "success") {
      window.location.href = "/flontend/public/index.html"; // :星1:️ ここでリダイレクト
    } else {
      alert("パイプラインの実行に失敗しました");
    }
  } catch (err) {
    console.error("Pipelineの実行に失敗:", err);
  }
}

// URLをリストとして表示する関数
async function loadUrls() {
  const { data, error } = await window.supabaseClient
    .from("websites")
    .select("*");

  if (error) {
    console.error(error);
    alert("URLの取得に失敗しました");
    return;
  }

  // リストをクリア
  const urlList = document.getElementById("url-list");
  urlList.innerHTML = "";

  // URLの数を更新
  const urlCounter = document.querySelector(".url-counter");
  if (urlCounter) {
    urlCounter.textContent = `URL数: ${data.length}`;
  }

  // 登録されたURLをリストに表示
  data.forEach((urlRecord) => {
    const li = document.createElement("li");
    const displayText =
      urlRecord.title && urlRecord.title.trim() !== ""
        ? urlRecord.title
        : urlRecord.url;

    li.innerHTML = `
        <a href="${urlRecord.url}" target="_blank">${displayText}</a>
        <button class="delete-button" data-id="${urlRecord.id}">削除</button>
      `;

    // 削除ボタンにイベントリスナーを追加
    li.querySelector(".delete-button").addEventListener("click", function () {
      deleteUrl(urlRecord.id);
    });
    urlList.appendChild(li);
  });
}

// URLを削除する関数
async function deleteUrl(id) {
  const { data, error } = await window.supabaseClient
    .from("websites")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("URLの削除に失敗しました");
  } else {
    loadUrls(); // 削除後にURLリストを再読み込み
  }
}

// ページ読み込み時にメモをロード
loadUrls();
