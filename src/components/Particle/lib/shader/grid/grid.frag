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

uniform vec3 u_size;

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


// void calcRayForPixel( in vec2 pix, out vec3 resRo, out vec3 resRd )
// {
// 	vec2 p = (2.0*pix-iResolution.xy) / iResolution.y;
	
//      // camera movement	
// 	vec3 ro, ta;
// 	calcCamera( ro, ta );
//     // camera matrix
//     vec3 ww = normalize( ta - ro );
//     vec3 uu = normalize( cross(ww,vec3(0.0,1.0,0.0) ) );
//     vec3 vv = normalize( cross(uu,ww));
// 	// create view ray
// 	vec3 rd = normalize( p.x*uu + p.y*vv + 2.0*ww );
	
// 	resRo = ro;
// 	resRd = rd;
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

    // vec3 inv_size = 1.0 / u_size;

    // 
    vec3 dense = vec3(20.0, 20.0, 2.0);

    vec3 grid_size = floor(u_size / dense);

    vec3 inv_grid_size = 1.0 / grid_size;

    float line_width = 0.003;

    vec3 grid_color = vec3(0.0);

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        vec3 np = p + 0.5;

        float alpha = clamp(exp(1.0 - length(np)), 0.1, 0.7);

        // line 
        vec3 lines = mod(np + line_width * 0.5, inv_grid_size);

        if (lines.x <= line_width && lines.y <= line_width) {
            color = vec4(grid_color, alpha);
        }

        if (lines.y <= line_width && lines.z <= line_width) {
            color = vec4(grid_color, alpha);
        }

        if (lines.z <= line_width && lines.x <= line_width) {
            color = vec4(grid_color, alpha);
        }

        // paticle
        vec3 pos = texture(u_pos,  np - 0.5).xyz;

        if(sdSphere(pos, 0.0001) < 0.001) {
            color = vec4(1.0, 0.0, 0.0, alpha);
        }
		
        p += rayDir * delta;
    }


    
    
    if (color.a == 0.0) discard;
}
