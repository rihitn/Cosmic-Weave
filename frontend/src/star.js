import { waitForSupabase, fetchStar, fetchFavorites, toggleFavorite, refreshUrls } from "./supabase.js";
import { formIsActive, setFormIsActive, getFormIsActive, toggleAddForm } from './menu.js';
import { getCurrentUser } from './auth.js';

//three
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();

const loader = new THREE.TextureLoader();

loader.load("/CosB3.png", function (texture) {
  scene.background = texture;
  texture.colorSpace = THREE.SRGBColorSpace;
});

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 90;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

//線の描写に必要
const geometry = new THREE.BufferGeometry();
const stars = [];
const clickableStars = [];

document.addEventListener("DOMContentLoaded", () => {
  waitForSupabase(generateStar);
});

async function generateStar() {
  const data = await fetchStar();
  console.log(data);
  const vertices = [];

  data.forEach((item, index) => {
    const originalPosition = item.mds_coordinates;

    const position = [
      originalPosition[0] * 100,
      originalPosition[1] * 100,
      originalPosition[2] * 100,
    ];

    vertices.push(position[0], position[1], position[2]);

    const starGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(starGeometry, material);
    star.position.set(position[0], position[1], position[2]);

    scene.add(star);

    const clickableGeometry = new THREE.SphereGeometry(4.0, 8, 8); // ← 判定サイズ拡大
    const clickableMaterial = new THREE.MeshBasicMaterial({ visible: false }); // 非表示
    const clickable = new THREE.Mesh(clickableGeometry, clickableMaterial);
    clickable.position.set(...position);
    clickable.userData.linkedStar = star; // 元の星を参照
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

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const distance = Math.sqrt(
        (stars[j].position.x - stars[i].position.x) ** 2 +
          (stars[j].position.y - stars[i].position.y) ** 2 +
          (stars[j].position.z - stars[i].position.z) ** 2
      );

      if (distance <= 25) {
        const start = stars[i].position;
        const end = stars[j].position;

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          start,
          end,
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xcccccc,
          opacity: 0.5,
          transparent: true,
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);

        scene.add(line);
      }
    }
  }
}

//一等級のエフェクト
const firstComposer = new EffectComposer(renderer);
firstComposer.addPass(new RenderPass(scene, camera));
const firstBloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.0, // 発光の強さ
  0.4, // 発光の範囲
  0.85 // 明るさのしきい値
);
firstComposer.addPass(firstBloomPass);

//クリック、ホバー時の処理
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredStar = null;
const urlDisplay = document.getElementById("url-display");

window.addEventListener("mousemove", (event) => {
  if (getFormIsActive()) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableStars);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer"; 

    // intersectsが空でない場合にのみ処理を進める
    const first = intersects[0].object.userData.linkedStar;

    if (hoveredStar !== first) {
      // 前のホバーを戻す
      if (hoveredStar) {
        hoveredStar.scale.set(1, 1, 1);
        urlDisplay.style.visibility = "hidden";
      }
      // 新しくホバーされた星を強調
      hoveredStar = first;
      hoveredStar.scale.set(1.5, 1.5, 1.5); // 拡大
      const starDataItem = stars.find((s) => s.star === first);
      if (starDataItem) {
        //title があればそれを表示、なければ URL
        const displayText =
          starDataItem.title && starDataItem.title.trim() !== ""
            ? starDataItem.title
            : starDataItem.url;

        urlDisplay.textContent = `🔗 ${displayText}`;
        urlDisplay.style.visibility = "visible";

        //星のスクリーン座標を取得し、#url-display を星の右側に配置
        const starPosition = first.position.clone();
        starPosition.project(camera); // 3D座標をスクリーン座標に変換

        const screenX = (starPosition.x * 0.5 + 0.5) * window.innerWidth;
        const screenY = (-starPosition.y * 0.5 + 0.5) * window.innerHeight;

        urlDisplay.style.left = `${screenX + 20}px`; // 星の右側に 20px 移動
        urlDisplay.style.top = `${screenY}px`;
      }
    }
  } else {
    document.body.style.cursor = "default"; // ← ホバーが外れたときに戻す


    // どこにもホバーしてないならリセット
    if (hoveredStar) {
      hoveredStar.scale.set(1, 1, 1);
      urlDisplay.style.visibility = "hidden";
      hoveredStar = null;
    }
  }
});

// マウスクリックで星の色をトグルおよびURL遷移
window.addEventListener("click", (event) => {
  if (getFormIsActive()) return;
  // レイキャスターを使ってクリックされた星を判定
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(clickableStars);

  if (intersects.length > 0) {
    const star = intersects[0].object.userData.linkedStar;

    // 星の色をトグル
    if (star.material.color.getHex() !== 0xff0000) {
      star.material.color.set(0xff0000); // 赤色に変更（変更後は戻せない）
    }

    // クリックした星に関連付けられたURLに遷移
    const starDataItem = stars.find((s) => s.star === star);
    if (starDataItem && starDataItem.url) {
      window.open(starDataItem.url, "_blank"); // 新しいタブでURLを開く
    }
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
  if (!user) {
    alert("お気に入りにはログインが必要です");
    return;
  }

  const result = await toggleFavorite(starDataItem.id);
  if (result === true) {
    starDataItem.isFavorited = true;
    starDataItem.material.color.set(0xFFD700);
  } else if (result === false) {
    starDataItem.isFavorited = false;
    starDataItem.material.color.set(0xffffff);
  }
  refreshUrls();
});

let prevCameraDistance = camera.position.distanceTo(controls.target);
let lastZoomPercent = 100;
const baseZoom = 90; // 初期の Z 位置を基準とした倍率

controls.addEventListener("change", () => {
  const currentDistance = camera.position.distanceTo(controls.target);

  // 距離が明らかに変わっていればズームと判断（回転やパンは距離がほぼ一定）
  const distanceDiff = Math.abs(currentDistance - prevCameraDistance);
  if (distanceDiff > 0.05) {
    const zoomPercent = Math.round((baseZoom / currentDistance) * 100);
    if (zoomPercent !== lastZoomPercent) {
      document.getElementById("zoom-display").textContent = `Zoom: ${zoomPercent}%`;
      lastZoomPercent = zoomPercent;
    }
    prevCameraDistance = currentDistance;
  }
});


function animate() {
  requestAnimationFrame(animate);
  firstComposer.render();
  controls.update();
}

animate();

window.addEventListener("resize", () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  firstComposer.setSize(width, height);
});

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
      if (typeof highlightStar === "function") {
        highlightStar(result.url);
      }
      setTimeout(() => {
        searchInput.value = "";
        searchResults.style.display = "none";
      }, 300); // 少し待ってから検索欄を消す（ハイライトが消えないように）
    });
    searchResults.appendChild(div);
  });
}

//検索時の強調表示
function highlightStar(url) {
  if (!stars) return;
  stars.forEach((starData) => {
    starData.material.color.setHex(0xffffff);
  });
  const match = stars.find((s) => s.url === url);
  if (match) {
    match.material.color.setHex(0xffff00); // ハイライト色
  }

  toggleAddForm();
}

searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  if (!term) {
    searchResults.style.display = "none";
    stars?.forEach((starData) => {
      starData.material.color.setHex(0xffffff);
    });
    return;
  }
  const results =
    stars?.filter((starData) => {
      const title = (starData.title || "").toLowerCase();
      const url = starData.url.toLowerCase();
      return title.includes(term) || url.includes(term);
    }) || [];
  displaySearchResults(results);
});
