const fs = require('fs');

const extractBlock = (content, startStr, endStr) => {
    const startIndex = content.indexOf(startStr);
    if(startIndex === -1) return "NOT FOUND";
    let endIndex = -1;
    if (endStr === "EOF") {
        endIndex = content.length;
    } else {
        endIndex = content.indexOf(endStr, startIndex);
    }
    if(endIndex === -1 && endStr !== "EOF") return "END NOT FOUND";
    return content.substring(startIndex, endIndex);
};

const fullSource = fs.readFileSync('split.cjs', 'utf8'); // Wait, the original source is no longer `AnalyticsTab.jsx` because I completely rewrote `AnalyticsTab.jsx`!
