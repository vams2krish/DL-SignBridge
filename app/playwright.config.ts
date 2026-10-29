import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests', fullyParallel:false, workers:1, timeout:90000,
  use:{baseURL:'http://127.0.0.1:43189', viewport:{width:1440,height:1080}, trace:'retain-on-failure', launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run preview -- --port 43189 --strictPort',url:'http://127.0.0.1:43189',reuseExistingServer:false},
});
