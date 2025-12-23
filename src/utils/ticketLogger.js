import fs from "fs";
import path from "path";

const FILE = path.resolve("data/h8-ticket-history.json");

export function logTicket({ circuitId, ticketId, emailId, from, status }) {
  let data = [];

  if (fs.existsSync(FILE)) {
    data = JSON.parse(fs.readFileSync(FILE, "utf8"));
  }

  data.push({
    circuitId,
    ticketId,
    emailId,
    from,
    status,
    createdAt: new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }),
  });

  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}
