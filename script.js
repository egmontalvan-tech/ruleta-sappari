const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const prizes = [
    "2x1 en bebidas",
    "Sigue participando",
    "8 Rollitos",
    "Sigue participando",
    "20% Desc. Infantil",
    "Sigue participando",
    "2x1 en Sopas",
    "Sigue participando"
];

const colors = [
    "#8B0000",
    "#000000",
    "#8B0000",
    "#000000",
    "#8B0000",
    "#000000",
    "#8B0000",
    "#000000"
];

const arc = (2 * Math.PI) / prizes.length;

function drawWheel(){

    for(let i=0;i<prizes.length;i++){

        const angle = i * arc;

        ctx.beginPath();

        ctx.fillStyle = colors[i];

        ctx.moveTo(250,250);

        ctx.arc(
            250,
            250,
            250,
            angle,
            angle + arc
        );

        ctx.fill();

        ctx.save();

        ctx.translate(250,250);

        ctx.rotate(angle + arc/2);

        ctx.fillStyle="white";

        ctx.font="bold 18px Poppins";

        ctx.textAlign="right";

        ctx.fillText(
            prizes[i],
            220,
            10
        );

        ctx.restore();
    }
}

drawWheel();

document
.getElementById("spinBtn")
.addEventListener("click", spinWheel);

function spinWheel(){

    const today = new Date().toDateString();

    const lastSpin =
    localStorage.getItem("sappari_last_spin");

    if(lastSpin === today){

        alert(
            "🍣 Ya participaste hoy. Regresa mañana."
        );

        return;
    }

    localStorage.setItem(
        "sappari_last_spin",
        today
    );

    const winnerIndex =
    Math.floor(
        Math.random() * prizes.length
    );

    const anglePerPrize =
    360 / prizes.length;

    const stopAngle =
    360 * 6 +
    (360 - winnerIndex * anglePerPrize);

    canvas.style.transition =
    "transform 6s ease-out";

    canvas.style.transform =
    `rotate(${stopAngle}deg)`;

    setTimeout(()=>{

        document.getElementById(
            "prizeText"
        ).innerHTML =
        prizes[winnerIndex];

        document.getElementById(
            "winnerModal"
        ).style.display =
        "flex";

    },6000);
}

function closeModal(){

    document.getElementById(
        "winnerModal"
    ).style.display =
    "none";
}
