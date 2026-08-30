// Where to send the user after they log in / sign up (defaults to dashboard). Set before
// opening the auth modal from a flow that needs a specific destination (e.g. "Start Your Order").
export function setAuthRedirect(path) {
  sessionStorage.setItem('cp_auth_redirect', path);
}

export function consumeAuthRedirect() {
  const path = sessionStorage.getItem('cp_auth_redirect') || '/dashboard';
  sessionStorage.removeItem('cp_auth_redirect');
  return path;
}
