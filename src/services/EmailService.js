// Simple utility service for basic validation (no email functionality needed)
class EmailService {
  constructor() {
    // No configuration needed
  }

  // Basic email format validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Basic phone number validation
  isValidPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
  }
}

const emailService = new EmailService();
export default emailService;
