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

vec3 speedMap(vec3 p) {
    vec4 u = texture(u_U, p + 0.5);
    vec4 v = texture(u_V, p + 0.5);
    vec4 w = texture(u_W, p + 0.5);
    return vec3(u.r, v.r, w.r);
}

vec3 getSpeed(vec3 p, vec3 epsilon) {
    vec3 up = vec3(0.0, 0.0, epsilon.z);
    vec3 down = vec3(0.0, 0.0, -epsilon.z);
    vec3 left = vec3(0.0, -epsilon.y, 0.0);
    vec3 right = vec3(0.0, epsilon.y, 0.0);
    vec3 forword = vec3(epsilon.x, 0.0, 0.0);
    vec3 back = vec3(-epsilon.x, 0.0, 0.0);
    float dx = speedMap(p + back).x - speedMap(p + forword).x;
    float dy = speedMap(p + right).y - speedMap(p + left).y;
    float dz = speedMap(p + up).z - speedMap(p + down).z;

    return speedMap(p) + vec3(dx, dy, dz);
}


// vec3 getSpeed(vec3 p, vec3 res) {

//     vec3 px = 1.0 / res;
    
//     vec3 vc = (floor(p * res)) * px;
//     vec3 f = fract(p * res);
    
//     vec3 tbl = speedMap(p);
//     vec3 tbr = speedMap(p + vec3(res.x, 0.0, 0.0));

//     vec3 tfl = speedMap(p + vec3(0.0, res.y, 0.0));
//     vec3 tfr = speedMap(p + vec3(res.x, res.y, 0.0));

//     vec3 bbl = speedMap(p + vec3(0.0, 0.0, res.z));
//     vec3 bbr = speedMap(p + vec3(res.x, 0.0, res.z));

//     vec3 bfl = speedMap(p + vec3(0.0, res.y, res.z));
//     vec3 bfr = speedMap(p + vec3(res.x, res.y, res.z));

//     vec3 tbx = mix(tbl, tbr, f.x);
//     vec3 tfx = mix(tfl, tfr, f.x);
//     vec3 bbx = mix(bbl, bbr, f.x);
//     vec3 bfx = mix(bfl, bfr, f.x);

//     vec3 by = mix(tbx, bbx, f.y);
//     vec3 fy = mix(tfx, bfx, f.y);

//     return mix(by, fy, f.z);
// }

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

    float time = float(iTime / 10.0); // clamp(0.0, 1.0, fract(iTime / 10.0));

    // Semi-Transparent
    vec4 sumColor = vec4(0.0);
    float sumA = 0.0;
    float n = 0.0;

    float val = 0.0;
    float maxVal = 0.0;

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        u = texture(u_U, p + 0.5);
        v = texture(u_V, p + 0.5);
        w = texture(u_W, p + 0.5);

        direction3 = vec3(u.r, v.r, w.r);
		
        speed = length(direction3);

		if(speed >= threshold0 && speed < threshold){

            vec3 nor = direction3 / size;

            vec3 speedN = getSpeed(p + 0.5, nor * time);
            // vec3 speedN = getSpeed(p + 0.5, size * time);

            nSpeed = length(speedN);
            
            //======color=====
            val = clamp(0.0, 1.0, nSpeed / 80.0);

            maxVal = max(maxVal, val);

            sumA += val;

            sumColor = sumColor + val * texture(u_map, vec2(1.0 - val, 0.0));

            n = n + 1.0;
            //======color=====


            if (nSpeed >= threshold0 && nSpeed < threshold) {
                break;
            }
 		}
        p += rayDir * delta;
    }

    // if (speed >= threshold0 && speed < threshold) {
    //     color = texture(u_map, vec2(clamp(0.0, 1.0, speed / 100.0), 0.0));
    // }

    if(maxVal < 0.001 || maxVal > 0.999) discard;

    vec4 colorMax = texture(u_map, vec2(maxVal, 0.0));
    vec3 colorW = sumColor.rgb / sumA;
    float avgA = sumA / n;
    float uu = pow(1.0 - avgA, n);

    color.rgb  = uu * colorW + (1.0 - uu) * colorMax.rgb;
    color.a = pow( maxVal, 1.0 / 5.2);

    if (color.a == 0.0) discard;
}
