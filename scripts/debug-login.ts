
import { storage } from "../server/storage";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Checking DB connection...");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set!");
    process.exit(1);
  } else {
    console.log("DATABASE_URL is set.");
  }

  try {
    const allUsers = await storage.getAllUsers();
    console.log(`Found ${allUsers.length} users.`);
    
    const debugEmail = "debug_test_user@example.com";
    const debugPass = "debug123";

    let user = await storage.getUserByEmail(debugEmail);
    if (!user) {
      console.log(`Creating test user: ${debugEmail}...`);
      await storage.createUser({
        email: debugEmail,
        password: debugPass,
        firstName: "Debug",
        lastName: "User",
        role: "ADMIN"
      });
      console.log("Created test user.");
    } else {
      console.log(`Test user ${debugEmail} already exists.`);
    }

    // Attempt to validate password (simulating login)
    console.log(`Attempting to validate password for ${debugEmail}...`);
    try {
      const validUser = await storage.validatePassword(debugEmail, debugPass);
      if (validUser) {
        console.log("Validation successful!");
        console.log("User ID:", validUser.id);
        
        // Attempt to update last login
        console.log("Updating last login...");
        await storage.updateLastLogin(validUser.id);
        console.log("Update last login successful.");
      } else {
        console.log("Validation failed (returned null).");
      }
    } catch (error) {
      console.error("Login flow error:", error);
      if (error instanceof Error) {
        console.error("Error stack:", error.stack);
      }
    }

  } catch (error) {
    console.error("General DB error:", error);
    if (error instanceof Error) {
        console.error("Error stack:", error.stack);
    }
  } finally {
    process.exit(0);
  }
}

main();
