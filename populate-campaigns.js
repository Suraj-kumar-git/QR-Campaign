import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// Campaign data from the JSON file
const campaignData = [
  {
    "name": "Festive Mega Sale 2025",
    "category": "Promo",
    "description": "Flat 40% off on ethnic wear for Diwali week.",
    "target_url": "https://retailhub.com/festive-sale"
  },
  {
    "name": "Foodies Feedback Drive",
    "category": "Feedback",
    "description": "Share your dining experience & win free dessert vouchers.",
    "target_url": "https://foodiesdelight.com/feedback"
  },
  {
    "name": "Clean India NGO Donation",
    "category": "Donation",
    "description": "Support our cleanliness drive by donating Rs.100+.",
    "target_url": "https://ngohelp.org/donate-clean-india"
  },
  {
    "name": "College Tech Fest Registration",
    "category": "Contest",
    "description": "Register online for InnovateX 2025 hackathon.",
    "target_url": "https://innovatex.com/register"
  },
  {
    "name": "Cafe Digital Menu",
    "category": "Info",
    "description": "Scan to see the updated menu with seasonal specials.",
    "target_url": "https://cafebrew.com/menu"
  },
  {
    "name": "Startup Hiring 2025",
    "category": "Careers",
    "description": "Apply for software engineer roles at our startup.",
    "target_url": "https://startupjobs.com/apply"
  },
  {
    "name": "Blood Donation Camp",
    "category": "Donation",
    "description": "Join our monthly blood donation initiative.",
    "target_url": "https://healthngo.org/blood-camp"
  },
  {
    "name": "Metro Card Recharge",
    "category": "Payment",
    "description": "Recharge your metro card instantly via QR.",
    "target_url": "https://citymetro.com/recharge"
  },
  {
    "name": "Concert Tickets – Coldplay",
    "category": "Event",
    "description": "Book tickets for Coldplay live concert.",
    "target_url": "https://musicworld.com/coldplay2025"
  },
  {
    "name": "Eco Shop Green Products",
    "category": "Promo",
    "description": "Exclusive offers on eco-friendly products.",
    "target_url": "https://ecoshop.com/green-deals"
  },
  {
    "name": "Hotel Room Service",
    "category": "Service",
    "description": "Order room service meals directly from your phone.",
    "target_url": "https://hotelstay.com/roomservice"
  },
  {
    "name": "Tourist City Guide",
    "category": "Info",
    "description": "Explore top attractions and hidden gems in the city.",
    "target_url": "https://citytour.com/guide"
  },
  {
    "name": "Fitness Club Membership",
    "category": "Promo",
    "description": "Get 20% discount on new gym memberships.",
    "target_url": "https://fitlife.com/join"
  },
  {
    "name": "Student Scholarship Form",
    "category": "Info",
    "description": "Apply for our annual scholarship program.",
    "target_url": "https://eduhelp.org/scholarship2025"
  },
  {
    "name": "Restaurant Loyalty Program",
    "category": "Promo",
    "description": "Earn points for every meal and redeem for rewards.",
    "target_url": "https://foodiesdelight.com/loyalty"
  },
  {
    "name": "Startup Product Launch",
    "category": "Event",
    "description": "Attend the launch of our AI-powered assistant.",
    "target_url": "https://techlaunch.com/event"
  },
  {
    "name": "Online Grocery Express",
    "category": "Promo",
    "description": "Flat Rs. 100 cashback on your first grocery order.",
    "target_url": "https://grocerfast.com/offer"
  },
  {
    "name": "Mental Health Helpline",
    "category": "Info",
    "description": "Access free counseling and mental wellness resources.",
    "target_url": "https://wellnesscare.org/helpline"
  },
  {
    "name": "Clothing Brand Clearance Sale",
    "category": "Promo",
    "description": "End of season clearance on winter wear.",
    "target_url": "https://stylehub.com/clearance"
  },
  {
    "name": "Startup Investor Pitch",
    "category": "Event",
    "description": "Register to attend our VC investor pitch session.",
    "target_url": "https://foundersclub.com/pitch"
  },
  {
    "name": "Pet Care Donations",
    "category": "Donation",
    "description": "Help stray animals with your contribution.",
    "target_url": "https://petngo.org/donate"
  },
  {
    "name": "Electric Vehicle Charging",
    "category": "Service",
    "description": "Locate nearest EV charging stations.",
    "target_url": "https://evcharge.com/stations"
  },
  {
    "name": "Food Festival 2025",
    "category": "Event",
    "description": "Join the city's biggest street food festival.",
    "target_url": "https://foodfest.com/tickets"
  },
  {
    "name": "Real Estate Open House",
    "category": "Info",
    "description": "Virtual tour of premium 3BHK apartments.",
    "target_url": "https://realtorhub.com/openhouse"
  },
  {
    "name": "College Admission Portal",
    "category": "Info",
    "description": "Check application deadlines and apply online.",
    "target_url": "https://university2025.com/admissions"
  },
  {
    "name": "Travel Insurance Signup",
    "category": "Service",
    "description": "Get instant coverage for domestic & international trips.",
    "target_url": "https://securetrip.com/insurance"
  },
  {
    "name": "Mobile Wallet Cashback",
    "category": "Payment",
    "description": "Pay with QR and get up to Rs.50 cashback.",
    "target_url": "https://walletpay.com/cashback"
  },
  {
    "name": "E-learning Course Access",
    "category": "Info",
    "description": "Access free AI and coding courses online.",
    "target_url": "https://elearnhub.com/courses"
  },
  {
    "name": "Festival Donation Drive",
    "category": "Donation",
    "description": "Contribute to provide food and clothes for the needy.",
    "target_url": "https://ngohelp.org/festival-donation"
  }
];

// Active user IDs as provided
const activeUserIds = [
  "0699bfa0-f219-4622-a6e1-415482917de0",
  "d16d5947-7f9b-404b-a37a-1c3070d0e8ff", 
  "ed9bd57b-d765-4ddd-ae9e-fab82c3d3761",
  "4d5c74b4-d3dc-419a-ac24-19bf1231669d"
];

// Function to get random element from array
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Function to generate random integer between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate random date between now and future
function generateRandomDate(daysFromNow, maxDaysFromStart) {
  const now = new Date();
  const startDate = new Date(now.getTime() + (daysFromNow * 24 * 60 * 60 * 1000));
  const endDate = new Date(startDate.getTime() + (maxDaysFromStart * 24 * 60 * 60 * 1000));
  return { startDate, endDate };
}

// Generate campaign objects with random properties
const campaignsToCreate = campaignData.map(campaign => {
  const { startDate, endDate } = generateRandomDate(
    randomInt(-30, 30), // Start date can be 30 days ago to 30 days from now
    randomInt(7, 90)    // Campaign duration between 7-90 days
  );

  return {
    id: randomUUID(),
    name: campaign.name,
    category: campaign.category,
    description: campaign.description,
    scanCount: 0,
    scanLimit: Math.random() < 0.7 ? randomInt(50, 1000) : null, // 70% chance of having a scan limit
    status: 'active',
    startDate,
    endDate,
    createdBy: getRandomElement(activeUserIds),
    createdAt: new Date(Date.now() - randomInt(0, 30 * 24 * 60 * 60 * 1000)), // Created 0-30 days ago
    updatedAt: new Date(),
    imageUrl: null,
    iconPath: null, // As requested
    borderStyle: Math.random() < 0.5 ? 'thick' : 'none', // 50% chance of thick border
    targetUrl: campaign.target_url
  };
});

console.log('Generated campaigns:', JSON.stringify(campaignsToCreate, null, 2));