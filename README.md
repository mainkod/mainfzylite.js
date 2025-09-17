# Mainfzylite 
# version 2.0.0

**Mainfzylite** is a lightweight, fast, and flexible JavaScript library for fuzzy string matching.  
It combines **n-gram TF-IDF similarity**, **Levenshtein distance**, and optional **vector embedding similarity** to provide accurate string matching results. Designed for offline use and small datasets.

---

## Author

**Abdul Rahman Sha**  
Email: a.rahmansha@gmail.com

---

## License

This file (`mainfzylite.js`) is licensed under a **Non-Commercial License**.  

**Terms:**

- Free to use, copy, modify, merge, publish, and distribute **for personal, educational, or non-commercial purposes**.  
- **Commercial use** — including resale, integration into paid products, deployment in revenue-generating systems, or use within proprietary platforms is **strictly prohibited** without prior written consent and a valid commercial license from the author.  
- Any unauthorized commercial use constitutes a violation of this license and may result in legal action.  

Refer to the `LICENSE` file for full details.

---

## Features

- N-gram based fuzzy matching (configurable gram size)
- TF-IDF similarity scoring
- Optional Levenshtein distance
- Optional embedding-based similarity
- Weighted similarity combination
- Auto-tune weights for optimal matching
- Simple caching for repeated queries

---

Usage
const Mainfzylite = require('./mainfzylite');

const fs = new Mainfzylite(
    ['apple','banana','orange'],
    { 
        gramSize: 2, 
        enableEmbedding: true, 
        embeddingDict: {
            'apple':[0.1,0.3],
            'banana':[0.2,0.2],
            'orange':[0.3,0.1]
        } 
    }
);

// Auto-tune TF-IDF and embedding weights
await fs.autoTuneWeights();

// Fuzzy search
console.log(fs.get('appl'));

API
constructor(arr, options)
arr — array of strings to index

options — configuration object:
gramSize (default: 2) — n-gram size
useLevenshtein (default: true) — enable Levenshtein distance
minMatchScore (default: 0.3) — minimum similarity threshold
enableEmbedding (default: false) — enable vector embedding similarity
embeddingDict — object of precomputed embeddings { str: [vector] }
weightTfIdf (default: 0.5) — weight for TF-IDF similarity
weightEmbed (default: 0.5) — weight for embedding similarity

Methods
get(query) — returns array of matches { string, score }
autoTuneWeights(sampleQueries) — automatically tunes TF-IDF and embedding weights
values() — returns all indexed strings
length() — returns number of strings
isEmpty() — checks if index is empty
