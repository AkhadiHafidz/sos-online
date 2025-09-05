const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

function createBoard(size) {
  return Array.from({ length: size }, () => Array(size).fill(""));
}

function checkSOS(board, r, c) {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  const sequences = [];

  for (let [dr, dc] of dirs) {
    let line = [];
    try {
      line.push({ r: r - dr, c: c - dc, val: board[r - dr][c - dc] });
      line.push({ r, c, val: board[r][c] });
      line.push({ r: r + dr, c: c + dc, val: board[r + dr][c + dc] });
      if (
        line[0].val === "S" &&
        line[1].val === "O" &&
        line[2].val === "S"
      ) {
        sequences.push(line.map((p) => ({ r: p.r, c: p.c })));
      }
    } catch {}
  }

  return sequences;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ roomId, name, size }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = {
        board: createBoard(size),
        size,
        players: [],
        turn: 0,
        scores: {},
      };
    }

    const room = rooms[roomId];
    room.players.push({ id: socket.id, name });
    room.scores[socket.id] = 0;
    socket.join(roomId);

    io.to(roomId).emit("state", { room: sanitizeRoom(room) });
    socket.emit("initBoard", { board: room.board, size: room.size });
  });

  socket.on("makeMove", ({ roomId, r, c, letter }) => {
    const room = rooms[roomId];
    if (!room) return;

    if (room.board[r][c] !== "") return; // sudah terisi

    const playerIndex = room.players.findIndex((p) => p.id === socket.id);
    if (playerIndex !== room.turn) return; // bukan giliranmu

    room.board[r][c] = letter;

    const sequences = checkSOS(room.board, r, c);
    if (sequences.length > 0) {
      room.scores[socket.id] += sequences.length;
    } else {
      room.turn = (room.turn + 1) % room.players.length;
    }

    io.to(roomId).emit("state", {
      room: sanitizeRoom(room),
      lastMove: {
        r,
        c,
        letter,
        by: room.players[playerIndex].name,
        sequences,
      },
    });
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      let room = rooms[roomId];
      room.players = room.players.filter((p) => p.id !== socket.id);
      delete room.scores[socket.id];
      io.to(roomId).emit("state", { room: sanitizeRoom(room) });
    }
    console.log("User disconnected:", socket.id);
  });
});

function sanitizeRoom(room) {
  return {
    board: room.board,
    size: room.size,
    players: room.players,
    turn: room.turn,
    scores: room.scores,
  };
}

const PORT = 3000;
server.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
