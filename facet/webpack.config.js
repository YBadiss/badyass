const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  context: __dirname,
  entry: './src/app.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Cleans the dist folder before each build
  },
  devServer: {
    static: './dist',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
            filename: 'assets/[hash][ext][query]'
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // We'll need to install babel-loader and presets if targeting older browsers
          options: {
            presets: ['@babel/preset-env'] // Basic preset, might need configuration
          }
        }
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Uses your existing index.html as a template
      inject: 'body',
      scriptLoading: 'defer', // Or 'module' if all your scripts are ES modules
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets' }
      ]
    })
  ],
  resolve: {
    alias: {
        // Ensure Three.js examples are resolved correctly if you use more from there
        'three/examples/jsm': path.resolve(__dirname, 'node_modules/three/examples/jsm'),
        'three/examples/jsm/controls/OrbitControls.js': path.resolve(__dirname, 'node_modules/three/examples/jsm/controls/OrbitControls.js')
    }
  }
}; 