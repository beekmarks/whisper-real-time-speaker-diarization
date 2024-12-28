

# Whisper Real Time Speaker Diarization

A real-time speaker diarization web application that combines Whisper's speech recognition capabilities with speaker segmentation to transcribe audio and identify different speakers in the conversation.

## Features

- Real-time speech-to-text transcription
- Speaker diarization (identification of different speakers)
- Support for multiple languages
- Browser-based processing using WebGPU/WASM
- No server required - all processing happens locally in the browser

## Technologies Used

- **Speech Recognition**: [Whisper](https://github.com/openai/whisper) (ONNX version) - Using the `whisper-base_timestamped` model
- **Speaker Diarization**: PyAnnote Segmentation (ONNX version) - Using the `pyannote-segmentation-3.0` model
- **Frontend**: Pure HTML/JavaScript implementation
- **Model Inference**: Hugging Face Transformers.js

## Getting Started

### Prerequisites

- A modern web browser with WebGPU support (recommended) or WebAssembly support
- No additional software installation required

### Running the Application

1. Clone this repository:
   ```bash
   git clone https://github.com/beekmarks/whisper-real-time-speaker-diarization.git
   cd whisper-real-time-speaker-diarization
   ```

2. Serve the directory using a local web server. For example, using Python:
   ```bash
   python -m http.server 8000
   ```
   Or using any other static file server of your choice.

3. Open your web browser and navigate to `http://localhost:8000`

For development purposes use:  `npm run dev` then open your web browser and navigate to `http://localhost:5173`

## Usage

1. Select your preferred language from the dropdown menu
2. Start speaking
3. The application will process the audio in real-time:
   - Transcribing the speech using Whisper
   - Identifying different speakers using PyAnnote
   - Displaying the results with speaker labels and timestamps

## Technical Details

- Audio is processed in chunks of 30 seconds with 5-second overlaps
- Sample rate: 16kHz
- Models are loaded and run entirely in the browser using WebGPU (preferred) or WebAssembly
- Speaker diarization is performed using neural voice activity detection and speaker segmentation

## Resources

- [OpenAI Whisper](https://github.com/openai/whisper)
- [PyAnnote](https://github.com/pyannote/pyannote-audio)
- [Hugging Face](https://huggingface.co/)