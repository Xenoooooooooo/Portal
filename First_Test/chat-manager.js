// Chat Manager - Handle chat functionality with Firebase integration
import { database } from './database-service.js';
import { ref, get, set, push, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getCurrentUserId } from './auth-guard.js';

let availableUsers = [];
let messageRequests = [];
let currentUserId = null;

let currentConversation = {
    id: null,
    name: null,
    avatar: null,
    userId: null,
    messages: []
};


// ===========================
// Initialize Chat Manager
// ===========================
export async function initializeChatManager() {
    console.log('Initializing Chat Manager...');
    
    try {
        currentUserId = getCurrentUserId();
        if (!currentUserId) {
            console.error('No user logged in');
            return;
        }
        
        // Load available users and conversations
        await loadAvailableUsers();
        await loadConversations();
        await loadMessageRequests();
        
        setupChatListeners();
        setupSearchInput();
        setupInputHandlers();
        renderMessageRequests();
        
        // Load first conversation if available
        const firstItem = document.querySelector('.chat-item-full');
        if (firstItem) {
            firstItem.click();
        }
        
        console.log('Chat Manager initialized!');
    } catch (error) {
        console.error('Error initializing chat manager:', error);
    }
}

// ===========================
// Load Available Users
// ===========================
async function loadAvailableUsers() {
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
            const usersObj = snapshot.val();
            availableUsers = Object.keys(usersObj).map(uid => ({
                uid: uid,
                name: usersObj[uid].name || usersObj[uid].email.split('@')[0],
                avatar: (usersObj[uid].name || usersObj[uid].email).substring(0, 2).toUpperCase()
            })).filter(user => user.uid !== currentUserId); // Exclude current user
            
            console.log('Available users loaded:', availableUsers.length);
        }
    } catch (error) {
        console.error('Error loading available users:', error);
    }
}

// ===========================
// Load Conversations
// ===========================
async function loadConversations() {
    try {
        const conversationsRef = ref(database, `conversations/${currentUserId}`);
        const snapshot = await get(conversationsRef);
        
        const chatList = document.querySelector('.chat-list-full');
        
        if (!snapshot.exists()) {
            console.log('No conversations found');
            chatList.innerHTML = '';
            return;
        }
        
        const convObj = snapshot.val();
        console.log('Conversations loaded:', Object.keys(convObj).length);
        chatList.innerHTML = '';
        
        Object.keys(convObj).forEach(convId => {
            const conv = convObj[convId];
            const otherUserId = conv.otherUserId;
            const otherUser = availableUsers.find(u => u.uid === otherUserId);
            
            if (otherUser) {
                const item = document.createElement('div');
                item.className = 'chat-item-full';
                item.dataset.userId = otherUserId;
                item.dataset.convId = convId;
                item.innerHTML = `
                    <div class="chat-avatar-large">${otherUser.avatar}</div>
                    <div class="chat-info">
                        <h4>${otherUser.name}</h4>
                        <p>${conv.lastMessage || 'Start a conversation'}</p>
                        <span class="chat-time">${conv.lastMessageTime || 'Now'}</span>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    document.querySelectorAll('.chat-item-full').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    loadConversationMessages(convId, otherUser);
                });
                
                chatList.appendChild(item);
            }
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

// ===========================
// Load Message Requests
// ===========================
async function loadMessageRequests() {
    try {
        const requestsRef = ref(database, `messageRequests/${currentUserId}`);
        const snapshot = await get(requestsRef);
        
        messageRequests = [];
        
        if (snapshot.exists()) {
            const requestsObj = snapshot.val();
            Object.keys(requestsObj).forEach(reqId => {
                const req = requestsObj[reqId];
                const sender = availableUsers.find(u => u.uid === req.senderUid);
                if (sender) {
                    messageRequests.push({
                        reqId: reqId,
                        senderUid: req.senderUid,
                        name: sender.name,
                        avatar: sender.avatar,
                        message: req.message
                    });
                }
            });
        }
        
        console.log('Message requests loaded:', messageRequests.length);
    } catch (error) {
        console.error('Error loading message requests:', error);
    }
}

// ===========================
// Load Conversation Messages
// ===========================
async function loadConversationMessages(convId, otherUser) {
    try {
        const messagesRef = ref(database, `conversations/${currentUserId}/${convId}/messages`);
        const snapshot = await get(messagesRef);
        
        currentConversation = {
            id: convId,
            name: otherUser.name,
            avatar: otherUser.avatar,
            userId: otherUser.uid,
            messages: []
        };
        
        if (snapshot.exists()) {
            const messagesObj = snapshot.val();
            Object.keys(messagesObj).forEach(msgId => {
                const msg = messagesObj[msgId];
                currentConversation.messages.push({
                    id: msgId,
                    type: msg.senderUid === currentUserId ? 'sent' : 'received',
                    text: msg.text,
                    time: msg.timestamp,
                    read: msg.read || false
                });
            });
        }
        
        // Update header
        const header = document.querySelector('.chat-header-main');
        if (header) {
            header.innerHTML = `
                <div class="chat-avatar-large">${otherUser.avatar}</div>
                <div>
                    <h3>${otherUser.name}</h3>
                    <span class="status-online">● Online</span>
                </div>
            `;
        }
        
        renderMessages();
        autoScrollToBottom();
    } catch (error) {
        console.error('Error loading conversation messages:', error);
    }
}

// ===========================
// Setup Chat Item Listeners
// ===========================
function setupChatListeners() {
    // Chat listeners are now set up dynamically in loadConversations
    // so this function is no longer needed
}

// Setup Search Input
// ===========================
function setupSearchInput() {
    // Search is now handled in the modal, so this can be empty or removed
    // Keeping it for backward compatibility
}

// ===========================
// Show Search Modal
// ===========================
window.showSearchModal = function() {
    const overlay = document.createElement('div');
    overlay.className = 'search-modal-overlay';
    
    overlay.innerHTML = `
        <div class="search-modal">
            <h3>Search Users</h3>
            <input type="text" id="modalSearchInput" placeholder="Search by name...">
            <div class="search-modal-results" id="modalSearchResults"></div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const searchInput = overlay.querySelector('#modalSearchInput');
    const resultsContainer = overlay.querySelector('#modalSearchResults');
    
    // Auto-focus the input
    searchInput.focus();
    
    // Handle search input
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        if (!query) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        // Filter available users by name
        const filtered = availableUsers.filter(user => 
            user.name.toLowerCase().includes(query)
        );
        
        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No users found</div>';
            return;
        }
        
        // Display results
        resultsContainer.innerHTML = filtered.map(user => `
            <div class="search-result-item">
                <div class="search-result-info" onclick="(function(){
                    const u = availableUsers.find(u => u.uid === '${user.uid}');
                    if (u) {
                        startNewConversation(u);
                        overlay.remove();
                    }
                })()">
                    <div class="chat-avatar-large">${user.avatar}</div>
                    <h4>${user.name}</h4>
                </div>
                <button class="search-result-btn" onclick="(function(){
                    sendMessageRequest('${user.uid}');
                    overlay.remove();
                })()">Request</button>
            </div>
        `).join('');
    });
    
    // Close modal on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    // Close modal on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ===========================
// Start New Conversation
// ===========================
async function startNewConversation(user) {
    try {
        // Create or get conversation ID
        const convId = `${currentUserId}-${user.uid}`;
        const conversationRef = ref(database, `conversations/${currentUserId}/${convId}`);
        const snapshot = await get(conversationRef);
        
        if (!snapshot.exists()) {
            // Create new conversation
            await set(conversationRef, {
                otherUserId: user.uid,
                lastMessage: 'Conversation started',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
            
            // Also create entry in other user's conversation list
            const otherConvRef = ref(database, `conversations/${user.uid}/${convId}`);
            await set(otherConvRef, {
                otherUserId: currentUserId,
                lastMessage: 'Conversation started',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
        }
        
        // Add to conversation list if not already there
        const existingItem = document.querySelector(`[data-user-id="${user.uid}"]`);
        if (!existingItem) {
            const chatList = document.querySelector('.chat-list-full');
            const newItem = document.createElement('div');
            newItem.className = 'chat-item-full active';
            newItem.dataset.userId = user.uid;
            newItem.dataset.convId = convId;
            newItem.innerHTML = `
                <div class="chat-avatar-large">${user.avatar}</div>
                <div class="chat-info">
                    <h4>${user.name}</h4>
                    <p>Conversation started</p>
                    <span class="chat-time">Just now</span>
                </div>
            `;
            
            newItem.addEventListener('click', () => {
                document.querySelectorAll('.chat-item-full').forEach(i => i.classList.remove('active'));
                newItem.classList.add('active');
                loadConversationMessages(convId, user);
            });
            
            // Remove active from others
            chatList.querySelectorAll('.chat-item-full').forEach(i => i.classList.remove('active'));
            chatList.insertBefore(newItem, chatList.firstChild);
        } else {
            document.querySelectorAll('.chat-item-full').forEach(i => i.classList.remove('active'));
            existingItem.classList.add('active');
        }
        
        currentConversation = {
            id: convId,
            name: user.name,
            avatar: user.avatar,
            userId: user.uid,
            messages: []
        };
        
        // Update header
        const header = document.querySelector('.chat-header-main');
        if (header) {
            header.innerHTML = `
                <div class="chat-avatar-large">${user.avatar}</div>
                <div>
                    <h3>${user.name}</h3>
                    <span class="status-online">● Online</span>
                </div>
            `;
        }
        
        renderMessages();
        autoScrollToBottom();
    } catch (error) {
        console.error('Error starting new conversation:', error);
    }
}

// ===========================
// Send Message Request
// ===========================
window.sendMessageRequest = async function(recipientUid) {
    try {
        const message = prompt('Enter your message:');
        if (!message) return;
        
        const reqId = Date.now().toString();
        const messageRequestRef = ref(database, `messageRequests/${recipientUid}/${reqId}`);
        
        await set(messageRequestRef, {
            senderUid: currentUserId,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Show success notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--primary-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = 'Message request sent!';
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), 3000);
    } catch (error) {
        console.error('Error sending message request:', error);
        alert('Failed to send message request');
    }
}

// ===========================
// Render Message Requests
// ===========================
function renderMessageRequests() {
    const iconContainer = document.getElementById('messageRequestsIcon');
    if (!iconContainer) {
        console.warn('messageRequestsIcon not found in DOM');
        return;
    }
    
    console.log('Rendering message requests:', messageRequests);
    
    // Always show the icon, with or without requests
    const badgeHTML = messageRequests.length > 0 ? `<div class="msg-request-badge">${messageRequests.length}</div>` : '';
    
    iconContainer.innerHTML = `
        <div style="cursor: pointer; position: relative;" onclick="showAllMessageRequestsModal()">
            🔔
            ${badgeHTML}
        </div>
    `;
}

// ===========================
// Show All Message Requests Modal
// ===========================
window.showAllMessageRequestsModal = function() {
    const overlay = document.createElement('div');
    overlay.className = 'msg-request-overlay';
    
    let requestsHTML = '';
    
    if (messageRequests.length === 0) {
        requestsHTML = `
            <div style="
                padding: 2rem 1.5rem;
                text-align: center;
                color: var(--text-secondary);
                font-size: 0.95rem;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                <p>No message requests yet</p>
            </div>
        `;
    } else {
        requestsHTML = messageRequests.map(req => `
            <div class="msg-request-item">
                <div class="msg-request-avatar">${req.avatar}</div>
                <div class="msg-request-info">
                    <h4>${req.name}</h4>
                    <p>${req.message}</p>
                </div>
                <div class="msg-request-actions" style="flex-direction: column; gap: 0.5rem;">
                    <button class="msg-request-accept" onclick="acceptRequest('${req.reqId}')">Accept</button>
                    <button class="msg-request-decline" onclick="declineRequest('${req.reqId}')">Decline</button>
                </div>
            </div>
        `).join('');
    }
    
    overlay.innerHTML = `
        <div class="msg-request-modal">
            <div class="msg-request-modal-header">
                <h3>Message Requests ${messageRequests.length > 0 ? `(${messageRequests.length})` : ''}</h3>
            </div>
            <div class="msg-request-modal-body">
                ${requestsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// ===========================
// Show Message Request Modal
// ===========================
window.showMessageRequestModal = function(reqId) {
    const req = messageRequests.find(r => r.reqId === reqId);
    if (!req) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'msg-request-overlay';
    
    overlay.innerHTML = `
        <div class="msg-request-modal" style="max-width: 400px;">
            <div class="msg-request-modal-header">
                <h3>Message Request</h3>
            </div>
            <div class="msg-request-modal-body">
                <div class="msg-request-item" style="border: none;">
                    <div class="msg-request-avatar">${req.avatar}</div>
                    <div class="msg-request-info">
                        <h4>${req.name}</h4>
                        <p>${req.message}</p>
                    </div>
                </div>
            </div>
            <div class="msg-request-modal-body" style="padding: 1rem; display: flex; gap: 0.75rem;">
                <button class="msg-request-accept" onclick="acceptRequest('${req.reqId}')" style="flex: 1;">Accept</button>
                <button class="msg-request-decline" onclick="declineRequest('${req.reqId}')" style="flex: 1;">Decline</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// ===========================
// Accept Message Request
// ===========================
window.acceptRequest = function(reqId) {
    const req = messageRequests.find(r => r.reqId === reqId);
    if (!req) return;
    
    const user = availableUsers.find(u => u.uid === req.senderUid);
    if (user) {
        startNewConversation(user);
        messageRequests = messageRequests.filter(r => r.reqId !== reqId);
        renderMessageRequests();
        
        // Close modal
        const overlay = document.querySelector('.msg-request-overlay');
        if (overlay) overlay.remove();
    }
}

// ===========================
// Decline Message Request
// ===========================
window.declineRequest = function(reqId) {
    messageRequests = messageRequests.filter(r => r.reqId !== reqId);
    renderMessageRequests();
    
    // Close modal
    const overlay = document.querySelector('.msg-request-overlay');
    if (overlay) overlay.remove();
}

// ===========================
// Setup Input Handlers
// ===========================
function setupInputHandlers() {
    const input = document.querySelector('.chat-input');
    const sendBtn = document.querySelector('.btn-send');
    
    if (input && sendBtn) {
        // Send on button click
        sendBtn.addEventListener('click', sendMessage);
        
        // Send on Enter key
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// ===========================
// Send Message
// ===========================
function sendMessage() {
    const input = document.querySelector('.chat-input');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Add message to conversation
    const newMessage = {
        id: currentConversation.messages.length + 1,
        type: 'sent',
        text: text,
        time: getRelativeTime(new Date()),
        read: false
    };
    
    currentConversation.messages.push(newMessage);
    
    // Clear input and re-render
    input.value = '';
    renderMessages();
    autoScrollToBottom();
}


// ===========================
// Render Messages
// ===========================
function renderMessages() {
    const container = document.querySelector('.chat-messages');
    if (!container) return;
    
    // Clear existing messages but keep typing indicator if present
    container.innerHTML = '';
    
    // Add date divider
    const divider = document.createElement('div');
    divider.className = 'message-date-divider';
    divider.textContent = 'Today';
    container.appendChild(divider);
    
    // Render messages
    currentConversation.messages.forEach((msg, idx) => {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${msg.type}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        
        const content = document.createElement('div');
        content.className = 'message-content';
        const p = document.createElement('p');
        p.textContent = msg.text;
        content.appendChild(p);
        
        const footer = document.createElement('div');
        footer.className = 'message-footer';
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = msg.time;
        footer.appendChild(time);
        
        if (msg.type === 'sent') {
            const receipt = document.createElement('span');
            receipt.className = 'read-receipt';
            receipt.textContent = msg.read ? '✓✓' : '✓';
            footer.appendChild(receipt);
        }
        
        wrapper.appendChild(content);
        wrapper.appendChild(footer);
        
        if (msg.type === 'received') {
            messageEl.insertAdjacentHTML('afterbegin', `<div class="message-avatar">${currentConversation.avatar}</div>`);
        }
        
        messageEl.appendChild(wrapper);
        container.appendChild(messageEl);
    });
}

// ===========================
// Show Typing Indicator
// ===========================
function showTypingIndicator() {
    const container = document.querySelector('.chat-messages');
    if (!container) return;
    
    // Remove any existing typing indicator
    const existing = container.querySelector('.typing-container');
    if (existing) existing.remove();
    
    const typingContainer = document.createElement('div');
    typingContainer.className = 'typing-container message received';
    typingContainer.innerHTML = `
        <div class="message-avatar">${currentConversation.avatar}</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    
    container.appendChild(typingContainer);
    autoScrollToBottom();
    
    // Remove typing indicator when done
    setTimeout(() => {
        if (typingContainer.parentElement) {
            typingContainer.remove();
        }
    }, 1500);
}

// ===========================
// Auto-scroll to Bottom
// ===========================
function autoScrollToBottom() {
    const container = document.querySelector('.chat-messages');
    if (container) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 0);
    }
}

// ===========================
// Get Relative Time
// ===========================
function getRelativeTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
}

console.log('Chat Manager module loaded!');
