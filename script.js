document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.querySelector('.message-input input');
    const sendButton = document.querySelector('.send-btn');
    const messageArea = document.querySelector('.message-area');
    const chatItems = document.querySelectorAll('.chat-item');

    // Fungsi untuk menambahkan pesan baru
    function addMessage(text, isSent = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const time = new Date().toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        messageDiv.innerHTML = `
            <p>${text}</p>
            <span class="time">${time}</span>
        `;

        messageArea.appendChild(messageDiv);
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Event listener untuk tombol kirim
    sendButton.addEventListener('click', function() {
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message);
            messageInput.value = '';
        }
    });

    // Event listener untuk input pesan (Enter key)
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const message = messageInput.value.trim();
            if (message) {
                addMessage(message);
                messageInput.value = '';
            }
        }
    });

    // Event listener untuk item chat
    chatItems.forEach(item => {
        item.addEventListener('click', function() {
            // Hapus kelas active dari semua item
            chatItems.forEach(i => i.classList.remove('active'));
            // Tambah kelas active ke item yang diklik
            this.classList.add('active');

            // Update header chat
            const contactName = this.querySelector('h4').textContent;
            const contactStatus = this.querySelector('p').textContent;
            
            document.querySelector('.contact-info h3').textContent = contactName;
            document.querySelector('.contact-info p').textContent = contactStatus;

            // Bersihkan area pesan
            messageArea.innerHTML = '';
            
            // Tambahkan pesan contoh
            addMessage('Halo, ada yang bisa saya bantu?', false);
        });
    });

    // Simulasi pesan masuk
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% kemungkinan pesan masuk
            addMessage('Pesan otomatis dari sistem', false);
            messageArea.scrollTop = messageArea.scrollHeight;
        }
    }, 5000);
}); 