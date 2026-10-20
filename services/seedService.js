import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Tag from '../models/Tag.js';
import Task from '../models/Task.js';
import TaskActivity from '../models/TaskActivity.js';
import Repository from '../models/Repository.js';
import gitService from './gitService.js';

export async function runTaskmiteGitmiteSeed() {
  try {
    // 1. Seed & initialize default Super Admin, Admin, and Staff users with secure bcrypt hashes
    const superAdminPasswordHash = await bcrypt.hash('SuperAdmin@123', 10);
    const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
    const staffPasswordHash = await bcrypt.hash('Staff@123', 10);

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Seeding default Admin and Staff users...');
      await User.create([
        {
          id: 1,
          userId: 'SA-001',
          username: 'labeeb.eee',
          email: 'labeeb@curemaso.com',
          displayName: 'Labeeb EEE',
          role: 'Super Admin',
          department: 'Executive Leadership',
          passwordHash: superAdminPasswordHash,
          status: 'Active',
          tokenVersion: 0,
        },
        {
          id: 2,
          userId: 'ADM-101',
          username: 'sarah.mitchell',
          email: 'sarah.m@curemaso.com',
          displayName: 'Dr. Sarah Mitchell',
          role: 'Admin',
          department: 'Healthcare Administration',
          passwordHash: adminPasswordHash,
          status: 'Active',
          tokenVersion: 0,
        },
        {
          id: 3,
          userId: 'STF-101',
          username: 'john.manager',
          email: 'john.miller@curemaso.com',
          displayName: 'John Miller',
          role: 'Staff',
          department: 'Operations',
          passwordHash: staffPasswordHash,
          status: 'Active',
          assignedAdminId: 'ADM-101',
          createdByName: 'Dr. Sarah Mitchell',
          createdByRole: 'Admin',
          tokenVersion: 0,
        },
        {
          id: 4,
          userId: 'STF-102',
          username: 'priya.hr',
          email: 'priya.s@curemaso.com',
          displayName: 'Priya Sharma',
          role: 'Staff',
          department: 'Human Resources',
          passwordHash: staffPasswordHash,
          status: 'Active',
          assignedAdminId: 'ADM-101',
          createdByName: 'Dr. Sarah Mitchell',
          createdByRole: 'Admin',
          tokenVersion: 0,
        },
      ]);
      console.log('✅ Users seeded successfully.');
    } else {
      // Update existing users if passwordHash is missing or needs migration
      await User.updateOne(
        { username: 'labeeb.eee' },
        {
          $set: {
            userId: 'SA-001',
            role: 'Super Admin',
            department: 'Executive Leadership',
            passwordHash: superAdminPasswordHash,
            status: 'Active',
          },
        },
      );

      await User.updateOne(
        { username: 'sarah.mitchell' },
        {
          $set: {
            userId: 'ADM-101',
            role: 'Admin',
            department: 'Healthcare Administration',
            passwordHash: adminPasswordHash,
            status: 'Active',
          },
        },
      );

      await User.updateOne(
        { username: 'john.manager' },
        {
          $set: {
            userId: 'STF-101',
            role: 'Staff',
            department: 'Operations',
            passwordHash: staffPasswordHash,
            status: 'Active',
            assignedAdminId: 'ADM-101',
            createdByName: 'Dr. Sarah Mitchell',
            createdByRole: 'Admin',
          },
        },
      );

      await User.updateOne(
        { username: 'priya.hr' },
        {
          $set: {
            userId: 'STF-102',
            role: 'Staff',
            department: 'Human Resources',
            passwordHash: staffPasswordHash,
            status: 'Active',
            assignedAdminId: 'ADM-101',
            createdByName: 'Dr. Sarah Mitchell',
            createdByRole: 'Admin',
          },
        },
      );
      console.log('✅ Default users verified and credentials synchronized.');
    }


    // 2. Seed default Tags
    const tagCount = await Tag.countDocuments();
    if (tagCount === 0) {
      console.log('🌱 Seeding initial Taskmite tags...');
      await Tag.create([
        { id: 1, name: 'Frontend', description: 'React and client-side UI components' },
        { id: 2, name: 'Backend', description: 'Node.js, Express, and database layer' },
        { id: 3, name: 'Bug', description: 'Defects requiring fixes' },
        { id: 4, name: 'Enhancement', description: 'New features and improvements' },
        { id: 5, name: 'Security', description: 'Security compliance and audit items' },
      ]);
      console.log('✅ Tags seeded successfully.');
    }

    // 3. Seed initial Demo Task
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      console.log('🌱 Seeding demo Taskmite tasks...');
      const demoTask = await Task.create({
        id: 1,
        taskNumber: 1,
        title: 'Complete Admin Backend & Database Consolidation',
        description: 'Migrate Taskmite and Gitmite into the unified Admin Express + MongoDB backend.',
        status: 'RESOLVED',
        priority: 'UNBREAK_NOW',
        visibility: 'ALL_USERS',
        createdById: 1,
        assignedToId: 1,
      });

      await TaskActivity.create({
        taskId: 1,
        userId: 1,
        type: 'CREATED',
        createdAt: new Date(Date.now() - 3600000),
      });

      await TaskActivity.create({
        taskId: 1,
        userId: 1,
        type: 'STATUS_CHANGED',
        oldValue: 'OPEN',
        newValue: 'RESOLVED',
        comment: 'Migration completed successfully.',
        createdAt: new Date(),
      });
      console.log('✅ Demo task seeded.');
    }

    // 4. Seed initial Demo Git Repository
    const repoCount = await Repository.countDocuments();
    if (repoCount === 0) {
      console.log('🌱 Seeding demo Gitmite repository...');
      const slug = 'admin-core';
      const localPath = gitService.getRepositoryPath(slug);

      if (!(await gitService.pathExists(localPath))) {
        await gitService.initBareRepository(localPath);
      }

      await Repository.create({
        id: 1,
        name: 'Admin Core Engine',
        slug,
        description: 'Core repository containing Admin ERP, Taskmite, and Gitmite engines.',
        localPath,
        visibility: 'PUBLIC',
        createdById: 1,
      });
      console.log('✅ Demo repository seeded.');
    }
  } catch (err) {
    console.warn(`⚠️ Warning during seed execution: ${err.message}`);
  }
}

export default runTaskmiteGitmiteSeed;
