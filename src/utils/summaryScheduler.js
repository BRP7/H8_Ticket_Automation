import { generateTodaySummary } from "./summaryGenerator.js";
import { sendNewMail } from "../outlook.js";

/**
 * Runs daily at 6:00 PM IST
 */
export function startDailySummaryScheduler() {
  console.log("📊 Daily Summary Scheduler started (6PM IST)");

  setInterval(async () => {
    try {
      const now = new Date();

      const istTime = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false
      });

      // Trigger at 18:00 (6PM IST)
      if (istTime.startsWith("18:00")) {

        console.log("📊 Generating Daily Summary...");

        const summary = generateTodaySummary();

        if (!summary) {
          console.log("ℹ No tickets today. Skipping summary mail.");
          return;
        }

        const html = buildSummaryHTML(summary);

        await sendNewMail({
          to: process.env.DAILY_SUMMARY,
          subject: `📊 H8 Daily Ticket Summary - ${summary.date}`,
          html
        });

        console.log("✅ Daily summary sent successfully");
      }

    } catch (err) {
      console.error("❌ Daily summary failed:", err.message);
    }

  }, 60000); // check every 1 minute
}

/**
 * Build HTML summary
 */
function buildSummaryHTML(summary) {
  return `
    <h2>H8 Daily Summary - ${summary.date}</h2>

    <p><b>Total:</b> ${summary.total}</p>
    <p><b>Success:</b> ${summary.success}</p>
    <p><b>Duplicate:</b> ${summary.duplicate}</p>
    <p><b>Failed:</b> ${summary.failed}</p>
    <p><b>Ignored:</b> ${summary.ignored}</p>
    <p><b>System Ignored:</b> ${summary.systemIgnored}</p>

    <hr/>

    <table border="1" cellpadding="6" cellspacing="0">
      <tr>
        <th>Circuit</th>
        <th>Status</th>
        <th>Ticket</th>
        <th>From</th>
      </tr>

      ${summary.details.map(d => `
        <tr>
          <td>${d.circuitId}</td>
          <td>${d.status}</td>
          <td>${d.ticketId}</td>
          <td>${d.from}</td>
        </tr>
      `).join("")}

    </table>
  `;
}
