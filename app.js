import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/objects/cube.js';
import * as BUNNY from '../../libs/objects/bunny.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as STACK from '../../libs/stack.js';



let gl;
let canvas;
let program;
let mView;
let sceneConfigurationObject = {};
let datGuiConfigurationObject = {};

function defineCamera(gui){
     // Camera  
    sceneConfigurationObject.camera = {
        eye: vec3(0, 0, 5),
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
    eye.add(camera.eye, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    eye.add(camera.eye, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;

    const at = cameraGui.addFolder("at");
    at.add(camera.at, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    at.add(camera.at, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    at.add(camera.at, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;

    const up = cameraGui.addFolder("up");
    up.add(camera.up, 0).step(0.05).listen().domElement.style.pointerEvents = "none";;
    up.add(camera.up, 1).step(0.05).listen().domElement.style.pointerEvents = "none";;
    up.add(camera.up, 2).step(0.05).listen().domElement.style.pointerEvents = "none";;

}

function defineOptions(gui, gl){
    sceneConfigurationObject.options = {
        backfaceCulling: false,
        depthTest: true
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
    
}

function initLights(){
    sceneConfigurationObject.lights = [
        // Light 1 -> Directional
        {
            position: { x: 0.0, y: 0.0, z: -1.0, w: 0.0 }, 
            intensities: {
                ambient: [0.1, 0.1, 0.1],
                diffuse: [0.7, 0.7, 0.7],
                specular: [0.9, 0.9, 0.9]
            },
            axis: { x: 0.0, y: 0.0, z: 0.0 },
            aperture: 0.0, 
            cutoff: 0.0      
        },
        // Light 2
        {
            position: { x: 0.0, y: 0.0, z: 0.0, w: 0.0 }, 
            intensities: {
                ambient: [0.0, 0.0, 0.0],
                diffuse: [0.0, 0.0, 0.0],
                specular: [0.0, 0.0, 0.0]
            },
            axis: { x: 0.0, y: 0.0, z: 0.0 }, 
            aperture: 0.0, 
            cutoff: 0.0
        },
        // Light 3
        {
            position: { x: 0.0, y: 0.0, z: 0.0, w: 0.0 }, 
            intensities: {
                ambient: [0.0, 0.0, 0.0],
                diffuse: [0.0, 0.0, 0.0],
                specular: [0.0, 0.0, 0.0]
            },
            axis: { x: 0.0, y: 0.0, z: 0.0 }, 
            aperture: 0.0, 
            cutoff: 0.0
        }
    ]
}

function updateLightIntensity(index, type, color){
    sceneConfigurationObject.lights[index].intensities[type] = [color[0] / 255, color[1] / 255, color[2] / 255];
}

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

}

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

function updateMaterialColor(type, color){
    sceneConfigurationObject.material[type] = [color[0] / 255, color[1] / 255, color[2] / 255];
}

function defineMaterials(gui){
    sceneConfigurationObject.material = {
        Ka: [0.1, 0.1, 0.1],         
        Kd: [0.7, 0.7, 0.7],         
        Ks: [0.9, 0.9, 0.9], 
        shininess: 30         
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
    materialGui.add(material, "shininess").min(1).max(200).step(1);


}

function defineScene(){
    sceneConfigurationObject.objects = [{
        name: "Table",
        shape: CUBE,
        transformations: [{transformationType: "s", measures: [10, 0.5, 10]}], // make Transformations 
        material: {Ka:[0.1, 0.05, 0.0],
                   Kd:[0.6, 0.3, 0.1],
                   Ks:[0.3, 0.15, 0.05]}  
    },
    // OTHER SCENE OBJECTS
    ];    
}

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

                console.log(eyeAt, newUp);

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
        gl.clearColor(0.2, 0.0, 0.0, 1.0);
    });

    canvas.addEventListener('mouseup', function (event) {
        down = false;
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
    });
    
    
}

function resizeCanvasToFullWindow() {
    const {camera} = sceneConfigurationObject;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    camera.aspect = canvas.width / canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
    
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

    program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);
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

    window.requestAnimationFrame(render);
    

}

function render(time) {
    window.requestAnimationFrame(render);
    const { camera, options, material, objects, lights } = sceneConfigurationObject;

    if (options.depthTest) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    if (options.backfaceCulling) gl.enable(gl.CULL_FACE); else gl.disable(gl.CULL_FACE);
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    
    mView = lookAt(camera.eye, camera.at, camera.up);;
    const mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));

    const numLights = lights.length;
    gl.uniform1i(gl.getUniformLocation(program, "u_numLights"), numLights);
   
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
        gl.uniform1i(gl.getUniformLocation(program, "u_use_normals"), options.normals);
        object.shape.draw(gl, program, gl.TRIANGLES);
        STACK.popMatrix();
    }

   
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));

// todo
    /*
    GUI todo
        pre: go over code check if implementation is correct
        1. options - backface culling, depth test
        2. take away aspect
        3. add lights - 1,2,3
            - position - x,y,z,w (w point or directional) (somehow also spotlight)
            - intensities (I) - ambient, diffuse, specular (and their color)
            - axis - x,y,z, aperture, cutoff
        4. material - Ka,Kd,Ka, shininess 
            aka bunny meterial changing


    Scene todo
        (can use json maybe?)
        - first attempt ignore json
        floor:
        "a parallelepiped platform measuring 10 x 0.5 x 10 (in WC), 
        aligned with the world axes and with its upper face at $y=0$."

        4 objects:
        "4 primitive objects, from those provided in the libs folder, 
        placed on top of the platform and centered in each of the quadrants. 
        You can use a 2 x 2 x 2 cube as a reference for their size. 
        The Bunny object should be in one of the quadrants."

        lights:
        note can add a sphere object to point lights to position them...
        "1 to 3 lights controlled by the user using an interface implemented using the dat.gui library."

        array of lights each light is a object
                                        "If it supports more than one light source, 
                                        its interface should be created in such a way that 
                                        adding a new light source to your program will simply result in 
                                        adding another object (with the properties of the light source) 
                                        to a vector that stores all the lights in the scene."


    shading
        Gouraud shading -> vertex shader
        Phong shading -> do similar but it the fragment shader 

    
    

    suggested possible changes
        world coordinate instead of camera
        fly around using w,a,s,d

    

    */

    // matrices