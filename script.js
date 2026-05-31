const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");

const prizes = [
    "2x1 en bebidas",
    "Sigue participando",
    "8 Unid. Rollitos",
    "Sigue participando",
    "20% Desc. Infantil",
    "Sigue participando",
    "2x1 en Sopas",
    "Sigue participando"
];

const colors = [
    "#ff4040",
    "#111",
    "#ff4040",
    "#111",
    "#ff4040",
    "#111",
    "#ff4040",
    "#111"
];

const arc = (2 * Math.PI) / prizes.length;

function drawWheel() {

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

let spinning = false;
let currentRotation = 0;

document
.getElementById("spinBtn")
.addEventListener("click", spinWheel);

function spinWheel(){

    if(spinning) return;

    spinning = true;

    const winnerIndex =
    Math.floor(Math.random()*prizes.length);

    const anglePerPrize = 360/prizes.length;

    const stopAngle =
    (360*6) +
    (360 - (winnerIndex*anglePerPrize))
    - anglePerPrize/2;

    currentRotation = stopAngle;

    canvas.style.transition =
    "transform 6s cubic-bezier(0.17,0.67,0.12,0.99)";

    canvas.style.transform =
    `rotate(${stopAngle}deg)`;

    setTimeout(()=>{

        showPrize(prizes[winnerIndex]);

        spinning=false;

    },6000);
}

function showPrize(prize){

    document.getElementById("prizeText").innerHTML=
    `🏆 ${prize}`;

    document.getElementById("winnerModal").style.display=
    "flex";
}

function closeModal(){

    document.getElementById("winnerModal").style.display=
    "none";
}