// Admin Panel - Resource Management
import { getCurrentUserId } from './auth.js';
import { database } from './firebase-service.js';
import { storage } from './firebase-service.js';
import { loadResources } from './resources-viewer.js';
import { ref as storageRef, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import {
    ref,
    set,
    get,
    update,
    remove,
    push
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Settings SVG Icon
const settingsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M4.22 19.78l4.24-4.24m5.08 0l4.24 4.24M1 12h6m6 0h6"></path></svg>`;

// ===========================
// Check if User is Admin
// ===========================
export async function checkAdminStatus(userId) {
    try {
        const userRef = ref(database, `users/${userId}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            const isAdmin = userData.role === 'admin';
            return isAdmin;
        }
        return false;
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// ===========================
// Make User Admin (Super Admin Only)
// ===========================
export async function setUserRole(userId, role) {
    try {
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, { role });
        return true;
    } catch (error) {
        console.error('Error updating user role:', error);
        return false;
    }
}

// ===========================
// Initialize Admin Panel
// ===========================
export async function initializeAdminPanel() {
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        return false;
    }

    try {
        const isAdmin = await checkAdminStatus(userId);
        if (isAdmin) {
            createAdminPanel();
            setupAdminEvents();
            loadAdminResources();
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error during admin panel initialization:', error);
        return false;
    }
}

// ===========================
// Create Admin Panel UI
// ===========================
function createAdminPanel() {
    // Check if admin panel already exists
    if (document.querySelector('#admin-panel')) {
        return;
    }

    // Create admin sidebar (no floating toggle button)
    const sidebar = document.createElement('div');
    sidebar.id = 'adminSidebar';
    sidebar.style.cssText = `
        display: none;
        position: fixed;
        bottom: 80px;
        right: 2rem;
        width: 380px;
        background: var(--white);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        padding: 2rem;
        animation: slideUp 0.3s ease;
        z-index: 1000;
    `;

    sidebar.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0;">Admin Panel</h2>
            <button id="adminCloseBtn" style="
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-secondary);
            ">✕</button>
        </div>

        <div style="border-bottom: 2px solid var(--border); margin-bottom: 1.5rem; padding-bottom: 1.5rem;">
            <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1rem;">Resources</h3>
            <!-- Add Resource button moved into Resources tab UI for admin users -->
        </div>

        <div id="resourcesList" style="max-height: 400px; overflow-y: auto;">
            <!-- Resources will be loaded here -->
        </div>
    `;

    document.body.appendChild(sidebar);
    // admin panel appended to document

    // Add animations to styles if not already added
    const existingStyle = document.querySelector('style[data-admin-panel]');
    if (!existingStyle) {
        const style = document.createElement('style');
        style.setAttribute('data-admin-panel', 'true');
        style.textContent = `
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            #adminToggleBtn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
            }
            #adminToggleBtn:active {
                transform: scale(0.95);
            }
        `;
        document.head.appendChild(style);
    }

    // Admin panel UI created
}

// ===========================
// Setup Admin Panel Events
// ===========================
function setupAdminEvents() {
    const sidebar = document.getElementById('adminSidebar');
    const closeBtn = document.getElementById('adminCloseBtn');
    const addResourceBtn = document.getElementById('addResourceBtn');

    if (!sidebar) {
        console.error('Admin panel elements not found');
        return;
    }

    // Close sidebar
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            sidebar.style.display = 'none';
        });
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target)) {
            sidebar.style.display = 'none';
        }
    });

    // Add resource button (if still present in admin sidebar)
    if (addResourceBtn) {
        addResourceBtn.addEventListener('click', showAddResourceModal);
    }

    // Admin panel events setup complete
}

// ===========================
// Load Resources for Admin Panel
// ===========================
async function loadAdminResources() {
    try {
        const resourcesRef = ref(database, 'resources');
        const snapshot = await get(resourcesRef);

        const resourcesList = document.getElementById('resourcesList');
        if (!resourcesList) return;

        resourcesList.innerHTML = '';

        if (snapshot.exists()) {
            const resources = snapshot.val();
            const resourceArray = Object.keys(resources).map(key => ({
                id: key,
                ...resources[key]
            }));

            if (resourceArray.length === 0) {
                resourcesList.innerHTML = `
                    <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No resources yet. Create your first one!
                    </p>
                `;
                return;
            }

            resourceArray.forEach(resource => {
                const resourceItem = createResourceItem(resource);
                resourcesList.appendChild(resourceItem);
            });
        } else {
            resourcesList.innerHTML = `
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    No resources yet. Create your first one!
                </p>
            `;
        }
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

// ===========================
// Create Resource Item
// ===========================
function createResourceItem(resource) {
    const item = document.createElement('div');
    item.style.cssText = `
        padding: 1rem;
        background: var(--light);
        border-radius: 8px;
        margin-bottom: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    `;

    item.innerHTML = `
        <div style="flex: 1;">
            <h4 style="font-weight: 600; color: var(--text-primary); margin: 0 0 0.25rem 0;">
                ${resource.title}
            </h4>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
                ${resource.category || 'General'} • ${resource.type || 'File'}
            </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
            <button class="editResourceBtn" data-id="${resource.id}" style="
                background: var(--secondary-color);
                color: white;
                border: none;
                padding: 0.5rem 0.8rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.85rem;
                transition: all 0.3s ease;
            ">Edit</button>
            <button class="deleteResourceBtn" data-id="${resource.id}" style="
                background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
                color: white;
                border: none;
                padding: 0.5rem 0.8rem;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.85rem;
                transition: all 0.3s ease;
            ">Delete</button>
        </div>
    `;

    // Add event listeners
    const editBtn = item.querySelector('.editResourceBtn');
    const deleteBtn = item.querySelector('.deleteResourceBtn');

    editBtn.addEventListener('click', () => showEditResourceModal(resource));
    deleteBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to delete this resource?')) return;
        // show immediate disabled state to prevent double clicks
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
        deleteResource(resource.id).finally(() => {
            // no-op here; admin-panel reloads its list inside deleteResource
        });
    });

    return item;
}

// ===========================
// Show Add Resource Modal
// ===========================
export function showAddResourceModal() {
    const overlay = document.createElement('div');
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
        z-index: 10000;
        padding: 2rem 1rem;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--white);
        border-radius: 16px;
        max-width: 500px;
        width: 100%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        max-height: 85vh;
        overflow: hidden;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        padding: 1.5rem 2rem;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
    `;
    header.innerHTML = `<h2 style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin: 0;">Add Resource</h2>`;

    const content = document.createElement('div');
    content.style.cssText = `
        padding: 2rem;
        flex: 1;
        overflow-y: auto;
    `;
    content.innerHTML = `
        <form id="addResourceForm" style="display: flex; flex-direction: column; gap: 1.2rem;">
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Resource Title *
                </label>
                <input type="text" id="resourceTitle" required placeholder="e.g., Python Tutorial PDF" style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    box-sizing: border-box;
                ">
            </div>

            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Category *
                </label>
                <select id="resourceCategory" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    box-sizing: border-box;
                ">
                    <option value="">Select a category</option>
                    <option value="Lecture Notes">Lecture Notes</option>
                    <option value="Textbook">Textbook</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Video">Video</option>
                    <option value="Code">Code Sample</option>
                    <option value="Assignment">Assignment</option>
                    <option value="Exam">Exam Prep</option>
                    <option value="Other">Other</option>
                </select>
            </div>

            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Resource Type *
                </label>
                <select id="resourceType" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    box-sizing: border-box;
                ">
                    <option value="">Select a type</option>
                    <option value="PDF">PDF</option>
                    <option value="Video">Video</option>
                    <option value="Link">External Link</option>
                    <option value="Document">Document</option>
                    <option value="Code">Code</option>
                    <option value="Image">Image</option>
                </select>
            </div>

            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    URL / Link *
                </label>
                <input type="url" id="resourceUrl" required placeholder="https://example.com/resource" style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    box-sizing: border-box;
                ">
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.5rem 0 0 0;">Please provide the resource URL. File uploads are disabled for local testing due to CORS.</p>
            </div>

            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Description
                </label>
                <textarea id="resourceDescription" placeholder="Brief description of the resource" style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    resize: vertical;
                    min-height: 80px;
                    box-sizing: border-box;
                "></textarea>
            </div>
        </form>
    `;

    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 1.5rem 2rem;
        border-top: 1px solid var(--border);
        display: flex;
        gap: 1rem;
        flex-shrink: 0;
    `;
    footer.innerHTML = `
        <button type="button" id="cancelResourceBtn" style="
            flex: 1;
            padding: 0.75rem;
            background: var(--light);
            border: 2px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        ">
            Cancel
        </button>
        <button type="submit" form="addResourceForm" style="
            flex: 1;
            padding: 0.75rem;
            background: var(--gradient-accent);
            border: none;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        ">
            Add Resource
        </button>
    `;

    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = content.querySelector('#addResourceForm');
    const cancelBtn = footer.querySelector('#cancelResourceBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const urlInput = content.querySelector('#resourceUrl');
        const urlValue = urlInput.value.trim();

        // URL is required in URL-only mode
        if (!urlValue) {
            showToast('✗ Please provide a valid URL for the resource', 'error');
            return;
        }

        // Show loading toast
        showToast('⏳ Saving resource...', 'info');

        try {
            const resourceData = {
                title: content.querySelector('#resourceTitle').value.trim(),
                category: content.querySelector('#resourceCategory').value,
                type: content.querySelector('#resourceType').value,
                url: urlValue,
                description: content.querySelector('#resourceDescription').value.trim(),
                createdAt: new Date().toISOString(),
                createdBy: getCurrentUserId()
            };

            const resourcesRef = ref(database, 'resources');
            const newResourceRef = push(resourcesRef);
            await set(newResourceRef, resourceData);

            // Resource added: newResourceRef.key
            showToast('✓ Resource added successfully!', 'success');
            await loadResources();
            await loadAdminResources();
        } catch (error) {
            console.error('Error adding resource:', error);
            showToast('✗ Failed to add resource. Please try again.', 'error');
        } finally {
            overlay.remove();
        }
    });
}

// ===========================
// Show Edit Resource Modal
// ===========================
function showEditResourceModal(resource) {
    const overlay = document.createElement('div');
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
        z-index: 10000;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--white);
        border-radius: 16px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    `;

    modal.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 1.5rem 0;">Edit Resource</h2>
        <form id="editResourceForm" style="display: flex; flex-direction: column; gap: 1.2rem;">
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Resource Title *
                </label>
                <input type="text" id="editResourceTitle" value="${resource.title}" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                ">
            </div>

            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Category *
                </label>
                <select id="editResourceCategory" value="${resource.category}" required style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                ">
                    <option value="Lecture Notes" ${resource.category === 'Lecture Notes' ? 'selected' : ''}>Lecture Notes</option>
                    <option value="Textbook" ${resource.category === 'Textbook' ? 'selected' : ''}>Textbook</option>
                    <option value="Tutorial" ${resource.category === 'Tutorial' ? 'selected' : ''}>Tutorial</option>
                    <option value="Video" ${resource.category === 'Video' ? 'selected' : ''}>Video</option>
                    <option value="Code" ${resource.category === 'Code' ? 'selected' : ''}>Code Sample</option>
                    <option value="Assignment" ${resource.category === 'Assignment' ? 'selected' : ''}>Assignment</option>
                    <option value="Exam" ${resource.category === 'Exam' ? 'selected' : ''}>Exam Prep</option>
                    <option value="Other" ${resource.category === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>

            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">
                    Description
                </label>
                <textarea id="editResourceDescription" style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    resize: vertical;
                    min-height: 80px;
                ">${resource.description || ''}</textarea>
            </div>

            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="button" id="cancelEditBtn" style="
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--light);
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">
                    Cancel
                </button>
                <button type="submit" style="
                    flex: 1;
                    padding: 0.75rem;
                    background: var(--gradient-accent);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
                ">
                    Save Changes
                </button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#editResourceForm');
    const cancelBtn = modal.querySelector('#cancelEditBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedData = {
            title: document.getElementById('editResourceTitle').value.trim(),
            category: document.getElementById('editResourceCategory').value,
            description: document.getElementById('editResourceDescription').value.trim(),
            updatedAt: new Date().toISOString()
        };

        try {
            const resourceRef = ref(database, `resources/${resource.id}`);
            await update(resourceRef, updatedData);

            // Resource updated: resource.id
            overlay.remove();
            await loadResources();
            await loadAdminResources();
            showToast('✓ Resource updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating resource:', error);
            showToast('✗ Failed to update resource. Please try again.', 'error');
        }
    });
}

// ===========================
// Delete Resource
// ===========================
async function deleteResource(resourceId) {
    try {
        const resourceRef = ref(database, `resources/${resourceId}`);
        // read resource data first to attempt deleting storage object if present
        const snapshot = await get(resourceRef);
        const resourceData = snapshot && snapshot.exists() ? snapshot.val() : null;

        // remove DB entry
        await remove(resourceRef);

        // if the resource had a Firebase Storage URL, try to delete the storage object
        if (resourceData && resourceData.url && resourceData.url.includes('firebasestorage.googleapis.com')) {
            try {
                // try to extract the storage path from common URL patterns
                let storagePath = null;

                // pattern: .../o/<path>%2Ffile?alt=media...
                const m1 = resourceData.url.match(/\/o\/([^?]+)/);
                if (m1 && m1[1]) {
                    storagePath = decodeURIComponent(m1[1]);
                }

                // pattern: ...?name=<path>%2Ffile
                if (!storagePath) {
                    const m2 = resourceData.url.match(/[?&]name=([^&]+)/);
                    if (m2 && m2[1]) storagePath = decodeURIComponent(m2[1]);
                }

                if (storagePath) {
                    const objRef = storageRef(storage, storagePath);
                    await deleteObject(objRef);
                    // Storage object deleted: storagePath
                } else {
                    // Could not determine storage path from URL; skipping storage deletion.
                }
            } catch (err) {
                console.warn('Failed to delete storage object for resource:', err);
            }
        }

        // Resource deleted: resourceId
        // Notify other modules so they can update UI smoothly
        document.dispatchEvent(new CustomEvent('resourceDeleted', { detail: { id: resourceId } }));
        await loadResources();
        await loadAdminResources();
        showToast('✓ Resource deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting resource:', error);
        showToast('✗ Failed to delete resource. Please try again.', 'error');
    }
}

// ===========================
// Toast Notification
// ===========================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10001;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? `background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;` : ''}
        ${type === 'error' ? `background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); color: white;` : ''}
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Admin Panel module loaded

// Listen for admin delete events dispatched from other modules
document.addEventListener('adminDeleteResource', (e) => {
    const id = e && e.detail && e.detail.id;
    if (!id) return;
    // call deleteResource (already asks for confirmation inside)
    deleteResource(id);
});

// Listen for edit requests from resource cards
document.addEventListener('adminEditResource', (e) => {
    const resource = e && e.detail && e.detail.resource;
    if (!resource) return;
    try {
        showEditResourceModal(resource);
    } catch (err) {
        console.error('Failed to open edit modal for resource:', err);
    }
});

// ===========================
// Debug Helper - Test Admin Status
// ===========================
window.testAdminStatus = async function() {
    const { getCurrentUserId } = await import('./auth.js');
    const userId = getCurrentUserId();
    // Testing admin status for user
    
    if (!userId) {
        console.error('No user logged in!');
        return;
    }
    
    const { checkAdminStatus } = await import('./admin-panel.js');
    const isAdmin = await checkAdminStatus(userId);
    if (isAdmin) {
        // user is admin
    } else {
        // user is not admin
    }
};

