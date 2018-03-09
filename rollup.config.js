import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify-es';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'iife',
  },
  plugins: [
    resolve({ jsnext: true, main: true }),
    commonjs(),
    babel({
      exclude: 'node_modules/**',
    }),
    uglify({
    }),
  ],
};
