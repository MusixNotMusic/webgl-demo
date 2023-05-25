precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
in vec4 vRadarOrigin;
in vec3 horizon;

out vec4 color;

uniform float threshold0;
uniform float threshold;
uniform float depthSampleCount;

uniform sampler3D tex;
uniform sampler2D colorMap;
uniform vec3 cameraPosition;
uniform float brightness;

vec4 pos = vec4(0.1, 0.1, 0.00, 0.03);

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

vec4 colorSimple( float val ) {
    return texture(colorMap, vec2(val, 0.0));
}

// vec3 normal( vec3 coord ) {
//     if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
//     if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
//     if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
//     if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
//     if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
//     if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );
//     // float step = 0.0005;
//     // float step1 = 0.0007;
//     float step = 0.001;
//     float step1 = 0.001;
//     float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
//     float y = sample1( coord + vec3( 0.0, - step1, 0.0 ) ) - sample1( coord + vec3( 0.0, step1, 0.0 ) );
//     float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
//     return normalize( vec3( x, y, z ) );
// }

// vec3 normal( in vec3 p ) // for function f(p)
// {
//     const float eps = 0.0001; // or some other value
//     const vec2 h = vec2(eps,0);
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

    vec4 sumColor = vec4(1.0);
    float sumA = 0.0;
    float n = 0.0;

    vec3 maxP = vec3(1.0);
    vec4 pxColor = vec4(0.0);

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        val = sample1( p + 0.5 );

        if (val > threshold0 && val < threshold) {
            // if (length(p.xyz - vRadarOrigin.xyz) < vRadarOrigin.w) {
            //     vec3 horizonX = normalize(horizon);
            //     vec3 rayDir = normalize(p.xyz - vRadarOrigin.xyz);
            //     float deg = abs(dot(horizonX, rayDir));
            //     if (deg > 0.1 && deg < 0.999) {
            //         // maxVal = val;
            //         maxVal = val;
            //         targetP = p;
            //         break;
            //     } else {
            //         maxVal = 0.0;
            //     }
            // } else {
            //     maxVal = max(maxVal, val);

            //     if (maxVal < val) {
            //         maxVal = val;
            //     }
            //     sumA += val;

            //     sumColor = sumColor + val * texture(colorMap, vec2(val, 0.0));

            //     n = n + 1.0;
            // }

            if (maxVal < val) {
                maxVal = val;
                maxP = p;
            }
            sumA += val;

            sumColor = sumColor + val * colorSimple(val);

            n = n + 1.0;
        }
		
        p += rayDir * delta;
    }

    if(maxVal < 0.01 || maxVal > 0.99) discard;

    pxColor = vec4(normalize(maxP), 1.0);
    
    if (length(maxP.xy - vRadarOrigin.xy) < vRadarOrigin.w) {
        vec3 horizonX = normalize(horizon);
        vec3 rayDir = normalize(maxP.xyz - vRadarOrigin.xyz);
        float deg = abs(dot(vec3(0.0, 0.0, 1.0), rayDir));
        if (deg > 0.3 && deg < 0.4) {
            pxColor = colorSimple(maxVal);
        } else {
            discard;
        }
    } else {
        // vec4 colorMax = colorSimple(maxVal);
        // vec3 colorW = sumColor.rgb / sumA;
        // float avgA = sumA / n;
        // float u = pow(1.0 - avgA, n);
        //  if (maxVal > 0.2) {
        //     pxColor.rgb  = u * colorW + (1.0 - u) * colorMax.rgb;
        //     pxColor.a = pow( avgA, 1.0/ 3.3 );
        // } else {
        //     pxColor.rgb  = (1.0 - u) * colorW + u * colorMax.rgb;
        //     pxColor.a = pow( avgA, 1.0/ 2.5 );
        // } 
    }

    // if (length(p.xy - vRadarOrigin.xy) < 0.001) pxColor = vec4(1.0, 0.0, 0.0, 1.0);

    color = pxColor * brightness;

    if ( color.a == 0.0 ) discard;
}