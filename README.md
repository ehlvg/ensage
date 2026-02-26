# 🌿 ensage

minimal self-hosted pastebin and file drop built with sveltekit, sqlite and filesystem storage.

## architecture

- single-node sveltekit app with node adapter
- sqlite database for item metadata (text, files, links)
- uploads stored as flat files in an uploads directory
- simple hmac-based access tokens for password-protected items
- hourly cleanup job removing expired items and files
- optional link previews and ai summaries via exa api

## features

- share text snippets with syntax highlighting
- upload files up to a configurable size limit
- share external links with rich previews
- optional item password protection
- time-to-live options (1h, 24h, 7d, never)
- light and dark themes, server-configurable accent color

## how to run

1. install dependencies:

   ```sh
   bun install
   ```

2. create an `.env` file (or export env vars) if you want to override defaults:
   - `PORT` – http port (default: 3000)
   - `UPLOAD_DIR` – directory for stored files (default: ./uploads)
   - `DB_PATH` – sqlite database path (default: ./db/ensage.db)
   - `MAX_FILE_SIZE` – max file size in bytes (default: 524288000)
   - `MAX_TEXT_SIZE` – max text size in bytes (default: 5242880)
   - `TOKEN_SECRET` – hmac secret for access tokens (set this in production)
   - `EXA_API_KEY` – optional api key for link summaries

3. start the app in development:

   ```sh
   bun dev
   ```

4. build and run in production:

   ```sh
   bun build
   bun start
   ```
