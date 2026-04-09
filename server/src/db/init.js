require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    console.log('⏳ Running schema migration...');
    await pool.query(schema);
    console.log('✅ Schema created successfully.');
  } catch (err) {
    console.error('❌ Schema error:', err.message);
  } finally {
    await pool.end();
  }
}

init();
