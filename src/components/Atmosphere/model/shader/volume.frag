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

// float sample1( vec3 p ) {
//     return texture( tex, p ).r;
// }

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

float DecodeFloatRGBA(vec4 rgba ) {
    return dot( rgba, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0) );
}


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

    // vec4 colorU = vec4(0.0);
    // vec4 colorV = vec4(0.0);
    // vec4 colorW = vec4(0.0);

    float maxVal = 0.0;

    for ( float t = bounds.x; t < bounds.y; t += delta ) {
        // maxVal = max(maxVal, sample1( p + 0.5 ));

        float u = float(texture(u_U, p + 0.5));
        float v = float(texture(u_V, p + 0.5));
		
        // float u = DecodeFloatRGBA(colorU);
        // float v = DecodeFloatRGBA(colorV);

        float speed= length(vec2(u, v));

        // maxVal = max(length(vec2(u, v)), maxVal);
		if(speed >= threshold0 && speed < threshold){
            maxVal = speed;
			break;
		}

        // if ( maxVal > threshold ) {
        //     break;
        // }
        p += rayDir * delta;
    }

    // if (maxVal < 0.1) {
    //     discard;
    // }

    color = texture(u_map, vec2(maxVal, 0.0));
	
    // color = vec4(1.0, 0.0, 0.0, 1.0);
    
    if ( color.a == 0.0 ) discard;
}
