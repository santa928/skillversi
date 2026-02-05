import { mkdir, writeFile, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const svgPath = path.join(root, 'public', 'icon.svg')
const outDir = path.join(root, 'public', 'pwa')

await mkdir(outDir, { recursive: true })

const svg = await readFile(svgPath)

const background = { r: 15, g: 15, b: 19, alpha: 1 }

const targets = [
  { name: 'icon-192.png', size: 192, maskable: false },
  { name: 'icon-512.png', size: 512, maskable: false },
  { name: 'icon-180.png', size: 180, maskable: false },
  { name: 'icon-192-maskable.png', size: 192, maskable: true },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
]

for (const { name, size, maskable } of targets) {
  const filePath = path.join(outDir, name)
  if (!maskable) {
    const buffer = await sharp(svg)
      .resize(size, size, { fit: 'contain', background })
      .png()
      .toBuffer()
    await writeFile(filePath, buffer)
    continue
  }

  const padding = Math.round(size * 0.1)
  const inner = size - padding * 2
  const iconBuffer = await sharp(svg)
    .resize(inner, inner, { fit: 'contain', background })
    .png()
    .toBuffer()

  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: iconBuffer, top: padding, left: padding }])
    .png()
    .toBuffer()

  await writeFile(filePath, buffer)
}

console.log('Generated PWA icons:', targets.map((t) => t.name).join(', '))
