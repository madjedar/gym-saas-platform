const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed with bcrypt authentication...');

  const defaultHashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create or Find Demo Gym
  const gym = await prisma.gym.upsert({
    where: { slug: 'atlas-fitness-alger' },
    update: {},
    create: {
      name: 'Atlas Fitness Club - Alger Centre',
      slug: 'atlas-fitness-alger',
      address: '14 Boulevard Didouche Mourad, Alger',
      phone: '0550 12 34 56',
      subscriptionTier: 'ENTERPRISE',
    },
  });

  console.log(`✅ Gym ready: ${gym.name} (${gym.id})`);

  // 2. Create Gym Owner User
  const owner = await prisma.user.upsert({
    where: { email: 'owner@atlasgym.dz' },
    update: { 
      gymId: gym.id,
      passwordHash: defaultHashedPassword
    },
    create: {
      gymId: gym.id,
      email: 'owner@atlasgym.dz',
      firstName: 'Karim',
      lastName: 'Brahimi',
      phone: '0661 98 76 54',
      role: 'GYM_OWNER',
      passwordHash: defaultHashedPassword,
    },
  });

  console.log(`✅ Gym Owner ready: ${owner.email}`);

  // 3. Create Subscription Plans
  const planData = [
    { name: 'Pass Mensuel (1 Mois)', durationInDays: 30, price: 3500 },
    { name: 'Pass Trimestriel (3 Mois)', durationInDays: 90, price: 9500 },
    { name: 'Pass Semestriel (6 Mois)', durationInDays: 180, price: 17500 },
    { name: 'Pass Annuel VIP (12 Mois)', durationInDays: 365, price: 32000 },
  ];

  const plans = [];
  for (const p of planData) {
    const existing = await prisma.plan.findFirst({
      where: { gymId: gym.id, name: p.name }
    });
    if (!existing) {
      const created = await prisma.plan.create({
        data: {
          gymId: gym.id,
          name: p.name,
          durationInDays: p.durationInDays,
          price: p.price,
          isActive: true
        }
      });
      plans.push(created);
    } else {
      plans.push(existing);
    }
  }
  console.log(`✅ Subscription plans ready (${plans.length} plans)`);

  // 4. Create Products for POS
  const productData = [
    { name: 'Optimum Nutrition Gold Standard Whey 2.27kg', category: 'Suppléments', price: 14500, stockQuantity: 24 },
    { name: 'Creatine Monohydrate Creapure 300g', category: 'Suppléments', price: 4200, stockQuantity: 45 },
    { name: 'C4 Original Pre-Workout 30 Servings', category: 'Suppléments', price: 5800, stockQuantity: 18 },
    { name: 'BCAA 2:1:1 Xtend Recovery 30 Servings', category: 'Suppléments', price: 4900, stockQuantity: 30 },
    { name: 'Sangles de Tirage Professionnelles', category: 'Accessoires', price: 1500, stockQuantity: 50 },
    { name: 'Ceinture de Force Cuir Véritable', category: 'Accessoires', price: 6500, stockQuantity: 12 },
    { name: 'Shaker Isotherme Inox GymOS 750ml', category: 'Accessoires', price: 2200, stockQuantity: 60 },
    { name: 'Serviette Microfibre Entraînement', category: 'Accessoires', price: 900, stockQuantity: 80 },
  ];

  for (const prod of productData) {
    const existing = await prisma.product.findFirst({
      where: { gymId: gym.id, name: prod.name }
    });
    if (!existing) {
      await prisma.product.create({
        data: {
          gymId: gym.id,
          name: prod.name,
          category: prod.category,
          price: prod.price,
          stockQuantity: prod.stockQuantity
        }
      });
    }
  }
  console.log(`✅ POS Products created (${productData.length} items)`);

  // 5. Create Sample Members with Subscriptions & Attendance
  const membersData = [
    { firstName: 'Yacine', lastName: 'Benali', email: 'yacine.benali@gmail.com', phone: '0555 11 22 33', active: true, planIndex: 0 },
    { firstName: 'Amina', lastName: 'Mansouri', email: 'amina.m@gmail.com', phone: '0662 44 55 66', active: true, planIndex: 1 },
    { firstName: 'Sofiane', lastName: 'Derradji', email: 'sofiane.d@gmail.com', phone: '0770 77 88 99', active: true, planIndex: 3 },
    { firstName: 'Mehdi', lastName: 'Larbi', email: 'mehdi.larbi@gmail.com', phone: '0551 23 45 67', active: false, planIndex: 0 },
    { firstName: 'Rania', lastName: 'Boualem', email: 'rania.b@gmail.com', phone: '0660 32 65 98', active: true, planIndex: 2 },
  ];

  for (const m of membersData) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { 
        gymId: gym.id,
        passwordHash: defaultHashedPassword
      },
      create: {
        gymId: gym.id,
        email: m.email,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        role: 'MEMBER',
        passwordHash: defaultHashedPassword,
      },
    });

    const chosenPlan = plans[m.planIndex] || plans[0];
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id, gymId: gym.id }
    });

    if (!existingSub && chosenPlan) {
      const startDate = new Date();
      const endDate = new Date();
      if (m.active) {
        endDate.setDate(startDate.getDate() + chosenPlan.durationInDays);
      } else {
        startDate.setDate(startDate.getDate() - 40);
        endDate.setDate(startDate.getDate() + 30); // expired 10 days ago
      }

      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: chosenPlan.id,
          gymId: gym.id,
          startDate,
          endDate,
          status: m.active ? 'ACTIVE' : 'EXPIRED',
          paymentStatus: 'PAID'
        }
      });
    }

    // Add attendance log
    const existingLog = await prisma.attendanceLog.findFirst({
      where: { userId: user.id, gymId: gym.id }
    });
    if (!existingLog) {
      await prisma.attendanceLog.create({
        data: {
          userId: user.id,
          gymId: gym.id,
          method: 'QR',
          checkInTime: new Date(Date.now() - Math.floor(Math.random() * 3600000 * 5))
        }
      });
    }
  }

  console.log(`✅ Sample members and subscriptions ready with bcrypt password hashes`);
  console.log('🎉 Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
