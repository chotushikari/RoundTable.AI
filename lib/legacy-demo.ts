export function legacyDemoEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_LEGACY_QUICKSTART_DEMO === 'true';
}
