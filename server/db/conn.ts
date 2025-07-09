import mysql from 'mysql2/promise';

export const conn = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Mojang',
})