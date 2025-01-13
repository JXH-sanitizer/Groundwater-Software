import { defineStore } from "pinia";
import { ElMessage } from "element-plus";

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

export const usePointsStore = defineStore('points', {
  state() {
    return {
      // 数据索引
      dataIndex: 226,
      // 粒子存活时间
      particleLiveTime: 200,
      // 速度调整参数
      speedFactorLng: 1000,
      speedFactorLat: 2000,
      headFactor: 20,
      // 粒子分辨率
      particleSetResolution: 66,
      maxParticleSetResolution: null,
      // webgl坐标调整值
      justifyCoordX: 1.9,
      justifyCoordY: 59.9,
      dropLevel: 0.002
    }
  },
  actions: {
    async fetchDataAndSetResolution() {
      try {
        let data = await fetchJson(this.dataIndex)
        this.maxParticleSetResolution = Math.floor(Math.sqrt(data.length))
        return this.maxParticleSetResolution
      } catch (error) {
        ElMessage.error('数据无法获取,设置错误!')
      }
    }
  },
})