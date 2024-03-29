precision highp float;

uniform float time;
uniform sampler2D velocity;
uniform sampler2D acceleration;
uniform sampler2D accelerationFirst;
uniform sampler2D noiseTex;
uniform sampler2D delay;
uniform sampler2D mass;
uniform vec2 multiTime;

varying vec2 vUv;

// #pragma glslify: drag = require(glsl-force/drag)
#ifndef PRECISION
#define PRECISION 0.000001
#endif

vec3 drag(vec3 a, float value) {
  return normalize(a * -1.0 + PRECISION) * length(a) * value;
}

void main(void) {
  vec3 v = texture2D(velocity, vUv).xyz;
  vec3 a = texture2D(acceleration, vUv).xyz;
  vec3 af = texture2D(accelerationFirst, vUv).xyz;
  float dl = texture2D(delay, vUv).x;
  float mass = texture2D(mass, vUv).x;
  vec3 d = drag(a, 0.012 + mass * 0.004);

  float texColorR = texture2D(noiseTex, (v.yz + vec2(v.x, 0.0) + time * multiTime * 12.0) * 0.006).r;
  float texColorG = texture2D(noiseTex, (v.zx + vec2(v.y, 0.0) + time * multiTime * 12.0) * 0.006).g;
  float texColorB = texture2D(noiseTex, (v.xy + vec2(v.z, 0.0) + time * multiTime * 12.0) * 0.006).b;
  vec3 noise = vec3(
    texColorR * 2.0 - 1.0,
    texColorG * 2.0 - 1.0,
    texColorB * 2.0 - 1.0
  );
  vec3 f = noise * 0.014 * step(dl, time);

  float init = step(100.0, length(v));
  vec3 f2 = (f + a + d + af * 0.003) * (1.0 - init) + af * init;

  gl_FragColor = vec4(f2, 1.0);
}
