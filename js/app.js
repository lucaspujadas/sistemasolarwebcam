import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

// --- VARIABLES GLOBALES ---
let scene, camera, renderer, controls;
let sun, earth, moon, mars;
let earthOrbit, moonOrbit, marsOrbit;
let animationId;
let sunLight;
let isPlaying = true;
let speedFactor = 1;
let earthRotationSpeed = 0.01;
let earthRevolutionSpeed = 0.005;
let moonRotationSpeed = 0.01;
let moonRevolutionSpeed = 0.05;

// Velocidades para Marte
let marsRotationSpeed = 0.008;
let marsRevolutionSpeed = 0.002;
let currentView = 'space';

// --- VARIABLES PARA GESTOS (IA) ---
let handLandmarker = undefined;
let webcam = undefined;
let lastVideoTime = -1;
let gestureStatusDiv = document.getElementById('gesture-status');

// 纹理加载器 (Texture Loader)
const textureLoader = new THREE.TextureLoader();

// DOM Elementos
const solarSystemContainer = document.getElementById('solar-system');
const speedControl = document.getElementById('speed-control');
const speedValue = document.getElementById('speed-value');
const showOrbitCheckbox = document.getElementById('show-orbit');
const showNamesCheckbox = document.getElementById('show-names');
const playPauseButton = document.getElementById('play-pause');
const resetButton = document.getElementById('reset');
const infoContent = document.getElementById('info-content');

// Controles adicionales
const tiltControl = document.getElementById('tilt-control');
const tiltValue = document.getElementById('tilt-value');

// Botones de vista
const sunViewButton = document.getElementById('sun-view');
const earthViewButton = document.getElementById('earth-view');
const moonViewButton = document.getElementById('moon-view');
const spaceViewButton = document.getElementById('space-view');

// Botones de fenómenos
const showDayNightButton = document.getElementById('show-day-night');
const showSeasonsButton = document.getElementById('show-seasons');
const showMoonPhasesButton = document.getElementById('show-moon-phases');

// Tabs
const lessonTabs = document.querySelectorAll('.lesson-tab');
const lessonContents = document.querySelectorAll('.lesson-content');

// --- INICIALIZACIÓN ---
async function init() {
    // 1. Configuración Básica de Three.js
    scene = new THREE.Scene();
    
    const aspectRatio = solarSystemContainer.clientWidth / solarSystemContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.z = 30;
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(solarSystemContainer.clientWidth, solarSystemContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    solarSystemContainer.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    
    sunLight = new THREE.PointLight(0xFFFFFF, 2, 100);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    createStarfield();
    createSolarSystem();

    // Ajustar inclinación inicial
    if (typeof tiltControl !== 'undefined' && tiltControl) {
        const tiltDegrees = parseFloat(tiltControl.value);
        if (!isNaN(tiltDegrees)) {
            earth.rotation.z = tiltDegrees * (Math.PI / 180);
            tiltValue.textContent = tiltDegrees + '°';
        }
    }
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    window.addEventListener('resize', onWindowResize);
    initEventListeners();

    // 2. CONFIGURAR IA DE GESTOS (ESPERAR A QUE CARGUE)
    await setupGestureControl();

    // 3. INICIAR ANIMACIÓN
    animate();
}

// --- FUNCIÓN DE CONFIGURACIÓN DE IA ---
async function setupGestureControl() {
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });

        // Activar Webcam
        webcam = document.getElementById('webcam');
        if(webcam) {
            const constraints = { video: true };
            navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
                webcam.srcObject = stream;
                webcam.addEventListener('loadeddata', () => {
                    if(gestureStatusDiv) gestureStatusDiv.innerText = "¡Cámara lista! Mueve tu mano.";
                });
            });
        }
    } catch (error) {
        console.error("Error cargando la IA:", error);
        if(gestureStatusDiv) gestureStatusDiv.innerText = "Error cargando IA.";
    }
}

// --- DETECCIÓN DE GESTOS EN CADA FRAME ---
function detectGestures() {
    if (!handLandmarker || !webcam || webcam.currentTime === lastVideoTime || webcam.paused) return;

    lastVideoTime = webcam.currentTime;
    const results = handLandmarker.detectForVideo(webcam, performance.now());

    if (results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];

        // Lógica de Joystick (Rotación)
        const deadZone = 0.15; 
        const centerX = 0.5;
        const handX = 1 - indexTip.x; // Invertir X (Espejo)
        const handY = indexTip.y;

        if (handX < centerX - deadZone) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 10;
            if(gestureStatusDiv) gestureStatusDiv.innerText = "⬅️ Girando Izquierda";
        } else if (handX > centerX + deadZone) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = -10;
            if(gestureStatusDiv) gestureStatusDiv.innerText = "➡️ Girando Derecha";
        } else {
            controls.autoRotate = false;
            if(gestureStatusDiv) gestureStatusDiv.innerText = "✋ Mano detectada";
        }

        // Lógica de Pellizco (Zoom)
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const distance = Math.sqrt(dx*dx + dy*dy);

        if (distance < 0.05) {
            camera.position.z -= 0.3; // Zoom In
            if(gestureStatusDiv) gestureStatusDiv.innerText = "🤏 Zoom In (Acercar)";
        } else if (handY < 0.2) {
             camera.position.z += 0.3; // Zoom Out
             if(gestureStatusDiv) gestureStatusDiv.innerText = "Zoom Out (Mano Arriba)";
        }

    } else {
        controls.autoRotate = false;
        if(gestureStatusDiv) gestureStatusDiv.innerText = "Esperando mano...";
    }
}

// --- FUNCIONES DEL SISTEMA SOLAR ORIGINALES ---

function createSolarSystem() {
    // Sol
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunTexture = textureLoader.load('images/sun_texture.jpg');
    const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // Tierra Orbita
    const earthOrbitGeometry = new THREE.RingGeometry(15, 15.1, 64);
    const earthOrbitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3366ff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 
    });
    earthOrbit = new THREE.Mesh(earthOrbitGeometry, earthOrbitMaterial);
    earthOrbit.rotation.x = Math.PI / 2;
    scene.add(earthOrbit);
    
    // Tierra
    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    const earthTexture = textureLoader.load('images/earth_texture.jpg');
    const earthBumpMap = textureLoader.load('images/earth_bump.jpg');
    const earthSpecularMap = textureLoader.load('images/earth_specular.jpg');
    const earthMaterial = new THREE.MeshPhongMaterial({ 
        map: earthTexture, bumpMap: earthBumpMap, bumpScale: 0.05,
        specularMap: earthSpecularMap, specular: new THREE.Color(0x333333)
    });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.x = 15;
    scene.add(earth);
    
    // Luna Orbita
    const moonOrbitGeometry = new THREE.RingGeometry(2, 2.05, 64);
    const moonOrbitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xaaaaaa, side: THREE.DoubleSide, transparent: true, opacity: 0.5 
    });
    moonOrbit = new THREE.Mesh(moonOrbitGeometry, moonOrbitMaterial);
    moonOrbit.rotation.x = Math.PI / 2;
    earth.add(moonOrbit);
    
    // Luna
    const moonGeometry = new THREE.SphereGeometry(0.27, 32, 32);
    const moonTexture = textureLoader.load('images/moon_texture.jpg');
    const moonMaterial = new THREE.MeshPhongMaterial({ 
        map: moonTexture, bumpMap: moonTexture, bumpScale: 0.02,
    });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.x = 2;
    earth.add(moon);
    
    createCelestialLabels();

    // === Marte ===
    const marsOrbitRadius = 22;
    const marsOrbitGeometry = new THREE.RingGeometry(marsOrbitRadius, marsOrbitRadius + 0.05, 64);
    const marsOrbitMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4500, side: THREE.DoubleSide, transparent: true, opacity: 0.5
    });
    marsOrbit = new THREE.Mesh(marsOrbitGeometry, marsOrbitMaterial);
    marsOrbit.rotation.x = Math.PI / 2;
    scene.add(marsOrbit);

    const marsGeometry = new THREE.SphereGeometry(0.53, 32, 32);
    const marsMaterial = new THREE.MeshPhongMaterial({ color: 0xff4500 });
    mars = new THREE.Mesh(marsGeometry, marsMaterial);
    mars.position.x = marsOrbitRadius;
    scene.add(mars);
}

function createCelestialLabels() {
    createSpriteLabel('Sol', sun, 6, 0xffff00);
    createSpriteLabel('Tierra', earth, 1.5, 0x3366ff);
    createSpriteLabel('Luna', moon, 0.5, 0xaaaaaa);
    if (typeof mars !== 'undefined') {
        createSpriteLabel('Marte', mars, 0.6, 0xff4500);
    }
}

function createSpriteLabel(text, parent, offset, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256; canvas.height = 128;
    context.font = 'Bold 40px Arial';
    context.fillStyle = 'rgba(255,255,255,0.95)';
    context.textAlign = 'center';
    context.fillText(text, 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, color: color });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    sprite.position.set(0, offset, 0);
    sprite.userData.isLabel = true;
    parent.add(sprite);
}

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const starsVertices = [];
    for(let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

function onWindowResize() {
    const width = solarSystemContainer.clientWidth;
    const height = solarSystemContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// --- ANIMATION LOOP ---
function animate() {
    animationId = requestAnimationFrame(animate);
    
    // DETECTAR GESTOS CADA FRAME
    detectGestures();
    
    if (isPlaying) {
        sun.rotation.y += 0.002 * speedFactor;
        earth.rotation.y += earthRotationSpeed * speedFactor;
        
        const earthOrbitRadius = 15;
        earth.position.x = earthOrbitRadius * Math.cos(Date.now() * 0.0001 * earthRevolutionSpeed * speedFactor);
        earth.position.z = earthOrbitRadius * Math.sin(Date.now() * 0.0001 * earthRevolutionSpeed * speedFactor);
        
        moon.rotation.y += moonRotationSpeed * speedFactor;

        if (typeof mars !== 'undefined') {
            mars.rotation.y += marsRotationSpeed * speedFactor;
            const marsOrbitRadius = 22;
            mars.position.x = marsOrbitRadius * Math.cos(Date.now() * 0.0001 * marsRevolutionSpeed * speedFactor);
            mars.position.z = marsOrbitRadius * Math.sin(Date.now() * 0.0001 * marsRevolutionSpeed * speedFactor);
        }
        
        updateLabelsOrientation();
    }
    
    controls.update();
    renderer.render(scene, camera);
}

function updateLabelsOrientation() {
    scene.traverse(function(object) {
        if (object.userData && object.userData.isLabel) {
            object.lookAt(camera.position);
        }
    });
}

function initEventListeners() {
    speedControl.addEventListener('input', function() {
        speedFactor = parseFloat(this.value);
        speedValue.textContent = speedFactor + 'x';
    });

    if (tiltControl) {
        tiltControl.addEventListener('input', function() {
            const degrees = parseFloat(this.value);
            earth.rotation.z = degrees * (Math.PI / 180);
            tiltValue.textContent = degrees + '°';
        });
    }
    
    showOrbitCheckbox.addEventListener('change', function() {
        earthOrbit.visible = this.checked;
        moonOrbit.visible = this.checked;
        if (typeof marsOrbit !== 'undefined') marsOrbit.visible = this.checked;
    });
    
    showNamesCheckbox.addEventListener('change', function() {
        scene.traverse(function(object) {
            if (object.userData && object.userData.isLabel) {
                object.visible = showNamesCheckbox.checked;
            }
        });
    });
    
    playPauseButton.addEventListener('click', function() {
        isPlaying = !isPlaying;
        this.textContent = isPlaying ? 'Pausa' : 'Reproducir';
    });
    
    resetButton.addEventListener('click', resetScene);
    
    sunViewButton.addEventListener('click', function() { changeView('sun'); });
    earthViewButton.addEventListener('click', function() { changeView('earth'); });
    moonViewButton.addEventListener('click', function() { changeView('moon'); });
    spaceViewButton.addEventListener('click', function() { changeView('space'); });
    
    showDayNightButton.addEventListener('click', showDayNightCycle);
    showSeasonsButton.addEventListener('click', showSeasonsCycle);
    showMoonPhasesButton.addEventListener('click', showMoonPhasesCycle);
    
    lessonTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            lessonTabs.forEach(t => t.classList.remove('active'));
            lessonContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') { event.preventDefault(); playPauseButton.click(); }
        if (event.key === '1') changeView('sun');
        else if (event.key === '2') changeView('earth');
        else if (event.key === '3') changeView('moon');
        else if (event.key === '4') changeView('space');
        if (event.key.toLowerCase() === 's') showDayNightCycle();
        if (event.key.toLowerCase() === 'e') showSeasonsCycle();
        if (event.key.toLowerCase() === 'm') showMoonPhasesCycle();
    });
}

function resetScene() {
    camera.position.set(0, 10, 30);
    camera.lookAt(scene.position);
    earth.position.set(15, 0, 0);
    speedFactor = 1;
    speedControl.value = 1;
    speedValue.textContent = '1x';
    isPlaying = true;
    playPauseButton.textContent = 'Pausa';

    if (typeof tiltControl !== 'undefined' && tiltControl) {
        tiltControl.value = 23;
        tiltValue.textContent = '23°';
        earth.rotation.z = 23 * (Math.PI / 180);
    }
    changeView('space');
}

function changeView(viewType) {
    sunViewButton.classList.remove('active');
    earthViewButton.classList.remove('active');
    moonViewButton.classList.remove('active');
    spaceViewButton.classList.remove('active');
    
    currentView = viewType;
    
    switch(viewType) {
        case 'sun':
            camera.position.set(10, 5, 0);
            camera.lookAt(sun.position);
            sunViewButton.classList.add('active');
            updateInfoPanel('Vista solar', 'Observá los movimientos de la Tierra y la Luna desde la perspectiva del Sol. El Sol es el centro del sistema solar y todos los planetas giran alrededor de él.');
            break;
        case 'earth':
            camera.position.copy(earth.position);
            camera.position.y += 2;
            camera.lookAt(sun.position);
            earthViewButton.classList.add('active');
            updateInfoPanel('Vista de la Tierra', 'Observá el Sol y la Luna desde la perspectiva de la Tierra. La Tierra gira sobre sí misma y alrededor del Sol; la rotación produce el día y la noche y la revolución causa las estaciones del año.');
            break;
        case 'moon':
            const moonWorldPosition = new THREE.Vector3();
            moon.getWorldPosition(moonWorldPosition);
            camera.position.copy(moonWorldPosition);
            camera.position.y += 0.5;
            camera.lookAt(earth.position);
            moonViewButton.classList.add('active');
            updateInfoPanel('Vista de la Luna', 'Observá la Tierra y el Sol desde la perspectiva de la Luna. La Luna es el satélite de la Tierra; gira y orbita al mismo tiempo y su período de rotación coincide con el de revolución, por eso siempre muestra la misma cara hacia la Tierra.');
            break;
        case 'space':
        default:
            camera.position.set(0, 15, 30);
            camera.lookAt(scene.position);
            spaceViewButton.classList.add('active');
            updateInfoPanel('Vista del espacio', 'Observá el sistema solar desde el espacio. Desde este punto de vista podés ver claramente las posiciones relativas y los movimientos del Sol, la Tierra y la Luna.');
            break;
    }
    controls.target.copy(scene.position);
    controls.update();
}

function updateInfoPanel(title, content) {
    infoContent.innerHTML = `<h3>${title}</h3><p>${content}</p>`;
}

function showDayNightCycle() {
    changeView('earth');
    camera.position.copy(earth.position);
    camera.position.y += 1.2;
    updateInfoPanel('Ciclo día‑noche', 'La Tierra gira sobre su propio eje, lo que produce la sucesión de días y noches. Una rotación completa tarda aproximadamente 24 horas, es decir, un día. Desde la superficie de la Tierra, el Sol sale por el este y se oculta por el oeste.');
    const originalEarthRotationSpeed = earthRotationSpeed;
    earthRotationSpeed = 0.05;
    setTimeout(() => {
        earthRotationSpeed = originalEarthRotationSpeed;
        changeView('space');
    }, 20000);
}

function showSeasonsCycle() {
    changeView('space');
    camera.position.set(0, 25, 5);
    camera.lookAt(scene.position);
    updateInfoPanel('Ciclo de las estaciones', 'La traslación de la Tierra alrededor del Sol, combinada con la inclinación de su eje, provoca las estaciones del año. Cuando la Tierra se ubica en diferentes posiciones de su órbita, la luz solar incide con distintos ángulos, dando lugar a la primavera, el verano, el otoño y el invierno.');
    const originalEarthRevolutionSpeed = earthRevolutionSpeed;
    earthRevolutionSpeed = 0.02;
    setTimeout(() => {
        earthRevolutionSpeed = originalEarthRevolutionSpeed;
        changeView('space');
    }, 20000);
}

function showMoonPhasesCycle() {
    camera.position.set(20, 10, 10);
    camera.lookAt(earth.position);
    updateInfoPanel('Ciclo de fases lunares', 'Las fases lunares son las distintas formas de la parte iluminada de la Luna que vemos desde la Tierra. A medida que la Luna orbita la Tierra, su fase cambia, originando la luna nueva, el cuarto creciente, la luna llena y el cuarto menguante. Un ciclo completo de fases dura aproximadamente 29,5 días.');
    const originalMoonRevolutionSpeed = moonRevolutionSpeed;
    moonRevolutionSpeed = 0.2;
    setTimeout(() => {
        moonRevolutionSpeed = originalMoonRevolutionSpeed;
        changeView('space');
    }, 20000);
}

// Iniciar
init();
