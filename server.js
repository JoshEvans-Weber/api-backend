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

app.get('/api/chores', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT choreName, description, moneyEarned, priority FROM Chores');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});
