import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('=== Testing platform_variants insert ===\n');

// Test 1: raw JS array (the bug case)
try {
  await conn.execute(
    `INSERT INTO platform_variants (contentPackageId, brandId, platform, formatType, title, body, caption, hashtags, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [99999, 1, 'linkedin', 'long_post', 'Test', 'Test body', 'Test caption', ['#test', '#branding'], 'generated', 1]
  );
  console.log('TEST 1 PASS: raw JS array insert worked via mysql2');
} catch (e) {
  console.log('TEST 1 FAIL (raw array):', e.message.substring(0, 200));
}

// Test 2: JSON.stringify (the fix)
try {
  await conn.execute(
    `INSERT INTO platform_variants (contentPackageId, brandId, platform, formatType, title, body, caption, hashtags, status, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [99999, 1, 'instagram', 'caption', 'Test2', 'Test body 2', 'Test caption 2', JSON.stringify(['#test2', '#branding2']), 'generated', 1]
  );
  console.log('TEST 2 PASS: JSON.stringify insert worked');
} catch (e) {
  console.log('TEST 2 FAIL (stringified):', e.message.substring(0, 200));
}

// Clean up
await conn.execute(`DELETE FROM platform_variants WHERE contentPackageId = 99999`);
console.log('\nCleaned up test rows');
await conn.end();
console.log('Done');
