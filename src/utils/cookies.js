/**
 * Cookie utilities for httpOnly JWT authentication.
 * The actual JWT tokens are in httpOnly cookies (not accessible from JS).
 * This module provides helpers for the JS-readable signal cookie and CSRF token.
 */

/**
 * Check if the user is logged in via the signal cookie.
 * The `is_logged_in` cookie is set by the server (NOT httpOnly) as a JS-readable flag.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return document.cookie.includes('is_logged_in=true');
}

/**
 * Parse a cookie value by name from document.cookie.
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
export function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

/**
 * Get the CSRF token from the cookie (set by Django middleware).
 * @returns {string|null}
 */
export function getCsrfToken() {
  return getCookie('csrftoken') || getCookie('CSRF-TOKEN');
}
