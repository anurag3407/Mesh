# Refine 3 cute bot mascots with exact geometry and scale testing

def get_cute_bot_a():
    # Concept 1: "The Pocket Saya" (Friendly Pill-Bot Mascot)
    # Balanced, friendly dome head with antenna orb and sparkling eyes.
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Pocket Saya</title>
  <g fill="#000000">
    <!-- Top antenna orb and stem -->
    <circle cx="128" cy="26" r="14" />
    <rect x="124" y="36" width="8" height="22" rx="4" />
    <!-- Left headphone pod -->
    <rect x="22" y="98" width="22" height="48" rx="11" />
    <!-- Right headphone pod -->
    <rect x="212" y="98" width="22" height="48" rx="11" />
    <!-- Head chassis -->
    <rect x="36" y="54" width="184" height="152" rx="60" />
  </g>
  <!-- Face visor plate -->
  <rect x="52" y="70" width="152" height="120" rx="44" fill="#ffffff" />
  <!-- Facial expression -->
  <g fill="#000000">
    <!-- Left eye -->
    <ellipse cx="94" cy="122" rx="16" ry="22" />
    <!-- Right eye -->
    <ellipse cx="162" cy="122" rx="16" ry="22" />
    <!-- Smile -->
    <path d="M 118 144 Q 128 156 138 144" fill="none" stroke="#000000" stroke-width="6" stroke-linecap="round" />
  </g>
  <!-- Eye glints -->
  <g fill="#ffffff">
    <circle cx="99" cy="115" r="7" />
    <circle cx="90" cy="129" r="3.5" />
    <circle cx="167" cy="115" r="7" />
    <circle cx="158" cy="129" r="3.5" />
  </g>
</svg>'''

def get_cute_bot_b():
    # Concept 2: "The Monitor Roomie" (Squircle Display Bot)
    # Sturdy, modern squircle head with twin angled ear-antennae and sweet pill eyes
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Monitor Roomie</title>
  <g fill="#000000">
    <!-- Left antenna -->
    <rect x="64" y="16" width="14" height="42" rx="7" transform="rotate(-30 71 37)" />
    <!-- Right antenna -->
    <rect x="178" y="16" width="14" height="42" rx="7" transform="rotate(30 185 37)" />
    <!-- Monitor chassis -->
    <rect x="34" y="46" width="188" height="162" rx="52" />
    <!-- Stand feet -->
    <rect x="72" y="212" width="38" height="18" rx="9" />
    <rect x="146" y="212" width="38" height="18" rx="9" />
  </g>
  <!-- Monitor screen plate -->
  <rect x="52" y="64" width="152" height="126" rx="36" fill="#ffffff" />
  <!-- Expressive cute pill eyes and smile -->
  <g fill="#000000">
    <!-- Left pill eye -->
    <rect x="84" y="104" width="24" height="40" rx="12" />
    <!-- Right pill eye -->
    <rect x="148" y="104" width="24" height="40" rx="12" />
    <!-- Little smile -->
    <path d="M 120 148 Q 128 158 136 148" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" />
  </g>
  <!-- Glints in pill eyes -->
  <g fill="#ffffff">
    <circle cx="92" cy="116" r="6" />
    <circle cx="156" cy="116" r="6" />
  </g>
</svg>'''

def get_cute_bot_c():
    # Concept 3: "The Astro Orb" (Floating Spherical Agent)
    # Pure geometric sphere with floating magnetic paws and visor
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Astro Orb</title>
  <g fill="#000000">
    <!-- Top halo disc -->
    <ellipse cx="128" cy="22" rx="26" ry="8" />
    <rect x="124" y="24" width="8" height="18" rx="4" />
    <!-- Left headphone pod -->
    <rect x="20" y="98" width="24" height="52" rx="12" />
    <!-- Right headphone pod -->
    <rect x="212" y="98" width="24" height="52" rx="12" />
    <!-- Orb body -->
    <circle cx="128" cy="124" r="86" />
    <!-- Floating cute hand paws -->
    <circle cx="56" cy="208" r="18" />
    <circle cx="200" cy="208" r="18" />
  </g>
  <!-- Curved panoramic faceplate -->
  <path d="M 64 124 C 64 92 92 78 128 78 C 164 78 192 92 192 124 C 192 154 164 164 128 164 C 92 164 64 154 64 124 Z" fill="#ffffff" />
  <!-- Cute expressive eyes in visor -->
  <g fill="#000000">
    <!-- Left big pill eye -->
    <rect x="90" y="104" width="22" height="34" rx="11" />
    <!-- Right big pill eye -->
    <rect x="144" y="104" width="22" height="34" rx="11" />
    <!-- Joyful mouth -->
    <path d="M 120 144 Q 128 153 136 144" fill="none" stroke="#000000" stroke-width="5" stroke-linecap="round" />
  </g>
  <!-- Glints in eyes -->
  <g fill="#ffffff">
    <circle cx="97" cy="113" r="5.5" />
    <circle cx="151" cy="113" r="5.5" />
  </g>
</svg>'''

with open("assets/branding/cute-bot-a-symbol.svg", "w") as f:
    f.write(get_cute_bot_a())
with open("assets/branding/cute-bot-b-symbol.svg", "w") as f:
    f.write(get_cute_bot_b())
with open("assets/branding/cute-bot-c-symbol.svg", "w") as f:
    f.write(get_cute_bot_c())

print("Built 3 refined cute bot symbols")
