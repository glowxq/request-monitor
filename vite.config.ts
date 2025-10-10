import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

export default defineConfig({
  plugins: [
    vue(),
    // 自定义插件：复制必要文件到dist目录
    {
      name: 'copy-files',
      writeBundle() {
        // 复制 manifest.json
        copyFileSync('manifest.json', 'dist/manifest.json')

        // 复制 logo.png
        if (existsSync('logo.png')) {
          copyFileSync('logo.png', 'dist/logo.png')
        }

        // 创建 icons 目录并复制图标文件
        if (!existsSync('dist/icons')) {
          mkdirSync('dist/icons', { recursive: true })
        }

        // 复制图标文件（如果存在）
        const iconSizes = [16, 32, 48, 128]
        iconSizes.forEach(size => {
          // 优先复制 SVG 图标
          const svgIconPath = `icons/icon${size}.svg`
          const pngIconPath = `icons/icon${size}.png`
          const distSvgIconPath = `dist/icons/icon${size}.svg`
          const distPngIconPath = `dist/icons/icon${size}.png`

          if (existsSync(svgIconPath)) {
            copyFileSync(svgIconPath, distSvgIconPath)
          } else if (existsSync(pngIconPath)) {
            copyFileSync(pngIconPath, distPngIconPath)
          }
        })

        // 复制popup.html到根目录
        if (existsSync('dist/src/popup/index.html')) {
          copyFileSync('dist/src/popup/index.html', 'dist/popup.html')
        }

        // 复制standalone.html到根目录
        if (existsSync('dist/src/standalone/index.html')) {
          copyFileSync('dist/src/standalone/index.html', 'dist/standalone.html')
        }

        console.log('✓ 已复制 manifest.json、图标文件、popup.html和standalone.html到 dist 目录')
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        standalone: resolve(__dirname, 'src/standalone/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        'content-script': resolve(__dirname, 'src/content-script/index.ts'),
        'inject-fixed': resolve(__dirname, 'src/page-script/inject-fixed.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: (chunkInfo) => {
          // 避免文件名以下划线开头，Chrome扩展不允许
          const name = chunkInfo.name.replace(/^_/, 'vue-')
          return `${name}.js`
        },
        assetFileNames: (assetInfo) => {
          // 避免文件名以下划线开头
          let name = assetInfo.name || 'asset'
          if (name.startsWith('_')) {
            name = 'vue-' + name.substring(1)
          }

          // 将 popup 和 standalone 相关的 CSS 放在根目录
          if (name === 'popup.css' || name === 'standalone.css') {
            return '[name].[ext]'
          }
          return `assets/${name}`
        },
        // 手动配置代码分割
        manualChunks: (id) => {
          // Element Plus相关的大型依赖分离
          if (id.includes('element-plus')) {
            return 'element-plus'
          }
          // Vue相关依赖分离
          if (id.includes('vue') && !id.includes('src/')) {
            return 'vue'
          }
          // 其他所有代码（包括组件）都打包到主chunk中
          return undefined
        }
      },
      external: ['chrome']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
