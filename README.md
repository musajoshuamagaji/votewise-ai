# VoteWise AI — Hackathon MVP

A mobile-friendly, nonpartisan prototype for AI-assisted assessment of election-related claims.

## What works in this MVP
- Responsive website and installable PWA shell.
- Claim analysis through a server-side Vercel function.
- English and Hausa response-language selection.
- Structured assessment, reasoning, verification steps, and source suggestions.
- API key stays on the server; the browser never receives it.
- Basic security headers, input length limits, and error handling.

## Important limitation
The MVP does **not** have live web search or automatic access to INEC records. It must not be described as a live fact-checking engine. The model is instructed to avoid inventing URLs or claiming it checked sources. Users must verify claims using official communications and multiple credible sources. For a competition submission, explain this limitation clearly and show how the next iteration will add reliable retrieval from approved sources.

## Deploy from an Android phone
1. Extract this ZIP on your phone, or upload the files into a GitHub repository.
2. In GitHub, create a new repository named `votewise-ai`.
3. Upload all files and the `api` folder. Ensure `api/analyze.js` remains inside the `api` folder.
4. Open Vercel and import the GitHub repository.
5. Deploy the project.
6. In Vercel, open Project Settings → Environment Variables.
7. Add `OPENROUTER_API_KEY` with your provider key. Add `OPENROUTER_MODEL` with `openai/gpt-4o-mini` if that model is available to your account. Add `APP_URL` with your deployed site URL.
8. Redeploy after adding or changing environment variables.
9. Open the deployed website and test with a non-sensitive example claim.

## Keep API keys safe
- Never put the key in `index.html`, a public GitHub file, a screenshot, or a client-side JavaScript variable.
- Never share the key in chat.
- If a key was exposed, revoke it at the provider and create a replacement.
- Check provider pricing and model availability before testing. AI API use may cost money.

## Local test
This project uses a Vercel serverless function. Opening `index.html` directly will display the page but the `/api/analyze` endpoint will not work. To test the whole application locally, use the Vercel CLI in a Node.js environment with environment variables configured.

## Suggested demo
Use a fictional, non-sensitive claim such as:
"An anonymous social media post says the polling time has changed in a local area. It provides no official announcement or source."
The expected result is an assessment that the claim is unverified and a list of sensible verification steps. The system should not invent an official confirmation.

## Roadmap before competition submission
- Add retrieval from approved, publicly accessible official and reputable sources, with links and timestamps.
- Add tests for the API, malformed inputs, rate limiting, and model errors.
- Validate Hausa translations with fluent speakers.
- Conduct usability tests with a small diverse group and document findings.
- Add privacy notice, data retention policy, and abuse protections before public launch.
- Verify the competition's current rules, eligibility, deliverables, and submission deadline directly with the organisers.
