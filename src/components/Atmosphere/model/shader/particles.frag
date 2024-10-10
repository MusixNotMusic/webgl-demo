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

uniform vec3 resolution;

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

vec3 accumulative(vec3 pos) {
    vec3 epsilon = 1.0 / resolution;

    float x1 = texture(u_U, pos - vec3(epsilon.x, 0.0, 0.0)).r;    
    float y1 = texture(u_V, pos - vec3(0.0, epsilon.y, 0.0)).r;    
    float z1 = texture(u_W, pos - vec3(0.0, 0.0, epsilon.z)).r;    
    float x2 = texture(u_U, pos + vec3(epsilon.x, 0.0, 0.0)).r;    
    float y2 = texture(u_V, pos + vec3(0.0, epsilon.y, 0.0)).r;    
    float z2 = texture(u_W, pos + vec3(0.0, 0.0, epsilon.z)).r;

    return vec3(x2 - x1, y2 - y1, z2 - z1);    
}

vec3 velocity(vec3 pos) {
    return vec3(
        texture(u_U, pos).r,
        texture(u_V, pos).r,
        texture(u_W, pos).r
    );
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

    float ratio = .2;
    ivec3 iSize = textureSize(u_U, 0);
    vec3 size = vec3(float(iSize.x), float(iSize.y), float(iSize.z)) * ratio;

    // vec3 size = vec3(100.0);
    vec3 inv_size = 1.0 / size;

    float speed = 0.0;

    vec3 direction3 = vec3(0.0);

    float scale = iTime;

    float d = 0.0;

    float r = 0.0005;

    color = vec4(0.0);

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        vec3 np = p + 0.5;
        if(np.z > 0.02) continue; 

        vec3 ve = velocity(np);
        vec3 acc = accumulative(np);

        direction3 = mix(vec3(0.0), ve + sin(iTime) * acc, iTime);

        p += rayDir * delta;
    }

    color = vec4(normalize(direction3), 1.0);

    if (color.a == 0.0) discard;
}
