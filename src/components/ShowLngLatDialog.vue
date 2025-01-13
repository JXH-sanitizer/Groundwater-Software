<template>
  <el-dialog width="20%" align-center draggable>
    <div id="dialog-head">请设置经纬度</div>
    <span>输入纬度：</span><el-input placeholder="纬度" v-model="longitude" :max="180" :min="-180" class="lng-lat"/>
    <br>
    <span>输入经度：</span><el-input placeholder="经度" v-model="latitude" :max="90" :min="-90" class="lng-lat"/>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="closeLog" type="danger">取消</el-button>
        <el-button type="primary" @click="flyToLoc">
          确认
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script setup>
import { ref } from 'vue';
import emitter from '@/utils/emitter'

let longitude = ref(0)
let latitude = ref(0)

const emit = defineEmits(['close-dialog'])
function closeLog() {
  emit('close-dialog')
}

// 确认经纬度并向Display中的map传递经纬度数据并飞行至指定位置
function flyToLoc() {
  emitter.emit('fly-to-lnglat', [longitude.value, latitude.value])
  emit('close-dialog')
}
</script>
<style scoped>
#dialog-head {
  text-align: center;
  font-size: 30px;
  font-weight: 700;
}
.lng-lat {
  display: inline-block;
  width: 75%;
}
</style>
