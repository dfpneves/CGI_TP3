#version 300 es
// Vertex shader for Gouraud Shading
precision mediump float;

const int MAX_LIGHTS = 10;

in vec4 a_position;
in vec3 a_normal;

// Camera
uniform vec3 u_camera_eye;
uniform mat4 u_projection;
uniform mat4 u_model_view;
uniform mat4 u_normals;

// lights can use struct

uniform int u_numLights;

struct LightInfo {

    // Intensities
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // Light geomotry
    vec4 position;

    vec3 axis;
    float aperture;
    float cutoff;
};

// array of lights
uniform LightInfo u_L[MAX_LIGHTS];

// material struct
struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

// material 
uniform MaterialInfo u_material;

out vec3 v_color;

/**
* Function to compute spotlight decay 
* @param {LightInfo} light: A light from LightInfo struct
* @param {vec3} L: Light direction vector
**/
float spotLighting(LightInfo light, vec3 L) {
    float lightRing = 1.0f;
    float real_aperture = cos(radians(light.aperture));
    float decay = light.cutoff;
    if(light.position.w == 1.0f && light.aperture > 0.0f) {
        vec3 axis_vec = normalize(light.axis);
        float alpha = dot(-L, axis_vec);
        if(alpha < real_aperture)
            lightRing = 0.0f;
        else {
            float spot_positive = max(0.0f, alpha);
            if(decay > 0.0f)
                lightRing = pow(spot_positive, decay);
            else
                lightRing = 1.0f;
        }
    }
    return lightRing;
}

/**
* Function to compute Gouraud shading
* @param {LightInfo} light: A light from LightInfo struct
* @param {vec3} N: Normal vector
* @param {vec3} P: Position vector
* @param {vec3} V: View vector - vertex to camera eye direction
**/
vec3 gouraudShading(LightInfo light, vec3 N, vec3 P, vec3 V) {
    vec3 L;

    // direction or point, spotlight
    if(light.position.w == 0.0f)
        L = normalize(light.position.xyz);
    else
        L = normalize(light.position.xyz - P);

    float lightRing = spotLighting(light, L);

    // ambient Ka
    vec3 ambient = u_material.Ka * light.ambient;

    // diffuse Kd(N*L)
    float diffuseFactor = max(dot(L, N), 0.0f);
    vec3 diffuse = diffuseFactor * light.diffuse * u_material.Kd * lightRing;

    // specular Ks(R*V)^n
    vec3 H = normalize(L + V);
    float specularFactor = pow(max(dot(N, H), 0.0f), u_material.shininess);
    vec3 specular = specularFactor * light.specular * u_material.Ks * lightRing;

    if(dot(L, N) < 0.0f)
        specular = vec3(0.0f, 0.0f, 0.0f);

    // result
    return ambient + diffuse + specular;
}

void main() {
    vec4 eye = u_model_view * a_position;
    vec3 P = eye.xyz;
    vec3 N = normalize((u_normals * vec4(a_normal, 0.0f)).xyz);
    vec3 V = normalize(u_camera_eye - P);
    vec3 final_color = vec3(0.0f);
    for(int i = 0; i < u_numLights; i++) {
        final_color += gouraudShading(u_L[i], N, P, V);
    }
    v_color = final_color;
    gl_Position = u_projection * eye;
}
