const express = require('express');
const mariadb = require('mariadb');
const cors = require('cors');

const app = express();
app.use(cors());

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

const PORT = 8080;
waitForDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API server running on http://0.0.0.0:${PORT}`);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
