import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get the Pulse Branding brand ID
const [brands] = await conn.execute("SELECT id, name FROM brands WHERE name LIKE '%Pulse%' LIMIT 1");
if (!brands.length) {
  console.log("No Pulse Branding brand found — run seed-pulse-branding.mjs first");
  await conn.end();
  process.exit(1);
}
const brandId = brands[0].id;
console.log(`Seeding inspector thresholds for brand: ${brands[0].name} (ID: ${brandId})`);

// Default thresholds per dimension
// Columns: id, brandId, dimension, minScore, isActive, weight
const thresholds = [
  { dimension: "humanisation",  minScore: 8, isActive: 1, weight: 25 },
  { dimension: "authenticity",  minScore: 9, isActive: 1, weight: 25 },
  { dimension: "accuracy",      minScore: 8, isActive: 1, weight: 20 },
  { dimension: "platform_fit",  minScore: 7, isActive: 1, weight: 15 },
  { dimension: "originality",   minScore: 7, isActive: 1, weight: 15 },
  { dimension: "vitality",      minScore: 7, isActive: 0, weight: 0  },
];

for (const t of thresholds) {
  await conn.execute(
    `INSERT INTO inspector_thresholds (brandId, dimension, minScore, isActive, weight, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE minScore = VALUES(minScore), isActive = VALUES(isActive), weight = VALUES(weight), updatedAt = NOW()`,
    [brandId, t.dimension, t.minScore, t.isActive, t.weight]
  );
  console.log(`  ✓ ${t.dimension}: min score ${t.minScore} (${t.isActive ? "blocking" : "info only"}), weight ${t.weight}%`);
}

// Seed default inspector rules
// Columns: id, brandId, ruleType, platform, ruleValue, severity, autoFix, isActive, sortOrder
const rules = [
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "**",                        severity: "error",   autoFix: 1, sortOrder: 1 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "—",                         severity: "warning", autoFix: 1, sortOrder: 2 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "delve into",                severity: "error",   autoFix: 1, sortOrder: 3 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "game-changer",              severity: "warning", autoFix: 1, sortOrder: 4 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "unlock your potential",     severity: "error",   autoFix: 1, sortOrder: 5 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "leverage",                  severity: "warning", autoFix: 1, sortOrder: 6 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "in today's fast-paced world", severity: "error", autoFix: 1, sortOrder: 7 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "it's important to note",    severity: "warning", autoFix: 1, sortOrder: 8 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "in conclusion",             severity: "warning", autoFix: 1, sortOrder: 9 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "revolutionize",             severity: "warning", autoFix: 1, sortOrder: 10 },
  { ruleType: "banned_phrase", platform: "all",       ruleValue: "cutting-edge",              severity: "warning", autoFix: 1, sortOrder: 11 },
  { ruleType: "formatting_rule",  platform: "linkedin",  ruleValue: "max_words:300",             severity: "warning", autoFix: 0, sortOrder: 12 },
  { ruleType: "formatting_rule",  platform: "instagram", ruleValue: "hashtags_min:8",            severity: "warning", autoFix: 0, sortOrder: 13 },
  { ruleType: "formatting_rule",  platform: "instagram", ruleValue: "hashtags_max:15",           severity: "warning", autoFix: 0, sortOrder: 14 },
];

for (const r of rules) {
  await conn.execute(
    `INSERT INTO inspector_rules (brandId, ruleType, platform, ruleValue, severity, autoFix, isActive, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE ruleValue = VALUES(ruleValue), updatedAt = NOW()`,
    [brandId, r.ruleType, r.platform, r.ruleValue, r.severity, r.autoFix, r.sortOrder]
  );
  console.log(`  ✓ Rule [${r.ruleType}/${r.platform}]: "${r.ruleValue}" (${r.severity})`);
}

await conn.end();
console.log("\n✅ Inspector thresholds and rules seeded successfully");
