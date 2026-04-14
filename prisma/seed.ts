import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // ─── Users ────────────────────────────────────────────

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const managerPassword = await bcrypt.hash("Manager@123", 12);
  const staffPassword = await bcrypt.hash("Staff@123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@stayhaven.com" },
    update: {},
    create: {
      email: "admin@stayhaven.com",
      passwordHash: adminPassword,
      firstName: "System",
      lastName: "Admin",
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@stayhaven.com" },
    update: {},
    create: {
      email: "manager@stayhaven.com",
      passwordHash: managerPassword,
      firstName: "Hotel",
      lastName: "Manager",
      role: "MANAGER",
      staffProfile: {
        create: {
          staffNumber: "STF-001",
          department: "MANAGEMENT",
          hiredAt: new Date(),
        },
      },
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@stayhaven.com" },
    update: {},
    create: {
      email: "staff@stayhaven.com",
      passwordHash: staffPassword,
      firstName: "Front",
      lastName: "Desk",
      role: "STAFF",
      staffProfile: {
        create: {
          staffNumber: "STF-002",
          department: "FRONT_DESK",
          isOnDuty: true,
          hiredAt: new Date(),
        },
      },
    },
  });

  console.log("Created users:", { admin: admin.email, manager: manager.email, staff: staff.email });

  // ─── Room Types ───────────────────────────────────────

  const roomTypeData = [
    {
      name: "Standard",
      slug: "standard",
      tag: "Best Value",
      description: "Comfortable and well-appointed room with all essential amenities for a pleasant stay.",
      capacity: 2,
      amenities: ["WiFi", "AC", "TV", "Mini-fridge"],
      basePrice: 80,
      weekendMultiplier: 1.0,
      image: "/room_2.jpeg",
    },
    {
      name: "Superior",
      slug: "superior",
      tag: "Business Friendly",
      description: "A step above standard with extra space, upgraded furnishings, and a work desk for business travelers.",
      capacity: 2,
      amenities: ["WiFi", "AC", "Smart TV", "Mini-fridge", "Work desk", "Coffee maker"],
      basePrice: 110,
      weekendMultiplier: 1.1,
      image: "/room_3.jpeg",
    },
    {
      name: "Deluxe",
      slug: "deluxe",
      tag: "Most Popular",
      description: "Spacious and elegantly furnished room with premium amenities and stunning city views.",
      capacity: 2,
      amenities: ["WiFi", "AC", "Smart TV", "Mini-bar", "City view", "Bathtub"],
      basePrice: 150,
      weekendMultiplier: 1.2,
      image: "/room_4.jpg",
    },
    {
      name: "Premium",
      slug: "premium",
      tag: "Garden View",
      description: "Luxurious room featuring a king-size bed, rain shower, and a private balcony overlooking the garden.",
      capacity: 2,
      amenities: ["WiFi", "AC", "Smart TV", "Mini-bar", "Balcony", "Rain shower", "Bathrobes"],
      basePrice: 200,
      weekendMultiplier: 1.2,
      image: "/room_5.jpeg",
    },
    {
      name: "Junior Suite",
      slug: "junior-suite",
      tag: "Extended Stay",
      description: "Open-plan suite with a separate sitting area, ideal for extended stays and unwinding in style.",
      capacity: 3,
      amenities: ["WiFi", "AC", "Smart TV", "Mini-bar", "Sitting area", "Bathtub", "City view"],
      basePrice: 250,
      weekendMultiplier: 1.3,
      image: "/room_6.jpeg",
    },
    {
      name: "Executive Suite",
      slug: "executive-suite",
      tag: "Lounge Access",
      description: "Separate living room and bedroom with executive lounge access and complimentary breakfast.",
      capacity: 3,
      amenities: ["WiFi", "AC", "Smart TV", "Full bar", "Lounge access", "Bathtub", "Work desk", "Breakfast included"],
      basePrice: 320,
      weekendMultiplier: 1.3,
      image: "/room_7.jpeg",
    },
    {
      name: "Presidential Suite",
      slug: "presidential-suite",
      tag: "Ultimate Luxury",
      description: "The ultimate luxury experience with exclusive amenities, private terrace, and dedicated butler service.",
      capacity: 4,
      amenities: ["WiFi", "AC", "Smart TV", "Full bar", "Private terrace", "Jacuzzi", "Butler service"],
      basePrice: 400,
      weekendMultiplier: 1.5,
      image: "/room_8.jpeg",
    },
    {
      name: "Penthouse",
      slug: "penthouse",
      tag: "Top Floor",
      description: "Top-floor penthouse with panoramic skyline views, private dining area, and a grand living space.",
      capacity: 4,
      amenities: ["WiFi", "AC", "Smart TV", "Full bar", "Panoramic view", "Private dining", "Jacuzzi", "Butler service", "Grand piano"],
      basePrice: 600,
      weekendMultiplier: 1.5,
      image: "/room_9.jpeg",
    },
    {
      name: "Family Room",
      slug: "family-room",
      tag: "Kid Friendly",
      description: "Thoughtfully designed for families with connecting rooms, kid-friendly amenities, and extra beds.",
      capacity: 4,
      amenities: ["WiFi", "AC", "TV", "Mini-fridge", "Extra beds", "Kid-friendly", "Connecting rooms"],
      basePrice: 180,
      weekendMultiplier: 1.1,
      image: "/room_10.jpeg",
    },
    {
      name: "Twin Room",
      slug: "twin-room",
      tag: "Shared Stay",
      description: "Two single beds in a well-furnished room — perfect for friends or colleagues traveling together.",
      capacity: 2,
      amenities: ["WiFi", "AC", "TV", "Mini-fridge", "Work desk"],
      basePrice: 90,
      weekendMultiplier: 1.0,
      image: "/room_11.jpeg",
    },
    {
      name: "Honeymoon Suite",
      slug: "honeymoon-suite",
      tag: "Romantic Escape",
      description: "Romantic retreat with rose petal turndown, champagne on arrival, couples spa access, and a sunset balcony.",
      capacity: 2,
      amenities: ["WiFi", "AC", "Smart TV", "Mini-bar", "Balcony", "Jacuzzi", "Couples spa", "Champagne"],
      basePrice: 350,
      weekendMultiplier: 1.4,
      image: "/room_12.jpeg",
    },
    {
      name: "Accessible Room",
      slug: "accessible-room",
      tag: "Fully Accessible",
      description: "Fully accessible room with wider doorways, roll-in shower, grab bars, and lowered fixtures for comfort.",
      capacity: 2,
      amenities: ["WiFi", "AC", "TV", "Mini-fridge", "Roll-in shower", "Grab bars", "Emergency pull cord"],
      basePrice: 85,
      weekendMultiplier: 1.0,
      image: "/room_13.jpeg",
    },
  ];

  const createdTypes: Array<{ id: string; slug: string; name: string }> = [];
  for (const rt of roomTypeData) {
    const created = await prisma.roomType.upsert({
      where: { slug: rt.slug },
      update: { tag: rt.tag, image: rt.image },
      create: { ...rt, images: [] },
    });
    createdTypes.push(created);
  }

  console.log(`Created ${createdTypes.length} room types`);

  // ─── Rooms ────────────────────────────────────────────

  // Map: floor 1 = Standard, Superior, Twin, Accessible (budget tier)
  // floor 2 = Deluxe, Premium, Family (mid tier)
  // floor 3 = Junior Suite, Executive Suite, Honeymoon Suite (upper tier)
  // floor 4 = Presidential Suite, Penthouse (top tier)

  const typeBySlug = (slug: string) => createdTypes.find(t => t.slug === slug)!;

  const roomConfigs = [
    // Floor 1
    { number: "101", floor: 1, roomTypeId: typeBySlug("standard").id },
    { number: "102", floor: 1, roomTypeId: typeBySlug("standard").id },
    { number: "103", floor: 1, roomTypeId: typeBySlug("superior").id },
    { number: "104", floor: 1, roomTypeId: typeBySlug("superior").id },
    { number: "105", floor: 1, roomTypeId: typeBySlug("twin-room").id },
    { number: "106", floor: 1, roomTypeId: typeBySlug("accessible-room").id },
    // Floor 2
    { number: "201", floor: 2, roomTypeId: typeBySlug("deluxe").id },
    { number: "202", floor: 2, roomTypeId: typeBySlug("deluxe").id },
    { number: "203", floor: 2, roomTypeId: typeBySlug("premium").id },
    { number: "204", floor: 2, roomTypeId: typeBySlug("premium").id },
    { number: "205", floor: 2, roomTypeId: typeBySlug("family-room").id },
    { number: "206", floor: 2, roomTypeId: typeBySlug("family-room").id },
    // Floor 3
    { number: "301", floor: 3, roomTypeId: typeBySlug("junior-suite").id },
    { number: "302", floor: 3, roomTypeId: typeBySlug("junior-suite").id },
    { number: "303", floor: 3, roomTypeId: typeBySlug("executive-suite").id },
    { number: "304", floor: 3, roomTypeId: typeBySlug("executive-suite").id },
    { number: "305", floor: 3, roomTypeId: typeBySlug("honeymoon-suite").id },
    { number: "306", floor: 3, roomTypeId: typeBySlug("honeymoon-suite").id },
    // Floor 4
    { number: "401", floor: 4, roomTypeId: typeBySlug("presidential-suite").id },
    { number: "402", floor: 4, roomTypeId: typeBySlug("presidential-suite").id },
    { number: "403", floor: 4, roomTypeId: typeBySlug("penthouse").id },
    { number: "404", floor: 4, roomTypeId: typeBySlug("penthouse").id },
  ];

  for (const config of roomConfigs) {
    await prisma.room.upsert({
      where: { number: config.number },
      update: {},
      create: config,
    });
  }

  console.log(`Created ${roomConfigs.length} rooms across 4 floors`);

  // ─── Service Menu Items ───────────────────────────────

  const menuItems = [
    {
      name: "Classic Burger",
      description:
        "Juicy beef patty with fresh lettuce, tomato, and our special sauce",
      price: 4500,
      category: "FOOD" as const,
    },
    {
      name: "Pasta Alfredo",
      description: "Creamy fettuccine alfredo with garlic bread",
      price: 5500,
      category: "FOOD" as const,
    },
    {
      name: "Full English Breakfast",
      description:
        "Eggs, bacon, sausage, beans, toast, and grilled tomato",
      price: 3500,
      category: "FOOD" as const,
    },
    {
      name: "Fresh Orange Juice",
      description: "Freshly squeezed orange juice",
      price: 1500,
      category: "BEVERAGE" as const,
    },
    {
      name: "Cocktail of the Day",
      description: "Ask your server for today's special cocktail",
      price: 3000,
      category: "BEVERAGE" as const,
    },
    {
      name: "Premium Coffee",
      description: "Freshly brewed premium Arabica coffee",
      price: 1200,
      category: "BEVERAGE" as const,
    },
  ];

  const existingMenuItems = await prisma.serviceMenuItem.count();
  if (existingMenuItems === 0) {
    await prisma.serviceMenuItem.createMany({ data: menuItems });
  }

  console.log("Created 6 service menu items");

  // ─── Hotel Services ───────────────────────────────────

  const hotelServices = [
    {
      name: "Airport Pickup",
      description:
        "Comfortable airport transfer service with professional driver",
      price: 15000,
      category: "TRANSPORT" as const,
    },
    {
      name: "Spa Treatment",
      description:
        "Relaxing full-body massage and spa treatment by certified therapists",
      price: 25000,
      category: "SPA" as const,
    },
    {
      name: "Laundry Service",
      description:
        "Professional laundry and dry cleaning with same-day delivery",
      price: 5000,
      category: "LAUNDRY" as const,
    },
    {
      name: "Restaurant Reservation",
      description:
        "Reserve a table at our award-winning in-house restaurant",
      price: 0,
      category: "OTHER" as const,
    },
  ];

  const existingServices = await prisma.hotelService.count();
  if (existingServices === 0) {
    await prisma.hotelService.createMany({ data: hotelServices });
  }

  console.log("Created 4 hotel services");
  console.log("Seeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
