<template>
  <el-dialog width="20%" align-center draggable>
    <div id="dialog-head">请设置插值选项</div>
    <div class="color-set">
      <el-text large>
        设置插值数据索引
      </el-text>
    </div>
    <el-input-number v-model="dataIndex" :min="1" :max="480" />
    <div class="color-set">
      <el-text large>
        插值分级数(平均)：
      </el-text>
    </div>
    <el-input-number v-model="interNum" :min="1" :max="10" @change="handleChangeColor" />
    <div class="color-set">
      <el-text large>
        设置色带颜色：
      </el-text>
    </div>
    <ul>
      <!-- 当插值数小于设置色带数时 -->
      <div v-if="interNum < defaultColorRamps.length">
        <li v-for="(item, index) in interNum + 1" :key="index">
          <div>
            <span style="margin-right: 10px;">{{ index + 1 }}级：颜色：{{ defaultColorRamps[index] }} </span>
            <el-color-picker v-model="defaultColorRamps[index]" @change="changeColor(defaultColorRamps[index], index)" />
          </div>
        </li>
      </div>
      <!-- 当插值数大于设置色带数时 -->
      <div v-else>
        <li v-for="(item, index) in defaultColorRamps" :key="index">
          <div>
            <span style="margin-right: 10px;">{{ index + 1 }}级：颜色：{{ defaultColorRamps[index] }}</span>
            <el-color-picker v-model="defaultColorRamps[index]" @change="changeColor(defaultColorRamps[index], index)" />
          </div>
        </li>
        <li v-for="(item, index) in (interNum - defaultColorRamps.length + 1)" :key="index">
          <div>
            <span style="margin-right: 10px;">{{ defaultColorRamps.length + index + 1 }}级：颜色：{{ defaultColor }}</span>
            <el-color-picker v-model="defaultColor" @change="changeColor(defaultColor, index)" />
          </div>
        </li>
      </div>
    </ul>
    <br>
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
<script setup lang="ts">
import { ref, reactive, toRaw } from 'vue';
import emitter from '@/utils/emitter';

import { useInterpolateStore } from '@/stores/useInterpolateStore';
import { ElMessage } from 'element-plus';

const interpolateStore = useInterpolateStore()

let interNum = ref(4)

let defaultColorRamps = reactive([
  "#e3e3ff",
  "#c6c6ff",
  "#a9aaff",
  "#7171ff",
  "#5554ff"
])
let defaultColor = ref("#5554ff")

let selectedColors = defaultColorRamps

let dataIndex = ref(1)

const emit = defineEmits(['close-dialog'])
function closeLog() {
  emit('close-dialog')
}
// 确认选项 先看打印出来的插值信息 在确认的时候计算breaks就可以了
function confirmOptions() {
  let rawColors = toRaw(selectedColors).map((color: string) => {
    return { 'fill': color }
  })
  interpolateStore.$state.colorRamps = rawColors
  interpolateStore.$state.dataIndex = dataIndex.value
  ElMessage({
    type: 'info',
    message: '插值条件设置完毕'
  })
  emit('close-dialog')
}
// 处理色带数加减问题
function handleChangeColor(currentValue: number, oldValue: number) {
  if (currentValue > oldValue) {
    // 加
    selectedColors.push(defaultColor.value)
  } else {
    // 减
    selectedColors.pop()
  }
}
// 更换颜色
function changeColor(color: string, index: number) {
  selectedColors[index] = color
}

</script>
<style scoped>
#dialog-head {
  text-align: center;
  font-size: 30px;
  font-weight: 700;
}

.color-set {
  margin: 5px 0;
}

ul {
  list-style: none;
  text-align: center;
}

ul>div>li {
  margin-top: -1px;
  border: 1px dashed black;
  text-align: center;
}

.el-color-picker {
  width: 85%;
}
</style>