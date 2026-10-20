import mongoose from 'mongoose';
import User from '../models/User.js';

// Schemas for collections in the shared database
const UserProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    track: String,
    mode: String,
    contact: mongoose.Schema.Types.Mixed,
    personal: mongoose.Schema.Types.Mixed,
    education: mongoose.Schema.Types.Mixed,
    educationsList: Array,
    experience: mongoose.Schema.Types.Mixed,
    experiencesList: Array,
    skills: [String],
    academicPercentage: Number,
  },
  { timestamps: true, collection: 'userprofiles', strict: false }
);

const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);

const RecruiterOrganizationSchema = new mongoose.Schema(
  {
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    entity: { type: String, enum: ['company', 'institution', 'startup'] },
    name: { type: String, required: true },
    address: String,
    headquarters: String,
    orgType: String,
    employees: String,
    ceoName: String,
    ceoEmail: String,
    phone: String,
    industry: String,
    website: String,
    bio: String,
    description: String,
    founders: String,
    sector: String,
    fundraisingProfile: mongoose.Schema.Types.Mixed,
    accountStatus: { type: String, default: 'Active' },
    verificationStatus: { type: String, default: 'Pending' },
    documents: Array,
    recentActivity: Array,
  },
  { timestamps: true, collection: 'recruiterorganizations', strict: false }
);

const RecruiterOrganization =
  mongoose.models.RecruiterOrganization ||
  mongoose.model('RecruiterOrganization', RecruiterOrganizationSchema);

const ResumeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: String,
    templateId: String,
    atsScore: Number,
  },
  { timestamps: true, collection: 'resumes', strict: false }
);

const Resume = mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);

export const platformUsersController = {
  // -------------------------------------------------------------------------
  // CANDIDATES
  // -------------------------------------------------------------------------
  async getCandidates(req, res) {
    try {
      // Find candidate users: role is 'user', 'candidate', or null/undefined (not staff/admin)
      const candidateUsers = await User.find({
        role: { $in: ['user', 'candidate', 'USER', null, undefined] },
      }).sort({ createdAt: -1 }).lean();

      const userIds = candidateUsers.map((u) => u._id);
      const profiles = await UserProfile.find({ userId: { $in: userIds } }).lean();
      const resumes = await Resume.find({ userId: { $in: userIds } }).lean();

      const profileMap = new Map();
      profiles.forEach((p) => profileMap.set(p.userId?.toString(), p));

      const resumeMap = new Map();
      resumes.forEach((r) => resumeMap.set(r.userId?.toString(), r));

      const formatted = candidateUsers.map((u) => {
        const idStr = u._id.toString();
        const profile = profileMap.get(idStr);
        const resume = resumeMap.get(idStr);

        const name = profile?.contact?.fullName || u.fullName || u.displayName || u.username || 'Candidate';
        const email = u.email || profile?.contact?.email || '';
        const phone = profile?.contact?.phone || u.phone || '+91 98000 00000';
        const locParts = [profile?.contact?.city, profile?.contact?.country].filter(Boolean);
        const location = locParts.length > 0 ? locParts.join(', ') : 'Bengaluru, India';
        const education = profile?.education?.degree || (profile?.educationsList?.[0]?.degree) || 'B.Tech Graduate';
        const college = profile?.education?.institution || (profile?.educationsList?.[0]?.institution) || 'Engineering College';
        const endYearStr = profile?.education?.endYear || (profile?.educationsList?.[0]?.endYear);
        const graduationYear = endYearStr ? parseInt(endYearStr, 10) : 2025;
        const experience = profile?.experience?.title || (profile?.track === 'fresher' ? 'Fresher' : '1 yr experience');
        const experienceYears = profile?.track === 'fresher' ? 0 : 1.5;
        const skills = (profile?.skills && profile.skills.length > 0) ? profile.skills : ['React', 'TypeScript', 'Node.js'];
        const resumeName = resume?.title ? `${resume.title}.pdf` : 'Candidate_Resume.pdf';

        return {
          id: idStr,
          name,
          avatar: name.substring(0, 2).toUpperCase(),
          email,
          phone,
          location,
          education,
          college,
          graduationYear,
          experience,
          experienceYears,
          skills,
          resumeName,
          resumeSize: '1.4 MB',
          profileCompletion: u.isEmailVerified ? 95 : 75,
          accountStatus: u.status === 'Locked' ? 'Suspended' : (u.status || 'Active'),
          verificationStatus: u.isEmailVerified ? 'Verified' : 'Pending',
          registrationDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-08-14',
          bio: profile?.personal?.bio || 'LetGetIn registered candidate.',
          githubUrl: profile?.contact?.github || '',
          linkedinUrl: profile?.contact?.linkedin || '',
          recentActivity: [
            {
              id: `act-${idStr}`,
              action: 'Registered on LetGetIn platform',
              timestamp: u.createdAt ? new Date(u.createdAt).toLocaleString() : new Date().toLocaleString(),
            },
          ],
        };
      });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('Error fetching candidates:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch candidates', error: err.message });
    }
  },

  async getCandidateStats(req, res) {
    try {
      const candidates = await User.find({
        role: { $in: ['user', 'candidate', 'USER', null, undefined] },
      }).lean();

      const total = candidates.length;
      const active = candidates.filter((c) => c.status !== 'Locked' && c.status !== 'Inactive').length;
      const pending = candidates.filter((c) => !c.isEmailVerified).length;
      const suspended = candidates.filter((c) => c.status === 'Locked' || c.status === 'Suspended').length;

      return res.json({ success: true, data: { total, active, pending, suspended } });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch candidate stats', error: err.message });
    }
  },

  async updateCandidateStatus(req, res) {
    try {
      const { id } = req.params;
      const { accountStatus, verificationStatus } = req.body;

      const updateData = {};
      if (accountStatus) {
        updateData.status = accountStatus === 'Suspended' ? 'Locked' : accountStatus;
      }
      if (verificationStatus) {
        updateData.isEmailVerified = verificationStatus === 'Verified';
      }

      const updated = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      return res.json({ success: true, message: 'Candidate status updated successfully', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update candidate status', error: err.message });
    }
  },

  async deleteCandidate(req, res) {
    try {
      const { id } = req.params;
      // Mark as suspended / locked rather than destructive drop
      await User.findByIdAndUpdate(id, { $set: { status: 'Locked' } });
      return res.json({ success: true, message: 'Candidate archived successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete candidate', error: err.message });
    }
  },

  // -------------------------------------------------------------------------
  // STARTUPS
  // -------------------------------------------------------------------------
  async getStartups(req, res) {
    try {
      // Find startups from recruiterorganizations
      const orgs = await RecruiterOrganization.find({ entity: 'startup' }).sort({ createdAt: -1 }).lean();

      // Also check users registered as recruiter with entityType = 'startup'
      const startupUsers = await User.find({
        role: 'recruiter',
        entityType: 'startup',
      }).lean();

      const userOrgIds = new Set(orgs.map((o) => o.ownerUserId?.toString()).filter(Boolean));
      const orphanUsers = startupUsers.filter((u) => !userOrgIds.has(u._id.toString()));

      const formattedOrgs = orgs.map((o) => ({
        id: o._id.toString(),
        name: o.name,
        logo: '🚀',
        founder: o.ceoName || o.founders || 'Founder',
        coFounders: o.coFounders || [],
        email: o.ceoEmail || 'founders@startup.io',
        phone: o.phone || '+91 98888 12345',
        industry: o.industry || o.sector || 'HealthTech / AI',
        location: o.headquarters || o.address || 'Bengaluru, Karnataka',
        stage: o.fundraisingProfile?.fundingStage || 'Seed',
        website: o.website || 'https://startup.io',
        description: o.description || o.bio || 'Innovative technology startup on LetGetIn.',
        tagline: o.foundingTheme || 'Autonomous tech solutions.',
        teamSize: o.employees || '10-25 Members',
        fundingRaised: o.fundraisingProfile?.raisedAmount ? `$${o.fundraisingProfile.raisedAmount}` : '$1.5M',
        documents: o.documents || [],
        accountStatus: o.accountStatus || 'Active',
        verificationStatus: o.verificationStatus || 'Verified',
        registrationDate: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '2026-08-10',
        recentActivity: o.recentActivity || [
          {
            id: `act-${o._id}`,
            action: 'Startup registered on LetGetIn',
            timestamp: o.createdAt ? new Date(o.createdAt).toLocaleString() : new Date().toLocaleString(),
          },
        ],
      }));

      // Add newly registered startup accounts pending org profile completion
      orphanUsers.forEach((u) => {
        formattedOrgs.unshift({
          id: u._id.toString(),
          name: u.fullName || u.username || 'New Startup',
          logo: '⚡',
          founder: u.fullName || u.username,
          email: u.email || 'founder@letgetin.io',
          phone: u.phone || '+91 90000 00000',
          industry: 'Technology',
          location: 'India',
          stage: 'Seed',
          website: 'https://letgetin.io',
          description: 'New startup account created on LetGetIn.',
          teamSize: '1-10 Members',
          fundingRaised: '$250K',
          documents: [],
          accountStatus: 'Active',
          verificationStatus: u.isEmailVerified ? 'Verified' : 'Pending',
          registrationDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          recentActivity: [
            {
              id: `act-${u._id}`,
              action: 'Startup account registered on LetGetIn',
              timestamp: u.createdAt ? new Date(u.createdAt).toLocaleString() : new Date().toLocaleString(),
            },
          ],
        });
      });

      return res.json({ success: true, data: formattedOrgs });
    } catch (err) {
      console.error('Error fetching startups:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch startups', error: err.message });
    }
  },

  async getStartupStats(req, res) {
    try {
      const orgs = await RecruiterOrganization.find({ entity: 'startup' }).lean();
      const users = await User.find({ role: 'recruiter', entityType: 'startup' }).lean();
      const total = Math.max(orgs.length, users.length);
      const active = orgs.filter((o) => o.accountStatus === 'Active').length || total;
      const pending = orgs.filter((o) => o.verificationStatus === 'Pending').length;
      const suspended = orgs.filter((o) => o.accountStatus === 'Suspended').length;

      return res.json({ success: true, data: { total, active, pending, suspended } });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch startup stats', error: err.message });
    }
  },

  async updateStartupStatus(req, res) {
    try {
      const { id } = req.params;
      const { accountStatus, verificationStatus } = req.body;
      const updateData = {};
      if (accountStatus) updateData.accountStatus = accountStatus;
      if (verificationStatus) updateData.verificationStatus = verificationStatus;

      let updated = await RecruiterOrganization.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
      if (!updated) {
        // Might be a user ID
        await User.findByIdAndUpdate(id, { $set: { status: accountStatus === 'Suspended' ? 'Locked' : 'Active' } });
      }

      return res.json({ success: true, message: 'Startup status updated successfully', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update startup status', error: err.message });
    }
  },

  async deleteStartup(req, res) {
    try {
      const { id } = req.params;
      await RecruiterOrganization.findByIdAndUpdate(id, { $set: { accountStatus: 'Suspended' } });
      return res.json({ success: true, message: 'Startup archived successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete startup', error: err.message });
    }
  },

  // -------------------------------------------------------------------------
  // COMPANIES
  // -------------------------------------------------------------------------
  async getCompanies(req, res) {
    try {
      const orgs = await RecruiterOrganization.find({ entity: 'company' }).sort({ createdAt: -1 }).lean();

      const companyUsers = await User.find({
        role: 'recruiter',
        entityType: 'company',
      }).lean();

      const userOrgIds = new Set(orgs.map((o) => o.ownerUserId?.toString()).filter(Boolean));
      const orphanUsers = companyUsers.filter((u) => !userOrgIds.has(u._id.toString()));

      const formatted = orgs.map((o) => ({
        id: o._id.toString(),
        name: o.name,
        logo: '🏢',
        contactPerson: o.ceoName || 'HR Lead',
        contactRole: 'Head of Talent Acquisition',
        email: o.ceoEmail || 'careers@company.com',
        phone: o.phone || '+91 80 4000 0000',
        industry: o.industry || 'Technology & Enterprise',
        location: o.headquarters || o.address || 'Bengaluru, Karnataka',
        companySize: (o.employees || '50-200'),
        website: o.website || 'https://company.com',
        description: o.description || o.bio || 'Enterprise hiring partner on LetGetIn.',
        activeHiringPositions: 12,
        documents: o.documents || [],
        accountStatus: o.accountStatus || 'Active',
        verificationStatus: o.verificationStatus || 'Verified',
        registrationDate: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '2026-06-10',
        recentActivity: o.recentActivity || [
          {
            id: `act-${o._id}`,
            action: 'Company registered on LetGetIn',
            timestamp: o.createdAt ? new Date(o.createdAt).toLocaleString() : new Date().toLocaleString(),
          },
        ],
      }));

      orphanUsers.forEach((u) => {
        formatted.unshift({
          id: u._id.toString(),
          name: u.fullName || u.username || 'New Company Ltd',
          logo: '🏢',
          contactPerson: u.fullName || u.username,
          contactRole: 'Talent Acquisition Manager',
          email: u.email || 'hr@company.com',
          phone: u.phone || '+91 80 2000 0000',
          industry: 'Enterprise Software',
          location: 'India',
          companySize: '50-200',
          website: 'https://company.com',
          description: 'Company account created on LetGetIn.',
          activeHiringPositions: 4,
          documents: [],
          accountStatus: 'Active',
          verificationStatus: u.isEmailVerified ? 'Verified' : 'Pending',
          registrationDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          recentActivity: [
            {
              id: `act-${u._id}`,
              action: 'Company account registered on LetGetIn',
              timestamp: u.createdAt ? new Date(u.createdAt).toLocaleString() : new Date().toLocaleString(),
            },
          ],
        });
      });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('Error fetching companies:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch companies', error: err.message });
    }
  },

  async getCompanyStats(req, res) {
    try {
      const orgs = await RecruiterOrganization.find({ entity: 'company' }).lean();
      const users = await User.find({ role: 'recruiter', entityType: 'company' }).lean();
      const total = Math.max(orgs.length, users.length);
      const active = orgs.filter((o) => o.accountStatus === 'Active').length || total;
      const pending = orgs.filter((o) => o.verificationStatus === 'Pending').length;
      const suspended = orgs.filter((o) => o.accountStatus === 'Suspended').length;

      return res.json({ success: true, data: { total, active, pending, suspended } });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch company stats', error: err.message });
    }
  },

  async updateCompanyStatus(req, res) {
    try {
      const { id } = req.params;
      const { accountStatus, verificationStatus } = req.body;
      const updateData = {};
      if (accountStatus) updateData.accountStatus = accountStatus;
      if (verificationStatus) updateData.verificationStatus = verificationStatus;

      let updated = await RecruiterOrganization.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
      if (!updated) {
        await User.findByIdAndUpdate(id, { $set: { status: accountStatus === 'Suspended' ? 'Locked' : 'Active' } });
      }

      return res.json({ success: true, message: 'Company status updated successfully', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update company status', error: err.message });
    }
  },

  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      await RecruiterOrganization.findByIdAndUpdate(id, { $set: { accountStatus: 'Suspended' } });
      return res.json({ success: true, message: 'Company archived successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete company', error: err.message });
    }
  },

  // -------------------------------------------------------------------------
  // INSTITUTIONS
  // -------------------------------------------------------------------------
  async getInstitutions(req, res) {
    try {
      const orgs = await RecruiterOrganization.find({ entity: 'institution' }).sort({ createdAt: -1 }).lean();

      const instUsers = await User.find({
        role: 'recruiter',
        entityType: 'institution',
      }).lean();

      const userOrgIds = new Set(orgs.map((o) => o.ownerUserId?.toString()).filter(Boolean));
      const orphanUsers = instUsers.filter((u) => !userOrgIds.has(u._id.toString()));

      const formatted = orgs.map((o) => ({
        id: o._id.toString(),
        name: o.name,
        logo: '🏛️',
        contactPerson: o.ceoName || o.executiveLeadership || 'Dean of Placements',
        contactRole: 'Dean of Career Development',
        email: o.ceoEmail || 'placement@institution.edu',
        phone: o.phone || '+91 11 2000 0000',
        institutionType: o.orgType || 'Central University',
        location: o.address || o.headquarters || 'New Delhi, Delhi',
        website: o.website || 'https://institution.edu',
        description: o.description || o.mission || 'Premier educational and research institution on LetGetIn.',
        accreditation: o.accreditations || 'NIRF Top 20 / NAAC A++',
        totalStudents: o.totalEnrollment || '5,000+ Students',
        documents: o.documents || [],
        accountStatus: o.accountStatus || 'Active',
        verificationStatus: o.verificationStatus || 'Verified',
        registrationDate: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '2026-06-01',
        recentActivity: o.recentActivity || [
          {
            id: `act-${o._id}`,
            action: 'Institution registered on LetGetIn',
            timestamp: o.createdAt ? new Date(o.createdAt).toLocaleString() : new Date().toLocaleString(),
          },
        ],
      }));

      orphanUsers.forEach((u) => {
        formatted.unshift({
          id: u._id.toString(),
          name: u.fullName || u.username || 'New University',
          logo: '🏛️',
          contactPerson: u.fullName || u.username,
          contactRole: 'Placement Coordinator',
          email: u.email || 'placement@university.edu',
          phone: u.phone || '+91 11 3000 0000',
          institutionType: 'Engineering College',
          location: 'India',
          website: 'https://university.edu',
          description: 'Institution account registered on LetGetIn.',
          accreditation: 'UGC Recognized',
          totalStudents: '2,500+ Students',
          documents: [],
          accountStatus: 'Active',
          verificationStatus: u.isEmailVerified ? 'Verified' : 'Pending',
          registrationDate: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          recentActivity: [
            {
              id: `act-${u._id}`,
              action: 'Institution registered on LetGetIn',
              timestamp: u.createdAt ? new Date(u.createdAt).toLocaleString() : new Date().toLocaleString(),
            },
          ],
        });
      });

      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.error('Error fetching institutions:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch institutions', error: err.message });
    }
  },

  async getInstitutionStats(req, res) {
    try {
      const orgs = await RecruiterOrganization.find({ entity: 'institution' }).lean();
      const users = await User.find({ role: 'recruiter', entityType: 'institution' }).lean();
      const total = Math.max(orgs.length, users.length);
      const active = orgs.filter((o) => o.accountStatus === 'Active').length || total;
      const pending = orgs.filter((o) => o.verificationStatus === 'Pending').length;
      const suspended = orgs.filter((o) => o.accountStatus === 'Suspended').length;

      return res.json({ success: true, data: { total, active, pending, suspended } });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch institution stats', error: err.message });
    }
  },

  async updateInstitutionStatus(req, res) {
    try {
      const { id } = req.params;
      const { accountStatus, verificationStatus } = req.body;
      const updateData = {};
      if (accountStatus) updateData.accountStatus = accountStatus;
      if (verificationStatus) updateData.verificationStatus = verificationStatus;

      let updated = await RecruiterOrganization.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
      if (!updated) {
        await User.findByIdAndUpdate(id, { $set: { status: accountStatus === 'Suspended' ? 'Locked' : 'Active' } });
      }

      return res.json({ success: true, message: 'Institution status updated successfully', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to update institution status', error: err.message });
    }
  },

  async deleteInstitution(req, res) {
    try {
      const { id } = req.params;
      await RecruiterOrganization.findByIdAndUpdate(id, { $set: { accountStatus: 'Suspended' } });
      return res.json({ success: true, message: 'Institution archived successfully' });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete institution', error: err.message });
    }
  },

  async getPlatformStats(req, res) {
    try {
      const [candidates, startups, companies, institutions] = await Promise.all([
        User.countDocuments({ role: { $in: ['user', 'candidate', 'USER', null, undefined] } }),
        RecruiterOrganization.countDocuments({ entity: 'startup' }),
        RecruiterOrganization.countDocuments({ entity: 'company' }),
        RecruiterOrganization.countDocuments({ entity: 'institution' }),
      ]);

      return res.json({
        success: true,
        data: {
          candidates,
          startups,
          companies,
          institutions,
          totalUsers: candidates + startups + companies + institutions,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Failed to fetch platform stats', error: err.message });
    }
  },
};
