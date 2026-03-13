import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  ...tseslint.configs.strict,
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
)
