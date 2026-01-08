
import { storage } from "./server/storage";
import { db } from "./server/db";
import { users } from "./shared/schema";

async function main() {
    const allUsers = await storage.getAllUsers();
    console.log(JSON.stringify(allUsers.map(u => ({ email: u.email, role: u.role })), null, 2));
    process.exit(0);
}

main();
