// uniform mat4 modelViewMatrix;
// uniform mat4 projectionMatrix;

out vec2 vUv;

void main() {
    vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}