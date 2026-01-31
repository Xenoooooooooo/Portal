// ===========================
// User Features Module
// Merged: chat-manager.js + profile-manager.js
// ===========================
import { database } from './firebase-service.js';
import { ref, get, set, push, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getCurrentUserId } from './auth.js';
import { getUserData } from './firebase-service.js';

let availableUsers = [];
let messageRequests = [];
let currentUserId = null;
let currentConversation = { id: null, name: null, avatar: null, userId: null, messages: [] };
let selectedUserForRequest = null;
let isProfileInitialized = false;
let isEditMode = false;
let originalData = {};
let messageListenerRef = null;
let messageUnsubscribe = null;

// ===========================
// CHAT MANAGER SECTION
// ===========================

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
        
        await loadAvailableUsers();
        await loadConversations();
        await loadMessageRequests();
        
        setupChatListeners();
        setupSearchInput();
        setupInputHandlers();
        renderMessageRequestsIcon();
        setupMessageRequestsListener();
        
        // Only auto-select first conversation if one exists
        const firstItem = document.querySelector('.chat-item-full');
        if (firstItem) {
            firstItem.click();
        } else {
            // Show empty state if no conversations
            showEmptyChat();
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
            })).filter(user => user.uid !== currentUserId);
            
            console.log('Available users loaded:', availableUsers.length);
        }
    } catch (error) {
        console.error('Error loading available users:', error);
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
// Setup Message Requests Listener
// ===========================
function setupMessageRequestsListener() {
    try {
        const requestsRef = ref(database, `messageRequests/${currentUserId}`);
        onValue(requestsRef, async (snapshot) => {
            console.log('Message requests updated');
            await loadMessageRequests();
            renderMessageRequestsIcon();
        });
    } catch (error) {
        console.error('Error setting up message requests listener:', error);
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
// Load Conversation Messages
// ===========================
async function loadConversationMessages(convId, otherUser) {
    try {
        console.log('Loading conversation:', convId);
        
        // Remove previous listener
        if (messageUnsubscribe) {
            console.log('Unsubscribing from previous listener');
            messageUnsubscribe();
        }
        
        const messagesRef = ref(database, `conversations/${currentUserId}/${convId}/messages`);
        console.log('Messages ref path:', `conversations/${currentUserId}/${convId}/messages`);
        
        // Initial load
        const snapshot = await get(messagesRef);
        console.log('Initial snapshot exists:', snapshot.exists());
        
        currentConversation = {
            id: convId,
            name: otherUser.name,
            avatar: otherUser.avatar,
            userId: otherUser.uid,
            messages: []
        };
        
        if (snapshot.exists()) {
            const messagesObj = snapshot.val();
            console.log('Messages object:', messagesObj);
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
            console.log('Loaded messages:', currentConversation.messages.length);
        } else {
            console.log('No messages found for this conversation');
        }
        
        const header = document.querySelector('.chat-header-main');
        if (header) {
            header.innerHTML = `
                <div class="chat-avatar-large">${otherUser.avatar}</div>
                <div><h3>${otherUser.name}</h3><span class="status-online">● Online</span></div>
            `;
        }
        
        // Show input container
        const inputContainer = document.querySelector('.chat-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'flex';
        }
        
        renderMessages();
        autoScrollToBottom();
        
        // Set up real-time listener for new messages
        messageUnsubscribe = onValue(messagesRef, (snapshot) => {
            console.log('Real-time message update');
            if (snapshot.exists()) {
                const messagesObj = snapshot.val();
                const newMessages = [];
                
                Object.keys(messagesObj).forEach(msgId => {
                    const msg = messagesObj[msgId];
                    // Only add if not already in list
                    if (!currentConversation.messages.find(m => m.id === msgId)) {
                        console.log('New message found:', msgId);
                        newMessages.push({
                            id: msgId,
                            type: msg.senderUid === currentUserId ? 'sent' : 'received',
                            text: msg.text,
                            time: msg.timestamp,
                            read: msg.read || false
                        });
                    }
                });
                
                // Add new messages to conversation
                currentConversation.messages.push(...newMessages);
                
                if (newMessages.length > 0) {
                    console.log('Rendering new messages');
                    renderMessages();
                    autoScrollToBottom();
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading conversation messages:', error);
    }
}

// ===========================
// Show Empty Chat State
// ===========================
function showEmptyChat() {
    const header = document.querySelector('.chat-header-main');
    const messagesContainer = document.querySelector('.chat-messages');
    const inputContainer = document.querySelector('.chat-input-container');
    
    if (header) {
        header.innerHTML = `
            <div class="chat-avatar-large" style="background: var(--light);"></div>
            <div>
                <h3>No conversations yet</h3>
                <span class="status-online" style="color: var(--text-secondary);">Click the search icon to start a conversation</span>
            </div>
        `;
    }
    
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); flex-direction: column; gap: 1rem;">
                <div style="font-size: 4rem; opacity: 0.5;">💬</div>
                <p style="text-align: center; font-size: 1rem;">No conversations yet</p>
                <p style="text-align: center; font-size: 0.85rem; opacity: 0.7;">Search for users to start a conversation</p>
            </div>
        `;
    }
    
    if (inputContainer) {
        inputContainer.style.display = 'none';
    }
    
    currentConversation = { id: null, name: null, avatar: null, userId: null, messages: [] };
}

// ===========================
// Setup Chat Listeners
// ===========================
function setupChatListeners() {
    // Chat listeners are set up dynamically in loadConversations
}

// ===========================
// Setup Search Input
// ===========================
function setupSearchInput() {
    // Search handled in modal
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
            <input type="text" id="modalSearchInput" placeholder="Search by name..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text-primary); font-size: 1rem;">
            <div class="search-modal-results" id="modalSearchResults"></div>
            <div id="messageRequestPanel" style="display: none; padding: 1rem; border-top: 1px solid var(--border); background: var(--surface); gap: 1rem; flex-direction: column; flex-wrap: wrap;">
                <div>
                    <strong id="selectedUserName" style="color: var(--text-primary);"></strong>
                    <p id="selectedUserEmail" style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;"></p>
                </div>
                <textarea id="messageRequestText" placeholder="Type your message..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-family: inherit; font-size: 0.9rem; resize: none; height: 100px; background: var(--surface); color: var(--text-primary);"></textarea>
                <div style="display: flex; gap: 0.5rem;">
                    <button id="sendRequestBtn" style="flex: 1; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Send Request</button>
                    <button id="cancelRequestBtn" style="flex: 1; padding: 0.75rem; background: var(--border); color: var(--text-primary); border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const searchInput = overlay.querySelector('#modalSearchInput');
    const resultsContainer = overlay.querySelector('#modalSearchResults');
    const messagePanel = overlay.querySelector('#messageRequestPanel');
    const selectedUserName = overlay.querySelector('#selectedUserName');
    const selectedUserEmail = overlay.querySelector('#selectedUserEmail');
    const messageText = overlay.querySelector('#messageRequestText');
    const sendBtn = overlay.querySelector('#sendRequestBtn');
    const cancelBtn = overlay.querySelector('#cancelRequestBtn');
    
    searchInput.focus();
    
    // Reload users if not available
    if (availableUsers.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Loading users...</div>';
        loadAvailableUsers().then(() => {
            resultsContainer.innerHTML = '';
        });
    }
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim().toLowerCase();
        messagePanel.style.display = 'none';
        selectedUserForRequest = null;
        
        if (!query) {
            resultsContainer.innerHTML = '';
            return;
        }
        
        // Make sure users are loaded
        if (availableUsers.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">Loading users...</div>';
            await loadAvailableUsers();
        }
        
        const filtered = availableUsers.filter(user => 
            user.name.toLowerCase().includes(query)
        );
        
        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No users found</div>';
            return;
        }
        
        resultsContainer.innerHTML = filtered.map(user => `
            <div class="search-result-item" onclick="window.selectUserForRequest(${JSON.stringify(user).replace(/"/g, '&quot;')})" style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; gap: 1rem; align-items: center; cursor: pointer; transition: background 0.2s; border-radius: 6px;">
                <div class="chat-avatar-large">${user.avatar}</div>
                <div style="flex: 1;">
                    <h4 style="margin: 0; color: var(--text-primary);">${user.name}</h4>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0 0;">Send message request</p>
                </div>
            </div>
        `).join('');
    });
    
    // Select user for message request
    window.selectUserForRequest = function(user) {
        console.log('selectUserForRequest called with:', user);
        selectedUserForRequest = user;
        resultsContainer.innerHTML = '';
        searchInput.style.display = 'none';
        messagePanel.style.display = 'flex';
        selectedUserName.textContent = user.name;
        selectedUserEmail.textContent = user.avatar;
        messageText.value = '';
        messageText.focus();
        console.log('Message panel should now be visible');
    };
    
    sendBtn.addEventListener('click', async () => {
        const message = messageText.value.trim();
        if (!message || !selectedUserForRequest) {
            alert('Please type a message');
            return;
        }
        
        try {
            await sendMessageRequest(selectedUserForRequest.uid, message);
            alert('Message request sent!');
            overlay.remove();
        } catch (error) {
            console.error('Error sending request:', error);
            alert('Failed to send request');
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        messagePanel.style.display = 'none';
        searchInput.style.display = 'block';
        selectedUserForRequest = null;
        searchInput.value = '';
        resultsContainer.innerHTML = '';
        searchInput.focus();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
};

// ===========================
// Send Message Request
// ===========================
async function sendMessageRequest(recipientUid, message) {
    try {
        const requestRef = ref(database, `messageRequests/${recipientUid}/${Date.now()}`);
        await set(requestRef, {
            senderUid: currentUserId,
            message: message,
            createdAt: new Date().toISOString()
        });
        console.log('Message request sent to', recipientUid);
    } catch (error) {
        console.error('Error sending message request:', error);
        throw error;
    }
}

// ===========================
// Start New Conversation
// ===========================
window.startNewConversation = async function(user) {
    try {
        const convId = `${currentUserId}-${user.uid}`;
        const conversationRef = ref(database, `conversations/${currentUserId}/${convId}`);
        const snapshot = await get(conversationRef);
        
        if (!snapshot.exists()) {
            await set(conversationRef, {
                otherUserId: user.uid,
                lastMessage: 'Conversation started',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
            
            const otherConvRef = ref(database, `conversations/${user.uid}/${convId}`);
            await set(otherConvRef, {
                otherUserId: currentUserId,
                lastMessage: 'Conversation started',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
        }
        
        // Reload conversations to show the new one
        await loadConversations();
        
        // Load conversation messages with real-time listener
        await loadConversationMessages(convId, user);
        
        console.log('Conversation started with', user.name);
    } catch (error) {
        console.error('Error starting conversation:', error);
    }
};

// ===========================
// Render Messages
// ===========================
function renderMessages() {
    const container = document.querySelector('.chat-messages');
    if (!container) {
        console.error('Chat messages container not found');
        return;
    }
    
    console.log('Rendering messages, count:', currentConversation.messages.length);
    
    container.innerHTML = '';
    
    const divider = document.createElement('div');
    divider.className = 'message-date-divider';
    divider.textContent = 'Today';
    container.appendChild(divider);
    
    currentConversation.messages.forEach((msg) => {
        console.log('Rendering message:', msg.id, msg.text);
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
// Render Message Requests Icon
// ===========================
function renderMessageRequestsIcon() {
    const iconContainer = document.getElementById('messageRequestsIcon');
    if (!iconContainer) {
        console.error('messageRequestsIcon not found');
        return;
    }
    
    const badgeHTML = messageRequests.length > 0 ? `<div class="msg-request-badge">${messageRequests.length}</div>` : '';
    
    // Always render the icon, even if no requests
    iconContainer.innerHTML = `
        <div style="cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--light); border-radius: 50%; transition: all 0.3s ease; flex-shrink: 0;" onclick="console.log('Clicked message requests'); window.showMessageRequestsModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            ${badgeHTML}
        </div>
    `;
    console.log('renderMessageRequestsIcon: requests =', messageRequests.length);
}

// ===========================
// Show Message Requests Modal
// ===========================
window.showMessageRequestsModal = function() {
    console.log('showMessageRequestsModal called, requests:', messageRequests.length);
    
    if (messageRequests.length === 0) {
        alert('No message requests yet');
        return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'msg-request-overlay';
    
    const requestsHTML = messageRequests.map(req => `
        <div class="msg-request-item" style="padding: 1.25rem; border-bottom: 1px solid var(--border); display: flex; gap: 1rem; align-items: flex-start;">
            <div class="msg-request-avatar">${req.avatar}</div>
            <div class="msg-request-info" style="flex: 1;">
                <h4 style="margin: 0 0 0.25rem 0; color: var(--text-primary);">${req.name}</h4>
                <p style="margin: 0 0 0.75rem 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">${req.message}</p>
            </div>
            <div class="msg-request-actions" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <button class="msg-request-accept" onclick="window.acceptMessageRequest('${req.reqId}', event)" style="padding: 0.6rem 0.8rem; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease;">Accept</button>
                <button class="msg-request-decline" onclick="window.declineMessageRequest('${req.reqId}', event)" style="padding: 0.6rem 0.8rem; background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s ease;">Decline</button>
            </div>
        </div>
    `).join('');
    
    overlay.innerHTML = `
        <div class="msg-request-modal">
            <div class="msg-request-modal-header" style="padding: 1.5rem; border-bottom: 1px solid var(--border);">
                <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-primary);">Message Requests (${messageRequests.length})</h3>
            </div>
            <div class="msg-request-modal-body">
                ${requestsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
};

// ===========================
// Accept Message Request
// ===========================
window.acceptMessageRequest = async function(reqId, event) {
    event.stopPropagation();
    try {
        const req = messageRequests.find(r => r.reqId === reqId);
        if (!req) return;
        
        const user = availableUsers.find(u => u.uid === req.senderUid);
        if (user) {
            // Start conversation
            await startNewConversation(user);
            
            // Remove request from Firebase
            const requestRef = ref(database, `messageRequests/${currentUserId}/${reqId}`);
            await remove(requestRef);
            
            messageRequests = messageRequests.filter(r => r.reqId !== reqId);
            renderMessageRequestsIcon();
            
            // Close modal
            document.querySelector('.msg-request-overlay')?.remove();
            console.log('Message request accepted from', user.name);
        }
    } catch (error) {
        console.error('Error accepting request:', error);
    }
};

// ===========================
// Decline Message Request
// ===========================
window.declineMessageRequest = async function(reqId, event) {
    event.stopPropagation();
    try {
        const requestRef = ref(database, `messageRequests/${currentUserId}/${reqId}`);
        await remove(requestRef);
        
        messageRequests = messageRequests.filter(r => r.reqId !== reqId);
        renderMessageRequestsIcon();
        
        if (messageRequests.length === 0) {
            document.querySelector('.msg-request-overlay')?.remove();
        } else {
            // Refresh modal
            document.querySelector('.msg-request-overlay')?.remove();
            window.showMessageRequestsModal();
        }
        
        console.log('Message request declined');
    } catch (error) {
        console.error('Error declining request:', error);
    }
};

// ===========================
// Setup Input Handlers
// ===========================
function setupInputHandlers() {
    const input = document.querySelector('.chat-input');
    const sendBtn = document.querySelector('.btn-send');
    
    if (input && sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
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
async function sendMessage() {
    const input = document.querySelector('.chat-input');
    const text = input.value.trim();
    
    if (!text || !currentConversation.id) return;
    
    try {
        const timestamp = new Date().toISOString();
        const messageData = {
            senderUid: currentUserId,
            text: text,
            timestamp: getRelativeTime(new Date()),
            read: false,
            createdAt: timestamp
        };
        
        // Save to Firebase
        const messagesRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}/messages`);
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, messageData);
        
        // Also save to the other user's conversation
        const otherMessagesRef = ref(database, `conversations/${currentConversation.userId}/${currentConversation.id}/messages`);
        const newOtherMessageRef = push(otherMessagesRef);
        await set(newOtherMessageRef, messageData);
        
        // Update last message in conversation metadata
        const convRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}`);
        await update(convRef, {
            lastMessage: text,
            lastMessageTime: getRelativeTime(new Date())
        });
        
        const otherConvRef = ref(database, `conversations/${currentConversation.userId}/${currentConversation.id}`);
        await update(otherConvRef, {
            lastMessage: text,
            lastMessageTime: getRelativeTime(new Date())
        });
        
        // Clear input - don't manually add to messages, let the real-time listener handle it
        input.value = '';
    } catch (error) {
        console.error('Error sending message:', error);
        const input = document.querySelector('.chat-input');
        if (input) input.value = ''; // Clear input even on error
    }
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

// ===========================
// PROFILE MANAGER SECTION
// ===========================

// ===========================
// Initialize Profile Page
// ===========================
export async function initializeProfile() {
    console.log('Initializing profile...');
    
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        return;
    }

    try {
        const userData = await getUserData(userId);
        if (userData) {
            populateProfileData(userData);
        }
        
        if (!isProfileInitialized) {
            setupEventListeners();
            isProfileInitialized = true;
            console.log('Profile initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing profile:', error);
    }
}

// ===========================
// Populate Profile Data
// ===========================
function populateProfileData(userData) {
    console.log('Populating profile with data:', userData);
    
    const fullName = userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    const profileFullName = document.getElementById('profileFullName');
    const profileStudentId = document.getElementById('profileStudentId');
    const profileEmail = document.getElementById('profileEmail');
    
    if (profileFullName) profileFullName.textContent = fullName || 'User';
    if (profileStudentId) profileStudentId.textContent = `Student ID: ${userData.studentId || 'Not Set'}`;
    if (profileEmail) profileEmail.textContent = userData.email || '';
    
    if (fullName) {
        const initials = fullName
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        const avatar = document.getElementById('profileAvatarLarge');
        if (avatar) avatar.textContent = initials;
    }
    
    // Set input values
    setInputValue('firstName', userData.firstName);
    setInputValue('lastName', userData.lastName);
    setInputValue('dateOfBirth', userData.dateOfBirth);
    setInputValue('gender', userData.gender);
    setInputValue('contactNumber', userData.contactNumber);
    setInputValue('personalEmail', userData.personalEmail);
    setInputValue('program', userData.program);
    setInputValue('studentIdInput', userData.studentId);
    setInputValue('yearLevel', userData.yearLevel);
    setInputValue('section', userData.section);
    setInputValue('currentAddress', userData.currentAddress);
    setInputValue('city', userData.city);
    setInputValue('province', userData.province);
    setInputValue('zipCode', userData.zipCode);
    setInputValue('emergencyName', userData.emergencyName);
    setInputValue('emergencyRelationship', userData.emergencyRelationship);
    setInputValue('emergencyContact', userData.emergencyContact);
    setInputValue('bio', userData.bio);
}

// ===========================
// Helper function to set input values
// ===========================
function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
    }
}

// ===========================
// Get All Editable Inputs
// ===========================
function getAllEditableInputs() {
    const inputIds = [
        'firstName', 'lastName', 'dateOfBirth', 'gender', 'contactNumber', 'personalEmail',
        'program', 'yearLevel', 'section', 'academicStatus', 'graduationDate',
        'currentAddress', 'city', 'province', 'zipCode',
        'emergencyName', 'emergencyRelationship', 'emergencyContact', 'bio'
    ];
    
    return inputIds.map(id => document.getElementById(id)).filter(el => el !== null);
}

// ===========================
// Setup Event Listeners
// ===========================
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    setupEditButton();
    setupSaveCancel();
    
    const uploadBtn = document.querySelector('.btn-upload-photo');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            alert('Photo upload feature coming soon!');
        });
    }
}

// ===========================
// Setup Edit Button
// ===========================
function setupEditButton() {
    const editBtn = document.getElementById('mainEditBtn');
    
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Edit button clicked');
            enableEditMode();
        });
    }
}

// ===========================
// Enable Edit Mode
// ===========================
function enableEditMode() {
    console.log('Enabling edit mode');
    isEditMode = true;
    
    saveOriginalData();
    
    const inputs = getAllEditableInputs();
    inputs.forEach(input => {
        input.disabled = false;
        input.style.background = 'var(--white)';
        input.style.cursor = 'text';
    });
    
    const profileActions = document.getElementById('profileActions');
    if (profileActions) {
        profileActions.style.display = 'flex';
    }
    
    const editBtn = document.getElementById('mainEditBtn');
    if (editBtn) {
        editBtn.style.display = 'none';
    }
}

// ===========================
// Save Original Data
// ===========================
function saveOriginalData() {
    const inputs = getAllEditableInputs();
    originalData = {};
    
    inputs.forEach(input => {
        originalData[input.id] = input.value;
    });
    
    console.log('Original data saved');
}

// ===========================
// Setup Save & Cancel
// ===========================
function setupSaveCancel() {
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveProfile');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cancelEdit();
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveProfile();
        });
    }
}

// ===========================
// Cancel Edit
// ===========================
function cancelEdit() {
    console.log('Canceling edit mode');
    
    const inputs = getAllEditableInputs();
    inputs.forEach(input => {
        if (originalData[input.id] !== undefined) {
            input.value = originalData[input.id];
        }
        input.disabled = true;
        input.style.background = 'var(--light)';
        input.style.cursor = 'not-allowed';
    });
    
    const profileActions = document.getElementById('profileActions');
    if (profileActions) {
        profileActions.style.display = 'none';
    }
    
    const editBtn = document.getElementById('mainEditBtn');
    if (editBtn) {
        editBtn.style.display = 'flex';
    }
    
    isEditMode = false;
    originalData = {};
}

// ===========================
// Save Profile
// ===========================
async function saveProfile() {
    console.log('Saving profile');
    
    const userId = getCurrentUserId();
    if (!userId) {
        alert('User not authenticated');
        return;
    }
    
    try {
        const saveBtn = document.getElementById('saveProfile');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span>💾 Saving...</span>';
        }
        
        const inputs = getAllEditableInputs();
        const updateData = {};
        
        inputs.forEach(input => {
            updateData[input.id] = input.value;
        });
        
        console.log('Data to save:', updateData);
        
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, updateData);
        
        console.log('Profile saved successfully');
        alert('Profile updated successfully!');
        
        inputs.forEach(input => {
            input.disabled = true;
            input.style.background = 'var(--light)';
            input.style.cursor = 'not-allowed';
        });
        
        const profileActions = document.getElementById('profileActions');
        if (profileActions) {
            profileActions.style.display = 'none';
        }
        
        const editBtn = document.getElementById('mainEditBtn');
        if (editBtn) {
            editBtn.style.display = 'flex';
        }
        
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Changes';
        }
        
        isEditMode = false;
        originalData = {};
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Failed to save changes');
        
        const saveBtn = document.getElementById('saveProfile');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Changes';
        }
    }
}

// ===========================
// Settings Initialization
// ===========================
export function initializeSettings() {
    setupNotificationToggles();
    setupPrivacyToggles();
    setupAcademicPreferences();
    setupLanguageRegion();
    setupDataStorage();
}

function setupNotificationToggles() {
    const notificationIds = ['emailNotifications', 'assignmentReminders', 'gradeNotifications', 'chatNotifications', 'announcementNotifications'];

    notificationIds.forEach(id => {
        const toggle = document.getElementById(id);
        if (toggle) {
            const savedState = localStorage.getItem(id);
            if (savedState !== null) {
                toggle.checked = savedState === 'true';
            }

            toggle.addEventListener('change', () => {
                localStorage.setItem(id, toggle.checked);
                console.log(`${id} updated to: ${toggle.checked}`);
            });
        }
    });
}

function setupPrivacyToggles() {
    const privacyIds = ['profileVisibility', 'onlineStatus'];
    privacyIds.forEach(id => {
        const toggle = document.getElementById(id);
        if (toggle) {
            const savedState = localStorage.getItem(id);
            if (savedState !== null) {
                toggle.checked = savedState === 'true';
            }

            toggle.addEventListener('change', () => {
                localStorage.setItem(id, toggle.checked);
            });
        }
    });
}

function setupAcademicPreferences() {
    const allSelects = document.querySelectorAll('.settings-option .settings-select');
    const academicSelects = [
        { index: 0, id: 'calendarView', default: 'month' },
        { index: 1, id: 'tasksSortBy', default: 'dueDate' },
        { index: 2, id: 'weekStartsOn', default: 'sunday' }
    ];

    academicSelects.forEach(({ index, id, default: defaultValue }) => {
        const selectElement = allSelects[index];
        if (selectElement) {
            const savedValue = localStorage.getItem(id);
            if (savedValue) {
                selectElement.value = savedValue;
            } else {
                selectElement.value = defaultValue;
            }

            selectElement.addEventListener('change', () => {
                localStorage.setItem(id, selectElement.value);
            });
        }
    });
}

function setupLanguageRegion() {
    const allSelects = document.querySelectorAll('.settings-option .settings-select');
    const regionSelects = [
        { index: 3, id: 'language', default: 'en' },
        { index: 4, id: 'timeFormat', default: '12' },
        { index: 5, id: 'dateFormat', default: 'mdy' }
    ];

    regionSelects.forEach(({ index, id, default: defaultValue }) => {
        const selectElement = allSelects[index];
        if (selectElement) {
            const savedValue = localStorage.getItem(id);
            if (savedValue) {
                selectElement.value = savedValue;
            } else {
                selectElement.value = defaultValue;
            }

            selectElement.addEventListener('change', () => {
                localStorage.setItem(id, selectElement.value);
            });
        }
    });
}

function setupDataStorage() {
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            if (confirm('Clear all cached data?')) {
                localStorage.clear();
                alert('Cache cleared!');
            }
        });
    }

    const downloadDataBtn = document.getElementById('downloadDataBtn');
    if (downloadDataBtn) {
        downloadDataBtn.addEventListener('click', () => {
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                allData[key] = localStorage.getItem(key);
            }
            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `user_data_${new Date().getTime()}.json`;
            link.click();
            URL.revokeObjectURL(url);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
});

console.log('User features module loaded!');
