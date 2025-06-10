const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

// Create a new pool instance
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    console.log('Attempting to fetch tasks...');
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY date_from DESC'
    );
    console.log(`Successfully fetched ${result.rows.length} tasks`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    res.status(500).json({ 
      message: 'Server error',
      error: err.message,
      code: err.code
    });
  }
});

// Add new task
router.post('/', auth, async (req, res) => {
  const { date_from, date_to, description, status, remark } = req.body;
  
  try {
    // Convert dates to proper format if they exist
    const formattedDateFrom = date_from ? new Date(date_from).toISOString() : null;
    const formattedDateTo = date_to ? new Date(date_to).toISOString() : null;

    const result = await pool.query(
      'INSERT INTO tasks (date_from, date_to, description, status, remark) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [formattedDateFrom, formattedDateTo, description, status, remark]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding task:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    res.status(500).json({ 
      message: 'Failed to add task',
      error: err.message,
      code: err.code
    });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { date_from, date_to, description, status, remark } = req.body;
  
  try {
    // Validate status value if provided
    if (status && !['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status value',
        allowed: ['Pending', 'In Progress', 'Completed']
      });
    }

    // Convert dates to proper format if they exist
    const formattedDateFrom = date_from ? new Date(date_from).toISOString() : null;
    const formattedDateTo = date_to ? new Date(date_to).toISOString() : null;

    // Check if task exists first
    const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [id]);
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const result = await pool.query(
      'UPDATE tasks SET date_from = $1, date_to = $2, description = $3, status = $4, remark = $5 WHERE id = $6 RETURNING *',
      [formattedDateFrom, formattedDateTo, description, status, remark, id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating task:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    res.status(500).json({ 
      message: 'Failed to update task',
      error: err.message,
      code: err.code
    });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 