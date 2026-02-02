// export function ackSuccessTemplate({ ticketId, circuitId }) {
//   return {
//     subject: `ACK: Ticket Created – ${ticketId}`,
//     html: `
//       <p>Dear Customer,</p>

//       <p>We have received your request regarding the following circuit:</p>

//       <p><b>Circuit ID:</b> ${circuitId}<br/>
//       <b>Ticket ID:</b> ${ticketId}</p>

//       <p>Our support team is working on this issue.</p>

//       <p>Regards,<br/>
//       Optimal Telemedia Support Team</p>
//     `,
//   };
// }


export function ackSuccessTemplate({
  ticketId,
  circuitId,
  bookedAt,
}) {
  return {
    subject: `Re: Issue reported for Circuit ${circuitId}`,
    html: `
      <p>Dear Sir,</p>

      <p>
        Thank you for contacting us. We are in receipt of your concern for the
        <b>Circuit ID:</b> ${circuitId}.
      </p>

      <p>
        Kindly note that a trouble ticket has been booked and assigned to the
        concerned team for investigation.
      </p>

      <p>
        <b>Fault Ticket No:</b> ${ticketId}<br/>
        <b>Fault Ticket Booked Time:</b> ${bookedAt}
      </p>

      <p>
        We will update you within the next <b>45 minutes</b>.
      </p>

      <p>
        Please be assured that we will pursue the same with the concerned team
        and keep you updated via mail and telephonic updates.
      </p>

      <p>
        Assuring you of our best services at all times.
      </p>

      <p>
        Regards,<br/>
        <b>Optimal Service Support Desk</b>
      </p>
    `,
  };
}


export function ackDuplicateTemplate({ circuitId }) {
  return {
    subject: `ACK: Ticket Already Open – ${circuitId}`,
    html: `
      <p>Dear Customer,</p>

      <p>Your issue for the following circuit is already under progress:</p>

      <p><b>Circuit ID:</b> ${circuitId}</p>

      <p>No new ticket has been created.</p>

      <p>Regards,<br/>
      Optimal Telemedia Support Team</p>
    `,
  };
}

export function ackFailureTemplate({ circuitId }) {
  return {
    subject: `ACK: Issue Received – Under Review`,
    html: `
      <p>Dear Customer,</p>

      <p>We have received your email regarding:</p>

      <p><b>Circuit ID:</b> ${circuitId}</p>

      <p>Our team is reviewing this manually and will update you shortly.</p>

      <p>Regards,<br/>
      Optimal Telemedia Support Team </p>
    `,
  };
}
