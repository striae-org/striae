import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';

export default tseslint.config(
	{
		ignores: ['public/vendor/**', 'build/**', '**/dist/**', '**/worker-configuration.d.ts', '.react-router/**', '.wrangler/**'],
	},

	js.configs.recommended,

	{
		files: ['**/*.{js,jsx,ts,tsx}'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.es2021,
			},
			parserOptions: {
				ecmaFeatures: { jsx: true },
			},
		},
		plugins: {
			'react-hooks': reactHooks,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'react-hooks/set-state-in-effect': 'off',
		},
	},

	...tseslint.configs.recommended,
	{
		files: ['**/*.{ts,tsx}'],
		plugins: {
			'import-x': importX,
		},
		settings: {
			'import-x/internal-regex': '^~/',
			'import-x/resolver': {
				typescript: {
					alwaysTryTypes: true,
				},
			},
		},
		rules: {
			...importX.configs.recommended.rules,
			...importX.configs.typescript.rules,
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
			'@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
		},
	},

	{
		files: ['scripts/**/*.{cjs,mjs}', 'workers/**/scripts/**/*.js', 'tests/**/*.mjs'],
		languageOptions: {
			globals: { ...globals.node },
		},
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
);
