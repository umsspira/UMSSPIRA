import '@testing-library/jest-dom'

// Los borradores de Agregar registros se conservan en localStorage (HU-14): cada prueba empieza sin nada guardado
afterEach(() => {
  if (typeof window !== 'undefined') window.localStorage?.clear()
})
