const socket = io();
let roomId, myName;

document.getElementById("joinBtn").onclick = () => {
  myName = document.getElementById("nameInput").value;
  roomId = document.getElementById("roomInput").value;
  const size = parseInt(document.getElementById("sizeInput").value);

  if (!myName || !roomId) return alert("Isi nama dan Room ID!");

  socket.emit("joinRoom", { roomId, name: myName, size });

  document.getElementById("joinScreen").style.display = "none";
  document.getElementById("gameScreen").style.display = "flex";
};

socket.on("initBoard", ({ board, size }) => {
  renderBoard(board, size);
});

socket.on("state", ({ room, lastMove }) => {
  document.getElementById("roomInfo").textContent = `Room: ${room.size}x${room.size}`;
  renderBoard(room.board, room.size);
  renderPlayers(room.players, room.turn);
  renderScores(room.scores, room.players);

  if (lastMove && lastMove.sequences && lastMove.sequences.length > 0) {
    renderSOS(lastMove.sequences, lastMove.by);
  }
});

function renderBoard(board, size) {
  const boardEl = document.getElementById("board");
  boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  boardEl.innerHTML = "";

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.r = r;
      cell.dataset.c = c;
      cell.textContent = board[r][c] || "";

      cell.onclick = () => {
        if (cell.textContent === "") {
          const letter = prompt("Masukkan huruf (S/O):").toUpperCase();
          if (letter === "S" || letter === "O") {
            socket.emit("makeMove", { roomId, r, c, letter });
          }
        }
      };

      boardEl.appendChild(cell);
    }
  }
}

function renderPlayers(players, turn) {
  const playersEl = document.getElementById("players");
  playersEl.innerHTML = players
    .map(
      (p, i) =>
        `<div${i === turn ? ' style="color:yellow;"' : ""}>${p.name}</div>`
    )
    .join("");
}

function renderScores(scores, players) {
  const scoresEl = document.getElementById("scores");
  scoresEl.innerHTML = players
    .map((p) => `<div>${p.name}: ${scores[p.id] || 0}</div>`)
    .join("");
}

function renderSOS(sequences, playerName) {
  const list = document.getElementById("sosList");
  sequences.forEach((seq) => {
    const div = document.createElement("div");
    div.textContent = `${playerName} buat SOS di ${seq
      .map((p) => `(${p.r},${p.c})`)
      .join(" → ")}`;
    list.appendChild(div);
  });
  list.scrollTop = list.scrollHeight;
}
