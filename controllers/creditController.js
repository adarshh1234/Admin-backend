import mongoose from 'mongoose';
import User from '../models/User.js';
import RecruiterCredits from '../models/RecruiterCredits.js';
import CreditTransaction from '../models/CreditTransaction.js';
import UserSubscription from '../models/UserSubscription.js';
import PaymentOrder from '../models/PaymentOrder.js';
import CreditPricingConfig from '../models/CreditPricingConfig.js';

// Schemas for collections in the shared database
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
    accountStatus: { type: String, default: 'Active' },
    verificationStatus: { type: String, default: 'Pending' },
  },
  { timestamps: true, collection: 'recruiterorganizations', strict: false }
);

const RecruiterOrganization =
  mongoose.models.RecruiterOrganization ||
  mongoose.model('RecruiterOrganization', RecruiterOrganizationSchema);

// Baseline Authoritative Pricing Defaults (Source: Letgetin-Credit-Plan.docx)
const BASELINE_PRICING = {
  creditValueInr: 10,
  initialPromotionalCredits: 20,
  referralRewardCredits: 10,
  creditPacks: [
    { id: 'pack_10', name: 'Starter Topup', credits: 10, priceInr: 100, popular: false },
    { id: 'pack_20', name: 'Value Pack', credits: 20, priceInr: 200, popular: false },
    { id: 'pack_50', name: 'Growth Topup', credits: 50, priceInr: 500, popular: true },
    { id: 'pack_100', name: 'Pro Booster', credits: 100, priceInr: 1000, popular: false },
    { id: 'pack_250', name: 'Enterprise Bulk', credits: 250, priceInr: 2500, popular: false },
  ],
  subscriptionPlans: [
    {
      id: 'job_posting',
      name: 'Job Posting',
      targetRole: 'company',
      category: 'company',
      active: true,
      durations: {
        monthly: { credits: 50, priceInr: 500, days: 30 },
        six_months: { credits: 250, priceInr: 2500, days: 180 },
        yearly: { credits: 500, priceInr: 5000, days: 365 },
      },
      features: ['Active Job Postings included', 'Direct Applicant Pipeline', 'Standard Candidate Messaging'],
    },
    {
      id: 'hrms',
      name: 'HRMS',
      targetRole: 'company',
      category: 'company',
      active: true,
      durations: {
        monthly: { credits: 150, priceInr: 1500, days: 30 },
        six_months: { credits: 750, priceInr: 7500, days: 180 },
        yearly: { credits: 1500, priceInr: 15000, days: 365 },
      },
      features: ['Employee Management System', 'Payroll & Compliance Tools', 'Leave & Attendance Management'],
    },
    {
      id: 'recruitment_suite',
      name: 'Recruitment Suite',
      targetRole: 'company',
      category: 'company',
      active: true,
      durations: {
        monthly: { credits: 250, priceInr: 2500, days: 30 },
        six_months: { credits: 1250, priceInr: 12500, days: 180 },
        yearly: { credits: 2500, priceInr: 25000, days: 365 },
      },
      features: ['AI Resume Shortlisting & Scoring', 'Multi-round Automated Testing Suite', 'AI Interview Suite & Video Proctoring'],
    },
    {
      id: 'startup',
      name: 'Startup',
      targetRole: 'startup',
      category: 'startups',
      active: true,
      durations: {
        monthly: { credits: 50, priceInr: 500, days: 30 },
        six_months: { credits: 250, priceInr: 2500, days: 180 },
        yearly: { credits: 500, priceInr: 5000, days: 365 },
      },
      features: ['Business Plus Listing', 'Documentations & Govt Schemes Support', 'Investor Connect & Fundraising Pipeline'],
    },
    {
      id: 'institution',
      name: 'Institution',
      targetRole: 'institution',
      category: 'institution',
      active: true,
      durations: {
        monthly: { credits: 100, priceInr: 1000, days: 30 },
        six_months: { credits: 500, priceInr: 5000, days: 180 },
        yearly: { credits: 1000, priceInr: 10000, days: 365 },
      },
      features: ['Mass Student Applications', 'Campus Drive Scheduling', 'Recruiter Network Direct Links'],
    },
  ],
  candidatePlans: [
    {
      id: 'resume_services',
      title: 'Resume Services',
      description: 'AI-driven resume optimization and profile verification',
      items: [
        { id: 'ats_resume', name: 'ATS Resume', chargingUnit: 'Per resume processed', credits: 30, priceInr: 300, category: 'resume_services', active: true, description: 'Deep ATS optimization, score breakdown, and keywords match' },
        { id: 'verified_resume', name: 'Verified Resume', chargingUnit: 'Per resume verification', credits: 30, priceInr: 300, category: 'resume_services', active: true, description: 'Document verification badge for profile authenticity' },
      ],
    },
    {
      id: 'ai_apply',
      title: 'AI Apply Packages',
      description: 'Automated multi-job application packages with time-bounded limits',
      items: [
        { id: 'ai_apply_10jobs_1day', name: 'AI Apply — 10 jobs/day', chargingUnit: '1-day package', credits: 20, priceInr: 200, category: 'ai_apply', active: true, description: 'Automated submission up to 10 matching jobs valid for 1 day' },
        { id: 'ai_apply_20jobs_7days', name: 'AI Apply — 20 jobs / 1 week', chargingUnit: '7-day package', credits: 40, priceInr: 400, category: 'ai_apply', active: true, description: 'Automated submission up to 20 matching jobs valid for 7 days' },
        { id: 'ai_apply_50jobs_10days', name: 'AI Apply — 50 jobs / 10 days', chargingUnit: '10-day package', credits: 50, priceInr: 500, category: 'ai_apply', active: true, description: 'Automated submission up to 50 matching jobs valid for 10 days' },
      ],
    },
    {
      id: 'mockups_and_assessments',
      title: 'Mockups and Assessments',
      description: 'Simulated assessments, mock interviews, and cognitive evaluations',
      items: [
        { id: 'mockup_assessment', name: 'Mockup Assessment', chargingUnit: 'Per candidate assessment', credits: 20, priceInr: 200, category: 'mockups_and_assessments', active: true, description: 'Interactive skill and domain assessment generated from job description' },
        { id: 'mockup_interview', name: 'Mockup Interview', chargingUnit: 'Per candidate interview', credits: 20, priceInr: 200, category: 'mockups_and_assessments', active: true, description: 'Live AI-assisted mock interview session with feedback' },
        { id: 'psychometric_test', name: 'Psychometric Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'mockups_and_assessments', active: true, description: 'Personality and workplace behavioral assessment' },
        { id: 'genius_test', name: 'Genius Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'mockups_and_assessments', active: true, description: 'Cognitive aptitude, logic, and problem-solving evaluation' },
        { id: 'linguistic_test', name: 'Linguistic Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'mockups_and_assessments', active: true, description: 'Language proficiency and business communication analysis' },
      ],
    },
    {
      id: 'career_guidance_and_learning',
      title: 'Career Guidance and Learning',
      description: 'Mentorship, skill enhancements, certifications, and on-job training',
      items: [
        { id: 'career_counselling_ai', name: 'Career Counselling — AI', chargingUnit: 'Per session', credits: 3, priceInr: 30, category: 'career_guidance_and_learning', active: true, description: 'Instant career roadmap and role transition advisory powered by AI' },
        { id: 'career_counselling_manual', name: 'Career Counselling — Manual', chargingUnit: 'Per session', credits: 30, priceInr: 300, category: 'career_guidance_and_learning', active: true, description: '1-on-1 human expert career advisory and mentoring session' },
        { id: 'skills_enhancement', name: 'Skills Enhancement', chargingUnit: 'Per course/programme', credits: 30, priceInr: 300, category: 'career_guidance_and_learning', active: true, description: 'Targeted skill improvement courses tailored to high-demand roles' },
        { id: 'language_training', name: 'Language Training', chargingUnit: 'Per course/module', credits: 20, priceInr: 200, category: 'career_guidance_and_learning', active: true, description: 'Professional language and communication training modules' },
        { id: 'certificate_courses', name: 'Certificate Courses', chargingUnit: 'Per course', credits: 50, priceInr: 500, category: 'career_guidance_and_learning', active: true, description: 'Industry-aligned certificate course with verified credential' },
        { id: 'on_job_training', name: 'On-job Training', chargingUnit: 'Per programme', credits: 100, priceInr: 1000, category: 'career_guidance_and_learning', active: true, description: 'Hands-on apprenticeship and real-world project training programme' },
        { id: 'skills_certifications_courses', name: 'Skills Certifications Courses', chargingUnit: 'Per course/certification', credits: 30, priceInr: 300, category: 'career_guidance_and_learning', active: true, description: 'Standardized technical certification exams and badges' },
      ],
    },
  ],
  companyPlans: [
    {
      id: 'job_posting_recruitment',
      title: 'Job Posting & Recruitment Activities',
      description: 'Standard & premium job postings, verified candidate resumes, AI hiring, and background checks',
      items: [
        { id: 'standard_job_posting', name: 'Create Job Posting — Standard', chargingUnit: 'Per job posting', credits: 10, priceInr: 100, category: 'job_posting_recruitment', active: true, description: 'Publish standard job post with applicant tracking and pipeline match' },
        { id: 'premium_job_posting', name: 'Create Job Posting — PremiumS', chargingUnit: 'Per job posting', credits: 20, priceInr: 200, category: 'job_posting_recruitment', active: true, description: 'High-visibility premium job post with accelerated multi-channel distribution' },
        { id: 'verified_resume', name: 'Verified Resume', chargingUnit: 'Per resume verification', credits: 30, priceInr: 300, category: 'job_posting_recruitment', active: true, description: 'In-depth candidate credentials, employment history, and education check' },
        { id: 'ai_hire', name: 'AI Hire', chargingUnit: 'Per candidate processed', credits: 50, priceInr: 500, category: 'job_posting_recruitment', active: true, description: 'Full automated AI-driven shortlisting, dynamic interview, and ranked evaluation' },
        { id: 'domain_check', name: 'Domain Check', chargingUnit: 'Per check', credits: 20, priceInr: 200, category: 'job_posting_recruitment', active: true, description: 'Tailored domain assessment generation and candidate score report' },
        { id: 'bg_verification', name: 'BG Verification', chargingUnit: 'Per verification', credits: 30, priceInr: 300, category: 'job_posting_recruitment', active: true, description: 'Professional background screening with platform verification report', providerFeeNote: '30 platform credits + applicable external provider fee' },
      ],
    },
    {
      id: 'promotions_explore',
      title: 'Company Promotions & Explore Opportunities',
      description: 'High-impact brand visibility, 7-day front-page placements, social boosts, and job fair features',
      items: [
        { id: 'promo_landing_page', name: 'List on the Landing Pages', chargingUnit: 'Per campaign', credits: 50, priceInr: 500, category: 'promotions_explore', active: true, description: 'Prime hero section feature on candidate & public homepages' },
        { id: 'promo_featured_jobs', name: 'Featured Jobs', chargingUnit: 'Per featured placement', credits: 30, priceInr: 300, category: 'promotions_explore', active: true, description: 'Highlighted placement at the top of candidate search results' },
        { id: 'promo_recently_posted', name: 'Recently Posted', chargingUnit: 'Per promoted listing', credits: 10, priceInr: 100, category: 'promotions_explore', active: true, description: 'Boost position in Recently Posted feeds for active candidates' },
        { id: 'promo_first_page_7d', name: 'Stay on the First Page', chargingUnit: '7-day placement', credits: 50, priceInr: 500, category: 'promotions_explore', active: true, durationDays: 7, description: 'Guaranteed front-page ranking across discovery feeds for 7 full days' },
        { id: 'promo_front_row_7d', name: 'Stay in the Front Row / Top Row', chargingUnit: '7-day placement', credits: 75, priceInr: 750, category: 'promotions_explore', active: true, durationDays: 7, description: 'Pinned top-row banner placement in category listings for 7 days' },
        { id: 'promo_social_media', name: 'Promote on Social Media', chargingUnit: 'Per campaign', credits: 30, priceInr: 300, category: 'promotions_explore', active: true, description: 'Multi-platform social outreach blast across LinkedIn and Twitter feeds' },
        { id: 'promo_job_fair', name: 'Promote on Job Fair', chargingUnit: 'Per campaign', credits: 100, priceInr: 1000, category: 'promotions_explore', active: true, description: 'Exclusive virtual and physical job fair spotlight exhibition booth' },
        { id: 'promo_advertisement', name: 'Advertisement', chargingUnit: 'By placement and duration', credits: 0, priceInr: 0, category: 'promotions_explore', active: true, caseByCase: true, description: 'Custom enterprise banner placements and sponsor campaigns (Case-by-case / To be agreed)' },
      ],
    },
    {
      id: 'career_guidance_workforce',
      title: 'Career Guidance & Workforce Suite',
      description: 'Workforce assessments, psychological profiling, executive mentoring, and skills certification',
      items: [
        { id: 'psychometric_test', name: 'Psychometric Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'career_guidance_workforce', active: true, description: 'Workplace personality, cultural alignment, and situational judgment' },
        { id: 'genius_test', name: 'Genius Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'career_guidance_workforce', active: true, description: 'Cognitive aptitude, logic, and analytical problem solving' },
        { id: 'linguistic_test', name: 'Linguistic Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'career_guidance_workforce', active: true, description: 'Language proficiency and workplace communication assessment' },
        { id: 'skills_enhancement', name: 'Skills Enhancement', chargingUnit: 'Per course/programme', credits: 30, priceInr: 300, category: 'career_guidance_workforce', active: true, description: 'Employee upskilling curriculum and role transformation track' },
        { id: 'career_counselling_ai', name: 'Career Counselling — AI', chargingUnit: 'Per session', credits: 3, priceInr: 30, category: 'career_guidance_workforce', active: true, description: 'AI-guided career trajectory and growth roadmapping' },
        { id: 'career_counselling_manual', name: 'Career Counselling — Manual', chargingUnit: 'Per session', credits: 30, priceInr: 300, category: 'career_guidance_workforce', active: true, description: '1-on-1 human expert advisory and executive mentoring session' },
        { id: 'language_training', name: 'Language Training', chargingUnit: 'Per course/module', credits: 20, priceInr: 200, category: 'career_guidance_workforce', active: true, description: 'Business English and workplace fluency modules' },
        { id: 'certificate_courses', name: 'Certificate Courses', chargingUnit: 'Per course', credits: 50, priceInr: 500, category: 'career_guidance_workforce', active: true, description: 'Accredited certificate coursework with verified employee credentials' },
        { id: 'on_job_training', name: 'On-job Training', chargingUnit: 'Per programme', credits: 100, priceInr: 1000, category: 'career_guidance_workforce', active: true, description: 'Real-world apprenticeship and workplace simulation programme' },
        { id: 'skills_certifications_courses', name: 'Skills Certifications Courses', chargingUnit: 'Per course/certification', credits: 30, priceInr: 300, category: 'career_guidance_workforce', active: true, description: 'Standardized technical certification exams and badges' },
      ],
    },
  ],
  startupPlans: [
    {
      id: 'job_posting_recruitment',
      title: 'Job Posting and Recruitment Activities',
      description: 'Job postings, resume verifications, AI hiring, and candidate background checks',
      items: [
        { id: 'standard_job_posting', name: 'Create Job Posting – Standard', chargingUnit: 'Per job posting', credits: 10, priceInr: 100, category: 'job_posting_recruitment', active: true, description: 'Standard single job listing with applicant inbox and matching' },
        { id: 'premium_job_posting', name: 'Create Job Posting – PremiumS', chargingUnit: 'Per job posting', credits: 20, priceInr: 200, category: 'job_posting_recruitment', active: true, description: 'Premium job listing with highlighted placement and boosted candidate reach' },
        { id: 'verified_resume', name: 'Verified Resume', chargingUnit: 'Per resume verification', credits: 30, priceInr: 300, category: 'job_posting_recruitment', active: true, description: 'Comprehensive verification of candidate credentials, past employment, and academic badges' },
        { id: 'ai_hire', name: 'AI Hire', chargingUnit: 'Per candidate processed', credits: 50, priceInr: 500, category: 'job_posting_recruitment', active: true, description: 'Autonomous AI candidate evaluation, technical scoring, and hiring recommendation' },
        { id: 'domain_check', name: 'Domain Check', chargingUnit: 'Per check', credits: 20, priceInr: 200, category: 'job_posting_recruitment', active: true, description: 'Specialized domain technical assessment tailored to job requirements' },
        { id: 'bg_verification', name: 'BG Verification', chargingUnit: 'Per verification', credits: 30, priceInr: 300, category: 'job_posting_recruitment', active: true, description: '30 platform credits + provider fee, if applicable (UIDAI, EPFO, NAD, e-Courts checks)', providerFeeNote: 'External registry provider fee applicable where required' },
      ],
    },
    {
      id: 'promotions_explore',
      title: 'Promotions and Explore Opportunities',
      description: 'Placement promotions, landing page spotlights, social media pushes, and job fairs',
      items: [
        { id: 'promo_landing_page', name: 'List on the landing pages', chargingUnit: 'Per campaign', credits: 50, priceInr: 500, category: 'promotions_explore', active: true, description: 'Feature your vacancy prominently on LetGetIn landing pages' },
        { id: 'promo_featured_jobs', name: 'Featured Jobs', chargingUnit: 'Per featured placement', credits: 30, priceInr: 300, category: 'promotions_explore', active: true, description: 'Featured badge and top placement in candidate search feeds' },
        { id: 'promo_recently_posted', name: 'Recently Posted', chargingUnit: 'Per promoted listing', credits: 10, priceInr: 100, category: 'promotions_explore', active: true, description: 'Boost position in Recently Posted feeds for active candidates' },
        { id: 'promo_first_page_7d', name: 'Stay on the first page', chargingUnit: '7-day placement', credits: 50, priceInr: 500, category: 'promotions_explore', active: true, durationDays: 7, description: 'Guaranteed front-page ranking across discovery feeds for 7 full days' },
        { id: 'promo_front_row_7d', name: 'Stay in the front row / top row', chargingUnit: '7-day placement', credits: 75, priceInr: 750, category: 'promotions_explore', active: true, durationDays: 7, description: 'Pinned top-row banner placement in category listings for 7 days' },
        { id: 'promo_social_media', name: 'Promote on Social Media', chargingUnit: 'Per campaign', credits: 30, priceInr: 300, category: 'promotions_explore', active: true, description: 'Multi-platform social outreach blast across LinkedIn and Twitter feeds' },
        { id: 'promo_job_fair', name: 'Promote on Job Fair', chargingUnit: 'Per campaign', credits: 100, priceInr: 1000, category: 'promotions_explore', active: true, description: 'Exclusive virtual and physical job fair spotlight exhibition booth' },
        { id: 'promo_advertisement', name: 'Advertisement', chargingUnit: 'By placement and duration', credits: 0, priceInr: 0, category: 'promotions_explore', active: true, caseByCase: true, description: 'Custom enterprise banner placements and sponsor campaigns (Case-by-case / To be agreed)' },
      ],
    },
    {
      id: 'career_guidance_learning',
      title: 'Career Guidance and Learning',
      description: 'Workforce assessments, psychological profiling, executive mentoring, and skills certification',
      items: [
        { id: 'psychometric_test', name: 'Psychometric Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'career_guidance_learning', active: true, description: 'Workplace personality, cultural alignment, and situational judgment' },
        { id: 'genius_test', name: 'Genius Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'career_guidance_learning', active: true, description: 'Cognitive aptitude, logic, and analytical problem solving' },
        { id: 'linguistic_test', name: 'Linguistic Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'career_guidance_learning', active: true, description: 'Language proficiency and workplace communication assessment' },
        { id: 'skills_enhancement', name: 'Skills Enhancement', chargingUnit: 'Per course/programme', credits: 30, priceInr: 300, category: 'career_guidance_learning', active: true, description: 'Employee upskilling curriculum and role transformation track' },
        { id: 'career_counselling_ai', name: 'Career Counselling – AI', chargingUnit: 'Per session', credits: 3, priceInr: 30, category: 'career_guidance_learning', active: true, description: 'AI-guided career trajectory and growth roadmapping' },
        { id: 'career_counselling_manual', name: 'Career Counselling – Manual', chargingUnit: 'Per session', credits: 30, priceInr: 300, category: 'career_guidance_learning', active: true, description: '1-on-1 human expert advisory and executive mentoring session' },
        { id: 'language_training', name: 'Language Training', chargingUnit: 'Per course/module', credits: 20, priceInr: 200, category: 'career_guidance_learning', active: true, description: 'Business English and workplace fluency modules' },
        { id: 'certificate_courses', name: 'Certificate Courses', chargingUnit: 'Per course', credits: 50, priceInr: 500, category: 'career_guidance_learning', active: true, description: 'Accredited certificate coursework with verified employee credentials' },
        { id: 'on_job_training', name: 'On-job Training', chargingUnit: 'Per programme', credits: 100, priceInr: 1000, category: 'career_guidance_learning', active: true, description: 'Real-world apprenticeship and workplace simulation programme' },
        { id: 'skills_certifications_courses', name: 'Skills Certifications Courses', chargingUnit: 'Per course/certification', credits: 30, priceInr: 300, category: 'career_guidance_learning', active: true, description: 'Standardized technical certification exams and badges' },
      ],
    },
    {
      id: 'growth_fundraising',
      title: 'Growth & Fundraising Services',
      description: 'Venture scaling, investor networking, and business acceleration packages',
      items: [
        { id: 'startup_business_plus', name: 'Business Plus', chargingUnit: 'Per listing/package', credits: 50, priceInr: 500, category: 'growth_fundraising', active: true, description: 'Premium startup business showcase, AI pitch generation, and partner visibility' },
        { id: 'startup_networking', name: 'Networking', chargingUnit: 'Per event/access', credits: 20, priceInr: 200, category: 'growth_fundraising', active: true, description: 'Direct investor networking access and pipeline deal creation' },
        { id: 'startup_funding_support', name: 'Funding Support', chargingUnit: 'Per support service', credits: 50, priceInr: 500, category: 'growth_fundraising', active: true, description: 'Dedicated fundraising advisory, outreach review, and capital strategy' },
      ],
    },
    {
      id: 'ecosystem_programs',
      title: 'Ecosystem & Documentation Services',
      description: 'Corporate filings, pitch decks, incubation facilities, and top-tier accelerators',
      items: [
        { id: 'startup_documentations', name: 'Documentations', chargingUnit: 'Per service/request', credits: 50, priceInr: 500, category: 'ecosystem_programs', active: true, description: 'Comprehensive documentation support (pitch decks, registrations, govt scheme filings)' },
        { id: 'startup_incubations', name: 'Incubations', chargingUnit: 'Per listing/application support', credits: 50, priceInr: 500, category: 'ecosystem_programs', active: true, description: 'Incubation hub listings, lab facility access, and academic joint-program application support' },
        { id: 'startup_accelerators', name: 'Accelerators', chargingUnit: 'Per listing/application support', credits: 50, priceInr: 500, category: 'ecosystem_programs', active: true, description: 'Venture acceleration listings, cohort milestone tracking, and application support' },
      ],
    },
  ],
  institutionPlans: [
    {
      id: 'institution_services',
      title: 'Institution Services and Charges',
      description: 'Campus recruitment drives, mass student applications, job fairs, skill enhancement, and student testing',
      items: [
        { id: 'inst_placement_mass_application', name: 'Placement – Mass Application', chargingUnit: 'Per student application', credits: 2, priceInr: 20, category: 'institution_services', active: true, description: 'Submit mass applications for graduating batches across active corporate employer pipelines' },
        { id: 'inst_campus_drive', name: 'Campus – Drive', chargingUnit: 'Per event', credits: 100, priceInr: 1000, category: 'institution_services', active: true, description: 'Host dedicated on-campus corporate recruitment drive with multi-company scheduling' },
        { id: 'inst_job_fair_campus', name: 'Job Fair at Campus', chargingUnit: 'Per event', credits: 300, priceInr: 3000, category: 'institution_services', active: true, description: 'Large-scale physical job fair on campus hosting multiple verified corporate recruiters' },
        { id: 'inst_job_fair_online', name: 'Job Fair – Online', chargingUnit: 'Per event', credits: 150, priceInr: 1500, category: 'institution_services', active: true, description: 'Virtual recruitment fair connecting all institution students with remote employers' },
        { id: 'inst_career_enhancement', name: 'Career Enhancement at Campus', chargingUnit: 'Per session', credits: 50, priceInr: 500, category: 'institution_services', active: true, description: 'Campus-wide corporate career guidance, CV workshops, and executive orientation session' },
        { id: 'inst_skills_enhancement_batch', name: 'Skills Enhancement', chargingUnit: 'Per batch', credits: 100, priceInr: 1000, category: 'institution_services', active: true, description: 'Structured industry-readiness training batch aligned with corporate demand' },
        { id: 'inst_genius_test_campus', name: 'Genius Test at Campus', chargingUnit: 'Per student test', credits: 5, priceInr: 50, category: 'institution_services', active: true, description: 'Standardized cognitive aptitude, logic, and employability assessment per student' },
      ],
    },
  ],
  featurePricing: [
    { id: 'standard_job_posting', name: 'Standard Job Posting', chargingUnit: 'Per job', credits: 10, priceInr: 100, category: 'recruitment' },
    { id: 'premium_job_posting', name: 'Premium Job Posting', chargingUnit: 'Per job', credits: 20, priceInr: 200, category: 'recruitment' },
    { id: 'ats_resume', name: 'ATS Resume Processing', chargingUnit: 'Per resume', credits: 30, priceInr: 300, category: 'recruitment' },
    { id: 'verified_resume', name: 'Verified Resume Screening', chargingUnit: 'Per verification', credits: 30, priceInr: 300, category: 'verification' },
    { id: 'mockup_assessment', name: 'Mockup Candidate Assessment', chargingUnit: 'Per assessment', credits: 20, priceInr: 200, category: 'assessment' },
    { id: 'mockup_interview', name: 'Mockup Candidate Interview', chargingUnit: 'Per interview', credits: 20, priceInr: 200, category: 'assessment' },
    { id: 'domain_check', name: 'Corporate Domain Check', chargingUnit: 'Per check', credits: 20, priceInr: 200, category: 'verification' },
    { id: 'bg_verification', name: 'Background Verification', chargingUnit: 'Per verification', credits: 30, priceInr: 300, category: 'verification' },
    { id: 'ai_apply_10jobs_1day', name: 'AI Apply — 10 jobs/day', chargingUnit: '1-day package', credits: 20, priceInr: 200, category: 'candidate' },
    { id: 'ai_apply_20jobs_7days', name: 'AI Apply — 20 jobs/week', chargingUnit: '7-day package', credits: 40, priceInr: 400, category: 'candidate' },
    { id: 'ai_apply_50jobs_10days', name: 'AI Apply — 50 jobs/10 days', chargingUnit: '10-day package', credits: 50, priceInr: 500, category: 'candidate' },
    { id: 'promo_landing_page', name: 'List on Landing Pages', chargingUnit: 'Per campaign', credits: 50, priceInr: 500, category: 'promotion' },
    { id: 'promo_featured_jobs', name: 'Featured Jobs Listing', chargingUnit: 'Per placement', credits: 30, priceInr: 300, category: 'promotion' },
    { id: 'promo_first_page_7d', name: 'Stay on First Page (7 Days)', chargingUnit: '7-day placement', credits: 50, priceInr: 500, category: 'promotion' },
    { id: 'promo_front_row_7d', name: 'Stay in Front Row (7 Days)', chargingUnit: '7-day placement', credits: 75, priceInr: 750, category: 'promotion' },
    { id: 'psychometric_test', name: 'Psychometric Test', chargingUnit: 'Per test', credits: 10, priceInr: 100, category: 'learning' },
    { id: 'startup_networking', name: 'Startup Networking & Matchmaking', chargingUnit: 'Per match', credits: 20, priceInr: 200, category: 'startup' },
    { id: 'startup_business_plus', name: 'Startup Business Plus Support', chargingUnit: 'Per consultation', credits: 50, priceInr: 500, category: 'startup' },
    { id: 'inst_placement_mass_application', name: 'Placement – Mass Student Application', chargingUnit: 'Per student', credits: 2, priceInr: 20, category: 'institution' },
    { id: 'inst_campus_drive', name: 'Campus Placement Drive Event', chargingUnit: 'Per event', credits: 100, priceInr: 1000, category: 'institution' },
  ],
};

/**
 * Helper to resolve the credit wallet for an account.
 * Auto-creates with 20 promotional credits if account exists but has no wallet yet.
 */
async function getOrCreateWallet(query) {
  let wallet = await RecruiterCredits.findOne(query);
  if (!wallet) {
    const referralCode = `LGI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    wallet = await RecruiterCredits.create({
      ...query,
      balance: BASELINE_PRICING.initialPromotionalCredits,
      promotionalGranted: true,
      referralCode,
    });

    await CreditTransaction.create({
      ...query,
      type: 'grant',
      amount: BASELINE_PRICING.initialPromotionalCredits,
      balanceBefore: 0,
      balanceAfter: BASELINE_PRICING.initialPromotionalCredits,
      feature: 'promotional_welcome',
      reason: 'Initial promotional balance (20 credits = ₹200)',
      status: 'completed',
    });
  }
  return wallet;
}

export const creditController = {
  /**
   * 1. Get Accounts by Category with Balances and Stats
   * GET /api/credits/accounts?category=customers|company|institution|startups&search=&page=&limit=
   */
  async getAccounts(req, res) {
    try {
      const category = (req.query.category || 'customers').toLowerCase();
      const search = (req.query.search || '').trim();
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 10));
      const skip = (page - 1) * limit;

      let accounts = [];
      let totalCount = 0;

      if (category === 'customers') {
        // Candidate / Customer Accounts
        const filter = {
          role: { $in: ['user', 'candidate', 'USER', null, undefined] },
          $or: [
            { entityType: { $exists: false } },
            { entityType: null },
            { entityType: { $nin: ['company', 'institution', 'startup'] } },
          ],
        };

        if (search) {
          filter.$and = [
            {
              $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } },
              ],
            },
          ];
        }

        totalCount = await User.countDocuments(filter);
        const users = await User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Get balances and subscriptions for these users
        const userIds = users.map((u) => u._id);
        const wallets = await RecruiterCredits.find({ userId: { $in: userIds } }).lean();
        const subscriptions = await UserSubscription.find({
          userId: { $in: userIds },
          status: 'active',
          expiresAt: { $gt: new Date() },
        }).lean();

        const walletMap = new Map();
        wallets.forEach((w) => walletMap.set(w.userId?.toString(), w));

        const subMap = new Map();
        subscriptions.forEach((s) => subMap.set(s.userId?.toString(), s));

        accounts = users.map((u) => {
          const idStr = u._id.toString();
          const wallet = walletMap.get(idStr);
          const sub = subMap.get(idStr);
          return {
            id: idStr,
            accountId: idStr,
            userId: idStr,
            category: 'Customers',
            name: u.fullName || u.displayName || u.username || 'Candidate User',
            email: u.email || 'N/A',
            phone: u.phone || '',
            role: 'Candidate',
            accountStatus: u.status || 'Active',
            balance: wallet ? wallet.balance : BASELINE_PRICING.initialPromotionalCredits,
            referralCode: wallet?.referralCode || 'N/A',
            activeSubscription: sub
              ? {
                  planName: sub.planName,
                  billingCycle: sub.billingCycle,
                  expiresAt: sub.expiresAt,
                }
              : null,
            createdAt: u.createdAt,
          };
        });
      } else {
        // Organization-based categories: company, institution, startups
        const entityName =
          category === 'company'
            ? 'company'
            : category === 'institution'
            ? 'institution'
            : 'startup';

        const filter = { entity: entityName };
        if (search) {
          filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { ceoEmail: { $regex: search, $options: 'i' } },
            { ceoName: { $regex: search, $options: 'i' } },
            { industry: { $regex: search, $options: 'i' } },
          ];
        }

        totalCount = await RecruiterOrganization.countDocuments(filter);
        const orgs = await RecruiterOrganization.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // Also query users registered as recruiter for this entity if first page
        const orgIds = orgs.map((o) => o._id);
        const ownerUserIds = orgs.map((o) => o.ownerUserId).filter(Boolean);

        const wallets = await RecruiterCredits.find({
          $or: [{ orgId: { $in: orgIds } }, { userId: { $in: ownerUserIds } }],
        }).lean();

        const subscriptions = await UserSubscription.find({
          $or: [{ orgId: { $in: orgIds } }, { userId: { $in: ownerUserIds } }],
          status: 'active',
          expiresAt: { $gt: new Date() },
        }).lean();

        const walletMap = new Map();
        wallets.forEach((w) => {
          if (w.orgId) walletMap.set(w.orgId.toString(), w);
          if (w.userId) walletMap.set(w.userId.toString(), w);
        });

        const subMap = new Map();
        subscriptions.forEach((s) => {
          if (s.orgId) subMap.set(s.orgId.toString(), s);
          if (s.userId) subMap.set(s.userId.toString(), s);
        });

        const categoryTitle =
          category === 'company'
            ? 'Company'
            : category === 'institution'
            ? 'Institution'
            : 'Startup';

        accounts = orgs.map((o) => {
          const orgIdStr = o._id.toString();
          const ownerIdStr = o.ownerUserId ? o.ownerUserId.toString() : null;
          const wallet = walletMap.get(orgIdStr) || (ownerIdStr ? walletMap.get(ownerIdStr) : null);
          const sub = subMap.get(orgIdStr) || (ownerIdStr ? subMap.get(ownerIdStr) : null);

          return {
            id: orgIdStr,
            accountId: orgIdStr,
            orgId: orgIdStr,
            userId: ownerIdStr,
            category: categoryTitle,
            name: o.name || 'Organization',
            email: o.ceoEmail || 'org@letgetin.com',
            phone: o.phone || '',
            role: categoryTitle,
            industry: o.industry || o.sector || 'Technology',
            accountStatus: o.accountStatus || 'Active',
            balance: wallet ? wallet.balance : BASELINE_PRICING.initialPromotionalCredits,
            referralCode: wallet?.referralCode || 'N/A',
            activeSubscription: sub
              ? {
                  planName: sub.planName,
                  billingCycle: sub.billingCycle,
                  expiresAt: sub.expiresAt,
                }
              : null,
            createdAt: o.createdAt,
          };
        });
      }

      // Calculate aggregated metrics for this category
      const circulatingCredits = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
      const activeSubsCount = accounts.filter((a) => a.activeSubscription).length;

      return res.json({
        success: true,
        category,
        data: accounts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
        stats: {
          totalAccounts: totalCount,
          circulatingCredits,
          activeSubscriptions: activeSubsCount,
        },
      });
    } catch (err) {
      console.error('Error fetching credit accounts:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch credit accounts',
        error: err.message,
      });
    }
  },

  /**
   * 2. Get Single Account Details, Balance, Subscriptions & Transactions
   * GET /api/credits/accounts/:id?category=...
   */
  async getAccountDetails(req, res) {
    try {
      const { id } = req.params;
      const category = (req.query.category || 'customers').toLowerCase();

      let targetUser = null;
      let targetOrg = null;
      let query = {};

      if (category === 'customers') {
        targetUser = await User.findById(id).lean();
        if (!targetUser) {
          return res.status(404).json({ success: false, message: 'Customer account not found' });
        }
        query = { userId: targetUser._id };
      } else {
        targetOrg = await RecruiterOrganization.findById(id).lean();
        if (targetOrg) {
          query = targetOrg.ownerUserId
            ? { $or: [{ orgId: targetOrg._id }, { userId: targetOrg.ownerUserId }] }
            : { orgId: targetOrg._id };
        } else {
          targetUser = await User.findById(id).lean();
          if (!targetUser) {
            return res.status(404).json({ success: false, message: 'Account not found' });
          }
          query = { userId: targetUser._id };
        }
      }

      // 1. Current balance
      const wallet = await getOrCreateWallet(
        targetOrg
          ? { orgId: targetOrg._id, userId: targetOrg.ownerUserId }
          : { userId: targetUser._id }
      );

      // 2. Active & past subscriptions
      const subscriptions = await UserSubscription.find(query).sort({ createdAt: -1 }).lean();

      // 3. Transactions
      const txPage = Math.max(1, parseInt(req.query.txPage, 10) || 1);
      const txLimit = Math.max(1, Math.min(50, parseInt(req.query.txLimit, 10) || 15));
      const txSkip = (txPage - 1) * txLimit;

      const txFilter = { ...query };
      if (req.query.type && req.query.type !== 'All') {
        txFilter.type = req.query.type;
      }
      if (req.query.status && req.query.status !== 'All') {
        txFilter.status = req.query.status;
      }
      if (req.query.startDate || req.query.endDate) {
        txFilter.createdAt = {};
        if (req.query.startDate) txFilter.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) txFilter.createdAt.$lte = new Date(req.query.endDate);
      }

      const totalTransactions = await CreditTransaction.countDocuments(txFilter);
      const transactions = await CreditTransaction.find(txFilter)
        .sort({ createdAt: -1 })
        .skip(txSkip)
        .limit(txLimit)
        .lean();

      // 4. Payment Orders
      const paymentOrders = await PaymentOrder.find(query)
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const accountName = targetOrg?.name || targetUser?.fullName || targetUser?.displayName || targetUser?.username || 'Account';
      const accountEmail = targetOrg?.ceoEmail || targetUser?.email || 'N/A';

      return res.json({
        success: true,
        data: {
          id,
          name: accountName,
          email: accountEmail,
          category,
          balance: wallet.balance,
          referralCode: wallet.referralCode,
          promotionalGranted: wallet.promotionalGranted,
          subscriptions,
          transactions,
          paymentOrders,
          pagination: {
            page: txPage,
            limit: txLimit,
            total: totalTransactions,
            totalPages: Math.ceil(totalTransactions / txLimit) || 1,
          },
        },
      });
    } catch (err) {
      console.error('Error fetching account credit details:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch account credit details',
        error: err.message,
      });
    }
  },

  /**
   * 3. Secure Manual Credit Adjustment (Add or Deduct)
   * POST /api/credits/accounts/:id/adjust
   * Body: { amount: number, type: 'add' | 'deduct', reason: string, idempotencyKey?: string }
   */
  async adjustBalance(req, res) {
    try {
      const { id } = req.params;
      const { amount, type, reason, idempotencyKey } = req.body;
      const admin = req.user;

      // Validate inputs
      const numericAmount = Number(amount);
      if (!numericAmount || numericAmount <= 0 || !Number.isFinite(numericAmount)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid adjustment amount. Must be a positive number greater than 0.',
        });
      }

      if (type !== 'add' && type !== 'deduct') {
        return res.status(400).json({
          success: false,
          message: 'Invalid adjustment type. Must be either "add" or "deduct".',
        });
      }

      const trimmedReason = (reason || '').trim();
      if (!trimmedReason || trimmedReason.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'A clear reason for the manual credit adjustment is mandatory (minimum 3 characters).',
        });
      }

      // Check idempotency to prevent double adjustments
      if (idempotencyKey) {
        const existingTxn = await CreditTransaction.findOne({ idempotencyKey });
        if (existingTxn) {
          return res.json({
            success: true,
            message: 'Duplicate request detected. Transaction was already applied previously.',
            data: existingTxn,
          });
        }
      }

      // Resolve owner (User or Organization)
      let targetUser = await User.findById(id);
      let targetOrg = null;
      let ownerQuery = {};

      if (targetUser) {
        ownerQuery = { userId: targetUser._id };
      } else {
        targetOrg = await RecruiterOrganization.findById(id);
        if (!targetOrg) {
          return res.status(404).json({
            success: false,
            message: 'Account not found in Users or Organizations.',
          });
        }
        ownerQuery = targetOrg.ownerUserId
          ? { orgId: targetOrg._id, userId: targetOrg.ownerUserId }
          : { orgId: targetOrg._id };
      }

      // Fetch or initialize wallet
      const wallet = await getOrCreateWallet(ownerQuery);

      const previousBalance = wallet.balance;
      let newBalance = previousBalance;

      if (type === 'deduct') {
        if (previousBalance < numericAmount) {
          return res.status(400).json({
            success: false,
            message: `Insufficient balance: Cannot deduct ${numericAmount} credits from account with current balance of ${previousBalance} credits.`,
          });
        }
        newBalance = previousBalance - numericAmount;
      } else {
        newBalance = previousBalance + numericAmount;
      }

      // Persist new balance
      wallet.balance = newBalance;
      await wallet.save();

      // Create auditable transaction entry in ledger
      const adminIdentity = `${admin.displayName || admin.username || 'Admin'} (${admin.role || 'Admin'})`;
      const transactionRecord = await CreditTransaction.create({
        orgId: targetOrg ? targetOrg._id : undefined,
        userId: targetUser ? targetUser._id : (targetOrg?.ownerUserId || undefined),
        type: type === 'add' ? 'grant' : 'spend',
        amount: numericAmount,
        balanceBefore: previousBalance,
        balanceAfter: newBalance,
        feature: 'admin_adjustment',
        reason: `[Manual Admin Adjustment by ${adminIdentity}]: ${trimmedReason}`,
        status: 'completed',
        idempotencyKey: idempotencyKey || `adj-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      });

      return res.json({
        success: true,
        message: `Successfully ${type === 'add' ? 'added' : 'deducted'} ${numericAmount} credits. New balance is ${newBalance}.`,
        data: {
          accountId: id,
          previousBalance,
          adjustmentAmount: numericAmount,
          resultingBalance: newBalance,
          type,
          reason: trimmedReason,
          adjustedBy: adminIdentity,
          transactionId: transactionRecord._id,
          createdAt: transactionRecord.createdAt,
        },
      });
    } catch (err) {
      console.error('Error adjusting credit balance:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to process credit adjustment',
        error: err.message,
      });
    }
  },

  /**
   * 4. Get Current Authoritative Pricing Configuration & Audit Trail
   * GET /api/credits/pricing
   */
  async getPricingConfig(req, res) {
    try {
      const persisted = await CreditPricingConfig.findOne({ key: 'default' }).lean();

      const config = {
        creditValueInr: persisted?.creditValueInr || BASELINE_PRICING.creditValueInr,
        initialPromotionalCredits: persisted?.initialPromotionalCredits || BASELINE_PRICING.initialPromotionalCredits,
        referralRewardCredits: persisted?.referralRewardCredits || BASELINE_PRICING.referralRewardCredits,
        creditPacks: persisted?.creditPacks?.length ? persisted.creditPacks : BASELINE_PRICING.creditPacks,
        featurePricing: persisted?.featurePricing && Object.keys(persisted.featurePricing).length
          ? persisted.featurePricing
          : BASELINE_PRICING.featurePricing,
        subscriptionPlans: persisted?.subscriptionPlans?.length ? persisted.subscriptionPlans : BASELINE_PRICING.subscriptionPlans,
        candidatePlans: persisted?.candidatePlans?.length ? persisted.candidatePlans : BASELINE_PRICING.candidatePlans,
        companyPlans: persisted?.companyPlans?.length ? persisted.companyPlans : BASELINE_PRICING.companyPlans,
        startupPlans: persisted?.startupPlans?.length ? persisted.startupPlans : BASELINE_PRICING.startupPlans,
        institutionPlans: persisted?.institutionPlans?.length ? persisted.institutionPlans : BASELINE_PRICING.institutionPlans,
        status: persisted?.status || 'published',
        draftData: persisted?.draftData || null,
        paymentsCreditsEnabled: persisted?.paymentsCreditsEnabled !== undefined ? persisted.paymentsCreditsEnabled : true,
        paymentsCreditsDisabledReason: persisted?.paymentsCreditsDisabledReason || '',
        paymentsCreditsDisabledAt: persisted?.paymentsCreditsDisabledAt || null,
        paymentsCreditsDisabledBy: persisted?.paymentsCreditsDisabledBy || '',
        auditLog: persisted?.auditLog || [],
        lastUpdatedBy: persisted?.lastUpdatedBy || 'System Baseline',
        lastUpdatedByRole: persisted?.lastUpdatedByRole || 'System',
        updatedAt: persisted?.updatedAt || new Date(),
      };

      return res.json({ success: true, data: config });
    } catch (err) {
      console.error('Error fetching pricing configuration:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pricing configuration',
        error: err.message,
      });
    }
  },

  /**
   * 4b. Get Category-Specific Pricing Plans and Service Charges
   * GET /api/credits/pricing/category/:category
   */
  async getCategoryPricing(req, res) {
    try {
      const cat = (req.params.category || 'candidates').toLowerCase();
      const persisted = await CreditPricingConfig.findOne({ key: 'default' }).lean();

      const creditValueInr = persisted?.creditValueInr || BASELINE_PRICING.creditValueInr;
      const initialPromotionalCredits = persisted?.initialPromotionalCredits || BASELINE_PRICING.initialPromotionalCredits;
      const referralRewardCredits = persisted?.referralRewardCredits || BASELINE_PRICING.referralRewardCredits;

      let plans = [];
      let subscriptions = [];
      const allSubscriptions = persisted?.subscriptionPlans?.length ? persisted.subscriptionPlans : BASELINE_PRICING.subscriptionPlans;

      if (cat === 'candidates' || cat === 'customers') {
        plans = persisted?.candidatePlans?.length ? persisted.candidatePlans : BASELINE_PRICING.candidatePlans;
        subscriptions = [];
      } else if (cat === 'company') {
        plans = persisted?.companyPlans?.length ? persisted.companyPlans : BASELINE_PRICING.companyPlans;
        subscriptions = allSubscriptions.filter((s) => ['job_posting', 'hrms', 'recruitment_suite'].includes(s.id));
      } else if (cat === 'startups' || cat === 'startup') {
        plans = persisted?.startupPlans?.length ? persisted.startupPlans : BASELINE_PRICING.startupPlans;
        subscriptions = allSubscriptions.filter((s) => ['job_posting', 'hrms', 'startup'].includes(s.id));
      } else if (cat === 'institution' || cat === 'institutions') {
        plans = persisted?.institutionPlans?.length ? persisted.institutionPlans : BASELINE_PRICING.institutionPlans;
        subscriptions = allSubscriptions.filter((s) => ['institution'].includes(s.id));
      } else {
        return res.status(400).json({
          success: false,
          message: `Unknown category "${cat}". Must be one of: candidates, company, startups, institution.`,
        });
      }

      return res.json({
        success: true,
        data: {
          category: cat,
          creditValueInr,
          initialPromotionalCredits,
          referralRewardCredits,
          status: persisted?.status || 'published',
          hasDraft: !!persisted?.draftData,
          plans,
          subscriptions,
        },
      });
    } catch (err) {
      console.error('Error fetching category pricing:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch category pricing',
        error: err.message,
      });
    }
  },

  /**
   * 4c. Save Draft Pricing Changes (CMS workflow)
   * POST /api/credits/pricing/save-draft
   */
  async savePricingDraft(req, res) {
    try {
      const admin = req.user;
      const draftPayload = req.body;

      let config = await CreditPricingConfig.findOne({ key: 'default' });
      if (!config) {
        config = new CreditPricingConfig({
          key: 'default',
          creditValueInr: BASELINE_PRICING.creditValueInr,
          initialPromotionalCredits: BASELINE_PRICING.initialPromotionalCredits,
          referralRewardCredits: BASELINE_PRICING.referralRewardCredits,
          candidatePlans: BASELINE_PRICING.candidatePlans,
          companyPlans: BASELINE_PRICING.companyPlans,
          startupPlans: BASELINE_PRICING.startupPlans,
          institutionPlans: BASELINE_PRICING.institutionPlans,
          subscriptionPlans: BASELINE_PRICING.subscriptionPlans,
        });
      }

      config.status = 'draft';
      config.draftData = {
        ...(config.draftData || {}),
        ...draftPayload,
        draftSavedAt: new Date(),
        draftSavedBy: admin.displayName || admin.username || 'Admin',
      };
      config.lastUpdatedBy = admin.displayName || admin.username || 'Admin';
      config.lastUpdatedByRole = admin.role || 'Admin';
      await config.save();

      return res.json({
        success: true,
        message: 'Pricing draft saved successfully. Changes are staged in draft mode and not yet published live.',
        data: {
          status: config.status,
          draftData: config.draftData,
          updatedAt: config.updatedAt,
        },
      });
    } catch (err) {
      console.error('Error saving pricing draft:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to save pricing draft',
        error: err.message,
      });
    }
  },

  /**
   * 4d. Publish Pricing Changes Live to Authoritative Database
   * POST /api/credits/pricing/publish
   */
  async publishPricing(req, res) {
    try {
      const admin = req.user;
      const { reason, category, directData } = req.body;

      const trimmedReason = (reason || '').trim();
      if (!trimmedReason || trimmedReason.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory reason is required to publish credit pricing changes (minimum 3 characters).',
        });
      }

      let config = await CreditPricingConfig.findOne({ key: 'default' });
      if (!config) {
        config = new CreditPricingConfig({
          key: 'default',
          creditValueInr: BASELINE_PRICING.creditValueInr,
          initialPromotionalCredits: BASELINE_PRICING.initialPromotionalCredits,
          referralRewardCredits: BASELINE_PRICING.referralRewardCredits,
          candidatePlans: BASELINE_PRICING.candidatePlans,
          companyPlans: BASELINE_PRICING.companyPlans,
          startupPlans: BASELINE_PRICING.startupPlans,
          institutionPlans: BASELINE_PRICING.institutionPlans,
          subscriptionPlans: BASELINE_PRICING.subscriptionPlans,
          auditLog: [],
        });
      }

      const adminName = admin.displayName || admin.username || 'Admin';
      const adminRole = admin.role || 'Admin';
      const adminId = admin.id || admin._id || 'admin-001';

      // Merge data from draftData or directData
      const sourceData = directData || config.draftData || {};

      if (sourceData.creditValueInr !== undefined && sourceData.creditValueInr !== config.creditValueInr) {
        const numVal = Number(sourceData.creditValueInr);
        if (numVal < 1) {
          return res.status(400).json({ success: false, message: 'Base credit value must be at least ₹1.' });
        }
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'creditValueInr',
          itemName: 'Base Credit Value',
          field: 'priceInr',
          previousValue: config.creditValueInr,
          newValue: numVal,
          reason: trimmedReason,
          timestamp: new Date(),
        });
        config.creditValueInr = numVal;
      }

      if (sourceData.initialPromotionalCredits !== undefined && sourceData.initialPromotionalCredits !== config.initialPromotionalCredits) {
        const numVal = Number(sourceData.initialPromotionalCredits);
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'initialPromotionalCredits',
          itemName: 'Welcome Promotional Credits',
          field: 'credits',
          previousValue: config.initialPromotionalCredits,
          newValue: numVal,
          reason: trimmedReason,
          timestamp: new Date(),
        });
        config.initialPromotionalCredits = numVal;
      }

      if (sourceData.referralRewardCredits !== undefined && sourceData.referralRewardCredits !== config.referralRewardCredits) {
        const numVal = Number(sourceData.referralRewardCredits);
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'referralRewardCredits',
          itemName: 'Referral Reward Credits',
          field: 'credits',
          previousValue: config.referralRewardCredits,
          newValue: numVal,
          reason: trimmedReason,
          timestamp: new Date(),
        });
        config.referralRewardCredits = numVal;
      }

      // Apply category plans if present
      if (sourceData.candidatePlans && Array.isArray(sourceData.candidatePlans)) {
        config.candidatePlans = sourceData.candidatePlans;
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'candidatePlans',
          itemName: 'Candidate Category Plans',
          field: 'plans',
          previousValue: '[Updated]',
          newValue: '[Published]',
          reason: trimmedReason,
          timestamp: new Date(),
        });
      }

      if (sourceData.companyPlans && Array.isArray(sourceData.companyPlans)) {
        config.companyPlans = sourceData.companyPlans;
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'companyPlans',
          itemName: 'Company Category Plans',
          field: 'plans',
          previousValue: '[Updated]',
          newValue: '[Published]',
          reason: trimmedReason,
          timestamp: new Date(),
        });
      }

      if (sourceData.startupPlans && Array.isArray(sourceData.startupPlans)) {
        config.startupPlans = sourceData.startupPlans;
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'startupPlans',
          itemName: 'Startup Category Plans',
          field: 'plans',
          previousValue: '[Updated]',
          newValue: '[Published]',
          reason: trimmedReason,
          timestamp: new Date(),
        });
      }

      if (sourceData.institutionPlans && Array.isArray(sourceData.institutionPlans)) {
        config.institutionPlans = sourceData.institutionPlans;
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'institutionPlans',
          itemName: 'Institution Category Plans',
          field: 'plans',
          previousValue: '[Updated]',
          newValue: '[Published]',
          reason: trimmedReason,
          timestamp: new Date(),
        });
      }

      if (sourceData.subscriptionPlans && Array.isArray(sourceData.subscriptionPlans)) {
        config.subscriptionPlans = sourceData.subscriptionPlans;
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'subscriptionPlans',
          itemName: 'Subscription Plans',
          field: 'plans',
          previousValue: '[Updated]',
          newValue: '[Published]',
          reason: trimmedReason,
          timestamp: new Date(),
        });
      }

      config.status = 'published';
      config.draftData = null;
      config.lastUpdatedBy = adminName;
      config.lastUpdatedByRole = adminRole;
      await config.save();

      return res.json({
        success: true,
        message: '🎉 Credit pricing and plans published LIVE! Synchronized across the entire LetGetIn platform.',
        data: {
          status: config.status,
          updatedAt: config.updatedAt,
          publishedBy: `${adminName} (${adminRole})`,
        },
      });
    } catch (err) {
      console.error('Error publishing pricing configuration:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to publish pricing configuration',
        error: err.message,
      });
    }
  },

  /**
   * 4e. Reset Pricing to Defaults
   * POST /api/credits/pricing/reset
   */
  async resetPricing(req, res) {
    try {
      const admin = req.user;
      const { category, reason } = req.body;
      const trimmedReason = (reason || 'Reset to authoritative baseline defaults').trim();

      let config = await CreditPricingConfig.findOne({ key: 'default' });
      if (!config) {
        config = new CreditPricingConfig({ key: 'default' });
      }

      const adminName = admin.displayName || admin.username || 'Admin';
      const adminRole = admin.role || 'Admin';
      const adminId = admin.id || admin._id || 'admin-001';

      if (!category || category === 'all') {
        config.creditValueInr = BASELINE_PRICING.creditValueInr;
        config.initialPromotionalCredits = BASELINE_PRICING.initialPromotionalCredits;
        config.referralRewardCredits = BASELINE_PRICING.referralRewardCredits;
        config.candidatePlans = BASELINE_PRICING.candidatePlans;
        config.companyPlans = BASELINE_PRICING.companyPlans;
        config.startupPlans = BASELINE_PRICING.startupPlans;
        config.institutionPlans = BASELINE_PRICING.institutionPlans;
        config.subscriptionPlans = BASELINE_PRICING.subscriptionPlans;
      } else if (category === 'candidates' || category === 'customers') {
        config.candidatePlans = BASELINE_PRICING.candidatePlans;
      } else if (category === 'company') {
        config.companyPlans = BASELINE_PRICING.companyPlans;
      } else if (category === 'startups' || category === 'startup') {
        config.startupPlans = BASELINE_PRICING.startupPlans;
      } else if (category === 'institution' || category === 'institutions') {
        config.institutionPlans = BASELINE_PRICING.institutionPlans;
      }

      config.status = 'published';
      config.draftData = null;
      config.lastUpdatedBy = adminName;
      config.lastUpdatedByRole = adminRole;
      config.auditLog.push({
        adminId: String(adminId),
        adminName,
        adminRole,
        itemKey: category || 'all',
        itemName: `Reset ${category || 'All Pricing Rules'}`,
        field: 'reset',
        previousValue: '[Modified]',
        newValue: '[Default Baseline]',
        reason: trimmedReason,
        timestamp: new Date(),
      });

      await config.save();

      return res.json({
        success: true,
        message: `Successfully reset ${category || 'all'} pricing configuration to default baseline rules.`,
        data: config,
      });
    } catch (err) {
      console.error('Error resetting pricing configuration:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to reset pricing configuration',
        error: err.message,
      });
    }
  },

  /**
   * 5. Update Credit Pricing Configuration with Mandatory Audit Entry
   * PUT /api/credits/pricing
   * Body: { creditValueInr?, initialPromotionalCredits?, referralRewardCredits?, updates?: Array<{ key, field, oldValue, newValue }>, reason: string }
   */
  async updatePricingConfig(req, res) {
    try {
      const admin = req.user;
      const { creditValueInr, initialPromotionalCredits, referralRewardCredits, featurePricing, updates, reason } = req.body;

      const trimmedReason = (reason || '').trim();
      if (!trimmedReason || trimmedReason.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'A mandatory reason is required to update credit pricing rules (minimum 3 characters).',
        });
      }

      let config = await CreditPricingConfig.findOne({ key: 'default' });
      if (!config) {
        config = new CreditPricingConfig({
          key: 'default',
          creditValueInr: BASELINE_PRICING.creditValueInr,
          initialPromotionalCredits: BASELINE_PRICING.initialPromotionalCredits,
          referralRewardCredits: BASELINE_PRICING.referralRewardCredits,
          featurePricing: {},
          auditLog: [],
        });
      }

      const adminName = admin.displayName || admin.username || 'Admin';
      const adminRole = admin.role || 'Admin';
      const adminId = admin.id || admin._id || 'admin-001';

      // Audit and apply base credit value update
      if (creditValueInr !== undefined && creditValueInr !== config.creditValueInr) {
        const numVal = Number(creditValueInr);
        if (numVal < 1) {
          return res.status(400).json({ success: false, message: 'Base credit value must be at least ₹1.' });
        }
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'creditValueInr',
          itemName: 'Base Credit Value',
          field: 'priceInr',
          previousValue: config.creditValueInr,
          newValue: numVal,
          reason: trimmedReason,
          timestamp: new Date(),
        });
        config.creditValueInr = numVal;
      }

      // Audit and apply initial promo credits update
      if (initialPromotionalCredits !== undefined && initialPromotionalCredits !== config.initialPromotionalCredits) {
        const numVal = Number(initialPromotionalCredits);
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'initialPromotionalCredits',
          itemName: 'Initial Welcome Promotional Credits',
          field: 'credits',
          previousValue: config.initialPromotionalCredits,
          newValue: numVal,
          reason: trimmedReason,
          timestamp: new Date(),
        });
        config.initialPromotionalCredits = numVal;
      }

      // Audit and apply referral reward credits update
      if (referralRewardCredits !== undefined && referralRewardCredits !== config.referralRewardCredits) {
        const numVal = Number(referralRewardCredits);
        config.auditLog.push({
          adminId: String(adminId),
          adminName,
          adminRole,
          itemKey: 'referralRewardCredits',
          itemName: 'Referral Reward Credits',
          field: 'credits',
          previousValue: config.referralRewardCredits,
          newValue: numVal,
          reason: trimmedReason,
          timestamp: new Date(),
        });
        config.referralRewardCredits = numVal;
      }

      // Audit and apply individual item updates if supplied
      if (Array.isArray(updates)) {
        updates.forEach((u) => {
          config.auditLog.push({
            adminId: String(adminId),
            adminName,
            adminRole,
            itemKey: u.itemKey || 'feature_pricing',
            itemName: u.itemName || u.itemKey || 'Pricing Item',
            field: u.field || 'credits',
            previousValue: u.oldValue,
            newValue: u.newValue,
            reason: trimmedReason,
            timestamp: new Date(),
          });
        });
      }

      if (featurePricing && typeof featurePricing === 'object') {
        config.featurePricing = featurePricing;
      }

      config.lastUpdatedBy = adminName;
      config.lastUpdatedByRole = adminRole;
      await config.save();

      return res.json({
        success: true,
        message: 'Pricing configuration updated successfully and recorded in audit log.',
        data: config,
      });
    } catch (err) {
      console.error('Error updating pricing config:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update pricing configuration',
        error: err.message,
      });
    }
  },

  /**
   * 4f. Global Payment & Credits Kill Switch (Super Admin Only)
   * POST /api/credits/pricing/toggle-payments
   */
  async togglePaymentsCredits(req, res) {
    try {
      const admin = req.user;
      const { enabled, reason } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'The "enabled" field is required and must be a boolean (true or false).',
        });
      }

      let config = await CreditPricingConfig.findOne({ key: 'default' });
      if (!config) {
        config = new CreditPricingConfig({
          key: 'default',
          creditValueInr: BASELINE_PRICING.creditValueInr,
          initialPromotionalCredits: BASELINE_PRICING.initialPromotionalCredits,
          referralRewardCredits: BASELINE_PRICING.referralRewardCredits,
          candidatePlans: BASELINE_PRICING.candidatePlans,
          companyPlans: BASELINE_PRICING.companyPlans,
          startupPlans: BASELINE_PRICING.startupPlans,
          institutionPlans: BASELINE_PRICING.institutionPlans,
          subscriptionPlans: BASELINE_PRICING.subscriptionPlans,
          auditLog: [],
        });
      }

      const previousValue = config.paymentsCreditsEnabled !== false;
      const newValue = enabled;
      const adminName = admin.displayName || admin.username || 'Super Admin';
      const adminRole = admin.role || 'Super Admin';
      const adminId = admin.id || admin._id || 'SA-001';
      const changeReason = (reason || '').trim() || (newValue ? 'Payments & credits re-enabled platform-wide' : 'Payments & credits disabled platform-wide');

      config.paymentsCreditsEnabled = newValue;
      if (!newValue) {
        config.paymentsCreditsDisabledReason = changeReason;
        config.paymentsCreditsDisabledAt = new Date();
        config.paymentsCreditsDisabledBy = adminName;
      } else {
        config.paymentsCreditsDisabledReason = '';
        config.paymentsCreditsDisabledAt = null;
        config.paymentsCreditsDisabledBy = '';
      }

      // Record in authoritative audit trail
      config.auditLog.push({
        adminId: String(adminId),
        adminName,
        adminRole,
        itemKey: 'paymentsCreditsEnabled',
        itemName: 'Global Payments & Credits Kill Switch',
        field: 'paymentsCreditsEnabled',
        previousValue,
        newValue,
        reason: changeReason,
        timestamp: new Date(),
      });

      config.lastUpdatedBy = adminName;
      config.lastUpdatedByRole = adminRole;
      await config.save();

      return res.json({
        success: true,
        message: newValue
          ? 'Payments and credits have been successfully enabled platform-wide.'
          : 'Payments and credits have been temporarily disabled platform-wide.',
        data: {
          paymentsCreditsEnabled: config.paymentsCreditsEnabled,
          paymentsCreditsDisabledReason: config.paymentsCreditsDisabledReason,
          paymentsCreditsDisabledAt: config.paymentsCreditsDisabledAt,
          paymentsCreditsDisabledBy: config.paymentsCreditsDisabledBy,
          updatedAt: config.updatedAt,
        },
      });
    } catch (err) {
      console.error('Error toggling payments & credits:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to update global payments & credits setting',
        error: err.message,
      });
    }
  },

  /**
   * 6. Global Transaction Ledger across All Accounts
   * GET /api/credits/transactions?page=&limit=&type=&status=&search=
   */
  async getTransactions(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 15));
      const skip = (page - 1) * limit;

      const filter = {};
      if (req.query.type && req.query.type !== 'All') {
        filter.type = req.query.type;
      }
      if (req.query.status && req.query.status !== 'All') {
        filter.status = req.query.status;
      }
      if (req.query.search) {
        filter.reason = { $regex: req.query.search.trim(), $options: 'i' };
      }
      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
        if (req.query.endDate) filter.createdAt.$lte = new Date(req.query.endDate);
      }

      const total = await CreditTransaction.countDocuments(filter);
      const transactions = await CreditTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName username email displayName role')
        .populate('orgId', 'name entity')
        .lean();

      return res.json({
        success: true,
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (err) {
      console.error('Error fetching global credit transactions:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction ledger',
        error: err.message,
      });
    }
  },
};

export default creditController;
