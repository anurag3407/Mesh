import math

# --- 1. Concept A: The Symbiotic S ---
def get_concept_a():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 64 C 186 44 164 28 132 28 C 92 28 64 58 64 96 C 64 124 84 140 120 150 L 138 155" />
    <path d="M 70 192 C 70 212 92 228 124 228 C 164 228 192 198 192 160 C 192 132 172 116 136 106 L 118 101" />
  </g>
</svg>'''

# --- 2. Concept B: The Architectural Room Frame (Nested Brackets) ---
# Clean, crisp neo-grotesque S built from two interlocking square brackets (human workspace & AI canvas).
# Balanced stroke 34px, rounded corners R=28, crisp terminal endings.
def get_concept_b():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Canvas Bracket</title>
  <g fill="none" stroke="#000000" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
    <!-- Upper frame (Human) -->
    <path d="M 190 64 L 190 52 C 190 38 178 28 164 28 L 96 28 C 74 28 56 46 56 68 L 56 104 C 56 126 74 144 96 144 L 142 144" />
    <!-- Lower frame (Agent) - 180 rotational symmetry -->
    <path d="M 66 192 L 66 204 C 66 218 78 228 92 228 L 160 228 C 182 228 200 210 200 188 L 200 152 C 200 130 182 112 160 112 L 114 112" />
  </g>
</svg>'''

# --- 3. Concept C: The Bi-Node Helix (Orbital Handoff) ---
# Two circular presence tokens (Human top-right, Agent bottom-left) connected by sweeping orbital arcs.
def get_concept_c():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Bi-Node Orbit</title>
  <!-- Sweeping continuous S-channel -->
  <g fill="none" stroke="#000000" stroke-width="32" stroke-linecap="round">
    <!-- Top arc flowing from node (178, 64) down to (128, 128) -->
    <path d="M 178 64 C 178 40 152 28 126 28 C 84 28 58 64 58 108 C 58 136 78 152 114 162 L 142 170" />
    <!-- Bottom arc flowing from node (78, 192) up to (128, 128) -->
    <path d="M 78 192 C 78 216 104 228 130 228 C 172 228 198 192 198 148 C 198 120 178 104 142 94 L 114 86" />
  </g>
  <!-- The two presence nodes -->
  <circle cx="178" cy="64" r="22" fill="#000000" />
  <circle cx="78" cy="192" r="22" fill="#000000" />
</svg>'''

with open("assets/branding/concept-a-symbol.svg", "w") as f:
    f.write(get_concept_a())

with open("assets/branding/concept-b-symbol.svg", "w") as f:
    f.write(get_concept_b())

with open("assets/branding/concept-c-symbol.svg", "w") as f:
    f.write(get_concept_c())

