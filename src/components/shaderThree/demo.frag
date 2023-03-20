precision highp float;
precision highp sampler3D;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform float threshold;
uniform float depthSampleCount;

uniform sampler3D tex;
uniform sampler3D normals;
uniform sampler2D colorMap;
uniform samplerCube skybox;

uniform mat4 transform;
uniform mat4 inverseTransform;
uniform float zScale;

uniform float brightness;

uniform vec3 lightPosition;

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
    // float d = 0.0;
    float px = 0.0;
    for ( float t = bounds.x; t < bounds.y; t += delta ) {
        // d = sample1( p + 0.5 );

        px = max(px, sample1( p + 0.5 ));
		
		if(px >= 0.99){
			break;
		}

        if ( px > threshold ) {
            break;
        }
        p += rayDir * delta;
    }

    if (px < 0.1) {
        discard;
    }

    pxColor = texture(colorMap, vec2(px, 0.0));
	
    color.a = smoothstep(0.1, 0.95, px);
    color = pxColor * brightness;
    
    if ( color.a == 0.0 ) discard;
}


// void main(){
//     vec3 rayDir = normalize( vDirection );
//     vec2 bounds = hitBox( vOrigin, rayDir );
//     if ( bounds.x > bounds.y ) discard;

//     vec3 start = vOrigin.xyz + bounds.x * vDirection.xyz;
//     vec3 end = vOrigin.xyz + bounds.y * vDirection.xyz;

//     float len = distance(end, start);
// 	int sampleCount = int(float(depthSampleCount) * len);

//     vec3 texCo = vec3(0.0, 0.0, 0.0);
//     vec4 pxColor = vec4(0.0);
//     float px = 0.0;

//     for(int count = 0; count < sampleCount; count++){    
//         texCo = mix(start, end, float(count)/float(sampleCount));// - originOffset;
//         px = max(px, sample1( texCo + 0.5 ));
//         // px = max(px, sample1( p + 0.5 ));
		
// 		if(px >= 0.99){
// 			break;
// 		}
//     }

//     if (px < 0.1) {
//         discard;
//     }

//     pxColor = texture(colorMap, vec2(px, 0.0));
	
//     color.a = px;
//     color = pxColor * brightness;
    
//     if ( color.a == 0.0 ) discard;
// }