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
const SUPABASE_URL = "https://rpnrxkjywdjuvwqyaxod.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbnJ4a2p5d2RqdXZ3cXlheG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5ODU1NTAsImV4cCI6MjA1NTU2MTU1MH0.5UcsToulrU63XqT21wtGJTy-pjxw-n7MlIuv7EzoP08";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
  const { data, error } = await supabaseClient
    .from("test")
    .insert([{ url, created_at: new Date() }]);

  if (error) {
    console.error(error);
    alert("URLの追加に失敗しました");
  } else {
    // フォームをクリアしてメモリストを更新
    document.getElementById("url").value = "";
    loadUrls();
  }
}

// URLをリストとして表示する関数
async function loadUrls() {
  const { data, error } = await supabaseClient.from("test").select("*");

  if (error) {
    console.error(error);
    alert("URLの取得に失敗しました");
    return;
  }

  // リストをクリア
  const urlList = document.getElementById("url-list");
  urlList.innerHTML = "";

  // 登録されたURLをリストに表示
  data.forEach((urlRecord) => {
    const li = document.createElement("li");
    li.innerHTML = `
        <a href="${urlRecord.url}" target="_blank">${urlRecord.url}</a>
        <button onclick="deleteUrl(${urlRecord.id})">削除</button>
      `;
    urlList.appendChild(li);
  });
}

// URLを削除する関数
async function deleteUrl(id) {
  const { data, error } = await supabaseClient
    .from("test")
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
