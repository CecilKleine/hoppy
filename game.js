// Game Canvas Setup
let canvas, ctx;

// Initialize canvas when DOM is ready
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found!');
        return false;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2d context!');
        return false;
    }
    canvas.width = 800;
    canvas.height = 600;
    
    // Update frog and tongue positions now that canvas is ready
    frog.x = canvas.width / 2;
    frog.y = canvas.height / 2;
    tongue.x = frog.x;
    tongue.y = frog.y;
    
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
    return true;
}

// Try to initialize immediately (if script is at end of body)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCanvas);
} else {
    initCanvas();
}

// Game State
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let lives = 3;
let gameSpeed = 2;
let scrollSpeed = 2;

// Input State
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    KeyW: false,
    KeyA: false,
    KeyS: false,
    KeyD: false,
    Space: false
};

// Track previous frame key states for jump detection
const prevKeys = {
    ArrowUp: false,
    KeyW: false
};

// Frog Object
const frog = {
    x: 400, // Default, will be updated when canvas is ready
    y: 300, // Default, will be updated when canvas is ready
    width: 50,
    height: 40,
    vx: 0,
    vy: 0,
    speed: 5,
    jumpPower: -22, // Negative for upward velocity (increased for longer jumps to reach next pad)
    isGrounded: false,
    currentLilyPad: null,
    color: '#7CB342',
    angle: 0,
    isDead: false,
    invulnerable: false,
    invulnerableTimer: 0,
    // Animation states
    animationState: 'idle', // 'idle', 'jumping', 'tongueAttack', 'falling'
    animationFrame: 0,
    animationTimer: 0,
    facingDirection: 1 // 1 = right, -1 = left
};

// Tongue Object
const tongue = {
    isExtended: false,
    x: 400, // Default, will be updated
    y: 300, // Default, will be updated
    length: 0,
    maxLength: 200,
    extensionSpeed: 12,
    retractionSpeed: 18,
    targetFly: null,
    caughtFly: null,
    state: 'none', // 'none', 'extending', 'retracting'
    baseX: 0,
    baseY: 0,
    angle: 0
};

// Lily Pads Array
let lilyPads = [];

// Flies Array
let flies = [];

// Particle Effects
let particles = [];

// Frog Sprites
const frogSprites = {
    idle: null,
    jumping: null,
    attack: null,
    falling: null,
    walking: null
};

// Generate pixel art sprites
function generateFrogSprites() {
    const spriteSize = 64; // Size of each sprite
    
    // Create offscreen canvas for each sprite
    const createSprite = (drawFunction) => {
        const spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = spriteSize;
        spriteCanvas.height = spriteSize;
        const spriteCtx = spriteCanvas.getContext('2d');
        
        // Enable pixel-perfect rendering
        spriteCtx.imageSmoothingEnabled = false;
        
        drawFunction(spriteCtx, spriteSize);
        
        return spriteCanvas;
    };
    
    // DEFAULT/IDLE sprite - resting pose
    frogSprites.idle = createSprite((ctx, size) => {
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Body (plump, light green)
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(centerX - 12, centerY - 4, 24, 16);
        
        // Darker green speckles
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(centerX - 8, centerY - 2, 3, 3);
        ctx.fillRect(centerX + 2, centerY + 2, 3, 3);
        ctx.fillRect(centerX - 2, centerY + 4, 3, 3);
        
        // Front legs (tucked under chin)
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(centerX + 4, centerY - 2, 8, 4);
        
        // Hind legs (folded beneath)
        ctx.fillRect(centerX - 12, centerY + 8, 6, 4);
        ctx.fillRect(centerX + 6, centerY + 8, 6, 4);
        
        // Large round eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX + 8, centerY - 10, 6, 6);
        ctx.fillRect(centerX + 14, centerY - 10, 6, 6);
        
        // White pupils
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(centerX + 9, centerY - 9, 2, 2);
        ctx.fillRect(centerX + 15, centerY - 9, 2, 2);
        
        // Mouth (simple black line)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX + 6, centerY + 2);
        ctx.lineTo(centerX + 12, centerY + 4);
        ctx.stroke();
    });
    
    // JUMPING sprite - elongated, angled upwards
    frogSprites.jumping = createSprite((ctx, size) => {
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Rotate context for angled jump
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(0.3); // Angle upwards
        
        // Body (elongated)
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(-14, -8, 28, 12);
        
        // Darker green speckles
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(-8, -4, 3, 3);
        ctx.fillRect(2, 0, 3, 3);
        
        // Front legs (extended forward)
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(8, -4, 10, 4);
        
        // Hind legs (stretched backward)
        ctx.fillRect(-18, 2, 8, 4);
        ctx.fillRect(-10, 4, 8, 4);
        
        // Motion blur lines
        ctx.fillStyle = '#90EE90';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-20 - i * 2, 4 + i, 2, 1);
        }
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, -8, 6, 6);
        ctx.fillRect(16, -8, 6, 6);
        
        // White pupils
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(11, -7, 2, 2);
        ctx.fillRect(17, -7, 2, 2);
        
        // Mouth
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(6, -2);
        ctx.lineTo(12, 0);
        ctx.stroke();
        
        ctx.restore();
    });
    
    // ATTACK sprite - similar to jumping but with tongue extended
    frogSprites.attack = createSprite((ctx, size) => {
        const centerX = size / 2;
        const centerY = size / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(0.3);
        
        // Body (elongated)
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(-14, -8, 28, 12);
        
        // Darker green speckles
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(-8, -4, 3, 3);
        ctx.fillRect(2, 0, 3, 3);
        
        // Front legs (extended forward)
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(8, -4, 10, 4);
        
        // Hind legs (stretched backward)
        ctx.fillRect(-18, 2, 8, 4);
        ctx.fillRect(-10, 4, 8, 4);
        
        // Motion blur lines
        ctx.fillStyle = '#90EE90';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-20 - i * 2, 4 + i, 2, 1);
        }
        
        // Eyes (slightly narrowed/focused)
        ctx.fillStyle = '#000000';
        ctx.fillRect(10, -7, 5, 5);
        ctx.fillRect(16, -7, 5, 5);
        
        // White pupils
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(11, -6, 1, 1);
        ctx.fillRect(17, -6, 1, 1);
        
        // Wide open mouth
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(6, 0, 8, 6);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 0, 8, 6);
        
        // Extended pink sticky tongue (curling at end)
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(14, 3);
        ctx.quadraticCurveTo(20, 0, 28, -2);
        ctx.stroke();
        
        // Tongue tip
        ctx.fillStyle = '#FF1493';
        ctx.fillRect(26, -4, 4, 4);
        
        ctx.restore();
    });
    
    // FALLING sprite - similar to jumping but angled down
    frogSprites.falling = createSprite((ctx, size) => {
        const centerX = size / 2;
        const centerY = size / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(-0.2); // Angle downwards
        
        // Body
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(-14, -6, 28, 14);
        
        // Darker green speckles
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(-8, -2, 3, 3);
        ctx.fillRect(2, 2, 3, 3);
        
        // Legs spread wide
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(-18, 4, 8, 4);
        ctx.fillRect(10, 4, 8, 4);
        
        // Eyes (wide, surprised)
        ctx.fillStyle = '#000000';
        ctx.fillRect(8, -10, 7, 7);
        ctx.fillRect(15, -10, 7, 7);
        
        // White pupils
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(9, -9, 2, 2);
        ctx.fillRect(16, -9, 2, 2);
        
        // Mouth (open, surprised)
        ctx.fillStyle = '#FFB6C1';
        ctx.fillRect(6, 2, 10, 6);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(6, 2, 10, 6);
        
        ctx.restore();
    });
    
    // WALKING sprite - animated version of idle
    frogSprites.walking = createSprite((ctx, size) => {
        const centerX = size / 2;
        const centerY = size / 2;
        
        // Body
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(centerX - 12, centerY - 4, 24, 16);
        
        // Darker green speckles
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(centerX - 8, centerY - 2, 3, 3);
        ctx.fillRect(centerX + 2, centerY + 2, 3, 3);
        
        // Front legs (slightly extended)
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(centerX + 4, centerY - 1, 9, 4);
        
        // Hind legs (one forward, one back)
        ctx.fillRect(centerX - 12, centerY + 8, 6, 4);
        ctx.fillRect(centerX + 6, centerY + 9, 6, 4);
        
        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX + 8, centerY - 10, 6, 6);
        ctx.fillRect(centerX + 14, centerY - 10, 6, 6);
        
        // White pupils
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(centerX + 9, centerY - 9, 2, 2);
        ctx.fillRect(centerX + 15, centerY - 9, 2, 2);
        
        // Mouth
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX + 6, centerY + 2);
        ctx.lineTo(centerX + 12, centerY + 4);
        ctx.stroke();
    });
    
    console.log('Frog sprites generated');
}

// Initialize Lily Pads
function initLilyPads() {
    lilyPads = [];
    // Create initial lily pad for frog to start on (centered on screen)
    lilyPads.push({
        x: canvas.width / 2 - 60,
        y: canvas.height - 100,
        width: 120,
        height: 20,
        vx: -scrollSpeed
    });
    
    // Create a playable path of lily pads
    for (let i = 1; i < 15; i++) {
        const prevPad = lilyPads[i - 1];
        const spacing = 80 + Math.random() * 80; // Reduced spacing to ensure reachability
        lilyPads.push({
            x: prevPad.x + prevPad.width + spacing,
            y: Math.max(100, Math.min(canvas.height - 150, prevPad.y + (Math.random() - 0.5) * 150)),
            width: 80 + Math.random() * 40,
            height: 20,
            vx: -scrollSpeed + Math.random() * 0.5
        });
    }
    
    // Debug: Log lily pad count
    console.log('Lily pads initialized:', lilyPads.length);
}

// Create New Lily Pad
function createLilyPad() {
    const lastPad = lilyPads[lilyPads.length - 1];
    const spacing = 80 + Math.random() * 80; // Reduced spacing to ensure reachability
    lilyPads.push({
        x: lastPad ? lastPad.x + lastPad.width + spacing : canvas.width + 50,
        y: lastPad ? Math.max(100, Math.min(canvas.height - 150, lastPad.y + (Math.random() - 0.5) * 150)) : canvas.height - 150,
        width: 80 + Math.random() * 40,
        height: 20,
        vx: -scrollSpeed - Math.random() * 0.5
    });
}

// Spawn Fly
function spawnFly() {
    // Spawn more flies as game progresses
    const spawnRate = Math.min(0.03 + (scrollSpeed - 2) * 0.005, 0.08);
    const maxFlies = Math.min(3 + Math.floor((scrollSpeed - 2) * 0.5), 8);
    
    // Count only non-collected flies
    const activeFlies = flies.filter(fly => !fly.collected).length;
    
    if (Math.random() < spawnRate && activeFlies < maxFlies) {
        flies.push({
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 200) + 50,
            radius: 8,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: '#FFD700',
            buzzOffset: Math.random() * Math.PI * 2,
            collected: false
        });
    }
}

// Particle System
function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            radius: 2 + Math.random() * 3,
            color: color,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
}

// Update Particles
function updateParticles() {
    particles = particles.filter(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= particle.decay;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        return particle.life > 0;
    });
}

// Check Collision
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Check Point in Circle
function pointInCircle(px, py, cx, cy, radius) {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy < radius * radius;
}

// Update Frog
function updateFrog() {
    if (frog.isDead) return;
    
    // Handle invulnerability timer
    if (frog.invulnerable) {
        frog.invulnerableTimer--;
        if (frog.invulnerableTimer <= 0) {
            frog.invulnerable = false;
        }
    }
    
    // Check if on lily pad FIRST (before movement)
    frog.isGrounded = false;
    frog.currentLilyPad = null;
    
    for (let pad of lilyPads) {
        if (checkCollision(frog, pad)) {
            frog.isGrounded = true;
            frog.currentLilyPad = pad;
            frog.y = pad.y - frog.height + 5;
            
            // Move with lily pad
            frog.x += pad.vx;
            break;
        }
    }
    
    // Handle Movement
    let moveX = 0;
    
    if (keys.ArrowLeft || keys.KeyA) moveX = -1;
    if (keys.ArrowRight || keys.KeyD) moveX = 1;
    
    // Update horizontal movement
    frog.vx = moveX * frog.speed;
    
    // Handle Jumping - only when grounded, and only on key press (not hold)
    if (frog.isGrounded) {
        // Check if jump key was just pressed this frame (not held from previous frame)
        const jumpPressed = (keys.ArrowUp || keys.KeyW) && !(prevKeys.ArrowUp || prevKeys.KeyW);
        
        if (jumpPressed) {
            // Apply jump impulse
            frog.vy = frog.jumpPower;
        }
        
        // Allow downward movement when grounded (for dropping down)
        if (keys.ArrowDown || keys.KeyS) {
            frog.vy = frog.speed; // Small downward push
        }
    }
    
    // Update previous key states for next frame
    prevKeys.ArrowUp = keys.ArrowUp;
    prevKeys.KeyW = keys.KeyW;
    
    // Apply gravity if not grounded
    if (!frog.isGrounded) {
        frog.vy += 1.5; // gravity - realistic fall speed
        // Terminal velocity - max fall speed
        frog.vy = Math.min(frog.vy, 15);
    }
    
    // Update position
    frog.x += frog.vx;
    frog.y += frog.vy;
    
    // Keep frog in bounds (only horizontally)
    frog.x = Math.max(0, Math.min(canvas.width - frog.width, frog.x));
    
    // Check if frog fell in water - INSTANT DEATH
    if (frog.y > canvas.height - 50 && !frog.isGrounded) {
        if (!frog.invulnerable) {
            frogDie();
        }
    }
    
    // Check if frog fell off bottom of screen
    if (frog.y > canvas.height + 50) {
        if (!frog.invulnerable) {
            frogDie();
        }
    }
    
    // Update facing direction based on movement
    if (moveX > 0) {
        frog.facingDirection = 1; // Right
    } else if (moveX < 0) {
        frog.facingDirection = -1; // Left
    }
    
    // Update animation state
    frog.animationTimer++;
    
    // Determine animation state
    if (tongue.state === 'extending' || tongue.state === 'retracting') {
        if (frog.animationState !== 'tongueAttack') {
            frog.animationState = 'tongueAttack';
            frog.animationFrame = 0;
            frog.animationTimer = 0;
        }
    } else if (!frog.isGrounded) {
        if (frog.vy < 0) {
            // Moving up - jumping
            if (frog.animationState !== 'jumping') {
                frog.animationState = 'jumping';
                frog.animationFrame = 0;
                frog.animationTimer = 0;
            }
        } else {
            // Moving down - falling
            if (frog.animationState !== 'falling') {
                frog.animationState = 'falling';
                frog.animationFrame = 0;
                frog.animationTimer = 0;
            }
        }
    } else {
        // Grounded - idle or walking
        if (frog.animationState !== 'idle' && frog.animationState !== 'walking') {
            frog.animationState = 'idle';
            frog.animationFrame = 0;
            frog.animationTimer = 0;
        }
        
        // Walking if moving
        if (Math.abs(moveX) > 0) {
            if (frog.animationState !== 'walking') {
                frog.animationState = 'walking';
                frog.animationFrame = 0;
                frog.animationTimer = 0;
            }
        } else {
            frog.animationState = 'idle';
        }
    }
    
    // Update animation frame
    if (frog.animationState === 'walking') {
        frog.animationFrame = Math.floor(frog.animationTimer / 8) % 4; // 4 frame walk cycle
    } else if (frog.animationState === 'tongueAttack') {
        frog.animationFrame = Math.min(Math.floor(frog.animationTimer / 3), 3); // 4 frame attack
    } else if (frog.animationState === 'jumping') {
        frog.animationFrame = Math.min(Math.floor(frog.animationTimer / 2), 2); // 3 frame jump
    }
    
    // Update tongue origin (always track frog)
    tongue.baseX = frog.x + frog.width / 2;
    tongue.baseY = frog.y + frog.height / 2;
}

// Update Tongue
function updateTongue() {
    // Fire tongue on space press (only if not already extended)
    if (keys.Space && tongue.state === 'none') {
        tongue.state = 'extending';
        tongue.length = 0;
        tongue.x = tongue.baseX;
        tongue.y = tongue.baseY;
        tongue.targetFly = null;
        tongue.caughtFly = null;
        
        // Find nearest fly
        let nearestFly = null;
        let minDist = Infinity;
        
        for (let fly of flies) {
            if (!fly.collected) {
                const dx = fly.x - tongue.x;
                const dy = fly.y - tongue.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < tongue.maxLength && dist < minDist) {
                    minDist = dist;
                    nearestFly = fly;
                }
            }
        }
        
        if (nearestFly) {
            tongue.targetFly = nearestFly;
            const dx = nearestFly.x - tongue.x;
            const dy = nearestFly.y - tongue.y;
            tongue.angle = Math.atan2(dy, dx);
        } else {
            // Default direction (frog's facing direction or up)
            tongue.angle = frog.angle || -Math.PI / 2;
        }
    }
    
    // Always update tongue position to follow frog (anchored to frog)
    tongue.x = tongue.baseX;
    tongue.y = tongue.baseY;
    
    // Extending phase
    if (tongue.state === 'extending') {
        tongue.length += tongue.extensionSpeed;
        
        // Check if we hit a fly
        const endX = tongue.x + Math.cos(tongue.angle) * tongue.length;
        const endY = tongue.y + Math.sin(tongue.angle) * tongue.length;
        
        if (tongue.targetFly && !tongue.targetFly.collected) {
            const dx = tongue.targetFly.x - tongue.x;
            const dy = tongue.targetFly.y - tongue.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Check if we reached the fly
            if (tongue.length >= dist - 5) {
                tongue.caughtFly = tongue.targetFly;
                tongue.targetFly.collected = true;
                tongue.state = 'retracting';
            }
        } else {
            // Check for any fly collision
            for (let fly of flies) {
                if (!fly.collected && pointInCircle(endX, endY, fly.x, fly.y, fly.radius + 8)) {
                    tongue.caughtFly = fly;
                    fly.collected = true;
                    tongue.state = 'retracting';
                    break;
                }
            }
        }
        
        // Start retracting if max length reached or caught something
        if (tongue.length >= tongue.maxLength || tongue.caughtFly) {
            tongue.state = 'retracting';
        }
    }
    
    // Retracting phase
    if (tongue.state === 'retracting') {
        tongue.length -= tongue.retractionSpeed;
        
        if (tongue.caughtFly) {
            // Pull fly back to frog
            const dx = tongue.baseX - tongue.caughtFly.x;
            const dy = tongue.baseY - tongue.caughtFly.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 25) {
                // Fly reached frog
                score += 10;
                updateScoreDisplay(); // Update display immediately
                createParticles(tongue.baseX, tongue.baseY, tongue.caughtFly.color, 15);
                flies = flies.filter(f => f !== tongue.caughtFly);
                tongue.caughtFly = null;
            } else {
                // Pull fly toward frog
                const pullSpeed = 12;
                tongue.caughtFly.vx = (dx / dist) * pullSpeed;
                tongue.caughtFly.vy = (dy / dist) * pullSpeed;
                tongue.caughtFly.x += tongue.caughtFly.vx;
                tongue.caughtFly.y += tongue.caughtFly.vy;
            }
        }
        
        // Reset tongue when fully retracted
        if (tongue.length <= 0) {
            // Remove any caught fly that didn't reach the frog
            if (tongue.caughtFly) {
                flies = flies.filter(f => f !== tongue.caughtFly);
            }
            tongue.state = 'none';
            tongue.length = 0;
            tongue.caughtFly = null;
            tongue.targetFly = null;
            tongue.isExtended = false;
        }
    }
    
    // Update isExtended flag for drawing
    tongue.isExtended = (tongue.state !== 'none');
}

// Update Lily Pads
function updateLilyPads() {
    for (let pad of lilyPads) {
        pad.x += pad.vx;
        
        // Reset pad position when off screen left
        if (pad.x + pad.width < -50) {
            // Find the rightmost pad
            let rightmostPad = lilyPads[0];
            for (let p of lilyPads) {
                if (p.x > rightmostPad.x) {
                    rightmostPad = p;
                }
            }
            
            const spacing = 80 + Math.random() * 80; // Reduced spacing to ensure reachability
            pad.x = rightmostPad.x + rightmostPad.width + spacing;
            pad.y = Math.max(100, Math.min(canvas.height - 150, rightmostPad.y + (Math.random() - 0.5) * 150));
            pad.vx = -scrollSpeed - Math.random() * 0.5;
        }
    }
    
    // Always maintain enough lily pads
    const visiblePads = lilyPads.filter(p => p.x > -100 && p.x < canvas.width + 200);
    if (visiblePads.length < 8) {
        createLilyPad();
    }
    
    // Gradually increase scroll speed
    scrollSpeed += 0.0005;
    scrollSpeed = Math.min(scrollSpeed, 8); // Cap max speed
    
    // Update all pad velocities
    for (let pad of lilyPads) {
        pad.vx = -scrollSpeed - Math.random() * 0.3;
    }
}

// Update Flies
function updateFlies() {
    spawnFly();
    
    for (let fly of flies) {
        // Update buzz animation
        fly.buzzOffset += 0.1;
        
        if (!fly.collected) {
            // Natural movement
            fly.x += fly.vx;
            fly.y += fly.vy;
            
            // Bounce off walls
            if (fly.x < fly.radius || fly.x > canvas.width - fly.radius) {
                fly.vx *= -1;
            }
            if (fly.y < fly.radius || fly.y > canvas.height - fly.radius) {
                fly.vy *= -1;
            }
            
            // Add slight random movement
            fly.vx += (Math.random() - 0.5) * 0.2;
            fly.vy += (Math.random() - 0.5) * 0.2;
            
            // Limit speed
            const speed = Math.sqrt(fly.vx * fly.vx + fly.vy * fly.vy);
            if (speed > 3) {
                fly.vx = (fly.vx / speed) * 3;
                fly.vy = (fly.vy / speed) * 3;
            }
        }
    }
    
    // Remove flies that are collected (either off screen or not attached to tongue)
    flies = flies.filter(fly => {
        if (fly.collected) {
            // Remove if off screen or not currently being pulled by tongue
            if ((fly.x < -50 || fly.x > canvas.width + 50) || tongue.caughtFly !== fly) {
                return false;
            }
        }
        return true;
    });
}

// Frog Death
function frogDie() {
    if (frog.isDead || frog.invulnerable) return;
    
    frog.isDead = true;
    lives--;
    updateLivesDisplay();
    
    createParticles(frog.x + frog.width / 2, frog.y + frog.height / 2, '#FF6B6B', 30);
    
    if (lives <= 0) {
        // Game over after short delay
        setTimeout(() => {
            gameOver();
        }, 1000);
    } else {
        // Respawn frog after short delay
        setTimeout(() => {
            respawnFrog();
        }, 800);
    }
}

// Respawn Frog
function respawnFrog() {
    frog.isDead = false;
    frog.invulnerable = true;
    frog.invulnerableTimer = 120; // 2 seconds at 60fps
    
    // Find a safe lily pad to spawn on
    let safePad = null;
    for (let pad of lilyPads) {
        if (pad.x > -100 && pad.x < canvas.width + 100 && pad.y < canvas.height - 100) {
            safePad = pad;
            break;
        }
    }
    
    if (safePad) {
        frog.x = safePad.x + safePad.width / 2 - frog.width / 2;
        frog.y = safePad.y - frog.height + 5;
    } else {
        // Fallback to center
        frog.x = canvas.width / 2;
        frog.y = canvas.height / 2;
    }
    
    frog.vx = 0;
    frog.vy = 0;
    
    // Reset tongue
    tongue.state = 'none';
    tongue.isExtended = false;
    tongue.caughtFly = null;
    tongue.length = 0;
    
    createParticles(frog.x + frog.width / 2, frog.y + frog.height / 2, '#7CB342', 20);
}

// Update Score Display
function updateScoreDisplay() {
    document.getElementById('score').textContent = score;
}

// Update Lives Display
function updateLivesDisplay() {
    document.getElementById('lives').textContent = lives;
}

// Game Over
function gameOver() {
    gameState = 'gameOver';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverScreen').style.display = 'block';
}

// Reset Game
function resetGame() {
    console.log('resetGame called');
    gameState = 'playing';
    score = 0;
    lives = 3;
    gameSpeed = 2;
    scrollSpeed = 2;
    
    frog.x = canvas.width / 2;
    frog.y = canvas.height / 2;
    frog.vx = 0;
    frog.vy = 0;
    frog.isDead = false;
    frog.invulnerable = false;
    frog.invulnerableTimer = 0;
    frog.animationState = 'idle';
    frog.animationFrame = 0;
    frog.animationTimer = 0;
    frog.facingDirection = 1;
    
    tongue.isExtended = false;
    tongue.state = 'none';
    tongue.caughtFly = null;
    tongue.length = 0;
    
    lilyPads = [];
    flies = [];
    particles = [];
    
    initLilyPads();
    
    // Place frog on first lily pad
    if (lilyPads.length > 0) {
        const startPad = lilyPads[0];
        frog.x = startPad.x + startPad.width / 2 - frog.width / 2;
        frog.y = startPad.y - frog.height + 5;
        // Ensure frog is grounded on the pad
        frog.isGrounded = true;
        frog.currentLilyPad = startPad;
        frog.vy = 0; // Reset vertical velocity
        console.log('Frog positioned at:', frog.x, frog.y, 'on pad at:', startPad.x, startPad.y);
    } else {
        console.error('No lily pads created!');
    }
    
    updateScoreDisplay();
    updateLivesDisplay();
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    
    console.log('Game state set to:', gameState);
}

// Draw Frog - Using Pixel Art Sprites
function drawFrog() {
    if (!ctx) {
        console.error('Canvas context is null!');
        return;
    }
    
    // Flash effect when invulnerable
    if (frog.invulnerable && Math.floor(frog.invulnerableTimer / 5) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    // Select sprite based on animation state
    let sprite = null;
    switch(frog.animationState) {
        case 'tongueAttack':
            sprite = frogSprites.attack;
            break;
        case 'jumping':
            sprite = frogSprites.jumping;
            break;
        case 'falling':
            sprite = frogSprites.falling;
            break;
        case 'walking':
            sprite = frogSprites.walking;
            break;
        default: // 'idle'
            sprite = frogSprites.idle;
    }
    
    if (!sprite) {
        // Fallback if sprite not loaded
        sprite = frogSprites.idle || frogSprites.jumping;
    }
    
    ctx.save();
    
    // Disable smoothing for pixel-perfect rendering
    ctx.imageSmoothingEnabled = false;
    
    // Scale sprite to match frog dimensions
    const drawWidth = frog.width;
    const drawHeight = frog.height;
    const drawX = frog.x;
    const drawY = frog.y;
    
    // Flip horizontally based on facing direction
    if (frog.facingDirection === -1) {
        ctx.translate(frog.x + frog.width / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-(frog.x + frog.width / 2), 0);
    }
    
    // Draw the sprite scaled to frog size
    ctx.drawImage(sprite, drawX, drawY, drawWidth, drawHeight);
    
    ctx.restore();
    ctx.globalAlpha = 1.0;
    ctx.imageSmoothingEnabled = true; // Re-enable for other drawing
}


// Draw Tongue
function drawTongue() {
    if (!tongue.isExtended || tongue.length <= 0) return;
    
    const endX = tongue.x + Math.cos(tongue.angle) * tongue.length;
    const endY = tongue.y + Math.sin(tongue.angle) * tongue.length;
    
    // Draw tongue line
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#FF69B4';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(tongue.x, tongue.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Draw tongue tip
    ctx.fillStyle = '#FF1493';
    ctx.beginPath();
    ctx.arc(endX, endY, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw caught fly if attached (draw at actual fly position)
    if (tongue.caughtFly) {
        drawFly(tongue.caughtFly);
    }
}

// Draw Lily Pad
function drawLilyPad(pad) {
    // Only draw if pad is on screen or near screen
    if (pad.x + pad.width < -100 || pad.x > canvas.width + 100) {
        return; // Skip drawing if pad is far off screen
    }
    
    // Pad shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(pad.x + 2, pad.y + 2, pad.width, pad.height);
    
    // Pad
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(pad.x, pad.y, pad.width, pad.height);
    
    // Pad outline
    ctx.strokeStyle = '#228B22';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad.x, pad.y, pad.width, pad.height);
    
    // Lily pad pattern
    ctx.strokeStyle = '#32CD32';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(pad.x + pad.width / 2, pad.y);
        ctx.lineTo(pad.x + pad.width / 2 + (i - 1) * 15, pad.y + pad.height);
        ctx.stroke();
    }
}

// Draw Fly
function drawFly(fly, overrideX = null, overrideY = null) {
    const x = overrideX !== null ? overrideX : fly.x;
    const y = overrideY !== null ? overrideY : fly.y;
    
    // Fly glow
    ctx.shadowColor = fly.color;
    ctx.shadowBlur = 10;
    
    // Fly body
    ctx.fillStyle = fly.color;
    ctx.beginPath();
    ctx.arc(x, y, fly.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Fly wings animation
    ctx.strokeStyle = '#FFE4B5';
    ctx.lineWidth = 2;
    const wingOffset = Math.sin(fly.buzzOffset) * 3;
    ctx.beginPath();
    ctx.arc(x - 5, y - wingOffset, 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 5, y - wingOffset, 4, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Fly dots
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x - 3, y, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 3, y, 1, 0, Math.PI * 2);
    ctx.fill();
}

// Draw Particles
function drawParticles() {
    for (let particle of particles) {
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

// Draw Water
function drawWater() {
    // Water gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#4682B4');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    
    // Water ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    const time = Date.now() * 0.001;
    for (let i = 0; i < 20; i++) {
        const x = (i * 40 + time * 20) % canvas.width;
        ctx.beginPath();
        ctx.arc(x, canvas.height - 25, 15 + Math.sin(time + i) * 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// Game Loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing') {
        // Update game
        updateParticles();
        updateLilyPads();
        updateFlies();
        updateFrog();
        updateTongue();
        
        // Draw game
        drawWater();
        
        // Draw lily pads
        if (lilyPads && lilyPads.length > 0) {
            lilyPads.forEach(drawLilyPad);
        } else {
            console.warn('No lily pads to draw!');
        }
        
        // Draw flies
        if (flies && flies.length > 0) {
            flies.forEach(fly => !fly.collected && drawFly(fly));
        }
        
        drawParticles();
        drawTongue();
        drawFrog();
        
        // Update score display
        updateScoreDisplay();
    } else {
        // Draw background even when not playing
        drawWater();
    }
    
    requestAnimationFrame(gameLoop);
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
        e.preventDefault();
    }
});

// Start Button
document.getElementById('startButton').addEventListener('click', () => {
    resetGame();
});

// Restart Button
document.getElementById('restartButton').addEventListener('click', () => {
    resetGame();
});

// Initialize Game
function startGame() {
    if (!canvas || !ctx) {
        console.error('Canvas not initialized! Retrying...');
        setTimeout(startGame, 100);
        return;
    }
    // Generate frog sprites
    generateFrogSprites();
    console.log('Starting game loop');
    gameLoop();
}

// Start the game when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
} else {
    startGame();
}


