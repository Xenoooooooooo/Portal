// Resources Viewer - Display resources for students/teachers
import { database } from './firebase-service.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { showAddResourceModal } from './admin-panel.js';

let allResources = [];
let currentCategoryFilter = 'All';
let isAdmin = false;

// ===========================
// Initialize Resources Viewer
// ===========================
export async function initializeResourcesViewer() {
    
    try {
        await loadResources();
        setupCategoryFilters();
        setupMainAddResourceButton();
        // Listen for authReady custom event to toggle admin controls
        document.addEventListener('authReady', (e) => {
            const userData = e && e.detail && e.detail.userData;
            if (userData && userData.role === 'admin') {
                isAdmin = true;
            } else {
                isAdmin = false;
            }
            renderResources(allResources);
        });
        
    } catch (error) {
        console.error('Error initializing resources viewer:', error);
    }
}

// Setup Main Add Resource Button (Header Button)
function setupMainAddResourceButton() {
    const mainAddResourceBtn = document.getElementById('mainAddResourceBtn');
    if (!mainAddResourceBtn) return;

    mainAddResourceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            showAddResourceModal();
        } catch (err) {
            console.error('Cannot open add resource modal:', err);
        }
    });

    // Hide button if not admin
    document.addEventListener('authReady', (e) => {
        const userData = e && e.detail && e.detail.userData;
        if (userData && userData.role === 'admin') {
            mainAddResourceBtn.style.display = 'flex';
        } else {
            mainAddResourceBtn.style.display = 'none';
        }
    });
}

// Add Resource button inside the Resources UI for admins (matches Tasks add button)
function setupAddResourceButton() {
    const container = document.querySelector('.resources-container');
    if (!container) return;

    // Avoid duplicating button
    if (container.querySelector('.add-resource-btn')) return;

    // Create button element but don't attach until we confirm admin
    const btn = document.createElement('button');
    btn.className = 'add-resource-btn add-task-btn';
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.6rem; display: inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Add Resource
    `;
    // Match styles from the Tasks add button for consistent appearance
    btn.style.cssText = `
        padding: 0.85rem 1.8rem;
        background: var(--gradient-accent);
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        font-size: 1rem;
        margin-bottom: 1.5rem;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        position: relative;
        overflow: hidden;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    `;

    // Hover and click animations to match Tasks button
    btn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.6)';
    });
    btn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
    });
    btn.addEventListener('click', function() {
        this.style.transform = 'scale(0.98)';
        setTimeout(() => { this.style.transform = ''; }, 100);
    });

    btn.addEventListener('click', () => {
        try { showAddResourceModal(); } catch (err) { console.error('Cannot open add resource modal:', err); }
    });

    // Insert button at the top of resources container (before categories)
    const firstChild = container.firstElementChild;
    container.insertBefore(btn, firstChild);

    // Listen for authReady event to toggle visibility based on role
    btn.style.display = 'none';
    document.addEventListener('authReady', (e) => {
        const userData = e && e.detail && e.detail.userData;
        if (userData && userData.role === 'admin') {
            btn.style.display = 'inline-flex';
        } else {
            btn.style.display = 'none';
        }
    });
}

// ===========================
// Load Resources from Database
// ===========================
export async function loadResources() {
    try {
        const resourcesRef = ref(database, 'resources');
        const snapshot = await get(resourcesRef);

        if (snapshot.exists()) {
            const resourcesObj = snapshot.val();
            allResources = Object.keys(resourcesObj).map(key => ({
                id: key,
                ...resourcesObj[key]
            }));
            renderResources(allResources);
        } else {
            
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading resources:', error);
    }
}

// ===========================
// Render Resources
// ===========================
function renderResources(resources) {
    const grid = document.querySelector('.resources-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (resources.length === 0) {
        showEmptyState();
        return;
    }

    resources.forEach((resource, index) => {
        const card = createResourceCard(resource);
        card.style.animationDelay = `${index * 0.05}s`;
        grid.appendChild(card);
    });
}

// ===========================
// Create Resource Card
// ===========================
function createResourceCard(resource) {
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.style.cssText = `
        animation: fadeInUp 0.3s ease forwards;
        opacity: 0;
    `;

    const categoryColor = getCategoryColor(resource.category);
    const typeIcon = getTypeIcon(resource.type);
    const createdDate = new Date(resource.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    card.innerHTML = `
        <div style="
            background: ${categoryColor};
            border-radius: 12px 12px 0 0;
            padding: 2rem;
            text-align: center;
            color: white;
            font-size: 3rem;
        ">
            ${typeIcon}
        </div>
        <div style="padding: 1.5rem;">
            <div style="
                display: inline-block;
                background: linear-gradient(135deg, ${categoryColor}20 0%, transparent 100%);
                padding: 0.35rem 0.85rem;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 0.75rem;
                border: 1px solid ${categoryColor};
            ">
                ${resource.category}
            </div>
            
            <h3 style="
                font-size: 1.1rem;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0.75rem 0;
                line-height: 1.4;
            ">
                ${resource.title}
            </h3>
            
            <p style="
                color: var(--text-secondary);
                font-size: 0.9rem;
                margin: 0.75rem 0;
                line-height: 1.5;
            ">
                ${resource.description || 'No description available'}
            </p>
            
            <div style="
                display: flex;
                gap: 1rem;
                margin: 1rem 0;
                padding: 1rem 0;
                border-top: 1px solid var(--border);
                border-bottom: 1px solid var(--border);
                font-size: 0.85rem;
                color: var(--text-secondary);
            ">
                <span>📅 ${createdDate}</span>
                <span>🏷️ ${resource.type}</span>
            </div>
            
            <a href="${resource.url}" target="_blank" rel="noopener noreferrer" style="
                display: inline-block;
                width: 100%;
                padding: 0.75rem;
                background: var(--gradient-accent);
                color: white;
                text-align: center;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
                margin-top: 1rem;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                View Resource →
            </a>
        </div>
    `;

    // Admin action icons (edit + delete)
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'icon-btn';
    editBtn.title = 'Edit resource';
    editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19.5 3 20l.5-4L16.5 3.5z"/></svg>`;
    editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // ask admin-panel to open edit modal for this resource
        document.dispatchEvent(new CustomEvent('adminEditResource', { detail: { resource } }));
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'icon-btn danger';
    delBtn.title = 'Delete resource';
    delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2"/></svg>`;
    delBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAdmin) return;
        const ok = await showConfirmModal('Are you sure you want to delete this resource?');
        if (!ok) return;
        delBtn.disabled = true;
        delBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.08)"></circle></svg>`;
        document.dispatchEvent(new CustomEvent('adminDeleteResource', { detail: { id: resource.id } }));
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    // hide actions for non-admins
    actions.style.display = isAdmin ? 'flex' : 'none';
    editBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    delBtn.style.display = isAdmin ? 'inline-flex' : 'none';

    const inner = card.querySelector('div[style*="padding: 1.5rem;"]');
    if (inner) inner.insertBefore(actions, inner.firstChild);

    // attach id for later selection/removal
    card.dataset.id = resource.id;

    return card;
}

// Custom confirm modal used in resources tab
function showConfirmModal(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
            <div style="font-weight:700; color:var(--text-primary);">Confirm action</div>
            <div style="margin-top:0.5rem; color:var(--text-secondary);">${message}</div>
            <div class="confirm-actions">
                <button id="confirmCancel" style="flex:1; padding:0.6rem; border-radius:8px; border:1px solid var(--border); background:var(--light);">Cancel</button>
                <button id="confirmOk" style="flex:1; padding:0.6rem; border-radius:8px; border:none; background:var(--gradient-accent); color:white;">Delete</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const cancelBtn = modal.querySelector('#confirmCancel');
        const okBtn = modal.querySelector('#confirmOk');

        function cleanup(res) {
            overlay.remove();
            resolve(res);
        }

        cancelBtn.addEventListener('click', () => cleanup(false));
        okBtn.addEventListener('click', () => cleanup(true));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(false); });
    });
}

// ===========================
// Get Category Color
// ===========================
function getCategoryColor(category) {
    const colors = {
        'Lecture Notes': '#3b82f6',
        'Textbook': '#8b5cf6',
        'Tutorial': '#06b6d4',
        'Video': '#f59e0b',
        'Code': '#10b981',
        'Assignment': '#ec4899',
        'Exam': '#ef4444',
        'Other': '#6b7280'
    };
    return colors[category] || colors['Other'];
}

// ===========================
// Get Type Icon
// ===========================
function getTypeIcon(type) {
    const icons = {
        'PDF': '📄',
        'Video': '🎥',
        'Link': '🔗',
        'Document': '📝',
        'Code': '💻',
        'Image': '🖼️'
    };
    return icons[type] || '📎';
}

// ===========================
// Setup Category Filters
// ===========================
function setupCategoryFilters() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get category name
            const category = btn.textContent.trim();
            
            if (category === 'All Resources') {
                currentCategoryFilter = 'All';
                renderResources(allResources);
            } else {
                // Map button text to category in database
                const categoryMap = {
                    'PDFs': 'PDF',
                    'Videos': 'Video',
                    'Documents': 'Document'
                };
                
                const filterType = categoryMap[category] || category;
                const filtered = allResources.filter(r => r.type === filterType || r.category === filterType);
                renderResources(filtered);
            }
        });
    });
}

// ===========================
// Show Empty State
// ===========================
function showEmptyState() {
    const grid = document.querySelector('.resources-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 3rem 2rem;
            color: var(--text-secondary);
        ">
            <div style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.5;">📚</div>
            <h3 style="font-size: 1.5rem; color: var(--text-primary); margin-bottom: 0.5rem;">No resources available yet</h3>
            <p>Check back soon for learning materials!</p>
        </div>
    `;
}

// ===========================
// Update Resources on Navigate
// ===========================
export function refreshResourcesView() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    if (categoryBtns.length > 0) {
        // Reset to "All Resources"
        categoryBtns.forEach(b => b.classList.remove('active'));
        categoryBtns[0]?.classList.add('active');
    }
    loadResources();
}

// Listen for successful deletion events to remove card smoothly
document.addEventListener('resourceDeleted', (e) => {
    const id = e && e.detail && e.detail.id;
    if (!id) return;

    const grid = document.querySelector('.resources-grid');
    if (!grid) return;

    const card = grid.querySelector(`[data-id="${id}"]`);
    if (!card) return;

    // animate removal
    card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-12px)';
    setTimeout(() => {
        card.remove();
        // if the grid is empty, show empty state
        if (!grid.querySelector('.resource-card')) showEmptyState();
    }, 360);
    // small toast
    const t = document.createElement('div');
    t.textContent = 'Resource deleted';
    t.style.cssText = 'position: fixed; bottom: 1.8rem; right: 1.8rem; background: linear-gradient(135deg,#10b981,#059669); color: white; padding: .8rem 1rem; border-radius: 8px; z-index:10001; box-shadow:0 8px 24px rgba(0,0,0,0.12);';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(6px)'; }, 1800);
    setTimeout(() => t.remove(), 2200);
});

 
