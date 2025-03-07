document.addEventListener('DOMContentLoaded', function() {
    // Koneksi Socket.IO
    const socket = io('http://localhost:3000');
    let currentUser = null;
    let selectedChat = null;
    let connectedUsers = [];

    // DOM Elements
    const messageInput = document.querySelector('.message-input input');
    const sendButton = document.querySelector('.send-btn');
    const messageArea = document.querySelector('.message-area');
    const chatList = document.querySelector('.chat-list');
    const userProfile = document.querySelector('.user-profile');

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

    // Fungsi untuk menambahkan pesan baru
    function addMessage(message, isSent = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <p>${message.text}</p>
            <span class="time">${time}</span>
        `;

        messageArea.appendChild(messageDiv);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Event listener untuk tombol kirim
    sendButton.addEventListener('click', function() {
        const message = messageInput.value.trim();
        if (message && selectedChat) {
            // Kirim pesan ke server
            socket.emit('sendMessage', {
                text: message,
                receiverId: selectedChat.id
            });
            messageInput.value = '';
        }
    });

    // Event listener untuk input pesan (Enter key)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
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
    });

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