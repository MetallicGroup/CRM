import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";

async function seedAdmin() {
  console.log("Creating admin user...");
  
  const passwordHash = await bcrypt.hash("admin123", 10);
  
  try {
    const [admin] = await db
      .insert(users)
      .values({
        email: "admin@metallicgroup.ro",
        passwordHash,
        firstName: "Admin",
        lastName: "CRM",
        role: "ADMIN",
        active: true,
      })
      .onConflictDoNothing()
      .returning();
    
    if (admin) {
      console.log("Admin user created successfully!");
      console.log("Email: admin@metallicgroup.ro");
      console.log("Password: admin123");
    } else {
      console.log("Admin user already exists.");
    }
  } catch (error) {
    console.error("Error creating admin:", error);
  }
  
  process.exit(0);
}

seedAdmin();
