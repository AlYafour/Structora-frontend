/**
 * WebAuthn browser utilities
 * Handles communication with the browser's WebAuthn API
 */

/**
 * Check if WebAuthn is supported by the browser
 */
export const isWebAuthnSupported = () =>
  typeof window !== 'undefined' &&
  window.PublicKeyCredential !== undefined &&
  typeof window.PublicKeyCredential === 'function';

/**
 * Check if platform authenticator (biometric) is available
 */
export const isPlatformAuthenticatorAvailable = async () => {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

/**
 * Decode base64url string to Uint8Array
 */
const b64ToUint8 = (str) => {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * Encode ArrayBuffer to base64url string
 */
const uint8ToB64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Register a new WebAuthn credential (called after register_begin API)
 * @param {Object} options - publicKey options from server
 * @returns {Object} credential data to send to server
 */
export const createCredential = async (options) => {
  const publicKey = {
    ...options,
    challenge: b64ToUint8(options.challenge),
    user: {
      ...options.user,
      id: b64ToUint8(options.user.id),
    },
    excludeCredentials: (options.excludeCredentials || []).map(c => ({
      ...c,
      id: b64ToUint8(c.id),
    })),
  };

  const credential = await navigator.credentials.create({ publicKey });

  return {
    id: uint8ToB64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: uint8ToB64(credential.response.clientDataJSON),
      attestationObject: uint8ToB64(credential.response.attestationObject),
    },
  };
};

/**
 * Authenticate with an existing WebAuthn credential (called after login_begin API)
 * @param {Object} options - publicKey options from server
 * @returns {Object} assertion data to send to server
 */
export const getAssertion = async (options) => {
  const publicKey = {
    ...options,
    challenge: b64ToUint8(options.challenge),
    allowCredentials: (options.allowCredentials || []).map(c => ({
      ...c,
      id: b64ToUint8(c.id),
    })),
  };

  const assertion = await navigator.credentials.get({ publicKey });

  return {
    id: uint8ToB64(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: uint8ToB64(assertion.response.clientDataJSON),
      authenticatorData: uint8ToB64(assertion.response.authenticatorData),
      signature: uint8ToB64(assertion.response.signature),
      userHandle: assertion.response.userHandle
        ? uint8ToB64(assertion.response.userHandle)
        : null,
    },
  };
};
