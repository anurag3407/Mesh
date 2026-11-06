# Three distinct cute bot concepts for Sayabot

def make_bot_a():
    # Concept 1: "The Pocket Saya" (Friendly Pill-Bot)
    # Head: Dome/pill top (w=176, h=156, rx=64)
    # Antenna: Single center stalk with round signal orb on top (cx=128, cy=34, r=16)
    # Eyes: Two large, super-cute friendly circular eyes (cx=92, cy=116, r=18) and (cx=164, cy=116, r=18)
    # Eye glints: tiny upper-right white circles (cx=96, cy=112, r=6)
    # Smile: sweet little arc between eyes (M 116 142 Q 128 152 140 142)
    # Ear nodes: Two rounded side pods (capsules) on left and right
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Pocket Saya</title>
  <g fill="#000000">
    <!-- Antenna orb and stalk -->
    <circle cx="128" cy="28" r="14" />
    <path d="M 124 38 L 132 38 L 132 60 L 124 60 Z" />
    <!-- Left ear pod -->
    <rect x="24" y="98" width="20" height="44" rx="10" />
    <!-- Right ear pod -->
    <rect x="212" y="98" width="20" height="44" rx="10" />
    <!-- Main head body -->
    <rect x="38" y="56" width="180" height="150" rx="58" />
  </g>
  <!-- Face plate cutout (white on black, or negative space) -->
  <rect x="54" y="74" width="148" height="114" rx="42" fill="#ffffff" />
  <!-- Cute face features (black on white visor) -->
  <g fill="#000000">
    <!-- Left eye with cute glint -->
    <ellipse cx="94" cy="124" rx="16" ry="20" />
    <!-- Right eye with cute glint -->
    <ellipse cx="162" cy="124" rx="16" ry="20" />
    <!-- Left cheek blush dot -->
    <ellipse cx="72" cy="144" rx="8" ry="4" opacity="0.3" />
    <!-- Right cheek blush dot -->
    <ellipse cx="184" cy="144" rx="8" ry="4" opacity="0.3" />
    <!-- Cute happy smile -->
    <path d="M 118 144 Q 128 156 138 144" fill="none" stroke="#000000" stroke-width="6" stroke-linecap="round" />
  </g>
  <g fill="#ffffff">
    <!-- Eye glints -->
    <circle cx="99" cy="118" r="6" />
    <circle cx="91" cy="130" r="2.5" />
    <circle cx="167" cy="118" r="6" />
    <circle cx="159" cy="130" r="2.5" />
  </g>
</svg>'''

def make_bot_b():
    # Concept 2: "The Monitor Bot / Roomie" (Squircle CRT Desktop Bot)
    # Sturdy, cute desktop companion (like BMO / Discord controller / Grok)
    # Head: squircle monitor (x=38, y=44, w=180, h=164, rx=48)
    # Cute dual angled antennae on top (like cat ears / dual bunny antennas)
    # Visor screen: dark monitor screen
    # Eyes: two happy glowing capsule eyes that tilt in slightly for an adorable look
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Monitor Roomie</title>
  <g fill="#000000">
    <!-- Left antenna -->
    <path d="M 78 48 L 56 18 C 53 14 56 8 62 8 C 65 8 68 10 71 14 L 96 46 Z" />
    <!-- Right antenna -->
    <path d="M 178 48 L 200 18 C 203 14 200 8 194 8 C 191 8 188 10 185 14 L 160 46 Z" />
    <!-- Outer monitor head -->
    <rect x="36" y="44" width="184" height="168" rx="52" />
    <!-- Feet/stand -->
    <rect x="74" y="212" width="36" height="18" rx="9" />
    <rect x="146" y="212" width="36" height="18" rx="9" />
  </g>
  <!-- Screen cutout -->
  <rect x="52" y="60" width="152" height="136" rx="38" fill="#ffffff" />
  <!-- Expressive cute digital eyes (happy arched curved eyes) -->
  <g fill="#000000">
    <!-- Left curved eye (happy arc) -->
    <path d="M 76 128 C 76 108 92 98 106 104 C 114 108 116 118 110 126 C 104 134 94 134 88 132 L 86 138 C 82 140 76 136 76 128 Z" />
    <!-- Right curved eye (happy arc) -->
    <path d="M 180 128 C 180 108 164 98 150 104 C 142 108 140 118 146 126 C 152 134 162 134 168 132 L 170 138 C 174 140 180 136 180 128 Z" />
    <!-- Center interactive turn nose / dot -->
    <circle cx="128" cy="136" r="6" />
    <!-- Little smile -->
    <path d="M 118 154 Q 128 164 138 154" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" />
  </g>
</svg>'''

def make_bot_c():
    # Concept 3: "The Astro S / Bubble Bot" (Spherical Floating Agent)
    # Pure geometric sphere helmet with an S-shaped visor and cute floating hands
    # Circular head: cx=128, cy=120, r=82
    # Headphones on left & right: pill capsules
    # Visor: wide curved panoramic visor with 2 big expressive round eyes
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Astro Bot</title>
  <g fill="#000000">
    <!-- Top central beacon / halo -->
    <ellipse cx="128" cy="24" rx="24" ry="8" />
    <rect x="124" y="26" width="8" height="18" />
    <!-- Left ear headphone -->
    <rect x="22" y="98" width="24" height="52" rx="12" />
    <!-- Right ear headphone -->
    <rect x="210" y="98" width="24" height="52" rx="12" />
    <!-- Head sphere -->
    <circle cx="128" cy="124" r="86" />
    <!-- Floating cute hand paws -->
    <circle cx="56" cy="208" r="18" />
    <circle cx="200" cy="208" r="18" />
  </g>
  <!-- Visor cutout -->
  <path d="M 64 124 C 64 92 92 78 128 78 C 164 78 192 92 192 124 C 192 154 164 164 128 164 C 92 164 64 154 64 124 Z" fill="#ffffff" />
  <!-- Cute expressive eyes in visor -->
  <g fill="#000000">
    <!-- Left big pill eye -->
    <rect x="90" y="102" width="22" height="34" rx="11" />
    <!-- Right big pill eye -->
    <rect x="144" y="102" width="22" height="34" rx="11" />
  </g>
  <!-- Glints in eyes -->
  <g fill="#ffffff">
    <circle cx="97" cy="111" r="5" />
    <circle cx="151" cy="111" r="5" />
  </g>
  <!-- Little joyful mouth -->
  <path d="M 120 144 Q 128 152 136 144" fill="none" stroke="#000000" stroke-width="4.5" stroke-linecap="round" />
</svg>'''

with open("assets/branding/bot-a.svg", "w") as f:
    f.write(make_bot_a())
with open("assets/branding/bot-b.svg", "w") as f:
    f.write(make_bot_b())
with open("assets/branding/bot-c.svg", "w") as f:
    f.write(make_bot_c())

print("Built 3 cute candidate bot SVGs")
