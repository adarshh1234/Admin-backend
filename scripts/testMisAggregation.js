import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { SalesQuote } from '../models/SalesQuote.js';
import { SalesInvoice } from '../models/SalesInvoice.js';
import { SalesPayment } from '../models/SalesPayment.js';
import { PurchaseInvoice } from '../models/PurchaseInvoice.js';
import { PurchasePayment } from '../models/PurchasePayment.js';
import { Account } from '../models/Account.js';
import { financialReports } from '../services/financialReports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/letgetin';

async function test() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);
  const db = mongoose.connection.db;

  // 1. Staff count & list
  const staffUsers = await User.find({
    role: { $in: ['Staff', 'STAFF', 'Manager', 'HR', 'Finance', 'Marketing', 'Support', 'Admin', 'ADMIN', 'Super Admin', 'SUPER_ADMIN'] },
    status: { $regex: /^active$/i }
  }).lean();
  console.log('Staff count:', staffUsers.length);
  console.log('Staff samples:', staffUsers.map(u => ({
    id: u._id || u.id,
    name: u.displayName || u.fullName || u.username,
    email: u.email,
    role: u.role,
    dept: u.department || 'Operations',
    status: u.status,
    phone: u.phone,
    createdAt: u.createdAt
  })));

  // 2. Open positions in 'jobs'
  const jobsColl = db.collection('jobs');
  const openJobs = await jobsColl.find({ status: { $regex: /^active$/i } }).toArray();
  console.log('Open jobs count:', openJobs.length);
  console.log('Open jobs sample:', openJobs.map(j => ({ title: j.title || j.jobTitle, company: j.companyName || j.company, vacancies: j.openings || j.vacancies || 1 })));

  // 3. User activity DAU & MAU
  const activitiesColl = db.collection('networkactivities');
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Distinct users today
  const dauUsers = await activitiesColl.distinct('userId', {
    createdAt: { $gte: startOfDay }
  });
  // If today has no activities yet (e.g., test environment), check latest activity date
  const latestActivity = await activitiesColl.find().sort({ createdAt: -1 }).limit(1).toArray();
  console.log('Latest activity timestamp:', latestActivity[0]?.createdAt);

  // Total distinct active users in activities
  const allActiveUsers = await activitiesColl.distinct('userId');
  console.log('Total distinct active users in activities:', allActiveUsers.length);

  // 4. Pipeline Value (from SalesQuote & recruiterorganizations)
  const openQuotes = await SalesQuote.find({ status: { $nin: ['Declined', 'Lost'] } }).lean();
  const quotePipeline = openQuotes.reduce((acc, q) => acc + (Number(q.grandTotal) || 0), 0);
  console.log('Sales Quotes Pipeline:', quotePipeline);

  // 5. Overdue dues from PurchaseInvoice
  const overdueInvoices = await PurchaseInvoice.find({
    outstandingAmount: { $gt: 0 },
    dueDate: { $lt: now.toISOString() }
  }).lean();
  const overdueTotal = overdueInvoices.reduce((acc, i) => acc + (Number(i.outstandingAmount) || 0), 0);
  console.log('Overdue Invoices Count:', overdueInvoices.length, 'Total:', overdueTotal);

  // 6. Cash flow from SalesPayment and PurchasePayment
  const salesPayments = await SalesPayment.find().lean();
  const purchasePayments = await PurchasePayment.find().lean();
  const totalInflow = salesPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalOutflow = purchasePayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  console.log('Cash Inflow:', totalInflow, 'Outflow:', totalOutflow, 'Net Cash Flow:', totalInflow - totalOutflow);

  // 7. P&L and Balance Sheet
  const pnl = await financialReports.getProfitAndLoss();
  const bs = await financialReports.getBalanceSheet();
  console.log('P&L Net Profit:', pnl.summary.netProfit, 'Total Income:', pnl.summary.totalIncome);
  console.log('Balance Sheet Assets:', bs.summary.totalAssets, 'Liabilities:', bs.summary.totalLiabilities);

  // 8. Liquidity
  const accounts = await Account.find().lean();
  const liquidity = accounts
    .filter(a => a.name === 'HDFC Bank Operating A/c' || a.name === 'Cash' || a.rootType === 'Bank' || a.accountType === 'Bank' || a.accountType === 'Cash')
    .reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  console.log('Liquidity Total:', liquidity);

  // 9. Expansion markets from recruiterorganizations
  const recruiterOrgColl = db.collection('recruiterorganizations');
  const orgs = await recruiterOrgColl.find().toArray();
  const locationCounts = {};
  orgs.forEach(o => {
    const loc = o.headquarters || o.location || o.city || 'India';
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });
  console.log('Recruiter Org Locations:', locationCounts);

  // 10. Candidates count & samples
  const candidatesColl = db.collection('candidates');
  const candidateCount = await candidatesColl.countDocuments();
  console.log('Candidates count in candidates collection:', candidateCount);
  const usersCandidateCount = await User.countDocuments({ role: { $in: ['user', 'USER', 'Candidate', 'candidate', null] } });
  console.log('Platform users/candidates count in users:', usersCandidateCount);

  // 11. Activity by date
  const actByDate = await activitiesColl.aggregate([
    { $group: { _id: { $substr: ['$createdAt', 0, 10] }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
    { $sort: { _id: -1 } },
    { $limit: 15 }
  ]).toArray();
  console.log('Activity by date:', actByDate.map(a => ({ date: a._id, totalEvents: a.count, uniqueUsers: a.uniqueUsers.length })));

  // 12. Check other session and stage history collections
  const mockupUsers = await db.collection('mockuptestsessions').distinct('userId');
  const stageHistUsers = await db.collection('candidatestagehistories').distinct('candidateId');
  const lastLoginUsers = await db.collection('users').distinct('_id', { lastLogin: { $ne: null } });
  console.log('Other activity sources:', { mockupUsers: mockupUsers.length, stageHistUsers: stageHistUsers.length, lastLoginUsers: lastLoginUsers.length });

  await mongoose.disconnect();
}

test().catch(console.error);
