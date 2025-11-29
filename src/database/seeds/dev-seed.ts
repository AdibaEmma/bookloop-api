/**
 * Development Database Seeder
 *
 * Seeds database with test data for local development.
 *
 * Usage:
 * 1. Ensure database is running
 * 2. Run migrations: pnpm migration:run
 * 3. Run seed: pnpm seed:dev
 *
 * Features:
 * - Creates 10 test users around Bolgatanga
 * - Creates 50 books (popular titles in Ghana)
 * - Creates 100 listings with geolocation
 * - Creates 15 safe meetup points in Bolgatanga
 *
 * WARNING: This will clear existing data in development!
 */

import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Book } from '../../modules/books/entities/book.entity';
import { Listing } from '../../modules/listings/entities/listing.entity';
import { MeetupSpot } from '../../modules/meetup-spots/entities/meetup-spot.entity';
import * as bcrypt from 'bcrypt';

// Bolgatanga coordinates (center point)
const BOLGATANGA_CENTER = { lat: 10.7856, lng: -0.8514 };

// Popular areas and neighborhoods in Bolgatanga
const BOLGATANGA_LOCATIONS = [
  { name: 'Central Bolgatanga', lat: 10.7856, lng: -0.8514 },
  { name: 'Sumbrungu', lat: 10.7623, lng: -0.8245 },
  { name: 'Zuarungu', lat: 10.8123, lng: -0.8789 },
  { name: 'Zaare', lat: 10.7445, lng: -0.8623 },
  { name: 'Soe', lat: 10.7956, lng: -0.8123 },
  { name: 'Sherigu', lat: 10.8234, lng: -0.8456 },
  { name: 'Anateem', lat: 10.7623, lng: -0.8890 },
  { name: 'Gambibgo', lat: 10.8012, lng: -0.8234 },
  { name: 'Yorogo', lat: 10.7734, lng: -0.8667 },
  { name: 'Zanlerigu', lat: 10.7890, lng: -0.8890 },
  { name: 'Tindonmolgo', lat: 10.8123, lng: -0.8612 },
  { name: 'Kalbeo', lat: 10.7567, lng: -0.8456 },
  { name: 'Yikene', lat: 10.7923, lng: -0.8334 },
  { name: 'Bukere', lat: 10.8056, lng: -0.8778 },
  { name: 'Tindonsobligo', lat: 10.7701, lng: -0.8545 },
];

// Popular books in Ghana
const POPULAR_BOOKS = [
  {
    title: 'The Beautyful Ones Are Not Yet Born',
    author: 'Ayi Kwei Armah',
    isbn: '9780435905569',
    genre: 'African Literature',
    description:
      'A classic African novel about corruption in post-independence Ghana, following "the man" as he navigates moral dilemmas.',
  },
  {
    title: 'Faceless',
    author: 'Amma Darko',
    isbn: '9789988550530',
    genre: 'African Literature',
    description: 'A powerful novel addressing street life and poverty in urban Ghana.',
  },
  {
    title: 'Changes: A Love Story',
    author: 'Ama Ata Aidoo',
    isbn: '9780912670959',
    genre: 'Romance',
    description:
      'A compelling exploration of love, marriage, and tradition in contemporary Ghana.',
  },
  {
    title: 'The Girl Who Can',
    author: 'Ama Ata Aidoo',
    isbn: '9789964701611',
    genre: 'Short Stories',
    description: 'Collection of stories examining Ghanaian women across different settings.',
  },
  {
    title: 'Things Fall Apart',
    author: 'Chinua Achebe',
    isbn: '9780385474542',
    genre: 'African Literature',
    description: 'A masterpiece about colonialism impact on traditional African society.',
  },
  {
    title: 'Half of a Yellow Sun',
    author: 'Chimamanda Ngozi Adichie',
    isbn: '9781400095209',
    genre: 'Historical Fiction',
    description: 'Powerful novel set during the Nigerian Civil War, popular across West Africa.',
  },
  {
    title: 'Americanah',
    author: 'Chimamanda Ngozi Adichie',
    isbn: '9780307455925',
    genre: 'Contemporary Fiction',
    description: 'A love story exploring race, identity, and migration.',
  },
  {
    title: 'Purple Hibiscus',
    author: 'Chimamanda Ngozi Adichie',
    isbn: '9781616202415',
    genre: 'Coming of Age',
    description: 'A moving story of a young Nigerian girl finding her voice.',
  },
  {
    title: 'Homegoing',
    author: 'Yaa Gyasi',
    isbn: '9781101947135',
    genre: 'Historical Fiction',
    description: 'Multi-generational novel tracing two sisters from Ghana across centuries.',
  },
  {
    title: 'Transcendent Kingdom',
    author: 'Yaa Gyasi',
    isbn: '9780525658184',
    genre: 'Literary Fiction',
    description: 'A novel about faith, science, and family by Ghanaian-American author.',
  },
  {
    title: 'The Fishermen',
    author: 'Chigozie Obioma',
    isbn: '9780316338325',
    genre: 'Literary Fiction',
    description: 'A poignant coming-of-age tale from Nigeria, popular in Ghana.',
  },
  {
    title: 'So Long a Letter',
    author: 'Mariama Bâ',
    isbn: '9781478608554',
    genre: 'African Literature',
    description: "A feminist classic addressing polygamy and African women's rights.",
  },
  {
    title: 'The Joys of Motherhood',
    author: 'Buchi Emecheta',
    isbn: '9780807616215',
    genre: 'African Literature',
    description: 'Exploration of motherhood and gender roles in traditional African society.',
  },
  {
    title: 'Nervous Conditions',
    author: 'Tsitsi Dangarembga',
    isbn: '9781580051125',
    genre: 'Coming of Age',
    description: "A powerful novel about colonialism and women's rights in Rhodesia.",
  },
  {
    title: 'Born a Crime',
    author: 'Trevor Noah',
    isbn: '9780399588174',
    genre: 'Memoir',
    description: 'Humorous and poignant stories from apartheid South Africa.',
  },
  {
    title: 'Long Walk to Freedom',
    author: 'Nelson Mandela',
    isbn: '9780316548182',
    genre: 'Autobiography',
    description: "Mandela's autobiography, inspiring readers across Africa.",
  },
  {
    title: 'Educated',
    author: 'Tara Westover',
    isbn: '9780399590504',
    genre: 'Memoir',
    description: 'A memoir about overcoming obstacles through education.',
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '9780735211292',
    genre: 'Self-Help',
    description: 'Popular guide to building good habits and breaking bad ones.',
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    isbn: '9780062315007',
    genre: 'Fiction',
    description: "A philosophical novel about following one's dreams.",
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert Kiyosaki',
    isbn: '9781612680194',
    genre: 'Personal Finance',
    description: 'Popular personal finance book widely read in Ghana.',
  },
];

// Safe meetup points in Bolgatanga
const SAFE_MEETUP_POINTS = [
  {
    name: 'Bolgatanga Regional Library',
    type: 'library',
    lat: 10.7856,
    lng: -0.8514,
    address: 'Central Bolgatanga',
    operatingHours: '8:00 AM - 5:00 PM (Mon-Fri)',
    safetyRating: 5,
  },
  {
    name: 'Bolgatanga Central Market',
    type: 'public',
    lat: 10.7834,
    lng: -0.8523,
    address: 'Market Road, Bolgatanga',
    operatingHours: '6:00 AM - 7:00 PM',
    safetyRating: 4,
  },
  {
    name: 'Black Star Square - Bolgatanga',
    type: 'public',
    lat: 10.7867,
    lng: -0.8501,
    address: 'Central Bolgatanga',
    operatingHours: '6:00 AM - 8:00 PM',
    safetyRating: 4,
  },
  {
    name: 'Upper East Regional Hospital Lobby',
    type: 'public',
    lat: 10.7823,
    lng: -0.8567,
    address: 'Hospital Road, Bolgatanga',
    operatingHours: '24 hours',
    safetyRating: 5,
  },
  {
    name: 'Ghana Education Service - Upper East',
    type: 'public',
    lat: 10.7889,
    lng: -0.8490,
    address: 'Government Offices, Bolgatanga',
    operatingHours: '8:00 AM - 5:00 PM (Weekdays)',
    safetyRating: 5,
  },
  {
    name: 'Bolgatanga Municipal Assembly',
    type: 'public',
    lat: 10.7845,
    lng: -0.8534,
    address: 'Municipal Assembly Road',
    operatingHours: '8:00 AM - 5:00 PM (Weekdays)',
    safetyRating: 5,
  },
  {
    name: 'Nsoatre Café & Lounge',
    type: 'cafe',
    lat: 10.7878,
    lng: -0.8478,
    address: 'Main Street, Bolgatanga',
    operatingHours: '9:00 AM - 10:00 PM',
    safetyRating: 4,
  },
  {
    name: 'Sand Gardens Restaurant',
    type: 'cafe',
    lat: 10.7812,
    lng: -0.8545,
    address: 'Zuarungu Road, Bolgatanga',
    operatingHours: '10:00 AM - 11:00 PM',
    safetyRating: 4,
  },
  {
    name: 'University for Development Studies - Navrongo Campus Library',
    type: 'library',
    lat: 10.8956,
    lng: -1.0923,
    address: 'Navrongo (near Bolgatanga)',
    operatingHours: '8:00 AM - 8:00 PM',
    safetyRating: 5,
  },
  {
    name: 'Bolgatanga Sports Stadium',
    type: 'public',
    lat: 10.7790,
    lng: -0.8456,
    address: 'Stadium Road, Bolgatanga',
    operatingHours: '6:00 AM - 6:00 PM',
    safetyRating: 4,
  },
  {
    name: 'St. John Bosco Catholic Church',
    type: 'public',
    lat: 10.7901,
    lng: -0.8523,
    address: 'Central Bolgatanga',
    operatingHours: '6:00 AM - 8:00 PM',
    safetyRating: 5,
  },
  {
    name: 'Sumbrungu Community Centre',
    type: 'public',
    lat: 10.7623,
    lng: -0.8245,
    address: 'Sumbrungu, Bolgatanga',
    operatingHours: '8:00 AM - 6:00 PM',
    safetyRating: 4,
  },
  {
    name: 'Bolgatanga Technical University Campus',
    type: 'library',
    lat: 10.7923,
    lng: -0.8612,
    address: 'Sumbrungu Road, Bolgatanga',
    operatingHours: '8:00 AM - 8:00 PM',
    safetyRating: 5,
  },
  {
    name: 'Tono Dam Recreation Area',
    type: 'public',
    lat: 10.9234,
    lng: -1.0567,
    address: 'Near Navrongo',
    operatingHours: '7:00 AM - 6:00 PM',
    safetyRating: 3,
  },
  {
    name: 'Paga Crocodile Pond Entrance',
    type: 'public',
    lat: 10.9876,
    lng: -1.1123,
    address: 'Paga (near Bolgatanga)',
    operatingHours: '8:00 AM - 5:00 PM',
    safetyRating: 4,
  },
];

// Helper function to generate random coordinates near a point
function randomLocationNear(center: { lat: number; lng: number }, radiusKm: number) {
  // Convert radius from kilometers to degrees (approximate)
  const radiusInDegrees = radiusKm / 111;

  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  return {
    lat: center.lat + y,
    lng: center.lng + x,
  };
}

// Helper function to hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function seed() {
  try {
    console.log('🌱 Starting database seeding for Bolgatanga...\n');

    // Initialize TypeORM connection
    await AppDataSource.initialize();
    console.log('✅ Database connection established\n');

    // Clear existing data (development only!)
    console.log('🗑️  Clearing existing data...');
    await AppDataSource.query('TRUNCATE TABLE exchanges, listings, books, meetup_spots, users CASCADE');
    console.log('✅ Existing data cleared\n');

    // Create Admin User
    console.log('👑 Creating admin user...');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@bookloop.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Firefury@4000';

    const adminUser = AppDataSource.getRepository(User).create({
      phone_number: '+233244000000',
      email: adminEmail,
      password_hash: await hashPassword(adminPassword),
      first_name: 'Admin',
      last_name: 'User',
      location: {
        type: 'Point',
        coordinates: [BOLGATANGA_CENTER.lng, BOLGATANGA_CENTER.lat],
      },
      city: 'Bolgatanga',
      region: 'Upper East',
      subscription_tier: 'premium',
      is_verified: true,
      ghana_card_verified: true,
      rating: 5.0,
      roles: ['admin'], // Admin role
    } as any);

    await AppDataSource.getRepository(User).save(adminUser);
    console.log(`✅ Admin user created: ${adminEmail}\n`);

    // Seed Users
    console.log('👤 Creating test users...');
    const users: User[] = [];
    const firstNames = [
      'Akwasi',
      'Ayisha',
      'Alhassan',
      'Abena',
      'Abdul',
      'Adwoa',
      'Mahama',
      'Fati',
      'Ibrahim',
      'Salamatu',
    ];
    const lastNames = [
      'Atanga',
      'Asigri',
      'Awuni',
      'Amoak',
      'Ayine',
      'Azumah',
      'Akolgo',
      'Awiah',
      'Akanbe',
      'Asore',
    ];

    for (let i = 0; i < 10; i++) {
      const location = BOLGATANGA_LOCATIONS[i % BOLGATANGA_LOCATIONS.length];
      const coords = randomLocationNear(location, 1);

      const user = AppDataSource.getRepository(User).create({
        phone_number: `+233${Math.floor(100000000 + Math.random() * 900000000)}`,
        email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
        password_hash: await hashPassword('Test@1234'),
        first_name: firstNames[i],
        last_name: lastNames[i],
        location: {
          type: 'Point',
          coordinates: [coords.lng, coords.lat],
        },
        city: location.name,
        region: 'Upper East',
        subscription_tier: i < 3 ? 'premium' : i < 6 ? 'basic' : 'free',
        is_verified: true,
        ghana_card_verified: i < 7,
        rating: 4 + Math.random(),
      } as any);

      const savedUser = await AppDataSource.getRepository(User).save(user);
      // @ts-ignore
      users.push(savedUser);
    }
    console.log(`✅ Created ${users.length} test users\n`);

    // Seed Books
    console.log('📚 Creating books...');
    const books: Book[] = [];
    for (const bookData of POPULAR_BOOKS) {
      const book = AppDataSource.getRepository(Book).create({
        title: bookData.title,
        author: bookData.author,
        isbn: bookData.isbn,
        genre: bookData.genre,
        description: bookData.description,
        published_year: 1990 + Math.floor(Math.random() * 30),
        language: 'English',
      } as any);

      const savedBook = await AppDataSource.getRepository(Book).save(book);
      // @ts-ignore
      books.push(savedBook);
    }
    console.log(`✅ Created ${books.length} books\n`);

    // Seed Listings
    console.log('📋 Creating listings...');
    const listings: Listing[] = [];
    const conditions = ['new', 'like_new', 'good', 'fair', 'poor'];
    const listingTypes = ['exchange', 'donate', 'borrow'];
    const statuses = ['available', 'available', 'available', 'reserved', 'exchanged'];

    // Create 5-10 listings per user
    for (const user of users) {
      const numListings = 5 + Math.floor(Math.random() * 6);

      for (let i = 0; i < numListings; i++) {
        const book = books[Math.floor(Math.random() * books.length)];
        const location = BOLGATANGA_LOCATIONS[Math.floor(Math.random() * BOLGATANGA_LOCATIONS.length)];
        const coords = randomLocationNear(location, 2);

        const listing = AppDataSource.getRepository(Listing).create({
          user: user,
          book: book,
          listing_type: listingTypes[Math.floor(Math.random() * listingTypes.length)] as any,
          book_condition: conditions[Math.floor(Math.random() * conditions.length)] as any,
          description: `Good condition ${book.title} available for ${
            Math.random() > 0.5 ? 'exchange' : 'donation'
          }. Contact me for details.`,
          status: statuses[Math.floor(Math.random() * statuses.length)] as any,
          location: {
            type: 'Point',
            coordinates: [coords.lng, coords.lat],
          },
          address: `Near ${location.name}`,
          city: location.name,
          region: 'Upper East',
          search_radius_km: 5 + Math.floor(Math.random() * 15),
        });

        listings.push(await AppDataSource.getRepository(Listing).save(listing));
      }
    }
    console.log(`✅ Created ${listings.length} listings\n`);

    // Seed Safe Meetup Points
    console.log('📍 Creating safe meetup points...');
    const meetupSpots: MeetupSpot[] = [];
    for (const spotData of SAFE_MEETUP_POINTS) {
      // Use raw query since entity doesn't match current schema
      const result = await AppDataSource.query(
        `INSERT INTO meetup_spots (name, description, address, city, region, location, category, is_active)
         VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326)::geography, $7, $8)
         RETURNING *`,
        [
          spotData.name,
          `Operating hours: ${spotData.operatingHours}. Safety rating: ${spotData.safetyRating}/5.`,
          spotData.address,
          spotData.address.split(',')[0].trim(),
          'Upper East',
          JSON.stringify({ type: 'Point', coordinates: [spotData.lng, spotData.lat] }),
          spotData.type,
          true,
        ]
      );
      // @ts-ignore
      meetupSpots.push(result[0]);
    }
    console.log(`✅ Created ${meetupSpots.length} safe meetup points\n`);

    // Summary
    console.log('════════════════════════════════════════');
    console.log('✅ Database seeding completed successfully!\n');
    console.log('📍 Location: Bolgatanga, Upper East Region\n');
    console.log('Summary:');
    console.log(`  👤 Users: ${users.length}`);
    console.log(`  📚 Books: ${books.length}`);
    console.log(`  📋 Listings: ${listings.length}`);
    console.log(`  📍 Meetup Points: ${meetupSpots.length}\n`);
    console.log('Test Credentials:');
    console.log('  Email: akwasi.atanga@example.com');
    console.log('  Password: Test@1234\n');
    console.log('════════════════════════════════════════\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
