# Email Assets - Cloudinary

This directory contains assets used in email templates.

## Files

- `bookloop-logo.png` - Main logo used in email headers

## Current Configuration

The BookLoop logo is hosted on Cloudinary and used in all email templates.

**Logo URL:**
```
https://res.cloudinary.com/dojthldnc/image/upload/v1762643032/bookloop/logos/bookloop-logo_v0pf3k.png
```

**Cloud Name:** `dojthldnc`
**Public ID:** `bookloop/logos/bookloop-logo_v0pf3k`

## Email Template Usage

The logo is used in:
- `apps/api/src/common/mails/templates/otp-verification.hbs`

Display settings:
- Width: 240px on desktop
- Responsive (scales down on mobile)
- Minimum width: 200px
- Format: PNG with transparency

## Updating the Logo

If you need to update the logo:

1. Upload new logo to Cloudinary
2. Update the URL in all email templates
3. Copy updated templates to dist folder:
   ```bash
   cp apps/api/src/common/mails/templates/*.hbs apps/api/dist/common/mails/templates/
   ```
