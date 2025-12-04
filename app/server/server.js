const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { WebSocket } = require("ws");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", methods: ["GET", "POST"]
  }
});

const rooms = [
    // {roomId: 
    // clients = [
    //     {username, socket}
    // ]}
];

// const languageMap = new Map([
//   ["en", "English"], 
//   ["es", "Spanish"], 
//   ["fr", "French"], 
//   ["hi", "Hindi"],
//   ["og", "Original"]
// ]);

io.on('connection', (socket) => {
  console.log('New client connected: ', socket.id);

  socket.on('joinRoom', ({ username, roomId }, callback) => {
    const room = rooms.find(room => room.roomId === roomId);
    if(!room) {
      rooms.push({
        roomId: roomId, 
        clients: [{ username: username, socket: socket.id }]
      });
      socket.join(roomId);
    } else {
        if(username == "sender" && room.clients.some(client => client.username === "sender")) {
            return callback({ senderExists: true });
        }
        else if(username == "receiver" && room.clients.some(client => client.username === "receiver")) {
            return callback({ receiverExists: true });
        }
        else if(room.clients.length >= 2) {
            return callback({ roomIsFull: true });
        }
        room.clients.push({ username: username, socket: socket.id });
        socket.join(roomId);
    }

    socket.emit("roomJoined", { username, roomId });
    socket.to(roomId).emit("newParticipantJoined", username);

    return callback({ success: true });
  });

  socket.on("offer", data => {
    console.log("offer:" , data);
    socket.to(data.roomId).emit("offer", {
      offer: data.offer, 
      senderId: socket.id
    });
  });

  socket.on("answer", data => {
    console.log("answer:" , data);
    socket.to(data.roomId).emit("answer", {
      answer: data.answer, 
      senderId: socket.id
    });
  });

  socket.on("ice-candidate", data => {
    console.log("ice-candidate:" , data);
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate, 
      senderId: socket.id
    });
  });

  socket.on("leaveRoom", ({ username, roomId }) => {
    const room = rooms.find(r => r.roomId === roomId);
    if (!room) return;

    const idx = room.clients.findIndex(c => c.socket === socket.id);
    if (idx !== -1) room.clients.splice(idx, 1);

    socket.leave(roomId);

    socket.to(roomId).emit("participantLeft", username);
    if (room.clients.length === 0) {
      rooms.splice(rooms.indexOf(room), 1);
    }
  });

  socket.on("disconnect", () => {
    rooms.slice().forEach(room => {
      const idx = room.clients.findIndex(c => c.socket === socket.id);
      if (idx !== -1) {
        const username = room.clients[idx].username;
        room.clients.splice(idx, 1);
        socket.to(room.roomId).emit("participantLeft", username);
        if (room.clients.length === 0) {
          rooms.splice(rooms.indexOf(room), 1);
        }
      }
    });

    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Server is running on port: " + PORT);
});