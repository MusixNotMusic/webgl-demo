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

    vec3 pMax = vOrigin + bounds.x * rayDir;
    
    vec3 inc = 1.0 / abs( rayDir );

    float delta = min( inc.x, min( inc.y, inc.z ) );

    delta /= depthSampleCount;

    float maxVal = 1.0;

    vec4 u = vec4(0.0);
    vec4 v = vec4(0.0);
    vec4 w = vec4(0.0);

    vec2 direction = vec2(0.0);
    float speed = 0.0;

    // base 1
    // for ( float t = bounds.x; t < bounds.y; t += delta ) {

    //     u = texture(u_U, p + 0.5);
    //     v = texture(u_V, p + 0.5);
    //     w = texture(u_W, p + 0.5);

    //     direction = vec2(u.r, v.r);
		
    //     speed= length(direction);

	// 	if(speed >= threshold0 && speed < threshold){
    //         maxVal = speed;
    //         break;
 	// 	}
    //     p += rayDir * delta;
    // }

    vec3 direction3 = vec3(0.0);

    vec4 nu = vec4(0.0);
    vec4 nv = vec4(0.0);
    vec4 nw = vec4(0.0);

    ivec3 iSize = textureSize(u_U, 0);
    vec3 size = vec3(float(iSize.x), float(iSize.y), float(iSize.z));

    float nSpeed = 0.0;

    float scale = clamp(0.0, 1.0, fract(iTime / 10.0));

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        u = texture(u_U, p + 0.5);
        v = texture(u_V, p + 0.5);
        w = texture(u_W, p + 0.5);

        direction3 = vec3(u.r, v.r, w.r);
		
        speed= length(direction3);

		if(speed >= threshold0 && speed < threshold){
            vec3 nor = direction3 / size;

            nu = texture(u_U, p + 0.5 + nor * scale);
            nv = texture(u_V, p + 0.5 + nor * scale);
            nw = texture(u_W, p + 0.5 + nor * scale);

            nSpeed = length(vec3(nu.r, nv.r, nw.r));

            speed = (speed + nSpeed) / 2.0;

            // speed = mix(speed, nSpeed, scale);

            // speed = nSpeed;
            
            break;
 		}
        p += rayDir * delta;
    }

    if (speed >= threshold0 && speed < threshold) {
        color = texture(u_map, vec2(clamp(0.0, 1.0, speed / 100.0), 0.0));
    } else {
        color = vec4(0.0, 0.0, 0.0, 0.5);
    }

    // if (color.a == 0.0) discard;
}
