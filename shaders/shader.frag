#version 300 es

precision mediump float;

uniform bool u_use_normals;

// Camera
uniform vec3 u_camera_eye;

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
in vec3 v_position;

out vec4 color;

vec3 phongShading(Light light, vec3 N, vec3 P, vec3 V){
    vec3 L;
    float lightDistance = 1.0;
    
    if(light.position.w == 0.0) L = normalize(light.position.xyz);
    else L = normalize(light.position.xyz - P);

    vec3 ambient = u_Ka * light.a;

    float diffuseFactor = max( dot(L,N), 0.0 );
    vec3 diffuse = diffuseFactor * light.d;

    vec3 H = normalize(L+V);
    float specularFactor = pow(max(dot(N,H), 0.0), u_shininess);
    vec3 specular = specularFactor * light.s;
    if( dot(L,N) < 0.0 ) specular = vec3(0.0, 0.0, 0.0);
    
    return ambient + diffuse + specular;
}

void main() {
    if(u_use_normals) {
        color = vec4(0.5f * (normalize(v_normal) + vec3(1.0f)), 1.0f);
        return;
    }
    vec3 N = normalize(v_normal);
    vec3 P = v_position; 
    vec3 V = normalize(-P);

    vec3 final_color;
    for(int i = 0; i < u_numLights; i++) {
        final_color += phongShading(u_L[i], N, P, V);
    }
    color = vec4(final_color, 1.0);
}


