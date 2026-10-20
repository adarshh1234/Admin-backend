import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runDatabaseUnification(targetUri = 'mongodb://127.0.0.1:27017/letgetin', sourceUri = 'mongodb://127.0.0.1:27017/curemaso') {
  console.log('=================================================');
  console.log('🔄 Starting Database Unification & Safety Migration');
  console.log(`🎯 Target Shared Database: ${targetUri}`);
  console.log(`📦 Source Database: ${sourceUri}`);
  console.log('=================================================');

  const backupDir = path.resolve(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionBackupDir = path.join(backupDir, `backup_${timestamp}`);
  fs.mkdirSync(sessionBackupDir, { recursive: true });

  const targetConn = await mongoose.createConnection(targetUri).asPromise();
  let sourceConn = null;
  try {
    sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  } catch (err) {
    console.warn(`⚠️ Could not connect to source DB (${sourceUri}): ${err.message}. Proceeding with target DB setup.`);
  }

  try {
    // 1. BACKUP TARGET DB
    console.log('💾 Creating safety backup of current target collections...');
    const targetCols = await targetConn.db.listCollections().toArray();
    for (const col of targetCols) {
      const data = await targetConn.db.collection(col.name).find({}).toArray();
      fs.writeFileSync(
        path.join(sessionBackupDir, `target_${col.name}.json`),
        JSON.stringify(data, null, 2)
      );
    }
    console.log(`✅ Backed up ${targetCols.length} target collections to ${sessionBackupDir}`);

    // 2. BACKUP & MIGRATE SOURCE DB (curemaso) IF AVAILABLE
    if (sourceConn) {
      console.log('💾 Creating safety backup of source collections...');
      const sourceCols = await sourceConn.db.listCollections().toArray();
      for (const col of sourceCols) {
        const data = await sourceConn.db.collection(col.name).find({}).toArray();
        fs.writeFileSync(
          path.join(sessionBackupDir, `source_${col.name}.json`),
          JSON.stringify(data, null, 2)
        );
      }
      console.log(`✅ Backed up ${sourceCols.length} source collections.`);

      // 2a. Migrate landingpagecontents
      const sourceCms = await sourceConn.db.collection('landingpagecontents').find({}).toArray();
      if (sourceCms.length > 0) {
        console.log(`📦 Migrating ${sourceCms.length} CMS documents to shared database...`);
        for (const doc of sourceCms) {
          const { _id, ...rest } = doc;
          await targetConn.db.collection('landingpagecontents').updateOne(
            { key: doc.key || 'main_cms_content' },
            { $set: rest },
            { upsert: true }
          );
        }
        console.log('✅ CMS documents migrated to shared database.');
      }

      // 2b. Migrate Admin Users
      const sourceUsers = await sourceConn.db.collection('users').find({}).toArray();
      if (sourceUsers.length > 0) {
        console.log(`📦 Verifying and migrating Admin users to shared database...`);
        for (const user of sourceUsers) {
          const exists = await targetConn.db.collection('users').findOne({
            $or: [
              { username: user.username },
              { email: user.email },
              { userId: user.userId },
            ]
          });

          if (!exists) {
            await targetConn.db.collection('users').insertOne(user);
            console.log(`  ➕ Added Admin user: ${user.username} (${user.role})`);
          } else {
            // Update admin roles / status if needed without overwriting existing candidate fields
            await targetConn.db.collection('users').updateOne(
              { _id: exists._id },
              {
                $set: {
                  displayName: user.displayName || exists.displayName || exists.fullName,
                  role: user.role || exists.role,
                  status: user.status || 'Active',
                  department: user.department || 'General',
                  id: user.id || exists.id,
                  userId: user.userId || exists.userId,
                  passwordHash: user.passwordHash || exists.passwordHash,
                }
              }
            );
            console.log(`  ℹ️ Updated existing admin user: ${user.username}`);
          }
        }
        console.log('✅ Admin users migrated.');
      }

      // 2c. Migrate Accounting collections
      const acctCols = [
        'accounts', 'parties', 'items', 'salesquotes', 'salesinvoices', 'salespayments',
        'purchaseinvoices', 'purchasepayments', 'journalentries', 'ledgerentries',
        'taxtemplates', 'paymentmethods', 'printtemplates', 'accountingsettings'
      ];
      for (const colName of acctCols) {
        const countInTarget = await targetConn.db.collection(colName).countDocuments();
        if (countInTarget === 0) {
          const docs = await sourceConn.db.collection(colName).find({}).toArray();
          if (docs.length > 0) {
            await targetConn.db.collection(colName).insertMany(docs);
            console.log(`  📦 Migrated ${docs.length} records into ${colName}`);
          }
        }
      }

      // 2d. Migrate Gitmite and Taskmite (using taskmite_tasks to avoid collision)
      const gitCols = ['repositories', 'gitaccesstokens', 'repositorymembers'];
      for (const colName of gitCols) {
        const countInTarget = await targetConn.db.collection(colName).countDocuments();
        if (countInTarget === 0) {
          const docs = await sourceConn.db.collection(colName).find({}).toArray();
          if (docs.length > 0) {
            await targetConn.db.collection(colName).insertMany(docs);
            console.log(`  📦 Migrated ${docs.length} records into ${colName}`);
          }
        }
      }

      const taskmiteTasks = await sourceConn.db.collection('tasks').find({}).toArray();
      const targetTaskmiteCount = await targetConn.db.collection('taskmite_tasks').countDocuments();
      if (targetTaskmiteCount === 0 && taskmiteTasks.length > 0) {
        await targetConn.db.collection('taskmite_tasks').insertMany(taskmiteTasks);
        console.log(`  📦 Migrated ${taskmiteTasks.length} Taskmite tasks to taskmite_tasks.`);
      }

      const taskMetaCols = ['taskactivities', 'taskcomments', 'tasktags', 'tasksubscribers', 'tags'];
      for (const colName of taskMetaCols) {
        const countInTarget = await targetConn.db.collection(colName).countDocuments();
        if (countInTarget === 0) {
          const docs = await sourceConn.db.collection(colName).find({}).toArray();
          if (docs.length > 0) {
            await targetConn.db.collection(colName).insertMany(docs);
            console.log(`  📦 Migrated ${docs.length} records into ${colName}`);
          }
        }
      }
    }

    console.log('=================================================');
    console.log('🎉 Database Unification Completed Successfully!');
    console.log('=================================================');
  } finally {
    await targetConn.close();
    if (sourceConn) await sourceConn.close();
  }
}

// Allow CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDatabaseUnification().catch((err) => {
    console.error('Fatal unification error:', err);
    process.exit(1);
  });
}
