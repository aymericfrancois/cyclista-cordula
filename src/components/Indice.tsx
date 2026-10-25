export default function Indice({
  libelle,
  aide,
  valeur,
  onChange,
}: {
  libelle: string
  aide: string
  valeur: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{libelle}</span>
        <span className="text-lg font-semibold tabular-nums">{valeur}</span>
      </span>
      <input
        type="range"
        min={0}
        max={5}
        step={1}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-8 w-full accent-sky-600"
      />
      <span className="text-xs text-slate-500">{aide}</span>
    </label>
  )
}
