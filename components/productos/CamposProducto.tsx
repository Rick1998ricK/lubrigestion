'use client'

import { configDeTipo, type DatosExtra } from '@/lib/campos-producto'

const INPUT =
  'w-full rounded-lg border border-[#17496B] bg-[#061626] px-3 py-2 text-base text-[#F1F5F9] outline-none focus:border-[#FFC107] md:text-sm'
const LABEL = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-[#9FB3C8]'

export default function CamposProducto({
  tipo,
  valor,
  onChange,
  claseInput = INPUT,
  claseLabel = LABEL,
}: {
  tipo: string
  valor: DatosExtra
  onChange: (v: DatosExtra) => void
  claseInput?: string
  claseLabel?: string
}) {
  const cfg = configDeTipo(tipo)
  const idPres = `presentaciones-${tipo}`

  function set<K extends keyof DatosExtra>(k: K, v: DatosExtra[K]) {
    onChange({ ...valor, [k]: v })
  }
  function setAttr(clave: string, v: string) {
    onChange({ ...valor, atributos: { ...valor.atributos, [clave]: v } })
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div>
        <span className={claseLabel}>Código de producto</span>
        <input
          className={claseInput}
          value={valor.codigo}
          onChange={(e) => set('codigo', e.target.value)}
          placeholder={cfg.etiquetaCodigo}
        />
      </div>
      <div>
        <span className={claseLabel}>EAN (código de barras)</span>
        <input
          className={claseInput}
          inputMode="numeric"
          value={valor.ean}
          onChange={(e) => set('ean', e.target.value.replace(/\D/g, ''))}
          placeholder="Escanea o escribe"
        />
      </div>
      <div>
        <span className={claseLabel}>Presentación</span>
        {cfg.presentacionFija ? (
          <select
            className={claseInput}
            value={valor.presentacion}
            onChange={(e) => set('presentacion', e.target.value)}
          >
            <option value="">—</option>
            {valor.presentacion && !cfg.presentaciones.includes(valor.presentacion) && (
              <option value={valor.presentacion}>{valor.presentacion}</option>
            )}
            {cfg.presentaciones.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <>
            <input
              className={claseInput}
              list={idPres}
              value={valor.presentacion}
              onChange={(e) => set('presentacion', e.target.value)}
              placeholder={cfg.presentaciones[0]}
            />
            <datalist id={idPres}>
              {cfg.presentaciones.map((p) => <option key={p} value={p} />)}
            </datalist>
          </>
        )}
      </div>

      {cfg.campos.map((c) => {
        const actual = valor.atributos[c.clave] ?? ''
        return (
          <div key={c.clave}>
            <span className={claseLabel}>{c.etiqueta}</span>
            {c.opciones ? (
              <select
                className={claseInput}
                value={actual}
                onChange={(e) => setAttr(c.clave, e.target.value)}
              >
                <option value="">—</option>
                {actual && !c.opciones.includes(actual) && <option value={actual}>{actual}</option>}
                {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                className={claseInput}
                value={actual}
                onChange={(e) => setAttr(c.clave, e.target.value)}
                placeholder={c.placeholder}
              />
            )}
          </div>
        )
      })}

      <div>
        <span className={claseLabel}>Stock mínimo</span>
        <input
          type="number"
          min={0}
          className={claseInput}
          value={valor.stock_minimo}
          onChange={(e) => set('stock_minimo', e.target.value)}
          placeholder="General (3)"
        />
      </div>
      <div>
        <span className={claseLabel}>Ubicación</span>
        <input
          className={claseInput}
          value={valor.ubicacion}
          onChange={(e) => set('ubicacion', e.target.value)}
          placeholder="Estante A2"
        />
      </div>
    </div>
  )
}