import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      .select("id, url, title, mds_coordinates, added_by");
    console.log("データ取得成功");
    return data;
  } catch {
    console.log("error in fetchStar");
  }
}

export async function fetchFavorites() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return new Set();
  const { data, error } = await supabase
    .from("favorites")
    .select("website_id");
  if (error || !data) return new Set();
  return new Set(data.map(f => f.website_id));
}

export async function toggleFavorite(websiteId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: existing } = await supabase
    .from("favorites")
    .select("id")
    .eq("website_id", websiteId)
    .limit(1);

  if (existing && existing.length > 0) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("website_id", websiteId);
    return error ? null : false; // false = removed
  } else {
    const { error } = await supabase
      .from("favorites")
      .insert({ website_id: websiteId, user_id: session.user.id });
    return error ? null : true; // true = added
  }
}

export async function insertUrl(url) {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from("websites")
    .insert([{ url, created_at: new Date(), added_by: session?.user?.id ?? null }]);
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

export function refreshUrls() {
  loadUrls();
}

async function loadUrls() {
  if (!supabase) return;
  const { data, error } = await supabase.from("websites").select("*");
  if (error) {
    console.error(error);
    alert("URLの取得に失敗しました");
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  let favIds = new Set();
  if (session?.user) {
    const { data: favData } = await supabase.from("favorites").select("website_id");
    if (favData) favIds = new Set(favData.map(f => f.website_id));
  }

  const urlList = document.getElementById("url-list");
  urlList.innerHTML = "";
  const urlCounter = document.querySelector(".url-counter");
  if (urlCounter) {
    urlCounter.textContent = `URL数: ${data.length}`;
  }

  data.forEach((urlRecord) => {
    const isFav = favIds.has(urlRecord.id);
    const li = document.createElement("li");
    const displayText =
      urlRecord.title?.trim() !== "" ? urlRecord.title : urlRecord.url;
    li.innerHTML = `
      <button class="favorite-btn" title="${isFav ? 'お気に入り解除' : 'お気に入りに追加'}">${isFav ? "⭐" : "☆"}</button>
      <a href="${urlRecord.url}" target="_blank" title="${displayText}">${displayText}</a>
      <button class="delete-button" data-id="${urlRecord.id}">削除</button>
    `;
    li.querySelector(".favorite-btn").addEventListener("click", async () => {
      if (!session?.user) {
        alert("お気に入りにはログインが必要です");
        return;
      }
      await toggleFavorite(urlRecord.id);
      loadUrls();
    });
    li.querySelector(".delete-button").addEventListener("click", () => {
      if (isFav) {
        alert("この星はお気に入りに登録されているため削除できません\nお気に入りを解除してから削除してください");
        return;
      }
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
