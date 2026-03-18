const STOPWORDS = [
  "a","an","the","is","are","was","were","be","been","being",
  "have","has","had","do","does","did","will","would","could",
  "should","may","might","shall","can","need","dare","ought",
  "in","on","at","to","of","and","or","but","for","with",
  "this","that","it","its","from","by","as","into","about",
  "after","before","between","through","during","above","below",
  "than","then","when","where","who","which","how","what",
  "their","there","they","them","these","those","your","our",
  "his","her","him","she","he","we","us","my","me","i","you",
  "not","no","nor","so","yet","both","either","neither","just",
  "also","more","most","other","some","such","own","same","than"
];

function extractKeywords(text) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.includes(w));

  // frequency count
  const freq = {};
  words.forEach(w => (freq[w] = (freq[w] || 0) + 1));

  // sort by frequency, return top 10
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

module.exports = { extractKeywords };
