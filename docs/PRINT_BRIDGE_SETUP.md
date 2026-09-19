# Local Print Bridge — Task 3

The browser cannot reliably bypass the operating-system print dialog. The local print bridge runs on the restaurant Windows POS computer and receives print jobs from the Vercel POS over loopback, then sends them to the installed thermal printer without opening the browser print dialog.

## Install / configure

1. Install Node.js LTS on the restaurant POS computer.
2. Copy `scripts/print-bridge/config.example.json` to `scripts/print-bridge/config.json`.
3. Set `printer` to the exact Windows printer name.
4. Set a private local `token`.
5. Add the exact production POS origin to `allowedOrigins`.
6. Keep `dryRun: true` for the first connection test.
7. Run `npm run print-bridge`.
8. Configure the frontend environment:
   - `VITE_PRINT_BRIDGE_URL=http://127.0.0.1:18181`
   - `VITE_PRINT_BRIDGE_TOKEN=<same token>`
9. Run `npm run test:print-bridge` for the automated bridge test.
10. After the connection test passes, set `dryRun: false` and use the Test Print action before enabling automatic KOT printing.

## Safety

The service binds to `127.0.0.1` by default, validates allowed browser origins, supports a shared local token, limits copies to 3, limits request size, and deduplicates repeated job IDs for 10 minutes. Do not bind it to a public network interface.

Task 3 establishes transport and silent-print capability. Task 4 will map real KOT batches/tickets to printer jobs and mark KOT print state in Supabase.
