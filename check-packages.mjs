import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [packages] = await conn.execute('SELECT id, ideaId, status, createdAt FROM content_packages ORDER BY createdAt DESC LIMIT 10');
console.log('Latest packages:', JSON.stringify(packages, null, 2));

const [variants] = await conn.execute('SELECT id, contentPackageId, platform, status, createdAt FROM platform_variants ORDER BY createdAt DESC LIMIT 10');
console.log('Latest variants:', JSON.stringify(variants, null, 2));

await conn.end();
