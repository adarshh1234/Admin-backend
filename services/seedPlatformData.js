import User from '../models/User.js';
import mongoose from 'mongoose';

const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile', new mongoose.Schema({}, { strict: false }));
const RecruiterOrganization = mongoose.models.RecruiterOrganization || mongoose.model('RecruiterOrganization', new mongoose.Schema({}, { strict: false }));
const Resume = mongoose.models.Resume || mongoose.model('Resume', new mongoose.Schema({}, { strict: false }));

export async function seedPlatformDataIfEmpty() {
  try {
    // 1. Seed demo candidates if none exist with these emails
    const demoCandidates = [
      {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@example.com',
        phone: '+91 98765 43210',
        location: 'Bengaluru, Karnataka',
        education: 'B.Tech in Computer Science',
        college: 'IIT Kharagpur',
        endYear: '2024',
        title: 'Fresher / 1 yr internship',
        skills: ['React', 'TypeScript', 'Node.js', 'Python', 'Tailwind CSS', 'Docker'],
        bio: 'Full-stack software developer passionate about building scalable web applications.',
      },
      {
        name: 'Pooja Iyer',
        email: 'pooja.iyer@healthmed.org',
        phone: '+91 98234 56789',
        location: 'Mumbai, Maharashtra',
        education: 'M.S. in Biomedical Informatics',
        college: 'AIIMS New Delhi',
        endYear: '2022',
        title: '3.5 yrs Experience',
        skills: ['Clinical Data Analysis', 'Python', 'FHIR Standards', 'EHR Integration', 'R', 'SQL'],
        bio: 'Healthcare informatics specialist bridging clinical workflow systems and AI health modeling.',
      },
      {
        name: 'Devendra Rathore',
        email: 'devendra.r@cloudops.io',
        phone: '+91 99112 34567',
        location: 'Hyderabad, Telangana',
        education: 'B.E. Information Technology',
        college: 'NIT Warangal',
        endYear: '2021',
        title: '4.8 yrs Experience',
        skills: ['AWS', 'Kubernetes', 'Terraform', 'CI/CD', 'Golang', 'Prometheus'],
        bio: 'Senior DevOps and Cloud Infrastructure architect specializing in automated multi-cloud deployments.',
      },
      {
        name: 'Simran Kaur',
        email: 'simran.kaur@fintechcorp.in',
        phone: '+91 97654 32109',
        location: 'Gurugram, Haryana',
        education: 'MBA in Finance & Analytics',
        college: 'IIM Lucknow',
        endYear: '2023',
        title: '2.5 yrs Experience',
        skills: ['Financial Modeling', 'Risk Assessment', 'PowerBI', 'Tableau', 'Excel Advanced', 'Python'],
        bio: 'FinTech product analyst with focus on consumer lending risk metrics.',
      },
    ];

    for (const c of demoCandidates) {
      const existing = await User.findOne({ email: c.email });
      if (!existing) {
        const u = await User.create({
          username: c.email.split('@')[0],
          email: c.email,
          fullName: c.name,
          displayName: c.name,
          phone: c.phone,
          role: 'user',
          isEmailVerified: true,
          status: 'Active',
        });

        await UserProfile.create({
          userId: u._id,
          contact: {
            fullName: c.name,
            phone: c.phone,
            email: c.email,
            city: c.location.split(',')[0],
            country: 'India',
          },
          personal: {
            headline: c.title,
            bio: c.bio,
          },
          education: {
            institution: c.college,
            degree: c.education,
            endYear: c.endYear,
          },
          skills: c.skills,
        });

        await Resume.create({
          userId: u._id,
          title: `${c.name.replace(/\s+/g, '_')}_Resume`,
          templateId: 'modern-sleek',
          atsScore: 88,
        });
      }
    }

    // 2. Seed demo Startups if needed
    const demoStartups = [
      {
        name: 'MediSync AI',
        entity: 'startup',
        ceoName: 'Rohan Varma',
        founders: 'Rohan Varma, Dr. Alok Sen, Priya Menon',
        ceoEmail: 'founders@medisync.ai',
        phone: '+91 98888 12345',
        industry: 'HealthTech / AI',
        headquarters: 'Bengaluru, Karnataka',
        website: 'https://medisync.ai',
        description: 'Autonomous AI clinical scribe and automated patient EHR copilot.',
        employees: '24 Members',
        fundraisingProfile: { fundingStage: 'Series A', raisedAmount: 3800000 },
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      },
      {
        name: 'KiteFlow Logistics',
        entity: 'startup',
        ceoName: 'Tanvi Nair',
        founders: 'Tanvi Nair, Vikram Joshi',
        ceoEmail: 'contact@kiteflow.io',
        phone: '+91 97777 23456',
        industry: 'Supply Chain / Mobility',
        headquarters: 'Mumbai, Maharashtra',
        website: 'https://kiteflow.io',
        description: 'Ultra-fast cold-chain pharmaceuticals dispatch and route optimization.',
        employees: '14 Members',
        fundraisingProfile: { fundingStage: 'Seed', raisedAmount: 1200000 },
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      },
      {
        name: 'EduNext Cloud',
        entity: 'startup',
        ceoName: 'Sameer Sheikh',
        founders: 'Sameer Sheikh',
        ceoEmail: 'founders@edunext.cloud',
        phone: '+91 96666 34567',
        industry: 'EdTech',
        headquarters: 'Pune, Maharashtra',
        website: 'https://edunext.cloud',
        description: 'Interactive virtual STEM laboratory simulations for colleges.',
        employees: '6 Members',
        fundraisingProfile: { fundingStage: 'Pre-Seed', raisedAmount: 250000 },
        accountStatus: 'Active',
        verificationStatus: 'Pending',
      },
    ];

    for (const s of demoStartups) {
      const existing = await RecruiterOrganization.findOne({ name: s.name, entity: 'startup' });
      if (!existing) {
        await RecruiterOrganization.create(s);
      }
    }

    // 3. Seed demo Companies if needed
    const demoCompanies = [
      {
        name: 'Apollo Health City',
        entity: 'company',
        ceoName: 'Dr. Ramesh Kulkarni',
        ceoEmail: 'careers@apollohealthcity.com',
        phone: '+91 40 2360 7777',
        industry: 'Healthcare & Hospital Networks',
        headquarters: 'Hyderabad, Telangana',
        employees: '1000+',
        website: 'https://apollohealthcity.com',
        description: 'Asia’s premier integrated healthcare city providing multispeciality tertiary care.',
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      },
      {
        name: 'TechMed Diagnostics Global',
        entity: 'company',
        ceoName: 'Arpita Sengupta',
        ceoEmail: 'recruitment@techmedglobal.io',
        phone: '+91 80 4123 9999',
        industry: 'Health Tech & Diagnostics',
        headquarters: 'Bengaluru, Karnataka',
        employees: '500-1000',
        website: 'https://techmedglobal.io',
        description: 'Global medical diagnostics and laboratory enterprise operating automated sequencing pipelines.',
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      },
    ];

    for (const c of demoCompanies) {
      const existing = await RecruiterOrganization.findOne({ name: c.name, entity: 'company' });
      if (!existing) {
        await RecruiterOrganization.create(c);
      }
    }

    // 4. Seed demo Institutions if needed
    const demoInstitutions = [
      {
        name: 'Indian Institute of Technology Kharagpur (IIT-KGP)',
        entity: 'institution',
        ceoName: 'Prof. Debashis Sen',
        ceoEmail: 'placement@iitkgp.ac.in',
        phone: '+91 3222 282 022',
        orgType: 'Central University',
        headquarters: 'Kharagpur, West Bengal',
        website: 'https://www.iitkgp.ac.in',
        description: 'Premier national institute of technology offering top-tier undergraduate and doctoral engineering curricula.',
        accreditations: 'Institute of National Importance / NIRF #5',
        totalEnrollment: '14,500+ Students',
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      },
      {
        name: 'All India Institute of Medical Sciences (AIIMS) New Delhi',
        entity: 'institution',
        ceoName: 'Dr. Suniti Singhal',
        ceoEmail: 'academic.dean@aiims.edu',
        phone: '+91 11 2658 8500',
        orgType: 'Medical Institute',
        headquarters: 'New Delhi, Delhi',
        website: 'https://www.aiims.edu',
        description: 'Apex medical college and research institute in India recognized globally for clinical excellence.',
        accreditations: 'NIRF Medical Rank #1',
        totalEnrollment: '4,200+ Students',
        accountStatus: 'Active',
        verificationStatus: 'Verified',
      },
    ];

    for (const inst of demoInstitutions) {
      const existing = await RecruiterOrganization.findOne({ name: inst.name, entity: 'institution' });
      if (!existing) {
        await RecruiterOrganization.create(inst);
      }
    }

    console.log('✅ Demo platform data verification completed.');
  } catch (err) {
    console.warn('⚠️ Warning during platform data seed:', err.message);
  }
}
