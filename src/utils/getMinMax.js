// 获取最大最小值 传入json数据和要返回最大最小值的索引index
function getMinMax(json, index) {
  let max = -Infinity
  let min = Infinity
  for (let i = 0; i < json.length; i++) {
    max = json[i][index] >  max ? json[i][index] : max
    min = json[i][index] <= min ? json[i][index] : min
  }
  return {max, min}
}

export default getMinMax