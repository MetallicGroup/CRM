import { google } from "googleapis";

export async function fetchClientsFromSheet(sheetId: string) {
    try {
        const auth = new google.auth.GoogleAuth({
            // Scopes can be specified either as an array or as a single, space-delimited string.
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
        });

        const client = await auth.getClient();
        const sheets = google.sheets({ version: "v4", auth: client as any });

        // Expect data on the first sheet, columns A and B (Name, Phone)
        // Adjust range if needed (e.g., "Sheet1!A2:B") to skip header
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: "A2:B", // Assuming A=Name, B=Phone, Row 1 is header
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log("No data found in sheet.");
            return [];
        }

        return rows.map((row) => ({
            nume: row[0] || "Client Necunoscut",
            telefon: row[1] || "",
        })).filter(c => c.nume && c.telefon); // Filter empty rows

    } catch (error) {
        console.error("Error fetching from Google Sheets:", error);
        throw error;
    }
}
