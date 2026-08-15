import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiTarget = env.VITE_NIBLIT_API_URL || 'http://127.0.0.1:8080';
    var cloudTarget = env.VITE_NIBLIT_CLOUD_URL || 'http://127.0.0.1:8000';
    return {
        plugins: [react()],
        server: {
            port: Number(env.NIBLIT_UI_PORT || 5173),
            watch: {
                ignored: [
                    '**/src-tauri/target/**',
                    '**/target/**',
                    '**/*.dll',
                    '**/*.exe',
                    '**/*.pdb',
                    '**/*.rlib',
                    '**/*.rmeta',
                    '**/*.obj',
                    '**/*.lib',
                    '**/*.d',
                ],
                usePolling: true,
                interval: 1000,
            },
            proxy: {
                '/api': { target: apiTarget, changeOrigin: true },
                '/chat': { target: apiTarget, changeOrigin: true },
                '/health': { target: apiTarget, changeOrigin: true },
                '/memory': { target: apiTarget, changeOrigin: true },
                '/ws': { target: apiTarget, ws: true, changeOrigin: true },
                '/v1': { target: cloudTarget, changeOrigin: true },
            },
        },
    };
});
