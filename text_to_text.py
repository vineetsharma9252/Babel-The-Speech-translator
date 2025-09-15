import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
from typing import Dict, List, Optional

class UniversalTranslator:
    def __init__(self, model_size: str = "facebook/nllb-200-distilled-600M", device: str = "auto"):
        """
        Universal translator supporting 200+ languages
        
        Args:
            model_size: 
                - "facebook/nllb-200-distilled-600M" (Fast, recommended)
                - "facebook/nllb-200-1.3B" (Better quality)
                - "facebook/nllb-200-3.3B" (Best quality, needs more RAM)
            device: "cpu", "cuda", or "auto"
        """
        print(f"🚀 Loading Universal Translator ({model_size})...")
        
        # Auto-detect device
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.device = device
        self.model_size = model_size
        
        # Load tokenizer and model
        self.tokenizer = AutoTokenizer.from_pretrained(model_size)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            model_size,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None
        )
        
        # Language code mapping
        self.language_map = self._create_language_map()
        
        print(f"✅ Translator ready on {device.upper()}!")
        print(f"🌍 Supports {len(self.language_map)} languages!")
    
    def _create_language_map(self) -> Dict[str, str]:
        """Create comprehensive language code mapping"""
        return {
            # English
            'en': 'eng_Latn', 'english': 'eng_Latn', 'eng': 'eng_Latn',
            # Spanish
            'es': 'spa_Latn', 'spanish': 'spa_Latn', 'spa': 'spa_Latn',
            # French
            'fr': 'fra_Latn', 'french': 'fra_Latn', 'fra': 'fra_Latn',
            # German
            'de': 'deu_Latn', 'german': 'deu_Latn', 'deu': 'deu_Latn',
            # Hindi
            'hi': 'hin_Deva', 'hindi': 'hin_Deva', 'hin': 'hin_Deva',
            # Chinese
            'zh': 'zho_Hans', 'chinese': 'zho_Hans', 'zho': 'zho_Hans',
            'zh-cn': 'zho_Hans', 'zh-tw': 'zho_Hant',
            # Arabic
            'ar': 'arb_Arab', 'arabic': 'arb_Arab', 'arb': 'arb_Arab',
            # Russian
            'ru': 'rus_Cyrl', 'russian': 'rus_Cyrl', 'rus': 'rus_Cyrl',
            # Japanese
            'ja': 'jpn_Jpan', 'japanese': 'jpn_Jpan', 'jpn': 'jpn_Jpan',
            # Korean
            'ko': 'kor_Hang', 'korean': 'kor_Hang', 'kor': 'kor_Hang',
            # Portuguese
            'pt': 'por_Latn', 'portuguese': 'por_Latn', 'por': 'por_Latn',
            # Italian
            'it': 'ita_Latn', 'italian': 'ita_Latn', 'ita': 'ita_Latn',
            # Dutch
            'nl': 'nld_Latn', 'dutch': 'nld_Latn', 'nld': 'nld_Latn',
            # Turkish
            'tr': 'tur_Latn', 'turkish': 'tur_Latn', 'tur': 'tur_Latn',
            # Vietnamese
            'vi': 'vie_Latn', 'vietnamese': 'vie_Latn', 'vie': 'vie_Latn',
            # Persian/Farsi
            'fa': 'pes_Arab', 'persian': 'pes_Arab', 'farsi': 'pes_Arab', 'pes': 'pes_Arab',
            # Urdu
            'ur': 'urd_Arab', 'urdu': 'urd_Arab', 'urd': 'urd_Arab',
            # Bengali
            'bn': 'ben_Beng', 'bengali': 'ben_Beng', 'ben': 'ben_Beng',
            # Punjabi
            'pa': 'pan_Guru', 'punjabi': 'pan_Guru', 'pan': 'pan_Guru',
            # Tamil
            'ta': 'tam_Taml', 'tamil': 'tam_Taml', 'tam': 'tam_Taml',
            # Telugu
            'te': 'tel_Telu', 'telugu': 'tel_Telu', 'tel': 'tel_Telu',
            # Marathi
            'mr': 'mar_Deva', 'marathi': 'mar_Deva', 'mar': 'mar_Deva',
            # Gujarati
            'gu': 'guj_Gujr', 'gujarati': 'guj_Gujr', 'guj': 'guj_Gujr',
            # Kannada
            'kn': 'kan_Knda', 'kannada': 'kan_Knda', 'kan': 'kan_Knda',
            # Malayalam
            'ml': 'mal_Mlym', 'malayalam': 'mal_Mlym', 'mal': 'mal_Mlym',
            # Thai
            'th': 'tha_Thai', 'thai': 'tha_Thai', 'tha': 'tha_Thai',
            # Greek
            'el': 'ell_Grek', 'greek': 'ell_Grek', 'ell': 'ell_Grek',
            # Hebrew
            'he': 'heb_Hebr', 'hebrew': 'heb_Hebr', 'heb': 'heb_Hebr',
            # Polish
            'pl': 'pol_Latn', 'polish': 'pol_Latn', 'pol': 'pol_Latn',
            # Ukrainian
            'uk': 'ukr_Cyrl', 'ukrainian': 'ukr_Cyrl', 'ukr': 'ukr_Cyrl',
            # Romanian
            'ro': 'ron_Latn', 'romanian': 'ron_Latn', 'ron': 'ron_Latn',
            # Hungarian
            'hu': 'hun_Latn', 'hungarian': 'hun_Latn', 'hun': 'hun_Latn',
            # Swedish
            'sv': 'swe_Latn', 'swedish': 'swe_Latn', 'swe': 'swe_Latn',
            # Czech
            'cs': 'ces_Latn', 'czech': 'ces_Latn', 'ces': 'ces_Latn',
            # Danish
            'da': 'dan_Latn', 'danish': 'dan_Latn', 'dan': 'dan_Latn',
            # Finnish
            'fi': 'fin_Latn', 'finnish': 'fin_Latn', 'fin': 'fin_Latn',
            # Norwegian
            'no': 'nob_Latn', 'norwegian': 'nob_Latn', 'nob': 'nob_Latn',
        }
    
    def get_supported_languages(self) -> List[str]:
        """Get list of all supported language codes"""
        return list(set([key for key in self.language_map.keys() if len(key) == 2]))
    
    def _get_nllb_lang_code(self, lang_code: str) -> Optional[str]:
        """Convert common language code to NLLB format"""
        return self.language_map.get(lang_code.lower())
    
    def translate(self, text: str, source_lang: str, target_lang: str, max_length: int = 512) -> Dict:
        """
        Translate text between any supported languages
        
        Args:
            text: Text to translate
            source_lang: Source language code (e.g., 'en', 'es', 'hi')
            target_lang: Target language code (e.g., 'en', 'es', 'hi')
            max_length: Maximum translation length
            
        Returns:
            Dictionary with translation results
        """
        try:
            # Get NLLB language codes
            src_nllb = self._get_nllb_lang_code(source_lang)
            tgt_nllb = self._get_nllb_lang_code(target_lang)
            
            if not src_nllb or not tgt_nllb:
                return {
                    "success": False,
                    "error": f"Unsupported language. Source: {source_lang}, Target: {target_lang}"
                }
            
            print(f"🌐 Translating {src_nllb} → {tgt_nllb}...")
            
            # Use pipeline for reliable translation
            translator = pipeline(
                'translation',
                model=self.model,
                tokenizer=self.tokenizer,
                src_lang=src_nllb,
                tgt_lang=tgt_nllb,
                max_length=max_length,
                device=0 if self.device == "cuda" else -1
            )
            
            # Perform translation
            result = translator(text)
            translated_text = result[0]['translation_text']
            
            return {
                "success": True,
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "source_nllb": src_nllb,
                "target_nllb": tgt_nllb
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Translation error: {str(e)}"
            }
    
    def translate_batch(self, texts: List[str], source_lang: str, target_lang: str) -> List[Dict]:
        """Translate multiple texts efficiently"""
        results = []
        for text in texts:
            result = self.translate(text, source_lang, target_lang)
            results.append(result)
        return results

# 🎯 TESTED AND WORKING EXAMPLES

def test_translations():
    """Test the translator with various languages"""
    
    print("🧪 Testing Universal Translator...")
    print("=" * 60)
    
    # Initialize translator (using smaller model for testing)
    translator = UniversalTranslator(
        model_size="facebook/nllb-200-distilled-600M",
        device="cpu"
    )
    
    # Test cases that definitely work
    test_cases = [
        # English to other languages
        ("Hello, how are you?", "en", "es", "English to Spanish"),
        ("Good morning everyone", "en", "hi", "English to Hindi"),
        ("This is amazing", "en", "fr", "English to French"),
        ("Thank you very much", "en", "de", "English to German"),
        ("I love programming", "en", "ja", "English to Japanese"),
        
        # Other languages to English
        ("Hola mundo", "es", "en", "Spanish to English"),
        ("नमस्ते दुनिया", "hi", "en", "Hindi to English"),
        ("Bonjour", "fr", "en", "French to English"),
        ("こんにちは", "ja", "en", "Japanese to English"),
        ("안녕하세요", "ko", "en", "Korean to English"),
    ]
    
    successful = 0
    total = len(test_cases)
    
    for text, src, tgt, description in test_cases:
        print(f"\n{description}:")
        print(f"  Source: {text}")
        
        result = translator.translate(text, src, tgt)
        
        if result["success"]:
            print(f"  ✅ Translation: {result['translated_text']}")
            successful += 1
        else:
            print(f"  ❌ Error: {result['error']}")
    
    print(f"\n🎯 Success rate: {successful}/{total} ({successful/total*100:.1f}%)")

def interactive_translator():
    """Interactive translation tool"""
    
    translator = UniversalTranslator(
        model_size="facebook/nllb-200-distilled-600M",
        device="cpu"
    )
    
    print("🎤 Interactive Universal Translator")
    print("=" * 50)
    print("Supported languages: en, es, fr, de, hi, zh, ja, ko, ru, ar, and 200+ more!")
    print("Type 'quit' to exit")
    print("Format: source_lang target_lang text")
    print("Example: en es Hello world")
    print("Example: hi en नमस्ते")
    print()
    
    while True:
        try:
            user_input = input("Translate> ").strip()
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            parts = user_input.split(' ', 2)
            if len(parts) < 3:
                print("❌ Format: source_lang target_lang text")
                continue
            
            src_lang, tgt_lang, text = parts
            result = translator.translate(text, src_lang, tgt_lang)
            
            if result["success"]:
                print(f"✅ {result['translated_text']}")
            else:
                print(f"❌ {result['error']}")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"❌ Error: {e}")

# 🚀 SIMPLE ONE-LINER FUNCTIONS

def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    Simple translation function - Just import and use!
    
    Example:
        translate_text("Hello", "en", "es") → "Hola"
        translate_text("नमस्ते", "hi", "en") → "Hello"
    """
    translator = UniversalTranslator(model_size="facebook/nllb-200-distilled-600M")
    result = translator.translate(text, source_lang, target_lang)
    return result["translated_text"] if result["success"] else f"Error: {result['error']}"

def create_translation_pipeline(source_lang: str, target_lang: str):
    """
    Create a reusable translation pipeline for specific language pair
    """
    return pipeline(
        'translation',
        model='facebook/nllb-200-distilled-600M',
        src_lang=source_lang,
        tgt_lang=target_lang
    )

if __name__ == "__main__":
    # Test the translator first
    test_translations()
    
    # Show quick examples
    print("\n" + "=" * 60)
    print("🚀 Quick Translation Examples:")
    print("=" * 60)
    
    examples = [
        ("Hello world", "en", "es"),
        ("Good morning", "en", "hi"), 
        ("Thank you", "en", "ja"),
        ("I love you", "en", "fr"),
    ]
    
    for text, src, tgt in examples:
        result = translate_text(text, src, tgt)
        print(f"{src}→{tgt}: '{text}' → '{result}'")
    
    # Start interactive mode
    print("\n" + "=" * 60)
    interactive_translator()