const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

let db;

async function connectDB() {
    if (!db) {
        try {
            db = await mysql.createConnection({
                host: process.env.DB_HOST ,
                user: process.env.DB_USER ,
                password: process.env.DB_PASSWORD ,
                database: process.env.DB_NAME 
            });
            console.log('Connected to MySQL database');
        } catch (error) {
            console.error('Error connecting to MySQL:', error);
            throw error; // Rethrow the error to handle it in the caller
        }
    }
    return db;
}

module.exports = connectDB;
