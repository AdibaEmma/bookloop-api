# 📚 BookLoop API

The backend service for **BookLoop**, a Ghana-based community app that lets readers exchange, lend, and discover books around them.  
Built with **NestJS**, **Prisma**, and **PostgreSQL (PostGIS)** for location-aware book matching.

---

## 🚀 Features
- User authentication (Supabase / JWT)
- Book listing and search
- Location-based exchange matching
- Negotiation and booking flow
- Paystack payment integration (GHS, MoMo)
- Redis caching for sessions and notifications
- Prisma ORM + PostGIS for location queries

---

## 🏗️ Tech Stack
| Layer | Tech |
|--------|------|
| Framework | NestJS |
| ORM | Prisma |
| Database | PostgreSQL + PostGIS |
| Cache | Redis |
| Auth | JWT |
| Payments | Paystack |
| Language | TypeScript |

---

## ⚙️ Local Setup

```bash
# Clone repo
git clone https://github.com/BookLoopHQ/bookloop-api.git
cd bookloop-api

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Run Docker services (Postgres + Redis)
docker compose up -d

# Apply migrations
pnpm prisma migrate dev

# Seed sample data
pnpm prisma db seed

# Start development server
pnpm start:dev
