import { createApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
createApp(config).listen(config.PORT, () => {
  console.log(`Renal PharmCare API on http://localhost:${config.PORT}${config.DEMO_MODE ? ' (demo mode)' : ''}`);
});
