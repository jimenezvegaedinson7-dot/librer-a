import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.', workers: 1,
    outputDir: 'C:/Users/Edinson/AppData/Local/Temp/opencode/tienda-regresiones',
    reporter: 'list',
    use: {baseURL:'http://127.0.0.1:5187',headless:true,viewport:{width:1440,height:1000}},
    webServer: {
        command:'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
        url:'http://127.0.0.1:5187',reuseExistingServer:false,
        env:{VITE_API_URL:'http://127.0.0.1:59999/api'},
    },
});
