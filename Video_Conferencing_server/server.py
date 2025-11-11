import asyncio
import base64
import io
import uuid
import os
from aiohttp import web
import socketio
import speech_recognition as sr
from gtts import gTTS
import logging

logger = logging.getLogger(__name__)

class ClientSession:
    def __init__(self, sid, user_id):
        self.sid = sid
        self.user_id = user_id
        self.source_language = 'en'
        self.target_language = 'es'
        self.connected_at = asyncio.get_event_loop().time()
        self.last_activity = asyncio.get_event_loop().time()

class VoiceTranslationServer:
    def __init__(self):
        # Initialize Socket.IO with CORS enabled
        self.sio = socketio.AsyncServer(
            async_mode='aiohttp',
            cors_allowed_origins="*"  # This handles CORS automatically
        )
        self.app = web.Application()
        self.sio.attach(self.app)
        self.sessions = {}
        self.recognizer = sr.Recognizer()
        
    async def initialize(self):
        """Initialize server components"""
        logger.info("Initializing server components...")
        
        # Create temp directory if it doesn't exist
        if not os.path.exists('temp_audio'):
            os.makedirs('temp_audio')
        
        # Setup routes (without manual CORS)
        self._setup_routes()
        self._setup_socket_handlers()
        
        logger.info("✅ Server components initialized")
    
    def create_app(self):
        return self.app
    
    def _setup_routes(self):
        """Setup HTTP routes without manual CORS"""
        self.app.router.add_get('/', self.handle_root)
        self.app.router.add_get('/health', self.handle_health)
        self.app.router.add_get('/languages', self.handle_get_languages)
        self.app.router.add_static('/audio', 'temp_audio')
    
    def _setup_socket_handlers(self):
        """Setup Socket.IO event handlers"""
        
        @self.sio.event
        async def connect(sid, environ):
            """Handle new client connection"""
            try:
                user_id = str(uuid.uuid4())
                session = ClientSession(sid, user_id)
                self.sessions[sid] = session
                
                logger.info(f"🔗 Client connected: {sid}")
                
                await self.sio.emit('connected', {
                    'userId': user_id,
                    'message': 'Connected successfully',
                    'supportedLanguages': self.get_supported_languages()
                }, room=sid)
                
            except Exception as e:
                logger.error(f"Connection error: {e}")
                return False
        
        @self.sio.event
        async def disconnect(sid):
            """Handle client disconnection"""
            if sid in self.sessions:
                session = self.sessions.pop(sid)
                logger.info(f"🔌 Client disconnected: {sid}")
        
        @self.sio.event
        async def set_languages(sid, data):
            """Handle language selection"""
            try:
                if sid not in self.sessions:
                    return
                
                session = self.sessions[sid]
                session.source_language = data.get('source', 'en')
                session.target_language = data.get('target', 'es')
                
                logger.info(f"🌐 Languages set: {session.source_language} -> {session.target_language}")
                
                await self.sio.emit('languages_updated', {
                    'source': session.source_language,
                    'target': session.target_language
                }, room=sid)
                
            except Exception as e:
                logger.error(f"Language setting error: {e}")
        
        @self.sio.event
        async def audio_data(sid, data):
            """Handle incoming audio data in WAV format"""
            try:
                if sid not in self.sessions:
                    return
                
                session = self.sessions[sid]
                session.last_activity = asyncio.get_event_loop().time()
                
                # Decode base64 audio data (expecting WAV format)
                audio_b64 = data.get('audio', '')
                if not audio_b64:
                    return
                
                audio_data = base64.b64decode(audio_b64)
                
                # Process audio directly
                text = await self._audio_to_text(audio_data, session.source_language)
                
                if text:
                    # Simple translation simulation
                    translated_text = f"Translated to {session.target_language}: {text}"
                    
                    # Send translation result
                    await self.sio.emit('translation_result', {
                        'originalText': text,
                        'translatedText': translated_text,
                        'sourceLang': session.source_language,
                        'targetLang': session.target_language
                    }, room=sid)
                    
                    # Generate speech
                    audio_url = await self._text_to_speech(translated_text, session.target_language, session.user_id)
                    
                    if audio_url:
                        await self.sio.emit('translated_audio', {
                            'audioUrl': audio_url,
                            'text': translated_text
                        }, room=sid)
                
            except Exception as e:
                logger.error(f"Audio processing error: {e}")
                await self.sio.emit('error', {'message': str(e)}, room=sid)
    
    async def _audio_to_text(self, audio_data: bytes, language: str):
        """Convert WAV audio data to text"""
        try:
            # Create a WAV file in memory
            audio_file = sr.AudioFile(io.BytesIO(audio_data))
            
            with audio_file as source:
                # Adjust for ambient noise
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                # Record audio
                audio = self.recognizer.record(source)
                # Recognize speech
                text = self.recognizer.recognize_google(audio, language=language)
                
                logger.info(f"🎯 Speech recognized: {text}")
                return text
                
        except sr.UnknownValueError:
            logger.debug("Could not understand audio")
            return None
        except sr.RequestError as e:
            logger.error(f"Speech recognition API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Audio processing error: {e}")
            return None
    
    async def _text_to_speech(self, text: str, language: str, user_id: str):
        """Convert text to speech"""
        try:
            tts = gTTS(text=text, lang=language, slow=False)
            filename = f"{user_id}_{uuid.uuid4().hex}.mp3"
            filepath = os.path.join('temp_audio', filename)
            tts.save(filepath)
            return f"/audio/{filename}"
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return None
    
    def get_supported_languages(self):
        return {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese'
        }
    
    # HTTP Route Handlers
    async def handle_root(self, request):
        return web.json_response({
            'service': 'Voice Translation Server',
            'status': 'running',
            'endpoints': ['/health', '/languages', '/ws']
        })
    
    async def handle_health(self, request):
        return web.json_response({
            'status': 'healthy',
            'sessions': len(self.sessions)
        })
    
    async def handle_get_languages(self, request):
        return web.json_response({
            'supported_languages': self.get_supported_languages()
        })
    
    async def cleanup(self):
        """Cleanup resources"""
        logger.info("Cleaning up...")
        self.sessions.clear()