import { generateTodaySummary } from "../utils/summaryGenerator.js";
import { sendMail } from "../utils/mailer.js";

export async function sendDailySummary() {
  const summary = generateTodaySummary();

  if (!summary || summary.total === 0) {
    console.log("📭 No activity today. Summary not sent.");
    return;
  }

  const html = `
    <h2>H8 Daily Ticket Summary (${summary.date})</h2>
    <ul>
      <li><b>Total Emails:</b> ${summary.total}</li>
      <li><b>Tickets Created:</b> ${summary.success}</li>
      <li><b>Duplicate Cases:</b> ${summary.duplicate}</li>
      <li><b>Failures:</b> ${summary.failed}</li>
      <li><b>Ignored:</b> ${summary.ignored}</li>
      <li><b>System Emails Ignored:</b> ${summary.systemIgnored}</li>
    </ul>

    <h3>Details</h3>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr>
        <th>Circuit ID</th>
        <th>Status</th>
        <th>Ticket ID</th>
        <th>From</th>
      </tr>
      ${summary.details.map(d => `
        <tr>
          <td>${d.circuitId || "-"}</td>
          <td>${d.status}</td>
          <td>${d.ticketId}</td>
          <td>${d.from}</td>
        </tr>
      `).join("")}
    </table>
  `;

  await sendMail({
    to: process.env.NOTIFY_EMAIL,
    subject: `📊 H8 Daily Summary – ${summary.date}`,
    html,
  });

  console.log("📨 Daily summary email sent");
}
