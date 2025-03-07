document.addEventListener('DOMContentLoaded', function() {
    // Koneksi Socket.IO
    const socket = io('http://localhost:3000');
    let currentUser = null;
    let selectedChat = null;
    let connectedUsers = [];

    // DOM Elements
    const messageInput = document.querySelector('.message-input input[type="text"]');
    const sendButton = document.querySelector('.send-btn');
    const messageArea = document.querySelector('.message-area');
    const chatList = document.querySelector('.chat-list');
    const userProfile = document.querySelector('.user-profile');

    // File upload handling
    const fileInput = document.getElementById('fileInput');
    const attachButton = document.querySelector('.attach-btn');
    const dropZone = document.getElementById('dropZone');
    const dropZoneOverlay = document.querySelector('.drop-zone-overlay');

    // Login handler
    function handleLogin() {
        const userName = prompt('Masukkan nama Anda:');
        if (userName) {
            currentUser = {
                name: userName,
                id: socket.id
            };
            socket.emit('login', { name: userName });
            updateUserProfile(userName);
        }
    }

    // Update user profile
    function updateUserProfile(name) {
        userProfile.querySelector('h3').textContent = name;
    }

    // Update chat list
    function updateChatList(users) {
        chatList.innerHTML = '';
        users.forEach(user => {
            if (user.id !== currentUser.id) {
                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.dataset.userId = user.id;
                chatItem.innerHTML = `
                    <img src="defaultprofilepic.png" alt="Contact" class="contact-img">
                    <div class="chat-info">
                        <h4>${user.name}</h4>
                        <p>${user.status}</p>
                    </div>
                    <div class="chat-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                `;
                chatList.appendChild(chatItem);
            }
        });

        // Add event listeners to new chat items
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', handleChatSelect);
        });

        // Update selected chat if exists
        if (selectedChat) {
            const selectedItem = document.querySelector(`[data-user-id="${selectedChat.id}"]`);
            if (selectedItem) {
                selectedItem.classList.add('active');
                const contactName = selectedItem.querySelector('h4').textContent;
                const contactStatus = selectedItem.querySelector('p').textContent;
                document.querySelector('.contact-info h3').textContent = contactName;
                document.querySelector('.contact-info p').textContent = contactStatus;
            }
        }
    }

    // Handle chat selection
    function handleChatSelect() {
        // Hapus kelas active dari semua item
        document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
        // Tambah kelas active ke item yang diklik
        this.classList.add('active');

        // Update header chat
        const contactName = this.querySelector('h4').textContent;
        const contactStatus = this.querySelector('p').textContent;
        
        document.querySelector('.contact-info h3').textContent = contactName;
        document.querySelector('.contact-info p').textContent = contactStatus;

        // Set selected chat
        selectedChat = {
            name: contactName,
            id: this.dataset.userId
        };

        // Bersihkan area pesan
        messageArea.innerHTML = '';

        // Request chat history
        socket.emit('requestChatHistory', { userId: selectedChat.id });
    }

    // Handle file selection via button
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Handle drag and drop
    dropZone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dropZoneOverlay.classList.add('active');
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (e.relatedTarget && !dropZone.contains(e.relatedTarget)) {
            dropZoneOverlay.classList.remove('active');
        }
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZoneOverlay.classList.remove('active');
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
        fileInput.value = ''; // Reset input
    }

    function handleFiles(files) {
        if (!selectedChat) {
            alert('Please select a chat first');
            return;
        }

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileData = {
                    file: e.target.result.split(',')[1], // Remove data URL prefix
                    fileName: file.name,
                    fileSize: file.size,
                    receiverId: selectedChat.id
                };
                socket.emit('uploadFile', fileData);
            };
            reader.readAsDataURL(file);
        });
    }

    // Update message display function
    function addMessage(message, isSent = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        if (message.type === 'file') {
            // File message
            messageDiv.classList.add('file');
            const icon = getFileIcon(message.fileName);
            const size = formatFileSize(message.fileSize);
            
            messageDiv.innerHTML = `
                <i class="fas ${icon}"></i>
                <div class="file-info">
                    <div class="file-name">${message.fileName}</div>
                    <div class="file-size">${size}</div>
                </div>
                <a href="${message.filePath}" class="download-btn" download>
                    <i class="fas fa-download"></i>
                </a>
                <span class="time">${formatTime(message.timestamp)}</span>
            `;
        } else {
            // Regular text message
            messageDiv.innerHTML = `
                <p>${message.text}</p>
                <span class="time">${formatTime(message.timestamp)}</span>
            `;
        }

        messageArea.appendChild(messageDiv);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    function getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const icons = {
            pdf: 'fa-file-pdf',
            doc: 'fa-file-word',
            docx: 'fa-file-word',
            xls: 'fa-file-excel',
            xlsx: 'fa-file-excel',
            png: 'fa-file-image',
            jpg: 'fa-file-image',
            jpeg: 'fa-file-image',
            gif: 'fa-file-image',
            zip: 'fa-file-archive',
            rar: 'fa-file-archive'
        };
        return icons[ext] || 'fa-file';
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Event listener untuk tombol kirim
    sendButton.addEventListener('click', function() {
        sendMessage();
    });

    // Event listener untuk input pesan (Enter key)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default form submission
            sendMessage();
        }
    });

    // Fungsi untuk mengirim pesan
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message && selectedChat) {
            // Kirim pesan ke server
            socket.emit('sendMessage', {
                text: message,
                receiverId: selectedChat.id
            });
            messageInput.value = '';
        }
    }

    // Socket.IO event handlers
    socket.on('userList', (users) => {
        connectedUsers = users;
        updateChatList(users);
    });

    socket.on('receiveMessage', (message) => {
        // Tampilkan pesan jika kita sedang chat dengan pengirim atau penerima pesan
        if (selectedChat && (message.senderId === selectedChat.id || message.receiverId === selectedChat.id)) {
            // Pesan diterima jika flag isReceived true
            addMessage(message, !message.isReceived);
            // Scroll ke pesan terbaru
            messageArea.scrollTop = messageArea.scrollHeight;
        }
    });

    socket.on('chatHistory', (data) => {
        if (selectedChat && data.userId === selectedChat.id) {
            messageArea.innerHTML = '';
            data.messages.forEach(message => {
                // Pesan diterima jika flag isReceived true
                addMessage(message, !message.isReceived);
            });
        }
    });

    socket.on('userStatus', (data) => {
        const chatItem = document.querySelector(`[data-user-id="${data.userId}"]`);
        if (chatItem) {
            const statusElement = chatItem.querySelector('.chat-info p');
            statusElement.textContent = data.status;
            
            // Update header if this is the selected chat
            if (selectedChat && selectedChat.id === data.userId) {
                document.querySelector('.contact-info p').textContent = data.status;
            }
        }
    });

    // Initialize login
    handleLogin();
}); 