# Final 3 distinct concepts:
# Concept A: The Symbiotic S (Fluid Dual Ribbon)
svg_a = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 64 C 186 44 164 28 132 28 C 92 28 64 58 64 96 C 64 124 84 140 120 150 L 138 155" />
    <path d="M 70 192 C 70 212 92 228 124 228 C 164 228 192 198 192 160 C 192 132 172 116 136 106 L 118 101" />
  </g>
</svg>'''

# Concept B: The Canvas Bracket (Architectural Nested Frames)
svg_b = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Canvas Bracket</title>
  <g fill="none" stroke="#000000" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 190 64 L 190 52 C 190 38 178 28 164 28 L 96 28 C 74 28 56 46 56 68 L 56 104 C 56 126 74 144 96 144 L 142 144" />
    <path d="M 66 192 L 66 204 C 66 218 78 228 92 228 L 160 228 C 182 228 200 210 200 188 L 200 152 C 200 130 182 112 160 112 L 114 112" />
  </g>
</svg>'''

# Concept C: The Room Portal (Negative Space Spatial Emblem)
svg_c = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Room Portal</title>
  <rect x="36" y="36" width="184" height="184" rx="52" fill="#000000" />
  <g fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 164 86 C 164 72 150 62 130 62 C 104 62 86 80 86 104 C 86 124 100 134 126 142 L 134 145" />
    <path d="M 92 170 C 92 184 106 194 126 194 C 152 194 170 176 170 152 C 170 132 156 122 130 114 L 122 111" />
  </g>
</svg>'''

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(svg_a)

with open("assets/branding/concept-b-symbol.svg", "w") as f:
    f.write(svg_b)

with open("assets/branding/concept-c-symbol.svg", "w") as f:
    f.write(svg_c)

print("Saved assembled trio")
