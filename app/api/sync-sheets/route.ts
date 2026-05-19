import { NextRequest, NextResponse } from 'next/server'
import { getInitials, getAvatarColor } from '@/lib/utils'

interface SheetReview {
  reviewer_name: string
  stars: number
  review_text: string
  review_date?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sheetId } = body as { sheetId: string }

    if (!sheetId) {
      return NextResponse.json({ error: 'sheetId is required' }, { status: 400 })
    }

    // Google Sheets public API (CSV export)
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`

    const response = await fetch(url, {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sheet: ${response.statusText}` },
        { status: 400 }
      )
    }

    const csvText = await response.text()
    const lines = csvText.trim().split('\n')

    if (lines.length < 2) {
      return NextResponse.json({ reviews: [] })
    }

    // Parse CSV (skip header row)
    const reviews: SheetReview[] = []
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const cols = parseCSVLine(line)

      if (cols.length < 3) continue

      const reviewerName = cols[0]?.trim() || 'Anonyme'
      const starsRaw = parseInt(cols[1]?.trim() || '5', 10)
      const stars = isNaN(starsRaw) ? 5 : Math.min(Math.max(starsRaw, 1), 5)
      const reviewText = cols[2]?.trim() || ''
      const reviewDate = cols[3]?.trim() || 'Récemment'

      if (!reviewText) continue

      reviews.push({
        reviewer_name: reviewerName,
        stars,
        review_text: reviewText,
        review_date: reviewDate,
      })
    }

    // Add avatar colors
    const reviewsWithColors = reviews.map((r, i) => {
      const color = getAvatarColor(i)
      return {
        ...r,
        reviewer_initials: getInitials(r.reviewer_name),
        reviewer_color: color.bg,
        reviewer_text_color: color.text,
        status: 'pending',
        source: 'sheets',
      }
    })

    return NextResponse.json({ reviews: reviewsWithColors, count: reviewsWithColors.length })
  } catch (error) {
    console.error('sync-sheets error:', error)
    return NextResponse.json({ error: 'Failed to sync from Google Sheets' }, { status: 500 })
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
