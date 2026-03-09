import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { pipelineRuns } from './drizzle/schema';
import 'dotenv/config';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(conn);
  const result = await db.insert(pipelineRuns).values({
    brandId: 1, triggeredByUserId: 1, status: 'running',
    ideasGenerated: 0, ideasApproved: 0, packagesGenerated: 0,
    packagesInspected: 0, packagesPassedInspection: 0, startedAt: new Date()
  });
  console.log('result[0].insertId:', (result as any)[0]?.insertId);
  console.log('result.insertId:', (result as any).insertId);
  console.log('Full result:', JSON.stringify(result));
  const insertedId = (result as any)[0]?.insertId;
  if (insertedId) {
    await conn.execute('DELETE FROM pipeline_runs WHERE id = ?', [insertedId]);
  }
  await conn.end();
}
main().catch(console.error);
