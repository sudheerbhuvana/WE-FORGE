# Certificate Templates

Place 3 PDF files here:
- `winner.pdf` — for 1st place winners
- `runner.pdf` — for 2nd & 3rd place
- `participant.pdf` — for everyone who attended

Each PDF should be **landscape A4 (842 × 595 pt)** with empty placeholders where the system will overlay:
- Recipient name (large, centered)
- Event title (medium, centered)
- Role label (small, centered) — e.g. "Winner (1st Place)"
- Certificate ID (small, at bottom — e.g. "Certificate ID: KLFORGE-EVT-XXXXXXXXXX")
- QR code (bottom-right, linking to `/certification/verify/[certId]`)

Text & QR coordinates are configured in `config/certificate-positions.json`. Adjust after testing your PDFs.
