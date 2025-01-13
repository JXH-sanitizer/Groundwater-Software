import WaterPoints from "../points-gl/points-gl";

import emitter from '../emitter'
import { ElMessage } from "element-plus";

emitter.on('startPointsAnim', () => {
  console.log('startPointAnim')
})

let waterPoint
let tmpmatrix
let boundaries

function initPointLayer(map, options, json, spdis, gui, boundariesVertex) {
  let customLayer = {
    id: 'points-layer',
    type: 'custom',
    onAdd: function (map, gl) {
      // 此时没有_options
      waterPoint = new WaterPoints(gl)
      // 此时有了_options
      waterPoint.options = options
      waterPoint.speedFactorLng = options.speedFactorLng
      waterPoint.speedFactorLat = options.speedFactorLat
      waterPoint.dropLevel = options.dropLevel
      console.log(options)
      waterPoint.headFactor = options.headFactor
      waterPoint.liveTime = options.particleLiveTime
      waterPoint.json = json
      waterPoint.boundariesVertex = boundariesVertex
      waterPoint.spdis = spdis
    },
    render: function (gl, matrix) {
      tmpmatrix = matrix
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      waterPoint.draw(matrix)
      map.triggerRepaint()
    },
  };
  map.addLayer(customLayer)
  ElMessage({
    message: '点迹图层生成成功！展示图层！',
    type: 'success'
  })
  map.on('wheel', function() {
    waterPoint.resize()
  })
  map.on('dragstart', function() {
    waterPoint.resize()
  })
  map.on('move', function() {
    waterPoint.resize()
  })
  const updateParticlesHandler = function() {
    waterPoint.updateParticles(waterPoint.framebuffer1, waterPoint.particleStateTexture1)
    let temp = waterPoint.particleStateTexture0
    waterPoint.particleStateTexture0 = waterPoint.particleStateTexture1
    waterPoint.particleStateTexture1 = temp
  }
  // 控制
  emitter.on('startPointsFlow', () => {
    console.log(waterPoint)
    map.on('render', updateParticlesHandler)
  })
  emitter.on('removePointsLayer', () => {
    map.removeLayer('points-layer');
    map.off('render', updateParticlesHandler)
    waterPoint.deleteContext()
    ElMessage({
      type: 'success',
      message: '点迹图层删除成功!'
    })
  })
  const controller = {
    '纬度方向速度增量': options.speedFactorLng,
    '经度方向速度增量': options.speedFactorLat,
    '水头变化速度增量': options.headFactor,
    '返回原位阈值': options.dropLevel
  }
  gui.add(controller, '纬度方向速度增量', -10000, 10000, 0.5).onChange(value => {
    waterPoint.speedFactorLng = value
  })
  gui.add(controller, '经度方向速度增量', -10000, 10000, 0.5).onChange(value => {
    waterPoint.speedFactorLat = value
  })
  gui.add(controller, '水头变化速度增量', 0, 1000, 10).onChange(value => {
    waterPoint.headFactor = value
  })
  gui.add(controller, '返回原位阈值', 0, 0.01, 0.00001).onChange(value => {
    waterPoint.dropLevel = value
  })
}

// 异步获取数据
async function fetchJson(index) {
  try {
    let dataUrl = `/headInitJSON/head-第${index}次JSON.json`
    let response = await fetch(dataUrl)
    let data = response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}

async function fetchSpdisJson(index) {
  try {
    let dataUrl = `/spdisJson/spdis-第${index}次速度.json`
    let response = await fetch(dataUrl)
    let data = response.json()
    return data
  } catch(error) {
    console.error(error)
  }
}

async function fetchJSON(url) {
  try {
    let response = await fetch(url)
    let data = await response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}

async function addPointsLayer(map, options, gui) {
  let json = await fetchJson(options.dataIndex)
  let boundariesUrl = '/enterExtend.json'
  boundaries = await fetchJSON(boundariesUrl)
  let boundariesVertex = []
  boundaries.geometry.coordinates[0].forEach(element => {
    boundariesVertex.push([element[0], element[1]])
  });
  let spdis = await fetchSpdisJson(options.dataIndex)
  console.log('addPointsLayer')
  initPointLayer(map, options, json, spdis, gui, boundariesVertex)
}

export default addPointsLayer