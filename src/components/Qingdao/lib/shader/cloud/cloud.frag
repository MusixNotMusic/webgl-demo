precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform float threshold0;
uniform float threshold;

uniform vec3 u_size;

uniform float iTime;
uniform sampler2D iChannel0;

uniform float COVERAGE;
uniform float THICKNESS;
uniform int STEPS;
uniform float FBM_FREQ;

/**** SHADERTOY *****************************************************************/
#define SHADERTOY

/**** TWEAK *****************************************************************/
// #define COVERAGE		.26
// #define THICKNESS		50.
#define ABSORPTION		1.030725
#define WIND			vec3(0, 0, -u_time * .2)

// #define FBM_FREQ		2.76434
#define NOISE_VALUE
//#define NOISE_WORLEY
//#define NOISE_PERLIN

//#define SIMULATE_LIGHT
#define FAKE_LIGHT
#define SUN_DIR			normalize(vec3(0, abs(sin(u_time * .3)), -1))

// #define STEPS			25
/******************************************************************************/

#if defined(__cplusplus) || defined(SHADERTOY)
#define u_res iResolution
#define u_time iTime
#define u_mouse iMouse
#endif

#if defined(GL_ES) || defined(GL_SHADING_LANGUAGE_VERSION)
#define _in(T) const in T
#define _inout(T) inout T
#define _out(T) out T
#define _begin(type) type (
#define _end )
#define _mutable(T) T
#define _constant(T) const T
#define mul(a, b) (a) * (b)
#endif

/******************************************************************************/

#define PI 3.14159265359

struct ray_t {
	vec3 origin;
	vec3 direction;
};

#define BIAS 1e-4 // small offset to avoid self-intersections

struct sphere_t {
	vec3 origin;
	float radius;
	int material;
};

struct plane_t {
	vec3 direction;
	float distance;
	int material;
};

struct hit_t {
	float t;
	int material_id;
	vec3 normal;
	vec3 origin;
};

#define max_dist 1e8
_constant(hit_t) no_hit = _begin(hit_t)
	float(max_dist + 1e1), // 'infinite' distance
	-1, // material id
	vec3(0., 0., 0.), // normal
	vec3(0., 0., 0.) // origin
_end;

ray_t get_primary_ray(
	_in(vec3) cam_local_point,
	_inout(vec3) cam_origin,
	_inout(vec3) cam_look_at
){
	vec3 fwd = normalize(cam_look_at - cam_origin);
	vec3 up = vec3(0, 1, 0);
	vec3 right = cross(up, fwd);
	up = cross(fwd, right);

	ray_t r = _begin(ray_t)
		cam_origin,
		normalize(fwd + up * cam_local_point.y + right * cam_local_point.x)
		_end;
	return r;
}

vec3 corect_gamma(
	_in(vec3) color,
	_in(float) gamma
){
	float p = 1.0 / gamma;
	return vec3(pow(color.r, p), pow(color.g, p), pow(color.b, p));
}

float checkboard_pattern(
	_in(vec2) pos,
	_in(float) scale
){
	vec2 pattern = floor(pos * scale);
	return mod(pattern.x + pattern.y, 2.0);
}

float band (
	_in(float) start,
	_in(float) peak,
	_in(float) end,
	_in(float) t
){
	return
	smoothstep (start, peak, t) *
	(1. - smoothstep (peak, end, t));
}

void intersect_sphere(
	_in(ray_t) ray,
	_in(sphere_t) sphere,
	_inout(hit_t) hit
){
	vec3 rc = sphere.origin - ray.origin;
	float radius2 = sphere.radius * sphere.radius;
	float tca = dot(rc, ray.direction);
//	if (tca < 0.) return;

	float d2 = dot(rc, rc) - tca * tca;
	if (d2 > radius2)
		return;

	float thc = sqrt(radius2 - d2);
	float t0 = tca - thc;
	float t1 = tca + thc;

	if (t0 < 0.) t0 = t1;
	if (t0 > hit.t)
		return;

	vec3 impact = ray.origin + ray.direction * t0;

	hit.t = t0;
	hit.material_id = sphere.material;
	hit.origin = impact;
	hit.normal = (impact - sphere.origin) / sphere.radius;
}

void intersect_plane(
	_in(ray_t) ray,
	_in(plane_t) p,
	_inout(hit_t) hit
){
	float denom = dot(p.direction, ray.direction);
	if (denom < 1e-6) return;

	vec3 P0 = vec3(p.distance, p.distance, p.distance);
	float t = dot(P0 - ray.origin, p.direction) / denom;
	if (t < 0. || t > hit.t) return;
	
	hit.t = t;
	hit.material_id = p.material;
	hit.origin = ray.origin + ray.direction * t;
	hit.normal = faceforward(p.direction, ray.direction, p.direction);
}



float hash(
	_in(float) n
){
	return fract(sin(n)*753.5453123);
}

float noise_iq(
	_in(vec3) x
){
	vec3 p = floor(x);
	vec3 f = fract(x);
	f = f*f*(3.0 - 2.0*f);

#if 0
    float n = p.x + p.y*157.0 + 113.0*p.z;
    return mix(mix(mix( hash(n+  0.0), hash(n+  1.0),f.x),
                   mix( hash(n+157.0), hash(n+158.0),f.x),f.y),
               mix(mix( hash(n+113.0), hash(n+114.0),f.x),
                   mix( hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
#else
	vec2 uv = (p.xy + vec2(37.0, 17.0)*p.z) + f.xy;
	vec2 rg = textureLod( iChannel0, (uv+.5)/256., 0.).yx;
	return mix(rg.x, rg.y, f.z);
#endif
}

// ----------------------------------------------------------------------------
// Noise function by iq from https://www.shadertoy.com/view/ldl3Dl
// ----------------------------------------------------------------------------

vec3 hash_w(
	_in(vec3) x
){
#if 0
	vec3 xx = vec3(dot(x, vec3(127.1, 311.7, 74.7)),
		dot(x, vec3(269.5, 183.3, 246.1)),
		dot(x, vec3(113.5, 271.9, 124.6)));

	return fract(sin(xx)*43758.5453123);
#else
	return texture(iChannel0, (x.xy + vec2(3.0, 1.0)*x.z + 0.5) / 256.0, -100.0).xyz;
#endif
}

// returns closest, second closest, and cell id
vec3 noise_w(
	_in(vec3) x
){
	vec3 p = floor(x);
	vec3 f = fract(x);

	float id = 0.0;
	vec2 res = vec2(100.0, 100.0);
	for (int k = -1; k <= 1; k++)
		for (int j = -1; j <= 1; j++)
			for (int i = -1; i <= 1; i++)
			{
				vec3 b = vec3(float(i), float(j), float(k));
				vec3 r = vec3(b) - f + hash_w(p + b);
				float d = dot(r, r);

				if (d < res.x)
				{
					id = dot(p + b, vec3(1.0, 57.0, 113.0));
					res = vec2(d, res.x);
				}
				else if (d < res.y)
				{
					res.y = d;
				}
			}

	return vec3(sqrt(res), abs(id));
}
//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x)
{
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x)
{
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
  return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec3 P)
{
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1, 1, 1); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1, 1, 1); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(.5, .5, .5, .5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0, 0, 0, 0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(.5, .5, .5, .5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0, 0, 0, 0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

// Classic Perlin noise, periodic variant
float pnoise(vec3 P, vec3 rep)
{
  vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
  vec3 Pi1 = mod(Pi0 + vec3(1, 1, 1), rep); // Integer part + 1, mod period
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1, 1, 1); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(.5, .5, .5, .5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0, 0, 0, 0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(.5, .5, .5, .5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0, 0, 0, 0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
  return 2.2 * n_xyz;
}

#ifdef NOISE_VALUE
#define noise(x) noise_iq(x)
#endif
#ifdef NOISE_WORLEY
#define noise(x) (1. - noise_w(x).r)
//#define noise(x) abs( noise_iq(x / 8.) - (1. - (noise_w(x * 2.).r)))
#endif
#ifdef NOISE_PERLIN
#define noise(x) abs(cnoise(x))
#endif
// ----------------------------------------------------------------------------
// Fractal Brownian Motion
// ----------------------------------------------------------------------------

float fbm(
	_in(vec3) pos,
	_in(float) lacunarity
){
	vec3 p = pos;
	float
	t  = 0.51749673 * noise(p); p *= lacunarity;
	t += 0.25584929 * noise(p); p *= lacunarity;
	t += 0.12527603 * noise(p); p *= lacunarity;
	t += 0.06255931 * noise(p);
	
	return t;
}

float get_noise(_in(vec3) x)
{
	return fbm(x, FBM_FREQ);
}

_constant(vec3) sun_color = vec3(1., .7, .55);

_constant(sphere_t) atmosphere = _begin(sphere_t)
	vec3(0, -450, 0), 500., 0
_end;

_constant(sphere_t) atmosphere_2 = _begin(sphere_t)
	atmosphere.origin, atmosphere.radius + 50., 0
_end;
_constant(plane_t) ground = _begin(plane_t)
	vec3(0., -1., 0.), 0., 1
_end;

vec3 render_sky_color(
	_in(ray_t) eye
){
	vec3 rd = eye.direction;
	float sun_amount = max(dot(rd, SUN_DIR), 0.0);

	vec3  sky = mix(vec3(.0, .1, .4), vec3(.3, .6, .8), 1.0 - rd.y);
	sky = sky + sun_color * min(pow(sun_amount, 1500.0) * 5.0, 1.0);
	sky = sky + sun_color * min(pow(sun_amount, 10.0) * .6, 1.0);

	return sky;
}

float density(
	_in(vec3) pos,
	_in(vec3) offset,
	_in(float) t
){
	// signal
	vec3 p = pos * .0212242 + offset;
	float dens = get_noise(p);
	
	float cov = 1. - COVERAGE;
	//dens = band (.1, .3, .6, dens);
	//dens *= step(cov, dens);
	//dens -= cov;
	dens *= smoothstep (cov, cov + .05, dens);

	return clamp(dens, 0., 1.);	
}

float light(
	_in(vec3) origin
){
	const int steps = 8;
	float march_step = 1.;

	vec3 pos = origin;
	vec3 dir_step = SUN_DIR * march_step;
	float T = 1.; // transmitance

	for (int i = 0; i < steps; i++) {
		float dens = density(pos, WIND, 0.);

		float T_i = exp(-ABSORPTION * dens * march_step);
		T *= T_i;
		//if (T < .01) break;

		pos += dir_step;
	}

	return T;
}

vec4 render_clouds(
	_in(ray_t) eye
){
	hit_t hit = no_hit;
	intersect_sphere(eye, atmosphere, hit);
	//hit_t hit_2 = no_hit;
	//intersect_sphere(eye, atmosphere_2, hit_2);

	float thickness = THICKNESS; // length(hit_2.origin - hit.origin);
	//const float r = 1. - ((atmosphere_2.radius - atmosphere.radius) / thickness);
	int steps = STEPS; // +int(32. * r);
	float march_step = thickness / float(steps);

	vec3 dir_step = eye.direction / eye.direction.y * march_step;
	vec3 pos = //eye.origin + eye.direction * 100.; 
		hit.origin;

	float T = 1.; // transmitance
	vec3 C = vec3(0, 0, 0); // color
	float alpha = 0.;

	for (int i = 0; i < steps; i++) {
		float h = float(i) / float(steps);
		float dens = density (pos, WIND, h);

		float T_i = exp(-ABSORPTION * dens * march_step);
		T *= T_i;
		if (T < .01) break;

		C += T * 
#ifdef SIMULATE_LIGHT
			light(pos) *
#endif
#ifdef FAKE_LIGHT
			(exp(h) / 1.75) *
#endif
			dens * march_step;
		alpha += (1. - T_i) * (1. - alpha);

		pos += dir_step;
		if (length(pos) > 1e3) break;
	}

	return vec4(C, alpha);
}

vec2 hitBox( vec3 orig, vec3 dir ) {
    const vec3 box_min = vec3( - 0.5 );
    const vec3 box_max = vec3( 0.5 );
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
    vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
    vec3 tmin = min( tmin_tmp, tmax_tmp );
    vec3 tmax = max( tmin_tmp, tmax_tmp );
    float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
    float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
    return vec2( t0, t1 );
}


vec4 render_clouds_other(vec3 ro, vec3 rd){

	//=================================
	float thickness = THICKNESS; // length(hit_2.origin - hit.origin);
	int steps = STEPS; // +int(32. * r);
	float march_step = thickness / float(steps);

	vec3 dir_step = ro / rd.y * march_step;

    vec2 bounds = hitBox( ro, rd );
    
    if ( bounds.x > bounds.y ) discard;
    
    bounds.x = max( bounds.x, 0.0 );
    
    vec3 pos = ro + 0.5 + bounds.x * rd;

	dir_step = 1.0 / rd;

	float T = 1.; // transmitance
	vec3 C = vec3(0, 0, 0); // color
	float alpha = 0.;

	for (int i = 0; i < steps; i++) {
		float h = float(i) / float(steps);
		float dens = density (pos * 100.0, vec3(0.0), 1.0 / h);


		if (dens > 0.0) {
			C = vec3(dens);
			alpha = dens;

				float T_i = exp(-ABSORPTION * dens * march_step);
			T *= T_i;
			if (T < .01) break;
		}

		// float T_i = exp(-ABSORPTION * dens * march_step);
		// T *= T_i;
		// if (T < .01) break;

// 		C += T * 
// #ifdef SIMULATE_LIGHT
// 			light(pos) *
// #endif
// #ifdef FAKE_LIGHT
// 			(exp(h) / 1.75) *
// #endif
// 			dens * march_step;
// 		alpha += (1. - T_i) * (1. - alpha);

		pos += march_step;
		// if (length(pos) > 1e3) break;
	}

	return vec4(C, alpha);
}

void main(){
    // vec3 rayDir = normalize( vDirection );
    
    // vec2 bounds = hitBox( vOrigin, rayDir );
    
    // if ( bounds.x > bounds.y ) discard;
    
    // bounds.x = max( bounds.x, 0.0 );
    
    // vec3 p = vOrigin + bounds.x * rayDir;

    // vec3 inc = 1.0 / abs( rayDir );

    // float delta = min( inc.x, min( inc.y, inc.z ) );

    // delta /= depthSampleCount;

    // for ( float t = bounds.x; t < bounds.y; t += delta ) {

    //     vec3 pos = (p + 0.5);

	// 	float dens = density (pos * vec3(50.0), vec3(0.5, 0.5, 0.6), 0.0);

	// 	if (dens > 0.0) {
	// 		color = vec4(0.3, 0.3, 0.3, clamp(p.y, 0.4, 0.9));
	// 		break;
	// 	}

	// 	// float dens = get_noise(pos * 10000.0);

	// 	// if (dens > 0.0) {
	// 	// 	color = vec4(0.0, 0.3, 1.0, p.y);
	// 	// 	break;
	// 	// }

    //     p += rayDir * delta;
    // }

	vec3 rayDir = normalize( vDirection );
	
	ray_t eye_ray = ray_t (
        vOrigin,
        rayDir
    );

	// vec3 sky = render_sky_color(eye_ray);
	// vec4 cld = render_clouds(eye_ray);
	// vec3 col = mix(sky, cld.rgb/(0.000001+cld.a), cld.a);

	// color = vec4(col, 1);

	vec3 sky = render_sky_color(eye_ray);
	vec4 cld = render_clouds_other(vOrigin, rayDir);
	vec3 col = mix(sky, cld.rgb/(0.000001+cld.a), cld.a);

	color = vec4(col, 1);
	// color = cld;
    
    if (color.a == 0.0) discard;
}
