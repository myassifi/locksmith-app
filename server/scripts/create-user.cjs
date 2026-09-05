const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  if (!email || !email.includes('@') || !password || password.length < 12 || Buffer.byteLength(password) > 72) {
    throw new Error('Set OWNER_EMAIL and OWNER_PASSWORD (12 characters minimum, 72 bytes maximum) in the environment.');
  }
  if (await prisma.user.findUnique({ where: { email } })) throw new Error('Account already exists. Use Settings to change its password.');
  await prisma.user.create({ data: { email, password: await bcrypt.hash(password, 12), businessName: process.env.BUSINESS_NAME || 'Heat Wave Locksmith' } });
  console.log('Account created. Remove OWNER_PASSWORD from the environment after setup.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
