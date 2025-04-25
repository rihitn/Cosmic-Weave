import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = 	import.meta.env.VITE_SUPABASE_URL; // ここに自分のURL
const supabaseAnonKey = 	import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 以下の関数は同じ（省略しません）
export function waitForSupabase(callback) {
  let retry = 10;
  const interval = setInterval(() => {
    if (supabase) {
      clearInterval(interval);
      console.log("supabaseクライアントが利用可能になりました。");
      loadUrls();
      callback();
    } else {
      console.log("supabaseクライアントが未定義。...再試行");
      retry--;
    }
    if (retry === 0) {
      clearInterval(interval);
      console.log("supabaseクライアントが取得できませんでした。");
    }
  }, 500);
}

export async function fetchStar() {
  try {
    const { data, error } = await supabase
      .from("websites")
      .select("url,title, mds_coordinates");
    console.log("データ取得成功");
    return data;
  } catch {
    console.log("error in fetchStar");
  }
}

export async function insertUrl(url) {
  const { data, error } = await supabase
    .from("websites")
    .insert([{ url, created_at: new Date() }]);
  if (error) {
    console.error(error);
    if (error.code === "23505") {
      alert("このURLは既に登録されています");
    } else {
      alert("URLの追加に失敗しました");
    }
    return { error };
  } else {
    document.getElementById("url").value = "";
    loadUrls();
    return { error: null };
  }
}

async function loadUrls() {
  if (!supabase) return;
  const { data, error } = await supabase.from("websites").select("*");
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
    const displayText =
      urlRecord.title?.trim() !== "" ? urlRecord.title : urlRecord.url;
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

async function deleteUrl(id) {
  if (!supabase) return;
  const { error } = await supabase.from("websites").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("URLの削除に失敗しました");
  } else {
    loadUrls();
  }
}
