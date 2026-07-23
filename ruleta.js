// Modo prueba: validación relajada en local (nombre/celular opcionales)
const TEST_MODE =
    location.protocol === "file:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

// Firebase funciona en localhost y en producción; solo se omite al abrir el archivo directo (file://)
const USE_FIREBASE = location.protocol !== "file:";

const memoryDailyCache = new Map();
const memorySessionCache = new Set();

const PRIZES = [
    "2x1 en bebidas",
    "Sigue participando",
    "4 Unid. Rollitos",
    "Sigue participando",
    "20% Desc. Infantil",
    "Sigue participando",
    "2x1 en Sopas",
    "Sigue participando"
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
let participantInvoice = "";
let currentRotation = 0;
let isSpinning = false;
let db = null;
let wheelLogicalSize = 480;

const formContainer = document.getElementById("formContainer");
const ruletaContainer = document.getElementById("ruletaContainer");
const nombreInput = document.getElementById("nombre");
const telefonoInput = document.getElementById("telefono");
const facturaInput = document.getElementById("factura");
const validarBtn = document.getElementById("validarBtn");
const spinBtn = document.getElementById("spinBtn");
const wheelCanvas = document.getElementById("wheel");
const winnerModal = document.getElementById("winnerModal");
const prizeText = document.getElementById("prizeText");
const winnerNameEl = document.getElementById("winnerName");
const winnerPhoneEl = document.getElementById("winnerPhone");
const invoiceNumberEl = document.getElementById("invoiceNumber");
const purchaseDateEl = document.getElementById("purchaseDate");
const STORAGE_PREFIX = "sappari_";

const errorMessage = document.getElementById("errorMessage");
const ruletaError = document.getElementById("ruletaError");

const mobileQuery = window.matchMedia("(max-width: 768px)");

function applyDeviceLayout() {
    const isMobile = mobileQuery.matches;

    document.documentElement.classList.toggle("layout-movil", isMobile);
    document.body.classList.toggle("layout-movil", isMobile);
}

applyDeviceLayout();

mobileQuery.addEventListener("change", () => {
    applyDeviceLayout();

    if (!ruletaContainer.hidden) {
        resizeWheelCanvas();
    }
});

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

function isValidInvoice(invoice) {
    return invoice.trim().length >= 3;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
    ruletaError.textContent = "";
    ruletaError.hidden = true;
}

function showRuletaError(message) {
    ruletaError.textContent = message;
    ruletaError.hidden = false;
}

function lockSpinButton(message) {
    spinBtn.disabled = true;
    spinBtn.textContent = message;
}

function updateSpinAvailability() {
    if (!participantPhone) {
        return;
    }

    if (hasSpunThisSession(participantPhone) || hasPlayedTodayCache(participantPhone)) {
        lockSpinButton("Participación registrada");
    }
}

function participationDocId(phone) {
    return `${normalizePhone(phone)}_${getTodayKey()}`;
}

function dailyCacheKey(phone) {
    return `${STORAGE_PREFIX}daily_${participationDocId(phone)}`;
}

function sessionSpinKey(phone) {
    return `${STORAGE_PREFIX}spin_${normalizePhone(phone)}`;
}

function storageGet(storage, key) {
    try {
        return storage.getItem(key);
    } catch (error) {
        console.warn("No se pudo leer almacenamiento local:", error);
        return null;
    }
}

function storageSet(storage, key, value) {
    try {
        storage.setItem(key, value);
        return true;
    } catch (error) {
        console.warn("No se pudo guardar en almacenamiento local:", error);
        return false;
    }
}

function storageRemove(storage, key) {
    try {
        storage.removeItem(key);
    } catch (error) {
        console.warn("No se pudo borrar del almacenamiento local:", error);
    }
}

function hasPlayedTodayCache(phone) {
    const key = dailyCacheKey(phone);

    if (memoryDailyCache.get(key) === "1") {
        return true;
    }

    return storageGet(localStorage, key) === "1";
}

function markPlayedTodayCache(phone) {
    const key = dailyCacheKey(phone);
    memoryDailyCache.set(key, "1");
    storageSet(localStorage, key, "1");
}

function hasSpunThisSession(phone) {
    const key = sessionSpinKey(phone);
    const normalized = normalizePhone(phone);

    if (memorySessionCache.has(normalized)) {
        return true;
    }

    return storageGet(sessionStorage, key) === "1";
}

function markSpunThisSession(phone) {
    const key = sessionSpinKey(phone);
    const normalized = normalizePhone(phone);

    memorySessionCache.add(normalized);
    storageSet(sessionStorage, key, "1");
}

function clearParticipationCache(phone) {
    const dailyKey = dailyCacheKey(phone);
    const sessionKey = sessionSpinKey(phone);

    memoryDailyCache.delete(dailyKey);
    memorySessionCache.delete(normalizePhone(phone));
    storageRemove(localStorage, dailyKey);
    storageRemove(sessionStorage, sessionKey);
}

function formatPurchaseDate() {
    return new Date().toLocaleDateString("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

async function initFirebase() {
    if (!USE_FIREBASE || db || typeof firebase === "undefined") {
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

function participationRef(phone) {
    return db.collection("participaciones").doc(participationDocId(phone));
}

async function hasPlayedToday(phone) {
    const snapshot = await participationRef(phone).get();
    const data = snapshot.data();

    return snapshot.exists && data && data.estado === "completado";
}

async function saveRegistration() {
    const data = {
        nombre: participantName.trim(),
        telefono: normalizePhone(participantPhone),
        numeroFactura: participantInvoice,
        fecha: getTodayKey(),
        estado: "validado",
        validadoEn: new Date().toISOString()
    };

    await participationRef(participantPhone).set(data, { merge: true });
}

async function saveParticipation(prize, isWinner = false) {
    const data = {
        nombre: participantName.trim(),
        telefono: normalizePhone(participantPhone),
        numeroFactura: participantInvoice,
        fecha: getTodayKey(),
        premio: prize,
        estado: "completado",
        giroEn: new Date().toISOString()
    };

    if (isWinner) {
        data.fechaCompra = formatPurchaseDate();
    }

    await participationRef(participantPhone).set(data, { merge: true });
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
    winnerNameEl.textContent = participantName;
    winnerPhoneEl.textContent = participantPhone;
    invoiceNumberEl.textContent = participantInvoice;
    purchaseDateEl.textContent = formatPurchaseDate();
    winnerModal.style.display = "flex";
    launchCelebration();
}

function getTargetWheelSize() {
    const container = document.querySelector(".wheel-container");

    if (!container) {
        return 480;
    }

    const width = container.clientWidth || 480;
    const isMobile = document.documentElement.classList.contains("layout-movil");
    const maxSize = isMobile
        ? Math.min(width, window.innerWidth - 24, 380)
        : Math.min(width, 480);

    return Math.max(260, Math.floor(maxSize));
}

function resizeWheelCanvas() {
    if (!wheelCanvas) {
        return;
    }

    const size = getTargetWheelSize();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    wheelLogicalSize = size;
    wheelCanvas.width = Math.floor(size * dpr);
    wheelCanvas.height = Math.floor(size * dpr);
    wheelCanvas.style.width = `${size}px`;
    wheelCanvas.style.height = `${size}px`;

    const ctx = wheelCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWheel();
}

function showRuleta() {
    formContainer.hidden = true;
    ruletaContainer.hidden = false;
    updateSpinAvailability();
    requestAnimationFrame(resizeWheelCanvas);
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
    const size = wheelLogicalSize;
    const scale = size / 480;
    const center = size / 2;
    const radius = center - 14 * scale;
    const hubRadius = 58 * scale;
    const labelInnerRadius = hubRadius + 12 * scale;
    const labelOuterRadius = radius - 16 * scale;
    const prizeFontSize = Math.max(9, Math.round(12 * scale));
    const consolationFontSize = Math.max(8, Math.round(11 * scale));

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
            isRealPrize(i) ? prizeFontSize : consolationFontSize
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

    if (hasSpunThisSession(participantPhone)) {
        showRuletaError("Ya giraste la ruleta en esta sesión.");
        lockSpinButton("Participación registrada");
        return;
    }

    if (hasPlayedTodayCache(participantPhone)) {
        showRuletaError("Ya participaste hoy. Solo puedes girar una vez al día.");
        lockSpinButton("Participación registrada");
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
            markSpunThisSession(participantPhone);
            markPlayedTodayCache(participantPhone);

            if (db) {
                await saveParticipation(prize, isRealPrize(landedIndex));
            }

            if (isRealPrize(landedIndex)) {
                showWinnerCelebration(prize);
            } else {
                lockSpinButton("Participación registrada");
            }
        } catch (error) {
            clearParticipationCache(participantPhone);
            const code = error && error.code ? ` (${error.code})` : "";
            showRuletaError(`No se pudo registrar tu participación${code}. Revisa las reglas de Firestore.`);
            console.error("Firestore saveParticipation:", error);
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
    lockSpinButton("Participación registrada");
};

validarBtn.addEventListener("click", async () => {
    clearError();

    const nombre = nombreInput.value.trim();
    const telefono = telefonoInput.value.trim();
    const factura = facturaInput.value.trim();
    const nombreFinal = TEST_MODE && !nombre ? "Prueba" : nombre;
    const telefonoFinal = TEST_MODE && !telefono ? "0900000000" : telefono;

    validarBtn.disabled = true;
    validarBtn.textContent = "Validando...";

    try {
        if (!isValidInvoice(factura)) {
            showError("Ingresa un número de factura válido.");
            return;
        }

        if (hasPlayedTodayCache(telefonoFinal)) {
            showError("Ya participaste hoy. Solo puedes girar una vez al día.");
            return;
        }

        if (!TEST_MODE) {
            if (!isValidName(nombreFinal)) {
                showError("Ingresa un nombre válido.");
                return;
            }

            if (!isValidPhone(telefonoFinal)) {
                showError("Ingresa un celular ecuatoriano válido (09XXXXXXXX).");
                return;
            }
        }

        if (USE_FIREBASE) {
            await initFirebase();

            if (!db) {
                showError("No se pudo conectar con la base de datos.");
                return;
            }

            if (await hasPlayedToday(telefonoFinal)) {
                showError("Ya participaste hoy. No puedes reclamar dos veces el mismo día.");
                return;
            }
        }

        participantName = nombreFinal;
        participantPhone = telefonoFinal;
        participantInvoice = factura;

        if (db) {
            try {
                await saveRegistration();
            } catch (error) {
                showError(
                    "No se pudo guardar en Firestore. Publica las reglas de firestore.rules en Firebase Console."
                );
                console.error("Firestore saveRegistration:", error);
                return;
            }
        }

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

window.addEventListener("resize", () => {
    if (!ruletaContainer.hidden) {
        resizeWheelCanvas();
    }
});

window.addEventListener("orientationchange", () => {
    setTimeout(() => {
        if (!ruletaContainer.hidden) {
            resizeWheelCanvas();
        }
    }, 200);
});
