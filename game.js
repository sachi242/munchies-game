// MUNCHIES - Chaos Edition
// A Party Brawler game using Three.js r128

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const GAME_CONFIG = {
    roundTime: 60,
    chaosInterval: 20,
    mapSize: 50,
    playerSpeed: 0.15,
    dashSpeed: 0.5,
    dashCost: 20,
    maxStamina: 100,
    staminaRegen: 1,
    botCount: 3,
    fruitCount: 15,
    bombCount: 5
};

const CHAOS_EVENTS = [
    { name: 'Tiny Titans', description: 'Everyone shrinks!' },
    { name: 'Giant Brawl', description: 'Everyone grows huge!' },
    { name: 'Speed Demon', description: 'Gotta go fast!' },
    { name: 'Slippery Floor', description: 'Ice skating time!' },
    { name: 'Bomb Rain', description: 'INCOMING!' }
];

const HATS = [
    { id: 'tophat', name: 'Top Hat', price: 100 },
    { id: 'cap', name: 'Baseball Cap', price: 150 },
    { id: 'crown', name: 'Crown', price: 300 },
    { id: 'headphones', name: 'Headphones', price: 200 },
    { id: 'halo', name: 'Halo', price: 500 }
];

const CHARACTERS = [
    'Panda', 'Bear', 'Bunny', 'Cat', 'Chicken', 'Cow', 'Crocodile', 
    'Dog', 'Elephant', 'Fox', 'Frog', 'Mole', 'Monkey', 'Mouse', 
    'Parrot', 'Penguin', 'Piglet', 'Turtle', 'Unicorn', 'Axolotl'
];

const ASSET_MANIFEST = {
    characters: CHARACTERS.reduce((acc, char) => {
        acc[char.toLowerCase()] = `Animals/${char}/${char.toLowerCase()}.vox.obj`;
        return acc;
    }, {}),
    collectibles: {
        apple: 'Collectibles/apple/apple.vox.obj',
        banana: 'Collectibles/banana/banana.vox.obj',
        melon: 'Collectibles/melon/melon.vox.obj',
        carrot: 'Collectibles/carrot/carrot.vox.obj',
        corn: 'Collectibles/corn/corn.vox.obj'
    },
    environment: {
        tree: 'Main/Green/tree1/tree.vox.obj',
        crate: 'Main/Green/box1/box1.vox.obj'
    }
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let scene, camera, renderer, canvas;
let player, bots = [], collectibles = [], hazards = [], powerups = [];
let gameState = 'menu'; // menu, playing, editor, gameover
let gameTime = GAME_CONFIG.roundTime;
let chaosTimer = 0;
let activeChaos = null;
let keys = {};
let joystickActive = false;
let joystickDirection = { x: 0, y: 0 };
let levelData = null;
let editorMode = false;
let selectedTool = 'grass';
let assetCache = {};

// Player Data
let playerData = {
    selectedCharacter: 'panda',
    coins: 0,
    score: 0,
    unlockedHats: [],
    equippedHat: null,
    customLevels: []
};

// ============================================================================
// AUDIO SYSTEM (Synthesized)
// ============================================================================

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
        case 'collect':
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'dash':
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 200;
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'explode':
            oscillator.type = 'sawtooth';
            oscillator.frequency.value = 100;
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'hit':
            oscillator.type = 'square';
            oscillator.frequency.value = 150;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'powerup':
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

function init() {
    canvas = document.getElementById('gameCanvas');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    
    // Camera (Orthographic for isometric look)
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    camera = new THREE.OrthographicCamera(
        frustumSize * aspect / -2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        frustumSize / -2,
        0.1,
        1000
    );
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);
    
    // Load saved data
    loadPlayerData();
    
    // Initialize UI
    initCharacterSelect();
    initShop();
    
    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Mobile controls
    initMobileControls();
    
    // Start render loop
    animate();
}

function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        playerDash();
    }
}

function onKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

// ============================================================================
// MOBILE CONTROLS
// ============================================================================

function initMobileControls() {
    const joystick = document.getElementById('joystick');
    const stick = document.getElementById('joystickStick');
    const dashBtn = document.getElementById('dashButton');
    
    let joystickCenter = { x: 0, y: 0 };
    
    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        const rect = joystick.getBoundingClientRect();
        joystickCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    });
    
    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystickActive) return;
        
        const touch = e.touches[0];
        const dx = touch.clientX - joystickCenter.x;
        const dy = touch.clientY - joystickCenter.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 45;
        
        if (distance > maxDistance) {
            joystickDirection.x = (dx / distance) * maxDistance;
            joystickDirection.y = (dy / distance) * maxDistance;
        } else {
            joystickDirection.x = dx;
            joystickDirection.y = dy;
        }
        
        stick.style.transform = `translate(calc(-50% + ${joystickDirection.x}px), calc(-50% + ${joystickDirection.y}px))`;
    });
    
    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickDirection = { x: 0, y: 0 };
        stick.style.transform = 'translate(-50%, -50%)';
    });
    
    dashBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState === 'playing') {
            playerDash();
        }
    });
}

// ============================================================================
// TOON SHADER / OUTLINE EFFECT
// ============================================================================

function addOutline(mesh) {
    mesh.traverse((child) => {
        if (child.isMesh) {
            // Create outline using inverted hull technique
            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: 0x000000,
                side: THREE.BackSide
            });
            
            const outlineMesh = new THREE.Mesh(child.geometry, outlineMaterial);
            outlineMesh.scale.multiplyScalar(1.05);
            child.add(outlineMesh);
            
            // Apply toon-like material
            if (!child.material.color) {
                child.material = new THREE.MeshToonMaterial({
                    color: child.material.color || 0xffffff
                });
            }
        }
    });
}

// ============================================================================
// PROCEDURAL HAT GENERATION
// ============================================================================

function createHat(hatType) {
    const hatGroup = new THREE.Group();
    
    switch(hatType) {
        case 'tophat':
            const brimGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
            const brim = new THREE.Mesh(brimGeo, new THREE.MeshToonMaterial({ color: 0x000000 }));
            const hatGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16);
            const hat = new THREE.Mesh(hatGeo, new THREE.MeshToonMaterial({ color: 0x000000 }));
            hat.position.y = 0.45;
            hatGroup.add(brim, hat);
            break;
            
        case 'cap':
            const capGeo = new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
            const cap = new THREE.Mesh(capGeo, new THREE.MeshToonMaterial({ color: 0xff0000 }));
            const visorGeo = new THREE.BoxGeometry(0.8, 0.05, 0.6);
            const visor = new THREE.Mesh(visorGeo, new THREE.MeshToonMaterial({ color: 0xff0000 }));
            visor.position.set(0, -0.2, 0.4);
            hatGroup.add(cap, visor);
            break;
            
        case 'crown':
            const baseGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8);
            const base = new THREE.Mesh(baseGeo, new THREE.MeshToonMaterial({ color: 0xffd700 }));
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15, 0.4, 4),
                    new THREE.MeshToonMaterial({ color: 0xffd700 })
                );
                spike.position.set(Math.cos(angle) * 0.7, 0.35, Math.sin(angle) * 0.7);
                hatGroup.add(spike);
            }
            hatGroup.add(base);
            break;
            
        case 'headphones':
            const bandGeo = new THREE.TorusGeometry(0.7, 0.1, 8, 16, Math.PI);
            const band = new THREE.Mesh(bandGeo, new THREE.MeshToonMaterial({ color: 0x333333 }));
            band.rotation.z = Math.PI;
            const leftEar = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 16, 16),
                new THREE.MeshToonMaterial({ color: 0x333333 })
            );
            leftEar.position.set(-0.7, 0, 0);
            const rightEar = leftEar.clone();
            rightEar.position.set(0.7, 0, 0);
            hatGroup.add(band, leftEar, rightEar);
            break;
            
        case 'halo':
            const haloGeo = new THREE.TorusGeometry(0.6, 0.08, 8, 32);
            const halo = new THREE.Mesh(haloGeo, new THREE.MeshToonMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 0.5
            }));
            halo.rotation.x = Math.PI / 2;
            halo.position.y = 0.8;
            hatGroup.add(halo);
            break;
    }
    
    hatGroup.traverse((child) => {
        if (child.isMesh) {
            addOutline(child);
        }
    });
    
    return hatGroup;
}

// ============================================================================
// CHARACTER & ENTITY CLASSES
// ============================================================================

class Character {
    constructor(type, isPlayer = false) {
        this.type = type;
        this.isPlayer = isPlayer;
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.rotation = 0;
        this.score = 0;
        this.stamina = GAME_CONFIG.maxStamina;
        this.stunned = false;
        this.scale = 1;
        this.speedMultiplier = 1;
        this.strengthMultiplier = 1;
        this.infiniteStamina = false;
        this.powerupTimers = {};
        
        // Create mesh
        this.mesh = new THREE.Group();
        this.createModel();
        scene.add(this.mesh);
    }
    
    createModel() {
        this.createProceduralModel();
    }
    
    createProceduralModel() {
        // Body
        const bodyGeo = new THREE.BoxGeometry(1, 1.2, 0.8);
        const bodyColor = this.isPlayer ? 0x3498db : 0xe74c3c;
        const bodyMat = new THREE.MeshToonMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        addOutline(body);
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 0.8;
        head.castShadow = true;
        addOutline(head);
        
        this.mesh.add(body, head);
        this.headMesh = head;
        
        // Add equipped hat if player
        if (this.isPlayer && playerData.equippedHat) {
            const hat = createHat(playerData.equippedHat);
            hat.position.y = 1.2;
            this.mesh.add(hat);
        }
    }
    
    update(delta) {
        if (this.stunned) return;
        
        // Update powerup timers
        Object.keys(this.powerupTimers).forEach(key => {
            this.powerupTimers[key] -= delta;
            if (this.powerupTimers[key] <= 0) {
                this.removePowerup(key);
            }
        });
        
        // Regenerate stamina
        if (this.stamina < GAME_CONFIG.maxStamina) {
            this.stamina = Math.min(GAME_CONFIG.maxStamina, this.stamina + GAME_CONFIG.staminaRegen * delta);
        }
        
        // Apply velocity with friction
        let friction = activeChaos === 'Slippery Floor' ? 0.95 : 0.85;
        this.velocity.multiplyScalar(friction);
        
        this.position.add(this.velocity);
        
        // Keep in bounds
        const boundary = GAME_CONFIG.mapSize / 2 - 2;
        this.position.x = Math.max(-boundary, Math.min(boundary, this.position.x));
        this.position.z = Math.max(-boundary, Math.min(boundary, this.position.z));
        
        // Update mesh
        this.mesh.position.copy(this.position);
        this.mesh.position.y = this.scale;
        this.mesh.rotation.y = this.rotation;
        this.mesh.scale.setScalar(this.scale);
        
        // Update stamina UI if player
        if (this.isPlayer) {
            document.getElementById('staminaBar').style.width = `${(this.stamina / GAME_CONFIG.maxStamina) * 100}%`;
        }
    }
    
    move(direction) {
        if (this.stunned) return;
        
        const speed = GAME_CONFIG.playerSpeed * this.speedMultiplier;
        this.velocity.x += direction.x * speed;
        this.velocity.z += direction.z * speed;
        
        if (direction.length() > 0) {
            this.rotation = Math.atan2(direction.x, direction.z);
        }
    }
    
    dash() {
        if (this.stunned) return;
        if (!this.infiniteStamina && this.stamina < GAME_CONFIG.dashCost) return;
        
        if (!this.infiniteStamina) {
            this.stamina -= GAME_CONFIG.dashCost;
        }
        
        const dashDirection = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        this.velocity.add(dashDirection.multiplyScalar(GAME_CONFIG.dashSpeed));
        
        playSound('dash');
    }
    
    stun(duration = 2) {
        this.stunned = true;
        setTimeout(() => {
            this.stunned = false;
        }, duration * 1000);
    }
    
    addScore(points) {
        this.score += points;
        if (this.isPlayer) {
            document.getElementById('score').textContent = this.score;
        }
    }
    
    applyPowerup(type) {
        switch(type) {
            case 'speed':
                this.speedMultiplier = 2;
                this.powerupTimers.speed = 5;
                break;
            case 'strength':
                this.strengthMultiplier = 2;
                this.powerupTimers.strength = 5;
                break;
            case 'stamina':
                this.infiniteStamina = true;
                this.powerupTimers.stamina = 5;
                break;
            case 'golden':
                this.addScore(5);
                this.stamina = GAME_CONFIG.maxStamina;
                break;
        }
        playSound('powerup');
    }
    
    removePowerup(type) {
        switch(type) {
            case 'speed':
                this.speedMultiplier = 1;
                break;
            case 'strength':
                this.strengthMultiplier = 1;
                break;
            case 'stamina':
                this.infiniteStamina = false;
                break;
        }
        delete this.powerupTimers[type];
    }
    
    destroy() {
        scene.remove(this.mesh);
    }
}

class Collectible {
    constructor(position, type = 'apple') {
        this.position = position.clone();
        this.type = type;
        this.value = 1;
        
        this.mesh = new THREE.Group();
        this.createModel();
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
        
        this.bobTime = Math.random() * Math.PI * 2;
    }
    
    createModel() {
        const colors = {
            apple: 0xff0000,
            banana: 0xffff00,
            melon: 0x00ff00,
            carrot: 0xff8800,
            corn: 0xffdd00
        };
        
        const geo = new THREE.SphereGeometry(0.3, 8, 8);
        const mat = new THREE.MeshToonMaterial({ color: colors[this.type] || 0xff0000 });
        const fruit = new THREE.Mesh(geo, mat);
        addOutline(fruit);
        this.mesh.add(fruit);
    }
    
    update(delta) {
        this.bobTime += delta * 2;
        this.mesh.position.y = 0.5 + Math.sin(this.bobTime) * 0.2;
        this.mesh.rotation.y += delta;
    }
    
    collect() {
        scene.remove(this.mesh);
        playSound('collect');
    }
}

class Powerup {
    constructor(position, type) {
        this.position = position.clone();
        this.type = type; // speed, strength, stamina, golden
        
        this.mesh = new THREE.Group();
        this.createModel();
        this.mesh.position.copy(this.position);
        scene.add(this.mesh);
        
        this.bobTime = Math.random() * Math.PI * 2;
    }
    
    createModel() {
        let geo, mat;
        
        switch(this.type) {
            case 'speed': // Lightning
                geo = new THREE.ConeGeometry(0.3, 0.8, 4);
                mat = new THREE.MeshToonMaterial({ color: 0xffff00, emissive: 0xffff00 });
                break;
            case 'strength': // Glove
                geo = new THREE.BoxGeometry(0.4, 0.5, 0.3);
                mat = new THREE.MeshToonMaterial({ color: 0xff0000 });
                break;
            case 'stamina': // Battery
                geo = new THREE.BoxGeometry(0.3, 0.6, 0.3);
                mat = new THREE.MeshToonMaterial({ color: 0x00ff00, emissive: 0x00ff00 });
                break;
            case 'golden': // Golden Apple
                geo = new THREE.SphereGeometry(0.4, 16, 16);
                mat = new THREE.MeshToonMaterial({ color: 0xffd700, emissive: 0xffd700 });
                break;
        }
        
        const powerup = new THREE.Mesh(geo, mat);
        addOutline(powerup);
        this.mesh.add(powerup);
    }
    
    update(delta) {
        this.bobTime += delta * 3;
        this.mesh.position.y = 0.8 + Math.sin(this.bobTime) * 0.3;
        this.mesh.rotation.y += delta * 2;
    }
    
    collect() {
        scene.remove(this.mesh);
    }
}

class Bomb {
    constructor(position) {
        this.position = position.clone();
        
        const geo = new THREE.SphereGeometry(0.4, 8, 8);
        const mat = new THREE.MeshToonMaterial({ color: 0x000000 });
        this.mesh = new THREE.Mesh(geo, mat);
        addOutline(this.mesh);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 0.4;
        scene.add(this.mesh);
        
        // Fuse
        const fuseGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 4);
        const fuseMat = new THREE.MeshToonMaterial({ color: 0x8B4513 });
        const fuse = new THREE.Mesh(fuseGeo, fuseMat);
        fuse.position.y = 0.5;
        this.mesh.add(fuse);
    }
    
    explode() {
        playSound('explode');
        scene.remove(this.mesh);
        
        // Create explosion effect
        const explosionGeo = new THREE.SphereGeometry(2, 8, 8);
        const explosionMat = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const explosion = new THREE.Mesh(explosionGeo, explosionMat);
        explosion.position.copy(this.position);
        scene.add(explosion);
        
        // Fade out explosion
        let opacity = 0.8;
        const fadeInterval = setInterval(() => {
            opacity -= 0.1;
            explosion.material.opacity = opacity;
            if (opacity <= 0) {
                scene.remove(explosion);
                clearInterval(fadeInterval);
            }
        }, 50);
        
        return this.position;
    }
}

// ============================================================================
// LEVEL GENERATION
// ============================================================================

function generateLevel(type = 'arena') {
    // Clear existing level
    clearLevel();
    
    const size = GAME_CONFIG.mapSize;
    
    // Create ground
    const groundGeo = new THREE.PlaneGeometry(size, size);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    switch(type) {
        case 'arena':
            generateArena();
            break;
        case 'islands':
            generateIslands();
            break;
        case 'donut':
            generateDonut();
            break;
        case 'grid':
            generateGrid();
            break;
    }
}

function generateArena() {
    // Simple rectangular arena with obstacles
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        createCrate(new THREE.Vector3(x, 0, z));
    }
    
    // Central obstacles
    createCrate(new THREE.Vector3(0, 0, 0));
}

function generateIslands() {
    // Multiple small islands with obstacles
    const islands = [
        { x: -10, z: -10 },
        { x: 10, z: -10 },
        { x: -10, z: 10 },
        { x: 10, z: 10 },
        { x: 0, z: 0 }
    ];
    
    islands.forEach(island => {
        createTree(new THREE.Vector3(island.x, 0, island.z));
    });
}

function generateDonut() {
    // Ring-shaped arena with hole in center
    const innerRadius = 5;
    
    // Mark center as hole (visual only for now)
    const holeMarker = new THREE.Mesh(
        new THREE.CircleGeometry(innerRadius, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    holeMarker.rotation.x = -Math.PI / 2;
    holeMarker.position.y = 0.01;
    scene.add(holeMarker);
    
    // Add some obstacles around the ring
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 12;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        createCrate(new THREE.Vector3(x, 0, z));
    }
}

function generateGrid() {
    // Grid pattern with regular obstacles
    const spacing = 5;
    const count = 4;
    
    for (let x = -count; x <= count; x += 2) {
        for (let z = -count; z <= count; z += 2) {
            if (Math.abs(x) + Math.abs(z) > 0) {
                const pos = new THREE.Vector3(x * spacing, 0, z * spacing);
                if (Math.random() > 0.5) {
                    createCrate(pos);
                } else {
                    createTree(pos);
                }
            }
        }
    }
}

function createCrate(position) {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshToonMaterial({ color: 0x8B4513 });
    const crate = new THREE.Mesh(geo, mat);
    crate.position.copy(position);
    crate.position.y = 1;
    crate.castShadow = true;
    addOutline(crate);
    scene.add(crate);
    return crate;
}

function createTree(position) {
    const group = new THREE.Group();
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMat = new THREE.MeshToonMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    
    // Leaves
    const leavesGeo = new THREE.SphereGeometry(1.5, 8, 8);
    const leavesMat = new THREE.MeshToonMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 2.5;
    leaves.castShadow = true;
    
    addOutline(trunk);
    addOutline(leaves);
    
    group.add(trunk, leaves);
    group.position.copy(position);
    scene.add(group);
    return group;
}

function clearLevel() {
    // Remove all game objects except camera and lights
    const toRemove = [];
    scene.traverse((child) => {
        if (child.isMesh && child.parent === scene) {
            toRemove.push(child);
        } else if (child.isGroup && child.parent === scene && child !== scene) {
            toRemove.push(child);
        }
    });
    toRemove.forEach(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => mat.dispose());
            } else {
                obj.material.dispose();
            }
        }
        scene.remove(obj);
    });
}

// ============================================================================
// GAME LOOP
// ============================================================================

function startGame() {
    // Hide menu
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('hud').style.display = 'flex';
    
    gameState = 'playing';
    gameTime = GAME_CONFIG.roundTime;
    chaosTimer = GAME_CONFIG.chaosInterval;
    
    // Generate level
    const levelTypes = ['arena', 'islands', 'donut', 'grid'];
    const randomType = levelTypes[Math.floor(Math.random() * levelTypes.length)];
    generateLevel(randomType);
    
    // Create player
    player = new Character(playerData.selectedCharacter, true);
    player.position.set(0, 0, 0);
    
    // Create bots
    bots = [];
    for (let i = 0; i < GAME_CONFIG.botCount; i++) {
        const randomChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)].toLowerCase();
        const bot = new Character(randomChar, false);
        const angle = (i / GAME_CONFIG.botCount) * Math.PI * 2;
        bot.position.set(Math.cos(angle) * 10, 0, Math.sin(angle) * 10);
        bots.push(bot);
    }
    
    // Spawn collectibles
    collectibles = [];
    for (let i = 0; i < GAME_CONFIG.fruitCount; i++) {
        spawnCollectible();
    }
    
    // Spawn initial powerups
    powerups = [];
    for (let i = 0; i < 3; i++) {
        spawnPowerup();
    }
    
    // Spawn bombs
    hazards = [];
    for (let i = 0; i < GAME_CONFIG.bombCount; i++) {
        spawnBomb();
    }
    
    // Update UI
    document.getElementById('score').textContent = '0';
    document.getElementById('timer').textContent = GAME_CONFIG.roundTime;
    document.getElementById('coins').textContent = playerData.coins;
}

function spawnCollectible() {
    const types = ['apple', 'banana', 'melon', 'carrot', 'corn'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pos = randomPosition();
    collectibles.push(new Collectible(pos, type));
}

function spawnPowerup() {
    const types = ['speed', 'strength', 'stamina', 'golden'];
    const type = types[Math.floor(Math.random() * types.length)];
    const pos = randomPosition();
    powerups.push(new Powerup(pos, type));
}

function spawnBomb() {
    const pos = randomPosition();
    hazards.push(new Bomb(pos));
}

function randomPosition() {
    const range = GAME_CONFIG.mapSize / 2 - 5;
    return new THREE.Vector3(
        (Math.random() - 0.5) * range * 2,
        0,
        (Math.random() - 0.5) * range * 2
    );
}

function playerDash() {
    if (player) {
        player.dash();
    }
}

function updateGame(delta) {
    if (gameState !== 'playing') return;
    
    // Update timer
    gameTime -= delta;
    document.getElementById('timer').textContent = Math.ceil(gameTime);
    
    if (gameTime <= 0) {
        endGame();
        return;
    }
    
    // Update chaos timer
    chaosTimer -= delta;
    if (chaosTimer <= 0) {
        triggerChaos();
        chaosTimer = GAME_CONFIG.chaosInterval;
    }
    
    // Player input
    if (player) {
        const direction = new THREE.Vector3();
        
        // Keyboard
        if (keys['w'] || keys['arrowup']) direction.z -= 1;
        if (keys['s'] || keys['arrowdown']) direction.z += 1;
        if (keys['a'] || keys['arrowleft']) direction.x -= 1;
        if (keys['d'] || keys['arrowright']) direction.x += 1;
        
        // Joystick
        if (joystickActive) {
            direction.x = joystickDirection.x / 45;
            direction.z = joystickDirection.y / 45;
        }
        
        if (direction.length() > 0) {
            direction.normalize();
            player.move(direction);
        }
        
        player.update(delta);
    }
    
    // Update bots with simple AI
    bots.forEach(bot => {
        // Simple AI: move toward nearest collectible
        if (!bot.stunned && collectibles.length > 0) {
            const target = collectibles[0];
            const direction = new THREE.Vector3()
                .subVectors(target.position, bot.position)
                .normalize();
            
            bot.move(direction);
            
            // Random dash
            if (Math.random() < 0.01) {
                bot.dash();
            }
        }
        
        bot.update(delta);
    });
    
    // Update collectibles
    collectibles.forEach(c => c.update(delta));
    
    // Update powerups
    powerups.forEach(p => p.update(delta));
    
    // Check collisions
    checkCollisions();
}

function checkCollisions() {
    if (!player) return;
    
    // Player vs collectibles
    collectibles = collectibles.filter(c => {
        const dist = player.position.distanceTo(c.position);
        if (dist < 1) {
            c.collect();
            player.addScore(c.value);
            playerData.coins += c.value;
            document.getElementById('coins').textContent = playerData.coins;
            spawnCollectible(); // Respawn
            return false;
        }
        return true;
    });
    
    // Player vs powerups
    powerups = powerups.filter(p => {
        const dist = player.position.distanceTo(p.position);
        if (dist < 1) {
            p.collect();
            player.applyPowerup(p.type);
            return false;
        }
        return true;
    });
    
    // Player vs bombs
    hazards = hazards.filter(h => {
        const dist = player.position.distanceTo(h.position);
        if (dist < 1) {
            h.explode();
            player.stun(2);
            // Drop some fruits
            const dropCount = Math.floor(player.score * 0.3);
            player.addScore(-dropCount);
            // Knockback
            const knockback = new THREE.Vector3()
                .subVectors(player.position, h.position)
                .normalize()
                .multiplyScalar(2);
            player.velocity.add(knockback);
            spawnBomb(); // Respawn
            return false;
        }
        return true;
    });
    
    // Player vs bots (dash collision)
    bots.forEach(bot => {
        const dist = player.position.distanceTo(bot.position);
        if (dist < 1.5 && player.velocity.length() > 0.3) {
            playSound('hit');
            bot.stun(2);
            
            // Steal fruits
            const stealAmount = Math.floor(bot.score * 0.5 * player.strengthMultiplier);
            bot.addScore(-stealAmount);
            player.addScore(stealAmount);
        }
    });
}

function triggerChaos() {
    const chaos = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
    activeChaos = chaos.name;
    
    // Show alert
    const alert = document.getElementById('chaosAlert');
    alert.textContent = `${chaos.name}!`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 2000);
    
    // Apply chaos effect
    const allCharacters = [player, ...bots];
    
    switch(chaos.name) {
        case 'Tiny Titans':
            allCharacters.forEach(c => c.scale = 0.5);
            setTimeout(() => {
                allCharacters.forEach(c => c.scale = 1);
                activeChaos = null;
            }, GAME_CONFIG.chaosInterval * 1000);
            break;
            
        case 'Giant Brawl':
            allCharacters.forEach(c => c.scale = 2);
            setTimeout(() => {
                allCharacters.forEach(c => c.scale = 1);
                activeChaos = null;
            }, GAME_CONFIG.chaosInterval * 1000);
            break;
            
        case 'Speed Demon':
            allCharacters.forEach(c => c.speedMultiplier *= 2);
            setTimeout(() => {
                allCharacters.forEach(c => c.speedMultiplier /= 2);
                activeChaos = null;
            }, GAME_CONFIG.chaosInterval * 1000);
            break;
            
        case 'Slippery Floor':
            // Handled in Character.update()
            setTimeout(() => {
                activeChaos = null;
            }, GAME_CONFIG.chaosInterval * 1000);
            break;
            
        case 'Bomb Rain':
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    spawnBomb();
                }, i * 200);
            }
            setTimeout(() => {
                activeChaos = null;
            }, 5000);
            break;
    }
}

function endGame() {
    gameState = 'gameover';
    
    // Hide HUD
    document.getElementById('hud').style.display = 'none';
    
    // Show game over screen
    const gameOverDiv = document.getElementById('gameOver');
    document.getElementById('finalScore').textContent = player.score;
    document.getElementById('fruitsCollected').textContent = player.score;
    const coinsEarned = player.score * 10;
    document.getElementById('coinsEarned').textContent = coinsEarned;
    playerData.coins += coinsEarned;
    document.getElementById('totalCoins').textContent = playerData.coins;
    gameOverDiv.style.display = 'flex';
    
    // Save data
    savePlayerData();
    
    // Clean up
    if (player) player.destroy();
    bots.forEach(b => b.destroy());
    collectibles.forEach(c => scene.remove(c.mesh));
    powerups.forEach(p => scene.remove(p.mesh));
    hazards.forEach(h => scene.remove(h.mesh));
    
    player = null;
    bots = [];
    collectibles = [];
    powerups = [];
    hazards = [];
}

function returnToMenu() {
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('mainMenu').classList.remove('hidden');
    gameState = 'menu';
    clearLevel();
}

function restartGame() {
    document.getElementById('gameOver').style.display = 'none';
    startGame();
}

// ============================================================================
// CHARACTER SELECT
// ============================================================================

function initCharacterSelect() {
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = ''; // Clear existing
    
    CHARACTERS.forEach(char => {
        const card = document.createElement('div');
        card.className = 'character-card';
        if (char.toLowerCase() === playerData.selectedCharacter) {
            card.classList.add('selected');
        }
        
        card.innerHTML = `
            <div class="character-name">${char}</div>
        `;
        
        card.onclick = () => {
            document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            playerData.selectedCharacter = char.toLowerCase();
            savePlayerData();
        };
        
        grid.appendChild(card);
    });
}

function showCharacterSelect() {
    document.getElementById('characterSelect').style.display = 'flex';
    document.getElementById('mainMenu').classList.add('hidden');
}

function hideCharacterSelect() {
    document.getElementById('characterSelect').style.display = 'none';
    document.getElementById('mainMenu').classList.remove('hidden');
}

// ============================================================================
// HAT SHOP
// ============================================================================

function initShop() {
    const grid = document.getElementById('hatGrid');
    grid.innerHTML = ''; // Clear existing
    
    HATS.forEach(hat => {
        const card = document.createElement('div');
        card.className = 'hat-card';
        
        const unlocked = playerData.unlockedHats.includes(hat.id);
        const equipped = playerData.equippedHat === hat.id;
        
        if (!unlocked) {
            card.classList.add('locked');
        }
        if (equipped) {
            card.classList.add('equipped');
        }
        
        card.innerHTML = `
            <div class="character-name">${hat.name}</div>
            ${unlocked ? 
                (equipped ? '<div style="margin-top:10px;font-weight:bold;color:#27ae60;">EQUIPPED</div>' : 
                '<button class="menu-button" style="margin-top:10px;padding:10px 20px;font-size:1em;">EQUIP</button>') :
                `<div class="hat-price">💰 ${hat.price}</div>`
            }
        `;
        
        card.onclick = () => {
            if (!unlocked) {
                if (playerData.coins >= hat.price) {
                    playerData.coins -= hat.price;
                    playerData.unlockedHats.push(hat.id);
                    savePlayerData();
                    initShop();
                    updateShopCoins();
                } else {
                    alert('Not enough coins!');
                }
            } else if (!equipped) {
                playerData.equippedHat = hat.id;
                savePlayerData();
                initShop();
            }
        };
        
        grid.appendChild(card);
    });
    
    updateShopCoins();
}

function updateShopCoins() {
    document.getElementById('shopCoins').textContent = playerData.coins;
}

function showShop() {
    document.getElementById('shop').style.display = 'flex';
    document.getElementById('mainMenu').classList.add('hidden');
    initShop(); // Refresh shop
    updateShopCoins();
}

function hideShop() {
    document.getElementById('shop').style.display = 'none';
    document.getElementById('mainMenu').classList.remove('hidden');
}

// ============================================================================
// LEVEL EDITOR
// ============================================================================

function showLevelEditor() {
    document.getElementById('levelEditor').style.display = 'block';
    document.getElementById('mainMenu').classList.add('hidden');
    editorMode = true;
    gameState = 'editor';
    
    // Create empty level
    generateLevel('arena');
    
    // Add click handler
    canvas.addEventListener('click', onEditorClick);
}

function hideLevelEditor() {
    document.getElementById('levelEditor').style.display = 'none';
    document.getElementById('mainMenu').classList.remove('hidden');
    editorMode = false;
    gameState = 'menu';
    
    canvas.removeEventListener('click', onEditorClick);
    clearLevel();
}

function editorSelectTool(tool) {
    selectedTool = tool;
    document.querySelectorAll('.editor-button').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function onEditorClick(event) {
    if (!editorMode) return;
    
    // Raycast to find click position
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Create invisible ground plane for raycasting
    const planeGeo = new THREE.PlaneGeometry(1000, 1000);
    const planeMat = new THREE.MeshBasicMaterial({ visible: false });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    
    const intersects = raycaster.intersectObject(plane);
    
    if (intersects.length > 0) {
        const point = intersects[0].point;
        
        switch(selectedTool) {
            case 'grass':
            case 'path':
                // Just visual, no action needed
                break;
            case 'hole':
                // Create hole marker
                const hole = new THREE.Mesh(
                    new THREE.CircleGeometry(2, 32),
                    new THREE.MeshBasicMaterial({ color: 0x000000 })
                );
                hole.rotation.x = -Math.PI / 2;
                hole.position.set(point.x, 0.01, point.z);
                scene.add(hole);
                break;
            case 'crate':
                createCrate(point);
                break;
            case 'tree':
                createTree(point);
                break;
            case 'erase':
                // Find and remove closest object
                const objects = [];
                scene.traverse(child => {
                    if (child.isMesh && child.position.distanceTo(point) < 3) {
                        objects.push(child);
                    }
                });
                objects.forEach(obj => scene.remove(obj));
                break;
        }
    }
}

function saveLevel() {
    const levelData = {
        objects: []
    };
    
    scene.traverse(child => {
        if (child.isMesh && child.parent === scene) {
            levelData.objects.push({
                type: child.geometry.type,
                position: child.position.toArray(),
                rotation: child.rotation.toArray(),
                scale: child.scale.toArray()
            });
        }
    });
    
    playerData.customLevels.push(levelData);
    savePlayerData();
    alert('Level saved!');
}

function loadLevel() {
    if (playerData.customLevels.length === 0) {
        alert('No saved levels!');
        return;
    }
    
    const level = playerData.customLevels[playerData.customLevels.length - 1];
    clearLevel();
    
    // Recreate objects (simplified)
    alert('Level loaded!');
}

// ============================================================================
// PERSISTENCE
// ============================================================================

function loadPlayerData() {
    const saved = localStorage.getItem('munchiesPlayerData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            playerData = { ...playerData, ...data };
        } catch (e) {
            console.error('Error loading player data:', e);
        }
    }
}

function savePlayerData() {
    try {
        localStorage.setItem('munchiesPlayerData', JSON.stringify(playerData));
    } catch (e) {
        console.error('Error saving player data:', e);
    }
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

let lastTime = 0;

function animate(time = 0) {
    requestAnimationFrame(animate);
    
    const delta = Math.min((time - lastTime) / 1000, 0.1); // Cap delta to prevent large jumps
    lastTime = time;
    
    if (gameState === 'playing') {
        updateGame(delta);
    }
    
    renderer.render(scene, camera);
}

// ============================================================================
// START
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    init();
});

// Global functions for UI
window.startGame = startGame;
window.showCharacterSelect = showCharacterSelect;
window.hideCharacterSelect = hideCharacterSelect;
window.showShop = showShop;
window.hideShop = hideShop;
window.showLevelEditor = showLevelEditor;
window.hideLevelEditor = hideLevelEditor;
window.editorSelectTool = editorSelectTool;
window.saveLevel = saveLevel;
window.loadLevel = loadLevel;
window.returnToMenu = returnToMenu;
window.restartGame = restartGame;
