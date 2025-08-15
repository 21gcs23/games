document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const angleSlider = document.getElementById('angleSlider');
    const velocitySlider = document.getElementById('velocitySlider');
    const launchBtn = document.getElementById('launchBtn');

    const angleValueSpan = document.getElementById('angleValue');
    const velocityValueSpan = document.getElementById('velocityValue');

    const rangeValueSpan = document.getElementById('rangeValue');
    const heightValueSpan = document.getElementById('heightValue');
    const timeValueSpan = document.getElementById('timeValue');

    // Game constants and variables
    const g = 9.81; // Gravity
    let angle = parseInt(angleSlider.value, 10);
    let velocity = parseInt(velocitySlider.value, 10);

    let projectile = {
        x: 50,
        y: canvas.height - 50,
        radius: 5,
        dx: 0,
        dy: 0
    };

    let target = {
        x: 0,
        y: 0,
        width: 50,
        height: 50
    };

    let time = 0;
    let isLaunching = false;
    let animationFrameId;

    // --- Utility Functions ---
    function degreesToRadians(deg) {
        return deg * (Math.PI / 180);
    }

    function randomizeTarget() {
        target.x = Math.random() * (canvas.width / 2) + (canvas.width / 2) - target.width;
        target.y = Math.random() * (canvas.height - 100) + 50; // Place it at various heights
        target.y = canvas.height - target.y; // Invert y for canvas coordinates
    }

    // --- Drawing Functions ---
    function drawCannon() {
        ctx.fillStyle = '#333';
        ctx.fillRect(30, canvas.height - 70, 40, 20); // Base

        ctx.save();
        ctx.translate(50, canvas.height - 50);
        ctx.rotate(-degreesToRadians(angle));
        ctx.fillRect(0, -5, 40, 10); // Barrel
        ctx.restore();
    }

    function drawTarget() {
        ctx.fillStyle = 'red';
        ctx.fillRect(target.x, target.y - target.height, target.width, target.height);
    }

    function drawProjectile() {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.closePath();
    }

    function drawGround() {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function draw() {
        clearCanvas();
        drawGround();
        drawCannon();
        drawTarget();
        if (isLaunching) {
            drawProjectile();
        }
    }

    // --- Game Logic ---
    function launch() {
        if (isLaunching) return;

        // Reset state
        isLaunching = true;
        time = 0;
        projectile.x = 50;
        projectile.y = canvas.height - 50;

        // Calculate initial velocities
        const rad = degreesToRadians(angle);
        projectile.dx = velocity * Math.cos(rad);
        projectile.dy = velocity * Math.sin(rad);

        // Clear previous results
        rangeValueSpan.textContent = '-';
        heightValueSpan.textContent = '-';
        timeValueSpan.textContent = '-';

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animate();
    }

    function animate() {
        // Update projectile position based on time
        time += 0.1;
        projectile.x = 50 + projectile.dx * time;
        projectile.y = (canvas.height - 50) - (projectile.dy * time - 0.5 * g * time * time);

        draw();

        // Check for collision
        const hit = (projectile.x > target.x && projectile.x < target.x + target.width &&
                     projectile.y > target.y - target.height && projectile.y < target.y);

        if (hit) {
            alert('Level Complete!');
            isLaunching = false;
            updateInfoPanel();
            resetLevel();
            return;
        }

        // Check if it hit the ground or went off-screen
        if (projectile.y > canvas.height - 20 - projectile.radius || projectile.x > canvas.width) {
            isLaunching = false;
            updateInfoPanel();
            return;
        }

        animationFrameId = requestAnimationFrame(animate);
    }

    function updateInfoPanel() {
        const rad = degreesToRadians(angle);
        const u = velocity;

        const timeOfFlight = (2 * u * Math.sin(rad)) / g;
        const range = (u * u * Math.sin(2 * rad)) / g;
        const maxHeight = (u * u * Math.sin(rad) * Math.sin(rad)) / (2 * g);

        rangeValueSpan.textContent = range.toFixed(2);
        heightValueSpan.textContent = maxHeight.toFixed(2);
        timeValueSpan.textContent = timeOfFlight.toFixed(2);
    }

    function resetLevel() {
        isLaunching = false;
        if(animationFrameId) cancelAnimationFrame(animationFrameId);
        randomizeTarget();
        draw();
    }

    // --- Event Listeners ---
    angleSlider.addEventListener('input', (e) => {
        angle = parseInt(e.target.value, 10);
        angleValueSpan.textContent = angle;
        draw(); // Redraw cannon angle
    });

    velocitySlider.addEventListener('input', (e) => {
        velocity = parseInt(e.target.value, 10);
        velocityValueSpan.textContent = velocity;
    });

    launchBtn.addEventListener('click', launch);

    // --- Initial Setup ---
    resetLevel();
});
