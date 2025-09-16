import torch
import torchaudio
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from datasets import Dataset, Audio
import json
from typing import List, Dict

class WhisperFineTuner:
    def __init__(self, model_name="openai/whisper-small", language="hi"):
        self.model_name = model_name
        self.language = language
        self.processor = WhisperProcessor.from_pretrained(
            model_name, language=language, task="transcribe"
        )
        self.model = WhisperForConditionalGeneration.from_pretrained(model_name)
        
    def prepare_dataset(self, metadata_path: str, audio_dir: str):
        """Prepare dataset from JSONL metadata"""
        samples = []
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            for line in f:
                data = json.loads(line)
                samples.append({
                    "audio": data["audio_filepath"],
                    "text": data["text"],
                    "language": data.get("language", self.language)
                })
        
        # Create HuggingFace dataset
        dataset = Dataset.from_list(samples)
        dataset = dataset.cast_column("audio", Audio(sampling_rate=16000))
        
        return dataset
    
    def preprocess_function(self, examples):
        """Preprocess audio and labels"""
        # Load and resample audio
        audio = [x["array"] for x in examples["audio"]]
        
        # Process audio with consistent padding/truncation
        inputs = self.processor(
            audio,
            sampling_rate=16000,
            return_tensors="pt",
            padding="max_length",  # Explicitly pad to max_length
            truncation=True,
            max_length=30 * 16000,  # 30 seconds max
            return_attention_mask=True  # Include attention mask for padded regions
        )
        
        # Process labels with consistent padding/truncation
        labels = self.processor.tokenizer(
            examples["text"],
            return_tensors="pt",
            padding="max_length",  # Explicitly pad to max_length
            truncation=True,
            max_length=128
        ).input_ids
        
        return {
            "input_features": inputs.input_features,
            "labels": labels,
            "attention_mask": inputs.attention_mask  # Include if needed by model
        }
    
    def fine_tune(self, dataset, output_dir="whisper-finetuned", epochs=3):
        """Fine-tune Whisper model"""
        from transformers import TrainingArguments, Trainer
        
        # Preprocess dataset
        processed_dataset = dataset.map(
            self.preprocess_function,
            batched=True,
            remove_columns=dataset.column_names
        )
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            per_device_train_batch_size=8,
            gradient_accumulation_steps=2,
            learning_rate=1e-5,
            warmup_steps=500,
            max_steps=4000,
            gradient_checkpointing=False,
            fp16=False,
            # evaluation_strategy="steps",
            per_device_eval_batch_size=8,
            # predict_with_generate=True,
            # generation_max_length=128,
            # save_steps=1000,
            # eval_steps=1000,
            # logging_steps=25,
            # report_to=None,
            # load_best_model_at_end=True,
            # metric_for_best_model="wer",
            # greater_is_better=False,
        )
        
        # Create trainer
        trainer = Trainer(
    model=self.model,
    args=training_args,
    train_dataset=processed_dataset,
    processing_class=self.processor,  # Use processor instead
)
        
        # Start training
        trainer.train()
        
        # Save model
        trainer.save_model(output_dir)
        self.processor.save_pretrained(output_dir)
        
        print(f"✅ Model fine-tuned and saved to {output_dir}")

# Usage example
def main():
    # Initialize fine-tuner
    fine_tuner = WhisperFineTuner(model_name="openai/whisper-small", language="hi")
    
    # Prepare dataset
    dataset = fine_tuner.prepare_dataset("C:/Users/maste/OneDrive/Documents/Final_year_project/Project Babel/Backend/Fine_Tuning_Whisper/gu_male_data.jsonl", "dataset/audio")
    
    # Fine-tune model
    fine_tuner.fine_tune(dataset, output_dir="whisper-hindi", epochs=3)

if __name__ == "__main__":
    main()