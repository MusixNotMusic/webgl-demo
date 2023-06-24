// #version 300 es
uniform float aspect;
// out vec2 texCoord;
out vec3 texCoord;

void main() {

	// texCoord = vec2(position.x, position.y);
	// gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, 4, 1.0);
	// texCoord = uv;
	// gl_Position = projectionMatrix * modelViewMatrix * vec4(uv, 1.0, 1.0);

	// texCoord.x *= aspect;
	texCoord = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
