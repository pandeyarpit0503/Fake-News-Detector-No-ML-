function extractEntities(text) {
    return {
        // all numbers including decimals
        numbers: [...new Set(text.match(/\b\d+(\.\d+)?\b/g) || [])],

        // capitalized words (names, places, orgs)
        properNouns: [
            ...new Set(
                (text.match(/\b[A-Z][a-z]{2,}\b/g) || []).filter(
                    w =>
                        ![
                            "The", "This", "That", "When", "Where",
                            "What", "How", "Who", "After", "Before",
                            "During", "While", "Since", "Until",
                        ].includes(w)
                )
            ),
        ],

        // year patterns
        years: [...new Set(text.match(/\b(19|20)\d{2}\b/g) || [])],

        // month names
        months: [
            ...new Set(
                (
                    text.match(
                        /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g
                    ) || []
                )
            ),
        ],

        // percentage values
        percentages: [...new Set(text.match(/\d+(\.\d+)?%/g) || [])],
    };
}

function scoreEntityMatch(userText, articleText) {
    const userEntities = extractEntities(userText);
    const articleEntities = extractEntities(articleText);
    let score = 0;
    let maxScore = 0;

    // Check proper noun overlap (names, places)
    if (userEntities.properNouns.length > 0) {
        maxScore += 8;
        const matches = userEntities.properNouns.filter(n =>
            articleText.includes(n)
        ).length;
        score += (matches / userEntities.properNouns.length) * 8;
    }

    // Check number overlap — exact match required
    if (userEntities.numbers.length > 0) {
        maxScore += 6;
        const matches = userEntities.numbers.filter(n =>
            articleEntities.numbers.includes(n)
        ).length;
        score += (matches / userEntities.numbers.length) * 6;
    }

    // Check year overlap
    if (userEntities.years.length > 0) {
        maxScore += 4;
        const matches = userEntities.years.filter(y =>
            articleEntities.years.includes(y)
        ).length;
        score += (matches / userEntities.years.length) * 4;
    }

    // Check percentage overlap
    if (userEntities.percentages.length > 0) {
        maxScore += 2;
        const matches = userEntities.percentages.filter(p =>
            articleEntities.percentages.includes(p)
        ).length;
        score += (matches / userEntities.percentages.length) * 2;
    }

    // Normalize to 0–20 range
    return maxScore > 0 ? (score / maxScore) * 20 : 0;
}

module.exports = { extractEntities, scoreEntityMatch };
