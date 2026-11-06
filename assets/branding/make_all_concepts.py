import math

# --- CONCEPT A: The Symbiotic S ---
# Two interlocking curved ribbons forming an unmistakable 'S'.
# Top lobe sweeps from (184, 62) down through (136, 154)
# Bottom lobe sweeps from (72, 194) up through (120, 102)
def make_concept_a_symbol():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Symbiotic S</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 186 64 C 186 44 164 28 132 28 C 92 28 64 58 64 96 C 64 124 84 140 120 150 L 138 155" />
    <path d="M 70 192 C 70 212 92 228 124 228 C 164 228 192 198 192 160 C 192 132 172 116 136 106 L 118 101" />
  </g>
</svg>'''

# --- CONCEPT B: The Aperture S (Solid Negative-Space Monogram) ---
# Solid bold geometric S with circular negative-space portals (the rooms).
# Top circular cutout and bottom circular cutout.
# Constructed with pure geometric arcs.
def make_concept_b_symbol():
    # Outer S path (filled) with two circular holes (evenodd)
    # Top lobe centered at (128, 86), bottom lobe at (128, 170)
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Aperture S</title>
  <path d="M 186 58 
           C 186 41.4 172.6 28 156 28 
           L 100 28 
           C 60.2 28 28 60.2 28 100 
           C 28 128 44 148 72 156 
           L 156 156 
           C 173.7 156 188 170.3 188 188 
           C 188 205.7 173.7 220 156 220 
           L 96 220 
           C 79.4 220 66 206.6 66 190 
           C 66 179 57 170 46 170 
           C 35 170 26 179 26 190 
           C 26 223.1 57.3 250 96 250 
           L 156 250 
           C 190.2 250 218 222.2 218 188 
           C 218 158 198 134 168 126 
           L 94 126 
           C 76.3 126 62 111.7 62 94 
           C 62 76.3 76.3 62 94 62 
           L 156 62 
           C 172.6 62 186 75.4 186 92 
           C 186 103 195 112 206 112 
           C 217 112 226 103 226 92 
           C 226 65.2 208.8 58 186 58 Z" 
        fill="#000000" />
</svg>'''

# --- CONCEPT C: The Dual Canvas Step (Architectural S) ---
# A clean, modern developer-grade stepped S formed by two interlocking L-brackets with 45-degree chamfers.
def make_concept_c_symbol():
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <title>Sayabot — The Canvas Step</title>
  <g fill="none" stroke="#000000" stroke-width="36" stroke-linecap="round" stroke-linejoin="round">
    <!-- Upper bracket -->
    <path d="M 194 60 L 116 60 C 93.9 60 76 77.9 76 100 L 76 116 L 144 116 C 166.1 116 184 133.9 184 156 L 184 196" />
    <!-- Lower anchor -->
    <path d="M 62 196 L 140 196 C 162.1 196 180 178.1 180 156" />
    <!-- Diagonal turn bridge -->
    <line x1="76" y1="116" x2="144" y2="116" />
  </g>
</svg>'''

