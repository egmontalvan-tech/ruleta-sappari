// Modo prueba: poner en false cuando pidas revertir
const TEST_MODE = true;

const PRIZES = [
    "2x1 en bebidas",
    "Sigue participando!",
    "8 Unid. Rollitos",
    "Sigue participando!",
    "20% Desc. Infantil",
    "Sigue participando!",
    "2x1 en Sopas",
    "Sigue participando!"
];

const REAL_PRIZE_INDICES = [0, 2, 4, 6];
const CONSOLATION_INDICES = [1, 3, 5, 7];

const SEGMENT_ANGLE = 360 / PRIZES.length;

const PRIZE_SEGMENT_STYLE = {
    colors: ["#ef4444", "#991b1b", "#7f1d1d"],
    text: "#fff7ed"
};

const CONSOLATION_SEGMENT_STYLE = {
    colors: ["#44403c", "#1c1917", "#0c0a09"],
    text: "#d6d3d1"
};

let participantName = "";
let participantPhone = "";
let currentRotation = 0;
let isSpinning = false;
let db = null;

const formContainer = document.getElementById("formContainer");
const ruletaContainer = document.getElementById("ruletaContainer");
const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const validarBtn = document.getElementById("validarBtn");
const spinBtn = document.getElementById("spinBtn");
const wheelCanvas = document.getElementById("wheel");
const winnerModal = document.getElementById("winnerModal");
const prizeText = document.getElementById("prizeText");
const errorMessage = document.getElementById("errorMessage");

function getTodayKey() {
    return new Date().toISOString().slice(0, 10);
}

function normalizePhone(phone) {
    return phone.replace(/\D/g, "");
}

function isValidName(name) {
    return name.trim().length >= 2;
}

function isValidPhone(phone) {
    return /^09\d{8}$/.test(normalizePhone(phone));
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

function participationDocId(phone) {
    return `${normalizePhone(phone)}_${getTodayKey()}`;
}

async function initFirebase() {
    if (TEST_MODE || db || typeof firebase === "undefined") {
        return;
    }

    firebase.initializeApp({
        apiKey: "AIzaSyD4anQngP2eDrG1QCfoeSkanidlvOc6k9E",
        authDomain: "sappari.firebaseapp.com",
        projectId: "sappari",
        storageBucket: "sappari.firebasestorage.app",
        messagingSenderId: "353921307187",
        appId: "1:353921307187:web:c475868367b1e68ee40946",
        measurementId: "G-4X05BCVFEG"
    });

    db = firebase.firestore();
}

async function hasPlayedToday(phone) {
    const ref = db.collection("participaciones").doc(participationDocId(phone));
    const snapshot = await ref.get();
    return snapshot.exists;
}

async function saveParticipation(prize) {
    const ref = db.collection("participaciones").doc(participationDocId(participantPhone));
    await ref.set({
        nombre: participantName.trim(),
        telefono: normalizePhone(participantPhone),
        fecha: getTodayKey(),
        premio: prize,
        registradoEn: new Date().toISOString()
    });
}

function randomInt(max) {
    if (window.crypto && crypto.getRandomValues) {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return buffer[0] % max;
    }

    return Math.floor(Math.random() * max);
}

function randomChance(probability) {
    if (window.crypto && crypto.getRandomValues) {
        const buffer = new Uint32Array(1);
        crypto.getRandomValues(buffer);
        return buffer[0] / 4294967296 < probability;
    }

    return Math.random() < probability;
}

function pickWeightedSegmentIndex() {
    const pool = randomChance(0.5) ? CONSOLATION_INDICES : REAL_PRIZE_INDICES;
    return pool[randomInt(pool.length)];
}

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}

function getSegmentFromRotation(rotation) {
    const wheelAngle = normalizeAngle(360 - normalizeAngle(rotation));
    return Math.floor(wheelAngle / SEGMENT_ANGLE) % PRIZES.length;
}

function getRotationForSegment(index, fromRotation) {
    const currentAngle = normalizeAngle(fromRotation);
    const segmentCenter = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    const safeMargin = 4;
    const maxJitter = SEGMENT_ANGLE / 2 - safeMargin;
    const jitter = (Math.random() * 2 - 1) * maxJitter;
    const stopAngle = normalizeAngle(360 - segmentCenter + jitter);
    const extraSpins = 5 + randomInt(5);
    const delta = normalizeAngle(stopAngle - currentAngle) || 360;

    return fromRotation + extraSpins * 360 + delta;
}

function isRealPrize(index) {
    return REAL_PRIZE_INDICES.includes(index);
}

function getSegmentStyle(index) {
    return isRealPrize(index) ? PRIZE_SEGMENT_STYLE : CONSOLATION_SEGMENT_STYLE;
}

function launchCelebration() {
    if (typeof confetti !== "function") {
        return;
    }

    const colors = ["#d4af37", "#f0d78c", "#c41e3a", "#faf7f2", "#991b1b"];

    confetti({
        particleCount: 130,
        spread: 85,
        startVelocity: 48,
        origin: { y: 0.58 },
        colors,
        ticks: 220
    });

    setTimeout(() => {
        confetti({
            particleCount: 70,
            angle: 60,
            spread: 58,
            origin: { x: 0.08, y: 0.68 },
            colors
        });
    }, 180);

    setTimeout(() => {
        confetti({
            particleCount: 70,
            angle: 120,
            spread: 58,
            origin: { x: 0.92, y: 0.68 },
            colors
        });
    }, 320);
}

function showWinnerCelebration(prize) {
    prizeText.textContent = prize;
    winnerModal.style.display = "flex";
    launchCelebration();
}

function showRuleta() {
    formContainer.hidden = true;
    ruletaContainer.hidden = false;
    drawWheel();
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i += 1) {
        const testLine = `${currentLine} ${words[i]}`;
        if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }

    lines.push(currentLine);
    return lines;
}

function createSegmentGradient(ctx, center, radius, startAngle, endAngle, colors) {
    const midAngle = (startAngle + endAngle) / 2;
    const gx = center + Math.cos(midAngle) * radius * 0.45;
    const gy = center + Math.sin(midAngle) * radius * 0.45;
    const gradient = ctx.createLinearGradient(center, center, gx, gy);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.55, colors[1]);
    gradient.addColorStop(1, colors[2]);
    return gradient;
}

function drawSegmentLabel(ctx, center, innerRadius, outerRadius, startAngle, endAngle, text, color, fontSize) {
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const labelRadius = (innerRadius + outerRadius) / 2;
    const x = center + Math.cos(midAngle) * labelRadius;
    const y = center + Math.sin(midAngle) * labelRadius;
    const maxWidth = (outerRadius - innerRadius) * 1.45;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px Poppins, "Noto Sans JP", sans-serif`;
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 4;

    const lines = wrapText(ctx, text, maxWidth);
    const lineHeight = fontSize + 3;

    lines.forEach((line, index) => {
        const lineY = (index - (lines.length - 1) / 2) * lineHeight;
        ctx.fillText(line, 0, lineY);
    });

    ctx.restore();
}

function drawWheel() {
    const ctx = wheelCanvas.getContext("2d");
    const size = wheelCanvas.width;
    const center = size / 2;
    const radius = center - 14;
    const hubRadius = 58;
    const labelInnerRadius = hubRadius + 12;
    const labelOuterRadius = radius - 16;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, Math.PI * 2);
    const outerGlow = ctx.createRadialGradient(center, center, radius * 0.72, center, center, radius + 8);
    outerGlow.addColorStop(0, "rgba(212, 175, 55, 0.08)");
    outerGlow.addColorStop(1, "rgba(212, 175, 55, 0.35)");
    ctx.fillStyle = outerGlow;
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < PRIZES.length; i += 1) {
        const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
        const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
        const style = getSegmentStyle(i);

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = createSegmentGradient(ctx, center, radius, startAngle, endAngle, style.colors);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = "rgba(240, 215, 140, 0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();

        drawSegmentLabel(
            ctx,
            center,
            labelInnerRadius,
            labelOuterRadius,
            startAngle,
            endAngle,
            PRIZES[i],
            style.text,
            isRealPrize(i) ? 12 : 11
        );
    }

    for (let i = 0; i < PRIZES.length; i += 1) {
        const angle = (i * SEGMENT_ANGLE - 90 + SEGMENT_ANGLE / 2) * (Math.PI / 180);
        const dotRadius = radius + 5;
        const x = center + Math.cos(angle) * dotRadius;
        const y = center + Math.sin(angle) * dotRadius;

        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isRealPrize(i) ? "#f0d78c" : "#78716c";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 247, 214, 0.65)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(center, center, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#faf7f2";
    ctx.fill();
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 5;
    ctx.stroke();
}

function spinWheel() {
    if (isSpinning) {
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = "Girando...";

    const winIndex = pickWeightedSegmentIndex();
    const targetRotation = getRotationForSegment(winIndex, currentRotation);

    wheelCanvas.style.transition = "none";
    wheelCanvas.style.transform = `rotate(${currentRotation}deg)`;
    wheelCanvas.offsetHeight;

    wheelCanvas.style.transition =
        "transform 4.2s cubic-bezier(0.15, 0.85, 0.18, 1)";
    wheelCanvas.style.transform = `rotate(${targetRotation}deg)`;

    const handleSpinEnd = async (event) => {
        if (event.propertyName !== "transform") {
            return;
        }

        wheelCanvas.removeEventListener("transitionend", handleSpinEnd);
        currentRotation = targetRotation;
        const landedIndex = getSegmentFromRotation(currentRotation);
        const prize = PRIZES[landedIndex];

        try {
            if (!TEST_MODE) {
                await saveParticipation(prize);
            }

            if (isRealPrize(landedIndex)) {
                showWinnerCelebration(prize);
            } else {
                spinBtn.textContent = "Participación registrada";
            }
        } catch (error) {
            showError("No se pudo registrar tu participación. Intenta nuevamente.");
            console.error(error);
            spinBtn.disabled = false;
            spinBtn.textContent = "Girar ruleta";
        } finally {
            isSpinning = false;
        }
    };

    wheelCanvas.addEventListener("transitionend", handleSpinEnd);
}

window.closeModal = function closeModal() {
    winnerModal.style.display = "none";
    spinBtn.disabled = true;
    spinBtn.textContent = "Participación registrada";
};

validarBtn.addEventListener("click", async () => {
    clearError();

    const nombre = nombreInput.value.trim() || "Prueba";
    const telefono = telefonoInput.value.trim() || "0900000000";

    if (!TEST_MODE) {
        if (!isValidName(nombre)) {
            showError("Ingresa un nombre válido.");
            return;
        }

        if (!isValidPhone(telefono)) {
            showError("Ingresa un celular ecuatoriano válido (09XXXXXXXX).");
            return;
        }
    }

    validarBtn.disabled = true;
    validarBtn.textContent = "Validando...";

    try {
        if (TEST_MODE) {
            participantName = nombre;
            participantPhone = telefono;
            showRuleta();
            return;
        }

        await initFirebase();
        const alreadyPlayed = await hasPlayedToday(telefono);

        if (alreadyPlayed) {
            showError("Esta persona ya participó hoy. Vuelve mañana.");
            return;
        }

        participantName = nombre;
        participantPhone = telefono;
        showRuleta();
    } catch (error) {
        showError("Error al validar participación. Revisa tu conexión.");
        console.error(error);
    } finally {
        validarBtn.disabled = false;
        validarBtn.textContent = "Validar participación";
    }
});

spinBtn.addEventListener("click", spinWheel);
