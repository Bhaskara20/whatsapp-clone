const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
                text: messageData.text,
                timestamp: new Date().toISOString()
            };

            // Simpan pesan ke riwayat chat
            const chatKey = [socket.id, messageData.receiverId].sort().join('-');
            if (!chatHistory.has(chatKey)) {
                chatHistory.set(chatKey, []);
            }
            chatHistory.get(chatKey).push(message);

            // Kirim pesan ke penerima spesifik
            if (messageData.receiverId) {
                io.to(messageData.receiverId).emit('receiveMessage', message);
                // Kirim juga ke pengirim untuk konfirmasi
                socket.emit('receiveMessage', message);
            } else {
                // Broadcast ke semua pengguna (untuk chat grup)
                io.emit('receiveMessage', message);
            }
        }
    });

    // Menangani permintaan riwayat chat
    socket.on('requestChatHistory', (data) => {
        const chatKey = [socket.id, data.userId].sort().join('-');
        const history = chatHistory.get(chatKey) || [];
        socket.emit('chatHistory', {
            userId: data.userId,
            messages: history
        });
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