#version 300 es
// Fragment shader for Phong shading
precision mediump float;

const int MAX_LIGHTS = 10;
uniform bool u_use_normals;

// Camera
uniform vec3 u_camera_eye;

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


in vec3 v_normal;
in vec3 v_position;

out vec4 color;

/**
* Function to compute spotlight decay 
* @param {LightInfo} light: A light from LightInfo struct
* @param {vec3} L: Light direction vector
**/
float spotLighting(LightInfo light, vec3 L){
    float lightRing = 1.0;
    float real_aperture = cos(radians(light.aperture));
    float decay = light.cutoff;
    if (light.position.w == 1.0 && light.aperture > 0.0){
        vec3 axis_vec = normalize(light.axis);
        float alpha = dot(-L, axis_vec);
        if(alpha < real_aperture) lightRing = 0.0;
        else{
            float spot_base = max(0.0, alpha);
            if(decay > 0.0) lightRing = pow(spot_base, decay);
            else lightRing = 1.0;
        }
    }
    return lightRing;
}

/**
* Function to compute Phong shading
* @param {LightInfo} light: A light from LightInfo struct
* @param {vec3} N: Normal vector
* @param {vec3} P: Position vector
* @param {vec3} V: View vector - vertex to camera eye direction
**/
vec3 phongShading(LightInfo light, vec3 N, vec3 P, vec3 V){
    vec3 L;
    
    // direction or point, spotlight
    if(light.position.w == 0.0) L = normalize(light.position.xyz);
    else L = normalize(light.position.xyz - P);

    float lightRing = spotLighting(light, L);

    // ambient Ka
    vec3 ambient = u_material.Ka * light.ambient;

    // diffuse Kd(N*L)
    float diffuseFactor = max( dot(L,N), 0.0 );
    vec3 diffuse = diffuseFactor * light.diffuse * u_material.Kd * lightRing;

    // specular Ks(R*V)^n
    vec3 H = normalize(L+V);
    float specularFactor = pow(max(dot(N,H), 0.0), u_material.shininess);
    vec3 specular = specularFactor * light.specular * u_material.Ks * lightRing;

    if( dot(L,N) < 0.0 ) specular = vec3(0.0, 0.0, 0.0);
    
    // result
    return ambient + diffuse + specular;
}

void main() {
    if(u_use_normals) {
        color = vec4(0.5f * (normalize(v_normal) + vec3(1.0f)), 1.0f);
        return;
    }
    vec3 N = normalize(v_normal);
    vec3 P = v_position; 
    vec3 V = normalize(u_camera_eye - P);

    vec3 final_color = vec3(0.0);
    for(int i = 0; i < u_numLights; i++) {
        final_color += phongShading(u_L[i], N, P, V);
    }
    color = vec4(final_color, 1.0);
}


