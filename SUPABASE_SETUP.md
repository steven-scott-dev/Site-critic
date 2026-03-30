# Supabase lead logging setup

## 1) Create the leads table
Run the SQL in `supabase/leads.sql` in the Supabase SQL editor.

## 2) Add Vercel environment variables
Add these in your Vercel project settings:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
```

## 3) Wire the front end to the Supabase logger
The current front end still only posts to `/api/critique`.
To save a lead first, post the form payload to `/api/log-lead-supabase` before running the critique.

Expected payload:
- name
- email
- phone
- url
- businessType
- goal
- extraContext
- critiqueScore (optional)
- followUpMessage (optional)

## 4) Recommended next cleanup
Once you confirm Supabase works, replace the old Google Sheets file `api/log-lead.js` with the Supabase version or rename the new file to `api/log-lead.js`.

## Why this route
This avoids blocked Google service-account key creation and gives you a real table for filtering, status updates, and future automation.
