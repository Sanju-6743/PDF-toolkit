document.addEventListener('DOMContentLoaded', () => {
    const tools = [
        { id: 'merge', name: 'Merge PDF', icon: 'fas fa-compress-arrows-alt', description: 'Combine multiple PDFs into one file.', multiFile: true },
        { id: 'split', name: 'Split PDF', icon: 'fas fa-cut', description: 'Extract pages or ranges from a PDF.', options: [{ id: 'ranges', placeholder: 'e.g., 1-3, 5, 8-10' }] },
        { id: 'pdf-to-jpg', name: 'PDF to JPG', icon: 'fas fa-image', description: 'Convert each page of a PDF to a JPG image.' },
        { id: 'images-to-pdf', name: 'Images to PDF', icon: 'fas fa-file-image', description: 'Combine multiple images into a single PDF.', multiFile: true, accept: 'image/*' },
        { id: 'protect', name: 'Protect PDF', icon: 'fas fa-lock', description: 'Add a password to protect your PDF.', options: [{ id: 'password', placeholder: 'Enter password', type: 'password' }] },
        { id: 'add-watermark', name: 'Add Watermark', icon: 'fas fa-stamp', description: 'Add a text watermark to your PDF.', options: [{ id: 'watermark_text', placeholder: 'Enter watermark text' }] }
    ];

    const toolsGrid = document.querySelector('.tools-grid');
    tools.forEach(tool => {
        const card = document.createElement('div');
        card.className = 'tool-card';
        card.dataset.tool = tool.id;
        card.innerHTML = `
            <i class="${tool.icon}"></i>
            <h3>${tool.name}</h3>
            <p>${tool.description}</p>
        `;
        card.addEventListener('click', () => openModal(tool));
        toolsGrid.appendChild(card);
    });

    const modal = document.getElementById('toolModal');
    const modalTitle = document.getElementById('modalTitle');
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    const fileList = document.getElementById('fileList');
    const toolOptions = document.getElementById('toolOptions');
    const processBtn = document.getElementById('processBtn');
    const progressWrapper = document.getElementById('progressWrapper');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    let currentTool = null;
    let uploadedFiles = [];
    let socket = null;

    function connectToServer() {
        if (socket && socket.connected) return;
        socket = io(window.SOCKET_URL, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => {
            console.log('Connected to backend with SID:', socket.id);
        });

        socket.on('processing_progress', (data) => {
            progressBar.style.width = `${data.percent}%`;
            progressText.textContent = data.message;
        });
    }

    function openModal(tool) {
        currentTool = tool;
        modalTitle.textContent = tool.name;
        fileInput.multiple = !!tool.multiFile;
        fileInput.accept = tool.accept || '.pdf';
        
        toolOptions.innerHTML = '';
        if (tool.options) {
            tool.options.forEach(opt => {
                toolOptions.innerHTML += `<input type="${opt.type || 'text'}" id="${opt.id}" placeholder="${opt.placeholder}" class="tool-option-input">`;
            });
        }
        
        resetModalState();
        modal.style.display = 'flex';
        connectToServer();
    }

    function closeModal() {
        modal.style.display = 'none';
        currentTool = null;
    }

    function resetModalState() {
        uploadedFiles = [];
        fileList.innerHTML = '';
        processBtn.disabled = true;
        progressWrapper.style.display = 'none';
        progressBar.style.width = '0%';
        fileInput.value = '';
    }

    function handleFiles(files) {
        if (!currentTool.multiFile) uploadedFiles = [];
        
        for (const file of files) {
            uploadedFiles.push(file);
        }
        renderFileList();
        validateInputs();
    }

    function renderFileList() {
        fileList.innerHTML = '';
        uploadedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `<span>${file.name}</span><button data-index="${index}">&times;</button>`;
            fileList.appendChild(item);
        });
    }

    function validateInputs() {
        let optionsValid = true;
        if (currentTool.options) {
            optionsValid = currentTool.options.every(opt => document.getElementById(opt.id).value.trim() !== '');
        }
        processBtn.disabled = uploadedFiles.length === 0 || !optionsValid;
    }

    async function processFiles() {
        progressWrapper.style.display = 'block';
        progressText.textContent = 'Preparing upload...';
        progressBar.style.width = '0%';

        const formData = new FormData();
        const fileKey = currentTool.multiFile ? 'files' : 'file';
        uploadedFiles.forEach(file => formData.append(fileKey, file));

        if (currentTool.options) {
            currentTool.options.forEach(opt => {
                formData.append(opt.id, document.getElementById(opt.id).value);
            });
        }

        try {
            const response = await fetch(`${window.API_BASE_URL}/${currentTool.id}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-SocketIO-SID': socket.id
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Processing failed');
            }

            progressText.textContent = 'Download starting...';
            progressBar.style.width = '100%';

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'download';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch.length > 1) {
                    filename = filenameMatch[1];
                }
            }
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

            setTimeout(closeModal, 1000);

        } catch (error) {
            progressText.textContent = `Error: ${error.message}`;
            progressBar.style.backgroundColor = 'red';
        }
    }

    // Event Listeners
    modal.querySelector('.close-btn').addEventListener('click', closeModal);
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    
    uploadArea.addEventListener('dragover', (e) => e.preventDefault());
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });

    fileList.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.dataset.index, 10);
            uploadedFiles.splice(index, 1);
            renderFileList();
            validateInputs();
        }
    });

    toolOptions.addEventListener('input', validateInputs);
    processBtn.addEventListener('click', processFiles);
});
