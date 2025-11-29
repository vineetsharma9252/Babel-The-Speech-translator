require("dotenv").config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { WebSocket } = require("ws");
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

// socketId -> { ws: WebSocket, open: boolean, currentLanguage: string, bufferSize: Number }
const openAISockets = new Map();

const languageMap = new Map([
  ["en", "English"], 
  ["es", "Spanish"], 
  ["fr", "French"], 
  ["hi", "Hindi"],
  ["og", "Original"]
]);

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

    setupOpenAIConnection(socket);

    return callback({ success: true });
  });

  socket.on("leaveRoom", ({ username, roomId }) => {
    console.log(`${socket.id} left the room: ${roomId}`);

    const room = rooms.find(room => room.roomId === roomId);
    const index = room?.clients?.findIndex(client => 
      client.socket === socket.id
    );
    room?.clients?.splice(index, 1);

    const openAI = openAISockets.get(socket.id);
    if(openAI?.ws) openAI.ws.close();
    openAISockets.delete(socket.id);

    socket.leave(roomId);
    socket.to(roomId).emit("participantLeft", username);
  });

  socket.on("audioFromClient", data => {
    const languageToTranslateTo = data.selectedLanguage;
    // console.log(languageToTranslateTo);
    const openAI = openAISockets.get(socket.id);
    if(!openAI) return;

    if(languageToTranslateTo == "og") {
      socket.to(data.roomId).emit("audioFromServer", data.data);
      return;
    }
      
    if(openAI && openAI.ws.readyState === WebSocket.OPEN) {
      if(openAI.currentLanguage !== languageMap.get(languageToTranslateTo)) {
        sendSessionUpdate(openAI.ws, languageMap.get(languageToTranslateTo));
        openAI.currentLanguage = languageMap.get(languageToTranslateTo);
      }
      const audioBase64 = Buffer.from(data.data).toString("base64");
      const audioAppendEvent = {
        type: "input_audio_buffer.append", audio: audioBase64
      };
      openAI.ws.send(JSON.stringify(audioAppendEvent));
      openAI.ws.send(JSON.stringify({
        type: "response.create", 
        // response: {
        //   commit: true
        // }
      }));
    }
  });

  socket.on('disconnect', () => {
    const openAI = openAISockets.get(socket.id);
    if(openAI?.ws) openAI.ws.close();
    openAISockets.delete(socket.id);

    console.log("Client disconnected with socket id: ", socket.id);
  });
});

const setupOpenAIConnection = (socket) => {
  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
  const ws = new WebSocket(url, {
    headers: {
      "Authorization": "Bearer " + process.env.OPENAI_REALTIME_API_KEY, 
      "OpenAI-Beta": "realtime=v1"
    }
  });

  ws.on("open", () => {
    // sendSessionUpdate(ws, "Hindi");
    console.log(`OpenAI Connected for client ${socket.id}`);
    openAISockets.set(socket.id, {
      ws: ws, open: true, currentLanguage: null,
    });
    sendSessionUpdate(ws, "English");
  });
  ws.on("error", error => {
    console.error(error);
  })

  ws.on("message", (message) => {
    try { 
      const event = JSON.parse(message);
      if(event.type == "error") {
        console.error("OpenAI api error: ", event.error);
        return;
      }
      // else if(event.type === "response.audio.done") {
      //   const room = rooms.find(r => r.clients.some(c => c.socket === socket.id));
      //   const openAI = openAISockets.get(socket.id);
      //   if(room && openAI.outputBuffer.length > 0) {
      //     socket.to(room.roomId).emit("audioFromServer", openAI.outputBuffer);
      //     openAI.outputBuffer = Buffer.alloc(0);
      //   }
      // }
      else if(event.type === "response.audio.delta") {
        const room = rooms.find(r => r.clients.some(c => c.socket === socket.id));
        // console.log(room)
        const audioBuffer = Buffer.from(event.delta, "base64");
        const openAI = openAISockets.get(socket.id);
        // console.log(openAI)
        socket.to(room.roomId).emit("audioFromServer", audioBuffer);
      }
      else if(event.type == "response.audio_transcript.done") 
        console.log("[Transcript.done]: ", event.transcript);
      else
        console.log("[ws.message] event: ", event.type);
    } catch(error) {
      console.error("[openAI ws.message] error: ", error);
    }
  });

  ws.on("error", err => {
    console.error(`OpenAI WS Error for ${socket.id}: `, err);
  });
};

const sendSessionUpdate = (ws, targetLanguage) => {
  const sessionUpdate = {
    type: "session.update", 
    session: {
      modalities: ["text", "audio"], 
      instructions: `
        You are a simultaneous interpreter.
        Continuously translate incoming audio into ${targetLanguage}.
        Translate in real time as audio comes in.
        **DO NOT wait for full sentences or complete thoughts.**
        **DO NOT accumulate a buffer.**
        DO NOT repeat original audio.
        Only speak the translation audio output.
        Do nothing more than an interpreter.
      `,
      voice: "alloy",  
      input_audio_format: "pcm16", 
      output_audio_format: "pcm16", 
      turn_detection: {
        type: "server_vad", threshold: 0.2, 
        prefix_padding_ms: 300, silence_duration_ms: 200
      }
    }
  };
  ws.send(JSON.stringify(sessionUpdate));
};

const PORT = 3000;
server.listen(PORT, () => {
  console.log("Server is running on port: " + PORT);
});