// #version 300 es
 
//uniform float zScale;
//uniform mat4 transform;
out vec3 o_position;

// = camera.matrixWorldInverse * object.matrixWorld
// uniform mat4 modelViewMatrix;

// = camera.projectionMatrix
// uniform mat4 projectionMatrix;

//out vec4 origin;
//out vec4 direction;
 
void main() {
   	o_position = position;
    //texCoord.x = texCoord.x*(-1.0);
    //texCoord.y = texCoord.y*(-1.0);

	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
