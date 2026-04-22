# generate-embedding

Edge Function for writing real semantic embeddings to:
- `student_profiles.embedding`
- `role_postings.embedding`

## Deploy

From project root:

```bash
supabase functions deploy generate-embedding
```

### Search (`query_embed`)

The app can call this function with `{ "mode": "query_embed", "text": "your search" }` to get a **384-dim** vector (same `gte-small` space as stored posting embeddings). That path requires **Supabase AI** in the Edge runtime (`globalThis.Supabase.ai.Session`). If search returns errors mentioning `supabase_ai_session_unavailable`, enable AI / inference for Edge Functions in the Supabase project and redeploy, or check Edge Function logs in the dashboard.

## Required secrets

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`SUPABASE_URL` is provided by Supabase Functions runtime.

## Optional webhooks (recommended)

In Supabase Dashboard:

1. Database -> Webhooks -> Create webhook
2. Use function endpoint `generate-embedding`
3. Add events:
   - `student_profiles`: `INSERT`, `UPDATE`
   - `role_postings`: `INSERT`, `UPDATE`
4. Send payload including `table` and `record` shape expected by function.

This repo also invokes the function directly from server actions after:
- student onboarding save
- role posting creation

So recommendations can work even before webhooks are configured.

## Model

This function uses Supabase AI model:

- `gte-small`

Configured in code as:

```ts
const model = new Supabase.ai.Session("gte-small");
```

## Notes

- The function accepts either payload shape:
  - `{ table, record }`
  - `{ table, new }` (common in DB webhooks)
- The function intentionally returns errors if semantic inference is unavailable, so bad embeddings
  never pollute recommendation quality.
