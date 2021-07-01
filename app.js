'use strict';

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

function main() {
  // create WebGLRenderer
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  const cellSize = 256; // 복셀 큐브들이 생성되는 영역의 size값

  // create camera
  const fov = 75;
  const aspect = 2;
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(-cellSize * 0.3, cellSize * 0.8, -cellSize * 0.3); // cellSize로 카메라의 위치값을 구해놓음

  // create OrbitControls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2); // 마찬가지로 카메라의 시선을 고정시킬 좌표값도 cellSize로 구함.
  controls.update(); // OrbitControls의 값을 바꿔줬으면 업데이트를 호출해줘야 함.

  // 씬을 생성하고 배경색을 하늘색으로 지정함
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('lightblue');

  // create directionalLight(직사광)
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  const cell = new Uint8Array(cellSize * cellSize * cellSize); // 256*256*256개의 요소들 각각에 대해 복셀 메쉬를 만들어도 되는지, 그 허용여부를 저장해두는 형식화 배열
  // 사인 함수 곡선으로 언덕을 한 겹 만들어주는 3중 for loop
  for (let y = 0; y < cellSize; y++) {
    for (let z = 0; z < cellSize; z++) {
      for (let x = 0; x < cellSize; x++) {
        // y좌표값에 관계없이 x, z좌표값의 사인값으로만 계산한 복셀의 y좌표값을 정할 기준높이값(?) -> x, z값이 동일하다면 height값도 동일하게 나올거임.
        // height의 범위는 x,z좌표값에 따라 88 ~ 168 사이의 실수값이 계산될거임.
        const height = (Math.sin(x / cellSize * Math.PI * 4) + Math.sin(z / cellSize * Math.PI * 6)) * 20 + cellSize / 2
        if (height > y && height < y + 1) {
          // height의 정수 부분과 값이 일치하는 y좌표값만 if block을 들어와서, cell 형식화 배열의 인덱스를 계산해주고, 그 인덱스에 1을 할당함. -> 아래의 두 번째 3중 for loop에서 1이 할당된 블록만 x,y,z값을 위치값으로 지정한 복셀 메쉬를 만들거임 
          // 이렇게 하면 '한겹'의 복셀 언덕만 만들어지겠지
          const offset = y * cellSize * cellSize + z * cellSize + x;
          cell[offset] = 1;
        }
      }
    }
  }

  // 복셀 메쉬를 만들 때 사용할 머티리얼과 지오메트리 생성
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshPhongMaterial({
    color: 'green'
  });

  // cell 형식화배열을 전부 돌면서 해당 인덱스의 값이 0이 아닐 때에만(즉, 1일 때에만) 해당 좌표값 지점에 복셀 메쉬를 만들어 줌.
  for (let y = 0; y < cellSize; y++) {
    for (let z = 0; z < cellSize; z++) {
      for (let x = 0; x < cellSize; x++) {
        const offset = y * cellSize * cellSize + z * cellSize + x;
        const block = cell[offset]; // cell 형식화배열의 각 인덱스에 주어진 값을 block에 할당함.

        if (block) {
          // 할당받은 block값이 0이 아니라면, 현재의 x, y, z좌표값에 복셀 메쉬를 생성해서 씬에 추가함.
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(x, y, z);
          scene.add(mesh);
        }
      }
    }
  }

  // resize renderer
  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }

    return needResize;
  }

  let renderRequested = false; // OrbitControls.update()에 의해 render 함수가 호출된건지 판별하는 변수

  // render
  function render() {
    renderRequested = undefined; // 변수를 초기화함.

    // 렌더러가 리사이징되면 그에 맞게 카메라 비율(aspect)도 업데이트 해줌
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix(); // 카메라의 속성값을 바꿔주면 업데이트를 호출해야 함.
    }

    controls.update(); // camera transform(위치값, 각도 등)에 변화가 생기면 update loop 안에서 호출해줘야 함. 

    renderer.render(scene, camera);
  }
  render(); // 일단 페이지 첫 로드 시 뭐가 보여야 되니까 render 함수를 최초 호출해준 것.

  // render 함수 실행 도중 카메라가 또 움직여서 render 함수호출예약을 했는데(그래서 renderRequested = true인 상태), render 함수 내에서 마침 controls.update()에 의해 또 render함수를 중복예약 하려들수도 있음.
  // 이때 '이미 한 번 예약됬어~' 라고 말해주는 게 renderRequested = true인 상태임. 그래서 if block을 통과하지 못하게 해서 중복 예약을 방지하는 것.
  function requestRenderIfNotRequested() {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(render);
    }
  }

  controls.addEventListener('change', requestRenderIfNotRequested);
  window.addEventListener('resize', requestRenderIfNotRequested); // OrbitControls의 움직임 또는 브라우저 resize가 발생할 때에만 다음 render 함수 호출을 예약할 수 있도록 함.
}

main();