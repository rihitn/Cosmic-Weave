import { waitForSupabase, fetchStar, fetchFavorites, toggleFavorite, refreshUrls } from "./supabase.js";
import { getFormIsActive, toggleAddForm } from './menu.js';
import { getCurrentUser } from './auth.js';

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const loader = new THREE.TextureLoader();
loader.load("/CosB3.png", (texture) => {
  scene.background = texture;
  texture.colorSpace = THREE.SRGBColorSpace;
});

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 90;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const geometry = new THREE.BufferGeometry();
const stars = [];
const clickableStars = [];

document.addEventListener("DOMContentLoaded", () => {
  waitForSupabase(generateStar);
});

async function generateStar() {
  const data = await fetchStar();
  const vertices = [];

  data.forEach((item) => {
    const originalPosition = item.mds_coordinates;
    const position = [
      originalPosition[0] * 100,
      originalPosition[1] * 100,
      originalPosition[2] * 100,
    ];
    vertices.push(...position);

    const starGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(starGeometry, material);
    star.position.set(...position);
    scene.add(star);

    const clickableGeometry = new THREE.SphereGeometry(4.0, 8, 8);
    const clickableMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const clickable = new THREE.Mesh(clickableGeometry, clickableMaterial);
    clickable.position.set(...position);
    clickable.userData.linkedStar = star;
    scene.add(clickable);
    clickableStars.push(clickable);

    stars.push({
      id: item.id,
      position: new THREE.Vector3(...position),
      star,
      material,
      url: item.url,
      title: item.title,
      isFavorited: false,
    });
  });

  // お気に入りの星を金色に
  const favIds = await fetchFavorites();
  stars.forEach(starData => {
    if (favIds.has(starData.id)) {
      starData.isFavorited = true;
      starData.material.color.set(0xFFD700);
    }
  });

  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));

  // 近い星を線で結ぶ
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const d = stars[i].position.distanceTo(stars[j].position);
      if (d <= 25) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([stars[i].position, stars[j].position]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xcccccc, opacity: 0.5, transparent: true });
        scene.add(new THREE.Line(lineGeometry, lineMaterial));
      }
    }
  }
}

// ポストプロセス
const firstComposer = new EffectComposer(renderer);
firstComposer.addPass(new RenderPass(scene, camera));
firstComposer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0, 0.4, 0.85
));

// Raycaster / mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredStar = null;
const urlDisplay = document.getElementById("url-display");

// ホバー処理
window.addEventListener("mousemove", (event) => {
  if (getFormIsActive()) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableStars);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
    const first = intersects[0].object.userData.linkedStar;
    if (hoveredStar !== first) {
      if (hoveredStar) {
        hoveredStar.scale.set(1, 1, 1);
        urlDisplay.style.visibility = "hidden";
      }
      hoveredStar = first;
      hoveredStar.scale.set(1.5, 1.5, 1.5);
      const starDataItem = stars.find(s => s.star === first);
      if (starDataItem) {
        const displayText = starDataItem.title?.trim() || starDataItem.url;
        urlDisplay.textContent = `🔗 ${displayText}`;
        urlDisplay.style.visibility = "visible";

        const pos = first.position.clone().project(camera);
        const sx = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const sy = (-pos.y * 0.5 + 0.5) * window.innerHeight;
        urlDisplay.style.left = `${sx + 20}px`;
        urlDisplay.style.top  = `${sy}px`;
      }
    }
  } else {
    document.body.style.cursor = "default";
    if (hoveredStar) {
      hoveredStar.scale.set(1, 1, 1);
      urlDisplay.style.visibility = "hidden";
      hoveredStar = null;
    }
  }
});

// === STAR POPUP ===
const starPopup   = document.getElementById("star-popup");
const popupTitle  = document.getElementById("popup-title");
const popupUrl    = document.getElementById("popup-url");
const popupFavStatus = document.getElementById("popup-fav-status");
const popupOpen   = document.getElementById("popup-open");
const popupFavToggle = document.getElementById("popup-fav-toggle");
const popupClose  = document.getElementById("popup-close");
let activePopupStar = null;

function showPopup(starDataItem) {
  activePopupStar = starDataItem;
  popupTitle.textContent = starDataItem.title?.trim() || starDataItem.url;
  const shortUrl = starDataItem.url.length > 55
    ? starDataItem.url.slice(0, 55) + "…"
    : starDataItem.url;
  popupUrl.href = starDataItem.url;
  popupUrl.textContent = shortUrl;
  _refreshPopupFav(starDataItem);
  starPopup.style.display = "block";
}

function _refreshPopupFav(starDataItem) {
  if (starDataItem.isFavorited) {
    popupFavStatus.textContent = "⭐ お気に入り登録済み";
    popupFavToggle.textContent = "⭐ 解除";
  } else {
    popupFavStatus.textContent = "";
    popupFavToggle.textContent = "☆ お気に入り";
  }
  popupFavToggle.onclick = async () => {
    const user = await getCurrentUser();
    if (!user) { alert("お気に入りにはログインが必要です"); return; }
    const result = await toggleFavorite(starDataItem.id);
    if (result === true)  { starDataItem.isFavorited = true;  starDataItem.material.color.set(0xFFD700); }
    if (result === false) { starDataItem.isFavorited = false; starDataItem.material.color.set(0xffffff); }
    _refreshPopupFav(starDataItem);
    refreshUrls();
  };
}

function hidePopup() {
  starPopup.style.display = "none";
  activePopupStar = null;
}

popupClose.addEventListener("click", hidePopup);
popupOpen.addEventListener("click", () => {
  if (activePopupStar) window.open(activePopupStar.url, "_blank");
  hidePopup();
});

// クリックで星のポップアップを表示
window.addEventListener("click", (event) => {
  if (getFormIsActive()) return;
  if (event.target.closest("#star-popup")) return; // ポップアップ内クリックは無視

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableStars);

  if (intersects.length > 0) {
    const star = intersects[0].object.userData.linkedStar;
    const starDataItem = stars.find(s => s.star === star);
    if (starDataItem) showPopup(starDataItem);
  } else {
    hidePopup();
  }
});

// 右クリックでお気に入りトグル
window.addEventListener("contextmenu", async (event) => {
  if (getFormIsActive()) return;
  event.preventDefault();

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableStars);
  if (intersects.length === 0) return;

  const star = intersects[0].object.userData.linkedStar;
  const starDataItem = stars.find(s => s.star === star);
  if (!starDataItem) return;

  const user = await getCurrentUser();
  if (!user) { alert("お気に入りにはログインが必要です"); return; }

  const result = await toggleFavorite(starDataItem.id);
  if (result === true)  { starDataItem.isFavorited = true;  starDataItem.material.color.set(0xFFD700); }
  if (result === false) { starDataItem.isFavorited = false; starDataItem.material.color.set(0xffffff); }
  refreshUrls();
});

// ズーム表示
let prevCameraDistance = camera.position.distanceTo(controls.target);
let lastZoomPercent = 100;
const baseZoom = 90;
controls.addEventListener("change", () => {
  const currentDistance = camera.position.distanceTo(controls.target);
  if (Math.abs(currentDistance - prevCameraDistance) > 0.05) {
    const zoomPercent = Math.round((baseZoom / currentDistance) * 100);
    if (zoomPercent !== lastZoomPercent) {
      document.getElementById("zoom-display").textContent = `Zoom: ${zoomPercent}%`;
      lastZoomPercent = zoomPercent;
    }
    prevCameraDistance = currentDistance;
  }
});

// アニメーションループ（お気に入り星のパルス含む）
function animate() {
  requestAnimationFrame(animate);
  const t = Date.now() * 0.0015;
  stars.forEach(starData => {
    if (starData.isFavorited && starData.star !== hoveredStar) {
      const pulse = 1 + 0.18 * Math.sin(t * 1.4 + starData.id * 0.7);
      starData.star.scale.setScalar(pulse);
    }
  });
  firstComposer.render();
  controls.update();
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  firstComposer.setSize(window.innerWidth, window.innerHeight);
});

// === キーボードショートカット ===
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  const isTyping = tag === "input" || tag === "textarea";

  if (e.key === "/" && !isTyping && !getFormIsActive()) {
    e.preventDefault();
    toggleAddForm();
    setTimeout(() => document.getElementById("search-input")?.focus(), 50);
  }
  if (e.key === "Escape") {
    if (getFormIsActive()) toggleAddForm();
    hidePopup();
  }
});

// === 検索 ===
const searchInput   = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

function displaySearchResults(results) {
  searchResults.innerHTML = "";
  if (results.length === 0) { searchResults.style.display = "none"; return; }
  searchResults.style.display = "block";
  const seen = new Set();
  results.forEach((result) => {
    if (seen.has(result.url)) return;
    seen.add(result.url);
    const div = document.createElement("div");
    div.className = "search-result-item";
    div.textContent = result.title || result.url;
    div.addEventListener("click", () => {
      highlightStar(result.url);
      setTimeout(() => {
        searchInput.value = "";
        searchResults.style.display = "none";
      }, 300);
    });
    searchResults.appendChild(div);
  });
}

function highlightStar(url) {
  stars.forEach(s => {
    s.material.color.setHex(s.isFavorited ? 0xFFD700 : 0xffffff);
  });
  const match = stars.find(s => s.url === url);
  if (match) match.material.color.setHex(0xffff00);
  toggleAddForm();
}

searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  if (!term) {
    searchResults.style.display = "none";
    stars.forEach(s => s.material.color.setHex(s.isFavorited ? 0xFFD700 : 0xffffff));
    return;
  }
  const results = stars.filter(s =>
    (s.title || "").toLowerCase().includes(term) || s.url.toLowerCase().includes(term)
  );
  displaySearchResults(results);
});
