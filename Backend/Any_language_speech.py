from gtts import gTTS
import playsound
import os
import tempfile
from typing import List

class MultiLanguageTTS:
    def __init__(self):
        """Initialize Google Text-to-Speech with multiple languages"""
        self.supported_languages = {
            'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
            'ko': 'Korean', 'zh-cn': 'Chinese', 'zh-tw': 'Chinese (Taiwan)',
            'hi': 'Hindi', 'ar': 'Arabic', 'bn': 'Bengali', 'nl': 'Dutch',
            'tr': 'Turkish', 'el': 'Greek', 'sv': 'Swedish', 'da': 'Danish',
            'fi': 'Finnish', 'no': 'Norwegian', 'pl': 'Polish', 'id': 'Indonesian',
            'ms': 'Malay', 'th': 'Thai', 'vi': 'Vietnamese', 'cs': 'Czech',
            'hu': 'Hungarian', 'ro': 'Romanian', 'sk': 'Slovak', 'uk': 'Ukrainian'
        }
    
    def get_supported_languages(self) -> List[str]:
        """Return list of supported language codes"""
        return list(self.supported_languages.keys())
    
    def speak(self, text: str, lang: str = 'en', slow: bool = False):
        """
        Convert text to speech and play it
        
        Args:
            text: Text to convert to speech
            lang: Language code (e.g., 'en', 'es', 'fr', 'hi')
            slow: Whether to speak slowly (useful for language learning)
        """
        if lang not in self.supported_languages:
            print(f"Language '{lang}' not supported. Using English.")
            lang = 'en'
        
        try:
            print(f"🗣️  Generating speech: '{text}' in {self.supported_languages[lang]}")
            
            # Create TTS object
            tts = gTTS(text=text, lang=lang, slow=slow)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
                temp_filename = tmp_file.name
            
            tts.save(temp_filename)
            
            # Play the audio
            playsound.playsound(temp_filename)
            
            # Clean up
            os.unlink(temp_filename)
            
            return True
            
        except Exception as e:
            print(f"Error generating speech: {e}")
            return False
    
    def save_to_file(self, text: str, lang: str = 'en', filename: str = "output.mp3", slow: bool = False):
        """Save TTS output to file"""
        try:
            tts = gTTS(text=text, lang=lang, slow=slow)
            tts.save(filename)
            print(f"💾 Saved to: {filename}")
            return True
        except Exception as e:
            print(f"Error saving file: {e}")
            return False

# Demo function
def demo_gtts():
    """Demonstrate Google TTS with multiple languages"""
    tts = MultiLanguageTTS()
    
    print("🎯 GOOGLE TTS MULTI-LANGUAGE DEMO")
    print("=" * 50)
    print(f"Supported languages: {len(tts.supported_languages)}")
    
    # Demo texts in different languages
    demos = [
        ('en', 'Hello, welcome to multilingual text to speech!'),
        ('es', 'Hola, bienvenido al texto a voz multilingüe!'),
        ('fr', 'Bonjour, bienvenue dans la synthèse vocale multilingue!'),
        ('de', 'Hallo, willkommen bei mehrsprachiger Text-zu-Sprache!'),
        ('hi', 'नमस्ते, बहुभाषी पाठ से वाक् में आपका स्वागत है!'),
        ('ja', 'こんにちは、多言語テキスト読み上げへようこそ！'),
        ('zh-cn', '你好，欢迎使用多语言文本转语音！'),
        ('ar', 'مرحبًا بك في تحويل النص إلى كلام متعدد اللغات!'),
        ('ru', 'Здравствуйте, добро пожаловать в многоязычное преобразование текста в речь!')
    ]
    
    for lang_code, text in demos:
        print(f"\n🔊 {tts.supported_languages[lang_code]}: {text}")
        tts.speak(text, lang_code)
        input("Press Enter for next...")

if __name__ == "__main__":
    demo_gtts()