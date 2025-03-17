// シーン、カメラ、レンダラーの作成
const scene = new THREE.Scene();
// 背景色を黒に設定
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 星の座標と関連URLを指定
const starData = [
  { position: [10, 20, -30], url: "https://www.hiroshima-u.ac.jp/" },
  { position: [-15, -5, 10], url: "https://www.hiroshima-u.ac.jp/" },
  { position: [25, 15, -10], url: "https://example.com/star3" },
  { position: [-30, 0, 25], url: "https://example.com/star4" },
  { position: [5, -25, 15], url: "https://example.com/star5" },
  { position: [50, 50, 50], url: "https://example.com/star6" },
  { position: [-40, 10, -50], url: "https://example.com/star7" },
];

// 星のジオメトリとマテリアル
const geometry = new THREE.BufferGeometry();
const vertices = [];
const stars = [];

// 星のデフォルトの色
const defaultColor = 0xffffff;

// ホバー効果用の円を追跡する変数
let hoverCircle = null;

// 座標リストから頂点データを作成
starData.forEach((data, index) => {
  vertices.push(data.position[0], data.position[1], data.position[2]);

  // 星を球体として作成
  const starGeometry = new THREE.SphereGeometry(1.2, 16, 16);

  // 環境光の影響を受けないMeshBasicMaterialを使用
  const material = new THREE.MeshBasicMaterial({
    color: defaultColor,
  });

  // メッシュを作成
  const star = new THREE.Mesh(starGeometry, material);

  // 位置を設定
  star.position.set(data.position[0], data.position[1], data.position[2]);

  scene.add(star);
  stars.push({
    position: new THREE.Vector3(...data.position),
    star,
    material,
    url: data.url,
  });
});

// ホバー効果用の白い円を作成する関数
function createHoverCircle(position) {
  // 既存のホバー円があれば削除
  if (hoverCircle) {
    scene.remove(hoverCircle);
  }

  // 円のジオメトリを作成（32セグメントの円）
  const circleGeometry = new THREE.CircleGeometry(3, 32);

  // 円のマテリアルを作成（白色、透明度あり）
  const circleMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });

  // 円メッシュを作成
  const circle = new THREE.Mesh(circleGeometry, circleMaterial);

  // 位置を設定
  circle.position.copy(position);

  // 常にカメラの方を向くようにする
  circle.lookAt(camera.position);

  // シーンに追加
  scene.add(circle);

  // 参照を保持
  hoverCircle = circle;
}

// ホバー円を削除する関数
function removeHoverCircle() {
  if (hoverCircle) {
    scene.remove(hoverCircle);
    hoverCircle = null;
  }
}

geometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(vertices, 3)
);

// 各星間に線を表示
for (let i = 0; i < starData.length; i++) {
  for (let j = i + 1; j < starData.length; j++) {
    const start = new THREE.Vector3(...starData[i].position);
    const end = new THREE.Vector3(...starData[j].position);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x888888,
      opacity: 0.5,
      transparent: true,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);

    scene.add(line);
  }
}

// カメラの位置を設定
camera.position.z = 100;

// OrbitControlsの設定（カメラ操作）
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// マウスクリックによる星の色変更およびURL遷移
const raycaster = new THREE.Raycaster();
// Points.thresholdは使用しないので削除（Meshに対しては不要）
const mouse = new THREE.Vector2();
const urlDisplay = document.getElementById("url-display");

// マウスの座標を正規化して取得
window.addEventListener("mousemove", (event) => {
  // マウスの座標を[-1, 1]に正規化
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // レイキャスターを使ってマウスオーバーした星を判定
  raycaster.setFromCamera(mouse, camera);

  // 星と交差するオブジェクトを取得
  const intersects = raycaster.intersectObjects(stars.map((s) => s.star));

  if (intersects.length > 0) {
    // ホバーした星
    const star = intersects[0].object;

    // 対応するURLを表示
    const starDataItem = stars.find((s) => s.star === star);
    if (starDataItem && starDataItem.url) {
      urlDisplay.textContent = `URL: ${starDataItem.url}`;
      urlDisplay.style.visibility = "visible";

      // ホバー効果を表示
      createHoverCircle(starDataItem.position);
    }
  } else {
    // マウスが星に重なっていない場合、URL表示とホバー効果を非表示にする
    urlDisplay.style.visibility = "hidden";
    removeHoverCircle();
  }
});

// マウスクリックで星の色をトグルおよびURL遷移
window.addEventListener("click", (event) => {
  // レイキャスターを使ってクリックされた星を判定
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(stars.map((s) => s.star));

  if (intersects.length > 0) {
    const star = intersects[0].object;

    // 星の色をトグル
    if (star.material.color.getHex() === 0xff0000) {
      star.material.color.set(defaultColor);
    } else {
      star.material.color.set(0xff0000); // 赤色に変更
    }

    // クリックした星に関連付けられたURLに遷移
    const starDataItem = stars.find((s) => s.star === star);
    if (starDataItem && starDataItem.url) {
      window.open(starDataItem.url, "_blank"); // 新しいタブでURLを開く
    }
  }
});

// レンダリングループ
function animate() {
  requestAnimationFrame(animate);

  // ホバー円があれば、常にカメラに向けて更新
  if (hoverCircle) {
    hoverCircle.lookAt(camera.position);
  }

  // シーンを描画
  renderer.render(scene, camera);

  // OrbitControlsの更新
  controls.update(); // レンダリング前にupdate()が必要
}

// 画面サイズが変わったときにレンダラーのサイズを更新
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// アニメーション開始
animate();
