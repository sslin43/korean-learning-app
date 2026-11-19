import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { geminiPronunciationPlugin } from './server/geminiPronunciationPlugin';
import { googleTtsPlugin } from './server/googleTtsPlugin';

export default defineConfig(({ mode }) => ({
  plugins: [react(), geminiPronunciationPlugin(mode), googleTtsPlugin(mode)],
}));
