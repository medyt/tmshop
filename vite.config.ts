import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

function metaPixelBootstrapPlugin(pixelId: string) {
  const snippet =
    pixelId === ''
      ? ''
      : `<!-- Meta Pixel Code -->
    <script>
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${pixelId}');
    fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->`

  return {
    name: 'meta-pixel-bootstrap',
    transformIndexHtml(html: string) {
      return html.replace('<!-- META_PIXEL_BOOTSTRAP -->', snippet)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const metaPixelId = (env.VITE_META_PIXEL_ID ?? '').trim()

  return {
    plugins: [
      react(),
      legacy({
        targets: ['defaults', 'not IE 11'],
      }),
      metaPixelBootstrapPlugin(metaPixelId),
    ],
    server: {
      proxy: {
        '/shoptop-api': {
          target: 'http://localhost',
          changeOrigin: true,
          configure: (proxy) => {
            // Păstrează Content-Type/Length pentru upload (multipart / JSON body).
            proxy.on('proxyReq', (proxyReq, req) => {
              const contentType = req.headers['content-type']
              if (contentType) {
                proxyReq.setHeader('Content-Type', contentType)
              }
              const contentLength = req.headers['content-length']
              if (contentLength) {
                proxyReq.setHeader('Content-Length', contentLength)
              }
            })
          },
        },
      },
    },
  }
})
