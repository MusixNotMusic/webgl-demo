in vec3 o_position;

out vec4 color;

void main () {
    if (distance(o_position, vec3(0.0)) < 0.5) {
        color = vec4(1.0, 1.0, 0.0, 1.0);
    } else {
        color = vec4(1.0, 0.0, 0.0, 1.0);
    }
}