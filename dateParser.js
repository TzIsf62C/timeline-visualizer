/**
 * Date Parser - Converts vague date strings to ISO dates
 */

const DateParser = (() => {
    // Month names mapping
    const MONTHS = {
        'january': 0, 'jan': 0,
        'february': 1, 'feb': 1,
        'march': 2, 'mar': 2,
        'april': 3, 'apr': 3,
        'may': 4,
        'june': 5, 'jun': 5,
        'july': 6, 'jul': 6,
        'august': 7, 'aug': 7,
        'september': 8, 'sep': 8, 'sept': 8,
        'october': 9, 'oct': 9,
        'november': 10, 'nov': 10,
        'december': 11, 'dec': 11
    };

    // Quarter to month mapping (middle of quarter)
    const QUARTERS = {
        'q1': 1, // February (middle of Q1)
        'q2': 4, // May
        'q3': 7, // August
        'q4': 10 // November
    };

    // Season to month mapping
    const SEASONS = {
        'spring': 3, // April
        'summer': 6, // July
        'fall': 9, // October
        'autumn': 9, // October
        'winter': 0 // January (winter spans years, using start)
    };

    /**
     * Parse a vague date string and return ISO date or date range
     * @param {string} text - The vague date text
     * @returns {Object} { startDate: string, endDate: string|null, isOngoing: boolean }
     */
    function parse(text) {
        if (!text) return null;

        const normalized = text.toLowerCase().trim();
        
        // Check for ongoing
        if (normalized === 'ongoing' || normalized === 'continuous' || normalized === 'tbd' || normalized === 'indefinite') {
            return {
                startDate: formatDate(new Date()),
                endDate: null,
                isOngoing: true
            };
        }
        
        // Check for date ranges (April-June 2026, Q1-Q2 2026, etc.)
        const rangeResult = parseRange(normalized);
        if (rangeResult) return rangeResult;

        // Try different parsing strategies for single dates
        try {
            // 1. Try fiscal year patterns (FY27, fiscal year 2027)
            let result = parseFiscalYear(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 2. Try quarter patterns (Q1 2026, quarter 1 2026)
            result = parseQuarter(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 3. Try season patterns (spring 2026, summer of 2026)
            result = parseSeason(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 4. Try month patterns (September 2026, sep 2026, by september 2026)
            result = parseMonth(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 5. Try early/mid/late patterns (mid-2027, early 2026, late 2027)
            result = parseVaguePeriod(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 6. Try "end of year" patterns
            result = parseEndOfYear(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 7. Try "starting in" patterns
            result = parseStartingIn(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // 8. Try just year (2026, by 2026)
            result = parseYear(normalized);
            if (result) return { startDate: result, endDate: null, isOngoing: false };

            // If nothing matches, try standard date parsing
            const date = new Date(text);
            if (!isNaN(date.getTime())) {
                return { startDate: formatDate(date), endDate: null, isOngoing: false };
            }

            // Fallback: return null if unparseable
            return null;
        } catch (e) {
            console.warn('Date parsing error:', text, e);
            return null;
        }
    }

    /**
     * Parse date range patterns
     */
    function parseRange(text) {
        // Month ranges with explicit years: December 2026 - March 2027
        const monthRangeYearsPattern = /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{4})\s*[-–—]\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{4})/i;
        let match = text.match(monthRangeYearsPattern);
        if (match) {
            const startMonth = MONTHS[match[1].toLowerCase()];
            const startYear = parseInt(match[2]);
            const endMonth = MONTHS[match[3].toLowerCase()];
            const endYear = parseInt(match[4]);
            return {
                startDate: `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`,
                endDate: `${endYear}-${String(endMonth + 1).padStart(2, '0')}-28`,
                isOngoing: false
            };
        }
        
        // Month ranges: April-June 2026, Jan-Mar 2026
        const monthRangePattern = /(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s*[-–—]\s*(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{4})/i;
        match = text.match(monthRangePattern);
        if (match) {
            const startMonth = MONTHS[match[1].toLowerCase()];
            const endMonth = MONTHS[match[2].toLowerCase()];
            const year = parseInt(match[3]);
            return {
                startDate: `${year}-${String(startMonth + 1).padStart(2, '0')}-01`,
                endDate: `${year}-${String(endMonth + 1).padStart(2, '0')}-28`,
                isOngoing: false
            };
        }
        
        // Quarter ranges: Q1-Q2 2026, Q2-Q4 2026
        const quarterRangePattern = /q(\d)\s*[-–—]\s*q(\d)\s+(\d{4})/i;
        match = text.match(quarterRangePattern);
        if (match) {
            const startQ = parseInt(match[1]);
            const endQ = parseInt(match[2]);
            const year = parseInt(match[3]);
            if (startQ >= 1 && startQ <= 4 && endQ >= 1 && endQ <= 4) {
                const startMonth = QUARTERS[`q${startQ}`];
                const endMonth = QUARTERS[`q${endQ}`];
                return {
                    startDate: `${year}-${String(startMonth).padStart(2, '0')}-01`,
                    endDate: `${year}-${String(endMonth + 2).padStart(2, '0')}-28`,
                    isOngoing: false
                };
            }
        }
        
        // Year ranges: 2026-2027
        const yearRangePattern = /(\d{4})\s*[-–—]\s*(\d{4})/;
        match = text.match(yearRangePattern);
        if (match) {
            const startYear = parseInt(match[1]);
            const endYear = parseInt(match[2]);
            return {
                startDate: `${startYear}-01-01`,
                endDate: `${endYear}-12-31`,
                isOngoing: false
            };
        }
        
        return null;
    }
    
    /**
     * Parse fiscal year patterns
     * FY27 = fiscal year ending Sept 30, 2027
     */
    function parseFiscalYear(text) {
        const fyPattern = /(?:fy|fiscal\s+year)\s*(\d{2,4})/i;
        const match = text.match(fyPattern);
        
        if (match) {
            let year = parseInt(match[1]);
            // Convert 2-digit to 4-digit year
            if (year < 100) {
                year += 2000;
            }
            // FY ends on September 30 of that year
            return `${year}-09-30`;
        }
        return null;
    }

    /**
     * Parse quarter patterns
     */
    function parseQuarter(text) {
        const qPattern = /(?:q|quarter)\s*(\d)\s*(?:of\s+)?(\d{4})/i;
        const match = text.match(qPattern);
        
        if (match) {
            const quarter = parseInt(match[1]);
            const year = parseInt(match[2]);
            
            if (quarter >= 1 && quarter <= 4) {
                const month = QUARTERS[`q${quarter}`];
                return `${year}-${String(month).padStart(2, '0')}-01`;
            }
        }
        return null;
    }

    /**
     * Parse season patterns
     */
    function parseSeason(text) {
        for (const [season, month] of Object.entries(SEASONS)) {
            const pattern = new RegExp(`${season}\\s+(?:of\\s+)?(\\d{4})`, 'i');
            const match = text.match(pattern);
            
            if (match) {
                const year = parseInt(match[1]);
                // Special handling for winter (could be start or end of year)
                const adjustedYear = season === 'winter' && month === 0 ? year + 1 : year;
                return `${adjustedYear}-${String(month + 1).padStart(2, '0')}-01`;
            }
        }
        return null;
    }

    /**
     * Parse month patterns
     */
    function parseMonth(text) {
        for (const [monthName, monthIndex] of Object.entries(MONTHS)) {
            const pattern = new RegExp(`(?:by\\s+)?${monthName}\\s+(\\d{4})`, 'i');
            const match = text.match(pattern);
            
            if (match) {
                const year = parseInt(match[1]);
                return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
            }
        }
        return null;
    }

    /**
     * Parse early/mid/late patterns
     */
    function parseVaguePeriod(text) {
        const patterns = [
            { regex: /early[- ](\d{4})/, month: 2 },  // March
            { regex: /mid[- ](\d{4})/, month: 7 },    // July
            { regex: /late[- ](\d{4})/, month: 10 }   // November
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const year = parseInt(match[1]);
                return `${year}-${String(pattern.month).padStart(2, '0')}-01`;
            }
        }
        return null;
    }

    /**
     * Parse "end of year" patterns
     */
    function parseEndOfYear(text) {
        const endPattern = /(?:end\s+of|by\s+the\s+end\s+of)\s+(\d{4})/i;
        const match = text.match(endPattern);
        
        if (match) {
            const year = parseInt(match[1]);
            return `${year}-12-31`;
        }
        return null;
    }

    /**
     * Parse "starting in" patterns
     */
    function parseStartingIn(text) {
        const startPattern = /(?:start(?:ing)?\s+in|beginning\s+(?:in|of))\s+(\d{4})/i;
        const match = text.match(startPattern);
        
        if (match) {
            const year = parseInt(match[1]);
            return `${year}-01-01`;
        }
        return null;
    }

    /**
     * Parse just year
     */
    function parseYear(text) {
        // Check for "by YYYY" first - this means deadline of start of that year
        const byYearPattern = /by\s+(\d{4})/i;
        let match = text.match(byYearPattern);
        if (match) {
            const year = parseInt(match[1]);
            if (year >= 2000 && year <= 2100) {
                return `${year}-01-01`;
            }
        }
        
        // Match standalone year
        const yearPattern = /(?:^|\s)(\d{4})(?:\s|$)/;
        match = text.match(yearPattern);
        
        if (match) {
            const year = parseInt(match[1]);
            // If it's just a year, assume middle of year (July)
            if (year >= 2000 && year <= 2100) {
                return `${year}-07-01`;
            }
        }
        return null;
    }

    /**
     * Format date object to ISO string
     */
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format ISO date to human readable
     */
    function formatReadable(isoDate) {
        if (!isoDate) return '';
        const date = new Date(isoDate);
        if (isNaN(date.getTime())) return '';
        
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    /**
     * Format date range to human readable
     */
    function formatRange(parseResult) {
        if (!parseResult) return '';
        if (parseResult.isOngoing) return 'Ongoing';
        
        const start = formatReadable(parseResult.startDate);
        if (!parseResult.endDate) return start;
        
        const end = formatReadable(parseResult.endDate);
        return `${start} – ${end}`;
    }

    /**
     * Get today's date as ISO string
     */
    function today() {
        return formatDate(new Date());
    }

    return {
        parse,
        formatReadable,
        formatRange,
        today
    };
})();
