// --- Starfield Animation Logic ---
const canvas = document.getElementById('starfield-canvas');
const ctx = canvas.getContext('2d');
const numStars = 1000;
const stars = [];
const starColors = ['#FFFFFF', '#F0F8FF', '#ADD8E6', '#B0E0E6'];

function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function resetStar(star) {
    const minStartRadius = 150;
    const maxStartRadius = Math.max(canvas.width, canvas.height) / 2 + 100;
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * (maxStartRadius - minStartRadius) + minStartRadius;
    
    star.x = radius * Math.cos(angle);
    star.y = radius * Math.sin(angle);
    star.z = canvas.width;
    star.color = starColors[Math.floor(Math.random() * starColors.length)];
    star.baseSize = Math.random() * 3 + 1.5;
    star.twinkle = false;
}

function createStars() {
    stars.length = 0;
    for (let i = 0; i < numStars; i++) {
        const star = {};
        resetStar(star);
        star.z = Math.random() * canvas.width;
        stars.push(star);
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // Clear canvas with black background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numStars; i++) {
        const star = stars[i];
        star.z -= 0.375; // Speed for movement

        if (star.z <= 0) {
            resetStar(star);
        }

        const screenX = (star.x / star.z) * canvas.width + canvas.width / 2;
        const screenY = (star.y / star.z) * canvas.height + canvas.height / 2;
        const size = (1 - star.z / canvas.width) * star.baseSize;
        
        // Calculate alpha for brightness and twinkling
        const baseAlpha = Math.max(0.3, (1 - star.z / canvas.width));
        const alpha = star.twinkle ? (Math.random() * 0.7 + 0.3) : baseAlpha;
        
        // Draw the star
        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(0.5, size), 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1.0; // Reset alpha
    }
}

// Twinkling effect
setInterval(() => {
    const numTwinklingStars = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < numTwinklingStars; i++) {
        const randomIndex = Math.floor(Math.random() * stars.length);
        stars[randomIndex].twinkle = true;
        setTimeout(() => {
            stars[randomIndex].twinkle = false;
        }, 150);
    }
}, 300);

// Initialize starfield
function initStarfield() {
    setCanvasSize();
    createStars();
    animate();
}

// Handle window resize
window.addEventListener('resize', () => {
    setCanvasSize();
    createStars(); // Recreate stars for new dimensions
});

// Laser firing control
function fireLasers() {
    const lasers = document.querySelectorAll('.laser-beam');
    
    lasers.forEach(laser => {
        // Remove class to reset animation
        laser.classList.remove('firing');
        
        // Force reflow to ensure the class removal takes effect
        laser.offsetHeight;
        
        // Add class to start animation
        laser.classList.add('firing');
    });
    
    // Remove the class after animation completes to clean up
    setTimeout(() => {
        lasers.forEach(laser => laser.classList.remove('firing'));
    }, 200); // 100ms fire + 100ms fade
}
