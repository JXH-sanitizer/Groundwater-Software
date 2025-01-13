<template>
  <div id="bar">
    <div id="common">
      <div id="common-show">基本设置</div>
      <el-button class="main common-btn" @click="showDialog">设置地图中心</el-button>
      <ShowLngLatDialog @close-dialog="dialogVisible = false" v-model="dialogVisible" />
      <el-button class="main common-btn" @click="addParkBorder">
        添加园区边界
      </el-button>
    </div>
    <hr>
    <div id="d3">
      <div id="d3-show">三维效果展示</div>
      <el-button class="main" @click="show3DLayer" :disabled="has3DModel">
        展示地下水三维可视化效果
      </el-button>
      <div id="d3-btns">
        <el-button @click="startAnim" type="primary" class="main" :disabled="!has3DModel">开始动画</el-button>
      </div>
      <el-button class="main" @click="remove3DLayer" :disabled="!has3DModel" type="danger">去除地下水三维可视化图层</el-button>
    </div>
    <hr>
    <div id="inter">
      <div id="inter-show">二维插值展示</div>
      <el-button class="main inter-btn" @click="setInterOptions">
        设置插值选项
      </el-button>
      <ShowInterOptions @close-dialog="interOptionsDialog = false" v-model="interOptionsDialog" />
      <el-button class="main inter-btn" @click="showIsolinesLayer" :disabled="!hasInterRes || hasIsolineLayer">
        展示地下水二维等值线
      </el-button>
      <el-button class="main inter-btn" @click="removeIsolineLayer" :disabled="!hasIsolineLayer"
        type="danger">去除地下水二维等值线图层</el-button>
      <el-button class="main inter-btn" @click="showIsobandsLayer" :disabled="!hasInterRes || hasIsobandLayer">
        展示地下水二维等值面
      </el-button>
      <el-button class="main inter-btn" @click="removeIsobandLayer" :disabled="!hasIsobandLayer"
        type="danger">去除地下水二位等值面图层</el-button>
    </div>
    <hr>
    <div id="points">
      <div id="points-show">点迹展示</div>
      <el-button class="main points-top" @click="setPointsOptions">
        设置点迹模型选项
      </el-button>
      <Suspense>
        <ShowPointsOptions @close-dialog="pointsOptionsDialog = false" v-model="pointsOptionsDialog"></ShowPointsOptions>
      </Suspense>
      <el-button class="main" @click="showPointsLayer" :disabled="hasPointsModel">
        展示点迹模型
      </el-button>
      <div id="points-btns">
        <el-button @click="startPointsFlow" type="primary" class="main" :disabled="!hasPointsModel">开启流场</el-button>
      </div>
      <el-button class="main" @click="removePointsModel" :disabled="!hasPointsModel" type="danger">去除地下水点迹图层</el-button>
    </div>
    <div id="points">
      <div id="points-show">Three点迹展示</div>
      <el-button class="main points-top" @click="setPointsOptions">
        设置点迹模型选项
      </el-button>
      <Suspense>
        <ShowPointsOptions @close-dialog="pointsOptionsDialog = false" v-model="pointsOptionsDialog"></ShowPointsOptions>
      </Suspense>
      <el-button class="main" @click="showThreePointsLayer" :disabled="hasThreePointsModel">
        展示Three.js点迹模型
      </el-button>
    </div>
    <!-- 测试
    <el-button class="main" @click="addTestLine">添加测试直线</el-button>
    <hr>
    <el-button class="main" @click="testLineAnim">测试</el-button> -->
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import emitter from '@/utils/emitter';

import ShowLngLatDialog from '@/components/ShowLngLatDialog.vue'
import ShowInterOptions from '@/components/ShowInterOptions.vue'
import ShowPointsOptions from '@/components/ShowPointsOptions.vue'

// 地图中心设置对话框
let dialogVisible = ref(false)
// 插值选项对话框
let interOptionsDialog = ref(false)
// 是否含有3D模型
let has3DModel = ref(false)
// 是否含有插值结果
let hasInterRes = ref(false)
// 是否含有等值线图层
let hasIsolineLayer = ref(false)
// 是否含有等值面图层
let hasIsobandLayer = ref(false)
// 点迹选项对话框
let pointsOptionsDialog = ref(false)
// 是否含有点迹图层
let hasPointsModel = ref(false)
// 是否含有Three.js生成的点迹图层
let hasThreePointsModel = ref(false)

function addParkBorder() {
  emitter.emit('showParkBorder')
}

function showDialog() {
  console.log(dialogVisible.value)
  dialogVisible.value = true
}
// 设置插值选项
function setInterOptions() {
  interOptionsDialog.value = true
  hasInterRes.value = true
}
// 点击触发事件 展示三维水头模型
function show3DLayer() {
  emitter.emit('show3DModel')
  has3DModel.value = true
}
// 点击触发事件 去除三维水头模型
function remove3DLayer() {
  emitter.emit('remove3DLayer')
  has3DModel.value = false
}
// 点击触发事件 展示等值线
function showIsolinesLayer() {
  emitter.emit('showIsolines')
  hasIsolineLayer.value = true
}
function removeIsolineLayer() {
  emitter.emit('removeIsoline')
  hasIsolineLayer.value = false
}
// 点击触发事件 展示等值面
function showIsobandsLayer() {
  emitter.emit('showIsobands')
  hasIsobandLayer.value = true
}
function removeIsobandLayer() {
  emitter.emit('removeIsoband')
  hasIsobandLayer.value = false
}
// 点击触发事件 开始动画
function startAnim() {
  emitter.emit('startAnim')
}
// 点击触发事件 暂停/播放动画
function pauseAnim() {
  emitter.emit('pauseAnim')
}
function setPointsOptions() {
  pointsOptionsDialog.value = true
}
// 点击触发事件 展示点迹图层
function showPointsLayer() {
  emitter.emit('showPointsLayer')
  hasPointsModel.value = true
}
// 点击触发事件 开始单数据加入流场的动画
function startPointsFlow() {
  emitter.emit('startPointsFlow')
}
// 点击触发事件 开始多数据加入流场的动画
function startPointsAnim() {
  emitter.emit('startPointsAnim')
}
// 点击触发事件 移除点迹模型
function removePointsModel() {
  emitter.emit('removePointsLayer')
  hasPointsModel.value = false
}
// Three.js点迹部分
function showThreePointsLayer() {
  emitter.emit('showThreePointsLayer')
}
</script>

<style scoped>
#total {
  position: relative;
  width: 100%;
  height: 100%;
}

#bar {
  position: absolute;
  left: 0;
  width: 100%;
  height: 100%;
  text-align: center;
  background-color: rgb(142, 140, 144);
}

.main {
  display: block;
  width: 100%;
  text-align: left;
  font-size: 15px;
}

.main:hover {
  border-color: skyblue;
  border-width: 2px;
}

#common {
  padding: 5px 2px 8px 2px;
  background-color: rgb(83, 83, 83);
}
#common #common-show {
  margin-bottom: 5px;
  font-size: 18px;
  font-weight: 600;
  color: azure;
}
#common .common-btn {
  margin: 5px 0;
}

#d3 {
  padding: 5px 2px 8px 2px;
  background-color: rgb(83, 83, 83);
}

#d3 #d3-show {
  margin-bottom: 5px;
  font-size: 18px;
  font-weight: 600;
  color: azure;
}

#d3 #d3-btns {
  margin: 5px 0;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
}

#d3 #d3-btns .d3-btn {
  flex: 1;
  margin: 0 2px 0;
  width: calc((98% - 5px) / 2);
  min-width: calc((98% - 5px) / 2);
  max-width: calc((98% - 5px) / 2);
}

#d3 #d3-btns .d3-btn:last-child {
  margin-right: 0;
}

#inter {
  padding: 5px 2px 8px 2px;
  background-color: rgb(83, 83, 83);
}

#inter #inter-show {
  margin-bottom: 5px;
  font-size: 18px;
  font-weight: 600;
  color: azure;
}

#inter .inter-btn {
  margin: 5px 0;
}

#points {
  padding: 5px 2px 8px 2px;
  background-color: rgb(83, 83, 83);
}
#points #points-show {
  margin-bottom: 5px;
  font-size: 18px;
  font-weight: 600;
  color: azure;
}
.points-top {
  margin-bottom: 5px;
}
#points #points-btns {
  margin: 5px 0;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
}
#points #points-btns .points-btn {
  flex: 1;
  margin: 0 2px 0;
  width: calc((98% - 5px) / 2);
  min-width: calc((98% - 5px) / 2);
  max-width: calc((98% - 5px) / 2);
}
</style>