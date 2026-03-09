import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { platformVariants } from './drizzle/schema';
import 'dotenv/config';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  
  console.log('=== Testing Drizzle insert ===');
  
  // Test with raw array - does Drizzle serialize it?
  try {
    await db.insert(platformVariants).values({
      contentPackageId: 99997,
      brandId: 1,
      platform: 'linkedin',
      formatType: 'long_post',
      title: 'Drizzle Test',
      body: 'Drizzle body',
      caption: 'Drizzle caption',
      hashtags: ['#drizzle', '#test'],
      status: 'generated',
      version: 1,
    });
    console.log('PASS: Drizzle raw array insert worked');
  } catch (e: any) {
    console.log('FAIL (Drizzle raw array):', e.message.substring(0, 200));
  }
  
  // Test with pre-stringified
  try {
    await db.insert(platformVariants).values({
      contentPackageId: 99997,
      brandId: 1,
      platform: 'instagram',
      formatType: 'caption',
      title: 'Drizzle Test 2',
      body: 'Drizzle body 2',
      caption: 'Drizzle caption 2',
      hashtags: JSON.stringify(['#drizzle2', '#test2']) as any,
      status: 'generated',
      version: 1,
    });
    console.log('PASS: Drizzle stringified insert worked');
  } catch (e: any) {
    console.log('FAIL (Drizzle stringified):', e.message.substring(0, 200));
  }
  
  await conn.execute('DELETE FROM platform_variants WHERE contentPackageId = 99997');
  await conn.end();
}
main().catch(console.error);
