# The Local v83 – Login & Registration

A Facebook-inspired welcome and registration page appears before visitors can use the app. Uses the existing Supabase Auth project; no new SQL is required.

- Email/password sign in
- Registration with name, email and password
- Email confirmation when enabled in Supabase
- Password reset email
- Automatic session restoration, sign-out re-lock, responsive mobile design
- Existing community, admin, Games Room and other pages preserved

## Setup
Enable Email provider under Supabase Authentication > Providers. Set Site URL and redirect URLs to the deployed Netlify URL under Authentication > URL Configuration. Configure confirmation emails and SMTP before inviting members. If email confirmation is enabled, new members must confirm their email. 

## Security
This screen is a user-interface access gate, not a substitute for Supabase Row Level Security. Ensure every private table/storage bucket has correct RLS policies. The existing app's own authentication and user status checks remain responsible for authorization.

## Testing
Test registration, confirmation, login, reload persistence, password reset and logout with a fresh user on a staging site before going live.
