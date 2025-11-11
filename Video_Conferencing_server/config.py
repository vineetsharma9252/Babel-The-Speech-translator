import os
from dataclasses import dataclass, field
from typing import Dict, List

@dataclass
class Config:
    """Server configuration"""
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8080"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS settings
    CORS_ORIGINS: List[str] = field(default_factory=lambda: [
        "http://localhost:3000",
        "http://localhost:19006",
        "exp://*",
    ])
    
    # Audio processing settings
    SAMPLE_RATE: int = 16000
    CHUNK_SIZE: int = 1024
    MAX_AUDIO_LENGTH: int = 30
    SILENCE_THRESHOLD: float = 0.01
    
    # Translation settings
    DEFAULT_SOURCE_LANG: str = "en"
    DEFAULT_TARGET_LANG: str = "es"
    TRANSLATION_TIMEOUT: int = 10
    
    # WebSocket settings
    WS_HEARTBEAT_INTERVAL: int = 30
    WS_MAX_CONNECTIONS: int = 100
    
    # File storage - FIXED: Ensure directory is created
    TEMP_AUDIO_DIR: str = "temp_audio"
    MAX_TEMP_FILES: int = 1000
    
    # Performance settings
    MAX_CONCURRENT_TRANSLATIONS: int = 10
    AUDIO_BUFFER_SIZE: int = 44100 * 5
    
    @classmethod
    def validate(cls):
        """Validate and create necessary directories"""
        print(f"🔧 Validating configuration...")
        
        # Create temp_audio directory if it doesn't exist
        if not os.path.exists(cls.TEMP_AUDIO_DIR):
            print(f"📁 Creating directory: {cls.TEMP_AUDIO_DIR}")
            os.makedirs(cls.TEMP_AUDIO_DIR, exist_ok=True)
        
        # Create logs directory if it doesn't exist
        logs_dir = "logs"
        if not os.path.exists(logs_dir):
            print(f"📁 Creating directory: {logs_dir}")
            os.makedirs(logs_dir, exist_ok=True)
        
        # Validate port
        if cls.PORT < 1 or cls.PORT > 65535:
            raise ValueError(f"Invalid port: {cls.PORT}")
        
        print(f"✅ Configuration validated successfully")
        print(f"   - Temp audio directory: {os.path.abspath(cls.TEMP_AUDIO_DIR)}")
        print(f"   - Server will run on: http://{cls.HOST}:{cls.PORT}")
    
    @classmethod
    def get_supported_languages(cls) -> Dict[str, str]:
        """Get supported languages for translation"""
        return {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'ja': 'Japanese',
            'ko': 'Korean',
            'zh': 'Chinese',
            'hi': 'Hindi',
            'ar': 'Arabic',
            'tr': 'Turkish',
            'nl': 'Dutch',
            'pl': 'Polish',
            'sv': 'Swedish',
            'da': 'Danish',
            'fi': 'Finnish',
            'no': 'Norwegian',
            'cs': 'Czech',
            'hu': 'Hungarian',
            'ro': 'Romanian',
            'el': 'Greek',
            'he': 'Hebrew',
        }