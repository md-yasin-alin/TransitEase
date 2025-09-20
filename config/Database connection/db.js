const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // add your MySQL password if any
  database: 'qr_code_transit'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database!');
});

module.exports = db;
