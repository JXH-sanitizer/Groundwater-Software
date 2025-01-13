import mapboxgl from "mapbox-gl";
import * as THREE from 'three'

import emitter from "../emitter";
emitter.on('testLineAnim', () => {
  console.log(line)
  let attributes = line.geometry.getAttribute('position')
  console.log(attributes.array)
  setInterval(() => {
    attributes.array[2] += (mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      6500
    ).z - mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      6000
    ).z);
    attributes.needsUpdate = true
    console.log(attributes.array)
  }, 100)
})

let customLayer
let scene, camera
let line
function initTestLayer(map) {
  customLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
      this.map = map;

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
    }
  };
  map.addLayer(customLayer)
}
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
function drawTestLine() {
  let vertices = [
    // x纬度 y经度 z高度
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      6000
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      6000
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      6000
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9265, 31.9265],
      6000
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9265, 31.9265],
      6000
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9265, 31.9265],
      6000
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9365, 31.97],
      6000
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9365, 31.97],
      6000
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9365, 31.97],
      6000
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      0
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9465, 31.9465],
      0
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9265, 31.9265],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9265, 31.9265],
      0
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9265, 31.9265],
      0
    ).z,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9365, 31.97],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9365, 31.97],
      0
    ).y,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [119.9365, 31.97],
      0
    ).z,
  ]
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
  console.log(vertices)
  const geometry1 = new THREE.BufferGeometry()
  geometry1.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry1.setIndex(indices1);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000
  })
  const line = new THREE.Mesh(geometry1, material)

  return line
}

function addLineToLayer(map) {
  initScene()
  line = drawTestLine()
  scene.add(line)

  initTestLayer(map)
}

export default addLineToLayer