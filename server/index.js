const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Recommended salt rounds for bcrypt
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });

// Import jwtService after environment variables are loaded
const jwtService = require('./jwt.service');

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:4200', // Angular default port
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'email_lead',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Test DB connection
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL database successfully!');
    client.release();
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    process.exit(1);
  });

// Test endpoint to verify database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 + 1 AS result');
    console.log('Database query successful:', result.rows[0]);
    res.json({ message: 'Database connection is working', result: result.rows[0] });
  } catch (err) {
    console.error('Database test failed:', err);
    res.status(500).json({ 
      message: 'Database connection failed',
      error: err.message 
    });
  }
});

// Middleware: JWT Authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const user = jwtService.verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Debug: List all users
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Init Admin
app.post('/api/init-admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      `INSERT INTO users (username, email, password, role, first_name, last_name, status)
       VALUES ('admin', $1, $2, 'admin', 'Admin', 'User', 'active')`,
      [email, hashedPassword]
    );

    res.json({ message: 'Admin user created successfully' });
  } catch (err) {
    console.error('Init admin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', {
      email: req.body.email,
      hasPassword: !!req.body.password
    });
    
    if (!req.body.email || !req.body.password) {
      console.log('Missing credentials');
      return res.status(400).json({ 
        message: 'Email and password are required',
        success: false
      });
    }

    // Get user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [req.body.email]
    );

    console.log('Database query result:', {
      rowCount: result.rowCount,
      userFound: !!result.rows[0],
      user: result.rows[0] ? {
        id: result.rows[0].id,
        email: result.rows[0].email,
        status: result.rows[0].status,
        role: result.rows[0].role
      } : null
    });

    let user = result.rows[0];

    // If user doesn't exist, create them
    if (!user) {
      console.log('User not found, creating new user:', req.body.email);
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      
      // Create new user
      const newUserResult = await pool.query(
        `INSERT INTO users (
          username, email, password, role, 
          first_name, last_name, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING *`,
        [
          req.body.email.split('@')[0], // username from email
          req.body.email,
          hashedPassword,
          'user', // default role
          req.body.email.split('@')[0], // first name from email
          '', // empty last name
          'active' // active status
        ]
      );
      
      user = newUserResult.rows[0];
      console.log('New user created:', {
        id: user.id,
        email: user.email,
        role: user.role
      });
    }

    if (user.status !== 'active') {
      console.log('User is not active:', user.id);
      return res.status(401).json({
        message: 'Account is not active',
        success: false
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(req.body.password, user.password);
    console.log('Password verification:', {
      isValid: isValidPassword,
      userId: user.id,
      providedPassword: req.body.password,
      storedHash: user.password
    });

    if (!isValidPassword) {
      console.log('Password verification failed for user:', user.id);
      return res.status(401).json({ 
        message: 'Invalid credentials',
        success: false
      });
    }

    // Generate token
    const token = jwtService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Remove password from response
    delete user.password;

    // Log successful login - using user_id instead of created_by
    try {
      await pool.query(
        'INSERT INTO logs (action, entity, entity_id, details, user_id) VALUES ($1, $2, $3, $4, $5)',
        ['login', 'auth', user.id, `User logged in: ${user.email}`, user.id]
      );
    } catch (logError) {
      console.error('Failed to log login:', logError);
      // Don't fail the login if logging fails
    }

    console.log('Login successful for user:', user.id);
    res.json({ 
      token, 
      user,
      success: true,
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', {
      error: error.message,
      stack: error.stack,
      type: error.name,
      database: error.code,
      request: {
        email: req.body.email,
        hasPassword: !!req.body.password
      }
    });
    
    // Handle specific error cases
    if (error.code === '28P01') { // Invalid password
      return res.status(401).json({ 
        message: 'Invalid credentials',
        success: false
      });
    }
    if (error.message.includes('JWT')) {
      return res.status(500).json({ 
        message: 'Authentication system error',
        error: 'Failed to generate authentication token',
        success: false
      });
    }
    
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      success: false
    });
  }
});

// ================== Leads API ==================

app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Leads fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const {
        source, first_name, last_name, designation, phone_no_1, phone_no_2,
        email_id_1, email_id_2, email_id_3, website, address, city, country,
        status, remarks, follow_up
      } = req.body;

      // Validate required fields
      if (!first_name || !email_id_1) {
        return res.status(400).json({
          message: 'Missing required fields',
          required: ['first_name', 'email_id_1']
        });
      }

      // Prepare data with proper type handling
      const leadData = {
        source: source || null,
        first_name: first_name,
        last_name: last_name || null,
        designation: designation || null,
        phone_no_1: phone_no_1 || '',  // Allow empty string for phone_no_1
        phone_no_2: phone_no_2 || null,
        email_id_1: email_id_1,
        email_id_2: email_id_2 || null,
        email_id_3: email_id_3 || null,
        website: website || null,
        address: address || null,
        city: city || null,
        country: country || null,
        status: status || 'New',
        remarks: remarks || null,
        follow_up: follow_up ? new Date(follow_up) : null,
        created_by: req.user.id
      };

      // Get column names and values
      const columns = Object.keys(leadData);
      const values = Object.values(leadData);

      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const query = `
        INSERT INTO leads (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Lead creation error:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database error during lead creation:', err);
    res.status(500).json({ 
      message: 'Database error during lead creation', 
      error: err.message
    });
  }
});

app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const result = await pool.query(
      `UPDATE leads SET
        source = $1, first_name = $2, last_name = $3, designation = $4,
        phone_no_1 = $5, phone_no_2 = $6, email_id_1 = $7, email_id_2 = $8,
        email_id_3 = $9, website = $10, address = $11, city = $12,
        country = $13, status = $14, remarks = $15, follow_up = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17 RETURNING *`,
      [
        updates.source, updates.first_name, updates.last_name, updates.designation,
        updates.phone_no_1, updates.phone_no_2, updates.email_id_1, updates.email_id_2,
        updates.email_id_3, updates.website, updates.address, updates.city,
        updates.country, updates.status, updates.remarks, updates.follow_up,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Lead update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    console.error('Lead delete error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== User Management ==================

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, first_name, last_name, role, created_at, status FROM users'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { username, email, password, role, first_name, last_name, status } = req.body;

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO users (username, email, password, role, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [username, email, hashedPassword, role, first_name, last_name, status]
    );

    const newUser = result.rows[0];
    delete newUser.password;
    res.status(201).json(newUser);
  } catch (err) {
    console.error('User creation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================== Logs ==================

app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { user_id, action, entity, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    
    // Build query based on filters
    if (user_id) {
      query += ' AND created_by = $' + (params.length + 1);
      params.push(parseInt(user_id));
    }
    if (action) {
      query += ' AND action = $' + (params.length + 1);
      params.push(action);
    }
    if (entity) {
      query += ' AND entity = $' + (params.length + 1);
      params.push(entity);
    }
    if (startDate) {
      query += ' AND created_at >= $' + (params.length + 1);
      params.push(new Date(startDate));
    }
    if (endDate) {
      query += ' AND created_at <= $' + (params.length + 1);
      params.push(new Date(endDate));
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { action, entity, entity_id, details } = req.body;
    
    // Validate required fields
    if (!action || !entity || !entity_id || !details) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'action, entity, entity_id, and details are required'
      });
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        'INSERT INTO logs (action, entity, entity_id, details, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [action, entity, entity_id, details, req.user.id]
      );
      
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Log creation error:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database error during log creation:', err);
    res.status(500).json({ 
      message: 'Database error during log creation', 
      error: err.message,
      details: err.stack 
    });
  }
});

app.get('/api/logs/stats', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get total logs
      const totalLogsResult = await client.query('SELECT COUNT(*) AS total FROM logs');
      const totalLogs = parseInt(totalLogsResult.rows[0]?.total || 0);

      // Get logs grouped by action
      const actionsResult = await client.query(`
        SELECT action, COUNT(*) AS count
        FROM logs
        GROUP BY action
        ORDER BY count DESC
      `);
      const actions = {};
      actionsResult.rows.forEach(row => {
        actions[row.action] = parseInt(row.count);
      });

      // Get logs grouped by day
      const actionsPerDayResult = await client.query(`
        SELECT DATE_TRUNC('day', created_at) AS date, COUNT(*) AS count
        FROM logs
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `);
      const actionsPerDay = actionsPerDayResult.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      }));

      res.json({
        total: totalLogs,
        actions,
        actionsPerDay
      });

    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error fetching log stats:', err);
    res.status(500).json({
      message: 'Error fetching log stats',
      error: err.message
    });
  }
});

// ================== Leads Stats ==================

app.get('/api/leads/stats', authenticateToken, async (req, res) => {
  try {
    const [totalLeads, thirtyDayLeads, followedUpLeads, convertedLeads, duplicates] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM leads'),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE created_at >= NOW() - INTERVAL \'30 days\''),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE follow_up IS NOT NULL AND follow_up <= CURRENT_DATE'),
      pool.query('SELECT COUNT(*) as count FROM leads WHERE status = \'converted\''),
      pool.query(`
        SELECT COUNT(*) as duplicates 
        FROM (SELECT email_id_1, COUNT(*) as count 
              FROM leads 
              GROUP BY email_id_1 
              HAVING COUNT(*) > 1) as duplicates
      `)
    ]);

    res.json({
      total: totalLeads.rows[0].total,
      newLeads: thirtyDayLeads.rows[0].count,
      followedUp: followedUpLeads.rows[0].count,
      converted: convertedLeads.rows[0].count,
      duplicates: duplicates.rows[0].duplicates
    });
  } catch (err) {
    console.error('Lead stats error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch lead statistics',
      error: err.message 
    });
  }
});

// ================== Duplicate Leads ==================

app.get('/api/leads/duplicates', authenticateToken, async (req, res) => {
  try {
    console.log('Finding duplicate leads...');
    
    // Get all columns from the leads table with their data types
    const schemaResult = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1',
      ['leads']
    );
    
    console.log('Available columns:', schemaResult.rows);
    
    // Find a suitable identifier column (any text or varchar column)
    let identifierColumn = null;
    for (const column of schemaResult.rows) {
      if (column.column_name !== 'id' && 
          (column.data_type === 'text' || column.data_type === 'character varying')) {
        identifierColumn = column.column_name;
        break;
      }
    }

    if (!identifierColumn) {
      console.log('No suitable identifier column found');
      res.json({ duplicates: [] });
      return;
    }

    console.log('Using identifier column:', identifierColumn);
    
    // Get all leads grouped by the identifier column
    const result = await pool.query(`
      SELECT ${identifierColumn}, array_agg(id) as lead_ids
      FROM leads 
      GROUP BY ${identifierColumn} 
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    
    // Convert the result to an array of arrays format
    const duplicateGroups = result.rows.map(row => {
      const leads = row.lead_ids.map(id => ({
        id: id,
        [identifierColumn]: row[identifierColumn]
      }));
      return leads;
    });
    
    console.log('Found duplicate groups:', duplicateGroups);
    // Ensure we always return an array of arrays
    const finalResult = duplicateGroups.length > 0 ? duplicateGroups : [];
    console.log('Final result:', finalResult);
    res.json(finalResult);
  } catch (err) {
    console.error('Detailed error:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ 
      message: 'Failed to find duplicate leads',
      error: err.message 
    });
  }
});

// ================== Import Leads ==================
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.xlsx' && ext !== '.csv') {
      return cb(new Error('Only .xlsx or .csv files are allowed'), false);
    }
    cb(null, true);
  }
});
app.post('/api/leads/import', authenticateToken, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  try {
    console.log('Import request received');
    console.log('File info:', {
      name: req.file?.originalname,
      size: req.file?.size,
      type: req.file?.mimetype
    });

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileBuffer = req.file.buffer;
    if (!fileBuffer) {
      return res.status(400).json({ message: 'Invalid file format' });
    }

    // Parse the file
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Parsed ${rows.length} rows from file`);

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Empty or invalid file' });
    }

    // Field name mapping from Excel to database
    const fieldMapping = {
      'Source': 'source',
      'First Name': 'first_name',
      'Last Name': 'last_name',
      'Designation': 'designation',
      'Phone No 1': 'phone_no_1',
      'Phone No 2': 'phone_no_2',
      'Email Id 1': 'email_id_1',
      'Email Id 2': 'email_id_2',
      'Email Id 3': 'email_id_3',
      'Website': 'website',
      'Address': 'address',
      'City': 'city',
      'Country': 'country',
      'Status': 'status',
      'Remarks': 'remarks',
      'Follow Up': 'follow_up'
    };

    let importedCount = 0;
    let skippedCount = 0;
    let errors = [];

    // Process each row
    for (const row of rows) {
      try {
        // Start a new transaction for each row
        await client.query('BEGIN');

        const values = [];
        const columns = [];
        
        // Process each field from the mapping
        Object.entries(fieldMapping).forEach(([excelField, dbField]) => {
          const value = row[excelField];
          if (value !== undefined && value !== '') {
            columns.push(dbField);
            // Convert phone numbers to strings and handle special cases
            if (dbField.includes('phone_no')) {
              let phoneValue = String(value).trim();
              // Clean phone number but allow empty values
              phoneValue = phoneValue.replace(/[^\d+-]/g, '');
              // If phone number is empty after cleaning, store empty string instead of null
              values.push(phoneValue || '');
            } else if (dbField === 'follow_up' && value) {
              // Handle date fields
              const date = new Date(value);
              values.push(date instanceof Date && !isNaN(date) ? date : null);
            } else if (dbField === 'status') {
              // Use default status if not provided
              values.push(value || 'New');
            } else {
              values.push(value);
            }
          }
        });

        // Add required fields at the end
        columns.push('created_by', 'created_at', 'updated_at', 'status');
        values.push(req.user.id, new Date(), new Date(), 'New');

        // Skip empty rows
        if (columns.length <= 4) { // Only has required fields
          await client.query('ROLLBACK');
          skippedCount++;
          continue;
        }

        // Check for duplicates based on email_id_1
        if (row['Email Id 1']) {
          const duplicateCheck = await client.query(
            'SELECT id FROM leads WHERE email_id_1 = $1',
            [row['Email Id 1']]
          );
          
          if (duplicateCheck.rows.length > 0) {
            // Update existing lead instead of skipping
            const leadId = duplicateCheck.rows[0].id;
            const updateColumns = columns.filter(col => col !== 'created_by' && col !== 'created_at' && col !== 'updated_at' && col !== 'status');
            const updateValues = values.slice(4); // Skip first 4 values (required fields)
            
            if (updateColumns.length > 0) {
              const updateSet = updateColumns.map(col => `${col} = $${col}`).join(', ');
              await client.query(
                `UPDATE leads SET ${updateSet}, updated_at = CURRENT_TIMESTAMP WHERE id = $id`,
                {...Object.fromEntries(updateColumns.map((col, i) => [col, updateValues[i]])), id: leadId}
              );
              importedCount++;
              
              // Log the update
              await client.query(
                'INSERT INTO logs (action, entity, entity_id, details, created_by) VALUES ($1, $2, $3, $4, $5)',
                ['update', 'lead', leadId, `Updated lead: ${row['First Name']} (${row['Email Id 1']})`, req.user.id]
              );
            }
            await client.query('COMMIT');
            continue;
          }
        }

        // Prepare insert query
        const placeholders = columns.map((_, i) => `$${i + 1}`);
        const query = `INSERT INTO leads (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

        await client.query(query, values);
        await client.query('COMMIT');
        importedCount++;

        // Log the successful import
        await client.query(
          'INSERT INTO logs (action, entity, entity_id, details, created_by) VALUES ($1, $2, $3, $4, $5)',
          ['create', 'lead', null, `Imported lead: ${row['First Name']} (${row['Email Id 1']})`, req.user.id]
        );
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error processing row:', row, err);
        errors.push({
          row: row,
          error: err.message
        });
        skippedCount++;
      }
    }
    
    res.json({ 
      message: 'Import completed', 
      count: importedCount,
      totalRows: rows.length,
      skipped: skippedCount,
      errors: errors,
      success: true
    });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ 
      message: 'Import failed', 
      error: err.message,
      success: false
    });
  } finally {
    client.release();
  }
});

//===================bulk-delete====================
app.post('/api/leads/delete-multiple', authenticateToken, async (req, res) => {
  try {
    console.log('Bulk delete request:', req.body);
    
    const { ids } = req.body;
    
    // Validate request format
    if (!ids) {
      return res.status(400).json({ 
        message: 'Missing ids array in request body',
        success: false
      });
    }

    if (!Array.isArray(ids)) {
      return res.status(400).json({ 
        message: 'ids must be an array',
        success: false
      });
    }

    if (ids.length === 0) {
      return res.status(400).json({ 
        message: 'No leads selected for deletion',
        success: false
      });
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // First check how many leads actually exist
      const existingLeads = await client.query(
        'SELECT id, first_name, email_id_1 FROM leads WHERE id = ANY($1::uuid[])',
        [ids]
      );

      if (existingLeads.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          message: 'No leads found with the provided IDs',
          success: false
        });
      }

      // Delete the leads
      const result = await client.query(
        'DELETE FROM leads WHERE id = ANY($1::uuid[]) RETURNING id, first_name, email_id_1',
        [ids]
      );

      // Log each deletion
      for (const deletedLead of result.rows) {
        await client.query(
          'INSERT INTO logs (action, entity, entity_id, details, created_by) VALUES ($1, $2, $3, $4, $5)',
          ['delete', 'lead', deletedLead.id, `Deleted lead: ${deletedLead.first_name} (${deletedLead.email_id_1})`, req.user.id]
        );
      }

      await client.query('COMMIT');

      res.json({ 
        message: `Successfully deleted ${result.rowCount} leads`,
        count: result.rowCount,
        deleted: result.rows.map(row => ({ id: row.id, first_name: row.first_name, email_id_1: row.email_id_1 })),
        success: true
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Bulk delete error:', err);
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ 
      message: 'Failed to delete leads',
      error: err.message,
      success: false
    });
  }
});

// ================== Export Leads ==================
app.get('/api/leads/export', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      // Get all leads with all columns
      const result = await client.query(
        'SELECT * FROM leads ORDER BY created_at DESC'
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No leads found' });
      }

      // Log all columns from the database
      const columnsResult = await client.query(
        'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
        ['leads']
      );
      
      console.log('Database columns:', columnsResult.rows.map(row => row.column_name));
      
      // Create mapping of database column names to display names
      const columnMapping = {
        id: 'ID',
        source: 'Source',
        first_name: 'First Name',
        last_name: 'Last Name',
        designation: 'Designation',
        phone_no_1: 'Phone No 1',
        phone_no_2: 'Phone No 2',
        email_id_1: 'Email Id 1',
        email_id_2: 'Email Id 2',
        email_id_3: 'Email Id 3',
        website: 'Website',
        address: 'Address',
        city: 'City',
        country: 'Country',
        status: 'Status',
        remarks: 'Remarks',
        follow_up: 'Follow Up',
        created_at: 'Created At',
        updated_at: 'Updated At',
        created_by: 'Created By'
      };

      // Log the mapping
      console.log('Column mapping:', columnMapping);

      // Create header row from column mapping
      const headerRow = Object.values(columnMapping);
      
      // Log the header row
      console.log('Header row:', headerRow);

      // Create data rows
      const dataRows = result.rows.map(lead => {
        const row = headerRow.map(header => {
          const dbField = Object.keys(columnMapping).find(key => columnMapping[key] === header);
          if (!dbField) {
            console.log('Missing mapping for header:', header);
            return '';
          }
          const value = lead[dbField];
          
          // Format specific fields
          if (dbField === 'follow_up' && value) {
            return new Date(value).toISOString().split('T')[0];
          } else if (dbField.includes('at') && value) {
            return new Date(value).toISOString();
          } else if (value === null) {
            return '';
          }
          return value;
        });
        
        // Log the processed row
        console.log('Processed row:', row);
        return row;
      });

      // Combine header and data
      const allData = [headerRow, ...dataRows];
      
      // Log the first few rows of data
      console.log('First few rows of data:', allData.slice(0, 2));

      // Create workbook and worksheet
      const workbook = xlsx.utils.book_new();
      const worksheet = xlsx.utils.aoa_to_sheet(allData);
      
      // Add worksheet to workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=leads_export.xlsx');

      // Write the workbook to the response
      xlsx.write(workbook, { 
        bookType: 'xlsx',
        type: 'buffer'
      }).then(buffer => {
        res.send(buffer);
      });

      // Log the export
      await client.query(
        'INSERT INTO logs (action, entity, entity_id, details, created_by) VALUES ($1, $2, $3, $4, $5)',
        ['export', 'lead', null, `Exported ${result.rows.length} leads`, req.user.id]
      );
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ 
        message: 'Failed to export leads',
        error: err.message
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ 
      message: 'Failed to export leads',
      error: err.message
    });
  }
});

// ================== Remove Duplicates ==================
app.delete('/api/leads/remove-duplicates', authenticateToken, async (req, res) => {
  let client;
  try {
    console.log('Starting duplicate removal process...');
    
    // Validate that no ID is being passed in the URL
    if (req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request format. This endpoint does not accept IDs in the URL',
        error: 'This endpoint is used to remove duplicates and should be called without any parameters'
      });
    }

    client = await pool.connect();
    console.log('Database connection established');
    
    // Start transaction
    await client.query('BEGIN');
    console.log('Transaction started');

    // First, get all duplicates based on email_id_1, keeping the oldest record
    const duplicatesResult = await client.query(`
      WITH ranked_leads AS (
        SELECT id, email_id_1, ROW_NUMBER() OVER (PARTITION BY email_id_1 ORDER BY created_at ASC) as rn
        FROM leads
        WHERE email_id_1 IS NOT NULL
      )
      SELECT id, email_id_1
      FROM ranked_leads
      WHERE rn > 1
    `);

    console.log(`Found ${duplicatesResult.rows.length} duplicates`);
    if (duplicatesResult.rows.length === 0) {
      await client.query('COMMIT');
      console.log('No duplicates found, committing transaction');
      return res.json({
        message: 'No duplicates found',
        removed: 0,
        success: true
      });
    }

    // Delete duplicates, keeping the oldest record
    const idsToDelete = duplicatesResult.rows.map(row => row.id);
    console.log('IDs to delete:', idsToDelete);
    
    // First verify these IDs exist
    const verifyResult = await client.query(
      'SELECT id FROM leads WHERE id = ANY($1::uuid[])',
      [idsToDelete]
    );
    
    if (verifyResult.rows.length !== idsToDelete.length) {
      console.error('Some IDs to delete were not found in the database');
      throw new Error(`Could not find all IDs to delete. Found: ${verifyResult.rows.length}, Expected: ${idsToDelete.length}`);
    }

    const deleteResult = await client.query(
      'DELETE FROM leads WHERE id = ANY($1::uuid[]) RETURNING *',
      [idsToDelete]
    );

    console.log(`Deleted ${deleteResult.rowCount} rows`);
    
    // Verify deletion by checking if any of the IDs still exist
    const checkResult = await client.query(
      'SELECT id FROM leads WHERE id = ANY($1::uuid[])',
      [idsToDelete]
    );
    
    if (checkResult.rows.length > 0) {
      console.error('Some rows were not deleted:', checkResult.rows);
      throw new Error(`Failed to delete all rows. ${checkResult.rows.length} rows still exist`);
    }

    // Log the deletion
    await client.query(
      'INSERT INTO logs (action, entity, entity_id, details, created_by) VALUES ($1, $2, $3, $4, $5)',
      ['delete_duplicates', 'lead', null, `Removed ${deleteResult.rowCount} duplicate leads. Kept oldest records based on creation date.`, req.user.id]
    );

    // Verify the log was created
    const logResult = await client.query(
      'SELECT id FROM logs WHERE action = $1 AND created_by = $2 ORDER BY created_at DESC LIMIT 1',
      ['delete_duplicates', req.user.id]
    );
    
    if (logResult.rows.length === 0) {
      console.error('Failed to create log entry');
      throw new Error('Failed to create log entry for duplicate removal');
    }

    await client.query('COMMIT');
    console.log('Transaction committed successfully');

    res.json({
      message: `Successfully removed ${deleteResult.rowCount} duplicate leads`,
      removed: deleteResult.rowCount,
      success: true,
      details: {
        duplicatesFound: duplicatesResult.rows.length,
        duplicatesRemoved: deleteResult.rowCount,
        removedIds: idsToDelete,
        logEntryCreated: true
      }
    });
  } catch (error) {
    console.error('Duplicate removal failed:', error);
    
    // Rollback transaction if client exists
    if (client) {
      try {
        await client.query('ROLLBACK');
        console.log('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to remove duplicates',
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        pgError: error.code ? {
          code: error.code,
          detail: error.detail,
          hint: error.hint
        } : undefined
      }
    });
  } finally {
    if (client) {
      client.release();
      console.log('Database connection released');
    }
  }
});

// Activity Trends (Daily Activity)
app.get('/api/leads/activity-trends', authenticateToken, async (req, res) => {
  try {
    // Get activity data for last 30 days
    const activityResult = await pool.query(`
      WITH daily_data AS (
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_leads,
          COUNT(DISTINCT user_id) as active_users
        FROM leads
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
      )
      SELECT 
        date,
        COALESCE(new_leads, 0) as new_leads,
        COALESCE(active_users, 0) as active_users
      FROM generate_series(
        CURRENT_DATE - INTERVAL '29 days',
        CURRENT_DATE,
        INTERVAL '1 day'
      ) as date
      LEFT JOIN daily_data ON date = daily_data.date
      ORDER BY date
    `);

    // Format data for chart
    const dates = activityResult.rows.map(row => row.date.toISOString().split('T')[0]);
    const newLeadsData = activityResult.rows.map(row => row.new_leads);
    const activeUsersData = activityResult.rows.map(row => row.active_users);

    res.json({
      labels: dates,
      datasets: [
        {
          label: 'New Leads',
          data: newLeadsData,
          fill: true
        },
        {
          label: 'Active Users',
          data: activeUsersData,
          fill: true
        }
      ]
    });
  } catch (err) {
    console.error('Activity trends error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch activity trends',
      error: err.message 
    });
  }
});

// Leads by Status
app.get('/api/leads/status-distribution', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM leads
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `);

    const labels = result.rows.map(row => row.status);
    const data = result.rows.map(row => row.count);

    res.json({
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22'
        ]
      }]
    });
  } catch (err) {
    console.error('Status distribution error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch status distribution',
      error: err.message 
    });
  }
});

// Leads by Source
app.get('/api/leads/source-distribution', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        source,
        COUNT(*) as count
      FROM leads
      WHERE source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
    `);

    const labels = result.rows.map(row => row.source);
    const data = result.rows.map(row => row.count);

    res.json({
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22'
        ]
      }]
    });
  } catch (err) {
    console.error('Source distribution error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch source distribution',
      error: err.message 
    });
  }
});

// Leads by Country
app.get('/api/leads/country-distribution', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        country,
        COUNT(*) as count
      FROM leads
      WHERE country IS NOT NULL
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `);

    const labels = result.rows.map(row => row.country);
    const data = result.rows.map(row => row.count);

    res.json({
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f', '#e67e22',
          '#1abc9c', '#34495e', '#8e44ad', '#2c3e50'
        ]
      }]
    });
  } catch (err) {
    console.error('Country distribution error:', err);
    res.status(500).json({ 
      message: 'Failed to fetch country distribution',
      error: err.message 
    });
  }
});

// ================== Start Server ==================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});
