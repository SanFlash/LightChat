// AniVerse Chat JavaScript
// This file contains additional JavaScript functionality for the chat application

// Global variables
let socket;
let currentRoom = 'general';
let typingUsers = new Set();
let typingTimeout;
let messageCount = 0;

// Initialize the chat application
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
    setupEventListeners();
    setupSocketIO();
});

function initializeChat() {
    // Add loading animation to the page
    document.body.classList.add('loading-state');
    
    // Initialize current room display
    updateCurrentRoomDisplay('general');
    
    // Add smooth scrolling to messages
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Remove loading state
    setTimeout(() => {
        document.body.classList.remove('loading-state');
    }, 1000);
}

function setupEventListeners() {
    // Room creation
    const createRoomBtn = document.getElementById('createRoomBtn');
    const newRoomInput = document.getElementById('newRoomName');
    
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', createRoom);
    }
    
    if (newRoomInput) {
        newRoomInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                createRoom();
            }
        });
        
        // Add input validation
        newRoomInput.addEventListener('input', function() {
            const value = this.value.trim();
            if (value.length > 0) {
                this.classList.remove('error');
                this.classList.add('success');
            } else {
                this.classList.remove('success');
            }
        });
    }
    
    // Message sending
    const sendBtn = document.getElementById('sendBtn');
    const messageInput = document.getElementById('messageInput');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Typing indicators
        messageInput.addEventListener('input', handleTyping);
        messageInput.addEventListener('blur', function() {
            socket.emit('stop_typing', { room: currentRoom });
        });
    }
    
    // Room switching
    document.addEventListener('click', function(e) {
        const roomItem = e.target.closest('.room-item');
        if (roomItem) {
            const roomName = roomItem.dataset.room;
            switchRoom(roomName);
        }
    });
    
    // Auto-resize message input
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    }
}

function setupSocketIO() {
    // Initialize SocketIO connection
    socket = io();
    
    // Connection events
    socket.on('connect', function() {
        console.log('Connected to server');
        showNotification('Connected to chat server', 'success');
        
        // Join default room
        socket.emit('join_room', { room: currentRoom });
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        showNotification('Disconnected from chat server', 'error');
    });
    
    // Message events
    socket.on('message', function(message) {
        addMessage(message);
        playMessageSound();
    });
    
    // User events
    socket.on('user_joined', function(data) {
        updateActiveUsers(data.active_users);
        if (data.username !== getCurrentUsername()) {
            showNotification(`${data.username} joined the chat`, 'info');
        }
    });
    
    socket.on('user_left', function(data) {
        updateActiveUsers(data.active_users);
        if (data.username !== getCurrentUsername()) {
            showNotification(`${data.username} left the chat`, 'info');
        }
    });
    
    // Room events
    socket.on('room_joined', function(data) {
        updateRoomUsers(data.active_users);
        showNotification(`Joined room: ${data.room}`, 'success');
    });
    
    socket.on('room_left', function(data) {
        showNotification(`Left room: ${data.room}`, 'info');
    });
    
    // Typing events
    socket.on('user_typing', function(data) {
        if (data.username !== getCurrentUsername()) {
            typingUsers.add(data.username);
            updateTypingIndicator();
        }
    });
    
    socket.on('user_stop_typing', function(data) {
        typingUsers.delete(data.username);
        updateTypingIndicator();
    });
    
    // Error handling
    socket.on('error', function(error) {
        console.error('Socket error:', error);
        showNotification('Connection error occurred', 'error');
    });
}

function createRoom() {
    const roomNameInput = document.getElementById('newRoomName');
    const roomName = roomNameInput.value.trim();
    
    if (!roomName) {
        showNotification('Please enter a room name', 'error');
        roomNameInput.classList.add('error');
        return;
    }
    
    if (roomName.length < 3) {
        showNotification('Room name must be at least 3 characters', 'error');
        roomNameInput.classList.add('error');
        return;
    }
    
    // Show loading state
    const createBtn = document.getElementById('createRoomBtn');
    const originalText = createBtn.innerHTML;
    createBtn.innerHTML = '<div class="loading"></div>';
    createBtn.disabled = true;
    
    fetch('/create_room', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `room_name=${encodeURIComponent(roomName)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            addRoomToList(data.room_name);
            roomNameInput.value = '';
            roomNameInput.classList.remove('error');
            switchRoom(data.room_name);
            showNotification(`Room "${data.room_name}" created successfully`, 'success');
        } else {
            showNotification(data.message, 'error');
            roomNameInput.classList.add('error');
        }
    })
    .catch(error => {
        console.error('Error creating room:', error);
        showNotification('Failed to create room', 'error');
    })
    .finally(() => {
        createBtn.innerHTML = originalText;
        createBtn.disabled = false;
    });
}

function addRoomToList(roomName) {
    const roomsList = document.getElementById('roomsList');
    const roomItem = document.createElement('div');
    roomItem.className = 'room-item cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-colors duration-300 animate-slide-in';
    roomItem.dataset.room = roomName;
    roomItem.innerHTML = `
        <div class="flex items-center justify-between">
            <span class="text-white text-sm"># ${roomName}</span>
            <span class="text-gray-400 text-xs">0 msgs</span>
        </div>
    `;
    roomsList.appendChild(roomItem);
}

function switchRoom(roomName) {
    if (roomName === currentRoom) return;
    
    // Show loading state
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '<div class="text-center text-gray-400"><div class="loading"></div> Loading messages...</div>';
    
    // Leave current room
    socket.emit('leave_room', { room: currentRoom });
    
    // Update current room
    currentRoom = roomName;
    updateCurrentRoomDisplay(roomName);
    
    // Join new room
    socket.emit('join_room', { room: roomName });
    
    // Update room selection
    updateRoomSelection(roomName);
    
    // Clear typing indicators
    typingUsers.clear();
    updateTypingIndicator();
}

function updateCurrentRoomDisplay(roomName) {
    const currentRoomElement = document.getElementById('currentRoom');
    if (currentRoomElement) {
        currentRoomElement.textContent = `# ${roomName}`;
    }
}

function updateRoomSelection(roomName) {
    document.querySelectorAll('.room-item').forEach(item => {
        item.classList.remove('bg-purple-600', 'active');
    });
    
    const selectedRoom = document.querySelector(`[data-room="${roomName}"]`);
    if (selectedRoom) {
        selectedRoom.classList.add('bg-purple-600', 'active');
    }
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Add message to UI immediately for better UX
    const tempMessage = {
        content: message,
        username: getCurrentUsername(),
        timestamp: new Date().toLocaleTimeString(),
        temp: true
    };
    addMessage(tempMessage);
    
    // Send to server
    socket.emit('send_message', {
        room: currentRoom,
        message: message
    });
    
    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Stop typing indicator
    socket.emit('stop_typing', { room: currentRoom });
}

function handleTyping() {
    socket.emit('typing', { room: currentRoom });
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit('stop_typing', { room: currentRoom });
    }, 1000);
}

function addMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageElement = document.createElement('div');
    messageElement.className = 'message-item animate-fade-in';
    
    const isOwnMessage = message.username === getCurrentUsername();
    const isTemp = message.temp;
    
    messageElement.innerHTML = `
        <div class="flex ${isOwnMessage ? 'justify-end' : 'justify-start'}">
            <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg message-bubble ${isOwnMessage ? 'bg-purple-600 text-white' : 'bg-white/10 text-white'} ${isTemp ? 'opacity-70' : ''}">
                ${!isOwnMessage ? `<div class="text-xs text-gray-400 mb-1">${message.username}</div>` : ''}
                <div class="text-sm">${escapeHtml(message.content)}</div>
                <div class="text-xs ${isOwnMessage ? 'text-purple-200' : 'text-gray-400'} mt-1 message-timestamp">${message.timestamp}</div>
            </div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
    
    // Remove temp message after a delay
    if (isTemp) {
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 2000);
    }
}

function updateActiveUsers(users) {
    const activeUsersContainer = document.getElementById('activeUsers');
    if (!activeUsersContainer) return;
    
    activeUsersContainer.innerHTML = '';
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors duration-300 animate-slide-in';
        userElement.innerHTML = `
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse online-indicator"></div>
            <span class="text-white text-sm">${escapeHtml(user.username)}</span>
        `;
        activeUsersContainer.appendChild(userElement);
    });
}

function updateRoomUsers(users) {
    const roomUsersElement = document.getElementById('roomUsers');
    if (roomUsersElement) {
        roomUsersElement.textContent = `Users in room: ${users.length}`;
    }
}

function updateTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    const typingUsersSpan = document.getElementById('typingUsers');
    
    if (!indicator || !typingUsersSpan) return;
    
    if (typingUsers.size > 0) {
        const usersList = Array.from(typingUsers).join(', ');
        typingUsersSpan.textContent = usersList;
        indicator.classList.remove('hidden');
        indicator.classList.add('animate-fade-in');
    } else {
        indicator.classList.add('hidden');
    }
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 notification animate-slide-in`;
    
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-black'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function playMessageSound() {
    // Create a simple notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCurrentUsername() {
    // This would typically come from the server or be stored in a global variable
    // For now, we'll extract it from the page content
    const usernameElement = document.querySelector('.text-white.font-semibold');
    return usernameElement ? usernameElement.textContent.trim() : 'Unknown';
}

// Utility functions
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function formatMessageCount(count) {
    if (count < 1000) return count.toString();
    if (count < 1000000) return (count / 1000).toFixed(1) + 'k';
    return (count / 1000000).toFixed(1) + 'm';
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus message input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
        }
    }
    
    // Escape to clear message input
    if (e.key === 'Escape') {
        const messageInput = document.getElementById('messageInput');
        if (messageInput && document.activeElement === messageInput) {
            messageInput.value = '';
            messageInput.blur();
        }
    }
});

// Auto-save draft messages
let messageDraft = '';
const messageInput = document.getElementById('messageInput');

if (messageInput) {
    // Save draft on input
    messageInput.addEventListener('input', function() {
        messageDraft = this.value;
        localStorage.setItem('messageDraft', messageDraft);
    });
    
    // Restore draft on page load
    const savedDraft = localStorage.getItem('messageDraft');
    if (savedDraft) {
        messageInput.value = savedDraft;
    }
    
    // Clear draft on successful send
    const originalSendMessage = sendMessage;
    sendMessage = function() {
        originalSendMessage();
        localStorage.removeItem('messageDraft');
        messageDraft = '';
    };
}
