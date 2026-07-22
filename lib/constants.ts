
import { SubscriptionTier, Profile, VerificationTier } from './types';

export const TIERS: { id: SubscriptionTier; name: string; price: number; limit: number; features: string[] }[] = [
  { id: 'basic', name: 'Starter Pack', price: 900, limit: 1, features: ['1 Token', '1 Confirmed Job', 'Instant Access'] },
  { id: 'lite', name: 'Standard Pack', price: 3999, limit: 5, features: ['5 Tokens', '5 Confirmed Jobs', 'Volume Discount'] },
  { id: 'standard', name: 'Pro Pack', price: 6999, limit: 10, features: ['10 Tokens', 'Best Value', 'Invoice Generator'] },
  { id: 'pro', name: 'Power Pack', price: 9999, limit: 15, features: ['15 Tokens', 'Maximum Value', 'Premium Alerts'] }
];

export const getTierLimit = (tier?: SubscriptionTier) => {
  const t = TIERS.find(t => t.id === (tier || 'basic'));
  return t ? t.limit : 2;
};

export const CATEGORY_MAP: Record<string, string[]> = {
  "Construction, Engineering & Real Estate": [
    "Lead Architect", "Draftsman / CAD Operator", "Interior Designer", "3D Visualizer / Renderer", "Civil Engineer", "Structural Engineer", "Electrical Engineer (M&E)", "Mechanical Engineer (HVAC)", "Geotechnical Engineer", "Project Manager", "Quantity Surveyor (QS)", "Site Supervisor / Foreman", "Safety Inspector (HSE)", "Estate Surveyor & Valuer", "Property Manager", "Real Estate Agent / Realtor", "Land Surveyor",
    "Bricklayer / Mason", "Iron Bender / Steel Fixer", "Welder (Arc/Argon)", "Carpenter (Roofing/Formwork)", "Concreter", "Tiler", "POP Installer", "Painter & Decorator", "Glazier (Glass work)", "Aluminum Profiler", "Furniture Maker / Joiner", "Plumber", "Electrician", "AC & Fridge Technician", "Solar / Inverter Installer",
    "Site Laborer", "Digger / Excavator", "Demolition Worker", "Site Cleaner", "Security Guard (Site)", "Water Supplier (Meruwa)"
  ],
  "Technology, Data & Digital Services": [
    "Full Stack Developer", "Frontend Developer", "Backend Developer", "Mobile App Developer", "UI/UX Designer", "DevOps Engineer", "Data Analyst", "Data Scientist", "AI/Machine Learning Specialist", "Database Administrator", "Cybersecurity Analyst", "Network Administrator", "Cloud Architect",
    "SEO Specialist", "Social Media Manager", "Digital Ads Expert (PPC)", "Email Marketer", "Copywriter", "Technical Writer", "Blogger / Ghostwriter", "Scriptwriter",
    "Graphic Designer", "Illustrator", "Video Editor", "Animator (2D/3D)", "Motion Graphics Artist", "Voiceover Artist", "Audio Engineer", "Music Producer",
    "Virtual Assistant (VA)", "Data Entry Clerk", "Transcriptionist", "Online Researcher", "Chat Support Agent"
  ],
  "Business, Finance & Legal": [
    "Chartered Accountant", "Financial Analyst", "Tax Consultant", "Auditor", "Investment Banker", "Corporate Lawyer", "Property Lawyer", "Legal Drafter", "Compliance Officer", "Management Consultant", "Business Plan Writer", "HR Manager / Recruiter", "Public Relations (PR) Manager",
    "Office Manager", "Secretary / Receptionist", "Bookkeeper", "Payroll Clerk", "Sales Representative", "Business Development Executive", "Telesales Agent"
  ],
  "Professional Services, Repairs & Maintenance": [
    "Car Mechanic", "Auto-Electrician (Rewire)", "Vulcanizer", "Panel Beater", "Car Painter / Sprayer", "Truck Mechanic", "Generator Mechanic",
    "Phone Repair Technician", "Laptop Repair Technician", "TV / Radio Repair", "Washing Machine / Microwave Repair",
    "Tailor / Fashion Designer", "Seamstress", "Shoe Maker / Cobbler", "Makeup Artist (MUA)", "Hairdresser / Stylist", "Barber", "Nail Technician", "Spa Therapist / Masseuse"
  ],
  "Domestic, Personal & Errands": [
    "Residential Cleaner", "Deep Cleaning Specialist", "Post-Construction Cleaner", "Fumigator / Pest Control", "Nanny / Babysitter", "Elderly Caregiver", "Cook / Chef", "Housekeeper / Steward",
    "Driver (Personal)", "Truck Driver (Haulage)", "Dispatch Rider", "Personal Shopper", "Queue Stander", "Laundry / Dry Cleaning", "Car Wash (Mobile/Station)"
  ],
  "Education, Training & Coaching": [
    "Math / Science Tutor", "English / Language Tutor", "Exam Prep (JAMB/WAEC/IELTS)", "Thesis / Project Assistant", "Research Analyst",
    "Music Instructor", "Art Teacher", "Coding Instructor", "Fitness Trainer / Gym Instructor", "Life Coach", "Dietitian / Nutritionist"
  ],
  "Events, Hospitality & Entertainment": [
    "Event Planner", "Wedding Coordinator", "Usher / Hostess", "Event Decorator", "Photographer", "Videographer", "DJ", "MC (Master of Ceremonies)", "Caterer",
    "Musician / Band", "Comedian", "Dancer", "Model"
  ],
  "Agriculture & Farming": [
    "Agronomist", "Veterinary Doctor", "Farm Manager", "Soil Scientist", "Farm Supervisor", "Tractor Operator", "Farmhand", "Poultry Attendant", "Fishery Attendant"
  ],
  "Manufacturing & Industrial": [
    "Machine Operator", "Assembly Line Worker", "Quality Control Inspector", "Industrial Sewer", "Pattern Maker"
  ]
};

export const getWorkerTier = (profile?: Profile): VerificationTier => {
    if (!profile || !profile.is_verified) return 'none';
    
    const imageCount = profile.portfolio_images?.length || 0;
    const ratingCount = profile.worker_rating_count || 0;
    const avgRating = profile.worker_avg_rating || 0;

    if (ratingCount >= 10 && avgRating >= 4.5 && imageCount >= 3) {
        return 'gold';
    }
    
    if (imageCount >= 3 && ratingCount >= 2 && avgRating >= 4.0) {
        return 'silver';
    }

    return 'blue';
};
