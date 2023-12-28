precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform float threshold0;
uniform float threshold;
uniform float depthSampleCount;

// uniform sampler3D tex;
uniform sampler3D u_U;
uniform sampler3D u_V;
uniform sampler3D u_W;
uniform sampler2D u_map;

uniform float iTime;

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

const int PARTICLES_NUM = 32;
const float PARTICLE_RADIUS = .003;

float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}


void main(){
    vec3 rayDir = normalize( vDirection );
    
    vec2 bounds = hitBox( vOrigin, rayDir );
    
    if ( bounds.x > bounds.y ) discard;
    
    bounds.x = max( bounds.x, 0.0 );
    
    vec3 p = vOrigin + bounds.x * rayDir;

    vec3 inc = 1.0 / abs( rayDir );

    float delta = min( inc.x, min( inc.y, inc.z ) );

    delta /= depthSampleCount;

    vec4 u = vec4(0.0);
    vec4 v = vec4(0.0);
    vec4 w = vec4(0.0);

    ivec3 iSize = textureSize(u_U, 0);
    vec3 size = vec3(float(iSize.x), float(iSize.y), float(iSize.z));

    // vec3 size = vec3(100.0);
    vec3 inv_size = 1.0 / size;

    float speed = 0.0;

    vec3 direction3 = vec3(0.0);

    float scale = clamp(0.0, 1.0, fract(iTime / 20.0));

    float d = 0.0;

    float r = 0.001;

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        vec3 np = p + 0.5;

        u = texture(u_U, np);
        v = texture(u_V, np);
        w = texture(u_W, np);

        direction3 = vec3(u.r, v.r, w.r);

        vec3 offset = vec3(direction3.xy, 0.0) * inv_size * scale;

        speed= length(direction3);

        vec3 center = floor((np + offset) * size) * inv_size + inv_size * 0.5 - offset;

        d = sdSphere(np - center, r);
        if (d < r) {
            break;
        }

        p += rayDir * delta;
    }

    if (d < r) {
        if (speed >= threshold0 && speed < threshold) {
            color = texture(u_map, vec2(clamp(0.0, 1.0, speed / 100.0), 0.0));
        }
    }

    if (color.a == 0.0) discard;
}
