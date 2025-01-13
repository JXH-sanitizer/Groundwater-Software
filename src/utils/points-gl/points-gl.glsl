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
    // 判断: 条件2--点的x值大于这条边界线上y值对应的x值(一次函数线性规划问题)
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

    // 速度 & 1m在Mercator投影中的对应两distortion & 偏移量
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

    // 交点数量为奇数说明在内部
    if((mod(intersects, 2.0)) != 0.0) {
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
    } else {
      // 此时点在外部
      pos = initial_pos;
      float initial_head_scale = initial_color.b;
      // 则返回为其最初的位置信息
      gl_FragColor = vec4(
        (pos.x - u_justify_coord_x) * 1.0,
        (pos.y - u_justify_coord_y) * 1.0,
        initial_head_scale, 
        color.a
      );
    }

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