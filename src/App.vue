<script setup>
import Display from '@/views/Display.vue'
import Navigate from '@/views/Navigate.vue'
</script>

<template>
  <div id="root">
    <div id="header">
      <h2>流场可视化</h2>
    </div>
    <div id="content">
      <div id="navigate">
        <Navigate />
      </div>
      <div id="display">
        <Display />
      </div>
    </div>
  </div>
</template>

<style lang="css">
* {
  margin: 0;
  padding: 0;
}

html,
body {
  overflow: hidden;
}

#root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

#header {
  width: 100%;
  height: 5vh;
  line-height: 5vh;
  text-align: center;
  background-color: grey;
}

#content {
  position: relative;
  width: 100%;
  height: 95vh;
}

#content #navigate {
  overflow: auto;
  position: absolute;
  left: 0;
  width: 15%;
  height: 100%;
  background-color: rgb(155, 155, 155);
}
#content #display {
  position: absolute;
  left: 15%;
  width: 85%;
  height: 100%;
}
</style>