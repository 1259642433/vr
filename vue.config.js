const path = require('path')
function resolve (dir) {
  return path.join(__dirname, dir)
}
module.exports = {
  lintOnSave: false,
  devServer: {
    open: true,
    openPage: '',
    // host: '',
    port: 8080,
    https: false,
    proxy: null, // 设置代理
    before: app => {}
  },
  chainWebpack: config => {
    config.resolve.alias
      .set('@', resolve('src'))
      .set('@a', resolve('src/assets'))
  }
}
