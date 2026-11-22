import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  ...nextVitals,
  {
    files:['src/components/**/*.{ts,tsx}'],
    rules:{
      // Preserve the existing hook checks during the runtime upgrade.
      // These React Compiler checks need a separate review of the editors' imperative state.
      'react-hooks/error-boundaries':'off',
      'react-hooks/purity':'off',
      'react-hooks/refs':'off',
      'react-hooks/set-state-in-effect':'off',
    },
  },
  {
    // The library's existing links deliberately leave the editor with full-page navigation.
    files:['src/components/memory-books/book-library.tsx'],
    rules:{'@next/next/no-html-link-for-pages':'off'},
  },
];
