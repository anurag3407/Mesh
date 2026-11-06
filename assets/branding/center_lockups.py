# Rebalance lockup coordinates to achieve balanced optical centering
def make_lockup(symbol_inner, title):
    # Shift symbol to x=40, wordmark to x=270, total width 740, viewBox="0 0 800 256"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 256" width="800" height="256">
  <title>{title} — Lockup</title>
  <!-- Symbol on the left -->
  <g transform="translate(44, 20) scale(0.84)">
    {symbol_inner}
  </g>
  <!-- Bespoke geometric wordmark "sayabot" -->
  <g fill="#000000" transform="translate(18, 0)">
    <!-- s -->
    <path d="M 334 116 C 334 104 324 96 308 96 C 290 96 278 106 278 122 C 278 136 288 144 306 148 L 314 150 C 324 152 330 157 330 164 C 330 172 322 178 308 178 C 294 178 284 171 282 161 L 264 164 C 267 182 284 194 308 194 C 334 194 348 181 348 163 C 348 148 338 139 318 135 L 310 133 C 300 131 296 127 296 121 C 296 114 302 111 310 111 C 319 111 326 115 327 122 Z" />
    <!-- a -->
    <path d="M 388 142 C 388 114 369 96 348 96 C 327 96 312 112 312 134 L 328 134 C 328 122 336 112 348 112 C 361 112 371 122 371 138 L 371 144 C 342 144 322 153 322 171 C 322 185 334 194 348 194 C 361 194 370 186 373 177 L 373 192 L 388 192 Z M 372 158 C 372 170 363 178 350 178 C 340 178 334 172 334 164 C 334 153 346 147 372 147 Z" transform="translate(42, 0)" />
    <!-- y -->
    <path d="M 466 98 L 444 158 L 424 98 L 406 98 L 436 176 L 426 202 C 422 212 415 216 405 216 L 398 216 L 398 230 C 402 231 408 231 412 231 C 426 231 437 223 444 204 L 484 98 Z" />
    <!-- a -->
    <path d="M 524 142 C 524 114 505 96 484 96 C 463 96 448 112 448 134 L 464 134 C 464 122 472 112 484 112 C 497 112 507 122 507 138 L 507 144 C 478 144 458 153 458 171 C 458 185 470 194 484 194 C 497 194 506 186 509 177 L 509 192 L 524 192 Z M 508 158 C 508 170 499 178 486 178 C 476 178 470 172 470 164 C 470 153 482 147 508 147 Z" />
    <!-- b -->
    <path d="M 538 68 L 555 68 L 555 110 C 561 101 571 96 584 96 C 606 96 622 114 622 145 C 622 176 605 194 584 194 C 571 194 561 189 555 180 L 555 192 L 538 192 Z M 580 112 C 566 112 555 124 555 145 C 555 166 566 178 580 178 C 594 178 605 166 605 145 C 605 124 594 112 580 112 Z" />
    <!-- o -->
    <path d="M 668 96 C 643 96 626 115 626 145 C 626 175 643 194 668 194 C 693 194 710 175 710 145 C 710 115 693 96 668 96 Z M 668 112 C 682 112 693 125 693 145 C 693 165 682 178 668 178 C 654 178 643 165 643 145 C 643 125 654 112 668 112 Z" />
    <!-- t -->
    <path d="M 724 78 L 739 78 L 739 98 L 756 98 L 756 113 L 739 113 L 739 166 C 739 173 743 177 750 177 L 756 177 L 756 192 L 746 192 C 731 192 724 183 724 168 L 724 113 L 715 113 L 715 98 L 724 98 Z" />
  </g>
</svg>'''

with open("assets/branding/concept-a-symbol.svg") as f:
    sym_a = f.read().split(">", 1)[1].rsplit("<", 1)[0]
with open("assets/branding/concept-b-symbol.svg") as f:
    sym_b = f.read().split(">", 1)[1].rsplit("<", 1)[0]
with open("assets/branding/concept-c-symbol.svg") as f:
    sym_c = f.read().split(">", 1)[1].rsplit("<", 1)[0]

with open("assets/branding/concept-a-lockup.svg", "w") as f:
    f.write(make_lockup(sym_a, "The Symbiotic S"))
with open("assets/branding/concept-b-lockup.svg", "w") as f:
    f.write(make_lockup(sym_b, "The Canvas Bracket"))
with open("assets/branding/concept-c-lockup.svg", "w") as f:
    f.write(make_lockup(sym_c, "The Room Portal"))

print("Centered lockups saved")
