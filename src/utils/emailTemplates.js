export function ticketSuccessTemplate({ ticketId, circuitId }) {
  return {
    subject: `H8 Ticket Created – ${ticketId}`,
    html: `
      <h3>Ticket Created Successfully</h3>
      <p><b>Ticket ID:</b> ${ticketId}</p>
      <p><b>Circuit ID:</b> ${circuitId}</p>
      <p>This ticket was auto-created by H8 Automation.</p>
    `,
  };
}

export function ticketDuplicateTemplate({ circuitId }) {
  return {
    subject: `⚠️ Ticket Already Open – ${circuitId}`,
    html: `
      <h3>Duplicate Case Detected</h3>
      <p>A ticket is already open for:</p>
      <p><b>Circuit ID:</b> ${circuitId}</p>
      <p>No new ticket was created.</p>
      <p>Please review manually if required.</p>
    `,
  };
}

export function ticketFailureTemplate({ circuitId, error }) {
  return {
    subject: `H8 Ticket Failed – Manual Action Required`,
    html: `
      <h3>Ticket Creation Failed</h3>
      <p><b>Circuit ID:</b> ${circuitId}</p>
      <p><b>Error:</b> ${error}</p>
      <p>Please investigate and create ticket manually if needed.</p>
    `,
  };
}
