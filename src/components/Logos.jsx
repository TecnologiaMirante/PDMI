// SVG inline logos para os cards que usam imagens/logos
// Replica os logos dos cards do portal original

export function GloboLogo({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" fill="white" opacity="0.95"/>
      <circle cx="40" cy="40" r="20" fill="#29ABE2"/>
      <circle cx="40" cy="40" r="12" fill="white"/>
    </svg>
  )
}

export function GrupoMiranteLogo() {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* Gaivota estilizada */}
      <svg width="100" height="60" viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 5 C30 15, 5 30, 0 35 C15 30, 30 28, 40 35 C45 38, 48 42, 50 45 C52 42, 55 38, 60 35 C70 28, 85 30, 100 35 C95 30, 70 15, 50 5Z"
              fill="#1A1A2E"/>
        <path d="M50 10 C40 18, 20 28, 10 32 C25 28, 38 27, 45 33 C47 35, 49 38, 50 40 C51 38, 53 35, 55 33 C62 27, 75 28, 90 32 C80 28, 60 18, 50 10Z"
              fill="#1A1A2E" opacity="0.6"/>
      </svg>
      <div className="text-center">
        <p className="text-[#1A1A2E] text-xs tracking-[0.3em] font-light">GRUPO</p>
        <p className="text-[#1A1A2E] text-xl font-black tracking-[0.2em]">MIRANTE</p>
      </div>
    </div>
  )
}

export function RDStationLogo() {
  return (
    <svg width="60" height="50" viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chevron duplo estilo RD Station */}
      <path d="M5 10 L25 25 L5 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
      <path d="M20 10 L40 25 L20 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <path d="M35 10 L55 25 L35 40" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ImiranteLogo() {
  return (
    <div className="text-white">
      <p className="text-xs font-light tracking-widest opacity-80">imirante</p>
      <p className="text-sm font-black tracking-wider">.com</p>
    </div>
  )
}

export function NewsLogo() {
  return (
    <div className="text-white text-right">
      <p className="text-xs font-black tracking-wide">MIRANTE</p>
      <p className="text-[10px] font-bold opacity-80">NEWS 104.1<span className="text-[8px]">FM</span></p>
    </div>
  )
}

export function MiranteFMLogo() {
  return (
    <div className="text-white text-right">
      <p className="text-xs font-light tracking-widest opacity-80">mirante fm</p>
      <p className="text-2xl font-black">96.1</p>
      <p className="text-[9px] opacity-70 tracking-widest">Toda sua!</p>
    </div>
  )
}

export function SalesReportLogo() {
  return (
    <div className="flex items-center gap-3">
      {/* Ícone de gráfico */}
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="24" width="6" height="12" rx="1" fill="#006064"/>
        <rect x="14" y="16" width="6" height="20" rx="1" fill="#00838F"/>
        <rect x="24" y="8" width="6" height="28" rx="1" fill="#006064"/>
        <polyline points="4,28 14,20 24,14 36,6" stroke="#E53935" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
      <div>
        <p className="text-[#1A1A2E] font-black text-sm tracking-wide">SALES REPORT</p>
        <p className="text-[#6B7280] text-[9px] tracking-wider">ANNUAL PERFORMANCE OVERVIEW</p>
      </div>
      {/* Pizza chart */}
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 2 A16 16 0 0 1 34 18 L18 18 Z" fill="#E53935"/>
        <path d="M34 18 A16 16 0 0 1 10 32 L18 18 Z" fill="#FF9800"/>
        <path d="M10 32 A16 16 0 0 1 2 18 L18 18 Z" fill="#FFEB3B"/>
        <path d="M2 18 A16 16 0 0 1 18 2 L18 18 Z" fill="#4CAF50"/>
      </svg>
    </div>
  )
}
