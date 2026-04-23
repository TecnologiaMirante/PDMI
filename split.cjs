const fs = require('fs');
const content = fs.readFileSync('src/components/admin/AnalyticsTab.jsx', 'utf8');

const extractBlock = (startStr, endStr) => {
    const startIndex = content.indexOf(startStr);
    let endIndex = content.indexOf(endStr, startIndex);
    return content.substring(startIndex, endIndex);
};

const csvContent = extractBlock("function exportAnalyticsCSV({", "async function exportAnalyticsPDF({");
fs.writeFileSync('src/components/admin/analytics/ExportCSV.js', "import { fmtAdminTime } from '../adminUtils';\n\nexport " + csvContent.trim());

const pdfContent = extractBlock("async function exportAnalyticsPDF({", "// ── Multi-select de dashboards");
fs.writeFileSync('src/components/admin/analytics/ExportPDF.js', "import { jsPDF } from 'jspdf';\nimport { fmtAdminTime } from '../adminUtils';\n\nexport " + pdfContent.trim());

const multiContent = extractBlock("function DashboardMultiSelect({", "// ── Gráfico de Linha em Canvas Puro");
fs.writeFileSync('src/components/admin/analytics/DashboardMultiSelect.jsx', `import React, { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export ` + multiContent.trim());

const chartContent = extractBlock("function LineChart({", "// ── Componentes de UI ──");
fs.writeFileSync('src/components/admin/analytics/LineChart.jsx', `import React, { useMemo, useState } from 'react';

export ` + chartContent.trim());

const statContent = extractBlock("function StatCard({", "function CoverageDualBar({");
fs.writeFileSync('src/components/admin/analytics/StatCard.jsx', `import React from 'react';

export ` + statContent.trim());

const coverageContent = extractBlock("function CoverageDualBar({", "export default function AnalyticsTab({");
fs.writeFileSync('src/components/admin/analytics/CoverageDualBar.jsx', `import React from 'react';

export ` + coverageContent.trim());

console.log("Extraction done");
