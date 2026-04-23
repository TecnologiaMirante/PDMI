const fs = require('fs');

const contentLines = fs.readFileSync('extracted-temp.jsx', 'utf8').split(/\r?\n/);

const dashMultiStr = contentLines.slice(0, 137).join('\n');
fs.writeFileSync('src/components/admin/analytics/DashboardMultiSelect.jsx', `import React, { useState } from 'react';
import { Search, Check, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export ` + dashMultiStr);

const chartStr = contentLines.slice(138, 384).join('\n');
fs.writeFileSync('src/components/admin/analytics/LineChart.jsx', `import React, { useState } from 'react';

export ` + chartStr);

const statStr = contentLines.slice(385, 425).join('\n');
fs.writeFileSync('src/components/admin/analytics/StatCard.jsx', `import React from 'react';

export ` + statStr);

const dualStr = contentLines.slice(426, 487).join('\n');
fs.writeFileSync('src/components/admin/analytics/CoverageDualBar.jsx', `import React from 'react';
import { fmtAdminTime } from '../adminUtils';

export ` + dualStr);

console.log("Extraction done magically");
