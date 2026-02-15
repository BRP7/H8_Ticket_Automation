// export function ticketSuccessTemplate({ ticketId, circuitId }) {
//   return {
//     subject: `H8 Ticket Created – ${ticketId}`,
//     html: `
//       <h3>Ticket Created Successfully</h3>
//       <p><b>Ticket ID:</b> ${ticketId}</p>
//       <p><b>Circuit ID:</b> ${circuitId}</p>
//       <p>This ticket was auto-created by H8 Automation.</p>
//     `,
//   };
// }

// export function ticketDuplicateTemplate({ circuitId }) {
//   return {
//     subject: `⚠️ Ticket Already Open – ${circuitId}`,
//     html: `
//       <h3>Duplicate Case Detected</h3>
//       <p>A ticket is already open for:</p>
//       <p><b>Circuit ID:</b> ${circuitId}</p>
//       <p>No new ticket was created.</p>
//       <p>Please review manually if required.</p>
//     `,
//   };
// }

// export function ticketFailureTemplate({ circuitId, error }) {
//   return {
//     subject: `H8 Ticket Failed – Manual Action Required`,
//     html: `
//       <h3>Ticket Creation Failed</h3>
//       <p><b>Circuit ID:</b> ${circuitId}</p>
//       <p><b>Error:</b> ${error}</p>
//       <p>Please investigate and create ticket manually if needed.</p>
//     `,
//   };
// }




export function manualReviewTemplate({
  subject,
  from,
  circuitId,
  subSubCategory,
  confidence,
  reason
}) {
  return {
    subject: `H8 Manual Review Required – ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        
        <h2 style="margin-bottom: 10px;">Manual Review Required</h2>
        
        <p>An email has been classified as a potential telecom service issue but requires manual validation.</p>
        
        <hr style="margin: 20px 0;" />
        
        <table style="border-collapse: collapse; width: 100%;">
          <tr>
            <td style="padding: 6px 0;"><strong>Email Subject:</strong></td>
            <td>${subject}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>From:</strong></td>
            <td>${from}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>Detected Category:</strong></td>
            <td>${subSubCategory || "Not Identified"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>Circuit ID:</strong></td>
            <td>${circuitId || "Not Provided"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>Confidence:</strong></td>
            <td>${confidence}%</td>
          </tr>
        </table>
        
        <hr style="margin: 20px 0;" />
        
        <p><strong>Reason for Manual Review:</strong></p>
        <p>${reason}</p>
        
        <p style="margin-top: 20px;">
          No ticket has been created automatically.  
          Please verify and take appropriate action.
        </p>

      </div>
    `
  };
}


export function ticketSuccessTemplate({ ticketId, circuitId }) {
  return {
    subject: `Ticket Created Successfully – ${ticketId}`,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        
        <h2 style="margin-bottom: 10px;">Ticket Created Successfully</h2>
        
        <p>Your reported issue has been successfully logged in the H8 system.</p>
        
        <hr style="margin: 20px 0;" />
        
        <table style="border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0;"><strong>Ticket ID:</strong></td>
            <td>${ticketId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>Circuit ID:</strong></td>
            <td>${circuitId}</td>
          </tr>
        </table>
        
        <hr style="margin: 20px 0;" />
        
        <p>
          Our technical team will investigate and provide updates accordingly.
        </p>
        
        <p style="margin-top: 20px;">
          This ticket was generated automatically by the H8 Incident Automation System.
        </p>

      </div>
    `
  };
}


export function ticketDuplicateTemplate({ circuitId }) {
  return {
    subject: `Existing Open Ticket Detected – ${circuitId}`,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        
        <h2 style="margin-bottom: 10px;">Duplicate Case Identified</h2>
        
        <p>An active ticket already exists for the following circuit:</p>
        
        <p><strong>Circuit ID:</strong> ${circuitId}</p>
        
        <p>
          To avoid duplication, no new ticket has been created.
        </p>
        
        <p style="margin-top: 20px;">
          If further action is required, please coordinate with the NOC team.
        </p>

      </div>
    `
  };
}


export function ticketFailureTemplate({ circuitId, error }) {
  return {
    subject: `Ticket Creation Failed – Manual Intervention Required`,
    html: `
      <div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
        
        <h2 style="margin-bottom: 10px;">Ticket Creation Failed</h2>
        
        <p>The system was unable to create a ticket automatically.</p>
        
        <hr style="margin: 20px 0;" />
        
        <table>
          <tr>
            <td style="padding: 6px 0;"><strong>Circuit ID:</strong></td>
            <td>${circuitId || "Not Available"}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0;"><strong>Error Details:</strong></td>
            <td>${error}</td>
          </tr>
        </table>
        
        <hr style="margin: 20px 0;" />
        
        <p>
          Please review the issue and create the ticket manually if necessary.
        </p>

      </div>
    `
  };
}
