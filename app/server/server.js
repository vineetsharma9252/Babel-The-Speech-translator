const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
// const mediasoup = require('mediasoup');

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

  socket.on("leaveRoom", ({ username, roomId }) => {
    console.log(`${socket.id} left the room: ${roomId}`);

    const room = rooms.find(room => room.roomId === roomId);
    const index = room?.clients?.findIndex(client => 
      client.socket === socket.id
    );
    room?.clients?.splice(index, 1);

    socket.leave(roomId);
    socket.to(roomId).emit("participantLeft", username);
  });

  socket.on("audioFromClient", data => {
    const languageToTranslateTo = data.selectedLanguage;
    // console.log(data.data);
    socket.to(data.roomId).emit("audioFromServer", data.data);
  });

  socket.on('disconnect', () => {
    console.log("Client disconnected with socket id: ", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Server is running on port: " + PORT);
});