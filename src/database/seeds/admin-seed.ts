/**
 * Admin User Seeder
 *
 * Creates an admin user in the database.
 *
 * Usage: pnpm seed:admin
 */

import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { UserRole } from '../../modules/roles/entities/user-role.entity';
import * as bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function seedAdmin() {
  try {
    console.log('👑 Creating admin user...\n');

    // Initialize TypeORM connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // Get admin credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bookloop.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Firefury@4000';

    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}\n`);

    // Find or create admin role
    const roleRepo = AppDataSource.getRepository(Role);
    let adminRole = await roleRepo.findOne({ where: { name: 'admin' } });

    if (!adminRole) {
      console.log('Creating admin role...');
      adminRole = roleRepo.create({
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full system access',
        is_active: true,
      });
      adminRole = await roleRepo.save(adminRole);
      console.log('✅ Admin role created\n');
    } else {
      console.log('✅ Admin role found\n');
    }

    // Check if admin user already exists
    const userRepo = AppDataSource.getRepository(User);
    let existingAdmin = await userRepo.findOne({
      where: { email: adminEmail },
      relations: ['roles'],
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists. Updating password...');

      // Update password
      existingAdmin.password = await hashPassword(adminPassword);
      existingAdmin.is_active = true;
      existingAdmin.email_verified = true;

      await userRepo.save(existingAdmin);
      console.log('✅ Admin user password updated\n');

      // Check if user has admin role
      const userRoleRepo = AppDataSource.getRepository(UserRole);
      const hasAdminRole = await userRoleRepo.findOne({
        where: {
          user_id: existingAdmin.id,
          role_id: adminRole.id,
        },
      });

      if (!hasAdminRole) {
        console.log('Adding admin role to user...');
        const userRole = userRoleRepo.create({
          user_id: existingAdmin.id,
          role_id: adminRole.id,
          is_active: true,
        });
        await userRoleRepo.save(userRole);
        console.log('✅ Admin role assigned\n');
      }
    } else {
      console.log('Creating new admin user...');

      // Create new admin user
      const adminUser = userRepo.create({
        phone_number: '+233244000000',
        email: adminEmail,
        password: await hashPassword(adminPassword),
        first_name: 'Admin',
        last_name: 'User',
        location: {
          type: 'Point',
          coordinates: [-0.8514, 10.7856], // Bolgatanga
        },
        city: 'Bolgatanga',
        region: 'Upper East',
        subscription_tier: 'premium',
        is_active: true,
        email_verified: true,
        phone_verified: true,
        ghana_card_verified: true,
        rating: 5.0,
      });

      const savedUser = await userRepo.save(adminUser);
      console.log('✅ Admin user created successfully!\n');

      // Assign admin role
      console.log('Assigning admin role...');
      const userRoleRepo = AppDataSource.getRepository(UserRole);
      const userRole = userRoleRepo.create({
        user_id: savedUser.id,
        role_id: adminRole.id,
        is_active: true,
      });
      await userRoleRepo.save(userRole);
      console.log('✅ Admin role assigned\n');
    }

    console.log('📋 Admin Login Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n✅ Admin seeding completed successfully!\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

seedAdmin();
