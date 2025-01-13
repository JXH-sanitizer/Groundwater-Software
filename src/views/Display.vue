<template>
  <div>
    <div id="map" ref="mapContainer"></div>
  </div>
</template>

<script setup>
// 导入库
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import mapboxgl from 'mapbox-gl';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'

// 导入依赖
import emitter from '@/utils/emitter';
import add3DHeadLayer from '@/utils/visualizations/D3Visual';
import addIsolinesLayer from '@/utils/visualizations/IsolinesVisual'
import addIsobandsLayer from '@/utils/visualizations/IsobandsVisual'
import addPointsLayer from '@/utils/visualizations/PointsVisual';

// pinia状态管理
import { useInterpolateStore } from '@/stores/useInterpolateStore';
import { usePointsStore } from '@/stores/usePointsStore'
const interpolateStore = useInterpolateStore()
const pointsStore = usePointsStore()

const interpolateOptions = interpolateStore.$state
const pointsOptions = pointsStore.$state
// 测试
// import addLineToLayer from '@/utils/visualizations/AddTestLine';

let map, gl
const mapContainer = ref(null)
const gui = new GUI({
  title: '点迹模型控件',
  width: 300
})
let location = reactive([59.9465, 1.9465])
onMounted(() => {
  mapboxgl.accessToken = 'pk.eyJ1Ijoic2hlcmxvbWNjIiwiYSI6ImNsaDMyZHN1dTB4MW8zc213YWRlcTh3Z2YifQ.YdFcwZdeBIfLXMPQtp8HvA';
  console.log(mapboxgl)
  map = new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/dark-v10',
    zoom: 12,
    center: location,
    pitch: 30,
    renderWorldCopies: true,
    antialias: true
  })
  document.querySelector(".mapboxgl-ctrl")?.remove();
  document.querySelector(".mapboxgl-ctrl-attrib-inner")?.remove();
  document.querySelector(".mapboxgl-ctrl-attrib-button")?.remove();

  // 将 GUI 控件添加到地图容器中
  const guiContainer = document.createElement('div');
  gui.domElement.style.position = 'absolute';
  guiContainer.appendChild(gui.domElement);
  mapContainer.value.appendChild(guiContainer);
})
emitter.on('showParkBorder', () => {
  let boundariesUrl = '/enterExtend.json'
  
  fetch(boundariesUrl).then(response => {
    return response.json()
  }).then(data => {
    map.addSource("park-border", {
      type: 'geojson',
      data: data
    })
    map.addLayer({
      id: 'park-border-line-layer',
      type: 'line',
      source: 'park-border',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#fff',
        'line-width': 5
      }
    })
    ElMessage({
      type: 'success',
      message: '添加园区边界成功！'
    })
  })
})
// 触发飞行事件
emitter.on('fly-to-lnglat', (value) => {
  location = reactive(value)
  if (location[0] <= 180 && location[0] > -180 && location[1] <= 90 && location[1] >= -90) {
    map.flyTo({
      center: [location[0], location[1]],
      zoom: 10,
      essential: true
    })
    ElMessage({
      message: '纬度：' + location[0] + '，经度' + location[1],
      type: 'success'
    })
  } else {
    ElMessage.error('经纬度范围错误，无法定位！')
  }
})
emitter.on('show3DModel', () => {
  console.log('show3D')
  add3DHeadLayer(map)
})
emitter.on('remove3DLayer', () => {
  console.log('去除三维图层')
  map.removeLayer('3d-model')
  ElMessage({
    type: 'success',
    message: '去除三维图层成功！'
  })
})
// 触发等值线图层展示事件
emitter.on('showIsolines', () => {
  console.log('showLines')
  addIsolinesLayer(map, interpolateOptions)
})
emitter.on('removeIsoline', () => {
  map.removeLayer("isolines-layer")
  map.removeLayer('isolines-labels')
  map.removeSource("isolines")
  ElMessage({
    type: 'success',
    message: '去除二维等值线成功！'
  })
})
// 触发等值面图层展示事件
emitter.on('showIsobands', () => {
  console.log('showBands')
  addIsobandsLayer(map, interpolateOptions)
})
emitter.on('removeIsoband', () => {
  map.removeLayer("isobands-layer")
  map.removeSource("isobands")
  ElMessage({
    type: 'success',
    message: '去除二维等值面成功！'
  })
})
// 触发点迹图层展示事件
emitter.on('showPointsLayer', () => {
  console.log('showPointsLayer')
  console.log(pointsOptions)
  addPointsLayer(map, pointsOptions, gui)
})
// 触发点迹图层去除事件
emitter.on('removePointsLayer', () => {
  // map.removeLayer('points-layer')
  // ElMessage({
  //   type: 'success',
  //   message: '去除点迹模型成功！'
  // })
})

// emitter.on('addTestLine', () => {
//   console.log('addLine')
//   addLineToLayer(map)
// })
</script>
<style scoped>
#map {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
  background-color: #222;
}
</style>