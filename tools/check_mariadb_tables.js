const fs = require('fs');
const path = require('path');

// Let's find any DBFs that have fields matching ID or COD_CPB or similar, or inspect MariaDB
const mariadb = require('../extractor/mariadb_client');

async function testMaria() {
  console.log('Testing MariaDB tables...');
  try {
    const tables = await mariadb.query('SHOW TABLES;');
    console.log('MariaDB tables in mx_10783:', tables);
  } catch(e) {
    console.log('MariaDB error:', e.message);
  }
}

testMaria();
