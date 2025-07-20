export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export function validatePassword(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Minimum length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  // Character variety checks
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Length bonus
  if (password.length >= 12) {
    score += 1;
  }

  // Prevent common patterns
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Avoid repeating characters');
    score = Math.max(0, score - 1);
  }

  if (/123|abc|qwe|password|admin/i.test(password)) {
    feedback.push('Avoid common patterns or words');
    score = Math.max(0, score - 1);
  }

  // Sanitize input to prevent XSS
  const sanitizedPassword = password.replace(/[<>'"]/g, '');
  if (sanitizedPassword !== password) {
    feedback.push('Password contains invalid characters');
    score = 0;
  }

  return {
    score: Math.min(4, score),
    feedback,
    isValid: score >= 3 && feedback.length === 0
  };
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Weak';
  }
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'hsl(var(--destructive))';
    case 2:
      return 'hsl(var(--warning))';
    case 3:
      return 'hsl(var(--primary))';
    case 4:
      return 'hsl(var(--success))';
    default:
      return 'hsl(var(--destructive))';
  }
}