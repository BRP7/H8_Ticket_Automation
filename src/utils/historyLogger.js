import fs from "fs";

const FILE = "data/h8-ticket-history.json";

export async function logHistory(mail, gpt, status, ticketId = null) {
  let history = [];

  if (fs.existsSync(FILE)) {
    history = JSON.parse(fs.readFileSync(FILE, "utf8"));
  }

  history.push({
    time: new Date().toISOString(),
    subject: mail.subject,
    from: mail.from?.emailAddress?.address,
    status,
    ticketId,
    gpt
  });

  fs.writeFileSync(FILE, JSON.stringify(history, null, 2));
}
