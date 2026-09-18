const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const mobileRe = /^[6-9]\d{9}$/

export function validateRegister(values) {
  const errors = {}
  if (!values.fullName?.trim() || values.fullName.trim().length < 2) {
    errors.fullName = 'Enter your full name.'
  }
  if (!mobileRe.test(values.mobile || '')) {
    errors.mobile = 'Enter a valid 10-digit mobile number.'
  }
  if (!emailRe.test(values.email || '')) {
    errors.email = 'Enter a valid email address.'
  }
  if (!values.password || values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  if (!values.terms) {
    errors.terms = 'Please accept the terms to continue.'
  }
  return errors
}

export function validateLogin(values) {
  const errors = {}
  if (!values.identifier?.trim()) {
    errors.identifier = 'Enter your mobile number or email.'
  }
  if (!values.password) {
    errors.password = 'Enter your password.'
  }
  return errors
}

export function validateOtp(code) {
  if (!/^\d{6}$/.test(code || '')) return 'Enter the 6-digit code.'
  return ''
}

export function validateProfile(values) {
  const errors = {}
  if (!values.fullName?.trim()) errors.fullName = 'Name is required.'
  if (values.email && !emailRe.test(values.email)) errors.email = 'Enter a valid email.'
  if (values.mobile && !mobileRe.test(values.mobile)) errors.mobile = 'Enter a valid mobile number.'
  return errors
}

export function validatePasswordChange(values) {
  const errors = {}
  if (!values.currentPassword) errors.currentPassword = 'Enter your current password.'
  if (!values.newPassword || values.newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters.'
  }
  if (values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  return errors
}
