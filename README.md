# Accountea

A small accounting workspace: Chart of Accounts, Business Transactions, Adjustments, Trial Balances, Worksheet and the financial statements.

## Open it

Just open `index.html` in a browser, or run `node server.js` and visit http://localhost:3000.

## Put it online for free

Upload the files in this folder (everything except `server.js` and `package.json` is needed; those two are optional) to any static host:

- **Netlify:** go to app.netlify.com/drop and drag the folder in.
- **GitHub Pages:** put the files in a repo, then Settings, Pages, deploy from the main branch.
- **Cloudflare Pages / Vercel:** create a project and upload the folder.

Make sure `index.html` is at the top level of what you upload.

## Pages

Dashboard, then three dropdown groups in the sidebar:

- **Records:** Chart of Accounts, Business Transactions
- **Worksheet:** Trial Balance, Adjustments, Adjusted Trial Balance, Full Worksheet (10 columns)
- **Financial Statements:** Income Statement, Owner's Equity, Financial Position, Cashflow

Your entries live in the page while it is open. Refreshing resets them to the worksheet data.
