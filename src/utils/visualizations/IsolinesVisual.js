import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf'
import { ElMessage } from "element-plus";

// 先写死
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
    weight: options.weight,
    property: "height"
  }
  let grid = turf.interpolate(fCollection, 0.0008, interpolate_options)

  grid.features.map(feature => {
    feature.properties.height = feature.properties.height.toFixed(2)
  })
  let isolines_options = {
    zProperty: options.property,
  }
  const breaks = options.breaks
  let isolines = turf.isolines(grid, breaks, isolines_options)
  isolines = turf.flatten(isolines)

  return isolines
}

function initIsoLinesLayer(map, isolines) {
  map.addSource("isolines", {
    type: "geojson",
    data: isolines
  });
  map.addLayer({
    id: "isolines-layer",
    type: "line",
    source: "isolines",
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#0000ff',
      'line-width': 2
    }
  })
  map.addLayer({
    id: 'isolines-labels',
    type: 'symbol',
    source: 'isolines',
    layout: {
      'text-field': '{height}',
      'text-size': 18,
      'text-offset': [0, 0],
      'text-anchor': 'center'
    },
    paint: {
      'text-color': '#ff0000'
    }
  })
  ElMessage({
    message: '等值线插值完成，展示图层！',
    type: 'success'
  })
}
function intersect(isolines, boundaries) {
  let features = []
  boundaries = turf.flatten(boundaries)
  isolines.features.forEach(function (layer1) {
    boundaries.features.forEach(function (layer2) {
      // 先把线转化为多边形
      let linePolygon = turf.lineToPolygon(layer1)
      let intersection = null
      try {
        intersection = turf.intersect(linePolygon, layer2)
      } catch (error) {
        linePolygon = turf.buffer(linePolygon, 0)
        intersection = turf.intersect(linePolygon, layer2)
      }
      if (intersection != null) {
        intersection.properties = linePolygon.properties
        intersection.id = Math.random() * 100000
        features.push(turf.polygonToLine(intersection))
      }
    })
  })

  let intersections = turf.featureCollection(features)

  return intersections
}

export default async function addIsolinesLayer(map, options) {
  console.log('isolines-generating')

  // 获取到这个数据的index
  let m = options.dataIndex
  
  let initURL = `/headInitJSON/head-第${m}次JSON.json`
  json = await fetchJSON(initURL)
  json = json.sort((a, b) => a.H - b.H)

  // 设置breaks(平均)
  let breaksNum = options.colorRamps.length - 1
  let breaks = [0]
  
  for (let i = 1; i <= breaksNum; i++) {
    breaks.push((i * (json.at(-1).H - json[0].H) / breaksNum).toFixed(2))
  }
  options.breaks = breaks

  boundaries = await fetchJSON(boundariesUrl)

  let isolines = interpolate(json, options)
  console.log(isolines)

  isolines = intersect(isolines, boundaries)

  initIsoLinesLayer(map, isolines)
}