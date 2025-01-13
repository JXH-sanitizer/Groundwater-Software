// 将水头高scale到0-1放到color.b里面
function scaleHeight(data, min, max) {
  return (data - min) / (max - min)
}

export default scaleHeight