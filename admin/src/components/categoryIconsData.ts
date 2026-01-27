// 高级烟花分类图标集合
export const icons = [
  {
    key: 'firework-burst',
    name: '组合烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="url(#burst-grad)" opacity="0.15"/>
      <path d="M24 8V24M24 24L34 14M24 24L14 14M24 24L34 34M24 24L14 34M24 24H40M24 24H8M24 24V40" stroke="url(#burst-line)" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="24" cy="8" r="3" fill="#FF6B6B"/>
      <circle cx="34" cy="14" r="2.5" fill="#FFE66D"/>
      <circle cx="40" cy="24" r="2.5" fill="#4ECDC4"/>
      <circle cx="34" cy="34" r="2.5" fill="#A78BFA"/>
      <circle cx="24" cy="40" r="3" fill="#F472B6"/>
      <circle cx="14" cy="34" r="2.5" fill="#60A5FA"/>
      <circle cx="8" cy="24" r="2.5" fill="#34D399"/>
      <circle cx="14" cy="14" r="2.5" fill="#FB923C"/>
      <circle cx="24" cy="24" r="4" fill="url(#burst-center)"/>
      <defs>
        <linearGradient id="burst-grad" x1="4" y1="4" x2="44" y2="44">
          <stop stop-color="#FF6B6B"/>
          <stop offset="1" stop-color="#A78BFA"/>
        </linearGradient>
        <linearGradient id="burst-line" x1="8" y1="8" x2="40" y2="40">
          <stop stop-color="#FF6B6B"/>
          <stop offset="0.5" stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#A78BFA"/>
        </linearGradient>
        <radialGradient id="burst-center">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </radialGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-child',
    name: '儿童烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="28" width="8" height="16" rx="2" fill="url(#child-stick)"/>
      <circle cx="24" cy="20" r="12" fill="url(#child-spark)" opacity="0.2"/>
      <path d="M24 12L26 18L32 18L27 22L29 28L24 24L19 28L21 22L16 18L22 18Z" fill="url(#child-star)"/>
      <circle cx="16" cy="14" r="2" fill="#60A5FA"/>
      <circle cx="32" cy="14" r="2" fill="#F472B6"/>
      <circle cx="14" cy="22" r="1.5" fill="#34D399"/>
      <circle cx="34" cy="22" r="1.5" fill="#FFE66D"/>
      <path d="M18 10L19 12M30 10L29 12M14 18L16 19M34 18L32 19" stroke="#A78BFA" stroke-width="1.5" stroke-linecap="round"/>
      <defs>
        <linearGradient id="child-stick" x1="20" y1="28" x2="28" y2="44">
          <stop stop-color="#94A3B8"/>
          <stop offset="1" stop-color="#64748B"/>
        </linearGradient>
        <radialGradient id="child-spark">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </radialGradient>
        <linearGradient id="child-star" x1="16" y1="12" x2="32" y2="28">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-single',
    name: '单品烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 44V28" stroke="#64748B" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 44H28" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="24" cy="28" rx="6" ry="4" fill="url(#single-base)"/>
      <circle cx="24" cy="16" r="10" fill="url(#single-glow)" opacity="0.3"/>
      <path d="M24 6V16M24 16L30 10M24 16L18 10M24 16L30 22M24 16L18 22" stroke="url(#single-ray)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="6" r="2.5" fill="#FF6B6B"/>
      <circle cx="30" cy="10" r="2" fill="#FFE66D"/>
      <circle cx="18" cy="10" r="2" fill="#4ECDC4"/>
      <circle cx="30" cy="22" r="2" fill="#A78BFA"/>
      <circle cx="18" cy="22" r="2" fill="#F472B6"/>
      <circle cx="24" cy="16" r="3" fill="url(#single-center)"/>
      <defs>
        <linearGradient id="single-base" x1="18" y1="24" x2="30" y2="32">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <radialGradient id="single-glow">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FF6B6B" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="single-ray" x1="18" y1="6" x2="30" y2="22">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
        <radialGradient id="single-center">
          <stop stop-color="#FFF"/>
          <stop offset="1" stop-color="#FFE66D"/>
        </radialGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-small',
    name: '小型烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="22" y="32" width="4" height="12" rx="1" fill="#64748B"/>
      <circle cx="24" cy="24" r="8" fill="url(#small-glow)" opacity="0.25"/>
      <path d="M24 16L25.5 22L31 20L26 24L31 28L25.5 26L24 32L22.5 26L17 28L22 24L17 20L22.5 22Z" fill="url(#small-spark)"/>
      <circle cx="24" cy="24" r="2.5" fill="#FFF"/>
      <circle cx="24" cy="14" r="1.5" fill="#FF6B6B"/>
      <circle cx="32" cy="20" r="1.5" fill="#FFE66D"/>
      <circle cx="32" cy="28" r="1.5" fill="#4ECDC4"/>
      <circle cx="16" cy="20" r="1.5" fill="#A78BFA"/>
      <circle cx="16" cy="28" r="1.5" fill="#F472B6"/>
      <defs>
        <radialGradient id="small-glow">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FF6B6B" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="small-spark" x1="17" y1="16" x2="31" y2="32">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-rocket',
    name: '冲天炮',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L28 20H20L24 4Z" fill="url(#rocket-body)"/>
      <rect x="20" y="20" width="8" height="12" fill="url(#rocket-tube)"/>
      <path d="M18 32L20 20H28L30 32H18Z" fill="url(#rocket-fin)"/>
      <ellipse cx="24" cy="32" rx="6" ry="2" fill="#991B1B"/>
      <path d="M24 36C24 36 20 40 18 44M24 36C24 36 28 40 30 44M24 36V44" stroke="url(#rocket-trail)" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="4" r="3" fill="#FFE66D"/>
      <circle cx="24" cy="4" r="1.5" fill="#FFF"/>
      <defs>
        <linearGradient id="rocket-body" x1="20" y1="4" x2="28" y2="20">
          <stop stop-color="#FF6B6B"/>
          <stop offset="1" stop-color="#E53734"/>
        </linearGradient>
        <linearGradient id="rocket-tube" x1="20" y1="20" x2="28" y2="32">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <linearGradient id="rocket-fin" x1="18" y1="20" x2="30" y2="32">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FB923C"/>
        </linearGradient>
        <linearGradient id="rocket-trail" x1="18" y1="36" x2="30" y2="44">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B" stop-opacity="0.5"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-fountain',
    name: '喷泉烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 44H32L30 32H18L16 44Z" fill="url(#fountain-base)"/>
      <ellipse cx="24" cy="32" rx="6" ry="2" fill="#991B1B"/>
      <path d="M24 28C24 28 16 20 16 14C16 8 20 4 24 4C28 4 32 8 32 14C32 20 24 28 24 28Z" fill="url(#fountain-flame)" opacity="0.9"/>
      <path d="M24 24C24 24 20 18 20 14C20 10 22 8 24 8C26 8 28 10 28 14C28 18 24 24 24 24Z" fill="url(#fountain-inner)"/>
      <circle cx="18" cy="10" r="2" fill="#60A5FA"/>
      <circle cx="30" cy="10" r="2" fill="#F472B6"/>
      <circle cx="14" cy="16" r="1.5" fill="#34D399"/>
      <circle cx="34" cy="16" r="1.5" fill="#A78BFA"/>
      <circle cx="16" cy="22" r="1.5" fill="#FFE66D"/>
      <circle cx="32" cy="22" r="1.5" fill="#4ECDC4"/>
      <defs>
        <linearGradient id="fountain-base" x1="16" y1="32" x2="32" y2="44">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <linearGradient id="fountain-flame" x1="16" y1="4" x2="32" y2="28">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
        <linearGradient id="fountain-inner" x1="20" y1="8" x2="28" y2="24">
          <stop stop-color="#FFF"/>
          <stop offset="1" stop-color="#FFE66D"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-cake',
    name: '蛋糕烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="28" width="28" height="16" rx="2" fill="url(#cake-box)"/>
      <rect x="12" y="32" width="24" height="2" fill="#FFE66D" opacity="0.5"/>
      <rect x="12" y="38" width="24" height="2" fill="#FFE66D" opacity="0.5"/>
      <circle cx="16" cy="22" r="6" fill="url(#cake-burst1)" opacity="0.3"/>
      <circle cx="32" cy="22" r="6" fill="url(#cake-burst2)" opacity="0.3"/>
      <circle cx="24" cy="18" r="8" fill="url(#cake-burst3)" opacity="0.3"/>
      <path d="M16 16L17 20L21 18L18 22L21 26L17 24L16 28L15 24L11 26L14 22L11 18L15 20Z" fill="url(#cake-star1)" transform="scale(0.6) translate(10, 14)"/>
      <path d="M32 16L33 20L37 18L34 22L37 26L33 24L32 28L31 24L27 26L30 22L27 18L31 20Z" fill="url(#cake-star2)" transform="scale(0.6) translate(22, 14)"/>
      <path d="M24 12L25.5 17L30 15.5L26 19L30 22.5L25.5 21L24 26L22.5 21L18 22.5L22 19L18 15.5L22.5 17Z" fill="url(#cake-star3)" transform="scale(0.7) translate(9, 2)"/>
      <defs>
        <linearGradient id="cake-box" x1="10" y1="28" x2="38" y2="44">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <radialGradient id="cake-burst1"><stop stop-color="#60A5FA"/><stop offset="1" stop-color="#60A5FA" stop-opacity="0"/></radialGradient>
        <radialGradient id="cake-burst2"><stop stop-color="#F472B6"/><stop offset="1" stop-color="#F472B6" stop-opacity="0"/></radialGradient>
        <radialGradient id="cake-burst3"><stop stop-color="#FFE66D"/><stop offset="1" stop-color="#FFE66D" stop-opacity="0"/></radialGradient>
        <linearGradient id="cake-star1" x1="11" y1="16" x2="21" y2="28"><stop stop-color="#60A5FA"/><stop offset="1" stop-color="#4ECDC4"/></linearGradient>
        <linearGradient id="cake-star2" x1="27" y1="16" x2="37" y2="28"><stop stop-color="#F472B6"/><stop offset="1" stop-color="#A78BFA"/></linearGradient>
        <linearGradient id="cake-star3" x1="18" y1="12" x2="30" y2="26"><stop stop-color="#FFE66D"/><stop offset="1" stop-color="#FB923C"/></linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-sparkler',
    name: '仙女棒',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="23" y="20" width="2" height="26" rx="1" fill="url(#sparkler-stick)"/>
      <circle cx="24" cy="14" r="10" fill="url(#sparkler-glow)" opacity="0.2"/>
      <path d="M24 4L25.5 11L32 8L27 14L34 16L27 18L32 24L25.5 19L24 26L22.5 19L16 24L21 18L14 16L21 14L16 8L22.5 11Z" fill="url(#sparkler-spark)"/>
      <circle cx="24" cy="14" r="3" fill="#FFF"/>
      <circle cx="32" cy="8" r="1.5" fill="#FF6B6B"/>
      <circle cx="16" cy="8" r="1.5" fill="#4ECDC4"/>
      <circle cx="34" cy="16" r="1.5" fill="#FFE66D"/>
      <circle cx="14" cy="16" r="1.5" fill="#A78BFA"/>
      <circle cx="32" cy="24" r="1.5" fill="#F472B6"/>
      <circle cx="16" cy="24" r="1.5" fill="#60A5FA"/>
      <defs>
        <linearGradient id="sparkler-stick" x1="23" y1="20" x2="25" y2="46">
          <stop stop-color="#94A3B8"/>
          <stop offset="1" stop-color="#64748B"/>
        </linearGradient>
        <radialGradient id="sparkler-glow">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FFE66D" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="sparkler-spark" x1="14" y1="4" x2="34" y2="26">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FFF"/>
          <stop offset="1" stop-color="#FFE66D"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-roman',
    name: '罗马烛光',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="24" width="12" height="20" rx="2" fill="url(#roman-tube)"/>
      <ellipse cx="24" cy="24" rx="6" ry="2" fill="#FFE66D"/>
      <path d="M24 20C24 20 20 14 20 10C20 6 22 4 24 4C26 4 28 6 28 10C28 14 24 20 24 20Z" fill="url(#roman-flame)"/>
      <circle cx="24" cy="8" r="2" fill="#FFF"/>
      <circle cx="20" cy="6" r="1.5" fill="#FF6B6B"/>
      <circle cx="28" cy="6" r="1.5" fill="#4ECDC4"/>
      <circle cx="18" cy="12" r="1.5" fill="#A78BFA"/>
      <circle cx="30" cy="12" r="1.5" fill="#F472B6"/>
      <rect x="20" y="30" width="8" height="1.5" fill="#FFE66D" opacity="0.5"/>
      <rect x="20" y="36" width="8" height="1.5" fill="#FFE66D" opacity="0.5"/>
      <defs>
        <linearGradient id="roman-tube" x1="18" y1="24" x2="30" y2="44">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <linearGradient id="roman-flame" x1="20" y1="4" x2="28" y2="20">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-wheel',
    name: '旋转烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="16" stroke="url(#wheel-ring)" stroke-width="3" fill="none" stroke-dasharray="8 4"/>
      <circle cx="24" cy="24" r="6" fill="url(#wheel-center)"/>
      <path d="M24 8L26 14L24 12L22 14Z" fill="#FF6B6B"/>
      <path d="M40 24L34 26L36 24L34 22Z" fill="#FFE66D"/>
      <path d="M24 40L22 34L24 36L26 34Z" fill="#4ECDC4"/>
      <path d="M8 24L14 22L12 24L14 26Z" fill="#A78BFA"/>
      <path d="M35.3 12.7L31 17L32 15L30 14Z" fill="#F472B6"/>
      <path d="M35.3 35.3L31 31L32 33L30 34Z" fill="#60A5FA"/>
      <path d="M12.7 35.3L17 31L15 32L14 30Z" fill="#34D399"/>
      <path d="M12.7 12.7L17 17L15 16L14 18Z" fill="#FB923C"/>
      <circle cx="24" cy="24" r="2" fill="#FFF"/>
      <defs>
        <linearGradient id="wheel-ring" x1="8" y1="8" x2="40" y2="40">
          <stop stop-color="#FF6B6B"/>
          <stop offset="0.25" stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#4ECDC4"/>
          <stop offset="0.75" stop-color="#A78BFA"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
        <radialGradient id="wheel-center">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FB923C"/>
        </radialGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-box',
    name: '礼花弹',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="22" width="20" height="22" rx="2" fill="url(#box-body)"/>
      <path d="M14 26H34" stroke="#FFE66D" stroke-width="2"/>
      <path d="M24 22V44" stroke="#FFE66D" stroke-width="2"/>
      <path d="M24 22L24 16" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      <circle cx="24" cy="10" r="8" fill="url(#box-burst)" opacity="0.3"/>
      <path d="M24 4L25 8L29 6L26 10L30 12L26 14L24 18L22 14L18 12L22 10L19 6L23 8Z" fill="url(#box-star)"/>
      <circle cx="24" cy="10" r="2" fill="#FFF"/>
      <defs>
        <linearGradient id="box-body" x1="14" y1="22" x2="34" y2="44">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <radialGradient id="box-burst">
          <stop stop-color="#FFE66D"/>
          <stop offset="1" stop-color="#FFE66D" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="box-star" x1="18" y1="4" x2="30" y2="18">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
      </defs>
    </svg>`
  },
  {
    key: 'firework-ground',
    name: '地面烟花',
    svg: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 44H40" stroke="#64748B" stroke-width="2" stroke-linecap="round"/>
      <ellipse cx="24" cy="40" rx="10" ry="4" fill="url(#ground-base)"/>
      <path d="M24 36C18 30 14 22 14 16C14 10 19 6 24 6C29 6 34 10 34 16C34 22 30 30 24 36Z" fill="url(#ground-flame)" opacity="0.8"/>
      <path d="M24 32C20 28 18 22 18 18C18 14 21 12 24 12C27 12 30 14 30 18C30 22 28 28 24 32Z" fill="url(#ground-inner)"/>
      <circle cx="24" cy="16" r="2" fill="#FFF"/>
      <circle cx="18" cy="12" r="1.5" fill="#60A5FA"/>
      <circle cx="30" cy="12" r="1.5" fill="#F472B6"/>
      <circle cx="14" cy="20" r="1.5" fill="#34D399"/>
      <circle cx="34" cy="20" r="1.5" fill="#A78BFA"/>
      <defs>
        <linearGradient id="ground-base" x1="14" y1="36" x2="34" y2="44">
          <stop stop-color="#E53734"/>
          <stop offset="1" stop-color="#991B1B"/>
        </linearGradient>
        <linearGradient id="ground-flame" x1="14" y1="6" x2="34" y2="36">
          <stop stop-color="#FFE66D"/>
          <stop offset="0.5" stop-color="#FB923C"/>
          <stop offset="1" stop-color="#FF6B6B"/>
        </linearGradient>
        <linearGradient id="ground-inner" x1="18" y1="12" x2="30" y2="32">
          <stop stop-color="#FFF"/>
          <stop offset="1" stop-color="#FFE66D"/>
        </linearGradient>
      </defs>
    </svg>`
  }
]

// 构建图标映射表
export const iconMap: Record<string, string> = {}
icons.forEach(icon => {
  iconMap[icon.key] = icon.svg
})
