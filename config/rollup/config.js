import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';
const fs = require( 'fs' );
const commenting = require( 'commenting' );
import globals from 'rollup-plugin-node-globals';


export default {
	input: 'src/yuka.js',
	plugins: [ {
		banner() {

			const text = fs.readFileSync( 'LICENSE', 'utf8' );
			return commenting( '@license\n' + text, { extension: '.js' } );

		}
	},
	commonjs(),
	builtins(),
	globals({
		process: false,
		global: false,
		dirname: false,
		buffer: true,
	    filename: false,
		baseDir: false
	}),
	resolve()

],
	output: [
		{
			format: 'umd',
			name: 'YUKA',
			file: 'build/yuka.js'
		},
		{
			format: 'es',
			file: 'build/yuka.module.js'
		}
	]
};
