# Custom fonts

Drop any `.ttf` / `.otf` files in this directory. They're picked up
automatically:

- **Local dev** (`pnpm dev:compiler`): `compile.ts` copies this folder into
  every job's temp dir and passes `--font-path <tmp>/fonts` to `typst`.
- **Docker**: the Dockerfile copies `src/templates` into `dist/templates`
  inside the image, so font additions ship with the container.

## After adding fonts

Local dev picks them up on the next compile. For the Docker image you need
to rebuild it so the new files land inside:

```bash
pnpm docker:rebuild:compiler
```

## Using a custom font in the template

In `base-resume.typ` or any partial:

```typst
#set text(font: "Your Font Name")
```

The "font name" is what the font file declares internally (Font Book on
macOS, `fc-query <file>` on Linux). It's usually the family name, not the
filename.

## Verifying which fonts Typst sees

```bash
docker compose -f infra/docker-compose.yml exec compiler typst fonts --font-path /app/dist/templates/fonts
```
