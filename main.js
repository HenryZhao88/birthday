const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMappingExposure = 0.1;
document.body.appendChild(renderer.domElement);
const clock = new THREE.Clock();

function logCameraCoordinates() {
    console.log('Camera Position:',
        'X:', camera.position.x.toFixed(4),
        'Y:', camera.position.y.toFixed(4),
        'Z:', camera.position.z.toFixed(4)
    );
}

let controlsEnabled = false;
let instructionsVisible = true;

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && instructionsVisible) {
        document.getElementById("instructions").style.display = "none";
        instructionsVisible = false;
    }
});

let testMarker = null;
const raycaster = new THREE.Raycaster();

document.body.addEventListener("click", (e) => {
    if (e.button === 0) {
        logCameraCoordinates();
    }

    if (e.button === 0 && keys['m']) {
        if (testMarker) {
            scene.remove(testMarker);
        }
        
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            const markerGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            testMarker = new THREE.Mesh(markerGeom, markerMat);
            
            testMarker.position.copy(intersects[0].point);
            scene.add(testMarker);
            
            console.log('===== TEST MARKER PLACED - USE THESE FOR GIFT SPAWN =====');
            console.log('const GIFT_X =', intersects[0].point.x.toFixed(4) + ';');
            console.log('const GIFT_Y =', intersects[0].point.y.toFixed(4) + ';');
            console.log('const GIFT_Z =', intersects[0].point.z.toFixed(4) + ';');
            console.log('=========================================================');
        } else {
            console.log('Not looking at anything - aim at the Bridgeport');
        }
        return;
    }
    
    if (!instructionsVisible) {
        renderer.domElement.requestPointerLock();
    }
});

document.body.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    
    if (gift) {
        tmpReportVector.copy(gift.position);
        if (giftOffsetReady) {
            tmpReportVector.add(giftPivotOffset);
        }

        console.log('Gift Position:', 
            'X:', tmpReportVector.x.toFixed(4), 
            'Y:', tmpReportVector.y.toFixed(4), 
            'Z:', tmpReportVector.z.toFixed(4)
        );
    } else {
        console.log('Gift not loaded yet');
    }
});

document.addEventListener("pointerlockchange", () => {
    controlsEnabled = (document.pointerLockElement === renderer.domElement);
});

let yaw = 0;
let pitch = 0;

document.addEventListener("mousemove", (e) => {
    if (!controlsEnabled) return;

    const sensitivity = 0.002;
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;

    pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, pitch));

    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
});

const ambient = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.2);
scene.add(hemi);

renderer.physicallyCorrectLights = false;
renderer.shadowMap.enabled = false;

const loader = new THREE.GLTFLoader();

scene.background = new THREE.Color(0xF0EFE7);

let smoothMoveActive = false;
let smoothStart, smoothEnd;
let smoothProgress = 0;

let bridgeport;
let gift;
let canUseMachine = false;
let hasRevealedGift = false;
const giftPivotOffset = new THREE.Vector3();
let giftOffsetReady = false;
const tmpSpawnVector = new THREE.Vector3();
const tmpReportVector = new THREE.Vector3();
const tmpWorldVector = new THREE.Vector3();
const tmpHorizontalVector = new THREE.Vector3();
const tmpDirectionVector = new THREE.Vector3();
const activeSmokeEffects = [];
let smoothTarget = null;

loader.load('./assets/bridgeport.glb', (gltf) => {
    bridgeport = gltf.scene;

    bridgeport.traverse((obj) => {
        if (obj.isMesh && obj.material) {
            obj.material.metalness = 0;       
            obj.material.roughness = 0.9;     
            obj.material.emissive = new THREE.Color(0xffffff);
            obj.material.emissiveIntensity = 0.25;
        }
    });

    scene.add(bridgeport);
});

loader.load('./assets/gift_tag.glb', (gltf) => {
    gift = gltf.scene;
    gift.visible = false;

    gift.traverse((obj) => {
        if (obj.isMesh) {
            const oldMat = obj.material;
            obj.material = new THREE.MeshBasicMaterial({
                map: oldMat.map,
                color: oldMat.color,
                vertexColors: oldMat.vertexColors,
                side: THREE.DoubleSide
            });
            
            console.log('Gift mesh BEFORE reset:', obj.name, 'Local offset:', obj.position.x, obj.position.y, obj.position.z);
            
            obj.position.set(0, 0, 0);
            
            console.log('Gift mesh AFTER reset:', obj.name, 'Local offset:', obj.position.x, obj.position.y, obj.position.z);
        }
    });

    gift.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(gift);
    bbox.getCenter(giftPivotOffset);
    gift.worldToLocal(giftPivotOffset);
    giftOffsetReady = true;

    scene.add(gift);
    console.log('Gift loaded successfully');
});

const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup',   (e) => keys[e.key] = false);

camera.position.set(0, 1.6, 9);

let moveSpeed = 0.01;

function updateMovement() {
    if (!controlsEnabled) return;

    const forward = new THREE.Vector3(
        -Math.sin(yaw),
         0,
        -Math.cos(yaw)
    );

    const right = new THREE.Vector3(
        -Math.cos(yaw),
         0,
         Math.sin(yaw)
    );

    forward.normalize();
    right.normalize();

    if (keys['w']) camera.position.addScaledVector(forward, moveSpeed);
    if (keys['s']) camera.position.addScaledVector(forward, -moveSpeed);
    if (keys['a']) camera.position.addScaledVector(right, moveSpeed);
    if (keys['d']) camera.position.addScaledVector(right, -moveSpeed);

    if (keys[' ']) camera.position.y += moveSpeed;

    if (keys['Shift']) camera.position.y -= moveSpeed;
}

const popSound = new Audio("pop.mp3");

const GIFT_X = -0.3778;
const GIFT_Y = 1.82;
const GIFT_Z = 0.7092;
const GIFT_VIEW_DISTANCE = 1.28;
const GIFT_VIEW_HEIGHT_OFFSET = 0.42;

function getGiftWorldPosition(target) {
    target.set(GIFT_X, GIFT_Y, GIFT_Z);
    return target;
}

function spawnSmokeEffect(center) {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.12;

        positions[idx] = Math.cos(angle) * radius;
        positions[idx + 1] = Math.random() * 0.06;
        positions[idx + 2] = Math.sin(angle) * radius;

        velocities[idx] = positions[idx] * 1.2;
        velocities[idx + 1] = 0.35 + Math.random() * 0.45;
        velocities[idx + 2] = positions[idx + 2] * 1.2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(center);
    scene.add(points);

    activeSmokeEffects.push({
        points,
        velocities,
        life: 0,
        duration: 0.8,
        initialOpacity: material.opacity
    });
}

function checkInteraction() {
    if (!bridgeport) return;

    const bpPos = new THREE.Vector3();
    bridgeport.getWorldPosition(bpPos);

    const dist = camera.position.distanceTo(bpPos);

    if (dist < 4.0 && !hasRevealedGift) {
        document.getElementById("prompt").style.display = "block";
        canUseMachine = true;
    } else {
        document.getElementById("prompt").style.display = "none";
        canUseMachine = false;
    }
}

function teleportGift() {
    if (!gift) {
        console.error('Gift model not loaded yet!');
        return;
    }
    
    gift.visible = true;

    gift.scale.set(0.05, 0.05, 0.05);

    const giftWorld = getGiftWorldPosition(tmpWorldVector);
    tmpSpawnVector.copy(giftWorld);

    if (giftOffsetReady) {
        tmpSpawnVector.sub(giftPivotOffset);
    }

    gift.position.copy(tmpSpawnVector);
    spawnSmokeEffect(giftWorld.clone());
    
    console.log('Gift spawned at:', giftWorld.x.toFixed(4), giftWorld.y.toFixed(4), giftWorld.z.toFixed(4));
    console.log('Camera position:', camera.position);

    popSound.play();

    let scaleVal = 0.05;

    function animatePop() {
        scaleVal += 0.05;
        gift.scale.set(scaleVal, scaleVal, scaleVal);

        if (scaleVal < 1) {
            requestAnimationFrame(animatePop);
        } else {
            gift.scale.set(1, 1, 1);
        }
    }
    animatePop();
}

function smoothMoveCamera() {
    if (!smoothMoveActive && !smoothTarget) return;

    if (smoothMoveActive) {
        smoothProgress += 0.02;
        if (smoothProgress > 1) {
            smoothProgress = 1;
            smoothMoveActive = false;
        }

        camera.position.lerpVectors(smoothStart, smoothEnd, smoothProgress);
    }

    if (smoothTarget) {
        const direction = tmpDirectionVector.copy(smoothTarget).sub(camera.position);
        if (direction.lengthSq() > 1e-6) {
            direction.normalize();

            const yawTarget = Math.atan2(-direction.x, -direction.z);
            const pitchTarget = Math.asin(direction.y);

            yaw = yawTarget;
            pitch = Math.max(-Math.PI/2 + 0.1, Math.min(Math.PI/2 - 0.1, pitchTarget));

            camera.rotation.order = 'YXZ';
            camera.rotation.y = yaw;
            camera.rotation.x = pitch;
        }
    }

    if (!smoothMoveActive && smoothTarget) {
        smoothTarget = null;
    }
}

function updateSmokeEffects(delta) {
    if (!activeSmokeEffects.length) return;

    for (let i = activeSmokeEffects.length - 1; i >= 0; i--) {
        const effect = activeSmokeEffects[i];
        effect.life += delta;

        const positions = effect.points.geometry.attributes.position.array;
        const velocities = effect.velocities;
        for (let j = 0; j < velocities.length; j += 3) {
            positions[j] += velocities[j] * delta;
            positions[j + 1] += velocities[j + 1] * delta;
            positions[j + 2] += velocities[j + 2] * delta;
        }
        effect.points.geometry.attributes.position.needsUpdate = true;

        const t = effect.life / effect.duration;
        effect.points.material.opacity = Math.max(0, effect.initialOpacity * (1 - t));
        effect.points.material.size = 0.12 + t * 0.08;

        if (effect.life >= effect.duration) {
            scene.remove(effect.points);
            effect.points.geometry.dispose();
            effect.points.material.dispose();
            activeSmokeEffects.splice(i, 1);
        }
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "e" && canUseMachine && !hasRevealedGift) {

        hasRevealedGift = true;

        const giftWorldPosition = getGiftWorldPosition(tmpWorldVector).clone();
        tmpHorizontalVector.copy(camera.position).sub(giftWorldPosition);
        tmpHorizontalVector.y = 0;
        if (tmpHorizontalVector.lengthSq() < 1e-4) {
            tmpHorizontalVector.set(0, 0, 1);
        }
        tmpHorizontalVector.setLength(GIFT_VIEW_DISTANCE);

        smoothStart = camera.position.clone();
        smoothEnd = giftWorldPosition.clone().add(tmpHorizontalVector);
        smoothEnd.y = giftWorldPosition.y + GIFT_VIEW_HEIGHT_OFFSET;
        smoothProgress = 0;
        smoothMoveActive = true;
        smoothTarget = giftWorldPosition.clone();

        teleportGift();
        document.getElementById("prompt").style.display = "none";
    }
});

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    updateMovement();
    smoothMoveCamera();
    updateSmokeEffects(delta);
    checkInteraction();
    renderer.render(scene, camera);
}
animate();
