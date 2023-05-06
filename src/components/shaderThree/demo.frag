precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform float threshold;
uniform float depthSampleCount;

uniform sampler3D tex;
uniform sampler2D colorMap;

uniform float brightness;

uniform float alpha;
uniform float maxAlpha;
uniform float minAlpha;

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
    float step = 0.01;
    float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
    float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
    float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
    return normalize( vec3( x, y, z ) );
}

// void main(){
//     vec3 rayDir = normalize( vDirection );
//     vec2 bounds = hitBox( vOrigin, rayDir );
//     if ( bounds.x > bounds.y ) discard;
//     bounds.x = max( bounds.x, 0.0 );
//     vec3 p = vOrigin + bounds.x * rayDir;
//     vec3 inc = 1.0 / abs( rayDir );
//     vec4 pxColor = vec4(0.0);
//     float delta = min( inc.x, min( inc.y, inc.z ) );
//     delta /= depthSampleCount;
//     // float d = 0.0;
//     float maxVal = 0.0;
//     for ( float t = bounds.x; t < bounds.y; t += delta ) {
//         // d = sample1( p + 0.5 );

//         maxVal = max(maxVal, sample1( p + 0.5 ));
		
// 		if(maxVal >= 0.99){
// 			break;
// 		}

//         if ( maxVal > threshold ) {
//             break;
//         }
//         p += rayDir * delta;
//     }

//     if (maxVal < 0.1) {
//         discard;
//     }

//     pxColor = texture(colorMap, vec2(maxVal, 0.0));
	
//     // color.a = smoothstep(0.1, 0.95, maxVal);
//     color = pxColor * brightness;
    
//     if ( color.a == 0.0 ) discard;
// }

void main(){
    vec3 rayDir = normalize( vDirection );
    vec2 bounds = hitBox( vOrigin, rayDir );
    if ( bounds.x > bounds.y ) discard;
    bounds.x = max( bounds.x, 0.0 );
    vec3 p = vOrigin + bounds.x * rayDir;
    vec3 inc = 1.0 / abs( rayDir );
    vec4 pxColor = vec4(0.0);
    float delta = min( inc.x, min( inc.y, inc.z ) );
    delta /= depthSampleCount;
    float val = 0.0;
    float maxVal = 0.0;
    float minVal = 1.0;
    vec4 dist = vec4(1.0, 1.0, 1.0, 0.8);

    vec4 sumColor = vec4(0.0);
    float sumA = 0.0;
    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        val = sample1( p + 0.5 );

        maxVal = max(maxVal, val);

        sumA += val;

        sumColor = val * sumColor + texture(colorMap, vec2(val, 0.0));

        if (val > 0.2) {
            minVal = min(minVal, val);
        }
		
		if(maxVal >= 0.99){
			break;
		}

        if ( maxVal > threshold ) {
            break;
        }
        p += rayDir * delta;
    }

    if (maxVal < 0.3) {
        discard;
    }

    // dist = alpha * dist + (1.0-alpha) * texture(colorMap, vec2(maxVal, 0.0));
    vec4 colorMax = texture(colorMap, vec2(maxVal, 0.0));
    vec4 colorMid = texture(colorMap, vec2((maxVal + minVal) * 0.5, 0.0));
    vec4 colorMin = texture(colorMap, vec2(minVal, 0.0));

    // dist.rgb = alpha * colorMin.rgb + (1.0 - alpha) * colorMax.a * colorMax.rgb;
    // dist.a = colorMin.a + colorMax.a - colorMin.a * colorMax.a;

    // dist = (1.0 - alpha) * colorMax + (1.0 - alpha) * 0.5 * colorMid + alpha * colorMin;

    // dist.rgb = (1.0 - alpha) * colorMax.rgb +  alpha * colorMid.rgb;
    // dist.rgb = (1.0 - alpha) * colorMax.rgb +  alpha * colorMin.rgb;

    // dist.rgb = minAlpha * colorMin.rgb + (1.0 - minAlpha) * maxAlpha * colorMax.rgb;

    // dist.a = maxAlpha + minAlpha - maxAlpha * minAlpha;
    // dist.a = (1.0 - alpha) * maxAlpha +  alpha * minAlpha;
    // dist.a = 1.0 - minVal;

    vec3 colorW = sumColor.rgb / sumA;
    float avgA = sumA / depthSampleCount;
    float u = pow(1.0 - avgA, depthSampleCount);

    pxColor.rgb  = (1.0 - u) * colorW + u * colorMax.rgb;
    pxColor.a = 1.0;
    // pxColor = dist;
	
    // pxColor = texture(colorMap, vec2(maxVal, 0.0));

    // color.a = smoothstep(0.1, 0.95, maxVal);
    color = pxColor * brightness;
    
    if ( color.a == 0.0 ) discard;
}