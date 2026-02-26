const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Initialize SQLite Database
const db = new sqlite3.Database('./todos.db', (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        createTable();
    }
});

// Handle database errors
db.on('error', (err) => {
    console.error('Database error:', err);
});

// Create todos table if it doesn't exist
function createTable() {
    db.run(`
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            completed BOOLEAN DEFAULT 0,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating table:', err);
        } else {
            console.log('Todos table ready');
        }
    });
}

// GET all todos
app.get('/api/todos', (req, res) => {
    db.all('SELECT * FROM todos ORDER BY createdAt DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// POST a new todo
app.post('/api/todos', (req, res) => {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Valid text is required' });
    }

    const trimmedText = text.trim().substring(0, 500); // Limit text to 500 chars
    db.run('INSERT INTO todos (text) VALUES (?)', [trimmedText], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, text: trimmedText, completed: 0, createdAt: new Date().toISOString() });
        }
    });
});

// UPDATE a todo
app.put('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    let { text, completed } = req.body;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const numId = parseInt(id);

    // If only completed is being updated, don't change text
    if (text === null || text === undefined) {
        const completedBool = completed ? 1 : 0;
        db.run(
            'UPDATE todos SET completed = ? WHERE id = ?',
            [completedBool, numId],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ id: numId, text: undefined, completed: completedBool });
                }
            }
        );
    } else if (typeof text === 'string' && text.trim().length > 0) {
        // Update both text and completed
        const trimmedText = text.trim().substring(0, 500);
        const completedBool = completed ? 1 : 0;
        db.run(
            'UPDATE todos SET text = ?, completed = ? WHERE id = ?',
            [trimmedText, completedBool, numId],
            function(err) {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ id: numId, text: trimmedText, completed: completedBool });
                }
            }
        );
    } else {
        res.status(400).json({ error: 'Invalid text value' });
    }
});

// DELETE a todo
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    const numId = parseInt(id);
    db.run('DELETE FROM todos WHERE id = ?', [numId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: 'Todo deleted', id: numId });
        }
    });
});

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});
