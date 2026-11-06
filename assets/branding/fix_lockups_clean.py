def make_clean_lockup(symbol_inner, title):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 256" width="800" height="256">
  <title>{title} — Lockup</title>
  <!-- Symbol on the left -->
  <g transform="translate(48, 20) scale(0.84)">
    {symbol_inner}
  </g>
  <!-- Bespoke clean geometric wordmark "sayabot" -->
  <g fill="#000000">
    <!-- s (x=276..330) -->
    <path d="M 326 114 C 326 102 316 94 300 94 C 282 94 270 104 270 120 C 270 134 280 142 298 146 L 306 148 C 316 150 322 155 322 162 C 322 170 314 176 300 176 C 286 176 276 169 274 159 L 256 162 C 259 180 276 192 300 192 C 326 192 340 179 340 161 C 340 146 330 137 310 133 L 302 131 C 292 129 288 125 288 119 C 288 112 294 109 302 109 C 311 109 318 113 319 120 Z" />
    <!-- a (x=346..398) -->
    <path d="M 396 140 C 396 112 377 94 356 94 C 335 94 320 110 320 132 L 336 132 C 336 120 344 110 356 110 C 369 110 379 120 379 136 L 379 142 C 350 142 330 151 330 169 C 330 183 342 192 356 192 C 369 192 378 184 381 175 L 381 190 L 396 190 Z M 380 156 C 380 168 371 176 358 176 C 348 176 342 170 342 162 C 342 151 354 145 380 145 Z" />
    <!-- y (x=412..466) -->
    <path d="M 466 96 L 444 156 L 424 96 L 406 96 L 436 174 L 426 200 C 422 210 415 214 405 214 L 398 214 L 398 228 C 402 229 408 229 412 229 C 426 229 437 221 444 202 L 484 96 Z" />
    <!-- a (x=482..534) -->
    <path d="M 532 140 C 532 112 513 94 492 94 C 471 94 456 110 456 132 L 472 132 C 472 120 480 110 492 110 C 505 110 515 120 515 136 L 515 142 C 486 142 466 151 466 169 C 466 183 478 192 492 192 C 505 192 514 184 517 175 L 517 190 L 532 190 Z M 516 156 C 516 168 507 176 494 176 C 484 176 478 170 478 162 C 478 151 490 145 516 145 Z" />
    <!-- b (x=548..604) -->
    <path d="M 548 66 L 565 66 L 565 108 C 571 99 581 94 594 94 C 616 94 632 112 632 143 C 632 174 615 192 594 192 C 581 192 571 187 565 178 L 565 190 L 548 190 Z M 590 110 C 576 110 565 122 565 143 C 565 164 576 176 590 176 C 604 176 615 164 615 143 C 615 122 604 110 590 110 Z" />
    <!-- o (x=618..676) -->
    <path d="M 660 94 C 635 94 618 113 618 143 C 618 173 635 192 660 192 C 685 192 702 173 702 143 C 702 113 685 94 660 94 Z M 660 110 C 674 110 685 123 685 143 C 685 163 674 176 660 176 C 646 176 635 163 635 143 C 635 123 646 110 660 110 Z" />
    <!-- t (x=688..736) -->
    <path d="M 714 76 L 729 76 L 729 96 L 746 96 L 746 111 L 729 111 L 729 164 C 729 171 733 175 740 175 L 746 175 L 746 190 L 736 190 C 721 190 714 181 714 166 L 714 111 L 705 111 L 705 96 L 714 96 Z" />
  </g>
</svg>'''

with open("assets/branding/concept-a-symbol.svg") as f:
    sym_a = f.read().split(">", 1)[1].rsplit("<", 1)[0]
with open("assets/branding/concept-b-symbol.svg") as f:
    sym_b = f.read().split(">", 1)[1].rsplit("<", 1)[0]
with open("assets/branding/concept-c-symbol.svg") as f:
    sym_c = f.read().split(">", 1)[1].rsplit("<", 1)[0]

with open("assets/branding/concept-a-lockup.svg", "w") as f:
    f.write(make_clean_lockup(sym_a, "The Symbiotic S"))
with open("assets/branding/concept-b-lockup.svg", "w") as f:
    f.write(make_clean_lockup(sym_b, "The Canvas Bracket"))
with open("assets/branding/concept-c-lockup.svg", "w") as f:
    f.write(make_clean_lockup(sym_c, "The Room Portal"))

print("Fixed clean lockups")
