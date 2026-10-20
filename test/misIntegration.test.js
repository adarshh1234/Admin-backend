import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { misService } from '../services/misService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/letgetin';

test('MIS Dashboard Backend Integration Tests', async (t) => {
  let connectedHere = false;
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    connectedHere = true;
  }

  await t.test('1. getMISDashboardData returns all 15 required KPI metrics', async () => {
    const data = await misService.getMISDashboardData('monthly');
    assert.ok(data, 'Dashboard data should exist');
    assert.ok(data.kpis, 'KPIs object should exist');

    const { kpis } = data;
    // Check all 15 KPIs
    assert.equal(typeof kpis.dau, 'number', 'DAU must be number');
    assert.equal(typeof kpis.mau, 'number', 'MAU must be number');
    assert.equal(typeof kpis.totalStaff, 'number', 'Total Staff must be number');
    assert.equal(typeof kpis.openPositions, 'number', 'Open Positions must be number');
    assert.equal(typeof kpis.pipeline, 'number', 'Pipeline must be number');
    assert.equal(typeof kpis.overdue, 'number', 'Overdue must be number');
    assert.equal(typeof kpis.margin, 'number', 'Net profit margin must be number');
    assert.equal(typeof kpis.recurringTotal, 'number', 'Recurring total must be number');
    assert.equal(typeof kpis.overallMktRoi, 'number', 'Marketing ROI must be number');
    assert.equal(typeof kpis.highPotential, 'number', 'High potential markets must be number');
    assert.equal(typeof kpis.cashFlow, 'number', 'Cash flow must be number');
    assert.equal(typeof kpis.rois, 'number', 'ROIs must be number');
    assert.equal(typeof kpis.assets, 'number', 'Assets must be number');
    assert.equal(typeof kpis.liquidity, 'number', 'Liquidity must be number');
    assert.equal(typeof kpis.revenue, 'number', 'Revenue must be number');

    // Validate authoritative database values
    assert.ok(kpis.totalStaff >= 4, 'Should count real internal active staff (at least 4)');
    assert.ok(kpis.openPositions >= 2, 'Should count real active job postings from jobs collection');
    assert.ok(kpis.pipeline >= 354000, 'Pipeline value should reflect active sales quotes');
    assert.ok(kpis.overdue >= 212400, 'Overdue dues should reflect overdue purchase invoice PINV-2026-001');
    assert.ok(kpis.cashFlow > 0, 'Net cash flow should be positive based on inflow - outflow');
    assert.ok(kpis.revenue >= 400000, 'Revenue should reflect P&L total sales');
  });

  await t.test('2. getMISDashboardData populates all tabs and detail arrays', async () => {
    const data = await misService.getMISDashboardData('monthly');

    // Daily Operations
    assert.ok(Array.isArray(data.dailyRows) && data.dailyRows.length > 0, 'dailyRows should be non-empty');
    assert.ok(data.dailyRows[0].date && typeof data.dailyRows[0].dau === 'number');

    // Weekly Summary
    assert.ok(Array.isArray(data.weeklyRows) && data.weeklyRows.length > 0, 'weeklyRows should be non-empty');
    assert.ok(data.weeklyRows[0].week && typeof data.weeklyRows[0].wau === 'number');

    // Monthly & Quarterly
    assert.ok(Array.isArray(data.monthlyRows) && data.monthlyRows.length > 0, 'monthlyRows should be non-empty');

    // Annual Overview
    assert.ok(Array.isArray(data.annualRows) && data.annualRows.length > 0, 'annualRows should be non-empty');

    // HR & Staff
    assert.ok(Array.isArray(data.staffData) && data.staffData.length > 0, 'staffData should be non-empty');
    assert.ok(Array.isArray(data.totalStaffDetails) && data.totalStaffDetails.length > 0, 'totalStaffDetails should be non-empty');
    assert.ok(data.totalStaffDetails.some((s) => s.employeeName.includes('Sarah') || s.employeeName.includes('Labeeb')));

    // Open positions
    assert.ok(Array.isArray(data.openPositionsData) && data.openPositionsData.length > 0, 'openPositionsData should be non-empty');
    assert.ok(data.openPositionsData.some((j) => j.jobTitle.includes('Starved Pipeline Test Role')));

    // CRM & Sales
    assert.ok(Array.isArray(data.crmDeals) && data.crmDeals.length > 0, 'crmDeals should be non-empty');
    assert.ok(data.crmDeals.some((d) => d.company.includes('Apollo')));

    // Accounts & Dues
    assert.ok(Array.isArray(data.duesData) && data.duesData.length > 0, 'duesData should be non-empty');
    assert.ok(data.duesData.some((d) => d.vendor.includes('Siemens') && d.status === 'Overdue'));

    // Market Expansion
    assert.ok(Array.isArray(data.expansionData) && data.expansionData.length > 0, 'expansionData should be non-empty');

    // AI Suggestions & Issues
    assert.ok(Array.isArray(data.aiSuggestions) && data.aiSuggestions.length > 0, 'aiSuggestions should be non-empty');
    assert.ok(Array.isArray(data.aiIssues) && data.aiIssues.length > 0, 'aiIssues should be non-empty');
  });

  await t.test('3. Live HTTP API responds successfully with JSON payload', async () => {
    const res = await fetch('http://localhost:5000/api/mis/public-summary');
    assert.equal(res.status, 200, 'HTTP status should be 200');
    const json = await res.json();
    assert.equal(json.success, true, 'JSON response should have success: true');
    assert.ok(json.data.kpis.revenue >= 400000, 'JSON response should contain revenue KPI');
  });

  if (connectedHere) {
    await mongoose.disconnect();
  }
});
