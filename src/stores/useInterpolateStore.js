import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
async function fetchJSON(url) {
  try {
    let response = await fetch(url)
    let data = await response.json()
    return data
  } catch (error) {
    console.error(error)
  }
}
export const useInterpolateStore = defineStore('interpolate', {
  state() {
    return {
      // 数据索引
      dataIndex: 1,
      // 插值权重
      weight: 3,
      // 插值间隔单位
      units: 'degrees',
      // 插值间隔(间隔数?)
      breaks: [0.5, 1.5, 2, 2.5, 3, 4, 5, 6, 7],
      // 插值对象
      property: 'height',
      // 插值颜色设置
      colorRamps: [
        { fill: "#e3e3ff" },
        { fill: '#d5d5ff' },
        { fill: '#b8b8ff' },
        { fill: "#a9aaff" },
        { fill: "#9090ff" },
        { fill: "#7171ff" },
        { fill: "#5554ff" },
        { fill: "#4746ff" },
        { fill: "#1b1cff" }
      ]
    }
  }
})
