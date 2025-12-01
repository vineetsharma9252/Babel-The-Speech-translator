// server.js
const mediasoup = require('mediasoup');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { OpenAI } = require('openai');
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const { Readable } = require('stream');

class TranslationServer {
  constructor() {
    this.worker = null;
    this.rooms = new Map();
    this.audioBuffers = new Map(); // socketId -> audio buffer

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: "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"
    });

    console.log('✅ OpenAI initialized');
    this.setupServer();
  }

  async setupServer() {
    try {
      // Create Mediasoup worker
      this.worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: 10000,
        rtcMaxPort: 20000,
      });

      console.log('✅ Mediasoup worker created');

      // Setup Express server
      this.app = express();
      this.server = http.createServer(this.app);

      // Setup Socket.io
      this.io = socketIo(this.server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"],
        },
        transports: ['websocket', 'polling']
      });

      // Middleware
      this.app.use(express.json());
      this.app.use(express.static('public'));

      // Routes
      this.setupRoutes();

      // Socket handlers
      this.setupSocketHandlers();

      // Start server
      const PORT = process.env.PORT || 3000;
      this.server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🌐 Access at: http://localhost:${PORT}`);
        console.log('🎯 Ready with OpenAI Whisper translation!');
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
              <p><a href="/health">Health Check</a></p>
            </div>
          </div>
        </body>
        </html>
      `);
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📱 User connected: ${socket.id}`);

      // Send welcome message
      socket.emit('connected', {
        socketId: socket.id,
        message: 'Connected to translation server',
        translationEnabled: !!process.env.OPENAI_API_KEY
      });

      // Create or join room
      socket.on('create-or-join', async (data, callback) => {
        await this.handleCreateOrJoin(socket, data, callback);
      });

      // Get router capabilities
      socket.on('getRouterRtpCapabilities', (data, callback) => {
        this.handleGetRouterCapabilities(socket, data, callback);
      });

      // Create WebRTC transport
      socket.on('createTransport', async (data, callback) => {
        await this.handleCreateTransport(socket, data, callback);
      });

      // Connect transport
      socket.on('connectTransport', async (data, callback) => {
        await this.handleConnectTransport(socket, data, callback);
      });

      // Produce media
      socket.on('produce', async (data, callback) => {
        await this.handleProduce(socket, data, callback);
      });

      // Consume media
      socket.on('consume', async (data, callback) => {
        await this.handleConsume(socket, data, callback);
      });

      // Send audio data for translation
      socket.on('audioData', (data) => {
        this.handleAudioData(socket, data);
      });

      // Request translation
      socket.on('translate', async (data, callback) => {
        await this.handleTranslation(socket, data, callback);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  async handleCreateOrJoin(socket, data, callback) {
    const { roomId, userLang = 'en', targetLang = 'es' } = data;

    console.log(`🎯 ${socket.id} joining room: ${roomId} (${userLang} → ${targetLang})`);

    try {
      let room = this.rooms.get(roomId);

      if (!room) {
        // Create new room
        room = {
          id: roomId,
          router: await this.worker.createRouter({
            mediaCodecs: [
              {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2,
              },
              {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
              }
            ]
          }),
          users: new Map(),
          transports: new Map(),
          producers: new Map(),
          consumers: new Map(),
          userLanguages: new Map()
        };
        this.rooms.set(roomId, room);
        console.log(`✅ Room created: ${roomId}`);
      }

      // Check if room is full (max 2 users)
      if (room.users.size >= 2) {
        callback({ error: 'Room is full (max 2 users)' });
        return;
      }

      // Add user to room
      room.users.set(socket.id, socket);
      room.userLanguages.set(socket.id, {
        speak: userLang,
        listen: targetLang
      });

      socket.join(roomId);
      socket.roomId = roomId;

      const userCount = room.users.size;
      console.log(`👥 Room ${roomId} now has ${userCount}/2 users`);

      // Send success response
      callback({
        success: true,
        roomId,
        userCount,
        isCreator: userCount === 1,
        routerRtpCapabilities: room.router.rtpCapabilities
      });

      // Notify other users
      if (userCount > 1) {
        socket.to(roomId).emit('userJoined', {
          userId: socket.id,
          userCount,
          userLang,
          targetLang
        });

        // Notify both users to start
        socket.emit('startCall');
        socket.to(roomId).emit('startCall');

        console.log(`🎉 Call started in room ${roomId}!`);
      }

    } catch (error) {
      console.error('Error creating/joining room:', error);
      callback({ error: 'Failed to join room' });
    }
  }

  handleGetRouterCapabilities(socket, data, callback) {
    const { roomId } = data;
    const room = this.rooms.get(roomId);

    if (room) {
      callback({ rtpCapabilities: room.router.rtpCapabilities });
    } else {
      callback({ error: 'Room not found' });
    }
  }

  async handleCreateTransport(socket, data, callback) {
    const { roomId, direction } = data; // 'send' or 'recv'
    const room = this.rooms.get(roomId);

    if (!room) {
      callback({ error: 'Room not found' });
      return;
    }

    try {
      const transport = await room.router.createWebRtcTransport({
        listenIps: [{ ip: '0.0.0.0', announcedIp: null }],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
      });

      if (!room.transports.has(socket.id)) {
        room.transports.set(socket.id, new Map());
      }
      room.transports.get(socket.id).set(direction, transport);

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
      const userTransports = room.transports.get(socket.id);
      if (!userTransports) {
        callback({ error: 'User transports not found' });
        return;
      }

      // Find the transport
      let transport;
      for (const [direction, t] of userTransports) {
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
      const userTransports = room.transports.get(socket.id);
      if (!userTransports) {
        callback({ error: 'User transports not found' });
        return;
      }

      // Find the transport
      let transport;
      for (const [direction, t] of userTransports) {
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

      if (!room.producers.has(socket.id)) {
        room.producers.set(socket.id, new Map());
      }
      room.producers.get(socket.id).set(producer.id, producer);

      console.log(`🎯 ${socket.id} produced ${kind}: ${producer.id}`);

      // Setup audio processing for audio producers
      if (kind === 'audio') {
        this.setupAudioProcessing(socket, producer);
      }

      // Notify other users in the room
      socket.to(roomId).emit('newProducer', {
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
      const userTransports = room.transports.get(socket.id);
      if (!userTransports) {
        callback({ error: 'User transports not found' });
        return;
      }

      const recvTransport = userTransports.get('recv');
      if (!recvTransport) {
        callback({ error: 'Receive transport not found' });
        return;
      }

      // Check if can consume
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        callback({ error: 'Cannot consume' });
        return;
      }

      const consumer = await recvTransport.consume({
        producerId,
        rtpCapabilities,
        paused: false
      });

      if (!room.consumers.has(socket.id)) {
        room.consumers.set(socket.id, new Map());
      }
      room.consumers.get(socket.id).set(consumer.id, consumer);

      console.log(`🎯 ${socket.id} consuming ${consumer.kind}: ${consumer.id}`);

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

  setupAudioProcessing(socket, audioProducer) {
    console.log(`🎤 Setting up audio processing for ${socket.id}`);

    // Create audio buffer for this user
    this.audioBuffers.set(socket.id, {
      buffer: [],
      lastTranslationTime: Date.now(),
      isProcessing: false
    });

    // Periodically process audio for translation
    const translationInterval = setInterval(async () => {
      const audioData = this.audioBuffers.get(socket.id);
      if (!audioData || audioData.buffer.length === 0 || audioData.isProcessing) {
        return;
      }

      // Process every 3 seconds or when buffer is large enough
      if (Date.now() - audioData.lastTranslationTime > 3000 && audioData.buffer.length > 100) {
        audioData.isProcessing = true;

        try {
          // Convert buffer to WAV format for Whisper
          const audioBuffer = Buffer.concat(audioData.buffer);

          // Send for translation
          const room = this.rooms.get(socket.roomId);
          if (room) {
            const userLang = room.userLanguages.get(socket.id);
            if (userLang) {
              await this.transcribeAndTranslate(socket, audioBuffer, userLang.speak, room);
            }
          }

          // Clear buffer
          audioData.buffer = [];
          audioData.lastTranslationTime = Date.now();

        } catch (error) {
          console.error('Audio processing error:', error);
        } finally {
          audioData.isProcessing = false;
        }
      }
    }, 1000);

    // Clean up interval on disconnect
    socket.on('disconnect', () => {
      clearInterval(translationInterval);
      this.audioBuffers.delete(socket.id);
    });
  }

  handleAudioData(socket, data) {
    const { audioChunk } = data;
    const audioData = this.audioBuffers.get(socket.id);

    if (audioData && audioChunk) {
      // Convert base64 to buffer
      const buffer = Buffer.from(audioChunk, 'base64');
      audioData.buffer.push(buffer);
    }
  }

  async transcribeAndTranslate(socket, audioBuffer, sourceLanguage, room) {
    try {
      console.log(`🎤 Transcribing audio from ${socket.id}...`);

      // Convert audio buffer to a stream
      const audioStream = new PassThrough();
      audioStream.end(audioBuffer);

      // Transcribe using OpenAI Whisper
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        language: sourceLanguage,
        response_format: "text"
      });

      const transcribedText = transcription.text.trim();
      if (!transcribedText) return;

      console.log(`🗣️ [${socket.id}] "${transcribedText}"`);

      // Send original transcription to speaker
      socket.emit('transcription', {
        text: transcribedText,
        language: sourceLanguage,
        isOriginal: true
      });

      // Translate for each listener
      for (const [listenerId, listenerSocket] of room.users.entries()) {
        if (listenerId !== socket.id) {
          const listenerLang = room.userLanguages.get(listenerId);

          if (listenerLang && listenerLang.listen !== sourceLanguage) {
            await this.translateText(socket, listenerSocket, transcribedText, sourceLanguage, listenerLang.listen);
          } else {
            // Same language, just forward the transcription
            listenerSocket.emit('transcription', {
              text: transcribedText,
              language: sourceLanguage,
              isOriginal: false
            });
          }
        }
      }

    } catch (error) {
      console.error('Transcription error:', error);
    }
  }

  async translateText(speakerSocket, listenerSocket, text, sourceLang, targetLang) {
    try {
      console.log(`🌐 Translating "${text}" from ${sourceLang} to ${targetLang}`);

      const translation = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the following text from ${sourceLang} to ${targetLang}. Only return the translation.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 100
      });

      const translatedText = translation.choices[0].message.content.trim();

      console.log(`✅ Translated: "${translatedText}"`);

      // Send translation to listener
      listenerSocket.emit('translation', {
        originalText: text,
        translatedText: translatedText,
        fromLanguage: sourceLang,
        toLanguage: targetLang
      });

      // Also send to speaker for display
      speakerSocket.emit('translationSent', {
        originalText: text,
        translatedText: translatedText,
        toLanguage: targetLang
      });

    } catch (error) {
      console.error('Translation error:', error);
    }
  }

  async handleTranslation(socket, data, callback) {
    const { text, targetLanguage } = data;

    try {
      const room = this.rooms.get(socket.roomId);
      if (!room) {
        callback({ error: 'Not in a room' });
        return;
      }

      const userLang = room.userLanguages.get(socket.id);
      if (!userLang) {
        callback({ error: 'Language not set' });
        return;
      }

      const translation = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Translate from ${userLang.speak} to ${targetLanguage}. Only return the translation.`
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
      for (const [userId, userSocket] of room.users.entries()) {
        if (userId !== socket.id) {
          userSocket.emit('manualTranslation', {
            originalText: text,
            translatedText: translatedText,
            fromLanguage: userLang.speak,
            toLanguage: targetLanguage
          });
        }
      }

    } catch (error) {
      console.error('Manual translation error:', error);
      callback({ error: 'Translation failed' });
    }
  }

  handleDisconnect(socket) {
    console.log(`❌ User disconnected: ${socket.id}`);

    const roomId = socket.roomId;
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Cleanup user data
    room.users.delete(socket.id);
    room.userLanguages.delete(socket.id);

    // Cleanup transports
    const userTransports = room.transports.get(socket.id);
    if (userTransports) {
      userTransports.forEach(transport => transport.close());
      room.transports.delete(socket.id);
    }

    // Cleanup producers
    const userProducers = room.producers.get(socket.id);
    if (userProducers) {
      userProducers.forEach(producer => producer.close());
      room.producers.delete(socket.id);
    }

    // Cleanup consumers
    const userConsumers = room.consumers.get(socket.id);
    if (userConsumers) {
      userConsumers.forEach(consumer => consumer.close());
      room.consumers.delete(socket.id);
    }

    // Notify other users
    socket.to(roomId).emit('userLeft', { userId: socket.id });

    console.log(`👤 Removed ${socket.id} from room ${roomId}`);

    // Cleanup empty rooms
    if (room.users.size === 0) {
      this.rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted`);
    }
  }
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