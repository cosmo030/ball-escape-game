const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const uiScore = document.getElementById('score-display');
const uiHigh = document.getElementById('high-score');
const uiMsg = document.getElementById('msg-text');
const uiSub = document.getElementById('sub-msg');
const muteBtn = document.getElementById('mute-btn');

let width, height, centerX, centerY;

const config = {
    ballRadius: 7,
    ringCount: 15,
    ringSpacing: 22,
    ringThickness: 12,
    baseGapArc: 45,
    gapGrowthPerRing: 12,
    gravity: 0.22,
    bounceFactor: 0.9,
    friction: 0.999,
    jumpForce: 7.5,
    baseSpeed: 0.01
};

let ball;
let rings = [];
let particles = [];

let clickCount = 0;
let bestRecord = localStorage.getItem('ballEscapeMinClicks'); 

if (bestRecord === '0') {
    bestRecord = null;
}

if (bestRecord === null) {
    uiHigh.innerText = "BEST: -";
} else {
    uiHigh.innerText = `BEST: ${bestRecord}`;
}

let gameState = 'start'; 
let stillFrames = 0;
let shakeIntensity = 0;
let isMuted = false; 
let comboCount = 0;
let comboTimer = 0;

// --- AUDIO SYSTEM ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

muteBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation(); // Stop click from triggering a jump
    isMuted = !isMuted;
    
    if (isMuted) {
        muteBtn.innerText = "🔇 OFF";
        muteBtn.style.color = "rgba(255, 80, 80, 0.8)";
    } else {
        muteBtn.innerText = "🔊 ON";
        muteBtn.style.color = "rgba(255, 255, 255, 0.6)";
        initAudio(); // Initialize audio context if they unmute
    }
});

function playSound(type) {
    if (isMuted) return;
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'bounce') {
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'break') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(250, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
    } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(1000, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'jackpot') {
        for (let i = 0; i < 20; i++) {
            // randomize timing slightly to sound like natural spill
            const t = now + (i * 0.06) + (Math.random() * 0.02); 
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            // sine waves
            osc.type = 'sine';
            
            const freq = 2200 + (Math.random() * 800); 
            osc.frequency.setValueAtTime(freq, t);
            
            // sharp attack, longer decay (0.3s) lets it "ring" out
            gain.gain.setValueAtTime(0.03, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            
            osc.start(t);
            osc.stop(t + 0.4);
        }
    }
}

// --- PARTICLE SYSTEM ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(centerX + this.x, centerY + this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// --- MATH HELPERS ---
function normalizeAngle(angle) {
    return angle - Math.floor(angle / (2 * Math.PI)) * (2 * Math.PI);
}
function isAngleInGap(angle, gapCenter, gapWidth) {
    const halfGap = gapWidth / 2;
    let start = normalizeAngle(gapCenter - halfGap);
    let end = normalizeAngle(gapCenter + halfGap);
    if (start > end) return angle >= start || angle <= end;
    return angle >= start && angle <= end;
}

class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = config.ballRadius;
        this.color = '#fff';
        this.history = [];
    }

    update() {
        if (gameState !== 'playing') return;

        // combo timer logic: reset combo if too much time passes (30 frames = 0.5s)
        if (comboTimer > 0) {
            comboTimer--;
        } else {
            if (comboCount >= 3) {
                 uiScore.style.color = 'rgba(255, 255, 255, 0.9)';
            }
            comboCount = 0;
        }

        // Physics
        this.vy += config.gravity;
        this.vx *= config.friction;
        this.vy *= config.friction;
        this.x += this.vx;
        this.y += this.vy;

        // Trail
        this.history.push({x: this.x, y: this.y});
        if (this.history.length > 8) this.history.shift();

        // Stillness Check (Anti-Camping)
        const speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        if (speed < 0.8) {
            stillFrames++;
            if (stillFrames > 60) {
                 // Red tint warning
                 document.body.style.backgroundColor = `rgb(${Math.min(30 + (stillFrames-60)*2, 100)}, 8, 8)`;
            }
        } else {
            stillFrames = 0;
            document.body.style.backgroundColor = '#080808';
        }

        if (stillFrames > 10) {
            gameOver();
        }

        // Collision
        for (let i = rings.length - 1; i >= 0; i--) {
            const ring = rings[i];
            const dist = Math.sqrt(this.x * this.x + this.y * this.y);
            const innerEdge = ring.radius - (config.ringThickness / 2);
            const boundary = innerEdge - this.radius;

            if (dist >= boundary) {
                const angle = normalizeAngle(Math.atan2(this.y, this.x));
                
                if (isAngleInGap(angle, ring.rotation, ring.gapSize)) {
                    createExplosion(this.x, this.y, ring.color);
                    comboCount++;
                    comboTimer = 30;
                    if (comboCount >= 3) {
                        playSound('jackpot');
                        uiScore.style.color = '#ffd700'; 
                    } else {
                        playSound('break');
                    }
                    rings.splice(i, 1);
                    this.color = ring.color;
                    stillFrames = 0; 
                    shakeIntensity = 5;
                } else {
                    const angleToBall = Math.atan2(this.y, this.x);
                    this.x = Math.cos(angleToBall) * (boundary - 0.1); 
                    this.y = Math.sin(angleToBall) * (boundary - 0.1);

                    const nx = Math.cos(angleToBall);
                    const ny = Math.sin(angleToBall);
                    const dot = this.vx * nx + this.vy * ny;

                    if (dot > 0) {
                        this.vx -= 2 * dot * nx;
                        this.vy -= 2 * dot * ny;
                        this.vx *= config.bounceFactor;
                        this.vy *= config.bounceFactor;
                        
                        const impact = Math.abs(dot);
                        if (impact > 2) {
                            playSound('bounce');
                            shakeIntensity = Math.min(impact, 10);
                        }
                    }
                }
            }
        }
    }

    draw() {
        // draw trail
        for (let i = 0; i < this.history.length; i++) {
            const pos = this.history[i];
            const alpha = i / this.history.length;
            ctx.beginPath();
            // trail also turns gold
            ctx.fillStyle = (comboCount >= 3) ? '#ffd700' : this.color;
            ctx.globalAlpha = alpha * 0.4;
            ctx.arc(centerX + pos.x, centerY + pos.y, this.radius * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // draws ball
        ctx.beginPath();
        // check for gold mode
        if (comboCount >= 3) {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700'; // add glow
            ctx.shadowBlur = 20;
        } else {
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 0;
        }
        
        ctx.arc(centerX + this.x, centerY + this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; 
    }
}

class Ring {
    constructor(index) {
        this.index = index;
        this.radius = (index + 1) * config.ringSpacing + 30;
        const arcLength = config.baseGapArc + (index * config.gapGrowthPerRing);
        this.gapSize = arcLength / this.radius;
        this.rotation = 0; 
        const speedVar = (Math.random() * 0.01) + 0.005;
        this.speed = config.baseSpeed + speedVar; 
        const hue = (index / config.ringCount) * 360;
        this.color = `hsl(${hue}, 80%, 55%)`;
    }
    update() {
        this.rotation += this.speed;
        this.rotation = normalizeAngle(this.rotation);
    }
    draw() {
       ctx.beginPath();
        
        // check for gold mode
        if (comboCount >= 3) {
            ctx.strokeStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
        } else {
            ctx.strokeStyle = this.color;
            ctx.shadowBlur = 0;
        }

        ctx.lineWidth = config.ringThickness;
        ctx.lineCap = 'butt'; 
        const start = this.rotation + this.gapSize / 2;
        const end = this.rotation - this.gapSize / 2;
        ctx.arc(centerX, centerY, this.radius, start, end);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

function createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function gameOver() {
    gameState = 'lost';
    playSound('lose');
    uiMsg.innerText = "GAME OVER";
    uiSub.innerText = "Don't stop moving! Click to Retry";
    uiMsg.style.color = "#ff4444";
    document.body.style.backgroundColor = '#220000';
}

function gameWin() {
    gameState = 'won';
    
    // Convert existing record to a real number (handles strings safely)
    let currentBest = bestRecord === null ? null : parseInt(bestRecord);

    // --- FUNNY ZERO CLICK CHECK ---
    if (clickCount === 0) {
        uiMsg.innerText = "CONGRATS, THIS ISN'T SUPPOSE TO HAPPEN BUT NICE!";
        uiMsg.style.color = "#00ffff"; 
        uiSub.innerText = "0 Clicks?! You found the tunnel! (Click to Replay)";
        playSound('win');
        
        return;
    }

    // --- NORMAL WIN LOGIC ---
    let isNewRecord = false;
    
    if (currentBest === null || clickCount < currentBest || isNaN(currentBest)) {
        updateBestScore(clickCount);
        isNewRecord = true;
    }

    if (isNewRecord) {
        uiMsg.innerText = "NEW RECORD!";
        uiMsg.style.color = "#ffff44"; 
        playSound('win');
    } else {
        uiMsg.innerText = "ESCAPED!";
        uiMsg.style.color = "#44ff44"; 
        playSound('break');
    }
    
    uiSub.innerText = `${clickCount} CLICKS - Click to Play Again`;
}


function updateBestScore(val) {
    bestRecord = val;
    uiHigh.innerText = `BEST: ${bestRecord}`;
    try {
        localStorage.setItem('ballEscapeMinClicks', bestRecord);
    } catch (e) {
        console.error("Could not save score:", e);
    }
}

function init() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;
    
    gameState = 'playing';
    clickCount = 0;
    stillFrames = 0;
    particles = [];
    
    uiScore.innerText = "0";
    uiMsg.innerText = "";
    uiSub.innerText = "";
    document.body.style.backgroundColor = '#080808';

    ball = new Ball();
    rings = [];
    for (let i = 0; i < config.ringCount; i++) {
        rings.push(new Ring(i));
    }
}

function loop() {
    let shakeX = 0;
    let shakeY = 0;
    if (shakeIntensity > 0) {
        shakeX = (Math.random() - 0.5) * shakeIntensity;
        shakeY = (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.9;
    }
    ctx.setTransform(1, 0, 0, 1, shakeX, shakeY);
    
    ctx.fillStyle = 'rgba(8, 8, 8, 0.4)';
    ctx.fillRect(0, 0, width, height);

    if (gameState === 'playing') {
        rings.forEach(ring => ring.update());
        ball.update();
    }

    rings.forEach(ring => ring.draw());
    
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    ball.draw();

    if (rings.length === 0 && gameState === 'playing') {
        gameWin();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;
});

window.addEventListener('mousedown', () => {
    initAudio(); 
    
    if (gameState !== 'playing') {
        init();
    } else {
        ball.vy -= config.jumpForce;
        ball.vx += (Math.random() - 0.5) * 4;
        stillFrames = 0; 
        
        clickCount++;
        uiScore.innerText = clickCount;
        playSound('jump');
    }
});

init(); 
gameState = 'start'; 
uiMsg.innerText = "BALL ESCAPE"; 
uiSub.innerText = "Click to Start";
loop();