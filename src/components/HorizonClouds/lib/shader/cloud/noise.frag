precision highp float;
precision highp sampler3D;
in vec3 vOrigin;
in vec3 vDirection;
out vec4 color;

uniform float STEPS;
uniform float iTime;

#define SUN_DIR	 normalize(vec3(0, 2, -1))

// Hash by David_Hoskins
#define UI0 1597334673U
#define UI1 3812015801U
#define UI2 uvec2(UI0, UI1)
#define UI3 uvec3(UI0, UI1, 2798796415U)
#define UIF (1.0 / float(0xffffffffU))

vec3 hash33(vec3 p)
{
	uvec3 q = uvec3(ivec3(p)) * UI3;
	q = (q.x ^ q.y ^ q.z)*UI3;
	return -1. + 2. * vec3(q) * UIF;
}

float remap(float x, float a, float b, float c, float d)
{
    return (((x - a) / (b - a)) * (d - c)) + c;
}

// Gradient noise by iq (modified to be tileable)
float gradientNoise(vec3 x, float freq)
{
    // grid
    vec3 p = floor(x);
    vec3 w = fract(x);
    
    // quintic interpolant
    vec3 u = w * w * w * (w * (w * 6. - 15.) + 10.);

    
    // gradients
    vec3 ga = hash33(mod(p + vec3(0., 0., 0.), freq));
    vec3 gb = hash33(mod(p + vec3(1., 0., 0.), freq));
    vec3 gc = hash33(mod(p + vec3(0., 1., 0.), freq));
    vec3 gd = hash33(mod(p + vec3(1., 1., 0.), freq));
    vec3 ge = hash33(mod(p + vec3(0., 0., 1.), freq));
    vec3 gf = hash33(mod(p + vec3(1., 0., 1.), freq));
    vec3 gg = hash33(mod(p + vec3(0., 1., 1.), freq));
    vec3 gh = hash33(mod(p + vec3(1., 1., 1.), freq));
    
    // projections
    float va = dot(ga, w - vec3(0., 0., 0.));
    float vb = dot(gb, w - vec3(1., 0., 0.));
    float vc = dot(gc, w - vec3(0., 1., 0.));
    float vd = dot(gd, w - vec3(1., 1., 0.));
    float ve = dot(ge, w - vec3(0., 0., 1.));
    float vf = dot(gf, w - vec3(1., 0., 1.));
    float vg = dot(gg, w - vec3(0., 1., 1.));
    float vh = dot(gh, w - vec3(1., 1., 1.));
	
    // interpolation
    return va + 
           u.x * (vb - va) + 
           u.y * (vc - va) + 
           u.z * (ve - va) + 
           u.x * u.y * (va - vb - vc + vd) + 
           u.y * u.z * (va - vc - ve + vg) + 
           u.z * u.x * (va - vb - ve + vf) + 
           u.x * u.y * u.z * (-va + vb + vc - vd + ve - vf - vg + vh);
}


// float light(vec3 origin){
// 	const int steps = 8;
// 	float march_step = 1.;

// 	vec3 pos = origin;
// 	vec3 dir_step = SUN_DIR * march_step;
// 	float T = 1.; // transmitance

// 	for (int i = 0; i < steps; i++) {
// 		float dens = density(pos);

// 		float T_i = exp(-ABSORPTION * dens * march_step);
// 		T *= T_i;
// 		//if (T < .01) break;

// 		pos += dir_step;
// 	}

// 	return T;
// }

// Tileable 3D worley noise
float worleyNoise(vec3 uv, float freq)
{    
    vec3 id = floor(uv);
    vec3 p = fract(uv);
    
    float minDist = 10000.;
    for (float x = -1.; x <= 1.; ++x)
    {
        for(float y = -1.; y <= 1.; ++y)
        {
            for(float z = -1.; z <= 1.; ++z)
            {
                vec3 offset = vec3(x, y, z);
            	vec3 h = hash33(mod(id + offset, vec3(freq))) * .5 + .5;
    			h += offset;
            	vec3 d = p - h;
           		minDist = min(minDist, dot(d, d));
            }
        }
    }
    
    // inverted worley noise
    return 1. - minDist;
}

// Fbm for Perlin noise based on iq's blog
float perlinfbm(vec3 p, float freq, int octaves)
{
    float G = exp2(-.85);
    float amp = 1.;
    float noise = 0.;
    for (int i = 0; i < octaves; ++i)
    {
        noise += amp * gradientNoise(p * freq, freq);
        freq *= 2.;
        amp *= G;
    }
    
    return noise;
}

// Tileable Worley fbm inspired by Andrew Schneider's Real-Time Volumetric Cloudscapes
// chapter in GPU Pro 7.
float worleyFbm(vec3 p, float freq)
{
    return worleyNoise(p*freq, freq) * .625 +
        	 worleyNoise(p*freq*2., freq*2.) * .25 +
        	 worleyNoise(p*freq*4., freq*4.) * .125;

	//  return worleyNoise(p*freq, freq) * .625 +
    //     	 worleyNoise(p*freq*2., freq*2.) * .25 +
    //     	 worleyNoise(p*freq*4., freq*4.) * .125 +
    //          worleyNoise(p*freq*8., freq*8.) * .0625 +
    //          worleyNoise(p*freq*16., freq*16.) * .025;
}


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

vec4 getFmb(vec3 pos) {
	vec4 col = vec4(0.);
    
    float slices = float(STEPS); // number of layers of the 3d texture
    float freq = 4.;

	pos.y = floor(pos.y * slices) / slices;
    
    float pfbm= mix(1., perlinfbm(pos, 4., 7), .5);
    pfbm = abs(pfbm * 2. - 1.); // billowy perlin noise
    
    col.g += worleyFbm(pos, freq);
    col.b += worleyFbm(pos, freq*2.);
    col.a += worleyFbm(pos, freq*4.);
    col.r += remap(pfbm, 0., 1., col.g, 1.); // perlin-worley

	return col;
}

float getCloud(vec3 pos) {
	float freq = 4.;
	float slices = 32.0;
	pos.y = floor(pos.y * slices) / slices;

	float pfbm = mix(1., perlinfbm(pos, 4., 7), .5);
    pfbm = abs(pfbm * 2. - 1.); // billowy perlin noise

	float y = worleyFbm(pos, freq);
	float z = worleyFbm(pos, freq*2.);
	float w = worleyFbm(pos, freq*4.);
	float x = remap(pfbm, 0., 1., y, 1.);

	float wfbm = y * .625 + z * .125 + w * .25; 

	float cloud = remap(x * 0.89, wfbm - 1., 1., 0., 1.);
	cloud = remap(cloud, .85, 1., 0., 1.);

	return cloud;
}

// float light(vec3 origin){
// 	const int steps = 8;
// 	float march_step = 1.;

// 	vec3 pos = origin;
// 	vec3 dir_step = SUN_DIR * march_step;
// 	float T = 1.; // transmitance

// 	for (int i = 0; i < steps; i++) {
// 		float dens = density(pos, WIND, 0.);

// 		float T_i = exp(-ABSORPTION * dens * march_step);
// 		T *= T_i;
// 		//if (T < .01) break;

// 		pos += dir_step;
// 	}

// 	return T;
// }

#define ABSORPTION 1.030725

void main(){
    vec3 rayDir = normalize( vDirection );
    
    vec2 bounds = hitBox( vOrigin, rayDir );
    
    if ( bounds.x > bounds.y ) discard;
    
    bounds.x = max( bounds.x, 0.0 );
    
    vec3 p = vOrigin + bounds.x * rayDir;

    vec3 inc = 1.0 / abs( rayDir );

    float delta = min( inc.x, min( inc.y, inc.z ) );

	float freq = 4.;

    delta /= STEPS;

	bounds.y = bounds.y;

	vec3 wind = vec3(0.02, 0.0, 0.02) * iTime;

	vec3 d = vec3(1.0, 0.50, 1.0);

	vec3 col = vec3(1.0);
	float T = 1.0; // transmitance
	float alpha = 0.0;

    for ( float t = bounds.x; t < bounds.y; t += delta ) {

        vec3 pos = (p + 0.5 + wind) * d;
		
		// 1. noise
		float perlinWorley = getFmb(pos * 0.3).w;

		// if (perlinWorley < 0.4) {
		// 	color = vec4(perlinWorley);
		// 	break;
		// }

		// 2. cloud 
		// cloud shape modeled after the GPU Pro 7 chapter
		float cloud = getCloud(pos);

		if (cloud > 0.0 && cloud < 0.5) {
			float T_i = exp(-ABSORPTION * (cloud)) * delta;
			T *= T_i;
			if (T < .01) break;

			col += T * (exp(p.y + 0.5) / 1.75) * cloud * delta;
			alpha += (1. - T_i) * (1. - alpha);
		}


		// if (cloud > 0.0) {
		// 	color = vec4(cloud);
		// 	break;
		// }

        p += rayDir * delta;
    }

	color = vec4(col, alpha);
    
    if (color.a == 0.0) discard;
}
