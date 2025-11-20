import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from '../../libs/utils.js';
import { length, flatten, inverse, mult, normalMatrix, perspective, lookAt, vec4, vec3, vec2, subtract, add, scale, rotate, normalize } from '../../libs/MV.js';

import * as dat from '../../libs/dat.gui.module.js';

import * as CUBE from '../../libs/objects/cube.js';
import * as SPHERE from '../../libs/objects/sphere.js';

import * as STACK from '../../libs/stack.js';

let CTRL_PRESS = false;

function setup(shaders) {
    const canvas = document.getElementById('gl-canvas');
    const gl = setupWebGL(canvas);

    CUBE.init(gl);
    SPHERE.init(gl);

    const program = buildProgramFromSources(gl, shaders['shader.vert'], shaders['shader.frag']);

    // Camera  
    let camera = {
        eye: vec3(0, 0, 5),
        at: vec3(0, 0, 0),
        up: vec3(0, 1, 0),
        fovy: 45,
        aspect: 1, // Updated further down
        near: 0.1,
        far: 20
    }

    let options = {
        wireframe: false,
        normals: true
    }

    const gui = new dat.GUI();

    const optionsGui = gui.addFolder("options");
    optionsGui.add(options, "wireframe");
    optionsGui.add(options, "normals");

    const cameraGui = gui.addFolder("camera");
    cameraGui.add(camera, 'fovy').min(10).max(180).step(1).listen();
    cameraGui.add(camera, 'aspect').min(0.1).max(10).step(0.1).listen().domElement.style.pointerEvents = "none";
    cameraGui.add(camera, 'near').min(0.1).max(camera.far).step(0.1).listen().domElement.style.pointerEvents = "none"; 
    cameraGui.add(camera, 'far').min(camera.near).max(20).step(0.1).listen().domElement.style.pointerEvents = "none";


    canvas.addEventListener("keydown", function(event){
        if (event.key == "ctrl"){
        CTRL_PRESS = true;
        }
        console.log(CTRL_PRESS);
    });

    canvas.addEventListener("keyup", function(event){
        if (event.key == "ctrl"){
        CTRL_PRESS = false;
        }
    });

    canvas.addEventListener("wheel", function(event){
        if (CTRL_PRESS){
            camera.eye += event.deltaY*0.5;
        } else {
            camera.fovy += event.deltaY*0.5;
        }
    });


    const eyeGui = gui.addFolder("eye");
    eyeGui.add(camera.eye, 0).listen().domElement.style.pointerEvents = "none";
    eyeGui.add(camera.eye, 1).listen().domElement.style.pointerEvents = "none";
    eyeGui.add(camera.eye, 2).listen().domElement.style.pointerEvents = "none";

    const atGui = gui.addFolder("at");
    atGui.add(camera.at, 0).listen().domElement.style.pointerEvents = "none";
    atGui.add(camera.at, 1).listen().domElement.style.pointerEvents = "none";
    atGui.add(camera.at, 2).listen().domElement.style.pointerEvents = "none";

    const upGui = gui.addFolder("up");
    upGui.add(camera.up, 0).listen().domElement.style.pointerEvents = "none";
    upGui.add(camera.up, 1).listen().domElement.style.pointerEvents = "none";
    upGui.add(camera.up, 2).listen().domElement.style.pointerEvents = "none";


    // matrices
    let mView, mProjection;

    let down = false;
    let lastX, lastY;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    resizeCanvasToFullWindow();

    window.addEventListener('resize', resizeCanvasToFullWindow);


    window.requestAnimationFrame(render);

    function resizeCanvasToFullWindow() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        camera.aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render(time) {
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        mView = lookAt(camera.eye, camera.at, camera.up);
        STACK.loadMatrix(mView);

        mProjection = perspective(camera.fovy, camera.aspect, camera.near, camera.far);


        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_model_view"), false, flatten(STACK.modelView()));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_projection"), false, flatten(mProjection));
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "u_normals"), false, flatten(normalMatrix(STACK.modelView())));

        gl.uniform1i(gl.getUniformLocation(program, "u_use_normals"), options.normals);

        SPHERE.draw(gl, program, options.wireframe ? gl.LINES : gl.TRIANGLES);
        CUBE.draw(gl, program, gl.LINES);
    }
}

const urls = ['shader.vert', 'shader.frag'];

loadShadersFromURLS(urls).then(shaders => setup(shaders));