import mapboxgl from "mapbox-gl";
import getMinMax from "../getMinMax";
import scaleHeight from "../scaleHeight";
import emitter from "../emitter";

function createShader(gl, source, type) {
  let shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader
}

function createProgram(gl, vsSource, fsSource) {
  let vsShader = createShader(gl, vsSource, gl.VERTEX_SHADER)
  let fsShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER)
  let program = gl.createProgram()
  gl.attachShader(program, vsShader)
  gl.attachShader(program, fsShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  let wrapper = { program: program };
  var numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (var i = 0; i < numAttributes; i++) {
    var attribute = gl.getActiveAttrib(program, i);
    wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
  }
  var numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (var i$1 = 0; i$1 < numUniforms; i$1++) {
    var uniform = gl.getActiveUniform(program, i$1);
    wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name);
  }
  // 返回出一个包含program和各着色器参数的对象
  return wrapper;
}

function createTexture(gl, data, width, height, filter) {

  let texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)

  if (data instanceof Uint8Array) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data)
  } else if (data instanceof Float32Array) {
    // 如果是Float32Array则走下面的 此时type必须等于gl.FLOAT!!!
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, data)
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data)
  }


  gl.bindTexture(gl.TEXTURE_2D, null)
  return texture
}

function bindTexture(gl, texture, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit)
  gl.bindTexture(gl.TEXTURE_2D, texture)
}

function createBuffer(gl, data) {
  let buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
  return buffer
}

function bindAttribute(gl, buffer, attribute, size, type) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.vertexAttribPointer(attribute, size, type, false, 0, 0)
  gl.enableVertexAttribArray(attribute)
}

function bindFramebuffer(gl, framebuffer, texture) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  if (texture) {
    // 纹理对象 -- 颜色关联对象
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }
}

const colorRamp = {
  0.0: '#3288bd',
  0.1: '#66c2a5',
  0.2: '#abdda4',
  0.3: '#e6f598',
  0.4: '#fee08b',
  0.5: '#fdae61',
  0.6: '#f46d43',
  1.0: '#d53e4f',
}

const drawVert = `
precision highp float;
attribute float a_index;
uniform float u_particle_res;
// 调整小数点用的xy坐标
uniform float u_justify_coord_x;
uniform float u_justify_coord_y;
uniform sampler2D u_particle;
uniform mat4 u_matrix;
varying float v_water_head;
varying float v_opacity;
void main() {
  gl_PointSize = 2.0;
  vec4 color = texture2D(u_particle, vec2(
    fract(a_index / u_particle_res),
    floor(a_index / u_particle_res) / u_particle_res
  ));
  vec2 pos = vec2(
    color.r / 1.0 + u_justify_coord_x, 
    color.g / 1.0 + u_justify_coord_y);
  v_water_head = color.b;
  v_opacity = color.a;
  gl_Position = u_matrix * vec4(pos.x, pos.y, 0.0, 1.0);
}
`
const drawFrag = `
precision highp float;
uniform sampler2D u_color_ramp;
varying float v_water_head;
varying float v_opacity;
void main() {
  float scale = v_water_head;
  vec2 ramp_pos = vec2(
    fract(16.0 * scale),
    floor(16.0 * scale) / 16.0
  );
  vec4 color = texture2D(u_color_ramp, ramp_pos);
  gl_FragColor = vec4(color.rgb, v_opacity);
}
`
const quadVert = `
  precision highp float;
  attribute vec2 a_pos;
  uniform mat4 u_matrix;
  varying vec2 v_tex_pos;
  void main() {
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0.0, 1.0);
    v_tex_pos = a_pos;
  }
`

const screenFrag = `
  precision highp float;
  uniform sampler2D u_screen;
  uniform float u_opacity;
  varying vec2 v_tex_pos;
  void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
  }
`
const updateVert = `
  precision highp float;
  attribute vec2 a_tex_pos;
  attribute vec3 a_spdis;
  varying vec2 v_tex_pos;
  varying vec3 v_spdis;
  void main() {
    // 坐标
    gl_Position = vec4(1.0 - 2.0 * a_tex_pos, 0.0, 1.0);
    // 矩形点的位置
    v_tex_pos = a_tex_pos;
    // 粒子速度
    v_spdis = a_spdis;
  }
`

const updateFrag = `
  precision highp float;
  uniform sampler2D u_particle;
  // 保存位于初始位置的粒子信息
  uniform sampler2D u_initial_pos;
  // 调整分辨率的量
  uniform float u_justify_coord_x;
  uniform float u_justify_coord_y;
  // 一米在墨卡托坐标系中对应的值的偏移量
  uniform float u_meter_in_mercator;
  // 限制pos在范围内的量 边界xy
  uniform vec2 u_border_max_xy;
  uniform vec2 u_border_min_xy;
  // 水头高
  uniform float u_head_min;
  uniform float u_head_max;
  // 限制粒子在流场中存在的时间帧数
  uniform float u_total_live_time;
  uniform float u_live_time;
  // 园区边界
  uniform int u_bound_vertex_num;
  uniform vec2 u_boundaries[29];
  // 随机数
  uniform float u_rand_seed;
  uniform float u_speed_factor_lng;
  uniform float u_speed_factor_lat;
  uniform float u_head_factor;
  uniform float u_drop_rate;
  uniform float u_drop_rate_bump;
  varying vec2 v_tex_pos;
  varying vec3 v_spdis;

  const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
  float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
  }

  // 判断点向X轴方向延申的射线是否与园区边界有奇数个交点
  bool cross(vec2 point, vec2 vertex1, vec2 vertex2) {
    // 判断: 条件1--边界线段顶点y值在点的两侧
    // 判断: 条件2--点的x值大于这条边界线上y值对应的x值
    bool intersect = ((vertex1.y > point.y) != (vertex2.y > point.y)) && 
                        (point.x > (vertex2.x - vertex1.x) * (point.y - vertex1.y) / (vertex2.y - vertex1.y) + vertex1.x);
    return intersect;
  }

  void main() {
    vec4 color = texture2D(u_particle, v_tex_pos);
    vec4 initial_color = texture2D(u_initial_pos, v_tex_pos);
    vec2 pos = vec2(
      color.r / 1.0 + u_justify_coord_x,
      color.g / 1.0 + u_justify_coord_y
    );
    vec2 initial_pos = vec2(
      initial_color.r / 1.0 + u_justify_coord_x,
      initial_color.g / 1.0 + u_justify_coord_y
    );

    // 速度 & 1m在Mercator投影中的对应量distortion & 偏移量
    vec2 velocity = vec2(v_spdis.x, v_spdis.y);
    float distortion = u_meter_in_mercator;
    vec2 offset = vec2(
      distortion * velocity.x * u_speed_factor_lat,
      distortion * (-velocity.y) * u_speed_factor_lng
    );
    
    float intersects = 0.0;
    for (int i = 0; i < 28; i++) {
      vec2 vertex1 = u_boundaries[i];
      vec2 vertex2 = u_boundaries[i + 1];
      bool intersect = cross(vec2(pos.xy), vertex1, vertex2);
      if (intersect) {
        intersects = intersects + 1.0;
      }
    }

    // 如果粒子生命周期归零
    if (u_live_time == 0.0) {
      pos = initial_pos;
      float initial_head_scale = initial_color.b;
      // 则返回为其最初的位置信息
      gl_FragColor = vec4(
        (pos.x - u_justify_coord_x) * 1.0,
        (pos.y - u_justify_coord_y) * 1.0,
        initial_head_scale, 
        color.a
      );
    } else {
      // 否则加入偏移量更新
      pos = (pos + offset);
      float head_scale = color.b + (v_spdis.z) * u_head_factor / (u_head_max - u_head_min);
      gl_FragColor = vec4(
        (pos.x - u_justify_coord_x) * 1.0,
        (pos.y - u_justify_coord_y) * 1.0,
        head_scale, 
        1.0 - (u_total_live_time - u_live_time) / (u_total_live_time * 3.0)
      );
    }

    // // 交点数量为奇数说明在内部
    // if((mod(intersects, 2.0)) != 0.0) {
    //   // 如果粒子生命周期归零
    //   if (u_live_time == 0.0) {
    //     pos = initial_pos;
    //     float initial_head_scale = initial_color.b;
    //     // 则返回为其最初的位置信息
    //     gl_FragColor = vec4(
    //       (pos.x - u_justify_coord_x) * 1.0,
    //       (pos.y - u_justify_coord_y) * 1.0,
    //       initial_head_scale, 
    //       color.a
    //     );
    //   } else {
    //     // 否则加入偏移量更新
    //     pos = (pos + offset);
    //     float head_scale = color.b + (v_spdis.z) * u_head_factor / (u_head_max - u_head_min);
    //     gl_FragColor = vec4(
    //       (pos.x - u_justify_coord_x) * 1.0,
    //       (pos.y - u_justify_coord_y) * 1.0,
    //       head_scale, 
    //       1.0 - (u_total_live_time - u_live_time) / (u_total_live_time * 3.0)
    //     );
    //   }
    // } else {
    //   // 此时点在外部
    //   pos = initial_pos;
    //   float initial_head_scale = initial_color.b;
    //   // 则返回为其最初的位置信息
    //   gl_FragColor = vec4(
    //     (pos.x - u_justify_coord_x) * 1.0,
    //     (pos.y - u_justify_coord_y) * 1.0,
    //     initial_head_scale, 
    //     color.a
    //   );
    // }

    // pos = vec2(
    //   mix(u_border_min_xy.x, u_border_max_xy.x, (pos + offset).x),
    //   mix(u_border_max_xy.y, u_border_min_xy.y, (pos + offset).y)
    // );

    // vec2 seed = (pos + v_tex_pos) * u_rand_seed;
    // float drop_rate = u_drop_rate;
    // float drop = step(1.0 - drop_rate, rand(seed));

    // vec2 random_pos = vec2(
    //   rand(seed + 1.1),
    //   rand(seed + 1.9));
    // pos = mix(pos, random_pos, drop);
  }
`
let newmatrix = null
class WaterPoints {
  constructor(gl) {
    this.gl = gl

    this.speedFactorLng = 0
    this.speedFactorLat = 0
    this.headFactor = 0
    this.dropRate = 0.003
    this.dropRateBump = 0.01

    this.drawProgram = createProgram(gl, drawVert, drawFrag)
    this.screenProgram = createProgram(gl, quadVert, screenFrag)
    this.updateProgram = createProgram(gl, updateVert, updateFrag)

    this.quadBuffer = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]))
    this.frameBuffer = gl.createFramebuffer()

    this.liveTime = 200
    this.nowLiveTime = this.liveTime

    this.setColorRamp(colorRamp)
    this.resize()
  }
  resize() {
    let gl = this.gl
    let emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4)
    this.backgroundTexture = createTexture(gl, emptyPixels, gl.canvas.width, gl.canvas.height, gl.NEAREST)
    this.screenTexture = createTexture(gl, emptyPixels, gl.canvas.width, gl.canvas.height, gl.NEAREST)
  }
  draw(matrix) {
    newmatrix = matrix
    let gl = this.gl
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.STENCIL_TEST)

    bindTexture(gl, this.particleStateTexture0, 1)
    bindTexture(gl, this.particleStateTexture2, 3)
    this.drawScreen()
    // this.updateParticles()
  }
  drawScreen() {
    let gl = this.gl
    bindFramebuffer(gl, this.frameBuffer, this.screenTexture)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    this.drawTexture(this.backgroundTexture, 0.95)
    this.drawParticles()

    bindFramebuffer(gl, null)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    this.drawTexture(this.screenTexture, 1.0)

    gl.disable(gl.BLEND)

    let temp = this.backgroundTexture
    this.backgroundTexture = this.screenTexture
    this.screenTexture = temp
  }
  drawTexture(texture, opacity) {
    let gl = this.gl
    let program = this.screenProgram
    gl.useProgram(program.program)
    bindAttribute(gl, this.quadBuffer, program.a_pos, 2, gl.FLOAT)
    bindTexture(gl, texture, 2)
    if (newmatrix) {
      gl.uniformMatrix4fv(program.u_matrix, false, newmatrix)
    }
    gl.uniform1f(program.u_opacity, opacity)
    gl.uniform1i(program.u_screen, 2)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }
  drawParticles() {
    let gl = this.gl
    let program = this.drawProgram
    gl.useProgram(program.program)

    bindTexture(gl, this.colorRamp, 2)
    if (newmatrix) {
      gl.uniformMatrix4fv(program.u_matrix, false, newmatrix)
    }
    // 将粒子纹理绑定到1号纹理
    gl.uniform1i(program.u_particle, 1)
    // 将颜色色带绑定到2号纹理
    gl.uniform1i(program.u_color_ramp, 2)
    // 高低位小数
    gl.uniform1f(program.u_justify_coord_x, this.deltaCoordX)
    gl.uniform1f(program.u_justify_coord_y, this.deltaCoordY)
    // 纹理的分辨率
    gl.uniform1f(program.u_particle_res, this.particleStateResolution)

    bindAttribute(gl, this.particleIndexBuffer, program.a_index, 1, gl.FLOAT)

    gl.drawArrays(gl.POINTS, 0, this._numParticles)
  }
  updateParticles() {
    let gl = this.gl
    // 生存时间
    this.nowLiveTime -= 1.0
    // 纹理转换
    bindFramebuffer(gl, this.frameBuffer, this.particleStateTexture1)
    // 拿到纹理的像素值
    let pixels = new Float32Array(this.particleStateResolution * this.particleStateResolution * 4)
    gl.readPixels(0, 0, this.particleStateResolution, this.particleStateResolution, gl.RGBA, gl.FLOAT, pixels)
    // 视口
    gl.viewport(0, 0, this.particleStateResolution, this.particleStateResolution)
    let program = this.updateProgram
    gl.useProgram(program.program)

    bindAttribute(gl, this.quadBuffer, program.a_tex_pos, 2, gl.FLOAT)
    if (newmatrix) {
      gl.uniformMatrix4fv(program.u_matrix, false, newmatrix)
    }
    // 将原始纹理绑定到3号纹理上
    bindTexture(gl, this.particleStateTexture2, 3)
    // 纹理
    gl.uniform1i(program.u_particle, 1)
    gl.uniform1i(program.u_initial_pos, 3)
    // 粒子存活时间
    gl.uniform1f(program.u_total_live_time, this.liveTime)
    gl.uniform1f(program.u_live_time, this.nowLiveTime)
    // 高低位小数
    gl.uniform1f(program.u_justify_coord_x, this.deltaCoordX)
    gl.uniform1f(program.u_justify_coord_y, this.deltaCoordY)
    // 每米在墨卡托中的比例
    gl.uniform1f(program.u_meter_in_mercator, this.meterInMercatorCoordinates)
    // 随机数种子
    gl.uniform1f(program.u_rand_seed, Math.random())
    gl.uniform1f(program.u_speed_factor_lng, this.speedFactorLng);
    gl.uniform1f(program.u_speed_factor_lat, this.speedFactorLat);
    gl.uniform1f(program.u_head_factor, this.headFactor)
    gl.uniform1f(program.u_drop_rate, this.dropRate);
    gl.uniform1f(program.u_drop_rate_bump, this.dropRateBump);
    // 水头的最高和最低
    gl.uniform1f(program.u_head_min, this.minMaxObj['min'])
    gl.uniform1f(program.u_head_max, this.minMaxObj['max'])
    // 边界的xy最大最小范围
    gl.uniform2fv(program.u_border_max_xy, this.maxLngLatMercator)
    gl.uniform2fv(program.u_border_min_xy, this.minLngLatMercator)
    // ###################################### // 用于控制粒子变化范围园区边界(29个?)
    gl.uniform1i(program.u_bound_vertex_num, this.boundariesVertex.length)
    let boundariesArray = new Float32Array(this.boundariesVertex.length * 2)
    for (let $j = 0; $j < boundariesArray.length; $j += 2) {
      let index = $j / 2
      let boundCoordX = mapboxgl.MercatorCoordinate.fromLngLat(
        this.boundariesVertex[index],
        0
      ).x
      let boundCoordY = mapboxgl.MercatorCoordinate.fromLngLat(
        this.boundariesVertex[index],
        0
      ).y
      boundariesArray[$j] = boundCoordX
      boundariesArray[$j + 1] = boundCoordY
    }
    gl.uniform2fv(program.u_boundaries, boundariesArray)

    bindAttribute(gl, this.particleSpdisBuffer, program.a_spdis, 3, gl.FLOAT)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (this.nowLiveTime == 0) {
      this.nowLiveTime = this.liveTime
    }

    let temp = this.particleStateTexture0
    this.particleStateTexture0 = this.particleStateTexture1
    this.particleStateTexture1 = temp
  }

  deleteContext() {
    let gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    // 删除帧缓冲区
    gl.deleteFramebuffer(this.frameBuffer)
    // 删除激活的纹理
    gl.deleteTexture(this.particleStateTexture0)
    gl.deleteTexture(this.particleStateTexture1)
    gl.deleteTexture(this.particleStateTexture2)
    gl.deleteTexture(this.screenTexture)
    gl.deleteTexture(this.backgroundTexture)
    gl.bindTexture(gl.TEXTURE_2D, null)
    // 删除着色器程序
    gl.deleteProgram(this.drawProgram.program)
    gl.deleteProgram(this.screenProgram.program)
    gl.deleteProgram(this.updateProgram.program)
    this.drawProgram = this.screenProgram = this.updateProgram = {}
    console.log('删除上下文成功!')
  }

  setColorRamp(colors) {
    let gl = this.gl
    this.colorRamp = createTexture(gl, getColorRamp(colors), 16, 16, gl.LINEAR)
  }
}

let prototypeAccessors = { options: {}, json: {}, spdis: {}, boundariesVertex: {} }

prototypeAccessors.options.set = function (options) {
  let pointsOptions = (this.pointOptions = options)
  this._options = pointsOptions
}
prototypeAccessors.options.get = function () {
  return this._options
}
prototypeAccessors.json.set = function (json) {
  this._json = json
  // options中包含了数据索引, 粒子存活总时间, 粒子分辨率, 速度调整参数
  let options = this._options
  console.log(this, options.particleSetResolution)

  let gl = this.gl
  let minMax = getMinMax(json, 'H')
  // 从json数据的长度获取分辨率
  let particleRes = (this.particleStateResolution = options.particleSetResolution)
  this._numParticles = particleRes * particleRes

  let particlePosition = new Float32Array(this._numParticles * 4)
  for (let m = 0; m < particlePosition.length; m += 4) {
    let index = m / 4
    // 把精度让出一点给小数位数?
    particlePosition[m] = (mapboxgl.MercatorCoordinate.fromLngLat(
      [json[index]['X'], json[index]['Y']],
      0
    ).x - mapboxgl.MercatorCoordinate.fromLngLat(
      [options.justifyCoordY, options.justifyCoordX],
      0
    ).x) * (1E+0)
    particlePosition[m + 1] = (mapboxgl.MercatorCoordinate.fromLngLat(
      [json[index]['X'], json[index]['Y']],
      0
    ).y - mapboxgl.MercatorCoordinate.fromLngLat(
      [options.justifyCoordY, options.justifyCoordX],
      0
    ).y) * (1E+0)
    // 直接把水头高的线性插值比重放到color.b
    particlePosition[m + 2] = scaleHeight(json[index]['H'], minMax['min'], minMax['max'])
    particlePosition[m + 3] = 1.0
  }
  this.particleStateTexture0 = createTexture(gl, particlePosition, particleRes, particleRes, gl.NEAREST)
  this.particleStateTexture1 = createTexture(gl, particlePosition, particleRes, particleRes, gl.NEAREST)
  // 设置一个保存初始位置的纹理对象
  this.particleStateTexture2 = createTexture(gl, particlePosition, particleRes, particleRes, gl.NEAREST)
  // 高位值
  this.deltaCoordX = mapboxgl.MercatorCoordinate.fromLngLat(
    [options.justifyCoordY, options.justifyCoordX],
    0
  ).x
  this.deltaCoordY = mapboxgl.MercatorCoordinate.fromLngLat(
    [options.justifyCoordY, options.justifyCoordX],
    0
  ).y
  // 米对应在坐标系中的偏移量
  this.meterInMercatorCoordinates = mapboxgl.MercatorCoordinate.fromLngLat(
    [options.justifyCoordY, options.justifyCoordX],
    0
  ).meterInMercatorCoordinateUnits()

  let particleIndices = new Float32Array(this._numParticles)
  for (let j = 0; j < particleIndices.length; j++) {
    particleIndices[j] = j
  }
  this.particleIndexBuffer = createBuffer(gl, particleIndices)

  let waterHeadData = new Float32Array(this._numParticles)
  for (let $j = 0; $j < waterHeadData.length; $j++) {
    waterHeadData[$j] = json[$j]['H']
  }
  this.waterHeadBuffer = createBuffer(gl, waterHeadData)

  this.minMaxObj = getMinMax(json, 'H')
  let borderX = getMinMax(json, 'X')
  let borderY = getMinMax(json, 'Y')
  this.minLngLatMercator = [
    mapboxgl.MercatorCoordinate.fromLngLat(
      [borderX['min'], borderY['min']],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [borderX['min'], borderY['min']],
      0
    ).y]
  this.maxLngLatMercator = [
    mapboxgl.MercatorCoordinate.fromLngLat(
      [borderX['max'], borderY['max']],
      0
    ).x,
    mapboxgl.MercatorCoordinate.fromLngLat(
      [borderX['max'], borderY['max']],
      0
    ).y]
  console.log(this.minLngLatMercator, this.maxLngLatMercator)
}
prototypeAccessors.json.get = function () {
  return this._json
}
prototypeAccessors.spdis.set = function (spdis) {
  let gl = this.gl
  let particleSpdis = new Float32Array(this._numParticles * 3)
  for (let m = 0; m < particleSpdis.length; m += 3) {
    let index = m / 3
    particleSpdis[m] = spdis[index]['0']
    particleSpdis[m + 1] = spdis[index]['1']
    particleSpdis[m + 2] = spdis[index]['2']
  }
  this.particleSpdisBuffer = createBuffer(gl, particleSpdis)
}
prototypeAccessors.spdis.get = function () {
  return this._numParticles
}
prototypeAccessors.boundariesVertex.set = function (boundariesVertex) {
  this._boundariesVertex = boundariesVertex
}
prototypeAccessors.boundariesVertex.get = function () {
  return this._boundariesVertex
}

Object.defineProperties(WaterPoints.prototype, prototypeAccessors)

function getColorRamp(colors) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = 256;
  canvas.height = 1;

  var gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (var stop in colors) {
    gradient.addColorStop(+stop, colors[stop]);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
}

export default WaterPoints