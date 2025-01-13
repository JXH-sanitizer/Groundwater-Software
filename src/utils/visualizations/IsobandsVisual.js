import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf'
import { ElMessage } from "element-plus";

let json

let boundariesUrl = '/enterExtend.json' // 获取边界数据

let boundaries
async function fetchJSON(url) {
  try {
    let response = await fetch(url)
    let data = await response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}

// options: 插值选项 包括权重 色带 插值对象 插值单位 breaks
function interpolate(json, options) {
  let features = json.map(feature => {
    return {
      type: 'Feature',
      properties: {
        "height": feature.H
      },
      geometry: {
        type: 'Point',
        coordinates: [feature.X, feature.Y]
      }
    }
  })
  let fCollection = turf.featureCollection(features)
  let interpolate_options = {
    gridType: "points",
    units: options.units,
    weight: 3,
    property: "height"
  }
  let grid = turf.interpolate(fCollection, 0.0008, interpolate_options)
  turf.booleanPointInPolygon()

  grid.features.map(feature => {
    feature.properties.height = feature.properties.height.toFixed(2)
  })

  let isobands_options = {
    zProperty: options.property,
    commonProperties: {
      "fill-opacity": 0.8
    },
    breaksProperties: options.colorRamps
  }
  const breaks = options.breaks

  let isobands = turf.isobands(grid, breaks, isobands_options)
  isobands = turf.flatten(isobands)

  return isobands
}
function intersect(isobands, boundaries) {
  let features = []

  boundaries = turf.flatten(boundaries)
  isobands.features.forEach(function (layer1) {
    boundaries.features.forEach(function (layer2) {
      let intersection = null
      try {
        intersection = turf.intersect(layer1, layer2)
      } catch (error) {
        layer1 = turf.buffer(layer1, 0)
        intersection = turf.intersect(layer1, layer2)
      }
      if (intersection != null) {
        intersection.properties = layer1.properties;
        intersection.id = Math.random() * 100000;
        features.push(intersection);
      }
    })
  })

  let intersections = turf.featureCollection(features)

  return intersections
}
function initIsoBandsLayer(map, isobands) {
  map.addSource("isobands", {
    type: "geojson",
    data: isobands
  })
  map.addLayer({
    id: "isobands-layer",
    type: "fill",
    source: "isobands",
    layout: {},
    paint: {
      "fill-color": ["get", "fill"],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        0.8,
        0.5
      ],
      "fill-outline-color": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        "#000",
        "#fff"
      ],
    }
  });
  ElMessage({
    message: '等值面插值完成，展示图层！',
    type: 'success'
  })
}

export default async function addIsobandsLayer(map, options) {
  let m = options.dataIndex

  let initURL = `/headInitJSON/head-第${m}次JSON.json`

  json = await fetchJSON(initURL)
  json = json.sort((a, b) => a.H - b.H)

  // 设置breaks(平均)
  let breaksNum = options.colorRamps.length
  let breaks = [0]

  for (let i = 1; i <= breaksNum; i++) {
    breaks.push((i * (json.at(-1).H - json[0].H) / breaksNum).toFixed(2))
  }
  options.breaks = breaks

  boundaries = await fetchJSON(boundariesUrl)

  let isobands = interpolate(json, options)
  console.log(isobands)

  isobands = intersect(isobands, boundaries)
  console.log(isobands)

  initIsoBandsLayer(map, isobands)
}