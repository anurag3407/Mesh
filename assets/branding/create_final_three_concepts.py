import math

def get_concept_a():
    # Concept A: The Symbiotic S (Letterform Monogram)
    # Human ribbon & Agent ribbon interlocking across diagonal spine
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 64 C 186 44 164 28 132 28 C 92 28 64 58 64 96 C 64 124 84 140 120 150 L 138 155" />
    <path d="M 70 192 C 70 212 92 228 124 228 C 164 228 192 198 192 160 C 192 132 172 116 136 106 L 118 101" />
  </g>
</svg>'''

def get_concept_b():
    # Concept B: The Room Badge (Negative-Space Room Emblem)
    # A bold rounded room enclosure (squircle rx=56) with a carved negative-space S.
    # Solid footprint, high contrast, perfect for app icons and small favicons.
    # We use fill-rule="evenodd" to create a true cutout.
    # Outer box: (36, 36) to (220, 220) -> 184x184 with rx=52
    # Carved S: smooth negative space channel
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Room Badge</title>
  <rect x="36" y="36" width="184" height="184" rx="52" fill="#000000" />
  <!-- Negative space carved S -->
  <g fill="none" stroke="#ffffff" stroke-width="28" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 166 84 C 166 70 150 60 130 60 C 102 60 84 78 84 102 C 84 124 100 134 126 142 L 134 145" />
    <path d="M 90 172 C 90 186 106 196 126 196 C 154 196 172 178 172 154 C 172 132 156 122 130 114 L 122 111" />
  </g>
</svg>'''

def get_concept_c():
    # Concept C: The Turn Orbit (Dynamic Dual-Node Flow)
    # Two complementary orbital strokes with node heads:
    # Upper orbit sweeps from a human presence node (top-right) down through center.
    # Lower orbit sweeps from an agent presence node (bottom-left) up through center.
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Turn Orbit</title>
  <g fill="none" stroke="#000000" stroke-width="32" stroke-linecap="round">
    <!-- Top arc -->
    <path d="M 180 72 C 180 44 154 30 128 30 C 82 30 52 68 52 118 C 52 144 68 160 94 170" />
    <!-- Bottom arc -->
    <path d="M 76 184 C 76 212 102 226 128 226 C 174 226 204 188 204 138 C 204 112 188 96 162 86" />
  </g>
  <g fill="#000000">
    <!-- Human presence node -->
    <circle cx="180" cy="72" r="24" />
    <!-- Agent presence node -->
    <circle cx="76" cy="184" r="24" />
  </g>
</svg>'''

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(get_concept_a())

with open("assets/branding/concept-b-symbol.svg", "w") as f:
    f.write(get_concept_b())

with open("assets/branding/concept-c-symbol.svg", "w") as f:
    f.write(get_concept_c())

print("Built 3 distinct candidate concepts")
