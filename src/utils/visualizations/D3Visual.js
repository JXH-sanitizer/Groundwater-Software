import mapboxgl from 'mapbox-gl'
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'

import Delaunay from '../delaunay'

import emitter from '../emitter'
import { ElMessage } from 'element-plus'

emitter.on('startAnim', () => {
  startAnim()
})
emitter.on('pauseAnim', () => {
  console.log('暂停动画')
  anim = !anim
})

let customLayer

let scene, camera

// 全部delaunay三角
let delaunayShapes = new THREE.Group()
// 每一个三角形的三个顶点的三维坐标和颜色
let delaunayPoints = []
// 形成每一个三角形的顶点的ID(8000+)
let delaunayIDs = []

// 当前属于第m份JSON数据
let m = 179

let nowJSON, nextJSON
let initURL = `/headInitJSON/head-第${m}次JSON.json`

let url1, url2
// 动画控制
let anim = false

const vertexShader = ` precision mediump float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec4 color;
varying vec4 v_color;
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  v_color = color;
}`
const fragmentShader = `precision mediump float;
varying vec4 v_color;
void main() {
  gl_FragColor = v_color;
}`
function init3DLayer(map) {
  // configuration of the custom layer for a 3D model per the CustomLayerInterface
  customLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
      this.map = map;
      this.gl = gl
      console.log(this.gl)
      // use the Mapbox GL JS map canvas for three.js
      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true
      });

      this.renderer.autoClear = false;
      
    },
    render: function (gl, matrix) {
      const mat = new THREE.Matrix4().fromArray(matrix);
      camera.projectionMatrix = mat
      this.renderer.resetState();
      this.renderer.render(scene, camera);
      this.map.triggerRepaint();
      TWEEN.update()
    }
  };
  map.addLayer(customLayer);
}
// 初始化场景
function initScene() {
  camera = new THREE.Camera()
  scene = new THREE.Scene()

  const light = new THREE.AmbientLight({
    color: 0xffffff,
    intensity: 0.8
  })
  const pointLight = new THREE.PointLight(0xff0000, 1, 200)
  pointLight.position.set(800, 3000, 800)

  scene.add(light)
  scene.add(pointLight)
}

// 获取json数据
async function fetchJSON(url) {
  try {
    let response = await fetch(url)
    let data = await response.json()
    return data
  } catch (e) {
    console.error(e)
  }
}

// 初始化delaunay算法
function initDelaunay(JSONS) {
  let vertices = new Array(JSONS.length)
  for (let i = 0; i < vertices.length; i++) {
    vertices[i] = [JSONS[i]['X'], JSONS[i]['Y']]
    delaunayPoints.push({
      x: JSONS[i]['X'],
      y: 400 * JSONS[i]['H'],
      z: JSONS[i]['Y'],
      w: JSONS[i]['S']
    })
  }

  let triangles = Delaunay.triangulate(vertices)

  return triangles
}

async function drawDelaunay(JSONS) {

  // 先获取triangles顶点序列号
  // 现在就放一个即可
  let triangles = initDelaunay(JSONS)
  for (let i = 0; i < triangles.length; i += 3) {
    // 单一网格的顶点和three图形
    let singleShapePoints = []
    let i0 = triangles[i]
    let i1 = triangles[i + 1]
    let i2 = triangles[i + 2]
    let p0 = delaunayPoints[i0]
    let p1 = delaunayPoints[i1]
    let p2 = delaunayPoints[i2]
    singleShapePoints.push(new THREE.Vector4(p0.x, p0.y, p0.z, p0.w))
    singleShapePoints.push(new THREE.Vector4(p1.x, p1.y, p1.z, p1.w))
    singleShapePoints.push(new THREE.Vector4(p2.x, p2.y, p2.z, p2.w))


    // 判断是否不属于园区边界
    if (judgePoints(singleShapePoints)) {
      let id = i / 3
      delaunayIDs.push({
        id: [i0, i1, i2]
      })

      let delaunayCubes = drawDelaunayCubes(singleShapePoints)

      delaunayShapes.add(delaunayCubes)
    }

  }
  console.log(delaunayShapes)

  return delaunayShapes
}

// 传入points数据(应该是一个有4个点的坐标的数组 + 3个顶点id)可以画出立方体效果, 三个点 每个点wxyz(w -> s)四个属性
function drawDelaunayCubes(points) {
  let vertices = [
    // x纬度 y经度 z高度
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[0].x, points[0].z],
      points[0].y
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[0].x, points[0].z],
      points[0].y
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[0].x, points[0].z],
      points[0].y
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[1].x, points[1].z],
      points[1].y
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[1].x, points[1].z],
      points[1].y
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[1].x, points[1].z],
      points[1].y
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[2].x, points[2].z],
      points[2].y
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[2].x, points[2].z],
      points[2].y
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[2].x, points[2].z],
      points[2].y
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[0].x, points[0].z],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[0].x, points[0].z],
      0
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[0].x, points[0].z],
      0
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[1].x, points[1].z],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[1].x, points[1].z],
      0
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[1].x, points[1].z],
      0
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[2].x, points[2].z],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[2].x, points[2].z],
      0
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [points[2].x, points[2].z],
      0
    ).z,
  ]
  let colors = [
    0.0, 0.0, 1.0 - points[0].w, 1.0 - points[0].w, // 0点
    0.0, 0.0, 1.0 - points[1].w, 1.0 - points[1].w, // 1点
    0.0, 0.0, 1.0 - points[2].w, 1.0 - points[2].w, // 2点
    0.0, 0.0, 1.0, 0.9,
    0.0, 0.0, 1.0, 0.9,
    0.0, 0.0, 1.0, 0.9,
  ]

  // 投影点数组
  let projection = []
  projection.push(new THREE.Vector3(points[0].x, 0, points[0].z))
  projection.push(new THREE.Vector3(points[1].x, 0, points[1].z))
  projection.push(new THREE.Vector3(points[2].x, 0, points[2].z))

  // 定义立方体的面（索引数组）
  let indices1 = [
    0, 1, 2,  // 原始三个点形成的面
    3, 4, 5,  // 投影点形成的面
    0, 3, 4,
    0, 4, 1,  // 侧面1
    1, 4, 5,
    1, 5, 2,  // 侧面2
    2, 0, 3,
    2, 3, 5   // 侧面3
  ];

  let normals = computeNormals(vertices, indices1)

  // 创建BufferGeometry
  const geometry1 = new THREE.BufferGeometry();
  geometry1.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry1.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
  // geometry1.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry1.setIndex(indices1);

  const material = new THREE.RawShaderMaterial({
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: true
  })
  const cube1 = new THREE.Mesh(geometry1, material)

  return cube1

}

// 判断形成的delaunay三角形是否为钝角三角形(如果是 那么这个三角形就在区域点位之外)
function judgePoints(projPoints) {
  const xArray = [projPoints[0].x, projPoints[1].x, projPoints[2].x]
  const zArray = [projPoints[0].z, projPoints[1].z, projPoints[2].z]
  // 如果两者相等 说明不符合要求
  if (xArray.indexOf(Math.min(...xArray)) === zArray.indexOf(Math.min(...zArray))) {
    return false
  } else {
    return true
  }
}
// 计算法线
function computeNormals(vertices, indices) {
  let normals = []
  for (let i = 0; i < indices.length; i += 3) {
    let index1 = indices[i]
    let index2 = indices[i + 1]
    let index3 = indices[i + 2]
    let vertex1 = new THREE.Vector3(vertices[index1 * 3 + 0], vertices[index1 * 3 + 1], vertices[index1 * 3 + 2])
    let vertex2 = new THREE.Vector3(vertices[index2 * 3 + 0], vertices[index2 * 3 + 1], vertices[index2 * 3 + 2])
    let vertex3 = new THREE.Vector3(vertices[index3 * 3 + 0], vertices[index3 * 3 + 1], vertices[index3 * 3 + 2])

    const vector1 = new THREE.Vector3().copy(vertex2).sub(vertex1)
    const vector2 = new THREE.Vector3().copy(vertex3).sub(vertex1)

    const normal = new THREE.Vector3().crossVectors(vector1, vector2).normalize()

    normals.push(normal.x, normal.y, normal.z)
  }

  return normals
}

// 开始动画
async function startAnim() {
  if (!anim) {
    anim = true
    try {
      await scaleCubes(m)
      if (m <= 479) {
        m++;
        console.log(m)
        anim = false
        requestAnimationFrame(startAnim)
      } else {
        anim = false
        ElMessage({
          message: '动画播放完毕',
          type: 'success'
        })
      }
    } catch (error) {
      console.error(error)
      ElMessage.error(error)
      anim = false
    }
  }
}

// 更换模型入口
async function scaleCubes(i) {
  
  try {
    url1 = `/headInitJSON/head-第${i}次JSON.json`
    url2 = `/headInitJSON/head-第${i + 1}次JSON.json`
    nowJSON = await fetchJSON(url1)
    nextJSON = await fetchJSON(url2)
    let promises = []
    // j是第几个cell的索引值
    for (let j = 0; j < delaunayIDs.length; j++) {
      let nowPosS = [], nextPosS = [], nowScaleS = [], nextScaleS = []
      // 先获取当前单元id和单元模型
      const cellIDs = delaunayIDs[j].id
      // 对每个ID上的点求它需要变换的高度和速度 3个点
      for (let k = 0; k < cellIDs.length; k++) {
        let id = cellIDs[k]
        let nowPos = mapboxgl.MercatorCoordinate.fromLngLat([nowJSON[id]['X'], nowJSON[id]['Y']], 400 * nowJSON[id]['H']).z
        let nextPos = mapboxgl.MercatorCoordinate.fromLngLat([nextJSON[id]['X'], nextJSON[id]['Y']], 400 * nextJSON[id]['H']).z
        let nowScale = nowJSON[id]['S']
        let nextScale = nextJSON[id]['S']
        // 获取到当前和下一份数据的三个点的高度值
        nowPosS.push(nowPos)
        nextPosS.push(nextPos)
        nowScaleS.push(nowScale)
        nextScaleS.push(nextScale)
      }
      let swiftTime = 500
      let promise = new Promise(resolve => {
        increaseHeights(nowPosS, nextPosS, nowScaleS, nextScaleS, swiftTime, j, resolve)
      })

      promises.push(promise)
    }

    await Promise.all(promises).then(() => {
      console.log(`${i}-${i + 1} and all animations completed.`)
    })

  } catch (error) {
    console.log(error)
    ElMessage.error(error)
  }
}

async function increaseHeights(nowPosS, nextPosS, nowScaleS, nextScaleS, swiftTime, j, resolve) {
  // 先拿到这个变动的cell单元
  let cell = delaunayShapes.children[j]
  let positionAttributes = cell.geometry.getAttribute('position');
  let colorAttributes = cell.geometry.getAttribute('color')
  async function updateVertices() {
    let initPos = {
      z1: { z: nowPosS[0] },
      z2: { z: nowPosS[1] },
      z3: { z: nowPosS[2] },
      w1: { w: nowScaleS[0] },
      w2: { w: nowScaleS[1] },
      w3: { w: nowScaleS[2] },
    }
    let nextPos = {
      z1: { z: nextPosS[0] },
      z2: { z: nextPosS[1] },
      z3: { z: nextPosS[2] },
      w1: { w: nextScaleS[0] },
      w2: { w: nextScaleS[1] },
      w3: { w: nextScaleS[2] },
    }
    let promises = []
    for (let l = 0, m = 0;
      l < positionAttributes.array.length / 2, m < colorAttributes.array.length / 2;
      l += 3, m += 4) {
      let index = l / 3
      let tween1 = new TWEEN.Tween(initPos[`z${index + 1}`])
        .to(nextPos[`z${index + 1}`], swiftTime)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
          positionAttributes.array[l + 2] = object.z
          positionAttributes.needsUpdate = true
        })
      let tween2 = new TWEEN.Tween(initPos[`w${index + 1}`])
        .to(nextPos[`w${index + 1}`], swiftTime)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function (object) {
          colorAttributes.array[m + 2] = 1.0 - object.w
          colorAttributes.array[m + 3] = 1.0 - object.w
          colorAttributes.needsUpdate = true
        })

      promises.push(new Promise(resolve => {
        tween1.onComplete(resolve)
        tween2.onComplete(resolve)
        tween1.start()
        tween2.start()
      }))
    }

    return Promise.all(promises)
  }

  await updateVertices()

  resolve()
}


// 入口函数
async function add3DHeadLayer(map) {
  let json = await fetchJSON(initURL)
  console.log(json, json.length)
  initScene()

  await drawDelaunay(json).then(shapes => {
    scene.add(shapes)
  })

  console.log('add3DLayer')

  init3DLayer(map)
  // console.log(delaunayShapes.children[10])
}

export default add3DHeadLayer