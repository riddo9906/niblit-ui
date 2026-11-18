var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiTarget = env.VITE_NIBLIT_API_URL || 'http://127.0.0.1:8080';
    var cloudTarget = env.VITE_NIBLIT_CLOUD_URL || 'http://127.0.0.1:8000';
    var output = process.env.NIBLIT_UI_DIST_DIR;
    return __assign(__assign({ plugins: [react()] }, (output ? { build: { outDir: output, emptyOutDir: false }, cacheDir: process.env.NIBLIT_BUILD_WORK_DIR
            ? "".concat(process.env.NIBLIT_BUILD_WORK_DIR, "/vite-cache") : undefined } : {})), { server: {
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
        } });
});
