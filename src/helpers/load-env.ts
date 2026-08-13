import dotenv from 'dotenv';

/**
 * Load the project's .env file with `override` enabled so it is the
 * authoritative source for local configuration (BASE_URL, credentials,
 * timeouts, etc.).
 *
 * Why override is needed:
 *   The stock `dotenv/config` import never overwrites variables that already
 *   exist in the environment. If a stale value is exported in the shell (e.g.
 *   `export BASE_URL=https://staging...`), it silently wins over the .env
 *   value — which is exactly the "accidentally overridden" scenario the
 *   project's config documentation warns about.
 *
 * CI behavior:
 *   .env is gitignored, so CI has no .env file and explicitly-set CI
 *   environment variables still take effect. Local development always follows
 *   .env.
 */
dotenv.config({ override: true });
