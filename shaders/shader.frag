#version 300 es

precision mediump float;

uniform bool u_use_normals;


// lights can use struct

uniform int u_numLights;

struct Light {
    vec4 position;
    
    vec3 a;
    vec3 d;
    vec3 s;

    vec3 axis;
    float aperture;
    float cutoff;
};

uniform Light u_L[3];

// material
uniform vec3 u_Ka;
uniform vec3 u_Kd;
uniform vec3 u_Ks;
uniform float u_shininess;

in vec3 v_normal;

out vec4 color;

void main() {
    vec3 c = vec3(u_Ka.x, u_Ka.y, u_Ka.z);
    vec3 color2 = vec3(0.43f, 0.37f, 0.18f);
    vec3 color3 = u_L[0].axis;

    if(u_use_normals)
        c = 0.5f * (v_normal + vec3(1.0f, 1.0f, 1.0f));

    color = vec4(c, 1.0f);
}
