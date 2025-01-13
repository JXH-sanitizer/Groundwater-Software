<template>
  <el-dialog width="25%" align-center draggable>
    <div id="dialog-head">请设置点迹模型选项</div>
    <div class="points-set">
      <el-text large>
        设置点迹模型数据索引
      </el-text>
    </div>
    <el-input-number v-model="dataIndex" :min="1" :max="480" />
    <div class="points-set">
      <el-text large>
        设置点迹模型粒子存活时间
      </el-text>
    </div>
    <el-input-number v-model="liveTime" :min="50" />
    <div class="points-set">
      <el-text large>
        设置点迹模型速度增量(纬度方向)
      </el-text>
    </div>
    <el-input-number v-model="speedFactorLng" :min="500" />
    <div class="points-set">
      <el-text large>
        设置点迹模型速度增量(经度方向)
      </el-text>
    </div>
    <el-input-number v-model="speedFactorLat" :min="0" />
    <div class="points-set">
      <el-text large>
        设置水头高变化速度增量
      </el-text>
    </div>
    <el-input-number v-model="headFactor" :min="500" />
    <div class="points-set">
      <el-text large>
        设置点迹模型粒子分辨率
      </el-text>
    </div>
    <el-input-number v-model="particleResolution" :min="30" :max="maxResolution" />
    <div class="points-set">
      <el-text large>
        设置点迹模型粒子坐标边界纬度范围
      </el-text>
    </div>
    <el-input-number v-model="justifyCoordY" :min="-90" :max="90" />
    <div class="points-set">
      <el-text large>
        设置点迹模型粒子坐标边界经度范围
      </el-text>
    </div>
    <el-input-number v-model="justifyCoordX" :min="-180" :max="180" />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeLog" type="danger">取消</el-button>
        <el-button type="primary" @click="confirmOptions">
          确认
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script setup>
import { ref } from 'vue'

import { usePointsStore } from '@/stores/usePointsStore';
import { ElMessage } from 'element-plus';

const pointsStore = usePointsStore()

let dataIndex = ref(179)
let liveTime = ref(200)
let speedFactorLng = ref(1000)
let speedFactorLat = ref(2000)
let headFactor = ref(50)
let particleResolution = ref(60)
let maxResolution = ref(0)
let justifyCoordX = ref(1.9)
let justifyCoordY = ref(59.9)

const emit = defineEmits(['close-dialog'])

await pointsStore.fetchDataAndSetResolution().then(res => {
  maxResolution.value = res
})
console.log(maxResolution.value)

function closeLog() {
  emit('close-dialog')
}

function confirmOptions() {
  pointsStore.$state.dataIndex = dataIndex.value
  pointsStore.$state.particleLiveTime = liveTime.value
  pointsStore.$state.speedFactorLng = speedFactorLng.value
  pointsStore.$state.speedFactorLat = speedFactorLat.value
  pointsStore.$state.headFactor = headFactor.value
  pointsStore.$state.particleSetResolution = particleResolution.value
  pointsStore.$state.justifyCoordX = justifyCoordX.value
  pointsStore.$state.justifyCoordY = justifyCoordY.value
  console.log(pointsStore.$state)
  ElMessage({
    type: 'success',
    message: '点迹模型参数设置完成!'
  })
  emit('close-dialog')
}

</script>
<style scoped>
#dialog-head {
  text-align: center;
  font-size: 30px;
  font-weight: 700;
}
.points-set {
  margin: 5px 0;
}
</style>