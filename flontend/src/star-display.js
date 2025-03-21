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

// menu-bar.jsですでに宣言されているsupabaseClientを使用

// 星のジオメトリとマテリアル
const geometry = new THREE.BufferGeometry();
// 星のデータをグローバルに利用できるようにする
window.stars = [];

// 星のデフォルトの色
window.defaultColor = 0xffffff;

// ホバー効果用の円を追跡する変数
let hoverCircle = null;

// Supabaseクライアントが定義されるまで待機する関数
function waitForSupabaseClient(callback) {
  let retries = 10;
  const interval = setInterval(() => {
    if (window.supabaseClient) {
      clearInterval(interval);
      console.log("✅ Supabaseクライアントが `star-display.js` で利用可能になりました");
      callback();
    } else {
      console.warn("⏳ Supabaseクライアントが未定義... 再試行");
      retries--;
      if (retries === 0) {
        clearInterval(interval);
        console.error("❌ Supabaseクライアントが取得できませんでした");
      }
    }
  }, 500); // 500msごとにチェック
}

// `fetchStarDataAndCreateStars()` を Supabase クライアントが定義された後に実行
document.addEventListener("DOMContentLoaded", () => {
  waitForSupabaseClient(fetchStarDataAndCreateStars);
});


// Supabaseからデータを取得して星を生成する関数
async function fetchStarDataAndCreateStars() {
  try {
    const { data, error } = await window.supabaseClient
      .from("websites")
      .select("url,title, mds_coordinates");

    if (error) {
      console.error("Error fetching data from Supabase:", error);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No star data found in Supabase");
      return;
    }

    console.log("Fetched star data:", data);

    // 頂点データをクリア
    const vertices = [];

    // Supabaseから取得したデータを使って星を生成
    data.forEach((item, index) => {
      // mds_coordinatesが存在するかチェック
      if (!item.mds_coordinates) {
        console.warn(`Star at index ${index} has no coordinates, skipping`);
        return;
      }

      // 座標データを取得
      const originalPosition = item.mds_coordinates;

      // 有効な座標データかチェック
      if (!Array.isArray(originalPosition) || originalPosition.length !== 3) {
        console.warn(
          `Invalid coordinates for star at index ${index}, skipping`
        );
        return;
      }

      // 座標値を100倍する
      const position = [
        originalPosition[0] * 100,
        originalPosition[1] * 100,
        originalPosition[2] * 100,
      ];

      // 頂点データに追加
      vertices.push(position[0], position[1], position[2]);

      // 星を球体として作成
      const starGeometry = new THREE.SphereGeometry(1.2, 16, 16);

      // 環境光の影響を受けないMeshBasicMaterialを使用
      const material = new THREE.MeshBasicMaterial({
        color: defaultColor,
      });

      // メッシュを作成
      const star = new THREE.Mesh(starGeometry, material);

      // 位置を設定
      star.position.set(position[0], position[1], position[2]);

      scene.add(star);
      stars.push({
        position: new THREE.Vector3(...position),
        star,
        material,
        url: item.url,
        title: item.title,
      });
    });

    // Buffer geometryを更新
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    // 各星間に線を表示
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const start = stars[i].position;
        const end = stars[j].position;

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
          start,
          end,
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x444444,
          opacity: 0.5,
          transparent: true,
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);

        scene.add(line);
      }
    }
  } catch (error) {
    console.error("Error in fetchStarDataAndCreateStars:", error);
  }
}

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

// カメラの位置を設定
camera.position.z = 100;

// OrbitControlsの設定（カメラ操作）
const controls = new THREE.OrbitControls(camera, renderer.domElement);

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

  // 星と交差するオブジェクトを取得
  const intersects = raycaster.intersectObjects(stars.map((s) => s.star));

  if (intersects.length > 0) {
    // ホバーした星
    const star = intersects[0].object;

    // 対応するURLを表示
    const starDataItem = stars.find((s) => s.star === star);
    if (starDataItem) {
      //title があればそれを表示、なければ URL
      const displayText =
        starDataItem.title && starDataItem.title.trim() !== ""
          ? starDataItem.title
          : starDataItem.url;

      urlDisplay.textContent = `🔗 ${displayText}`;
      urlDisplay.style.visibility = "visible";

      //星のスクリーン座標を取得し、#url-display を星の右側に配置
      const starPosition = star.position.clone();
      starPosition.project(camera); // 3D座標をスクリーン座標に変換

      const screenX = (starPosition.x * 0.5 + 0.5) * window.innerWidth;
      const screenY = (-starPosition.y * 0.5 + 0.5) * window.innerHeight;

      urlDisplay.style.left = `${screenX + 20}px`; // 星の右側に 20px 移動
      urlDisplay.style.top = `${screenY}px`;

      createHoverCircle(star.position);
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

// DOMが完全に読み込まれた後に初期化
document.addEventListener("DOMContentLoaded", () => {
  // 初期化の遅延: supabaseClientが確実に定義されるようにするためのタイムアウト
  setTimeout(() => {
    if (window.supabaseClient) {
      // アプリケーション起動時にデータを取得して星を生成
      fetchStarDataAndCreateStars();
    } else {
      console.error(
        "supabaseClient is not defined. Please check if menu-bar.js is loaded correctly."
      );
    }
  }, 500); // 500ms待機
});

// アニメーション開始
animate();

window.highlightStar = function (url) {
  if (!window.stars || window.stars.length === 0) {
    console.warn(":星1: 星データがまだロードされていません");
    return;
  }
  // すべての星の色をリセット
  window.stars.forEach((starData) => {
    if (starData.star && starData.star.material) {
      starData.star.material.color.setHex(window.defaultColor);
      starData.star.material.needsUpdate = true;
    }
  });
  // URLを正規化して一致を取る
  const normalize = (str) => str.replace(/\/+$/, "");
  const matchingStar = window.stars.find(
    (s) => normalize(s.url) === normalize(url)
  );
  if (matchingStar && matchingStar.star && matchingStar.star.material) {
    const material = matchingStar.star.material;
    console.log("マテリアルの現在色:", material.color.getHexString());
    material.color.setRGB(1.0, 1.0, 0.0); // ← setHex でなく set を試す
    material.needsUpdate = true;
    console.log(":チェックマーク_緑: ハイライトされた星:", matchingStar.title || matchingStar.url);
  } else {
    console.warn(":警告: 該当する星が見つかりませんでした:", url);
  }
};