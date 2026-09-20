'use client';

/** Утилиты WebAuthn на клиенте: конвертация base64url ↔ ArrayBuffer и обёртки над navigator.credentials. */

export function b64urlToBuf(value: string): ArrayBuffer {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4));
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bufToB64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isPasskeySupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined' && Boolean(navigator.credentials);
}

type RegistrationOptions = {
  challenge: string;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  excludeCredentials: string[];
  authenticatorSelection: Record<string, unknown>;
  timeout: number;
  attestation: string;
};

export type RegistrationResult = {
  id: string;
  clientDataJSON: string;
  attestationObject: string;
  transports: string;
};

export async function createPasskey(options: RegistrationOptions): Promise<RegistrationResult> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: b64urlToBuf(options.challenge),
    rp: options.rp,
    user: {
      id: b64urlToBuf(options.user.id),
      name: options.user.name,
      displayName: options.user.displayName,
    },
    pubKeyCredParams: options.pubKeyCredParams,
    excludeCredentials: options.excludeCredentials.map((id) => ({ type: 'public-key', id: b64urlToBuf(id) })),
    authenticatorSelection: options.authenticatorSelection,
    timeout: options.timeout,
    attestation: options.attestation as AttestationConveyancePreference,
  };

  const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('passkey_cancelled');
  const response = credential.response as AuthenticatorAttestationResponse;
  const transports = typeof response.getTransports === 'function' ? response.getTransports().join(',') : '';

  return {
    id: bufToB64url(credential.rawId),
    clientDataJSON: bufToB64url(response.clientDataJSON),
    attestationObject: bufToB64url(response.attestationObject),
    transports,
  };
}

type AuthenticationOptions = {
  challenge: string;
  rpId: string;
  userVerification: string;
  timeout: number;
};

export type AuthenticationResult = {
  id: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
};

export async function getPasskey(options: AuthenticationOptions): Promise<AuthenticationResult> {
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: b64urlToBuf(options.challenge),
    rpId: options.rpId,
    userVerification: options.userVerification as UserVerificationRequirement,
    timeout: options.timeout,
  };

  const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
  if (!credential) throw new Error('passkey_cancelled');
  const response = credential.response as AuthenticatorAssertionResponse;

  return {
    id: bufToB64url(credential.rawId),
    clientDataJSON: bufToB64url(response.clientDataJSON),
    authenticatorData: bufToB64url(response.authenticatorData),
    signature: bufToB64url(response.signature),
  };
}
