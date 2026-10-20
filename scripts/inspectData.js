import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/letgetin');
  const db = mongoose.connection.db;

  const totalUsers = await db.collection('users').countDocuments();
  const staff = await db.collection('users').find({
    role: { $in: ['Staff', 'STAFF', 'Manager', 'HR', 'Finance', 'Marketing', 'Support', 'Admin', 'ADMIN', 'Super Admin', 'SUPER_ADMIN'] }
  }).toArray();
  console.log('Total users:', totalUsers, 'Staff length:', staff.length);
  console.log('Staff list:', staff.map(s => ({ username: s.username, displayName: s.displayName, role: s.role, dept: s.department, status: s.status })));

  const activities = await db.collection('networkactivities').find().sort({ createdAt: -1 }).toArray();
  console.log('Network activities count:', activities.length);
  const actDates = activities.map(a => a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : 'none');
  const uniqueDates = [...new Set(actDates)];
  console.log('Activity dates:', uniqueDates.slice(0, 10));

  const jobs = await db.collection('jobs').find().toArray();
  console.log('Jobs count:', jobs.length, jobs.map(j => ({ title: j.title, status: j.status, publishedAt: j.publishedAt })));

  const orgs = await db.collection('recruiterorganizations').find().toArray();
  console.log('Orgs count:', orgs.length);

  const quotes = await db.collection('salesquotes').find().toArray();
  console.log('Quotes:', quotes);

  const sinv = await db.collection('salesinvoices').find().toArray();
  console.log('Sales invoices:', sinv.map(s => ({ invoiceNumber: s.invoiceNumber, grandTotal: s.grandTotal, outstandingAmount: s.outstandingAmount, paymentStatus: s.paymentStatus, dueDate: s.dueDate })));

  const pinv = await db.collection('purchaseinvoices').find().toArray();
  console.log('Purchase invoices:', pinv.map(p => ({ invoiceNumber: p.invoiceNumber, grandTotal: p.grandTotal, outstandingAmount: p.outstandingAmount, dueDate: p.dueDate })));

  const ledger = await db.collection('ledgerentries').find({ reverted: false }).toArray();
  console.log('Ledger count:', ledger.length);

  process.exit(0);
}

run().catch(console.error);
