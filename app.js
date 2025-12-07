// 全局变量
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
// Velocidades para Marte (rotación y traslación) para animaciones
let marsRotationSpeed = 0.008;
let marsRevolutionSpeed = 0.002;
let currentView = 'space';

// 纹理加载器
const textureLoader = new THREE.TextureLoader();

// DOM 元素
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

// 视角按钮
const sunViewButton = document.getElementById('sun-view');
const earthViewButton = document.getElementById('earth-view');
const moonViewButton = document.getElementById('moon-view');
const spaceViewButton = document.getElementById('space-view');

// 天体现象按钮
const showDayNightButton = document.getElementById('show-day-night');
const showSeasonsButton = document.getElementById('show-seasons');
const showMoonPhasesButton = document.getElementById('show-moon-phases');

// 选项卡切换
const lessonTabs = document.querySelectorAll('.lesson-tab');
const lessonContents = document.querySelectorAll('.lesson-content');

// 初始化
function init() {
    // 创建场景
    scene = new THREE.Scene();
    
    // 创建相机
    const aspectRatio = solarSystemContainer.clientWidth / solarSystemContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
    camera.position.z = 30;
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(solarSystemContainer.clientWidth, solarSystemContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    solarSystemContainer.appendChild(renderer.domElement);
    
    // 创建环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    
    // 创建太阳光源
    sunLight = new THREE.PointLight(0xFFFFFF, 2, 100);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    // 添加星空背景
    createStarfield();
    
    // 创建天体
    createSolarSystem();

    // Ajustar inclinación inicial de la Tierra según el valor del control de inclinación
    if (typeof tiltControl !== 'undefined' && tiltControl) {
        const tiltDegrees = parseFloat(tiltControl.value);
        if (!isNaN(tiltDegrees)) {
            earth.rotation.z = tiltDegrees * (Math.PI / 180);
            tiltValue.textContent = tiltDegrees + '°';
        }
    }
    
    // 添加轨道控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 在窗口调整大小时更新渲染器
    window.addEventListener('resize', onWindowResize);
    
    // 开始动画循环
    animate();
    
    // 初始化事件监听
    initEventListeners();
}

// 创建天体
function createSolarSystem() {
    // 太阳
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunTexture = textureLoader.load('images/sun_texture.jpg');
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        map: sunTexture
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    
    // 地球轨道
    const earthOrbitGeometry = new THREE.RingGeometry(15, 15.1, 64);
    const earthOrbitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3366ff, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    earthOrbit = new THREE.Mesh(earthOrbitGeometry, earthOrbitMaterial);
    earthOrbit.rotation.x = Math.PI / 2;
    scene.add(earthOrbit);
    
    // 地球
    const earthGeometry = new THREE.SphereGeometry(1, 32, 32);
    const earthTexture = textureLoader.load('images/earth_texture.jpg');
    const earthBumpMap = textureLoader.load('images/earth_bump.jpg');
    const earthSpecularMap = textureLoader.load('images/earth_specular.jpg');
    const earthMaterial = new THREE.MeshPhongMaterial({ 
        map: earthTexture,
        bumpMap: earthBumpMap,
        bumpScale: 0.05,
        specularMap: earthSpecularMap,
        specular: new THREE.Color(0x333333)
    });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.x = 15;
    scene.add(earth);
    
    // 月球轨道
    const moonOrbitGeometry = new THREE.RingGeometry(2, 2.05, 64);
    const moonOrbitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xaaaaaa, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    moonOrbit = new THREE.Mesh(moonOrbitGeometry, moonOrbitMaterial);
    moonOrbit.rotation.x = Math.PI / 2;
    earth.add(moonOrbit);
    
    // 月球
    const moonGeometry = new THREE.SphereGeometry(0.27, 32, 32);
    const moonTexture = textureLoader.load('images/moon_texture.jpg');
    const moonMaterial = new THREE.MeshPhongMaterial({ 
        map: moonTexture,
        bumpMap: moonTexture,
        bumpScale: 0.02,
    });
    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.x = 2;
    earth.add(moon);
    
    // 添加天体标签
    createCelestialLabels();

    // === Marte ===
    // Orbita de Marte (visualización opcional)
    const marsOrbitRadius = 22;
    const marsOrbitGeometry = new THREE.RingGeometry(marsOrbitRadius, marsOrbitRadius + 0.05, 64);
    const marsOrbitMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    marsOrbit = new THREE.Mesh(marsOrbitGeometry, marsOrbitMaterial);
    marsOrbit.rotation.x = Math.PI / 2;
    scene.add(marsOrbit);

    // Cuerpo de Marte
    const marsGeometry = new THREE.SphereGeometry(0.53, 32, 32);
    const marsMaterial = new THREE.MeshPhongMaterial({
        color: 0xff4500
    });
    mars = new THREE.Mesh(marsGeometry, marsMaterial);
    mars.position.x = marsOrbitRadius;
    scene.add(mars);
}

// 创建天体标签
function createCelestialLabels() {
    // Crear etiquetas tipo sprite que siempre miran a la cámara. Se utilizan nombres en castellano.
    createSpriteLabel('Sol', sun, 6, 0xffff00);
    createSpriteLabel('Tierra', earth, 1.5, 0x3366ff);
    createSpriteLabel('Luna', moon, 0.5, 0xaaaaaa);
    // Añadimos etiqueta para Marte
    if (typeof mars !== 'undefined') {
        createSpriteLabel('Marte', mars, 0.6, 0xff4500);
    }
}

// 创建精灵标签
function createSpriteLabel(text, parent, offset, color) {
    // 创建画布
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    
    // 绘制文字
    context.font = 'Bold 40px Arial';
    context.fillStyle = 'rgba(255,255,255,0.95)';
    context.textAlign = 'center';
    context.fillText(text, 128, 64);
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    
    // 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        color: color 
    });
    
    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(2, 1, 1);
    sprite.position.set(0, offset, 0);
    sprite.userData.isLabel = true;
    
    parent.add(sprite);
}

// 创建星空背景
function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1
    });
    
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

// 窗口大小改变时更新
function onWindowResize() {
    const width = solarSystemContainer.clientWidth;
    const height = solarSystemContainer.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
}

// 动画循环
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (isPlaying) {
        // 太阳自转
        sun.rotation.y += 0.002 * speedFactor;
        
        // 地球自转
        earth.rotation.y += earthRotationSpeed * speedFactor;
        
        // 地球公转
        const earthOrbitRadius = 15;
        earth.position.x = earthOrbitRadius * Math.cos(Date.now() * 0.0001 * earthRevolutionSpeed * speedFactor);
        earth.position.z = earthOrbitRadius * Math.sin(Date.now() * 0.0001 * earthRevolutionSpeed * speedFactor);
        
        // 月球自转
        moon.rotation.y += moonRotationSpeed * speedFactor;

        // Marte autogira y orbita alrededor del Sol
        if (typeof mars !== 'undefined') {
            // Rotación de Marte sobre su eje
            mars.rotation.y += marsRotationSpeed * speedFactor;
            // Traslación de Marte alrededor del Sol
            const marsOrbitRadius = 22;
            mars.position.x = marsOrbitRadius * Math.cos(Date.now() * 0.0001 * marsRevolutionSpeed * speedFactor);
            mars.position.z = marsOrbitRadius * Math.sin(Date.now() * 0.0001 * marsRevolutionSpeed * speedFactor);
        }
        
        // La inclinación del eje terrestre se controla mediante un control deslizante (tiltControl)
        
        // 更新标签方向
        updateLabelsOrientation();
    }
    
    // 更新轨道控制器
    controls.update();
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 更新标签方向
function updateLabelsOrientation() {
    scene.traverse(function(object) {
        if (object.userData && object.userData.isLabel) {
            object.lookAt(camera.position);
        }
    });
}

// 初始化事件监听器
function initEventListeners() {
    // 速度控制
    speedControl.addEventListener('input', function() {
        speedFactor = parseFloat(this.value);
        speedValue.textContent = speedFactor + 'x';
    });

    // Control de inclinación del eje terrestre
    if (tiltControl) {
        tiltControl.addEventListener('input', function() {
            const degrees = parseFloat(this.value);
            // Convertir grados a radianes y ajustar la inclinación del eje Z de la Tierra
            earth.rotation.z = degrees * (Math.PI / 180);
            // Actualizar etiqueta visual
            tiltValue.textContent = degrees + '°';
        });
    }
    
    // Mostrar/ocultar órbitas
    showOrbitCheckbox.addEventListener('change', function() {
        earthOrbit.visible = this.checked;
        moonOrbit.visible = this.checked;
        if (typeof marsOrbit !== 'undefined') {
            marsOrbit.visible = this.checked;
        }
    });
    
    // 显示/隐藏标签
    showNamesCheckbox.addEventListener('change', function() {
        scene.traverse(function(object) {
            if (object.userData && object.userData.isLabel) {
                object.visible = showNamesCheckbox.checked;
            }
        });
    });
    
    // Reproducir / Pausar
    playPauseButton.addEventListener('click', function() {
        isPlaying = !isPlaying;
        // Cambiar la etiqueta del botón según el estado de reproducción. Si está reproduciendo, mostrar "Pausa"; de lo contrario, "Reproducir".
        this.textContent = isPlaying ? 'Pausa' : 'Reproducir';
    });
    
    // 重置
    resetButton.addEventListener('click', resetScene);
    
    // 视角切换按钮
    sunViewButton.addEventListener('click', function() { changeView('sun'); });
    earthViewButton.addEventListener('click', function() { changeView('earth'); });
    moonViewButton.addEventListener('click', function() { changeView('moon'); });
    spaceViewButton.addEventListener('click', function() { changeView('space'); });
    
    // 天体现象按钮
    showDayNightButton.addEventListener('click', showDayNightCycle);
    showSeasonsButton.addEventListener('click', showSeasonsCycle);
    showMoonPhasesButton.addEventListener('click', showMoonPhasesCycle);
    
    // 选项卡切换
    lessonTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有选项卡的激活状态
            lessonTabs.forEach(t => t.classList.remove('active'));
            // 移除所有内容的激活状态
            lessonContents.forEach(c => c.classList.remove('active'));
            
            // 添加当前选项卡的激活状态
            this.classList.add('active');
            // 显示对应的内容
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Atajos de teclado para accesibilidad
    document.addEventListener('keydown', function(event) {
        // Barra espaciadora: reproducir/pausar
        if (event.code === 'Space') {
            event.preventDefault();
            playPauseButton.click();
        }
        // Números 1 a 4: cambiar de vista
        if (event.key === '1') {
            changeView('sun');
        } else if (event.key === '2') {
            changeView('earth');
        } else if (event.key === '3') {
            changeView('moon');
        } else if (event.key === '4') {
            changeView('space');
        }
        // Tecla s para iniciar el ciclo día‑noche
        if (event.key.toLowerCase() === 's') {
            showDayNightCycle();
        }
        // Tecla e para iniciar el ciclo de estaciones
        if (event.key.toLowerCase() === 'e') {
            showSeasonsCycle();
        }
        // Tecla m para iniciar el ciclo de fases lunares
        if (event.key.toLowerCase() === 'm') {
            showMoonPhasesCycle();
        }
    });
}

// 重置场景
function resetScene() {
    // 重置相机位置
    camera.position.set(0, 10, 30);
    camera.lookAt(scene.position);
    
    // 重置地球位置
    earth.position.set(15, 0, 0);
    
    // 重置控制参数
    speedFactor = 1;
    speedControl.value = 1;
    speedValue.textContent = '1x';
    
    isPlaying = true;
    // Establece el texto del botón de reproducción en castellano por defecto
    playPauseButton.textContent = 'Pausa';

    // Restablecer la inclinación del eje terrestre al valor por defecto
    if (typeof tiltControl !== 'undefined' && tiltControl) {
        tiltControl.value = 23;
        tiltValue.textContent = '23°';
        earth.rotation.z = 23 * (Math.PI / 180);
    }
    
    // 重置视角
    changeView('space');
}

// 切换视角
function changeView(viewType) {
    // 移除所有视角按钮的激活状态
    sunViewButton.classList.remove('active');
    earthViewButton.classList.remove('active');
    moonViewButton.classList.remove('active');
    spaceViewButton.classList.remove('active');
    
    // 记录当前视角
    currentView = viewType;
    
    // 根据视角类型设置相机位置
    switch(viewType) {
        case 'sun':
            // Vista desde el Sol
            camera.position.set(10, 5, 0);
            camera.lookAt(sun.position);
            sunViewButton.classList.add('active');
            updateInfoPanel('Vista solar', 'Observá los movimientos de la Tierra y la Luna desde la perspectiva del Sol. El Sol es el centro del sistema solar y todos los planetas giran alrededor de él.');
            break;
            
        case 'earth':
            // Vista desde la Tierra
            camera.position.copy(earth.position);
            camera.position.y += 2;
            camera.lookAt(sun.position);
            earthViewButton.classList.add('active');
            updateInfoPanel('Vista de la Tierra', 'Observá el Sol y la Luna desde la perspectiva de la Tierra. La Tierra gira sobre sí misma y alrededor del Sol; la rotación produce el día y la noche y la revolución causa las estaciones del año.');
            break;
            
        case 'moon':
            // Vista desde la Luna
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
            // Vista desde el espacio (por defecto)
            camera.position.set(0, 15, 30);
            camera.lookAt(scene.position);
            spaceViewButton.classList.add('active');
            updateInfoPanel('Vista del espacio', 'Observá el sistema solar desde el espacio. Desde este punto de vista podés ver claramente las posiciones relativas y los movimientos del Sol, la Tierra y la Luna.');
            break;
    }
    
    // 更新控制器
    controls.target.copy(scene.position);
    controls.update();
}

// 更新信息面板
function updateInfoPanel(title, content) {
    infoContent.innerHTML = `<h3>${title}</h3><p>${content}</p>`;
}

// 显示昼夜循环
function showDayNightCycle() {
    // Cambiar a la vista de la Tierra
    changeView('earth');
    
    // Mover la cámara a la superficie de la Tierra
    camera.position.copy(earth.position);
    camera.position.y += 1.2;
    
    // Actualizar el panel de información en castellano
    updateInfoPanel('Ciclo día‑noche', 'La Tierra gira sobre su propio eje, lo que produce la sucesión de días y noches. Una rotación completa tarda aproximadamente 24 horas, es decir, un día. Desde la superficie de la Tierra, el Sol sale por el este y se oculta por el oeste.');
    
    // Acelerar la rotación de la Tierra para observar mejor el efecto
    const originalEarthRotationSpeed = earthRotationSpeed;
    earthRotationSpeed = 0.05;
    
    // Restaurar la velocidad original después de 20 segundos
    setTimeout(() => {
        earthRotationSpeed = originalEarthRotationSpeed;
        changeView('space');
    }, 20000);
}

// 显示四季循环
function showSeasonsCycle() {
    // Cambiar a la vista del espacio
    changeView('space');
    
    // Ajustar la posición de la cámara para observar la traslación de la Tierra
    camera.position.set(0, 25, 5);
    camera.lookAt(scene.position);
    
    // Actualizar el panel de información en castellano
    updateInfoPanel('Ciclo de las estaciones', 'La traslación de la Tierra alrededor del Sol, combinada con la inclinación de su eje, provoca las estaciones del año. Cuando la Tierra se ubica en diferentes posiciones de su órbita, la luz solar incide con distintos ángulos, dando lugar a la primavera, el verano, el otoño y el invierno.');
    
    // Acelerar la traslación de la Tierra para observar mejor el efecto
    const originalEarthRevolutionSpeed = earthRevolutionSpeed;
    earthRevolutionSpeed = 0.02;
    
    // Restaurar la velocidad original después de 20 segundos
    setTimeout(() => {
        earthRevolutionSpeed = originalEarthRevolutionSpeed;
        changeView('space');
    }, 20000);
}

// 显示月相循环
function showMoonPhasesCycle() {
    // Cambiar a la vista del espacio, con un ajuste para observar las fases lunares
    camera.position.set(20, 10, 10);
    camera.lookAt(earth.position);
    
    // Actualizar el panel de información en castellano
    updateInfoPanel('Ciclo de fases lunares', 'Las fases lunares son las distintas formas de la parte iluminada de la Luna que vemos desde la Tierra. A medida que la Luna orbita la Tierra, su fase cambia, originando la luna nueva, el cuarto creciente, la luna llena y el cuarto menguante. Un ciclo completo de fases dura aproximadamente 29,5 días.');
    
    // Acelerar la órbita de la Luna para observar mejor el efecto
    const originalMoonRevolutionSpeed = moonRevolutionSpeed;
    moonRevolutionSpeed = 0.2;
    
    // Restaurar la velocidad original después de 20 segundos
    setTimeout(() => {
        moonRevolutionSpeed = originalMoonRevolutionSpeed;
        changeView('space');
    }, 20000);
}

// 初始化3D场景
init();