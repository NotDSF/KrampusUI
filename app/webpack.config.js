const webpack = require('webpack');
const monaco  = require('monaco-editor-webpack-plugin');
const path    = require('path');
const mini    = require('mini-css-extract-plugin');
const html    = require('html-webpack-plugin')

module.exports = (_env, argv) => {
    const isProduction = argv.mode === 'production';
    const isDevelopement = !isProduction;

    return {
        devtool: isDevelopement && 'cheap-module-source-map',
        entry: './src/index.js',
        output:{ 
            path: path.resolve(__dirname, 'dist'),
            filename: 'assets/js/[name].[contenthash:8].js',
            publicPath: '/'
        },
        module: {
            rules: [
                {
                  test: /\.jsx?$/,
                  exclude: /node_modules/,
                  use: {
                        loader: "babel-loader",
                        options: {
                            cacheDirectory: true,
                            cacheCompression: false,
                            envName: isProduction ? "production" : "development"
                        }
                    }
                },
                {
                    test: /\.css$/,
                    use: [
                        isProduction ? mini.loader : 'style-loader',
                        'css-loader'
                    ]
                },
                {
                    test: /\.(eot|otf|ttf|woff|woff2)$/,
                    loader: require.resolve('file-loader'),
                    options: {
                        name: 'static/media/[name].[hash:8].[ext]'
                    }
                },
                {
                    test: /\.(gif|jpe?g|png)$/,
                    include: [path.join(__dirname,'/public')],
                    use: {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,
                            name: 'static/media/[name].[hash].[ext]'
                        }
                    }
                }
            ]
        },
        resolve: {
            extensions: [".js", ".jsx"]
        },
        plugins: [
            isProduction && new mini({
                filename: 'assets/css/[name].[contenthash:8].css',
                chunkFilename: 'assets/css/[name].[contenthash:8].chunk.css'
            }),
            new webpack.DefinePlugin({
                "process.env.NODE_ENV": JSON.stringify(
                    isProduction ? 'production' : 'development'
                )
            }),
            new html({
                template: path.resolve(__dirname, 'public/index.html'),
                inect: true
            }),
            new monaco({
                languages: ['lua']
            })
        ].filter(Boolean)
    }
}
