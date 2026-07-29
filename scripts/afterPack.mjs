import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NtExecutable, NtExecutableResource, Resource } from 'resedit'

const IDIOMA_ES = { lang: 0x0c0a, codepage: 1200 }

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)

  const buffer = await readFile(exePath)
  const executable = NtExecutable.from(buffer)
  const res = NtExecutableResource.from(executable)
  const viList = Resource.VersionInfo.fromEntries(res.entries)
  if (viList.length === 0) return

  const vi = viList[0]
  const languages = vi.getAllLanguagesForStringValues()
  if (languages.length === 0) return

  const origen = languages[0]
  if (origen.lang === IDIOMA_ES.lang) return

  const valores = vi.getStringValues(origen)
  vi.removeAllStringValues(origen)
  vi.setStringValues(IDIOMA_ES, valores)
  vi.replaceAvailableLanguages([IDIOMA_ES])
  vi.lang = IDIOMA_ES.lang

  for (let i = res.entries.length - 1; i >= 0; i--) {
    const entry = res.entries[i]
    if (entry != null && entry.type === 16 && entry.id === 1) {
      res.entries.splice(i, 1)
    }
  }

  vi.outputToResourceEntries(res.entries)
  res.outputResource(executable)
  await writeFile(exePath, Buffer.from(executable.generate()))
}
