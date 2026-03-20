import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an intelligent business analyst embedded in a brand management platform for Egyptian clothing brands selling online and at physical bazaars.

You receive structured operational data and must identify the most important warnings, anomalies, and opportunities. Be specific — use actual numbers. Never give generic advice.

For each insight return a JSON object with:
- module: "inventory" | "finance" | "marketing" | "operations"
- severity: "info" | "warning" | "critical"
- titleEn: max 10 words in English
- titleAr: same in Arabic (formal Egyptian Arabic)
- bodyEn: 2-3 sentences, specific numbers, clear recommended action
- bodyAr: same content in Arabic

Focus areas and triggers:
INVENTORY: Product will stock out in <7 days at current velocity | Dead stock (0 sales 60d+) | Size imbalance (one size always left over) | Restock urgency
FINANCE: COD pending >14 days | Margin below 20% on a top-selling product | Ad spend spike >30% vs prior week | COD collected < 60% of shipped this month
MARKETING: Campaign ROAS below breakeven ROAS | Creative CTR dropped >30% week-over-week (creative fatigue) | One platform receiving >80% of budget but underperforming vs the other
OPERATIONS: >3 failed deliveries to same city/region (courier issue pattern) | Return rate >10% on specific product | COD failure cluster on specific courier

Output: a JSON array of insight objects only. No prose, no markdown, no explanation outside the array.`

export interface InsightData {
  inventory?: object
  finance?: object
  marketing?: object
  operations?: object
}

export interface GeneratedInsight {
  module: string
  severity: string
  titleEn: string
  titleAr: string
  bodyEn: string
  bodyAr: string
}

export async function generateInsights(data: InsightData): Promise<GeneratedInsight[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify(data),
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') return []

  try {
    const text = content.text.trim()
    const jsonText = text.startsWith('[') ? text : text.slice(text.indexOf('['))
    return JSON.parse(jsonText) as GeneratedInsight[]
  } catch {
    console.error('Failed to parse insights response:', content.text)
    return []
  }
}
