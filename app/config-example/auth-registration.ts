export interface AuthRegistrationConfig {
  // Empty array (or blank-only entries) allows all email domains.
  // Non-empty values enforce an allowlist (examples: '@agency.gov', '@striae.org').
  allowedDomainEmails: string[];
  // When true, the registration form disables company input and uses defaultLabCompanyName.
  autoSetLabCompanyOnRegistration: boolean;
  // Default company/lab value used when autoSetLabCompanyOnRegistration is true.
  defaultLabCompanyName: string;
}

export const AUTH_REGISTRATION_CONFIG: AuthRegistrationConfig = {
  // Set to [] to allow any email domain.
  allowedDomainEmails: [],
  autoSetLabCompanyOnRegistration: false,
  defaultLabCompanyName: 'Agency Lab/Company Name',
};
