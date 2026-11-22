# Brand OS: a profit dashboard for COD-heavy D2C brands

If you sell direct to consumers in a cash-on-delivery market, your revenue dashboard is probably telling you a comfortable lie.

Orders are up. The ad account looks healthy. Then the courier returns a share of the shipments, some of the delivered cash sits uncollected, and a run of failed deliveries quietly turns a "winning" product into an expensive one. Rent, salaries and shipping were committed before any of that was known. At the end of the month the store grew, but the money did not.

Most analytics tools are built around card payments and clean attribution. They count an order when it is placed, not when it is delivered and collected. In Egypt and much of MENA, that gap is the business. Returns, failed delivery attempts and courier cash reconciliation are not edge cases; they are the usual reason margin disappears between the ad report and the bank statement.

Brand OS is an open-source, self-hosted operations dashboard for Shopify and D2C brands. It brings store orders, ad spend, shipping, product costs and overhead into one place, then answers a narrower and more useful question than "how much did we sell": what return on ad spend does each product need just to avoid losing money?

## What it does

**True profit per product and per order.** Margin is calculated after COGS, shipping, ad attribution, returns and an allocated share of monthly rent, salaries and other overhead. Not gross margin with a guess subtracted. The profitability view includes a margin-versus-revenue map, so the products worth scaling sit visibly apart from the ones that move volume at a loss.

**Break-even ROAS derived from unit economics.** Overhead per unit is monthly fixed cost divided by units sold that month; gross profit is selling price minus COGS, shipping and that overhead; break-even ROAS (BEROAS) is one divided by the resulting margin. A product with a 25 percent net margin needs 4.0x ROAS to break even. Brand OS produces a target per product and a blended target weighted by revenue share, then grades actual ROAS as healthy, warning or critical against it. A media buyer gets a number to beat for each SKU, not a vague instruction to "improve ROAS".

**COD reconciliation and failed-delivery tracking.** Track cash still uncollected by couriers and the failed deliveries that eat margin. A shipped order is not collected revenue until the cash is in; the finance module treats that distinction as a first-class workflow alongside expense tracking and monthly P&L.

**Inventory and restock planning.** Stock levels, product detail with unit economics, size-level demand signals and a restock planner. The point is to connect buying decisions to the same margin numbers the ad team is working from.

**Offline POS for bazaars and pop-ups.** Sell at events against the same inventory, with per-event stock and settlement history. No parallel spreadsheet for the market stall.

**The rest of the operation.** Campaign and creative-level marketing metrics, an order lifecycle with returns, a task board, role-based access for owners, managers and staff, and optional Claude-generated insights over your own data.

## Why self-hosted and open source

Order data, customer lists and unit economics are the business. Brand OS is MIT licensed and runs on infrastructure you control: React 19 and TypeScript on the front end, Express and Prisma with PostgreSQL and Redis on the back, Docker Compose to bring it all up. Integration credentials are encrypted at rest. If your accounting treatment differs from the default, you can read the break-even logic and change it rather than filing a support ticket. There is no per-seat SaaS bill and no third party hosting your margin data.

## Try it

Repository: https://github.com/azzazy967/brandos
Live site: https://azzazy967.github.io/brandos/

The short path is Docker Compose: clone the repo, generate POSTGRES_PASSWORD, JWT_SECRET and ENCRYPTION_KEY into .env, run docker compose up -d --build, then apply the schema with prisma db push and optionally load demo data. Open http://localhost:3001. The full guide, including a non-Docker setup and production notes, is in [docs/INSTALL.md](https://github.com/azzazy967/brandos/blob/main/docs/INSTALL.md).

Brand OS is early and under active development. Issues and feature requests are welcome on the repository.

## Suggested opening lines by community

- Shopify ops group: "We kept celebrating order volume while failed COD deliveries ate the margin. So I built a dashboard that reports profit after returns and overhead, with a break-even ROAS target per SKU."
- Performance marketing group: "Your media buyer should not have to guess a target ROAS. This open-source calculator derives it from COGS, shipping and this month's overhead, per product."
- MENA founder community: "Built in Egypt for the reality of cash on delivery: courier reconciliation, failed deliveries and bazaar sales in the same inventory. Open source and self-hosted."
- Self-hosting group: "MIT-licensed D2C operations dashboard. React 19, Express, Prisma, PostgreSQL, Docker Compose. The break-even math is in the repo if you want to audit it."
