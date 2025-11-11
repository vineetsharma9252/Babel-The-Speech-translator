#!/bin/bash
# setup.sh

echo "🚀 Setting up Voice Translation Server..."



# Create necessary directories
mkdir -p temp_audio
mkdir -p logs

# Download translation models
python -c "
from transformers import pipeline
print('Downloading translation models...')
pipeline('translation', model='Helsinki-NLP/opus-mt-en-es')
print('Models downloaded successfully!')
"

echo "✅ Setup complete!"
echo "To start the server: python main.py"
echo "Server will be available at: http://localhost:8080"