import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Users ────────────────────────────────────────────

  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const managerPassword = await bcrypt.hash("Manager@123", 12);

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

  console.log("Created users:", { admin: admin.email, manager: manager.email });

  // ─── Room Types ───────────────────────────────────────

  const standard = await prisma.roomType.upsert({
    where: { slug: "standard" },
    update: {},
    create: {
      name: "Standard",
      slug: "standard",
      description:
        "Comfortable and well-appointed room with all essential amenities for a pleasant stay.",
      capacity: 2,
      amenities: ["WiFi", "AC", "TV", "Mini-fridge"],
      basePrice: 80,
      weekendMultiplier: 1.0,
      images: [],
    },
  });

  const deluxe = await prisma.roomType.upsert({
    where: { slug: "deluxe" },
    update: {},
    create: {
      name: "Deluxe",
      slug: "deluxe",
      description:
        "Spacious and elegantly furnished room with premium amenities and stunning city views.",
      capacity: 2,
      amenities: [
        "WiFi",
        "AC",
        "Smart TV",
        "Mini-bar",
        "City view",
        "Bathtub",
      ],
      basePrice: 150,
      weekendMultiplier: 1.2,
      images: [],
    },
  });

  const suite = await prisma.roomType.upsert({
    where: { slug: "presidential-suite" },
    update: {},
    create: {
      name: "Presidential Suite",
      slug: "presidential-suite",
      description:
        "The ultimate luxury experience with exclusive amenities, private terrace, and dedicated butler service.",
      capacity: 4,
      amenities: [
        "WiFi",
        "AC",
        "Smart TV",
        "Full bar",
        "Private terrace",
        "Jacuzzi",
        "Butler service",
      ],
      basePrice: 400,
      weekendMultiplier: 1.5,
      images: [],
    },
  });

  console.log("Created room types:", {
    standard: standard.name,
    deluxe: deluxe.name,
    suite: suite.name,
  });

  // ─── Rooms ────────────────────────────────────────────

  const roomConfigs = [
    { number: "101", floor: 1, roomTypeId: standard.id },
    { number: "102", floor: 1, roomTypeId: standard.id },
    { number: "103", floor: 1, roomTypeId: standard.id },
    { number: "104", floor: 1, roomTypeId: standard.id },
    { number: "201", floor: 2, roomTypeId: deluxe.id },
    { number: "202", floor: 2, roomTypeId: deluxe.id },
    { number: "203", floor: 2, roomTypeId: deluxe.id },
    { number: "204", floor: 2, roomTypeId: deluxe.id },
    { number: "301", floor: 3, roomTypeId: suite.id },
    { number: "302", floor: 3, roomTypeId: suite.id },
    { number: "303", floor: 3, roomTypeId: suite.id },
    { number: "304", floor: 3, roomTypeId: suite.id },
  ];

  for (const config of roomConfigs) {
    await prisma.room.upsert({
      where: { number: config.number },
      update: {},
      create: config,
    });
  }

  console.log("Created 12 rooms (101-104, 201-204, 301-304)");

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
