// server.js
const mediasoup = require('mediasoup');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { networkInterfaces } = require('os');
const { SpeechClient } = require('@google-cloud/speech');
const { TranslationServiceClient } = require('@google-cloud/translate');
const textToSpeech = require('@google-cloud/text-to-speech');

class TranslationServer {
  constructor() {
    this.worker = null;
    this.rooms = new Map();
    this.roomPasswords = new Map();
    this.serverIp = this.getLocalIp();

    // Initialize Google Cloud clients
    this.initializeGoogleClients();

    this.setupServer();
  }

  getLocalIp() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  }

  initializeGoogleClients() {
    try {
      this.speechClient = new SpeechClient();
      this.translationClient = new TranslationServiceClient();
      this.ttsClient = new textToSpeech.TextToSpeechClient();
      console.log('✅ Google Cloud clients initialized');
    } catch (error) {
      console.log('⚠️ Google Cloud clients not available');
    }
  }

  async setupServer() {
    try {
      // Create mediasoup worker
      this.worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
      });

      console.log('✅ Mediasoup worker created');

      // Setup Express and HTTP server
      this.app = express();
      this.server = http.createServer(this.app);
      this.io = socketIo(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      });

      // Routes
      this.app.use(express.json());
      this.app.get('/health', (req, res) => {
        res.json({
          status: 'ok',
          ip: this.serverIp,
          rooms: this.rooms.size,
          totalUsers: Array.from(this.rooms.values()).reduce((acc, room) => acc + room.users.size, 0)
        });
      });

      this.app.get('/', (req, res) => {
        res.send(`
          <html>
            <head>
              <title>Translation Server</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f0f0f0; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #333; text-align: center; }
                .info { background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .ip-address { font-size: 24px; font-weight: bold; color: #2196F3; text-align: center; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🎥 Translation Server</h1>
                <div class="info">
                  <p>Server is running! Use this IP in your app:</p>
                  <div class="ip-address">${this.serverIp}:3000</div>
                </div>
                <p><strong>Active Rooms:</strong> ${this.rooms.size}</p>
                <p><strong>Total Users:</strong> ${Array.from(this.rooms.values()).reduce((acc, room) => acc + room.users.size, 0)}</p>
              </div>
            </body>
          </html>
        `);
      });

      // Setup socket handlers
      this.setupSocketHandlers();

      // Start server
      this.server.listen(3000, '0.0.0.0', () => {
        console.log('🚀 Translation Server running on port 3000');
        console.log(`📍 Local: http://localhost:3000`);
        console.log(`📱 Network: http://${this.serverIp}:3000`);
        console.log('🎯 Ready for video calls with real-time translation!');
      });

    } catch (error) {
      console.error('❌ Server setup failed:', error);
    }
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📱 User connected: ${socket.id}`);

      // Send server info
      socket.emit('server-ready', {
        ip: this.serverIp,
        message: 'Connected to translation server'
      });

      // Create a new room
      socket.on('create-room', async (data, callback) => {
        const { roomId, password, userLang = 'en-US', targetLang = 'es-ES' } = data;

        console.log(`🏠 Creating room: ${roomId}`);

        if (this.rooms.has(roomId)) {
          callback({ error: 'Room already exists' });
          return;
        }

        try {
          // Create new room
          const room = await this.createNewRoom(roomId);

          // Store password if provided
          if (password && password.trim() !== '') {
            this.roomPasswords.set(roomId, password.trim());
          }

          // Add creator to room
          await this.addUserToRoom(socket, room, userLang, targetLang, true);

          console.log(`✅ Room created: ${roomId} by ${socket.id}`);
          callback({
            success: true,
            roomId,
            message: 'Room created successfully'
          });

        } catch (error) {
          console.error('Error creating room:', error);
          callback({ error: 'Failed to create room' });
        }
      });

      // Join an existing room
      socket.on('join-room', async (data, callback) => {
        const { roomId, password, userLang = 'en-US', targetLang = 'es-ES' } = data;

        console.log(`🎯 Joining room: ${roomId}`);

        const room = this.rooms.get(roomId);
        if (!room) {
          callback({ error: 'Room does not exist' });
          return;
        }

        // Check if room is full
        if (room.users.size >= 2) {
          callback({ error: 'Room is full (max 2 users)' });
          return;
        }

        // Check password
        const roomPassword = this.roomPasswords.get(roomId);
        if (roomPassword && roomPassword !== password) {
          callback({ error: 'Invalid password' });
          return;
        }

        try {
          // Add user to room
          await this.addUserToRoom(socket, room, userLang, targetLang, false);

          callback({
            success: true,
            userCount: room.users.size,
            message: 'Joined room successfully'
          });

        } catch (error) {
          console.error('Error joining room:', error);
          callback({ error: 'Failed to join room' });
        }
      });

      // List available rooms
      socket.on('list-rooms', (callback) => {
        const roomList = Array.from(this.rooms.entries()).map(([roomId, room]) => ({
          roomId,
          userCount: room.users.size,
          hasPassword: this.roomPasswords.has(roomId),
          createdAt: room.createdAt
        }));

        callback({ rooms: roomList });
      });

      // Mediasoup transport creation
      socket.on('create-transport', async (data, callback) => {
        await this.handleCreateTransport(socket, data, callback);
      });

      socket.on('connect-transport', async (data, callback) => {
        await this.handleConnectTransport(socket, data, callback);
      });

      socket.on('produce', async (data, callback) => {
        await this.handleProduce(socket, data, callback);
      });

      socket.on('consume', async (data, callback) => {
        await this.handleConsume(socket, data, callback);
      });

      // WebRTC signaling
      socket.on('webrtc-offer', (data) => {
        socket.to(data.roomId).emit('webrtc-offer', {
          offer: data.offer,
          from: socket.id
        });
      });

      socket.on('webrtc-answer', (data) => {
        socket.to(data.targetUserId).emit('webrtc-answer', {
          answer: data.answer,
          from: socket.id
        });
      });

      socket.on('ice-candidate', (data) => {
        socket.to(data.targetUserId).emit('ice-candidate', {
          candidate: data.candidate,
          from: socket.id
        });
      });

      // Translation control
      socket.on('start-translation', () => {
        this.startTranslationForUser(socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async createNewRoom(roomId) {
    const room = {
      id: roomId,
      router: await this.worker.createRouter({
        mediaCodecs: [
          {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
          },
          {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000
          }
        ]
      }),
      users: new Map(),
      userLanguages: new Map(),
      createdAt: new Date(),
      createdBy: null
    };

    this.rooms.set(roomId, room);
    return room;
  }

  async addUserToRoom(socket, room, userLang, targetLang, isCreator = false) {
    // Add user to room
    room.users.set(socket.id, {
      socket,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      audioProcessor: null
    });

    room.userLanguages.set(socket.id, {
      speak: userLang,
      listen: targetLang
    });

    // Set creator if this is the room creator
    if (isCreator) {
      room.createdBy = socket.id;
    }

    socket.join(room.id);

    const userCount = room.users.size;
    console.log(`👤 ${socket.id} joined room ${room.id}. Users: ${userCount}/2`);

    // Send room info to user
    socket.emit('room-joined', {
      roomId: room.id,
      userCount,
      isCreator,
      rtpCapabilities: room.router.rtpCapabilities
    });

    // Notify other users in room
    if (userCount > 1) {
      socket.to(room.id).emit('user-joined', {
        userId: socket.id,
        userCount,
        userLang,
        targetLang
      });

      // Start call when 2 users are present
      socket.emit('start-call');
      socket.to(room.id).emit('start-call');

      console.log(`🎉 Room ${room.id} has 2 users - starting call!`);
    }
  }

  async handleCreateTransport(socket, data, callback) {
    const { roomId, direction } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    try {
      const transport = await room.router.createWebRtcTransport({
        listenIps: [{
          ip: '0.0.0.0',
          announcedIp: this.serverIp
        }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true
      });

      const userData = room.users.get(socket.id);
      if (userData) {
        userData.transports.set(direction, transport);
      }

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters
      });

    } catch (error) {
      console.error('Error creating transport:', error);
      callback({ error: 'Failed to create transport' });
    }
  }

  async handleConnectTransport(socket, data, callback) {
    const { roomId, transportId, dtlsParameters } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    try {
      const userData = room.users.get(socket.id);
      if (!userData) {
        callback({ error: 'User not found' });
        return;
      }

      // Find transport
      let transport;
      for (const [dir, t] of userData.transports) {
        if (t.id === transportId) {
          transport = t;
          break;
        }
      }

      if (!transport) {
        callback({ error: 'Transport not found' });
        return;
      }

      await transport.connect({ dtlsParameters });
      callback({ success: true });

    } catch (error) {
      console.error('Error connecting transport:', error);
      callback({ error: 'Failed to connect transport' });
    }
  }

  async handleProduce(socket, data, callback) {
    const { roomId, transportId, kind, rtpParameters } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    try {
      const userData = room.users.get(socket.id);
      if (!userData) {
        callback({ error: 'User not found' });
        return;
      }

      // Find transport
      let transport;
      for (const [dir, t] of userData.transports) {
        if (t.id === transportId) {
          transport = t;
          break;
        }
      }

      if (!transport) {
        callback({ error: 'Transport not found' });
        return;
      }

      const producer = await transport.produce({
        kind,
        rtpParameters
      });

      userData.producers.set(producer.id, producer);

      console.log(`🎯 ${socket.id} produced ${kind} stream: ${producer.id}`);

      // Start speech recognition if it's audio
      if (kind === 'audio' && this.speechClient) {
        this.startSpeechRecognition(socket, room, producer);
      }

      // Notify other users about new producer
      socket.to(roomId).emit('new-producer', {
        producerId: producer.id,
        kind: producer.kind,
        userId: socket.id
      });

      callback({ id: producer.id });

    } catch (error) {
      console.error('Error producing:', error);
      callback({ error: 'Failed to produce' });
    }
  }

  async handleConsume(socket, data, callback) {
    const { roomId, producerId, rtpCapabilities } = data;
    const room = this.rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    try {
      const userData = room.users.get(socket.id);
      if (!userData) {
        callback({ error: 'User not found' });
        return;
      }

      // Find recv transport
      const recvTransport = userData.transports.get('recv');
      if (!recvTransport) {
        callback({ error: 'Receive transport not found' });
        return;
      }

      // Check if can consume
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        callback({ error: 'Cannot consume this producer' });
        return;
      }

      const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: false
      });

      userData.consumers.set(consumer.id, consumer);

      console.log(`🎯 ${socket.id} consuming ${consumer.kind} from ${producerId}`);

      callback({
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters
      });

    } catch (error) {
      console.error('Error consuming:', error);
      callback({ error: 'Failed to consume' });
    }
  }

  async startSpeechRecognition(socket, room, audioProducer) {
    if (!this.speechClient) return;

    try {
      console.log(`🎤 Starting speech recognition for ${socket.id}`);

      const userLang = room.userLanguages.get(socket.id);
      if (!userLang) return;

      const recognitionStream = this.speechClient
        .streamingRecognize({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: userLang.speak,
          },
          interimResults: true,
        })
        .on('data', (data) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            const transcript = data.results[0].alternatives[0].transcript;
            const isFinal = data.results[0].isFinal;

            console.log(`🗣️ [${socket.id}] ${transcript}`);

            // Send transcript to client
            socket.emit('speech-transcript', {
              transcript,
              isFinal,
              language: userLang.speak
            });

            // Start translation for final transcripts
            if (isFinal && transcript.trim().length > 0) {
              this.processTranslation(socket, room, transcript);
            }
          }
        })
        .on('error', (error) => {
          console.error('Speech recognition error:', error);
        });

      // Store processor
      const userData = room.users.get(socket.id);
      if (userData) {
        userData.audioProcessor = recognitionStream;
      }

    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }

  async processTranslation(socket, room, originalText) {
    if (!this.translationClient) return;

    try {
      const speakerLang = room.userLanguages.get(socket.id);
      if (!speakerLang) return;

      console.log(`🌐 Translating: "${originalText}"`);

      // Send original text to speaker
      socket.emit('original-speech', {
        text: originalText,
        language: speakerLang.speak
      });

      // Translate for each listener
      for (const [listenerId, userData] of room.users.entries()) {
        if (listenerId !== socket.id) {
          const listenerLang = room.userLanguages.get(listenerId);

          try {
            const [translationResponse] = await this.translationClient.translateText({
              contents: [originalText],
              sourceLanguageCode: speakerLang.speak.split('-')[0],
              targetLanguageCode: listenerLang.listen.split('-')[0],
              parent: 'projects/your-project-id'
            });

            const translatedText = translationResponse.translations[0].translatedText;

            console.log(`✅ Translated: "${translatedText}"`);

            // Send translated text to listener
            userData.socket.emit('translated-text', {
              originalText,
              translatedText,
              fromLanguage: speakerLang.speak,
              toLanguage: listenerLang.listen
            });

          } catch (translationError) {
            console.error('Translation error:', translationError);
          }
        }
      }

    } catch (error) {
      console.error('Error in translation process:', error);
    }
  }

  startTranslationForUser(socket) {
    console.log(`🎯 Starting translation for ${socket.id}`);
  }

  handleDisconnect(socket) {
    console.log(`❌ User disconnected: ${socket.id}`);

    // Cleanup user from all rooms
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socket.id)) {
        const userData = room.users.get(socket.id);

        // Cleanup resources
        if (userData.audioProcessor) {
          userData.audioProcessor.end();
        }

        userData.transports.forEach(transport => transport.close());
        userData.producers.forEach(producer => producer.close());
        userData.consumers.forEach(consumer => consumer.close());

        room.users.delete(socket.id);
        room.userLanguages.delete(socket.id);

        // Notify other users
        socket.to(roomId).emit('user-left', { userId: socket.id });

        console.log(`👤 Removed ${socket.id} from room ${roomId}`);

        // Cleanup empty rooms
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
          this.roomPasswords.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
        break;
      }
    }
  }
}

// Start server
const server = new TranslationServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down translation server...');
  process.exit(0);
});

module.exports = TranslationServer;