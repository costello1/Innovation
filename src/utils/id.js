// Crea id sicuri per Firestore come chiavi mappa
export const slugify = (s) =>
  s.toLowerCase()
   .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
   .replace(/[^a-z0-9]+/g, '-')
   .replace(/(^-|-$)/g, '')

export const optionId = (label) => {
  const base = slugify(label)
  const rand = Math.random().toString(36).slice(2,6)
  return `${base}-${rand}`
}