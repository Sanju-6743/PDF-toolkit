// PDF Toolkit - Client-side PDF Processing with Python Backend
// Using PDF.js, PDF-lib, and Socket.IO for real-time processing

// Global variables
let uploadedFiles = [];
let processedPdf = null;
let pdfjsLib = null;
let socket = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initializeApp();
    
    // Set up event listeners
    setupEventListeners();
});

// Initialize the application
function initializeApp() {
    console.log('PDF Toolkit initialized');
    
    // Load necessary libraries
    loadLibraries();
}

// Load required libraries
function loadLibraries() {
    // Create script element for PDF.js
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = function() {
        // Set up PDF.js worker
        pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        console.log('PDF.js library loaded');
    };
    document.head.appendChild(script);
    
    // Create script element for PDF-lib (for PDF manipulation)
    const pdfLibScript = document.createElement('script');
    pdfLibScript.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    pdfLibScript.onload = function() {
        console.log('PDF-lib library loaded');
    };
    document.head.appendChild(pdfLibScript);
    
    // Create script element for Socket.IO
    const socketScript = document.createElement('script');
    socketScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.js';
    socketScript.onload = function() {
        console.log('Socket.IO library loaded');
        connectToServer();
    };
    document.head.appendChild(socketScript);
}

// Connect to WebSocket server
function connectToServer() {
    // Connect to backend Socket.IO server hosted separately (Render)
    socket = io(window.SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('connect', function() {
        console.log('Connected to backend socket');
        showConnectionStatus(true);
    });
    socket.on('connect_error', function(err) {
        console.error('Connection to backend failed:', err);
        showConnectionStatus(false);
    });
    setupSocketListeners();
}

// Setup socket event listeners
function setupSocketListeners() {
    socket.on('processing_status', function(data) {
        updateStatus(`⏳ ${data.status}`);
    });

    socket.on('processing_complete', function(data) {
        updateStatus(`✅ ${data.status}`);
        playSound('complete');
        document.getElementById('resultArea').style.display = 'block';
        document.getElementById('processingStatus').style.display = 'none';
    });

    socket.on('processing_error', function(data) {
        updateStatus(`❌ ${data.status}`);
        playSound('error');
    });
}

// Set up event listeners
function setupEventListeners() {
    // Feature card buttons
    const featureButtons = document.querySelectorAll('.feature-card .btn-secondary');
    featureButtons.forEach(button => {
        button.addEventListener('click', function() {
            const featureName = this.parentElement.querySelector('h3').textContent;
            openFeatureModal(featureName);
        });
    });
    
    // Hero buttons
    const heroButtons = document.querySelectorAll('.hero-buttons .btn-primary, .hero-buttons .btn-secondary');
    heroButtons.forEach(button => {
        button.addEventListener('click', function() {
            openFeatureModal('Merge PDF');
        });
    });
    
    // Navigation links
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
}

// Open feature modal
function openFeatureModal(featureName) {
    // Create modal dynamically
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>${featureName}</h2>
            <div class="file-upload-area">
                <div class="upload-icon">
                    <i class="fas fa-cloud-upload-alt"></i>
                </div>
                <p>Drag & drop your PDF files here</p>
                <p>or</p>
                <button class="btn-primary">Browse Files</button>
                <input type="file" id="fileInput" multiple accept=".pdf" style="display: none;">
            </div>
            <div class="file-list" id="fileList"></div>
            <div class="processing-options" id="processingOptions" style="display: none;">
                <button class="btn-primary" id="processBtn">Process Files</button>
            </div>
            <div class="processing-status" id="processingStatus" style="display: none;">
                <div class="spinner"></div>
                <p id="statusText">Processing...</p>
            </div>
            <div class="result-area" id="resultArea" style="display: none;">
                <h3>Processing Complete!</h3>
                <p>Your file is ready for download</p>
                <button class="btn-primary" id="downloadBtn">Download Result</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners to modal elements
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    const uploadBtn = modal.querySelector('.file-upload-area .btn-primary');
    const fileInput = modal.querySelector('#fileInput');
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop functionality
    const uploadArea = modal.querySelector('.file-upload-area');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        handleFileSelect(e);
    });
    
    // Process button
    const processBtn = modal.querySelector('#processBtn');
    processBtn.addEventListener('click', function() {
        processFiles(featureName);
    });
    
    // Download button
    const downloadBtn = modal.querySelector('#downloadBtn');
    downloadBtn.addEventListener('click', downloadResult);
}

// Handle file selection
function handleFileSelect(e) {
    let files;
    
    if (e.type === 'drop') {
        files = e.dataTransfer.files;
    } else {
        files = e.target.files;
    }
    
    // Process selected files
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf') {
            uploadedFiles.push(file);
            displayFile(file);
        }
    }
    
    // Show processing options if files are uploaded
    if (uploadedFiles.length > 0) {
        document.getElementById('processingOptions').style.display = 'block';
    }
}

// Display uploaded file
function displayFile(file) {
    const fileList = document.getElementById('fileList');
    const fileElement = document.createElement('div');
    fileElement.className = 'file-item';
    fileElement.innerHTML = `
        <span><i class="fas fa-file-pdf"></i> ${file.name}</span>
        <span class="file-size">${formatFileSize(file.size)}</span>
        <button class="remove-file" data-filename="${file.name}">&times;</button>
    `;
    
    fileList.appendChild(fileElement);
    
    // Add event listener to remove button
    const removeBtn = fileElement.querySelector('.remove-file');
    removeBtn.addEventListener('click', function() {
        removeFile(file.name);
        fileList.removeChild(fileElement);
    });
}

// Remove file from list
function removeFile(filename) {
    uploadedFiles = uploadedFiles.filter(file => file.name !== filename);
    
    // Hide processing options if no files left
    if (uploadedFiles.length === 0) {
        document.getElementById('processingOptions').style.display = 'none';
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Process files based on selected feature
async function processFiles(featureName) {
    document.getElementById('processingOptions').style.display = 'none';
    document.getElementById('processingStatus').style.display = 'block';
    document.getElementById('fileList').style.display = 'none';

    playSound('processing');

    const formData = new FormData();
    uploadedFiles.forEach(file => {
        formData.append('files', file);
    });

    let url = '';
    switch (featureName) {
        case 'Merge PDF':
            // Append all files as 'files'
            formData.delete('file');
            url = `${window.API_BASE_URL}/merge`;
            break;
        case 'Split PDF':
            // Backend expects single 'file' and optional 'split_page'
            const firstSplit = uploadedFiles[0];
            formData.delete('files');
            formData.set('file', firstSplit);
            // default split page is 1; could be enhanced via UI control
            formData.set('split_page', '1');
            url = `${window.API_BASE_URL}/split`;
            break;
        case 'Compress PDF':
            // Backend expects single 'file'
            const firstCompress = uploadedFiles[0];
            formData.delete('files');
            formData.set('file', firstCompress);
            url = `${window.API_BASE_URL}/compress`;
            break;
        default:
            return;
    }

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            processedPdf = { name: data.filename || 'processed.pdf' };
            socket.emit('processing_complete', { status: 'Processing complete!' });
        } else {
            socket.emit('processing_error', { status: data.message });
        }
    })
    .catch(error => {
        socket.emit('processing_error', { status: error.message });
    });
}

// Download result
function downloadResult() {
    if (processedPdf && processedPdf.name) {
        window.location.href = `${window.API_BASE_URL}/download/${processedPdf.name}`;
    } else {
        alert('No processed file available for download.');
    }
}

// Scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        window.scrollTo({
            top: section.offsetTop - 80,
            behavior: 'smooth'
        });
    }
}

// Play sound notifications
function playSound(type) {
    // In a real implementation, we would play actual sounds
    // For this demo, we'll just log the sound events
    console.log(`Playing ${type} sound`);
    
    // Create audio context for actual sound implementation
    // This is commented out for the demo but shows how it would work:
    /*
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'processing':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                oscillator.type = 'sine';
                break;
            case 'complete':
                oscillator.frequency.value = 1000;
                gainNode.gain.value = 0.3;
                oscillator.type = 'sine';
                break;
            case 'error':
                oscillator.frequency.value = 200;
                gainNode.gain.value = 0.3;
                oscillator.type = 'square';
                break;
            case 'download':
                oscillator.frequency.value = 1200;
                gainNode.gain.value = 0.2;
                oscillator.type = 'sine';
                break;
        }
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
        setTimeout(() => {
            oscillator.stop();
        }, 500);
    } catch (e) {
        console.log('Sound playback not supported');
    }
    */
}


// Update processing status
function updateStatus(message) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
        statusText.textContent = message;
    }
}

// Show connection status popup
function showConnectionStatus(success) {
    const statusPopup = document.createElement('div');
    statusPopup.className = 'connection-status-popup';
    if (success) {
        statusPopup.textContent = '✅ Connected to backend';
        statusPopup.classList.add('success');
    } else {
        statusPopup.textContent = '❌ Failed to connect to backend';
        statusPopup.classList.add('error');
    }
    
    document.body.appendChild(statusPopup);
    
    // Fade out after a few seconds
    setTimeout(() => {
        statusPopup.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(statusPopup);
        }, 500);
    }, 3000);
}

// Add CSS for modal and file upload area
const modalStyles = `
.modal {
    display: block;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.5);
    overflow: auto;
}

.modal-content {
    background-color: #fff;
    margin: 5% auto;
    padding: 30px;
    border-radius: 15px;
    width: 80%;
    max-width: 600px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    position: relative;
}

.close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    position: absolute;
    top: 15px;
    right: 25px;
}

.close:hover {
    color: #000;
}

.file-upload-area {
    border: 2px dashed #4361ee;
    border-radius: 10px;
    padding: 30px;
    text-align: center;
    margin: 20px 0;
    transition: all 0.3s ease;
}

.file-upload-area.drag-over {
    background-color: #e0f7fa;
    border-color: #3a0ca3;
}

/* Connection Status Popup */
.connection-status-popup {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: #fff;
    font-weight: bold;
    z-index: 2000;
    opacity: 1;
    transition: opacity 0.5s ease-in-out;
}

.connection-status-popup.success {
    background-color: #28a745;
}

.connection-status-popup.error {
    background-color: #dc3545;
}

.upload-icon {
    font-size: 48px;
    color: #4361ee;
    margin-bottom: 15px;
}

.file-list {
    margin: 20px 0;
}

.file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 5px;
    margin-bottom: 10px;
    position: relative;
}

.file-size {
    color: #6c757d;
    font-size: 0.9rem;
}

.remove-file {
    background: none;
    border: none;
    color: #dc3545;
    font-size: 1.5rem;
    cursor: pointer;
}

.processing-options, .result-area {
    text-align: center;
    margin: 20px 0;
}

.result-area h3 {
    color: #28a745;
}

/* Processing status */
.processing-status {
    text-align: center;
    padding: 20px;
}

.spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-left-color: #4361ee;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Responsive adjustments for modal */
@media (max-width: 768px) {
    .modal-content {
        width: 95%;
        padding: 20px;
    }
    
    .file-item {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .file-size {
        margin-top: 5px;
    }
    
    .remove-file {
        position: absolute;
        right: 10px;
        top: 10px;
    }
}
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.innerText = modalStyles;
document.head.appendChild(styleSheet);

// Performance optimization: Lazy load images
document.addEventListener('DOMContentLoaded', function() {
    const lazyImages = [].slice.call(document.querySelectorAll('img.lazy'));
    
    if ('IntersectionObserver' in window) {
        let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    let lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove('lazy');
                    lazyImageObserver.unobserve(lazyImage);
                }
            });
        });
        
        lazyImages.forEach(function(lazyImage) {
            lazyImageObserver.observe(lazyImage);
        });
    }
});
