const fs = require('fs');

const content = fs.readFileSync('src/components/admin/analytics/CoverageDualBar.jsx', 'utf8');

// We have the exact string blocks
function extractCleanBlock(startText, endText) {
    const startIndex = content.indexOf(startText);
    const endIndex = content.indexOf(endText, startIndex);
    if(startIndex === -1 || endIndex === -1) {
       console.log("NOT FOUND", startText.substring(0, 20));
       return "";
    }
    return content.substring(startIndex, endIndex).trim();
}

const multiContent = extractCleanBlock("function DashboardMultiSelect({", "// ── Gráfico de Linha em Canvas Puro");
fs.writeFileSync('src/components/admin/analytics/DashboardMultiSelect.jsx', `import React, { useState } from 'react';
import { Search, Check, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export ` + multiContent);

const chartContent = extractCleanBlock("function LineChart({", "// ── Componentes de UI ──");
fs.writeFileSync('src/components/admin/analytics/LineChart.jsx', `import React, { useMemo, useState } from 'react';

export ` + chartContent);

const statContent = extractCleanBlock("function StatCard({", "function CoverageDualBar({");
fs.writeFileSync('src/components/admin/analytics/StatCard.jsx', `import React from 'react';
import { cn } from '@/lib/utils';

export ` + statContent);

const coverageContent = extractCleanBlock("function CoverageDualBar({", "export default function AnalyticsTab({");
if (coverageContent === "") {
    // try to get until end of file if AnalyticsTab is missing
    const s = content.indexOf("function CoverageDualBar({");
    const e = content.length;
    const c = content.substring(s, e).trim();
    fs.writeFileSync('src/components/admin/analytics/CoverageDualBar.jsx', `import React from 'react';
import { Percent } from 'lucide-react';

export ` + c);
} else {
    fs.writeFileSync('src/components/admin/analytics/CoverageDualBar.jsx', `import React from 'react';
import { Percent } from 'lucide-react';

export ` + coverageContent);
}

console.log("Cleaned up files");
