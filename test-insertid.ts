import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { ideas } from './drizzle/schema';
import 'dotenv/config';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  
  // Test what the insert result looks like
  const result = await db.insert(ideas).values({
    brandId: 1,
    title: 'Test idea for insertId check',
    angle: 'test',
    summary: 'test',
    targetPlatforms: JSON.stringify(['linkedin']) as any,
    funnelStage: 'awareness',
    status: 'proposed',
    sourceType: 'batch',
  });
  
  console.log('Insert result type:', typeof result);
  console.log('Insert result keys:', Object.keys(result as any));
  console.log('result.insertId:', (result as any).insertId);
  console.log('result[0]:', (result as any)[0]);
  console.log('result[0].insertId:', (result as any)[0]?.insertId);
  console.log('Full result:', JSON.stringify(result, null, 2));
  
  // Clean up
  await conn.execute('DELETE FROM ideas WHERE title = ?', ['Test idea for insertId check']);
  await conn.end();
}
main().catch(console.error);
