import fs from "fs";
import path from "path";

const objectName = "uploads/test-file-" + Date.now() + ".txt";
const filePath = path.join(process.cwd(), objectName);
const dir = path.dirname(filePath);

console.log(`CWD: ${process.cwd()}`);
console.log(`Object Name: ${objectName}`);
console.log(`Target File Path: ${filePath}`);
console.log(`Target Directory: ${dir}`);

if (!fs.existsSync(dir)) {
    console.log("Creating directory...");
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(filePath, "test content");
console.log("File written successfully.");

if (fs.existsSync(filePath)) {
    console.log("Verification: File exists.");
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);
} else {
    console.log("Verification: File DOES NOT exist!");
}
