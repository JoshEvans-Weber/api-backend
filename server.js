const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'FamilyChoreTV',
  connectionLimit: 5
});

// Wait for MariaDB to be ready before starting the server
async function waitForDb() {
  let retries = 15;
  while (retries) {
    try {
      let conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log('Connected to MariaDB!');
      return;
    } catch (err) {
      console.log('Waiting for MariaDB...', err.message);
      retries -= 1;
      await new Promise(res => setTimeout(res, 4000));
    }
  }
  throw new Error('Could not connect to MariaDB after multiple attempts');
}

app.get('/api/chores', async (req, res) => {
  let conn;
  let logs = [];
  function log(msg) {
    logs.push(`[${new Date().toISOString()}] ${msg}`);
    console.log(msg);
  }
  try {
    log('Received request for /api/chores');
    conn = await pool.getConnection();
    log('Successfully connected to MariaDB');
    const rows = await conn.query('SELECT choreName, description, moneyEarned, priority FROM Chores');
    log(`Fetched ${rows.length} chores from database`);
    res.json({ logs, data: rows });
  } catch (err) {
    log(`Error: ${err.message}`);
    res.status(500).json({ logs, error: err.message });
  } finally {
    if (conn) conn.release();
    log('Connection released');
  }
});

// User registration endpoint
app.post('/api/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role || !['parent', 'kid'].includes(role)) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    const [existing] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    await conn.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    const [user] = await conn.query('SELECT id, username, password_hash, role FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    res.json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Endpoint to get all parent users
app.get('/api/parent-users', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT id, username FROM users WHERE role = 'parent'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// Google+PIN parent registration endpoint
app.post('/api/register-parent-google', async (req, res) => {
  console.log('register-parent-google body:', req.body);
  const { email, googleId, pin } = req.body;
  if (!email || !googleId || !pin || pin.length !== 4) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }
  let conn;
  try {
    conn = await pool.getConnection();
    // Check if parent already exists by email or googleId
    const [existing] = await conn.query('SELECT id FROM users WHERE username = ? OR google_id = ?', [email, googleId]);
    if (existing) {
      return res.status(409).json({ error: 'Parent account already exists' });
    }
    // Hash the PIN for storage
    const hash = await bcrypt.hash(pin, 10);
    await conn.query('INSERT INTO users (username, password_hash, role, google_id) VALUES (?, ?, ?, ?)', [email, hash, 'parent', googleId]);
    res.json({ success: true });
  } catch (err) {
    console.error('register-parent-google error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

const PORT = 8080;
waitForDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API server running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
