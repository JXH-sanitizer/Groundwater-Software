import mapboxgl from "mapbox-gl";
import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'
import * as turf from '@turf/turf'

import getMinMax from "../getMinMax";
import scaleHeight from "../scaleHeight";
import emitter from "../emitter";

let customLayer;
let scene, camera

function initPointsLayer(map) {
  customLayer = {
    id: 'points-model',
    type: 'custom',
    renderingMode: '3d',
    onAdd: function (map, gl) {
      this.map = map;
      this.gl = gl
      this.renderer = new THREE.WebGL1Renderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true
      })
      this.renderer.autoClear = true
    },
    render: function (gl, matrix) {
      const mat = new THREE.Matrix4().fromArray(matrix)
      camera.projectionMatrix = matrix
      this.renderer.resetState()
      this.renderer.render(scene, camera)
      this.map.triggerRepaint()
      TWEEN.update()
    }
  }
  map.addLayer(customLayer)
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

// Three.js加点
function drawPoints(json, meterInMercatorCoordinates, height1mInMercatorCoordinates) {
  const minMaxObj = getMinMax(json, 'H')
  // 点的个数
  const pointsNum = json.length
  const pointsPosition = new Float32Array(pointsNum * 4)
  const colorScaleArray = new Float32Array(pointsNum)
  // 推入Float32Array
  for (let i = 0; i < pointsPosition.length; i += 4) {
    let jsonID = i / 4
    pointsPosition[i] = mapboxgl.MercatorCoordinate.fromLngLat(
      [json[jsonID]['X'], json[jsonID]['Y']],
      0
    ).x
    pointsPosition[i + 1] = mapboxgl.MercatorCoordinate.fromLngLat(
      [json[jsonID]['X'], json[jsonID]['Y']],
      0
    ).y
    pointsPosition[i + 2] = json[jsonID]['H']
    pointsPosition[i + 3] = 1.0

    colorScaleArray[jsonID] = scaleHeight(json[jsonID]['H'], minMaxObj['min'], minMaxObj['max'])
  }
  const pointsThreeRawShaderMaterial = new THREE.RawShaderMaterial({
    uniforms: {
      exaggerationHeight: {value: height1mInMercatorCoordinates * 2000},
      maxColors: {value: [0.0, 0.0, 1.0]},
      minColors: {value: [0.3960, 0.8431, 0.9686]}
    },
    glslVersion: THREE.GLSL1,
    vertexShader: `
      precision highp float;
      uniform mat4 projectionMatrix;
      uniform mat4 modelViewMatrix;
      
      attribute vec4 position;
      attribute float scale;

      varying float v_scale;

      uniform float exaggerationHeight;
      
      void main() {
        v_scale = scale;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xy, position.z * exaggerationHeight, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      
      varying float v_scale;

      uniform vec3 maxColors;
      uniform vec3 minColors;

      void main() {
        gl_Color = vec4(mix(minColors, maxColors, v_scale), 1.0);
      }
    `
  })
  const pointsGeometry = new THREE.BufferGeometry()
  pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointsPosition, 4))
  pointsGeometry.setAttribute('scale', new THREE.Float32BufferAttribute(colorScaleArray, 1))

  const points = new THREE.Points(pointsGeometry, pointsThreeRawShaderMaterial)
  return points
}


// 边界
async function fetchBoundaryJson(url) {
  try {
    let response = fetch(url)
    let data = response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}

// 获取json数据(水头 & 速度)
async function fetchHeadJson(index) {
  try {
    let dataUrl = `/headInitJSON/head-第${index}次JSON.json`
    let response = fetch(dataUrl)
    let data = await response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}

async function fetchSpdisJson(index) {
  try {
    let spdisUrl = `/spdisJson/spdis-第${index}次速度.json`
    let response = await fetch(spdisUrl)
    let data = response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}

// 入口函数
async function addPointsLayer(map, options) {
  let headJson = await fetchHeadJson(options.dataIndex)
  let spdisJson = await fetchSpdisJson(options.dataIndex)
  const boundaryUrl = '/enterExtend.json?url'
  const extent = await fetchBoundaryJson(boundaryUrl)
  const meterInMercatorCoordinates = mapboxgl.MercatorCoordinate.fromLngLat(
    turf.center(extent).geometry.coordinates, 0
  ).meterInMercatorCoordinateUnits()
  const height1mInMercatorCoordinates = mapboxgl.MercatorCoordinate.fromLngLat(
    turf.center(extent).geometry.coordinates, 1
  ).z

  initScene()
  scene.add(drawPoints(headJson, height1mInMercatorCoordinates))

  initPointsLayer(map)
}