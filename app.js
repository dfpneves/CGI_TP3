// IMPORTS
import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as BUNNY from '../../libs/objects/bunny.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as SPHERE from '../../libs/objects/sphere.js';
import * as STACK from '../../libs/stack.js';

// GLOBAL VARIABLES

let gl;
let canvas;
let program;
let phongShadingProgram;
let gouraudShadingProgram;
let mView;
let sceneConfigurationObject = {};
let datGuiConfigurationObject = {};

/**
 * Function to initialize the sceneConfigurationObject camera, and set up the GUI folders
 * @param {dat.gui} gui: the GUI object
 */
function defineCamera(gui){
     // Camera  
    sceneConfigurationObject.camera = {
        eye: vec3(0, 3, 10),
        at: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        fovy: 45,
        aspect: 1, // Updated further down
        near: 0.1,
        far: 20
    };

    const camera = sceneConfigurationObject.camera;

    // camera gui
    const cameraGui = gui.addFolder("camera");
    datGuiConfigurationObject.cameraGui = cameraGui;

    cameraGui.add(camera, "fovy").min(1).max(179).step(1).listen();
    cameraGui.add(camera, "aspect").min(0).max(10).step(0.01).listen();
    cameraGui.add(camera, "near").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.near = Math.min(camera.far - 0.5, v);
    });
    cameraGui.add(camera, "far").min(0.1).max(20).step(0.01).listen().onChange(function (v) {
        camera.far = Math.max(camera.near + 0.5, v);
    });

    const eye = cameraGui.addFolder("eye");
    eye.add(camera.eye, 0).step(0.05).listen();
    eye.add(camera.eye, 1).step(0.05).listen();
    eye.add(camera.eye, 2).step(0.05).listen();

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen();
    at.add(camera.at, 1).step(0.05).listen();
    at.add(camera.at, 2).step(0.05).listen();

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    up.add(camera.up, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    up.add(camera.up, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;
}

/**
 * Function to initialize scene options and GUI options folder
 * @param {dat.gui} gui: the GUI object
 * @param {WebGL2RenderingContext} gl: the WebGL rendering context
 */
function defineOptions(gui, gl){
    sceneConfigurationObject.options = {
        backfaceCulling: false,
        depthTest: true,
        shadingType: "Phong"
    }

    // options gui
    const options = sceneConfigurationObject.options;
    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "backfaceCulling").name("backface culling").onChange(function(v){
        (v) ?  gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE); // enable or disable CULL_FACE
    });
    optionsGui.add(options, "depthTest").name("depth test").onChange(function(v){
        (v) ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST); 
    });

    if (options.depthTest) gl.enable(gl.DEPTH_TEST);
    if (options.backfaceCulling) gl.enable(gl.CULL_FACE);
    optionsGui.add(options, "shadingType", ["Gouraud", "Phong"]).name("Shading Type").onChange(function(v){
    });
    
}

/**
 * Function to initialize the three light objects
 */
function initLights(){
    sceneConfigurationObject.lights = [
        // Light 1 -> Spotlight
        {
            position: { x: 0.0, y: 5.0, z: 0.0, w: 0.0 }, 
            intensities: {
                ambient: [0.1, 0.1, 0.1],
                diffuse: [0.8, 0.8, 0.8],
                specular: [1.0, 1.0, 1.0]
            },
            axis: { x: 0.0, y: -1.0, z: -1.0 },
            aperture: 90.0, 
            cutoff: 1.0,
            turnedOn: true     
        },
        // Light 2 -> Point
        {
            position: { x: 0.0, y: 5.0, z: 0.0, w: 1.0 }, 
            intensities: {
                ambient: [0.5, 0.5, 0.5],
                diffuse: [0.3, 0.3, 0.3],
                specular: [0.4, 0.4, 0.4]
            },
            axis: { x: 0.0, y: 0.0, z: 0.0 }, 
            aperture: 0.0, 
            cutoff: 0.0, 
            turnedOn: false
        },
        // Light 3 -> Directional
        {
            position: { x: -1.0, y: -0.5, z: 0.0, w: 0.0 }, 
            intensities: {
                ambient: [0.2, 0.2, 0.2],
                diffuse: [0.2, 0.2, 0.2],
                specular: [0.3, 0.3, 0.3]
            },
            axis: { x: 0.0, y: 0.0, z: 0.0 }, 
            aperture: 0.0, 
            cutoff: 0.0,
            turnedOn: false
        }
    ]
}

/**
 * Function to convert RGB color into 0.0...1.0 float array
 * @param {number} index: the index of the light object to update
 * @param {string} type: the intensity type (ambient, diffuse or spechular)
 * @param {number[]} color: the RGB color array to be converted 
 */
function updateLightIntensity(index, type, color){
    sceneConfigurationObject.lights[index].intensities[type] = [color[0] / 255, color[1] / 255, color[2] / 255];
}

/**
 * Function to create the GUI for a light object
 * @param {dat.GUI.folder} lightGui: the main GUI dolder for the given light
 * @param {*} light: the light object
 * @param {*} index: the index of the light object in the lights array 
 */
function makeLightGui(lightGui, light, index){

    const lightPositionGui = lightGui.addFolder("position");
    lightPositionGui.add(light.position, "x").min(-10).max(10).step(0.1).listen();
    lightPositionGui.add(light.position, "y").min(-10).max(10).step(0.1).listen();
    lightPositionGui.add(light.position, "z").min(-10).max(10).step(0.1).listen();
    lightPositionGui.add(light.position, "w").min(0).max(1).step(1).listen();

    const lightColors = {
            ambient: light.intensities.ambient.map(c => c * 255),
            diffuse: light.intensities.diffuse.map(c => c * 255),
            specular: light.intensities.specular.map(c => c * 255),
    };
    const lightIntensitiesGui = lightGui.addFolder("intensities");
    lightIntensitiesGui.addColor(lightColors, "ambient").onChange(v => updateLightIntensity(index, "ambient", v));
    lightIntensitiesGui.addColor(lightColors, "diffuse").onChange(v => updateLightIntensity(index, "diffuse", v));
    lightIntensitiesGui.addColor(lightColors, "specular").onChange(v => updateLightIntensity(index, "specular", v));

    const lightAxisGui = lightGui.addFolder("axis");
    lightAxisGui.add(light.axis, "x").min(-1).max(1).step(0.01);
    lightAxisGui.add(light.axis, "y").min(-1).max(1).step(0.01);
    lightAxisGui.add(light.axis, "z").min(-1).max(1).step(0.01);

    lightGui.add(light, "aperture").min(0).max(90).step(1);
    lightGui.add(light, "cutoff").min(0).max(1).step(0.01); 
    lightGui.add(light, "turnedOn").name("Turned On").listen(); 

}

/**
 * Function to initialize and set the GUI for all the light objects in lights array
 * @param {dat.GUI} gui: the GUI object 
 */
function defineLights(gui){
    initLights();
    const lights = sceneConfigurationObject.lights;
    const lightsGui = gui.addFolder("lights");
    lights.forEach((light, index) => {
        let lightNum = index + 1;
        const lightGui = lightsGui.addFolder('light' + lightNum);
        makeLightGui(lightGui, light, index);
    });

}

/**
 * Function to convert RGB color into 0.0...1.0 float array
 * @param {string} type: the material type (ka, kd or ks) 
 * @param {number[]} color: the RGB color array to be converted 
 */
function updateMaterialColor(type, color){
    sceneConfigurationObject.material[type] = [color[0] / 255, color[1] / 255, color[2] / 255];
}

/**
 * Function to initialize the default material configuration and GUI
 * @param {dat.GUI} gui: the GUI object 
 */
function defineMaterials(gui){
    sceneConfigurationObject.material = {
        Ka: [0.1, 0.1, 0.1],         
        Kd: [0.8, 0.8, 0.8],         
        Ks: [1.0, 1.0, 1.0], 
        shininess: 8        
    };

    const material = sceneConfigurationObject.material;
    const materialGui = gui.addFolder("material");

    let materialColors = {
        ambient: material.Ka.map(c => c * 255),
        diffuse: material.Kd.map(c => c * 255),
        specular: material.Ks.map(c => c * 255),
    };

    materialGui.addColor(materialColors, "ambient").name("Ka").onChange(v => updateMaterialColor("Ka", v));
    materialGui.addColor(materialColors, "diffuse").name("Kd").onChange(v => updateMaterialColor("Kd", v));
    materialGui.addColor(materialColors, "specular").name("Ks").onChange(v => updateMaterialColor("Ks", v));
    materialGui.add(material, "shininess").min(1).max(256).step(1);


}

/**
 * Function to define the objects that make up the scene (Table, Cube, Torus and Bunny) and their transformations and material properties
 */
function defineScene(){
    sceneConfigurationObject.objects = [{
        name: "Table",
        shape: CUBE,
        transformations: [
            {transformationType: "s", measures: [10, 0.5, 10]}
        ], // make Transformations 
        material: {Ka:[0.4, 0.25, 0.00],
                   Kd:[0.3, 0.3, 0.3],
                   Ks:[0.1, 0.1, 0.1],
                   shininess: 256,
                },
    },
    {   
        name: "cube",
        shape: CUBE,
        transformations: [{transformationType: "t", measures: [2.0, 1.25, 2.0]}, {transformationType: "s", measures: [2, 2, 2]}],
        material: { Ka:[0.9, 0.1, 0.1],
                    Kd:[0.9, 0.1, 0.1],
                    Ks:[0.9, 0.1, 0.1],
                    shininess: 1,
                },
    },
    {
        name: "torus",
        shape: TORUS,
        transformations: [{transformationType: "t", measures: [-2.0, 0.7, 2.0]}, {transformationType: "s", measures: [2, 2, 2]}],
        material: { Ka:[0.2, 1.0, 0.5],
                    Kd:[0.7, 0.9, 0.5],
                    Ks:[0.3, 0.15, 0.05],
                    shininess: 1,
        },
        shininess: 1,
    },
    {
    name: "sphere",
        shape: SPHERE,
        transformations: [{transformationType: "t", measures: [2.0, 1.25, -2.0]}, {transformationType: "s", measures: [2, 2, 2]}],
        material: { Ka:[0.1, 0.4, 0.5],
                    Kd:[0.6, 0.3, 0.1],
                    Ks:[0.3, 0.15, 0.05],
                    shininess: 1,
        },
        
    },
    {
    name: "bunny",
        shape: BUNNY,
        transformations: [{transformationType: "t", measures: [-2.0, 1.25, -2.0]}, {transformationType: "s", measures: [2, 2, 2]}],
        material: sceneConfigurationObject.material,
        shininess: sceneConfigurationObject.material.shininess,
    }
    ];    
}

/**
 * Function to setup mouse Event Listeners
 */
function setupMouseEvents(){
    const { camera } = sceneConfigurationObject;
    let down = false;
    let lastX, lastY;
    window.addEventListener('resize', resizeCanvasToFullWindow);

    window.addEventListener('wheel', function (event) {

        if (!event.altKey && !event.metaKey && !event.ctrlKey) { // Change fovy
            const factor = 1 - event.deltaY / 1000;
            camera.fovy = Math.max(1, Math.min(100, camera.fovy * factor));
        }
        else if (event.metaKey || event.ctrlKey) {
            // move camera forward and backwards (shift)

            const offset = event.deltaY / 1000;

            const dir = normalize(subtract(camera.at, camera.eye));

            const ce = add(camera.eye, scale(offset, dir));
            const ca = add(camera.at, scale(offset, dir));

            // Can't replace the objects that are being listened by dat.gui, only their properties.
            camera.eye[0] = ce[0];
            camera.eye[1] = ce[1];
            camera.eye[2] = ce[2];

            if (event.ctrlKey) {
                camera.at[0] = ca[0];
                camera.at[1] = ca[1];
                camera.at[2] = ca[2];
            }
        }
    });
    
    canvas.addEventListener('mousemove', function (event) {
        if (down) {
            const dx = event.offsetX - lastX;
            const dy = event.offsetY - lastY;

            if (dx != 0 || dy != 0) {
                // Do something here...

                const d = vec2(dx, dy);
                const axis = vec3(-dy, -dx, 0);

                const rotation = rotate(0.5 * length(d), axis);

                let eyeAt = subtract(camera.eye, camera.at);
                eyeAt = vec4(eyeAt[0], eyeAt[1], eyeAt[2], 0);
                let newUp = vec4(camera.up[0], camera.up[1], camera.up[2], 0);

                eyeAt = mult(inCameraSpace(rotation), eyeAt);
                newUp = mult(inCameraSpace(rotation), newUp);

                //console.log(eyeAt, newUp);

                camera.eye[0] = camera.at[0] + eyeAt[0];
                camera.eye[1] = camera.at[1] + eyeAt[1];
                camera.eye[2] = camera.at[2] + eyeAt[2];

                camera.up[0] = newUp[0];
                camera.up[1] = newUp[1];
                camera.up[2] = newUp[2];

                lastX = event.offsetX;
                lastY = event.offsetY;
            }

        }
    });

    canvas.addEventListener('mousedown', function (event) {
        down = true;
        lastX = event.offsetX;
        lastY = event.offsetY;
    });

    canvas.addEventListener('mouseup', function (event) {
        down = false;
    });
}

/*
    helping function that updates the GUI values
*/
function moveHelper(eyeScale, atScale, dir){
    const {camera} = sceneConfigurationObject;
    camera.eye[0] += eyeScale[0] * dir;
    camera.eye[1] += eyeScale[1] * dir;
    camera.eye[2] += eyeScale[2] * dir;

    camera.at[0] += atScale[0] * dir;
    camera.at[1] += atScale[1] * dir;
    camera.at[2] += atScale[2] * dir;
    /*
    did noot work because replaced the var
    camera.eye = add(camera.eye, scale(step, w_movement_vector));
    camera.at = add(camera.at, scale(step, w_movement_vector));
    */
}


/**
 * Function to setup keyboard Event Listeners
 */
function setupKeyboardEvents(){
    window.addEventListener("keydown", function(event){
        const {camera} = sceneConfigurationObject;
        const step = 0.1;
        const {w_movement_vector, d_movement_vector} = getNormalizedMoveVectors(camera.eye, camera.at);
        let eyeScale = null;
        let atScale = null;
        let posDir = 1;
        let negDir = -1;
        
        switch(event.key){
            case "r":
                resetCamera();
                break;    
            case "w":
                eyeScale = scale(step, w_movement_vector);
                atScale = scale(step, w_movement_vector);
                moveHelper(eyeScale, atScale, posDir);
                break;
            case "s":
                eyeScale = scale(step, w_movement_vector);
                atScale = scale(step, w_movement_vector);
                moveHelper(eyeScale, atScale, negDir);
                break;
            case "a":
                eyeScale = scale(step, d_movement_vector);
                atScale = scale(step, d_movement_vector);
                moveHelper(eyeScale, atScale, posDir);
                break;
            case "d":
                eyeScale = scale(step, d_movement_vector);
                atScale = scale(step, d_movement_vector);
                moveHelper(eyeScale, atScale, negDir);
                break;                
        }
    })
}

/**
 * Function to reset the camera configuration to the initial values
 */
function resetCamera(){
    const {camera} = sceneConfigurationObject;
    camera.eye[0] = 0;
    camera.eye[1] = 3;
    camera.eye[2] = 10;
    camera.at[0] = camera.at[1] = camera.at[2] = 0;
    camera.up[0] = camera.up[2] = 0;
    camera.up[1] = 1;
    camera.fovy = 45;
    camera.near = 0.1;
    camera.far = 20;
}

/**
 * Function to compute the normalized movement vectors (for forward and right movement)
 * @param {vec3} eye: the current position of the camera eye 
 * @param {vec3} at : the current position the camera is pointing at
 * @returns {{vec3, vec3}} : an object containing the normalized vectors
 */
function getNormalizedMoveVectors(eye, at){
    const w_movement_vector = normalize(subtract(at, eye));
    const d_movement_vector = normalize(vec3(-w_movement_vector[2], 0, w_movement_vector[0]));
    return {w_movement_vector, d_movement_vector};
}

/**
 * Function to resize canvas to window width and height and update the camera aspect ratio
 */
function resizeCanvasToFullWindow() {
    const {camera} = sceneConfigurationObject;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.aspect = canvas.width / canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
    
/**
 * Function to transform a matrix from World Coordinates into Camera/View space
 * @param {mat4} m: matrix to transform
 * @returns {mat4}: the matrix transformed in camera space
 */
function inCameraSpace(m) {
    if (!mView) return m;
    const mInvView = inverse(mView);
    return mult(mInvView, mult(m, mView));
}


function setup(shaders) {
    canvas = document.getElementById('gl-canvas');
    gl = setupWebGL(canvas);

    CUBE.init(gl);
    BUNNY.init(gl);
    TORUS.init(gl);
    CYLINDER.init(gl);
    SPHERE.init(gl);

    phongShadingProgram = buildProgramFromSources(gl, shaders['shader_phong.vert'], shaders['shader_phong.frag']);
    gouraudShadingProgram = buildProgramFromSources(gl, shaders['shader_gouraud.vert'], shaders['shader_gouraud.frag']);
    program = phongShadingProgram;
    const gui = new dat.GUI();

    sceneConfigurationObject = {};
    datGuiConfigurationObject = {};

    defineCamera(gui);
    defineOptions(gui, gl);
    defineLights(gui);
    defineMaterials(gui);
    defineScene();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    resizeCanvasToFullWindow();
    setupMouseEvents();
    setupKeyboardEvents();

    window.requestAnimationFrame(render);
}

function render(time) {
    window.requestAnimationFrame(render);
    const { camera, options, material, objects, lights } = sceneConfigurationObject;

    if (options.depthTest) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    if (options.backfaceCulling) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (options.shadingType == "Phong") program = phongShadingProgram;
    else program = gouraudShadingProgram;

    gl.useProgram(program);
    
    mView = lookAt(camera.eye, camera.at, camera.up);;
    const mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));
    gl.uniform3fv(gl.getUniformLocation(program, "u_camera_eye"), flatten(camera.eye));

    const numLights = lights.length;
    gl.uniform1i(gl.getUniformLocation(program, "u_numLights"), numLights);

    for (let i = 0; i < numLights; i ++){
        const light = lights[i];

        let lightPosWorld = vec4(light.position.x, light.position.y, light.position.z, light.position.w);
        let lightPosEye = mult(mView, lightPosWorld);



        if (light.position.w === 1.0){
        // from world to view to send to shaders
            let axisEye = mult(mView, vec4(light.axis.x, light.axis.y, light.axis.z, 0.0));
        // axis
        gl.uniform3fv(
            gl.getUniformLocation(program, `u_L[${i}].axis`),
            [axisEye[0],
            axisEye[1],
            axisEye[2],]
        );
        }
        // position
        gl.uniform4fv(
            gl.getUniformLocation(program, `u_L[${i}].position`),
                flatten(lightPosEye)
        ); 
        // intensities:
        // ambient
        gl.uniform3fv(
            gl.getUniformLocation(program, `u_L[${i}].ambient`),
            light.turnedOn ? light.intensities.ambient : [0,0,0]
        );
        // diffuse
        gl.uniform3fv(
            gl.getUniformLocation(program, `u_L[${i}].diffuse`),
            light.turnedOn ? light.intensities.diffuse : [0,0,0]
        );
        // specular
        gl.uniform3fv(
            gl.getUniformLocation(program, `u_L[${i}].specular`),
            light.turnedOn ? light.intensities.specular : [0,0,0]
        );
        // aperture
        gl.uniform1f(
            gl.getUniformLocation(program, `u_L[${i}].aperture`),
            light.aperture
        );
        // cutoff
        gl.uniform1f(
            gl.getUniformLocation(program, `u_L[${i}].cutoff`),
            light.cutoff
        );
    }
   
    for(const object of sceneConfigurationObject.objects){
        STACK.pushMatrix();   
        STACK.loadMatrix(mView);
        const transformations = object.transformations || []; 
        if(transformations.length > 0){
            for(const transformation of transformations){
                const measures = transformation.measures
                switch(transformation.transformationType){
                    case "t":
                        STACK.multTranslation(measures);
                        break;
                    case "r":
                        let rotationType = measures[0];
                        let angle = measures[1];
                        switch(rotationType){
                            case "x":
                                STACK.multRotationX(angle);
                                break;
                            case "y":
                                STACK.multRotationY(angle);
                                break;
                            case "z":
                                STACK.multRotationZ(angle);
                                break;        
                        }
                        break;
                    case "s": 
                        STACK.multScale(transformation.measures);
                        break;
                }
            }
        }
        

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model_view"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ka"), object.material.Ka);
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Kd"), object.material.Kd);
        gl.uniform3fv(gl.getUniformLocation(program, "u_material.Ks"), object.material.Ks);
        gl.uniform1f(gl.getUniformLocation(program, "u_material.shininess"), object.material.shininess);
        object.shape.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
    }
}

const urls = ['shader_phong.vert', 'shader_phong.frag', 'shader_gouraud.vert', 'shader_gouraud.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));