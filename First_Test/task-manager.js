// Task Manager - Real Database Integration
import { getCurrentUserId } from './auth-guard.js';
import { 
    getUserTasks, 
    addTask, 
    updateTaskStatus,
    database
} from './database-service.js';
import { ref, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

let currentTasks = [];
let currentFilter = 'All Tasks';
let isLoading = false;

// ===========================
// Toast Notification System
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
        z-index: 10000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? `background: var(--gradient-success); color: white;` : ''}
        ${type === 'error' ? `background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); color: white;` : ''}
        ${type === 'info' ? `background: var(--gradient-accent); color: white;` : ''}
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add animations to styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
    .task-item-full {
        animation: fadeInUp 0.3s ease;
    }
    .skeleton {
        animation: pulse 2s infinite;
        background: linear-gradient(90deg, var(--light) 25%, rgba(255, 255, 255, 0.2) 50%, var(--light) 75%);
        background-size: 200% 100%;
    }
`;
document.head.appendChild(style);

// ===========================
// Loading Skeleton
// ===========================
function createTaskSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'task-item-full skeleton';
    skeleton.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        gap: 1rem;
    `;
    skeleton.innerHTML = `
        <div style="width: 24px; height: 24px; border-radius: 4px; background: var(--border); flex-shrink: 0;"></div>
        <div style="flex: 1;">
            <div style="height: 20px; background: var(--border); border-radius: 4px; margin-bottom: 0.5rem; width: 60%;"></div>
            <div style="height: 16px; background: var(--border); border-radius: 4px; margin-bottom: 1rem; width: 80%;"></div>
            <div style="display: flex; gap: 1rem;">
                <div style="height: 24px; background: var(--border); border-radius: 4px; width: 100px;"></div>
                <div style="height: 24px; background: var(--border); border-radius: 4px; width: 120px;"></div>
            </div>
        </div>
    `;
    return skeleton;
}

// ===========================
// Show Loading State
// ===========================
function showLoadingState() {
    const taskList = document.querySelector('.task-list-full');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        taskList.appendChild(createTaskSkeleton());
    }
    isLoading = true;
}
export async function initializeTaskManager() {
    console.log('Initializing Task Manager...');
    
    const userId = getCurrentUserId();
    if (!userId) {
        console.error('No user ID found');
        showToast('Please log in to view tasks', 'error');
        return;
    }

    // Show loading state
    showLoadingState();
    
    // Load tasks from database
    await loadTasksFromDatabase(userId);
    
    // Setup event listeners
    setupMainAddTaskButton();
    setupFilterButtons();
    setupTaskEventListeners();
    setupKeyboardShortcuts();
    
    isLoading = false;
    console.log('Task Manager initialized!');
}

// ===========================
// Load Tasks from Database
// ===========================
async function loadTasksFromDatabase(userId) {
    try {
        const tasks = await getUserTasks(userId);
        currentTasks = tasks;
        renderTasks(currentFilter);
        console.log('Tasks loaded:', tasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
        showToast('Failed to load tasks. Please try again.', 'error');
    }
}

// ===========================
// Render Tasks
// ===========================
function renderTasks(filterType) {
    const taskList = document.querySelector('.task-list-full');
    if (!taskList) return;

    // Filter tasks
    const filteredTasks = filterTasksByType(filterType);
    
    // Clear existing tasks
    taskList.innerHTML = '';
    
    // Show empty state if no tasks
    if (currentTasks.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.cssText = `
            text-align: center;
            padding: 3rem 2rem;
            color: var(--text-secondary);
        `;
        emptyState.innerHTML = `
            <div style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.5;">📋</div>
            <h3 style="font-size: 1.5rem; color: var(--text-primary); margin-bottom: 0.5rem;">No tasks yet</h3>
            <p>Create your first task to get started!</p>
        `;
        taskList.appendChild(emptyState);
        return;
    }
    
    // Show filtered empty state
    if (filteredTasks.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.style.cssText = `
            text-align: center;
            padding: 3rem 2rem;
            color: var(--text-secondary);
        `;
        emptyState.innerHTML = `
            <div style="font-size: 3.5rem; margin-bottom: 1rem; opacity: 0.5;">✨</div>
            <h3 style="font-size: 1.5rem; color: var(--text-primary); margin-bottom: 0.5rem;">No tasks in this filter</h3>
            <p>Try a different filter or create a new task</p>
        `;
        taskList.appendChild(emptyState);
        return;
    }
    
    // Render filtered tasks
    filteredTasks.forEach((task, index) => {
        const taskElement = createTaskElement(task);
        taskElement.style.animationDelay = `${index * 0.05}s`;
        taskList.appendChild(taskElement);
    });

    console.log(`Rendered ${filteredTasks.length} tasks with filter: ${filterType}`);
}

// ===========================
// Filter Tasks
// ===========================
function filterTasksByType(filterType) {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return currentTasks.filter(task => {
        switch(filterType) {
            case 'All Tasks':
                return true;
            case 'Urgent':
                return task.priority === 'Urgent';
            case 'This Week':
                const dueDate = new Date(task.dueDate);
                return dueDate >= now && dueDate <= oneWeekFromNow;
            case 'Completed':
                return task.completed === true;
            default:
                return true;
        }
    });
}

// ===========================
// Create Task Element
// ===========================
function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item-full ${task.priority === 'Urgent' ? 'urgent' : ''} ${task.completed ? 'completed' : ''}`;
    taskDiv.setAttribute('data-task-id', task.id);

    const dueDate = new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    taskDiv.innerHTML = `
        <div class="task-check ${task.completed ? 'checked' : ''}" style="cursor: pointer;"></div>
        <div class="task-content-full" style="flex: 1;">
            <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
                ${task.title}
            </h3>
            <p class="task-description" style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.75rem;">
                ${task.description || 'No description'}
            </p>
            <div class="task-meta" style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                <span class="task-course" style="font-size: 0.85rem; color: var(--text-secondary);">📚 ${task.course || 'General'}</span>
                <span class="task-due" style="font-size: 0.85rem; color: var(--text-secondary);">📅 Due: ${dueDate}</span>
                <span class="task-tag ${task.priority === 'Urgent' ? 'urgent' : ''}" style="display: inline-block; padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; ${task.priority === 'Urgent' ? 'background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b;' : 'background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af;'}">
                    ${task.priority || 'Normal'}
                </span>
            </div>
        </div>
        <button class="task-delete-btn" style="
            background: rgba(239, 68, 68, 0.05);
            border: 2px solid transparent;
            color: var(--danger-color);
            padding: 0.6rem 0.8rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.2rem;
            transition: all 0.3s ease;
            flex-shrink: 0;
        " title="Delete task (right-click for options)">
            🗑️
        </button>
    `;

    // Add event listeners
    const checkbox = taskDiv.querySelector('.task-check');
    const deleteBtn = taskDiv.querySelector('.task-delete-btn');

    checkbox.addEventListener('click', () => toggleTaskCompletion(task.id, !task.completed));
    
    // Delete button hover effects
    deleteBtn.addEventListener('mouseenter', function() {
        this.style.background = 'rgba(239, 68, 68, 0.2)';
        this.style.borderColor = 'var(--danger-color)';
        this.style.transform = 'scale(1.1)';
    });
    
    deleteBtn.addEventListener('mouseleave', function() {
        this.style.background = 'rgba(239, 68, 68, 0.05)';
        this.style.borderColor = 'transparent';
        this.style.transform = 'scale(1)';
    });
    
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    // Add task item hover animation
    taskDiv.addEventListener('mouseenter', function() {
        this.style.transform = 'translateX(4px)';
    });
    
    taskDiv.addEventListener('mouseleave', function() {
        this.style.transform = 'translateX(0)';
    });

    return taskDiv;
}

// ===========================
// Setup Main Add Task Button (Header Button)
// ===========================
function setupMainAddTaskButton() {
    const mainAddTaskBtn = document.getElementById('mainAddTaskBtn');
    if (mainAddTaskBtn) {
        mainAddTaskBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showAddTaskModal();
        });
    }
}

// ===========================
// Setup Add Task Button
// ===========================
function setupAddTaskButton() {
    // Create add task button if it doesn't exist
    let addBtn = document.querySelector('.add-task-btn');
    if (!addBtn) {
        const tasksContainer = document.querySelector('.tasks-container');
        if (!tasksContainer) return;

        addBtn = document.createElement('button');
        addBtn.className = 'add-task-btn';
        addBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.6rem; display: inline-block;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Add New Task
        `;
        addBtn.style.cssText = `
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
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Add hover effects
        addBtn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.6)';
        });
        
        addBtn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.4)';
        });
        
        // Add click animation
        addBtn.addEventListener('click', function() {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 100);
            showAddTaskModal();
        });
        
        tasksContainer.insertBefore(addBtn, tasksContainer.firstChild);
    }
}

// ===========================
// Show Add Task Modal
// ===========================
function showAddTaskModal() {
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
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--white);
        border-radius: 16px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    modal.innerHTML = `
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text-primary);">Add New Task</h2>
        <form id="addTaskForm" style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Task Title *</label>
                <input type="text" id="taskTitle" required placeholder="Enter task title" style="
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
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Description</label>
                <textarea id="taskDescription" placeholder="Enter task description" style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                    resize: vertical;
                    min-height: 80px;
                "></textarea>
            </div>
            <div>
                <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Course/Subject</label>
                <input type="text" id="taskCourse" placeholder="e.g., ENGR 301" style="
                    width: 100%;
                    padding: 0.75rem;
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    font-size: 1rem;
                    color: var(--text-primary);
                    background: var(--white);
                ">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                    <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Due Date *</label>
                    <input type="date" id="taskDueDate" required style="
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
                    <label style="display: block; color: var(--text-primary); font-weight: 600; margin-bottom: 0.5rem;">Priority</label>
                    <select id="taskPriority" style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 2px solid var(--border);
                        border-radius: 8px;
                        font-size: 1rem;
                        color: var(--text-primary);
                        background: var(--white);
                    ">
                        <option value="Normal">Normal</option>
                        <option value="Medium">Medium</option>
                        <option value="Urgent">Urgent</option>
                    </select>
                </div>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="button" id="cancelBtn" style="
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
                    Add Task
                </button>
            </div>
        </form>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const form = modal.querySelector('#addTaskForm');
    const cancelBtn = modal.querySelector('#cancelBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const titleInput = document.getElementById('taskTitle');
        const dueDateInput = document.getElementById('taskDueDate');
        
        // Validation
        if (!titleInput.value.trim()) {
            showToast('✗ Please enter a task title', 'error');
            titleInput.focus();
            return;
        }
        
        if (!dueDateInput.value) {
            showToast('✗ Please select a due date', 'error');
            dueDateInput.focus();
            return;
        }
        
        const userId = getCurrentUserId();
        const taskData = {
            title: titleInput.value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            course: document.getElementById('taskCourse').value.trim(),
            dueDate: dueDateInput.value,
            priority: document.getElementById('taskPriority').value,
            completed: false
        };

        try {
            const taskId = await addTask(userId, taskData);
            console.log('Task added:', taskId);
            
            // Reload tasks
            await loadTasksFromDatabase(userId);
            overlay.remove();
            
            // Show success message
            showToast('✓ Task created successfully!', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            showToast('✗ Failed to add task. Please try again.', 'error');
        }
    });
}

// ===========================
// Toggle Task Completion
// ===========================
async function toggleTaskCompletion(taskId, completed) {
    const userId = getCurrentUserId();
    
    try {
        await updateTaskStatus(userId, taskId, completed);
        
        // Update local state
        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            task.completed = completed;
            renderTasks(currentFilter);
            showToast(completed ? '✓ Task completed!' : '↩️ Task marked incomplete', 'success');
        }
        
        console.log(`Task ${taskId} marked as ${completed ? 'completed' : 'incomplete'}`);
    } catch (error) {
        console.error('Error updating task:', error);
        showToast('✗ Failed to update task', 'error');
    }
}

// ===========================
// Delete Task
// ===========================
// Delete Task with Confirmation Modal
// ===========================
function showDeleteConfirmation(taskId, taskTitle) {
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
        z-index: 9999;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--white);
        border-radius: 12px;
        padding: 2rem;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    `;

    modal.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="color: var(--text-primary); margin-bottom: 0.5rem; font-size: 1.5rem;">Delete Task?</h2>
            <p style="color: var(--text-secondary);">Are you sure you want to delete "<strong>${taskTitle}</strong>"? This action cannot be undone.</p>
        </div>
        <div style="display: flex; gap: 1rem;">
            <button id="cancelDeleteBtn" style="
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
            <button id="confirmDeleteBtn" style="
                flex: 1;
                padding: 0.75rem;
                background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
            ">
                Delete
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const cancelBtn = modal.querySelector('#cancelDeleteBtn');
    const confirmBtn = modal.querySelector('#confirmDeleteBtn');

    cancelBtn.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    confirmBtn.addEventListener('click', async () => {
        overlay.remove();
        await performDeleteTask(taskId);
    });
}

// ===========================
// Perform Delete Task
// ===========================
async function performDeleteTask(taskId) {
    const userId = getCurrentUserId();
    
    try {
        const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
        await remove(taskRef);
        
        // Remove from local state
        currentTasks = currentTasks.filter(t => t.id !== taskId);
        renderTasks(currentFilter);
        
        console.log('Task deleted:', taskId);
        showToast('✓ Task deleted successfully!', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('✗ Failed to delete task. Please try again.', 'error');
    }
}

// ===========================
async function deleteTask(taskId) {
    const task = currentTasks.find(t => t.id === taskId);
    showDeleteConfirmation(taskId, task?.title || 'Task');
}

// ===========================
// Setup Filter Buttons
// ===========================
function setupFilterButtons() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Get filter type
            currentFilter = button.textContent.trim();
            renderTasks(currentFilter);
        });
    });
}

// ===========================
// Setup Task Event Listeners
// ===========================
function setupTaskEventListeners() {
    // Delegated event listeners are handled in createTaskElement
    console.log('Task event listeners setup complete');
}

// ===========================
// Setup Keyboard Shortcuts
// ===========================
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+T to open add task modal
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            showAddTaskModal();
        }
        
        // Escape to close any open modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('[style*="position: fixed"]');
            modals.forEach(modal => {
                if (modal.style.zIndex > 9000) modal.remove();
            });
        }
    });
}

console.log('Task Manager module loaded!');
