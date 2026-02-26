const API_URL = 'http://localhost:3000/api/todos';
let taskInput, addBtn, taskList, emptyState, totalTasksSpan, completedTasksSpan, downloadBtn;

// Initialize DOM elements when page loads
document.addEventListener('DOMContentLoaded', () => {
    taskInput = document.getElementById('taskInput');
    addBtn = document.getElementById('addBtn');
    taskList = document.getElementById('taskList');
    emptyState = document.getElementById('emptyState');
    totalTasksSpan = document.getElementById('totalTasks');
    completedTasksSpan = document.getElementById('completedTasks');
    downloadBtn = document.getElementById('downloadBtn');

    if (addBtn) {
        addBtn.addEventListener('click', addTodo);
    }
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodo();
        });
    }
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadTodosPDF);
    }

    loadTodos();
});

async function loadTodos() {
    try {
        const response = await fetch(API_URL);
        const todos = await response.json();
        taskList.innerHTML = '';
        todos.forEach(todo => renderTodo(todo));
        updateStats();
        updateEmptyState();
    } catch (error) {
        console.error('Error loading todos:', error);
    }
}

async function addTodo() {
    const text = taskInput.value.trim();
    if (!text) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const todo = await response.json();
        renderTodo(todo);
        taskInput.value = '';
        updateStats();
        updateEmptyState();
    } catch (error) {
        console.error('Error adding todo:', error);
    }
}

function renderTodo(todo) {
    const li = document.createElement('li');
    li.className = 'task-item' + (todo.completed ? ' completed' : '');
    li.id = `task-${todo.id}`;
    li.dataset.id = todo.id;
    li.dataset.completed = todo.completed ? 'true' : 'false';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = todo.completed;

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = todo.text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '🗑️';

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);

    checkbox.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        await toggleTodo(todo.id, isChecked, li);
    });
    
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

    if (taskList) {
        taskList.appendChild(li);
    }
}

async function toggleTodo(id, completed, liElement) {
    try {
        // Immediately update UI for better UX
        if (liElement) {
            if (completed) {
                liElement.classList.add('completed');
            } else {
                liElement.classList.remove('completed');
            }
        }
        
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed, text: null })
        });
        
        if (!response.ok) {
            // Revert UI if request fails
            if (liElement) {
                liElement.classList.toggle('completed');
                liElement.querySelector('.task-checkbox').checked = !completed;
            }
            throw new Error('Failed to update task');
        }
        
        updateStats();
    } catch (error) {
        console.error('Error updating todo:', error);
        alert('Failed to update task. Please try again.');
    }
}

async function deleteTodo(id) {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        loadTodos();
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
}

function updateStats() {
    const items = document.querySelectorAll('.task-item');
    const completed = document.querySelectorAll('.task-item.completed').length;
    totalTasksSpan.textContent = `Total: ${items.length}`;
    completedTasksSpan.textContent = `Completed: ${completed}`;
}

function updateEmptyState() {
    emptyState.style.display = taskList.children.length === 0 ? 'block' : 'none';
}

async function downloadTodosPDF() {
    try {
        const response = await fetch(API_URL);
        const todos = await response.json();
        
        if (todos.length === 0) {
            alert('No tasks to download!');
            return;
        }
        
        // Create HTML content for PDF
        let htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; text-align: center; }
                    .task-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
                    .task-complete { text-decoration: line-through; color: #999; }
                    .task-pending { color: #333; }
                    .date { color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>📝 My Todo List</h1>
                <p>Generated on: ${new Date().toLocaleDateString()}</p>
        `;
        
        todos.forEach(todo => {
            const status = todo.completed ? 'COMPLETED' : 'PENDING';
            const className = todo.completed ? 'task-complete' : 'task-pending';
            const escapedText = String(todo.text).replace(/[<>"']/g, (char) => {
                const map = {'<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
                return map[char];
            });
            htmlContent += `
                <div class="task-item">
                    <div class="${className}">
                        <strong>[${status}]</strong> ${escapedText}
                    </div>
                    <div class="date">Created: ${new Date(todo.createdAt).toLocaleDateString()}</div>
                </div>
            `;
        });
        
        htmlContent += `
                <hr>
                <p><strong>Summary:</strong></p>
                <p>Total Tasks: ${todos.length}</p>
                <p>Completed: ${todos.filter(t => t.completed).length}</p>
                <p>Pending: ${todos.filter(t => !t.completed).length}</p>
            </body>
            </html>
        `;
        
        // Generate PDF
        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        
        const options = {
            margin: 10,
            filename: `todo-list-${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        
        html2pdf().set(options).from(element).save();
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error downloading PDF. Check console for details.');
    }
}