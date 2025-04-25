import { insertUrl } from "/supabase.js";

function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

const menuButton = document.querySelector(".menu-button");
menuButton.addEventListener("click", toggleMenu);

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
  const { error } = await insertUrl(url);
  if (!error) {
    console.log("パイプラインを実行します");
    try {
      const response = await fetch(
        "https://cosmic-weave-604389536871.us-central1.run.app/process_pipeline",
        {
          method: "POST",
        }
      );
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
}

const addUrlButton = document.querySelector(".addUrl-button");
addUrlButton.addEventListener("click", addUrl);
