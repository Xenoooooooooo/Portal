// ===========================
// User Features Module
// Merged: chat-manager.js + profile-manager.js
// ===========================
import { database } from './firebase-service.js';
import { ref, get, set, push, update, remove, onValue, off, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getCurrentUserId } from './auth.js';
import { getUserData } from './firebase-service.js';

let availableUsers = [];
let messageRequests = [];
let currentUserId = null;
let currentConversation = { id: null, name: null, avatar: null, userId: null, messages: [], recentlySentIds: new Set() };
let selectedUserForRequest = null;
let isProfileInitialized = false;
let isEditMode = false;
let originalData = {};
let messageListenerRef = null;
let messageUnsubscribe = null;
let conversationUnsubscribe = null;

// ===========================
// CHAT MANAGER SECTION
// ===========================

// ===========================
// Initialize Chat Manager
// ===========================
export async function initializeChatManager() {
    
    
    try {
        currentUserId = getCurrentUserId();
        if (!currentUserId) {
            
            return;
        }
        
        await loadAvailableUsers();
        await setupConversationListener();
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
        
        
    } catch (error) {
        
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
            
            
        }
    } catch (error) {
        
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
        
        
    } catch (error) {
        
    }
}

// ===========================
// Setup Message Requests Listener
// ===========================
function setupMessageRequestsListener() {
    try {
        const requestsRef = ref(database, `messageRequests/${currentUserId}`);
        onValue(requestsRef, async (snapshot) => {
            
            await loadMessageRequests();
            renderMessageRequestsIcon();
        });
    } catch (error) {
        
    }
}

// ===========================
// Setup Real-time Conversation Listener
// ===========================
async function setupConversationListener() {
    try {
        const conversationsRef = ref(database, `conversations/${currentUserId}`);
        
        // Unsubscribe from previous listener if it exists
        if (conversationUnsubscribe) {
            conversationUnsubscribe();
        }
        
        // Set up real-time listener
        conversationUnsubscribe = onValue(conversationsRef, (snapshot) => {
            renderConversationsList(snapshot);
        });
    } catch (error) {
        
    }
}

// ===========================
// Render Conversations List (from real-time data)
// ===========================
function renderConversationsList(snapshot) {
    try {
        const chatList = document.querySelector('.chat-list-full');
        
        if (!snapshot.exists()) {
            chatList.innerHTML = '';
            return;
        }
        
        const convObj = snapshot.val();
        const activeConvId = currentConversation.id; // Remember which conversation is active
        
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
                
                // Restore active state if this was the active conversation
                if (convId === activeConvId) {
                    item.classList.add('active');
                }
                
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
        
    }
}

// ===========================
// Load Conversations (legacy - now uses real-time listener)
// ===========================
async function loadConversations() {
    try {
        const conversationsRef = ref(database, `conversations/${currentUserId}`);
        const snapshot = await get(conversationsRef);
        
        renderConversationsList(snapshot);
    } catch (error) {
        
    }
}

// ===========================
// Load Conversation Messages
// ===========================
async function loadConversationMessages(convId, otherUser) {
    try {
        
        
        // Remove previous listener
        if (messageUnsubscribe) {
            
            messageUnsubscribe();
        }
        
        const messagesRef = ref(database, `conversations/${currentUserId}/${convId}/messages`);
        
        
        currentConversation = {
            id: convId,
            name: otherUser.name,
            avatar: otherUser.avatar,
            userId: otherUser.uid,
            messages: [],
            messageIds: new Set()
        };
        
        // Initial load
        const snapshot = await get(messagesRef);
        
        
        if (snapshot.exists()) {
            const messagesObj = snapshot.val();
            
            Object.keys(messagesObj).forEach(msgId => {
                const msg = messagesObj[msgId];
                currentConversation.messageIds.add(msgId);
                currentConversation.messages.push({
                    id: msgId,
                    type: msg.senderUid === currentUserId ? 'sent' : 'received',
                    text: msg.text,
                    time: msg.timestamp,
                    read: msg.read || false,
                    timestamp: msg.createdAt // For sorting
                });
            });
            
            // Sort messages by timestamp (oldest first)
            currentConversation.messages.sort((a, b) => {
                const timeA = new Date(a.timestamp || a.time).getTime();
                const timeB = new Date(b.timestamp || b.time).getTime();
                return timeA - timeB;
            });
            
            
        } else {
            
        }
        
        const header = document.querySelector('.chat-header-main');
        if (header) {
            header.innerHTML = `
                <div class="chat-avatar-large">${otherUser.avatar}</div>
                <div style="flex: 1;"><h3>${otherUser.name}</h3><span class="status-online">● Online</span></div>
                <div class="chat-header-options" style="position: relative;">
                    <button class="chat-options-btn" onclick="window.toggleChatOptionsMenu(event)" title="Conversation options">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                    <div class="chat-options-dropdown" id="chatOptionsDropdown">
                        <a href="#" class="chat-option-item" onclick="window.viewUserProfile(event)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>View Profile</span>
                        </a>
                        <a href="#" class="chat-option-item" onclick="window.muteConversation(event)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 5L6 9H2v6h4l5 4v-4"></path>
                                <line x1="23" y1="9" x2="17" y2="15"></line>
                                <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                            <span>Mute Messages</span>
                        </a>
                        <a href="#" class="chat-option-item delete-option" onclick="window.deleteConversation(event)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 4 21 4"></polyline>
                                <path d="M19 4v20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4m3 0V2h8v2M10 11v6m4-6v6"></path>
                            </svg>
                            <span>Delete Conversation</span>
                        </a>
                    </div>
                </div>
            `;
        }
        
        // Show input container
        const inputContainer = document.querySelector('.chat-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'flex';
        }
        
        // Re-setup input handlers for the message input
        setupInputHandlers();
        
        renderMessages();
        autoScrollToBottom();
        
        // Set up real-time listener for NEW messages from other user
        messageUnsubscribe = onValue(messagesRef, (snapshot) => {
            // Safety check: ensure we're still on the same conversation
            if (!currentConversation.messageIds || currentConversation.id !== convId) {
                return;
            }
            
            if (snapshot.exists()) {
                const messagesObj = snapshot.val();
                const newMessages = [];
                
                Object.keys(messagesObj).forEach(msgId => {
                    const msg = messagesObj[msgId];
                    
                    // Track all message IDs (even from current user)
                    if (!currentConversation.messageIds.has(msgId)) {
                        currentConversation.messageIds.add(msgId);
                        
                        // Only add to UI if it's from another user (we already have sent messages)
                        if (msg.senderUid !== currentUserId) {
                            newMessages.push({
                                id: msgId,
                                type: 'received',
                                text: msg.text,
                                time: msg.timestamp,
                                read: msg.read || false
                            });
                        }
                    }
                });
                
                // Add new messages to conversation
                if (newMessages.length > 0) {
                    currentConversation.messages.push(...newMessages);
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
                    <button id="sendRequestBtn" style="flex: 1; padding: 0.75rem; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Send Request</button>
                    <button id="cancelRequestBtn" style="flex: 1; padding: 0.75rem; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Cancel</button>
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
    
        
        // Check if conversation with this user already exists on screen
        const existingConvItem = document.querySelector(`[data-user-id="${user.uid}"]`);
        
        if (existingConvItem) {
            // Conversation exists, open it
            
            document.querySelectorAll('.chat-item-full').forEach(i => i.classList.remove('active'));
            existingConvItem.classList.add('active');
            const convId = existingConvItem.dataset.convId;
            loadConversationMessages(convId, user);
            overlay.remove();
            return;
        }
        
        // No conversation exists, show message request modal
        
        selectedUserForRequest = user;
        resultsContainer.innerHTML = '';
        searchInput.style.display = 'none';
        messagePanel.style.display = 'flex';
        selectedUserName.textContent = user.name;
        selectedUserEmail.textContent = user.avatar;
        messageText.value = '';
        messageText.focus();
        
    };
    
    sendBtn.addEventListener('click', async () => {
        const message = messageText.value.trim();
        if (!message || !selectedUserForRequest) {
            showCustomAlert('Please type a message');
            return;
        }
        
        try {
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            await sendMessageRequest(selectedUserForRequest.uid, message);
            showCustomToast('Message request sent!');
            setTimeout(() => overlay.remove(), 500);
        } catch (error) {
            console.error('Error sending request:', error);
            showCustomAlert('Failed to send request');
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Request';
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
        const requestKey = Date.now();
        const requestRef = ref(database, `messageRequests/${recipientUid}/${requestKey}`);
        await set(requestRef, {
            senderUid: currentUserId,
            message: message,
            createdAt: new Date().toISOString()
        });
        // Create or update a local "pending" conversation for the requester so it shows in their chat list
        try {
            const uids = [currentUserId, recipientUid].sort();
            const convId = `${uids[0]}-${uids[1]}`;
            const conversationRef = ref(database, `conversations/${currentUserId}/${convId}`);
            await set(conversationRef, {
                otherUserId: recipientUid,
                lastMessage: message || 'Message request pending',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString(),
                pending: true,
                requestKey: requestKey
            });
            // Also save the requested message under the requester's messages so it displays immediately
            try {
                const messagesRef = ref(database, `conversations/${currentUserId}/${convId}/messages`);
                const msgId = `req_${requestKey}`;
                const msgData = {
                    senderUid: currentUserId,
                    text: message,
                    timestamp: getRelativeTime(new Date()),
                    read: false,
                    createdAt: new Date().toISOString(),
                    requested: true
                };
                await set(child(messagesRef, msgId), msgData);
                
            } catch (msgErr) {
                
            }
            // Refresh conversations list so the pending convo appears immediately
            await loadConversations();
            } catch (convErr) {
                
        }
        
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
        // Use sorted UIDs for consistent conversation ID
        const uids = [currentUserId, user.uid].sort();
        const convId = `${uids[0]}-${uids[1]}`;
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
    
    
    
    container.innerHTML = '';
    
    const divider = document.createElement('div');
    divider.className = 'message-date-divider';
    divider.textContent = 'Today';
    container.appendChild(divider);
    
    currentConversation.messages.forEach((msg) => {
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
            <div style="cursor: pointer; position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--light); border-radius: 50%; transition: all 0.3s ease; flex-shrink: 0;" onclick="window.showMessageRequestsModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            ${badgeHTML}
        </div>
    `;
    
}

// ===========================
// Show Message Requests Modal
// ===========================
window.showMessageRequestsModal = function() {
    
    
    if (messageRequests.length === 0) {
        showCustomToast('No message requests yet.');
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
        if (!user) return;
        
        // Use sorted UIDs to ensure consistent conversation ID regardless of who initiates
        const uids = [currentUserId, user.uid].sort();
        const convId = `${uids[0]}-${uids[1]}`;
        
        
        // Step 1: Create conversation metadata
        const conversationRef = ref(database, `conversations/${currentUserId}/${convId}`);
        const snapshot = await get(conversationRef);
        
        
        if (!snapshot.exists()) {
            
            // Create for current user
            await set(conversationRef, {
                otherUserId: user.uid,
                lastMessage: req.message || 'Conversation started',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
            
            
            // Create for other user
            const otherConvRef = ref(database, `conversations/${user.uid}/${convId}`);
            await set(otherConvRef, {
                otherUserId: currentUserId,
                lastMessage: req.message || 'Conversation started',
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
        }
        
        // Step 2: Save the initial message from the request
        if (req.message) {
            const now = new Date();
            const messageData = {
                senderUid: req.senderUid,
                text: req.message,
                timestamp: getRelativeTime(now),
                read: false,
                createdAt: now.toISOString()
            };
            
            // Save to both users' message folders
            const myMessagesRef = ref(database, `conversations/${currentUserId}/${convId}/messages`);
            const theirMessagesRef = ref(database, `conversations/${user.uid}/${convId}/messages`);
            
            // Use set with a unique child to ensure it's saved
            const msgId = `msg_${Date.now()}`;
            
            await set(child(myMessagesRef, msgId), messageData);
            await set(child(theirMessagesRef, msgId), messageData);
            
        }
        
        // Step 3: Remove request from Firebase
        const requestRef = ref(database, `messageRequests/${currentUserId}/${reqId}`);
        await remove(requestRef);
        
        messageRequests = messageRequests.filter(r => r.reqId !== reqId);
        renderMessageRequestsIcon();
        
        // Step 4: Close modal and show toast
        document.querySelector('.msg-request-overlay')?.remove();
        showCustomToast('Conversation started!');
        
        
        // Step 5: Reload and open conversation
        await loadConversations();
        
        // Auto-open directly by calling loadConversationMessages with delay to ensure message is saved
        setTimeout(async () => {
            
            await loadConversationMessages(convId, user);
        }, 500);
        
    } catch (error) {
        console.error('Error accepting request:', error);
        showCustomAlert('Failed to accept request');
    }
};

// ===========================
// Decline Message Request
// ===========================
window.declineMessageRequest = async function(reqId, event) {
    event.stopPropagation();
    try {
        // Find request details first so we know who sent it
        const req = messageRequests.find(r => r.reqId === reqId);
        const senderUid = req ? req.senderUid : null;
        const requestRef = ref(database, `messageRequests/${currentUserId}/${reqId}`);
        await remove(requestRef);
        // If we know the sender, remove the pending conversation from their side
        if (senderUid) {
            try {
                const uids = [currentUserId, senderUid].sort();
                const convId = `${uids[0]}-${uids[1]}`;
                const senderConvRef = ref(database, `conversations/${senderUid}/${convId}`);
                await remove(senderConvRef);
                
            } catch (remErr) {
                
            }
        }
        
        messageRequests = messageRequests.filter(r => r.reqId !== reqId);
        renderMessageRequestsIcon();
        
        if (messageRequests.length === 0) {
            document.querySelector('.msg-request-overlay')?.remove();
            showCustomToast('Message request declined');
        } else {
            // Refresh modal
            document.querySelector('.msg-request-overlay')?.remove();
            window.showMessageRequestsModal();
        }
        
        
    } catch (error) {
        console.error('Error declining request:', error);
        showCustomAlert('Failed to decline request');
    }
};

// ===========================
// Setup Input Handlers
// ===========================
function setupInputHandlers() {
    const input = document.querySelector('.chat-input');
    const sendBtn = document.querySelector('.btn-send');
    
    if (input && sendBtn) {
        // Remove all previous event listeners by cloning and replacing
        const newSendBtn = sendBtn.cloneNode(true);
        const newInput = input.cloneNode(true);
        
        sendBtn.parentNode.replaceChild(newSendBtn, sendBtn);
        input.parentNode.replaceChild(newInput, input);
        
        // Now add fresh listeners to the new elements
        const freshInput = document.querySelector('.chat-input');
        const freshSendBtn = document.querySelector('.btn-send');
        
        freshSendBtn.addEventListener('click', window.sendMessage);
        freshInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.sendMessage();
            }
        });
    }
}

// ===========================
// Send Message
// ===========================
window.sendMessage = async function sendMessage() {
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
        
        // Check if conversation still exists on receiver's side - recreate if deleted
        const otherConvRef = ref(database, `conversations/${currentConversation.userId}/${currentConversation.id}`);
        const otherConvSnapshot = await get(otherConvRef);
        if (!otherConvSnapshot.exists()) {
            // Conversation was deleted on receiver's side - recreate it
            await set(otherConvRef, {
                otherUserId: currentUserId,
                lastMessage: text,
                lastMessageTime: getRelativeTime(new Date()),
                createdAt: new Date().toISOString()
            });
        }
        
        // Generate a temporary message ID for immediate display
        const tempId = `temp_${Date.now()}`;
        
        // Add message to UI immediately (optimistic update)
        currentConversation.messages.push({
            id: tempId,
            type: 'sent',
            text: text,
            time: messageData.timestamp,
            read: false
        });
        currentConversation.messageIds.add(tempId);
        
        renderMessages();
        autoScrollToBottom();
        
        // Clear input immediately
        input.value = '';
        
        // Save to Firebase - current user's path
        const messagesRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}/messages`);
        const newMessageRef = push(messagesRef);
        await set(newMessageRef, messageData);
        
        // Save to other user's path so they see it
        const otherMessagesRef = ref(database, `conversations/${currentConversation.userId}/${currentConversation.id}/messages`);
        const newOtherMessageRef = push(otherMessagesRef);
        await set(newOtherMessageRef, messageData);
        
        // Update conversation metadata
        const convRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}`);
        await update(convRef, {
            lastMessage: text,
            lastMessageTime: getRelativeTime(new Date())
        });
        
        await update(otherConvRef, {
            lastMessage: text,
            lastMessageTime: getRelativeTime(new Date())
        });
        
        // Replace temp ID with real ID after saving
        const realId = newMessageRef.key;
        const tempIndex = currentConversation.messages.findIndex(m => m.id === tempId);
        if (tempIndex !== -1) {
            currentConversation.messageIds.delete(tempId);
            currentConversation.messages[tempIndex].id = realId;
            currentConversation.messageIds.add(realId);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        const input = document.querySelector('.chat-input');
        if (input) input.value = '';
    }
};

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
            
        }
    } catch (error) {
        console.error('Error initializing profile:', error);
    }
}

// ===========================
// Populate Profile Data
// ===========================
function populateProfileData(userData) {
    
    
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
            
            enableEditMode();
        });
    }
}

// ===========================
// Enable Edit Mode
// ===========================
function enableEditMode() {
    
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
        
        
        
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, updateData);
        
        
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

// ===========================
// CHAT OPTIONS MENU SECTION
// ===========================

// Toggle Chat Options Menu
window.toggleChatOptionsMenu = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropdown = document.getElementById('chatOptionsDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('chatOptionsDropdown');
    const optionsBtn = document.querySelector('.chat-options-btn');
    
    if (dropdown && optionsBtn) {
        if (!dropdown.contains(e.target) && !optionsBtn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    }
});

// View User Profile
window.viewUserProfile = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentConversation.userId) {
        alert('No user selected');
        return;
    }
    
    const dropdown = document.getElementById('chatOptionsDropdown');
    if (dropdown) dropdown.classList.remove('active');
    
    // Create profile modal
    const overlay = document.createElement('div');
    overlay.className = 'user-profile-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
    `;
    
    overlay.innerHTML = `
        <div style="background: var(--surface); border-radius: 12px; padding: 2rem; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 4rem; width: 80px; height: 80px; background: var(--light); border-radius: 50%; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; color: var(--primary); font-weight: 700;">
                    ${currentConversation.avatar}
                </div>
                <h2 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${currentConversation.name}</h2>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">User ID: ${currentConversation.userId}</p>
            </div>
            <div style="display: flex; gap: 0.75rem;">
                <button onclick="document.querySelector('.user-profile-modal-overlay').remove()" style="flex: 1; padding: 0.75rem; background: var(--light); color: var(--text-primary); border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
};

// Clear Chat Messages
window.clearConversation = async function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentConversation.id) {
        alert('No conversation selected');
        return;
    }
    
    const confirmed = confirm(`Clear all messages from ${currentConversation.name}? This action cannot be undone.`);
    if (!confirmed) return;
    
    try {
        const dropdown = document.getElementById('chatOptionsDropdown');
        if (dropdown) dropdown.classList.remove('active');
        
        const messagesRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}/messages`);
        await remove(messagesRef);
        
        // Also clear from other user's conversation
        const otherMessagesRef = ref(database, `conversations/${currentConversation.userId}/${currentConversation.id}/messages`);
        await remove(otherMessagesRef);
        
        currentConversation.messages = [];
        renderMessages();
        
        
    } catch (error) {
        console.error('Error clearing conversation:', error);
        alert('Failed to clear conversation');
    }
};

// Mute Conversation
window.muteConversation = async function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentConversation.id) {
        alert('No conversation selected');
        return;
    }
    
    try {
        const dropdown = document.getElementById('chatOptionsDropdown');
        if (dropdown) dropdown.classList.remove('active');
        
        const isMuted = currentConversation.muted || false;
        const newMutedState = !isMuted;
        
        // Update conversation muted status
        const convRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}`);
        await update(convRef, { muted: newMutedState });
        
        // Update in other user's conversation too
        const otherConvRef = ref(database, `conversations/${currentConversation.userId}/${currentConversation.id}`);
        await update(otherConvRef, { muted: newMutedState });
        
        currentConversation.muted = newMutedState;
        
        const action = newMutedState ? 'muted' : 'unmuted';
        
    } catch (error) {
        console.error('Error muting conversation:', error);
        showCustomAlert('Failed to mute conversation');
    }
};

// Delete Conversation
window.deleteConversation = async function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!currentConversation.id) {
        showCustomAlert('No conversation selected');
        return;
    }
    
    showCustomConfirmation(
        `Delete conversation with ${currentConversation.name}? This action cannot be undone.`,
        async () => {
            try {
                const dropdown = document.getElementById('chatOptionsDropdown');
                if (dropdown) dropdown.classList.remove('active');
                
                // Remove conversation ONLY from current user's side
                const convRef = ref(database, `conversations/${currentUserId}/${currentConversation.id}`);
                await remove(convRef);
                
                // The other user's conversation remains intact so they can still see and message
                
                // Reload conversations
                await loadConversations();
                showEmptyChat();
                
                showCustomToast('Conversation deleted from your side.');
                
            } catch (error) {
                console.error('Error deleting conversation:', error);
                showCustomAlert('Failed to delete conversation');
            }
        }
    );
};

// ===========================
// CUSTOM NOTIFICATION SYSTEM
// ===========================

// Show custom toast notification
function showCustomToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${type === 'success' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            ${type === 'error' ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>' : ''}
            <span>${message}</span>
        </div>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideInUp 0.3s ease;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        ${type === 'success' ? 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;' : ''}
        ${type === 'error' ? 'background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); color: white;' : ''}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Show custom alert modal
function showCustomAlert(message) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--surface);
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        animation: scaleIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <p style="margin: 0 0 1.5rem 0; color: var(--text-primary); font-size: 1rem;">${message}</p>
        <button onclick="this.closest('[style*=fixed]').remove()" style="width: 100%; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Got it</button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

// ===========================
// Show Custom Confirmation Dialog
// ===========================
function showCustomConfirmation(message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(4px);
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--white);
        border-radius: 16px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        animation: scaleIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <p style="margin: 0 0 1.5rem 0; color: var(--text-primary); font-size: 1rem;">${message}</p>
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
            <button class="cancel-btn" style="padding: 0.75rem 1.5rem; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Cancel</button>
            <button class="confirm-btn" style="padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; transition: all 0.2s;">Delete</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const confirmBtn = modal.querySelector('.confirm-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');
    
    confirmBtn.addEventListener('click', () => {
        overlay.remove();
        onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

 
