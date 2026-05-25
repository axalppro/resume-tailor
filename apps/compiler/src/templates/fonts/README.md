# Fonts

Drop additional `.ttf` / `.otf` files in this directory to make them available
to the Typst compiler. The compiler container runs `typst compile
--font-path /app/templates/fonts ...`.

Phase 1 does not bundle custom fonts — the default Typst font stack is used,
which works fine with the `neat-cv` package.
