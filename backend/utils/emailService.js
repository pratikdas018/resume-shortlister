const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const NOTIFY_STATUSES = new Set(["Shortlisted", "Rejected"]);

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const deriveCandidateName = (filename = "") => {
  const base = filename.replace(/\.[^/.]+$/, "");
  const cleaned = base.replace(/[_-]+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : "Candidate";
};

const buildShortlistTemplate = ({ candidateName, companyName }) => {
  const safeName = escapeHtml(candidateName);
  const safeCompany = escapeHtml(companyName);
  return {
    subject: `Congratulations! You are shortlisted - ${safeCompany}`,
    text: [
      `Dear ${candidateName},`,
      "",
      "Congratulations! You are shortlisted for the next stage of our hiring process.",
      "Our team will contact you soon with interview details.",
      "",
      `Regards,`,
      `${companyName} Hiring Team`
    ].join("\n"),
    html: `
      <p>Dear ${safeName},</p>
      <p><strong>Congratulations!</strong> You are shortlisted for the next stage of our hiring process.</p>
      <p>Our team will contact you soon with interview details.</p>
      <p>Regards,<br/>${safeCompany} Hiring Team</p>
    `
  };
};

const buildRejectTemplate = ({ candidateName, companyName }) => {
  const safeName = escapeHtml(candidateName);
  const safeCompany = escapeHtml(companyName);
  return {
    subject: `Application Update - ${safeCompany}`,
    text: [
      `Dear ${candidateName},`,
      "",
      "We regret to inform you that we will not be moving forward with your application at this time.",
      "Thank you for your interest, and we wish you success in your job search.",
      "",
      `Regards,`,
      `${companyName} Hiring Team`
    ].join("\n"),
    html: `
      <p>Dear ${safeName},</p>
      <p>We regret to inform you that we will not be moving forward with your application at this time.</p>
      <p>Thank you for your interest, and we wish you success in your job search.</p>
      <p>Regards,<br/>${safeCompany} Hiring Team</p>
    `
  };
};

const buildStatusEmailTemplate = ({ status, candidateName, companyName }) => {
  if (status === "Shortlisted") {
    return buildShortlistTemplate({ candidateName, companyName });
  }
  if (status === "Rejected") {
    return buildRejectTemplate({ candidateName, companyName });
  }
  return null;
};

export const sendStatusEmailWithBrevo = async ({ candidate, status }) => {
  if (!NOTIFY_STATUSES.has(status)) {
    return { attempted: false, sent: false, reason: "Notification not required for this status." };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "HR Team";
  const companyName = process.env.COMPANY_NAME || "Our Company";

  if (!candidate?.email) {
    return { attempted: true, sent: false, reason: "Candidate email is missing." };
  }

  if (!apiKey) {
    return { attempted: true, sent: false, reason: "BREVO_API_KEY is not configured." };
  }

  if (!senderEmail) {
    return { attempted: true, sent: false, reason: "BREVO_SENDER_EMAIL is not configured." };
  }

  const candidateName = deriveCandidateName(candidate.filename);
  const template = buildStatusEmailTemplate({
    status,
    candidateName,
    companyName
  });

  if (!template) {
    return { attempted: false, sent: false, reason: "No template available for status." };
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName
      },
      to: [
        {
          email: candidate.email,
          name: candidateName
        }
      ],
      subject: template.subject,
      htmlContent: template.html,
      textContent: template.text
    })
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    return {
      attempted: true,
      sent: false,
      reason: `Brevo API error ${response.status}: ${errorPayload}`
    };
  }

  const payload = await response.json();
  return {
    attempted: true,
    sent: true,
    messageId: payload?.messageId || ""
  };
};
