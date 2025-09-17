// mainfzylite.js
// version 2.0.0

'use strict';

class Mainfzylite {
    constructor(arr = [], options = {}) {
        this.strings = arr.map(s => s.toLowerCase());
        this.gramSize = options.gramSize || 2;
        this.useLevenshtein = options.useLevenshtein !== false;
        this.minMatchScore = options.minMatchScore || 0.3;
        this.cache = new Map();
        this.enableEmbedding = options.enableEmbedding || false;
        this.embeddingDict = options.embeddingDict || {}; // {str: [vec]}
        
        // Default weights
        this.weightTfIdf = options.weightTfIdf ?? 0.5;
        this.weightEmbed = options.weightEmbed ?? 0.5;

        // TF counts
        this.tfidf = {};
        this.docCount = this.strings.length;
        this.strings.forEach(str => this._indexString(str));
    }

    // --------------------
    // Utilities
    // --------------------
    _normalize(str) {
        return str.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    }

    _ngrams(str, n = this.gramSize) {
        let s = '-' + str.replace(/[^a-z0-9]+/g, '') + '-';
        const grams = [];
        for (let i = 0; i <= s.length - n; i++) grams.push(s.slice(i, i + n));
        return grams;
    }

    _indexString(str) {
        const normalized = this._normalize(str);
        const grams = this._ngrams(normalized);
        grams.forEach(g => this.tfidf[g] = (this.tfidf[g] || 0) + 1);
    }

    _tfidfWeight(gram) {
        const df = this.tfidf[gram] || 1;
        return Math.log(1 + this.docCount / df);
    }

    _levenshtein(a, b) {
        let m = a.length, n = b.length;
        if (m === 0) return n === 0 ? 1 : 0;
        if (n === 0) return 0;
        let v0 = Array(n + 1).fill(0).map((_, i) => i);
        let v1 = Array(n + 1).fill(0);
        for (let i = 0; i < m; i++) {
            v1[0] = i + 1;
            for (let j = 0; j < n; j++) {
                let cost = a[i] === b[j] ? 0 : 1;
                v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
            }
            [v0, v1] = [v1, v0];
        }
        return 1 - v0[n] / Math.max(m, n);
    }

    _cosineSim(vecA, vecB) {
        const allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
        let dot = 0, magA = 0, magB = 0;
        allKeys.forEach(k => {
            const a = vecA[k] || 0, b = vecB[k] || 0;
            dot += a * b;
            magA += a * a;
            magB += b * b;
        });
        return magA && magB ? dot / (Math.sqrt(magA) * Math.sqrt(magB)) : 0;
    }

    _strToVec(str) {
        const vec = {};
        this._ngrams(str).forEach(g => {
            vec[g] = (vec[g] || 0) + this._tfidfWeight(g);
        });
        return vec;
    }

    _computeSimilarity(query, str) {
        const normalized = this._normalize(query);
        const vecQuery = this._strToVec(normalized);
        const vecStr = this._strToVec(str);

        // TF-IDF cosine similarity
        let simTf = this._cosineSim(vecQuery, vecStr);

        // Levenshtein similarity
        let levSim = this.useLevenshtein ? this._levenshtein(normalized, str) : 0;

        // Weighted similarity (TF-IDF + Levenshtein)
        let finalSim = 0.5 * simTf + 0.5 * levSim;

        // Optional embedding similarity
        if (this.enableEmbedding && this.embeddingDict[normalized] && this.embeddingDict[str]) {
            const emb1 = this.embeddingDict[normalized];
            const emb2 = this.embeddingDict[str];
            let dot = 0, mag1 = 0, mag2 = 0;
            for (let i = 0; i < emb1.length; i++) {
                dot += emb1[i] * emb2[i];
                mag1 += emb1[i] * emb1[i];
                mag2 += emb2[i] * emb2[i];
            }
            const cosEmb = mag1 && mag2 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
            finalSim = this.weightTfIdf * finalSim + this.weightEmbed * cosEmb;
        }

        return finalSim;
    }

    // --------------------
    // Public methods
    // --------------------
    get(query) {
        const normalized = this._normalize(query);
        if (this.cache.has(normalized)) return this.cache.get(normalized);

        const results = [];
        this.strings.forEach(str => {
            const sim = this._computeSimilarity(query, str);
            if (sim >= this.minMatchScore) results.push({ string: str, score: sim });
        });

        results.sort((a, b) => b.score - a.score);
        this.cache.set(normalized, results);
        return results;
    }

    async autoTuneWeights(sampleQueries = []) {
        if (!sampleQueries.length) sampleQueries = this.strings.slice(0, Math.min(20, this.strings.length));
        let bestScore = -Infinity;
        let bestWeights = { tf: this.weightTfIdf, embed: this.weightEmbed };
        const steps = [0, 0.25, 0.5, 0.75, 1];

        for (const wTf of steps) {
            const wEmb = 1 - wTf;
            this.weightTfIdf = wTf;
            this.weightEmbed = wEmb;
            let total = 0;
            for (const q of sampleQueries) {
                const res = this.get(q);
                if (res.length) total += res[0].score;
            }
            if (total > bestScore) {
                bestScore = total;
                bestWeights = { tf: wTf, embed: wEmb };
            }
        }

        this.weightTfIdf = bestWeights.tf;
        this.weightEmbed = bestWeights.embed;
        console.log("Auto-tuned weights:", this.weightTfIdf, this.weightEmbed);
    }

    values() { return this.strings; }
    length() { return this.strings.length; }
    isEmpty() { return this.strings.length === 0; }
}

module.exports = Mainfzylite;

// ========================
// Example usage:
// const Mainfzylite = require('./mainfzylite');
// const fs = new Mainfzylite(
//     ['apple','banana','orange'],
//     { gramSize:2, enableEmbedding:true, embeddingDict:{'apple':[0.1,0.3],'banana':[0.2,0.2],'orange':[0.3,0.1]} }
// );
// await fs.autoTuneWeights(); // auto-tune weights
// console.log(fs.get('appl'));