// シーン、カメラ、レンダラーの作成
const scene = new THREE.Scene();
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

// 座標リストから頂点データを作成
starData.forEach((data, index) => {
  vertices.push(data.position[0], data.position[1], data.position[2]);

  // 星を個別に作成
  const material = new THREE.PointsMaterial({
    color: defaultColor,
    size: 1.5,
  });
  const starGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...data.position),
  ]);
  const star = new THREE.Points(starGeometry, material);
  scene.add(star);
  stars.push({
    position: new THREE.Vector3(...data.position),
    star,
    material,
    url: data.url,
  });
});

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

// マウスクリックによる星の色変更およびURL遷移
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const urlDisplay = document.getElementById("url-display");

// マウスの座標を正規化して取得
window.addEventListener("mousemove", (event) => {
  // マウスの座標を[-1, 1]に正規化
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // レイキャスターを使ってマウスオーバーした星を判定
  raycaster.setFromCamera(mouse, camera);

  // 星をクリックして交差するオブジェクトを取得
  const intersects = raycaster.intersectObjects(stars.map((s) => s.star));

  if (intersects.length > 0) {
    // クリックした星
    const star = intersects[0].object;

    // 対応するURLを表示
    const starDataItem = stars.find((s) => s.star === star);
    if (starDataItem && starDataItem.url) {
      urlDisplay.textContent = `URL: ${starDataItem.url}`;
      urlDisplay.style.visibility = "visible";
    }
  } else {
    // マウスが星に重なっていない場合、URL表示を非表示にする
    urlDisplay.style.visibility = "hidden";
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

  // シーンを描画
  renderer.render(scene, camera);
}

// 画面サイズが変わったときにレンダラーのサイズを更新
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// アニメーション開始
animate();
