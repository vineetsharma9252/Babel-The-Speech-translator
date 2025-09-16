import torch
from faster_whisper import WhisperModel
import sounddevice as sd
import numpy as np
import wave
import tempfile
import os
import time
from typing import List, Optional, Dict
from queue import Queue
import threading

class BestVoiceToText:
    def __init__(self, model_size: str = "large-v3", device: str = "auto", compute_type: str = "float32"):
        """
        Initialize the best voice-to-text system using Whisper Large v3
        
        Args:
            model_size: "tiny", "base", "small", "medium", "large-v3" (BEST)
            device: "cpu", "cuda", or "auto"
            compute_type: "float16", "float32", "int8"
        """
        print(f"🚀 Loading Whisper {model_size} - The Best Speech Recognition Model...")
        
        # Set device automatically if not specified
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        self.model = WhisperModel(
            model_size,
            device=device,
            compute_type=compute_type,
            download_root="./whisper_models"  # Custom download location
        )
        
        self.device = device
        self.sample_rate = 16000  # Whisper's required sample rate
        self.channels = 1
        self.is_recording = False
        self.audio_queue = Queue()
        
        print(f"✅ Whisper {model_size} loaded on {device.upper()}!")
        print("🌍 Supports 99+ languages including: English, Hindi, Spanish, French, Chinese, Japanese, etc.")
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model"""
        return {
            "model": "Whisper",
            "size": "large-v3",
            "device": self.device,
            "languages_supported": "99+ languages",
            "sample_rate": self.sample_rate,
            "features": ["Speech Recognition", "Translation", "Language Detection"]
        }
    
    def record_audio(self, duration: float = 5.0, output_path: Optional[str] = None) -> str:
        """
        Record high-quality audio from microphone
        
        Args:
            duration: Recording duration in seconds
            output_path: Optional path to save audio file
            
        Returns:
            Path to the recorded audio file
        """
        if output_path is None:
            output_path = tempfile.mktemp(suffix='.wav')
        
        print(f"🎤 Recording {duration} seconds... Speak clearly!")
        
        try:
            # Record audio
            audio_data = sd.rec(
                int(duration * self.sample_rate),
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype=np.int16
            )
            sd.wait()
            
            # Save to WAV file
            with wave.open(output_path, 'wb') as wf:
                wf.setnchannels(self.channels)
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_data.tobytes())
            
            print(f"💾 Audio saved: {output_path}")
            return output_path
            
        except Exception as e:
            print(f"❌ Recording error: {e}")
            return ""
    
    def transcribe_audio(self, audio_path: str, language: Optional[str] = None, 
                        task: str = "transcribe", beam_size: int = 5) -> Dict:
        """
        Transcribe audio file to text using Whisper (BEST accuracy)
        
        Args:
            audio_path: Path to audio file
            language: Force specific language (None for auto-detection)
            task: "transcribe" or "translate" (to English)
            beam_size: Higher = more accurate but slower
            
        Returns:
            Dictionary with transcription results
        """
        if not os.path.exists(audio_path):
            return {"error": "Audio file not found"}
        
        try:
            print("🧠 Processing audio with Whisper Large v3...")
            
            # Transcribe with Whisper
            segments, info = self.model.transcribe(
                audio_path,
                language=language,
                task=task,
                beam_size=beam_size,
                vad_filter=True,  # Voice activity detection
                vad_parameters=dict(min_silence_duration_ms=500),
                without_timestamps=True
            )
            
            # Combine all segments
            full_text = " ".join(segment.text for segment in segments).strip()
            
            return {
                "text": full_text,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "model": "Whisper Large v3"
            }
            
        except Exception as e:
            return {"error": f"Transcription error: {e}"}
    
    def real_time_transcription(self, chunk_duration: float = 3.0):
        """
        Real-time speech-to-text transcription
        """
        def audio_callback(indata, frames, time_info, status):
            if self.is_recording:
                self.audio_queue.put(indata.copy())
        
        print("🎯 REAL-TIME SPEECH-TO-TEXT ACTIVATED")
        print("=" * 60)
        print("Speak naturally. Whisper will transcribe in real-time!")
        print("Press Ctrl+C to stop\n")
        
        try:
            with sd.InputStream(
                samplerate=self.sample_rate,
                channels=self.channels,
                dtype=np.float32,
                callback=audio_callback,
                blocksize=int(self.sample_rate * 0.1)
            ):
                self.is_recording = True
                audio_buffer = np.array([], dtype=np.float32)
                
                while self.is_recording:
                    try:
                        # Get audio data
                        audio_chunk = self.audio_queue.get(timeout=1)
                        audio_buffer = np.concatenate([audio_buffer, audio_chunk.flatten()])
                        
                        # Process when we have enough audio
                        if len(audio_buffer) >= self.sample_rate * chunk_duration:
                            # Save to temporary file
                            temp_file = tempfile.mktemp(suffix='.wav')
                            self._save_audio_buffer(audio_buffer, temp_file)
                            
                            # Transcribe
                            result = self.transcribe_audio(temp_file)
                            
                            if "text" in result and result["text"].strip():
                                print(f"\n🗣️  [{result['language'].upper()}] {result['text']}")
                                print("-" * 80)
                            
                            # Clean up and reset buffer
                            try:
                                os.remove(temp_file)
                            except:
                                pass
                            audio_buffer = np.array([], dtype=np.float32)
                            
                    except Queue.Empty:
                        continue
                        
        except KeyboardInterrupt:
            print("\n⏹️  Stopping real-time transcription...")
        finally:
            self.is_recording = False
    
    def _save_audio_buffer(self, audio_buffer: np.ndarray, output_path: str):
        """Save audio buffer to WAV file"""
        # Convert to 16-bit PCM
        audio_int16 = (audio_buffer * 32767).astype(np.int16)
        
        with wave.open(output_path, 'wb') as wf:
            wf.setnchannels(self.channels)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes(audio_int16.tobytes())
    
    def batch_transcribe(self, audio_files: List[str], output_dir: Optional[str] = None) -> Dict:
        """
        Transcribe multiple audio files
        
        Args:
            audio_files: List of audio file paths
            output_dir: Directory to save transcriptions
            
        Returns:
            Dictionary with results for each file
        """
        results = {}
        
        for audio_file in audio_files:
            if os.path.exists(audio_file):
                print(f"📄 Processing: {os.path.basename(audio_file)}")
                result = self.transcribe_audio(audio_file)
                results[audio_file] = result
                
                # Save to file if output directory specified
                if output_dir and "text" in result:
                    os.makedirs(output_dir, exist_ok=True)
                    output_file = os.path.join(output_dir, f"{os.path.splitext(os.path.basename(audio_file))[0]}.txt")
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(result["text"])
                    print(f"💾 Transcription saved: {output_file}")
            
        return results

# 🎯 USAGE EXAMPLES

def demonstrate_best_voice_to_text():
    """Demonstrate the best voice-to-text capabilities"""
    
    # Initialize the BEST model
    stt = BestVoiceToText(
        model_size="base",  # BEST model
        device="auto",          # Auto-detect GPU/CPU
        compute_type="float32"  # Faster inference
    )
    
    print("\n" + "=" * 80)
    print("🎯 BEST VOICE-TO-TEXT SYSTEM - WHISPER LARGE v3")
    print("=" * 80)
    
    # Show model info
    info = stt.get_model_info()
    print(f"Model: {info['model']} {info['size']}")
    print(f"Device: {info['device'].upper()}")
    print(f"Languages: {info['languages_supported']}")
    print()
    
    while True:
        print("Choose an option:")
        print("1. 🎤 Real-time speech-to-text")
        print("2. 📁 Transcribe audio file")
        print("3. ⏺️  Record and transcribe")
        print("4. 📦 Batch transcribe multiple files")
        print("5. 🚪 Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == "1":
            print("\nStarting real-time transcription...")
            stt.real_time_transcription()
            
        elif choice == "2":
            audio_path = input("Enter audio file path: ").strip()
            if os.path.exists(audio_path):
                result = stt.transcribe_audio(audio_path)
                if "text" in result:
                    print(f"\n📝 Transcription: {result['text']}")
                    print(f"🌐 Language: {result['language']} (confidence: {result['language_probability']:.2%})")
                else:
                    print(f"❌ Error: {result.get('error', 'Unknown error')}")
            else:
                print("❌ File not found!")
                
        elif choice == "3":
            try:
                duration = float(input("Recording duration (seconds): ").strip() or "5")
                audio_path = stt.record_audio(duration)
                if audio_path:
                    result = stt.transcribe_audio(audio_path)
                    if "text" in result:
                        print(f"\n🎤 You said: {result['text']}")
                        print(f"🌐 Language: {result['language']}")
                    # Clean up
                    try:
                        os.remove(audio_path)
                    except:
                        pass
            except ValueError:
                print("❌ Please enter a valid number!")
                
        elif choice == "4":
            files_input = input("Enter audio file paths (comma-separated): ").strip()
            audio_files = [f.strip() for f in files_input.split(',') if f.strip()]
            valid_files = [f for f in audio_files if os.path.exists(f)]
            
            if valid_files:
                output_dir = input("Output directory (press Enter for current dir): ").strip()
                if not output_dir:
                    output_dir = None
                
                results = stt.batch_transcribe(valid_files, output_dir)
                print(f"\n✅ Processed {len(results)} files!")
            else:
                print("❌ No valid files found!")
                
        elif choice == "5":
            print("👋 Goodbye!")
            break
            
        else:
            print("❌ Invalid choice!")
        
        print("\n" + "=" * 80)

# Quick one-liner function for simple use
def quick_transcribe(audio_path: str, language: str = None) -> str:
    """
    Quick transcription function
    
    Args:
        audio_path: Path to audio file
        language: Optional language code (en, hi, es, etc.)
    
    Returns:
        Transcribed text
    """
    stt = BestVoiceToText(model_size="large-v3")  # Faster for quick tasks
    result = stt.transcribe_audio(audio_path, language)
    return result.get("text", "")

if __name__ == "__main__":
    # Check dependencies
    try:
        import faster_whisper
        import sounddevice
        import numpy
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        print("Please install: pip install faster-whisper sounddevice numpy")
        exit(1)
    
    # Run the best voice-to-text system
    demonstrate_best_voice_to_text()