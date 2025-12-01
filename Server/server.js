// server.js
const mediasoup = require('mediasoup');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { OpenAI } = require('openai');
require('dotenv').config();

class TranslationServer {
  constructor() {
    this.worker = null;
    this.rooms = new Map();
    this.audioBuffers = new Map();

    // Initialize OpenAI (use environment variable)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "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"
    });

    console.log('✅ OpenAI initialized');
    this.setupServer();
  }

  async setupServer() {
    try {
      // Create Mediasoup worker
      this.worker = await mediasoup.createWorker({
        logLevel: 'debug',
        rtcMinPort: 10000,
        rtcMaxPort: 20000,
      });

      console.log('✅ Mediasoup worker created');

      // Setup Express server
      this.app = express();
      this.server = http.createServer(this.app);

      // Setup Socket.io with CORS
      this.io = socketIo(this.server, {
        cors: {
          origin: "*", // Allow all origins for testing
          methods: ["GET", "POST"],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });

      // Middleware
      this.app.use(express.json());
      this.app.use(express.static('public'));

      // Enable CORS for all routes
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
      });

      // Routes
      this.setupRoutes();

      // Socket handlers
      this.setupSocketHandlers();

      // Start server
      const PORT = process.env.PORT || 3000;
      const HOST = process.env.HOST || '0.0.0.0';

      this.server.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on http://${HOST}:${PORT}`);
        console.log(`🌐 WebSocket: ws://${HOST}:${PORT}`);
        console.log('🎯 Ready with OpenAI Whisper translation!');
      });

      // Handle server errors
      this.server.on('error', (error) => {
        console.error('❌ Server error:', error);
      });

    } catch (error) {
      console.error('❌ Server setup failed:', error);
      process.exit(1);
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        rooms: this.rooms.size,
        openai: !!process.env.OPENAI_API_KEY
      });
    });

    // Home page
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Translation Server</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { color: #333; }
            .status { color: green; font-weight: bold; }
            .info { background: #f0f0f0; padding: 20px; border-radius: 5px; }
            .endpoints { margin-top: 20px; }
            .endpoint { background: #e0e0e0; padding: 10px; margin: 5px 0; border-radius: 3px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎥 Real-time Translation Server</h1>
            <div class="info">
              <p class="status">✅ Server is running with OpenAI Whisper!</p>
              <p>Active Rooms: ${this.rooms.size}</p>
              <p>Total Users: ${Array.from(this.rooms.values()).reduce((acc, room) => acc + room.users.size, 0)}</p>
              <p>Translation: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled'}</p>
              <div class="endpoints">
                <h3>Endpoints:</h3>
                <div class="endpoint">Health Check: <a href="/health">/health</a></div>
                <div class="endpoint">WebSocket: ws://${req.headers.host}</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📱 New connection: ${socket.id}`);

      // Send welcome message immediately
      socket.emit('connected', {
        socketId: socket.id,
        message: 'Connected to translation server',
        translationEnabled: !!process.env.OPENAI_API_KEY
      });

      // Handle room creation/joining
      socket.on('create-or-join', async (data, callback) => {
        console.log('📥 Received create-or-join:', data);
        await this.handleCreateOrJoin(socket, data, callback);
      });

      // Handle WebRTC offers
      socket.on('webrtc-offer', (data) => {
        console.log('📥 Received WebRTC offer');
        this.handleWebRTCOffer(socket, data);
      });

      // Handle WebRTC answers
      socket.on('webrtc-answer', (data) => {
        console.log('📥 Received WebRTC answer');
        this.handleWebRTCAnswer(socket, data);
      });

      // Handle ICE candidates
      socket.on('ice-candidate', (data) => {
        console.log('📥 Received ICE candidate');
        this.handleICECandidate(socket, data);
      });

      // Handle audio data for translation
      socket.on('audioData', (data) => {
        this.handleAudioData(socket, data);
      });

      // Handle manual translation requests
      socket.on('translate', async (data, callback) => {
        await this.handleTranslation(socket, data, callback);
      });

      // Handle start translation
      socket.on('start-translation', (data) => {
        console.log('🌐 Starting translation for room:', data.roomId);
        socket.to(data.roomId).emit('start-translation', data);
      });

      // Handle leave room
      socket.on('leaveRoom', (data) => {
        this.handleLeaveRoom(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });

    // Handle connection errors
    this.io.engine.on("connection_error", (err) => {
      console.error('❌ Socket.io connection error:', err);
    });
  }

  async handleCreateOrJoin(socket, data, callback) {
    const { roomId, userLang = 'en', targetLang = 'es', password } = data;

    console.log(`🎯 ${socket.id} joining room: ${roomId} (${userLang} → ${targetLang})`);

    try {
      let room = this.rooms.get(roomId);

      if (!room) {
        // Create new room
        room = {
          id: roomId,
          users: new Map(),
          userLanguages: new Map(),
          offers: new Map(),
          answers: new Map(),
          iceCandidates: new Map()
        };
        this.rooms.set(roomId, room);
        console.log(`✅ Room created: ${roomId}`);
      }

      // Check if room is full (max 2 users)
      if (room.users.size >= 2) {
        callback({
          success: false,
          error: 'Room is full (max 2 users)'
        });
        return;
      }

      // Add user to room
      room.users.set(socket.id, {
        socket,
        userLang,
        targetLang,
        connected: true
      });
      room.userLanguages.set(socket.id, {
        speak: userLang,
        listen: targetLang
      });

      socket.join(roomId);
      socket.roomId = roomId;

      const userCount = room.users.size;
      const isCreator = userCount === 1;

      console.log(`👥 Room ${roomId} now has ${userCount}/2 users`);

      // Send success response
      callback({
        success: true,
        roomId,
        userCount,
        isCreator,
        routerRtpCapabilities: {} // Empty for now, we're using simple WebRTC
      });

      // Notify other users in the room
      socket.to(roomId).emit('userJoined', {
        userId: socket.id,
        userCount,
        userLang,
        targetLang
      });

      // If two users are in the room, notify them to start call
      if (userCount === 2) {
        console.log(`🎉 Two users in room ${roomId}, starting call...`);

        // Get the other user
        const otherUserId = Array.from(room.users.keys()).find(id => id !== socket.id);
        const otherUser = room.users.get(otherUserId);

        // Notify both users
        this.io.to(socket.id).emit('startCall', {
          roomId,
          otherUser: {
            id: otherUserId,
            userLang: otherUser.userLang,
            targetLang: otherUser.targetLang
          }
        });

        this.io.to(otherUserId).emit('startCall', {
          roomId,
          otherUser: {
            id: socket.id,
            userLang,
            targetLang
          }
        });
      }

    } catch (error) {
      console.error('Error creating/joining room:', error);
      callback({
        success: false,
        error: 'Failed to join room: ' + error.message
      });
    }
  }

  handleWebRTCOffer(socket, data) {
    const { offer, roomId } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      console.error(`Room ${roomId} not found for offer from ${socket.id}`);
      return;
    }

    console.log(`📤 Forwarding offer from ${socket.id} in room ${roomId}`);

    // Forward offer to other users in the room
    socket.to(roomId).emit('webrtc-offer', {
      offer,
      from: socket.id,
      roomId
    });
  }

  handleWebRTCAnswer(socket, data) {
    const { answer, roomId } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      console.error(`Room ${roomId} not found for answer from ${socket.id}`);
      return;
    }

    console.log(`📤 Forwarding answer from ${socket.id} in room ${roomId}`);

    // Forward answer to other users in the room
    socket.to(roomId).emit('webrtc-answer', {
      answer,
      from: socket.id,
      roomId
    });
  }

  handleICECandidate(socket, data) {
    const { candidate, roomId } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      console.error(`Room ${roomId} not found for ICE candidate from ${socket.id}`);
      return;
    }

    console.log(`📤 Forwarding ICE candidate from ${socket.id} in room ${roomId}`);

    // Forward ICE candidate to other users in the room
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.id,
      roomId
    });
  }

  handleAudioData(socket, data) {
    const { audioChunk, roomId } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      console.error(`Room ${roomId} not found for audio data from ${socket.id}`);
      return;
    }

    // Store audio data for processing
    if (!this.audioBuffers.has(socket.id)) {
      this.audioBuffers.set(socket.id, {
        buffer: [],
        lastProcessTime: Date.now()
      });
    }

    const audioData = this.audioBuffers.get(socket.id);

    if (audioChunk) {
      const buffer = Buffer.from(audioChunk, 'base64');
      audioData.buffer.push(buffer);
      audioData.lastProcessTime = Date.now();
    }

    // Process audio if enough data collected (every 2 seconds)
    const now = Date.now();
    if (audioData.buffer.length > 0 && (now - audioData.lastProcessTime) > 2000) {
      this.processAudioForTranslation(socket, room);
      audioData.lastProcessTime = now;
    }
  }

  async processAudioForTranslation(socket, room) {
    const audioData = this.audioBuffers.get(socket.id);
    if (!audioData || audioData.buffer.length === 0) return;

    try {
      const userLang = room.userLanguages.get(socket.id);
      if (!userLang) return;

      // Combine audio buffers
      const combinedBuffer = Buffer.concat(audioData.buffer);

      // Process with OpenAI Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: combinedBuffer,
        model: "whisper-1",
        language: userLang.speak,
        response_format: "text"
      });

      const transcribedText = transcription.text.trim();
      if (!transcribedText) return;

      console.log(`🗣️ [${socket.id}] Original: "${transcribedText}"`);

      // Send original transcription to speaker
      socket.emit('transcription', {
        text: transcribedText,
        language: userLang.speak,
        isOriginal: true,
        timestamp: new Date().toISOString()
      });

      // Translate for other users in room
      for (const [userId, userInfo] of room.users.entries()) {
        if (userId !== socket.id) {
          const listenerLang = room.userLanguages.get(userId);

          if (listenerLang && listenerLang.listen !== userLang.speak) {
            // Translate text
            const translation = await this.openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: `Translate from ${userLang.speak} to ${listenerLang.listen}. Return only the translation.`
                },
                {
                  role: "user",
                  content: transcribedText
                }
              ],
              max_tokens: 100
            });

            const translatedText = translation.choices[0].message.content.trim();

            console.log(`🌐 [${socket.id} → ${userId}] Translated: "${translatedText}"`);

            // Send translation to listener
            userInfo.socket.emit('translation', {
              originalText: transcribedText,
              translatedText: translatedText,
              fromLanguage: userLang.speak,
              toLanguage: listenerLang.listen,
              timestamp: new Date().toISOString()
            });

            // Also send to speaker for their display
            socket.emit('translationSent', {
              originalText: transcribedText,
              translatedText: translatedText,
              toLanguage: listenerLang.listen,
              timestamp: new Date().toISOString()
            });
          } else {
            // Same language, just forward transcription
            userInfo.socket.emit('transcription', {
              text: transcribedText,
              language: userLang.speak,
              isOriginal: false,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Clear buffer after processing
      audioData.buffer = [];

    } catch (error) {
      console.error('Audio processing error:', error);
    }
  }

  async handleTranslation(socket, data, callback) {
    const { text, targetLanguage } = data;
    const roomId = socket.roomId;

    if (!roomId) {
      callback({ success: false, error: 'Not in a room' });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    try {
      const userLang = room.userLanguages.get(socket.id);
      if (!userLang) {
        callback({ success: false, error: 'Language not set' });
        return;
      }

      // Translate text
      const translation = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Translate from ${userLang.speak} to ${targetLanguage}. Return only the translation.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 100
      });

      const translatedText = translation.choices[0].message.content.trim();

      callback({
        success: true,
        original: text,
        translation: translatedText
      });

      // Send to other user in room
      for (const [userId, userInfo] of room.users.entries()) {
        if (userId !== socket.id) {
          userInfo.socket.emit('manualTranslation', {
            originalText: text,
            translatedText: translatedText,
            fromLanguage: userLang.speak,
            toLanguage: targetLanguage,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error('Manual translation error:', error);
      callback({ success: false, error: 'Translation failed: ' + error.message });
    }
  }

  handleLeaveRoom(socket, data) {
    const roomId = socket.roomId;
    if (!roomId) return;

    console.log(`🚪 ${socket.id} leaving room ${roomId}`);
    this.cleanupUser(socket, roomId);
  }

  handleDisconnect(socket) {
    console.log(`❌ ${socket.id} disconnected`);

    const roomId = socket.roomId;
    if (roomId) {
      this.cleanupUser(socket, roomId);
    }

    // Cleanup audio buffer
    this.audioBuffers.delete(socket.id);
  }

  cleanupUser(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove user from room
    room.users.delete(socket.id);
    room.userLanguages.delete(socket.id);

    // Notify other users
    socket.to(roomId).emit('userLeft', {
      userId: socket.id,
      userCount: room.users.size
    });

    console.log(`👤 Removed ${socket.id} from room ${roomId}`);

    // Cleanup empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
    }
  }
}

// Create .env file with these variables:
// OPENAI_API_KEY=your_openai_api_key_here
// PORT=3000
// HOST=0.0.0.0

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not set in environment variables');
  console.warn('📝 Create a .env file with: OPENAI_API_KEY=your_key_here');
}

// Create and start server
const server = new TranslationServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  process.exit(0);
});

module.exports = TranslationServer;