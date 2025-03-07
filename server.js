const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    maxHttpBufferSize: 1e8 // 100 MB max file size
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Menyimpan data pengguna yang terhubung
const connectedUsers = new Map();

// Menyimpan riwayat chat
const chatHistory = new Map();

// Fungsi untuk mengirim daftar pengguna ke client tertentu
function sendUserList(socket) {
    const currentUserId = socket.id;
    const users = Array.from(connectedUsers.values()).filter(user => user.id !== currentUserId);
    socket.emit('userList', users);
}

// Fungsi untuk broadcast daftar pengguna ke semua client
function broadcastUserList() {
    const sockets = io.sockets.sockets;
    sockets.forEach(socket => {
        sendUserList(socket);
    });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Menangani login pengguna
    socket.on('login', (userData) => {
        const user = {
            id: socket.id,
            name: userData.name,
            status: 'online'
        };
        
        connectedUsers.set(socket.id, user);
        
        // Kirim daftar pengguna yang sudah terhubung ke pengguna baru (tanpa dirinya sendiri)
        sendUserList(socket);
        
        // Broadcast status online ke semua pengguna
        io.emit('userStatus', {
            userId: socket.id,
            status: 'online',
            name: userData.name
        });

        // Broadcast daftar pengguna yang diperbarui
        broadcastUserList();
    });

    // Menangani pengiriman pesan
    socket.on('sendMessage', (messageData) => {
        const sender = connectedUsers.get(socket.id);
        if (sender) {
            const message = {
                id: Date.now(),
                senderId: socket.id,
                senderName: sender.name,
                receiverId: messageData.receiverId,
                text: messageData.text,
                timestamp: new Date().toISOString()
            };

            // Simpan pesan ke riwayat chat
            const chatKey = [socket.id, messageData.receiverId].sort().join('-');
            if (!chatHistory.has(chatKey)) {
                chatHistory.set(chatKey, []);
            }
            chatHistory.get(chatKey).push(message);

            // Kirim pesan ke penerima
            io.to(messageData.receiverId).emit('receiveMessage', {
                ...message,
                isReceived: true
            });

            // Kirim konfirmasi ke pengirim
            socket.emit('receiveMessage', {
                ...message,
                isReceived: false
            });
        }
    });

    // Menangani permintaan riwayat chat
    socket.on('requestChatHistory', (data) => {
        const chatKey = [socket.id, data.userId].sort().join('-');
        const history = chatHistory.get(chatKey) || [];
        const processedHistory = history.map(msg => ({
            ...msg,
            isReceived: msg.senderId !== socket.id
        }));
        socket.emit('chatHistory', {
            userId: data.userId,
            messages: processedHistory
        });
    });

    // Handle file upload
    socket.on('uploadFile', (data) => {
        const sender = connectedUsers.get(socket.id);
        if (sender && data.file) {
            const fileName = `${Date.now()}-${data.fileName}`;
            const filePath = path.join(uploadsDir, fileName);
            
            // Save file
            fs.writeFile(filePath, data.file, 'base64', (err) => {
                if (err) {
                    console.error('Error saving file:', err);
                    return;
                }

                const fileMessage = {
                    id: Date.now(),
                    senderId: socket.id,
                    senderName: sender.name,
                    receiverId: data.receiverId,
                    type: 'file',
                    fileName: data.fileName,
                    fileSize: data.fileSize,
                    filePath: `/uploads/${fileName}`,
                    timestamp: new Date().toISOString()
                };

                // Save to chat history
                const chatKey = [socket.id, data.receiverId].sort().join('-');
                if (!chatHistory.has(chatKey)) {
                    chatHistory.set(chatKey, []);
                }
                chatHistory.get(chatKey).push(fileMessage);

                // Send to receiver
                io.to(data.receiverId).emit('receiveMessage', {
                    ...fileMessage,
                    isReceived: true
                });

                // Send confirmation to sender
                socket.emit('receiveMessage', {
                    ...fileMessage,
                    isReceived: false
                });
            });
        }
    });

    // Menangani disconnect
    socket.on('disconnect', () => {
        const user = connectedUsers.get(socket.id);
        if (user) {
            connectedUsers.delete(socket.id);
            io.emit('userStatus', {
                userId: socket.id,
                status: 'offline',
                name: user.name
            });
            // Broadcast daftar pengguna yang diperbarui
            broadcastUserList();
        }
    });
});

// API Endpoints
app.get('/api/users', (req, res) => {
    const users = Array.from(connectedUsers.values());
    res.json(users);
});

// Menjalankan server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 