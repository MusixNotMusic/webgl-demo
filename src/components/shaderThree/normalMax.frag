precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform float threshold0;
uniform float threshold;
uniform float depthSampleCount;

uniform sampler3D tex;
uniform sampler2D colorMap;
uniform vec3 cameraPosition;
uniform float brightness;


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

float sample1( vec3 p ) {
    return texture( tex, p ).r;
}

#define epsilon .0001

vec3 normal( vec3 coord ) {
    if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
    if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
    if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
    if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
    if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
    if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );
    // float step = 0.0005;
    // float step1 = 0.0007;
    float step = 0.001;
    float step1 = 0.001;
    float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
    float y = sample1( coord + vec3( 0.0, - step1, 0.0 ) ) - sample1( coord + vec3( 0.0, step1, 0.0 ) );
    float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
    return normalize( vec3( x, y, z ) );
}

// vec3 normal( in vec3 p ) // for function f(p)
// {
//     // const float eps = 0.001; // or some other value
//     // const vec2 h = vec2(eps, 0.0);
//     const vec2 h = vec2(0.0005, 0.0007);
//     return normalize( vec3(sample1(p+h.xyy) - sample1(p-h.xyy),
//                            sample1(p+h.yxy) - sample1(p-h.yxy),
//                            sample1(p+h.yyx) - sample1(p-h.yyx) ) );
// }


void main(){
    vec3 rayDir = normalize( vDirection );
    vec2 bounds = hitBox( vOrigin, rayDir );
    if ( bounds.x > bounds.y ) discard;
    bounds.x = max( bounds.x, 0.0 );
    vec3 p = vOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs( rayDir );
    float delta = min( inc.x, min( inc.y, inc.z ) );
    delta /= depthSampleCount;

    float val = 0.0;
    float maxVal = 0.0;

    vec3 maxP = vec3(1.0);
    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        val = sample1( p + 0.5 );

        if (val > threshold0 && val < threshold) {

            if (maxVal < val) {
                maxVal = val;
                maxP = p;
            }

        }
		
        p += rayDir * delta;
    }

    if(maxVal < 0.01 || maxVal > 0.99) discard;

    vec4 colorMax = texture(colorMap, vec2(maxVal, 0.0));

    vec3 norm = normal(maxP + 0.5);

    if (dot(norm, norm) < 0.001) discard;

    vec3 v = normalize(cameraPosition);
    
    vec3 l = normalize(vec3(1.0, 1.0, 1.0));
    vec3 highlight = vec3(1.0, 1.0, 1.0);

    vec3 cool = vec3(0.0, 0.0, 0.5) + 0.25 * colorMax.rgb;
    vec3 warm = vec3(0.3, 0.3, 0.0) + colorMax.rgb;
    float d = dot(norm, l);
    float t = (d + 1.0) * 0.5;
    vec3 r = 2.0 * d * norm - l;
    float s = clamp((100.0 * dot(r, v) - 97.0), 0.0, 1.0);

    vec3 shaded = s * highlight + (1.0 - s)*(t * warm + (1.0 - t) * cool);


    color.rgb = shaded;
    // color.rgb = pow(shaded, vec3(1.0 / 2.2));

    color.a = clamp(maxVal, 0.5, 1.0);
    // color.a = 1.0;

    if ( color.a == 0.0 ) discard;
}