// Initialize state
let worker = null;
let audioContext = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;
let isRecording = false;

// Constants
const SAMPLE_RATE = 16000;
const PROCESSOR_BUFFER_SIZE = 4096;

// DOM Elements
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const languageSelect = document.getElementById('language');
const recordButton = document.getElementById('recordButton');
const transcriptEl = document.getElementById('transcript');

// Check for WebGPU support
async function hasWebGPU() {
    if (!navigator.gpu) {
        return false;
    }
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        return false;
    }
}

// Initialize the worker
async function initializeWorker() {
    const device = await hasWebGPU() ? 'webgpu' : 'wasm';
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
        const { status, data, result } = e.data;
        
        switch (status) {
            case 'loading':
                updateProgress({ message: data });
                break;
            case 'loaded':
                updateProgress({ message: 'Ready to record' });
                break;
            case 'streaming':
                updateProgress({ message: 'Started streaming...' });
                break;
            case 'partial':
                updateTranscript(result);
                break;
            case 'stopped':
                updateProgress({ message: 'Recording stopped' });
                break;
            case 'error':
                showError(data);
                break;
            default:
                if (data && data.progress) {
                    updateProgress(data);
                }
        }
    };

    // Initialize the worker with device type
    worker.postMessage({
        type: 'load',
        data: { device }
    });
}

// Update progress display
function updateProgress(data) {
    const { message, progress } = data;
    statusEl.textContent = message;
    
    if (progress && progress.length > 0) {
        progressEl.innerHTML = progress
            .map(item => `
                <div class="mb-2">
                    <div class="text-sm text-gray-600">${item.name}</div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${item.progress}%"></div>
                    </div>
                </div>
            `).join('');
    }
}

// Create HTML for a transcript segment
function createSegmentHTML(speaker, text) {
    const speakerLabel = speaker ? 
        `<span class="font-semibold text-indigo-600">${speaker}</span>: ` : 
        '';
    return `
        <div class="mb-4 p-3 bg-gray-50 rounded-lg">
            ${speakerLabel}
            <span class="text-gray-800">${text}</span>
        </div>
    `;
}

// Update transcript with new results
function updateTranscript(result) {
    if (!result || !result.transcript || !result.segments) return;
    
    const { transcript, segments } = result;
    
    // Combine transcription chunks with speaker information
    let html = '';
    let currentSpeaker = null;
    let currentText = [];

    for (const chunk of transcript.chunks) {
        // Find the speaker for this timestamp
        const timestamp = (chunk.timestamp[0] + chunk.timestamp[1]) / 2;
        const speaker = segments.find(seg => 
            timestamp >= seg.start && timestamp <= seg.end
        );

        // If speaker changed, output the accumulated text
        if (speaker && speaker.label !== currentSpeaker) {
            if (currentText.length > 0) {
                html += createSegmentHTML(currentSpeaker, currentText.join(' '));
                currentText = [];
            }
            currentSpeaker = speaker.label;
        }

        currentText.push(chunk.text);
    }

    // Output any remaining text
    if (currentText.length > 0) {
        html += createSegmentHTML(currentSpeaker, currentText.join(' '));
    }

    // Append new content to transcript
    if (html) {
        transcriptEl.innerHTML += html;
        // Scroll to bottom
        transcriptEl.scrollTop = transcriptEl.scrollHeight;
    }
}

// Format time in seconds to MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Show error message
function showError(error) {
    statusEl.innerHTML = `<div class="text-red-600">${error}</div>`;
}

// Start recording
async function startRecording() {
    try {
        // Get audio stream
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                channelCount: 1,
                sampleRate: SAMPLE_RATE
            } 
        });

        // Create audio context and nodes
        audioContext = new AudioContext({
            sampleRate: SAMPLE_RATE,
            latencyHint: 'interactive'
        });

        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        processorNode = audioContext.createScriptProcessor(
            PROCESSOR_BUFFER_SIZE,
            1, // input channels
            1  // output channels
        );

        // Connect nodes
        sourceNode.connect(processorNode);
        processorNode.connect(audioContext.destination);

        // Process audio data
        processorNode.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            worker.postMessage({
                type: 'stream',
                data: {
                    chunk: inputData,
                    language: languageSelect.value
                }
            });
        };

        // Start streaming mode
        worker.postMessage({
            type: 'startStream',
            data: { language: languageSelect.value }
        });

        // Update UI
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        recordButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
        recordButton.classList.add('bg-red-600', 'hover:bg-red-700');
        
        // Clear previous transcript
        transcriptEl.innerHTML = '';

    } catch (err) {
        showError('Error accessing microphone: ' + err.message);
    }
}

// Stop recording
function stopRecording() {
    // Stop media stream
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }

    // Disconnect and cleanup audio nodes
    if (sourceNode && processorNode) {
        sourceNode.disconnect();
        processorNode.disconnect();
    }

    // Close audio context
    if (audioContext) {
        audioContext.close();
    }

    // Stop streaming mode
    worker.postMessage({ 
        type: 'stopStream',
        data: { language: languageSelect.value }
    });

    // Reset state
    mediaStream = null;
    audioContext = null;
    sourceNode = null;
    processorNode = null;
    isRecording = false;

    // Update UI
    recordButton.textContent = 'Record';
    recordButton.classList.remove('bg-red-600', 'hover:bg-red-700');
    recordButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
}

// Handle recording button
recordButton.addEventListener('click', () => {
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
});

// Initialize the application
initializeWorker();
