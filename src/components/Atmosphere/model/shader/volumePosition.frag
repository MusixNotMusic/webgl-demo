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
uniform sampler3D u_pos;

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

    vec3 pMax = vOrigin + bounds.x * rayDir;
    
    vec3 inc = 1.0 / abs( rayDir );

    float delta = min( inc.x, min( inc.y, inc.z ) );

    delta /= depthSampleCount;

    ivec3 iSize = textureSize(u_U, 0);
    
    vec3 size = vec3(float(iSize.x), float(iSize.y), float(iSize.z));

    vec3 grid =  1.0 / size;

    float radius = min(min(grid.x, grid.y), grid.z) * 0.15;

    vec3 max_velocity = vec3(20.0, 20.0, 5.0);

    float tt = clamp(0.0, 1.0, fract(iTime / 10.0));

    float speed = 0.0;

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        vec3 np = p + 0.5;

        vec3 pos = texture(u_pos, np).xyz;

        float u = texture(u_U, np).r;
        float v = texture(u_V, np).r;
        float w = texture(u_W, np).r;

        vec3 velocity = vec3(u, v, w);

        speed = length(velocity);

        vec3 t_velocity = velocity / max_velocity;
        
        //  (sin(t) + 1) * 0.5 --> [0, 1]  (sin(iTime / 2.0) + 1.0) * 0.5;
        vec3 mix_velocity = mix(vec3(0.0), vec3(1.0), t_velocity);

        vec3 xyz = (pos) * grid;

        vec3 center = floor(xyz * size) * grid + grid * 0.5;

        if (sdSphere(np - center, radius) < radius) {

            if (speed >= threshold0 && speed < threshold) {
                break;
            }
            // color.rgb = pos / size;
            // color.a = 1.0;
            // break;
        }
		
        p += rayDir * delta;
    }


    if (speed >= threshold0 && speed < threshold) {
        color = texture(u_map, vec2(clamp(0.0, 1.0, speed / 100.0), 0.0));
    } else {
        color.a = 0.0;
    }
    
    if (color.a == 0.0) discard;
}
