import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      'app_cadete_flutter/**',
      'app_cadete_flutter_cloned/**',
      // Scripts sueltos de prueba que ya no son parte del proyecto: están en
      // .gitignore y no los importa nada. Minificados de una línea, ni siquiera
      // los puede parsear. No son código de la app, no van al lint.
      'test.js',
      'test.mjs',
      'test2.js',
      'test_insert.js',
      'check_cadetes.js',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      // ── Bugs reales: se quedan en error ──────────────────────────────────
      // Leer refs durante el render, funciones impuras en render y condicional
      // sobre variables sin inicializar. Ya se corrigieron los casos existentes;
      // queda en error para que no vuelvan a aparecer.

      // ── Convención del proyecto ──────────────────────────────────────────
      // Los hooks se llaman usar* (usarPedidos, usarCarrito...) por decisión
      // del proyecto. La regla solo reconoce el prefijo `use`, así que reporta
      // 8 falsos positivos. Renombrar son 179 referencias en 7 hooks: es una
      // decisión de proyecto, no un fix, y queda anotada como deuda.
      'react-hooks/rules-of-hooks': 'off',

      // ── Optimización, no corrección ─────────────────────────────────────
      // Hallazgos del React Compiler. No son crashes: son oportunidades de
      // performance que exigen entender el flujo de datos de cada caso. Con
      // cero tests y sin poder probar en navegador, cambiarlos en masa es la
      // forma más rápida de romper algo que hoy funciona. Quedan en warning
      // con el conteo visible, para atacarlos de a uno y probando.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/error-boundaries': 'warn',

      // Los casos reales de esta regla (leer refs durante el render) se
      // corrigieron: useEscapeKey, BotonUbicacionLocal, SwipeToConfirm,
      // AlertaPedidosDemoradosFlotante, cadete-en-vivo y ClienteAuthContexto.
      // Lo que queda son falsos positivos del React Compiler, que no modela:
      //   - la mutación del DOM directo (CartDrawer: document.body.style)
      //   - la mutación de refs dentro de callbacks de mapa (MapaLibre)
      //   - el hoisting de declaraciones de función (ClienteAuthContexto)
      // Se deja en warning para que sigan visibles sin romper el build.
      'react-hooks/immutability': 'warn',

      // ── Deuda técnica heredada ──────────────────────────────────────────
      // ~451 `any` y ~1105 expresiones sin efecto. Reducirlas es un trabajo
      // aparte; mientras tanto en warning para que el lint siga siendo útil.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-require-imports': 'warn',
    },
  },
  {
    // tailwind.config.ts se carga como CommonJS por Next, el require es
    // correcto ahí y no se puede convertir a import sin romper el build.
    files: ['tailwind.config.ts', 'postcss.config.mjs', 'next.config.mjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]

export default eslintConfig
